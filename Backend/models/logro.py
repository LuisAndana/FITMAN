from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from datetime import date
from config.database import Base

class Logro(Base):
    __tablename__ = "logros"

    id_logro = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"))
    titulo = Column(String(100))
    descripcion = Column(String(255))
    fecha_logro = Column(Date, default=date.today)

    # Relaciones
    usuario = relationship("Usuario", back_populates="logros")
