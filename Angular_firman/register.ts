import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <h2>Registro</h2>
      <form (ngSubmit)="register()">
        <label>Nombre:</label>
        <input type="text" [(ngModel)]="name" name="name" required />

        <label>Email:</label>
        <input type="email" [(ngModel)]="email" name="email" required />

        <label>Contraseña:</label>
        <input type="password" [(ngModel)]="password" name="password" required />

        <button type="submit">Crear Cuenta</button>
      </form>

      <p>¿Ya tienes cuenta?
        <a (click)="goToLogin()">Inicia sesión aquí</a>
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
export class RegisterComponent {
  name = '';
  email = '';
  password = '';

  constructor(private router: Router) {}

  register() {
    console.log('Registrando:', this.name, this.email, this.password);
    alert('¡Registro simulado exitoso!');
    this.router.navigate(['/login']); // redirige de prueba
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}

