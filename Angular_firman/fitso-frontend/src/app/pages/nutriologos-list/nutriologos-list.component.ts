import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, finalize, tap, catchError, of, takeUntil } from 'rxjs';
import { NutriologosService } from '../../services/nutriologos.service';

/* ---- Tipos (opcional, pero recomendado) ---- */
export interface Nutriologo {
  id_usuario: number | string;
  nombre?: string;
  profesion?: string;
  numero_cedula_mask?: string;
  validado?: boolean;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}

type Order = 'recientes' | 'nombre';

@Component({
  standalone: true,
  selector: 'app-nutriologos-list',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './nutriologos-list.component.html',
  styleUrls: ['./nutriologos-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NutriologosListComponent implements OnInit, OnDestroy {
  q = '';
  order: Order = 'recientes';
  page = 1;
  size = 12;
  total = 0;
  loading = false;
  items: Nutriologo[] = [];

  private destroy$ = new Subject<void>(); // ✅ versión-agnóstica

  get totalPages(): number {
    return Math.max(1, Math.ceil((this.total || 0) / this.size));
  }

  constructor(private api: NutriologosService) {}

  ngOnInit(): void {
    this.fetch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Llama a la API con los filtros actuales */
  fetch(): void {
    if (this.loading) return; // evita llamadas simultáneas
    this.loading = true;

    this.api.list({
      q: this.q?.trim() || undefined,
      page: this.page,
      size: this.size,
      order: this.order,
      solo_validados: true
    })
    .pipe(
      takeUntil(this.destroy$), // ✅ sin takeUntilDestroyed
      tap((res: ListResponse<Nutriologo>) => {
        this.items = res?.items ?? [];
        this.total = typeof res?.total === 'number' ? res.total : this.items.length;

        // Si la página queda fuera de rango (p.ej. cambiaron filtros), ajusta:
        const last = this.totalPages;
        if (this.page > last && this.total > 0) {
          this.page = last;
          this.fetch();
        }
      }),
      catchError(() => {
        this.items = [];
        this.total = 0;
        return of(null);
      }),
      finalize(() => { this.loading = false; })
    )
    .subscribe();
  }

  onSearch(): void {
    this.page = 1;
    this.fetch();
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.fetch();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.fetch();
    }
  }
}
