// src/app/pages/nutriologo-cliente/cliente-detalle.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ProgresoComponent } from '../../progreso/progreso.component';

@Component({
  standalone: true,
  selector: 'app-cliente-detalle',
  imports: [CommonModule, RouterModule, ProgresoComponent],
  templateUrl: './cliente-detalle.component.html',
  styleUrls: ['./cliente-detalle.component.css']
})
export class ClienteDetalleComponent implements OnInit {
  id!: string;
  cliente: any = null;
  loading = true;
  msg = '';

  constructor(private route: ActivatedRoute, private auth: AuthService) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.auth.getUserById(this.id).subscribe({
      next: (c) => { this.cliente = c; this.loading = false; },
      error: () => { this.msg = 'No se pudo cargar el cliente.'; this.loading = false; }
    });
  }
}
