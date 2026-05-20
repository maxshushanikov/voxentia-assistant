from app.core.field_encryption import EncryptedText


def test_encrypted_text_roundtrip():
    key = Fernet = __import__("cryptography.fernet", fromlist=["Fernet"]).Fernet.generate_key()
    col = EncryptedText(key, enabled=True)
    plain = "Secret chat message"
    stored = col.process_bind_param(plain, None)
    assert stored != plain
    assert col.process_result_value(stored, None) == plain


def test_encrypted_text_legacy_plain_fallback():
    key = __import__("cryptography.fernet", fromlist=["Fernet"]).Fernet.generate_key()
    col = EncryptedText(key, enabled=True)
    legacy = "unencrypted legacy row"
    assert col.process_result_value(legacy, None) == legacy
