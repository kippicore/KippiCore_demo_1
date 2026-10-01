import type { FechaISO, Id } from '@/dominio/tipos';
import { diaSemana, diasDelMes, minutosDeHora } from '@/dominio/reglas/fechas';
import { BONOS } from '@/seed/estacionalidad';
import { masDias, tercerDiaSemanaDelMes } from './calendario';
import { claveVenta, hhmm, type Plan } from './plan';
import { rngPlan } from './prng';
import type { IntencionGen, TipoIntencion } from './tipos';

/**
 * Intenciones de un día ordenadas por ts (PLAN 7.4). No lee el estado: solo el plan. Las tareas que dependen del
 * estado son intenciones diarias de revisión que, al materializarse, consultan los índices incrementales.
 */

function it(
  tipo: TipoIntencion,
  clave: string,
  ts: string,
  datos: Record<string, string | number> = {},
): IntencionGen {
  return { tipo, clave, ts: ts.length === 16 ? `${ts}:00` : ts, datos };
}

/** Temporadas de bonos de regalo (7.6): semana del Día del Padre, Amor y Amistad y diciembre. */
function temporadaBonos(fecha: FechaISO): { inicio: FechaISO; dias: number } | null {
  const anio = Number(fecha.slice(0, 4));
  const mes = Number(fecha.slice(5, 7));
  const candidatas: { inicio: FechaISO; dias: number }[] = [];
  if (mes === 6) candidatas.push({ inicio: masDias(tercerDiaSemanaDelMes(anio, 6, 0), -9), dias: 10 });
  if (mes === 9) candidatas.push({ inicio: masDias(tercerDiaSemanaDelMes(anio, 9, 6), -8), dias: 9 });
  if (mes === 12) candidatas.push({ inicio: `${anio}-12-01`, dias: 24 });
  for (const c of candidatas) if (fecha >= c.inicio && fecha < masDias(c.inicio, c.dias)) return c;
  return null;
}

