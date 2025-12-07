from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MensajeCreate(BaseModel):
    destinatario_id: int
    contenido: str

    class Config:
        from_attributes = True

class MensajeResponse(BaseModel):
    id: int
    remitente_id: int
    destinatario_id: int
    contenido: str
    leido: bool
    fecha_creacion: datetime
    fecha_actualizacion: datetime

    class Config:
        from_attributes = True

class ConversacionResponse(BaseModel):
    """Modelo para representar una conversación con el último mensaje"""
    otro_usuario_id: int
    otro_usuario_nombre: str
    otro_usuario_foto: Optional[str] = None
    otro_usuario_tipo: str  # 'cliente' o 'nutriologo'
    ultimo_mensaje: Optional[str] = None
    fecha_ultimo_mensaje: Optional[datetime] = None
    mensajes_no_leidos: int = 0

    class Config:
        from_attributes = True

class ConversacionDetailResponse(BaseModel):
    """Modelo para una conversación detallada con todos los mensajes"""
    otro_usuario_id: int
    otro_usuario_nombre: str
    otro_usuario_foto: Optional[str] = None
    otro_usuario_tipo: str
    mensajes: list[MensajeResponse]

    class Config:
        from_attributes = True