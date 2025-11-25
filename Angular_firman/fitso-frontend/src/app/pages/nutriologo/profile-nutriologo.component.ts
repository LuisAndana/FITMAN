// src/app/pages/nutriologo/profile-nutriologo.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpEvent, HttpEventType } from '@angular/common/http';

interface NutriPerfil {
  id_usuario?: number;
  nombre: string;
  correo: string;
  profesion: string | null;
  numero_cedula: string | null;
  validado: boolean;
  documento_url?: string; // <-- agregado
}

@Component({
  selector: 'app-profile-nutriologo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile-nutriologo.component.html',
  styleUrls: ['./profile-nutriologo.component.css']
})
export class ProfileNutriologoComponent implements OnInit {
  editMode = false;
  cargando = false;
  mensaje = '';

  // Perfil
  usuario: NutriPerfil = {
    nombre: '',
    correo: '',
    profesion: null,
    numero_cedula: null,
    validado: false
  };

  // Subida de documento de validación
  archivoSeleccionado: File | null = null;
  archivoNombre = '';
  subidaProgreso = 0;
  subidaMensaje = '';
  subiendo = false;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.cargar();
  }

  /** Carga el perfil. Si no hay usuarioId en localStorage, hace fallback a /auth/me */
  private cargar(): void {
    const idLocal = localStorage.getItem('usuarioId');

    const cargarPorId = (id: string | number) => {
      this.cargando = true;
      this.auth.getUserById(id).subscribe({
        next: (u) => {
          this.usuario = {
            id_usuario: u?.id_usuario ?? u?.id,
            nombre: u?.nombre ?? '',
            correo: u?.correo ?? '',
            profesion: u?.profesion ?? null,
            numero_cedula: u?.numero_cedula ?? null,
            validado: !!u?.validado,
            documento_url: u?.documento_url ?? this.usuario.documento_url
          };
          this.cargando = false;
        },
        error: (err: any) => {
          console.error(err);
          this.mensaje = err?.error?.detail || 'No se pudo cargar el perfil.';
          this.cargando = false;
        }
      });
    };

    if (idLocal) {
      cargarPorId(idLocal);
      return;
    }

    // Fallback: obtener /auth/me y luego cargar por id
    this.cargando = true;
    this.auth.getCurrentUser().subscribe({
      next: (me: any) => {
        const id = me?.id_usuario ?? me?.id ?? null;
        if (id != null) {
          localStorage.setItem('usuarioId', String(id));
          if (me?.tipo_usuario) localStorage.setItem('tipoUsuario', me.tipo_usuario);
          if (me?.correo) localStorage.setItem('correoUsuario', me.correo);
          cargarPorId(id);
        } else {
          this.cargando = false;
          this.router.navigateByUrl('/login');
        }
      },
      error: () => {
        this.cargando = false;
        this.router.navigateByUrl('/login');
      }
    });
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    if (!this.editMode) this.guardar();
  }

  guardar(): void {
    const id = this.usuario.id_usuario || localStorage.getItem('usuarioId');
    if (!id) return;

    const payload = {
      nombre: this.usuario.nombre,
      profesion: this.usuario.profesion,
      numero_cedula: this.usuario.numero_cedula,
    };

    this.auth.updateUser(id, payload).subscribe({
      next: (u: any) => {
        // Merge por si el backend devuelve campos distintos
        this.usuario = {
          ...this.usuario,
          id_usuario: u?.id_usuario ?? this.usuario.id_usuario,
          nombre: u?.nombre ?? this.usuario.nombre,
          correo: u?.correo ?? this.usuario.correo,
          profesion: u?.profesion ?? this.usuario.profesion,
          numero_cedula: u?.numero_cedula ?? this.usuario.numero_cedula,
          validado: u?.validado ?? this.usuario.validado,
          documento_url: u?.documento_url ?? this.usuario.documento_url
        };
        this.mensaje = 'Cambios guardados.';
      },
      error: (err: any) => {
        console.error(err);
        this.mensaje = err?.error?.detail || 'No se pudieron guardar los cambios.';
      }
    });
  }

  // ============================
  //  Subida de documento aval
  // ============================

  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files || !input.files.length) return;

    const file = input.files[0];

    // Validaciones simples
    const okType = /^(application\/pdf|image\/(png|jpeg|jpg))$/i.test(file.type);
    const okSize = file.size <= 10 * 1024 * 1024; // 10MB

    if (!okType) {
      this.subidaMensaje = 'Formato no permitido. Sube PDF, JPG o PNG.';
      this.archivoSeleccionado = null;
      this.archivoNombre = '';
      return;
    }
    if (!okSize) {
      this.subidaMensaje = 'El archivo supera 10 MB.';
      this.archivoSeleccionado = null;
      this.archivoNombre = '';
      return;
    }

    this.archivoSeleccionado = file;
    this.archivoNombre = file.name;
    this.subidaMensaje = '';
    this.subidaProgreso = 0;
  }

  subirDocumento(): void {
    if (!this.archivoSeleccionado) {
      this.subidaMensaje = 'Selecciona un archivo antes de subir.';
      return;
    }
    this.subiendo = true;
    this.subidaProgreso = 0;
    this.subidaMensaje = '';

    this.auth.uploadNutriDocumento(this.archivoSeleccionado).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const loaded = (event as any).loaded as number | undefined;
          const total  = (event as any).total  as number | undefined;
          if (loaded && total) {
            this.subidaProgreso = Math.round(100 * loaded / total);
          }
        } else if (event.type === HttpEventType.Response) {
          const body: any = (event as any).body;
          if (body?.validado !== undefined) this.usuario.validado = !!body.validado;
          if (body?.documento_url) this.usuario.documento_url = body.documento_url;

          this.subiendo = false;
          this.subidaMensaje = 'Documento enviado. Quedará pendiente hasta validación.';
          this.archivoSeleccionado = null;
          this.archivoNombre = '';
          this.subidaProgreso = 100;
        }
      },
      error: (err: any) => {
        console.error(err);
        this.subiendo = false;
        this.subidaMensaje = err?.error?.detail || 'No se pudo subir el documento.';
      }
    });
  }

  cancelarSeleccion(): void {
    this.archivoSeleccionado = null;
    this.archivoNombre = '';
    this.subidaProgreso = 0;
    this.subidaMensaje = '';
  }
}