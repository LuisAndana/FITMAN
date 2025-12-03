# ============================================================
# ARCHIVO 1: Backend/core/deps.py - COMPLETO Y CORREGIDO
# ============================================================

# Backend/core/deps.py - CORRECCIÓN v2
# ===============================================
# ÚNICA FUENTE DE VERDAD PARA AUTENTICACIÓN
# ===============================================

from typing import Annotated, Optional
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
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
logger = logging.getLogger("auth")
logger.setLevel(logging.DEBUG)

# ===============================
# VARIABLES DE ENTORNO
# ===============================
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

print(f"✅ SECRET_KEY cargada desde .env")
print(f"✅ ALGORITHM: {ALGORITHM}")
print(f"✅ ACCESS_TOKEN_EXPIRE_MINUTES: {ACCESS_TOKEN_EXPIRE_MINUTES}")

# ===============================
# CONTEXTO DE SEGURIDAD
# ===============================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


# ===============================
# DB SESSION
# ===============================
def get_db():
    """Dependencia para obtener la sesión de BD"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===============================
# PASSWORD HASHING
# ===============================
def verify_password(plain: str, hashed: str) -> bool:
    """Verifica contraseña en texto plano contra hash bcrypt"""
    try:
        return pwd_context.verify(plain, hashed)
    except Exception as e:
        logger.error(f"❌ Error verificando contraseña: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Genera hash bcrypt de una contraseña"""
    return pwd_context.hash(password)


# ===============================
# JWT TOKEN MANAGEMENT
# ===============================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un JWT token con los datos proporcionados.

    Args:
        data: Dict con los datos a codificar (ej: {"sub": "1"})
        expires_delta: Tiempo de expiración (default: 24 horas)

    Returns:
        Token JWT codificado
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    logger.info(f"🪪 Generando token para payload: {to_encode}")

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    logger.info(f"✅ Token generado exitosamente")

    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """
    Decodifica y valida un JWT token.

    Args:
        token: Token JWT a validar

    Returns:
        Payload decodificado

    Raises:
        HTTPException: Si el token es inválido o expiró
    """
    try:
        logger.debug(f"🔍 Decodificando token: {token[:20]}...")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        logger.debug(f"✅ Token decodificado. Payload: {payload}")

        return payload

    except JWTError as e:
        logger.error(f"❌ Error decodificando token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ===============================
# USUARIO ACTUAL (DEPENDENCIA PRINCIPAL)
# ===============================
def get_current_user(
        credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
        db: Annotated[Session, Depends(get_db)],
) -> Usuario:
    """
    Valida el JWT token y retorna el usuario autenticado.

    Uso en routers:
        @router.get("/endpoint")
        def endpoint(current_user: Annotated[Usuario, Depends(get_current_user)]):
            return {"usuario": current_user.nombre}

    Args:
        credentials: Credenciales HTTP Bearer
        db: Sesión de base de datos

    Returns:
        Usuario autenticado desde la BD

    Raises:
        HTTPException: Si el token es inválido o usuario no existe
    """

    # ✅ PASO 1: Validar que se recibió credenciales
    if not credentials:
        logger.warning("❌ No se proporcionaron credenciales")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Proporciona el token Bearer.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    logger.info(f"📥 Token recibido (primeros 30 chars): {token[:30]}...")

    # ✅ PASO 2: Decodificar y validar JWT
    payload = decode_access_token(token)

    # ✅ PASO 3: Extraer user_id del payload
    user_id_str = payload.get("sub")

    if user_id_str is None:
        logger.error("❌ Token sin campo 'sub' (user_id)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: falta identificador de usuario",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ✅ CONVERSIÓN IMPORTANTE: El JWT tiene "sub" como string, convertir a int
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        logger.error(f"❌ No se pudo convertir user_id a int: {user_id_str}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: identificador de usuario incorrecto",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.debug(f"🔎 Buscando usuario con ID={user_id}")

    # ✅ PASO 4: Obtener usuario de la BD
    user = db.query(Usuario).filter(Usuario.id_usuario == user_id).first()

    if not user:
        logger.error(f"❌ Usuario ID={user_id} no encontrado en BD")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Usuario con ID {user_id} no existe",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(f"✅ Usuario autenticado: {user.nombre} (ID={user.id_usuario}, Tipo={user.tipo_usuario})")

    return user


# ===============================
# TYPE ALIASES (para usar en routers)
# ===============================
DbDep = Annotated[Session, Depends(get_db)]
UserDep = Annotated[Usuario, Depends(get_current_user)]