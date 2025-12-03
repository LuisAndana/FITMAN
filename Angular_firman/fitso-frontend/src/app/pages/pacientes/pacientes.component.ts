import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DomSanitizer } from '@angular/platform-browser';
import { DietaDetalleComponent } from '../../pages/dieta-detalle/dieta-detalle.component';

interface Cliente {
  id_usuario: number;
  nombre: string;
  edad: number;
  peso: number;
  altura: number;
  objetivo: string;
  enfermedades?: string[];
  descripcion_medica?: string;
  peso_inicial: number;
  contrato_id: number;
  contrato_estado: string;
  correo?: string;
}

interface DietaRequest {
  id_cliente: number;
  nombre_dieta: string;
  dias_duracion: number;
  calorias_objetivo: number;
  preferencias: string;
}

interface Dieta {
  id_dieta: number;
  nombre: string;
  contenido: string;
  calorias_totales: number;
  objetivo: string;
  fecha_creacion: string;
  dias_duracion?: number;
  fecha_vencimiento?: string;
  estado?: string;
  dias_restantes?: number;
}

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule, DietaDetalleComponent],
  templateUrl: './pacientes.component.html',
  styleUrls: ['./pacientes.component.css']
})
export class PacientesComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  // Lista de pacientes
  clientes: Cliente[] = [];
  clienteSeleccionado: Cliente | null = null;
  mostrarDetalle: boolean = false;
  cargando: boolean = false;
  error: string = '';
  
  // Variables para generar dieta
  mostrarFormularioDieta: boolean = false;
  nombreDieta: string = '';
  diasDuracion: number = 30;
  caloriasObjetivo: number = 2000;
  preferencias: string = '';
  generandoDieta: boolean = false;
  dietaGenerada: any = null;

  // ✅ NUEVO: Variables para mostrar detalle de dieta
  dietaSeleccionada: Dieta | null = null;
  mostrarDetalleDieta: boolean = false;
  descargandoPDF: boolean = false;

  ngOnInit(): void {
    console.log('🔄 PacientesComponent iniciando...');
    this.cargarClientes();
  }

  /**
   * Carga la lista de clientes/pacientes del nutriólogo actual
   */
  cargarClientes(): void {
    this.cargando = true;
    this.error = '';
    console.log('📋 Cargando clientes...');

    this.authService.getNutriClients().subscribe({
      next: (data: any) => {
        console.log('✅ Datos recibidos del backend:', data);
        
        // Manejar diferentes formatos de respuesta
        if (Array.isArray(data)) {
          this.clientes = data;
        } else if (data && typeof data === 'object') {
          // Si es un objeto, buscar la propiedad que contiene el array
          const clientes = data.clientes || data.data || data.usuarios || [];
          this.clientes = Array.isArray(clientes) ? clientes : [];
        } else {
          this.clientes = [];
        }

        console.log(`✅ ${this.clientes.length} clientes cargados`);
        this.cargando = false;

        // Si no hay clientes, mostrar mensaje
        if (this.clientes.length === 0) {
          console.warn('⚠️ No hay clientes registrados');
        }
      },
      error: (err: any) => {
        console.error('❌ Error al cargar clientes:', err);
        
        // Mostrar mensaje de error detallado
        if (err.status === 404) {
          this.error = 'Endpoint no encontrado. Verifica la configuración del servidor.';
        } else if (err.status === 401) {
          this.error = 'Sesión expirada. Por favor, vuelve a iniciar sesión.';
          this.router.navigate(['/login']);
        } else if (err.status === 403) {
          this.error = 'No tienes permiso para acceder a esta información.';
        } else {
          this.error = `Error al cargar pacientes: ${err.statusText || err.message || 'Error desconocido'}`;
        }
        
        this.cargando = false;
      }
    });
  }

  /**
   * Abre el perfil detallado de un cliente
   */
  abrirPerfilCliente(cliente: Cliente): void {
    console.log('👤 Abriendo perfil de cliente:', cliente.nombre);
    this.clienteSeleccionado = cliente;
    this.mostrarDetalle = true;
    this.mostrarFormularioDieta = false;
    this.dietaGenerada = null;
    this.mostrarDetalleDieta = false;
  }

  /**
   * Cierra el panel de detalle
   */
  cerrarDetalle(): void {
    console.log('❌ Cerrando detalle');
    this.mostrarDetalle = false;
    this.clienteSeleccionado = null;
    this.mostrarFormularioDieta = false;
    this.dietaGenerada = null;
    this.mostrarDetalleDieta = false;
    this.resetFormulario();
  }

  /**
   * Abre el formulario para generar dieta
   */
  abrirFormularioDieta(): void {
    if (this.clienteSeleccionado) {
      console.log('📝 Abriendo formulario de dieta para:', this.clienteSeleccionado.nombre);
      const caloriasRecomendadas = this.calcularCaloriasRecomendadas(
        this.clienteSeleccionado
      );
      this.caloriasObjetivo = caloriasRecomendadas;
      this.mostrarFormularioDieta = true;
    }
  }

  /**
   * Calcula calorías recomendadas basadas en características del cliente
   */
  private calcularCaloriasRecomendadas(cliente: Cliente): number {
    let mb = 0;
    
    if (cliente.peso && cliente.altura && cliente.edad) {
      // Fórmula Mifflin-St Jeor
      mb = 10 * cliente.peso + 6.25 * (cliente.altura * 100) - 5 * cliente.edad + 5;
      
      switch (cliente.objetivo) {
        case 'bajar_peso':
          return Math.round(mb * 1.375 * 0.85);
        case 'mantener':
          return Math.round(mb * 1.55);
        case 'aumentar_masa':
          return Math.round(mb * 1.55 * 1.15);
        default:
          return Math.round(mb * 1.55);
      }
    }
    
    return 2000; // Default
  }

  /**
   * Genera una dieta usando IA
   */
  generarDieta(): void {
    if (!this.clienteSeleccionado || !this.nombreDieta) {
      this.error = 'Por favor completa todos los campos requeridos';
      console.warn('⚠️ Campos incompletos');
      return;
    }

    this.generandoDieta = true;
    this.error = '';
    console.log('🤖 Generando dieta...');

    const request: DietaRequest = {
      id_cliente: this.clienteSeleccionado.id_usuario,
      nombre_dieta: this.nombreDieta,
      dias_duracion: this.diasDuracion,
      calorias_objetivo: this.caloriasObjetivo,
      preferencias: this.preferencias
    };

    const token = this.authService.getToken();

    if (!token) {
      this.error = 'No tienes sesión activa. Por favor, inicia sesión nuevamente.';
      this.generandoDieta = false;
      return;
    }

    fetch('http://127.0.0.1:8000/api/clientes/generar-dieta-ia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(request)
    })
    .then(res => {
      console.log('📡 Respuesta del servidor:', res.status);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then((response: any) => {
      console.log('✅ Dieta generada exitosamente:', response);
      this.dietaGenerada = response;
      this.mostrarFormularioDieta = false;
      this.generandoDieta = false;
      
      // ✅ IMPORTANTE: Abrir el modal profesional automáticamente
      setTimeout(() => {
        this.abrirDetalleDieta(response);
      }, 500);
    })
    .catch((err) => {
      console.error('❌ Error al generar dieta:', err);
      this.error = 'Error al generar la dieta. Intenta nuevamente.';
      this.generandoDieta = false;
    });
  }

  /**
   * ✅ NUEVO: Abre el modal con detalle de la dieta
   */
  abrirDetalleDieta(dieta: Dieta): void {
    console.log('🍽️ Abriendo detalle de dieta:', dieta.nombre);
    this.dietaSeleccionada = dieta;
    this.mostrarDetalleDieta = true;
  }

  /**
   * ✅ NUEVO: Cierra el modal de detalle de dieta
   */
  cerrarDetalleDieta(): void {
    console.log('❌ Cerrando detalle de dieta');
    this.mostrarDetalleDieta = false;
    this.dietaSeleccionada = null;
  }

  /**
   * ✅ NUEVO: Descarga la dieta en PDF (Implementación completa - Limpia)
   */
  descargarDietaPDF(dieta: Dieta): void {
    if (!dieta) {
      console.error('❌ No hay dieta para descargar');
      return;
    }

    this.descargandoPDF = true;
    console.log('📥 Generando PDF de dieta:', dieta.nombre);

    // Cargar pdfMake dinámicamente
    import('pdfmake/build/pdfmake').then((pdfMakeModule: any) => {
      import('pdfmake/build/vfs_fonts').then((vfsFontsModule: any) => {
        try {
          const pdfMake = pdfMakeModule.default;
          const vfs = vfsFontsModule.pdfMake?.vfs || vfsFontsModule.default?.vfs;

          if (vfs) {
            (pdfMake as any).vfs = vfs;
          }

          // Limpiar contenido de markdown
          const contenidoLimpio = this.limpiarMarkdown(dieta.contenido);

          // Crear documento PDF
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
              { text: contenidoLimpio, style: 'contenido', marginBottom: 25 },
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

          // Generar y descargar PDF
          const pdfName = `${dieta.nombre.replace(/\s+/g, '_')}.pdf`;
          pdfMake.createPdf(docDefinition).download(pdfName);
          console.log('✅ PDF descargado exitosamente:', pdfName);
          this.descargandoPDF = false;
        } catch (error: any) {
          console.error('❌ Error al generar PDF:', error);
          this.descargandoPDF = false;
          alert('Error al generar el PDF. Intenta nuevamente.');
        }
      }).catch((error: any) => {
        console.error('❌ Error al cargar VFS fonts:', error);
        this.descargandoPDF = false;
      });
    }).catch((error: any) => {
      console.error('❌ Error al cargar pdfMake:', error);
      this.descargandoPDF = false;
      alert('Error: No se pudo cargar la librería PDF');
    });
  }

  /**
   * Limpia el contenido markdown para que se vea limpio en PDF
   */
  private limpiarMarkdown(contenido: string): string {
    try {
      // Remover headers markdown
      contenido = contenido.replace(/#{1,6}\s+\*\*/g, '');
      contenido = contenido.replace(/#{1,6}\s+/g, '');
      
      // Remover asteriscos de bold
      contenido = contenido.replace(/\*\*/g, '');
      
      // Remover guiones de lista
      contenido = contenido.replace(/^\s*[-*]\s+/gm, '• ');
      
      // Remover guiones horizontales
      contenido = contenido.replace(/^---+$/gm, '');
      
      // Remover backticks
      contenido = contenido.replace(/`/g, '');
      
      // Limpiar espacios múltiples
      contenido = contenido.replace(/\n\n\n+/g, '\n\n');
      
      return contenido.trim();
    } catch (error) {
      console.warn('⚠️ Error al limpiar markdown:', error);
      return contenido;
    }
  }

  /**
   * Guarda la dieta y navega al dashboard
   */
  guardarDieta(): void {
    if (this.dietaGenerada) {
      console.log('💾 Dieta guardada correctamente');

      // TODO: Aquí puedes llamar al servicio para guardarla definitivamente si lo deseas

      // Cerrar modal y limpiar formulario
      this.mostrarDetalle = false;
      this.dietaGenerada = null;
      this.mostrarDetalleDieta = false;
      this.resetFormulario();

      // Refrescar lista de pacientes si hace falta
      this.cargarClientes();
    }
  }

  /**
   * Cancela la generación de dieta
   */
  cancelarFormulario(): void {
    console.log('❌ Cancelando formulario');
    this.resetFormulario();
  }

  /**
   * Reset formulario
   */
  private resetFormulario(): void {
    this.mostrarFormularioDieta = false;
    this.nombreDieta = '';
    this.diasDuracion = 30;
    this.caloriasObjetivo = 2000;
    this.preferencias = '';
    this.error = '';
  }

  /**
   * Calcula el IMC del cliente
   */
  calcularIMC(cliente: Cliente): number | null {
    if (cliente.peso && cliente.altura) {
      const imc = cliente.peso / (cliente.altura * cliente.altura);
      return Math.round(imc * 100) / 100;
    }
    return null;
  }

  /**
   * Obtiene la clasificación del IMC
   */
  clasificacionIMC(imc: number): string {
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
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
   * Formatea fecha a formato legible
   */
  formatearFecha(fecha: string): string {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('⚠️ Error al formatear fecha:', fecha);
      return fecha;
    }
  }

  /**
   * Retry después de error
   */
  reintentar(): void {
    console.log('🔄 Reintentando...');
    this.cargarClientes();
  }
}