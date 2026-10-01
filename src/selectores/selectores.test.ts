import { beforeAll, describe, expect, it } from 'vitest';
import type { EstadoDominio, Id } from '@/dominio/tipos';
import { calcularComision } from '@/dominio/reglas/comisiones';
import { ventasDelMes } from '@/dominio/comandos/nomina';
import { proyeccionFlujoEstado } from '@/dominio/reglas/flujo-estado';
import { redondearArriba5 } from '@/dominio/reglas/importaciones';
import { sumarDias } from '@/dominio/reglas/fechas';
import { DIAS_CERRADOS } from '@/config/locales';
import { INDICE_MES } from '@/seed/estacionalidad';
import { medirPatrones, type Medicion } from '@/generador/auditoria/patrones';
import { activarVerificacionDeTablas } from './memo';
import {
  hechosDeVenta,
  selVentas,
  selResumenVentas,
  selVentasPorDia,
  selVentaDetalle,
  selDevolucionesPorVenta,
} from './ventas';
import { selKpisInicio, selComparativoLocales, selSaludo } from './inicio';
import { selMatrizExistencias, selKardex, selValorizacion, selSinMovimiento, selDiasInventario, selStockBajo, existencia } from './inventario';
import { selComisiones, selAsistencia, selRiesgosContratacion, selMiDia, selRecargosTurnos, selTurnosSemana, selHorasSemana } from './personal';
import { selSaldosCuentas, selLibroCuenta, selConciliacionDatafono, selFlujoProyectado, selCuentasPorPagar, selCuentasPorCobrar, selPendientesConciliar } from './finanzas';
import { selEstadoResultados, selResumenGastos, selPuntoEquilibrio, selGastos } from './gastos';
import { selCierresDelDia, selResumenSesion, selBonos, selEfectivoEnCajas } from './caja';
import { selSugerenciaPedido, selCostoAterrizado, selImportaciones, selAvisosEstado, selLlegadasProximas } from './importaciones';
import { selComparativoFabricas, selFichaProveedor, selProveedores } from './proveedores';
import { selPivote, selDesempenoVendedores, selMediosDePago, selMapaCalor, selVentasPorMes, selProyeccionMes, selTallasYColores } from './analisis';
import { selHallazgos } from './hallazgos';
import { selAlertas, selSolicitudesPendientes } from './alertas';
import { selNarrativa } from './narrativa';
import { selCatalogo, selBuscarProducto, selVariantePorEan, selProductoPorReferencia } from './catalogo';
import { selClientes, selCliente, selSegmentos, selCumpleanosMes } from './clientes';
import { selCostoEmpleado, selVistaPreviaNomina, selPeriodoAbierto, selCostoNominaPorLocal, selComparativoModalidades } from './nomina';
import { selEventosCalendario, selProximosEventos } from './calendario';
import { AHORA, estadoDe, HOY, planDe } from './pruebas/construir';

/**
 * Selectores (PLAN 5.16, 6.23, 9.2 F2-B): cada selector contra un RECÁLCULO INGENUO sobre las tablas crudas, y
 * las cifras de los patrones contra la medición de referencia (`generador/auditoria/patrones.ts`). Todos los
 * selectores corren con la verificación de tablas activa (fallan si leen una tabla que no declararon).
 */
let e: EstadoDominio;
let medidas: Map<string, Medicion>;

beforeAll(() => {
  activarVerificacionDeTablas(true);
  e = estadoDe();
  medidas = new Map(medirPatrones(e, HOY, planDe(HOY), '15:30').map((m) => [m.id, m]));
});

const reconocida = (v: EstadoDominio['ventas'][string]) => !v.anulacion;

/** Recálculo ingenuo de V4 en un rango: ventas en su fecha, devoluciones y cancelaciones en la suya. */
function ingenuo(desde: string, hasta: string, localId: Id | 'todos' = 'todos') {
  let ventas = 0;
  let devoluciones = 0;
  let unidades = 0;
  let base = 0;
  let costo = 0;
  let num = 0;
  const dentro = (ts: string) => ts.slice(0, 10) >= desde && ts.slice(0, 10) <= hasta;
  for (const v of Object.values(e.ventas)) {
    if (!reconocida(v) || (localId !== 'todos' && v.localId !== localId)) continue;
    if (dentro(v.ts)) {
      ventas += v.total;
      num += 1;
      for (const l of v.lineas) {
        unidades += l.cantidad;
        base += l.base;
        costo += l.costoUnitario * l.cantidad;
      }
    }
    const c = v.separado?.cerrado;
    if (c?.resultado === 'cancelado' && dentro(c.ts)) {
      devoluciones += v.total;
      for (const l of v.lineas) {
        unidades -= l.cantidad;
        base -= l.base;
        costo -= l.costoUnitario * l.cantidad;
      }
    }
  }
  for (const d of Object.values(e.devoluciones)) {
    const v = e.ventas[d.ventaId];
    if (!v || !reconocida(v) || !dentro(d.ts) || (localId !== 'todos' && v.localId !== localId)) continue;
    devoluciones += d.valorTotal;
    for (const l of d.lineas) {
      unidades -= l.cantidad;
      base -= l.base;
      if (l.reingresa) costo -= l.costo;
    }
  }
  return { ventas, devoluciones, netas: ventas - devoluciones, unidades, base, costo, num };
}

