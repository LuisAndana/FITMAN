import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NutriologosService {
  private http = inject(HttpClient);
  private base = 'http://127.0.0.1:8000'; // <-- ajusta si cambia

  list(params: { q?: string; page?: number; size?: number; order?: 'recientes'|'nombre'; solo_validados?: boolean } = {}): Observable<any> {
    let p = new HttpParams();
    if (params.q) p = p.set('q', params.q);
    if (params.page) p = p.set('page', params.page);
    if (params.size) p = p.set('size', params.size);
    if (params.order) p = p.set('order', params.order);
    if (params.solo_validados !== undefined) p = p.set('solo_validados', String(params.solo_validados));
    return this.http.get(`${this.base}/users/nutriologos`, { params: p });
    }
  getById(id: number): Observable<any> {
    return this.http.get(`${this.base}/users/nutriologos/${id}`);
  }
}
