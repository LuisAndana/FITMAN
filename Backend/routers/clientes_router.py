"""
Router para gestionar clientes y dietas generadas por IA
Estructura: Backend/routers/clientes_router.py
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import anthropic
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# ✅ IMPORTS EXACTOS PARA TU ESTRUCTURA
from config.database import get_db
from models.user import Usuario
from models.contrato import Contrato
from models.dieta import Dieta
from schemas.cliente import ClienteResponse, DietaAIRequest, DietaAIResponse
from core.security import get_current_user

# Cargar variables de entorno
load_dotenv()

router = APIRouter(prefix="/api/clientes", tags=["clientes"])

# ✅ INICIALIZAR ANTHROPIC CORRECTAMENTE
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY no está configurada en variables de entorno")

client_anthropic = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


@router.get("/mis-clientes", response_model=List[ClienteResponse])
async def obtener_mis_clientes(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene la lista de clientes contratados por un nutriólogo
    Solo nutriólogos pueden acceder a esta ruta
    """

    # Verificar que el usuario es nutriólogo
    if current_user.tipo_usuario != "nutriologo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los nutriólogos pueden acceder a esta ruta"
        )

    # Obtener contratos activos donde el nutriólogo es el actual
    contratos = db.query(Contrato).filter(
        Contrato.id_nutriologo == current_user.id_usuario,
        Contrato.estado.in_(["ACTIVO", "PENDIENTE"])
    ).all()

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
                objetivo=cliente.objetivo,
                enfermedades=enfermedades,
                descripcion_medica=cliente.descripcion_medica,
                peso_inicial=cliente.peso_inicial,
                contrato_id=contrato.id_contrato,
                contrato_estado=contrato.estado
            ))

    return clientes


@router.get("/cliente/{cliente_id}", response_model=ClienteResponse)
async def obtener_perfil_cliente(
    cliente_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene el perfil completo de un cliente específico
    El nutriólogo solo puede ver clientes que tiene contratados
    """

    # Verificar que el usuario es nutriólogo
    if current_user.tipo_usuario != "nutriologo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los nutriólogos pueden acceder a esta ruta"
        )

    # Verificar que existe un contrato entre el nutriólogo y el cliente
    contrato = db.query(Contrato).filter(
        Contrato.id_nutriologo == current_user.id_usuario,
        Contrato.id_cliente == cliente_id
    ).first()

    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este cliente"
        )

    # Obtener datos del cliente
    cliente = db.query(Usuario).filter(
        Usuario.id_usuario == cliente_id
    ).first()

    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )

    # Parsear enfermedades si es string JSON
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
        objetivo=cliente.objetivo,
        enfermedades=enfermedades,
        descripcion_medica=cliente.descripcion_medica,
        peso_inicial=cliente.peso_inicial,
        contrato_id=contrato.id_contrato,
        contrato_estado=contrato.estado
    )


@router.post("/generar-dieta-ia", response_model=DietaAIResponse)
async def generar_dieta_con_ia(
    dieta_request: DietaAIRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera una dieta personalizada usando IA (Claude) basada en
    las características del cliente
    """

    # Verificar que el usuario es nutriólogo
    if current_user.tipo_usuario != "nutriologo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los nutriólogos pueden generar dietas"
        )

    # Obtener datos del cliente
    cliente = db.query(Usuario).filter(
        Usuario.id_usuario == dieta_request.id_cliente
    ).first()

    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado"
        )

    # Construir prompt para IA con características del cliente
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
    }.get(cliente.objetivo, cliente.objetivo)

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

    try:
        # Llamar a API de Claude
        response = client_anthropic.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2500,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        dieta_contenido = response.content[0].text

        # Crear registro en base de datos
        nueva_dieta = Dieta(
            id_usuario=dieta_request.id_cliente,
            nombre=dieta_request.nombre_dieta,
            descripcion=dieta_contenido,
            objetivo=cliente.objetivo,
            calorias_totales=dieta_request.calorias_objetivo,
            fecha_creacion=datetime.now()
        )

        db.add(nueva_dieta)
        db.commit()
        db.refresh(nueva_dieta)

        return DietaAIResponse(
            id_dieta=nueva_dieta.id_dieta,
            nombre=nueva_dieta.nombre,
            contenido=dieta_contenido,
            calorias_totales=nueva_dieta.calorias_totales,
            objetivo=nueva_dieta.objetivo,
            fecha_creacion=nueva_dieta.fecha_creacion
        )

    except anthropic.APIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error de IA: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar dieta: {str(e)}"
        )


@router.get("/dieta/{dieta_id}")
async def obtener_dieta(
    dieta_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene una dieta específica creada
    """

    # Obtener dieta
    dieta = db.query(Dieta).filter(
        Dieta.id_dieta == dieta_id
    ).first()

    if not dieta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dieta no encontrada"
        )

    # Verificar que el nutriólogo tiene acceso
    if current_user.tipo_usuario == "nutriologo":
        # Verificar que el cliente de esta dieta está bajo su cuidado
        contrato = db.query(Contrato).filter(
            Contrato.id_nutriologo == current_user.id_usuario,
            Contrato.id_cliente == dieta.id_usuario
        ).first()

        if not contrato:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes acceso a esta dieta"
            )
    elif current_user.id_usuario != dieta.id_usuario:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta dieta"
        )

    return {
        "id_dieta": dieta.id_dieta,
        "nombre": dieta.nombre,
        "descripcion": dieta.descripcion,
        "objetivo": dieta.objetivo,
        "calorias_totales": dieta.calorias_totales,
        "fecha_creacion": dieta.fecha_creacion
    }


@router.get("/mis-dietas")
async def obtener_mis_dietas(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene todas las dietas del usuario actual
    """

    dietas = db.query(Dieta).filter(
        Dieta.id_usuario == current_user.id_usuario
    ).all()

    return [
        {
            "id_dieta": d.id_dieta,
            "nombre": d.nombre,
            "objetivo": d.objetivo,
            "calorias_totales": d.calorias_totales,
            "fecha_creacion": d.fecha_creacion
        }
        for d in dietas
    ]


@router.get("/clients")
async def obtener_clientes_alias(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await obtener_mis_clientes(current_user, db)

@router.get("/me")
async def obtener_mi_perfil(current_user = Depends(get_current_user)):
    return {
        "id_usuario": current_user.get("user_id"),
        **current_user
    }