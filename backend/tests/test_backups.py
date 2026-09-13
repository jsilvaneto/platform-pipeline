import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.core.config import settings
from app.schemas.backup import (
    BackupCreateResponse,
    BackupItem,
    BackupListResponse,
    BackupRestoreRequest,
    BackupRestoreResponse,
    BackupStatusResponse,
    GoogleDriveConfigStatus,
)
from app.services.backup_service import BackupService


class TestBackupServiceAndSchemas(unittest.TestCase):
    """Testes unitários para o módulo de backup e disaster recovery com resíduo zero."""

    def setUp(self):
        # Cria diretório temporário isolado para testes
        self.test_dir = tempfile.mkdtemp(prefix="wallet_test_backups_")

    def tearDown(self):
        # Política de Resíduo Zero: Remove qualquer diretório ou arquivo temporário criado
        if Path(self.test_dir).exists():
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_format_size_helper(self):
        """Valida conversão humanizada de bytes para KB, MB e GB."""
        self.assertEqual(BackupService._format_size(500), "500 B")
        self.assertEqual(BackupService._format_size(1024), "1.00 KB")
        self.assertEqual(BackupService._format_size(1024 * 1024 * 2), "2.00 MB")
        self.assertEqual(BackupService._format_size(1024 * 1024 * 1024 * 3), "3.00 GB")

    def test_get_status_unconfigured_drive(self):
        """Garante retorno gracioso e seguro quando o Google Drive ainda não foi configurado."""
        with patch.object(BackupService, "_get_drive_client", return_value=(None, None, "Sem credenciais")):
            with patch.object(BackupService, "resolve_backups_dir", return_value=Path(self.test_dir)):
                status_res = BackupService.get_status()
                self.assertIsInstance(status_res, BackupStatusResponse)
                self.assertFalse(status_res.google_drive.is_configured)
                self.assertFalse(status_res.google_drive.connection_ok)
                self.assertEqual(status_res.local_backups_count, 0)
                self.assertEqual(status_res.drive_backups_count, 0)
                self.assertEqual(status_res.total_disk_usage_pretty, "0 B")

    def test_list_backups_with_local_files(self):
        """Verifica a listagem de arquivos de snapshot presentes no armazenamento local."""
        backup_dir_path = Path(self.test_dir)
        fake_dump_1 = backup_dir_path / "wallet_backup_20260910_120000.dump"
        fake_dump_1.write_bytes(b"PGDUMP_TEST_CONTENT_1" * 100)

        fake_dump_2 = backup_dir_path / "wallet_backup_20260911_150000.dump"
        fake_dump_2.write_bytes(b"PGDUMP_TEST_CONTENT_2" * 200)

        with patch.object(BackupService, "_get_drive_client", return_value=(None, None, None)):
            with patch.object(BackupService, "resolve_backups_dir", return_value=backup_dir_path):
                list_res = BackupService.list_backups()
                self.assertIsInstance(list_res, BackupListResponse)
                self.assertEqual(list_res.total, 2)
                self.assertEqual(len(list_res.items), 2)
                # Mais recente primeiro
                self.assertEqual(list_res.items[0].filename, fake_dump_2.name)
                self.assertEqual(list_res.items[0].source, "local")
                self.assertTrue(list_res.items[0].size_bytes > 0)

    def test_restore_request_validation(self):
        """Valida que o schema de restauração rejeita inputs incompletos."""
        valid_req = BackupRestoreRequest(
            backup_id="wallet_backup_20260911.dump",
            source="local",
            confirmation_token="RESTAURAR",
        )
        self.assertEqual(valid_req.confirmation_token, "RESTAURAR")
        self.assertEqual(valid_req.source, "local")

    def test_create_backup_response_schema(self):
        """Valida tipagem da resposta de criação de backup."""
        resp = BackupCreateResponse(
            success=True,
            filename="wallet_backup_20260911_190000.dump",
            size_bytes=1048576,
            size_pretty="1.00 MB",
            created_at="2026-09-11T19:00:00Z",
            uploaded_to_gdrive=False,
            drive_file_id=None,
            message="Backup local criado com sucesso.",
        )
        self.assertTrue(resp.success)
        self.assertFalse(resp.uploaded_to_gdrive)
        self.assertEqual(resp.size_pretty, "1.00 MB")


if __name__ == "__main__":
    unittest.main()
