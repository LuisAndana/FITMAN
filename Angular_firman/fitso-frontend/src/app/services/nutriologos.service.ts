import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Nutriologo {
  id_usuario: number;
  nombre: string;
  correo: string;
  email?: string;
  foto?: string;
  validado: boolean;
  descripcion: string;
  experiencia_anos: number;
  precio_por_mes: number;
  especialidades: string[];
  certificaciones: string[];
  es_nutriologo: boolean;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page?: number;
  size?: number;
  pages?: number;
}

@Injectable({ providedIn: 'root' })
export class NutriologosService {
  private http = inject(HttpClient);
  private base = 'http://127.0.0.1:8000/api';

  /**
   * Lista nutriólogos con filtros y paginación
   */
  list(params: {
    q?: string;
    page?: number;
    size?: number;
    order?: 'recientes' | 'nombre';
    solo_validados?: boolean;
  } = {}): Observable<ListResponse<Nutriologo>> {
    let p = new HttpParams();
    if (params.q) p = p.set('q', params.q);
    if (params.page) p = p.set('page', params.page?.toString() || '1');
    if (params.size) p = p.set('size', params.size?.toString() || '12');
    if (params.order) p = p.set('order', params.order);
    if (params.solo_validados !== undefined) p = p.set('solo_validados', String(params.solo_validados));

    return this.http.get<ListResponse<Nutriologo>>(`${this.base}/users/nutriologos/lista`, { params: p })
      .pipe(
        catchError(error => {
          console.error('Error al listar nutriólogos:', error);
          return of({ items: [], total: 0 });
        })
      );
  }

  /**
   * Obtiene un nutriólogo específico por ID
   */
  getById(id: number): Observable<Nutriologo> {
    return this.http.get<Nutriologo>(`${this.base}/users/${id}`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener nutriólogo:', error);
          return of(this.getDatosSimulados(id));
        })
      );
  }

  /**
   * Obtiene el perfil del nutriólogo actual
   */
  getProfile(): Observable<Nutriologo> {
    return this.http.get<Nutriologo>(`${this.base}/users/profile`)
      .pipe(
        catchError(error => {
          console.error('Error al obtener perfil:', error);
          return of();
        })
      );
  }

  /**
   * Actualiza el perfil del nutriólogo
   */
  updateProfile(datos: Partial<Nutriologo>): Observable<Nutriologo> {
    return this.http.put<Nutriologo>(`${this.base}/users/profile`, datos)
      .pipe(
        catchError(error => {
          console.error('Error al actualizar perfil:', error);
          throw error;
        })
      );
  }

  /**
   * Busca nutriólogos por nombre o descripción
   */
  search(query: string): Observable<ListResponse<Nutriologo>> {
    return this.list({
      q: query,
      page: 1,
      size: 20,
      solo_validados: true
    });
  }

  /**
   * Obtiene nutriólogos ordenados por nombre
   */
  listByName(page: number = 1, size: number = 12): Observable<ListResponse<Nutriologo>> {
    return this.list({
      page,
      size,
      order: 'nombre',
      solo_validados: true
    });
  }

  /**
   * Obtiene nutriólogos recientes
   */
  listRecent(page: number = 1, size: number = 12): Observable<ListResponse<Nutriologo>> {
    return this.list({
      page,
      size,
      order: 'recientes',
      solo_validados: true
    });
  }

  /**
   * Obtiene nutriólogos con especialidad
   */
  listBySpecialty(specialty: string, page: number = 1, size: number = 12): Observable<ListResponse<Nutriologo>> {
    return this.list({
      q: specialty,
      page,
      size,
      solo_validados: true
    });
  }

  /**
   * Datos simulados como fallback
   */
  private getDatosSimulados(id: number): Nutriologo {
    return {
      id_usuario: id,
      nombre: 'Dr. Juan Pérez',
      correo: 'juan@example.com',
      email: 'juan@example.com',
      foto: 'assets/default-avatar.jpg',
      validado: true,
      descripcion: 'Especialista en nutrición deportiva con 10 años de experiencia. Ayudo a mis clientes a alcanzar sus objetivos de salud mediante planes personalizados y seguimiento constante.',
      experiencia_anos: 10,
      precio_por_mes: 150,
      especialidades: [
        'Nutrición deportiva',
        'Pérdida de peso',
        'Nutrición clínica'
      ],
      certificaciones: [
        'Licenciado en Nutrición',
        'Especialista en Nutrición Deportiva',
        'Certificación Internacional de Nutricionista'
      ],
      es_nutriologo: true
    };
  }
}