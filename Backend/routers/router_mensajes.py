"""
Backend/routers/mensajes.py
Router para gestionar mensajes entre usuarios
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import Annotated

from core.deps import get_db, get_current_user
from models.mensajes import Mensaje
from models.user import Usuario
from schemas.mensajes import (
    MensajeCreate,
    MensajeResponse,
    ConversacionResponse,
    ConversacionDetailResponse
)

router = APIRouter(prefix="/api/mensajes", tags=["mensajes"])

# Tipados seguros
DbDep = Annotated[Session, Depends(get_db)]
UserDep = Annotated[dict, Depends(get_current_user)]


@router.post("/enviar", response_model=MensajeResponse, status_code=status.HTTP_201_CREATED)
def enviar_mensaje(
        mensaje_data: MensajeCreate,
        current_user: UserDep,
        db: DbDep
):
    """Enviar un mensaje a otro usuario"""
    usuario_id = int(current_user["sub"])

    # Validar que no se envíe mensaje a sí mismo
    if usuario_id == mensaje_data.destinatario_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes enviar mensajes a ti mismo"
        )

    # Validar que el destinatario existe
    destinatario = db.query(Usuario).filter(Usuario.id_usuario == mensaje_data.destinatario_id).first()
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
        leido=False
    )

    db.add(nuevo_mensaje)
    db.commit()
    db.refresh(nuevo_mensaje)

    return nuevo_mensaje


@router.get("/conversaciones", response_model=list[ConversacionResponse])
def obtener_conversaciones(
        current_user: UserDep,
        db: DbDep
):
    """Obtener lista de conversaciones del usuario actual"""
    usuario_id = int(current_user["sub"])

    # Obtener todos los mensajes donde el usuario es remitente o destinatario
    mensajes = db.query(Mensaje).filter(
        or_(
            Mensaje.remitente_id == usuario_id,
            Mensaje.destinatario_id == usuario_id
        )
    ).order_by(desc(Mensaje.fecha_creacion)).all()

    if not mensajes:
        return []

    # Agrupar por conversación (con el otro usuario)
    conversaciones_dict = {}

    for mensaje in mensajes:
        # Determinar quién es el "otro usuario"
        otro_usuario_id = mensaje.destinatario_id if mensaje.remitente_id == usuario_id else mensaje.remitente_id

        if otro_usuario_id not in conversaciones_dict:
            otro_usuario = db.query(Usuario).filter(Usuario.id_usuario == otro_usuario_id).first()

            if otro_usuario:
                conversaciones_dict[otro_usuario_id] = {
                    "otro_usuario_id": otro_usuario_id,
                    "otro_usuario_nombre": otro_usuario.nombre,
                    "otro_usuario_foto": getattr(otro_usuario, "foto_perfil", None),
                    "otro_usuario_tipo": otro_usuario.tipo_usuario.value if hasattr(otro_usuario.tipo_usuario,
                                                                                    'value') else otro_usuario.tipo_usuario,
                    "ultimo_mensaje": mensaje.contenido,
                    "fecha_ultimo_mensaje": mensaje.fecha_creacion,
                    "mensajes_no_leidos": 0
                }

        # Contar mensajes no leídos (solo los que el usuario actual recibió)
        if otro_usuario_id in conversaciones_dict:
            if mensaje.destinatario_id == usuario_id and not mensaje.leido:
                conversaciones_dict[otro_usuario_id]["mensajes_no_leidos"] += 1

    return list(conversaciones_dict.values())


@router.get("/conversacion/{usuario_id}", response_model=ConversacionDetailResponse)
def obtener_conversacion_detalle(
        usuario_id: int,
        current_user: UserDep,
        db: DbDep
):
    """Obtener conversación detallada con otro usuario"""
    remitente_id = int(current_user["sub"])

    # Validar que existe el otro usuario
    otro_usuario = db.query(Usuario).filter(Usuario.id_usuario == usuario_id).first()
    if not otro_usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario no existe"
        )

    # Obtener todos los mensajes de la conversación
    mensajes = db.query(Mensaje).filter(
        or_(
            and_(Mensaje.remitente_id == remitente_id, Mensaje.destinatario_id == usuario_id),
            and_(Mensaje.remitente_id == usuario_id, Mensaje.destinatario_id == remitente_id)
        )
    ).order_by(Mensaje.fecha_creacion).all()

    # Marcar como leído los mensajes recibidos
    for mensaje in mensajes:
        if mensaje.destinatario_id == remitente_id and not mensaje.leido:
            mensaje.leido = True

    db.commit()

    tipo_usuario = otro_usuario.tipo_usuario.value if hasattr(otro_usuario.tipo_usuario,
                                                              'value') else otro_usuario.tipo_usuario

    return ConversacionDetailResponse(
        otro_usuario_id=usuario_id,
        otro_usuario_nombre=otro_usuario.nombre,
        otro_usuario_foto=getattr(otro_usuario, "foto_perfil", None),
        otro_usuario_tipo=tipo_usuario,
        mensajes=[MensajeResponse.from_orm(m) for m in mensajes]
    )


@router.put("/marcar-leido/{mensaje_id}")
def marcar_mensaje_como_leido(
        mensaje_id: int,
        current_user: UserDep,
        db: DbDep
):
    """Marcar un mensaje como leído"""
    usuario_id = int(current_user["sub"])

    mensaje = db.query(Mensaje).filter(Mensaje.id == mensaje_id).first()
    if not mensaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mensaje no encontrado"
        )

    # Validar que el usuario actual es el destinatario
    if mensaje.destinatario_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para marcar este mensaje como leído"
        )

    mensaje.leido = True
    db.commit()

    return {"mensaje": "Marcado como leído"}


@router.get("/no-leidos")
def obtener_mensajes_no_leidos(
        current_user: UserDep,
        db: DbDep
):
    """Obtener cantidad de mensajes no leídos"""
    usuario_id = int(current_user["sub"])

    no_leidos = db.query(Mensaje).filter(
        and_(
            Mensaje.destinatario_id == usuario_id,
            Mensaje.leido == False
        )
    ).count()

    return {"mensajes_no_leidos": no_leidos}