from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from typing import Optional, List, Any, Dict, Annotated
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
import os
import uuid
import enum
import shutil

from core.deps import get_db, get_current_user
from models.user import Usuario, ObjetivoUsuario, TipoUsuarioEnum
from models import ValidacionNutriologo

router = APIRouter(tags=["Usuarios"])  # <- SIN prefix aquí; se monta en main.py

# Tipados seguros para FastAPI/Pydantic v2 en dependencias
DbDep = Annotated[Session, Depends(get_db)]
UserDep = Annotated[Usuario, Depends(get_current_user)]
FileDep = Annotated[UploadFile, File(...)]

# ---------- Config de subida ----------
UPLOAD_DIR = os.getenv("UPLOAD_DIR_VALIDACIONES", "uploads/validaciones")
ALLOWED_MIME = {"application/pdf", "image/png", "image/jpeg"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------- Schemas ----------
class UsuarioUpdate(BaseModel):
    # comunes/cliente
    nombre: Optional[str] = None
    edad: Optional[int] = None
    peso: Optional[float] = None
    altura: Optional[float] = None
    objetivo: Optional[str] = None
    enfermedades: Optional[List[str]] = None
    peso_inicial: Optional[float] = None
    descripcion_enfermedades: Optional[str] = None
    # nutriólogo
    profesion: Optional[str] = None
    numero_cedula: Optional[str] = None


class ProgresoOut(BaseModel):
    # KPIs
    entrenamientos: int
    racha: int
    logros: int
    progreso: int                  # 0–100 respecto a peso_inicial
    calorias_semana: int
    cambio_peso: float             # peso_inicial - peso (negativo si subió)
    imc: Optional[float] = None
    # Series para la gráfica
    labels: Optional[List[str]] = None
    peso_series: Optional[List[float]] = None
    imc_series: Optional[List[float]] = None


# ---------- Helpers ----------
def _to_dict(u: Usuario) -> Dict[str, Any]:
    return {
        "id_usuario": getattr(u, "id_usuario", None),
        "nombre": u.nombre,
        "correo": u.correo,
        "edad": u.edad,
        "peso": u.peso,
        "altura": u.altura,
        "objetivo": u.objetivo.name if isinstance(u.objetivo, ObjetivoUsuario) else u.objetivo,
        "enfermedades": getattr(u, "enfermedades", None),
        "peso_inicial": getattr(u, "peso_inicial", None),
        # lee de cualquiera de los dos nombres, según tu modelo
        "descripcion_enfermedades": (
            getattr(u, "descripcion_enfermedades", None)
            if hasattr(u, "descripcion_enfermedades")
            else getattr(u, "descripcion_medica", None)
        ),
        # Campos de nutriólogo
        "profesion": getattr(u, "profesion", None),
        "numero_cedula": getattr(u, "numero_cedula", None),
        "validado": bool(getattr(u, "validado", False)),
        "documento_url": getattr(u, "documento_url", None),
    }


def _set_if_hasattr(target: Any, field: str, value: Any):
    if hasattr(target, field):
        setattr(target, field, value)


def _ensure_nutriologo(user: Any):
    tipo = getattr(user, "tipo_usuario", None)
    # Acepta Enum o string
    if isinstance(tipo, enum.Enum):
        tipo = tipo.value
    if tipo != "nutriologo":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo nutriólogos.")


# ===========================================================
#         LISTADO Y PERFIL PÚBLICO DE NUTRIÓLOGOS
# ===========================================================
class NutriologoPublicOut(BaseModel):
    id_usuario: int
    nombre: Optional[str] = None
    profesion: Optional[str] = None
    numero_cedula_mask: Optional[str] = None
    validado: bool
    documento_url: Optional[str] = None


def _mask_cedula(c: Optional[str]) -> Optional[str]:
    if not c:
        return None
    s = str(c)
    if len(s) <= 4:
        return "****"
    return f"{'*' * (len(s)-4)}{s[-4:]}"


# ===========================================================
#            VALIDACIÓN NUTRIÓLOGO (SUBIR/GET/DELETE)
# ===========================================================
@router.post("/nutriologos/validacion", response_model=dict)
async def subir_validacion(
    archivo: FileDep,
    db: DbDep,
    user: UserDep
):
    """
    Sube el documento (PDF/JPG/PNG) que avala al nutriólogo.
    - Guarda archivo físico
    - Marca al usuario como NO validado
    - Inserta una fila en validaciones_nutriologo con estado='pendiente'
      (histórico de solicitudes)
    """
    _ensure_nutriologo(user)

    if archivo.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Formato no soportado. Usa PDF/JPG/PNG.")

    # Guardar archivo
    ext = os.path.splitext(archivo.filename or "")[1].lower() or ".bin"
    filename = f"{getattr(user, 'id_usuario', getattr(user, 'id', 'u'))}_{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(UPLOAD_DIR, filename)

    size = 0
    with open(save_path, "wb") as f:
        while True:
            chunk = await archivo.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_SIZE:
                f.close()
                try:
                    os.remove(save_path)
                except Exception:
                    pass
                raise HTTPException(status_code=400, detail="El archivo supera 10 MB.")
            f.write(chunk)

    public_url = f"/static/validaciones/{filename}"

    # Usuario real de BD (dueño del token)
    db_user = db.query(Usuario).filter(
        Usuario.id_usuario == (getattr(user, "id_usuario", None) or getattr(user, "id", None))
    ).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    # Marcar usuario como no validado y guardar su último documento
    db_user.documento_url = public_url
    db_user.validado = False
    db.add(db_user)

    # Crear NUEVA fila de validación (histórico)
    v = ValidacionNutriologo(
        id_usuario=db_user.id_usuario,
        filename=filename,
        documento_url=public_url,
        estado="pendiente",
        revisor_id=None,
        comentario=None,
    )


    db.add(v)
    db.commit()
    db.refresh(db_user)
    db.refresh(v)

    return {
        "ok": True,
        "message": "Documento recibido. Quedará pendiente hasta validación.",
        "documento_url": public_url,
        "validado": bool(db_user.validado),
        "id_validacion": getattr(v, "id_validacion", getattr(v, "id", None)),
        "estado": v.estado,
    }


@router.get("/nutriologos/validacion", response_model=dict)
def estado_validacion(
    db: DbDep,
    user: UserDep
):
    _ensure_nutriologo(user)
    db_user = db.query(Usuario).filter(
        Usuario.id_usuario == (getattr(user, "id_usuario", None) or getattr(user, "id", None))
    ).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return {
        "documento_url": getattr(db_user, "documento_url", None),
        "validado": bool(getattr(db_user, "validado", False)),
    }


@router.delete("/nutriologos/validacion", response_model=dict)
def eliminar_validacion(
    db: DbDep,
    user: UserDep
):
    _ensure_nutriologo(user)
    db_user = db.query(Usuario).filter(
        Usuario.id_usuario == (getattr(user, "id_usuario", None) or getattr(user, "id", None))
    ).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    doc_url = getattr(db_user, "documento_url", None)
    if doc_url:
        filename = os.path.basename(doc_url)
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass

    _set_if_hasattr(db_user, "documento_url", None)
    _set_if_hasattr(db_user, "validado", False)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"ok": True}


