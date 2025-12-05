import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResenaService, Resena, ResenaStats } from '../../services/resenas.service';
import { finalize, catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-resenas-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './resenas-modal.component.html',
  styleUrls: ['./resenas-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResenaModalComponent implements OnInit {
  @Input() nutriologoId!: number;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  resenas: Resena[] = [];
  stats: ResenaStats | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private resenaService: ResenaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.isOpen && this.nutriologoId) {
      this.cargarDatos();
    }
  }

  ngOnChanges(changes: any): void {
    if (changes['isOpen']?.currentValue && !changes['isOpen']?.previousValue) {
      this.cargarDatos();
    }
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    // Cargar reseñas y estadísticas en paralelo
    this.resenaService
      .obtenerPorNutriologo(this.nutriologoId, true, 20, 0)
      .pipe(
        tap((resenas) => {
          this.resenas = resenas;
          this.cdr.markForCheck();
        }),
        catchError((err) => {
          console.error('Error cargando reseñas:', err);
          this.error = 'No se pudieron cargar las reseñas';
          this.resenas = [];
          return of([]);
        })
      )
      .subscribe();

    this.resenaService
      .obtenerEstadisticas(this.nutriologoId)
      .pipe(
        tap((stats) => {
          this.stats = stats;
          this.cdr.markForCheck();
        }),
        catchError((err) => {
          console.error('Error cargando estadísticas:', err);
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe();
  }

  closeModal(): void {
    this.close.emit();
  }

  /**
   * Renderizar estrellas
   */
  getStars(calificacion: number): number[] {
    return Array(5)
      .fill(0)
      .map((_, i) => i + 1);
  }

  isStarFilled(star: number, calificacion: number): boolean {
    return star <= Math.round(calificacion);
  }

  /**
   * Formatear fecha
   */
  formatDate(dateString?: string): string {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Barra de progreso para distribución
   */
  getProgressWidth(count: number, total: number): string {
    if (total === 0) return '0%';
    return `${(count / total) * 100}%`;
  }
}