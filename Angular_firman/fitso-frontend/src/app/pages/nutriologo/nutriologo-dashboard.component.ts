  // src/app/pages/nutriologo-dashboard/nutriologo-dashboard.component.ts
  import { Component, OnInit } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { Router, RouterModule } from '@angular/router';
  import { AuthService } from '../../services/auth.service';

  @Component({
    standalone: true,
    selector: 'app-nutriologo-dashboard',
    imports: [CommonModule, RouterModule],
    templateUrl: './nutriologo-dashboard.component.html',
    styleUrls: ['./nutriologo-dashboard.component.css']
  })
  export class NutriologoDashboardComponent implements OnInit {
    me: any = null;
    loading = true;
    clientes: any[] = [];
    msg = '';

    constructor(private auth: AuthService, private router: Router) {}

    ngOnInit(): void {
      this.loading = true;

      this.auth.getNutriMe().subscribe({
        next: (m) => { this.me = m; },
        error: () => { this.msg = 'No se pudo cargar tu perfil.'; }
      });

      this.auth.getNutriClients().subscribe({
        next: (list) => { this.clientes = list || []; this.loading = false; },
        error: () => { this.msg = 'No se pudieron cargar los clientes.'; this.loading = false; }
      });
    }

    // Ir al perfil del nutriólogo
    goPerfil(): void {
      this.router.navigateByUrl('/profile/nutriologo');
    }

    // (opcional) Ir al detalle/progreso de un cliente cuando tengas esa vista
    goClienteDetalle(id: number | string): void {
      // Ejemplo futuro:
      // this.router.navigate(['/nutriologo/clientes', id]);
    }
  }
