import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl   = 'http://localhost:8000';
  private readonly tokenKey = 'auth_token';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ---------- Auth ----------
  register(userData: any, tipo: 'cliente' | 'nutriologo' = 'cliente'): Observable<any> {
    const base = this.apiUrl.replace(/\/+$/, '');
    const path = tipo === 'nutriologo' ? '/auth/register/nutriologo' : '/auth/register';
    return this.http.post(`${base}${path}`, userData);
  }

  login(credentials: { correo: string; contrasena: string }): Observable<any> {
    const base = this.apiUrl.replace(/\/+$/, '');
    return this.http.post(`${base}/auth/login`, credentials).pipe(
      map((res: any) => {
        const token = res?.access_token || res?.token || res?.jwt || null;
        if (!token) throw new Error('No se recibió token en la respuesta.');
        this.saveToken(token);

        const me = res?.usuario ?? res?.user ?? res?.me ?? res?.data ?? null;
        const id  = me?.id_usuario ?? me?.id ?? null;
        const rol = me?.tipo_usuario ?? null;
        const mail = me?.correo ?? me?.email ?? null;

        if (id)   localStorage.setItem('usuarioId', String(id));
        if (rol)  localStorage.setItem('tipoUsuario', String(rol));
        if (mail) localStorage.setItem('correoUsuario', String(mail));

        return res;
      }),
      tap(() => this.isAuthenticatedSubject.next(true))
    );
  }

  saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.isAuthenticatedSubject.next(true);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }

  isLoggedIn(): boolean {
    return this.hasToken();
  }

  getUserType(): 'cliente' | 'nutriologo' | null {
    const t = localStorage.getItem('tipoUsuario');
    return (t === 'cliente' || t === 'nutriologo') ? t : null;
  }
  isNutriologo(): boolean { return this.getUserType() === 'nutriologo'; }
  isCliente(): boolean { return this.getUserType() === 'cliente'; }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('usuarioId');
    localStorage.removeItem('tipoUsuario');
    localStorage.removeItem('correoUsuario');
    this.isAuthenticatedSubject.next(false);
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    });
  }

  // ---------- Usuarios ----------
  getCurrentUser(): Observable<any> {
    const base = this.apiUrl.replace(/\/+$/, '');
    return this.http.get(`${base}/auth/me`, { headers: this.getAuthHeaders() }).pipe(
      tap((me: any) => {
        const id  = me?.id_usuario ?? me?.id ?? null;
        const rol = me?.tipo_usuario ?? null;
        const mail = me?.correo ?? me?.email ?? null;

        if (id)   localStorage.setItem('usuarioId', String(id));
        if (rol)  localStorage.setItem('tipoUsuario', String(rol));
        if (mail) localStorage.setItem('correoUsuario', String(mail));
      })
    );
  }

  getUserById(id: string | number): Observable<any> {
    const base = this.apiUrl.replace(/\/+$/, '');
    return this.http.get(`${base}/users/${id}`, { headers: this.getAuthHeaders() });
  }

  updateUser(id: string | number, data: any): Observable<any> {
    const base = this.apiUrl.replace(/\/+$/, '');
    return this.http.put(`${base}/users/${id}`, data, { headers: this.getAuthHeaders() });
  }

  // ---------- Catálogo de enfermedades ----------
  getIllnessesCatalog(): Observable<string[]> {
    const base = this.apiUrl.replace(/\/+$/, '');
    return this.http.get<string[]>(`${base}/users/illnesses`, { headers: this.getAuthHeaders() });
  }

  // ---------- Progreso ----------
  getUserProgress(id: string | number): Observable<any> {
    const base = this.apiUrl.replace(/\/+$/, '');
    return this.http.get<any>(`${base}/users/${id}/progress`, { headers: this.getAuthHeaders() });
  }

  // ---------- Nutriólogo ----------
  getNutriMe(): Observable<any> {
    const base = this.apiUrl.replace(/\/+$/, '');
    return this.http.get(`${base}/nutriologos/me`, { headers: this.getAuthHeaders() });
  }

  getNutriClients(): Observable<any[]> {
    const base = this.apiUrl.replace(/\/+$/, '');
    return this.http.get<any[]>(`${base}/nutriologos/clients`, { headers: this.getAuthHeaders() });
  }

  getClientProgress(id: string | number): Observable<any> {
    const base = this.apiUrl.replace(/\/+$/, '');
    return this.http.get<any>(`${base}/nutriologos/clients/${id}/progress`, { headers: this.getAuthHeaders() });
  }

  // ---------- Validación de Nutriólogo: subir documento ----------
  uploadNutriDocumento(file: File): Observable<HttpEvent<any>> {
    const base = this.apiUrl.replace(/\/+$/, '');
    const form = new FormData();
    form.append('archivo', file); // cambia a 'file' si tu backend lo espera así

    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });

    const req = new HttpRequest('POST', `${base}/nutriologos/validacion`, form, {
      reportProgress: true,
      headers
    });

    return this.http.request(req);
  }
}
