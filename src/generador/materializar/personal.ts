import type { EstadoDominio, FechaISO, Id, InsumosLiquidacion, PeriodoNomina, SobreComando } from '@/dominio/tipos';
import { calcularInsumos, ventasDelMes } from '@/dominio/comandos/nomina';
import { claveMarcacionDia } from '@/dominio/comandos/tx';
import { diaSemana, diasDelMes, fechaDe, minutosDeHora, rangoFechas } from '@/dominio/reglas/fechas';
import { horasNocturnasTurno, horasNetasTurno } from '@/dominio/reglas/jornada';
import { cierraMes, periodosDelMes } from '@/dominio/reglas/nomina';
import { idGenerado } from '@/dominio/motor/ids';
import { masDias } from '../calendario';
import { CUENTA_CORRIENTE, empleadoActivo, type Gen } from '../contexto';
import type { IntencionGen } from '../tipos';
import { asegurarSaldo } from './pagos';

/** Personas (PLAN 7.8): turnos de la ventana móvil, marcaciones con su ruido y nómina quincenal y mensual. */

/** Lunes 07:00: turnos almacenados de la semana + 3 (en el primer lunes, las cuatro semanas). */
export function* materializarTurnosSemana(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const lunes = fechaDe(it.ts);
  const emitir = g.emisor(it);
  const semanas = lunes === g.plan.lunesTurnos ? [0, 7, 14, 21] : [21];
  const ocupados = new Set<string>();
  for (const t of Object.values(estado.turnos)) ocupados.add(`${t.empleadoId}|${t.fecha}`);
  for (const s of semanas) {
    for (let k = 0; k < 7; k++) {
      const fecha = masDias(lunes, s + k);
      for (const t of g.plan.turnosDelDia(fecha)) {
        if (estado.turnos[t.id] || ocupados.has(`${t.empleadoId}|${fecha}`)) continue;
        if (!empleadoActivo(estado, t.empleadoId, fecha) || estado.locales[t.localId]?.eliminadoEn) continue;
        yield emitir('turno.asignar', {
          turnoId: t.id,
          empleadoId: t.empleadoId,
          localId: t.localId,
          fecha,
          tipo: t.tipo,
          inicio: t.inicio,
          fin: t.fin,
          descansoMin: t.descansoMin,
          aceptarExceso: true,
        });
      }
    }
  }
}

/** Entrada o salida de un turno (respeta turnos movidos o eliminados por el usuario y la alternancia, P3). */
export function* materializarMarcacion(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const turnoId = String(it.datos.turnoId);
  const t = estado.turnos[turnoId];
  const fecha = fechaDe(it.ts);
  if (!t || t.fecha !== fecha || !empleadoActivo(estado, t.empleadoId, fecha)) return;
  const tipo = it.clave.endsWith(':e') ? 'entrada' : 'salida';
  const n = estado.agregados.marcacionesDia[claveMarcacionDia(t.empleadoId, fecha)]?.length ?? 0;
  if ((tipo === 'entrada') !== (n % 2 === 0)) return;
  const emitir = g.emisor(it);
  yield emitir('marcacion.registrar', {
    marcacionId: idGenerado('ma', fecha, t.empleadoId, tipo === 'entrada' ? 'e' : 's'),
    empleadoId: t.empleadoId,
    localId: t.localId,
    tipo,
    ts: it.ts,
  });
}

/**
 * Horas de la plantilla en un periodo sin turnos almacenados (meses anteriores, 7.8): recargo nocturno de los
 * cierres, dominicales y festivos, y horas extra de diciembre y de los domingos de Zona Rosa (P16).
 */
function horasPlantilla(g: Gen, empleadoId: Id, desde: FechaISO, hasta: FechaISO) {
  const p = g.plan.config.parametros.nomina;
  const r = { ed: 0, en: 0, rn: 0, df: 0 };
  const propios = g.plan.plantilla.filter((t) => t.empleadoId === empleadoId);
  for (const fecha of rangoFechas(desde, hasta)) {
    const ds = diaSemana(fecha);
    if (!g.plan.activoPlan(empleadoId, fecha)) continue;
    for (const t of propios) {
      if (t.dia !== ds) continue;
      const netas = horasNetasTurno(t);
      r.rn += horasNocturnasTurno(t, p.jornadaNocturna);
      if (ds === 0 || g.plan.calendario.esFestivo(fecha)) r.df += netas;
      const extra = (fecha.slice(5, 7) === '12' && t.localId !== 'bod' ? 1 : 0) + (t.localId === 'zr' && ds === 0 ? 1 : 0);
      if (extra) {
        if (minutosDeHora(t.fin) >= 19 * 60) r.en += extra;
        else r.ed += extra;
      }
    }
  }
  return r;
}

