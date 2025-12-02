# routers/auth.py
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import SessionLocal
from models.user import Usuario, TipoUsuarioEnum, ObjetivoUsuario
from schemas.user_schema import (
    UsuarioLogin,
    UsuarioCreate,
    UsuarioCreateNutriologo,
    UsuarioResponse
)
from services.auth_service import verify_password, create_access_token, hash_password
logger = logging.getLogger("auth")
logger.setLevel(logging.INFO)

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={404: {"description": "Not found"}},
)

# ============================================================
# DB SESSION
# ============================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================================
# REGISTRO CLIENTE
# ============================================================
@router.post("/register", response_model=UsuarioResponse)
def register(usuario_data: UsuarioCreate, db: Session = Depends(get_db)):

    if db.query(Usuario).filter(Usuario.correo == usuario_data.correo).first():
        raise HTTPException(400, "El correo ya está registrado")

    # Validación de objetivo
    objetivos_validos = ["bajar_peso", "mantener", "aumentar_masa"]
    if usuario_data.objetivo not in objetivos_validos:
        raise HTTPException(400, f"Objetivo inválido, usa: {', '.join(objetivos_validos)}")

    objetivo_enum = ObjetivoUsuario[usuario_data.objetivo]

    nuevo_usuario = Usuario(
        nombre=usuario_data.nombre,
        correo=usuario_data.correo,
        contrasena=hash_password(usuario_data.contrasena),
        edad=usuario_data.edad,
        peso=usuario_data.peso,
        altura=usuario_data.altura,
        objetivo=objetivo_enum,
        tipo_usuario=TipoUsuarioEnum.cliente,
        validado=False
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


# ============================================================
# REGISTRO NUTRIÓLOGO (CORRECTO PARA STRIPE)
# ============================================================
@router.post("/register/nutriologo", response_model=UsuarioResponse)
def register_nutriologo(data: UsuarioCreateNutriologo, db: Session = Depends(get_db)):

    if db.query(Usuario).filter(Usuario.correo == data.correo).first():
        raise HTTPException(400, "El correo ya está registrado")

    nuevo = Usuario(
        nombre=data.nombre,
        correo=data.correo,
        contrasena=hash_password(data.contrasena),

        # Info de nutriólogo
        profesion=data.profesion,
        numero_cedula=data.numero_cedula,

        # Tipo de cuenta
        tipo_usuario=TipoUsuarioEnum.nutriologo,

        # Se valida después
        validado=False,

        # No aplica para nutriólogo
        edad=None,
        peso=None,
        altura=None,
        objetivo=None,
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


# ============================================================
# LOGIN
# ============================================================
@router.post("/login")
def login(credenciales: UsuarioLogin, db: Session = Depends(get_db)):

    usuario = db.query(Usuario).filter(
        Usuario.correo == credenciales.correo
    ).first()

    if not usuario or not verify_password(credenciales.contrasena, usuario.contrasena):
        raise HTTPException(401, "Credenciales incorrectas")

    # 👉 EL CAMBIO IMPORTANTE
    token = create_access_token({"sub": usuario.id_usuario})

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario.id_usuario,
            "nombre": usuario.nombre,
            "correo": usuario.correo,
            "tipo_usuario": usuario.tipo_usuario.value,
        },
    }


# ============================================================
# TEST
# ============================================================
@router.get("/test")
def test_auth():
    return {"message": "Ruta de autenticación funcionando ✅"}
