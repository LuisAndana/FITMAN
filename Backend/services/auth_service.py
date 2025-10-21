from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt

# ==========================
# Configuración de seguridad
# ==========================

SECRET_KEY = "fitso_super_secret_key"  # 🔒 Cambia esto en producción
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==========================
# Funciones de autenticación
# ==========================

# 🔹 Hashear contraseñas
def hash_password(password: str):
    return pwd_context.hash(password)

# 🔹 Verificar contraseñas
def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

# 🔹 Crear token JWT
def create_access_token(data: dict):
    """
    Genera un token JWT con fecha de expiración.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
