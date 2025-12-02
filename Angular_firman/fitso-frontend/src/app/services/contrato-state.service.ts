import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Contrato {
  id_contrato?: number;
  id_nutriologo: number;
  nutriologo_nombre: string;
  monto: number;
  duracion_meses: number;
  estado?: string;
  descripcion_servicios?: string;
  stripe_payment_intent_id?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContratoStateService {
  private contratoSubject = new BehaviorSubject<Contrato | null>(null);
  public contrato$ = this.contratoSubject.asObservable();

  constructor() {
    this.cargarDelStorage();
  }

  /**
   * Establece el contrato actual
   */
  setContrato(contrato: Contrato): void {
    console.log('📝 Estableciendo contrato:', contrato);
    this.contratoSubject.next(contrato);
    sessionStorage.setItem('contrato_data', JSON.stringify(contrato));
  }

  /**
   * Obtiene el contrato actual
   */
  getContrato(): Contrato | null {
    return this.contratoSubject.value;
  }

  /**
   * Obtiene el contrato como Observable
   */
  getContratoObservable(): Observable<Contrato | null> {
    return this.contrato$;
  }

  /**
   * Carga el contrato del storage
   */
  private cargarDelStorage(): void {
    try {
      const datos = sessionStorage.getItem('contrato_data');
      if (datos) {
        const contrato = JSON.parse(datos);
        this.contratoSubject.next(contrato);
        console.log('✅ Contrato cargado del storage:', contrato);
      }
    } catch (err) {
      console.error('❌ Error cargando contrato del storage:', err);
    }
  }

  /**
   * Limpia el contrato
   */
  clearContrato(): void {
    console.log('🗑️ Limpiando contrato');
    this.contratoSubject.next(null);
    sessionStorage.removeItem('contrato_data');
  }
}