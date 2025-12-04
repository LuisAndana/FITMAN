import { Injectable } from '@angular/core';
import { Dieta } from './dieta.service';

@Injectable({
  providedIn: 'root'
})
export class FiltroDietasService {

  private normalizar(fecha: Date): Date {
    const f = new Date(fecha);
    f.setHours(0, 0, 0, 0);
    return f;
  }

  private obtenerRango(dieta: Dieta) {
    const inicio = this.normalizar(new Date(dieta.fecha_creacion));

    let fin = dieta.fecha_vencimiento 
      ? new Date(dieta.fecha_vencimiento)
      : new Date(dieta.fecha_creacion);

    // si tiene duración, usarla
    if (dieta.dias_duracion) {
      fin = new Date(dieta.fecha_creacion);
      fin.setDate(fin.getDate() + dieta.dias_duracion);
    }

    fin = this.normalizar(fin);

    return { inicio, fin };
  }

  // FILTRO POR DÍA
  filtrarDia(dietas: Dieta[], fecha: Date): Dieta[] {
    const hoy = this.normalizar(fecha);

    return dietas.filter(d => {
      const { inicio, fin } = this.obtenerRango(d);
      return hoy >= inicio && hoy <= fin;
    });
  }

  // FILTRO POR SEMANA
  filtrarSemana(dietas: Dieta[], fecha: Date): Dieta[] {
    const hoy = this.normalizar(fecha);
    const semanaDespues = new Date(hoy);
    semanaDespues.setDate(hoy.getDate() + 7);

    return dietas.filter(d => {
      const { inicio, fin } = this.obtenerRango(d);
      return fin >= hoy && inicio <= semanaDespues;
    });
  }

  // FILTRO POR MES
  filtrarMes(dietas: Dieta[], fecha: Date): Dieta[] {
    const hoy = this.normalizar(fecha);
    const mesDespues = new Date(hoy);
    mesDespues.setMonth(hoy.getMonth() + 1);

    return dietas.filter(d => {
      const { inicio, fin } = this.obtenerRango(d);
      return fin >= hoy && inicio <= mesDespues;
    });
  }
}
