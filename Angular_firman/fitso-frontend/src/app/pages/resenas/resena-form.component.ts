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
import { ResenaService, ResenaCreate, ResenaUpdate } from '../../services/resenas.service';
import { catchError, finalize, tap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-resena-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './resena-form.component.html',
  styleUrls: ['./resena-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResenaFormComponent implements OnInit {
  @Input() nutriologoId!: number;
  @Input() idContrato?: number;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  // Formulario
  calificacion = 5;
  titulo = '';
  comentario = '';

  // Estado
  loading = false;
  submitting = false;
  error: string | null = null;

  // Validación
  commentLength = 0;
  maxCommentLength = 1000;

  constructor(
    private resenaService: ResenaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.calificacion = 5;
    this.titulo = '';
    this.comentario = '';
    this.commentLength = 0;
    this.error = null;
  }

  closeForm(): void {
    this.resetForm();
    this.close.emit();
  }

  onCommentChange(): void {
    this.commentLength = this.comentario.length;
    this.cdr.markForCheck();
  }

  /**
   * Generar estrellas clicables
   */
  getStars(): number[] {
    return Array(5)
      .fill(0)
      .map((_, i) => i + 1);
  }

  setCalificacion(star: number): void {
    this.calificacion = star;
    this.cdr.markForCheck();
  }

  isStarFilled(star: number): boolean {
    return star <= this.calificacion;
  }

  /**
   * Validar formulario
   */
  isValid(): boolean {
    return (
      this.calificacion >= 1 &&
      this.calificacion <= 5 &&
      this.comentario.trim().length > 0
    );
  }

  /**
   * Enviar reseña
   */
  submit(): void {
    if (!this.isValid()) {
      this.error = 'Por favor, completa la calificación y el comentario';
      return;
    }

    this.submitting = true;
    this.error = null;
    this.cdr.markForCheck();

    const payload: ResenaCreate = {
      id_nutriologo: this.nutriologoId,
      calificacion: this.calificacion,
      titulo: this.titulo || undefined,
      comentario: this.comentario,
      id_contrato: this.idContrato,
    };

    this.resenaService
      .crear(payload)
      .pipe(
        tap((res) => {
          console.log('✅ Reseña creada:', res);
          this.success.emit();
          this.closeForm();
        }),
        catchError((err) => {
          console.error('❌ Error al crear reseña:', err);
          this.error =
            err?.error?.detail ||
            'Error al crear la reseña. Intenta más tarde.';
          this.cdr.markForCheck();
          return of(null);
        }),
        finalize(() => {
          this.submitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe();
  }
}