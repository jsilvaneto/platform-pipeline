import os
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.config import settings
from app.services.storage_service import StorageService
from app.schemas.backup import (
    BackupCreateResponse,
    BackupItem,
    BackupListResponse,
    BackupRestoreResponse,
    BackupStatusResponse,
)


class BackupService:
    """Serviço unificado de gestão, criação, restauração e retenção de backups PostgreSQL locais/host."""

    @classmethod
    def resolve_backups_dir(cls) -> Path:
        """Resolve o diretório configurado de armazenamento de backups."""
        return StorageService.get_backups_dir()

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
    def _apply_retention(cls, backups_dir: Path, retention_days: int) -> int:
        """Purga snapshots locais mais antigos que o período configurado de retenção."""
        if retention_days <= 0:
            return 0
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        deleted_count = 0
        for f in backups_dir.glob("*.dump"):
            if not f.is_file():
                continue
            try:
                mtime = datetime.fromtimestamp(f.stat().st_mtime, timezone.utc)
                if mtime < cutoff:
                    f.unlink(missing_ok=True)
                    deleted_count += 1
            except Exception as err:
                print(f"[BackupService] Falha ao expurgar backup antigo {f.name}: {err}")
        return deleted_count

    @classmethod
    def get_status(cls) -> BackupStatusResponse:
        """Retorna o diagnóstico de volumetria do diretório local de backups."""
        backups_dir = cls.resolve_backups_dir()
        storage_cfg = StorageService.get_config()

        local_files = [f for f in backups_dir.glob("*.dump") if f.is_file()]
        local_count = len(local_files)
        total_size = sum(f.stat().st_size for f in local_files)

        last_backup_time: str | None = None
        if local_files:
            latest_local = max(local_files, key=lambda f: f.stat().st_mtime)
            last_backup_time = datetime.fromtimestamp(
                latest_local.stat().st_mtime, timezone.utc
            ).isoformat()

        return BackupStatusResponse(
            local_backups_count=local_count,
            total_disk_usage_pretty=cls._format_size(total_size),
            last_backup_at=last_backup_time,
            retention_days=storage_cfg.backup_retention_days,
            backups_dir=str(backups_dir),
        )

    @classmethod
    def list_backups(cls) -> BackupListResponse:
        """Lista todos os backups disponíveis no diretório configurado."""
        backups_dir = cls.resolve_backups_dir()
        items: list[BackupItem] = []

        local_files = [f for f in backups_dir.glob("*.dump") if f.is_file()]
        for f in local_files:
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
                )
            )

        items.sort(key=lambda x: x.created_at, reverse=True)

        return BackupListResponse(
            items=items,
            total=len(items),
        )

    @classmethod
    def create_backup(cls) -> BackupCreateResponse:
        """Gera um dump binário customizado do PostgreSQL (-Fc) e aplica retenção."""
        backups_dir = cls.resolve_backups_dir()
        now_dt = datetime.now(timezone.utc)
        timestamp_str = now_dt.strftime("%Y%m%d_%H%M%S")
        filename = f"wallet_backup_{timestamp_str}.dump"
        dump_path = backups_dir / filename

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
            subprocess.run(
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

        # Aplica retenção configurada
        storage_cfg = StorageService.get_config()
        if storage_cfg.backup_retention_days > 0:
            cls._apply_retention(backups_dir, storage_cfg.backup_retention_days)

        message = f"Backup gerado com sucesso ({dump_pretty}) no diretório configurado."

        return BackupCreateResponse(
            success=True,
            filename=filename,
            size_bytes=dump_size,
            size_pretty=dump_pretty,
            created_at=now_dt.isoformat(),
            message=message,
        )

    @classmethod
    def restore_backup(cls, backup_id: str, source: str = "local") -> BackupRestoreResponse:
        """
        Executa restauração do banco de dados a partir de um backup local.
        Restaura com limpeza prévia (--clean --if-exists) mantendo integridade.
        """
        backups_dir = cls.resolve_backups_dir()
        safe_name = Path(backup_id).name
        candidate = backups_dir / safe_name

        if not candidate.is_file():
            matches = list(backups_dir.glob(f"*{safe_name}*"))
            if matches:
                candidate = matches[0]

        if not candidate.is_file():
            raise FileNotFoundError(f"Arquivo de backup local não encontrado: {safe_name}")

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
            str(candidate),
        ]

        process = subprocess.run(
            pg_restore_cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=600,
        )

        if process.returncode not in (0, 1):
            err_msg = process.stderr.strip() if process.stderr else "Erro desconhecido no pg_restore"
            raise RuntimeError(f"Erro fatal na restauração do PostgreSQL: {err_msg}")

        return BackupRestoreResponse(
            success=True,
            message="Banco de dados restaurado com sucesso a partir do snapshot selecionado.",
            restored_at=datetime.now(timezone.utc).isoformat(),
        )

    @classmethod
    def get_backup_path_for_download(cls, backup_id: str, source: str = "local") -> tuple[Path, str]:
        """Garante que o arquivo de backup esteja acessível e retorna (caminho_local, nome_original)."""
        backups_dir = cls.resolve_backups_dir()
        safe_name = Path(backup_id).name
        local_path = backups_dir / safe_name
        if not local_path.is_file():
            raise FileNotFoundError(f"Arquivo local não encontrado: {safe_name}")
        return local_path, local_path.name

    @classmethod
    def delete_backup(cls, backup_id: str) -> None:
        """Remove um arquivo de backup local."""
        backups_dir = cls.resolve_backups_dir()
        safe_name = Path(backup_id).name
        local_path = backups_dir / safe_name
        if not local_path.is_file():
            raise FileNotFoundError(f"Arquivo local não encontrado: {safe_name}")
        local_path.unlink(missing_ok=True)
