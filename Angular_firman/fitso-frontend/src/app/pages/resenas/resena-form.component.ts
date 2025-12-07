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
import { ResenaService } from '../../services/resenas.service';
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
  calificacion: number = 5;
  titulo: string = '';
  comentario: string = '';

  // Estado
  loading = false;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Validación
  commentLength = 0;
  maxCommentLength = 1000;

  constructor(
    private resenaService: ResenaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('📝 ResenaFormComponent inicializado');
    this.resetForm();
  }

  /**
   * 🔄 RESETEAR FORMULARIO
   */
  resetForm(): void {
    this.calificacion = 5;
    this.titulo = '';
    this.comentario = '';
    this.commentLength = 0;
    this.error = null;
    this.successMessage = null;
    this.cdr.markForCheck();
  }

  /**
   * ❌ CERRAR FORMULARIO
   */
  closeForm(): void {
    console.log('❌ Cerrando formulario de reseña');
    this.resetForm();
    this.close.emit();
  }

  /**
   * 📝 ACTUALIZAR CONTADOR DE CARACTERES
   */
  onCommentChange(): void {
    this.commentLength = this.comentario.length;
    this.cdr.markForCheck();
  }

  /**
   * ⭐ GENERAR ARRAY DE ESTRELLAS
   */
  getStars(): number[] {
    return [1, 2, 3, 4, 5];
  }

  /**
   * ⭐ ESTABLECER CALIFICACIÓN
   */
  setCalificacion(star: number): void {
    if (star >= 1 && star <= 5) {
      this.calificacion = star;
      console.log(`⭐ Calificación establecida: ${this.calificacion} estrellas`);
      this.cdr.markForCheck();
    }
  }

  /**
   * ⭐ VERIFICAR SI ESTRELLA ESTÁ LLENA
   */
  isStarFilled(star: number): boolean {
    return star <= this.calificacion;
  }

  /**
   * ✅ VALIDAR FORMULARIO
   */
  isValid(): boolean {
    const valido = 
      this.calificacion >= 1 &&
      this.calificacion <= 5 &&
      this.comentario.trim().length > 0;

    console.log(`✅ Validación: ${valido}`, {
      calificacion: this.calificacion,
      comentarioVacio: this.comentario.trim().length === 0,
      comentarioLargo: this.comentario.length
    });

    return valido;
  }

  /**
   * 🚀 ENVIAR RESEÑA
   */
  submit(): void {
    console.log('🚀 Enviando reseña...');

    // VALIDAR
    if (!this.isValid()) {
      this.error = '⚠️ Por favor, completa la calificación y el comentario (mínimo 1 carácter)';
      console.warn('❌ Validación fallida');
      this.cdr.markForCheck();
      return;
    }

    // VALIDAR ID NUTRIÓLOGO
    if (!this.nutriologoId || this.nutriologoId <= 0) {
      this.error = '⚠️ Error: ID del nutriólogo no válido';
      console.error('❌ ID nutriólogo inválido:', this.nutriologoId);
      this.cdr.markForCheck();
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;
    this.cdr.markForCheck();

    // CONSTRUIR PAYLOAD
    const payload = {
      id_nutriologo: this.nutriologoId,
      calificacion: this.calificacion,
      titulo: this.titulo && this.titulo.trim() ? this.titulo.trim() : undefined,
      comentario: this.comentario.trim(),
      id_contrato: this.idContrato
    };

    console.log('📤 Payload a enviar:', payload);

    // ENVIAR AL BACKEND
    this.resenaService
      .crear(payload)
      .pipe(
        tap((res) => {
          console.log('✅ Reseña creada exitosamente:', res);
          this.successMessage = '✅ ¡Reseña creada exitosamente!';
          
          // Esperar 1 segundo y emitir éxito
          setTimeout(() => {
            this.success.emit();
            this.closeForm();
          }, 1000);
        }),
        catchError((err) => {
          console.error('❌ Error completo:', err);
          console.error('❌ Status:', err.status);
          console.error('❌ Error detail:', err.error);

          // Extraer mensaje de error del backend
          let mensajeError = 'Error al crear la reseña. Intenta más tarde.';
          
          if (err.error?.detail) {
            mensajeError = err.error.detail;
          } else if (err.error?.message) {
            mensajeError = err.error.message;
          } else if (err.statusText) {
            mensajeError = err.statusText;
          }

          this.error = `❌ ${mensajeError}`;
          console.error('❌ Error al crear reseña:', this.error);
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

  /**
   * 🔄 REINTENTAR ENVÍO
   */
  retry(): void {
    this.error = null;
    this.submit();
  }
}