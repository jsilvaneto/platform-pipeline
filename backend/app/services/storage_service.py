import json
import os
from pathlib import Path
import re
import shutil
from typing import Any
import uuid

from app.core.config import settings
from app.schemas.storage import (
    DirectoryHealth,
    StorageConfigResponse,
    StorageConfigUpdate,
    StorageSuggestion,
)


class StorageService:
    """Serviço unificado de gestão, resolução de caminhos (Windows/WSL/Linux), auditoria de disco e persistência de storage."""

    @classmethod
    def _get_project_root(cls) -> Path:
        """Obtém a raiz do projeto."""
        return Path(__file__).resolve().parents[3]

    @classmethod
    def get_config_file_path(cls) -> Path:
        """Localização do arquivo storage_config.json."""
        if Path("/app").is_dir():
            candidate = Path("/app/storage/storage_config.json")
            if not candidate.parent.is_dir():
                try:
                    candidate.parent.mkdir(parents=True, exist_ok=True)
                except Exception:
                    return Path("/app/storage_config.json")
            return candidate
        root = cls._get_project_root()
        storage_dir = root / "storage"
        storage_dir.mkdir(parents=True, exist_ok=True)
        return storage_dir / "storage_config.json"

    @classmethod
    def format_size(cls, size_bytes: int) -> str:
        """Formata bytes em string humanizada legível."""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.2f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.2f} MB"
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

    @classmethod
    def resolve_path(cls, raw_path: str, default_subfolder: str) -> Path:
        """
        Converte caminhos informados no formato Windows (ex: C:\\Users\\... ou C:/...)
        ou caminhos relativos em caminhos Linux/WSL válidos dentro do container.
        """
        clean_path = raw_path.strip() if raw_path else ""

        if not clean_path:
            if Path("/app").is_dir():
                default_path = Path(f"/app/storage/{default_subfolder}")
            else:
                default_path = cls._get_project_root() / "storage" / default_subfolder
            default_path.mkdir(parents=True, exist_ok=True)
            return default_path

        # 1. Caso: Caminho no padrão Windows (ex: C:\Users\... ou c:/...)
        win_match = re.match(r"^([a-zA-Z]):[\\/](.*)$", clean_path)
        if win_match:
            drive_letter = win_match.group(1).lower()
            remainder = win_match.group(2).replace("\\", "/").strip("/")
            return Path(f"/mnt/{drive_letter}/{remainder}")

        # 2. Caso: Caminho absoluto Linux/WSL (ex: /mnt/c/..., /app/..., /home/...)
        if clean_path.startswith("/"):
            return Path(clean_path)

        # 3. Caso: Caminho relativo ao projeto
        if Path("/app").is_dir():
            return Path("/app") / clean_path
        return cls._get_project_root() / clean_path

    @classmethod
    def read_config(cls) -> dict[str, Any]:
        """Lê a configuração persistida ou retorna valores padrão."""
        cfg_path = cls.get_config_file_path()
        if cfg_path.is_file():
            try:
                data = json.loads(cfg_path.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    return data
            except Exception:
                pass

        # Padrões caso ainda não configurado
        default_backups = (
            "storage/backups"
            if Path("/app").is_dir()
            else str(cls._get_project_root() / "storage" / "backups")
        )
        default_attachments = (
            "storage/attachments"
            if Path("/app").is_dir()
            else str(cls._get_project_root() / "storage" / "attachments")
        )
        return {
            "backups_dir": default_backups,
            "attachments_dir": default_attachments,
            "backup_retention_days": getattr(settings, "BACKUP_RETENTION_DAYS", 30),
        }

    @classmethod
    def get_backups_dir(cls) -> Path:
        """Retorna o diretório resolvido e garantido para salvamento de backups."""
        cfg = cls.read_config()
        configured = cfg.get("backups_dir", "storage/backups")
        resolved = cls.resolve_path(configured, "backups")
        resolved.mkdir(parents=True, exist_ok=True)
        return resolved

    @classmethod
    def get_attachments_dir(cls) -> Path:
        """Retorna o diretório resolvido e garantido para salvamento de anexos."""
        cfg = cls.read_config()
        configured = cfg.get("attachments_dir", "storage/attachments")
        resolved = cls.resolve_path(configured, "attachments")
        resolved.mkdir(parents=True, exist_ok=True)
        return resolved

    @classmethod
    def inspect_directory(cls, raw_path: str, default_subfolder: str) -> DirectoryHealth:
        """Verifica a integridade, permissões e espaço em disco de um diretório."""
        resolved = cls.resolve_path(raw_path, default_subfolder)
        exists = resolved.is_dir()
        is_writable = False
        error_message: str | None = None

        if not exists:
            try:
                resolved.mkdir(parents=True, exist_ok=True)
                exists = True
            except Exception as e:
                error_message = f"Não foi possível criar o diretório: {str(e)}"

        if exists:
            # Teste real de permissão de escrita com arquivo temporário
            test_file = resolved / f".write_test_{uuid.uuid4().hex}"
            try:
                test_file.write_bytes(b"ok")
                test_file.unlink(missing_ok=True)
                is_writable = True
            except Exception as e:
                is_writable = False
                error_message = f"Sem permissão de gravação: {str(e)}"

        # Espaço em disco
        free_bytes = 0
        total_bytes = 0
        if exists:
            try:
                usage = shutil.disk_usage(resolved)
                free_bytes = usage.free
                total_bytes = usage.total
            except Exception:
                pass

        # Contagem e tamanho de arquivos
        files_count = 0
        total_files_size = 0
        if exists:
            try:
                for entry in resolved.rglob("*"):
                    if entry.is_file() and not entry.name.startswith("."):
                        files_count += 1
                        total_files_size += entry.stat().st_size
            except Exception:
                pass

        return DirectoryHealth(
            configured_path=raw_path,
            resolved_path=str(resolved),
            exists=exists,
            is_writable=is_writable,
            free_space_bytes=free_bytes,
            free_space_pretty=cls.format_size(free_bytes),
            total_space_bytes=total_bytes,
            total_space_pretty=cls.format_size(total_bytes),
            files_count=files_count,
            total_files_size_pretty=cls.format_size(total_files_size),
            error_message=error_message,
        )

    @classmethod
    def detect_suggestions(cls) -> list[StorageSuggestion]:
        """Detecta diretórios comuns de sincronização do Google Drive Desktop no Windows via WSL."""
        suggestions: list[StorageSuggestion] = []
        users_dir = Path("/mnt/c/Users")
        if not users_dir.is_dir():
            return suggestions

        try:
            for user_folder in users_dir.iterdir():
                if not user_folder.is_dir():
                    continue
                username = user_folder.name
                if username.lower() in ("default", "public", "all users", "default user"):
                    continue

                # Candidatos conhecidos de pasta Google Drive no Windows
                candidates = [
                    user_folder / "drive",
                    user_folder / "Google Drive",
                    user_folder / "Meu Drive",
                    user_folder / "GoogleDrive",
                ]

                for cand in candidates:
                    if cand.is_dir():
                        cand_win = f"C:\\Users\\{username}\\{cand.name}\\wallet"
                        suggestions.append(
                            StorageSuggestion(
                                label=f"Google Drive detectado em {cand.name} ({username})",
                                backups_dir=f"{cand_win}\\backups",
                                attachments_dir=f"{cand_win}\\anexos",
                            )
                        )
                        break
        except Exception:
            pass

        return suggestions

    @classmethod
    def get_config(cls) -> StorageConfigResponse:
        """Retorna o estado consolidado de configuração e diagnóstico de armazenamento."""
        cfg = cls.read_config()
        backups_raw = cfg.get("backups_dir", "storage/backups")
        attachments_raw = cfg.get("attachments_dir", "storage/attachments")
        retention = int(cfg.get("backup_retention_days", 30))

        backups_health = cls.inspect_directory(backups_raw, "backups")
        attachments_health = cls.inspect_directory(attachments_raw, "attachments")
        suggestions = cls.detect_suggestions()

        return StorageConfigResponse(
            backups=backups_health,
            attachments=attachments_health,
            backup_retention_days=retention,
            detected_suggestions=suggestions,
        )

    @classmethod
    def update_config(cls, payload: StorageConfigUpdate) -> StorageConfigResponse:
        """Valida, testa e persiste nova configuração de diretórios de armazenamento."""
        backups_health = cls.inspect_directory(payload.backups_dir, "backups")
        if not backups_health.is_writable:
            raise ValueError(
                f"Diretório de backups inválido ou sem permissão de escrita: {backups_health.error_message or 'Acesso negado'}"
            )

        attachments_health = cls.inspect_directory(payload.attachments_dir, "attachments")
        if not attachments_health.is_writable:
            raise ValueError(
                f"Diretório de anexos inválido ou sem permissão de escrita: {attachments_health.error_message or 'Acesso negado'}"
            )

        clean_retention = max(1, min(payload.backup_retention_days, 3650))
        cfg_data = {
            "backups_dir": payload.backups_dir.strip(),
            "attachments_dir": payload.attachments_dir.strip(),
            "backup_retention_days": clean_retention,
        }

        cfg_file = cls.get_config_file_path()
        cfg_file.write_text(json.dumps(cfg_data, indent=2), encoding="utf-8")

        # Atualiza configurações em memória
        settings.BACKUP_RETENTION_DAYS = clean_retention

        return cls.get_config()
