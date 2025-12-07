import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContratoService } from '../../services/contrato.service';
import { MensajesService } from '../../services/mensajes.service';
import { AuthService } from '../../services/auth.service';

export interface ContratoItem {
  id_contrato: number;
  id_cliente: number;
  id_nutriologo: number;
  nutriologo_nombre?: string;
  cliente_nombre?: string;
  monto: number;
  estado: string;
  duracion_meses: number;
  descripcion_servicios?: string;
  fecha_creacion: string;
  otro_usuario_id: number;
  otro_usuario_nombre: string;
  otro_usuario_tipo: string;
}

@Component({
  selector: 'app-iniciar-conversacion-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="modal-overlay" (click)="cerrar()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Iniciar Conversación</h2>
          <button class="btn-close" (click)="cerrar()">×</button>
        </div>

        <div class="modal-body">
          <!-- Cargando -->
          <div *ngIf="cargando" class="estado-cargando">
            <div class="spinner"></div>
            <p>⏳ Cargando contratos activos...</p>
          </div>

          <!-- Sin contratos activos -->
          <div *ngIf="!cargando && contratosFiltrados.length === 0" class="sin-contratos">
            <p class="icono">📭</p>
            <p class="titulo">No tienes contratos activos</p>
            <p class="hint">Solo puedes hablar con nutriólogos/clientes que tengas bajo contrato activo.</p>
            <button class="btn-volver" (click)="cerrar()">Volver</button>
          </div>

          <!-- Lista de contratos activos -->
          <div *ngIf="!cargando && contratosFiltrados.length > 0" class="lista-contratos">
            <p class="subtitle">Elige con quién deseas hablar:</p>
            <div 
              *ngFor="let contrato of contratosFiltrados"
              class="contrato-item"
              (click)="iniciarConversacion(contrato)"
            >
              <div class="avatar">
                <span>{{ contrato.otro_usuario_nombre?.charAt(0)?.toUpperCase() }}</span>
              </div>
              <div class="info">
                <h3>{{ contrato.otro_usuario_nombre }}</h3>
                <p class="tipo">
                  {{ contrato.otro_usuario_tipo === 'nutriologo' ? '🥗 Nutriólogo' : '👤 Cliente' }}
                </p>
                <p class="descripcion" *ngIf="contrato.descripcion_servicios">
                  {{ contrato.descripcion_servicios }}
                </p>
                <p class="estado" [class]="'estado-' + contrato.estado.toLowerCase()">
                  {{ contrato.estado }}
                </p>
              </div>
              <button class="btn-hablar">
                Hablar →
              </button>
            </div>
          </div>

          <!-- Error -->
          <div *ngIf="error" class="error-message">
            <p>❌ {{ error }}</p>
            <button class="btn-reintentar" (click)="cargarContratos()">Reintentar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #eee;
      background: white;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      color: #333;
      font-weight: 600;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .btn-close:hover {
      background: #f0f0f0;
      color: #333;
    }

    .modal-body {
      padding: 20px;
      min-height: 200px;
    }

    .estado-cargando {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #eee;
      border-top: 3px solid #ff7a00;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .estado-cargando p {
      color: #999;
      margin: 0;
      font-size: 14px;
    }

    .sin-contratos {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .sin-contratos .icono {
      font-size: 48px;
      margin: 0 0 16px 0;
    }

    .sin-contratos .titulo {
      font-size: 18px;
      color: #333;
      margin: 0 0 8px 0;
      font-weight: 600;
    }

    .sin-contratos .hint {
      font-size: 13px;
      color: #999;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }

    .btn-volver {
      background: #f0f0f0;
      color: #333;
      border: none;
      border-radius: 6px;
      padding: 10px 20px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .btn-volver:hover {
      background: #e0e0e0;
    }

    .lista-contratos {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .subtitle {
      margin: 0 0 16px 0;
      font-size: 13px;
      color: #666;
      font-weight: 500;
    }

    .contrato-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      border: 1px solid #eee;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: white;
    }

    .contrato-item:hover {
      background: #f9f9f9;
      border-color: #ff7a00;
      box-shadow: 0 2px 8px rgba(255, 122, 0, 0.1);
      transform: translateX(4px);
    }

    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #ff7a00;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 18px;
      flex-shrink: 0;
    }

    .info {
      flex: 1;
      min-width: 0;
    }

    .info h3 {
      margin: 0 0 4px 0;
      font-size: 15px;
      color: #333;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tipo {
      margin: 0 0 4px 0;
      font-size: 12px;
      color: #999;
    }

    .descripcion {
      margin: 0 0 6px 0;
      font-size: 12px;
      color: #666;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .estado {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      margin: 0;
    }

    .estado-activo {
      background: #d4edda;
      color: #155724;
    }

    .estado-pendiente {
      background: #fff3cd;
      color: #856404;
    }

    .estado-completado {
      background: #cce5ff;
      color: #004085;
    }

    .estado-cancelado {
      background: #f8d7da;
      color: #721c24;
    }

    .btn-hablar {
      background: #ff7a00;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 14px;
      cursor: pointer;
      font-weight: 500;
      font-size: 13px;
      transition: all 0.2s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .btn-hablar:hover {
      background: #e66900;
      transform: scale(1.05);
    }

    .btn-hablar:active {
      transform: scale(0.98);
    }

    .error-message {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .error-message p {
      margin: 0 0 12px 0;
      color: #721c24;
      font-size: 14px;
    }

    .btn-reintentar {
      background: #721c24;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .btn-reintentar:hover {
      background: #5a1620;
    }
  `]
})
export class IniciarConversacionModalComponent implements OnInit {
  @Output() cerrarModal = new EventEmitter<void>();

  contratosFiltrados: ContratoItem[] = [];
  cargando = false;
  error: string | null = null;
  usuarioId: number = 0;

  constructor(
    private contratoService: ContratoService,
    private mensajesService: MensajesService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    const id = this.authService.getUserId();
    this.usuarioId = id || 0;
    console.log('🔍 IniciarConversacionModal - usuarioId:', this.usuarioId);
  }

  ngOnInit(): void {
    this.cargarContratos();
  }

  /**
   * 📋 Cargar contratos del usuario
   */
  cargarContratos(): void {
    this.cargando = true;
    this.error = null;

    this.contratoService.misContratos().subscribe({
      next: (response: any) => {
        console.log('📥 Respuesta raw del backend:', response);

        // IMPORTANTE: El backend retorna { total: X, contratos: [...] }
        // Necesitamos extraer el array de contratos
        let contratos: any[] = [];

        if (Array.isArray(response)) {
          // Si es un array directo
          contratos = response;
          console.log('✅ Respuesta es un array directo');
        } else if (response && response.contratos && Array.isArray(response.contratos)) {
          // Si es { contratos: [...] }
          contratos = response.contratos;
          console.log('✅ Respuesta tiene propiedad .contratos');
        } else if (response && response.items && Array.isArray(response.items)) {
          // Si es { items: [...] }
          contratos = response.items;
          console.log('✅ Respuesta tiene propiedad .items');
        }

        console.log('📋 Contratos extraídos:', contratos);
        
        // 🔧 FIX: Filtrar contratos ACTIVOS de forma flexible (insensible a mayúsculas)
        const activos = contratos.filter(c => {
          const estado = c.estado?.toUpperCase().trim();
          return estado === 'ACTIVO' || estado === 'ACTIVE';
        });
        
        console.log(`✅ ${activos.length} contratos activos de ${contratos.length} total`);
        console.log('Estados encontrados:', contratos.map(c => c.estado));

        // Transformar a formato ContratoItem
        this.contratosFiltrados = activos.map(c => ({
          id_contrato: c.id_contrato,
          id_cliente: c.id_cliente,
          id_nutriologo: c.id_nutriologo,
          nutriologo_nombre: c.nutriologo_nombre,
          cliente_nombre: c.cliente_nombre,
          monto: c.monto,
          estado: c.estado,
          duracion_meses: c.duracion_meses,
          descripcion_servicios: c.descripcion_servicios,
          fecha_creacion: c.fecha_creacion,
          // Determinar quién es el "otro usuario"
          otro_usuario_id: c.id_nutriologo === this.usuarioId ? c.id_cliente : c.id_nutriologo,
          otro_usuario_nombre: c.id_nutriologo === this.usuarioId ? 
            (c.cliente_nombre || 'Cliente') : 
            (c.nutriologo_nombre || 'Nutriólogo'),
          otro_usuario_tipo: c.id_nutriologo === this.usuarioId ? 'cliente' : 'nutriologo'
        }));

        console.log(`✅ ${this.contratosFiltrados.length} contratos transformados para mostrar`);
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('❌ Error cargando contratos:', err);
        this.error = 'Error al cargar contratos. Intenta nuevamente.';
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * 💬 Iniciar conversación
   */
  iniciarConversacion(contrato: ContratoItem): void {
    const otroUsuarioId = contrato.otro_usuario_id;

    console.log(`💬 Iniciando conversación con ${contrato.otro_usuario_nombre} (ID: ${otroUsuarioId})`);
    
    // 🔧 FIX: Validar estado de forma flexible (insensible a mayúsculas)
    const estado = contrato.estado?.toUpperCase().trim();
    if (estado !== 'ACTIVO' && estado !== 'ACTIVE') {
      alert('❌ Este contrato no está activo');
      return;
    }

    // Navegar al chat
    this.router.navigate(['/chat', otroUsuarioId]);
    
    // Cerrar modal emitiendo evento al padre
    this.cerrar();
  }

  /**
   * ✖️ Cerrar modal - Emitir evento al padre
   */
  cerrar(): void {
    console.log('✖️ Cerrando modal de conversación');
    this.cerrarModal.emit();
  }
}