describe('memo y estabilidad (5.7, T13)', () => {
  it('dos lecturas seguidas con parámetros iguales (objetos distintos) devuelven la MISMA referencia', () => {
    const a = selVentas(e, { desde: '2026-09-01', hasta: HOY, localId: 'todos' });
    const b = selVentas(e, { hasta: HOY, localId: 'todos', desde: '2026-09-01' });
    expect(b).toBe(a);
    expect(selKpisInicio(e, { localId: 'todos', ahora: AHORA })).toBe(selKpisInicio(e, { localId: 'todos', ahora: AHORA }));
  });

  it('evaluar otro estado (antes/después) no vacía el caché del primero', () => {
    const otro: EstadoDominio = { ...e, ventas: { ...e.ventas } };
    const a1 = selResumenVentas(e, { desde: HOY, hasta: HOY, localId: 'todos' });
    selResumenVentas(otro, { desde: HOY, hasta: HOY, localId: 'todos' });
    expect(selResumenVentas(e, { desde: HOY, hasta: HOY, localId: 'todos' })).toBe(a1);
  });

  it('una tabla que no cambió conserva el caché de los selectores que no la leen', () => {
    const v1 = selValorizacion(e, { localId: 'todos' });
    const conVentas: EstadoDominio = { ...e, ventas: { ...e.ventas } };
    expect(selValorizacion(conVentas, { localId: 'todos' })).toBe(v1);
  });
});

describe('ventas (V4) vs. recálculo ingenuo', () => {
  it.each([
    ['2026-09-01', HOY, 'todos'],
    ['2026-08-01', '2026-08-31', 'p93'],
    ['2025-12-01', '2025-12-31', 'zr'],
  ] as const)('selResumenVentas %s → %s (%s)', (desde, hasta, localId) => {
    const s = selResumenVentas(e, { desde, hasta, localId });
    const n = ingenuo(desde, hasta, localId);
    expect(s.ventas).toBe(n.ventas);
    expect(s.devoluciones).toBe(n.devoluciones);
    expect(s.netas).toBe(n.netas);
    expect(s.unidades).toBe(n.unidades);
    expect(s.baseNeta).toBe(n.base);
    expect(s.costo).toBe(n.costo);
    expect(s.numVentas).toBe(n.num);
  });

  it('selVentas: filas del rango y totales = resumen; hechosDeVenta suma lo mismo que los rangos', () => {
    const r = selVentas(e, { desde: '2026-09-01', hasta: HOY });
    const n = ingenuo('2026-09-01', HOY);
    expect(r.totales.netas).toBe(n.netas);
    expect(r.filas.length).toBe(Object.values(e.ventas).filter((v) => v.ts.slice(0, 10) >= '2026-09-01').length);
    const todo = hechosDeVenta(e).reduce((a, h) => a + h.total, 0);
    const porDia = selVentasPorDia(e, { desde: e.meta.inicioVentana, hasta: HOY, localId: 'todos' }).reduce((a, d) => a + d.netas, 0);
    expect(porDia).toBe(todo);
  });

  it('selVentas con filtro de medio y estado solo trae ventas que cumplen', () => {
    const r = selVentas(e, { desde: '2026-09-01', hasta: HOY, medio: 'nequi' });
    expect(r.filas.length).toBeGreaterThan(0);
    for (const f of r.filas) expect(f.medios).toContain('nequi');
    const sep = selVentas(e, { estado: 'separado' });
    for (const f of sep.filas) expect(f.estado).toBe('separado');
  });

  it('selVentaDetalle: saldo y estado derivados', () => {
    const v = Object.values(e.ventas).find((x) => x.tipo === 'separado' && !x.separado?.cerrado && !x.anulacion);
    expect(v).toBeDefined();
    const d = selVentaDetalle(e, { ventaId: v?.id ?? '' });
    const pagado = v?.pagos.reduce((a, p) => a + p.valor, 0) ?? 0;
    const devuelto = (selDevolucionesPorVenta(e)[v?.id ?? ''] ?? []).reduce((a, x) => a + x.valorTotal, 0);
    expect(d?.saldo).toBe(Math.max(0, (v?.total ?? 0) - devuelto - pagado));
    expect(d?.estado).toBe('separado');
  });
});

