# main.py — FitSo Backend
# ===============================================
# Desarrollado con FastAPI
# Arquitectura modular con routers, modelos y servicios
# ACTUALIZADO: Autenticación consolidada en core/deps
# ===============================================

import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

# 🔹 CARGAR VARIABLES DE ENTORNO (IMPORTANTE!)
load_dotenv()

# 🔹 Verificar que Stripe está configurado correctamente
stripe_secret = os.getenv("STRIPE_SECRET_KEY", "").strip()
stripe_public = os.getenv("STRIPE_PUBLIC_KEY", "").strip()

print("\n" + "=" * 60)
print("🔹 VERIFICACIÓN DE CONFIGURACIÓN")
print("=" * 60)

# Verificar Stripe Secret Key
if not stripe_secret:
    print("❌ ERROR: STRIPE_SECRET_KEY no está configurada")
elif stripe_secret == "sk_test_*ummy" or "*ummy" in stripe_secret:
    print("❌ ERROR: STRIPE_SECRET_KEY sigue siendo dummy")
    print(f"   Valor actual: {stripe_secret[:20]}...")
else:
    print(f"✅ STRIPE_SECRET_KEY cargada: {stripe_secret[:30]}...")

# Verificar Stripe Public Key
if not stripe_public:
    print("❌ ERROR: STRIPE_PUBLIC_KEY no está configurada")
elif stripe_public == "pk_test_*ummy" or "*ummy" in stripe_public:
    print("❌ ERROR: STRIPE_PUBLIC_KEY sigue siendo dummy")
    print(f"   Valor actual: {stripe_public[:20]}...")
else:
    print(f"✅ STRIPE_PUBLIC_KEY cargada: {stripe_public[:30]}...")

# Verificar Database
db_url = os.getenv("DATABASE_URL", "").strip()
if not db_url:
    print("❌ ERROR: DATABASE_URL no está configurada")
elif "*ummy*" in db_url or "mysql://" not in db_url:
    print("❌ ERROR: DATABASE_URL parece incompleta")
else:
    print(f"✅ DATABASE_URL cargada correctamente")

# Verificar JWT
jwt_secret = os.getenv("SECRET_KEY", "").strip()
if not jwt_secret or jwt_secret == "tu_clave_secreta_super_segura_aqui":
    print("⚠️  WARNING: SECRET_KEY es la clave por defecto (cámbiala en producción)")
else:
    print(f"✅ SECRET_KEY configurada")

print("=" * 60 + "\n")

# 🔹 Configuración y base de datos
from config.database import Base, engine

# 🔹 Carga todos los modelos UNA sola vez (evita redefinir tablas)
import models  # <- usa models/__init__.py
from routers import users, auth, contratos, clientes, catalogo_router
# 🔹 ✅ NUEVO: Verificar que core/deps existe y funciona
try:
    from core.deps import get_current_user, get_db, create_access_token

    print("✅ core/deps.py importado correctamente")
    print("✅ get_current_user, get_db, create_access_token disponibles")
except ImportError as e:
    print(f"❌ ERROR importando core/deps: {e}")
    print("   ⚠️  ASEGÚRATE QUE:")
    print("   1. Backend/core/deps.py EXISTE")
    print("   2. Está actualizado con la solución")
    print("   3. core/security.py FUE ELIMINADO")
    raise

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
# ✅ auth.router: Se registra con /api para que las rutas sean /api/login, /api/register, /api/auth/validacion
app.include_router(auth.router, prefix="/api")

# ✅ users.router: Se registra como /api/users
# Endpoints: /api/users/me, /api/users/{id}, /api/users/nutriologos, etc.
app.include_router(users.router, prefix="/api/users")

# ✅ clientes.router: Ya tiene su prefijo /api/clientes
# Endpoints: /api/clientes/mis-clientes, /api/clientes/generar-dieta-ia, etc.
app.include_router(clientes.router)

# ✅ contratos.router: Se registra con /api
# Endpoints: /api/contratos/crear-payment-intent, etc.
app.include_router(contratos.router, prefix="/api")

# ✅ catalogo_router: Catálogos (enfermedades, etc.)
app.include_router(catalogo_router.router)

# ===============================================
# Puente /nutriologos/validacion → /users/nutriologos/validacion
# ===============================================
VALIDATION_TARGET = "/api/users/nutriologos/validacion"


@app.api_route(
    "/api/nutriologos/validacion",
    methods=["GET", "POST", "DELETE"],
    include_in_schema=True,
    tags=["Validación Nutriólogo"],
)
async def nutri_validacion_bridge(request: Request):
    """
    Puente que redirige /api/nutriologos/validacion
    a /api/users/nutriologos/validacion
    """
    return RedirectResponse(url=VALIDATION_TARGET, status_code=307)


# ===============================================
# Endpoints de salud y debug
# ===============================================
@app.get("/", tags=["Inicio"])
def root():
    """Endpoint raíz - verifica que la API está funcionando"""
    return {
        "status": "OK",
        "message": "🚀 FitSo API funcionando correctamente",
        "version": "1.0.0",
        "auth": "✅ Autenticación centralizada en core/deps.py",
    }


# ===============================================
# Middleware de debug
# ===============================================
@app.middleware("http")
async def debug_auth(request, call_next):
    """
    Middleware de debug: imprime el header Authorization
    Útil para verificar que el token se envía correctamente
    """
    auth_header = request.headers.get("authorization")
    if auth_header:
        token_preview = auth_header[:50] + "..." if len(auth_header) > 50 else auth_header
        print(f"🛰️  HEADER AUTH: {token_preview}")
    else:
        print(f"🛰️  HEADER AUTH: None")

    response = await call_next(request)
    return response


# ===============================================
# Información de inicio
# ===============================================
print("\n" + "=" * 60)
print("✅ FITMAN BACKEND LISTO")
print("=" * 60)
print("🔐 Autenticación: core/deps.py")
print("📁 Routers registrados:")
print("   ✅ /api/auth/* (login, register, validacion)")
print("   ✅ /api/users/* (me, perfil, nutriologos)")
print("   ✅ /api/clientes/* (mis-clientes, dietas)")
print("   ✅ /api/contratos/* (pagos, contratos)")
print("=" * 60 + "\n")

# Ejecuta: uvicorn main:app --reload --port 8000