import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, retry, timeout } from 'rxjs/operators';

// 📋 INTERFACES
export interface PagoStripeRequest {
  id_nutriologo: number;
  monto: number;
  duracion_meses: number;
  descripcion_servicios?: string;
  usuario_id: number;
}

export interface PaymentIntentResponse {
  exito: boolean;
  mensaje: string;
  contrato_id?: number;
  client_secret?: string;
  payment_intent_id?: string;
  monto?: number;
  nutriologo_nombre?: string;
}

export interface ContratoResponse {
  id_contrato: number;
  id_cliente: number;
  id_nutriologo: number;
  nutriologo_nombre: string;
  monto: number;
  estado: string;
  duracion_meses: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  descripcion_servicios?: string;
}

// 📋 TIPOS DE ESTADO
export enum EstadoContrato {
  PENDIENTE = 'PENDIENTE',
  ACTIVO = 'ACTIVO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO'
}

// 📋 ERRORES PERSONALIZADOS
export class ContratoError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public details?: any
  ) {
    super(userMessage);
    this.name = 'ContratoError';
  }
}

@Injectable({
  providedIn: 'root'
})
export class ContratoService {
  private apiUrl = 'http://localhost:8000/api/contratos';
  private contratoActualSubject = new BehaviorSubject<ContratoResponse | null>(null);
  public contratoActual$ = this.contratoActualSubject.asObservable();

  private procesandoSubject = new BehaviorSubject<boolean>(false);
  public procesando$ = this.procesandoSubject.asObservable();

  private errorSubject = new BehaviorSubject<ContratoError | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * ✅ Crear PaymentIntent con reintentos y manejo robusto de errores
   */
  crearPaymentIntent(
    idNutriologo: number,
    monto: number,
    duracionMeses: number = 1,
    descripcion?: string
  ): Observable<PaymentIntentResponse> {
    // 🔒 Validaciones locales primero
    const validacion = this.validarPaymentIntent(
      idNutriologo,
      monto,
      duracionMeses
    );

    if (!validacion.valido) {
      const error = new ContratoError(
        'VALIDACION_ERROR',
        validacion.mensaje,
        { campo: validacion.campo }
      );
      this.errorSubject.next(error);
      return throwError(() => error);
    }

    this.procesandoSubject.next(true);

    // 🔑 INTENTA DIFERENTES NOMBRES DE usuarioId
    let usuarioId = parseInt(
      localStorage.getItem('usuarioId') || 
      localStorage.getItem('usuario_id') || 
      localStorage.getItem('id_usuario') || 
      '0', 
      10
    );

    console.log('🔍 usuarioId encontrado:', usuarioId);
    console.log('📦 localStorage keys:', Object.keys(localStorage));

    if (!usuarioId) {
      const error = new ContratoError(
        'AUTH_ERROR',
        'Usuario no autenticado. Por favor inicia sesión.',
        {}
      );
      this.errorSubject.next(error);
      this.procesandoSubject.next(false);
      return throwError(() => error);
    }

    const payload: PagoStripeRequest = {
      id_nutriologo: idNutriologo,
      monto: monto,
      duracion_meses: duracionMeses,
      descripcion_servicios: descripcion,
      usuario_id: usuarioId
    };

    console.log('🚀 CREAR PAYMENT INTENT:', payload);

    return this.http.post<PaymentIntentResponse>(
      `${this.apiUrl}/crear-payment-intent`,
      payload
    ).pipe(
      timeout(30000),
      retry({ count: 2, delay: 1000 }),
      tap((resp) => {
        console.log('✅ PaymentIntent creado:', resp);
        this.procesandoSubject.next(false);

        if (resp.contrato_id) {
          this.obtenerContrato(resp.contrato_id).subscribe();
        }
      }),
      catchError((error) => {
        this.procesandoSubject.next(false);
        return this.manejarErrorHttp(error, 'crear_payment_intent');
      })
    );
  }

  /**
   * ✅ Confirmar pago con validaciones
   */
  confirmarPago(paymentIntentId: string): Observable<PaymentIntentResponse> {
    if (!paymentIntentId) {
      const error = new ContratoError(
        'INVALID_PAYMENT_ID',
        'ID de pago inválido',
        {}
      );
      return throwError(() => error);
    }

    this.procesandoSubject.next(true);
    const usuarioId = parseInt(localStorage.getItem('usuarioId') || '0', 10);

    return this.http.post<PaymentIntentResponse>(
      `${this.apiUrl}/confirmar-pago/${paymentIntentId}`,
      { usuario_id: usuarioId }
    ).pipe(
      timeout(30000),
      tap((resp) => {
        console.log('✅ Pago confirmado:', resp);
        this.procesandoSubject.next(false);
        this.errorSubject.next(null);
      }),
      catchError((error) => {
        this.procesandoSubject.next(false);
        return this.manejarErrorHttp(error, 'confirmar_pago');
      })
    );
  }

  /**
   * ✅ Obtener detalles de un contrato
   */
  obtenerContrato(contratoId: number): Observable<ContratoResponse> {
    const usuarioId = parseInt(localStorage.getItem('usuarioId') || '0', 10);

    return this.http.get<ContratoResponse>(
      `${this.apiUrl}/obtener/${contratoId}`,
      {
        params: { usuario_id: usuarioId.toString() }
      }
    ).pipe(
      tap((contrato) => {
        console.log('📋 Contrato obtenido:', contrato);
        this.contratoActualSubject.next(contrato);
      }),
      catchError((error) => {
        return this.manejarErrorHttp(error, 'obtener_contrato');
      })
    );
  }

