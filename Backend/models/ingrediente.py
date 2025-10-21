from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from config.database import Base

class Ingrediente(Base):
    __tablename__ = "ingredientes"

    id_ingrediente = Column(Integer, primary_key=True, index=True)
    id_receta = Column(Integer, ForeignKey("recetas.id_receta", ondelete="CASCADE"))
    nombre = Column(String(100))
    cantidad = Column(String(50))
    unidad = Column(String(20))

    # Relaciones
    receta = relationship("Receta", back_populates="ingredientes")
