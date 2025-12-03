"""
Router para gestionar clientes y dietas generadas por IA
Estructura: Backend/routers/clientes_router.py
INTEGRACIÓN: Google Gemini 2.5 + Sistema de Actualización de Dietas
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Annotated
import google.generativeai as genai
import json
import os
from datetime import datetime
from dotenv import load_dotenv
import logging

# ✅ CORRECCIÓN: Importar de core.deps (NO de core.security)
from config.database import get_db
from models.user import Usuario
from models.contrato import Contrato
from models.dieta import Dieta, EstadoDieta
from schemas.cliente import ClienteResponse, DietaAIRequest, DietaAIResponse
from core.deps import get_current_user
from services.dieta_ia_service import DietaService

# Configurar logging
logger = logging.getLogger("clientes")
logger.setLevel(logging.INFO)

# Cargar variables de entorno
load_dotenv()

router = APIRouter(prefix="/api/clientes", tags=["clientes"])

# ✅ INICIALIZAR GOOGLE GEMINI 2.5
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_ID = os.getenv("GEMINI_MODEL_ID", "models/gemini-2.5-flash")

if not GEMINI_API_KEY:
    logger.warning("⚠️  GEMINI_API_KEY no está configurada en .env")
    raise ValueError("GEMINI_API_KEY no está configurada en variables de entorno")

# Configurar la API de Gemini
genai.configure(api_key=GEMINI_API_KEY)
logger.info(f"✅ Google Gemini 2.5 configurada correctamente")
logger.info(f"   Modelo: {GEMINI_MODEL_ID}")


# ============================================================
# NUTRIÓLOGO - OBTENER CLIENTES
# ============================================================
@router.get("/mis-clientes", response_model=List[ClienteResponse])
async def obtener_mis_clientes(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Obtiene la lista de clientes contratados por un nutriólogo
    Solo nutriólogos pueden acceder a esta ruta
    """

    logger.info(f"📋 Obteniendo clientes del nutriólogo: {current_user.nombre}")

    # Verificar que el usuario es nutriólogo
    if current_user.tipo_usuario.value != "nutriologo":
        logger.warning(f"❌ Acceso denegado: {current_user.nombre} no es nutriólogo")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los nutriólogos pueden acceder a esta ruta"
        )

    # Obtener contratos activos donde el nutriólogo es el actual
    contratos = db.query(Contrato).filter(
        Contrato.id_nutriologo == current_user.id_usuario,
        Contrato.estado.in_(["ACTIVO", "PENDIENTE"])
    ).all()

    logger.info(f"✅ Encontrados {len(contratos)} contratos activos")

    # Obtener datos de clientes
    clientes = []
    for contrato in contratos:
        cliente = db.query(Usuario).filter(
            Usuario.id_usuario == contrato.id_cliente
        ).first()

        if cliente:
            # Parsear enfermedades si es string JSON
            enfermedades = cliente.enfermedades
            if isinstance(enfermedades, str):
                try:
                    enfermedades = json.loads(enfermedades)
                except:
                    enfermedades = []

            clientes.append(ClienteResponse(
                id_usuario=cliente.id_usuario,
                nombre=cliente.nombre,
                edad=cliente.edad,
                peso=cliente.peso,
                altura=cliente.altura,
                objetivo=cliente.objetivo.value if cliente.objetivo else None,
                enfermedades=enfermedades,
                descripcion_medica=cliente.descripcion_medica,
                peso_inicial=cliente.peso_inicial,
                contrato_id=contrato.id_contrato,
                contrato_estado=contrato.estado
            ))

    return clientes


