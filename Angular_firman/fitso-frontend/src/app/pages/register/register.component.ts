import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type TipoUsuario = 'cliente' | 'nutriologo';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  cargando = false;
  errorMsg = '';

  objetivos = [
    { value: 'bajar_peso',    label: 'Bajar peso' },
    { value: 'mantener',      label: 'Mantener' },
    { value: 'aumentar_masa', label: 'Aumentar masa' },
  ];

  // Declaramos el form y lo construimos en el constructor (desaparece el error de “fb antes de inicializar”)
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.buildForm();
  }

  private buildForm() {
    this.form = this.fb.group({
      // tipo seleccionado
      tipo: ['cliente', Validators.required],

      // campos comunes
      nombre: ['', [Validators.required, Validators.minLength(1)]],
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],

      // cliente
      edad: [null],
      peso: [null],
      altura: [null],
      objetivo: [''],

      // nutriólogo
      profesion: [''],
      numero_cedula: ['']
    });

    // aplicar validadores iniciales
    this.applyTypeValidators(this.form.get('tipo')!.value as TipoUsuario);

    // si cambia el tipo en el select/botón, re-aplicar
    this.form.get('tipo')!.valueChanges.subscribe(t =>
      this.applyTypeValidators((t as TipoUsuario) ?? 'cliente')
    );
  }

  // Helper para el template (evitamos el error "never" usando método)
  setTipo(tipo: TipoUsuario) {
    this.form.get('tipo')!.setValue(tipo as any);
    this.applyTypeValidators(tipo);
  }

  get isCliente()    { return this.form.get('tipo')!.value === 'cliente'; }
  get isNutriologo() { return this.form.get('tipo')!.value === 'nutriologo'; }

  private applyTypeValidators(tipo: TipoUsuario) {
    const f = this.form;

    // Comunes siempre requeridos
    f.get('nombre')!.setValidators([Validators.required, Validators.minLength(1)]);
    f.get('correo')!.setValidators([Validators.required, Validators.email]);
    f.get('contrasena')!.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(72)]);

    // limpiar primero
    const clear = (c: string) => { f.get(c)!.clearValidators(); f.get(c)!.updateValueAndValidity({emitEvent:false}); };

    if (tipo === 'cliente') {
      f.get('edad')!.setValidators([Validators.required, Validators.min(1), Validators.max(150)]);
      f.get('peso')!.setValidators([Validators.required, Validators.min(1)]);
      f.get('altura')!.setValidators([Validators.required, Validators.min(0.5), Validators.max(3.0)]);
      f.get('objetivo')!.setValidators([Validators.required]);

      clear('profesion'); clear('numero_cedula');
    } else {
      f.get('profesion')!.setValidators([Validators.required, Validators.minLength(2)]);
      f.get('numero_cedula')!.setValidators([Validators.required, Validators.minLength(3)]);

      clear('edad'); clear('peso'); clear('altura'); clear('objetivo');
    }

    ['edad','peso','altura','objetivo','profesion','numero_cedula','nombre','correo','contrasena']
      .forEach(c => f.get(c)!.updateValueAndValidity({emitEvent:false}));
  }

  submit() {
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg = 'Completa todos los campos correctamente.';
      return;
    }

    const v = this.form.value as any;
    const tipo: TipoUsuario = v.tipo;

    const base = {
      nombre: v.nombre,
      correo: v.correo,
      contrasena: v.contrasena
    };

    const payload = (tipo === 'cliente')
      ? { ...base, edad: +v.edad, peso: +v.peso, altura: +v.altura, objetivo: v.objetivo }
      : { ...base, tipo_usuario: 'nutriologo', profesion: v.profesion, numero_cedula: v.numero_cedula };

    this.cargando = true;
    this.auth.register(payload, tipo).subscribe({
      next: () => { this.cargando = false; this.router.navigateByUrl('/login'); },
      error: (err) => {
        this.cargando = false;
        this.errorMsg = err?.error?.detail || 'No se pudo registrar. Intenta de nuevo.';
      }
    });
  }
}
