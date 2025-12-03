"""
Router para catálogos de la aplicación
Estructura: Backend/routers/catalogo_router.py
"""

from fastapi import APIRouter, HTTPException, status
from typing import List

router = APIRouter(prefix="/api/catalogo", tags=["catalogo"])

# Catálogo de enfermedades disponibles
ENFERMEDADES_CATALOG = [
    "Diabetes",
    "Hipertensión",
    "Asma",
    "Artritis",
    "Enfermedad renal",
    "Cáncer",
    "Hipotiroidismo",
    "Cardiopatía",
    "Obesidad",
    "Migraña",
    "Tiroiditis",
    "Osteoporosis",
    "Enfermedad pulmonar obstructiva crónica (EPOC)",
    "Síndrome del intestino irritable",
    "Enfermedad de Crohn",
    "Colitis ulcerosa",
    "Celiaquía",
    "Alergia alimentaria",
    "Gastritis",
    "Reflujo gastroesofágico",
    "Fibromialgia",
    "Lupus",
    "Artritis reumatoide",
    "Enfermedad de Graves",
    "Vitíligo",
    "Psoriasis",
    "Dermatitis atópica",
    "Anemia",
    "Hemofilia",
    "Trombosis",
    "Hiperlipidemia",
    "Gota",
    "Depresión",
    "Ansiedad",
    "Trastorno bipolar",
    "Esquizofrenia",
    "Insomnio",
    "Apnea del sueño",
    "Síndrome metabólico",
    "Acné",
    "Caspa",
    "Eczema",
]


@router.get("/enfermedades", response_model=List[str])
def get_enfermedades_catalog():
    """
    Retorna el catálogo completo de enfermedades disponibles.

    Usado por el perfil de cliente para mostrar opciones de autocompletado
    y selección de condiciones médicas.
    """
    return sorted(ENFERMEDADES_CATALOG)


@router.post("/enfermedades/validar")
def validar_enfermedad(enfermedad: str):
    """
    Valida si una enfermedad existe en el catálogo.

    Parámetros:
        enfermedad: nombre de la enfermedad a validar

    Retorna:
        { "valido": true/false }
    """
    is_valid = enfermedad in ENFERMEDADES_CATALOG

    return {
        "enfermedad": enfermedad,
        "valido": is_valid,
        "mensaje": "Enfermedad válida" if is_valid else "Enfermedad no reconocida"
    }