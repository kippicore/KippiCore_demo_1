import { MESES_CIERRE_BIMESTRE, NOMBRES_OBLIGACIONES } from '@/config/obligaciones';
import type { FechaISO, ParametrosObligaciones } from '@/dominio/tipos';
import { diaHabilDelMes, diasDelMes, mesDe, sumarMesesAMes } from './fechas';

/**
 * Calendario ilustrativo de obligaciones (config/obligaciones.ts). Movido desde el Calendario (C3) en compartidos
 * C-D para que `selEventosCalendario` (Inicio, app, Calendario) y la agenda usen la misma regla (N11: "PILA el día
 * hábil 10" en los próximos eventos de Inicio).
 */
export type ClaveObligacion = 'pila' | 'prima' | 'cesantias' | 'intereses' | 'iva' | 'retencion' | 'ica';

export interface ObligacionIlustrativa {
  clave: ClaveObligacion;
  nombre: string;
  fecha: FechaISO;
}

/**
 * Fechas de las obligaciones del calendario ilustrativo entre `desde` y `hasta`, con las mismas reglas del flujo de
 * caja y del generador: PILA el n-ésimo día hábil del mes, retención el día fijo, IVA e ICA el mes siguiente al cierre
 * de cada bimestre, prima, cesantías e intereses en sus fechas del año. Valores y fechas ilustrativos.
 */
export function obligacionesIlustrativas(
  desde: FechaISO,
  hasta: FechaISO,
  ob: ParametrosObligaciones,
  festivos: ReadonlySet<FechaISO>,
): ObligacionIlustrativa[] {
  const r: ObligacionIlustrativa[] = [];
  const dentro = (f: FechaISO) => f >= desde && f <= hasta;
  const poner = (clave: ClaveObligacion, fecha: FechaISO) => {
    if (dentro(fecha)) r.push({ clave, nombre: NOMBRES_OBLIGACIONES[clave === 'intereses' ? 'interesesCesantias' : clave], fecha });
  };
  const diaDelMes = (mes: string, dia: number) => `${mes}-${String(Math.min(dia, diasDelMes(mes))).padStart(2, '0')}`;
  for (let mes = mesDe(desde); mes <= mesDe(hasta); mes = sumarMesesAMes(mes, 1)) {
    poner('retencion', diaDelMes(mes, ob.retencionVencimientoDia));
    poner('pila', diaHabilDelMes(mes, ob.pilaDiaHabil, festivos));
    const anterior = sumarMesesAMes(mes, -1);
    if ((MESES_CIERRE_BIMESTRE as readonly number[]).includes(Number(anterior.slice(5, 7)))) {
      poner('iva', diaDelMes(mes, ob.ivaVencimientoDia));
      poner('ica', diaDelMes(mes, ob.icaVencimientoDia));
    }
    const mm = mes.slice(5, 7);
    for (const fp of ob.primaFechas) if (fp.slice(0, 2) === mm) poner('prima', `${mes.slice(0, 4)}-${fp}`);
    if (ob.cesantiasFecha.slice(0, 2) === mm) poner('cesantias', `${mes.slice(0, 4)}-${ob.cesantiasFecha}`);
    if (ob.interesesCesantiasFecha.slice(0, 2) === mm) poner('intereses', `${mes.slice(0, 4)}-${ob.interesesCesantiasFecha}`);
  }
  return r.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.clave < b.clave ? -1 : 1));
}
