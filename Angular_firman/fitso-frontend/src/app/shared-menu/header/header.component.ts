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

  // Iconos SVG Material Design
  getIcon(iconName: string): string {
    const icons: { [key: string]: string } = {
      'dashboard': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>',
      'profile': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
      'progress': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>',
      'dietas': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 9H9V7h2v2zm8-2h-2V5h2v2zm4 2h-2V7h2v2zM7 9H5V7h2v2zm12 12h2v2h-2v-2zm-4 0h2v2h-2v-2zM3 21h2v2H3v-2zm4-4h10V7H7v10zm0 4h2v2H7v-2zm4 0h2v2h-2v-2z"/></svg>',
      'nutriologos': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>',
      'mensajes': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
      'pacientes': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.64 2.29 1.96 2.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>'
    };
    return icons[iconName] || '';
  }
}