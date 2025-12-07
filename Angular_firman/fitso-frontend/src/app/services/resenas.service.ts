import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * 📝 TIPOS PARA RESEÑAS
 */
export interface ResenaCreate {
  id_nutriologo: number;
  calificacion: number;
  titulo?: string;
  comentario?: string;
  id_contrato?: number;
}

export interface ResenaUpdate {
  calificacion?: number;
  titulo?: string;
  comentario?: string;
}

export interface Resena {
  id_resena: number;
  id_cliente: number;
  id_nutriologo: number;
  id_contrato?: number;
  calificacion: number;
  titulo?: string;
  comentario?: string;
  verificado: boolean;
  creado_en: string;
  actualizado_en: string;
  cliente_nombre?: string;
}

export interface ResenaStats {
  total_resenas: number;
  calificacion_promedio: number;
  distribucion_calificaciones?: {
    [key: number]: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ResenaService {
  private apiUrl = 'http://localhost:8000/api/resenas';
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  constructor() {
    console.log('✅ ResenaService inicializado');
  }

  /**
   * 🔐 OBTENER HEADERS CON TOKEN
   */
  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * ➕ CREAR RESEÑA
   */
  crear(payload: {
    id_nutriologo: number;
    calificacion: number;
    titulo?: string;
    comentario?: string;
    id_contrato?: number;
  }): Observable<any> {
    const headers = this.getHeaders();
    console.log('📝 POST', this.apiUrl, payload);
    return this.http.post(`${this.apiUrl}`, payload, { headers });
  }

  /**
   * 📖 OBTENER DETALLE DE UNA RESEÑA
   */
  obtener(resenaId: number): Observable<any> {
    const url = `${this.apiUrl}/${resenaId}`;
    console.log('📖 GET', url);
    return this.http.get(url);
  }

  /**
   * 📋 LISTAR RESEÑAS DE UN NUTRIÓLOGO (SIN FILTRO DE VERIFICACIÓN)
   */
  listarPorNutriologoTodas(
    nutriologoId: number,
    limit: number = 20,
    offset: number = 0
  ): Observable<any[]> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    const url = `${this.apiUrl}/nutriologo/${nutriologoId}`;
    console.log('📋 GET', url, { limit, offset });
    return this.http.get<any[]>(url, { params });
  }

  /**
   * ✅ LISTAR RESEÑAS DE UN NUTRIÓLOGO (SOLO VERIFICADAS)
   */
  listarPorNutriologoVerificadas(
    nutriologoId: number,
    soloVerificadas: boolean = true,
    limit: number = 20,
    offset: number = 0
  ): Observable<any[]> {
    let params = new HttpParams()
      .set('solo_verificadas', soloVerificadas.toString())
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    const url = `${this.apiUrl}/nutriologo/${nutriologoId}`;
    console.log('📋 GET', url, { soloVerificadas, limit, offset });
    return this.http.get<any[]>(url, { params });
  }

  /**
   * ✏️ ACTUALIZAR RESEÑA
   */
  actualizar(
    resenaId: number,
    payload: {
      calificacion?: number;
      titulo?: string;
      comentario?: string;
    }
  ): Observable<any> {
    const headers = this.getHeaders();
    const url = `${this.apiUrl}/${resenaId}`;
    console.log('✏️ PUT', url, payload);
    return this.http.put(url, payload, { headers });
  }

  /**
   * 🗑️ ELIMINAR RESEÑA
   */
  eliminar(resenaId: number): Observable<any> {
    const headers = this.getHeaders();
    const url = `${this.apiUrl}/${resenaId}`;
    console.log('🗑️ DELETE', url);
    return this.http.delete(url, { headers });
  }

  /**
   * 📊 OBTENER ESTADÍSTICAS DE UN NUTRIÓLOGO
   */
  obtenerStats(nutriologoId: number): Observable<any> {
    const url = `${this.apiUrl}/stats/nutriologo/${nutriologoId}`;
    console.log('📊 GET', url);
    return this.http.get(url);
  }

  /**
   * ⭐ OBTENER CALIFICACIÓN PROMEDIO
   */
  obtenerCalificacionPromedio(nutriologoId: number): Observable<number> {
    return new Observable(observer => {
      this.obtenerStats(nutriologoId).subscribe({
        next: (stats: any) => {
          observer.next(stats.calificacion_promedio || 0);
          observer.complete();
        },
        error: (err: any) => {
          console.error('❌ Error obteniendo promedio:', err);
          observer.next(0);
          observer.complete();
        }
      });
    });
  }

  /**
   * 🔢 OBTENER TOTAL DE RESEÑAS
   */
  obtenerTotal(nutriologoId: number): Observable<number> {
    return new Observable(observer => {
      this.obtenerStats(nutriologoId).subscribe({
        next: (stats: any) => {
          observer.next(stats.total_resenas || 0);
          observer.complete();
        },
        error: (err: any) => {
          console.error('❌ Error obteniendo total:', err);
          observer.next(0);
          observer.complete();
        }
      });
    });
  }
}