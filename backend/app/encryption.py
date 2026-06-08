import base64

from cryptography.fernet import Fernet
from app.config import settings

_fernet = Fernet(
    base64.urlsafe_b64encode(
        settings.encryption_key.encode()[:32].ljust(32, b"0")
    )
)


def encrypt(plain: str) -> str:
    return _fernet.encrypt(plain.encode()).decode()


def decrypt(token: str) -> str:
    return _fernet.decrypt(token.encode()).decode()