  /**
   * ✅ Listar contratos del usuario
   */
  misContratos(): Observable<ContratoResponse[]> {
    const usuarioId = parseInt(localStorage.getItem('usuarioId') || '0', 10);

    return this.http.get<any>(
      `${this.apiUrl}/mis-contratos/${usuarioId}`
    ).pipe(
      tap((resp) => {
        console.log('📋 Contratos del usuario:', resp);
      }),
      catchError((error) => {
        return this.manejarErrorHttp(error, 'listar_contratos');
      })
    );
  }

  /**
   * ✅ Cancelar contrato
   */
  cancelarContrato(contratoId: number, razon?: string): Observable<any> {
    const usuarioId = parseInt(localStorage.getItem('usuarioId') || '0', 10);

    return this.http.post(
      `${this.apiUrl}/cancelar/${contratoId}`,
      {
        usuario_id: usuarioId,
        razon: razon || 'Cancelación del usuario'
      }
    ).pipe(
      tap(() => {
        console.log('✅ Contrato cancelado');
        this.contratoActualSubject.next(null);
      }),
      catchError((error) => {
        return this.manejarErrorHttp(error, 'cancelar_contrato');
      })
    );
  }

  // ============= MÉTODOS PRIVADOS =============

  /**
   * 🔍 Validar PaymentIntent localmente
   */
  private validarPaymentIntent(
    idNutriologo: number,
    monto: number,
    duracionMeses: number
  ): { valido: boolean; mensaje: string; campo?: string } {
    if (!idNutriologo || idNutriologo <= 0) {
      return {
        valido: false,
        mensaje: 'Nutriólogo inválido',
        campo: 'id_nutriologo'
      };
    }

    if (!monto || monto <= 0) {
      return {
        valido: false,
        mensaje: 'El monto debe ser mayor a 0',
        campo: 'monto'
      };
    }

    if (monto < 10) {
      return {
        valido: false,
        mensaje: 'El monto mínimo es $10',
        campo: 'monto'
      };
    }

    if (monto > 500) {
      return {
        valido: false,
        mensaje: 'El monto máximo es $500',
        campo: 'monto'
      };
    }

    if (duracionMeses < 1 || duracionMeses > 12) {
      return {
        valido: false,
        mensaje: 'La duración debe estar entre 1 y 12 meses',
        campo: 'duracion_meses'
      };
    }

    return { valido: true, mensaje: 'OK' };
  }

  /**
   * 🚨 Manejar errores HTTP de forma centralizada
   */
  private manejarErrorHttp(
    error: HttpErrorResponse,
    operacion: string
  ): Observable<never> {
    let contratoError: ContratoError;

    if (error.error instanceof ErrorEvent) {
      contratoError = new ContratoError(
        'NETWORK_ERROR',
        'Error de conexión. Verifica tu internet.',
        { operacion, detalles: error.error.message }
      );
    } else {
      const status = error.status;
      const body = error.error;

      switch (status) {
        case 400:
          contratoError = new ContratoError(
            'VALIDATION_ERROR',
            body?.error || body?.detail || 'Datos inválidos',
            { operacion, status, body }
          );
          break;

        case 401:
          contratoError = new ContratoError(
            'AUTH_ERROR',
            'No autorizado. Por favor inicia sesión nuevamente.',
            { operacion, status }
          );
          break;

        case 403:
          contratoError = new ContratoError(
            'FORBIDDEN_ERROR',
            body?.error || 'No tienes permiso para realizar esta acción',
            { operacion, status }
          );
          break;

        case 404:
          contratoError = new ContratoError(
            'NOT_FOUND_ERROR',
            'Recurso no encontrado',
            { operacion, status }
          );
          break;

        case 409:
          contratoError = new ContratoError(
            'CONFLICT_ERROR',
            body?.error || 'Ya existe un contrato activo con este nutriólogo',
            { operacion, status }
          );
          break;

        case 429:
          contratoError = new ContratoError(
            'RATE_LIMIT_ERROR',
            'Demasiadas solicitudes. Intenta más tarde.',
            { operacion, status }
          );
          break;

        case 500:
        case 502:
        case 503:
          contratoError = new ContratoError(
            'SERVER_ERROR',
            'Error en el servidor. Intenta más tarde.',
            { operacion, status }
          );
          break;

        default:
          contratoError = new ContratoError(
            'UNKNOWN_ERROR',
            `Error desconocido (${status}). Por favor intenta nuevamente.`,
            { operacion, status, body }
          );
      }
    }

    console.error('❌ Error en ContratoService:', contratoError);
    this.errorSubject.next(contratoError);

    return throwError(() => contratoError);
  }

  /**
   * 🔍 Obtener último error
   */
  getUltimoError(): ContratoError | null {
    return this.errorSubject.value;
  }

  /**
   * 🧹 Limpiar errores
   */
  limpiarError(): void {
    this.errorSubject.next(null);
  }

  /**
   * 📊 Obtener estado actual
   */
  getEstadoProcesamiento(): boolean {
    return this.procesandoSubject.value;
  }
}
