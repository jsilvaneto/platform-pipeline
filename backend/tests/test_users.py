import unittest
from pydantic import ValidationError
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password

class TestUserManagementDomain(unittest.TestCase):
    """Testes unitários para schemas e regras de negócio de usuários."""

    def test_user_create_validation(self):
        """Valida criação de usuário com parâmetros válidos."""
        user_in = UserCreate(username="financeiro", password="senhaForte123", is_admin=False)
        self.assertEqual(user_in.username, "financeiro")
        self.assertFalse(user_in.is_admin)

    def test_user_create_rejects_short_password(self):
        """Garante rejeição de senhas menores que 6 caracteres."""
        with self.assertRaises(ValidationError):
            UserCreate(username="usuario1", password="123")

    def test_user_create_rejects_short_username(self):
        """Garante rejeição de username com menos de 3 caracteres."""
        with self.assertRaises(ValidationError):
            UserCreate(username="ab", password="senhaForte123")

    def test_user_update_optional_fields(self):
        """Valida que UserUpdate aceita campos opcionais para edição cirúrgica."""
        up1 = UserUpdate(is_active=False)
        self.assertFalse(up1.is_active)
        self.assertIsNone(up1.password)

        up2 = UserUpdate(password="novaSenha456")
        self.assertEqual(up2.password, "novaSenha456")

    def test_password_hash_and_verification(self):
        """Valida criptografia segura de senhas via bcrypt."""
        raw_password = "meu_segredo_pessoal"
        hashed = get_password_hash(raw_password)
        self.assertTrue(verify_password(raw_password, hashed))
        self.assertFalse(verify_password("senha_incorreta", hashed))

if __name__ == "__main__":
    unittest.main()
