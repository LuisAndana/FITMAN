# routers/contratos.py
# ===============================================
# Router para Contratos y Pagos Stripe
# FUNCIONAL - Sin dependencias de autenticación
# ===============================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from config.database import get_db
from models.user import Usuario
from schemas.contrato import (
    PagoStripeRequest,
    PagoStripeResponse
)
from services.stripe_service import StripeService

router = APIRouter(prefix="/contratos", tags=["contratos"])


async def get_usuario_actual(usuario_id: int) -> Optional[Usuario]:
    """
    Obtiene el usuario actual desde el token o header.
    Por ahora es un placeholder - actualiza según tu autenticación real.
    """
    # TODO: Implementar obtención real del usuario desde JWT token
    # Por ahora retorna None y los endpoints verifican
    return None


@router.post("/crear-payment-intent")
async def crear_payment_intent(
        datos: PagoStripeRequest,
        usuario_id: int,  # Enviar en el body o como parámetro
        db: Session = Depends(get_db)
):
    """
    Crea un PaymentIntent en Stripe para contratar a un nutriólogo.
    El usuario actual debe ser cliente.
    """
    if not usuario_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no autenticado"
        )

    # Obtener usuario cliente
    usuario_cliente = db.query(Usuario).filter(
        Usuario.id_usuario == usuario_id
    ).first()

    if not usuario_cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    if usuario_cliente.es_nutriologo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los nutriólogos no pueden contratar otros nutriólogos"
        )

    exito, resultado = StripeService.crear_payment_intent(
        db=db,
        id_cliente=usuario_id,
        id_nutriologo=datos.id_nutriologo,
        monto=datos.monto,
        duracion_meses=datos.duracion_meses,
        descripcion_servicios=datos.descripcion_servicios
    )

    if not exito:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=resultado.get("error", "Error al crear PaymentIntent")
        )

    return PagoStripeResponse(
        exito=True,
        mensaje="PaymentIntent creado exitosamente",
        contrato_id=resultado["contrato_id"],
        client_secret=resultado["client_secret"],
        payment_intent_id=resultado["payment_intent_id"]
    )


@router.post("/confirmar-pago/{payment_intent_id}")
async def confirmar_pago(
        payment_intent_id: str,
        usuario_id: int,
        db: Session = Depends(get_db)
):
    """
    Confirma un pago exitoso y activa el contrato.
    """
    if not usuario_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no autenticado"
        )

    exito, resultado = StripeService.confirmar_pago(
        db=db,
        payment_intent_id=payment_intent_id
    )

    if not exito:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=resultado.get("error", "Error al confirmar pago")
        )

    return PagoStripeResponse(
        exito=True,
        mensaje=resultado["mensaje"],
        contrato_id=resultado["contrato_id"]
    )


@router.get("/obtener/{contrato_id}")
async def obtener_contrato(
        contrato_id: int,
        usuario_id: int,
        db: Session = Depends(get_db)
):
    """Obtiene los detalles de un contrato específico"""
    if not usuario_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no autenticado"
        )

    contrato = StripeService.obtener_contrato(db=db, contrato_id=contrato_id)

    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contrato no encontrado"
        )

    # Verificar permisos
    if (contrato["id_cliente"] != usuario_id and
            contrato["id_nutriologo"] != usuario_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver este contrato"
        )

    return contrato


@router.get("/mis-contratos/{usuario_id}")
async def mis_contratos(
        usuario_id: int,
        db: Session = Depends(get_db)
):
    """Lista todos los contratos del usuario actual"""
    if not usuario_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no autenticado"
        )

    contratos = StripeService.listar_contratos_cliente(
        db=db,
        id_cliente=usuario_id
    )

    return {
        "contratos": contratos,
        "total": len(contratos)
    }