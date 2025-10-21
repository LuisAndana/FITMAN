from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import SessionLocal
from models.user import Usuario
from schemas.user_schema import UsuarioLogin
from services.auth_service import verify_password, create_access_token

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/login")
def login(usuario: UsuarioLogin, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.correo == usuario.correo).first()
    if not user or not verify_password(usuario.contrasena, user.contrasena):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_access_token({"sub": user.correo})
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": user.nombre
    }
