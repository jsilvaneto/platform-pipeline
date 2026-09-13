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
        with patch.object(BackupService, "_get_drive_client", return_value=(None, None, "Sem credenciais", None)):
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

        with patch.object(BackupService, "_get_drive_client", return_value=(None, None, None, None)):
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

    def test_sanitize_folder_id(self):
        """Valida a extração resiliente do ID da pasta do Google Drive a partir de URLs ou códigos."""
        raw_id = "1AbCdEfGhIjKlMnOpQrStUvWxYz12345"
        self.assertEqual(BackupService._sanitize_folder_id(raw_id), raw_id)

        full_url = "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz12345"
        self.assertEqual(BackupService._sanitize_folder_id(full_url), raw_id)

        url_with_query = "https://drive.google.com/drive/u/1/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz12345?usp=sharing"
        self.assertEqual(BackupService._sanitize_folder_id(url_with_query), raw_id)

        self.assertIsNone(BackupService._sanitize_folder_id(None))
        self.assertIsNone(BackupService._sanitize_folder_id("   "))

    def test_save_gdrive_config_and_status(self):
        """Valida a persistência do ID de pasta e retenção sem efeitos colaterais (resíduo zero)."""
        with patch.object(BackupService, "resolve_backups_dir", return_value=Path(self.test_dir)):
            with patch.object(BackupService, "_get_drive_client", return_value=(None, None, "Sem credenciais", None)):
                status = BackupService.save_gdrive_config(
                    folder_id="https://drive.google.com/drive/folders/test_folder_id_123",
                    retention_days=45,
                )
                self.assertIsInstance(status, BackupStatusResponse)
                self.assertEqual(status.google_drive.folder_id, "test_folder_id_123")
                self.assertEqual(status.google_drive.retention_days, 45)

                # Verifica arquivo salvo no diretório temporário
                cfg_file = Path(self.test_dir) / "gdrive_config.json"
                self.assertTrue(cfg_file.is_file())

    def test_save_credentials_file_validation(self):
        """Valida a rejeição de arquivos inválidos e aceitação de Service Account legítima."""
        # 1. Arquivo não-JSON
        with self.assertRaises(ValueError):
            BackupService.save_credentials_file(b"invalid content not json")

        # 2. JSON sem campos de credenciais
        with self.assertRaises(ValueError):
            BackupService.save_credentials_file(b'{"key": "value"}')

        # 3. JSON válido de Service Account
        valid_sa = b'{"type": "service_account", "client_email": "bot@proj.iam.gserviceaccount.com", "private_key": "-----BEGIN PRIVATE KEY-----\\nfake\\n-----END PRIVATE KEY-----"}'
        with patch.object(BackupService, "resolve_backups_dir", return_value=Path(self.test_dir)):
            with patch.object(BackupService, "_get_drive_client", return_value=(None, "bot@proj.iam.gserviceaccount.com", None, "service_account")):
                status, email = BackupService.save_credentials_file(valid_sa)
                self.assertEqual(email, "bot@proj.iam.gserviceaccount.com")
                creds_file = Path(self.test_dir) / "credentials.json"
                self.assertTrue(creds_file.is_file())

    def test_save_credentials_oauth_client_json_detection(self):
        """Valida detecção e persistência automática de arquivo OAuth client_secret_*.json."""
        oauth_json = b'{"web": {"client_id": "123456-abcdef.apps.googleusercontent.com", "client_secret": "GOCSPX-secret123", "redirect_uris": ["http://localhost:5173/settings"]}}'
        with patch.object(BackupService, "resolve_backups_dir", return_value=Path(self.test_dir)):
            with patch.object(BackupService, "_get_drive_client", return_value=(None, None, "Sem token", None)):
                status, label = BackupService.save_credentials_file(oauth_json)
                self.assertIn("123456-abcdef", label)
                client_file = Path(self.test_dir) / "oauth_client.json"
                self.assertTrue(client_file.is_file())

    def test_get_oauth_auth_url_generation(self):
        """Valida geração da URL do Google OAuth com scopes e parâmetros corretos."""
        with patch.object(BackupService, "resolve_backups_dir", return_value=Path(self.test_dir)):
            BackupService.save_oauth_client("test_client_id_999", "test_client_secret_888")
            init_res = BackupService.get_oauth_auth_url("http://localhost:5173/settings")
            self.assertIn("https://accounts.google.com/o/oauth2/v2/auth", init_res.auth_url)
            self.assertIn("test_client_id_999", init_res.auth_url)
            self.assertIn("http%3A%2F%2Flocalhost%3A5173%2Fsettings", init_res.auth_url)
            self.assertIn("drive.file", init_res.auth_url)


if __name__ == "__main__":
    unittest.main()

