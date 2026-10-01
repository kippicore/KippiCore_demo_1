import { beforeAll, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import type { EstadoDominio } from '@/dominio/tipos';
import {
  selComisiones,
  selCuentasPorCobrar,
  selCuentasPorPagar,
  selEstadoResultados,
  selGastos,
  selKardex,
  selValorizacion,
  selVentas,
} from '@/selectores';
import { AHORA, estadoDe, HOY } from '@/selectores/pruebas/construir';
import { IDS_REPORTES, REPORTES } from './definiciones';
import { exportarReporte, hojasParaExportar } from './exportar';
import { pdfDesprendible, pdfDocumentoPos, pdfEtiquetas, pdfFactura, pdfNotaCredito } from './plantillas-pdf';
import type { FiltrosReporte, HojaReporte } from './tipos';

/**
 * Definiciones únicas de reportes (5.12, 5.16): filas y totales iguales a los selectores; los 13 reportes se
 * exportan a PDF y Excel; el Excel se relee y cada total trae su `result` en caché.
 */
let e: EstadoDominio;
const F: FiltrosReporte = { desde: '2026-09-01', hasta: HOY, localId: 'todos', hoy: HOY, ahora: AHORA };
const CTX = { marca: 'HALDEN', descriptor: 'Moda masculina · Bogotá', moneda: 'COP' as const, tasa: 1, nombreLocal: 'Todos los locales' };

beforeAll(() => {
  e = estadoDe();
});

const hoja = (id: (typeof IDS_REPORTES)[number], nombre: string, f: FiltrosReporte = F): HojaReporte => {
  const h = REPORTES[id].hojas(e, f).find((x) => x.nombre === nombre);
  if (!h) throw new Error(`sin hoja ${nombre}`);
  return h;
};
const suma = (h: HojaReporte, k: string) => h.filas.reduce((a, f) => a + (typeof f[k] === 'number' ? (f[k] as number) : 0), 0);

describe('filas y totales = selectores', () => {
  it('ventas: detalle y resumen cuadran con selVentas', () => {
    const s = selVentas(e, { desde: F.desde, hasta: F.hasta, localId: 'todos' });
    const det = hoja('ventas', 'Ventas detalladas');
    expect(det.filas.length).toBe(s.filas.length);
    expect(suma(det, 'total')).toBe(s.totales.ventas);
    const res = hoja('ventas', 'Ventas resumidas');
    expect(suma(res, 'netas')).toBe(s.totales.netas);
    expect(suma(res, 'devoluciones')).toBe(s.totales.devoluciones);
    expect(res.totales?.numVentas).toBe(s.totales.numVentas);
  });

  it('ventas: con los filtros de la lista (medio, canal, cliente, vendedor del dueño) cuadra con selVentas', () => {
    const nequi = selVentas(e, { desde: F.desde, hasta: F.hasta, localId: 'todos', medio: 'nequi' });
    const det = hoja('ventas', 'Ventas detalladas', { ...F, medio: 'nequi' });
    expect(nequi.filas.length).toBeGreaterThan(0);
    expect(det.filas.length).toBe(nequi.filas.length);
    expect(suma(det, 'total')).toBe(nequi.totales.ventas);
    expect(suma(hoja('ventas', 'Ventas resumidas', { ...F, medio: 'nequi' }), 'netas')).toBe(nequi.totales.netas);
    const todas = selVentas(e, { desde: F.desde, hasta: F.hasta, localId: 'todos' });
    expect(nequi.totales.ventas).toBeLessThan(todas.totales.ventas);
    // El dueño también filtra por vendedor; combinaciones de filtros.
    const vendedorId = todas.filas[0]?.vendedorId ?? '';
    const filtros = { vendedorId, canal: 'local' as const, clienteId: 'consumidor_final' as const };
    const s = selVentas(e, { desde: F.desde, hasta: F.hasta, localId: 'todos', ...filtros });
    const f2: FiltrosReporte = { ...F, rol: 'dueno', ...filtros };
    expect(hoja('ventas', 'Ventas detalladas', f2).filas.length).toBe(s.filas.length);
    expect(suma(hoja('ventas', 'Ventas detalladas', f2), 'total')).toBe(s.totales.ventas);
    expect(suma(hoja('ventas', 'Ventas resumidas', f2), 'netas')).toBe(s.totales.netas);
  });

  it('ventas: un separado creado y cancelado en el mismo mes no es venta (detalle = selVentas)', () => {
    const sep = Object.values(e.ventas).find(
      (v) => v.tipo === 'separado' && v.ts >= '2026-09-02' && !v.anulacion && v.separado && v.separado.cerrado?.resultado !== 'cancelado',
    );
    expect(sep).toBeDefined();
    if (!sep?.separado) return;
    const cancelada = { ...sep, separado: { ...sep.separado, cerrado: { ts: `${HOY}T10:00:00`, resultado: 'cancelado' as const } } };
    const e2: EstadoDominio = { ...e, ventas: { ...e.ventas, [sep.id]: cancelada } };
    const antes = selVentas(e, { desde: F.desde, hasta: F.hasta });
    const s = selVentas(e2, { desde: F.desde, hasta: F.hasta });
    const det = REPORTES.ventas.hojas(e2, F).find((h) => h.nombre === 'Ventas detalladas') as HojaReporte;
    expect(suma(det, 'total')).toBe(s.totales.ventas);
    expect(det.filas.find((x) => x.numero === sep.numero)?.total).toBe(0);
    expect(det.filas.find((x) => x.numero === sep.numero)?.estado).toBe('Separado cancelado');
    // Ni venta ni cancelación: el bruto y las devoluciones no se inflan con el ida y vuelta.
    const sinEl = sep.total;
    expect(s.totales.ventas).toBe(antes.totales.ventas - sinEl);
    expect(s.totales.devoluciones).toBe(antes.totales.devoluciones);
    expect(s.totales.numVentas).toBe(antes.totales.numVentas - 1);
    // Cualquier subrango suma lo mismo: el día de la creación tampoco lo cuenta.
    const dia = sep.ts.slice(0, 10);
    const delDia = selVentas(e2, { desde: dia, hasta: dia });
    expect(delDia.filas.some((x) => x.id === sep.id)).toBe(true);
    expect(selVentas(e, { desde: dia, hasta: dia }).totales.ventas - delDia.totales.ventas).toBe(sinEl);
  });

  it('inventario, kárdex, cuentas, gastos y resultados', () => {
    expect(suma(hoja('inventario', 'Inventario valorizado'), 'aCosto')).toBe(selValorizacion(e, { localId: 'todos' }).total.aCosto);
    expect(suma(hoja('inventario', 'Existencias por local'), 'total')).toBe(selValorizacion(e, { localId: 'todos' }).total.unidades);
    const k = selKardex(e, { productoId: e.meta.narrativa.productoOxford, localId: 'todos', desde: F.desde, hasta: F.hasta });
    const hk = REPORTES.kardex.hojas(e, F)[0] as HojaReporte;
    expect(hk.totales?.saldo).toBe(k.saldoFinal);
    expect(suma(hoja('cuentas', 'Por pagar'), 'saldo')).toBe(selCuentasPorPagar(e, { hoy: HOY, estado: 'pendientes', localId: 'todos' }).totalCop);
    expect(suma(hoja('cuentas', 'Por cobrar'), 'saldo')).toBe(selCuentasPorCobrar(e, { hoy: HOY, localId: 'todos' }).saldo);
    expect(suma(hoja('gastos', 'Gastos por categoría'), 'total')).toBe(selGastos(e, { desde: F.desde, hasta: F.hasta, localId: 'todos' }).total);
    const er = hoja('resultados', 'Estado de resultados');
    expect(er.filas.find((x) => x.concepto === 'Utilidad operativa')?.todos).toBe(
      selEstadoResultados(e, { desde: F.desde, hasta: F.hasta, localId: 'todos', prorratear: true }).utilidadOperativa,
    );
  });

  it('nómina, comisiones y el contador', () => {
    const n = hoja('nomina', 'Nómina');
    const costo = Object.values(e.liquidaciones)
      .filter((l) => l.periodo.fin >= F.desde && l.periodo.fin <= F.hasta)
      .reduce((a, l) => a + l.totales.costo, 0);
    expect(suma(n, 'costo')).toBe(costo);
    const c = hoja('comisiones', 'Comisiones');
    expect(suma(c, 'comision')).toBe(selComisiones(e, { mes: '2026-09', hoy: HOY }).reduce((a, x) => a + x.comision.total, 0));
    const ventas = hoja('contador', 'Ventas');
    const s = selVentas(e, { desde: F.desde, hasta: F.hasta });
    expect(suma(ventas, 'total')).toBe(s.totales.netas);
    expect(suma(ventas, 'base') + suma(ventas, 'iva')).toBe(s.totales.netas);
    expect(REPORTES.contador.hojas(e, F).map((h) => h.nombre)).toEqual([
      'Ventas',
      'Compras e importaciones',
      'Gastos por categoría',
      'Gastos',
      'Nómina',
      'IVA generado y descontable',
    ]);
  });

  it('el vendedor no ve costos ni ventas ajenas', () => {
    const fv: FiltrosReporte = { ...F, rol: 'vendedor', vendedorId: 'em_scardenas', localId: 'usq' };
    const inv = REPORTES.inventario.hojas(e, fv);
    for (const h of inv) expect(h.columnas.some((c) => c.clave === 'aCosto' || c.clave === 'costo')).toBe(false);
    const v = hoja('ventas', 'Ventas detalladas', fv);
    expect(v.filas.every((x) => String(x.vendedor).startsWith('Sebastián Cárdenas'))).toBe(true);
  });

  it('en USD las cifras de dinero se convierten con la tasa vigente', () => {
    const cop = hojasParaExportar('gastos', e, F, { moneda: 'COP', tasa: 1 })[0] as HojaReporte;
    const usd = hojasParaExportar('gastos', e, F, { moneda: 'USD', tasa: 3950 })[0] as HojaReporte;
    expect(Math.abs(suma(usd, 'total') - suma(cop, 'total') / 3950)).toBeLessThan(1);
  });
});

describe('los 13 reportes se descargan en PDF y Excel', () => {
  it.each(IDS_REPORTES)('%s: PDF no vacío y Excel releído con totales en caché', async (id) => {
    const pdf = await exportarReporte(id, e, F, 'pdf', CTX);
    expect(new TextDecoder().decode(new Uint8Array(pdf.datos).slice(0, 5))).toBe('%PDF-');
    expect(pdf.nombre.endsWith('.pdf')).toBe(true);
    const xls = await exportarReporte(id, e, F, 'excel', CTX);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(xls.datos);
    const hojas = REPORTES[id].hojas(e, F);
    expect(libro.worksheets.length).toBe(hojas.length);
    for (const [i, h] of hojas.entries()) {
      const ws = libro.worksheets[i];
      expect(ws).toBeDefined();
      if (!h.totales) continue;
      const fila = ws?.getRow(4 + h.filas.length + 1);
      h.columnas.forEach((c, j) => {
        const t = h.totales?.[c.clave];
        const v = fila?.getCell(j + 1).value as { formula?: string; result?: number } | number | null;
        if (t === 'suma') {
          // Un total en cero se escribe como valor (ExcelJS no guarda un resultado 0 en caché).
          if (suma(h, c.clave) === 0) expect(v, `${h.nombre}.${c.clave}`).toBe(0);
          else {
            expect(typeof v === 'object' && v?.formula, `${h.nombre}.${c.clave}`).toBeTruthy();
            expect((v as { result: number }).result, `${h.nombre}.${c.clave}`).toBeCloseTo(suma(h, c.clave), 1);
          }
        }
      });
    }
  });
});

describe('plantillas PDF', () => {
  it('factura, documento POS, nota crédito, desprendible y etiquetas', async () => {
    const ctx = { marca: 'HALDEN', descriptor: 'Moda masculina · Bogotá', ahora: AHORA };
    const fe = Object.values(e.facturas).find((f) => f.tipo === 'factura_electronica');
    const pos = Object.values(e.facturas).find((f) => f.tipo === 'documento_equivalente_pos');
    const nc = Object.values(e.notasCredito)[0];
    const liq = Object.values(e.liquidaciones).find((l) => l.lineas.some((x) => x.laboral));
    const emp = liq?.lineas.find((x) => x.laboral)?.empleadoId;
    const archivos = [
      await pdfFactura(e, fe?.id ?? '', ctx),
      await pdfDocumentoPos(e, pos?.id ?? '', ctx),
      ...(nc ? [await pdfNotaCredito(e, nc.id, ctx)] : []),
      await pdfDesprendible(e, liq?.id ?? '', emp ?? '', ctx),
      await pdfEtiquetas(e, Object.keys(e.variantes).slice(0, 30), ctx),
    ];
    for (const a of archivos) {
      expect(new TextDecoder().decode(new Uint8Array(a.datos).slice(0, 5))).toBe('%PDF-');
      expect(a.datos.byteLength).toBeGreaterThan(3000);
    }
  });
});
