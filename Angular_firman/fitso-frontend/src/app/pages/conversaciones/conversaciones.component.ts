import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MensajesService, Conversacion } from '../../services/mensajes.service';

@Component({
  selector: 'app-conversaciones',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="conversaciones-container">
      <div class="conversaciones-header">
        <h2>Mensajes</h2>
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
              <p class="hint">Inicia una conversación con un nutriólogo o cliente</p>
            </div>
          </ng-template>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      background: white !important;
      z-index: 10000 !important;
      position: relative !important;
      overflow: hidden !important;
    }

    .conversaciones-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: white !important;
      position: relative;
      z-index: 10000;
    }

    .conversaciones-header {
      padding: 20px;
      background: white !important;
      border-bottom: 1px solid #eee;
      flex-shrink: 0;
      position: relative;
      z-index: 10001;
    }

    .conversaciones-header h2 {
      margin: 0 0 5px 0;
      font-size: 24px;
      color: #333;
      font-weight: 600;
    }

    .subtitle {
      margin: 0;
      font-size: 14px;
      color: #999;
    }

    .conversaciones-list {
      flex: 1;
      overflow-y: auto;
      background: white !important;
      width: 100%;
      position: relative;
      z-index: 10000;
    }

    .conversacion-item {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      background: white !important;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .conversacion-item:hover {
      background: #f9f9f9 !important;
    }

    .conversacion-item.sin-leer {
      background: #fff8f0 !important;
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
      background: white !important;
    }

    .no-conversaciones p {
      margin: 5px 0;
    }

    .hint {
      font-size: 12px;
      color: #bbb !important;
    }

    /* NUCLEAR: Ocultar CUALQUIER overlay/modal que intente cubrirlo */
    ::ng-deep .overlay,
    ::ng-deep .modal,
    ::ng-deep .backdrop,
    ::ng-deep .mat-dialog-container,
    ::ng-deep .mat-dialog-backdrop {
      display: none !important;
      z-index: -9999 !important;
      visibility: hidden !important;
    }
  `]
})
export class ConversacionesComponent implements OnInit, OnDestroy {
  conversaciones$!: Observable<Conversacion[]>;

  constructor(
    private mensajesService: MensajesService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.conversaciones$ = this.mensajesService.conversaciones$;
  }

  ngOnInit(): void {
    // PASO 1: Cerrar TODOS los modales/overlays
    this.cerrarTodosLosModales();
    
    // PASO 2: Forzar recalc del DOM después de 100ms
    setTimeout(() => {
      this.cerrarTodosLosModales();
      this.cdr.detectChanges();
    }, 100);

    // PASO 3: Cargar conversaciones
    this.mensajesService.cargarConversaciones().subscribe({
      next: () => {
        this.cdr.markForCheck();
        this.cerrarTodosLosModales();
      },
      error: (err) => {
        console.error('Error cargando conversaciones:', err);
        this.cdr.markForCheck();
        this.cerrarTodosLosModales();
      }
    });
  }

  ngOnDestroy(): void {
    // Limpiar
  }

  private cerrarTodosLosModales(): void {
    try {
      // Selectors para buscar overlays
      const selectors = [
        '.overlay',
        '.modal',
        '.backdrop',
        '.mat-dialog-container',
        '.mat-dialog-backdrop',
        '[class*="overlay"]',
        '[class*="modal"]',
        '[class*="backdrop"]'
      ];

      selectors.forEach(selector => {
        const elementos = document.querySelectorAll(selector);
        elementos.forEach((el: Element) => {
          const html = el as HTMLElement;
          
          // Obtener el elemento
          const parentHeader = el.closest('.site-header');
          
          // Si NO está en el header, ocultarlo
          if (!parentHeader) {
            html.style.display = 'none !important';
            html.style.visibility = 'hidden';
            html.style.zIndex = '-9999';
            html.style.pointerEvents = 'none';
          }
        });
      });

      // Resetear body overflow
      document.body.style.overflow = 'auto';
      
      console.log('✅ Overlays cerrados correctamente');
    } catch (e) {
      console.error('Error cerrando overlays:', e);
    }
  }

  abrirConversacion(usuario_id: number): void {
    this.router.navigate(['/chat', usuario_id]);
  }
}