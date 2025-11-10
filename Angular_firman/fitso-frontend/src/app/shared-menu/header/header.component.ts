import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  menuOpen = false;
  tipoUsuario: 'cliente' | 'nutriologo' | null = null;

  private storageHandler = () => {
    this.tipoUsuario = (localStorage.getItem('tipoUsuario') as any) || null;
  };

  constructor(public auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.storageHandler();
    // Si no hay tipo pero sí hay token, intenta poblarlo con /auth/me
    if (!this.tipoUsuario && this.auth.getToken()) {
      this.auth.getCurrentUser().subscribe({
        next: (me) => {
          this.tipoUsuario = (me?.tipo_usuario as any) || (localStorage.getItem('tipoUsuario') as any) || null;
        },
        error: () => {}
      });
    }
    window.addEventListener('storage', this.storageHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.storageHandler);
  }

  toggleMenu() { this.menuOpen = !this.menuOpen; }
  closeMenu() { this.menuOpen = false; }

  isCliente(): boolean { return this.tipoUsuario === 'cliente'; }
  isNutriologo(): boolean { return this.tipoUsuario === 'nutriologo'; }

  async go(route: string) {
    await this.router.navigateByUrl(route);
    this.closeMenu();
  }

  logout() {
    this.auth.logout();
    localStorage.removeItem('tipoUsuario');
    this.tipoUsuario = null;
    this.closeMenu();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  get correo(): string {
    return localStorage.getItem('correoUsuario') || '';
  }
}
