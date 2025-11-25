// src/app/pages/pago-stripe/pago-stripe.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ContratoService } from '../../services/contrato.service';

declare var Stripe: any;

interface Contrato {
  id_contrato: number;
  id_cliente: number;
  id_nutriologo: number;
  monto: number;
  estado: string;
  duracion_meses: number;
  descripcion_servicios?: string;
  nutriologo_nombre?: string;
}

@Component({
  selector: 'app-pago-stripe',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './pago-stripe.component.html',
  styleUrls: ['./pago-stripe.component.css']
})
export class PagoStripeComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  contrato: Contrato | null = null;

  cargando = true;
  procesandoPago = false;
  pagoExitoso = false;
  error: string | null = null;
  errorTarjeta: string | null = null;

  private stripe: any;
  private elements: any;
  private cardElement: any;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private contratoService: ContratoService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      nombre: ['', [Validators.required, Validators.minLength(3)]]
    });

    this.cargarContrato();
    this.inicializarStripe();
  }

  cargarContrato() {
    const nutriologoId = Number(this.route.snapshot.paramMap.get('id'));
    const state = history.state;

    const monto = state?.precio || 0;
    const descripcion = state?.descripcion || 'Plan nutricional mensual';

    this.contrato = {
      id_contrato: 0,
      id_nutriologo: nutriologoId,
      id_cliente: Number(localStorage.getItem('usuarioId')),
      monto: monto,
      duracion_meses: 1,
      estado: 'pendiente',
      descripcion_servicios: descripcion,
      nutriologo_nombre: state?.nutriologo_nombre || 'Nutriólogo seleccionado'
    };

    this.cargando = false;
  }

  inicializarStripe() {
    const publicKey = (window as any).STRIPE_PUBLIC_KEY || 'pk_test_YOUR_KEY';
    this.stripe = Stripe(publicKey);

    this.elements = this.stripe.elements();
    this.cardElement = this.elements.create('card');

    setTimeout(() => {
      this.cardElement.mount('#card-element');
      this.cardElement.on('change', (event: any) => {
        this.errorTarjeta = event.error ? event.error.message : null;
      });
    }, 500);
  }

  procesarPago() {
    if (!this.contrato || this.form.invalid) return;

    this.procesandoPago = true;

    this.contratoService.crearPaymentIntent(
      this.contrato.id_nutriologo,
      this.contrato.monto * this.contrato.duracion_meses,
      this.contrato.duracion_meses,
      this.contrato.descripcion_servicios
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (resp) => {
        if (resp.client_secret) {
          this.confirmarPagoConStripe(resp.client_secret);
        } else {
          this.error = resp.mensaje || 'Error desconocido';
          this.procesandoPago = false;
        }
      },
      error: () => {
        this.error = 'Error al conectar con el servidor';
        this.procesandoPago = false;
      }
    });
  }

  confirmarPagoConStripe(clientSecret: string) {
    this.stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: this.cardElement,
        billing_details: {
          email: this.form.value.email,
          name: this.form.value.nombre
        }
      }
    }).then((result: any) => {
      if (result.error) {
        this.errorTarjeta = result.error.message;
        this.procesandoPago = false;
      } else if (result.paymentIntent.status === 'succeeded') {
        this.confirmarPagoEnBackend(result.paymentIntent.id);
      }
    });
  }

  confirmarPagoEnBackend(paymentIntentId: string) {
    this.contratoService.confirmarPago(paymentIntentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pagoExitoso = true;
          this.procesandoPago = false;
        },
        error: () => {
          this.error = 'Error al confirmar pago';
          this.procesandoPago = false;
        }
      });
  }

  irAlDashboard() {
    this.router.navigate(['/dashboard']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
