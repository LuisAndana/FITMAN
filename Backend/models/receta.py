from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from config.database import Base

class Receta(Base):
    __tablename__ = "recetas"

    id_receta = Column(Integer, primary_key=True, index=True)
    id_dieta = Column(Integer, ForeignKey("dietas.id_dieta", ondelete="CASCADE"))
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text)
    calorias = Column(Integer)
    tiempo_preparacion = Column(Integer)
    imagen_url = Column(String(255))

    # Relaciones
    dieta = relationship("Dieta", back_populates="recetas")
    ingredientes = relationship("Ingrediente", back_populates="receta", cascade="all, delete")
    calendario = relationship("CalendarioDieta", back_populates="receta", cascade="all, delete")
