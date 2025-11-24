// src/app/services/contrato.service.ts
// ===============================================
// Servicio para Contratos y Pagos Stripe
// ===============================================

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface PagoStripeRequest {
  id_nutriologo: number;
  monto: number;
  duracion_meses: number;
  descripcion_servicios?: string;
  usuario_id?: number;
  payment_method_id: string;
}

interface PaymentIntentResponse {
  exito: boolean;
  mensaje: string;
  contrato_id?: number;
  client_secret?: string;
  payment_intent_id?: string;
}

interface ContratoResponse {
  id_contrato: number;
  id_cliente: number;
  id_nutriologo: number;
  monto: number;
  estado: string;
  duracion_meses: number;
  fecha_inicio?: string;
  fecha_fin?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContratoService {
  private apiUrl = 'http://localhost:8000/api/contratos';

  constructor(private http: HttpClient) {}

  /**
   * Crea un PaymentIntent en Stripe
   */
  crearPaymentIntent(
    idNutriologo: number,
    monto: number,
    duracionMeses: number = 1,
    descripcion?: string
  ): Observable<PaymentIntentResponse> {
    // Obtener usuario_id del localStorage
    const usuarioId = parseInt(localStorage.getItem('usuarioId') || '0', 10);

    const payload: PagoStripeRequest = {
      id_nutriologo: idNutriologo,
      monto: monto,
      duracion_meses: duracionMeses,
      descripcion_servicios: descripcion,
      usuario_id: usuarioId,
      payment_method_id: "pm_temp"
    };

    return this.http.post<PaymentIntentResponse>(
      `${this.apiUrl}/crear-payment-intent`,
      payload
    );
  }

  /**
   * Confirma un pago exitoso
   */
  confirmarPago(paymentIntentId: string): Observable<PaymentIntentResponse> {
    const usuarioId = parseInt(localStorage.getItem('usuarioId') || '0', 10);

    return this.http.post<PaymentIntentResponse>(
      `${this.apiUrl}/confirmar-pago/${paymentIntentId}`,
      { usuario_id: usuarioId }
    );
  }

  /**
   * Obtiene los detalles de un contrato
   */
  obtenerContrato(contratoId: number): Observable<ContratoResponse> {
    const usuarioId = parseInt(localStorage.getItem('usuarioId') || '0', 10);

    return this.http.get<ContratoResponse>(
      `${this.apiUrl}/obtener/${contratoId}?usuario_id=${usuarioId}`
    );
  }

  /**
   * Lista los contratos del usuario actual
   */
  misContratos(): Observable<any> {
    const usuarioId = parseInt(localStorage.getItem('usuarioId') || '0', 10);

    return this.http.get<any>(
      `${this.apiUrl}/mis-contratos/${usuarioId}`
    );
  }
}