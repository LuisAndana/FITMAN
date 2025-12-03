import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dieta } from '../../services/dieta.service';

@Component({
  selector: 'app-dieta-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dieta-detalle.component.html',
  styleUrls: ['./dieta-detalle.component.css']
})
export class DietaDetalleComponent implements OnInit {
  @Input() dieta: Dieta | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() descargarPDF = new EventEmitter<Dieta>();

  contenidoParsado: any = null;
  mostrando: 'info' | 'plan' | 'recomendaciones' = 'info';
  descargando = false;

  ngOnInit(): void {
    if (this.dieta) {
      this.parsearContenido();
    }
  }

  /**
   * Parsea el contenido de texto de la dieta
   * Busca patrones como "DÍA 1", "DESAYUNO", etc.
   */
  parsearContenido(): void {
    if (!this.dieta?.contenido) return;

    const contenido = this.dieta.contenido;
    
    // Buscar patrones de días
    const patronDias = /###?\s*\*?\*?DÍA\s+(\d+)\*?\*?/gi;
    const patronComida = /\*?\*?(DESAYUNO|ALMUERZO|MERIENDA|CENA|COMIDA)\s*\(Aprox\.\s+([\d]+)\s+kcal\)\*?\*?/gi;
    
    // Si encontramos estructura de dieta, parsear
    if (patronDias.test(contenido)) {
      this.parsearDietas();
    } else if (contenido.includes('RECOMENDACIONES')) {
      // Si tiene sección de recomendaciones
      this.contenidoParsado = {
        texto_completo: contenido,
        tiene_estructura: false
      };
    } else {
      // Texto simple
      this.contenidoParsado = {
        texto_completo: contenido,
        tiene_estructura: false
      };
    }
  }

  /**
   * Parsea el contenido estructurado de dietas por días
   */
  parsearDietas(): void {
    if (!this.dieta?.contenido) return;

    const contenido = this.dieta.contenido;
    const dias: any[] = [];

    // Dividir por días
    const patronDia = /###?\s*\*?\*?DÍA\s+(\d+)\*?\*?/gi;
    const partes = contenido.split(patronDia);

    for (let i = 1; i < partes.length; i += 2) {
      const numeroDia = partes[i];
      const contenidoDia = partes[i + 1];

      const comidas: any = {};

      // Extraer comidas
      const tiposComida = ['DESAYUNO', 'ALMUERZO', 'MERIENDA', 'CENA', 'COMIDA'];
      
      tiposComida.forEach(tipo => {
        const patronComida = new RegExp(
          `\\*?\\*?${tipo}\\s*\\(Aprox\\.\\s+(\\d+)\\s+kcal\\)\\*?\\*?[\\s\\S]*?(?=\\*?\\*?(?:DESAYUNO|ALMUERZO|MERIENDA|CENA|COMIDA|DÍA|Recomendaciones|$))`,
          'i'
        );

        const match = contenidoDia.match(patronComida);
        if (match) {
          const texto = match[0];
          const kcal = match[1];
          
          // Extraer items (líneas con * o -)
          const items = texto
            .split('\n')
            .filter(l => l.trim().match(/^[\*\-]/))
            .map(l => l.replace(/^[\*\-]\s*/, '').trim())
            .filter(l => l.length > 0);

          comidas[tipo.toLowerCase()] = {
            kcal,
            items
          };
        }
      });

      if (Object.keys(comidas).length > 0) {
        dias.push({
          numero: parseInt(numeroDia),
          comidas
        });
      }
    }

    if (dias.length > 0) {
      this.contenidoParsado = {
        dias,
        tiene_estructura: true,
        texto_completo: contenido
      };
    } else {
      // Si no logra parsear, mostrar texto completo
      this.contenidoParsado = {
        texto_completo: contenido,
        tiene_estructura: false
      };
    }
  }

  /**
   * Formatea el objetivo con emoji
   */
  formatearObjetivo(objetivo: string): string {
    const objetivos: { [key: string]: string } = {
      'bajar_peso': '📉 Bajar de peso',
      'mantener': '⚖️ Mantener peso',
      'aumentar_masa': '💪 Aumentar masa muscular',
      'definicion': '✨ Definición',
      'volumen': '🏋️ Volumen',
      'saludable': '🥗 Plan saludable',
      'perdida_grasa': '🔥 Pérdida de grasa'
    };
    return objetivos[objetivo] || objetivo;
  }

  /**
   * Formatea fecha
   */
  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Cambia la vista de contenido
   */
  cambiarVista(vista: 'info' | 'plan' | 'recomendaciones'): void {
    this.mostrando = vista;
  }

  /**
   * Emite evento para descargar PDF
   */
  descargarPDFDieta(): void {
    if (this.dieta) {
      this.descargando = true;
      this.descargarPDF.emit(this.dieta);
    }
  }

  /**
   * Cierra el modal
   */
  cerrarModal(): void {
    this.cerrar.emit();
  }
}