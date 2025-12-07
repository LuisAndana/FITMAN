import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MensajesService, Conversacion } from '../../services/mensajes.service';
import { IniciarConversacionModalComponent } from '../../pages/iniciar-conversacion/iniciar-conversacion.component';

@Component({
  selector: 'app-conversaciones',
  standalone: true,
  imports: [CommonModule, IniciarConversacionModalComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <!-- MODAL: Iniciar Nueva Conversación -->
    <app-iniciar-conversacion-modal
      *ngIf="mostrarModalConversacion"
      (cerrarModal)="cerrarModal()">
    </app-iniciar-conversacion-modal>

    <div class="conversaciones-container">
      <div class="conversaciones-header">
        <div class="header-top">
          <h2>Mensajes</h2>
          <button class="btn-nueva-conversacion" (click)="abrirModalConversacion()">
            ➕ Nueva Conversación
          </button>
        </div>
        <p class="subtitle">Tus conversaciones</p>
      </div>
      <div class="conversaciones-list">
        <ng-container *ngIf="(conversaciones$ | async) as conversaciones">
          <ng-container *ngIf="conversaciones && conversaciones.length > 0; else noConversaciones">
            <div 
              *ngFor="let conversacion of conversaciones"
              class="conversacion-item"
              [class.sin-leer]="conversacion.mensajes_no_leidos > 0"
              (click)="abrirConversacion(conversacion.otro_usuario_id)"
            >
              <div class="conversacion-avatar">
                <img 
                  *ngIf="conversacion.otro_usuario_foto"
                  [src]="conversacion.otro_usuario_foto" 
                  [alt]="conversacion.otro_usuario_nombre"
                />
                <div *ngIf="!conversacion.otro_usuario_foto" class="avatar-placeholder">
                  {{ conversacion.otro_usuario_nombre?.charAt(0)?.toUpperCase() || 'U' }}
                </div>
                <span 
                  *ngIf="conversacion.mensajes_no_leidos && conversacion.mensajes_no_leidos > 0"
                  class="badge-no-leidos"
                >
                  {{ conversacion.mensajes_no_leidos }}
                </span>
              </div>
              <div class="conversacion-content">
                <div class="conversacion-header-row">
                  <h3 class="conversacion-nombre">
                    {{ conversacion.otro_usuario_nombre || 'Usuario' }}
                  </h3>
                  <span class="conversacion-tipo">
                    {{ conversacion.otro_usuario_tipo === 'nutriologo' ? '🥗' : '👤' }}
                  </span>
                </div>
                <p class="conversacion-mensaje">
                  {{ conversacion.ultimo_mensaje || 'Sin mensajes' }}
                </p>
                <span class="conversacion-fecha">
                  {{ conversacion.fecha_ultimo_mensaje | date: 'short' }}
                </span>
              </div>
            </div>
          </ng-container>
          <ng-template #noConversaciones>
            <div class="no-conversaciones">
              <p>No tienes conversaciones aún</p>
              <p class="hint">Haz clic en "➕ Nueva Conversación" para empezar a hablar</p>
            </div>
          </ng-template>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: auto;
      background: white;
    }

    .conversaciones-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: calc(100vh - 60px);
      background: white;
      overflow: hidden;
    }

    .conversaciones-header {
      padding: 20px;
      background: white;
      border-bottom: 1px solid #eee;
      flex-shrink: 0;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 5px;
    }

    .conversaciones-header h2 {
      margin: 0;
      font-size: 24px;
      color: #333;
      font-weight: 600;
    }

    .btn-nueva-conversacion {
      background: #ff7a00;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 14px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .btn-nueva-conversacion:hover {
      background: #e66900;
      transform: scale(1.05);
    }

    .btn-nueva-conversacion:active {
      transform: scale(0.98);
    }

    .subtitle {
      margin: 0;
      font-size: 14px;
      color: #999;
    }

    .conversaciones-list {
      flex: 1;
      overflow-y: auto;
      background: white;
      width: 100%;
    }

    .conversacion-item {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      background: white;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .conversacion-item:hover {
      background: #f9f9f9;
    }

    .conversacion-item.sin-leer {
      background: #fff8f0;
      border-left: 3px solid #ff7a00;
      padding-left: 13px;
    }

    .conversacion-avatar {
      position: relative;
      flex-shrink: 0;
      width: 50px;
      height: 50px;
    }

    .conversacion-avatar img,
    .avatar-placeholder {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      background: #ff7a00;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
    }

    .badge-no-leidos {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #ff7a00;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      border: 2px solid white;
    }

    .conversacion-content {
      flex: 1;
      min-width: 0;
    }

    .conversacion-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .conversacion-nombre {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }

    .conversacion-tipo {
      font-size: 14px;
    }

    .conversacion-mensaje {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conversacion-fecha {
      font-size: 12px;
      color: #999;
    }

    .no-conversaciones {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: #999;
      text-align: center;
      background: white;
    }

    .no-conversaciones p {
      margin: 5px 0;
    }

    .hint {
      font-size: 12px;
      color: #bbb;
    }

    @media (max-width: 768px) {
      .header-top {
        flex-direction: column;
        align-items: flex-start;
      }

      .btn-nueva-conversacion {
        width: 100%;
        padding: 10px;
        text-align: center;
      }
    }
  `]
})
export class ConversacionesComponent implements OnInit, OnDestroy {
  conversaciones$!: Observable<Conversacion[]>;
  mostrarModalConversacion = false;

  constructor(
    private mensajesService: MensajesService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.conversaciones$ = this.mensajesService.conversaciones$;
  }

  ngOnInit(): void {
    this.mensajesService.cargarConversaciones().subscribe({
      next: () => {
        console.log('✅ Conversaciones cargadas');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('❌ Error cargando conversaciones:', err);
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    // Limpiar
  }

  /**
   * 📱 Abrir modal de nueva conversación
   */
  abrirModalConversacion(): void {
    console.log('📱 Abriendo modal de nuevas conversaciones');
    this.mostrarModalConversacion = true;
  }

  /**
   * ✖️ Cerrar modal
   */
  cerrarModal(): void {
    console.log('✖️ Cerrando modal desde componente padre');
    this.mostrarModalConversacion = false;
    this.cdr.markForCheck();
  }

  /**
   * 💬 Abrir una conversación existente
   */
  abrirConversacion(usuario_id: number): void {
    console.log(`💬 Abriendo conversación con usuario ${usuario_id}`);
    this.router.navigate(['/chat', usuario_id]);
  }
}