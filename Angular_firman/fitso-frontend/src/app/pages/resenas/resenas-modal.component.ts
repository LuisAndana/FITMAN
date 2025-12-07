import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResenaService } from '../../services/resenas.service';
import { ResenaFormComponent } from './resena-form.component';

@Component({
  selector: 'app-resena-modal',
  standalone: true,
  imports: [CommonModule, ResenaFormComponent],
  template: `
    <!-- OVERLAY SEMI-TRANSPARENTE -->
    <div *ngIf="isOpen" class="modal-overlay" (click)="close()"></div>

    <!-- MODAL -->
    <div *ngIf="isOpen" class="modal-container">
      <div class="modal-content">
        <!-- HEADER -->
        <div class="modal-header">
          <h2 class="modal-title">Reseñas y Calificaciones</h2>
          <button class="close-btn" (click)="close()" aria-label="Cerrar">✕</button>
        </div>

        <!-- DIVIDER -->
        <div class="modal-divider"></div>

        <!-- BODY -->
        <div class="modal-body">
          <!-- SI MOSTRAR FORMULARIO -->
          <div *ngIf="showForm" class="form-container">
            <app-resena-form 
              [nutriologoId]="nutriologoId"
              (onSuccess)="onResenaCreated()"
              (onCancel)="toggleForm()">
            </app-resena-form>
          </div>

          <!-- SI NO MOSTRAR FORMULARIO, MOSTRAR LISTA -->
          <div *ngIf="!showForm" class="resenas-container">
            <!-- LOADING -->
            <div *ngIf="loading" class="loading">
              <div class="spinner"></div>
              <p>Cargando reseñas...</p>
            </div>

            <!-- SIN RESEÑAS -->
            <div *ngIf="!loading && resenas.length === 0" class="empty-state">
              <div class="empty-icon">📝</div>
              <h3>Sin reseñas aún</h3>
              <p>Sé el primero en calificar a este nutriólogo</p>
            </div>

            <!-- ESTADÍSTICAS -->
            <div *ngIf="!loading && resenas.length > 0 && stats" class="stats-section">
              <div class="stats-header">
                <div class="rating-summary">
                  <div class="rating-big">{{ stats.calificacion_promedio }}</div>
                  <div class="stars">
                    <span *ngFor="let i of [1,2,3,4,5]" 
                          [class.filled]="i <= Math.round(stats.calificacion_promedio)">
                      ⭐
                    </span>
                  </div>
                  <div class="total">{{ stats.total_resenas }} reseñas</div>
                </div>
              </div>
            </div>

            <!-- LISTA DE RESEÑAS -->
            <div *ngIf="!loading && resenas.length > 0" class="resenas-list">
              <div *ngFor="let resena of resenas" class="resena-card">
                <!-- HEADER DE RESEÑA -->
                <div class="resena-header">
                  <div class="resena-author">
                    <div class="author-avatar">👤</div>
                    <div class="author-info">
                      <div class="author-name">{{ resena.cliente_nombre || 'Cliente anónimo' }}</div>
                      <div class="author-date">{{ resena.creado_en | date: 'short' }}</div>
                    </div>
                  </div>
                  <div class="resena-rating">
                    <span *ngFor="let i of [1,2,3,4,5]" 
                          [class.filled]="i <= Math.round(resena.calificacion)">
                      ⭐
                    </span>
                  </div>
                </div>

                <!-- TÍTULO -->
                <div *ngIf="resena.titulo" class="resena-titulo">
                  {{ resena.titulo }}
                </div>

                <!-- COMENTARIO -->
                <div *ngIf="resena.comentario" class="resena-comentario">
                  {{ resena.comentario }}
                </div>

                <!-- BADGE VERIFICADO -->
                <div *ngIf="resena.verificado" class="badge-verificado">
                  ✓ Compra verificada
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- DIVIDER -->
        <div class="modal-divider"></div>

        <!-- FOOTER -->
        <div class="modal-footer">
          <button 
            *ngIf="!showForm && resenas.length === 0"
            class="btn btn-primary"
            (click)="toggleForm()">
            Escribir reseña
          </button>
          <button 
            *ngIf="showForm"
            class="btn btn-secondary"
            (click)="toggleForm()">
            Volver
          </button>
          <button 
            class="btn btn-secondary"
            (click)="close()">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 999;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      width: 90%;
      max-width: 700px;
      max-height: 90vh;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        transform: translate(-50%, calc(-50% + 20px));
        opacity: 0;
      }
      to {
        transform: translate(-50%, -50%);
        opacity: 1;
      }
    }

    .modal-content {
      background: #1a1a1a;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      height: 100%;
      border: 1px solid #333;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    }

    .modal-header {
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .modal-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #fff;
      letter-spacing: 0.5px;
    }

    .close-btn {
      background: none;
      border: none;
      color: #999;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: rgba(255, 122, 0, 0.1);
      color: #ff7a00;
    }

    .modal-divider {
      height: 1px;
      background: #333;
      flex-shrink: 0;
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .modal-body::-webkit-scrollbar {
      width: 6px;
    }

    .modal-body::-webkit-scrollbar-track {
      background: #222;
    }

    .modal-body::-webkit-scrollbar-thumb {
      background: #555;
      border-radius: 3px;
    }

    .modal-body::-webkit-scrollbar-thumb:hover {
      background: #777;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      color: #999;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #333;
      border-top-color: #ff7a00;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      text-align: center;
      color: #999;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      color: #fff;
      font-size: 18px;
    }

    .empty-state p {
      margin: 0;
      color: #999;
      font-size: 14px;
    }

    .stats-section {
      background: #222;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid #333;
    }

    .stats-header {
      display: flex;
      justify-content: space-around;
      align-items: center;
    }

    .rating-summary {
      text-align: center;
    }

    .rating-big {
      font-size: 36px;
      font-weight: 700;
      color: #ff7a00;
      line-height: 1;
    }

    .stars {
      display: flex;
      gap: 4px;
      justify-content: center;
      margin: 8px 0;
    }

    .stars span {
      opacity: 0.3;
      transition: opacity 0.2s;
    }

    .stars span.filled {
      opacity: 1;
    }

    .total {
      color: #999;
      font-size: 13px;
      margin-top: 8px;
    }

    .resenas-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .resena-card {
      background: #222;
      border-radius: 8px;
      padding: 16px;
      border-left: 3px solid #ff7a00;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .resena-card:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(255, 122, 0, 0.1);
    }

    .resena-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .resena-author {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      flex: 1;
    }

    .author-avatar {
      width: 36px;
      height: 36px;
      background: #333;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .author-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .author-name {
      color: #fff;
      font-weight: 600;
      font-size: 14px;
    }

    .author-date {
      color: #666;
      font-size: 12px;
    }

    .resena-rating {
      display: flex;
      gap: 2px;
      font-size: 14px;
    }

    .resena-rating span {
      opacity: 0.3;
    }

    .resena-rating span.filled {
      opacity: 1;
    }

    .resena-titulo {
      color: #fff;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 15px;
    }

    .resena-comentario {
      color: #ccc;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .badge-verificado {
      display: inline-block;
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .form-container {
      width: 100%;
    }

    .modal-footer {
      padding: 16px 24px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      flex-shrink: 0;
      border-top: 1px solid #333;
    }

    .btn {
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .btn-primary {
      background: #ff7a00;
      color: #fff;
    }

    .btn-primary:hover {
      background: #ff6900;
      box-shadow: 0 4px 12px rgba(255, 122, 0, 0.3);
    }

    .btn-secondary {
      background: #333;
      color: #fff;
    }

    .btn-secondary:hover {
      background: #444;
    }

    /* RESPONSIVE */
    @media (max-width: 640px) {
      .modal-container {
        width: 95%;
        max-height: 95vh;
      }

      .modal-header {
        padding: 16px 20px;
      }

      .modal-body {
        padding: 16px;
      }

      .modal-footer {
        padding: 12px 16px;
      }

      .btn {
        padding: 8px 16px;
        font-size: 12px;
      }
    }
  `]
})
export class ResenaModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() nutriologoId: number = 0;
  @Output() closed = new EventEmitter<void>();

  resenas: any[] = [];
  stats: any = null;
  loading = true;
  showForm = false;

  Math = Math;

  constructor(
    private resenaService: ResenaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('📝 ResenaModalComponent inicializado');
  }

  ngOnChanges() {
    if (this.isOpen && this.nutriologoId) {
      console.log('🔄 Modal abierto, cargando reseñas...');
      this.loadResenas();
      this.loadStats();
    }
  }

  /**
   * 📥 CARGAR RESEÑAS DEL NUTRIÓLOGO
   */
  loadResenas(): void {
    this.loading = true;
    console.log(`📥 Cargando reseñas para nutriólogo ${this.nutriologoId}...`);

    this.resenaService.listarPorNutriologoVerificadas(
      this.nutriologoId,
      true,  // solo_verificadas
      20,    // limit
      0      // offset
    ).subscribe({
      next: (data) => {
        this.resenas = data;
        this.loading = false;
        console.log(`✅ ${this.resenas.length} reseñas cargadas`, this.resenas);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error cargando reseñas:', err);
        this.resenas = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * 📊 CARGAR ESTADÍSTICAS
   */
  loadStats(): void {
    this.resenaService.obtenerStats(this.nutriologoId).subscribe({
      next: (stats) => {
        this.stats = stats;
        console.log('📊 Estadísticas cargadas:', stats);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error cargando estadísticas:', err);
        this.stats = null;
      }
    });
  }

  /**
   * ✅ RESEÑA CREADA EXITOSAMENTE - RECARGAR TODO
   */
  onResenaCreated(): void {
    console.log('✅ Reseña creada! Recargando datos...');
    this.showForm = false;
    
    // Recargar reseñas y estadísticas
    setTimeout(() => {
      this.loadResenas();
      this.loadStats();
    }, 500);
  }

  /**
   * 🔘 TOGGLE FORMULARIO
   */
  toggleForm(): void {
    this.showForm = !this.showForm;
    console.log(this.showForm ? '📝 Abriendo formulario' : '❌ Cerrando formulario');
  }

  /**
   * ❌ CERRAR MODAL
   */
  close(): void {
    this.isOpen = false;
    this.showForm = false;
    this.closed.emit();
    console.log('❌ Modal cerrado');
  }
}