from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base
import enum

class ObjetivoDieta(enum.Enum):
    perdida_grasa = "perdida_grasa"
    definicion = "definicion"
    volumen = "volumen"
    saludable = "saludable"

class Dieta(Base):
    __tablename__ = "dietas"

    id_dieta = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"))
    nombre = Column(String(100))
    descripcion = Column(Text)
    objetivo = Column(Enum(ObjetivoDieta))
    calorias_totales = Column(Integer)
    fecha_creacion = Column(DateTime, default=datetime.now)

    # Relaciones
    usuario = relationship("Usuario", back_populates="dietas")
    recetas = relationship("Receta", back_populates="dieta", cascade="all, delete")
