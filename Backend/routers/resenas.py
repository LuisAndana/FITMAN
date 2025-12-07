"""
API Backend para Reseñas y Calificaciones de Nutriólogos
Endpoints:
- POST /api/resenas -> Crear reseña (✅ SIN restricción de reseña única)
- GET /api/resenas/{id} -> Obtener detalle de reseña
- GET /api/resenas/nutriologo/{id} -> Listar reseñas de un nutriólogo
- PUT /api/resenas/{id} -> Editar reseña (solo cliente dueño)
- DELETE /api/resenas/{id} -> Eliminar reseña (solo cliente dueño)
- GET /api/resenas/stats/nutriologo/{id} -> Estadísticas agregadas
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Annotated
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func
from datetime import datetime
import logging

from core.deps import get_db, get_current_user
from models.resena import Resena
from models.user import Usuario

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Reseñas"])

DbDep = Annotated[Session, Depends(get_db)]
UserDep = Annotated[Usuario, Depends(get_current_user)]


# ============ SCHEMAS PYDANTIC ============

class ResenaCreate(BaseModel):
    id_nutriologo: int
    calificacion: float = Field(..., ge=1, le=5, description="Calificación de 1 a 5 estrellas")
    titulo: Optional[str] = Field(None, max_length=150)
    comentario: Optional[str] = Field(None, max_length=1000)
    id_contrato: Optional[int] = None


class ResenaUpdate(BaseModel):
    calificacion: Optional[float] = Field(None, ge=1, le=5)
    titulo: Optional[str] = Field(None, max_length=150)
    comentario: Optional[str] = Field(None, max_length=1000)


class ResenaOut(BaseModel):
    id_resena: int
    id_cliente: int
    id_nutriologo: int
    calificacion: float
    titulo: Optional[str]
    comentario: Optional[str]
    verificado: bool
    creado_en: Optional[str]
    cliente_nombre: Optional[str] = None

    class Config:
        from_attributes = True


class ResenaStatsOut(BaseModel):
    id_nutriologo: int
    total_resenas: int
    calificacion_promedio: float
    distribucion_estrellas: Dict[str, int]


# ============ HELPERS ============

def _get_resena_or_404(db: Session, resena_id: int):
    """Obtiene una reseña o lanza 404"""
    try:
        resena = db.query(Resena).filter(Resena.id_resena == resena_id).first()
        if not resena:
            raise HTTPException(status_code=404, detail="Reseña no encontrada")
        return resena
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting resena: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener reseña")


# ============ ENDPOINTS ============

@router.post("", response_model=dict)
def crear_resena(
    payload: ResenaCreate,
    db: DbDep,
    user: UserDep
):
    """
    ✅ CREAR RESEÑA - SIN RESTRICCIÓN DE RESEÑA ÚNICA

    Ahora un cliente PUEDE escribir múltiples reseñas al mismo nutriólogo.
    Cada reseña es independiente (diferentes fechas, calificaciones, comentarios).
    """
    try:
        logger.info(f"📝 Iniciando creación de reseña...")

        id_usuario = getattr(user, "id_usuario", None) or getattr(user, "id", None)

        logger.info(f"   ID usuario: {id_usuario}")
        logger.info(f"   Nutriólogo: {payload.id_nutriologo}")

        if not id_usuario:
            logger.warning("❌ No se pudo obtener ID del usuario")
            raise HTTPException(
                status_code=400,
                detail="No se pudo identificar al usuario"
            )

        # ✅ VALIDACIÓN: Nutriólogo existe
        logger.info(f"   Buscando nutriólogo ID: {payload.id_nutriologo}")
        nutriologo = db.query(Usuario).filter(
            Usuario.id_usuario == payload.id_nutriologo
        ).first()

        if not nutriologo:
            logger.warning(f"❌ Nutriólogo {payload.id_nutriologo} no encontrado")
            raise HTTPException(
                status_code=404,
                detail=f"Nutriólogo con ID {payload.id_nutriologo} no encontrado"
            )

        logger.info(f"✅ Nutriólogo encontrado: {nutriologo.nombre}")

        # ✅ VALIDACIÓN: No auto-reseñarse
        if id_usuario == payload.id_nutriologo:
            logger.warning(f"❌ Intento de auto-reseña")
            raise HTTPException(
                status_code=400,
                detail="No puedes reseñarte a ti mismo"
            )

        # ✅ CAMBIO CRÍTICO: ELIMINADA la validación de reseña existente
        # ❌ ANTES: Buscaba si ya existía una reseña del mismo usuario
        # ✅ AHORA: Permite crear múltiples reseñas sin restricción

        logger.info(f"   Creando objeto Resena...")
        resena = Resena(
            id_cliente=id_usuario,
            id_nutriologo=payload.id_nutriologo,
            id_contrato=payload.id_contrato,
            calificacion=payload.calificacion,
            titulo=payload.titulo,
            comentario=payload.comentario,
            verificado=bool(payload.id_contrato)
        )

        logger.info(f"   Guardando en BD...")
        db.add(resena)
        db.commit()
        db.refresh(resena)

        logger.info(f"✅ Reseña creada exitosamente: ID {resena.id_resena}")

        return {
            "ok": True,
            "id_resena": resena.id_resena,
            "message": "✅ Reseña creada exitosamente"
        }

    except HTTPException as he:
        logger.warning(f"❌ HTTPException: {he.detail}")
        db.rollback()
        raise
    except Exception as e:
        logger.error(f"❌ Error creating review: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear la reseña: {str(e)}"
        )


@router.get("/{resena_id}", response_model=ResenaOut)
def obtener_resena(
    resena_id: int,
    db: DbDep
):
    """
    Obtiene el detalle de una reseña específica (público)
    """
    try:
        resena = _get_resena_or_404(db, resena_id)
        cliente = db.query(Usuario).filter(Usuario.id_usuario == resena.id_cliente).first()

        return ResenaOut(
            id_resena=resena.id_resena,
            id_cliente=resena.id_cliente,
            id_nutriologo=resena.id_nutriologo,
            calificacion=resena.calificacion,
            titulo=resena.titulo,
            comentario=resena.comentario,
            verificado=resena.verificado,
            creado_en=resena.creado_en.isoformat() if resena.creado_en else None,
            cliente_nombre=getattr(cliente, "nombre", "Cliente anónimo") if cliente else "Cliente anónimo"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching review: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener la reseña")


@router.get("/nutriologo/{nutri_id}", response_model=List[ResenaOut])
def listar_resenas_nutriologo(
    nutri_id: int,
    db: DbDep,
    solo_verificadas: bool = False,
    limit: int = 20,
    offset: int = 0
):
    """
    Obtiene las reseñas de un nutriólogo (público)

    ✅ CAMBIO: solo_verificadas por defecto es False (muestra todas)
    """
    try:
        # Verificar que el nutriólogo existe
        nutriologo = db.query(Usuario).filter(
            Usuario.id_usuario == nutri_id
        ).first()
        if not nutriologo:
            raise HTTPException(status_code=404, detail="Nutriólogo no encontrado")

        # Construir query
        qry = db.query(Resena).filter(Resena.id_nutriologo == nutri_id)

        if solo_verificadas:
            qry = qry.filter(Resena.verificado == True)

        # Ordenar por más recientes
        qry = qry.order_by(desc(Resena.creado_en))

        resenas = qry.offset(offset).limit(limit).all()

        # Enriquecer con info del cliente
        result = []
        for r in resenas:
            cliente = db.query(Usuario).filter(Usuario.id_usuario == r.id_cliente).first()
            out = ResenaOut(
                id_resena=r.id_resena,
                id_cliente=r.id_cliente,
                id_nutriologo=r.id_nutriologo,
                calificacion=r.calificacion,
                titulo=r.titulo,
                comentario=r.comentario,
                verificado=r.verificado,
                creado_en=r.creado_en.isoformat() if r.creado_en else None,
                cliente_nombre=getattr(cliente, "nombre", "Cliente anónimo") if cliente else "Cliente anónimo"
            )
            result.append(out)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nutritionist reviews: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener las reseñas")


@router.put("/{resena_id}", response_model=dict)
def actualizar_resena(
    resena_id: int,
    payload: ResenaUpdate,
    db: DbDep,
    user: UserDep
):
    """
    Actualiza una reseña (solo el propietario)
    """
    try:
        resena = _get_resena_or_404(db, resena_id)
        id_usuario = getattr(user, "id_usuario", None) or getattr(user, "id", None)

        # Verificar propiedad
        if resena.id_cliente != id_usuario:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo puedes editar tu propia reseña"
            )

        # Actualizar campos
        if payload.calificacion is not None:
            resena.calificacion = payload.calificacion
        if payload.titulo is not None:
            resena.titulo = payload.titulo
        if payload.comentario is not None:
            resena.comentario = payload.comentario

        resena.actualizado_en = datetime.utcnow()

        db.add(resena)
        db.commit()
        db.refresh(resena)

        logger.info(f"✅ Reseña actualizada: {resena_id}")

        return {
            "ok": True,
            "id_resena": resena.id_resena,
            "message": "✅ Reseña actualizada"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating review: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al actualizar la reseña")


@router.delete("/{resena_id}", response_model=dict)
def eliminar_resena(
    resena_id: int,
    db: DbDep,
    user: UserDep
):
    """
    Elimina una reseña (solo el propietario)
    """
    try:
        resena = _get_resena_or_404(db, resena_id)
        id_usuario = getattr(user, "id_usuario", None) or getattr(user, "id", None)

        # Verificar propiedad
        if resena.id_cliente != id_usuario:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo puedes eliminar tu propia reseña"
            )

        db.delete(resena)
        db.commit()

        logger.info(f"✅ Reseña eliminada: {resena_id}")

        return {
            "ok": True,
            "message": "✅ Reseña eliminada"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting review: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al eliminar la reseña")


@router.get("/stats/nutriologo/{nutri_id}", response_model=ResenaStatsOut)
def estadisticas_resenas(
    nutri_id: int,
    db: DbDep
):
    """
    Obtiene estadísticas agregadas de un nutriólogo (público)
    - Total de reseñas
    - Calificación promedio
    - Distribución por estrellas
    """
    try:
        # Verificar nutriólogo existe
        nutriologo = db.query(Usuario).filter(
            Usuario.id_usuario == nutri_id
        ).first()
        if not nutriologo:
            raise HTTPException(status_code=404, detail="Nutriólogo no encontrado")

        # ✅ CAMBIO: Obtener todas las reseñas (no solo verificadas)
        resenas = db.query(Resena).filter(
            Resena.id_nutriologo == nutri_id
        ).all()

        total = len(resenas)

        if total == 0:
            return ResenaStatsOut(
                id_nutriologo=nutri_id,
                total_resenas=0,
                calificacion_promedio=0.0,
                distribucion_estrellas={"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
            )

        # Promedio
        suma_cal = sum(r.calificacion for r in resenas)
        promedio = round(suma_cal / total, 1)

        # Distribución (redondea hacia arriba para medias estrellas)
        distribucion = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
        for r in resenas:
            estrella = str(round(r.calificacion))  # Redondea 4.5 -> 5, 4.3 -> 4
            if estrella in distribucion:
                distribucion[estrella] += 1

        return ResenaStatsOut(
            id_nutriologo=nutri_id,
            total_resenas=total,
            calificacion_promedio=promedio,
            distribucion_estrellas=distribucion
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating review stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al calcular estadísticas")