import json
from typing import List, Dict, Any
import anthropic
import os


class DietaIAService:
    """
    Servicio para generar dietas personalizadas usando Claude AI
    """

    def __init__(self):
        # Obtener API key desde variables de entorno
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY no está configurada en las variables de entorno")

        self.client = anthropic.Anthropic(api_key=self.api_key)

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
        """

        # Calcular IMC
        imc = peso / (altura ** 2)

        # Construir el prompt para Claude
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
            # Llamar a la API de Claude
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                temperature=0.7,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            # Extraer la respuesta
            response_text = message.content[0].text

            # Parsear el JSON de respuesta
            dieta_data = self._parsear_respuesta(response_text)

            return dieta_data

        except Exception as e:
            print(f"Error al generar dieta con IA: {str(e)}")
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
        Parsea la respuesta de Claude eliminando posibles marcadores de markdown
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
            print(f"Error al parsear JSON: {str(e)}")
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
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text
            data = self._parsear_respuesta(response_text)

            return data.get("recomendaciones", [])

        except Exception as e:
            print(f"Error al generar recomendaciones: {str(e)}")
            return [
                "Continúa con tu plan nutricional actual",
                "Mantén una hidratación adecuada",
                "Registra tu progreso semanalmente"
            ]