"""
API Backend para Reseñas y Calificaciones de Nutriólogos
Endpoints:
- POST /api/resenas -> Crear reseña
- GET /api/resenas/nutriologo/{id} -> Listar reseñas de un nutriólogo
- GET /api/resenas/{id} -> Obtener detalle de reseña
- PUT /api/resenas/{id} -> Editar reseña (solo cliente dueño)
- DELETE /api/resenas/{id} -> Eliminar reseña (solo cliente dueño)
- GET /api/resenas/stats/nutriologo/{id} -> Estadísticas agregadas
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict, Annotated
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func, Enum
from datetime import datetime

from core.deps import get_db, get_current_user
from models.resena import Resena  # ✅ IMPORTAR DIRECTAMENTE DEL MODELO
from models.user import Usuario

router = APIRouter(prefix="/resenas", tags=["Reseñas"])

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

    # Información adicional del cliente (para mostrar en frontend)
    cliente_nombre: Optional[str] = None

    class Config:
        from_attributes = True


class ResenaStatsOut(BaseModel):
    id_nutriologo: int
    total_resenas: int
    calificacion_promedio: float
    distribucion_estrellas: Dict[str, int]  # {"5": 10, "4": 5, ...}


# ============ HELPERS ============

def _get_resena_or_404(db: Session, resena_id: int):
    """Obtiene una reseña o lanza 404"""
    resena = db.query(Resena).filter(Resena.id_resena == resena_id).first()
    if not resena:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")
    return resena


def _ensure_cliente(user: Usuario):
    """Verifica que el usuario sea cliente (no nutriólogo)"""
    tipo = getattr(user, "tipo_usuario", None)
    if isinstance(tipo, Enum):
        tipo = tipo.value
    if tipo == "nutriologo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los nutriólogos no pueden crear reseñas"
        )


# ============ ENDPOINTS ============

@router.post("", response_model=dict)
def crear_resena(
    payload: ResenaCreate,
    db: DbDep,
    user: UserDep
):
    """
    Crea una nueva reseña (solo clientes)
    """
    _ensure_cliente(user)

    id_cliente = getattr(user, "id_usuario", None) or getattr(user, "id", None)

    # Verificar que el nutriólogo existe
    nutriologo = db.query(Usuario).filter(
        Usuario.id_usuario == payload.id_nutriologo
    ).first()
    if not nutriologo:
        raise HTTPException(status_code=404, detail="Nutriólogo no encontrado")

    # Verificar que no exista reseña previa del mismo cliente
    existente = db.query(Resena).filter(  # ✅ CORREGIDO: Era obtener_resena
        and_(
            Resena.id_cliente == id_cliente,
            Resena.id_nutriologo == payload.id_nutriologo
        )
    ).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail="Ya has calificado a este nutriólogo. Edita tu reseña existente."
        )

    # Crear reseña
    resena = Resena(
        id_cliente=id_cliente,
        id_nutriologo=payload.id_nutriologo,
        id_contrato=payload.id_contrato,
        calificacion=payload.calificacion,
        titulo=payload.titulo,
        comentario=payload.comentario,
        verificado=bool(payload.id_contrato)  # Si tiene contrato, verificado
    )

    db.add(resena)
    db.commit()
    db.refresh(resena)

    return {
        "ok": True,
        "id_resena": resena.id_resena,
        "message": "Reseña creada exitosamente"
    }


@router.get("/nutriologo/{nutri_id}", response_model=List[ResenaOut])
def listar_resenas_nutriologo(
    nutri_id: int,
    db: DbDep,
    solo_verificadas: bool = True,
    limit: int = 10,
    offset: int = 0
):
    """
    Obtiene las reseñas de un nutriólogo
    """
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

    total = qry.count()
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


@router.get("/{resena_id}", response_model=ResenaOut)
def obtener_resena(
    resena_id: int,
    db: DbDep
):
    """
    Obtiene el detalle de una reseña específica
    """
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


@router.put("/{resena_id}", response_model=dict)
def actualizar_resena(
    resena_id: int,
    payload: ResenaUpdate,
    db: DbDep,
    user: UserDep
):
    """
    Actualiza una reseña (solo el cliente propietario)
    """
    resena = _get_resena_or_404(db, resena_id)
    id_cliente = getattr(user, "id_usuario", None) or getattr(user, "id", None)

    # Verificar propiedad
    if resena.id_cliente != id_cliente:
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

    return {
        "ok": True,
        "id_resena": resena.id_resena,
        "message": "Reseña actualizada"
    }


@router.delete("/{resena_id}", response_model=dict)
def eliminar_resena(
    resena_id: int,
    db: DbDep,
    user: UserDep
):
    """
    Elimina una reseña (solo el cliente propietario)
    """
    resena = _get_resena_or_404(db, resena_id)
    id_cliente = getattr(user, "id_usuario", None) or getattr(user, "id", None)

    # Verificar propiedad
    if resena.id_cliente != id_cliente:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes eliminar tu propia reseña"
        )

    db.delete(resena)
    db.commit()

    return {
        "ok": True,
        "message": "Reseña eliminada"
    }


@router.get("/stats/nutriologo/{nutri_id}", response_model=ResenaStatsOut)
def estadisticas_resenas(
    nutri_id: int,
    db: DbDep
):
    """
    Obtiene estadísticas agregadas de un nutriólogo
    - Total de reseñas
    - Calificación promedio
    - Distribución por estrellas
    """
    # Verificar nutriólogo existe
    nutriologo = db.query(Usuario).filter(
        Usuario.id_usuario == nutri_id
    ).first()
    if not nutriologo:
        raise HTTPException(status_code=404, detail="Nutriólogo no encontrado")

    # Resenas verificadas
    resenas = db.query(Resena).filter(  # ✅ CORREGIDO: Era Resena desimportada
        and_(
            Resena.id_nutriologo == nutri_id,
            Resena.verificado == True
        )
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
    promedio = round(suma_cal / total, 2)

    # Distribución
    distribucion = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
    for r in resenas:
        estrella = str(int(r.calificacion))
        if estrella in distribucion:
            distribucion[estrella] += 1

    return ResenaStatsOut(
        id_nutriologo=nutri_id,
        total_resenas=total,
        calificacion_promedio=promedio,
        distribucion_estrellas=distribucion
    )