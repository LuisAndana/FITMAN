"""
Modelo de Reseña/Calificación para Nutriólogos
Permite que clientes califiquen y comenten sobre su experiencia con un nutriólogo.
Solo clientes pueden crear reseñas. Las reseñas verificadas tienen un contrato asociado.
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean,
    CheckConstraint, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Resena(Base):
    """
    Reseña y calificación de un nutriólogo por parte de un cliente.

    Attributes:
        id_resena: ID único de la reseña (PK)
        id_cliente: ID del cliente que hace la reseña (FK a usuarios)
        id_nutriologo: ID del nutriólogo siendo calificado (FK a usuarios)
        id_contrato: ID del contrato asociado (FK a contratos, opcional)
        calificacion: Puntuación de 1 a 5 estrellas
        titulo: Título corto de la reseña (opcional)
        comentario: Texto completo de la reseña (opcional)
        verificado: True si el cliente tiene contrato con este nutriólogo
        creado_en: Timestamp de creación
        actualizado_en: Timestamp de última actualización
    """
    __tablename__ = "resenas"

    # ============ COLUMNAS PRINCIPALES ============

    id_resena = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Foreign Keys
    id_cliente = Column(
        Integer,
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    id_nutriologo = Column(
        Integer,
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    id_contrato = Column(
        Integer,
        ForeignKey("contratos.id_contrato", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # ============ DATOS DE CALIFICACIÓN ============

    calificacion = Column(
        Float,
        nullable=False,
        index=True,
        doc="Calificación de 1.0 a 5.0 estrellas"
    )
    titulo = Column(
        String(150),
        nullable=True,
        doc="Título corto de la reseña (máx 150 caracteres)"
    )
    comentario = Column(
        Text,
        nullable=True,
        doc="Texto completo de la reseña (máx 1000 caracteres)"
    )

    # ============ CONTROL Y METADATOS ============

    verificado = Column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
        doc="True si el cliente tiene contrato verificado con este nutriólogo"
    )
    creado_en = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )
    actualizado_en = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # ============ RELATIONSHIPS ============
    # Descomentar si tu modelo Usuario soporta relationships bidireccionales
    # cliente = relationship(
    #     "Usuario",
    #     foreign_keys=[id_cliente],
    #     backref="resenas_como_cliente",
    #     lazy="joined"
    # )
    # nutriologo = relationship(
    #     "Usuario",
    #     foreign_keys=[id_nutriologo],
    #     backref="resenas_recibidas",
    #     lazy="joined"
    # )
    # contrato = relationship(
    #     "Contrato",
    #     foreign_keys=[id_contrato],
    #     lazy="joined"
    # )

    # ============ CONSTRAINTS ============

    __table_args__ = (
        # Solo un cliente puede reseñar una vez al mismo nutriólogo
        UniqueConstraint(
            'id_cliente', 'id_nutriologo',
            name='unique_cliente_nutriologo_resena'
        ),
        # Calificación debe estar entre 1 y 5
        CheckConstraint(
            'calificacion >= 1.0 AND calificacion <= 5.0',
            name='check_calificacion_rango'
        ),
        # Si tiene contrato, debe estar verificado
        CheckConstraint(
            'id_contrato IS NULL OR verificado = TRUE',
            name='check_contrato_verificado'
        ),
        # Indices compuestos para búsquedas comunes
        Index('idx_nutriologo_verificado', 'id_nutriologo', 'verificado'),
        Index('idx_cliente_nutriologo', 'id_cliente', 'id_nutriologo'),
        Index('idx_creado_en_desc', 'creado_en'),  # Para ordenar por fecha
    )

    # ============ MÉTODOS ============

    def __repr__(self):
        """Representación en string para debugging"""
        return (
            f"<Resena id={self.id_resena} "
            f"cliente={self.id_cliente} "
            f"nutriologo={self.id_nutriologo} "
            f"calificacion={self.calificacion}⭐>"
        )

    def to_dict(self):
        """Convierte el modelo a diccionario"""
        return {
            "id_resena": self.id_resena,
            "id_cliente": self.id_cliente,
            "id_nutriologo": self.id_nutriologo,
            "id_contrato": self.id_contrato,
            "calificacion": self.calificacion,
            "titulo": self.titulo,
            "comentario": self.comentario,
            "verificado": self.verificado,
            "creado_en": self.creado_en.isoformat() if self.creado_en else None,
            "actualizado_en": self.actualizado_en.isoformat() if self.actualizado_en else None,
        }

    def to_dict_public(self):
        """Retorna datos públicos sin info sensible"""
        return {
            "id_resena": self.id_resena,
            "id_nutriologo": self.id_nutriologo,
            "calificacion": self.calificacion,
            "titulo": self.titulo,
            "comentario": self.comentario,
            "verificado": self.verificado,
            "creado_en": self.creado_en.isoformat() if self.creado_en else None,
        }

    @property
    def estrellas_display(self) -> str:
        """Retorna la calificación como texto visual"""
        estrellas = int(self.calificacion)
        media_estrella = "½" if (self.calificacion % 1) >= 0.5 else ""
        return "⭐" * estrellas + media_estrella

    def actualizar(self, **kwargs):
        """Actualiza campos específicos del modelo"""
        campos_permitidos = ['calificacion', 'titulo', 'comentario']
        for campo, valor in kwargs.items():
            if campo in campos_permitidos and valor is not None:
                setattr(self, campo, valor)
        self.actualizado_en = datetime.utcnow()