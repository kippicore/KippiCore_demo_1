import { describe, expect, it } from 'vitest';
import type { EstadoDominio, FechaISO } from '@/dominio/tipos';
import { DIAS_CERRADOS } from '@/config/locales';
import { INDICE_MES } from '@/seed/estacionalidad';
import { diaSemana, diferenciaDias, mesDia, sumarDias } from '@/dominio/reglas/fechas';
import { proyeccionFlujoEstado } from '@/dominio/reglas/flujo-estado';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import { idHijo } from '@/dominio/motor/ids';
import { auditarCoherencia } from '../auditoria/coherencia';
import { construida, olvidar, planDe } from './utilidades';

/**
 * narrativa.test.ts (PLAN 7.11): N1–N16 el día del ancla, en distintos días de la semana y horas (antes de
 * abrir, mediodía, de noche), y la historia sigue viva a ancla + 3 y ancla + 10.
 */
function n(estado: EstadoDominio, A: FechaISO, ahora: string): string[] {
  const f: string[] = [];
  const ok = (c: boolean, msg: string) => {
    if (!c) f.push(msg);
  };
  const nar = estado.meta.narrativa;
  const ex = (v: string, l: string) => estado.agregados.existencias[`${v}@${l}`] ?? 0;
  const hora = ahora.slice(11, 16);
  // N1: la Oxford azul cielo M (al cierre de la víspera: USQ 1, P93 2, ZR 6, bodega 0).
  ok(!!nar.varianteOxfordM, 'N1 sin variante');
  ok(ex(nar.varianteOxfordM, 'usq') <= 1, `N1 USQ ${ex(nar.varianteOxfordM, 'usq')}`);
  ok(ex(nar.varianteOxfordM, 'zr') >= 4, `N1 ZR ${ex(nar.varianteOxfordM, 'zr')}`);
  ok(ex(nar.varianteOxfordM, 'bod') === 0, `N1 bodega ${ex(nar.varianteOxfordM, 'bod')}`);
  // N2: en puerto, reportada ayer desde el portal; nacionalización en 2 días y bodega en 12.
  const puerto = estado.importaciones[nar.importacionEnPuerto];
  ok(puerto?.estado === 'en_puerto', `N2 estado ${puerto?.estado}`);
  ok(puerto?.hitos.en_puerto.real === sumarDias(A, -1), 'N2 llegada ayer');
  ok(puerto?.hitos.en_nacionalizacion.estimada === sumarDias(A, 2), 'N2 nacionalización en 2 días');
  ok(puerto?.hitos.recibido_bodega.estimada === sumarDias(A, 12), 'N2 bodega en 12 días');
  ok(
    Object.values(estado.notificaciones).some(
      (x) => x.tipo === 'portal_actualizacion' && x.origen?.id === puerto?.id && x.titulo.includes('Carolina Mejía'),
    ),
    'N2 notificación del portal',
  );
  ok(puerto?.carga.tipo === 'consolidada' && puerto.carga.m3 === 6.2, 'N2 carga consolidada 6,2 m³');
  const oxEnPuerto = puerto?.lineas.reduce((a, l) => a + (l.cantidades[nar.varianteOxfordM] ?? 0), 0);
  ok(oxEnPuerto === 48, `N2 trae ${oxEnPuerto} Oxford azul cielo M`);
  // N3: en nacionalización con 6 días de retraso y aforo físico.
  const ret = estado.importaciones[nar.importacionRetrasada];
  ok(ret?.estado === 'en_nacionalizacion', `N3 estado ${ret?.estado}`);
  ok(ret?.aforo?.tipo === 'fisico', 'N3 aforo físico');
  ok(ret?.hitos.nacionalizado.estimada === sumarDias(A, -6) && ret.hitos.nacionalizado.real === null, 'N3 levante estimado hace 6 días');
  ok(ret?.hitos.recibido_bodega.estimada === sumarDias(A, 9), 'N3 bodega en 9 días');
  // N4: en tránsito; embarcó hace 24 días, puerto en 8.
  const tr = estado.importaciones[nar.importacionEnTransito];
  ok(tr?.estado === 'en_transito', `N4 estado ${tr?.estado}`);
  ok(tr?.hitos.embarcado.real === sumarDias(A, -24), 'N4 embarque');
  ok(tr?.hitos.en_puerto.estimada === sumarDias(A, 8), 'N4 puerto en 8 días');
  // N5: en producción; listo en ≈ 2 semanas (día hábil); saldo ≈ US$ 14.700 que vence ese día.
  const pr = estado.importaciones[nar.importacionEnProduccion];
  ok(pr?.estado === 'en_produccion', `N5 estado ${pr?.estado}`);
  const listo = pr?.hitos.listo_despacho.estimada ?? '';
  const d = diferenciaDias(A, listo);
  ok(d >= 12 && d <= 17 && diaSemana(listo) !== 0 && diaSemana(listo) !== 6, `N5 listo ${listo}`);
  const saldo = estado.cuentasPorPagar[nar.cxpSaldoGrande];
  ok(!!saldo && saldo.fechaVencimiento === listo, 'N5 saldo vence al quedar listo');
  ok(!!saldo && Math.abs(saldoCxP(saldo) - 1_470_000) <= 30_000, `N5 saldo ${saldo ? saldoCxP(saldo) : 0}`);
  // N6: Mateo abre hoy Zona Rosa; 3 llegadas tarde en las 4 semanas previas; hoy marca 10:25.
  const turnoMateo = (estado.agregados.turnosDia[`em_mherrera@${A}`] ?? []).map((id) => estado.turnos[id]);
  ok(turnoMateo.some((t) => t?.tipo === 'apertura' && t.localId === 'zr' && t.inicio === '10:00'), 'N6 turno de apertura');
  const marcas = (estado.agregados.marcacionesDia[`em_mherrera@${A}`] ?? []).map((id) => estado.marcaciones[id]);
  if (hora >= '10:25') ok(marcas[0]?.ts === `${A}T10:25:00`, `N6 marcación ${marcas[0]?.ts}`);
  else ok(marcas.length === 0, 'N6 aún no ha marcado');
  let tardes = 0;
  for (let k = 1; k <= 28; k++) {
    const f = sumarDias(A, -k);
    const t = (estado.agregados.turnosDia[`em_mherrera@${f}`] ?? []).map((id) => estado.turnos[id])[0];
    const e = (estado.agregados.marcacionesDia[`em_mherrera@${f}`] ?? []).map((id) => estado.marcaciones[id])[0];
    if (t && e && diferenciaMin(t.inicio, e.ts.slice(11, 16)) > estado.parametros.nomina.toleranciaLlegadaTardeMin) tardes += 1;
  }
  ok(tardes === 3, `N6 llegadas tarde previas ${tardes}`);
  // N7: separados activos (≈ 14, ≈ $ 6,2 M) y 3 que vencen esta semana.
  const activos = Object.values(estado.ventas).filter(
    (v) => v.tipo === 'separado' && v.separado && !v.separado.cerrado && !v.anulacion,
  );
  ok(activos.length >= 12 && activos.length <= 16, `N7 activos ${activos.length}`);
  const porVencer = activos.filter((v) => (v.separado?.fechaLimite ?? '') <= sumarDias(A, 6));
  ok(porVencer.length >= 3 && porVencer.length <= 5, `N7 por vencer ${porVencer.length}`);
  // N8: Ricardo Peñuela cumple hoy y es VIP de Parque 93.
  const ricardo = estado.clientes[nar.clienteVip];
  ok(ricardo?.cumpleanos === mesDia(A), 'N8 cumpleaños');
  const valorRicardo = Object.values(estado.ventas)
    .filter((v) => v.clienteId === nar.clienteVip && !v.anulacion)
    .reduce((a, v) => a + v.total, 0);
  ok(valorRicardo >= 5_000_000 && valorRicardo <= 8_000_000, `N8 valor histórico ${valorRicardo}`);
  // N9: las 5 sin movimiento con existencias.
  const plan = planDe(A);
  for (const p of plan.productos.filter((x) => x.sinMovimiento)) {
    const conStock = Object.values(p.variantes).some((v) =>
      ['p93', 'zr', 'usq', 'bod'].some((l) => ex(v, l) > 0),
    );
    ok(conStock, `N9 ${p.id} sin existencias`);
  }
  // N10: tres solicitudes pendientes.
  for (const [k, tipo] of [
    ['solicitudDescuento', 'descuento'],
    ['solicitudTraslado', 'traslado'],
    ['solicitudAnulacion', 'anulacion'],
  ] as const) {
    const s = estado.solicitudes[nar[k]];
    ok(s?.estado === 'pendiente' && s.tipo === tipo, `N10 ${tipo}`);
  }
  const desc = estado.solicitudes[nar.solicitudDescuento];
  ok(desc?.datos.tipo === 'descuento' && desc.datos.valorLista === 789_900 && desc.datos.valorFinal === 631_920, 'N10 descuento 20 %');
  const tras = estado.solicitudes[nar.solicitudTraslado];
  const t = tras?.datos.tipo === 'traslado' ? estado.traslados[tras.datos.trasladoId] : undefined;
  ok(t?.origenId === 'p93' && t.destinoId === 'zr' && t.lineas.reduce((a, l) => a + l.cantidad, 0) === 8, 'N10 traslado de 8');
  const anul = estado.solicitudes[nar.solicitudAnulacion];
  ok(anul?.datos.tipo === 'anulacion' && estado.ventas[anul.datos.ventaId]?.vendedorId === 'em_mherrera', 'N10 anulación de Mateo');
  // N11: próximos eventos (toma de medidas el sábado, campaña de Black Friday, PILA en día hábil 10).
  ok(Object.values(estado.eventos).some((x) => x.subtipo === 'toma_medidas' && x.clienteId === nar.clienteVip), 'N11 toma de medidas');
  ok(
    Object.values(estado.cuentasPorPagar).some(
      (c) => c.categoria === 'seguridad_social' && plan.calendario.diaHabilDelMes(c.fechaVencimiento.slice(0, 7), 10) === c.fechaVencimiento,
    ),
    'N11 PILA en el día hábil 10',
  );
  // N12: Andrés con 6 compras y el chino arena 32 con 5 en Usaquén.
  const andres = Object.values(estado.ventas).filter((v) => v.clienteId === nar.clienteFrecuente && !v.anulacion);
  ok(andres.length === 6, `N12 compras de Andrés ${andres.length}`);
  if (hora < '10:00') ok(ex(nar.varianteChinoArena32, 'usq') === 5, `N12 chino 32 en USQ ${ex(nar.varianteChinoArena32, 'usq')}`);
  else ok(ex(nar.varianteChinoArena32, 'usq') >= 3, `N12 chino 32 en USQ ${ex(nar.varianteChinoArena32, 'usq')}`);
  // N13: punto bajo del flujo de 90 días entre $ 10 y $ 30 M (nunca negativo).
  const flujo = proyeccionFlujoEstado(estado, { hoy: A, hora, dias: 90, indiceMes: INDICE_MES, diasCerrados: DIAS_CERRADOS, festivos: plan.calendario.festivos });
  ok(flujo.puntoBajo.saldo >= 10_000_000 && flujo.puntoBajo.saldo <= 30_000_000, `N13 punto bajo ${flujo.puntoBajo.saldo}`);
  // N14: cierres de anoche.
  const anoche = sumarDias(A, -1);
  const cierre = (l: string) => estado.sesionesCaja[`sc_g_${anoche.replace(/-/g, '')}_${l}`]?.cierre;
  ok(cierre('usq')?.diferencia === 0 && cierre('p93')?.diferencia === 0, 'N14 USQ y P93 cuadran');
  ok(cierre('zr')?.diferencia === -40_000 && cierre('zr')?.ciego === true && cierre('zr')?.por === 'em_nrios', 'N14 ZR − $ 40.000 (Natalia, ciego)');
  ok(estado.sesionesCaja[nar.sesionCajaFaltante]?.revision === null, 'N14 sin revisar');
  // N15: contratistas con turnos y marcaciones en las últimas 4 semanas.
  for (const id of nar.contratistasRiesgo) {
    let turnos = 0;
    let marcas2 = 0;
    for (let k = 1; k <= 28; k++) {
      const f = sumarDias(A, -k);
      turnos += estado.agregados.turnosDia[`${id}@${f}`]?.length ?? 0;
      marcas2 += estado.agregados.marcacionesDia[`${id}@${f}`]?.length ?? 0;
    }
    ok(turnos >= 12 && marcas2 >= 20, `N15 ${id}: ${turnos} turnos, ${marcas2} marcaciones`);
  }
  ok(nar.contratistasRiesgo.length === 2, 'N15 dos contratistas');
  // N16: demanda insatisfecha de la Oxford azul cielo M en las últimas 12 semanas.
  const insatisfecha = Object.entries(estado.meta.demandaInsatisfecha)
    .filter(([k]) => k.startsWith(`${nar.varianteOxfordM}@`))
    .reduce((a, [, x]) => a + x, 0);
  ok(insatisfecha > 0, 'N16 demanda insatisfecha de la M');
  ok(nar.proveedorSugerencia === 'pr_huameng', 'N16 fábrica de la sugerencia');
  return f;
}

