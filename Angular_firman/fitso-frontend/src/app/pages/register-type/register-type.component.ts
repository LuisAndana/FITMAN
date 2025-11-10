import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-register-type',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './register-type.component.html',
  styleUrls: ['./register-type.component.css']
})
export class RegisterTypeComponent {
  constructor(private router: Router) {}

  selectType(type: 'cliente' | 'nutriologo'): void {
    console.log('📝 Seleccionado:', type);
    sessionStorage.setItem('tipoUsuarioSeleccionado', type);
    this.router.navigate(['/register']);
  }
}