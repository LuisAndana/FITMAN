import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Resena {
  id_resena: number;
  id_cliente: number;
  id_nutriologo: number;
  calificacion: number;
  titulo?: string;
  comentario?: string;
  verificado: boolean;
  creado_en?: string;
  cliente_nombre?: string;
}

export interface ResenaStats {
  id_nutriologo: number;
  total_resenas: number;
  calificacion_promedio: number;
  distribucion_estrellas: {
    [key: string]: number; // "5": 10, "4": 8, etc.
  };
}

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

@Injectable({
  providedIn: 'root'
})
export class ResenaService {
  private apiUrl = '/api/resenas';

  constructor(private http: HttpClient) {}

  /**
   * Crear nueva reseña (cliente autenticado)
   */
  crear(payload: ResenaCreate): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, payload);
  }

  /**
   * Obtener reseñas de un nutriólogo
   */
  obtenerPorNutriologo(
    nutri_id: number,
    soloVerificadas: boolean = true,
    limit: number = 10,
    offset: number = 0
  ): Observable<Resena[]> {
    let params = new HttpParams()
      .set('solo_verificadas', soloVerificadas.toString())
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<Resena[]>(
      `${this.apiUrl}/nutriologo/${nutri_id}`,
      { params }
    );
  }

  /**
   * Obtener detalle de una reseña
   */
  obtener(resena_id: number): Observable<Resena> {
    return this.http.get<Resena>(`${this.apiUrl}/${resena_id}`);
  }

  /**
   * Actualizar una reseña
   */
  actualizar(resena_id: number, payload: ResenaUpdate): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${resena_id}`, payload);
  }

  /**
   * Eliminar una reseña
   */
  eliminar(resena_id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${resena_id}`);
  }

  /**
   * Obtener estadísticas de un nutriólogo
   */
  obtenerEstadisticas(nutri_id: number): Observable<ResenaStats> {
    return this.http.get<ResenaStats>(
      `${this.apiUrl}/stats/nutriologo/${nutri_id}`
    );
  }
}