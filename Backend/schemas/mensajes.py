"""
Backend/schemas/mensajes.py
Schemas Pydantic para validación de mensajes
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MensajeCreate(BaseModel):
    """Schema para crear un mensaje"""
    destinatario_id: int = Field(..., gt=0, description="ID del usuario destinatario")
    contenido: str = Field(..., min_length=1, max_length=1000, description="Contenido del mensaje")


class MensajeResponse(BaseModel):
    """Schema para responder un mensaje"""
    id: int
    remitente_id: int
    destinatario_id: int
    contenido: str
    leido: bool
    fecha_creacion: Optional[str] = None
    fecha_actualizacion: Optional[str] = None

    class Config:
        from_attributes = True


class ConversacionResponse(BaseModel):
    """Schema para listar conversaciones"""
    otro_usuario_id: int
    otro_usuario_nombre: str
    otro_usuario_foto: Optional[str] = None
    otro_usuario_tipo: str
    ultimo_mensaje: Optional[str] = None
    fecha_ultimo_mensaje: Optional[str] = None
    mensajes_no_leidos: int = 0

    class Config:
        from_attributes = True


class ConversacionDetailResponse(BaseModel):
    """Schema para detalle de conversación con mensajes"""
    otro_usuario_id: int
    otro_usuario_nombre: str
    otro_usuario_foto: Optional[str] = None
    otro_usuario_tipo: str
    mensajes: List[MensajeResponse] = []

    class Config:
        from_attributes = True