describe('Inicio', () => {
  it('KPI de Inicio = suma directa de ventas (ventas del mes, de hoy, ticket y unidades)', () => {
    const k = selKpisInicio(e, { localId: 'todos', ahora: AHORA });
    const mes = ingenuo('2026-09-01', HOY);
    const tarjeta = (id: string) => k.tarjetas.find((t) => t.id === id)?.valor;
    expect(tarjeta('ventas_mes')).toBe(mes.netas);
    expect(tarjeta('unidades')).toBe(mes.unidades);
    expect(tarjeta('ticket')).toBe(Math.round(mes.ventas / mes.num));
    expect(tarjeta('margen')).toBe(mes.base - mes.costo);
    expect(tarjeta('ventas_hoy')).toBe(ingenuo(HOY, HOY).netas);
    expect(k.antesDeAbrir).toBe(false);
    // Antes de abrir: "Ayer" como cifra principal.
    const temprano = selKpisInicio(e, { localId: 'todos', ahora: `${HOY}T08:30:00` });
    expect(temprano.antesDeAbrir).toBe(true);
    expect(temprano.tarjetas[0]?.etiqueta).toBe('Ayer');
  });

  it('efectivo en caja = suma de los saldos de las cajas; comparativo de locales cuadra con el total', () => {
    const k = selKpisInicio(e, { localId: 'todos', ahora: AHORA });
    const cajas = Object.values(e.cuentas).filter((c) => c.tipo === 'caja').reduce((a, c) => a + (e.agregados.saldosCuentas[c.id] ?? 0), 0);
    expect(k.tarjetas.find((t) => t.id === 'efectivo')?.valor).toBe(cajas);
    expect(selEfectivoEnCajas(e, { localId: 'todos' }).total).toBe(cajas);
    const comp = selComparativoLocales(e, { mes: '2026-09', hoy: HOY });
    expect(comp.reduce((a, c) => a + c.resumen.netas, 0)).toBe(ingenuo('2026-09-01', HOY).netas);
    expect(comp.find((c) => c.localId === 'zr')?.ultimoCierre?.diferencia).toBe(-40_000);
  });

  it('saludo: tres franjas por hora', () => {
    expect(selSaludo(e, { localId: 'todos', ahora: `${HOY}T08:30:00` }).franja).toBe('manana');
    expect(selSaludo(e, { localId: 'todos', ahora: AHORA }).franja).toBe('tarde');
    expect(selSaludo(e, { localId: 'todos', ahora: `${HOY}T21:30:00` }).franja).toBe('noche');
    const m = selSaludo(e, { localId: 'todos', ahora: `${HOY}T08:30:00` });
    expect(m.cierres?.conDiferencia[0]?.diferencia).toBe(-40_000);
  });
});

describe('inventario vs. movimientos (I1, I2)', () => {
  it('matriz de existencias = Σ movimientos por variante y local; kardex en orden de aplicación', () => {
    const pid = e.meta.narrativa.productoOxford;
    const m = selMatrizExistencias(e, { productoId: pid });
    expect(m).not.toBeNull();
    const suma = new Map<string, number>();
    for (const mv of e.movimientos) if (mv.productoId === pid) suma.set(`${mv.varianteId}@${mv.localId}`, (suma.get(`${mv.varianteId}@${mv.localId}`) ?? 0) + mv.cantidad);
    let total = 0;
    for (const [k, vid] of Object.entries(m?.variantes ?? {}))
      for (const l of m?.locales ?? []) {
        expect(m?.celdas[k]?.[l.id]).toBe(suma.get(`${vid}@${l.id}`) ?? 0);
        total += suma.get(`${vid}@${l.id}`) ?? 0;
      }
    expect(m?.total).toBe(total);
    const ox = e.meta.narrativa.varianteOxfordM;
    const k = selKardex(e, { varianteId: ox, localId: 'usq' });
    expect(k.saldoFinal).toBe(existencia(e, ox, 'usq'));
    let saldo = 0;
    for (const f of k.filas) {
      saldo += f.movimiento.cantidad;
      expect(f.saldo).toBe(saldo);
      expect(f.saldo).toBeGreaterThanOrEqual(0);
    }
    expect(m?.enCamino[ox]?.unidades).toBeGreaterThan(0);
  });

  it('valorización = Σ existencias × costo y × precio', () => {
    const v = selValorizacion(e, { localId: 'todos' });
    let u = 0;
    let c = 0;
    for (const [k, n] of Object.entries(e.agregados.existencias)) {
      const p = e.productos[e.variantes[k.split('@')[0] ?? '']?.productoId ?? ''];
      u += n;
      c += n * (p?.costoVigente ?? 0);
    }
    expect(v.total.unidades).toBe(u);
    expect(v.total.aCosto).toBe(c);
  });

  it('P5 y P6: días de inventario y referencias sin movimiento = medición de referencia', () => {
    expect(Math.round(selDiasInventario(e, { categoria: 'calzado', hoy: HOY }).dias)).toBe(medidas.get('P5.dias')?.valor);
    expect(Math.round(selDiasInventario(e, { hoy: HOY }).dias)).toBe(medidas.get('P5.tienda')?.valor);
    const quietos = selSinMovimiento(e, { dias: 60, hoy: HOY }).map((x) => x.productoId).sort();
    expect(quietos.join(', ')).toBe(medidas.get('P6')?.detalle);
    expect(selStockBajo(e, { localId: 'usq' }).some((x) => x.varianteId === e.meta.narrativa.varianteOxfordM)).toBe(true);
  });
});

