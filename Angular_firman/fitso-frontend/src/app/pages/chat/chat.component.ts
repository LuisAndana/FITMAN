import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MensajesService, ConversacionDetalle } from '../../services/mensajes.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="chat-container">
      <!-- Header del chat -->
      <div class="chat-header">
        <button class="btn-back" (click)="volverAConversaciones()">
          ← Atrás
        </button>
        <div class="header-info">
          <h2>{{ (conversacionActual$ | async)?.otro_usuario_nombre || 'Cargando...' }}</h2>
          <span class="tipo-usuario">
            {{ (conversacionActual$ | async)?.otro_usuario_tipo === 'nutriologo' ? '🥗 Nutriólogo' : '👤 Cliente' }}
          </span>
        </div>
      </div>



      <!-- Área de mensajes -->
      <div class="mensajes-area" #mensajesContainer>
        <ng-container *ngIf="(conversacionActual$ | async) as conversacion">
          <ng-container *ngIf="conversacion.mensajes && conversacion.mensajes.length > 0; else noMensajes">
            <div 
              *ngFor="let mensaje of conversacion.mensajes"
              [ngClass]="esMensajePropio(mensaje) ? 'mensaje propio' : 'mensaje otro'"
            >
              <div class="mensaje-contenido">
                <p class="texto">{{ mensaje.contenido }}</p>
                <span class="fecha">{{ mensaje.fecha_creacion | date: 'short' }}</span>
              </div>
              <span *ngIf="!esMensajePropio(mensaje) && !mensaje.leido" class="indicador-no-leido">●</span>
            </div>
          </ng-container>

          <ng-template #noMensajes>
            <div class="no-mensajes">
              <p>No hay mensajes aún. ¡Inicia la conversación!</p>
            </div>
          </ng-template>
        </ng-container>
      </div>

      <!-- Input de mensaje -->
      <div class="chat-input-area">
        <form (ngSubmit)="enviarMensaje()" #formMensaje="ngForm">
          <input
            type="text"
            [(ngModel)]="nuevoMensaje"
            name="nuevoMensaje"
            placeholder="Escribe un mensaje..."
            class="input-mensaje"
            (keydown.enter)="enviarMensaje()"
          />
          <button 
            type="submit" 
            class="btn-enviar"
            [disabled]="!nuevoMensaje.trim() || enviandoMensaje"
          >
            {{ enviandoMensaje ? 'Enviando...' : 'Enviar' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }

    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: white;
      overflow: hidden;
    }

    .chat-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: white;
      border-bottom: 1px solid #eee;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      flex-shrink: 0;
    }

    .btn-back {
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: #333;
      padding: 0;
      font-weight: 500;
      min-width: 60px;
      text-align: left;
    }

    .btn-back:hover {
      color: #ff7a00;
    }

    .header-info {
      flex: 1;
    }

    .header-info h2 {
      margin: 0;
      font-size: 18px;
      color: #333;
    }

    .tipo-usuario {
      font-size: 12px;
      color: #999;
    }

    .mensajes-area {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #f9f9f9;
    }

    .mensaje {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* MENSAJES PROPIOS - A LA DERECHA EN NARANJA */
    .mensaje.propio {
      justify-content: flex-end;
    }

    .mensaje.propio .mensaje-contenido {
      background: #ff7a00 !important;
      color: white !important;
      border-radius: 8px 0 8px 8px;
      box-shadow: 0 2px 8px rgba(255, 122, 0, 0.3);
    }

    .mensaje.propio .fecha {
      color: rgba(255,255,255,0.8);
    }

    /* MENSAJES DEL OTRO - A LA IZQUIERDA EN GRIS */
    .mensaje.otro {
      justify-content: flex-start;
    }

    .mensaje.otro .mensaje-contenido {
      background: #e8e8e8 !important;
      color: #333 !important;
      border: 1px solid #d0d0d0;
      border-radius: 0 8px 8px 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .mensaje.otro .fecha {
      color: #999;
    }

    .mensaje-contenido {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 8px;
      word-wrap: break-word;
    }

    .texto {
      margin: 0 0 4px 0;
      font-size: 14px;
      line-height: 1.4;
    }

    .fecha {
      font-size: 11px;
      opacity: 0.7;
    }

    .indicador-no-leido {
      color: #ff7a00;
      font-size: 8px;
      margin-right: 8px;
    }

    .no-mensajes {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #999;
      text-align: center;
    }

    .chat-input-area {
      padding: 12px 16px;
      background: white;
      border-top: 1px solid #eee;
      flex-shrink: 0;
    }

    form {
      display: flex;
      gap: 8px;
    }

    .input-mensaje {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }

    .input-mensaje:focus {
      border-color: #ff7a00;
    }

    .btn-enviar {
      padding: 10px 20px;
      background: #ff7a00;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
      white-space: nowrap;
    }

    .btn-enviar:hover:not(:disabled) {
      background: #e66900;
    }

    .btn-enviar:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .mensaje-contenido {
        max-width: 85%;
      }
      
      .chat-header {
        padding: 12px;
      }

      .btn-back {
        min-width: 50px;
      }

      .header-info h2 {
        font-size: 16px;
      }
    }
  `]
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('mensajesContainer') mensajesContainer!: ElementRef;

  conversacionActual$!: Observable<ConversacionDetalle | null>;
  nuevoMensaje: string = '';
  enviandoMensaje: boolean = false;
  usuarioIdActual: number = 0;
  usuarioIdConversacion: number = 0;
  private debeScrollear: boolean = true;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private mensajesService: MensajesService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.conversacionActual$ = this.mensajesService.conversacionActual$;
  }

  ngOnInit(): void {
    console.clear();
    console.log('🔧 ============== INICIALIZANDO CHAT COMPONENT ==============');

    // PASO 1: Obtener usuario actual
    this.obtenerUsuarioActual();
    console.log(`✅ usuarioIdActual = ${this.usuarioIdActual}`);

    // PASO 2: Cargar conversación
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.usuarioIdConversacion = Number(params['userId']);
        console.log(`📞 usuarioIdConversacion = ${this.usuarioIdConversacion}`);
        console.log(`🔍 COMPARACIÓN: ${this.usuarioIdActual} (actual) vs ${this.usuarioIdConversacion} (conversación)`);
        
        this.mensajesService.obtenerConversacion(this.usuarioIdConversacion).subscribe({
          next: () => {
            console.log('✅ Conversación cargada correctamente');
            this.cdr.detectChanges();
          },
          error: (error) => console.error('❌ Error:', error)
        });
      });
  }

  private obtenerUsuarioActual(): void {
    let usuarioId: any = null;

    console.log('🔍 Buscando usuarioId en localStorage...');

    // OPCIÓN 1: localStorage['user'].id
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          usuarioId = user.id;
          console.log(`✅ Encontrado en localStorage['user'].id = ${usuarioId}`);
        }
      }
    } catch (e) {
      console.warn('⚠️ Error en localStorage[user]');
    }

    // OPCIÓN 2: localStorage['currentUser'].id
    if (!usuarioId) {
      try {
        const currentUserStr = localStorage.getItem('currentUser');
        if (currentUserStr) {
          const user = JSON.parse(currentUserStr);
          if (user && user.id) {
            usuarioId = user.id;
            console.log(`✅ Encontrado en localStorage['currentUser'].id = ${usuarioId}`);
          }
        }
      } catch (e) {
        console.warn('⚠️ Error en localStorage[currentUser]');
      }
    }

    // OPCIÓN 3: localStorage['userId']
    if (!usuarioId) {
      const userIdDirect = localStorage.getItem('userId');
      if (userIdDirect) {
        usuarioId = userIdDirect;
        console.log(`✅ Encontrado en localStorage['userId'] = ${usuarioId}`);
      }
    }

    // OPCIÓN 4: DECODIFICAR JWT DEL TOKEN
    if (!usuarioId) {
      console.log('🔍 Intentando decodificar JWT...');
      const token = this.obtenerToken();
      if (token) {
        try {
          const decodedToken = this.decodeJwt(token);
          console.log('📋 JWT decodificado:', decodedToken);
          
          // Buscar el ID en diferentes campos del JWT
          usuarioId = decodedToken.sub || decodedToken.id || decodedToken.user_id || decodedToken.userId;
          if (usuarioId) {
            console.log(`✅ Encontrado en JWT.sub/id = ${usuarioId}`);
          }
        } catch (e) {
          console.warn('⚠️ Error decodificando JWT:', e);
        }
      }
    }

    // OPCIÓN 5: BUSCAR EN TODAS LAS CLAVES
    if (!usuarioId) {
      console.log('🔍 Buscando en todas las claves del localStorage...');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key || '');
        
        if (value && (key?.toLowerCase().includes('user') || key?.toLowerCase().includes('id'))) {
          console.log(`   Clave: ${key} = ${value.substring(0, 50)}`);
          
          try {
            const parsed = JSON.parse(value);
            if (parsed.id) {
              usuarioId = parsed.id;
              console.log(`✅ ID encontrado en ${key}.id = ${usuarioId}`);
              break;
            } else if (typeof parsed === 'number') {
              usuarioId = parsed;
              console.log(`✅ ID encontrado en ${key} = ${usuarioId}`);
              break;
            }
          } catch (e) {
            // No es JSON
          }
        }
      }
    }

    // RESULTADO FINAL
    if (usuarioId) {
      this.usuarioIdActual = Number(usuarioId);
      console.log(`🎯 ✅ ID DEFINITIVO DEL USUARIO: ${this.usuarioIdActual}`);
    } else {
      console.error('❌ NO SE PUDO OBTENER EL ID DEL USUARIO');
      console.log('📋 Claves disponibles en localStorage:');
      for (let i = 0; i < localStorage.length; i++) {
        console.log(`   - ${localStorage.key(i)}`);
      }
    }
  }

  private obtenerToken(): string | null {
    // Buscar en localStorage
    const tokenKeys = ['token', 'access_token', 'auth_token', 'jwt', 'authToken'];
    
    for (const key of tokenKeys) {
      const token = localStorage.getItem(key);
      if (token) {
        console.log(`✅ Token encontrado en localStorage['${key}']`);
        return token;
      }
    }

    // Buscar en sessionStorage
    for (const key of tokenKeys) {
      const token = sessionStorage.getItem(key);
      if (token) {
        console.log(`✅ Token encontrado en sessionStorage['${key}']`);
        return token;
      }
    }

    console.log('⚠️ No se encontró token');
    return null;
  }

  private decodeJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error decodificando JWT:', e);
      return null;
    }
  }

  ngAfterViewChecked(): void {
    if (this.debeScrollear) {
      this.scrollearAlFinal();
      this.debeScrollear = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  enviarMensaje(): void {
    if (!this.nuevoMensaje.trim()) {
      return;
    }

    this.enviandoMensaje = true;

    this.mensajesService.enviarMensaje(
      this.usuarioIdConversacion,
      this.nuevoMensaje
    ).subscribe({
      next: () => {
        console.log('✅ Mensaje enviado');
        this.nuevoMensaje = '';
        this.enviandoMensaje = false;
        this.debeScrollear = true;
        
        this.mensajesService.obtenerConversacion(this.usuarioIdConversacion).subscribe();
      },
      error: (error: any) => {
        console.error('Error al enviar mensaje:', error);
        this.enviandoMensaje = false;
        alert('Error al enviar el mensaje. Intenta de nuevo.');
      }
    });
  }

  esMensajePropio(mensaje: any): boolean {
    const remitente = Number(mensaje.remitente_id);
    const esPropio = remitente === this.usuarioIdActual;
    return esPropio;
  }

  volverAConversaciones(): void {
    this.router.navigate(['/mensajes']);
  }

  private scrollearAlFinal(): void {
    try {
      this.mensajesContainer.nativeElement.scrollTop = 
        this.mensajesContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error al scrollear:', err);
    }
  }
}