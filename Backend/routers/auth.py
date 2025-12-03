# routers/auth.py
# ===============================================
# ROUTER DE AUTENTICACIÓN - CORRECCIÓN FINAL
# ===============================================

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated

from config.database import SessionLocal
from models.user import Usuario, TipoUsuarioEnum, ObjetivoUsuario
from schemas.user_schema import (
    UsuarioLogin,
    UsuarioCreate,
    UsuarioCreateNutriologo,
    UsuarioResponse
)
# ✅ IMPORTAR DE core.deps (NO de core.security)
from core.deps import (
    get_db,
    get_current_user,
    verify_password,
    get_password_hash,
    create_access_token
)

logger = logging.getLogger("auth")
logger.setLevel(logging.INFO)

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={404: {"description": "Not found"}},
)


# ============================================================
# REGISTRO CLIENTE
# ============================================================
@router.post("/register", response_model=UsuarioResponse)
def register(usuario_data: UsuarioCreate, db: Session = Depends(get_db)):
    """Registra un nuevo cliente"""

    logger.info(f"📝 Registrando cliente: {usuario_data.correo}")

    if db.query(Usuario).filter(Usuario.correo == usuario_data.correo).first():
        logger.warning(f"❌ Correo duplicado: {usuario_data.correo}")
        raise HTTPException(400, "El correo ya está registrado")

    # Validación de objetivo
    objetivos_validos = ["bajar_peso", "mantener", "aumentar_masa"]
    if usuario_data.objetivo not in objetivos_validos:
        raise HTTPException(400, f"Objetivo inválido, usa: {', '.join(objetivos_validos)}")

    objetivo_enum = ObjetivoUsuario[usuario_data.objetivo]

    nuevo_usuario = Usuario(
        nombre=usuario_data.nombre,
        correo=usuario_data.correo,
        contrasena=get_password_hash(usuario_data.contrasena),
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

    logger.info(f"✅ Cliente registrado: ID={nuevo_usuario.id_usuario}")

    return nuevo_usuario


# ============================================================
# REGISTRO NUTRIÓLOGO
# ============================================================
@router.post("/register/nutriologo", response_model=UsuarioResponse)
def register_nutriologo(data: UsuarioCreateNutriologo, db: Session = Depends(get_db)):
    """Registra un nuevo nutriólogo"""

    logger.info(f"📝 Registrando nutriólogo: {data.correo}")

    if db.query(Usuario).filter(Usuario.correo == data.correo).first():
        logger.warning(f"❌ Correo duplicado: {data.correo}")
        raise HTTPException(400, "El correo ya está registrado")

    nuevo = Usuario(
        nombre=data.nombre,
        correo=data.correo,
        contrasena=get_password_hash(data.contrasena),

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

    logger.info(f"✅ Nutriólogo registrado: ID={nuevo.id_usuario}")

    return nuevo


# ============================================================
# LOGIN - LA PARTE CRÍTICA
# ============================================================
@router.post("/login")
def login(credenciales: UsuarioLogin, db: Session = Depends(get_db)):
    """
    Autentica usuario y retorna JWT token.

    El token se genera con {"sub": usuario.id_usuario}
    El frontend debe enviar: Authorization: Bearer <token>
    """

    logger.info(f"🔐 Intento de login: {credenciales.correo}")

    # Buscar usuario
    usuario = db.query(Usuario).filter(
        Usuario.correo == credenciales.correo
    ).first()

    # Validar credenciales
    if not usuario or not verify_password(credenciales.contrasena, usuario.contrasena):
        logger.warning(f"❌ Credenciales inválidas para: {credenciales.correo}")
        raise HTTPException(401, "Credenciales incorrectas")

    # ✅ GENERAR TOKEN CON user_id EN EL CAMPO "sub"
    token = create_access_token({"sub": str(usuario.id_usuario)})

    logger.info(f"✅ Login exitoso. Usuario: {usuario.nombre} (ID={usuario.id_usuario})")

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
# ✅ NUEVO: VALIDAR TOKEN (lo que faltaba)
# ============================================================
@router.post("/validacion")
def validar_token(
        current_user: Annotated[Usuario, Depends(get_current_user)]
):
    """
    POST /api/auth/validacion

    Valida que el token JWT es válido y retorna los datos del usuario.
    Útil para verificar autenticación en el frontend.
    """

    logger.info(f"✅ Token validado para usuario: {current_user.nombre}")

    return {
        "valido": True,
        "usuario": {
            "id": current_user.id_usuario,
            "nombre": current_user.nombre,
            "correo": current_user.correo,
            "tipo_usuario": current_user.tipo_usuario.value,
        }
    }


# ============================================================
# TEST
# ============================================================
@router.get("/test")
def test_auth():
    """Endpoint de prueba - sin autenticación"""
    return {"message": "✅ Ruta de autenticación funcionando"}