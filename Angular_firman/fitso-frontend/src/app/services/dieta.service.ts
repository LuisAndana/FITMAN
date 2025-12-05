import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Dieta {
  id_dieta: number;
  nombre: string;
  contenido: string;
  calorias_totales: number;
  objetivo: string;
  fecha_creacion: string;
  dias_duracion?: number;
  fecha_vencimiento?: string;
  estado?: string;
  dias_restantes?: number;
}

export interface EstadoDietas {
  dietas_activas: number;
  dietas_vencidas: number;
  proxima_vencimiento?: string;
  dietas: Array<{
    id_dieta: number;
    nombre: string;
    dias_restantes: number;
    fecha_vencimiento: string;
    estado: string;
  }>;
}

export interface DietaParsed {
  tiene_estructura: boolean;
  dias?: Array<{
    numero: number;
    comidas: {
      [key: string]: {
        kcal: string;
        items: string[];
      };
    };
  }>;
  texto_completo: string;
}

@Injectable({
  providedIn: 'root'
})
export class DietaService {
  private http = inject(HttpClient);
  private baseUrl = 'http://127.0.0.1:8000';

  constructor() {}

  /**
   * ✅ OBTENER MIS DIETAS ASIGNADAS (solo activas)
   * GET /api/clientes/mis-dietas-asignadas
   */
  obtenerDietasAsignadas(): Observable<Dieta[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log('📋 Obteniendo mis dietas...');
    return this.http.get<Dieta[]>(
      `${this.baseUrl}/api/clientes/mis-dietas-asignadas`,
      { headers }
    );
  }

