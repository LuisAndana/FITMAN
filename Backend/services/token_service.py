from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from config.database import SessionLocal
from models.user import Usuario
from services.auth_service import SECRET_KEY, ALGORITHM

# 🔹 URL donde se envía el token (Bearer)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# 🔹 Decodificar token y obtener usuario actual
def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decodificar token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        correo: str = payload.get("sub")
        if correo is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Buscar usuario en la base de datos
    db = SessionLocal()
    user = db.query(Usuario).filter(Usuario.correo == correo).first()
    db.close()

    if user is None:
        raise credentials_exception

    return user