function diferenciaMin(a: string, b: string): number {
  return Number(b.slice(0, 2)) * 60 + Number(b.slice(3, 5)) - (Number(a.slice(0, 2)) * 60 + Number(a.slice(3, 5)));
}

describe('narrativa N1–N16 al ancla (7.11)', () => {
  it.each([
    { ancla: '2026-09-30', hora: '15:30' },
    { ancla: '2026-09-30', hora: '08:30' },
    { ancla: '2026-09-30', hora: '21:30' },
    { ancla: '2026-10-04', hora: '13:00' },
    { ancla: '2026-10-05', hora: '10:15' },
  ])('ancla $ancla a las $hora', ({ ancla, hora }) => {
    const e = construida(ancla, hora);
    expect(n(e, ancla, `${ancla}T${hora}:00`)).toEqual([]);
    olvidar();
  });

  it.each([3, 10])('la historia sigue a ancla + %i días: invariantes y entidades narrativas válidas', (dias) => {
    const A = '2026-09-30';
    const ahora = `${sumarDias(A, dias)}T15:30:00`;
    const e = construida(A, '15:30', { ahora });
    const malas = auditarCoherencia(e, ahora).filter((x) => x.violaciones > 0);
    expect(malas.map((x) => `${x.regla} ${x.ejemplo}`)).toEqual([]);
    const nar = e.meta.narrativa;
    for (const [k, v] of Object.entries(nar)) if (k !== 'contratistasRiesgo') expect(v, k).not.toBe('');
    // La importación en puerto avanzó a nacionalización en su fecha.
    const puerto = e.importaciones[nar.importacionEnPuerto];
    expect(['en_nacionalizacion', 'nacionalizado', 'en_transporte_bogota', 'recibido_bodega']).toContain(puerto?.estado);
    // El saldo grande se paga al quedar listo (≈ 2 semanas): a +3 sigue pendiente.
    const saldo = e.cuentasPorPagar[idHijo(nar.importacionEnProduccion, 'cxp-saldo')];
    if (dias === 3) expect(saldo && saldoCxP(saldo)).toBeGreaterThan(0);
    olvidar();
  });

  it.todo('selNarrativa(hoy) devuelve entidades equivalentes a ancla + 3 y + 10 (F2-B: selectores/narrativa.ts)');
});
