import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

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

  constructor(private http: HttpClient) {
    // Obtener la URL de la API - Prioridad: 1) localStorage, 2) window, 3) valor por defecto
    this.apiUrl = this.obtenerApiUrl();
    this.iniciarPollMensajes();
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
    }).pipe(
      tap(() => {
        // Recargar conversaciones después de enviar
        this.cargarConversaciones();
      }),
      catchError(error => {
        console.error('Error al enviar mensaje:', error);
        throw error;
      })
    );
  }

  /**
   * Obtener lista de conversaciones
   */
  cargarConversaciones(): Observable<Conversacion[]> {
    return this.http.get<Conversacion[]>(`${this.apiUrl}/conversaciones`).pipe(
      tap(conversaciones => {
        this.conversacionesSubject.next(conversaciones);
      }),
      catchError(error => {
        console.error('Error al cargar conversaciones:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener conversación detallada con otro usuario
   */
  obtenerConversacion(usuario_id: number): Observable<ConversacionDetalle> {
    return this.http.get<ConversacionDetalle>(`${this.apiUrl}/conversacion/${usuario_id}`).pipe(
      tap(conversacion => {
        this.conversacionActualSubject.next(conversacion);
      }),
      catchError(error => {
        console.error('Error al obtener conversación:', error);
        throw error;
      })
    );
  }

  /**
   * Marcar mensaje como leído
   */
  marcarComoLeido(mensaje_id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/marcar-leido/${mensaje_id}`, {}).pipe(
      tap(() => {
        // Actualizar conversaciones después de marcar como leído
        this.cargarConversaciones();
      }),
      catchError(error => {
        console.error('Error al marcar como leído:', error);
        return of(null);
      })
    );
  }

  /**
   * Obtener cantidad de mensajes no leídos
   */
  cargarMensajesNoLeidos(): Observable<number> {
    return this.http.get<{ mensajes_no_leidos: number }>(`${this.apiUrl}/no-leidos`).pipe(
      map(response => response.mensajes_no_leidos),
      tap(count => {
        this.mensajesNoLeidosSubject.next(count);
      }),
      catchError(error => {
        console.error('Error al cargar mensajes no leídos:', error);
        return of(0);
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