# ============================================================
# OBTENER PERFIL DE UN CLIENTE
# ============================================================
@router.get("/cliente/{cliente_id}", response_model=ClienteResponse)
async def obtener_perfil_cliente(
    cliente_id: int,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Obtiene el perfil completo de un cliente específico
    El nutriólogo solo puede ver clientes que tiene contratados
    """

    logger.info(f"📋 Obteniendo perfil del cliente {cliente_id}")

    # Verificar que el usuario es nutriólogo
    if current_user.tipo_usuario.value != "nutriologo":
        raise HTTPException(status_code=403, detail="Solo nutriólogos pueden acceder")

    # Verificar que tiene contrato con este cliente
    contrato = db.query(Contrato).filter(
        Contrato.id_nutriologo == current_user.id_usuario,
        Contrato.id_cliente == cliente_id,
        Contrato.estado.in_(["ACTIVO", "PENDIENTE"])
    ).first()

    if not contrato:
        logger.warning(f"❌ No hay contrato entre nutriólogo {current_user.id_usuario} y cliente {cliente_id}")
        raise HTTPException(status_code=403, detail="No tienes acceso a este cliente")

    # Obtener cliente
    cliente = db.query(Usuario).filter(Usuario.id_usuario == cliente_id).first()

    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Parsear enfermedades
    enfermedades = cliente.enfermedades
    if isinstance(enfermedades, str):
        try:
            enfermedades = json.loads(enfermedades)
        except:
            enfermedades = []

    return ClienteResponse(
        id_usuario=cliente.id_usuario,
        nombre=cliente.nombre,
        edad=cliente.edad,
        peso=cliente.peso,
        altura=cliente.altura,
        objetivo=cliente.objetivo.value if cliente.objetivo else None,
        enfermedades=enfermedades,
        descripcion_medica=cliente.descripcion_medica,
        peso_inicial=cliente.peso_inicial,
        contrato_id=contrato.id_contrato,
        contrato_estado=contrato.estado
    )


# ============================================================
# GENERAR DIETA CON IA (GOOGLE GEMINI 2.5)
# ============================================================
@router.post("/generar-dieta-ia", response_model=DietaAIResponse)
async def generar_dieta_con_ia(
    dieta_request: DietaAIRequest,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Genera una dieta personalizada usando IA (Google Gemini 2.5) basada en
    las características del cliente.
    Solo nutriólogos pueden generar dietas.
    """

    logger.info(f"🤖 Generando dieta para cliente {dieta_request.id_cliente} con Gemini 2.5")

    # ✅ VERIFICAR QUE EL USUARIO ES NUTRIÓLOGO
    if current_user.tipo_usuario.value != "nutriologo":
        logger.warning(f"❌ Acceso denegado: {current_user.nombre} no es nutriólogo")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los nutriólogos pueden generar dietas"
        )

    # ✅ OBTENER DATOS DEL CLIENTE
    cliente = db.query(Usuario).filter(
        Usuario.id_usuario == dieta_request.id_cliente
    ).first()

    if not cliente:
        logger.error(f"❌ Cliente {dieta_request.id_cliente} no encontrado")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )

    logger.info(f"✅ Cliente encontrado: {cliente.nombre}")

    # ✅ VERIFICAR QUE TIENE CONTRATO CON ESTE CLIENTE
    contrato = db.query(Contrato).filter(
        Contrato.id_nutriologo == current_user.id_usuario,
        Contrato.id_cliente == cliente.id_usuario,
        Contrato.estado.in_(["ACTIVO", "PENDIENTE"])
    ).first()

    if not contrato:
        logger.warning(f"❌ No hay contrato entre {current_user.nombre} y {cliente.nombre}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes un contrato activo con este cliente"
        )

    logger.info(f"✅ Contrato verificado")

    # ✅ CONSTRUIR PROMPT PARA IA
    enfermedades = cliente.enfermedades or []
    if isinstance(enfermedades, str):
        try:
            enfermedades = json.loads(enfermedades)
        except:
            enfermedades = []

    # Formatear objetivo
    objetivo_formato = {
        'bajar_peso': 'Bajar de peso',
        'mantener': 'Mantener peso',
        'aumentar_masa': 'Aumentar masa muscular'
    }.get(str(cliente.objetivo.value) if cliente.objetivo else 'mantener', str(cliente.objetivo.value) if cliente.objetivo else 'Mantener peso')

    prompt = f"""
    Eres un nutriólogo experto. Necesito que generes una dieta personalizada 
    para el siguiente cliente:
    
    DATOS DEL CLIENTE:
    - Nombre: {cliente.nombre}
    - Edad: {cliente.edad} años
    - Peso actual: {cliente.peso} kg
    - Altura: {cliente.altura} m
    - Peso inicial: {cliente.peso_inicial} kg
    - Objetivo: {objetivo_formato}
    - Condiciones médicas: {', '.join(enfermedades) if enfermedades else 'Ninguna'}
    - Descripción médica: {cliente.descripcion_medica or 'Sin información adicional'}
    
    INFORMACIÓN DE LA DIETA:
    - Nombre: {dieta_request.nombre_dieta}
    - Días de duración: {dieta_request.dias_duracion}
    - Calorías objetivo: {dieta_request.calorias_objetivo}
    - Preferencias especiales: {dieta_request.preferencias or 'Ninguna'}
    
    Por favor:
    1. Crea un plan de dieta detallado para {dieta_request.dias_duracion} días
    2. Incluye desayuno, almuerzo, merienda y cena para cada día
    3. Asegúrate de que sea adecuada para sus condiciones médicas
    4. Proporciona recomendaciones nutricionales específicas
    5. Incluye consejos de salud personalizados
    6. Mantén aproximadamente {dieta_request.calorias_objetivo} calorías diarias
    
    Formatea la respuesta de manera clara y estructurada.
    """

    logger.info(f"📝 Prompt generado, llamando a Google Gemini 2.5...")

    try:
        # ✅ LLAMAR A API DE GOOGLE GEMINI 2.5
        model = genai.GenerativeModel(GEMINI_MODEL_ID)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                top_p=0.95,
                top_k=40,
                max_output_tokens=8192,
                candidate_count=1,
            )
        )

        dieta_contenido = response.text

        logger.info(f"✅ Respuesta de Gemini recibida ({len(dieta_contenido)} caracteres)")

        # ✅ CREAR DIETA USANDO DIETASERVICE
        nueva_dieta = DietaService.crear_dieta(
            db=db,
            id_usuario=dieta_request.id_cliente,
            nombre=dieta_request.nombre_dieta,
            descripcion=dieta_contenido,
            objetivo=str(cliente.objetivo.value) if cliente.objetivo else "saludable",
            calorias_totales=dieta_request.calorias_objetivo,
            dias_duracion=dieta_request.dias_duracion
        )

        logger.info(f"✅ Dieta guardada en BD con ID={nueva_dieta.id_dieta}")

        dias_restantes = nueva_dieta.dias_restantes()

        return DietaAIResponse(
            id_dieta=nueva_dieta.id_dieta,
            nombre=nueva_dieta.nombre,
            contenido=dieta_contenido,
            calorias_totales=nueva_dieta.calorias_totales,
            objetivo=nueva_dieta.objetivo.value,
            fecha_creacion=nueva_dieta.fecha_creacion,
            dias_duracion=nueva_dieta.dias_duracion,
            fecha_vencimiento=nueva_dieta.fecha_vencimiento,
            estado=nueva_dieta.estado.value,
            dias_restantes=dias_restantes
        )

    except Exception as e:
        logger.error(f"❌ Error generando dieta con Gemini: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando dieta: {str(e)}"
        )


