import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

// ============================================
// TIPOS/INTERFACES
// ============================================
export interface Nutriologo {
  id_usuario: number;
  nombre?: string;
  correo?: string;
  email?: string;
  foto?: string;
  validado: boolean;
  descripcion?: string;
  experiencia_anos?: number;
  precio_por_mes?: number;
  especialidades?: string[];
  certificaciones?: string[];
  es_nutriologo?: boolean;
  profesion?: string;
  numero_cedula_mask?: string;
}

export interface ListResponse<T = any> {
  items: T[];
  total: number;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class NutriologosService {
  private http = inject(HttpClient);
  
  // ✅ URL BASE CORRECTA - Incluir /api
  private base = 'http://127.0.0.1:8000/api';

  /**
   * ✅ LISTA NUTRIÓLOGOS CON FILTROS Y PAGINACIÓN
   * Endpoint correcto: GET /api/users/nutriologos
   * (Sin /lista al final - ✅ CAMBIO IMPORTANTE)
   */
  list(params: { 
    q?: string; 
    page?: number; 
    size?: number; 
    order?: 'recientes' | 'nombre'; 
    solo_validados?: boolean 
  } = {}): Observable<ListResponse<Nutriologo>> {
    
    let p = new HttpParams();
    if (params.q) p = p.set('q', params.q);
    if (params.page) p = p.set('page', String(params.page || 1));
    if (params.size) p = p.set('size', String(params.size || 12));
    if (params.order) p = p.set('order', params.order);
    if (params.solo_validados !== undefined) p = p.set('solo_validados', String(params.solo_validados));

    const url = `${this.base}/users/nutriologos`; // ✅ SIN /lista
    
    console.log('📡 GET', url);
    console.log('   Params:', { 
      q: params.q, 
      page: params.page || 1, 
      size: params.size || 12, 
      order: params.order,
      solo_validados: params.solo_validados
    });

    return this.http.get<ListResponse<Nutriologo>>(url, { params: p })
      .pipe(
        tap((response) => {
          console.log('✅ Lista recibida:', `${response.items?.length || 0} nutriólogos de ${response.total || 0}`);
        }),
        catchError((error) => {
          console.error('❌ Error al listar nutriólogos:', error);
          return of({ 
            items: [], 
            total: 0, 
            page: params.page || 1, 
            size: params.size || 12 
          });
        })
      );
  }

  /**
   * ✅ OBTENER NUTRIÓLOGO POR ID
   * Endpoint: GET /api/users/{id}
   */
  getById(id: number): Observable<Nutriologo> {
    const url = `${this.base}/users/${id}`;
    
    console.log('📡 GET', url);

    return this.http.get<Nutriologo>(url)
      .pipe(
        tap((response) => {
          console.log('✅ Nutriólogo cargado:', response.nombre || 'Sin nombre');
        }),
        catchError((error) => {
          console.error('❌ Error al obtener nutriólogo:', error);
          // Retornar un objeto con estructura mínima
          return of({
            id_usuario: id,
            nombre: 'Nutriólogo',
            validado: false
          } as Nutriologo);
        })
      );
  }

  /**
   * 🔍 BUSCAR NUTRIÓLOGOS
   */
  search(query: string): Observable<ListResponse<Nutriologo>> {
    console.log('🔍 Buscando:', query);
    return this.list({
      q: query,
      page: 1,
      size: 20,
      solo_validados: true
    });
  }

  /**
   * 📋 LISTAR POR NOMBRE
   */
  listByName(page: number = 1, size: number = 12): Observable<ListResponse<Nutriologo>> {
    console.log('📋 Listando por nombre, página:', page);
    return this.list({
      page,
      size,
      order: 'nombre',
      solo_validados: true
    });
  }

  /**
   * ⏰ LISTAR RECIENTES
   */
  listRecent(page: number = 1, size: number = 12): Observable<ListResponse<Nutriologo>> {
    console.log('⏰ Listando recientes, página:', page);
    return this.list({
      page,
      size,
      order: 'recientes',
      solo_validados: true
    });
  }
}