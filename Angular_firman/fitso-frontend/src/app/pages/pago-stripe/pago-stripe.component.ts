import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, Navigation } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ContratoService } from '../../services/contrato.service';
import { AuthService } from '../../services/auth.service';

declare var Stripe: any;
declare var stripe: any;

interface Contrato {
  id_contrato?: number;
  id_nutriologo: number;
  nutriologo_nombre: string;
  monto: number;
  duracion_meses: number;
  estado?: string;
  descripcion_servicios?: string;
  stripe_payment_intent_id?: string;
}

@Component({
  selector: 'app-pago-stripe',
  templateUrl: './pago-stripe.component.html',
  styleUrls: ['./pago-stripe.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class PagoStripeComponent implements OnInit, AfterViewInit {
  // ========== PROPIEDADES DE ESTADO ==========
  cargando: boolean = false;
  procesandoPago: boolean = false;
  pagoExitoso: boolean = false;
  error: string | null = null;
  errorTarjeta: string | null = null;
  aceptaTerminos: boolean = false;

  // ========== DATOS ==========
  contrato: Contrato | null = null;
  form!: FormGroup;

  // ========== STRIPE ==========
  private stripe: any = null;
  private cardElement: any = null;
  private stripeReady: boolean = false;

  // ========== INYECCIONES ==========
  constructor(
    private fb: FormBuilder,
    private contratoService: ContratoService,
    private authService: AuthService,
    private router: Router
  ) {}

  // ========== CICLO DE VIDA ==========
  ngOnInit(): void {
    console.log('🚀 ngOnInit: Inicializando componente');
    this.inicializarFormulario();
    this.cargarContrato();
    this.inicializarStripe();
  }

  ngAfterViewInit(): void {
    console.log('🚀 ngAfterViewInit: Vista inicializada');
    setTimeout(() => {
      if (this.stripeReady && this.stripe && !this.cardElement) {
        console.log('⏳ Intentando montar Card Element...');
        this.montarCardElement();
      }
    }, 500);
  }

  // ========== INICIALIZACIÓN ==========

  /**
   * Inicializa el formulario reactivo con validaciones
   */
  private inicializarFormulario(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
    });
    console.log('✅ Formulario inicializado');
  }

  /**
   * Inicializa Stripe con la clave pública
   */
  private inicializarStripe(): void {
    try {
      console.log('🔄 Inicializando Stripe...');

      const stripePubKey = 'pk_test_51SUdMoEwnNTMkfQfPAiN2aOQUw5e9FmDr41o5TkWMd3Mp4KKATAvLMwER9Oz2kHBaBbdSmzWBYnVolP3XszNkfwI00AKDm9YVx';

      if (!stripePubKey || stripePubKey.includes('undefined')) {
        throw new Error('❌ Clave pública de Stripe no válida');
      }

      // Cargar Stripe desde CDN
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => {
        console.log('✅ Script de Stripe cargado');
        this.stripe = (window as any).Stripe(stripePubKey);
        this.stripeReady = true;
        console.log('✅ Stripe inicializado');

        if (document.getElementById('card-element')) {
          console.log('✅ Elemento #card-element encontrado en DOM');
          this.montarCardElement();
        }
      };
      script.onerror = () => {
        console.error('❌ Error cargando script de Stripe');
        this.error = 'Error al cargar el sistema de pagos.';
      };
      document.head.appendChild(script);
    } catch (err: any) {
      console.error('❌ Error inicializando Stripe:', err);
      this.error = `Error de configuración: ${err.message}`;
    }
  }

  /**
   * Monta el Stripe Card Element en el DOM
   */
  private montarCardElement(): void {
    console.log('🔄 Montando Card Element...');

    if (!this.stripe) {
      console.error('❌ Stripe no está inicializado');
      return;
    }

    const cardElement = document.getElementById('card-element');
    if (!cardElement) {
      console.error('❌ Elemento #card-element no encontrado en DOM');
      return;
    }

    if (this.cardElement) {
      console.warn('⚠️ Card Element ya está montado');
      return;
    }

    try {
      const elements = this.stripe.elements();

      this.cardElement = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            '::placeholder': {
              color: '#9ca3af',
            },
          },
          invalid: {
            color: '#ef4444',
          },
        },
      });

      this.cardElement.mount('#card-element');
      console.log('✅ Card Element montado exitosamente');

      this.cardElement.on('change', (event: any) => {
        console.log('📝 Evento de Card Element:', event.type);
        if (event.error) {
          this.errorTarjeta = event.error.message;
          console.error('❌ Error en tarjeta:', event.error.message);
        } else {
          this.errorTarjeta = null;
        }
      });

      this.cardElement.on('ready', () => {
        console.log('✅ Card Element está listo para usar');
      });
    } catch (err: any) {
      console.error('❌ Error montando Card Element:', err);
      this.error = `Error al cargar el formulario de pago: ${err.message}`;
    }
  }

  /**
   * Carga los datos del contrato desde query params o local storage
   */
  private cargarContrato(): void {
    this.cargando = true;
    this.error = null;

    try {
      console.log('📥 Cargando datos del contrato...');

      const navigation = this.router.getCurrentNavigation() as Navigation;
      if (navigation?.extras?.state && (navigation.extras.state as any)['contrato']) {
        this.contrato = (navigation.extras.state as any)['contrato'];
        console.log('✅ Contrato cargado desde navegación:', this.contrato);
        this.cargando = false;
        return;
      }

      const contratoData = sessionStorage.getItem('contrato_data');
      if (contratoData) {
        this.contrato = JSON.parse(contratoData);
        console.log('✅ Contrato cargado desde sessionStorage:', this.contrato);
        this.cargando = false;
        return;
      }

      const contratoDataLocal = localStorage.getItem('contrato_data');
      if (contratoDataLocal) {
        this.contrato = JSON.parse(contratoDataLocal);
        console.log('✅ Contrato cargado desde localStorage:', this.contrato);
        this.cargando = false;
        return;
      }

      this.error = 'No se encontraron datos del contrato. Por favor, vuelve e intenta de nuevo.';
      console.warn('⚠️ No hay datos de contrato disponibles');
      this.cargando = false;
    } catch (err) {
      console.error('❌ Error cargando contrato:', err);
      this.error = 'Error al cargar los datos del contrato.';
      this.cargando = false;
    }
  }

  // ========== ACCIONES DE PAGO ==========

  /**
   * Procesa el pago con Stripe
   */
  async procesarPago(): Promise<void> {
    console.log('🔄 Procesando pago...');

    if (!this.form.valid) {
      console.warn('⚠️ Formulario inválido');
      this.error = 'Por favor completa todos los campos correctamente.';
      return;
    }

    if (!this.aceptaTerminos) {
      console.warn('⚠️ Términos no aceptados');
      this.error = 'Debes aceptar los términos y condiciones.';
      return;
    }

    if (!this.contrato) {
      console.error('❌ Contrato no disponible');
      this.error = 'Datos del contrato no disponibles.';
      return;
    }

    if (!this.stripe || !this.cardElement) {
      console.error('❌ Stripe no está inicializado');
      this.error = 'Stripe no está inicializado. Por favor, recarga la página.';
      return;
    }

    this.procesandoPago = true;
    this.error = null;
    this.errorTarjeta = null;

    try {
      console.log('📤 Paso 1: Creando PaymentIntent...');
      const paymentIntentData = await this.crearPaymentIntent();

      if (!paymentIntentData?.client_secret) {
        throw new Error('No se recibió client_secret del servidor');
      }

      console.log('✅ PaymentIntent creado:', paymentIntentData.payment_intent_id);

      console.log('📤 Paso 2: Confirmando pago con Stripe...');
      const resultado = await this.stripe.confirmCardPayment(paymentIntentData.client_secret, {
        payment_method: {
          card: this.cardElement,
          billing_details: {
            name: this.form.get('nombre')?.value,
            email: this.form.get('email')?.value,
          },
        },
      });

      console.log('📥 Resultado de Stripe:', resultado);

      if (resultado.error) {
        this.errorTarjeta = resultado.error.message || 'Error procesando el pago';
        console.error('❌ Error de Stripe:', resultado.error);
        this.procesandoPago = false;
        return;
      }

      if (resultado.paymentIntent?.status === 'succeeded') {
        console.log('✅ Pago procesado exitosamente:', resultado.paymentIntent);
        this.pagoExitoso = true;
        this.procesandoPago = false;

        sessionStorage.setItem('pago_exitoso', JSON.stringify({
          paymentIntentId: resultado.paymentIntent.id,
          timestamp: new Date().toISOString(),
        }));

        // Redirigir después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);
      } else {
        console.warn('⚠️ Pago no completado, status:', resultado.paymentIntent?.status);
        this.error = 'El pago no se completó. Por favor, intenta de nuevo.';
        this.procesandoPago = false;
      }
    } catch (err: any) {
      console.error('❌ Error procesando pago:', err);
      this.error = err.message || 'Error al procesar el pago. Por favor, intenta de nuevo.';
      this.procesandoPago = false;
    }
  }

  /**
   * Crea un PaymentIntent en el backend
   */
  private async crearPaymentIntent(): Promise<any> {
    if (!this.contrato) {
      throw new Error('Contrato no disponible');
    }

    console.log('🚀 Llamando ContratoService.crearPaymentIntent()...');

    try {
      const response: any = await this.contratoService.crearPaymentIntent(
        this.contrato.id_nutriologo,
        this.contrato.monto,
        this.contrato.duracion_meses,
        this.contrato.descripcion_servicios || 'Servicio de nutrición'
      ).toPromise();
      
      console.log('✅ Respuesta exitosa del servidor:', response);
      return response;
    } catch (err: any) {
      console.error('❌ Error en ContratoService:', err);

      // ✅ MANEJO MEJORADO DE ERRORES
      if (err.code === 'CONFLICT_ERROR') {
        // Error 409: Contrato activo previo
        throw new Error(
          `Ya tienes un contrato activo con ${this.contrato.nutriologo_nombre}. ` +
          `Cancela el contrato anterior para contratar de nuevo.`
        );
      } else if (err.code === 'VALIDATION_ERROR') {
        // Error 400: Validación
        throw new Error(err.userMessage || 'Los datos del contrato son inválidos');
      } else if (err.code === 'AUTH_ERROR') {
        // Error 401: No autenticado
        throw new Error('Tu sesión expiró. Por favor, inicia sesión nuevamente');
      } else if (err.code === 'FORBIDDEN_ERROR') {
        // Error 403: No autorizado
        throw new Error('No tienes permiso para realizar esta acción');
      } else if (err.code === 'NOT_FOUND_ERROR') {
        // Error 404: No encontrado
        throw new Error('El nutriólogo no fue encontrado o no está disponible');
      } else if (err.code === 'NETWORK_ERROR') {
        // Error de red
        throw new Error('Error de conexión. Verifica tu internet e intenta de nuevo');
      } else {
        // Error desconocido
        throw new Error(
          err.userMessage || 
          'Error al crear el pago. Por favor, intenta de nuevo.'
        );
      }
    }
  }

  // ========== ACCIONES DEL USUARIO ==========

  /**
   * Reintenta cargar el contrato
   */
  reintentar(): void {
    console.log('🔄 Reiniciando...');
    this.error = null;
    this.cargarContrato();
  }

  /**
   * Navega al dashboard
   */
  irAlDashboard(): void {
    console.log('🔀 Navegando al dashboard...');
    this.router.navigate(['/dashboard']);
  }

  /**
   * Navega de vuelta a contratar
   */
  volverAContratar(): void {
    console.log('🔀 Volviendo a contratar...');
    this.router.navigate(['/pacientes']);
  }

  // ========== GETTERS ==========

  /**
   * Obtiene el nombre del nutriólogo para el avatar
   */
  get nutriologoInicial(): string {
    if (this.contrato?.nutriologo_nombre) {
      return this.contrato.nutriologo_nombre[0].toUpperCase();
    }
    return 'N';
  }

  /**
   * Calcula el total a pagar
   */
  get totalAPagar(): number {
    if (this.contrato) {
      return this.contrato.monto * this.contrato.duracion_meses;
    }
    return 0;
  }

  /**
   * Verifica si el formulario es válido para enviar
   */
  get formularioValido(): boolean {
    return this.form.valid && this.aceptaTerminos && !this.procesandoPago;
  }

  /**
   * Verifica si hay un error de contrato activo
   */
  get esErrorContratoActivo(): boolean {
    return this.error?.includes('contrato activo') || false;
  }
}