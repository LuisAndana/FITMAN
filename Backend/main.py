# main.py — FitSo Backend
# ===============================================
# Desarrollado con FastAPI
# Arquitectura modular con routers, modelos y servicios
# ===============================================

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

# 🔹 Configuración y base de datos
from config.database import Base, engine

# 🔹 Carga todos los modelos UNA sola vez (evita redefinir tablas)
import models  # <- usa models/__init__.py

# 🔹 Routers
from routers import users, auth

# ===============================================
# Inicializar la aplicación
# ===============================================
app = FastAPI(
    title="FitSo API - Backend",
    description="API oficial de la plataforma FitSo — Creación de dietas personalizadas con IA",
    version="1.0.0",
)

# ===============================================
# Crear tablas (solo en desarrollo/local)
# ===============================================
Base.metadata.create_all(bind=engine)

# ===============================================
# CORS
# ===============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "*",  # en producción, reemplaza por tu dominio exacto
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================================
# Estáticos para documentos de validación
# ===============================================
UPLOAD_DIR = os.getenv("UPLOAD_DIR_VALIDACIONES", "uploads/validaciones")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static/validaciones", StaticFiles(directory=UPLOAD_DIR), name="validaciones")

# ===============================================
# Registrar rutas
# ===============================================
# auth.router ya trae prefix="/auth" en routers/auth.py
app.include_router(auth.router)

# users.router se expone bajo /users
app.include_router(users.router, prefix="/users", tags=["Usuarios"])

# ===============================================
# Puente /nutriologos/validacion  →  /users/nutriologos/validacion
# ===============================================
VALIDATION_TARGET = "/users/nutriologos/validacion"

@app.api_route(
    "/nutriologos/validacion",
    methods=["GET", "POST", "DELETE"],
    include_in_schema=True,
    tags=["Validación Nutriólogo"],
)
async def nutri_validacion_bridge(request: Request):
    # 307 mantiene método y cuerpo (necesario para POST multipart/form-data)
    return RedirectResponse(url=VALIDATION_TARGET, status_code=307)

# ===============================================
# Root
# ===============================================
@app.get("/", tags=["Inicio"])
def root():
    return {
        "status": "OK",
        "message": "🚀 FitSo API funcionando correctamente",
        "version": "1.0.0",
    }

# Ejecuta: uvicorn main:app --reload --port 8000
