"""
Schemas para clientes y dietas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json


class ClienteResponse(BaseModel):
    """Respuesta con datos del cliente"""
    id_usuario: int
    nombre: str
    edad: Optional[int]
    peso: Optional[float]
    altura: Optional[float]
    objetivo: Optional[str]
    enfermedades: Optional[List[str]] = None
    descripcion_medica: Optional[str]
    peso_inicial: Optional[float]
    contrato_id: Optional[int] = None
    contrato_estado: Optional[str] = None

    class Config:
        from_attributes = True


class DietaAIRequest(BaseModel):
    """Request para generar dieta con IA"""
    id_cliente: int
    nombre_dieta: str
    dias_duracion: int = 7
    calorias_objetivo: int
    preferencias: Optional[str] = None


class DietaAIResponse(BaseModel):
    """Response con dieta generada"""
    id_dieta: int
    nombre: str
    contenido: str
    calorias_totales: Optional[int]
    objetivo: Optional[str]
    fecha_creacion: datetime
    dias_duracion: Optional[int] = 30
    fecha_vencimiento: Optional[datetime] = None
    estado: str = "activa"
    dias_restantes: Optional[int] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum


class EstadoDietaEnum(str, Enum):
    """Estados de una dieta"""
    activa = "activa"
    vencida = "vencida"
    actualizada = "actualizada"
    pausada = "pausada"


class DietaAIRequest(BaseModel):
    """Request para generar dieta con IA"""
    id_cliente: int
    nombre_dieta: str
    dias_duracion: int = 30  # Duración en días
    calorias_objetivo: int
    preferencias: Optional[str] = None


class DietaAIResponse(BaseModel):
    """Response al generar/obtener dieta"""
    id_dieta: int
    nombre: str
    contenido: str
    calorias_totales: int
    objetivo: str
    fecha_creacion: datetime
    dias_duracion: Optional[int] = 30  # ✅ NUEVO
    fecha_vencimiento: Optional[datetime] = None  # ✅ NUEVO
    estado: str = "activa"  # ✅ NUEVO
    dias_restantes: Optional[int] = None  # ✅ NUEVO (calculado)

    class Config:
        from_attributes = True


class DietaActualizadaResponse(BaseModel):
    """Response cuando se actualiza una dieta"""
    id_dieta_nueva: int
    id_dieta_anterior: int
    nombre: str
    mensaje: str
    fecha_vencimiento: datetime


class DietasVencidasResponse(BaseModel):
    """Response de dietas vencidas"""
    id_dieta: int
    nombre: str
    fecha_vencimiento: datetime
    estado: str
    dias_vencida: int


class ClienteDietasResponse(BaseModel):
    """Response de un cliente con sus dietas"""
    id_usuario: int
    nombre: str
    dietas_activas: int
    dietas_vencidas: int
    proxima_dieta_vencimiento: Optional[datetime] = None