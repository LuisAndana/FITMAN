# Backend/schemas/contrato.py
# ===============================================
# Schemas para Contratos y Pagos Stripe
# ===============================================

from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional


# ========== SCHEMAS DE ENTRADA ==========

class ContratoCrear(BaseModel):
    """
    Schema para crear un contrato directamente (uso interno).
    Incluye todas las validaciones necesarias.
    """
    id_nutriologo: int = Field(..., gt=0, description="ID del nutriólogo a contratar")
    monto: float = Field(..., gt=0, description="Monto a pagar en USD")
    duracion_meses: int = Field(default=1, ge=1, le=12, description="Duración en meses (1-12)")
    descripcion_servicios: Optional[str] = Field(None, max_length=1000, description="Descripción del servicio")
    moneda: str = Field(default="usd", description="Moneda (USD)")

    @field_validator('monto')
    @classmethod
    def validar_monto(cls, v: float) -> float:
        """Validar que el monto esté en rango permitido"""
        if v < 10:
            raise ValueError('El monto mínimo es $10 USD')
        if v > 500:
            raise ValueError('El monto máximo es $500 USD')
        # Redondear a 2 decimales
        return round(v, 2)

    @field_validator('descripcion_servicios')
    @classmethod
    def validar_descripcion(cls, v: Optional[str]) -> Optional[str]:
        """Validar descripción si se proporciona"""
        if v is not None:
            v = v.strip()
            if len(v) < 10:
                raise ValueError('La descripción debe tener al menos 10 caracteres')
        return v

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id_nutriologo": 123,
                "monto": 50.00,
                "duracion_meses": 1,
                "descripcion_servicios": "Plan nutricional personalizado",
                "moneda": "usd"
            }
        }


class PagoStripeRequest(BaseModel):
    """
    Schema para solicitud de crear PaymentIntent en Stripe.
    Incluye validaciones para todos los campos críticos.
    """
    id_nutriologo: int = Field(..., gt=0, description="ID del nutriólogo")
    monto: float = Field(..., gt=0, description="Monto a pagar en USD")
    duracion_meses: int = Field(default=1, ge=1, le=12, description="Duración en meses")
    descripcion_servicios: Optional[str] = Field(None, max_length=500, description="Descripción del servicio")
    usuario_id: int = Field(..., gt=0, description="ID del usuario cliente")

    @field_validator('monto')
    @classmethod
    def validar_monto(cls, v: float) -> float:
        """Validar rango de monto"""
        if v < 10:
            raise ValueError('El monto mínimo es $10 USD')
        if v > 500:
            raise ValueError('El monto máximo es $500 USD')
        return round(v, 2)

    @field_validator('usuario_id', mode='before')
    @classmethod
    def validar_usuario_id(cls, v):
        """Validar que usuario_id es válido"""
        if not v or v <= 0:
            raise ValueError('Usuario ID debe ser mayor a 0')
        return v

    @field_validator('id_nutriologo', mode='before')
    @classmethod
    def validar_nutriologo_id(cls, v):
        """Validar que nutriologo_id es válido"""
        if not v or v <= 0:
            raise ValueError('ID de nutriólogo debe ser mayor a 0')
        return v

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id_nutriologo": 123,
                "monto": 50.00,
                "duracion_meses": 1,
                "descripcion_servicios": "Asesoría nutricional mensual",
                "usuario_id": 456
            }
        }


# ========== SCHEMAS DE SALIDA ==========

class PagoStripeResponse(BaseModel):
    """
    Respuesta del backend al frontend después de crear PaymentIntent.
    Información necesaria para procesar el pago en Stripe.
    """
    exito: bool = Field(..., description="Indica si la operación fue exitosa")
    mensaje: str = Field(..., description="Mensaje descriptivo de la operación")
    contrato_id: Optional[int] = Field(None, description="ID del contrato creado")
    client_secret: Optional[str] = Field(None, description="Client secret para Stripe")
    payment_intent_id: Optional[str] = Field(None, description="ID del PaymentIntent en Stripe")
    monto: Optional[float] = Field(None, description="Monto a cobrar")
    nutriologo_nombre: Optional[str] = Field(None, description="Nombre del nutriólogo")

    class Config:
        json_schema_extra = {
            "example_exitoso": {
                "exito": True,
                "mensaje": "PaymentIntent creado exitosamente",
                "contrato_id": 789,
                "client_secret": "pi_1234_secret_5678",
                "payment_intent_id": "pi_1234567890",
                "monto": 50.00,
                "nutriologo_nombre": "Dr. Juan Pérez"
            },
            "example_error": {
                "exito": False,
                "mensaje": "Los nutriólogos no pueden contratar servicios",
                "contrato_id": None,
                "client_secret": None,
                "payment_intent_id": None,
                "monto": None,
                "nutriologo_nombre": None
            }
        }


