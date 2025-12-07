"""
Backend/models/mensajes.py
Modelo SQLAlchemy para la tabla de mensajes
"""

from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base
from datetime import datetime


class Mensaje(Base):
    """
    Modelo para almacenar mensajes entre usuarios

    Attributes:
        id: ID único del mensaje (PK)
        remitente_id: FK a Usuario (quien envía)
        destinatario_id: FK a Usuario (quien recibe)
        contenido: Texto del mensaje
        leido: Si fue leído por el destinatario
        fecha_creacion: Timestamp de creación
        fecha_actualizacion: Timestamp de última actualización
    """
    __tablename__ = "mensajes"

    # Columnas
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    remitente_id = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), nullable=False, index=True)
    destinatario_id = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), nullable=False, index=True)
    contenido = Column(Text, nullable=False)
    leido = Column(Boolean, default=False, nullable=False, index=True)
    fecha_creacion = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    fecha_actualizacion = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relaciones
    remitente = relationship(
        "Usuario",
        foreign_keys=[remitente_id],
        backref="mensajes_enviados"
    )
    destinatario = relationship(
        "Usuario",
        foreign_keys=[destinatario_id],
        backref="mensajes_recibidos"
    )

    def __repr__(self):
        return f"<Mensaje {self.id} de {self.remitente_id} a {self.destinatario_id}>"