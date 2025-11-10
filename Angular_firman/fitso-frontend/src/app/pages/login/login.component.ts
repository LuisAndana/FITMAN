import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  mensaje = '';
  cargando = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.cargando) {
      this.mensaje = 'Por favor completa los campos correctamente.';
      this.loginForm.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.mensaje = 'Iniciando sesión...';

    const { correo } = this.loginForm.value;

    this.auth.login(this.loginForm.value).pipe(
      finalize(() => (this.cargando = false))
    ).subscribe({
      next: async (res: any) => {
        this.mensaje = 'Inicio de sesión exitoso.';

        // Guarda correo para el header si el backend no lo devuelve
        if (!res?.usuario?.correo && correo) {
          localStorage.setItem('correoUsuario', correo);
        }

        // Determina el tipo usando el helper (y fallback a la respuesta)
        const tipo = this.auth.getUserType() ?? res?.usuario?.tipo_usuario;

        // 🔁 Redirección: nutriólogo -> /nutriologo/dashboard ; cliente -> /dashboard
        const destino = (tipo === 'nutriologo') ? '/nutriologo/dashboard' : '/dashboard';

        const ok = await this.router.navigateByUrl(destino, { replaceUrl: true });
        if (!ok) window.location.href = destino;
      },
      error: (err) => {
        console.error('Error al iniciar sesión:', err);
        this.mensaje = err?.status === 401
          ? 'Correo o contraseña incorrectos.'
          : (err?.error?.detail || 'Error al iniciar sesión.');
      }
    });
  }

  // No redirigimos automáticamente si hay sesión
  ngOnInit(): void {}
}
