import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResenaService } from '../../services/resenas.service';
import { ResenaFormComponent } from './resena-form.component';

@Component({
  selector: 'app-resena-modal',
  standalone: true,
  imports: [CommonModule, ResenaFormComponent],
  templateUrl: './resenas-modal.component.html',
  styleUrls: ['./resenas-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResenaModalComponent implements OnInit, OnChanges {
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

  ngOnInit(): void {
    console.log('📝 ResenaModalComponent inicializado');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue && this.nutriologoId) {
      console.log('🔄 Modal abierto, cargando reseñas...');
      this.loadResenas();
      this.loadStats();
    }
  }

  /**
   * 📥 CARGAR TODAS LAS RESEÑAS (sin filtro de verificación)
   */
  loadResenas(): void {
    if (!this.nutriologoId) return;

    this.loading = true;
    console.log(`📥 Cargando reseñas para nutriólogo ${this.nutriologoId}...`);

    this.resenaService
      .listarPorNutriologoTodas(this.nutriologoId, 20, 0)
      .subscribe({
        next: (data) => {
          this.resenas = data || [];
          this.loading = false;
          console.log(`✅ ${this.resenas.length} reseñas cargadas`, this.resenas);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('❌ Error cargando reseñas:', err);
          this.resenas = [];
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * 📊 CARGAR ESTADÍSTICAS
   */
  loadStats(): void {
    if (!this.nutriologoId) return;

    this.resenaService.obtenerStats(this.nutriologoId).subscribe({
      next: (stats) => {
        this.stats = stats;
        console.log('📊 Estadísticas cargadas:', stats);
        this.cdr.markForCheck();
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
    this.cdr.markForCheck();
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

  /**
   * 📅 FORMATEAR FECHA
   */
  formatDate(date: string | Date | null | undefined): string {
    if (!date) return 'Hace poco';
    try {
      const d = new Date(date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const dateToCheck = new Date(d);
      dateToCheck.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      yesterday.setHours(0, 0, 0, 0);

      if (dateToCheck.getTime() === today.getTime()) {
        return 'Hoy';
      } else if (dateToCheck.getTime() === yesterday.getTime()) {
        return 'Ayer';
      }

      return d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Hace poco';
    }
  }

  /**
   * ⭐ GENERAR ARRAY DE ESTRELLAS
   * Convierte un número decimal a un array de estrellas
   * Ejemplo: 4.5 -> ['full', 'full', 'full', 'full', 'half']
   */
  getStarArray(rating: number): string[] {
    const stars: string[] = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 >= 0.5;

    // Agregar estrellas llenas
    for (let i = 0; i < fullStars; i++) {
      stars.push('full');
    }

    // Agregar media estrella si aplica
    if (hasHalfStar) {
      stars.push('half');
    }

    return stars;
  }

  /**
   * 📊 CALCULAR ANCHO DE BARRA DE DISTRIBUCIÓN
   */
  getProgressWidth(count: number, total: number): string {
    if (!total || count === 0) return '0%';
    return `${Math.min((count / total) * 100, 100)}%`;
  }
}