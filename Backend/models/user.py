from sqlalchemy import Column, Integer, String, DateTime, Enum, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from config.database import Base
import enum


class ObjetivoUsuario(enum.Enum):
    bajar_peso = "bajar_peso"
    mantener = "mantener"
    aumentar_masa = "aumentar_masa"


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    correo = Column(String(100), unique=True, nullable=False)
    contrasena = Column(String(255), nullable=False)
    edad = Column(Integer, nullable=True)
    peso = Column(Float, nullable=True)
    altura = Column(Float, nullable=True)
    objetivo = Column(Enum(ObjetivoUsuario), nullable=True)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())
    id_tipo_usuario = Column(Integer, nullable=True)

    # Relaciones
    dietas = relationship("Dieta", back_populates="usuario", cascade="all, delete")
    progresos = relationship("Progreso", back_populates="usuario", cascade="all, delete")
    logros = relationship("Logro", back_populates="usuario", cascade="all, delete")
    calendario = relationship("CalendarioDieta", back_populates="usuario", cascade="all, delete")