export function planificarDia(plan: Plan, dia: FechaISO): IntencionGen[] {
  const r: IntencionGen[] = [];
  const A = plan.ancla;
  const ds = diaSemana(dia);
  const dm = Number(dia.slice(8, 10));
  const ultimoDia = diasDelMes(dia.slice(0, 7));

  if (dia === plan.vispera) {
    r.push(it('tasa', `tasa:${dia}`, `${dia}T00:00`));
    r.push(it('preparacion', `preparacion:${dia}`, `${dia}T00:05`));
  } else {
    if (ds === 1 || dia === A) r.push(it('tasa', `tasa:${dia}`, `${dia}T00:10`));
    r.push(it('dia.apertura', `apertura:${dia}`, `${dia}T06:00`));
    if (plan.calendario.esHabil(dia)) r.push(it('datafono.abono', `datafono:${dia}`, `${dia}T07:00`));
    if (ds === 1 && dia >= plan.lunesTurnos) r.push(it('turnos.semana', `turnos:${dia}`, `${dia}T07:05`));
    r.push(it('cxp.pagos', `cxp:${dia}`, `${dia}T07:30`));
    if (ds === 3) r.push(it('reposicion', `reposicion:${dia}`, `${dia}T08:00`));
    r.push(it('traslados.recibir', `traslados:${dia}`, `${dia}T09:00`));
    r.push(it('cliente.alta', `altas:${dia}`, `${dia}T09:05`));
  }

  // Importaciones con eventos el día (creación, hitos, pagos, recepción).
  const imps = plan.eventosImportacion.get(dia) ?? [];
  imps.forEach((id: Id, k) =>
    r.push(it('importacion.hito', `imp:${id}:${dia}`, `${dia}T06:${String(20 + Math.min(k, 39)).padStart(2, '0')}`, { impId: id })),
  );

  if (dia !== plan.vispera) {
    // Caja, ventas y revisiones por local.
    for (const local of plan.localesVenta) {
      const h = plan.calendario.horario(local, dia);
      if (!h) continue;
      const abre = minutosDeHora(h.abre);
      const cierra = minutosDeHora(h.cierra);
      r.push(it('caja.abrir', `caja-a:${dia}:${local.id}`, `${dia}T${hhmm(abre - 20)}`, { localId: local.id }));
      r.push(it('caja.cerrar', `caja-c:${dia}:${local.id}`, `${dia}T${hhmm(cierra + 10)}`, { localId: local.id }));
      r.push(it('revision', `rev-s:${dia}:${local.id}`, `${dia}T${hhmm(Math.max(abre + 60, 13 * 60))}`, { localId: local.id, franja: 'separados' }));
      r.push(it('revision', `rev-d:${dia}:${local.id}`, `${dia}T${hhmm(Math.min(cierra - 60, 17 * 60 + 30))}`, { localId: local.id, franja: 'devoluciones' }));
    }
    for (const v of plan.ventasDelDia(dia)) {
      const local = plan.local(v.localId);
      const h = local ? plan.calendario.horario(local, dia) : null;
      if (!local || !h) continue;
      const rng = rngPlan(plan.semilla, `horas:${dia}:${v.localId}`);
      const segundos: number[] = [];
      for (let i = 0; i < v.n; i++) segundos.push(plan.demanda.segundoVenta(rng, local, dia, h));
      segundos.sort((a, b) => a - b);
      segundos.forEach((s, i) => {
        const hh = Math.floor(s / 3600);
        const mm = Math.floor((s % 3600) / 60);
        const ss = s % 60;
        const ts = `${dia}T${hhmm(hh * 60 + mm)}:${ss < 10 ? `0${ss}` : ss}`;
        r.push(it('venta', claveVenta(dia, v.localId, i), ts, { localId: v.localId, indice: i }));
      });
    }
    for (const g of plan.narrativa.comprasGuion)
      if (g.ts.startsWith(dia)) r.push(it('venta.guion', g.clave, g.ts));
    // Bonos de regalo en temporada.
    const temporada = temporadaBonos(dia);
    if (temporada) {
      const rng = rngPlan(plan.semilla, `bonos:${dia}`);
      const n = rng.poisson((BONOS.porTemporada * plan.escala) / temporada.dias);
      for (let k = 0; k < n; k++) {
        const local = plan.localesVenta[rng.elegirPonderado([0.45, 0.2, 0.35])];
        const h = local ? plan.calendario.horario(local, dia) : null;
        if (!local || !h) continue;
        const s = plan.demanda.segundoVenta(rng, local, dia, h);
        r.push(it('bono.venta', `bono:${dia}:${k}`, `${dia}T${hhmm(Math.floor(s / 60))}:30`, { localId: local.id, k }));
      }
    }
    // Personal.
    for (const m of plan.marcacionesDelDia(dia)) r.push(it('marcacion', m.clave, m.ts, { turnoId: m.turnoId }));
    if (dm === 15 || dm === ultimoDia) r.push(it('nomina.periodo', `nomina:${dia}`, `${dia}T18:00`));
    if (dm === ultimoDia) r.push(it('mes.cierre', `cierre-mes:${dia}`, `${dia}T21:30`));
    const md = dia.slice(5, 10);
    const ob = plan.config.parametros.obligaciones;
    if (ob.primaFechas.includes(md) || md === ob.cesantiasFecha || md === ob.interesesCesantiasFecha)
      r.push(it('prestaciones', `prestaciones:${dia}`, `${dia}T06:10`));
    if (dm === 2 || dm === 5 || dm === 12) r.push(it('gastos.ocasionales', `ocasionales:${dia}`, `${dia}T10:00`));
    // Conteo físico mensual (segundo martes), rotando local y categoría; no en las semanas del conteo narrativo.
    if (ds === 2 && dm >= 8 && dm <= 14 && (dia < masDias(A, -35) || dia > masDias(A, -7)))
      r.push(it('conteo', `conteo:${dia}`, `${dia}T08:15`));
    // Narrativa al ancla (7.11).
    if (dia === masDias(A, -21)) r.push(it('narrativa', `narrativa:conteo:${dia}`, `${dia}T08:30`, { caso: 'conteo' }));
    if (dia === masDias(A, -1)) {
      r.push(it('narrativa', `narrativa:flujo:${dia}`, `${dia}T22:00`, { caso: 'flujo' }));
      r.push(it('narrativa', `narrativa:solicitudes:${dia}`, `${dia}T19:00`, { caso: 'solicitudes' }));
      r.push(it('narrativa', `narrativa:existencias:${dia}`, `${dia}T19:50`, { caso: 'existencias' }));
    }
  }
  return r.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0));
}
