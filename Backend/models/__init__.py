# models/__init__.py
# Solo importa modelos, no declares clases aquí

from .user import (
    Usuario,
    ObjetivoUsuario,
    TipoUsuarioEnum,
    EstadoValidacionEnum,   # si lo usas
    ValidacionNutriologo,   # <-- ahora viene de user.py
)
from .dieta import Dieta
from .receta import Receta
from .ingrediente import Ingrediente
from .progreso import Progreso
from .logro import Logro
from .calendario import CalendarioDieta

__all__ = [
    "Usuario",
    "ObjetivoUsuario",
    "TipoUsuarioEnum",
    "EstadoValidacionEnum",
    "ValidacionNutriologo",
    "Dieta",
    "Receta",
    "Ingrediente",
    "Progreso",
    "Logro",
    "CalendarioDieta",
]
