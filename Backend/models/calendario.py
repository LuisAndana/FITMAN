from sqlalchemy import Column, Integer, Enum, ForeignKey
from sqlalchemy.orm import relationship
from config.database import Base
import enum

class DiaSemana(enum.Enum):
    lunes = "lunes"
    martes = "martes"
    miercoles = "miercoles"
    jueves = "jueves"
    viernes = "viernes"
    sabado = "sabado"
    domingo = "domingo"

class TipoComida(enum.Enum):
    desayuno = "desayuno"
    comida = "comida"
    cena = "cena"
    snack = "snack"

class CalendarioDieta(Base):
    __tablename__ = "calendario_dieta"

    id_calendario = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"))
    id_receta = Column(Integer, ForeignKey("recetas.id_receta", ondelete="CASCADE"))
    dia_semana = Column(Enum(DiaSemana))
    comida = Column(Enum(TipoComida))

    # Relaciones
    usuario = relationship("Usuario", back_populates="calendario")
    receta = relationship("Receta", back_populates="calendario")
