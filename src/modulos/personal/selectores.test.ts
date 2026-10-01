import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  activarVerificacionDeTablas,
  selComisiones,
  selCostoEmpleado,
  selCostoNominaPorLocal,
  selLiquidaciones,
  selNarrativa,
  selPeriodoAbierto,
  selRiesgosContratacion,
  selVistaPreviaNomina,
} from '@/selectores';
import { AHORA, estadoDe, HOY } from '@/selectores/pruebas/construir';
import {
  mesDelPeriodo,
  selCostoFicha,
  selDesprendibles,
  selEsquemasConUso,
  selExposicionContratistas,
  selFichaEmpleado,
  selFilasPersonal,
  selLineasLiquidacion,
  selMetasLocales,
  selOpcionesPersonal,
} from './selectores';
import { repartirProporcional, segmentosCosto } from './calculos';

/** Los selectores locales de C1 componen los del dominio: aquí se comprueba que sus cifras cuadran con ellos. */
const e = estadoDe();

beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

describe('selFilasPersonal', () => {
  const pactado = selFilasPersonal(e, { hoy: HOY, ahora: AHORA, modo: 'pactado', exoneracion: true });

  it('trae a todo el equipo activo con el costo de selCostoEmpleado', () => {
    expect(pactado.length).toBe(14);
    for (const f of pactado) {
      const c = selCostoEmpleado(e, { empleadoId: f.empleado.id, modo: 'pactado', exoneracion: true, hoy: HOY, ahora: AHORA });
      expect(f.costo).toBe(c?.costo ?? null);
      expect(f.neto).toBe(c?.neto ?? null);
    }
  });

  it('el costo siempre supera el valor del contrato en los empleados laborales y lo iguala en los contratistas', () => {
    for (const f of pactado) {
      if (f.tipo === 'laboral') expect(f.costo as number).toBeGreaterThan(f.valorBase);
      else expect(f.costo).toBe(f.valorBase);
    }
  });

  it('el modo "este mes" cuesta más que el pactado para quien vende con comisión', () => {
    const mes = selFilasPersonal(e, { hoy: HOY, ahora: AHORA, modo: 'mes_actual', exoneracion: true });
    const conComision = mes.filter((f) => f.tipo === 'laboral' && f.contrato?.esquemaComisionId);
    expect(conComision.length).toBeGreaterThan(0);
    for (const f of conComision) {
      const base = pactado.find((x) => x.empleado.id === f.empleado.id);
      expect(f.costo as number).toBeGreaterThan(base?.costo as number);
    }
  });

  it('apagar la exoneración sube el costo de todos los empleados laborales', () => {
    const sin = selFilasPersonal(e, { hoy: HOY, ahora: AHORA, modo: 'pactado', exoneracion: false });
    for (const f of sin) {
      const con = pactado.find((x) => x.empleado.id === f.empleado.id);
      if (f.tipo === 'laboral') expect(f.costo as number).toBeGreaterThan(con?.costo as number);
      else expect(f.costo).toBe(con?.costo);
    }
  });

  it('marca el riesgo de contrato realidad igual que selRiesgosContratacion', () => {
    const ids = selRiesgosContratacion(e, { hoy: HOY }).map((r) => r.empleadoId).sort();
    expect(pactado.filter((f) => f.riesgo).map((f) => f.empleado.id).sort()).toEqual(ids);
    expect(ids.length).toBeGreaterThan(0);
  });

  it('ordena de mayor a menor costo', () => {
    const costos = pactado.map((f) => f.costo ?? 0);
    expect(costos).toEqual([...costos].sort((a, b) => b - a));
  });

  it('el costo pactado del vendedor del guion cuadra con la prueba exacta de W6 (exoneración: 2.990.941)', () => {
    const narrativa = selNarrativa(e, { hoy: HOY });
    const f = pactado.find((x) => x.empleado.id === narrativa.vendedorPersona);
    expect(f?.valorBase).toBe(1_950_000);
    expect(f?.costo).toBe(2_990_941);
    expect(selFilasPersonal(e, { hoy: HOY, ahora: AHORA, modo: 'pactado', exoneracion: false }).find((x) => x.empleado.id === narrativa.vendedorPersona)?.costo).toBe(3_254_191);
  });
});

