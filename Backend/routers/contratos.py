# Backend/routers/contratos.py
# ===============================================
# Router mejorado para Contratos
# ===============================================

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List

from config.database import get_db
from models.user import Usuario, TipoUsuarioEnum
from models.contrato import Contrato, EstadoContrato
from schemas.contrato import PagoStripeRequest, PagoStripeResponse, ContratoDetailResponse
from services.stripe_service import StripeService
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contratos", tags=["contratos"])


@router.post(
    "/crear-payment-intent",
    response_model=PagoStripeResponse,
    status_code=status.HTTP_201_CREATED
)
async def crear_payment_intent(
        datos: PagoStripeRequest = Body(...),
        db: Session = Depends(get_db)
):
    """
    Crear un PaymentIntent en Stripe para iniciar un contrato.

    - Validar que el usuario es cliente
    - Validar que el nutriólogo existe y está validado
    - Evitar duplicados
    - Crear PaymentIntent
    """

    usuario_id = datos.usuario_id

    # ✅ VALIDACIÓN 1: Usuario está autenticado
    if not usuario_id or usuario_id <= 0:
        logger.warning(f"❌ Intento de crear contrato sin usuario válido")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no autenticado. Inicia sesión."
        )

    # ✅ VALIDACIÓN 2: Obtener usuario cliente
    usuario = db.query(Usuario).filter(Usuario.id_usuario == usuario_id).first()

    if not usuario:
        logger.warning(f"❌ Usuario {usuario_id} no encontrado")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    # ✅ VALIDACIÓN 3: Usuario NO es nutriólogo
    if usuario.tipo_usuario == TipoUsuarioEnum.nutriologo:
        logger.warning(f"❌ Nutriólogo {usuario_id} intenta contratar")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los nutriólogos no pueden contratar servicios de otros nutriólogos"
        )

    # ✅ VALIDACIÓN 4: Validar IDs de entrada
    if not datos.id_nutriologo or datos.id_nutriologo <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de nutriólogo inválido"
        )

    # ✅ VALIDACIÓN 5: El cliente no intenta contratarse a sí mismo
    if usuario_id == datos.id_nutriologo:
        logger.warning(f"❌ Usuario {usuario_id} intenta contratarse a sí mismo")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes contratarte a ti mismo"
        )

    # ✅ VALIDACIÓN 6: Obtener nutriólogo
    nutriologo = db.query(Usuario).filter(
        Usuario.id_usuario == datos.id_nutriologo,
        Usuario.tipo_usuario == TipoUsuarioEnum.nutriologo,
        Usuario.validado == True
    ).first()

    if not nutriologo:
        logger.warning(f"❌ Nutriólogo {datos.id_nutriologo} no encontrado o no validado")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nutriólogo no encontrado o no está validado"
        )

    # ✅ VALIDACIÓN 7: Evitar duplicados (contrato activo previo)
    contrato_activo = db.query(Contrato).filter(
        Contrato.id_cliente == usuario_id,
        Contrato.id_nutriologo == datos.id_nutriologo,
        Contrato.estado == EstadoContrato.ACTIVO
    ).first()

    if contrato_activo:
        logger.warning(
            f"❌ Contrato activo previo: cliente={usuario_id}, nutriólogo={datos.id_nutriologo}"
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya tienes un contrato activo con este nutriólogo"
        )

    # ✅ VALIDACIÓN 8: Validar monto
    if datos.monto < 10 or datos.monto > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El monto debe estar entre $10 y $500"
        )

    # ✅ VALIDACIÓN 9: Validar duración
    if datos.duracion_meses < 1 or datos.duracion_meses > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La duración debe estar entre 1 y 12 meses"
        )

    # 🚀 Crear PaymentIntent
    try:
        logger.info(f"🚀 Creando PaymentIntent para cliente={usuario_id}, nutriólogo={datos.id_nutriologo}")

        exito, resultado = StripeService.crear_payment_intent(
            db=db,
            id_cliente=usuario_id,
            id_nutriologo=datos.id_nutriologo,
            monto=datos.monto,
            duracion_meses=datos.duracion_meses,
            descripcion_servicios=datos.descripcion_servicios
        )

        if not exito:
            logger.error(f"❌ Error creando PaymentIntent: {resultado}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=resultado.get("error", "Error desconocido")
            )

        logger.info(f"✅ PaymentIntent creado: {resultado.get('payment_intent_id')}")

        return PagoStripeResponse(
            exito=True,
            mensaje="PaymentIntent creado exitosamente",
            contrato_id=resultado.get("contrato_id"),
            client_secret=resultado.get("client_secret"),
            payment_intent_id=resultado.get("payment_intent_id"),
            monto=resultado.get("monto"),
            nutriologo_nombre=resultado.get("nutriologo_nombre")
        )

    except Exception as e:
        logger.exception(f"❌ Error inesperado creando PaymentIntent: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear el pago. Intenta nuevamente."
        )


