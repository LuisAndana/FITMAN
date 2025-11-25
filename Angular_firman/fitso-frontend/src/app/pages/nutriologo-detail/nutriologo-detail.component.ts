import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NutriologosService } from '../../services/nutriologos.service';
import { AuthService } from '../../services/auth.service';
import { ContratoService } from '../../services/contrato.service';

@Component({
  standalone: true,
  selector: 'app-nutriologo-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './nutriologo-detail.component.html',
  styleUrls: ['./nutriologo-detail.component.css']
})
export class NutriologoDetailComponent implements OnInit {
  data: any;
  loading = true;
  userAuthenticated = false;
  isNutriologo = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: NutriologosService,
    private auth: AuthService,
    private contratoService: ContratoService
  ) {}

  ngOnInit() {
    // ✔ Detectar sesión
    this.userAuthenticated = !!localStorage.getItem('auth_token');

    // ✔ Saber si el usuario logeado es nutriólogo
    const tipo = localStorage.getItem('tipoUsuario');
    this.isNutriologo = tipo === 'nutriologo';

    // ✔ Cargar datos del nutriólogo
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getById(id).subscribe({
      next: d => {
        this.data = d;
        this.loading = false;
      },
      error: _ => { this.loading = false; }
    });
  }

  /**
   * 👉 Contratar nutriólogo (FLUJO A)
   * 1) Crear contrato + PaymentIntent en backend
   * 2) Redirigir a pantalla de pago con el ID de contrato
   */
  hireNutritionist(): void {
    if (!this.userAuthenticated) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: `/nutriologos/${this.data.id_usuario}` }
      });
      return;
    }

    if (this.isNutriologo) {
      alert('❌ Los nutriólogos no pueden contratar otros servicios.');
      return;
    }

    // ------------ CREAR CONTRATO EN BACKEND ------------

    const monto = this.data.precio ?? 20; // o el campo correcto
    const meses = 1;

    this.contratoService.crearPaymentIntent(
      this.data.id_usuario,   // ID del nutriólogo
      monto,
      meses,
      'Plan nutricional'
    ).subscribe({
      next: (resp) => {
        if (resp.exito && resp.contrato_id) {
          const contratoId = resp.contrato_id;

          // ✔ AHORA SI → redirigir con contrato válido
          this.router.navigate(['/pago-stripe', contratoId]);
        } else {
          alert(resp.mensaje || 'Error al iniciar contrato');
        }
      },
      error: () => {
        alert('Error al crear el contrato.');
      }
    });
  }

  requestAppointment(): void {
    alert('Función de agendar consulta en construcción 🛠️');
  }

  sendMessage(): void {
    const email = this.data?.correo || '';
    const subject = encodeURIComponent('Consulta nutricional');
    const body = encodeURIComponent('Hola, me gustaría agendar una consulta.');
    if (email) {
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    } else {
      alert('El nutriólogo no tiene correo público disponible.');
    }
  }
}
