import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NutriologosService } from '../../services/nutriologos.service';

@Component({
  standalone: true,
  selector: 'app-nutriologo-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './nutriologo-detail.component.html',
  styleUrls: ['./nutriologo-detail.component.css']
})
export class NutriologoDetailComponent implements OnInit {
  data: any;
  loading = true;

  constructor(private route: ActivatedRoute, private api: NutriologosService) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getById(id).subscribe({
      next: d => { this.data = d; this.loading = false; },
      error: _ => { this.loading = false; }
    });
  }

  // 👉 Placeholder para agendar cita (puedes cambiar a navegar/abrir modal)
  requestAppointment(): void {
    alert('Función de agendar consulta en construcción 🛠️');
  }

  // 👉 Enviar mensaje: usa mailto si hay correo público del nutriólogo
  sendMessage(): void {
    const email = this.data?.correo || '';
    const subject = encodeURIComponent('Consulta nutricional');
    const body = encodeURIComponent('Hola, me gustaría agendar una consulta.');
    if (email) {
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    } else {
      alert('El nutriólogo no tiene correo público disponible.');
    }
  }
}
