"""
core/security.py - Seguridad JWT
"""

from datetime import datetime, timedelta
from typing import Optional

from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext

from sqlalchemy.orm import Session
from config.database import SessionLocal
from models.user import Usuario

import logging
import os
from dotenv import load_dotenv

# ===============================
# LOGGING
# ===============================
logger = logging.getLogger("security")
logger.setLevel(logging.INFO)

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ===============================
# DB SESSION (DEBE IR AQUÍ ARRIBA)
# ===============================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===============================
# PASSWORD
# ===============================
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# ===============================
# TOKEN JWT
# ===============================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})

    logger.info(f"🪪 Generando token para payload: {to_encode}")

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        logger.info(f"🔍 Token verificado. Payload: {payload}")
        return payload

    except JWTError as e:
        logger.error(f"❌ Error verificando token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ===============================
# USUARIO ACTUAL (DEPENDENCIA)
# ===============================
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    logger.info(f"📥 Token recibido en get_current_user: {token}")

    if not token:
        logger.warning("❌ No se proporcionó token.")
        raise HTTPException(401, "Token no proporcionado")

    # Verificar JWT
    payload = verify_token(token)

    logger.info(f"🔍 Payload decodificado: {payload}")

    user_id = payload.get("sub")

    if user_id is None:
        logger.error("❌ Token recibido SIN 'sub'")
        raise HTTPException(401, "Token inválido")

    logger.info(f"🔎 Buscando usuario ID={user_id}")

    user = db.query(Usuario).filter(Usuario.id_usuario == user_id).first()

    if not user:
        logger.error(f"❌ Usuario con ID={user_id} no existe")
        raise HTTPException(401, f"Usuario con ID {user_id} no existe")

    logger.info(f"👤 Usuario autenticado: {user.nombre} ({user.tipo_usuario})")

    return user