class ContratoResponse(BaseModel):
    """
    Schema completo de un contrato para respuestas.
    Incluye todos los datos relacionados con el contrato.
    """
    id_contrato: int = Field(..., description="ID único del contrato")
    id_cliente: int = Field(..., description="ID del cliente")
    id_nutriologo: int = Field(..., description="ID del nutriólogo")
    monto: float = Field(..., description="Monto a pagar")
    moneda: Optional[str] = Field(default="usd", description="Moneda del pago")
    duracion_meses: int = Field(..., description="Duración en meses")
    estado: str = Field(..., description="Estado del contrato (PENDIENTE, ACTIVO, COMPLETADO, CANCELADO)")
    descripcion_servicios: Optional[str] = Field(None, description="Descripción de los servicios")
    fecha_creacion: datetime = Field(..., description="Fecha de creación")
    fecha_inicio: Optional[datetime] = Field(None, description="Fecha de inicio del contrato")
    fecha_fin: Optional[datetime] = Field(None, description="Fecha de fin del contrato")
    validado: bool = Field(default=False, description="Si el contrato fue validado")
    stripe_payment_intent_id: Optional[str] = Field(None, description="ID del PaymentIntent en Stripe")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id_contrato": 789,
                "id_cliente": 456,
                "id_nutriologo": 123,
                "monto": 50.00,
                "moneda": "usd",
                "duracion_meses": 1,
                "estado": "ACTIVO",
                "descripcion_servicios": "Plan nutricional personalizado",
                "fecha_creacion": "2024-01-15T10:30:00Z",
                "fecha_inicio": "2024-01-16T10:00:00Z",
                "fecha_fin": "2024-02-16T10:00:00Z",
                "validado": True,
                "stripe_payment_intent_id": "pi_1234567890"
            }
        }


class ContratoDetailResponse(BaseModel):
    """
    Schema para obtener detalles de un contrato con información del nutriólogo.
    Respuesta más amigable para el frontend.
    """
    id_contrato: int = Field(..., description="ID del contrato")
    id_cliente: int = Field(..., description="ID del cliente")
    id_nutriologo: int = Field(..., description="ID del nutriólogo")
    nutriologo_nombre: str = Field(..., description="Nombre completo del nutriólogo")
    monto: float = Field(..., description="Monto acordado")
    moneda: str = Field(default="usd", description="Moneda")
    estado: str = Field(..., description="Estado actual del contrato")
    duracion_meses: int = Field(..., description="Duración en meses")
    descripcion_servicios: Optional[str] = Field(None, description="Qué servicios incluye")
    fecha_creacion: datetime = Field(..., description="Cuándo se creó")
    fecha_inicio: Optional[datetime] = Field(None, description="Cuándo inició")
    fecha_fin: Optional[datetime] = Field(None, description="Cuándo terminará")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id_contrato": 789,
                "id_cliente": 456,
                "id_nutriologo": 123,
                "nutriologo_nombre": "Dr. Juan Pérez López",
                "monto": 50.00,
                "moneda": "usd",
                "estado": "ACTIVO",
                "duracion_meses": 1,
                "descripcion_servicios": "Plan nutricional mensual con seguimiento",
                "fecha_creacion": "2024-01-15T10:30:00Z",
                "fecha_inicio": "2024-01-16T10:00:00Z",
                "fecha_fin": "2024-02-16T10:00:00Z"
            }
        }


class ListaContratosResponse(BaseModel):
    """
    Schema para listar contratos del usuario.
    Información resumida de múltiples contratos.
    """
    id_contrato: int = Field(..., description="ID del contrato")
    otro_usuario_nombre: str = Field(..., description="Nombre del otro usuario (cliente o nutriólogo)")
    monto: float = Field(..., description="Monto del contrato")
    moneda: str = Field(default="usd", description="Moneda")
    estado: str = Field(..., description="Estado actual")
    duracion_meses: int = Field(..., description="Duración en meses")
    fecha_creacion: datetime = Field(..., description="Fecha de creación")
    fecha_inicio: Optional[datetime] = Field(None, description="Fecha de inicio")
    fecha_fin: Optional[datetime] = Field(None, description="Fecha de fin")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id_contrato": 789,
                "otro_usuario_nombre": "Dr. Juan Pérez",
                "monto": 50.00,
                "moneda": "usd",
                "estado": "ACTIVO",
                "duracion_meses": 1,
                "fecha_creacion": "2024-01-15T10:30:00Z",
                "fecha_inicio": "2024-01-16T10:00:00Z",
                "fecha_fin": "2024-02-16T10:00:00Z"
            }
        }


