import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <h2>Iniciar Sesión</h2>
      <form (ngSubmit)="login()">
        <label>Email:</label>
        <input type="email" [(ngModel)]="email" name="email" required />

        <label>Contraseña:</label>
        <input type="password" [(ngModel)]="password" name="password" required />

        <button type="submit">Entrar</button>
      </form>

      <p>¿No tienes cuenta? 
        <a (click)="goToRegister()">Regístrate aquí</a>
      </p>
    </div>
  `,
  styles: [`
    .container { max-width: 400px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; }
    input { width: 100%; margin-bottom: 10px; padding: 8px; }
    button { width: 100%; padding: 10px; margin-top: 10px; }
    a { color: blue; cursor: pointer; }
  `]
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private router: Router) {}

  login() {
    console.log('Email:', this.email, 'Password:', this.password);
    alert('¡Login simulado exitoso!');
    this.router.navigate(['/register']); // redirige de prueba
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
