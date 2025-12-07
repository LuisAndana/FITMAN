import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from './auth.service';

export interface Mensaje {
  id: number;
  remitente_id: number;
  destinatario_id: number;
  contenido: string;
  leido: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface Conversacion {
  otro_usuario_id: number;
  otro_usuario_nombre: string;
  otro_usuario_foto?: string;
  otro_usuario_tipo: string;
  ultimo_mensaje?: string;
  fecha_ultimo_mensaje?: string;
  mensajes_no_leidos: number;
}

export interface ConversacionDetalle {
  otro_usuario_id: number;
  otro_usuario_nombre: string;
  otro_usuario_foto?: string;
  otro_usuario_tipo: string;
  mensajes: Mensaje[];
}

@Injectable({
  providedIn: 'root'
})
export class MensajesService {
  // API URL - Se obtiene dinámicamente sin depender de environment
  private apiUrl: string;
  private conversacionesSubject = new BehaviorSubject<Conversacion[]>([]);
  private conversacionActualSubject = new BehaviorSubject<ConversacionDetalle | null>(null);
  private mensajesNoLeidosSubject = new BehaviorSubject<number>(0);

  public conversaciones$ = this.conversacionesSubject.asObservable();
  public conversacionActual$ = this.conversacionActualSubject.asObservable();
  public mensajesNoLeidos$ = this.mensajesNoLeidosSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Obtener la URL de la API - Prioridad: 1) localStorage, 2) window, 3) valor por defecto
    this.apiUrl = this.obtenerApiUrl();
    this.iniciarPollMensajes();
  }

  /**
   * 🔐 OBTENER HEADERS CON TOKEN
   */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('⚠️  No hay token disponible para autenticación');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Obtener URL de la API dinámicamente
   * Busca en: localStorage → window.location → valor por defecto
   */
  private obtenerApiUrl(): string {
    // 1. Intentar obtener de localStorage (configurado en login si es necesario)
    const apiUrlLocal = localStorage.getItem('apiUrl');
    if (apiUrlLocal) {
      return `${apiUrlLocal}/mensajes`;
    }

    // 2. Construir dinámicamente basado en el dominio actual
    const protocolo = window.location.protocol; // http: o https:
    const host = window.location.hostname;
    const puerto = window.location.port ? `:${window.location.port}` : '';
    
    // Si estamos en desarrollo (localhost:4200), usar puerto 8000 para backend
    if (host === 'localhost' && window.location.port === '4200') {
      return 'http://localhost:8000/api/mensajes';
    }

    // 3. Valor por defecto: mismo dominio, puerto /api
    const apiBase = `${protocolo}//${host}${puerto}/api`;
    return `${apiBase}/mensajes`;
  }

  /**
   * Configurar URL de la API (útil para cambios dinámicos)
   * Ejemplo: service.configurarApiUrl('http://api.tudominio.com/api')
   */
  public configurarApiUrl(url: string): void {
    this.apiUrl = `${url}/mensajes`;
    localStorage.setItem('apiUrl', url);
  }

  /**
   * Enviar un mensaje
   */
  enviarMensaje(destinatario_id: number, contenido: string): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.apiUrl}/enviar`, {
      destinatario_id,
      contenido
    }, { headers: this.getHeaders() }).pipe(
      tap(() => {
        console.log('✅ Mensaje enviado');
        // Recargar conversaciones después de enviar
        this.cargarConversaciones().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error al enviar mensaje:', error);
        throw error;
      })
    );
  }

  /**
   * Obtener lista de conversaciones
   */
  cargarConversaciones(): Observable<Conversacion[]> {
    console.log('📋 Cargando conversaciones...');
    return this.http.get<Conversacion[]>(`${this.apiUrl}/conversaciones`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(conversaciones => {
        console.log(`✅ ${conversaciones.length} conversaciones cargadas`);
        this.conversacionesSubject.next(conversaciones);
      }),
      catchError(error => {
        console.error('❌ Error al cargar conversaciones:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener conversación detallada con otro usuario
   */
  obtenerConversacion(usuario_id: number): Observable<ConversacionDetalle> {
    console.log(`💬 Cargando conversación con usuario ${usuario_id}...`);
    return this.http.get<ConversacionDetalle>(`${this.apiUrl}/chat/${usuario_id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(conversacion => {
        console.log(`✅ Conversación cargada con ${conversacion.mensajes.length} mensajes`);
        this.conversacionActualSubject.next(conversacion);
      }),
      catchError(error => {
        console.error('❌ Error al obtener conversación:', error);
        throw error;
      })
    );
  }

  /**
   * Marcar mensaje como leído
   */
  marcarComoLeido(mensaje_id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${mensaje_id}/marcar-leido`, {}, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(() => {
        console.log(`✅ Mensaje ${mensaje_id} marcado como leído`);
        // Actualizar conversaciones después de marcar como leído
        this.cargarConversaciones().subscribe();
      }),
      catchError(error => {
        console.error('❌ Error al marcar como leído:', error);
        return of(null);
      })
    );
  }

  /**
   * Obtener cantidad de mensajes no leídos
   */
  cargarMensajesNoLeidos(): Observable<{ no_leidos: number; conversaciones_no_leidas: number }> {
    return this.http.get<{ no_leidos: number; conversaciones_no_leidas: number }>(
      `${this.apiUrl}/no-leidos`, 
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log(`📬 ${response.no_leidos} mensajes no leídos`);
        this.mensajesNoLeidosSubject.next(response.no_leidos);
      }),
      catchError(error => {
        console.error('❌ Error al cargar mensajes no leídos:', error);
        return of({ no_leidos: 0, conversaciones_no_leidas: 0 });
      })
    );
  }

  /**
   * Iniciar polling para actualizar mensajes cada 5 segundos
   */
  private iniciarPollMensajes(): void {
    // Esperar 2 segundos antes de iniciar el polling para asegurar autenticación
    setTimeout(() => {
      interval(5000).pipe(
        switchMap(() => this.cargarMensajesNoLeidos())
      ).subscribe();
    }, 2000);
  }

  /**
   * Obtener conversación actual
   */
  obtenerConversacionActual(): ConversacionDetalle | null {
    return this.conversacionActualSubject.value;
  }

  /**
   * Obtener conversaciones en caché
   */
  obtenerConversacionesEnCache(): Conversacion[] {
    return this.conversacionesSubject.value;
  }
}