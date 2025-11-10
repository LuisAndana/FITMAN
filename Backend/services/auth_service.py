# services/auth_service.py
from __future__ import annotations

import os
import unicodedata
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from passlib.context import CryptContext
from jose import jwt, JWTError  # pip install "python-jose[cryptography]"

# =========================
# Password hashing
# =========================
# ⬇️ CAMBIO CLAVE: usar bcrypt_sha256
pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")

MAX_BCRYPT_BYTES = 72  # lo dejamos por si acaso


def _normalize_and_truncate(password: str | None) -> str:
    """
    Normaliza a NFKC y, si quieres, recorta.
    Con bcrypt_sha256 ya no es obligatorio, pero lo dejamos por seguridad.
    """
    if not password:
        return ""
    pw = unicodedata.normalize("NFKC", password)
    b = pw.encode("utf-8")
    if len(b) > MAX_BCRYPT_BYTES:
        b = b[:MAX_BCRYPT_BYTES]
        pw = b.decode("utf-8", errors="ignore")
    return pw


def hash_password(password: str) -> str:
    pw = _normalize_and_truncate(password)
    return pwd_context.hash(pw)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pw = _normalize_and_truncate(plain_password)
    return pwd_context.verify(pw, hashed_password)


# ===========
# JWT helpers
# ===========
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-super-secret-change-me")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MIN", "60"))


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload


__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_access_token",
]
