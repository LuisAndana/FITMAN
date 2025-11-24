// src/app/pages/nutriologo/profile-nutriologo.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ContratoService } from '../../services/contrato.service';
import { NutriologosService, type Nutriologo } from '../../services/nutriologos.service';

interface NutriPerfil extends Nutriologo {
  // Hereda todas las propiedades de Nutriologo
}

@Component({
  selector: 'app-profile-nutriologo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile-nutriologo.component.html',
  styleUrls: ['./profile-nutriologo.component.css']
})
export class ProfileNutriologoComponent implements OnInit, OnDestroy {
  nutriologo: NutriPerfil | null = null;
  cargando = true;
  error: string | null = null;
  mostrarModalContrato = false;
  duracionMeses = 1;
  descripcion = '';
  procesandoPago = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contratoService: ContratoService,
    private nutriologosService: NutriologosService
  ) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  cargarPerfil(): void {
    this.cargando = true;
    this.error = null;

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const idNutriologo = params['id'];
      
      if (!idNutriologo) {
        this.error = 'ID de nutriólogo no proporcionado';
        this.cargando = false;
        return;
      }

      const id = parseInt(idNutriologo, 10);

      this.nutriologosService.getById(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.nutriologo = {
              id_usuario: response.id_usuario || id,
              nombre: response.nombre || 'Nutriólogo',
              correo: response.correo || response.email || 'sin-email@example.com',
              email: response.email || response.correo,
              foto: response.foto || 'assets/default-avatar.jpg',
              validado: response.validado || false,
              descripcion: response.descripcion || 'Especialista en nutrición',
              experiencia_anos: response.experiencia_anos || 0,
              precio_por_mes: response.precio_por_mes || 100,
              especialidades: Array.isArray(response.especialidades) ? response.especialidades : [],
              certificaciones: Array.isArray(response.certificaciones) ? response.certificaciones : [],
              es_nutriologo: response.es_nutriologo !== false
            };
            this.cargando = false;
          },
          error: (err: any) => {
            console.error('Error al cargar nutriólogo:', err);
            this.error = 'Error al cargar el perfil del nutriólogo';
            this.cargando = false;
          }
        });
    });
  }

  abrirModalContrato(): void {
    const usuarioId = localStorage.getItem('usuarioId');
    if (!usuarioId) {
      this.error = 'Debes iniciar sesión para contratar';
      return;
    }

    this.mostrarModalContrato = true;
    this.duracionMeses = 1;
    this.descripcion = '';
    this.error = null;
  }

  cerrarModal(): void {
    this.mostrarModalContrato = false;
    this.descripcion = '';
    this.duracionMeses = 1;
    this.procesandoPago = false;
  }

  calcularPrecioTotal(): number {
    if (!this.nutriologo) return 0;
    return this.nutriologo.precio_por_mes * this.duracionMeses;
  }

  procesarPago(): void {
    if (!this.nutriologo || !this.duracionMeses) {
      this.error = 'Completa todos los campos';
      return;
    }

    const usuarioId = localStorage.getItem('usuarioId');
    if (!usuarioId) {
      this.error = 'Debes iniciar sesión para contratar';
      return;
    }

    this.procesandoPago = true;
    this.error = null;
    const monto = this.calcularPrecioTotal();

    this.contratoService.crearPaymentIntent(
      this.nutriologo.id_usuario,
      monto,
      this.duracionMeses,
      this.descripcion
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        if (response.exito && response.contrato_id) {
          this.cerrarModal();
          this.router.navigate(['/pago-stripe', response.contrato_id]);
        } else {
          this.error = response.mensaje || 'Error al crear el contrato';
          this.procesandoPago = false;
        }
      },
      error: (err: any) => {
        console.error('Error:', err);
        this.error = err.error?.detail || err.error?.mensaje || 'Error al procesar la solicitud';
        this.procesandoPago = false;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}