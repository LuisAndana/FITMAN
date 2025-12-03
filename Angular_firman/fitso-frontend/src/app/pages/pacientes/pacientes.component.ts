import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DomSanitizer } from '@angular/platform-browser';

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

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    })
    .catch((err) => {
      console.error('❌ Error al generar dieta:', err);
      this.error = 'Error al generar la dieta. Intenta nuevamente.';
      this.generandoDieta = false;
    });
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
   * Retry después de error
   */
  reintentar(): void {
    console.log('🔄 Reintentando...');
    this.cargarClientes();
  }
}