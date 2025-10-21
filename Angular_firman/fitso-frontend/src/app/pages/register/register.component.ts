import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  mensaje = '';
  cargando = false;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    // ✅ Aquí corregimos los paréntesis y el error con "V"
    this.registerForm = this.fb.group({
      nombre: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]],
      edad: [null, [Validators.required, Validators.min(10)]],
      peso: [null, [Validators.required, Validators.min(30)]],
      altura: [null, [Validators.required, Validators.min(1)]],
      objetivo: ['', Validators.required]
    });
  }

  // ✅ Este método sí existirá ahora
  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.mensaje = 'Completa todos los campos correctamente.';
      return;
    }

    this.cargando = true;
    const formData = this.registerForm.value;

    this.authService.register(formData).subscribe({
      next: (res) => {
        console.log('✅ Usuario registrado:', res);
        this.mensaje = 'Registro exitoso 🎉';
        this.cargando = false;
      },
      error: (err) => {
        console.error('❌ Error en registro:', err);
        this.mensaje = err.error?.detail || 'Error al registrar usuario.';
        this.cargando = false;
      }
    });
  }
}
