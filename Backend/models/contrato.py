# models/contrato.py
# ===============================================
# Modelo de Contrato Cliente-Nutriólogo
# COPIAR A: Backend/models/contrato.py
# ===============================================

from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from config.database import Base


class EstadoContrato(str, enum.Enum):
    """Estados posibles de un contrato"""
    PENDIENTE = "pendiente"
    ACTIVO = "activo"
    COMPLETADO = "completado"
    CANCELADO = "cancelado"


class Contrato(Base):
    __tablename__ = "contratos"

    id_contrato = Column(Integer, primary_key=True, index=True)
    id_cliente = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_nutriologo = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)

    # Información de pago
    monto = Column(Float, nullable=False)  # en USD
    moneda = Column(String(3), default="USD")
    stripe_payment_intent_id = Column(String(255), unique=True, index=True)

    # Duración del contrato
    duracion_meses = Column(Integer, default=1)  # 1, 3, 6, 12 meses

    # Estado
    estado = Column(Enum(EstadoContrato), default=EstadoContrato.PENDIENTE)

    # Descripción de servicios
    descripcion_servicios = Column(String(1000), nullable=True)

    # Fechas
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_fin = Column(DateTime, nullable=True)

    # Validación
    validado = Column(Boolean, default=False)

    # Relaciones
    cliente = relationship(
        "Usuario",
        foreign_keys=[id_cliente],
        backref="contratos_como_cliente"
    )
    nutriologo = relationship(
        "Usuario",
        foreign_keys=[id_nutriologo],
        backref="contratos_como_nutriologo"
    )