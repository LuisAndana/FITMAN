from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import SessionLocal
from models.user import Usuario
from schemas.user_schema import UsuarioLogin
from services.auth_service import verify_password, create_access_token

router = APIRouter()


# ============================================================
# 🔹 Conexión a la base de datos
# ============================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# 🔹 Ruta de inicio de sesión (login)
# ============================================================
@router.post("/login")
def login(usuario: UsuarioLogin, db: Session = Depends(get_db)):
    """
    Inicia sesión con correo y contraseña.
    Devuelve un token JWT si las credenciales son correctas.
    """
    user = db.query(Usuario).filter(Usuario.correo == usuario.correo).first()

    if not user or not verify_password(usuario.contrasena, user.contrasena):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_access_token({"sub": user.correo})

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {"id": user.id_usuario, "nombre": user.nombre, "correo": user.correo}
    }


# ============================================================
# 🔹 Ruta de prueba
# ============================================================
@router.get("/test")
def test_auth():
    return {"message": "Ruta de autenticación funcionando 🔐"}
