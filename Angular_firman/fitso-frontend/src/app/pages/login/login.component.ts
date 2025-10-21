import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  mensaje = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.mensaje = 'Por favor completa los campos correctamente.';
      return;
    }

    this.auth.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.mensaje = 'Inicio de sesión exitoso.';
        this.auth.saveToken(res.token); // guarda token si tu backend lo envía
        setTimeout(() => this.router.navigate(['/']), 1500); // redirige al home
      },
      error: (err) => {
        console.error('Error al iniciar sesión:', err);
        this.mensaje = err.status === 401
          ? 'Correo o contraseña incorrectos.'
          : 'Error al iniciar sesión.';
      }
    });
  }
}