describe('comisiones (P1) = recálculo de la liquidación', () => {
  it('comisiones del selector = ventasDelMes + calcularComision (la regla de nomina.aprobar)', () => {
    const r = selComisiones(e, { mes: '2026-09', hoy: HOY });
    const base = ventasDelMes(e, '2026-09');
    expect(r.length).toBeGreaterThan(3);
    for (const c of r) {
      const v = base.basePorVendedor.get(c.empleadoId);
      const esperada = c.esquema?.base === 'total_con_iva' ? (v?.total ?? 0) : (v?.base ?? 0);
      expect(c.base).toBe(esperada);
      const ingenua = c.esquema
        ? calcularComision(c.esquema, { base: esperada, ventasLocalMes: c.localId ? (base.totalPorLocal.get(c.localId) ?? 0) : 0, metaLocalMes: c.metaLocalMes }).total
        : 0;
      expect(c.comision.total).toBe(ingenua);
      expect(c.detalle.reduce((a, d) => a + d.base, 0)).toBe(base.basePorVendedor.get(c.empleadoId)?.base ?? 0);
    }
  });

  it('Mi día del vendedor y recargos de turnos', () => {
    const md = selMiDia(e, { empleadoId: 'em_scardenas', ahora: AHORA });
    expect(md.comisionMes).toBe(selComisiones(e, { mes: '2026-09', hoy: HOY, empleadoId: 'em_scardenas' })[0]?.comision.total);
    const lunes = '2026-09-28';
    const rec = selRecargosTurnos(e, { localId: 'zr', lunes });
    expect(rec.total).toBe(rec.empleados.reduce((a, x) => a + x.valor, 0));
    const sem = selTurnosSemana(e, { localId: 'zr', lunes });
    for (const x of sem.empleados) expect(x.horas).toBeCloseTo(selHorasSemana(e, { empleadoId: x.empleadoId, lunes }).horas, 5);
  });

  it('P16 y P22: llegadas tarde y riesgo de contrato realidad = referencia', () => {
    const a = selAsistencia(e, { desde: sumarDias(HOY, -29), hasta: HOY, ahora: AHORA, empleadoId: 'em_mherrera' });
    expect(a.resumen[0]?.tardes).toBe(medidas.get('P16')?.valor);
    expect(selRiesgosContratacion(e, { hoy: HOY }).length).toBe(medidas.get('P22')?.valor);
  });
});

