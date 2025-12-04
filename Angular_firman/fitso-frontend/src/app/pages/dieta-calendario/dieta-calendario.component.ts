import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dieta } from '../../services/dieta.service';

interface DiaCalendario {
  fecha: Date;
  dia: number;
  esDelMesActual: boolean;
  tieneActividad: boolean;
  dietas: Dieta[];
}

interface SemanaDias {
  dias: DiaCalendario[];
}

@Component({
  selector: 'app-modal-calendario',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay-calendario" *ngIf="isOpen" (click)="cerrar()">
      <div class="modal-calendario" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header-calendario">
          <h2>Calendario de Dietas</h2>
          <button class="close-btn-calendario" (click)="cerrar()">✕</button>
        </div>

        <!-- Contenido -->
        <div class="modal-content-calendario">
          <!-- Controles -->
          <div class="controles-modal-calendario">
            <button class="btn-nav-modal" (click)="mesAnterior()">←</button>
            <span class="mes-titulo-modal">{{ meses[mesActual] }} {{ anioActual }}</span>
            <button class="btn-nav-modal" (click)="mesProximo()">→</button>
            <button class="btn-hoy-modal" (click)="hoy()">Hoy</button>
          </div>

          <!-- Calendario Grid - CON SCROLL -->
          <div class="calendario-grid-modal">
            <!-- Encabezado días semana - FIJO -->
            <div class="dias-header-modal">
              <div class="dia-header-item" *ngFor="let dia of diasSemana">{{ dia }}</div>
            </div>

            <!-- Grid de días - SCROLLEABLE -->
            <div class="calendario-dias-modal-scroll">
              <div class="calendario-dias-modal">
                <div 
                  *ngFor="let semana of semanasDelMes"
                  class="semana-modal">
                  <div 
                    *ngFor="let dia of semana.dias"
                    class="dia-modal"
                    [class.otro-mes]="!dia.esDelMesActual"
                    [class.hoy]="esDiaHoy(dia)"
                    [class.seleccionado]="esDiaSeleccionado(dia)"
                    [class.con-dietas]="dia.tieneActividad"
                    (click)="seleccionarDia(dia)">
                    
                    <span class="numero-dia-modal">{{ dia.dia }}</span>
                    <div class="dot-modal" *ngIf="dia.tieneActividad"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Panel dietas del día - FILTRADAS -->
          <div class="panel-dietas-modal">
            <h4 class="titulo-dietas-modal">{{ formatearFecha(diaSeleccionado) }}</h4>

            <div class="dietas-modal-list" *ngIf="dietasDelDia.length > 0">
              <div *ngFor="let dieta of dietasDelDia" class="dieta-modal-item">
                <div class="dieta-modal-nombre">{{ dieta.nombre }}</div>
                <div class="dieta-modal-info">
                  <span>🔥 {{ dieta.calorias_totales }} kcal</span>
                  <span>⏱️ {{ dieta.dias_duracion }}d</span>
                  <span [class.estado-vencida]="formatearTiempoRestante(dieta) === 'Vencida'">
                    {{ formatearTiempoRestante(dieta) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="sin-dietas-modal" *ngIf="dietasDelDia.length === 0">
              <p>No hay planes para este día</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary: #ff7a00;
      --primary-dark: #e65c00;
      --text-dark: #1a1a1a;
      --text-muted: #999;
      --border: #e0e0e0;
      --bg-light: #f5f7fa;
    }

    /* MODAL OVERLAY */
    .modal-overlay-calendario {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      background: rgba(0, 0, 0, 0.6);
      padding: 20px;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* MODAL CONTAINER */
    .modal-calendario {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.3s ease;
      overflow: hidden;
    }

    /* HEADER */
    .modal-header-calendario {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background: #1a1a1a;
      color: white;
      border-bottom: 4px solid var(--primary);
      flex-shrink: 0;
    }

    .modal-header-calendario h2 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 700;
    }

    .close-btn-calendario {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }

    .close-btn-calendario:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: rotate(90deg);
    }

    /* CONTENT */
    .modal-content-calendario {
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
    }

    /* CONTROLES */
    .controles-modal-calendario {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    .btn-nav-modal {
      width: 28px;
      height: 28px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: white;
      color: var(--text-dark);
      cursor: pointer;
      font-weight: 700;
      font-size: 0.9rem;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-nav-modal:hover {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .mes-titulo-modal {
      font-weight: 700;
      color: var(--text-dark);
      font-size: 0.95rem;
      min-width: 120px;
      text-align: center;
    }

    .btn-hoy-modal {
      padding: 6px 12px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.8rem;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn-hoy-modal:hover {
      background: var(--primary-dark);
      transform: scale(1.05);
    }

    /* CALENDARIO GRID */
    .calendario-grid-modal {
      display: flex;
      flex-direction: column;
      gap: 1px;
      background: var(--border);
      border-radius: 4px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .dias-header-modal {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
      background: var(--border);
      flex-shrink: 0;
    }

    .dia-header-item {
      background: var(--bg-light);
      padding: 8px 4px;
      text-align: center;
      font-weight: 700;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* CONTENEDOR CON SCROLL */
    .calendario-dias-modal-scroll {
      max-height: 180px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .calendario-dias-modal {
      display: flex;
      flex-direction: column;
      gap: 1px;
      background: var(--border);
    }

    .semana-modal {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
      background: var(--border);
    }

    .dia-modal {
      background: white;
      padding: 8px;
      min-height: 48px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      position: relative;
    }

    .dia-modal:hover {
      background: var(--bg-light);
    }

    .dia-modal.otro-mes {
      background: #fafafa;
      color: var(--text-muted);
    }

    .dia-modal.hoy {
      background: linear-gradient(135deg, rgba(255, 122, 0, 0.12) 0%, rgba(255, 184, 77, 0.08) 100%);
      border: 1px solid var(--primary);
    }

    .dia-modal.seleccionado {
      background: linear-gradient(135deg, var(--primary) 0%, #ffb84d 100%);
      color: white;
      font-weight: 700;
    }

    .dia-modal.con-dietas {
      border-left: 2px solid var(--primary);
    }

    .numero-dia-modal {
      font-weight: 700;
      font-size: 0.8rem;
      color: inherit;
    }

    .dot-modal {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: var(--primary);
    }

    /* SCROLLBAR CALENDARIO */
    .calendario-dias-modal-scroll::-webkit-scrollbar {
      width: 4px;
    }

    .calendario-dias-modal-scroll::-webkit-scrollbar-track {
      background: transparent;
    }

    .calendario-dias-modal-scroll::-webkit-scrollbar-thumb {
      background: var(--primary);
      border-radius: 2px;
    }

    .calendario-dias-modal-scroll::-webkit-scrollbar-thumb:hover {
      background: var(--primary-dark);
    }

    /* PANEL DIETAS */
    .panel-dietas-modal {
      border-top: 1px solid var(--border);
      padding: 12px;
      max-height: 200px;
      overflow-y: auto;
      flex-shrink: 0;
    }

    .titulo-dietas-modal {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text-dark);
      margin: 0 0 10px 0;
      text-transform: capitalize;
    }

    .dietas-modal-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .dieta-modal-item {
      background: var(--bg-light);
      border-left: 3px solid var(--primary);
      padding: 8px;
      border-radius: 3px;
      font-size: 0.8rem;
    }

    .dieta-modal-nombre {
      font-weight: 700;
      color: var(--text-dark);
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.85rem;
    }

    .dieta-modal-info {
      display: flex;
      gap: 8px;
      font-size: 0.75rem;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .dieta-modal-info span {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .dieta-modal-info .estado-vencida {
      color: #e74c3c;
      font-weight: 600;
    }

    .sin-dietas-modal {
      text-align: center;
      padding: 16px 8px;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .sin-dietas-modal p {
      margin: 0;
    }

    /* SCROLLBAR DIETAS */
    .panel-dietas-modal::-webkit-scrollbar {
      width: 4px;
    }

    .panel-dietas-modal::-webkit-scrollbar-track {
      background: transparent;
    }

    .panel-dietas-modal::-webkit-scrollbar-thumb {
      background: var(--primary);
      border-radius: 2px;
    }

    .panel-dietas-modal::-webkit-scrollbar-thumb:hover {
      background: var(--primary-dark);
    }

    /* RESPONSIVE */
    @media (max-width: 768px) {
      .modal-calendario {
        width: 95%;
        max-width: 600px;
        max-height: 80vh;
      }

      .modal-header-calendario {
        padding: 16px;
      }

      .modal-header-calendario h2 {
        font-size: 1.1rem;
      }

      .close-btn-calendario {
        width: 36px;
        height: 36px;
      }

      .mes-titulo-modal {
        font-size: 0.85rem;
        min-width: 100px;
      }

      .dia-modal {
        min-height: 42px;
        padding: 6px 4px;
      }

      .calendario-dias-modal-scroll {
        max-height: 160px;
      }
    }

    @media (max-width: 480px) {
      .modal-overlay-calendario {
        padding: 8px;
      }

      .modal-calendario {
        width: 100%;
        max-width: none;
        max-height: 90vh;
        border-radius: 12px 12px 0 0;
      }

      .modal-header-calendario {
        padding: 12px 16px;
      }

      .modal-header-calendario h2 {
        font-size: 1rem;
      }

      .close-btn-calendario {
        width: 32px;
        height: 32px;
        font-size: 1.2rem;
      }

      .mes-titulo-modal {
        font-size: 0.8rem;
        min-width: 90px;
      }

      .btn-nav-modal {
        width: 24px;
        height: 24px;
        font-size: 0.75rem;
      }

      .btn-hoy-modal {
        padding: 4px 8px;
        font-size: 0.7rem;
      }

      .dia-modal {
        min-height: 36px;
        padding: 4px 2px;
      }

      .numero-dia-modal {
        font-size: 0.7rem;
      }

      .calendario-dias-modal-scroll {
        max-height: 150px;
      }
    }
  `]
})
export class ModalCalendarioComponent implements OnInit {
  @Input() isOpen = false;
  @Input() dietas: Dieta[] = [];
  @Output() cerrarModal = new EventEmitter<void>();

  mesActual = new Date().getMonth();
  anioActual = new Date().getFullYear();

  diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom'];
  meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  diasCalendario: DiaCalendario[] = [];
  semanasDelMes: SemanaDias[] = [];
  diaSeleccionado: Date = new Date();
  dietasDelDia: Dieta[] = [];

  ngOnInit(): void {
    this.generarCalendario();
    this.actualizarDietasDelDia();
  }

  generarCalendario(): void {
    this.diasCalendario = [];
    const primerDia = new Date(this.anioActual, this.mesActual, 1);
    const primerDiaDelMes = primerDia.getDay();

    let diaAnterior = new Date(primerDia);
    diaAnterior.setDate(diaAnterior.getDate() - primerDiaDelMes);

    const totalDias = 42;

    for (let i = 0; i < totalDias; i++) {
      const fecha = new Date(diaAnterior);
      fecha.setDate(diaAnterior.getDate() + i);

      const esDelMesActual =
        fecha.getMonth() === this.mesActual && fecha.getFullYear() === this.anioActual;

      const dietasDelDia = this.obtenerDietasDelDia(fecha);

      this.diasCalendario.push({
        fecha: new Date(fecha),
        dia: fecha.getDate(),
        esDelMesActual,
        tieneActividad: dietasDelDia.length > 0,
        dietas: dietasDelDia
      });
    }

    this.generarSemanas();
  }

  generarSemanas(): void {
    this.semanasDelMes = [];
    for (let i = 0; i < this.diasCalendario.length; i += 7) {
      this.semanasDelMes.push({
        dias: this.diasCalendario.slice(i, i + 7)
      });
    }
  }

  obtenerDietasDelDia(fecha: Date): Dieta[] {
  return this.dietas.filter(dieta => {
    // Fecha en que se creó la dieta
    const fechaCreacion = new Date(dieta.fecha_creacion);
    fechaCreacion.setHours(0, 0, 0, 0);

    // Fecha en que vence la dieta
    let fechaVencimiento = new Date(dieta.fecha_vencimiento || dieta.fecha_creacion);
    
    // Si la dieta tiene duración, calcular vencimiento
    if (dieta.dias_duracion) {
      fechaVencimiento = new Date(dieta.fecha_creacion);
      fechaVencimiento.setDate(
        fechaVencimiento.getDate() + dieta.dias_duracion
      );
    }
    
    fechaVencimiento.setHours(23, 59, 59, 999);

    // Normalizar fecha seleccionada
    const fechaNormalizada = new Date(fecha);
    fechaNormalizada.setHours(0, 0, 0, 0);

    // ✅ SOLO retorna dietas ACTIVAS en esta fecha
    return fechaNormalizada >= fechaCreacion && 
           fechaNormalizada <= fechaVencimiento;
  });
}

  mesAnterior(): void {
    this.mesActual--;
    if (this.mesActual < 0) {
      this.mesActual = 11;
      this.anioActual--;
    }
    this.generarCalendario();
  }

  mesProximo(): void {
    this.mesActual++;
    if (this.mesActual > 11) {
      this.mesActual = 0;
      this.anioActual++;
    }
    this.generarCalendario();
  }

  hoy(): void {
    const ahora = new Date();
    this.mesActual = ahora.getMonth();
    this.anioActual = ahora.getFullYear();
    this.diaSeleccionado = new Date(ahora);
    this.generarCalendario();
    this.actualizarDietasDelDia();
  }

  seleccionarDia(dia: DiaCalendario): void {
  if (!dia.esDelMesActual) return;

  this.diaSeleccionado = new Date(dia.fecha);
  this.dietasDelDia = this.obtenerDietasDelDia(dia.fecha);

  console.log(`📅 Día: ${this.formatearFecha(dia.fecha)}`);
  console.log(`🍽️ Dietas activas: ${this.dietasDelDia.length}`);
}


  actualizarDietasDelDia(): void {
    this.dietasDelDia = this.obtenerDietasDelDia(this.diaSeleccionado);
  }

  esDiaHoy(dia: DiaCalendario): boolean {
    const hoy = new Date();
    return (
      dia.fecha.getDate() === hoy.getDate() &&
      dia.fecha.getMonth() === hoy.getMonth() &&
      dia.fecha.getFullYear() === hoy.getFullYear()
    );
  }

  esDiaSeleccionado(dia: DiaCalendario): boolean {
    return (
      dia.fecha.getDate() === this.diaSeleccionado.getDate() &&
      dia.fecha.getMonth() === this.diaSeleccionado.getMonth() &&
      dia.fecha.getFullYear() === this.diaSeleccionado.getFullYear()
    );
  }

  formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatearTiempoRestante(dieta: Dieta): string {
    const hoy = new Date();
    const fechaVencimiento = new Date(dieta.fecha_vencimiento || dieta.fecha_creacion);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + (dieta.dias_duracion || 30));

    const diferencia = fechaVencimiento.getTime() - hoy.getTime();
    const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    if (dias <= 0) {
      return 'Vencida';
    } else if (dias === 1) {
      return 'Vence hoy';
    } else if (dias <= 7) {
      return `${dias} días`;
    } else {
      return `${Math.floor(dias / 7)} semanas`;
    }
  }

  cerrar(): void {
    this.cerrarModal.emit();
  }
}