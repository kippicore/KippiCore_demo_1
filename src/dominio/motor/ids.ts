import type { Id } from '../tipos';

/**
 * IDs (PLAN 6.1). Cadenas opacas con prefijo por entidad. Las del usuario se crean al emitir el comando
 * (estado/acciones.ts, F2-B, pasa el instante y el sufijo aleatorio: el dominio no lee el reloj ni el azar)
 * y viajan dentro del comando, así la reaplicación produce los mismos IDs. Los hijos se derivan del padre.
 */
export const PREFIJOS = {
  venta: 'vt',
  devolucion: 'dv',
  cliente: 'cl',
  notaCliente: 'nc',
  movimiento: 'mv',
  traslado: 'tr',
  conteo: 'cf',
  producto: 'pd',
  variante: 'va',
  color: 'col',
  sesionCaja: 'sc',
  egreso: 'eg',
  solicitud: 'so',
  bono: 'bo',
  abonoDatafono: 'ad',
  proveedor: 'pr',
  contacto: 'co',
  importacion: 'im',
  cuentaPorPagar: 'cp',
  abonoCxP: 'ab',
  cuenta: 'cta',
  movimientoCuenta: 'mc',
  transferencia: 'tf',
  gasto: 'gs',
  gastoRecurrente: 'gr',
  empleado: 'em',
  contrato: 'ct',
  esquema: 'esq',
  meta: 'mt',
  turno: 'tu',
  marcacion: 'ma',
  novedad: 'nv',
  liquidacion: 'lq',
  evento: 'ev',
  factura: 'fa',
  notaCredito: 'ncr',
  mensaje: 'ms',
  notificacion: 'nt',
  tasa: 'tasa',
  local: 'lo',
  usuario: 'u',
  entrada: 'en',
} as const;
export type PrefijoEntidad = (typeof PREFIJOS)[keyof typeof PREFIJOS];

/** ID de una entidad creada por el usuario: prefijo + instante en base 36 + contador + 4 caracteres. */
export function idUsuario(prefijo: string, instanteMs: number, contador: number, aleatorio: string): Id {
  return `${prefijo}_${instanteMs.toString(36)}${contador.toString(36).padStart(2, '0')}${aleatorio.slice(0, 4)}`;
}

/** ID estable de una entidad generada: vt_g_20260930_usq_014. */
export function idGenerado(prefijo: string, ...partes: (string | number)[]): Id {
  return `${prefijo}_g_${partes.map((p) => String(p).replace(/-/g, '')).join('_')}`;
}

/** ID hijo derivado del padre: `${ventaId}-l1`, `-p1`, `-m1`. */
export function idHijo(padre: Id, sufijo: string): Id {
  return `${padre}-${sufijo}`;
}
