import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

interface Cliente {
  id_usuario: number;
  nombre: string;
  edad: number;
  peso: number;
  altura: number;
  objetivo: string;
  enfermedades: string[];
  descripcion_medica: string;
  peso_inicial: number;
  contrato_id: number;
  contrato_estado: string;
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
  clientes: Cliente[] = [];
  clienteSeleccionado: Cliente | null = null;
  mostrarDetalle: boolean = false;
  cargando: boolean = false;
  error: string = '';
  
  // Variables para generar dieta
  mostrarFormularioDieta: boolean = false;
  nombreDieta: string = '';
  diasDuracion: number = 7;
  caloriasObjetivo: number = 2000;
  preferencias: string = '';
  generandoDieta: boolean = false;
  dietaGenerada: any = null;

  constructor(
    private auth: AuthService,  // ✅ CAMBIO: De HttpClient a AuthService
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarClientes();
  }

  /**
   * Carga la lista de clientes del nutriólogo actual
   * ✅ AHORA USA AuthService
   */
  cargarClientes(): void {
    this.cargando = true;
    this.error = '';

    // ✅ CAMBIO: Usar AuthService.getNutriClients() en lugar de http.get()
    this.auth.getNutriClients().subscribe({
      next: (data) => {
        console.log('✅ Clientes cargados:', data);
        this.clientes = Array.isArray(data) ? data : [];
        this.cargando = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar clientes:', err);
        this.error = 'Error al cargar la lista de clientes. Verifica tu conexión.';
        this.cargando = false;
      }
    });
  }

  /**
   * Abre el perfil detallado de un cliente
   */
  abrirPerfilCliente(cliente: Cliente): void {
    this.clienteSeleccionado = cliente;
    this.mostrarDetalle = true;
    this.mostrarFormularioDieta = false;
    this.dietaGenerada = null;
  }

  /**
   * Cierra el panel de detalle
   */
  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.clienteSeleccionado = null;
    this.mostrarFormularioDieta = false;
    this.dietaGenerada = null;
  }

  /**
   * Abre el formulario para generar dieta
   */
  abrirFormularioDieta(): void {
    if (this.clienteSeleccionado) {
      // Calcular calorías recomendadas basadas en el objetivo
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
    // Fórmula simple de Mifflin-St Jeor para metabolismo basal
    let mb = 0;
    
    if (cliente.peso && cliente.altura && cliente.edad) {
      mb = 10 * cliente.peso + 6.25 * (cliente.altura * 100) - 5 * cliente.edad + 5;
      
      // Ajustar según objetivo
      switch (cliente.objetivo) {
        case 'bajar_peso':
          return Math.round(mb * 1.375 * 0.85); // Déficit calórico
        case 'mantener':
          return Math.round(mb * 1.55); // Mantenimiento moderado
        case 'aumentar_masa':
          return Math.round(mb * 1.55 * 1.15); // Superávit calórico
        default:
          return Math.round(mb * 1.55);
      }
    }
    
    return 2000; // Default
  }

  /**
   * Genera una dieta usando IA
   * ✅ AHORA USA AuthService
   */
  generarDieta(): void {
    if (!this.clienteSeleccionado || !this.nombreDieta) {
      this.error = 'Por favor completa todos los campos requeridos';
      return;
    }

    this.generandoDieta = true;
    this.error = '';

    const request: DietaRequest = {
      id_cliente: this.clienteSeleccionado.id_usuario,
      nombre_dieta: this.nombreDieta,
      dias_duracion: this.diasDuracion,
      calorias_objetivo: this.caloriasObjetivo,
      preferencias: this.preferencias
    };

    // ✅ CAMBIO: Necesitamos crear un método en AuthService para esto
    // Por ahora, usamos directamente el http que ofrece AuthService
    // Agregamos el método generar dieta a AuthService
    
    // Si no quieres modificar AuthService, puedes hacer esto temporalmente:
    const token = this.auth.getToken();
    const headers = { 'Authorization': `Bearer ${token}` };

    // Usando fetch o HttpClient directamente (mejor agregar a AuthService)
    fetch('http://localhost:8000/api/clientes/generar-dieta-ia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(request)
    })
    .then(res => res.json())
    .then((response: any) => {
      this.dietaGenerada = response;
      this.mostrarFormularioDieta = false;
      this.generandoDieta = false;
      console.log('✅ Dieta generada exitosamente:', response);
    })
    .catch((err) => {
      console.error('❌ Error al generar dieta:', err);
      this.error = 'Error al generar la dieta. Intenta nuevamente.';
      this.generandoDieta = false;
    });
  }

  /**
   * Guarda la dieta generada para uso posterior
   */
  guardarDieta(): void {
    if (this.dietaGenerada) {
      // La dieta ya está guardada en la BD desde el endpoint
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Cancela la generación de dieta
   */
  cancelarFormulario(): void {
    this.mostrarFormularioDieta = false;
    this.nombreDieta = '';
    this.diasDuracion = 7;
    this.caloriasObjetivo = 2000;
    this.preferencias = '';
    this.error = '';
  }

  /**
   * Calcula el IMC del cliente
   */
  calcularIMC(cliente: Cliente): number | null {
    if (cliente.peso && cliente.altura) {
      return Math.round((cliente.peso / (cliente.altura * cliente.altura)) * 100) / 100;
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
   * Formatea el objetivo de forma legible
   */
  formatearObjetivo(objetivo: string): string {
    const objetivos: { [key: string]: string } = {
      'bajar_peso': 'Bajar de peso',
      'mantener': 'Mantener peso',
      'aumentar_masa': 'Aumentar masa muscular'
    };
    return objetivos[objetivo] || objetivo;
  }
}