import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  usuario: any = null;
  menuOpen = false;
  tipoUsuario: string = '';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    const token = this.auth.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    // Obtener tipo de usuario del localStorage
    this.tipoUsuario = localStorage.getItem('tipoUsuario') || 'cliente';

    // Obtener datos del usuario
    const userData = localStorage.getItem('usuario');
    if (userData) {
      this.usuario = JSON.parse(userData);
    } else {
      // Fallback: obtener email del token (si es un JWT decodificable)
      this.usuario = {
        correo: 'usuario@fitso.com'
      };
    }

    // Si es nutriólogo, redirigir a su panel
    if (this.tipoUsuario === 'nutriologo') {
      this.router.navigate(['/profile/nutriologo']);
    }
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  irAPerfil(): void {
    if (this.tipoUsuario === 'cliente') {
      this.router.navigate(['/profile/cliente']);
    } else {
      this.router.navigate(['/profile/nutriologo']);
    }
  }

  logout(): void {
    this.auth.logout();
    localStorage.removeItem('tipoUsuario');
    localStorage.removeItem('usuarioId');
    this.router.navigate(['/login']);
  }
}