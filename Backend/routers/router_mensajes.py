"""
Backend/routers/router_mensajes.py
Router completo para gestionar mensajes entre usuarios
Endpoints:
- GET /api/mensajes/no-leidos -> Obtener número de mensajes no leídos
- GET /api/mensajes/conversaciones -> Listar conversaciones del usuario
- GET /api/mensajes/chat/{usuario_id} -> Obtener detalle de conversación
- POST /api/mensajes/enviar -> Enviar un mensaje
- PUT /api/mensajes/{mensaje_id}/marcar-leido -> Marcar mensaje como leído
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import Annotated, List, Optional
from datetime import datetime
import logging

from core.deps import get_db, get_current_user
from models.mensajes import Mensaje
from models.user import Usuario
from schemas.mensajes import (
    MensajeCreate,
    MensajeResponse,
    ConversacionResponse,
    ConversacionDetailResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mensajes", tags=["mensajes"])

# Tipados seguros
DbDep = Annotated[Session, Depends(get_db)]
UserDep = Annotated[Usuario, Depends(get_current_user)]


# ============================================================
# ENDPOINT: Obtener número de mensajes no leídos
# ============================================================
@router.get("/no-leidos", response_model=dict)
def obtener_mensajes_no_leidos(
    current_user: UserDep,
    db: DbDep
):
    """
    Obtiene el número total de mensajes no leídos del usuario actual

    Returns:
        {
            "no_leidos": int,
            "conversaciones_no_leidas": int
        }
    """
    try:
        usuario_id = current_user.id_usuario

        # Contar mensajes no leídos
        no_leidos = db.query(func.count(Mensaje.id)).filter(
            and_(
                Mensaje.destinatario_id == usuario_id,
                Mensaje.leido == False
            )
        ).scalar() or 0

        # Contar conversaciones con mensajes no leídos
        conversaciones_no_leidas = db.query(func.count(func.distinct(Mensaje.remitente_id))).filter(
            and_(
                Mensaje.destinatario_id == usuario_id,
                Mensaje.leido == False
            )
        ).scalar() or 0

        logger.info(f"✅ Usuario {usuario_id} ({current_user.nombre}) tiene {no_leidos} mensajes no leídos")

        return {
            "no_leidos": no_leidos,
            "conversaciones_no_leidas": conversaciones_no_leidas
        }
    except Exception as e:
        logger.error(f"❌ Error obteniendo mensajes no leídos: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener mensajes no leídos"
        )


# ============================================================
# ENDPOINT: Listar conversaciones del usuario
# ============================================================
@router.get("/conversaciones", response_model=List[ConversacionResponse])
def obtener_conversaciones(
    current_user: UserDep,
    db: DbDep
):
    """
    Obtiene todas las conversaciones del usuario actual con la información más reciente

    Returns:
        [
            {
                "otro_usuario_id": int,
                "otro_usuario_nombre": str,
                "otro_usuario_foto": str | null,
                "otro_usuario_tipo": str,
                "ultimo_mensaje": str,
                "fecha_ultimo_mensaje": str,
                "mensajes_no_leidos": int
            }
        ]
    """
    try:
        usuario_id = current_user.id_usuario

        # Obtener IDs de todos los usuarios con los que ha hablado
        conversadores = db.query(
            func.distinct(
                func.coalesce(Mensaje.remitente_id, Mensaje.destinatario_id)
            )
        ).filter(
            or_(
                Mensaje.remitente_id == usuario_id,
                Mensaje.destinatario_id == usuario_id
            )
        ).all()

        conversadores_ids = [c[0] for c in conversadores if c[0] != usuario_id]

        conversaciones = []

        for otro_usuario_id in conversadores_ids:
            try:
                # Obtener último mensaje
                ultimo_mensaje = db.query(Mensaje).filter(
                    or_(
                        and_(Mensaje.remitente_id == usuario_id, Mensaje.destinatario_id == otro_usuario_id),
                        and_(Mensaje.remitente_id == otro_usuario_id, Mensaje.destinatario_id == usuario_id)
                    )
                ).order_by(desc(Mensaje.fecha_creacion)).first()

                if not ultimo_mensaje:
                    continue

                # Obtener info del otro usuario
                otro_usuario = db.query(Usuario).filter(Usuario.id_usuario == otro_usuario_id).first()

                if not otro_usuario:
                    continue

                # Contar mensajes no leídos
                no_leidos = db.query(func.count(Mensaje.id)).filter(
                    and_(
                        Mensaje.remitente_id == otro_usuario_id,
                        Mensaje.destinatario_id == usuario_id,
                        Mensaje.leido == False
                    )
                ).scalar() or 0

                # Obtener tipo de usuario (manejo seguro de enum)
                tipo_usuario = "usuario"
                if otro_usuario.tipo_usuario:
                    tipo_usuario = otro_usuario.tipo_usuario.value if hasattr(otro_usuario.tipo_usuario, 'value') else str(otro_usuario.tipo_usuario)

                conversaciones.append(
                    ConversacionResponse(
                        otro_usuario_id=otro_usuario_id,
                        otro_usuario_nombre=otro_usuario.nombre,
                        otro_usuario_foto=getattr(otro_usuario, 'documento_url', None),
                        otro_usuario_tipo=tipo_usuario,
                        ultimo_mensaje=ultimo_mensaje.contenido[:100] if ultimo_mensaje.contenido else "Sin mensaje",
                        fecha_ultimo_mensaje=ultimo_mensaje.fecha_creacion.isoformat() if ultimo_mensaje.fecha_creacion else None,
                        mensajes_no_leidos=no_leidos
                    )
                )
            except Exception as item_error:
                logger.warning(f"⚠️  Error procesando conversación con usuario {otro_usuario_id}: {str(item_error)}")
                continue

        # Ordenar por fecha más reciente
        conversaciones.sort(
            key=lambda x: x.fecha_ultimo_mensaje or "",
            reverse=True
        )

        logger.info(f"✅ Usuario {usuario_id} ({current_user.nombre}) tiene {len(conversaciones)} conversaciones")
        return conversaciones

    except Exception as e:
        logger.error(f"❌ Error obteniendo conversaciones: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener conversaciones"
        )


# ============================================================
# ENDPOINT: Obtener detalle de una conversación
# ============================================================
@router.get("/chat/{usuario_id}", response_model=ConversacionDetailResponse)
def obtener_conversacion_detalle(
    usuario_id: int,
    current_user: UserDep,
    db: DbDep
):
    """
    Obtiene todos los mensajes de una conversación específica

    Path Parameters:
        usuario_id: ID del otro usuario en la conversación

    Returns:
        {
            "otro_usuario_id": int,
            "otro_usuario_nombre": str,
            "otro_usuario_foto": str | null,
            "otro_usuario_tipo": str,
            "mensajes": [
                {
                    "id": int,
                    "remitente_id": int,
                    "destinatario_id": int,
                    "contenido": str,
                    "leido": bool,
                    "fecha_creacion": str,
                    "fecha_actualizacion": str
                }
            ]
        }
    """
    try:
        usuario_actual_id = current_user.id_usuario

        # Validar que el otro usuario existe
        otro_usuario = db.query(Usuario).filter(Usuario.id_usuario == usuario_id).first()
        if not otro_usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )

        # Obtener todos los mensajes de la conversación
        mensajes = db.query(Mensaje).filter(
            or_(
                and_(Mensaje.remitente_id == usuario_actual_id, Mensaje.destinatario_id == usuario_id),
                and_(Mensaje.remitente_id == usuario_id, Mensaje.destinatario_id == usuario_actual_id)
            )
        ).order_by(Mensaje.fecha_creacion).all()

        # Marcar como leídos los mensajes que recibió el usuario actual
        db.query(Mensaje).filter(
            and_(
                Mensaje.remitente_id == usuario_id,
                Mensaje.destinatario_id == usuario_actual_id,
                Mensaje.leido == False
            )
        ).update({"leido": True, "fecha_actualizacion": datetime.utcnow()})
        db.commit()

        # Convertir mensajes a respuesta
        mensajes_response = [
            MensajeResponse(
                id=m.id,
                remitente_id=m.remitente_id,
                destinatario_id=m.destinatario_id,
                contenido=m.contenido,
                leido=m.leido,
                fecha_creacion=m.fecha_creacion.isoformat() if m.fecha_creacion else None,
                fecha_actualizacion=m.fecha_actualizacion.isoformat() if m.fecha_actualizacion else None
            )
            for m in mensajes
        ]

        # Obtener tipo de usuario (manejo seguro de enum)
        tipo_usuario = "usuario"
        if otro_usuario.tipo_usuario:
            tipo_usuario = otro_usuario.tipo_usuario.value if hasattr(otro_usuario.tipo_usuario, 'value') else str(otro_usuario.tipo_usuario)

        logger.info(f"✅ Conversación cargada entre {usuario_actual_id} y {usuario_id}")

        return ConversacionDetailResponse(
            otro_usuario_id=usuario_id,
            otro_usuario_nombre=otro_usuario.nombre,
            otro_usuario_foto=getattr(otro_usuario, 'documento_url', None),
            otro_usuario_tipo=tipo_usuario,
            mensajes=mensajes_response
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo conversación: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener conversación"
        )


# ============================================================
# ENDPOINT: Enviar un mensaje
# ============================================================
@router.post("/enviar", response_model=MensajeResponse, status_code=status.HTTP_201_CREATED)
def enviar_mensaje(
    mensaje_data: MensajeCreate,
    current_user: UserDep,
    db: DbDep
):
    """
    Envía un mensaje a otro usuario

    Request Body:
        {
            "destinatario_id": int,
            "contenido": str
        }

    Returns:
        MensajeResponse con los datos del mensaje creado
    """
    try:
        usuario_id = current_user.id_usuario

        # Validar que no se envíe mensaje a sí mismo
        if usuario_id == mensaje_data.destinatario_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No puedes enviar mensajes a ti mismo"
            )

        # Validar que el destinatario existe
        destinatario = db.query(Usuario).filter(
            Usuario.id_usuario == mensaje_data.destinatario_id
        ).first()
        if not destinatario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El usuario destinatario no existe"
            )

        # Crear mensaje
        nuevo_mensaje = Mensaje(
            remitente_id=usuario_id,
            destinatario_id=mensaje_data.destinatario_id,
            contenido=mensaje_data.contenido,
            leido=False,
            fecha_creacion=datetime.utcnow(),
            fecha_actualizacion=datetime.utcnow()
        )

        db.add(nuevo_mensaje)
        db.commit()
        db.refresh(nuevo_mensaje)

        logger.info(f"✅ Mensaje enviado de {usuario_id} ({current_user.nombre}) a {mensaje_data.destinatario_id}")

        return MensajeResponse(
            id=nuevo_mensaje.id,
            remitente_id=nuevo_mensaje.remitente_id,
            destinatario_id=nuevo_mensaje.destinatario_id,
            contenido=nuevo_mensaje.contenido,
            leido=nuevo_mensaje.leido,
            fecha_creacion=nuevo_mensaje.fecha_creacion.isoformat(),
            fecha_actualizacion=nuevo_mensaje.fecha_actualizacion.isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error enviando mensaje: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al enviar mensaje"
        )


# ============================================================
# ENDPOINT: Marcar mensaje como leído
# ============================================================
@router.put("/{mensaje_id}/marcar-leido", response_model=dict)
def marcar_mensaje_leido(
    mensaje_id: int,
    current_user: UserDep,
    db: DbDep
):
    """
    Marca un mensaje como leído (solo el destinatario puede hacer esto)

    Path Parameters:
        mensaje_id: ID del mensaje a marcar como leído
    """
    try:
        usuario_id = current_user.id_usuario

        # Obtener mensaje
        mensaje = db.query(Mensaje).filter(Mensaje.id == mensaje_id).first()
        if not mensaje:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mensaje no encontrado"
            )

        # Validar que el usuario es el destinatario
        if mensaje.destinatario_id != usuario_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el destinatario puede marcar como leído"
            )

        # Marcar como leído
        mensaje.leido = True
        mensaje.fecha_actualizacion = datetime.utcnow()
        db.commit()

        logger.info(f"✅ Mensaje {mensaje_id} marcado como leído por {usuario_id}")

        return {"success": True, "mensaje": "Marcado como leído"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error marcando mensaje como leído: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al marcar como leído"
        )