class ListaContratosResponseWrapper(BaseModel):
    """
    Wrapper para respuesta de lista de contratos.
    Incluye total y items.
    """
    total: int = Field(..., description="Total de contratos")
    contratos: list[ListaContratosResponse] = Field(..., description="Lista de contratos")

    class Config:
        json_schema_extra = {
            "example": {
                "total": 2,
                "contratos": [
                    {
                        "id_contrato": 789,
                        "otro_usuario_nombre": "Dr. Juan Pérez",
                        "monto": 50.00,
                        "moneda": "usd",
                        "estado": "ACTIVO",
                        "duracion_meses": 1,
                        "fecha_creacion": "2024-01-15T10:30:00Z",
                        "fecha_inicio": "2024-01-16T10:00:00Z",
                        "fecha_fin": "2024-02-16T10:00:00Z"
                    },
                    {
                        "id_contrato": 790,
                        "otro_usuario_nombre": "Dra. María García",
                        "monto": 75.00,
                        "moneda": "usd",
                        "estado": "COMPLETADO",
                        "duracion_meses": 1,
                        "fecha_creacion": "2023-12-15T10:30:00Z",
                        "fecha_inicio": "2023-12-16T10:00:00Z",
                        "fecha_fin": "2024-01-16T10:00:00Z"
                    }
                ]
            }
        }


class ContratoErrorResponse(BaseModel):
    """
    Schema para respuestas de error.
    Proporciona información clara sobre qué salió mal.
    """
    exito: bool = Field(default=False, description="Siempre False para errores")
    mensaje: str = Field(..., description="Mensaje de error en español")
    detalle: Optional[str] = Field(None, description="Detalle técnico (opcional)")
    codigo_error: Optional[str] = Field(None, description="Código de error interno")

    class Config:
        json_schema_extra = {
            "example_1": {
                "exito": False,
                "mensaje": "Los nutriólogos no pueden contratar servicios",
                "detalle": None,
                "codigo_error": "FORBIDDEN_ERROR"
            },
            "example_2": {
                "exito": False,
                "mensaje": "El monto debe estar entre $10 y $500",
                "detalle": "Monto enviado: 5.00",
                "codigo_error": "VALIDATION_ERROR"
            },
            "example_3": {
                "exito": False,
                "mensaje": "Ya tienes un contrato activo con este nutriólogo",
                "detalle": None,
                "codigo_error": "CONFLICT_ERROR"
            }
        }


# ========== ENUMS (Opcional, si no están definidos en models) ==========

from enum import Enum

class EstadoContratoEnum(str, Enum):
    """Estados posibles de un contrato"""
    PENDIENTE = "PENDIENTE"      # Creado, esperando pago
    ACTIVO = "ACTIVO"            # Pago confirmado, servicio activo
    COMPLETADO = "COMPLETADO"    # Período finalizado normalmente
    CANCELADO = "CANCELADO"      # Cancelado por cliente o sistema


# ========== EJEMPLOS DE USO ==========

"""
# Crear un contrato
from schemas.contrato import PagoStripeRequest

payload = PagoStripeRequest(
    id_nutriologo=123,
    monto=50.00,
    duracion_meses=1,
    descripcion_servicios="Plan nutricional personalizado",
    usuario_id=456
)

# Validación automática de Pydantic
# Si monto < 10 o > 500 → ValueError
# Si usuario_id <= 0 → ValueError
# etc.


# Responder al frontend
from schemas.contrato import PagoStripeResponse

respuesta = PagoStripeResponse(
    exito=True,
    mensaje="PaymentIntent creado exitosamente",
    contrato_id=789,
    client_secret="pi_1234_secret_5678",
    payment_intent_id="pi_1234567890",
    monto=50.00,
    nutriologo_nombre="Dr. Juan Pérez"
)


# Obtener detalle de contrato
from schemas.contrato import ContratoDetailResponse

detalle = ContratoDetailResponse(
    id_contrato=789,
    id_cliente=456,
    id_nutriologo=123,
    nutriologo_nombre="Dr. Juan Pérez López",
    monto=50.00,
    moneda="usd",
    estado="ACTIVO",
    duracion_meses=1,
    descripcion_servicios="Plan nutricional mensual con seguimiento",
    fecha_creacion=datetime.now(),
    fecha_inicio=datetime.now(),
    fecha_fin=datetime.now() + timedelta(days=30)
)
"""