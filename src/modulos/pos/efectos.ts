import type { COP, EstadoDominio, Id, MedioPago } from '@/dominio/tipos';
import { rutas } from '@/app/rutas';
import { selEfectosVenta, selResumenSesion, selSesionAbierta, type EfectoVenta } from '@/selectores';
import { cambioPorMedio } from './calculos';

/**
 * "Lo que acaba de pasar" (W1): los efectos de la venta que calcula `selEfectosVenta` (inventario, ventas de hoy,
 * comisión, cliente) más el de la caja con el detalle por medio de pago. Cada cifra es antes → después medida con
 * los MISMOS selectores sobre el estado de antes y el de después: exacta por construcción.
 */
export interface EfectoPos {
  clave: 'inventario' | 'ventas_hoy' | 'ventas_hoy_local' | 'comision' | 'cliente' | 'caja';
  etiqueta: string;
  detalle: string | null;
  antes: number;
  despues: number;
  formato: 'dinero' | 'entero';
  enlace: string;
  /** Solo la caja: lo que entró por cada medio de pago con esta venta. */
  porMedio?: { medio: MedioPago; valor: COP }[];
  /** Solo la caja: sin esto no se muestra el esperado antes → después (arqueo ciego del vendedor). */
  mostrarAntesDespues?: boolean;
}

export interface OpcionesEfectos {
  /** El vendedor solo ve lo de su local y nunca el efectivo esperado de la caja (arqueo ciego). */
  soloLocal: boolean;
}

export function efectosPos(antes: EstadoDominio, despues: EstadoDominio, ventaId: Id, { soloLocal }: OpcionesEfectos): EfectoPos[] {
  const v = despues.ventas[ventaId];
  if (!v) return [];
  const base = selEfectosVenta(antes, despues, ventaId);
  const de = (clave: EfectoVenta['clave']) => base.filter((x) => x.clave === clave);
  const propios = (x: EfectoVenta): EfectoPos => ({ clave: x.clave, etiqueta: x.etiqueta, detalle: x.detalle, antes: x.antes, despues: x.despues, formato: x.formato, enlace: x.enlace });
  const filas: EfectoPos[] = [
    ...de('inventario').map(propios),
    ...(soloLocal ? de('ventas_hoy_local') : de('ventas_hoy')).map(propios),
    ...de('comision').map(propios),
    ...de('cliente').map(propios),
  ];

  // Caja: la sesión donde entró el efectivo o, si no hubo efectivo, la sesión abierta del local.
  const sesionId = v.pagos.find((p) => p.sesionCajaId)?.sesionCajaId ?? selSesionAbierta(despues, { localId: v.localId })?.id ?? null;
  if (sesionId) {
    const a = selResumenSesion(antes, { sesionId });
    const d = selResumenSesion(despues, { sesionId });
    if (d) {
      const porMedio = cambioPorMedio(a?.porMedio ?? {}, d.porMedio);
      filas.push({
        clave: 'caja',
        etiqueta: `Caja de ${d.localNombre}`,
        detalle: soloLocal ? 'el esperado se muestra al contar' : 'efectivo esperado',
        antes: a?.esperado ?? 0,
        despues: d.esperado,
        formato: 'dinero',
        enlace: rutas.caja({ sesion: sesionId, resaltar: sesionId }),
        porMedio,
        mostrarAntesDespues: !soloLocal,
      });
    }
  }
  return filas;
}
