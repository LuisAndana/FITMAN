# services/pdf_generator.py

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
import os

def generar_pdf_dieta(dieta_id: int, nombre: str, contenido: str):
    # Crear carpeta si no existe
    ruta_dir = "pdfs"
    if not os.path.exists(ruta_dir):
        os.makedirs(ruta_dir)

    # Ruta final del archivo
    ruta_pdf = f"{ruta_dir}/dieta_{dieta_id}.pdf"

    # Estilos
    styles = getSampleStyleSheet()
    title_style = styles["Heading1"]
    text_style = styles["BodyText"]

    # Documento
    doc = SimpleDocTemplate(ruta_pdf, pagesize=letter)

    story = []

    # Título
    story.append(Paragraph(f"<b>{nombre}</b>", title_style))
    story.append(Spacer(1, 16))

    # Contenido formateado (respeta saltos de línea)
    for linea in contenido.split("\n"):
        story.append(Paragraph(linea, text_style))
        story.append(Spacer(1, 6))

    # Crear PDF
    doc.build(story)

    return ruta_pdf
