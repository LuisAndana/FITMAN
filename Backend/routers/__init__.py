"""
Módulo de routers para la API FitSo
Importaciones centralizadas de todos los routers
"""

# Importar los routers de cada módulo
from . import auth
from . import users
from . import contratos
from . import clientes_router as clientes

__all__ = ['auth', 'users', 'contratos', 'clientes']