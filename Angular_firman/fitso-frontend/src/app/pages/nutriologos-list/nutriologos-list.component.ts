import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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

  private destroy$ = new Subject<void>();
  private isFetching = false; // ✅ Flag para evitar llamadas recursivas

  get totalPages(): number {
    return Math.max(1, Math.ceil((this.total || 0) / this.size));
  }

  constructor(
    private api: NutriologosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Llama a la API con los filtros actuales */
  fetch(): void {
    if (this.loading || this.isFetching) return;
    
    this.loading = true;
    this.isFetching = true;
    this.cdr.markForCheck();

    this.api.list({
      q: this.q?.trim() || undefined,
      page: this.page,
      size: this.size,
      order: this.order,
      solo_validados: true
    })
    .pipe(
      takeUntil(this.destroy$),
      tap((res: ListResponse<Nutriologo>) => {
        this.items = res?.items ?? [];
        this.total = typeof res?.total === 'number' ? res.total : this.items.length;
      }),
      catchError(() => {
        this.items = [];
        this.total = 0;
        return of(null);
      }),
      finalize(() => {
        this.loading = false;
        this.isFetching = false;
        this.cdr.markForCheck();
      })
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