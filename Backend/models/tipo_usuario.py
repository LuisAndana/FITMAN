from sqlalchemy import Column, Integer, String, DateTime, Enum, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from config.database import Base
import enum


class TipoUsuarioEnum(enum.Enum):
    cliente = "cliente"
    nutriologo = "nutriologo"


class TipoUsuario(Base):
    """
    Modelo para definir los tipos de usuario en el sistema FitSo
    - CLIENTE: Puede ver su progreso, seguir rutinas y planes
    - NUTRIOLOGO: Puede crear dietas, validar y ser asignado a clientes
    """
    __tablename__ = "tipos_usuario"

    id_tipo_usuario = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)  # "cliente", "nutriologo"
    descripcion = Column(String(255), nullable=True)
    permisos = Column(Text, nullable=True)  # JSON con permisos específicos
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    usuarios = relationship("Usuario", back_populates="tipo_usuario")


class ValidacionNutriologo(Base):
    """
    Modelo para almacenar documentos de validación de nutriólogos
    - Cédula profesional
    - Certificados
    - Validación del sistema
    """
    __tablename__ = "validaciones_nutriologo"

    id_validacion = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), unique=True)

    # Documentos
    cedula_profesional = Column(String(255), nullable=False)  # URL del archivo
    certificado_titulo = Column(String(255), nullable=False)  # URL del archivo
    numero_cedula = Column(String(50), unique=True, nullable=False)

    # Validación
    validado = Column(Boolean, default=False)
    validado_por = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)  # Admin que valida
    fecha_validacion = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    fecha_solicitud = Column(DateTime(timezone=True), server_default=func.now())
    comentarios = Column(Text, nullable=True)

    # Relaciones
    usuario = relationship("Usuario", foreign_keys=[id_usuario])
    validador = relationship("Usuario", foreign_keys=[validado_por])