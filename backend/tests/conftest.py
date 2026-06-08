import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("ENCRYPTION_KEY", "test-key-12345678901234567890123456789012")