  /**
   * 🆕 OBTENER SOLO DIETAS DISPONIBLES HOY
   * Filtra las dietas que están vigentes en la fecha actual
   */
  obtenerDietasDisponiblesHoy(): Observable<Dieta[]> {
    return this.obtenerDietasAsignadas().pipe(
      map((dietas: Dieta[]) => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const dietasDisponibles = dietas.filter(dieta => 
          this.esDietaDisponibleEnFecha(dieta, hoy)
        );

        console.log(`📅 Dietas disponibles hoy: ${dietasDisponibles.length} de ${dietas.length}`);
        return dietasDisponibles;
      })
    );
  }

  /**
   * 🆕 OBTENER DIETAS DISPONIBLES PARA UNA FECHA ESPECÍFICA
   */
  obtenerDietasDisponiblesPorFecha(fecha: Date): Observable<Dieta[]> {
    return this.obtenerDietasAsignadas().pipe(
      map((dietas: Dieta[]) => {
        return dietas.filter(dieta => 
          this.esDietaDisponibleEnFecha(dieta, fecha)
        );
      })
    );
  }

  /**
   * 🆕 VALIDAR SI UNA DIETA ESTÁ DISPONIBLE EN UNA FECHA
   * Una dieta está disponible si:
   * - fecha >= fecha_creacion (ya comenzó)
   * - fecha <= fecha_vencimiento (aún no vence)
   */
  private esDietaDisponibleEnFecha(dieta: Dieta, fecha: Date): boolean {
    const fechaValidar = new Date(fecha);
    fechaValidar.setHours(0, 0, 0, 0);

    // Fecha de creación de la dieta
    const fechaCreacion = new Date(dieta.fecha_creacion);
    fechaCreacion.setHours(0, 0, 0, 0);

    // Calcular fecha de vencimiento
    let fechaVencimiento = new Date(dieta.fecha_creacion);
    if (dieta.dias_duracion) {
      fechaVencimiento.setDate(
        fechaVencimiento.getDate() + dieta.dias_duracion
      );
    } else {
      // Si no tiene duración, asumir 30 días por defecto
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
    }
    fechaVencimiento.setHours(23, 59, 59, 999);

    // ✅ Retornar true solo si está en rango válido
    const disponible = fechaValidar >= fechaCreacion && fechaValidar <= fechaVencimiento;

    return disponible;
  }

  /**
   * 🆕 OBTENER INFORMACIÓN DETALLADA SOBRE DISPONIBILIDAD
   * Útil para debugging y análisis
   */
  obtenerInfoDisponibilidad(dieta: Dieta): {
    estaDisponibleHoy: boolean;
    fechaCreacion: Date;
    fechaVencimiento: Date;
    diasRestantes: number;
    estado: string;
  } {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaCreacion = new Date(dieta.fecha_creacion);
    fechaCreacion.setHours(0, 0, 0, 0);

    let fechaVencimiento = new Date(dieta.fecha_creacion);
    if (dieta.dias_duracion) {
      fechaVencimiento.setDate(
        fechaVencimiento.getDate() + dieta.dias_duracion
      );
    } else {
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
    }
    fechaVencimiento.setHours(23, 59, 59, 999);

    const estaDisponible = hoy >= fechaCreacion && hoy <= fechaVencimiento;

    const diferencia = fechaVencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    let estado = '';
    if (!estaDisponible && hoy < fechaCreacion) {
      estado = 'PENDIENTE';
    } else if (estaDisponible) {
      estado = 'DISPONIBLE';
    } else {
      estado = 'VENCIDA';
    }

    return {
      estaDisponibleHoy: estaDisponible,
      fechaCreacion,
      fechaVencimiento,
      diasRestantes,
      estado
    };
  }

  /**
   * ✅ OBTENER UNA DIETA ESPECÍFICA
   * GET /api/clientes/dieta/{dieta_id}
   */
  obtenerDieta(dietaId: number): Observable<Dieta> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log(`📋 Obteniendo dieta ${dietaId}...`);
    return this.http.get<Dieta>(
      `${this.baseUrl}/api/clientes/dieta/${dietaId}`,
      { headers }
    );
  }

  /**
   * ✅ OBTENER ESTADO DE LAS DIETAS (activas, vencidas, proximas)
   * GET /api/clientes/dietas-estado
   */
  obtenerEstadoDietas(): Observable<EstadoDietas> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log('📊 Obteniendo estado de dietas...');
    return this.http.get<EstadoDietas>(
      `${this.baseUrl}/api/clientes/dietas-estado`,
      { headers }
    );
  }

  /**
   * ✅ OBTENER MIS DIETAS (todas)
   * GET /api/clientes/mis-dietas
   */
  obtenerMisDietas(): Observable<Dieta[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log('📋 Obteniendo todas mis dietas...');
    return this.http.get<Dieta[]>(
      `${this.baseUrl}/api/clientes/mis-dietas`,
      { headers }
    );
  }

  /**
   * ✅ ASIGNAR DIETA A CLIENTE (Nutriólogo)
   * POST /api/clientes/asignar-dieta
   */
  asignarDietaAlCliente(idDieta: number, idCliente: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log(`✅ Asignando dieta ${idDieta} al cliente ${idCliente}...`);
    return this.http.post(
      `${this.baseUrl}/api/clientes/asignar-dieta`,
      { id_dieta: idDieta, id_cliente: idCliente },
      { headers }
    );
  }

  /**
   * ✅ ACTUALIZAR DIETA CUANDO VENCE (Nutriólogo)
   * POST /api/clientes/actualizar-dieta-vencida
   */
  actualizarDietaVencida(request: {
    id_dieta_anterior: number;
    nombre_nueva: string;
    descripcion_nueva: string;
    calorias_nuevas: number;
    dias_duracion: number;
  }): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log(`🔄 Actualizando dieta ${request.id_dieta_anterior}...`);
    return this.http.post(
      `${this.baseUrl}/api/clientes/actualizar-dieta-vencida`,
      request,
      { headers }
    );
  }

  /**
   * ✅ DESCARGAR DIETA EN PDF (desde el backend)
   * GET /api/clientes/descargar-pdf/{dieta_id}
   */
  descargarDietaPDF(dietaId: number): Observable<Blob> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    console.log(`📥 Intentando descargar PDF desde backend...`);
    return this.http.get(
      `${this.baseUrl}/api/clientes/descargar-pdf/${dietaId}`,
      {
        headers,
        responseType: 'blob'
      }
    );
  }

  /**
   * 🆕 PARSEAR CONTENIDO DE DIETA
   * Convierte texto plano en estructura de datos
   */
  parsearContenidoDieta(contenido: string): DietaParsed {
    if (!contenido) {
      return {
        tiene_estructura: false,
        texto_completo: '',
        dias: []
      };
    }

    // Buscar patrones de días
    const patronDias = /###?\s*\*?\*?DÍA\s+(\d+)\*?\*?/gi;
    
    // Verificar si tiene estructura de días
    if (!patronDias.test(contenido)) {
      return {
        tiene_estructura: false,
        texto_completo: contenido,
        dias: []
      };
    }

    const dias: Array<any> = [];
    const partes = contenido.split(/###?\s*\*?\*?DÍA\s+(\d+)\*?\*?/i);

    for (let i = 1; i < partes.length; i += 2) {
      const numeroDia = parseInt(partes[i]);
      const contenidoDia = partes[i + 1] || '';

      const comidas: any = {};
      const tiposComida = ['DESAYUNO', 'ALMUERZO', 'MERIENDA', 'CENA', 'COMIDA'];

      tiposComida.forEach(tipo => {
        const patronComida = new RegExp(
          `\\*?\\*?${tipo}\\s*\\(Aprox\\.\\s+(\\d+)\\s+kcal\\)\\*?\\*?[\\s\\S]*?(?=\\*?\\*?(?:DESAYUNO|ALMUERZO|MERIENDA|CENA|COMIDA|DÍA|Recomendaciones|#|$))`,
          'i'
        );

        const match = contenidoDia.match(patronComida);
        if (match) {
          const texto = match[0];
          const kcal = match[1];

          // Extraer items
          const items = texto
            .split('\n')
            .filter(l => l.trim().match(/^[\*\-]/))
            .map(l => l.replace(/^[\*\-]\s*/, '').trim())
            .filter(l => l && !l.toUpperCase().includes('DESAYUNO') && 
                        !l.toUpperCase().includes('ALMUERZO') &&
                        !l.toUpperCase().includes('MERIENDA') &&
                        !l.toUpperCase().includes('CENA'));

          comidas[tipo.toLowerCase()] = { kcal, items };
        }
      });

      if (Object.keys(comidas).length > 0) {
        dias.push({ numero: numeroDia, comidas });
      }
    }

    return {
      tiene_estructura: dias.length > 0,
      dias: dias.length > 0 ? dias : undefined,
      texto_completo: contenido
    };
  }

  /**
   * 🆕 CALCULAR CALORÍAS TOTALES DE UN DÍA
   * Suma las calorías de todas las comidas
   */
  calcularCaloriasDia(dia: any): number {
    let total = 0;
    if (!dia.comidas) return 0;

    Object.values(dia.comidas).forEach((comida: any) => {
      if (comida.kcal) {
        total += parseInt(comida.kcal) || 0;
      }
    });

    return total;
  }

  /**
   * 🆕 OBTENER RESUMEN NUTRICIONAL
   * Extrae información clave de la dieta
   */
  obtenerResumenNutricional(dieta: Dieta): any {
    const parseado = this.parsearContenidoDieta(dieta.contenido);

    return {
      nombre_dieta: dieta.nombre,
      objetivo: dieta.objetivo,
      calorias_totales: dieta.calorias_totales,
      duracion_dias: dieta.dias_duracion || 30,
      tiene_estructura: parseado.tiene_estructura,
      num_dias: parseado.dias?.length || 0,
      fecha_creacion: dieta.fecha_creacion,
      estado: dieta.estado || 'activa'
    };
  }
}