describe('plata vs. recálculo ingenuo', () => {
  it('saldos de cuentas = saldo inicial + pagos de ventas + movimientos (V7); libro termina en el agregado', () => {
    const s = selSaldosCuentas(e);
    for (const { cuenta, saldo } of s.cuentas) {
      let x = cuenta.saldoInicial;
      for (const v of Object.values(e.ventas)) for (const p of v.pagos) if (p.cuentaId === cuenta.id) x += p.valor;
      for (const m of Object.values(e.movimientosCuenta)) if (m.cuentaId === cuenta.id) x += m.valor;
      expect(saldo, cuenta.nombre).toBe(x);
      expect(selLibroCuenta(e, { cuentaId: cuenta.id }).saldoFinal).toBe(saldo);
    }
  });

  it('datáfono del mes anterior = Σ abonos y = lo vendido con tarjeta (P10)', () => {
    const c = selConciliacionDatafono(e, { mes: '2026-08', localId: 'todos' });
    let vendido = 0;
    for (const v of Object.values(e.ventas)) for (const p of v.pagos) if ((p.medio === 'datafono_debito' || p.medio === 'datafono_credito') && p.ts.startsWith('2026-08')) vendido += p.valor;
    for (const b of Object.values(e.bonos)) if ((b.pago.medio === 'datafono_debito' || b.pago.medio === 'datafono_credito') && b.vendidoEn.startsWith('2026-08')) vendido += b.valor;
    expect(c.vendido).toBe(vendido);
    const abonos = Object.values(e.abonosDatafono).filter((a) => a.ventasDe.startsWith('2026-08'));
    expect(c.abonado.bruto).toBe(abonos.reduce((a, x) => a + x.bruto, 0));
    expect(c.abonado.comision).toBe(medidas.get('P10.comision') ? abonos.reduce((a, x) => a + x.comision, 0) : 0);
    expect(c.pendientePorAbonar).toBe(c.vendido - c.abonado.bruto);
  });

  it('flujo de caja: el punto bajo es el mismo que calibra el generador (P19, N13) y la explicación nombra sus pagos', () => {
    const f = selFlujoProyectado(e, { dias: 90, hoy: HOY, hora: '15:30' });
    const ref = proyeccionFlujoEstado(e, { hoy: HOY, hora: '15:30', dias: 90, indiceMes: INDICE_MES, diasCerrados: DIAS_CERRADOS, festivos: planDe(HOY).calendario.festivos });
    expect(f.puntoBajo).toEqual(ref.puntoBajo);
    expect(f.puntoBajo.saldo).toBe(medidas.get('P19')?.valor);
    expect(f.explicacion.length).toBeGreaterThan(20);
    expect(f.principales.length).toBeGreaterThan(0);
  });

  it('por pagar y por cobrar: totales = Σ saldos; separados por vencer = P17', () => {
    const p = selCuentasPorPagar(e, { hoy: HOY, estado: 'pendientes' });
    expect(p.totalCop).toBe(p.filas.reduce((a, x) => a + x.saldoCop, 0));
    const c = selCuentasPorCobrar(e, { hoy: HOY, filtro: 'separados-por-vencer' });
    expect(c.filas.length).toBe(medidas.get('P17.semana')?.valor);
    expect(selPendientesConciliar(e).every((x) => x.valor !== undefined)).toBe(true);
  });

  it('cierres del día (W11, N14): Zona Rosa −$ 40.000 ciego; Usaquén y Parque 93 cuadran', () => {
    const c = selCierresDelDia(e, { fecha: sumarDias(HOY, -1) });
    expect(c.find((x) => x.localId === 'zr')).toMatchObject({ diferencia: -40_000, ciego: true, revisado: false });
    expect(c.filter((x) => x.localId !== 'zr').every((x) => x.diferencia === 0)).toBe(true);
    const s = c.find((x) => x.localId === 'zr');
    const r = selResumenSesion(e, { sesionId: s?.sesionId ?? '' });
    expect(r?.esperado).toBe(e.sesionesCaja[s?.sesionId ?? '']?.cierre?.efectivoEsperado);
    expect(selBonos(e, { hoy: HOY }).every((b) => b.saldo === b.valor - b.redimido)).toBe(true);
  });

  it('estado de resultados = ventas netas sin IVA − costo − gastos (6.20.10)', () => {
    const er = selEstadoResultados(e, { desde: '2026-08-01', hasta: '2026-08-31', localId: 'todos', prorratear: false });
    const n = ingenuo('2026-08-01', '2026-08-31');
    expect(er.ventasNetas).toBe(n.base);
    expect(er.costoVentas).toBe(n.costo);
    const sinIva = e.parametros.impuestos.ivaGastosDescontable;
    const gastos = Object.values(e.gastos)
      .filter((g) => !g.eliminadoEn && g.fecha.startsWith('2026-08'))
      .reduce((a, g) => a + (sinIva ? g.valor - g.iva : g.valor), 0);
    expect(er.gastosOperativos).toBe(gastos);
    expect(er.utilidadOperativa).toBe(n.base - n.costo - gastos);
    // Prorrateo: los locales con generales prorrateados suman la utilidad total.
    const porLocal = ['p93', 'usq', 'zr', 'bod'].map((l) => selEstadoResultados(e, { desde: '2026-08-01', hasta: '2026-08-31', localId: l, prorratear: true }));
    const suma = porLocal.reduce((a, x) => a + x.utilidadOperativa, 0);
    expect(Math.abs(suma - er.utilidadOperativa)).toBeLessThan(5);
    expect(selResumenGastos(e, { mes: '2026-08', localId: 'todos' }).total).toBe(selGastos(e, { desde: '2026-08-01', hasta: '2026-08-31' }).total);
    expect(selPuntoEquilibrio(e, { localId: 'zr', mes: '2026-08' }).ventasEquilibrio).toBeGreaterThan(0);
  });
});

