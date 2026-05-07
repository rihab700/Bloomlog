from typing import Any
import jwt
from app.core.config import settings
from datetime import timedelta
from datetime import datetime, timezone
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher


password_hash = PasswordHash(
    (
        Argon2Hasher(),
        BcryptHasher(),
    )
)

ALGORITHM = "HS256"


def create_access_token(subject: str | Any, expires_delta: timedelta) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> tuple[bool, str | None]:
    """Verify the provided password against the stored hash."""
    return password_hash.verify_and_update(plain_password, hashed_password)


def get_hash_password(password: str) -> str:
    """Hash the password using the configured hasher."""
    return password_hash.hash(password)