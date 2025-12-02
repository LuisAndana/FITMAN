"""
core/security.py - Autenticación y seguridad
Versión final simplificada para FITMAN
"""
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer

import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-cámbiala-por-ENV")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


# ============================================================================
# FUNCIONES DE CONTRASEÑA
# ============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica que una contraseña coincida con su hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera el hash de una contraseña"""
    return pwd_context.hash(password)


# ============================================================================
# FUNCIONES DE TOKEN JWT
# ============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un token JWT con los datos proporcionados"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """Verifica un token JWT y retorna su payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================================
# DEPENDENCIA: GET_CURRENT_USER (REQUERIDA)
# ============================================================================

def get_current_user(credentials=Depends(security)):
    """
    Extrae y verifica el usuario actual desde el token JWT

    Uso en endpoints:
        @router.get("/protected")
        async def protected(current_user = Depends(get_current_user)):
            return {"user": current_user}
    """

    token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = verify_token(token)
        user_id: Optional[int] = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {"user_id": user_id, **payload}

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado o inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )