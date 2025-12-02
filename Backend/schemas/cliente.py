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

    class Config:
        from_attributes = True