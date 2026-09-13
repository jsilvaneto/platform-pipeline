import io
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

from fastapi import HTTPException, UploadFile

from app.schemas.attachment import AttachmentResponse
from app.schemas.storage import DirectoryHealth, StorageConfigResponse, StorageConfigUpdate
from app.services.attachment_service import AttachmentService
from app.services.storage_service import StorageService


class TestStorageAndAttachments(unittest.IsolatedAsyncioTestCase):
    """Suíte de testes para StorageService e AttachmentService garantindo integridade e resíduo zero."""

    def setUp(self):
        # Diretório temporário isolado para testes
        self.test_root = tempfile.mkdtemp(prefix="wallet_test_storage_")
        self.test_backups = Path(self.test_root) / "backups"
        self.test_attachments = Path(self.test_root) / "attachments"
        self.test_backups.mkdir(parents=True, exist_ok=True)
        self.test_attachments.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        # Política de Resíduo Zero: remoção completa de arquivos de teste
        if Path(self.test_root).exists():
            shutil.rmtree(self.test_root, ignore_errors=True)

    def test_windows_to_wsl_path_conversion(self):
        """Valida a conversão de caminhos do formato Windows para o formato WSL (/mnt/...)."""
        # Caminho Windows com barras invertidas
        res_c = StorageService.resolve_path(r"C:\Users\jsilvaneto\drive\wallet\backups", "backups")
        self.assertEqual(str(res_c), "/mnt/c/Users/jsilvaneto/drive/wallet/backups")

        # Caminho Windows com barras normais
        res_d = StorageService.resolve_path("D:/Backups/Wallet", "backups")
        self.assertEqual(str(res_d), "/mnt/d/Backups/Wallet")

        # Caminho Windows minúsculo
        res_g = StorageService.resolve_path("g:\\Meu Drive\\Wallet", "backups")
        self.assertEqual(str(res_g), "/mnt/g/Meu Drive/Wallet")

    def test_linux_path_resolution(self):
        """Valida que caminhos absolutos Linux/WSL são preservados."""
        res = StorageService.resolve_path("/mnt/c/Users/jsilvaneto/drive/wallet/backups", "backups")
        self.assertEqual(str(res), "/mnt/c/Users/jsilvaneto/drive/wallet/backups")

        res_app = StorageService.resolve_path("/app/storage/anexos", "attachments")
        self.assertEqual(str(res_app), "/app/storage/anexos")

    def test_inspect_directory_health(self):
        """Verifica diagnóstico de integridade, contagem de arquivos e permissões de escrita."""
        # Cria um arquivo de teste dentro de backups
        sample_file = self.test_backups / "sample_backup.dump"
        sample_file.write_bytes(b"DATA_1234567890")

        health = StorageService.inspect_directory(str(self.test_backups), "backups")
        self.assertIsInstance(health, DirectoryHealth)
        self.assertTrue(health.exists)
        self.assertTrue(health.is_writable)
        self.assertEqual(health.files_count, 1)
        self.assertGreaterEqual(health.free_space_bytes, 0)
        self.assertIsNone(health.error_message)

    def test_read_and_update_storage_config(self):
        """Verifica a leitura e atualização da configuração de diretórios com persistência."""
        cfg_file = Path(self.test_root) / "storage_config.json"

        with patch.object(StorageService, "get_config_file_path", return_value=cfg_file):
            # Inicialmente deve retornar padrões
            cfg_initial = StorageService.read_config()
            self.assertIn("backups_dir", cfg_initial)

            # Atualiza configuração apontando para diretórios de teste válidos
            payload = StorageConfigUpdate(
                backups_dir=str(self.test_backups),
                attachments_dir=str(self.test_attachments),
                backup_retention_days=45,
            )
            updated_resp = StorageService.update_config(payload)
            self.assertIsInstance(updated_resp, StorageConfigResponse)
            self.assertEqual(updated_resp.backup_retention_days, 45)
            self.assertTrue(updated_resp.backups.is_writable)
            self.assertTrue(updated_resp.attachments.is_writable)

            # Valida leitura pós-atualização
            cfg_read = StorageService.read_config()
            self.assertEqual(cfg_read["backups_dir"], str(self.test_backups))
            self.assertEqual(cfg_read["attachments_dir"], str(self.test_attachments))
            self.assertEqual(cfg_read["backup_retention_days"], 45)

    def test_sanitize_filename(self):
        """Garante sanitização de nomes de arquivos perigosos contra Path Traversal."""
        unsafe_1 = "../../../etc/passwd"
        cleaned_1 = AttachmentService._sanitize_filename(unsafe_1)
        self.assertNotIn("/", cleaned_1)
        self.assertNotIn("..", cleaned_1)
        self.assertIn("passwd", cleaned_1)

        unsafe_2 = "comprovante (1) & teste #.pdf"
        cleaned_2 = AttachmentService._sanitize_filename(unsafe_2)
        self.assertTrue(cleaned_2.endswith(".pdf"))
        self.assertNotIn(" ", cleaned_2)
        self.assertNotIn("&", cleaned_2)

    async def test_attachment_validation_invalid_category(self):
        """Garante rejeição com HTTP 400 para categoria não permitida."""
        fake_file = UploadFile(
            file=io.BytesIO(b"conteudo_teste"),
            filename="comprovante.pdf",
            headers={"content-type": "application/pdf"},
        )

        with self.assertRaises(HTTPException) as ctx:
            await AttachmentService.upload_attachment(
                db=None,  # type: ignore[arg-type]
                user_id="user_123",
                file=fake_file,
                category="CATEGORIA_INEXISTENTE",
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Categoria inválida", ctx.exception.detail)

    async def test_attachment_validation_invalid_extension(self):
        """Garante rejeição de extensões perigosas como .exe, .sh, .py."""
        fake_file = UploadFile(
            file=io.BytesIO(b"malware_content"),
            filename="executavel.exe",
            headers={"content-type": "application/octet-stream"},
        )

        with self.assertRaises(HTTPException) as ctx:
            await AttachmentService.upload_attachment(
                db=None,  # type: ignore[arg-type]
                user_id="user_123",
                file=fake_file,
                category="COMPROVANTE_PAGAMENTO",
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Formato de arquivo não suportado", ctx.exception.detail)

    async def test_attachment_validation_empty_file(self):
        """Garante rejeição de arquivos vazios (0 bytes)."""
        fake_file = UploadFile(
            file=io.BytesIO(b""),
            filename="vazio.pdf",
            headers={"content-type": "application/pdf"},
        )

        with self.assertRaises(HTTPException) as ctx:
            await AttachmentService.upload_attachment(
                db=None,  # type: ignore[arg-type]
                user_id="user_123",
                file=fake_file,
                category="COMPROVANTE_PAGAMENTO",
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("vazio", ctx.exception.detail)
