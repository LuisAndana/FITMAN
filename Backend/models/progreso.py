from sqlalchemy import Column, Integer, DECIMAL, Date, String, ForeignKey
from sqlalchemy.orm import relationship
from datetime import date
from config.database import Base

class Progreso(Base):
    __tablename__ = "progreso"

    id_progreso = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"))
    peso = Column(DECIMAL(5,2))
    imc = Column(DECIMAL(5,2))
    fecha_registro = Column(Date, default=date.today)
    comentario = Column(String(255))

    # Relaciones
    usuario = relationship("Usuario", back_populates="progresos")
