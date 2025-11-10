# models/user.py
from sqlalchemy import (
    Column, Integer, String, DateTime, Enum as SAEnum,
    Float, Boolean, Text, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base
import enum

# JSON genérico (funciona en Postgres/MySQL/SQLite con SQLAlchemy moderno)
try:
    from sqlalchemy import JSON  # SQLAlchemy 1.4+
except Exception:  # fallback muy conservador (no suele ser necesario)
    from sqlalchemy.dialects.sqlite import JSON  # type: ignore


# =========================
# Enums
# =========================
class ObjetivoUsuario(enum.Enum):
    bajar_peso = "bajar_peso"
    mantener = "mantener"
    aumentar_masa = "aumentar_masa"


class TipoUsuarioEnum(enum.Enum):
    cliente = "cliente"
    nutriologo = "nutriologo"


class EstadoValidacionEnum(enum.Enum):
    pendiente = "pendiente"
    aprobado = "aprobado"
    rechazado = "rechazado"


# =========================
# Modelos
# =========================
class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    correo = Column(String(100), unique=True, nullable=False)
    contrasena = Column(String(255), nullable=False)

    edad = Column(Integer, nullable=True)
    peso = Column(Float, nullable=True)
    altura = Column(Float, nullable=True)
    peso_inicial = Column(Float, nullable=True)            # ⬅️ NUEVO

    objetivo = Column(SAEnum(ObjetivoUsuario), nullable=True)

    # Enum directo (sin tabla intermedia)
    tipo_usuario = Column(SAEnum(TipoUsuarioEnum), nullable=False, default=TipoUsuarioEnum.cliente)

    # Campos de nutriólogo
    profesion = Column(String(100), nullable=True)
    numero_cedula = Column(String(50), unique=True, nullable=True)
    validado = Column(Boolean, default=False)

    # URL pública del documento cargado (para vista en frontend)
    documento_url = Column(String(255), nullable=True)     # ⬅️ NUEVO

    # Datos médicos extendidos
    enfermedades = Column(JSON, nullable=True, default=list)    # ⬅️ NUEVO (lista de strings)
    descripcion_medica = Column(Text, nullable=True)            # ⬅️ NUEVO (texto libre)

    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    dietas = relationship("Dieta", back_populates="usuario", cascade="all, delete")
    progresos = relationship("Progreso", back_populates="usuario", cascade="all, delete")
    logros = relationship("Logro", back_populates="usuario", cascade="all, delete")
    calendario = relationship("CalendarioDieta", back_populates="usuario", cascade="all, delete")

    # 1–1 con ValidacionNutriologo
    validaciones_nutriologo = relationship(
        "ValidacionNutriologo",
        back_populates="usuario",
        cascade="all, delete",
        uselist=True,
        foreign_keys="[ValidacionNutriologo.id_usuario]"
    )


class ValidacionNutriologo(Base):
    __tablename__ = "validaciones_nutriologo"

    id_validacion = Column("id_validacion", Integer, primary_key=True, autoincrement=True)
    id_usuario   = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)

    filename      = Column(String(255), nullable=True)
    documento_url = Column(String(255), nullable=True)
    content_type  = Column(String(100), nullable=True)
    tamano        = Column(Integer, nullable=True)

    estado        = Column(String(20), nullable=False, default="pendiente")
    revisor_id    = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    comentario    = Column(String(500), nullable=True)

    creado_en     = Column(DateTime, server_default=func.now(), nullable=False)
    actualizado_en= Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    usuario  = relationship("Usuario", foreign_keys=[id_usuario], back_populates="validaciones_nutriologo")
    revisor  = relationship("Usuario", foreign_keys=[revisor_id])


