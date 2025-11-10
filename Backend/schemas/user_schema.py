from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TipoUsuarioEnum(str, Enum):
    cliente = "cliente"
    nutriologo = "nutriologo"


class ObjetivoEnum(str, Enum):
    bajar_peso = "bajar_peso"
    mantener = "mantener"
    aumentar_masa = "aumentar_masa"


# ========== REGISTRO ==========
class UsuarioCreate(BaseModel):
    """Schema para crear un nuevo usuario (CLIENTE)"""
    nombre: str = Field(..., min_length=1, max_length=100)
    correo: EmailStr
    contrasena: str = Field(..., min_length=8, max_length=72)  # bcrypt ≤ 72
    edad: int = Field(..., ge=1, le=150)
    peso: float = Field(..., gt=0, le=500)
    altura: float = Field(..., gt=0, le=3)
    objetivo: str  # string por flexibilidad con el frontend

    # Campos médicos opcionales
    peso_inicial: Optional[float] = None
    enfermedades: Optional[List[str]] = None
    descripcion_medica: Optional[str] = None
    # tipo_usuario no se pide (cliente por defecto en el modelo)


class UsuarioCreateNutriologo(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    correo: EmailStr
    contrasena: str = Field(..., min_length=8, max_length=72)
    profesion: str = Field(..., min_length=1, max_length=100)
    # acepta 6-20 dígitos/letras/guiones
    numero_cedula: str = Field(..., min_length=3, max_length=50, pattern=r'^[A-Za-z0-9-]{6,20}$')

    tipo_usuario: TipoUsuarioEnum = TipoUsuarioEnum.nutriologo  # se envía o lo seteamos en el backend



# ========== LOGIN ==========
class UsuarioLogin(BaseModel):
    """Schema para login"""
    correo: EmailStr
    contrasena: str = Field(..., max_length=72)  # bcrypt ≤ 72


# ========== UPDATE (para PUT /users/{id}) ==========
class UsuarioUpdate(BaseModel):
    """Campos editables desde el perfil del cliente"""
    nombre: Optional[str] = None
    edad: Optional[int] = None
    peso: Optional[float] = None
    altura: Optional[float] = None
    objetivo: Optional[str] = None           # "bajar_peso" | "mantener" | "aumentar_masa"
    enfermedades: Optional[List[str]] = None
    peso_inicial: Optional[float] = None
    descripcion_medica: Optional[str] = None


# ========== RESPONSE ==========
class UsuarioResponse(BaseModel):
    """Schema para respuesta de usuario"""
    id_usuario: int
    nombre: str
    correo: str
    edad: Optional[int]
    peso: Optional[float]
    altura: Optional[float]
    objetivo: Optional[str]
    tipo_usuario: str
    profesion: Optional[str]
    numero_cedula: Optional[str]
    validado: bool
    fecha_registro: datetime

    # Nuevos campos
    peso_inicial: Optional[float] = None
    enfermedades: Optional[List[str]] = None
    descripcion_medica: Optional[str] = None

    class Config:
        from_attributes = True


# ========== VALIDACIÓN NUTRIÓLOGO ==========
class ValidacionNutriologo(BaseModel):
    """Schema para subir documentos de validación"""
    numero_cedula: str
    cedula_profesional_url: str  # URL del archivo subido
    certificado_titulo_url: str  # URL del archivo subido


class ValidacionNutrioloResponse(BaseModel):
    """Respuesta de validación"""
    id_validacion: int
    id_usuario: int
    numero_cedula: str
    validado: bool
    fecha_solicitud: datetime
    fecha_validacion: Optional[datetime]
    comentarios: Optional[str]

    class Config:
        from_attributes = True
