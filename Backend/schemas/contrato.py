from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ContratoCrear(BaseModel):
    """Schema para crear un nuevo contrato (si lo usaras directo)"""
    id_nutriologo: int = Field(..., description="ID del nutriólogo")
    monto: float = Field(..., gt=0, description="Monto a pagar en USD")
    duracion_meses: int = Field(default=1, ge=1, le=12)
    descripcion_servicios: Optional[str] = Field(None, max_length=1000)
    moneda: str = "usd"


class ContratoResponse(BaseModel):
    """Schema para respuesta de contrato"""
    id_contrato: int
    id_cliente: int
    id_nutriologo: int
    monto: float
    moneda: Optional[str]
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
    id_nutriologo: int
    monto: float
    duracion_meses: int = 1
    descripcion_servicios: Optional[str] = None
    usuario_id: int



class PagoStripeResponse(BaseModel):
    """Respuesta al frontend"""
    exito: bool
    mensaje: str
    contrato_id: Optional[int] = None
    client_secret: Optional[str] = None
    payment_intent_id: Optional[str] = None
