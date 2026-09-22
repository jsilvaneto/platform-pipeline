import base64
import hashlib
from cryptography.fernet import Fernet
from app.core.config import settings


def _get_fernet_key() -> bytes:
    """Deriva uma chave segura de 32 bytes compatível com Fernet a partir do SECRET_KEY."""
    digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_secret(plain_text: str) -> str:
    """Criptografa texto sensível (ex: API key) gerando string cifrada segura."""
    if not plain_text:
        return ""
    fernet = Fernet(_get_fernet_key())
    return fernet.encrypt(plain_text.encode("utf-8")).decode("utf-8")


def decrypt_secret(cipher_text: str) -> str:
    """Descriptografa texto cifrado utilizando a chave mestre da aplicação."""
    if not cipher_text:
        return ""
    fernet = Fernet(_get_fernet_key())
    return fernet.decrypt(cipher_text.encode("utf-8")).decode("utf-8")


def mask_token(token: str) -> str:
    """Gera máscara visual para exibição segura no frontend sem expor o segredo."""
    if not token:
        return ""
    clean = token.strip()
    if len(clean) <= 8:
        return "••••••••"
    prefix = clean[:4]
    suffix = clean[-4:]
    return f"{prefix}••••••••{suffix}"
