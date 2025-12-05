import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DietaService, Dieta, EstadoDietas } from '../../services/dieta.service';
import { DietaDetalleComponent } from '../../pages/dieta-detalle/dieta-detalle.component';
import { ModalCalendarioComponent } from '../../pages/dieta-calendario/dieta-calendario.component';
import { FiltroDietasService } from '../../services/filtro-dietas.service';



@Component({
  selector: 'app-dietas-cliente',
  standalone: true,
  imports: [CommonModule, RouterModule, DietaDetalleComponent, ModalCalendarioComponent],
  templateUrl: './dietas-cliente.component.html',
  styleUrls: ['./dietas-cliente.component.css']
})
export class DietasClienteComponent implements OnInit {
  private dietaService = inject(DietaService);
  private filtroDietas = inject(FiltroDietasService);


  filtro: 'dia' | 'semana' | 'mes' = 'mes';
  fechaFiltro = new Date();
  fechaSeleccionadaCalendario: Date | null = null; // 🆕 NUEVA
  dietasFiltradas: Dieta[] = [];

  dietas: Dieta[] = [];
  dietasDisponibles: Dieta[] = [];
  dietaSeleccionada: Dieta | null = null;
  cargando = true;
  error = '';
  descargandoPDF = false;
  
  // Variables para modal detalle
  mostrarDetalleDieta = false;
  
  // Variable para modal del calendario
  mostrarCalendario = false;
  
  // Estadísticas
  dietasActivas = 0;
  dietasVencidas = 0;
  proxima_vencimiento: string | null = null;

  ngOnInit(): void {
    this.cargarDietas();
    this.obtenerEstadoDietas();
  }

  /**
   * 🔥 MÉTODO PRINCIPAL: Carga dietas y filtra por disponibilidad
   */
  cargarDietas(): void {
    this.cargando = true;
    this.error = '';

    this.dietaService.obtenerDietasAsignadas().subscribe({
      next: (dietas: Dieta[]) => {
        console.log('✅ Todas las dietas cargadas:', dietas);
        
        this.dietas = Array.isArray(dietas) ? dietas : [];
        
        // 🆕 FILTRAR por disponibilidad en la fecha actual O seleccionada
        this.filtrarDietasDisponibles();

        this.cargando = false;
      },
      error: (err: any) => {
        console.error('❌ Error al cargar dietas:', err);
        this.error = 'No pudimos cargar tus dietas. Intenta de nuevo.';
        this.cargando = false;
      }
    });
  }

  /**
   * 🆕 MÉTODO: Filtra dietas disponibles según fecha seleccionada o hoy
   * Se usa la fecha del calendario si está seleccionada
   */
  private filtrarDietasDisponibles(): void {
    // 🆕 USAR: Si hay fecha seleccionada en calendario, usar esa. Si no, usar hoy
    const fechaValidar = this.fechaSeleccionadaCalendario || new Date();
    const hoy = new Date(fechaValidar);
    hoy.setHours(0, 0, 0, 0);

    this.dietasDisponibles = this.dietas.filter(dieta => {
      return this.esDietaDisponibleEnFecha(dieta, hoy);
    });

    console.log(`📅 Dietas disponibles en ${hoy.toLocaleDateString('es-ES')}: ${this.dietasDisponibles.length} de ${this.dietas.length}`);
    
    // Aplicar filtro de rango (día/semana/mes) SOLO a dietas disponibles
    this.aplicarFiltro();
  }

  /**
   * 🆕 NUEVO MÉTODO: Valida si una dieta está disponible en una fecha específica
   */
  private esDietaDisponibleEnFecha(dieta: Dieta, fecha: Date): boolean {
    const fechaValidar = new Date(fecha);
    fechaValidar.setHours(0, 0, 0, 0);

    // Fecha de creación de la dieta
    const fechaCreacion = new Date(dieta.fecha_creacion);
    fechaCreacion.setHours(0, 0, 0, 0);

    // Calcular fecha de vencimiento
    let fechaVencimiento = new Date(dieta.fecha_creacion);
    if (dieta.dias_duracion) {
      fechaVencimiento.setDate(
        fechaVencimiento.getDate() + dieta.dias_duracion
      );
    } else {
      // Si no tiene duración, asumir 30 días
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
    }
    fechaVencimiento.setHours(23, 59, 59, 999);

    // ✅ Retornar true solo si está en rango válido
    const disponible = fechaValidar >= fechaCreacion && fechaValidar <= fechaVencimiento;
    
    return disponible;
  }