describe('selFichaEmpleado y selCostoFicha', () => {
  it('encuentra por slug y devuelve null si no existe', () => {
    const f = selFichaEmpleado(e, { slug: 'sebastian-cardenas', hoy: HOY });
    expect(f?.empleado.id).toBe('em_scardenas');
    expect(f?.contrato?.tipo).toBe('laboral');
    expect(f?.esquema?.id).toBe(f?.contrato?.esquemaComisionId);
    expect(f?.localNombre).toBe('Usaquén');
    expect(selFichaEmpleado(e, { slug: 'no-existe', hoy: HOY })).toBeNull();
  });

  it('un contratista con señales trae su riesgo', () => {
    const riesgos = selRiesgosContratacion(e, { hoy: HOY });
    const primero = riesgos[0];
    const ficha = selFichaEmpleado(e, { slug: e.empleados[primero?.empleadoId as string]?.slug as string, hoy: HOY });
    expect(ficha?.riesgo?.empleadoId).toBe(primero?.empleadoId);
  });

  it('el costo de la ficha trae los dos extremos de la exoneración y el ahorro es positivo en un laboral', () => {
    const r = selCostoFicha(e, { empleadoId: 'em_scardenas', modo: 'pactado', exoneracion: true, hoy: HOY, ahora: AHORA });
    expect(r.costo?.costo).toBe(r.conExoneracion);
    expect((r.sinExoneracion as number) - (r.conExoneracion as number)).toBe(263_250);
    const apagada = selCostoFicha(e, { empleadoId: 'em_scardenas', modo: 'pactado', exoneracion: false, hoy: HOY, ahora: AHORA });
    expect(apagada.costo?.costo).toBe(apagada.sinExoneracion);
  });

  it('la barra apilada del costo suma exactamente el costo para el negocio', () => {
    for (const modo of ['pactado', 'mes_actual'] as const) {
      const c = selCostoFicha(e, { empleadoId: 'em_scardenas', modo, exoneracion: true, hoy: HOY, ahora: AHORA }).costo;
      const s = segmentosCosto(c?.barras as never);
      expect(s.reduce((a, x) => a + x.valor, 0)).toBe(c?.costo);
    }
  });

  it('el modo "este mes" incluye la comisión del mes que muestra selComisiones (mensualizada)', () => {
    const c = selCostoFicha(e, { empleadoId: 'em_scardenas', modo: 'mes_actual', exoneracion: true, hoy: HOY, ahora: AHORA }).costo;
    const comision = selComisiones(e, { mes: HOY.slice(0, 7), hoy: HOY, empleadoId: 'em_scardenas' })[0]?.comision.total ?? 0;
    expect(c?.comisiones).toBeGreaterThan(0);
    // El día 30 el factor de mensualización es 1: la comisión del costo es la del mes.
    expect(c?.comisiones).toBe(comision);
  });
});

describe('selDesprendibles y selLineasLiquidacion', () => {
  it('lista las liquidaciones de la persona, la más reciente primero', () => {
    const d = selDesprendibles(e, { empleadoId: 'em_scardenas' });
    expect(d.length).toBeGreaterThan(5);
    const fines = d.map((x) => x.liquidacion.periodo.fin);
    expect(fines).toEqual([...fines].sort().reverse());
    expect(d.every((x) => x.linea.empleadoId === 'em_scardenas')).toBe(true);
  });

  it('las líneas de una liquidación traen nombre y slug y suman los totales', () => {
    const liq = selLiquidaciones(e)[0];
    const v = selLineasLiquidacion(e, { liquidacionId: liq?.id as string });
    expect(v?.lineas.length).toBe(liq?.lineas.length);
    expect(v?.lineas.reduce((a, l) => a + l.linea.costoEmpleador, 0)).toBe(liq?.totales.costo);
    expect(v?.lineas.every((l) => l.nombre.length > 0)).toBe(true);
    expect(selLineasLiquidacion(e, { liquidacionId: 'no-existe' })).toBeNull();
  });
});

describe('selExposicionContratistas', () => {
  it('suma lo que subiría la nómina si los contratistas con riesgo fueran empleados', () => {
    const x = selExposicionContratistas(e, { hoy: HOY, exoneracion: true });
    expect(x.filas.length).toBe(selRiesgosContratacion(e, { hoy: HOY }).length);
    for (const f of x.filas) {
      expect(f.costoActual).toBe(f.honorarios);
      expect(f.costoLaboral).toBeGreaterThan(f.honorarios);
      expect(f.diferencia).toBe(f.costoLaboral - f.costoActual);
    }
    expect(x.diferencia).toBe(x.filas.reduce((a, f) => a + f.diferencia, 0));
    expect(x.diferencia).toBeGreaterThan(0);
  });

  it('sin exoneración la diferencia es mayor', () => {
    const con = selExposicionContratistas(e, { hoy: HOY, exoneracion: true }).diferencia;
    const sin = selExposicionContratistas(e, { hoy: HOY, exoneracion: false }).diferencia;
    expect(sin).toBeGreaterThan(con);
  });
});

