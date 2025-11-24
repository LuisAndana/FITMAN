import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Obtener URL de la BD desde .env, con fallback
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:0405@127.0.0.1:3306/bd_fitso?charset=utf8mb4"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verificar conexión antes de usar
    pool_recycle=3600    # Reciclar conexiones cada hora
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependencia para obtener la sesión de BD en FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()