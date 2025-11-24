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
  cliente_nombre?: string;
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
  error: string | null = null;
  errorTarjeta: string | null = null;
  procesandoPago = false;
  pagoExitoso = false;
  
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

  ngOnInit() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      nombre: ['', [Validators.required, Validators.minLength(3)]]
    });

    this.cargarContrato();
    this.inicializarStripe();
  }

  cargarContrato() {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const contratoId = params['id'];
      
      if (!contratoId) {
        this.error = 'ID de contrato no proporcionado';
        this.cargando = false;
        return;
      }

      this.contratoService.obtenerContrato(parseInt(contratoId))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.contrato = response;
            this.cargando = false;
          },
          error: (err: any) => {
            this.error = 'Error al cargar el contrato';
            this.cargando = false;
          }
        });
    });
  }

  inicializarStripe() {
    const publicKey = (window as any).STRIPE_PUBLIC_KEY || 'pk_test_YOUR_KEY';
    this.stripe = (window as any).Stripe(publicKey);
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
    if (this.form.invalid || !this.contrato) return;

    this.procesandoPago = true;
    this.errorTarjeta = null;

    this.contratoService.crearPaymentIntent(
      this.contrato.id_nutriologo,
      this.contrato.monto * this.contrato.duracion_meses,
      this.contrato.duracion_meses,
      this.contrato.descripcion_servicios
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        if (response.exito && response.client_secret) {
          const contratoId = response.contrato_id || 0;
          this.confirmarPagoConStripe(response.client_secret, contratoId);
        } else {
          this.error = response.mensaje || 'Error al procesar el pago';
          this.procesandoPago = false;
        }
      },
      error: (err: any) => {
        this.error = 'Error al conectar con el servidor';
        this.procesandoPago = false;
      }
    });
  }

  confirmarPagoConStripe(clientSecret: string, contratoId: number) {
    this.stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: this.cardElement,
        billing_details: {
          email: this.form.get('email')?.value,
          name: this.form.get('nombre')?.value
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
        next: (response: any) => {
          this.pagoExitoso = true;
          this.procesandoPago = false;
        },
        error: (err: any) => {
          this.error = 'Error al confirmar el pago';
          this.procesandoPago = false;
        }
      });
  }

  irAlDashboard() {
    this.router.navigate(['/dashboard']);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}