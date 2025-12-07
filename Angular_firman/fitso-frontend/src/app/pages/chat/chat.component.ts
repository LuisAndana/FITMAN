import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
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
              [class]="'mensaje ' + (esMensajePropio(mensaje) ? 'propio' : 'otro')"
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
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: white;
    }

    .chat-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: white;
      border-bottom: 1px solid #eee;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .btn-back {
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: #333;
      padding: 0;
      font-weight: 500;
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
    }

    .mensaje.propio {
      justify-content: flex-end;
    }

    .mensaje-contenido {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 8px;
      word-wrap: break-word;
    }

    .mensaje.propio .mensaje-contenido {
      background: #ff7a00;
      color: white;
      border-radius: 8px 0 8px 8px;
    }

    .mensaje.otro .mensaje-contenido {
      background: white;
      color: #333;
      border: 1px solid #eee;
      border-radius: 0 8px 8px 8px;
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

    .mensaje.propio .fecha {
      color: rgba(255,255,255,0.8);
    }

    .mensaje.otro .fecha {
      color: #999;
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
    }

    .btn-enviar:hover:not(:disabled) {
      background: #e66900;
    }

    .btn-enviar:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  `]
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('mensajesContainer') mensajesContainer!: ElementRef;

  conversacionActual$!: Observable<ConversacionDetalle | null>;
  nuevoMensaje: string = '';
  enviandoMensaje: boolean = false;
  usuarioIdActual: number = 0;
  usuarioIdConversacion: number = 0;
  private debeScrollear: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private mensajesService: MensajesService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    // Inicializar conversacionActual$ en el constructor después de inyectar el servicio
    this.conversacionActual$ = this.mensajesService.conversacionActual$;
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.usuarioIdConversacion = params['userId'];
      this.mensajesService.obtenerConversacion(this.usuarioIdConversacion).subscribe();
    });

    // Obtener ID del usuario actual del localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.usuarioIdActual = user.id;
      } catch (e) {
        console.error('Error al parsear usuario:', e);
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.debeScrollear) {
      this.scrollearAlFinal();
      this.debeScrollear = false;
    }
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
        this.nuevoMensaje = '';
        this.enviandoMensaje = false;
        this.debeScrollear = true;
        
        // Recargar conversación para obtener el nuevo mensaje
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
    return mensaje.remitente_id === this.usuarioIdActual;
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