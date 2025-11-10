# core/deps.py
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from config.database import SessionLocal
from models.user import Usuario, TipoUsuarioEnum
from services.auth_service import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> Usuario:
    """
    Lee el JWT, obtiene el correo en `sub` y regresa el Usuario.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
    except Exception:
        # jose.JWTError o cualquier error de decode
        raise credentials_exception

    correo = payload.get("sub")
    if correo is None:
        raise credentials_exception

    user = db.query(Usuario).filter(Usuario.correo == correo).first()
    if not user:
        raise credentials_exception

    return user
