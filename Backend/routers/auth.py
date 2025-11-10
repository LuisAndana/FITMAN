# routers/auth.py
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

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={404: {"description": "Not found"}},
)

# ============================================================
# 🔹 Conexión a la base de datos
# ============================================================
def get_db():
    """Obtiene la sesión de base de datos."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================================
# 🔹 REGISTRO DE CLIENTE
# ============================================================
@router.post("/register", response_model=UsuarioResponse)
def register(usuario_data: UsuarioCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario (cliente).

    - nombre, correo (único), contrasena (8-72), edad, peso, altura
    - objetivo: bajar_peso | mantener | aumentar_masa
    """
    # ¿Correo ya existe?
    usuario_existente = db.query(Usuario).filter(
        Usuario.correo == usuario_data.correo
    ).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    # Validar/mapeo de objetivo -> Enum del modelo
    objetivos_validos = ["bajar_peso", "mantener", "aumentar_masa"]
    if usuario_data.objetivo not in objetivos_validos:
        raise HTTPException(
            status_code=400,
            detail=f"Objetivo inválido. Usa uno de: {', '.join(objetivos_validos)}"
        )
    try:
        objetivo_enum = ObjetivoUsuario[usuario_data.objetivo]
    except KeyError:
        raise HTTPException(status_code=400, detail="Objetivo inválido")

    # Crear usuario cliente
    nuevo_usuario = Usuario(
        nombre=usuario_data.nombre,
        correo=usuario_data.correo,
        contrasena=hash_password(usuario_data.contrasena),  # bcrypt ≤ 72 chars
        edad=usuario_data.edad,
        peso=usuario_data.peso,
        altura=usuario_data.altura,
        objetivo=objetivo_enum,
        tipo_usuario=TipoUsuarioEnum.cliente,
        validado=False,
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario

# ============================================================
# 🔹 REGISTRO DE NUTRIÓLOGO
# ============================================================
@router.post("/register/nutriologo", response_model=UsuarioResponse)
def register_nutriologo(data: UsuarioCreateNutriologo, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.correo == data.correo).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    user = Usuario(
        nombre=data.nombre,
        correo=data.correo,
        contrasena=hash_password(data.contrasena),
        # Métricas físicas NO requeridas para nutriólogo
        edad=None,
        peso=None,
        altura=None,
        objetivo=None,
        tipo_usuario=TipoUsuarioEnum.nutriologo,
        profesion=data.profesion,
        numero_cedula=data.numero_cedula,
        validado=False,
    )
    db.add(user); db.commit(); db.refresh(user)
    return user

# ============================================================
# 🔹 LOGIN
# ============================================================
@router.post("/login")
def login(credenciales: UsuarioLogin, db: Session = Depends(get_db)):
    """
    Inicia sesión con correo y contraseña.
    Devuelve un token JWT si las credenciales son correctas.
    """
    usuario = db.query(Usuario).filter(
        Usuario.correo == credenciales.correo
    ).first()

    if not usuario or not verify_password(credenciales.contrasena, usuario.contrasena):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_access_token({"sub": usuario.correo})
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
# 🔹 TEST
# ============================================================
@router.get("/test")
def test_auth():
    """Prueba que la ruta de autenticación está funcionando."""
    return {"message": "Ruta de autenticación funcionando ✅"}