# ===========================================================
#             ADMIN (SIN TOKEN, SOLO DESARROLLO)
# ===========================================================
def _ensure_admin():
    # No-op: autorización deshabilitada en desarrollo
    return


class DecisionPayload(BaseModel):
    aprobado: bool
    motivo: Optional[str] = None  # requerido si aprobado=False


@router.get("/admin/validaciones/pendientes", response_model=List[Dict[str, Any]])
def listar_pendientes(db: DbDep):
    q = (
        db.query(ValidacionNutriologo)
        .filter(ValidacionNutriologo.estado == "pendiente")
        .order_by(desc(ValidacionNutriologo.creado_en))
        .all()
    )
    out: List[Dict[str, Any]] = []
    for v in q:
        out.append({
            "id_validacion": getattr(v, "id_validacion", getattr(v, "id", None)),
            "id_usuario": v.id_usuario,
            "filename": v.filename,
            "content_type": getattr(v, "content_type", None),
            "tamano": getattr(v, "tamano", None),
            "creado_en": getattr(v, "creado_en", None),
            "documento_url": v.documento_url,
            "estado": v.estado,
            "comentario": getattr(v, "comentario", None),
        })
    return out


@router.post("/admin/nutriologos/{user_id}/validacion/decidir", response_model=dict)
def decidir_validacion(user_id: int, payload: DecisionPayload, db: DbDep):
    user = db.query(Usuario).filter(Usuario.id_usuario == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    v = (
        db.query(ValidacionNutriologo)
        .filter(ValidacionNutriologo.id_usuario == user_id)
        .order_by(desc(ValidacionNutriologo.creado_en))
        .first()
    )
    if not v:
        raise HTTPException(status_code=404, detail="No hay solicitud de validación")

    if payload.aprobado:
        user.validado = True
        v.estado = "aprobado"
        if hasattr(v, "comentario"):
            v.comentario = None
    else:
        if not payload.motivo:
            raise HTTPException(status_code=400, detail="Debes indicar 'motivo' al rechazar")
        user.validado = False
        v.estado = "rechazado"
        if hasattr(v, "comentario"):
            v.comentario = payload.motivo

    db.add(user)
    db.add(v)
    db.commit()
    db.refresh(user)
    db.refresh(v)

    return {
        "ok": True,
        "user_id": user_id,
        "validado": bool(user.validado),
        "estado": v.estado,
        "motivo": getattr(v, "comentario", None),
    }


# ===========================================================
#  LISTA PÚBLICA / PERFIL PÚBLICO DE NUTRIÓLOGOS (antes de /{user_id})
# ===========================================================
@router.get("/nutriologos", response_model=Dict[str, Any], tags=["Nutriólogos"])
def listar_nutriologos(
        db: DbDep,
        q: Optional[str] = None,              # búsqueda por nombre/profesión
        solo_validados: bool = True,          # por defecto solo validados
        page: int = 1,
        size: int = 20,
        order: Optional[str] = "recientes"    # 'recientes' | 'nombre'
):
    if page < 1:
        page = 1
    if size < 1 or size > 100:
        size = 20
    offset = (page - 1) * size

    qry = db.query(Usuario).filter(Usuario.tipo_usuario == TipoUsuarioEnum.nutriologo)
    if solo_validados and hasattr(Usuario, "validado"):
        qry = qry.filter(Usuario.validado == True)  # noqa: E712

    if q:
        # búsqueda simple por nombre o profesión si existen
        conds = []
        if hasattr(Usuario, "nombre"):
            conds.append(Usuario.nombre.ilike(f"%{q}%"))
        if hasattr(Usuario, "profesion"):
            conds.append(Usuario.profesion.ilike(f"%{q}%"))
        if conds:
            from sqlalchemy import or_
            qry = qry.filter(or_(*conds))

    if order == "nombre" and hasattr(Usuario, "nombre"):
        qry = qry.order_by(Usuario.nombre.asc())
    else:
        # recientes por fecha de registro si existe, si no por id desc
        if hasattr(Usuario, "fecha_registro"):
            qry = qry.order_by(Usuario.fecha_registro.desc())
        elif hasattr(Usuario, "id_usuario"):
            qry = qry.order_by(Usuario.id_usuario.desc())

    total = qry.count()
    rows = qry.offset(offset).limit(size).all()

    items: List[NutriologoPublicOut] = []
    for u in rows:
        items.append(NutriologoPublicOut(
            id_usuario=getattr(u, "id_usuario"),
            nombre=getattr(u, "nombre", None),
            profesion=getattr(u, "profesion", None),
            numero_cedula_mask=_mask_cedula(getattr(u, "numero_cedula", None)),
            validado=bool(getattr(u, "validado", False)),
            documento_url=getattr(u, "documento_url", None),
        ))

    return {
        "page": page,
        "size": size,
        "total": total,
        "items": [i.dict() for i in items],
    }


@router.get("/nutriologos/{nutri_id}", response_model=NutriologoPublicOut, tags=["Nutriólogos"])
def ver_nutriologo_publico(nutri_id: int, db: DbDep):
    u = (
        db.query(Usuario)
        .filter(
            Usuario.id_usuario == nutri_id,
            Usuario.tipo_usuario == TipoUsuarioEnum.nutriologo,
        )
        .first()
    )
    if not u:
        raise HTTPException(status_code=404, detail="Nutriólogo no encontrado")

    return NutriologoPublicOut(
        id_usuario=getattr(u, "id_usuario"),
        nombre=getattr(u, "nombre", None),
        profesion=getattr(u, "profesion", None),
        numero_cedula_mask=_mask_cedula(getattr(u, "numero_cedula", None)),
        validado=bool(getattr(u, "validado", False)),
        documento_url=getattr(u, "documento_url", None),
    )


# ===========================================================
#                 ENDPOINTS EXISTENTES
# ===========================================================
@router.get("/{user_id}")
def get_user(user_id: int, db: DbDep):
    u = db.query(Usuario).filter(Usuario.id_usuario == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _to_dict(u)


@router.put("/{user_id}")
def update_user(user_id: int, payload: UsuarioUpdate, db: DbDep):
    u = db.query(Usuario).filter(Usuario.id_usuario == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if payload.nombre is not None:
        u.nombre = payload.nombre
    if payload.edad is not None:
        u.edad = payload.edad
    if payload.peso is not None:
        u.peso = payload.peso
    if payload.altura is not None:
        u.altura = payload.altura

    if payload.objetivo is not None:
        validos = {"bajar_peso", "mantener", "aumentar_masa"}
        if payload.objetivo not in validos:
            raise HTTPException(status_code=400, detail=f"Objetivo inválido. Usa: {', '.join(sorted(validos))}")
        u.objetivo = ObjetivoUsuario[payload.objetivo]

    if payload.enfermedades is not None:
        _set_if_hasattr(u, "enfermedades", payload.enfermedades)
    if payload.peso_inicial is not None:
        _set_if_hasattr(u, "peso_inicial", payload.peso_inicial)
    if payload.descripcion_enfermedades is not None:
        # por compatibilidad, guarda donde corresponda según tu modelo
        if hasattr(u, "descripcion_enfermedades"):
            u.descripcion_enfermedades = payload.descripcion_enfermedades
        elif hasattr(u, "descripcion_medica"):
            u.descripcion_medica = payload.descripcion_enfermedades

    # Campos de nutriólogo
    if payload.profesion is not None:
        _set_if_hasattr(u, "profesion", payload.profesion)
    if payload.numero_cedula is not None:
        _set_if_hasattr(u, "numero_cedula", payload.numero_cedula)

    db.add(u)
    db.commit()
    db.refresh(u)
    return _to_dict(u)


# ---------- Catálogo de enfermedades ----------
@router.get("/illnesses", response_model=List[str])
def illnesses_catalog():
    return [
        "Diabetes", "Hipertensión", "Tiroides", "Cáncer", "Asma",
        "Cardiopatías", "Insuficiencia renal", "Epilepsia", "Colesterol alto",
        "Obesidad", "Artritis", "Migraña"
    ]


# ---------- Progreso del usuario (datos reales si hay historial) ----------
@router.get("/{user_id}/progress", response_model=ProgresoOut)
def get_user_progress(user_id: int, db: DbDep):
    u = db.query(Usuario).filter(Usuario.id_usuario == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    peso_inicial = getattr(u, "peso_inicial", None)
    peso_actual = u.peso
    altura = u.altura

    # -------- Series desde el historial (si existe relación u.progresos) --------
    progresos = []
    try:
        progresos = list(getattr(u, "progresos", []) or [])
    except Exception:
        progresos = []

    # ordenar por fecha ascendente si existe atributo 'fecha'
    def _key_fecha(p):
        f = getattr(p, "fecha", None)
        if isinstance(f, datetime):
            return f
        return datetime.min

    progresos.sort(key=_key_fecha)

    labels: List[str] = []
    peso_series: List[float] = []
    imc_series: List[float] = []

    if progresos:
        for p in progresos:
            f = getattr(p, "fecha", None)
            lbl = f.strftime("%d %b") if isinstance(f, datetime) else ""
            peso_p = getattr(p, "peso", None)
            imc_p = getattr(p, "imc", None)

            labels.append(lbl or f"P{len(labels)+1}")

            if isinstance(peso_p, (int, float)):
                peso_series.append(float(peso_p))
                if isinstance(imc_p, (int, float)):
                    imc_series.append(float(imc_p))
                else:
                    if isinstance(altura, (int, float)) and altura > 0:
                        imc_series.append(round(float(peso_p) / (altura * altura), 1))
                    else:
                        imc_series.append(0.0)
            else:
                peso_series.append(peso_series[-1] if peso_series else float(peso_actual or 0))
                imc_series.append(imc_series[-1] if imc_series else 0.0)

    # Si no hay historial, genera serie mínima (Inicio -> Actual)
    if not labels:
        labels = ["Inicio", "Actual"]
        pi = float(peso_inicial or peso_actual or 0)
        pa = float(peso_actual or pi)
        peso_series = [pi, pa]
        if isinstance(altura, (int, float)) and altura > 0:
            imc_series = [round(pi / (altura * altura), 1), round(pa / (altura * altura), 1)]
        else:
            imc_series = [0.0, 0.0]

    # -------- KPIs reales a partir de historial --------
    entrenamientos = 0
    for p in progresos:
        c = getattr(p, "completado", None)
        entrenamientos += 1 if (c is True or c is None) else 0
    if not progresos:
        entrenamientos = 0

    # racha: días consecutivos terminando en el último registro
    racha = 0
    if progresos and getattr(progresos[-1], "fecha", None):
        streak = 1
        for i in range(len(progresos) - 1, 0, -1):
            f2 = getattr(progresos[i], "fecha", None)
            f1 = getattr(progresos[i - 1], "fecha", None)
            if isinstance(f1, datetime) and isinstance(f2, datetime):
                if (f2.date() - f1.date()).days == 1:
                    streak += 1
                else:
                    break
            else:
                break
        racha = streak

    # calorías semana: suma últimos 7 días si existe atributo 'calorias'
    siete_dias = datetime.utcnow().date() - timedelta(days=6)
    calorias_semana = 0
    for p in progresos:
        f = getattr(p, "fecha", None)
        cal = getattr(p, "calorias", None)
        if isinstance(f, datetime) and f.date() >= siete_dias and isinstance(cal, (int, float)):
            calorias_semana += int(cal)

    # logros: simple por % de bajada del peso inicial
    logros = 0
    if isinstance(peso_inicial, (int, float)) and isinstance(peso_actual, (int, float)) and peso_inicial > 0:
        bajado = peso_inicial - peso_actual
        if bajado >= peso_inicial * 0.05:
            logros += 1
        if bajado >= peso_inicial * 0.10:
            logros += 1
        if bajado >= peso_inicial * 0.15:
            logros += 1

    # cambio e imc actual
    cambio = 0.0
    if isinstance(peso_inicial, (int, float)) and isinstance(peso_actual, (int, float)):
        cambio = round(peso_inicial - peso_actual, 1)

    imc = None
    if isinstance(peso_actual, (int, float)) and isinstance(altura, (int, float)) and altura > 0:
        imc = round(peso_actual / (altura * altura), 1)

    # progreso % relativo al peso inicial
    progreso_pct = 0
    if isinstance(peso_inicial, (int, float)) and isinstance(peso_actual, (int, float)) and peso_inicial > 0:
        progreso_pct = int(max(0, min(100, ((peso_inicial - peso_actual) / peso_inicial) * 100)))

    return ProgresoOut(
        entrenamientos=int(entrenamientos),
        racha=int(racha),
        logros=int(logros),
        progreso=int(progreso_pct),
        calorias_semana=int(calorias_semana),
        cambio_peso=float(cambio),
        imc=imc,
        labels=labels,
        peso_series=[float(x) for x in peso_series],
        imc_series=[float(x) for x in imc_series],
    )


@router.get("/me", response_model=dict)
def get_current_user_info(
        db: DbDep,
        user: UserDep
):
    """
    Obtiene la información del usuario actual (autenticado)
    GET /api/usuarios/me o /api/users/me

    Retorna los datos del usuario desde el token JWT
    """
    db_user = db.query(Usuario).filter(
        Usuario.id_usuario == (getattr(user, "id_usuario", None) or getattr(user, "id", None))
    ).first()

    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return _to_dict(db_user)