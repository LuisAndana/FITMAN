from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import SessionLocal
from models.user import Usuario
from schemas.user_schema import UsuarioCreate, UsuarioResponse
from services.auth_service import hash_password
import traceback

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
# 🔹 Registrar un nuevo usuario
# ============================================================
@router.post("/register", response_model=UsuarioResponse)
def register_user(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario en la base de datos.
    - Verifica si el correo ya existe.
    - Cifra la contraseña antes de guardarla.
    """

    # 🔍 Verificar si el correo ya está en uso
    usuario_existente = db.query(Usuario).filter(Usuario.correo == usuario.correo).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    try:
        #  Cifrar la contraseña
        hashed_password = hash_password(usuario.contrasena)

        #  Crear el nuevo usuario
        nuevo_usuario = Usuario(
            nombre=usuario.nombre,
            correo=usuario.correo,
            contrasena=hashed_password,
            edad=usuario.edad,
            peso=usuario.peso,
            altura=usuario.altura,
            objetivo=usuario.objetivo,
            id_tipo_usuario=None,  # 🔹 Puedes cambiarlo si tienes roles
        )

        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)

        return nuevo_usuario

    except Exception as e:
        db.rollback()
        print(" Error al registrar usuario:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


# ============================================================
# 🔹 Obtener perfil del usuario autenticado (ejemplo)
# ============================================================
@router.get("/me", response_model=UsuarioResponse)
def get_profile(db: Session = Depends(get_db)):
    """
    Obtiene el perfil del usuario (demo temporal).
    En el futuro se implementará JWT.
    """
    user = db.query(Usuario).first()
    if not user:
        raise HTTPException(status_code=404, detail="No hay usuarios registrados")
    return user
