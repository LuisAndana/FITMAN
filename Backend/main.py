# main.py — FitSo Backend
# ===============================================
# Desarrollado con FastAPI
# Arquitectura modular con routers, modelos y servicios
# ===============================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 🔹 Configuración y base de datos
from config.database import Base, engine

# 🔹 Importar todos los modelos para crear las tablas
from models import user, dieta, receta, ingrediente, progreso, logro, calendario

# 🔹 Importar routers (rutas de la API)
from routers import users, auth
# (Después agregaremos dietas, recetas, progreso, etc.)

# ===============================================
# Inicializar la aplicación
# ===============================================
app = FastAPI(
    title="FitSo API - Backend",
    description="API oficial de la plataforma FitSo — Creación de dietas personalizadas con IA",
    version="1.0.0"
)

# ===============================================
# Crear tablas (solo en modo desarrollo)
# ===============================================
Base.metadata.create_all(bind=engine)

# ===============================================
# Configurar CORS (para conectar con el frontend Angular)
# ===============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción: usar ["http://localhost:4200"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================================
# Registrar rutas principales
# ===============================================
app.include_router(auth.router, prefix="/auth", tags=["Autenticación"])
app.include_router(users.router, prefix="/users", tags=["Usuarios"])
# (Más adelante añadiremos dietas, recetas, progreso, logros, calendario...)

# ===============================================
# Endpoint raíz de prueba
# ===============================================
@app.get("/", tags=["Inicio"])
def root():
    """
    Verifica el estado de la API.
    """
    return {
        "status": "OK",
        "message": "🚀 FitSo API funcionando correctamente",
        "version": "1.0.0"
    }

# ===============================================
# Servidor principal
# ===============================================
# Ejecuta el servidor con: uvicorn main:app --reload
