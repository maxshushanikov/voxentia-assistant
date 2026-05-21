"""Optional Fernet encryption for sensitive DB text fields."""

from __future__ import annotations

from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator


class EncryptedText(TypeDecorator):
    """Transparent encrypt/decrypt; legacy plain text still readable."""

    impl = Text
    cache_ok = True

    def __init__(self, key: bytes | None, enabled: bool = False):
        self.enabled = enabled and bool(key)
        self.cipher = None
        if self.enabled and key:
            from cryptography.fernet import Fernet

            self.cipher = Fernet(key)
        super().__init__()

    def process_bind_param(self, value, dialect):
        if value is None or not self.enabled or not self.cipher:
            return value
        return self.cipher.encrypt(value.encode("utf-8")).decode("utf-8")

    def process_result_value(self, value, dialect):
        if value is None or not self.enabled or not self.cipher:
            return value
        try:
            return self.cipher.decrypt(value.encode("utf-8")).decode("utf-8")
        except Exception:
            return value
