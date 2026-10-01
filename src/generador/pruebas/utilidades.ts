import type {
  EntradaRegistro,
  EstadoDominio,
  FechaHoraISO,
  FechaISO,
  Id,
  MapaComandos,
  SobreComando,
  TipoComando,
} from '@/dominio/tipos';
import type { Actor } from '@/config/permisos';
import { aplicarEnVivo, configurarCongelado } from '@/dominio/motor/vivo';
import { idUsuario } from '@/dominio/motor/ids';
import { crearPlan, generarEstado } from '../fuente';
import type { Plan } from '../plan';

/** Utilidades de las pruebas del generador (PLAN 7.14). */

/** Las cuatro fechas de prueba de 7.12 (distintos días de la semana y temporadas). */
export const FECHAS_PRUEBA: readonly FechaISO[] = ['2026-09-30', '2026-12-19', '2027-01-20', '2027-06-14'];
/** Antes de abrir, a mediodía y de noche. */
export const HORAS_PRUEBA = ['08:30', '13:00', '21:30'] as const;
export const ESCALAS_PRUEBA = [0.5, 1, 1.5] as const;

const cache = new Map<string, EstadoDominio>();

/** Construcción memoizada dentro de un archivo de prueba (cada archivo corre en su propio proceso). */
export function construida(
  ancla: FechaISO,
  hora = '15:30',
  o: { escala?: number; registro?: readonly EntradaRegistro[]; ahora?: FechaHoraISO; semilla?: string } = {},
): EstadoDominio {
  const ahora = o.ahora ?? `${ancla}T${hora}:00`;
  const clave = JSON.stringify([ancla, ahora, o.escala ?? 1, o.semilla ?? '', o.registro?.map((r) => r.id) ?? []]);
  let e = cache.get(clave);
  if (!e) {
    e = generarEstado({ ancla, ahora, escala: o.escala, registro: o.registro, semilla: o.semilla });
    cache.set(clave, e);
  }
  return e;
}

export function olvidar(): void {
  cache.clear();
}

const planes = new Map<string, Plan>();
export function planDe(ancla: FechaISO, escala = 1): Plan {
  const clave = `${ancla}|${escala}`;
  let p = planes.get(clave);
  if (!p) {
    p = crearPlan({ ancla, escala }).plan;
    planes.set(clave, p);
  }
  return p;
}

let contador = 0;

/** Id de una entidad creada por el usuario en una prueba (como lo haría estado/acciones.ts). */
export function idPrueba(prefijo: string): Id {
  contador += 1;
  return idUsuario(prefijo, 1_790_000_000_000 + contador, contador, 'prue');
}

const USUARIO: Record<string, Id> = { dueno: 'u_dueno', vendedor: 'u_vendedor', bodega: 'u_bodega', portal: 'portal-aduanas' };

/** Sobre de un comando del usuario con su marca de agua (5.6.4). */
export function sobreUsuario<K extends TipoComando>(
  tipo: K,
  datos: MapaComandos[K],
  o: { ts: FechaHoraISO; marcaAgua: FechaHoraISO; rol?: Actor; seq: number; usuarioId?: Id },
): EntradaRegistro {
  const rol = o.rol ?? 'dueno';
  return {
    id: idPrueba('en'),
    ts: o.ts,
    marcaAgua: o.marcaAgua,
    usuarioId: o.usuarioId ?? USUARIO[rol] ?? 'u_dueno',
    rol: rol as SobreComando['rol'],
    origen: 'usuario',
    seq: o.seq,
    comando: { tipo, datos } as SobreComando['comando'],
  };
}

/** Aplica comandos en vivo (Immer) y devuelve el estado final y los errores. */
export function aplicarVivos(
  estado: EstadoDominio,
  entradas: readonly EntradaRegistro[],
): { estado: EstadoDominio; errores: string[] } {
  configurarCongelado(false);
  let e = estado;
  const errores: string[] = [];
  for (const x of entradas) {
    const r = aplicarEnVivo(e, x);
    if (r.ok) e = r.despues;
    else errores.push(`${x.comando.tipo}: ${r.error.codigo} · ${r.error.mensaje}`);
  }
  return { estado: e, errores };
}

/** Serialización estable para comparar estados en profundidad. */
export function huella(e: EstadoDominio): string {
  return JSON.stringify(e);
}

/** Variante con más existencias de un local (para armar comandos válidos). */
export function varianteConStock(estado: EstadoDominio, localId: Id, minimo = 3, excluir: ReadonlySet<Id> = new Set()): Id {
  let mejor: { id: Id; n: number } | null = null;
  for (const [k, n] of Object.entries(estado.agregados.existencias)) {
    const [v, l] = k.split('@');
    if (l !== localId || !v || n < minimo || excluir.has(v)) continue;
    if (!mejor || n > mejor.n || (n === mejor.n && v < mejor.id)) mejor = { id: v, n };
  }
  if (!mejor) throw new Error(`Sin existencias en ${localId}`);
  return mejor.id;
}
