import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface UsuarioPerfil {
  id_usuario?: number;
  nombre: string;
  correo: string;
  edad: number | null;
  peso: number | null;        // kg
  altura: number | null;      // m
  objetivo: string | null;
  enfermedades?: string[];
  peso_inicial?: number | null;
  descripcion_medica?: string | null;   // <- NUEVO
}

@Component({
  selector: 'app-profile-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile-cliente.component.html',
  styleUrls: ['./profile-cliente.component.css']
})
export class ProfileClienteComponent implements OnInit {
  editMode = false;

  usuario: UsuarioPerfil = {
    nombre: '',
    correo: '',
    edad: null,
    peso: null,
    altura: null,
    objetivo: null,
    enfermedades: [],
    peso_inicial: 95,
    descripcion_medica: ''
  };

  // catálogo y filtro (NUEVO)
  enfermedadesCatalog: string[] = [];
  filtroEnfer = '';

  estadisticas = { entrenamientos: 0, racha: 0, logros: 0, progreso: 0 };
  cambioPeso = 0;

  cargando = false;
  mensaje = '';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarCatalogo();
  }

  private recomputarCambioPeso() {
    const pi = this.usuario.peso_inicial ?? 95;
    const p  = this.usuario.peso ?? pi;
    this.cambioPeso = +(pi - p).toFixed(1);
  }

  private cargarCatalogo(): void {
    // intenta traer catálogo del backend; si falla, usa fallback
    this.auth.getIllnessesCatalog().subscribe({
      next: (arr) => this.enfermedadesCatalog = Array.isArray(arr) ? arr : [],
      error: () => this.enfermedadesCatalog = [
        'Diabetes','Hipertensión','Asma','Artritis','Enfermedad renal',
        'Cáncer','Hipotiroidismo','Cardiopatía','Obesidad','Migraña','Tiroiditis'
      ]
    });
  }

  cargarDatos(): void {
    const localId = localStorage.getItem('usuarioId');
    this.cargando = true;

    const cargarPorId = (id: string | number) => {
      this.auth.getUserById(id).subscribe({
        next: (u: any) => {
          this.usuario = {
            id_usuario : u.id_usuario ?? u.id,
            nombre     : u.nombre,
            correo     : u.correo,
            edad       : u.edad ?? null,
            peso       : u.peso ?? null,
            altura     : u.altura ?? null,
            objetivo   : u.objetivo ?? null,
            enfermedades: Array.isArray(u.enfermedades) ? u.enfermedades : [],
            peso_inicial: u.peso_inicial ?? 95,
            descripcion_medica: u.descripcion_medica ?? ''
          };
          this.recomputarCambioPeso();
          this.estadisticas = u.estadisticas ?? { entrenamientos: 24, racha: 8, logros: 5, progreso: 65 };
          this.cargando = false;
        },
        error: (err) => {
          console.error('Error getUserById', err);
          this.mensaje = err?.error?.detail || 'No se pudieron cargar los datos.';
          this.cargando = false;
        }
      });
    };

    if (localId) {
      cargarPorId(localId);
    } else {
      this.auth.getCurrentUser().subscribe({
        next: (me: any) => {
          const id = me?.id_usuario ?? me?.id;
          if (!id) throw new Error('No se encontró ID de usuario.');
          localStorage.setItem('usuarioId', String(id));
          cargarPorId(id);
        },
        error: () => this.router.navigateByUrl('/login'),
      });
    }
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    if (!this.editMode) this.guardarCambios();
  }

  calcularIMC(): string {
    const { peso, altura } = this.usuario;
    if (!peso || !altura) return '0.0';
    const imc = peso / (altura * altura);
    return imc.toFixed(1);
  }

  // —— Enfermedades
  addEnfermedad(input: HTMLInputElement): void {
    const val = (input?.value || '').trim();
    if (!val) return;
    this.usuario.enfermedades = this.usuario.enfermedades || [];
    if (!this.usuario.enfermedades.includes(val)) {
      this.usuario.enfermedades.push(val);
    }
    input.value = '';
  }

  removeEnfermedad(i: number): void {
    this.usuario.enfermedades?.splice(i, 1);
  }

  toggleFromCatalog(item: string) {
    this.usuario.enfermedades = this.usuario.enfermedades || [];
    const idx = this.usuario.enfermedades.indexOf(item);
    if (idx >= 0) this.usuario.enfermedades.splice(idx, 1);
    else this.usuario.enfermedades.push(item);
  }

  isChecked(item: string): boolean {
    return (this.usuario.enfermedades || []).includes(item);
  }

  get enfermedadesFiltradas(): string[] {
    const f = (this.filtroEnfer || '').toLowerCase();
    return this.enfermedadesCatalog.filter(x => x.toLowerCase().includes(f));
  }

  onPesoChange(): void { this.recomputarCambioPeso(); }

  guardarCambios(): void {
    const id = this.usuario.id_usuario || localStorage.getItem('usuarioId');
    if (!id) {
      alert('No se encontró ID de usuario, inicia sesión nuevamente.');
      return;
    }

    const payload = {
      nombre: this.usuario.nombre,
      edad: this.usuario.edad,
      peso: this.usuario.peso,
      altura: this.usuario.altura,
      objetivo: this.usuario.objetivo,
      enfermedades: this.usuario.enfermedades ?? [],
      peso_inicial: this.usuario.peso_inicial ?? 95,
      descripcion_medica: this.usuario.descripcion_medica ?? ''   // <- NUEVO
    };

    this.auth.updateUser(id, payload).subscribe({
      next: (u: any) => {
        this.mensaje = 'Cambios guardados.';
        this.usuario = { ...this.usuario, ...u };
        this.recomputarCambioPeso();
      },
      error: (err) => {
        console.error('Error updateUser', err);
        alert(err?.error?.detail || 'No se pudieron guardar los cambios.');
      }
    });
  }

  verProgreso(): void { this.router.navigateByUrl('/progreso'); }
}
