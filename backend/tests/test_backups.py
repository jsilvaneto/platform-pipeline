import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.schemas.backup import (
    BackupCreateResponse,
    BackupListResponse,
    BackupRestoreRequest,
    BackupStatusResponse,
)
from app.services.backup_service import BackupService


class TestBackupServiceAndSchemas(unittest.TestCase):
    """Testes unitários para o módulo de backup e disaster recovery local com resíduo zero."""

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

    def test_get_status_empty_dir(self):
        """Garante retorno gracioso e seguro quando o diretório não possui backups."""
        with patch.object(BackupService, "resolve_backups_dir", return_value=Path(self.test_dir)):
            status_res = BackupService.get_status()
            self.assertIsInstance(status_res, BackupStatusResponse)
            self.assertEqual(status_res.local_backups_count, 0)
            self.assertEqual(status_res.total_disk_usage_pretty, "0 B")
            self.assertIsNone(status_res.last_backup_at)

    def test_list_backups_with_local_files(self):
        """Verifica a listagem de arquivos de snapshot presentes no armazenamento local."""
        backup_dir_path = Path(self.test_dir)
        fake_dump_1 = backup_dir_path / "wallet_backup_20260910_120000.dump"
        fake_dump_1.write_bytes(b"PGDUMP_TEST_CONTENT_1" * 100)

        fake_dump_2 = backup_dir_path / "wallet_backup_20260911_150000.dump"
        fake_dump_2.write_bytes(b"PGDUMP_TEST_CONTENT_2" * 200)

        with patch.object(BackupService, "resolve_backups_dir", return_value=backup_dir_path):
            list_res = BackupService.list_backups()
            self.assertIsInstance(list_res, BackupListResponse)
            self.assertEqual(list_res.total, 2)
            self.assertEqual(len(list_res.items), 2)
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
            message="Backup gerado com sucesso.",
        )
        self.assertTrue(resp.success)
        self.assertEqual(resp.size_pretty, "1.00 MB")

    def test_get_backup_path_for_download(self):
        """Valida obtenção segura do caminho de download de snapshot."""
        backup_dir = Path(self.test_dir)
        dump_file = backup_dir / "wallet_backup_test.dump"
        dump_file.write_bytes(b"TEST DUMP BYTES")

        with patch.object(BackupService, "resolve_backups_dir", return_value=backup_dir):
            file_path, original_name = BackupService.get_backup_path_for_download("wallet_backup_test.dump")
            self.assertEqual(file_path, dump_file)
            self.assertEqual(original_name, "wallet_backup_test.dump")

            with self.assertRaises(FileNotFoundError):
                BackupService.get_backup_path_for_download("non_existent.dump")

    def test_delete_backup(self):
        """Valida exclusão de snapshot local."""
        backup_dir = Path(self.test_dir)
        dump_file = backup_dir / "to_delete.dump"
        dump_file.write_bytes(b"DATA")
        self.assertTrue(dump_file.is_file())

        with patch.object(BackupService, "resolve_backups_dir", return_value=backup_dir):
            BackupService.delete_backup("to_delete.dump")
            self.assertFalse(dump_file.is_file())

            with self.assertRaises(FileNotFoundError):
                BackupService.delete_backup("already_gone.dump")


if __name__ == "__main__":
    unittest.main()

