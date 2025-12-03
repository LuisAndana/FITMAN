"""
Backend/models/dieta.py
Modelo de Dieta con sistema completo de duración y vencimiento
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from config.database import Base
import enum


class EstadoDieta(enum.Enum):
    """Estados posibles de una dieta"""
    activa = "activa"
    vencida = "vencida"
    actualizada = "actualizada"
    pausada = "pausada"


class ObjetivoDieta(enum.Enum):
    """Objetivos posibles para una dieta"""
    perdida_grasa = "perdida_grasa"
    definicion = "definicion"
    volumen = "volumen"
    saludable = "saludable"
    aumentar_masa = "aumentar_masa"


class Dieta(Base):
    """
    Modelo para dietas personalizadas generadas por IA
    """
    __tablename__ = "dietas"

    # ✅ COLUMNAS BÁSICAS
    id_dieta = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"))
    nombre = Column(String(100))
    descripcion = Column(Text)
    objetivo = Column(Enum(ObjetivoDieta))
    calorias_totales = Column(Integer)
    fecha_creacion = Column(DateTime, default=datetime.now)

    # ✅ NUEVAS COLUMNAS - Sistema de Duración y Vencimiento
    dias_duracion = Column(Integer, default=30)  # Duración en días
    fecha_vencimiento = Column(DateTime, nullable=True)  # Fecha en que vence
    estado = Column(Enum(EstadoDieta), default=EstadoDieta.activa)  # Estado actual
    id_dieta_anterior = Column(Integer, nullable=True)  # Referencia a dieta anterior

    # ✅ ÍNDICES para búsquedas rápidas
    __table_args__ = (
        Index('idx_estado', 'estado'),
        Index('idx_fecha_vencimiento', 'fecha_vencimiento'),
        Index('idx_id_usuario_estado', 'id_usuario', 'estado'),
    )

    # ✅ RELACIONES
    usuario = relationship("Usuario", back_populates="dietas")
    recetas = relationship("Receta", back_populates="dieta", cascade="all, delete")

    def __init__(self, **kwargs):
        """
        Constructor personalizado para calcular fecha de vencimiento automáticamente
        """
        super().__init__(**kwargs)
        # Si no hay fecha_vencimiento, calcularla basado en fecha_creacion y dias_duracion
        if not self.fecha_vencimiento and self.fecha_creacion and self.dias_duracion:
            self.fecha_vencimiento = self.fecha_creacion + timedelta(days=self.dias_duracion)

    # ✅ MÉTODOS ÚTILES

    def esta_vencida(self) -> bool:
        """
        Verifica si la dieta ya venció

        Returns:
            bool: True si la dieta está vencida, False en caso contrario
        """
        if not self.fecha_vencimiento:
            return False
        return datetime.now() > self.fecha_vencimiento

    def dias_restantes(self) -> int:
        """
        Retorna los días restantes antes del vencimiento

        Returns:
            int: Número de días restantes (0 si vencida)
        """
        if not self.fecha_vencimiento:
            return self.dias_duracion

        diferencia = self.fecha_vencimiento - datetime.now()

        # Si es negativo, retornar 0
        if diferencia.total_seconds() < 0:
            return 0

        # Retornar días completos
        return diferencia.days

    def marcar_vencida(self):
        """
        Marca la dieta como vencida
        """
        self.estado = EstadoDieta.vencida

    def marcar_actualizada(self):
        """
        Marca la dieta como actualizada (reemplazada por una nueva)
        """
        self.estado = EstadoDieta.actualizada

    def marcar_pausada(self):
        """
        Marca la dieta como pausada
        """
        self.estado = EstadoDieta.pausada

    def reactivar(self):
        """
        Reactiva una dieta pausada
        """
        if self.estado == EstadoDieta.pausada:
            self.estado = EstadoDieta.activa

    # ✅ PROPIEDADES PARA ACCESO DIRECTO

    @property
    def esta_activa(self) -> bool:
        """Verifica si la dieta está activa y no vencida"""
        return self.estado == EstadoDieta.activa and not self.esta_vencida()

    @property
    def porcentaje_tiempo_transcurrido(self) -> float:
        """
        Retorna el porcentaje de tiempo transcurrido (0-100)

        Returns:
            float: Porcentaje (0 si acaba de crearse, 100 si vencida)
        """
        if not self.fecha_creacion or not self.fecha_vencimiento:
            return 0.0

        tiempo_total = (self.fecha_vencimiento - self.fecha_creacion).total_seconds()
        tiempo_transcurrido = (datetime.now() - self.fecha_creacion).total_seconds()

        if tiempo_total == 0:
            return 0.0

        porcentaje = (tiempo_transcurrido / tiempo_total) * 100
        return min(100.0, max(0.0, porcentaje))  # Limitar entre 0 y 100

    # ✅ REPRESENTACIÓN

    def __repr__(self) -> str:
        return f"<Dieta {self.id_dieta}: {self.nombre} ({self.estado.value})>"

    def __str__(self) -> str:
        estado_icon = {
            'activa': '✅',
            'vencida': '❌',
            'actualizada': '🔄',
            'pausada': '⏸️'
        }.get(self.estado.value, '❓')

        return f"{estado_icon} {self.nombre} ({self.dias_restantes} días)"

    # ✅ DICT PARA SERIALIZACIÓN

    def to_dict(self) -> dict:
        """
        Convierte el objeto a diccionario
        """
        return {
            'id_dieta': self.id_dieta,
            'id_usuario': self.id_usuario,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'objetivo': self.objetivo.value if self.objetivo else None,
            'calorias_totales': self.calorias_totales,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'dias_duracion': self.dias_duracion,
            'fecha_vencimiento': self.fecha_vencimiento.isoformat() if self.fecha_vencimiento else None,
            'estado': self.estado.value if self.estado else None,
            'id_dieta_anterior': self.id_dieta_anterior,
            'dias_restantes': self.dias_restantes(),
            'esta_vencida': self.esta_vencida(),
            'porcentaje_tiempo_transcurrido': self.porcentaje_tiempo_transcurrido
        }