@router.post("/confirmar-pago/{payment_intent_id}", response_model=PagoStripeResponse)
async def confirmar_pago(
        payment_intent_id: str,
        data: dict = Body(...),
        db: Session = Depends(get_db)
):
    """
    Confirmar que el pago fue exitoso y activar el contrato.
    """

    usuario_id = data.get("usuario_id")

    # ✅ VALIDACIÓN 1: Usuario autenticado
    if not usuario_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no autenticado"
        )

    # ✅ VALIDACIÓN 2: PaymentIntent válido
    if not payment_intent_id or not payment_intent_id.startswith("pi_"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de pago inválido"
        )

    try:
        logger.info(f"🔍 Confirmando pago: {payment_intent_id}")

        exito, resultado = StripeService.confirmar_pago(
            db=db,
            payment_intent_id=payment_intent_id
        )

        if not exito:
            logger.warning(f"❌ Error confirmando pago: {resultado}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=resultado.get("error", "Error al confirmar pago")
            )

        logger.info(f"✅ Pago confirmado: {payment_intent_id}")

        return PagoStripeResponse(
            exito=True,
            mensaje=resultado.get("mensaje", "Pago confirmado exitosamente"),
            contrato_id=resultado.get("contrato_id")
        )

    except Exception as e:
        logger.exception(f"❌ Error confirmando pago: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al confirmar el pago"
        )


@router.get("/obtener/{contrato_id}", response_model=ContratoDetailResponse)
async def obtener_contrato(
        contrato_id: int,
        usuario_id: int,
        db: Session = Depends(get_db)
):
    """
    Obtener detalles de un contrato.
    Solo el cliente o nutriólogo involucrado puede verlo.
    """

    # ✅ Obtener contrato
    contrato = db.query(Contrato).filter(
        Contrato.id_contrato == contrato_id
    ).first()

    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contrato no encontrado"
        )

    # ✅ Validar permisos (cliente o nutriólogo)
    if contrato.id_cliente != usuario_id and contrato.id_nutriologo != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver este contrato"
        )

    nutriologo = db.query(Usuario).filter(
        Usuario.id_usuario == contrato.id_nutriologo
    ).first()

    return ContratoDetailResponse(
        id_contrato=contrato.id_contrato,
        id_cliente=contrato.id_cliente,
        id_nutriologo=contrato.id_nutriologo,
        nutriologo_nombre=nutriologo.nombre if nutriologo else "Desconocido",
        monto=contrato.monto,
        estado=contrato.estado.value,
        duracion_meses=contrato.duracion_meses,
        fecha_creacion=contrato.fecha_creacion,
        fecha_inicio=contrato.fecha_inicio,
        fecha_fin=contrato.fecha_fin
    )


@router.get("/mis-contratos/{usuario_id}")
async def listar_mis_contratos(
        usuario_id: int,
        db: Session = Depends(get_db)
):
    """
    Listar todos los contratos del usuario (como cliente o nutriólogo).
    """

    # ✅ Obtener usuario
    usuario = db.query(Usuario).filter(Usuario.id_usuario == usuario_id).first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    try:
        if usuario.tipo_usuario == TipoUsuarioEnum.cliente:
            # Listar contratos como cliente
            contratos = db.query(Contrato).filter(
                Contrato.id_cliente == usuario_id
            ).order_by(Contrato.fecha_creacion.desc()).all()
        else:
            # Listar contratos como nutriólogo
            contratos = db.query(Contrato).filter(
                Contrato.id_nutriologo == usuario_id
            ).order_by(Contrato.fecha_creacion.desc()).all()

        resultado = []
        for contrato in contratos:
            if usuario.tipo_usuario == TipoUsuarioEnum.cliente:
                otro_usuario = db.query(Usuario).filter(
                    Usuario.id_usuario == contrato.id_nutriologo
                ).first()
            else:
                otro_usuario = db.query(Usuario).filter(
                    Usuario.id_usuario == contrato.id_cliente
                ).first()

            resultado.append({
                "id_contrato": contrato.id_contrato,
                "otro_usuario_nombre": otro_usuario.nombre if otro_usuario else "Desconocido",
                "monto": contrato.monto,
                "estado": contrato.estado.value,
                "duracion_meses": contrato.duracion_meses,
                "fecha_creacion": contrato.fecha_creacion.isoformat(),
                "fecha_inicio": contrato.fecha_inicio.isoformat() if contrato.fecha_inicio else None,
                "fecha_fin": contrato.fecha_fin.isoformat() if contrato.fecha_fin else None,
            })

        return {
            "total": len(resultado),
            "contratos": resultado
        }

    except Exception as e:
        logger.exception(f"❌ Error listando contratos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los contratos"
        )