  obtenerEstadoDietas(): void {
    this.dietaService.obtenerEstadoDietas().subscribe({
      next: (estado: EstadoDietas) => {
        console.log('📊 Estado de dietas:', estado);
        this.dietasActivas = estado.dietas_activas;
        this.dietasVencidas = estado.dietas_vencidas;
        this.proxima_vencimiento = estado.proxima_vencimiento || null;
      },
      error: (err: any) => {
        console.warn('⚠️ Error al obtener estado:', err);
      }
    });
  }

  /**
   * 🔄 MODIFICADO: Aplica filtro SOLO a dietas disponibles
   */
  aplicarFiltro(): void {
    if (!this.dietasDisponibles) return;

    if (this.filtro === 'dia') {
      this.dietasFiltradas = this.filtroDietas.filtrarDia(this.dietasDisponibles, this.fechaFiltro);
    }
    else if (this.filtro === 'semana') {
      this.dietasFiltradas = this.filtroDietas.filtrarSemana(this.dietasDisponibles, this.fechaFiltro);
    }
    else {
      this.dietasFiltradas = this.filtroDietas.filtrarMes(this.dietasDisponibles, this.fechaFiltro);
    }

    console.log("📌 Dietas filtradas:", this.dietasFiltradas);
  }

  /**
   * 🆕 NUEVO MÉTODO: Cuando el usuario selecciona una fecha en el calendario
   * Sincroniza la pantalla principal con la fecha seleccionada
   */
  onFechaSeleccionadaDelCalendario(fecha: Date): void {
    console.log(`🗓️ Fecha seleccionada del calendario: ${fecha.toLocaleDateString('es-ES')}`);
    
    // Guardar la fecha seleccionada
    this.fechaSeleccionadaCalendario = new Date(fecha);
    
    // Re-filtrar dietas según esta nueva fecha
    this.filtrarDietasDisponibles();
  }

  /**
   * 🆕 NUEVO MÉTODO: Volver a mostrar dietas de "Hoy"
   */
  mostrarDietasDeHoy(): void {
    console.log('📅 Volviendo a dietas de HOY');
    this.fechaSeleccionadaCalendario = null;
    this.filtrarDietasDisponibles();
  }

  /**
   * Abre el modal de detalle de dieta
   */
  abrirDetalleDieta(dieta: Dieta): void {
    console.log('👁️ Abriendo detalle de dieta:', dieta.nombre);
    this.dietaSeleccionada = dieta;
    this.mostrarDetalleDieta = true;
  }

  /**
   * Cierra el modal de detalle de dieta
   */
  cerrarDetalleDieta(): void {
    console.log('❌ Cerrando detalle de dieta');
    this.mostrarDetalleDieta = false;
    this.dietaSeleccionada = null;
  }

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

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getColorObjetivo(objetivo: string): string {
    const colores: { [key: string]: string } = {
      'bajar_peso': '#e74c3c',
      'mantener': '#f39c12',
      'aumentar_masa': '#27ae60',
      'definicion': '#3498db',
      'volumen': '#9b59b6',
      'saludable': '#16a085',
      'perdida_grasa': '#e67e22'
    };
    return colores[objetivo] || '#3498db';
  }

  getEstadoDieta(dieta: Dieta): { estado: string; color: string; icono: string } {
    const diasRestantes = dieta.dias_restantes || 0;

    if (dieta.estado === 'vencida') {
      return {
        estado: 'Vencida',
        color: '#e74c3c',
        icono: '❌'
      };
    }

    if (diasRestantes <= 0) {
      return {
        estado: 'Vencida',
        color: '#e74c3c',
        icono: '❌'
      };
    }

    if (diasRestantes <= 3) {
      return {
        estado: `Por vencer (${diasRestantes}d)`,
        color: '#f39c12',
        icono: '⏰'
      };
    }

    if (diasRestantes <= 7) {
      return {
        estado: `Próxima renovación (${diasRestantes}d)`,
        color: '#f39c12',
        icono: '🔔'
      };
    }

    return {
      estado: `Activa (${diasRestantes}d)`,
      color: '#27ae60',
      icono: '✅'
    };
  }