# ============================================================
# OBTENER DIETAS DEL USUARIO
# ============================================================
@router.get("/mis-dietas", response_model=List[DietaAIResponse])
async def obtener_mis_dietas(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Obtiene todas las dietas del usuario actual (cliente)
    """

    logger.info(f"📋 Obteniendo dietas del usuario {current_user.nombre}")

    dietas = db.query(Dieta).filter(
        Dieta.id_usuario == current_user.id_usuario
    ).all()

    logger.info(f"✅ Encontradas {len(dietas)} dietas")

    return [
        DietaAIResponse(
            id_dieta=d.id_dieta,
            nombre=d.nombre,
            contenido=d.descripcion,
            calorias_totales=d.calorias_totales,
            objetivo=d.objetivo.value if d.objetivo else "mantener",
            fecha_creacion=d.fecha_creacion,
            dias_duracion=d.dias_duracion,
            fecha_vencimiento=d.fecha_vencimiento,
            estado=d.estado.value,
            dias_restantes=d.dias_restantes()
        )
        for d in dietas
    ]


# ============================================================
# OBTENER UNA DIETA ESPECÍFICA
# ============================================================
@router.get("/dieta/{dieta_id}", response_model=DietaAIResponse)
async def obtener_dieta(
    dieta_id: int,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Obtiene una dieta específica del usuario
    """

    logger.info(f"📋 Obteniendo dieta {dieta_id}")

    dieta = db.query(Dieta).filter(
        Dieta.id_dieta == dieta_id,
        Dieta.id_usuario == current_user.id_usuario
    ).first()

    if not dieta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dieta no encontrada"
        )

    dias_restantes = dieta.dias_restantes() if dieta.estado == EstadoDieta.activa else 0

    return DietaAIResponse(
        id_dieta=dieta.id_dieta,
        nombre=dieta.nombre,
        contenido=dieta.descripcion,
        calorias_totales=dieta.calorias_totales,
        objetivo=dieta.objetivo.value if dieta.objetivo else "mantener",
        fecha_creacion=dieta.fecha_creacion,
        dias_duracion=dieta.dias_duracion,
        fecha_vencimiento=dieta.fecha_vencimiento,
        estado=dieta.estado.value,
        dias_restantes=dias_restantes
    )


