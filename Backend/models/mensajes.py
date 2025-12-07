"""
Backend/models/mensaje.py
Modelo SQLAlchemy para gestionar mensajes entre usuarios
"""

from sqlalchemy import Column, Integer, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.sql import func
from config.database import Base


class Mensaje(Base):
    __tablename__ = "mensajes"

    id = Column(Integer, primary_key=True, index=True)
    remitente_id = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    destinatario_id = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    contenido = Column(Text, nullable=False)
    leido = Column(Boolean, default=False, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    fecha_actualizacion = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    class Config:
        from_attributes = True