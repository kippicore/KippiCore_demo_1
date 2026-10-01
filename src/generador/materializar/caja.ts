import type { EstadoDominio, FechaISO, Id, SobreComando } from '@/dominio/tipos';
import { BASE_CAJA, DENOMINACIONES } from '@/config/negocio';
import { CIERRES_CAJA } from '@/seed/estacionalidad';
import { efectivoEsperado } from '@/dominio/reglas/caja';
import { claveDatafono } from '@/dominio/comandos/tx';
import { fechaDe, minutosDeHora } from '@/dominio/reglas/fechas';
import { idGenerado } from '@/dominio/motor/ids';
import { masDias } from '../calendario';
import { CUENTA_CORRIENTE, empleadoActivo, type Gen, idSesion, localVivo } from '../contexto';
import type { IntencionGen } from '../tipos';

/** Caja (PLAN 7.10, P21, N14): apertura, cierre con arqueo (denominaciones) y abono neto del datáfono. */

/** Quién abre o cierra la caja: el primero (o el último) de turno en el local ese día. */
function personaCaja(g: Gen, estado: EstadoDominio, localId: Id, fecha: FechaISO, cierre: boolean): Id | null {
  const turnos = g.plan
    .plantillaDe(localId, fecha)
    .filter((t) => empleadoActivo(estado, t.empleadoId, fecha))
    .sort((a, b) =>
      cierre
        ? minutosDeHora(b.fin) - minutosDeHora(a.fin) || (a.empleadoId < b.empleadoId ? -1 : 1)
        : minutosDeHora(a.inicio) - minutosDeHora(b.inicio) || (a.empleadoId < b.empleadoId ? -1 : 1),
    );
  return turnos[0]?.empleadoId ?? null;
}

/** Billetes y monedas de un conteo (greedy, con algo de variedad en los de 50 y 20 mil). */
export function denominaciones(valor: number): Record<string, number> {
  const r: Record<string, number> = {};
  let resto = valor;
  for (const d of DENOMINACIONES) {
    if (d === 'monedas') continue;
    const v = Number(d);
    const n = Math.floor(resto / v);
    if (n > 0) {
      r[d] = n;
      resto -= n * v;
    }
  }
  if (resto > 0) r.monedas = resto;
  return r;
}

export function* materializarCajaAbrir(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const localId = String(it.datos.localId);
  const fecha = fechaDe(it.ts);
  if (!localVivo(estado, localId) || !estado.locales[localId]?.cuentaCajaId) return;
  // Guardas: no abre una segunda ni sobre una abierta a mano.
  if (estado.agregados.cajaAbierta[localId] || estado.agregados.cajaDia[`${localId}@${fecha}`]) return;
  const emitir = g.emisor(it);
  yield emitir('caja.abrir', {
    sesionId: idSesion(fecha, localId),
    localId,
    baseInicial: BASE_CAJA,
    por: personaCaja(g, estado, localId, fecha, false),
  });
}

export function* materializarCajaCerrar(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const localId = String(it.datos.localId);
  const fecha = fechaDe(it.ts);
  const sesionId = idSesion(fecha, localId);
  const s = estado.sesionesCaja[sesionId];
  if (!s || s.cierre !== null) return;
  const rng = g.rng(it.clave);
  const esperado = efectivoEsperado(s.abierta.baseInicial, estado.agregados.efectivoSesion[s.id] ?? 0, s.egresos);
  let diferencia = 0;
  let por = personaCaja(g, estado, localId, fecha, true);
  const anoche = masDias(g.plan.ancla, -1);
  if (fecha === anoche) {
    // N14: anoche Usaquén y Parque 93 cuadran; Zona Rosa cierra con − $ 40.000 (Natalia Ríos, arqueo ciego).
    if (localId === 'zr') {
      diferencia = CIERRES_CAJA.faltanteNarrativo;
      if (empleadoActivo(estado, 'em_nrios', fecha)) por = 'em_nrios';
    }
  } else if (!rng.chance(CIERRES_CAJA.cuadran)) {
    const magnitud = Math.round(rng.rango(...CIERRES_CAJA.diferencia) / 1000) * 1000;
    diferencia = rng.chance(0.65) ? -magnitud : magnitud;
  }
  const contado = Math.max(0, esperado + diferencia);
  const emitir = g.emisor(it);
  yield emitir('caja.cerrar', {
    sesionId,
    denominaciones: denominaciones(contado),
    efectivoContado: contado,
    observacion: diferencia < 0 && rng.chance(0.4) ? 'Se revisaron los vouchers; no apareció la diferencia.' : null,
    por,
  });
}

/** Abono neto del datáfono por local al día hábil siguiente (V11, P10); idempotente por (local, ventasDe). */
export function* materializarDatafono(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const fecha = fechaDe(it.ts);
  const emitir = g.emisor(it);
  // Días que liquida hoy: desde el día hábil anterior (incluido) hasta ayer.
  let desde = masDias(fecha, -1);
  while (desde > g.plan.inicio && !g.plan.calendario.esHabil(desde)) desde = masDias(desde, -1);
  for (let d = desde; d < fecha; d = masDias(d, 1)) {
    for (const local of g.plan.localesVenta) {
      if (!localVivo(estado, local.id) || estado.agregados.abonosDatafonoDia[claveDatafono(local.id, d)]) continue;
      const cobrado = estado.agregados.datafonoDia[claveDatafono(local.id, d)];
      if (!cobrado || cobrado.debito + cobrado.credito <= 0) continue;
      yield emitir('datafono.registrarAbono', {
        abonoId: idGenerado('ad', d, local.id),
        localId: local.id,
        ventasDe: d,
        fecha,
        cuentaDestinoId: CUENTA_CORRIENTE,
      });
    }
  }
}
