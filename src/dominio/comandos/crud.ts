import type { ColeccionTabla, EstadoDominio, Id, MapaComandos, Tabla, TipoComando } from '../tipos';
import { requerir, idNuevo } from './comunes';
import { type Contexto, type Manejador, marcarEditado, marcarEliminado } from './tx';

/**
 * Fábrica `crud()` (PLAN 6.21) para las acciones de crear, editar y eliminar simples. Mantiene el patrón
 * atómico: toda validación ocurre en `validar`.
 */
type Entidad = { id: Id; eliminadoEn?: string };

export function tablaDe(estado: EstadoDominio, coleccion: ColeccionTabla): Tabla<Entidad> {
  return estado[coleccion] as unknown as Tabla<Entidad>;
}

/** Quita las claves con `undefined` (el estado no guarda `undefined` significativo). */
export function sinIndefinidos<T extends object>(o: T): Partial<T> {
  const r: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) (r as Record<string, unknown>)[k] = v;
  return r;
}

export function crudCrear<K extends TipoComando, T extends Entidad>(o: {
  coleccion: ColeccionTabla;
  id: (d: MapaComandos[K]) => Id;
  /** Valida y arma la entidad (puede lanzar). */
  construir: (estado: EstadoDominio, d: MapaComandos[K], ctx: Contexto) => T;
}): Manejador<K, T> {
  return {
    validar(estado, d, ctx) {
      idNuevo(tablaDe(estado, o.coleccion), o.id(d));
      return o.construir(estado, d, ctx);
    },
    escribir(estado, entidad, ctx) {
      tablaDe(estado, o.coleccion)[entidad.id] = entidad;
      ctx.emitir({ tipo: 'EntidadCambiada', coleccion: o.coleccion, id: entidad.id, accion: 'creada' });
    },
  };
}

export function crudEditar<K extends TipoComando, T extends Entidad>(o: {
  coleccion: ColeccionTabla;
  id: (d: MapaComandos[K]) => Id;
  nombre: string;
  /** Valida los cambios (puede lanzar) y devuelve los cambios a aplicar. */
  cambios: (estado: EstadoDominio, actual: T, d: MapaComandos[K], ctx: Contexto) => Partial<T>;
}): Manejador<K, { id: Id; cambios: Partial<T> }> {
  return {
    validar(estado, d, ctx) {
      const actual = requerir(tablaDe(estado, o.coleccion) as Tabla<T>, o.id(d), o.nombre);
      return { id: actual.id, cambios: sinIndefinidos(o.cambios(estado, actual, d, ctx)) };
    },
    escribir(estado, plan, ctx) {
      const e = tablaDe(estado, o.coleccion)[plan.id];
      if (!e) return;
      Object.assign(e, plan.cambios);
      marcarEditado(e as never, ctx);
      ctx.emitir({ tipo: 'EntidadCambiada', coleccion: o.coleccion, id: plan.id, accion: 'editada' });
    },
  };
}

export function crudEliminar<K extends TipoComando, T extends Entidad>(o: {
  coleccion: ColeccionTabla;
  id: (d: MapaComandos[K]) => Id;
  nombre: string;
  motivo?: (d: MapaComandos[K]) => string | null;
  /** Validaciones extra (puede lanzar). */
  validar?: (estado: EstadoDominio, actual: T, d: MapaComandos[K], ctx: Contexto) => void;
  /** true: borra el registro (tablas sin eliminación suave). */
  borrar?: boolean;
}): Manejador<K, { id: Id; motivo: string | null }> {
  return {
    validar(estado, d, ctx) {
      const actual = requerir(tablaDe(estado, o.coleccion) as Tabla<T>, o.id(d), o.nombre);
      o.validar?.(estado, actual, d, ctx);
      return { id: actual.id, motivo: o.motivo?.(d) ?? null };
    },
    escribir(estado, plan, ctx) {
      const tabla = tablaDe(estado, o.coleccion);
      const e = tabla[plan.id];
      if (!e) return;
      if (o.borrar) delete tabla[plan.id];
      else marcarEliminado(e, ctx, plan.motivo);
      ctx.emitir({ tipo: 'EntidadCambiada', coleccion: o.coleccion, id: plan.id, accion: 'eliminada' });
    },
  };
}
