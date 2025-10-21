from pydantic import BaseModel, EmailStr
from typing import Optional


class UsuarioBase(BaseModel):
    nombre: Optional[str] = None
    correo: EmailStr


class UsuarioCreate(UsuarioBase):
    contrasena: str
    edad: Optional[int] = None
    peso: Optional[float] = None
    altura: Optional[float] = None
    objetivo: Optional[str] = None


class UsuarioLogin(BaseModel):
    correo: EmailStr
    contrasena: str


class UsuarioResponse(UsuarioBase):
    id_usuario: int
    edad: Optional[int] = None
    peso: Optional[float] = None
    altura: Optional[float] = None
    objetivo: Optional[str] = None

    class Config:
        from_attributes = True  # ✅ reemplaza orm_mode
