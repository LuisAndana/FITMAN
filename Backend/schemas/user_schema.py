from pydantic import BaseModel, EmailStr

class UsuarioBase(BaseModel):
    nombre: str
    correo: EmailStr

class UsuarioCreate(UsuarioBase):
    contrasena: str

class UsuarioLogin(BaseModel):
    correo: EmailStr
    contrasena: str

class UsuarioResponse(UsuarioBase):
    id: int

    class Config:
        orm_mode = True
