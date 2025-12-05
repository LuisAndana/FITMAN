import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NutriologosService } from '../../services/nutriologos.service';
import { AuthService } from '../../services/auth.service';
import { ContratoService } from '../../services/contrato.service';
import { ContratoStateService } from '../../services/contrato-state.service';
import { ResenaModalComponent } from '../../pages/resenas/resenas-modal.component';
import { ResenaFormComponent } from '../../pages/resenas/resena-form.component';

@Component({
  standalone: true,
  selector: 'app-nutriologo-detail',
  imports: [CommonModule, RouterModule, ResenaModalComponent, ResenaFormComponent],
  templateUrl: './nutriologo-detail.component.html',
  styleUrls: ['./nutriologo-detail.component.css']
})
export class NutriologoDetailComponent implements OnInit {
  data: any;
  loading = true;
  userAuthenticated = false;
  isNutriologo = false;
  procesando = false;

  // Modales de reseñas
  showResenas = false;
  showFormResena = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: NutriologosService,
    private auth: AuthService,
    private contratoService: ContratoService,
    private contratoStateService: ContratoStateService
  ) {}

  ngOnInit() {
    // ✔ Detectar sesión
    this.userAuthenticated = !!localStorage.getItem('auth_token');

    // ✔ Saber si el usuario logeado es nutriólogo
    const tipo = localStorage.getItem('tipoUsuario');
    this.isNutriologo = tipo === 'nutriologo';

    // ✔ Cargar datos del nutriólogo
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getById(id).subscribe({
      next: d => {
        this.data = d;
        this.loading = false;
        console.log('✅ Nutriólogo cargado:', d);
      },
      error: err => {
        console.error('❌ Error cargando nutriólogo:', err);
        this.loading = false;
      }
    });
  }

  /**
   * 💳 CONTRATAR NUTRIÓLOGO - FLUJO MEJORADO
   */
  hireNutritionist(): void {
    console.log('🔄 Iniciando proceso de contratación...');

    // ✅ PASO 1: Validar que esté autenticado
    if (!this.userAuthenticated) {
      console.warn('⚠️  Usuario no autenticado');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: `/nutriologos/${this.data.id_usuario}` }
      });
      return;
    }

    // ✅ PASO 2: Validar que NO sea nutriólogo
    if (this.isNutriologo) {
      alert('❌ Los nutriólogos no pueden contratar otros servicios.');
      console.warn('⚠️  Usuario es nutriólogo');
      return;
    }

    // ✅ PASO 3: Validar datos del nutriólogo
    if (!this.data || !this.data.id_usuario) {
      alert('Error: Datos del nutriólogo no disponibles');
      console.error('❌ Datos incompletos:', this.data);
      return;
    }

    this.procesando = true;

    try {
      // ✅ PASO 4: Crear objeto de contrato con datos del nutriólogo
      const contrato = {
        id_nutriologo: this.data.id_usuario,
        nutriologo_nombre: this.data.nombre || 'Nutriólogo',
        monto: this.data.precio ?? 20,
        duracion_meses: 1,
        descripcion_servicios: `Plan nutricional con ${this.data.nombre}`,
        profesion: this.data.profesion,
        numero_cedula: this.data.numero_cedula
      };

      console.log('📝 Contrato creado:', contrato);

      // ✅ PASO 5: Guardar en ContratoStateService
      this.contratoStateService.setContrato(contrato);
      console.log('💾 Contrato guardado en servicio');

      // ✅ PASO 6: Navegar a página de pago
      console.log('🔀 Navegando a /pago-stripe');
      this.router.navigate(['/pago-stripe']);

      this.procesando = false;
    } catch (error) {
      console.error('❌ Error en proceso de contratación:', error);
      alert('Error al procesar la contratación. Intenta de nuevo.');
      this.procesando = false;
    }
  }

  /**
   * 📝 ABRIR MODAL DE RESEÑAS
   */
  openResenas(): void {
    if (!this.data?.id_usuario) {
      alert('Error: No se puede cargar las reseñas');
      return;
    }
    this.showResenas = true;
    console.log('📝 Abriendo modal de reseñas');
  }

  closeResenas(): void {
    this.showResenas = false;
    console.log('❌ Cerrando modal de reseñas');
  }

  /**
   * ⭐ ABRIR FORMULARIO PARA CREAR RESEÑA
   */
  openFormResena(): void {
    if (!this.userAuthenticated) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/nutriologos/${this.data.id_usuario}` }
      });
      return;
    }

    if (this.isNutriologo) {
      alert('❌ Los nutriólogos no pueden crear reseñas');
      return;
    }

    this.showFormResena = true;
    console.log('⭐ Abriendo formulario de reseña');
  }

  closeFormResena(): void {
    this.showFormResena = false;
    console.log('❌ Cerrando formulario de reseña');
  }

  /**
   * ✅ RESEÑA CREADA EXITOSAMENTE
   */
  onResenaCreated(): void {
    console.log('✅ Reseña creada! Refrescando...');
    this.showFormResena = false;
    // Reabrir modal de reseñas para ver la nueva
    setTimeout(() => {
      this.showResenas = true;
    }, 500);
  }

  /**
   * 📅 AGENDAR CONSULTA (funcionalidad futura)
   */
  requestAppointment(): void {
    console.log('📅 Agendar consulta - en construcción');
    alert('Función de agendar consulta en construcción 🛠️');
  }

  /**
   * 💬 ENVIAR MENSAJE AL NUTRIÓLOGO
   */
  sendMessage(): void {
    if (!this.data?.correo) {
      alert('El nutriólogo no tiene correo público disponible.');
      return;
    }

    const email = this.data.correo;
    const subject = encodeURIComponent('Consulta nutricional');
    const body = encodeURIComponent('Hola, me gustaría agendar una consulta.');
    
    console.log('💬 Abriendo cliente de correo:', email);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }
}