describe('importaciones y proveedores', () => {
  it('sugerencia de pedido (6.20.13) = recálculo por variante', () => {
    const s = selSugerenciaPedido(e, { proveedorId: e.meta.narrativa.proveedorSugerencia, coberturaDias: 90, hoy: HOY });
    expect(s).not.toBeNull();
    expect(s?.unidades).toBe(s?.variantes.reduce((a, x) => a + x.sugerida, 0));
    for (const v of s?.variantes ?? []) {
      const rot = (v.vendidas12s + v.insatisfecha12s) / 12;
      expect(v.sugerida).toBe(Math.max(0, redondearArriba5(rot * (s?.semanasCobertura ?? 0) * (s?.factorEstacional ?? 1) - v.existencias - v.enCamino)));
    }
    expect(s?.unidades).toBeGreaterThan(0);
    const ox = s?.variantes.find((x) => x.varianteId === e.meta.narrativa.varianteOxfordM);
    expect(ox?.insatisfecha12s).toBeGreaterThan(0);
  });

  it('costo aterrizado: el reparto por línea suma el total (M4) y hay precio sugerido', () => {
    const imp = e.importaciones[e.meta.narrativa.importacionEnPuerto];
    const c = selCostoAterrizado(e, { importacionId: imp?.id ?? '', hoy: HOY });
    expect(c?.porLinea.reduce((a, l) => a + l.costoLinea, 0)).toBe(c?.total);
    for (const p of c?.porProductoDetalle ?? []) expect(p.precioSugerido % 1000).toBe(900);
    const mas10 = selCostoAterrizado(e, { importacionId: imp?.id ?? '', hoy: HOY, tasaSimulada: (c?.tasaCosteo ?? 0) * 1.1 });
    expect(mas10?.total).toBeGreaterThan(c?.total ?? 0);
  });

  it('avisos de estado (W3): nacionalización a transportador, bodega y aduanas; nunca a la fábrica', () => {
    const a = selAvisosEstado(e, { importacionId: e.meta.narrativa.importacionEnPuerto, estado: 'en_nacionalizacion', marca: 'HALDEN', hora: '15:30', fecha: HOY });
    expect(a?.destinatarios.map((d) => d.tipo)).toEqual(['transportador', 'bodega', 'agente_aduanas']);
    expect(a?.destinatarios.every((d) => d.idioma === 'es' && d.texto?.includes('IMP-'))).toBe(true);
    const f = selAvisosEstado(e, { importacionId: e.meta.narrativa.importacionEnPuerto, estado: 'saldo_pagado', marca: 'HALDEN', fecha: HOY });
    expect(f?.destinatarios.find((d) => d.tipo === 'fabrica')?.idioma).toBe('en');
  });

  it('P14: retraso y defectos de las fábricas = referencia', () => {
    const w = selComparativoFabricas(e, { hoy: HOY }).find((x) => x.proveedorId === 'pr_weiye');
    expect(Math.round((w?.retrasoPromedio ?? 0) * 10) / 10).toBe(medidas.get('P14.retraso')?.valor);
    expect(Math.round((w?.defectos ?? 0) * 1000) / 1000).toBe(medidas.get('P14.defectosWeiye')?.valor);
    expect(selImportaciones(e, { hoy: HOY, incluirRecibidas: false }).length).toBeGreaterThanOrEqual(4);
    expect(selFichaProveedor(e, { proveedorId: 'pr_weiye', hoy: HOY })?.importaciones.length).toBeGreaterThan(0);
    expect(selProveedores(e, { hoy: HOY, tipo: 'fabrica' }).length).toBe(5);
    expect(selLlegadasProximas(e, { hoy: HOY, dias: 30 }).length).toBeGreaterThan(0);
  });
});