  /**
   * Descarga la dieta en PDF
   */
  descargarDietaPDF(dieta: Dieta): void {
    this.descargandoPDF = true;
    console.log('📥 Intentando descargar PDF...', dieta.nombre);

    this.dietaService.descargarDietaPDF(dieta.id_dieta).subscribe({
      next: (pdf: Blob) => {
        console.log('✅ PDF descargado desde el backend');
        this.guardarPDF(pdf, dieta.nombre);
        this.descargandoPDF = false;
      },
      error: (err: any) => {
        console.warn('⚠️ Backend no disponible, generando PDF en frontend...');
        this.generarPDFFrontend(dieta);
      }
    });
  }

  /**
   * Guarda un Blob como PDF
   */
  private guardarPDF(blob: Blob, nombre: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nombre.replace(/\s+/g, '_')}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
    console.log('✅ PDF descargado exitosamente');
  }

  /**
   * Genera PDF en el frontend sin errores VFS
   */
  private generarPDFFrontend(dieta: Dieta): void {
    console.log('🔧 Generando PDF en frontend...');

    import('pdfmake/build/pdfmake')
      .then((pdfMakeModule: any) => {
        import('pdfmake/build/vfs_fonts')
          .then((vfsFontsModule: any) => {
            const pdfMake = pdfMakeModule.default;
            
            const vfs = vfsFontsModule.pdfMake?.vfs || vfsFontsModule.default?.vfs;
            
            if (vfs) {
              (pdfMake as any).vfs = vfs;
              console.log('✅ VFS fonts cargadas correctamente');
            } else {
              console.warn('⚠️ No se encontraron VFS fonts, usando fuentes por defecto');
            }

            const docDefinition: any = {
              content: [
                {
                  columns: [
                    { text: 'PLAN NUTRICIONAL PERSONALIZADO', style: 'headerTitle' },
                    { text: 'FitMan', style: 'logo', alignment: 'right' }
                  ],
                  columnGap: 20,
                  marginBottom: 5
                },
                {
                  canvas: [
                    { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 3, lineColor: '#ff7a00' }
                  ],
                  marginBottom: 20
                },
                { text: dieta.nombre, style: 'dietaTitle', marginBottom: 15 },
                {
                  columns: [
                    {
                      stack: [
                        { text: 'OBJETIVO', style: 'label' },
                        { text: this.formatearObjetivo(dieta.objetivo), style: 'valor' },
                        { text: '', margin: [0, 10] },
                        { text: 'DURACIÓN', style: 'label' },
                        { text: `${dieta.dias_duracion || 30} días`, style: 'valor' }
                      ],
                      width: '45%'
                    },
                    {
                      stack: [
                        { text: 'CALORÍAS DIARIAS', style: 'label' },
                        { text: `${dieta.calorias_totales} kcal`, style: 'caloriaValue' },
                        { text: '', margin: [0, 10] },
                        { text: 'CREADO', style: 'label' },
                        { text: this.formatearFecha(dieta.fecha_creacion), style: 'valor' }
                      ],
                      width: '45%'
                    }
                  ],
                  columnGap: 20,
                  marginBottom: 25
                },
                {
                  canvas: [
                    { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e0e0e0' }
                  ],
                  marginBottom: 20
                },
                { text: 'PLAN DETALLADO', style: 'sectionTitle', marginBottom: 12 },
                { text: dieta.contenido, style: 'contenido', marginBottom: 25 },
                {
                  canvas: [
                    { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#e0e0e0' }
                  ],
                  marginBottom: 20
                },
                {
                  stack: [
                    { text: 'RECOMENDACIONES IMPORTANTES', style: 'sectionTitle', marginBottom: 12 },
                    {
                      ul: [
                        'Mantén una buena hidratación: bebe al menos 2 litros de agua al día',
                        'Realiza actividad física de acuerdo con tus capacidades',
                        'Consulta con tu nutriólogo antes de hacer cambios significativos',
                        'Registra tu peso y medidas regularmente para monitorear el progreso',
                        'Sigue el plan de manera consistente para obtener mejores resultados'
                      ],
                      style: 'recomendaciones'
                    }
                  ],
                  margin: [15, 15, 15, 15],
                  fillColor: '#fff8f0',
                  borderColor: '#ffb366',
                  borderWidth: 1,
                  borderRadius: 5
                },
                {
                  text: 'Este plan ha sido personalizado para ti. Para cambios o consultas, contáctate con tu nutriólogo.',
                  style: 'footer',
                  margin: [0, 25, 0, 0]
                }
              ],
              styles: {
                headerTitle: { fontSize: 16, bold: true, color: '#1a1a1a', letterSpacing: 1 },
                logo: { fontSize: 24, bold: true, color: '#ff7a00' },
                dietaTitle: { fontSize: 22, bold: true, color: '#ff7a00' },
                label: { fontSize: 9, bold: true, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, margin: [0, 0, 0, 3] },
                valor: { fontSize: 12, color: '#333', bold: true, margin: [0, 0, 0, 5] },
                caloriaValue: { fontSize: 14, color: '#ff7a00', bold: true, margin: [0, 0, 0, 5] },
                sectionTitle: { fontSize: 11, bold: true, color: '#ff7a00', textTransform: 'uppercase', letterSpacing: 0.5 },
                contenido: { fontSize: 10, lineHeight: 1.6, color: '#333' },
                recomendaciones: { fontSize: 10, lineHeight: 1.5, color: '#333' },
                footer: { fontSize: 8, color: '#999', italics: true, alignment: 'center' }
              },
              pageMargins: [40, 40, 40, 50],
              pageSize: 'LETTER'
            };

            try {
              const pdfName = `${dieta.nombre.replace(/\s+/g, '_')}.pdf`;
              pdfMake.createPdf(docDefinition).download(pdfName);
              console.log('✅ PDF generado y descargado correctamente');
              this.descargandoPDF = false;
            } catch (error: any) {
              console.error('❌ Error al crear PDF:', error);
              alert('Error al generar el PDF. Intenta de nuevo.');
              this.descargandoPDF = false;
            }
          })
          .catch((error: any) => {
            console.error('❌ Error al cargar VFS fonts:', error);
            this.generarPDFSinVFS(dieta);
          });
      })
      .catch((error: any) => {
        console.error('❌ Error al cargar pdfMake:', error);
        alert('Error: No se pudo cargar la librería PDF');
        this.descargandoPDF = false;
      });
  }

  /**
   * Genera PDF sin VFS (fallback)
   */
  private generarPDFSinVFS(dieta: Dieta): void {
    console.log('📝 Generando PDF sin VFS fonts (fallback)...');

    import('pdfmake/build/pdfmake')
      .then((pdfMakeModule: any) => {
        const pdfMake = pdfMakeModule.default;

        const docDefinition: any = {
          content: [
            { text: 'PLAN NUTRICIONAL: ' + dieta.nombre, style: 'title' },
            { text: '\nINFORMACIÓN DEL PLAN\n', style: 'heading' },
            { text: 'Objetivo: ' + this.formatearObjetivo(dieta.objetivo) },
            { text: 'Calorías: ' + dieta.calorias_totales + ' kcal' },
            { text: 'Duración: ' + (dieta.dias_duracion || 30) + ' días' },
            { text: 'Creado: ' + this.formatearFecha(dieta.fecha_creacion) },
            { text: '\nPLAN DETALLADO\n', style: 'heading' },
            { text: dieta.contenido },
            { text: '\nRECOMENDACIONES\n', style: 'heading' },
            { text: '• Mantén una buena hidratación: bebe al menos 2 litros de agua' },
            { text: '• Realiza actividad física regular' },
            { text: '• Consulta con tu nutriólogo antes de cambios' },
            { text: '• Registra tu peso y medidas regularmente' },
            { text: '• Sigue el plan de manera consistente' }
          ],
          styles: {
            title: { fontSize: 18, bold: true, color: '#ff7a00' },
            heading: { fontSize: 12, bold: true, color: '#ff7a00' }
          }
        };

        try {
          const pdfName = `${dieta.nombre.replace(/\s+/g, '_')}.pdf`;
          pdfMake.createPdf(docDefinition).download(pdfName);
          console.log('✅ PDF generado sin VFS');
          this.descargandoPDF = false;
        } catch (error: any) {
          console.error('❌ Error fatal:', error);
          alert('No se pudo generar el PDF');
          this.descargandoPDF = false;
        }
      });
  }

  /**
   * Abre el modal del calendario
   */
  abrirCalendario(): void {
    console.log('📅 Abriendo calendario');
    this.mostrarCalendario = true;
  }

  /**
   * Cierra el modal del calendario
   */
  cerrarCalendario(): void {
    console.log('❌ Cerrando calendario');
    this.mostrarCalendario = false;
  }
}