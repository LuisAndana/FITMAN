# models/validacion_nutriologo.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from config.database import Base

class ValidacionNutriologo(Base):
    __tablename__ = "validaciones_nutriologo"

    # <-- MUY IMPORTANTE: mapear al nombre real de tu BD
    id_validacion = Column("id_validacion", Integer, primary_key=True, autoincrement=True)

    id_usuario   = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)

    # si en tu BD existen estos campos con estos nombres
    filename      = Column(String(255), nullable=True)
    documento_url = Column(String(255), nullable=True)

    # si NO existen en la BD, déjalos nullable=True (no fallará al seleccionar)
    #content_type  = Column(String(100), nullable=True)
    #tamano        = Column(Integer, nullable=True)

    # estados: pendiente/aprobado/rechazado
    estado        = Column(String(20), nullable=False, default="pendiente")

    # revisor opcional
    revisor_id    = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)

    # comentario/motivo opcional
    comentario    = Column(String(500), nullable=True)

    creado_en     = Column(DateTime, server_default=func.now(), nullable=False)
    actualizado_en= Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # relaciones
    usuario  = relationship("Usuario", foreign_keys=[id_usuario])
    revisor  = relationship("Usuario", foreign_keys=[revisor_id])