describe('análisis, pivote y hallazgos', () => {
  it('pivote: totales aditivos = Σ filas; no aditivos recalculados desde los hechos', () => {
    const o = { filas: ['local'] as const, columnas: ['canal'] as const, hoy: HOY, filtros: { mes: ['2026-08'] } };
    const ventas = selPivote(e, { ...o, filas: [...o.filas], columnas: [...o.columnas], medida: 'ventas' });
    expect(Math.abs(ventas.total - ventas.filas.reduce((a, f) => a + f.total, 0))).toBeLessThanOrEqual(ventas.filas.length);
    expect(Math.abs(ventas.total - ingenuo('2026-08-01', '2026-08-31').netas)).toBeLessThanOrEqual(2);
    const num = selPivote(e, { ...o, filas: [...o.filas], columnas: [...o.columnas], medida: 'numVentas' });
    expect(num.total).toBe(ingenuo('2026-08-01', '2026-08-31').num);
    const ticket = selPivote(e, { ...o, filas: [...o.filas], columnas: [...o.columnas], medida: 'ticket' });
    const n = ingenuo('2026-08-01', '2026-08-31');
    expect(ticket.total).toBe(Math.round(n.ventas / n.num));
    // Medio de pago: un pago mixto no cuenta dos veces la venta.
    const medios = selPivote(e, { filas: ['medioPago'], columnas: [], medida: 'numVentas', hoy: HOY, filtros: { mes: ['2026-08'] } });
    expect(medios.total).toBe(n.num);
    expect(medios.filas.reduce((a, f) => a + f.total, 0)).toBeGreaterThanOrEqual(n.num);
    const unidades = selPivote(e, { filas: ['medioPago'], columnas: [], medida: 'unidades', hoy: HOY, filtros: { mes: ['2026-08'] } });
    expect(unidades.total).toBe(n.unidades);
  });

  it('P2, P7, P9 y P18 = medición de referencia', () => {
    const v = selDesempenoVendedores(e, { desde: sumarDias(HOY, -30), hasta: sumarDias(HOY, -1) });
    const vg = v.find((x) => x.empleadoId === 'em_vgomez');
    expect(Math.round((vg?.participacionLocal ?? 0) * 1000) / 1000).toBe(medidas.get('P2.participacion')?.valor);
    expect(Math.round((vg?.conAccesorio ?? 0) * 100) / 100).toBe(medidas.get('P2.accesorio')?.valor);
    const medios = selMediosDePago(e, { desde: sumarDias(HOY, -30), hasta: sumarDias(HOY, -1) });
    expect(Math.round((medios.find((m) => m.medio === 'datafono')?.proporcion ?? 0) * 1000) / 1000).toBe(medidas.get('P9.datafono')?.valor);
    const p = selProyeccionMes(e, { hoy: HOY });
    expect(Math.round((p.variacionMismoPeriodo ?? 0) * 1000) / 1000).toBe(medidas.get('P18')?.valor);
    const mapa = selMapaCalor(e, { desde: sumarDias(HOY, -84), hasta: sumarDias(HOY, -1), localId: 'todos' });
    expect(mapa.maximo).toBeGreaterThan(0);
    expect(selVentasPorMes(e, { meses: 18, hoy: HOY }).length).toBe(18);
    expect(selTallasYColores(e, { categoria: 'camisas', desde: sumarDias(HOY, -180), hasta: HOY }).tallas[0]?.talla).toBe('M');
  });

  it('hallazgos: al menos 4 frases, con cifra y enlace', () => {
    const h = selHallazgos(e, { hoy: HOY });
    expect(h.length).toBeGreaterThanOrEqual(4);
    for (const x of h) {
      expect(x.frase).not.toMatch(/\{\{/);
      expect(x.enlace.startsWith('/panel/')).toBe(true);
    }
  });
});

describe('alertas, narrativa, catálogo, clientes, nómina y calendario', () => {
  it('las 10 alertas de 2.3.3 al ancla, con enlaces de rutas.ts', () => {
    const a = selAlertas(e, { localId: 'todos', ahora: AHORA });
    const tipos = new Set(a.map((x) => x.tipo));
    for (const t of ['stock_bajo', 'caja_con_diferencia', 'importacion_estado', 'pago_por_vencer', 'separado_por_vencer', 'importacion_retrasada', 'cumpleanos_vip', 'mercancia_dormida', 'riesgo_contrato_realidad'])
      expect(tipos, t).toContain(t);
    expect(a.some((x) => x.tipo === 'llegada_tarde' || x.tipo === 'inasistencia')).toBe(true);
    const stock = a.find((x) => x.tipo === 'stock_bajo');
    expect(stock?.accion.ruta).toMatch(/^\/panel\/inventario\/HL-CAM-0142\?trasladar=/);
    expect(a.find((x) => x.tipo === 'caja_con_diferencia')?.contexto).toContain('40.000');
    // Descartar una alerta la quita.
    expect(selAlertas(e, { localId: 'todos', ahora: AHORA, descartadas: [stock?.id ?? ''] }).some((x) => x.id === stock?.id)).toBe(false);
    expect(selSolicitudesPendientes(e).length).toBeGreaterThanOrEqual(3);
  });

  it('narrativa dinámica al ancla = la guionada', () => {
    const n = selNarrativa(e, { hoy: HOY });
    expect(n.importacionEnPuerto).toBe(e.meta.narrativa.importacionEnPuerto);
    expect(n.importacionRetrasada).toBe(e.meta.narrativa.importacionRetrasada);
    expect(n.cxpGrande).toBe(e.meta.narrativa.cxpSaldoGrande);
    expect(n.sesionCajaFaltante).toBe(e.meta.narrativa.sesionCajaFaltante);
    expect(n.clienteCumpleanos).toBe(e.meta.narrativa.clienteVip);
    expect(n.varianteCritica).toBe(e.meta.narrativa.varianteOxfordM);
  });

  it('catálogo y búsqueda del POS', () => {
    const p = selProductoPorReferencia(e, { referencia: 'HL-CAM-0142' });
    expect(p?.id).toBe(e.meta.narrativa.productoOxford);
    const v = e.variantes[e.meta.narrativa.varianteOxfordM];
    expect(selVariantePorEan(e, { ean: v?.ean13 ?? '' })?.id).toBe(v?.id);
    expect(selBuscarProducto(e, { texto: v?.ean13 ?? '' })[0]?.coincidencia).toBe('ean');
    expect(selBuscarProducto(e, { texto: 'oxford' }).length).toBeGreaterThan(0);
    const cat = selCatalogo(e, { categoria: 'camisas', localId: 'usq' });
    expect(cat.every((f) => f.producto.categoria === 'camisas')).toBe(true);
  });

  it('clientes: segmentos = P11 y métricas', () => {
    const seg = selSegmentos(e, { hoy: HOY });
    const total = Object.values(seg).reduce((a, x) => a + x, 0);
    for (const s of ['vip', 'frecuente', 'ocasional', 'en_riesgo', 'nuevo'] as const)
      expect(Math.round((seg[s] / total) * 1000) / 1000, s).toBe(medidas.get(`P11.${s}`)?.valor);
    const andres = selCliente(e, { clienteId: e.meta.narrativa.clienteFrecuente, hoy: HOY });
    expect(andres?.metricas.compras).toBe(6);
    expect(selClientes(e, { hoy: HOY, segmento: 'vip' }).every((c) => c.metricas.segmento === 'vip')).toBe(true);
    expect(selCumpleanosMes(e, { mes: '09', hoy: HOY })[0]?.esHoy).toBe(true);
  });

  it('nómina: vista previa = lo que aprobaría el comando; costo pactado de W6', () => {
    const p = selPeriodoAbierto(e, { hoy: HOY });
    expect(p.quincenal).not.toBeNull();
    const vp = selVistaPreviaNomina(e, { periodo: p.quincenal!, exoneracion: true, ahora: AHORA });
    expect(vp.error).toBeNull();
    expect(vp.liquidacion?.lineas.length).toBeGreaterThan(5);
    const c = selCostoEmpleado(e, { empleadoId: 'em_scardenas', modo: 'pactado', exoneracion: true, hoy: HOY });
    expect(c?.costo).toBeGreaterThan(0);
    const mes = selCostoEmpleado(e, { empleadoId: 'em_scardenas', modo: 'mes_actual', exoneracion: true, hoy: HOY, ahora: AHORA });
    expect(mes?.comisiones).toBeGreaterThan(0);
    expect(mes?.costo).toBeGreaterThan(c?.costo ?? 0);
    expect(selComparativoModalidades(e, { valorMensual: 1_950_000, exoneracion: true, fecha: HOY }).diferenciaCosto).toBeGreaterThan(0);
    const n = selCostoNominaPorLocal(e, { mes: '2026-08' });
    expect(Math.round(n.total)).toBe(medidas.get('P15.total')?.valor);
  });

  it('calendario: turnos, llegadas y vencimientos derivados', () => {
    const ev = selEventosCalendario(e, { desde: HOY, hasta: sumarDias(HOY, 30) });
    const tipos = new Set(ev.map((x) => x.tipo));
    for (const t of ['turno', 'importacion', 'vencimiento', 'cita']) expect(tipos, t).toContain(t);
    const prox = selProximosEventos(e, { hoy: HOY, n: 5 });
    expect(prox.length).toBe(5);
    expect(prox.every((x) => x.tipo !== 'turno')).toBe(true);
  });
});
