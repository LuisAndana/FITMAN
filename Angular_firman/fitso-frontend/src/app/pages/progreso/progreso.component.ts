import { Component, OnDestroy, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';           // pipes (number, etc.)
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-progreso',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './progreso.component.html',
  styleUrls: ['./progreso.component.css']
})
export class ProgresoComponent implements OnInit, AfterViewInit, OnDestroy {
  // ===== KPIs usados en la plantilla =====
  pesoActual = 0;
  pesoInicial = 0;
  imcActual = 0;
  imcInicial = 0;
  cambioPeso = 0;
  progreso = 0;

  // Series para la gráfica
  labels: string[] = [];
  pesoSerie: number[] = [];
  imcSerie: number[] = [];

  private chart?: Chart;
  private ro?: ResizeObserver;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    // Observa el contenedor para evitar estiramientos del canvas al cambiar tamaño
    const canvas = document.getElementById('pesoImcChart') as HTMLCanvasElement | null;
    const container = document.getElementById('chartWrap') || canvas?.parentElement || undefined;
    if (container && 'ResizeObserver' in window) {
      this.ro = new ResizeObserver(() => {
        // Forzar re-cálculo de layout del chart
        this.chart?.resize();
      });
      this.ro.observe(container);
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.ro?.disconnect();
  }

  private cargar(): void {
    const id = localStorage.getItem('usuarioId');
    if (!id) {
      this.router.navigateByUrl('/login');
      return;
    }

    // 1) Perfil -> valores actuales vs iniciales
    this.auth.getUserById(id).subscribe({
      next: (u) => {
        this.pesoActual  = +(u?.peso ?? 0);
        this.pesoInicial = +(u?.peso_inicial ?? this.pesoActual);
        const altura     = +(u?.altura ?? 0);

        this.imcActual  = (altura > 0 && this.pesoActual)
          ? +(this.pesoActual / (altura * altura)).toFixed(1)
          : 0;

        this.imcInicial = (altura > 0 && this.pesoInicial)
          ? +(this.pesoInicial / (altura * altura)).toFixed(1)
          : 0;
      }
    });

    // 2) Progreso -> series y KPIs
    this.auth.getUserProgress(id).subscribe({
      next: (p) => {
        this.cambioPeso = +(p?.cambio_peso ?? 0);
        this.progreso   = +(p?.progreso ?? 0);

        this.labels    = p?.labels || ['Inicio', 'Actual'];
        this.pesoSerie = p?.peso_series || [this.pesoInicial, this.pesoActual];
        this.imcSerie  = p?.imc_series  || [this.imcInicial,  this.imcActual];

        // Render diferido para asegurar que el canvas esté en el DOM
        setTimeout(() => this.renderChart(), 0);
      },
      error: () => {
        // En caso de error, intenta renderizar con los valores disponibles
        setTimeout(() => this.renderChart(), 0);
      }
    });
  }

  private renderChart(): void {
    const canvas = document.getElementById('pesoImcChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(255,123,0,.35)');
    gradient.addColorStop(1, 'rgba(255,123,0,0)');

    // Destruye instancia previa si existe
    this.chart?.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.labels,
        datasets: [
          {
            label: 'Peso (kg)',
            data: this.pesoSerie,
            yAxisID: 'y',
            borderColor: '#ff7b00',
            backgroundColor: gradient,
            fill: true,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35
          },
          {
            label: 'IMC',
            data: this.imcSerie,
            yAxisID: 'y1',
            borderColor: '#ff6b8a',
            backgroundColor: 'transparent',
            borderDash: [6, 6],
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2,
            tension: 0.25
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,     // deja que el contenedor controle la altura
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#eaeaea', usePointStyle: true, boxWidth: 10 }
          },
          tooltip: {
            backgroundColor: 'rgba(20,20,20,.9)',
            titleColor: '#fff',
            bodyColor: '#eaeaea',
            borderColor: 'rgba(255,255,255,.12)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                return ctx.datasetIndex === 0
                  ? ` Peso: ${v?.toFixed(1)} kg`
                  : ` IMC: ${v?.toFixed(1)}`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: '#9aa0a6' }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: {
            position: 'left',
            title: { display: true, text: 'Peso (kg)', color: '#9aa0a6' },
            ticks: { color: '#9aa0a6' },
            grid: { color: 'rgba(255,255,255,.06)' }
          },
          y1: {
            position: 'right',
            title: { display: true, text: 'IMC', color: '#9aa0a6' },
            ticks: { color: '#9aa0a6' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }
}
