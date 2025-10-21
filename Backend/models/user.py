from sqlalchemy import Column, Integer, String, DateTime, Enum, DECIMAL
from sqlalchemy.orm import relationship
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
    correo = Column(String(100), unique=True, index=True, nullable=False)
    contrasena = Column(String(255), nullable=False)
    edad = Column(Integer)
    peso = Column(DECIMAL(5,2))
    altura = Column(DECIMAL(5,2))
    objetivo = Column(Enum(ObjetivoUsuario), default=ObjetivoUsuario.mantener)
    fecha_registro = Column(DateTime, default=datetime.now)

    # Relaciones
    dietas = relationship("Dieta", back_populates="usuario", cascade="all, delete")
    progresos = relationship("Progreso", back_populates="usuario", cascade="all, delete")
    logros = relationship("Logro", back_populates="usuario", cascade="all, delete")
    calendario = relationship("CalendarioDieta", back_populates="usuario", cascade="all, delete")
