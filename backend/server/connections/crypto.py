import base64
import json

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _get_fernet() -> Fernet:
    key = getattr(settings, "BI_FERNET_KEY", None)
    if not key:
        # Derive a deterministic dev key from SECRET_KEY (NOT for production).
        raw = (settings.SECRET_KEY + "bi").encode("utf-8")[:32].ljust(32, b"0")
        key = base64.urlsafe_b64encode(raw)
    if isinstance(key, str):
        key = key.encode("utf-8")
    return Fernet(key)


def encrypt_json(data: dict) -> str:
    token = _get_fernet().encrypt(json.dumps(data).encode("utf-8"))
    return token.decode("utf-8")


def decrypt_json(token: str) -> dict:
    if not token:
        return {}
    try:
        raw = _get_fernet().decrypt(token.encode("utf-8"))
    except InvalidToken:
        return {}
    return json.loads(raw.decode("utf-8"))

