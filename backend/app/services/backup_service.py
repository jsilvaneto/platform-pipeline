import json
import os
import re
import subprocess
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal
import httpx

from app.core.config import settings
from app.schemas.backup import (
    BackupCreateResponse,
    BackupItem,
    BackupListResponse,
    BackupRestoreResponse,
    BackupStatusResponse,
    GoogleDriveConfigStatus,
    GoogleOAuthInitResponse,
)

SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]


class BackupService:
    """Serviço unificado de gestão, criação, restauração e sincronização de backups PostgreSQL com Google Drive."""

    @classmethod
    def _is_gdrive_disabled(cls) -> bool:
        """Verifica se o usuário desativou explicitamente a integração."""
        config_path = cls.resolve_backups_dir() / "gdrive_config.json"
        if config_path.is_file():
            try:
                data = json.loads(config_path.read_text(encoding="utf-8"))
                return bool(data.get("disabled", False))
            except Exception:
                pass
        return False

    @classmethod
    def resolve_credentials_path(cls) -> Path | None:
        """Resolve o caminho do arquivo de credenciais do Google Drive."""
        if cls._is_gdrive_disabled():
            return None
        return settings.resolve_credentials_path()

    @classmethod
    def resolve_backups_dir(cls) -> Path:
        """Resolve o diretório local para armazenamento de backups."""
        if Path("/app").is_dir():
            backup_dir = Path("/app/backups")
        else:
            backup_dir = Path(__file__).resolve().parents[3] / settings.BACKUPS_DIR

        backup_dir.mkdir(parents=True, exist_ok=True)
        return backup_dir

    @classmethod
    def _format_size(cls, size_bytes: int) -> str:
        """Formata bytes em string humanizada (ex: 2.45 MB)."""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.2f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.2f} MB"
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

    @classmethod
    def resolve_oauth_client_path(cls) -> Path:
        """Resolve o arquivo onde ficam salvas as credenciais de cliente OAuth (Client ID e Secret)."""
        return cls.resolve_backups_dir() / "oauth_client.json"

    @classmethod
    def resolve_oauth_token_path(cls) -> Path:
        """Resolve o arquivo onde ficam salvos os tokens OAuth do usuário conectado."""
        return cls.resolve_backups_dir() / "oauth_token.json"

    @classmethod
    def get_oauth_client_info(cls) -> tuple[str | None, str | None]:
        """Retorna (client_id, client_secret) a partir do arquivo salvo ou variáveis de ambiente."""
        client_id = settings.GOOGLE_OAUTH_CLIENT_ID
        client_secret = settings.GOOGLE_OAUTH_CLIENT_SECRET
        client_file = cls.resolve_oauth_client_path()
        if client_file.is_file():
            try:
                data = json.loads(client_file.read_text(encoding="utf-8"))
                client_id = data.get("client_id") or client_id
                client_secret = data.get("client_secret") or client_secret
            except Exception:
                pass
        return (client_id.strip() if client_id else None, client_secret.strip() if client_secret else None)

    @classmethod
    def save_oauth_client(cls, client_id: str, client_secret: str) -> None:
        """Persiste Client ID e Secret no arquivo local e variáveis em memória/ambiente."""
        client_file = cls.resolve_oauth_client_path()
        data = {"client_id": client_id.strip(), "client_secret": client_secret.strip()}
        client_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
        settings.GOOGLE_OAUTH_CLIENT_ID = client_id.strip()
        settings.GOOGLE_OAUTH_CLIENT_SECRET = client_secret.strip()
        cls._update_env_file("GOOGLE_OAUTH_CLIENT_ID", client_id.strip())
        cls._update_env_file("GOOGLE_OAUTH_CLIENT_SECRET", client_secret.strip())

    @classmethod
    def get_oauth_auth_url(
        cls,
        redirect_uri: str,
        client_id: str | None = None,
        client_secret: str | None = None,
    ) -> GoogleOAuthInitResponse:
        """Gera a URL do Google para autorização OAuth 2.0 (contas pessoais @gmail.com)."""
        if client_id and client_secret:
            cls.save_oauth_client(client_id, client_secret)

        resolved_client_id, resolved_secret = cls.get_oauth_client_info()
        if not resolved_client_id or not resolved_secret:
            raise ValueError(
                "Client ID ou Client Secret do Google OAuth não configurados. "
                "Envie o arquivo client_secret.json ou preencha as credenciais na interface."
            )

        params = {
            "client_id": resolved_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
        }
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
        return GoogleOAuthInitResponse(auth_url=auth_url, redirect_uri=redirect_uri)

    @classmethod
    def exchange_oauth_code(
        cls,
        code: str,
        redirect_uri: str,
        folder_id: str | None = None,
    ) -> BackupStatusResponse:
        """Troca o código temporário retornado pelo Google por tokens OAuth 2.0 com acesso ao Drive."""
        resolved_client_id, resolved_secret = cls.get_oauth_client_info()
        if not resolved_client_id or not resolved_secret:
            raise ValueError("Credenciais de cliente OAuth (Client ID / Secret) não encontradas.")

        token_endpoint = "https://oauth2.googleapis.com/token"
        payload = {
            "code": code,
            "client_id": resolved_client_id,
            "client_secret": resolved_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }

        with httpx.Client(timeout=20.0) as client:
            res = client.post(token_endpoint, data=payload)
            if res.status_code != 200:
                err_msg = res.text
                try:
                    err_json = res.json()
                    err_msg = err_json.get("error_description") or err_json.get("error") or res.text
                except Exception:
                    pass
                raise ValueError(f"Falha ao autenticar com o Google: {err_msg}")

            tokens = res.json()
            access_token = tokens.get("access_token")
            refresh_token = tokens.get("refresh_token")

            # Obtém o e-mail do usuário conectado
            user_email: str | None = None
            try:
                userinfo_res = client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if userinfo_res.status_code == 200:
                    user_email = userinfo_res.json().get("email")
            except Exception:
                pass

        token_path = cls.resolve_oauth_token_path()
        existing_refresh_token = None
        if token_path.is_file():
            try:
                existing_data = json.loads(token_path.read_text(encoding="utf-8"))
                existing_refresh_token = existing_data.get("refresh_token")
            except Exception:
                pass

        final_refresh_token = refresh_token or existing_refresh_token
        if not final_refresh_token:
            raise ValueError(
                "O Google não forneceu o 'refresh_token'. Certifique-se de conectar novamente "
                "com a opção prompt=consent."
            )

        token_data = {
            "token": access_token,
            "refresh_token": final_refresh_token,
            "token_uri": token_endpoint,
            "client_id": resolved_client_id,
            "client_secret": resolved_secret,
            "scopes": SCOPES,
            "user_email": user_email,
            "auth_type": "oauth2",
        }
        token_path.write_text(json.dumps(token_data, indent=2), encoding="utf-8")

        # Reativa no gdrive_config.json
        config_path = cls.resolve_backups_dir() / "gdrive_config.json"
        cfg: dict[str, Any] = {}
        if config_path.is_file():
            try:
                cfg = json.loads(config_path.read_text(encoding="utf-8"))
            except Exception:
                pass
        cfg["disabled"] = False
        if folder_id is not None:
            cfg["folder_id"] = cls._sanitize_folder_id(folder_id) or ""
        config_path.write_text(json.dumps(cfg, indent=2), encoding="utf-8")

        return cls.get_status()

    @classmethod
    def _get_drive_client(
        cls,
    ) -> tuple[Any | None, str | None, str | None, Literal["oauth2", "service_account"] | None]:
        """
        Retorna: (service, account_email, error_message, auth_type)
        Prioriza credenciais de usuário OAuth 2.0 (para contas pessoais @gmail.com)
        e faz fallback para Conta de Serviço (para Shared Drives).
        """
        if cls._is_gdrive_disabled():
            return None, None, "A sincronização com o Google Drive está desativada nas configurações.", None

        # 1. Tentativa via OAuth 2.0 (Conta Pessoal @gmail.com)
        token_path = cls.resolve_oauth_token_path()
        if token_path.is_file() and token_path.stat().st_size > 0:
            try:
                token_dict = json.loads(token_path.read_text(encoding="utf-8"))
                user_email = token_dict.get("user_email")
                from google.oauth2.credentials import Credentials
                from google.auth.transport.requests import Request
                from googleapiclient.discovery import build

                creds = Credentials(
                    token=token_dict.get("token"),
                    refresh_token=token_dict.get("refresh_token"),
                    token_uri=token_dict.get("token_uri", "https://oauth2.googleapis.com/token"),
                    client_id=token_dict.get("client_id"),
                    client_secret=token_dict.get("client_secret"),
                    scopes=token_dict.get("scopes", SCOPES),
                )
                if not creds.valid or creds.expired:
                    if creds.refresh_token:
                        creds.refresh(Request())
                        token_dict["token"] = creds.token
                        token_path.write_text(json.dumps(token_dict, indent=2), encoding="utf-8")
                    else:
                        return None, user_email, "Sessão OAuth expirada. Reconecte sua conta Google no painel.", "oauth2"

                service = build("drive", "v3", credentials=creds, cache_discovery=False)
                return service, user_email, None, "oauth2"
            except Exception as e:
                return None, None, f"Erro ao inicializar sessão OAuth 2.0: {str(e)}", "oauth2"

        # 2. Fallback para Conta de Serviço (Shared Drive)
        creds_path = cls.resolve_credentials_path()
        if creds_path:
            try:
                with open(creds_path, "r", encoding="utf-8") as f:
                    creds_data = json.load(f)
                sa_email = creds_data.get("client_email")
            except Exception as e:
                return None, None, f"Erro ao ler JSON de credenciais: {str(e)}", "service_account"

            try:
                from google.oauth2 import service_account
                from googleapiclient.discovery import build

                credentials = service_account.Credentials.from_service_account_file(
                    str(creds_path), scopes=SCOPES
                )
                service = build("drive", "v3", credentials=credentials, cache_discovery=False)
                return service, sa_email, None, "service_account"
            except Exception as e:
                return None, sa_email, f"Erro ao inicializar cliente Google Drive: {str(e)}", "service_account"

        return (
            None,
            None,
            "Credenciais do Google Drive não configuradas. Conecte sua conta pessoal (@gmail.com) ou envie as credenciais.",
            None,
        )

    @classmethod
    def _resolve_gdrive_config(cls) -> tuple[str | None, int]:
        """Resolve folder_id e retention_days a partir do gdrive_config.json ou settings."""
        if cls._is_gdrive_disabled():
            return None, settings.BACKUP_RETENTION_DAYS

        config_path = cls.resolve_backups_dir() / "gdrive_config.json"
        if config_path.is_file():
            try:
                data = json.loads(config_path.read_text(encoding="utf-8"))
                folder_id = data.get("folder_id") or settings.GOOGLE_DRIVE_FOLDER_ID
                retention = int(data.get("retention_days", settings.BACKUP_RETENTION_DAYS))
                return (folder_id.strip() if folder_id else None), retention
            except Exception:
                pass
        fid = settings.GOOGLE_DRIVE_FOLDER_ID
        return (fid.strip() if fid else None), settings.BACKUP_RETENTION_DAYS

    @classmethod
    def _sanitize_folder_id(cls, raw_input: str | None) -> str | None:
        """Extrai o ID da pasta do Google Drive mesmo se o usuário colar o link completo da barra de endereços."""
        if not raw_input:
            return None
        clean = raw_input.strip()
        if not clean:
            return None
        match = re.search(r"folders/([a-zA-Z0-9_-]+)", clean)
        if match:
            return match.group(1)
        clean = clean.split("?")[0].split("#")[0].strip()
        return clean or None

    @classmethod
    def _update_env_file(cls, key: str, value: str) -> None:
        """Atualiza ou adiciona uma variável no arquivo .env se acessível."""
        candidate_paths = [
            Path("/app/.env"),
            Path(__file__).resolve().parents[3] / ".env",
            Path(".env"),
        ]
        for env_path in candidate_paths:
            if env_path.is_file():
                try:
                    content = env_path.read_text(encoding="utf-8")
                    pattern = rf"^{key}=.*$"
                    new_line = f"{key}={value}"
                    if re.search(pattern, content, flags=re.MULTILINE):
                        updated = re.sub(pattern, new_line, content, flags=re.MULTILINE)
                    else:
                        updated = content.rstrip() + f"\n{new_line}\n"
                    env_path.write_text(updated, encoding="utf-8")
                except Exception:
                    pass

    @classmethod
    def save_gdrive_config(
        cls,
        folder_id: str | None = None,
        retention_days: int = 30,
    ) -> BackupStatusResponse:
        """Salva o ID da pasta e dias de retenção no arquivo de configuração e atualiza o estado em memória."""
        clean_folder_id = cls._sanitize_folder_id(folder_id)
        config_data = {
            "disabled": False,
            "folder_id": clean_folder_id or "",
            "retention_days": max(1, min(retention_days, 3650)),
        }
        config_path = cls.resolve_backups_dir() / "gdrive_config.json"
        config_path.write_text(json.dumps(config_data, indent=2), encoding="utf-8")

        # Atualiza memória e tenta sincronizar no .env
        settings.GOOGLE_DRIVE_FOLDER_ID = clean_folder_id
        settings.BACKUP_RETENTION_DAYS = config_data["retention_days"]
        if clean_folder_id:
            cls._update_env_file("GOOGLE_DRIVE_FOLDER_ID", clean_folder_id)
        cls._update_env_file("BACKUP_RETENTION_DAYS", str(config_data["retention_days"]))

        return cls.get_status()

    @classmethod
    def save_credentials_file(
        cls,
        file_bytes: bytes,
        original_filename: str = "credentials.json",
    ) -> tuple[BackupStatusResponse, str]:
        """
        Valida e armazena o arquivo de credenciais.
        Detecta automaticamente:
        - OAuth 2.0 Client Secret (arquivo baixado do Google Cloud Console para contas pessoais @gmail.com)
        - Token OAuth já autorizado (com refresh_token)
        - Conta de Serviço (para Google Workspace / Shared Drives)
        """
        try:
            creds_data = json.loads(file_bytes.decode("utf-8"))
        except Exception:
            raise ValueError("O arquivo enviado não é um JSON válido.")

        if not isinstance(creds_data, dict):
            raise ValueError("O formato interno do arquivo JSON é inválido (esperado objeto JSON).")

        # Caso 1: Arquivo client_secret_*.json do OAuth 2.0 (web ou installed)
        oauth_obj = creds_data.get("web") or creds_data.get("installed")
        if oauth_obj and isinstance(oauth_obj, dict):
            client_id = oauth_obj.get("client_id")
            client_secret = oauth_obj.get("client_secret")
            if not client_id or not client_secret:
                raise ValueError("Arquivo de cliente OAuth inválido: campos client_id ou client_secret ausentes.")

            target_path = cls.resolve_oauth_client_path()
            target_path.write_bytes(file_bytes)
            cls.save_oauth_client(client_id, client_secret)
            return cls.get_status(), f"Cliente OAuth ({client_id[:16]}...)"

        # Caso 2: Arquivo de token OAuth já gerado (token.json)
        if "refresh_token" in creds_data and "client_id" in creds_data:
            token_path = cls.resolve_oauth_token_path()
            token_path.write_bytes(file_bytes)
            cfg_path = cls.resolve_backups_dir() / "gdrive_config.json"
            cfg: dict[str, Any] = {}
            if cfg_path.is_file():
                try:
                    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
                except Exception:
                    pass
            cfg["disabled"] = False
            cfg_path.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
            return cls.get_status(), creds_data.get("user_email") or "Token OAuth"

        # Caso 3: Conta de Serviço do Google Cloud
        sa_email = creds_data.get("client_email")
        private_key = creds_data.get("private_key")

        if not sa_email or not private_key:
            raise ValueError(
                "O arquivo JSON não corresponde a credenciais reconhecidas do Google Cloud. "
                "Envie o arquivo Chave de Conta de Serviço (com client_email e private_key) "
                "ou o arquivo de ID do Cliente OAuth (com 'web' ou 'installed')."
            )

        # Salva na pasta de backups do container/host
        target_path = cls.resolve_backups_dir() / "credentials.json"
        target_path.write_bytes(file_bytes)

        # Atualiza arquivo gdrive_config.json para reativar caso estivesse desativado
        config_path = cls.resolve_backups_dir() / "gdrive_config.json"
        existing_config: dict[str, Any] = {}
        if config_path.is_file():
            try:
                existing_config = json.loads(config_path.read_text(encoding="utf-8"))
            except Exception:
                pass
        existing_config["disabled"] = False
        config_path.write_text(json.dumps(existing_config, indent=2), encoding="utf-8")

        # Também salva na raiz do projeto se for possível/acessível
        for root_cand in [Path("/app/credentials.json"), Path(__file__).resolve().parents[3] / "credentials.json"]:
            try:
                root_cand.write_bytes(file_bytes)
            except Exception:
                pass

        settings.GOOGLE_APPLICATION_CREDENTIALS = str(target_path)
        cls._update_env_file("GOOGLE_APPLICATION_CREDENTIALS", str(target_path))

        return cls.get_status(), sa_email

    @classmethod
    def delete_gdrive_config(cls) -> BackupStatusResponse:
        """Desconecta a integração com Google Drive removendo chaves, tokens e configurações salvas."""
        backups_dir = cls.resolve_backups_dir()
        creds_file = backups_dir / "credentials.json"
        if creds_file.is_file():
            creds_file.unlink(missing_ok=True)

        token_file = cls.resolve_oauth_token_path()
        if token_file.is_file():
            token_file.unlink(missing_ok=True)

        client_file = cls.resolve_oauth_client_path()
        if client_file.is_file():
            client_file.unlink(missing_ok=True)

        # Marca explicitamente como disabled para ignorar montagens estáticas read-only
        config_path = backups_dir / "gdrive_config.json"
        config_data = {
            "disabled": True,
            "folder_id": "",
            "retention_days": 30,
        }
        config_path.write_text(json.dumps(config_data, indent=2), encoding="utf-8")

        settings.GOOGLE_DRIVE_FOLDER_ID = None
        settings.GOOGLE_APPLICATION_CREDENTIALS = None
        settings.GOOGLE_OAUTH_CLIENT_ID = None
        settings.GOOGLE_OAUTH_CLIENT_SECRET = None
        cls._update_env_file("GOOGLE_DRIVE_FOLDER_ID", "")
        cls._update_env_file("GOOGLE_APPLICATION_CREDENTIALS", "")
        cls._update_env_file("GOOGLE_OAUTH_CLIENT_ID", "")
        cls._update_env_file("GOOGLE_OAUTH_CLIENT_SECRET", "")

        return cls.get_status()

    @classmethod
    def get_status(cls) -> BackupStatusResponse:
        """Retorna o diagnóstico de integração com Google Drive e dados de volumetria local."""
        service, account_email, init_error, auth_type = cls._get_drive_client()
        folder_id, retention = cls._resolve_gdrive_config()
        client_id, _ = cls.get_oauth_client_info()

        # Para OAuth2 pessoal, se não houver folder_id, os backups vão para o diretório raiz "Meu Drive"
        is_configured = bool(service and (folder_id or auth_type == "oauth2"))
        connection_ok = False
        status_msg = ""
        drive_backups_count = 0

        if not service:
            status_msg = init_error or "Credenciais do Google Drive não configuradas."
        elif auth_type == "service_account" and not folder_id:
            status_msg = "Chave de serviço carregada, mas GOOGLE_DRIVE_FOLDER_ID não está configurado."
        else:
            try:
                if folder_id:
                    query = f"'{folder_id}' in parents and trashed = false"
                else:
                    query = "trashed = false and name contains 'wallet_backup_'"
                res = (
                    service.files()
                    .list(
                        q=query,
                        pageSize=100,
                        fields="files(id)",
                        supportsAllDrives=True,
                        includeItemsFromAllDrives=True,
                    )
                    .execute()
                )
                files = res.get("files", [])
                drive_backups_count = len(files)
                connection_ok = True
                if auth_type == "oauth2":
                    folder_label = f"pasta '{folder_id}'" if folder_id else "raiz do Meu Drive"
                    status_msg = (
                        f"Conectado à sua conta Google pessoal ({account_email}). "
                        f"Destino: {folder_label} ({drive_backups_count} backup(s) na nuvem). Cota pessoal de 15 GB ativa."
                    )
                else:
                    status_msg = f"Conexão ativa com o Google Drive ({account_email}). Pasta vinculada ({drive_backups_count} arquivo(s))."
            except Exception as e:
                connection_ok = False
                status_msg = f"Falha na conexão com Google Drive: {str(e)}"

        # Diagnóstico de backups locais
        backups_dir = cls.resolve_backups_dir()
        local_files = [f for f in backups_dir.glob("*.dump") if f.is_file()]
        local_count = len(local_files)
        total_size = sum(f.stat().st_size for f in local_files)

        last_backup_time: str | None = None
        if local_files:
            latest_local = max(local_files, key=lambda f: f.stat().st_mtime)
            last_backup_time = datetime.fromtimestamp(
                latest_local.stat().st_mtime, timezone.utc
            ).isoformat()

        drive_status = GoogleDriveConfigStatus(
            is_configured=is_configured,
            connection_ok=connection_ok,
            folder_id=folder_id,
            auth_type=auth_type,
            account_email=account_email,
            oauth_client_configured=bool(client_id),
            service_account_email=account_email if auth_type == "service_account" else None,
            retention_days=retention,
            status_message=status_msg,
        )

        return BackupStatusResponse(
            google_drive=drive_status,
            local_backups_count=local_count,
            drive_backups_count=drive_backups_count,
            total_disk_usage_pretty=cls._format_size(total_size),
            last_backup_at=last_backup_time,
        )

    @classmethod
    def list_backups(cls) -> BackupListResponse:
        """Lista todos os backups disponíveis no Google Drive e no armazenamento local."""
        items: list[BackupItem] = []
        drive_service, _, _, auth_type = cls._get_drive_client()
        folder_id, _ = cls._resolve_gdrive_config()
        gdrive_ok = False

        # 1. Backups do Google Drive
        if drive_service and (folder_id or auth_type == "oauth2"):
            try:
                if folder_id:
                    query = f"'{folder_id}' in parents and trashed = false"
                else:
                    query = "name contains 'wallet_backup_' and trashed = false"
                res = (
                    drive_service.files()
                    .list(
                        q=query,
                        spaces="drive",
                        fields="files(id, name, size, createdTime)",
                        orderBy="createdTime desc",
                        pageSize=100,
                        supportsAllDrives=True,
                        includeItemsFromAllDrives=True,
                    )
                    .execute()
                )
                gdrive_ok = True
                for f in res.get("files", []):
                    size_b = int(f.get("size", 0))
                    items.append(
                        BackupItem(
                            id=f["id"],
                            filename=f["name"],
                            size_bytes=size_b,
                            size_pretty=cls._format_size(size_b),
                            created_at=f.get("createdTime", datetime.now(timezone.utc).isoformat()),
                            source="gdrive",
                            drive_file_id=f["id"],
                        )
                    )
            except Exception as e:
                print(f"[BackupService] Erro ao listar Google Drive: {e}")

        # 2. Backups Locais
        backups_dir = cls.resolve_backups_dir()
        local_files = [f for f in backups_dir.glob("*.dump") if f.is_file()]
        # Evita duplicar se já foi identificado pelo nome no Google Drive
        gdrive_filenames = {item.filename for item in items}

        for f in local_files:
            if f.name in gdrive_filenames:
                continue
            stat = f.stat()
            created_dt = datetime.fromtimestamp(stat.st_mtime, timezone.utc)
            items.append(
                BackupItem(
                    id=f.name,
                    filename=f.name,
                    size_bytes=stat.st_size,
                    size_pretty=cls._format_size(stat.st_size),
                    created_at=created_dt.isoformat(),
                    source="local",
                    drive_file_id=None,
                )
            )

        # Ordena do mais recente para o mais antigo
        items.sort(key=lambda x: x.created_at, reverse=True)

        return BackupListResponse(
            items=items,
            total=len(items),
            google_drive_connected=gdrive_ok,
        )

    @classmethod
    def create_backup(cls) -> BackupCreateResponse:
        """Gera um dump binário customizado do PostgreSQL e realiza upload para o Google Drive se configurado."""
        backups_dir = cls.resolve_backups_dir()
        now_dt = datetime.now(timezone.utc)
        timestamp_str = now_dt.strftime("%Y%m%d_%H%M%S")
        filename = f"wallet_backup_{timestamp_str}.dump"
        dump_path = backups_dir / filename

        # Executa pg_dump
        env = os.environ.copy()
        env["PGPASSWORD"] = settings.POSTGRES_PASSWORD

        pg_dump_cmd = [
            "pg_dump",
            "-h",
            settings.POSTGRES_SERVER,
            "-p",
            str(settings.POSTGRES_PORT),
            "-U",
            settings.POSTGRES_USER,
            "-Fc",
            "-f",
            str(dump_path),
            settings.POSTGRES_DB,
        ]

        try:
            process = subprocess.run(
                pg_dump_cmd,
                env=env,
                capture_output=True,
                text=True,
                check=True,
                timeout=300,
            )
        except subprocess.CalledProcessError as err:
            err_msg = err.stderr.strip() if err.stderr else str(err)
            raise RuntimeError(f"Falha ao executar pg_dump: {err_msg}")
        except FileNotFoundError:
            # Fallback se pg_dump não estiver no PATH direto: tenta docker exec se aplicável
            raise RuntimeError(
                "Utilitário 'pg_dump' não encontrado no ambiente do servidor. "
                "Certifique-se de que postgresql-client está instalado no container."
            )

        if not dump_path.is_file() or dump_path.stat().st_size == 0:
            if dump_path.is_file():
                dump_path.unlink(missing_ok=True)
            raise RuntimeError("O arquivo de dump gerado está vazio ou inválido.")

        dump_size = dump_path.stat().st_size
        dump_pretty = cls._format_size(dump_size)

        # Upload para o Google Drive se configurado
        drive_service, account_email, _, auth_type = cls._get_drive_client()
        folder_id, retention = cls._resolve_gdrive_config()
        uploaded = False
        drive_file_id: str | None = None
        message = f"Backup local criado com sucesso ({dump_pretty})."

        if drive_service and (folder_id or auth_type == "oauth2"):
            try:
                from googleapiclient.http import MediaFileUpload

                media = MediaFileUpload(
                    str(dump_path),
                    mimetype="application/octet-stream",
                    resumable=True,
                )
                file_metadata: dict[str, Any] = {
                    "name": filename,
                    "description": f"Backup do banco de dados Wallet gerado em {now_dt.isoformat()}",
                }
                if folder_id:
                    file_metadata["parents"] = [folder_id]

                req = drive_service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields="id, name, size",
                    supportsAllDrives=True,
                )
                res = None
                while res is None:
                    _, res = req.next_chunk()

                drive_file_id = res.get("id")
                uploaded = True
                if auth_type == "oauth2":
                    message = (
                        f"Backup gerado e enviado com sucesso para a sua conta pessoal ({account_email}) "
                        f"no Google Drive ({dump_pretty}). ID: {drive_file_id}"
                    )
                else:
                    message = (
                        f"Backup gerado e enviado com sucesso ao Google Drive ({dump_pretty}). "
                        f"ID: {drive_file_id}"
                    )

                # Aplica política de retenção no Google Drive
                if retention > 0:
                    cls._apply_drive_retention(
                        drive_service, folder_id, retention
                    )
            except Exception as drive_err:
                err_str = str(drive_err)
                if "storageQuotaExceeded" in err_str or "Service Accounts do not have storage quota" in err_str:
                    clean_err = (
                        "A Conta de Serviço do Google Cloud não possui cota de armazenamento em pastas comuns do 'Meu Drive'. "
                        "Para resolver: Conecte sua conta pessoal (@gmail.com) via OAuth 2.0 no painel, ou utilize um "
                        "'Drive Compartilhado' (Shared Drive) do Google Workspace com a Conta de Serviço."
                    )
                else:
                    clean_err = err_str
                message = (
                    f"Backup gerado localmente ({dump_pretty}), mas o upload para o Google Drive "
                    f"falhou: {clean_err}"
                )

        return BackupCreateResponse(
            success=True,
            filename=filename,
            size_bytes=dump_size,
            size_pretty=dump_pretty,
            created_at=now_dt.isoformat(),
            uploaded_to_gdrive=uploaded,
            drive_file_id=drive_file_id,
            message=message,
        )

    @classmethod
    def _apply_drive_retention(cls, service: Any, folder_id: str | None, retention_days: int) -> int:
        """Purga snapshots no Google Drive mais antigos que o período de retenção."""
        from datetime import timedelta

        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        if folder_id:
            query = (
                f"'{folder_id}' in parents and trashed = false and "
                f"mimeType != 'application/vnd.google-apps.folder' and "
                f"createdTime < '{cutoff.isoformat()}'"
            )
        else:
            query = (
                f"name contains 'wallet_backup_' and trashed = false and "
                f"mimeType != 'application/vnd.google-apps.folder' and "
                f"createdTime < '{cutoff.isoformat()}'"
            )
        results = (
            service.files()
            .list(
                q=query,
                spaces="drive",
                fields="files(id, name, createdTime)",
                pageSize=100,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
            )
            .execute()
        )
        to_delete = results.get("files", [])
        for f in to_delete:
            try:
                service.files().delete(fileId=f["id"], supportsAllDrives=True).execute()
            except Exception as e:
                print(f"[BackupService] Falha ao deletar arquivo antigo {f.get('name')}: {e}")
        return len(to_delete)

    @classmethod
    def restore_backup(cls, backup_id: str, source: str) -> BackupRestoreResponse:
        """
        Executa restauração do banco de dados a partir de um backup local ou do Google Drive.
        Restaura com limpeza prévia (--clean --if-exists) mantendo integridade.
        """
        backups_dir = cls.resolve_backups_dir()
        restore_file_path: Path | None = None
        is_temp_file = False

        if source == "gdrive":
            drive_service, _, _, _ = cls._get_drive_client()
            if not drive_service:
                raise ValueError("Google Drive não configurado para download do snapshot.")

            # Baixa snapshot para a pasta de backups
            temp_restore_name = f"gdrive_restore_{backup_id}.dump"
            restore_file_path = backups_dir / temp_restore_name

            from googleapiclient.http import MediaIoBaseDownload

            request = drive_service.files().get_media(fileId=backup_id, supportsAllDrives=True)
            with open(restore_file_path, "wb") as fh:
                downloader = MediaIoBaseDownload(fh, request)
                done = False
                while not done:
                    _, done = downloader.next_chunk()
            is_temp_file = True
        else:
            # Arquivo local
            candidate = backups_dir / backup_id
            if not candidate.is_file():
                # Tenta localizar por id
                matches = list(backups_dir.glob(f"*{backup_id}*"))
                if matches:
                    candidate = matches[0]
            if not candidate.is_file():
                raise FileNotFoundError(f"Arquivo de backup local não encontrado: {backup_id}")
            restore_file_path = candidate

        try:
            env = os.environ.copy()
            env["PGPASSWORD"] = settings.POSTGRES_PASSWORD

            pg_restore_cmd = [
                "pg_restore",
                "-h",
                settings.POSTGRES_SERVER,
                "-p",
                str(settings.POSTGRES_PORT),
                "-U",
                settings.POSTGRES_USER,
                "-d",
                settings.POSTGRES_DB,
                "--clean",
                "--if-exists",
                "--no-owner",
                str(restore_file_path),
            ]

            process = subprocess.run(
                pg_restore_cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=600,
            )

            # pg_restore retorna 0 em sucesso pleno ou 1 se houver apenas warnings não fatais (tabelas que não existiam no drop)
            if process.returncode not in (0, 1):
                err_msg = process.stderr.strip() if process.stderr else "Erro desconhecido no pg_restore"
                raise RuntimeError(f"Erro fatal na restauração do PostgreSQL: {err_msg}")

        finally:
            # Resíduo zero para arquivos temporários de download transitório
            if is_temp_file and restore_file_path and restore_file_path.is_file():
                restore_file_path.unlink(missing_ok=True)

        return BackupRestoreResponse(
            success=True,
            message="Banco de dados restaurado com sucesso a partir do snapshot selecionado.",
            restored_at=datetime.now(timezone.utc).isoformat(),
        )

    @classmethod
    def get_backup_path_for_download(cls, backup_id: str, source: str) -> tuple[Path, str]:
        """
        Garante que o arquivo de backup esteja acessível no disco e retorna (caminho_local, nome_original).
        """
        backups_dir = cls.resolve_backups_dir()

        if source == "gdrive":
            drive_service, _, _, _ = cls._get_drive_client()
            if not drive_service:
                raise ValueError("Google Drive não configurado para baixar o arquivo.")

            # Metadados para obter o nome original
            file_meta = (
                drive_service.files()
                .get(fileId=backup_id, fields="name", supportsAllDrives=True)
                .execute()
            )
            original_name = file_meta.get("name", f"backup_{backup_id}.dump")

            local_path = backups_dir / original_name
            if not local_path.is_file():
                from googleapiclient.http import MediaIoBaseDownload

                req = drive_service.files().get_media(fileId=backup_id, supportsAllDrives=True)
                with open(local_path, "wb") as fh:
                    downloader = MediaIoBaseDownload(fh, req)
                    done = False
                    while not done:
                        _, done = downloader.next_chunk()

            return local_path, original_name
        else:
            local_path = backups_dir / backup_id
            if not local_path.is_file():
                raise FileNotFoundError(f"Arquivo local não encontrado: {backup_id}")
            return local_path, local_path.name
