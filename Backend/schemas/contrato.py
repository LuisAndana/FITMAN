# schemas/contrato.py
# ===============================================
# Schemas Pydantic para Contratos
# COPIAR A: Backend/schemas/contrato.py
# ===============================================

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ContratoCrear(BaseModel):
    """Schema para crear un nuevo contrato"""
    id_nutriologo: int = Field(..., description="ID del nutriólogo")
    monto: float = Field(..., gt=0, description="Monto a pagar en USD")
    duracion_meses: int = Field(default=1, ge=1, le=12, description="Duración en meses")
    descripcion_servicios: Optional[str] = Field(None, max_length=1000)


class ContratoResponse(BaseModel):
    """Schema para respuesta de contrato"""
    id_contrato: int
    id_cliente: int
    id_nutriologo: int
    monto: float
    moneda: str
    duracion_meses: int
    estado: str
    descripcion_servicios: Optional[str]
    fecha_creacion: datetime
    fecha_inicio: Optional[datetime]
    fecha_fin: Optional[datetime]
    validado: bool
    stripe_payment_intent_id: Optional[str]

    class Config:
        from_attributes = True


class PagoStripeRequest(BaseModel):
    """Schema para procesar pago con Stripe"""
    id_nutriologo: int = Field(..., description="ID del nutriólogo")
    monto: float = Field(..., gt=0, description="Monto en USD")
    duracion_meses: int = Field(default=1, ge=1, le=12)
    descripcion_servicios: Optional[str] = None
    payment_method_id: str = Field(..., description="Token de Stripe")


class PagoStripeResponse(BaseModel):
    """Schema para respuesta de pago"""
    exito: bool
    mensaje: str
    contrato_id: Optional[int] = None
    client_secret: Optional[str] = None
    payment_intent_id: Optional[str] = None