describe('selMetasLocales y selEsquemasConUso', () => {
  it('una fila por local que vende, con las ventas del mes y su cumplimiento', () => {
    const m = selMetasLocales(e, { mes: HOY.slice(0, 7), hoy: HOY });
    expect(m.map((x) => x.local.id).sort()).toEqual(['p93', 'usq', 'zr']);
    for (const x of m) {
      expect(x.ventas).toBeGreaterThan(0);
      if (x.meta) expect(x.cumplimiento).toBeCloseTo(x.ventas / x.meta.valor, 10);
    }
  });

  it('las ventas del local coinciden con las que usa la comisión (ventasLocalMes)', () => {
    const m = selMetasLocales(e, { mes: HOY.slice(0, 7), hoy: HOY });
    const c = selComisiones(e, { mes: HOY.slice(0, 7), hoy: HOY });
    for (const x of m) {
      const de = c.find((y) => y.localId === x.local.id);
      if (de) expect(de.ventasLocalMes).toBe(x.ventas);
    }
  });

  it('cada esquema trae las personas que lo usan', () => {
    const u = selEsquemasConUso(e);
    expect(u.length).toBeGreaterThanOrEqual(2);
    const opciones = selOpcionesPersonal(e);
    for (const x of u) expect(x.personas.length).toBe(opciones.usoEsquemas[x.esquema.id] ?? 0);
  });
});

describe('selOpcionesPersonal', () => {
  it('trae los locales con la bodega, los esquemas y sugerencias sin "No aplica"', () => {
    const o = selOpcionesPersonal(e);
    expect(o.locales.map((l) => l.id)).toContain('bod');
    expect(o.locales.filter((l) => l.vende).length).toBe(3);
    expect(o.sugerencias.eps.length).toBeGreaterThan(0);
    expect(o.sugerencias.cesantias).not.toContain('No aplica');
    expect(o.slugs).toContain('sebastian-cardenas');
  });
});

describe('vista previa de nómina y costo por local (dominio, para el e2e)', () => {
  it('el periodo abierto tiene vista previa y sus totales cuadran con la suma de líneas', () => {
    const p = selPeriodoAbierto(e, { hoy: HOY });
    for (const periodo of [p.quincenal, p.mensual]) {
      if (!periodo) continue;
      const v = selVistaPreviaNomina(e, { periodo, exoneracion: true, ahora: AHORA });
      expect(v.error).toBeNull();
      expect(v.liquidacion?.totales.costo).toBe(v.liquidacion?.lineas.reduce((a, l) => a + l.costoEmpleador, 0));
      expect(mesDelPeriodo(periodo.fin)).toBe(periodo.fin.slice(0, 7));
    }
  });

  it('el costo de nómina por local de un mes completo suma el total de sus liquidaciones', () => {
    const r = selCostoNominaPorLocal(e, { mes: '2026-08' });
    const esperado = selLiquidaciones(e)
      .filter((l) => l.periodo.fin.startsWith('2026-08'))
      .reduce((a, l) => a + l.totales.costo, 0);
    expect(r.total).toBe(esperado);
    expect(r.locales.reduce((a, l) => a + l.costo, 0)).toBe(r.total);
  });
});

describe('reparto del detalle de una comisión', () => {
  it('cada vendedor: el detalle repartido suma exactamente su comisión', () => {
    const comisiones = selComisiones(e, { mes: HOY.slice(0, 7), hoy: HOY });
    expect(comisiones.length).toBeGreaterThan(5);
    for (const c of comisiones) {
      const bases = c.detalle.map((d) => (c.esquema?.base === 'total_con_iva' ? d.total : d.base));
      const partes = repartirProporcional(bases, c.comision.total);
      expect(partes.reduce((a, b) => a + b, 0)).toBe(c.comision.total);
      expect(bases.reduce((a, b) => a + b, 0)).toBe(c.base);
    }
  });
});
