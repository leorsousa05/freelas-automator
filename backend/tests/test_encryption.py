from app.encryption import encrypt, decrypt


def test_encrypt_decrypt():
    plain = "my-secret-password"
    enc = encrypt(plain)
    assert enc != plain
    dec = decrypt(enc)
    assert dec == plain


def test_decrypt_invalid():
    try:
        decrypt("invalid-token")
        assert False, "Should raise"
    except Exception:
        pass