# ============================================================
# ASIGNAR DIETA A CLIENTE (Nutriólogo)
# ============================================================
@router.post("/asignar-dieta")
async def asignar_dieta_a_cliente(
    request: dict,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Asigna una dieta generada a un cliente específico.
    Solo nutriólogos pueden asignar dietas.

    Request:
    {
        "id_dieta": 1,
        "id_cliente": 13
    }
    """

    logger.info(f"✅ Asignando dieta {request.get('id_dieta')} al cliente {request.get('id_cliente')}")

    # Verificar que el usuario es nutriólogo
    if current_user.tipo_usuario.value != "nutriologo":
        logger.warning(f"❌ Acceso denegado: {current_user.nombre} no es nutriólogo")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los nutriólogos pueden asignar dietas"
        )

    id_dieta = request.get("id_dieta")
    id_cliente = request.get("id_cliente")

    if not id_dieta or not id_cliente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requieren id_dieta e id_cliente"
        )

    # Obtener la dieta
    dieta = db.query(Dieta).filter(Dieta.id_dieta == id_dieta).first()
    if not dieta:
        raise HTTPException(status_code=404, detail="Dieta no encontrada")

    # Obtener el cliente
    cliente = db.query(Usuario).filter(Usuario.id_usuario == id_cliente).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Verificar que tiene contrato con este cliente
    contrato = db.query(Contrato).filter(
        Contrato.id_nutriologo == current_user.id_usuario,
        Contrato.id_cliente == id_cliente,
        Contrato.estado.in_(["ACTIVO", "PENDIENTE"])
    ).first()

    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes contrato con este cliente"
        )

    # Actualizar la dieta para que esté asignada al cliente
    dieta.id_usuario = id_cliente
    db.commit()
    db.refresh(dieta)

    logger.info(f"✅ Dieta {id_dieta} asignada al cliente {id_cliente}")

    return {
        "mensaje": "Dieta asignada exitosamente",
        "id_dieta": dieta.id_dieta,
        "id_cliente": id_cliente,
        "nombre": dieta.nombre
    }


# ============================================================
# OBTENER DIETAS ASIGNADAS AL CLIENTE (Cliente)
# ============================================================
@router.get("/mis-dietas-asignadas", response_model=List[DietaAIResponse])
async def obtener_mis_dietas_asignadas(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Obtiene todas las dietas asignadas al cliente actual.
    Incluye solo dietas activas.
    """

    logger.info(f"📋 Obteniendo dietas asignadas al cliente {current_user.id_usuario}")

    # Obtener todas las dietas activas de este usuario
    dietas = db.query(Dieta).filter(
        Dieta.id_usuario == current_user.id_usuario,
        Dieta.estado == EstadoDieta.activa
    ).order_by(Dieta.fecha_creacion.desc()).all()

    logger.info(f"✅ Encontradas {len(dietas)} dietas activas")

    respuesta = []
    for d in dietas:
        dias_restantes = d.dias_restantes()
        respuesta.append(DietaAIResponse(
            id_dieta=d.id_dieta,
            nombre=d.nombre,
            contenido=d.descripcion,
            calorias_totales=d.calorias_totales,
            objetivo=d.objetivo.value if d.objetivo else "mantener",
            fecha_creacion=d.fecha_creacion,
            dias_duracion=d.dias_duracion,
            fecha_vencimiento=d.fecha_vencimiento,
            estado=d.estado.value,
            dias_restantes=dias_restantes
        ))

    return respuesta


# ============================================================
# OBTENER ESTADO DE LAS DIETAS (Cliente)
# ============================================================
@router.get("/dietas-estado")
async def obtener_estado_dietas(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Obtiene información del estado de las dietas del cliente
    """

    logger.info(f"📊 Obteniendo estado de dietas para {current_user.id_usuario}")

    info = DietaService.obtener_info_dietas(db, current_user.id_usuario)

    return {
        "dietas_activas": info["dietas_activas"],
        "dietas_vencidas": info["dietas_vencidas"],
        "proxima_vencimiento": info["proxima_vencimiento"],
        "dietas": [
            {
                "id_dieta": d.id_dieta,
                "nombre": d.nombre,
                "dias_restantes": d.dias_restantes(),
                "fecha_vencimiento": d.fecha_vencimiento,
                "estado": d.estado.value
            }
            for d in info["dietas_activas_list"]
        ]
    }


# ============================================================
# ACTUALIZAR DIETA CUANDO VENCE (Nutriólogo)
# ============================================================
@router.post("/actualizar-dieta-vencida")
async def actualizar_dieta_vencida(
    request: dict,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Crea una nueva dieta reemplazando la que vencio.

    Request:
    {
        "id_dieta_anterior": 1,
        "nombre_nueva": "Dieta volumen versión 2",
        "descripcion_nueva": "...",
        "calorias_nuevas": 2800,
        "dias_duracion": 30
    }
    """

    logger.info(f"🔄 Actualizando dieta vencida")

    # Verificar que es nutriólogo
    if current_user.tipo_usuario.value != "nutriologo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo nutriólogos pueden actualizar dietas"
        )

    id_dieta_anterior = request.get("id_dieta_anterior")
    nombre_nueva = request.get("nombre_nueva")
    descripcion_nueva = request.get("descripcion_nueva")
    calorias_nuevas = request.get("calorias_nuevas", 2000)
    dias_duracion = request.get("dias_duracion", 30)

    try:
        # Usar DietaService para crear nueva dieta
        nueva_dieta = DietaService.crear_nueva_dieta_desde_vencida(
            db=db,
            id_dieta_anterior=id_dieta_anterior,
            nombre_nueva=nombre_nueva,
            descripcion_nueva=descripcion_nueva,
            calorias_nuevas=calorias_nuevas,
            dias_duracion=dias_duracion
        )

        logger.info(f"✅ Nueva dieta creada: {nueva_dieta.id_dieta}")

        return {
            "id_dieta_nueva": nueva_dieta.id_dieta,
            "id_dieta_anterior": id_dieta_anterior,
            "nombre": nueva_dieta.nombre,
            "mensaje": "Dieta actualizada exitosamente",
            "fecha_vencimiento": nueva_dieta.fecha_vencimiento
        }

    except Exception as e:
        logger.error(f"❌ Error actualizando dieta: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================
# TEST
# ============================================================
@router.get("/test")
async def test():
    """Endpoint de prueba"""
    return {"message": "✅ Clientes router con Gemini 2.5 y actualización de dietas funcionando"}