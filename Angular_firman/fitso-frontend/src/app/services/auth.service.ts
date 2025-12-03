import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  
  // ✅ URL BASE
  private baseUrl = 'http://127.0.0.1:8000';
  
  // ✅ Observable del usuario autenticado
  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();

  // ✅ Observable para estado de autenticación
  public isAuthenticated$ = new BehaviorSubject<boolean>(this.isAuthenticated());

  constructor() {
    this.validateTokenOnInit();
  }

  // ===============================
  // AUTENTICACIÓN BÁSICA
  // ===============================

  /**
   * ✅ REGISTRO DE CLIENTE
   * POST /api/auth/register
   */
  register(data: any, tipo?: string): Observable<any> {
    const url = `${this.baseUrl}/api/auth/register`;
    console.log('📡 POST', url);
    
    return this.http.post(url, data).pipe(
      tap((response: any) => {
        console.log('✅ Registro exitoso:', response);
      }),
      catchError((error) => {
        console.error('❌ Error en registro:', error);
        throw error;
      })
    );
  }

  /**
   * ✅ REGISTRO DE NUTRIÓLOGO
   * POST /api/auth/register/nutriologo
   */
  registerNutriologo(data: {
    nombre: string;
    correo: string;
    contrasena: string;
    profesion: string;
    numero_cedula: string;
  }): Observable<any> {
    const url = `${this.baseUrl}/api/auth/register/nutriologo`;
    console.log('📡 POST', url);
    
    return this.http.post(url, data).pipe(
      tap((response: any) => {
        console.log('✅ Registro nutriólogo exitoso:', response);
      }),
      catchError((error) => {
        console.error('❌ Error en registro nutriólogo:', error);
        throw error;
      })
    );
  }

  /**
   * ✅ LOGIN
   * POST /api/auth/login
   */
  login(credenciales: any): Observable<any>;
  login(correo: string, contrasena: string): Observable<any>;
  login(correoOrData: any, contrasena?: string): Observable<any> {
    const url = `${this.baseUrl}/api/auth/login`;
    console.log('📡 POST', url);
    
    // Soporta ambos formatos: login({correo, contrasena}) o login(correo, contrasena)
    const payload = typeof correoOrData === 'string' 
      ? { correo: correoOrData, contrasena }
      : correoOrData;
    
    return this.http.post(url, payload).pipe(
      tap((response: any) => {
        if (response?.access_token) {
          console.log('✅ Login exitoso');
          localStorage.setItem('token', response.access_token);
          localStorage.setItem('token_type', response.token_type || 'bearer');
          
          // Guardar datos del usuario
          if (response.usuario) {
            localStorage.setItem('usuarioId', String(response.usuario.id || response.usuario.id_usuario));
            localStorage.setItem('tipoUsuario', response.usuario.tipo_usuario);
            localStorage.setItem('correoUsuario', response.usuario.correo);
            localStorage.setItem('nombreUsuario', response.usuario.nombre);
            this.userSubject.next(response.usuario);
            this.isAuthenticated$.next(true);
          }
        }
      }),
      catchError((error) => {
        console.error('❌ Error en login:', error);
        throw error;
      })
    );
  }

  /**
   * ✅ VALIDAR TOKEN
   * POST /api/auth/validacion
   */
  validateToken(): Observable<any> {
    const token = this.getToken();
    
    if (!token) {
      console.warn('❌ No hay token para validar');
      return of(null);
    }

    const url = `${this.baseUrl}/api/auth/validacion`;
    
    console.log('📡 POST', url);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post(url, {}, { headers }).pipe(
      tap((response: any) => {
        console.log('✅ Token válido:', response);
        if (response?.usuario) {
          this.userSubject.next(response.usuario);
          this.isAuthenticated$.next(true);
        }
      }),
      catchError((error) => {
        console.error('❌ Error validando token:', error);
        this.logout();
        return of(null);
      })
    );
  }

  /**
   * ✅ OBTENER USUARIO ACTUAL
   * GET /api/users/me
   */
  getCurrentUser(): Observable<any> {
    const token = this.getToken();
    
    if (!token) {
      console.warn('❌ No hay token para obtener usuario');
      return of(null);
    }

    const url = `${this.baseUrl}/api/users/me`;
    
    console.log('📡 GET', url);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(url, { headers }).pipe(
      tap((response: any) => {
        console.log('✅ Usuario actual obtenido:', response);
        if (response) {
          this.userSubject.next(response);
          this.isAuthenticated$.next(true);
        }
      }),
      catchError((error) => {
        console.error('❌ Error obteniendo usuario actual:', error);
        return of(null);
      })
    );
  }

  /**
   * ✅ OBTENER USUARIO POR ID
   * GET /api/users/{id}
   */
  getUserById(id: number | string): Observable<any> {
    const token = this.getToken();
    
    const url = `${this.baseUrl}/api/users/${id}`;
    
    console.log('📡 GET', url);

    const headers = token ? new HttpHeaders({
      'Authorization': `Bearer ${token}`
    }) : undefined;

    return this.http.get(url, { headers }).pipe(
      tap((response: any) => {
        console.log('✅ Usuario cargado:', response);
      }),
      catchError((error) => {
        console.error('❌ Error obteniendo usuario:', error);
        throw error;
      })
    );
  }

  /**
   * ✅ ACTUALIZAR USUARIO
   * PUT /api/users/{id}
   */
  updateUser(id: number | string, data: any): Observable<any> {
    const token = this.getToken();
    
    const url = `${this.baseUrl}/api/users/${id}`;
    
    console.log('📡 PUT', url);
    console.log('   Datos:', data);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.put(url, data, { headers }).pipe(
      tap((response: any) => {
        console.log('✅ Usuario actualizado:', response);
      }),
      catchError((error) => {
        console.error('❌ Error actualizando usuario:', error);
        throw error;
      })
    );
  }

  /**
   * ✅ LOGOUT
   */
  logout(): void {
    console.log('🚪 Cerrando sesión...');
    localStorage.removeItem('token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('usuarioId');
    localStorage.removeItem('tipoUsuario');
    localStorage.removeItem('correoUsuario');
    localStorage.removeItem('nombreUsuario');
    this.userSubject.next(null);
    this.isAuthenticated$.next(false);
  }

  // ===============================
  // NUTRIÓLOGO - MÉTODOS ESPECÍFICOS
  // ===============================

  /**
   * ✅ OBTENER MIS DATOS DE NUTRIÓLOGO
   * GET /api/users/me (con autenticación)
   */
  getNutriMe(): Observable<any> {
    return this.getCurrentUser();
  }

  /**
   * ✅ OBTENER MIS CLIENTES (nutriólogo)
   * GET /api/clientes/mis-clientes
   */
  getNutriClients(): Observable<any> {
    const token = this.getToken();
    
    const url = `${this.baseUrl}/api/clientes/mis-clientes`;
    
    console.log('📡 GET', url);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(url, { headers }).pipe(
      tap((response: any) => {
        console.log('✅ Clientes obtenidos:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Error obteniendo clientes:', error);
        return of([]);
      })
    );
  }

  /**
   * ✅ SUBIR DOCUMENTO DE VALIDACIÓN
   * POST /api/users/nutriologos/validacion
   */
  uploadNutriDocumento(archivo: File): Observable<any> {
    const token = this.getToken();
    
    const url = `${this.baseUrl}/api/users/nutriologos/validacion`;
    
    console.log('📡 POST', url);
    console.log('   Archivo:', archivo.name);

    const formData = new FormData();
    formData.append('archivo', archivo);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post(url, formData, { 
      headers,
      reportProgress: true,
      observe: 'events'
    }).pipe(
      tap((response: any) => {
        if (response.status === 200) {
          console.log('✅ Documento subido:', response.body);
        }
      }),
      catchError((error) => {
        console.error('❌ Error subiendo documento:', error);
        throw error;
      })
    );
  }

  /**
   * ✅ OBTENER ESTADO DE VALIDACIÓN
   * GET /api/users/nutriologos/validacion
   */
  getNutriValidationStatus(): Observable<any> {
    const token = this.getToken();
    
    const url = `${this.baseUrl}/api/users/nutriologos/validacion`;
    
    console.log('📡 GET', url);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(url, { headers }).pipe(
      tap((response: any) => {
        console.log('✅ Estado de validación:', response);
      }),
      catchError((error) => {
        console.error('❌ Error obteniendo estado de validación:', error);
        return of(null);
      })
    );
  }

  /**
   * ✅ ELIMINAR DOCUMENTO DE VALIDACIÓN
   * DELETE /api/users/nutriologos/validacion
   */
  deleteNutriDocumento(): Observable<any> {
    const token = this.getToken();
    
    const url = `${this.baseUrl}/api/users/nutriologos/validacion`;
    
    console.log('📡 DELETE', url);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.delete(url, { headers }).pipe(
      tap((response: any) => {
        console.log('✅ Documento eliminado:', response);
      }),
      catchError((error) => {
        console.error('❌ Error eliminando documento:', error);
        throw error;
      })
    );
  }

  // ===============================
  // CLIENTE - MÉTODOS ESPECÍFICOS
  // ===============================

  /**
   * ✅ OBTENER PROGRESO DEL USUARIO
   * GET /api/clientes/mi-progreso/{id}
   */
  getUserProgress(id: number | string): Observable<any> {
    const token = this.getToken();
    
    const url = `${this.baseUrl}/api/clientes/mi-progreso/${id}`;
    
    console.log('📡 GET', url);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(url, { headers }).pipe(
      tap((response: any) => {
        console.log('✅ Progreso obtenido:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Error obteniendo progreso:', error);
        return of(null);
      })
    );
  }

  /**
   * ✅ OBTENER CATÁLOGO DE ENFERMEDADES
   * GET /api/catalogo/enfermedades
   */
  getIllnessesCatalog(): Observable<any[]> {
    const url = `${this.baseUrl}/api/catalogo/enfermedades`;
    
    console.log('📡 GET', url);

    return this.http.get<any[]>(url).pipe(
      tap((response: any) => {
        console.log('✅ Catálogo de enfermedades obtenido:', response);
      }),
      catchError((error) => {
        console.error('❌ Error obteniendo catálogo:', error);
        return of([]);
      })
    );
  }

  /**
   * ✅ OBTENER DIETAS DEL USUARIO
   * GET /api/clientes/mis-dietas
   */
  getUserDiets(): Observable<any[]> {
    const token = this.getToken();
    
    const url = `${this.baseUrl}/api/clientes/mis-dietas`;
    
    console.log('📡 GET', url);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any[]>(url, { headers }).pipe(
      tap((response: any) => {
        console.log('✅ Dietas obtenidas:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Error obteniendo dietas:', error);
        return of([]);
      })
    );
  }

  /**
   * ✅ GENERAR DIETA CON IA
   * POST /api/clientes/generar-dieta-ia
   */
  generateDietaIA(data: any): Observable<any> {
    const token = this.getToken();
    
    const url = `${this.baseUrl}/api/clientes/generar-dieta-ia`;
    
    console.log('📡 POST', url);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post(url, data, { headers }).pipe(
      tap((response: any) => {
        console.log('✅ Dieta generada:', response);
      }),
      catchError((error: any) => {
        console.error('❌ Error generando dieta:', error);
        throw error;
      })
    );
  }

  // ===============================
  // UTILIDADES
  // ===============================

  /**
   * ✅ OBTENER TOKEN
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * ✅ OBTENER TIPO DE USUARIO
   */
  getTipoUsuario(): string | null {
    return localStorage.getItem('tipoUsuario');
  }

  /**
   * ✅ OBTENER TIPO DE USUARIO (alias)
   */
  getUserType(): string | null {
    return this.getTipoUsuario();
  }

  /**
   * ✅ VERIFICAR SI ESTÁ AUTENTICADO
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  }

  /**
   * ✅ ES NUTRIÓLOGO
   */
  esNutriologo(): boolean {
    return this.getTipoUsuario() === 'nutriologo';
  }

  /**
   * ✅ ES CLIENTE
   */
  esCliente(): boolean {
    return this.getTipoUsuario() === 'cliente';
  }

  /**
   * ✅ VALIDAR TOKEN AL INICIALIZAR
   */
  private validateTokenOnInit(): void {
    const token = this.getToken();
    
    if (token) {
      console.log('🔐 Validando token al inicializar...');
      this.validateToken().subscribe();
    }
  }

  /**
   * ✅ OBTENER ID DE USUARIO ACTUAL
   */
  getUserId(): number | null {
    const id = localStorage.getItem('usuarioId');
    return id ? parseInt(id, 10) : null;
  }

  /**
   * ✅ OBTENER CORREO DE USUARIO
   */
  getUserEmail(): string | null {
    return localStorage.getItem('correoUsuario');
  }

  /**
   * ✅ OBTENER NOMBRE DE USUARIO
   */
  getUserName(): string | null {
    return localStorage.getItem('nombreUsuario');
  }
}