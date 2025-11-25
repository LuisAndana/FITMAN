import os
import stripe
from typing import Dict, Optional, Tuple
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from models.contrato import Contrato, EstadoContrato
from models.user import Usuario, TipoUsuarioEnum  # 🔥 Importante


stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_dummy")


class StripeService:
    """Servicio para manejar pagos con Stripe"""

    @staticmethod
    def crear_payment_intent(
            db: Session,
            id_cliente: int,
            id_nutriologo: int,
            monto: float,
            duracion_meses: int = 1,
            descripcion_servicios: Optional[str] = None
    ) -> Tuple[bool, Dict]:
        """
        Crea un PaymentIntent en Stripe y un registro de contrato pendiente.
        """
        try:
            # ✅ Validar que el nutriólogo existe y ES nutriólogo
            from models.user import Usuario, TipoUsuarioEnum

            nutriologo = db.query(Usuario).filter(
                Usuario.id_usuario == id_nutriologo,
                Usuario.tipo_usuario == TipoUsuarioEnum.nutriologo
            ).first()

            if not nutriologo:
                return False, {"error": "Nutriólogo no encontrado o inválido"}

            # Crear contrato pendiente
            contrato = Contrato(
                id_cliente=id_cliente,
                id_nutriologo=id_nutriologo,
                monto=monto,
                duracion_meses=duracion_meses,
                descripcion_servicios=descripcion_servicios,
                estado=EstadoContrato.PENDIENTE
            )
            db.add(contrato)
            db.flush()  # obtiene ID sin commit

            # Crear PaymentIntent en Stripe
            payment_intent = stripe.PaymentIntent.create(
                amount=int(monto * 100),
                currency="usd",
                payment_method_types=["card"],
                metadata={
                    "contrato_id": contrato.id_contrato,
                    "id_cliente": id_cliente,
                    "id_nutriologo": id_nutriologo,
                    "duracion_meses": duracion_meses
                },
                description=f"Contrato con nutriólogo {nutriologo.nombre}"
            )

            # Guardar payment_intent_id
            contrato.stripe_payment_intent_id = payment_intent.id
            db.commit()

            return True, {
                "contrato_id": contrato.id_contrato,
                "client_secret": payment_intent.client_secret,
                "payment_intent_id": payment_intent.id,
                "monto": monto,
                "nutriologo_nombre": nutriologo.nombre
            }

        except stripe.error.StripeError as e:
            db.rollback()
            return False, {"error": f"Error de Stripe: {str(e)}"}
        except Exception as e:
            db.rollback()
            return False, {"error": f"Error al crear el contrato: {str(e)}"}

    @staticmethod
    def confirmar_pago(
            db: Session,
            payment_intent_id: str
    ) -> Tuple[bool, Dict]:
        """
        Confirma que el pago fue exitoso y activa el contrato.
        """
        try:
            # Obtener PaymentIntent desde Stripe
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)

            # Buscar contrato
            contrato = db.query(Contrato).filter(
                Contrato.stripe_payment_intent_id == payment_intent_id
            ).first()

            if not contrato:
                return False, {"error": "Contrato no encontrado"}

            # Verificar que el pago fue exitoso
            if payment_intent.status != "succeeded":
                return False, {"error": f"Pago incompleto (Estado: {payment_intent.status})"}

            # Activar contrato
            ahora = datetime.utcnow()
            contrato.estado = EstadoContrato.ACTIVO
            contrato.fecha_inicio = ahora
            contrato.fecha_fin = ahora + timedelta(days=30 * contrato.duracion_meses)
            contrato.validado = True

            db.commit()

            return True, {
                "contrato_id": contrato.id_contrato,
                "mensaje": "Pago confirmado. Contrato activado.",
                "fecha_inicio": contrato.fecha_inicio.isoformat(),
                "fecha_fin": contrato.fecha_fin.isoformat()
            }

        except stripe.error.StripeError as e:
            return False, {"error": f"Error de Stripe: {str(e)}"}
        except Exception as e:
            return False, {"error": f"Error al confirmar pago: {str(e)}"}

    @staticmethod
    def obtener_contrato(db: Session, contrato_id: int) -> Optional[Dict]:
        """Obtiene un contrato por ID"""
        contrato = db.query(Contrato).filter(
            Contrato.id_contrato == contrato_id
        ).first()

        if not contrato:
            return None

        return {
            "id_contrato": contrato.id_contrato,
            "id_cliente": contrato.id_cliente,
            "id_nutriologo": contrato.id_nutriologo,
            "monto": contrato.monto,
            "estado": contrato.estado.value,
            "duracion_meses": contrato.duracion_meses,
            "fecha_creacion": contrato.fecha_creacion.isoformat(),
            "fecha_inicio": contrato.fecha_inicio.isoformat() if contrato.fecha_inicio else None,
            "fecha_fin": contrato.fecha_fin.isoformat() if contrato.fecha_fin else None,
        }

    @staticmethod
    def listar_contratos_cliente(db: Session, id_cliente: int):
        """Lista todos los contratos de un cliente"""
        contratos = db.query(Contrato).filter(
            Contrato.id_cliente == id_cliente
        ).all()

        return [
            {
                "id_contrato": c.id_contrato,
                "nutriologo_nombre": c.nutriologo.nombre,
                "monto": c.monto,
                "estado": c.estado.value,
                "fecha_inicio": c.fecha_inicio.isoformat() if c.fecha_inicio else None,
                "fecha_fin": c.fecha_fin.isoformat() if c.fecha_fin else None,
            }
            for c in contratos
        ]
