import json
from typing import List, Dict, Any
import google.generativeai as genai
import os
from dotenv import load_dotenv
import logging

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from models.dieta import Dieta, EstadoDieta, ObjetivoDieta
from models.user import Usuario
import logging

# Cargar variables de entorno
load_dotenv()

# Configurar logging
logger = logging.getLogger("DietaIAService")


class DietaIAService:
    """
    Servicio para generar dietas personalizadas usando Google Gemini 2.5 AI
    """

    def __init__(self):
        # Obtener API key desde variables de entorno
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY no está configurada en las variables de entorno")

        # Obtener modelo desde .env (default: gemini-2.5-flash)
        self.model_id = os.getenv("GEMINI_MODEL_ID", "models/gemini-2.5-flash")
        self.max_output_tokens = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "8192"))

        # Configurar Google Gemini
        genai.configure(api_key=self.api_key)

        try:
            self.model = genai.GenerativeModel(self.model_id)
            print(f"✅ Google Gemini 2.5 configurada correctamente")
            print(f"   Modelo: {self.model_id}")
            print(f"   Max tokens: {self.max_output_tokens}")
        except Exception as e:
            print(f"❌ Error al configurar Gemini: {str(e)}")
            raise

    def generar_dieta_personalizada(
            self,
            nombre_cliente: str,
            edad: int,
            peso: float,
            altura: float,
            objetivo: str,
            enfermedades: List[str],
            descripcion_medica: str,
            restricciones_alimentarias: List[str] = None,
            preferencias: str = None,
            duracion_semanas: int = 4
    ) -> Dict[str, Any]:
        """
        Genera una dieta personalizada basada en las características del cliente
        usando Google Gemini 2.5 API
        """

        # Calcular IMC
        imc = peso / (altura ** 2)

        # Construir el prompt para Gemini
        prompt = self._construir_prompt(
            nombre_cliente=nombre_cliente,
            edad=edad,
            peso=peso,
            altura=altura,
            imc=imc,
            objetivo=objetivo,
            enfermedades=enfermedades,
            descripcion_medica=descripcion_medica,
            restricciones_alimentarias=restricciones_alimentarias or [],
            preferencias=preferencias or "",
            duracion_semanas=duracion_semanas
        )

        try:
            print(f"🤖 Generando dieta para {nombre_cliente} con Gemini 2.5...")

            # Llamar a la API de Google Gemini 2.5
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=self.max_output_tokens,
                    candidate_count=1,
                )
            )

            # Extraer la respuesta
            response_text = response.text
            print(f"✅ Respuesta recibida ({len(response_text)} caracteres)")

            # Parsear el JSON de respuesta
            dieta_data = self._parsear_respuesta(response_text)

            return dieta_data

        except Exception as e:
            print(f"❌ Error al generar dieta con IA: {str(e)}")
            raise

    def _construir_prompt(
            self,
            nombre_cliente: str,
            edad: int,
            peso: float,
            altura: float,
            imc: float,
            objetivo: str,
            enfermedades: List[str],
            descripcion_medica: str,
            restricciones_alimentarias: List[str],
            preferencias: str,
            duracion_semanas: int
    ) -> str:
        """
        Construye el prompt para la generación de dieta
        """

        prompt = f"""Como nutriólogo experto, crea un plan de dieta personalizado detallado para el siguiente paciente:

**INFORMACIÓN DEL PACIENTE:**
- Nombre: {nombre_cliente}
- Edad: {edad} años
- Peso actual: {peso} kg
- Altura: {altura} m
- IMC: {imc:.2f}
- Objetivo: {objetivo}
"""

        if enfermedades:
            prompt += f"- Enfermedades/Condiciones: {', '.join(enfermedades)}\n"

        if descripcion_medica:
            prompt += f"- Descripción médica adicional: {descripcion_medica}\n"

        if restricciones_alimentarias:
            prompt += f"- Restricciones alimentarias: {', '.join(restricciones_alimentarias)}\n"

        if preferencias:
            prompt += f"- Preferencias del paciente: {preferencias}\n"

        prompt += f"\n**DURACIÓN DEL PLAN:** {duracion_semanas} semanas\n"

        prompt += """
**INSTRUCCIONES:**
Genera un plan de dieta completo que incluya:

1. **Información General:**
   - Nombre descriptivo del plan
   - Descripción general
   - Objetivo nutricional específico (perdida_grasa, definicion, volumen, o saludable)
   - Calorías totales diarias recomendadas

2. **Recetas (mínimo 15 recetas variadas):**
   Para cada receta incluye:
   - Nombre
   - Descripción breve
   - Calorías por porción
   - Tiempo de preparación (en minutos)
   - Lista detallada de ingredientes con cantidad y unidad
   - Instrucciones paso a paso

3. **Distribución Semanal:**
   Un plan de 7 días con:
   - Desayuno
   - Comida
   - Cena
   - Snack

   Asigna las recetas a diferentes comidas y días de manera balanceada.

4. **Recomendaciones:**
   - Consejos nutricionales personalizados
   - Consideraciones especiales basadas en las condiciones del paciente
   - Sugerencias de hidratación y suplementos si son necesarios

**FORMATO DE RESPUESTA:**
Responde ÚNICAMENTE con un objeto JSON válido siguiendo esta estructura exacta:

{
  "nombre": "Nombre del Plan de Dieta",
  "descripcion": "Descripción general del plan",
  "objetivo": "perdida_grasa | definicion | volumen | saludable",
  "calorias_totales": 2000,
  "recetas": [
    {
      "nombre": "Nombre de la Receta",
      "descripcion": "Descripción de la receta",
      "calorias": 350,
      "tiempo_preparacion": 20,
      "ingredientes": [
        {
          "nombre": "Ingrediente 1",
          "cantidad": "100",
          "unidad": "g"
        }
      ],
      "instrucciones": [
        "Paso 1",
        "Paso 2"
      ]
    }
  ],
  "distribucion_semanal": {
    "lunes": {
      "desayuno": "Nombre de receta",
      "comida": "Nombre de receta",
      "cena": "Nombre de receta",
      "snack": "Nombre de receta"
    }
  },
  "recomendaciones": [
    "Recomendación 1",
    "Recomendación 2"
  ]
}

IMPORTANTE: 
- Responde SOLO con el JSON, sin texto adicional antes ni después
- NO uses bloques de código markdown (```json)
- Asegúrate de que el JSON sea válido y parseable
- Todos los nombres de recetas en la distribución semanal deben existir en el array de recetas
"""

        return prompt

    def _parsear_respuesta(self, response_text: str) -> Dict[str, Any]:
        """
        Parsea la respuesta de Gemini eliminando posibles marcadores de markdown
        """
        # Limpiar el texto de posibles marcadores de código
        cleaned_text = response_text.strip()

        # Eliminar bloques de código markdown si existen
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[3:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]

        cleaned_text = cleaned_text.strip()

        # Parsear JSON
        try:
            dieta_data = json.loads(cleaned_text)
            return dieta_data
        except json.JSONDecodeError as e:
            print(f"❌ Error al parsear JSON: {str(e)}")
            print(f"Texto recibido: {cleaned_text[:500]}...")
            raise ValueError("La respuesta de la IA no está en formato JSON válido")

    def generar_recomendaciones_progreso(
            self,
            nombre_cliente: str,
            peso_inicial: float,
            peso_actual: float,
            objetivo: str,
            semanas_transcurridas: int
    ) -> List[str]:
        """
        Genera recomendaciones basadas en el progreso del cliente
        usando Google Gemini 2.5
        """

        diferencia_peso = peso_actual - peso_inicial
        porcentaje_cambio = (diferencia_peso / peso_inicial) * 100

        prompt = f"""Como nutriólogo, analiza el progreso del paciente {nombre_cliente}:

- Peso inicial: {peso_inicial} kg
- Peso actual: {peso_actual} kg
- Cambio: {diferencia_peso:+.2f} kg ({porcentaje_cambio:+.2f}%)
- Objetivo: {objetivo}
- Semanas transcurridas: {semanas_transcurridas}

Proporciona 5 recomendaciones específicas y accionables para el paciente.

Responde SOLO con un JSON con este formato:
{{
  "recomendaciones": [
    "Recomendación 1",
    "Recomendación 2",
    "Recomendación 3",
    "Recomendación 4",
    "Recomendación 5"
  ]
}}

NO agregues texto adicional, SOLO el JSON.
"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=1000,
                )
            )

            response_text = response.text
            data = self._parsear_respuesta(response_text)

            return data.get("recomendaciones", [])

        except Exception as e:
            print(f"❌ Error al generar recomendaciones: {str(e)}")
            return [
                "Continúa con tu plan nutricional actual",
                "Mantén una hidratación adecuada",
                "Registra tu progreso semanalmente",
                "Realiza actividad física regularmente",
                "Descansa adecuadamente cada noche"
            ]

logger = logging.getLogger("DietaService")


class DietaService:
    """
    Servicio para manejar operaciones de dietas
    """

    @staticmethod
    def crear_dieta(
        db: Session,
        id_usuario: int,
        nombre: str,
        descripcion: str,
        objetivo: str,
        calorias_totales: int,
        dias_duracion: int = 30
    ) -> Dieta:
        """
        Crea una nueva dieta
        """
        logger.info(f"📝 Creando dieta para usuario {id_usuario}")

        # Convertir objetivo a enum
        try:
            objetivo_enum = ObjetivoDieta[objetivo]
        except KeyError:
            objetivo_enum = ObjetivoDieta.saludable

        # Calcular fecha de vencimiento
        fecha_creacion = datetime.now()
        fecha_vencimiento = fecha_creacion + timedelta(days=dias_duracion)

        nueva_dieta = Dieta(
            id_usuario=id_usuario,
            nombre=nombre,
            descripcion=descripcion,
            objetivo=objetivo_enum,
            calorias_totales=calorias_totales,
            fecha_creacion=fecha_creacion,
            dias_duracion=dias_duracion,
            fecha_vencimiento=fecha_vencimiento,
            estado=EstadoDieta.activa
        )

        db.add(nueva_dieta)
        db.commit()
        db.refresh(nueva_dieta)

        logger.info(f"✅ Dieta creada: ID={nueva_dieta.id_dieta}, Vence: {fecha_vencimiento}")
        return nueva_dieta

    @staticmethod
    def obtener_dieta_activa(db: Session, id_usuario: int) -> Optional[Dieta]:
        """
        Obtiene la dieta activa de un usuario
        """
        dieta = db.query(Dieta).filter(
            Dieta.id_usuario == id_usuario,
            Dieta.estado == EstadoDieta.activa
        ).order_by(Dieta.fecha_creacion.desc()).first()

        if dieta and dieta.esta_vencida():
            logger.warning(f"⚠️ Dieta {dieta.id_dieta} está vencida pero sigue como activa")
            dieta.marcar_vencida()
            db.commit()
            return None

        return dieta

    @staticmethod
    def obtener_dietas_vencidas(db: Session, id_usuario: int) -> List[Dieta]:
        """
        Obtiene todas las dietas vencidas de un usuario
        """
        dietas = db.query(Dieta).filter(
            Dieta.id_usuario == id_usuario,
            Dieta.estado.in_([EstadoDieta.vencida, EstadoDieta.actualizada])
        ).all()

        return dietas

    @staticmethod
    def verificar_y_actualizar_vencimientos(db: Session, id_usuario: int) -> List[Dieta]:
        """
        Verifica si hay dietas vencidas y las marca como vencidas
        """
        logger.info(f"🔍 Verificando vencimientos para usuario {id_usuario}")

        dietas_activas = db.query(Dieta).filter(
            Dieta.id_usuario == id_usuario,
            Dieta.estado == EstadoDieta.activa
        ).all()

        vencidas = []
        for dieta in dietas_activas:
            if dieta.esta_vencida():
                logger.warning(f"⏰ Dieta {dieta.id_dieta} ha vencido")
                dieta.marcar_vencida()
                vencidas.append(dieta)

        if vencidas:
            db.commit()
            logger.info(f"✅ {len(vencidas)} dietas marcadas como vencidas")

        return vencidas

    @staticmethod
    def crear_nueva_dieta_desde_vencida(
        db: Session,
        id_dieta_anterior: int,
        nombre_nueva: str,
        descripcion_nueva: str,
        calorias_nuevas: int,
        dias_duracion: int = 30
    ) -> Dieta:
        """
        Crea una nueva dieta basada en una anterior que vencio
        """
        logger.info(f"🔄 Creando nueva dieta basada en {id_dieta_anterior}")

        # Obtener dieta anterior
        dieta_anterior = db.query(Dieta).filter(Dieta.id_dieta == id_dieta_anterior).first()
        if not dieta_anterior:
            raise ValueError(f"Dieta {id_dieta_anterior} no encontrada")

        # Crear nueva dieta
        nueva_dieta = Dieta(
            id_usuario=dieta_anterior.id_usuario,
            nombre=nombre_nueva,
            descripcion=descripcion_nueva,
            objetivo=dieta_anterior.objetivo,
            calorias_totales=calorias_nuevas,
            fecha_creacion=datetime.now(),
            dias_duracion=dias_duracion,
            fecha_vencimiento=datetime.now() + timedelta(days=dias_duracion),
            estado=EstadoDieta.activa,
            id_dieta_anterior=id_dieta_anterior
        )

        db.add(nueva_dieta)
        db.commit()
        db.refresh(nueva_dieta)

        # Marcar anterior como actualizada
        dieta_anterior.marcar_actualizada()
        db.commit()

        logger.info(f"✅ Nueva dieta creada: {nueva_dieta.id_dieta}")
        return nueva_dieta

    @staticmethod
    def obtener_info_dietas(db: Session, id_usuario: int) -> dict:
        """
        Obtiene información completa de dietas del usuario
        """
        dietas_activas = db.query(Dieta).filter(
            Dieta.id_usuario == id_usuario,
            Dieta.estado == EstadoDieta.activa
        ).all()

        dietas_vencidas = db.query(Dieta).filter(
            Dieta.id_usuario == id_usuario,
            Dieta.estado.in_([EstadoDieta.vencida, EstadoDieta.actualizada])
        ).all()

        proxima_vencimiento = None
        if dietas_activas:
            proxima = min(dietas_activas, key=lambda d: d.fecha_vencimiento or datetime.max)
            proxima_vencimiento = proxima.fecha_vencimiento

        return {
            "dietas_activas": len(dietas_activas),
            "dietas_vencidas": len(dietas_vencidas),
            "proxima_vencimiento": proxima_vencimiento,
            "dietas_activas_list": dietas_activas
        }

    @staticmethod
    def generar_reporte_vencimientos(db: Session) -> List[dict]:
        """
        Genera reporte de todas las dietas que vencerán en los próximos 7 días
        """
        logger.info("📊 Generando reporte de vencimientos")

        fecha_hoy = datetime.now()
        fecha_una_semana = fecha_hoy + timedelta(days=7)

        dietas_proximas = db.query(Dieta).filter(
            Dieta.estado == EstadoDieta.activa,
            Dieta.fecha_vencimiento >= fecha_hoy,
            Dieta.fecha_vencimiento <= fecha_una_semana
        ).all()

        reporte = []
        for dieta in dietas_proximas:
            usuario = db.query(Usuario).filter(Usuario.id_usuario == dieta.id_usuario).first()
            dias_restantes = dieta.dias_restantes()

            reporte.append({
                "id_dieta": dieta.id_dieta,
                "nombre_dieta": dieta.nombre,
                "usuario": usuario.nombre if usuario else "Desconocido",
                "correo": usuario.correo if usuario else "N/A",
                "dias_restantes": dias_restantes,
                "fecha_vencimiento": dieta.fecha_vencimiento,
                "accion": "⚠️ Recordatorio de renovación próxima" if dias_restantes <= 3 else "ℹ️ Próximo vencimiento"
            })

        logger.info(f"✅ Reporte generado: {len(reporte)} dietas próximas a vencer")
        return reporte




