const SIN_VENTAS: ReturnType<typeof ventasDelMes> = { basePorVendedor: new Map(), totalPorLocal: new Map() };

/** Ventas del mes para los insumos explícitos (se calculan una vez por mes: quincena y mes la comparten). */
const cacheVentasMes = new WeakMap<Gen, Map<string, ReturnType<typeof ventasDelMes>>>();

function* aprobarYPagar(
  g: Gen,
  it: IntencionGen,
  estado: EstadoDominio,
  periodo: PeriodoNomina,
  sufijo: string,
): Generator<SobreComando> {
  const emitir = g.emisor({ ...it, clave: `${it.clave}:${sufijo}` });
  const liquidacionId = idGenerado('lq', periodo.fin, sufijo);
  const fecha = fechaDe(it.ts);
  let existente = estado.liquidaciones[liquidacionId];
  if (!existente) {
    // Guarda: un periodo ya aprobado a mano no se aprueba otra vez.
    const aMano = Object.values(estado.liquidaciones).find(
      (l) => l.periodo.inicio === periodo.inicio && l.periodo.fin === periodo.fin && l.periodo.tipo === periodo.tipo,
    );
    if (aMano) existente = aMano;
  }
  if (!existente) {
    const empleados = Object.values(estado.empleados).filter(
      (e) =>
        !e.eliminadoEn &&
        e.fechaIngreso <= periodo.fin &&
        (e.fechaRetiro === null || e.fechaRetiro >= periodo.inicio) &&
        estado.contratos[e.contratoVigenteId]?.periodicidadPago === periodo.tipo,
    );
    if (!empleados.length) return;
    let insumos: Record<Id, InsumosLiquidacion> | null = null;
    if (periodo.inicio < g.plan.lunesTurnos) {
      // Sin turnos almacenados: insumos explícitos (días completos y horas de la plantilla).
      insumos = {};
      const mes = periodo.fin.slice(0, 7);
      let ventas = cierraMes(periodo) ? cacheVentasMes.get(g)?.get(mes) : SIN_VENTAS;
      if (!ventas) {
        ventas = ventasDelMes(estado, mes);
        const c = cacheVentasMes.get(g) ?? new Map<string, ReturnType<typeof ventasDelMes>>();
        c.set(mes, ventas);
        cacheVentasMes.set(g, c);
      }
      for (const e of empleados) {
        const contrato = estado.contratos[e.contratoVigenteId];
        if (!contrato) continue;
        const base = calcularInsumos(estado, e, contrato, periodo, ventas, it.ts);
        const h = contrato.tipo === 'laboral' ? horasPlantilla(g, e.id, periodo.inicio, periodo.fin) : { ed: 0, en: 0, rn: 0, df: 0 };
        const r2 = (x: number) => Math.round(x * 100) / 100;
        insumos[e.id] = {
          ...base,
          horasExtraDiurnas: r2(h.ed),
          horasExtraNocturnas: r2(h.en),
          horasRecargoNocturno: r2(h.rn),
          horasDominicalFestivo: r2(h.df),
        };
      }
    }
    yield emitir('nomina.aprobar', {
      liquidacionId,
      periodo,
      exoneracion114: estado.parametros.nomina.exoneracion114.activa,
      insumos,
    });
    existente = estado.liquidaciones[liquidacionId];
    if (!existente) return;
    for (const id of existente.cuentasPorPagarIds) {
      const c = estado.cuentasPorPagar[id];
      if (c && c.categoria === 'seguridad_social') g.idx.agregar(g.idx.cxpPorFecha, c.fechaVencimiento, id);
    }
  }
  if (existente.estado !== 'aprobada') return;
  yield* asegurarSaldo(g, emitir, estado, CUENTA_CORRIENTE, existente.totales.neto, fecha);
  yield emitir('nomina.pagar', { liquidacionId: existente.id, fecha, cuentaId: CUENTA_CORRIENTE });
}

/** Días 15 y último, 18:00: nómina quincenal (y mensual el último día), aprobada y pagada (7.8). */
export function* materializarNomina(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const fecha = fechaDe(it.ts);
  const mes = fecha.slice(0, 7);
  const ultimo = Number(fecha.slice(8, 10)) === diasDelMes(mes);
  const [q1, q2] = periodosDelMes(mes, 'quincenal');
  const periodo = ultimo ? q2 : q1;
  if (periodo) yield* aprobarYPagar(g, it, estado, periodo, 'q');
  if (ultimo) {
    const [m] = periodosDelMes(mes, 'mensual');
    if (m) yield* aprobarYPagar(g, it, estado, m, 'm');
  }
}
