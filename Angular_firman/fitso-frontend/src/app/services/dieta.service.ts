import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Dieta {
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

export interface EstadoDietas {
  dietas_activas: number;
  dietas_vencidas: number;
  proxima_vencimiento?: string;
  dietas: Array<{
    id_dieta: number;
    nombre: string;
    dias_restantes: number;
    fecha_vencimiento: string;
    estado: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class DietaService {
  private http = inject(HttpClient);
  private baseUrl = 'http://127.0.0.1:8000';

  constructor() {}

  /**
   * ✅ OBTENER MIS DIETAS ASIGNADAS (solo activas)
   * GET /api/clientes/mis-dietas-asignadas
   */
  obtenerDietasAsignadas(): Observable<Dieta[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log('📋 Obteniendo mis dietas...');
    return this.http.get<Dieta[]>(
      `${this.baseUrl}/api/clientes/mis-dietas-asignadas`,
      { headers }
    );
  }

  /**
   * ✅ OBTENER UNA DIETA ESPECÍFICA
   * GET /api/clientes/dieta/{dieta_id}
   */
  obtenerDieta(dietaId: number): Observable<Dieta> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log(`📋 Obteniendo dieta ${dietaId}...`);
    return this.http.get<Dieta>(
      `${this.baseUrl}/api/clientes/dieta/${dietaId}`,
      { headers }
    );
  }

  /**
   * ✅ OBTENER ESTADO DE LAS DIETAS (activas, vencidas, proximas)
   * GET /api/clientes/dietas-estado
   */
  obtenerEstadoDietas(): Observable<EstadoDietas> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log('📊 Obteniendo estado de dietas...');
    return this.http.get<EstadoDietas>(
      `${this.baseUrl}/api/clientes/dietas-estado`,
      { headers }
    );
  }

  /**
   * ✅ OBTENER MIS DIETAS (todas)
   * GET /api/clientes/mis-dietas
   */
  obtenerMisDietas(): Observable<Dieta[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log('📋 Obteniendo todas mis dietas...');
    return this.http.get<Dieta[]>(
      `${this.baseUrl}/api/clientes/mis-dietas`,
      { headers }
    );
  }

  /**
   * ✅ ASIGNAR DIETA A CLIENTE (Nutriólogo)
   * POST /api/clientes/asignar-dieta
   */
  asignarDietaAlCliente(idDieta: number, idCliente: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log(`✅ Asignando dieta ${idDieta} al cliente ${idCliente}...`);
    return this.http.post(
      `${this.baseUrl}/api/clientes/asignar-dieta`,
      { id_dieta: idDieta, id_cliente: idCliente },
      { headers }
    );
  }

  /**
   * ✅ ACTUALIZAR DIETA CUANDO VENCE (Nutriólogo)
   * POST /api/clientes/actualizar-dieta-vencida
   */
  actualizarDietaVencida(request: {
    id_dieta_anterior: number;
    nombre_nueva: string;
    descripcion_nueva: string;
    calorias_nuevas: number;
    dias_duracion: number;
  }): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log(`🔄 Actualizando dieta ${request.id_dieta_anterior}...`);
    return this.http.post(
      `${this.baseUrl}/api/clientes/actualizar-dieta-vencida`,
      request,
      { headers }
    );
  }

  /**
   * ✅ DESCARGAR DIETA EN PDF (desde el backend)
   * GET /api/clientes/descargar-pdf/{dieta_id}
   */
  descargarDietaPDF(dietaId: number): Observable<Blob> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log(`📥 Intentando descargar PDF desde backend...`);
    return this.http.get(
      `${this.baseUrl}/api/clientes/descargar-pdf/${dietaId}`,
      {
        headers,
        responseType: 'blob'
      }
    );
  }
}