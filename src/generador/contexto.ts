import type {
  EstadoDominio,
  FechaHoraISO,
  FechaISO,
  Id,
  MapaComandos,
  SobreComando,
  TipoComando,
} from '@/dominio/tipos';
import { claveExistencia } from '@/dominio/comandos/tx';
import { activoEn } from '@/dominio/comandos/personal';
import { idGenerado } from '@/dominio/motor/ids';
import { Indices } from './indices';
import type { Plan } from './plan';
import { rngIntencion, type Rng } from './prng';
import type { IntencionGen } from './tipos';

/**
 * Contexto de materialización (PLAN 7.4): el plan, los índices incrementales y las guardas que protegen cada
 * intención frente a lo que el usuario cambió (matriz de 7.4). Todo comando generado lleva `rol: 'sistema'`,
 * `origen: 'generado'`, `usuarioId: 'sistema'` y marca de agua = ts (salvo los guionados que nombran a quien
 * los pide).
 */
export class Gen {
  readonly idx = new Indices();
  constructor(readonly plan: Plan) {}

  get semilla(): string {
    return this.plan.semilla;
  }

  rng(clave: string): Rng {
    return rngIntencion(this.plan.semilla, clave);
  }

  /** Emisor de sobres de una intención: cada sobre lleva un id derivado de la clave y un contador. */
  emisor(it: IntencionGen): <K extends TipoComando>(
    tipo: K,
    datos: MapaComandos[K],
    o?: { ts?: FechaHoraISO; usuarioId?: Id },
  ) => SobreComando {
    let n = 0;
    return (tipo, datos, o = {}) => {
      n += 1;
      const ts = o.ts ?? it.ts;
      return {
        id: `g:${it.clave}:${n}`,
        ts,
        marcaAgua: ts,
        usuarioId: o.usuarioId ?? 'sistema',
        rol: 'sistema',
        origen: 'generado',
        comando: { tipo, datos } as SobreComando['comando'],
      };
    };
  }
}

// ---------- Guardas (7.4) ----------

export function localVivo(estado: EstadoDominio, id: Id): boolean {
  const l = estado.locales[id];
  return !!l && !l.eliminadoEn;
}

export function varianteVendible(estado: EstadoDominio, varianteId: Id | undefined): boolean {
  if (!varianteId) return false;
  const v = estado.variantes[varianteId];
  if (!v || v.eliminadoEn) return false;
  const p = estado.productos[v.productoId];
  return !!p && !p.eliminadoEn;
}

export function existencias(estado: EstadoDominio, varianteId: Id, localId: Id): number {
  return estado.agregados.existencias[claveExistencia(varianteId, localId)] ?? 0;
}

export function empleadoActivo(estado: EstadoDominio, id: Id, fecha: FechaISO): boolean {
  const e = estado.empleados[id];
  return !!e && activoEn(e, fecha);
}

export function clienteVivo(estado: EstadoDominio, id: Id): boolean {
  const c = estado.clientes[id];
  return !!c && !c.eliminadoEn;
}

/** Id de la sesión de caja generada de un local y día. */
export function idSesion(fecha: FechaISO, localId: Id): Id {
  return idGenerado('sc', fecha, localId);
}

/** Sesión abierta del local para cobrar en efectivo: la generada del día, o la que el usuario abrió. */
export function sesionParaEfectivo(estado: EstadoDominio, localId: Id, fecha: FechaISO): Id | null {
  const id = idSesion(fecha, localId);
  const s = estado.sesionesCaja[id];
  if (s) return s.cierre === null ? id : null;
  const abierta = estado.agregados.cajaAbierta[localId];
  return abierta && estado.sesionesCaja[abierta]?.abierta.ts.startsWith(fecha) ? abierta : null;
}

export const CUENTA_CORRIENTE = 'cta_corriente';
