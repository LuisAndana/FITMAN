# routers/contratos.py
# ===============================================
# Router para Contratos y Pagos Stripe
# ===============================================

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session

from config.database import get_db
from models.user import Usuario, TipoUsuarioEnum
from schemas.contrato import PagoStripeRequest, PagoStripeResponse
from services.stripe_service import StripeService

router = APIRouter(prefix="/contratos", tags=["contratos"])


@router.post("/crear-payment-intent")
async def crear_payment_intent(
        datos: PagoStripeRequest = Body(...),
        db: Session = Depends(get_db)
):
    usuario_id = datos.usuario_id

    if not usuario_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    # Verificar que sea cliente
    usuario = db.query(Usuario).filter(Usuario.id_usuario == usuario_id).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if usuario.tipo_usuario == TipoUsuarioEnum.nutriologo:
        raise HTTPException(status_code=403, detail="Los nutriólogos no pueden contratar servicios")

    exito, resultado = StripeService.crear_payment_intent(
        db=db,
        id_cliente=usuario_id,
        id_nutriologo=datos.id_nutriologo,
        monto=datos.monto,
        duracion_meses=datos.duracion_meses,
        descripcion_servicios=datos.descripcion_servicios,
    )

    if not exito:
        raise HTTPException(status_code=400, detail=resultado.get("error", "Error desconocido"))

    return resultado


@router.post("/confirmar-pago/{payment_intent_id}")
async def confirmar_pago(
        payment_intent_id: str,
        data: dict = Body(...),
        db: Session = Depends(get_db)
):
    usuario_id = data.get("usuario_id")

    if not usuario_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    exito, resultado = StripeService.confirmar_pago(
        db=db,
        payment_intent_id=payment_intent_id
    )

    if not exito:
        raise HTTPException(status_code=400, detail=resultado.get("error", "Error al confirmar pago"))

    return PagoStripeResponse(
        exito=True,
        mensaje=resultado["mensaje"],
        contrato_id=resultado["contrato_id"]
    )


@router.get("/obtener/{contrato_id}")
async def obtener_contrato(
        contrato_id: int,
        usuario_id: int = Query(...),
        db: Session = Depends(get_db)
):

    if not usuario_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    contrato = StripeService.obtener_contrato(db=db, contrato_id=contrato_id)

    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    # Validación de permisos
    if contrato["id_cliente"] != usuario_id and contrato["id_nutriologo"] != usuario_id:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver este contrato")

    return contrato


@router.get("/mis-contratos/{usuario_id}")
async def mis_contratos(
        usuario_id: int,
        db: Session = Depends(get_db)
):

    if not usuario_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    contratos = StripeService.listar_contratos_cliente(db=db, id_cliente=usuario_id)

    return {
        "contratos": contratos,
        "total": len(contratos)
    }
