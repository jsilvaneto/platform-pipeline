import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.schemas.backup import (
    BackupCreateResponse,
    BackupItem,
    BackupListResponse,
    BackupRestoreResponse,
    BackupStatusResponse,
    GoogleDriveConfigStatus,
)

SCOPES = ["https://www.googleapis.com/auth/drive.file"]


class BackupService:
    """Serviço unificado de gestão, criação, restauração e sincronização de backups PostgreSQL com Google Drive."""

    @classmethod
    def resolve_credentials_path(cls) -> Path | None:
        """Resolve o caminho do arquivo de credenciais do Google Drive."""
        candidate_paths: list[Path] = []
        if settings.GOOGLE_APPLICATION_CREDENTIALS:
            candidate_paths.append(Path(settings.GOOGLE_APPLICATION_CREDENTIALS))

        candidate_paths.extend([
            Path("/app/credentials.json"),
            Path(__file__).resolve().parents[2] / "credentials.json",
            Path(__file__).resolve().parents[3] / "credentials.json",
            Path("credentials.json"),
        ])

        for path in candidate_paths:
            if path.is_file():
                return path
        return None

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
    def _get_drive_client(cls) -> tuple[Any | None, str | None, str | None]:
        """
        Retorna o cliente da Google Drive API, email da service account e mensagem de erro se houver.
        Retorna: (service, sa_email, error_message)
        """
        creds_path = cls.resolve_credentials_path()
        if not creds_path:
            return (
                None,
                None,
                "Arquivo de credenciais (credentials.json) não localizado.",
            )

        try:
            with open(creds_path, "r", encoding="utf-8") as f:
                creds_data = json.load(f)
            sa_email = creds_data.get("client_email")
        except Exception as e:
            return None, None, f"Erro ao ler JSON de credenciais: {str(e)}"

        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build

            credentials = service_account.Credentials.from_service_account_file(
                str(creds_path), scopes=SCOPES
            )
            service = build("drive", "v3", credentials=credentials, cache_discovery=False)
            return service, sa_email, None
        except Exception as e:
            return None, sa_email, f"Erro ao inicializar cliente Google Drive: {str(e)}"

    @classmethod
    def get_status(cls) -> BackupStatusResponse:
        """Retorna o diagnóstico de integração com Google Drive e dados de volumetria local."""
        service, sa_email, init_error = cls._get_drive_client()
        folder_id = settings.GOOGLE_DRIVE_FOLDER_ID
        retention = settings.BACKUP_RETENTION_DAYS

        is_configured = bool(service and folder_id)
        connection_ok = False
        status_msg = ""
        drive_backups_count = 0

        if not service:
            status_msg = init_error or "Credenciais do Google Drive não configuradas."
        elif not folder_id:
            status_msg = "Credenciais carregadas, mas GOOGLE_DRIVE_FOLDER_ID não está configurado."
        else:
            # Testa a conexão com o Google Drive e verifica acesso à pasta
            try:
                # Tenta listar os primeiros arquivos na pasta para validar permissões de leitura/escrita
                query = f"'{folder_id}' in parents and trashed = false"
                res = service.files().list(q=query, pageSize=100, fields="files(id)").execute()
                files = res.get("files", [])
                drive_backups_count = len(files)
                connection_ok = True
                status_msg = f"Conexão ativa com o Google Drive. Pasta vinculada ({drive_backups_count} arquivo(s) encontrado(s))."
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
            service_account_email=sa_email,
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
        drive_service, _, _ = cls._get_drive_client()
        folder_id = settings.GOOGLE_DRIVE_FOLDER_ID
        gdrive_ok = False

        # 1. Backups do Google Drive
        if drive_service and folder_id:
            try:
                query = f"'{folder_id}' in parents and trashed = false"
                res = (
                    drive_service.files()
                    .list(
                        q=query,
                        spaces="drive",
                        fields="files(id, name, size, createdTime)",
                        orderBy="createdTime desc",
                        pageSize=100,
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
        drive_service, _, _ = cls._get_drive_client()
        folder_id = settings.GOOGLE_DRIVE_FOLDER_ID
        uploaded = False
        drive_file_id: str | None = None
        message = f"Backup local criado com sucesso ({dump_pretty})."

        if drive_service and folder_id:
            try:
                from googleapiclient.http import MediaFileUpload

                media = MediaFileUpload(
                    str(dump_path),
                    mimetype="application/octet-stream",
                    resumable=True,
                )
                file_metadata = {
                    "name": filename,
                    "parents": [folder_id],
                    "description": f"Backup do banco de dados Wallet gerado em {now_dt.isoformat()}",
                }
                req = drive_service.files().create(
                    body=file_metadata, media_body=media, fields="id, name, size"
                )
                res = None
                while res is None:
                    _, res = req.next_chunk()

                drive_file_id = res.get("id")
                uploaded = True
                message = (
                    f"Backup gerado e enviado com sucesso ao Google Drive ({dump_pretty}). "
                    f"ID: {drive_file_id}"
                )

                # Aplica política de retenção no Google Drive
                if settings.BACKUP_RETENTION_DAYS > 0:
                    cls._apply_drive_retention(
                        drive_service, folder_id, settings.BACKUP_RETENTION_DAYS
                    )
            except Exception as drive_err:
                message = (
                    f"Backup gerado localmente ({dump_pretty}), mas o upload para o Google Drive "
                    f"falhou: {str(drive_err)}"
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
    def _apply_drive_retention(cls, service: Any, folder_id: str, retention_days: int) -> int:
        """Purga snapshots no Google Drive mais antigos que o período de retenção."""
        from datetime import timedelta

        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        query = (
            f"'{folder_id}' in parents and trashed = false and "
            f"mimeType != 'application/vnd.google-apps.folder' and "
            f"createdTime < '{cutoff.isoformat()}'"
        )
        results = (
            service.files()
            .list(q=query, spaces="drive", fields="files(id, name, createdTime)", pageSize=100)
            .execute()
        )
        to_delete = results.get("files", [])
        for f in to_delete:
            try:
                service.files().delete(fileId=f["id"]).execute()
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
            drive_service, _, _ = cls._get_drive_client()
            if not drive_service:
                raise ValueError("Google Drive não configurado para download do snapshot.")

            # Baixa snapshot para a pasta de backups
            temp_restore_name = f"gdrive_restore_{backup_id}.dump"
            restore_file_path = backups_dir / temp_restore_name

            from googleapiclient.http import MediaIoBaseDownload

            request = drive_service.files().get_media(fileId=backup_id)
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
            drive_service, _, _ = cls._get_drive_client()
            if not drive_service:
                raise ValueError("Google Drive não configurado para baixar o arquivo.")

            # Metadados para obter o nome original
            file_meta = drive_service.files().get(fileId=backup_id, fields="name").execute()
            original_name = file_meta.get("name", f"backup_{backup_id}.dump")

            local_path = backups_dir / original_name
            if not local_path.is_file():
                from googleapiclient.http import MediaIoBaseDownload

                req = drive_service.files().get_media(fileId=backup_id)
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