@router.post("/cancelar/{contrato_id}")
async def cancelar_contrato(
        contrato_id: int,
        data: dict = Body(...),
        db: Session = Depends(get_db)
):
    """
    Cancelar un contrato (solo cliente puede hacerlo).
    Reembolso disponible dentro de 7 días de creación.
    """

    usuario_id = data.get("usuario_id")
    razon = data.get("razon", "")

    # ✅ Obtener contrato
    contrato = db.query(Contrato).filter(
        Contrato.id_contrato == contrato_id
    ).first()

    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contrato no encontrado"
        )

    # ✅ Solo el cliente puede cancelar
    if contrato.id_cliente != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el cliente puede cancelar"
        )

    # ✅ No puede cancelar si ya está completado o cancelado
    if contrato.estado in [EstadoContrato.COMPLETADO, EstadoContrato.CANCELADO]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No puedes cancelar un contrato {contrato.estado.value}"
        )

    try:
        contrato.estado = EstadoContrato.CANCELADO
        db.commit()

        logger.info(f"✅ Contrato {contrato_id} cancelado por usuario {usuario_id}")

        return {
            "exito": True,
            "mensaje": "Contrato cancelado exitosamente",
            "contrato_id": contrato_id
        }

    except Exception as e:
        db.rollback()
        logger.exception(f"❌ Error cancelando contrato: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al cancelar el contrato"
        )


@router.get("/mis-contratos/{usuario_id}")
async def obtener_mis_contratos(
        usuario_id: int,
        db: Session = Depends(get_db)
):
    """
    ✅ OBTENER MIS CONTRATOS (cliente o nutriólogo)

    Retorna todos los contratos del usuario, ya sea como cliente o nutriólogo.
    Incluye información del otro usuario y fechas importantes.

    Ejemplo de respuesta:
    {
      "contratos": [
        {
          "id_contrato": 1,
          "otro_usuario_nombre": "Dr. Juan Pérez",
          "monto": 50.00,
          "moneda": "usd",
          "estado": "ACTIVO",
          "duracion_meses": 1,
          "fecha_creacion": "2024-01-15",
          "fecha_inicio": "2024-01-16",
          "fecha_fin": "2024-02-16"
        }
      ]
    }
    """

    logger.info(f"📋 Obteniendo contratos del usuario {usuario_id}")

    try:
        # Obtener contratos donde el usuario es cliente O nutriólogo
        contratos = db.query(Contrato).filter(
            (Contrato.id_cliente == usuario_id) | (Contrato.id_nutriologo == usuario_id)
        ).all()

        logger.info(f"✅ Encontrados {len(contratos)} contratos")

        resultado = []

        for contrato in contratos:
            # Determinar qué tipo de usuario somos y obtener nombre del otro
            if contrato.id_cliente == usuario_id:
                # Somos cliente, obtener nombre del nutriólogo
                otro_usuario = db.query(Usuario).filter(
                    Usuario.id_usuario == contrato.id_nutriologo
                ).first()
                otro_nombre = otro_usuario.nombre if otro_usuario else "Desconocido"
            else:
                # Somos nutriólogo, obtener nombre del cliente
                otro_usuario = db.query(Usuario).filter(
                    Usuario.id_usuario == contrato.id_cliente
                ).first()
                otro_nombre = otro_usuario.nombre if otro_usuario else "Desconocido"

            resultado.append({
                "id_contrato": contrato.id_contrato,
                "otro_usuario_nombre": otro_nombre,
                "monto": float(contrato.monto),
                "moneda": contrato.moneda or "usd",
                "estado": contrato.estado.value,
                "duracion_meses": contrato.duracion_meses,
                "fecha_creacion": contrato.fecha_creacion.isoformat() if contrato.fecha_creacion else None,
                "fecha_inicio": contrato.fecha_inicio.isoformat() if contrato.fecha_inicio else None,
                "fecha_fin": contrato.fecha_fin.isoformat() if contrato.fecha_fin else None
            })

        return {
            "contratos": resultado
        }

    except Exception as e:
        logger.error(f"❌ Error al obtener contratos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener contratos: {str(e)}"
        )