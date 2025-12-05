import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DietaService, type EstadoDietas } from '../../services/dieta.service';

interface Estadisticas {
  nutritionistasContratados: number;
  dietasActivas: number;
  contratosActivos: number;
}

interface Contrato {
  id_contrato: number;
  otro_usuario_nombre: string;
  monto: number;
  moneda: string;
  estado: string;
  duracion_meses: number;
  fecha_creacion: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  usuario: any = null;
  menuOpen = false;
  tipoUsuario: string = '';
  cargando = true;
  estadisticas: Estadisticas = {
    nutritionistasContratados: 0,
    dietasActivas: 0,
    contratosActivos: 0
  };

  // ✅ NUEVO: Variables para modal de contratos
  mostrarModalContratos = false;
  contratos: Contrato[] = [];
  cargandoContratos = false;
  diasRestantes: { [key: number]: number } = {};

  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private dietaService: DietaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.cargarEstadisticas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserData(): void {
    const token = this.auth.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.tipoUsuario = localStorage.getItem('tipoUsuario') || 'cliente';

    const userData = localStorage.getItem('usuario');
    if (userData) {
      try {
        this.usuario = JSON.parse(userData);
      } catch (e) {
        this.usuario = { correo: 'usuario@fitman.com' };
      }
    }

    // Si es nutriólogo, redirigir a su panel
    if (this.tipoUsuario === 'nutriologo') {
      this.router.navigate(['/profile/nutriologo']);
    }
  }

  cargarEstadisticas(): void {
    // Cargar estado de dietas
    this.dietaService.obtenerEstadoDietas()
      .pipe(
        takeUntil(this.destroy$),
        catchError((err: any) => {
          console.error('Error cargando dietas:', err);
          return of(null);
        })
      )
      .subscribe((data: EstadoDietas | null) => {
        if (data) {
          this.estadisticas.dietasActivas = data.dietas_activas;
        }
        this.cargando = false;
      });
  }

  /**
   * ✅ NUEVO: Abre modal de contratos activos
   */
  abrirModalContratos(): void {
    this.mostrarModalContratos = true;
    this.cargarContratos();
  }

  /**
   * ✅ NUEVO: Cierra modal de contratos
   */
  cerrarModalContratos(): void {
    this.mostrarModalContratos = false;
  }

  /**
   * ✅ NUEVO: Carga contratos activos del usuario
   */
  cargarContratos(): void {
    this.cargandoContratos = true;
    const usuarioId = localStorage.getItem('usuarioId');

    if (!usuarioId) {
      console.error('No hay usuario ID');
      this.cargandoContratos = false;
      return;
    }

    // Llamar al servicio de auth para obtener contratos
    this.auth.getMisContratos(usuarioId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err: any) => {
          console.error('Error cargando contratos:', err);
          return of(null);
        })
      )
      .subscribe((data: any) => {
        if (data && data.contratos) {
          this.contratos = data.contratos;
          this.calcularDiasRestantes();
          this.estadisticas.contratosActivos = this.contratos.filter(
            c => c.estado === 'ACTIVO'
          ).length;
        }
        this.cargandoContratos = false;
      });
  }

  /**
   * ✅ NUEVO: Calcula días restantes para cada contrato
   */
  calcularDiasRestantes(): void {
    this.contratos.forEach(contrato => {
      if (contrato.fecha_fin) {
        const fechaFin = new Date(contrato.fecha_fin);
        const hoy = new Date();
        const diferencia = fechaFin.getTime() - hoy.getTime();
        const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
        this.diasRestantes[contrato.id_contrato] = dias;
      } else if (contrato.fecha_inicio && contrato.duracion_meses) {
        // Si no hay fecha_fin, calcularla desde fecha_inicio + duracion_meses
        const fechaInicio = new Date(contrato.fecha_inicio);
        const fechaFin = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() + contrato.duracion_meses, fechaInicio.getDate());
        const hoy = new Date();
        const diferencia = fechaFin.getTime() - hoy.getTime();
        const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
        this.diasRestantes[contrato.id_contrato] = dias;
      } else {
        // Fallback: mostrar días basados solo en duracion_meses (30 días por mes)
        const diasEstimados = (contrato.duracion_meses || 1) * 30;
        this.diasRestantes[contrato.id_contrato] = diasEstimados;
      }
    });
  }

  /**
   * ✅ NUEVO: Obtiene estado visual de los días restantes
   */
  getEstadoDiasRestantes(dias: number): string {
    if (dias <= 0) return 'Vencido';
    if (dias <= 7) return `⚠️ ${dias} día(s)`;
    if (dias <= 15) return `📅 ${dias} días`;
    return `✅ ${dias} días`;
  }

  /**
   * ✅ NUEVO: Obtiene color de estado
   */
  getColorEstado(dias: number): string {
    if (dias <= 0) return '#ff4444';
    if (dias <= 7) return '#ffa64d';
    if (dias <= 15) return '#ff7a00';
    return '#10b981';
  }

  /**
   * Navega a mis dietas
   */
  irAMisDietas(): void {
    this.router.navigate(['/dietas']);
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  logout(): void {
    this.auth.logout();
    localStorage.removeItem('tipoUsuario');
    localStorage.removeItem('usuarioId');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}