import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sumarDias } from '@/dominio/reglas/fechas';
import {
  activarVerificacionDeTablas,
  pivotear,
  selComportamientoClientes,
  selDiasInventario,
  selHechosAnalisis,
  selMapaCalor,
  selMediosDePago,
  selPivote,
  selResumenVentas,
  selTallasYColores,
  selTopProductos,
} from '@/selectores';
import { estadoDe, HOY } from '@/selectores/pruebas/construir';
import { datosGraficoPivote, hojaPivote, prepararPivote } from './calculos';
import { selClientesPeriodo, selColoresQueRotan, selMediosComparados, selOpcionesFiltroProductos, selProveedorDeCategoria, selResumenRotacion, selVendidos } from './selectores';

beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

const e = estadoDe();
const DESDE = sumarDias(HOY, -89);

describe('tabla dinámica contra el recálculo directo (17.000 ventas)', () => {
  const todo = { desde: e.meta.inicioVentana, hasta: HOY };
  const resumen = selResumenVentas(e, { ...todo, localId: 'todos' });

  it('las medidas que se suman cuadran con el resumen de ventas, sea cual sea el cruce', () => {
    for (const filas of [['mes'], ['local'], ['categoria'], ['vendedor'], ['mes', 'local']] as const) {
      const ventas = selPivote(e, { filas: [...filas], columnas: [], medida: 'ventas', hoy: HOY });
      const unidades = selPivote(e, { filas: [...filas], columnas: [], medida: 'unidades', hoy: HOY });
      // `ventas` del pivote es neta (devoluciones restan, V4): igual que `netas` del resumen. Cada cifra va redondeada por fila.
      expect(Math.abs(ventas.total - resumen.netas)).toBeLessThanOrEqual(1);
      expect(unidades.total).toBe(resumen.unidades);
      const sumaFilas = ventas.filas.reduce((s, f) => s + f.total, 0);
      expect(Math.abs(sumaFilas - ventas.total)).toBeLessThanOrEqual(ventas.filas.length);
    }
  });

  it('el número de ventas y el ticket no se suman: el total se recalcula con todas las ventas', () => {
    const porLocal = selPivote(e, { filas: ['local'], columnas: [], medida: 'numVentas', hoy: HOY });
    expect(porLocal.total).toBe(resumen.numVentas);
    const porMedio = selPivote(e, { filas: ['medioPago'], columnas: [], medida: 'numVentas', hoy: HOY });
    // Una venta con pago mixto cuenta en cada medio: la suma de las filas supera al total real.
    expect(porMedio.total).toBe(resumen.numVentas);
    expect(porMedio.filas.reduce((s, f) => s + f.total, 0)).toBeGreaterThanOrEqual(porMedio.total);
    const ticket = selPivote(e, { filas: ['local'], columnas: [], medida: 'ticket', hoy: HOY });
    expect(ticket.total).toBe(Math.round(resumen.ventas / resumen.numVentas));
  });

  it('los 15 cruces y las 7 medidas existen y responden con filas', () => {
    const hechos = selHechosAnalisis(e, { hoy: HOY });
    expect(hechos.length).toBeGreaterThan(20_000);
    const dims = Object.keys(hechos[0]?.dim ?? {});
    expect(dims).toHaveLength(15);
    for (const d of dims) {
      const r = pivotear(hechos, { filas: [d as never], columnas: [], medida: 'ventas' });
      expect(r.filas.length).toBeGreaterThan(0);
    }
  });

  it('un filtro por mes deja solo esos meses y el filtro por local coincide con el selector de ventas', () => {
    const mes = HOY.slice(0, 7);
    const r = selPivote(e, { filas: ['mes'], columnas: [], medida: 'ventas', filtros: { mes: [mes] }, hoy: HOY });
    expect(r.filas.map((f) => f.clave[0])).toEqual([mes]);
    const local = Object.values(e.locales).find((l) => l.vende);
    const f = selPivote(e, { filas: ['local'], columnas: [], medida: 'ventas', filtros: { local: [local?.nombre ?? ''] }, hoy: HOY });
    const esperado = selResumenVentas(e, { ...todo, localId: local?.id ?? '' }).netas;
    expect(Math.abs(f.total - esperado)).toBeLessThanOrEqual(1);
  });

  it('la tabla preparada, su gráfico y su hoja de Excel conservan los totales del selector', () => {
    const r = selPivote(e, { filas: ['mes'], columnas: ['local'], medida: 'ventas', hoy: HOY });
    const p = prepararPivote(r, ['mes'], ['local']);
    expect(p.filas.map((f) => f.etiquetas[0])).toEqual([...p.filas.map((f) => f.etiquetas[0] ?? '')].sort());
    const g = datosGraficoPivote(p, p.columnas);
    expect(g.series.length).toBe(p.columnas.length);
    expect(g.apiladas).toBe(true);
    const h = hojaPivote(p, ['Mes'], 'Ventas $', (v) => v);
    expect(h.filas).toHaveLength(p.filas.length);
    expect(h.totales?.total).toBe('suma');
    const sumaTotal = h.filas.reduce((s, f) => s + Number(f.total), 0);
    expect(Math.abs(sumaTotal - r.total)).toBeLessThanOrEqual(p.filas.length);
  });
});

describe('selVendidos', () => {
  it('sin filtros coincide con selTopProductos por unidades, valor y margen', () => {
    for (const medida of ['unidades', 'valor', 'margen'] as const) {
      const base = { desde: DESDE, hasta: HOY, localId: 'todos' as const, medida, n: 8 };
      const mio = selVendidos(e, { ...base, categoria: null, talla: null, colorId: null });
      const ref = selTopProductos(e, { ...base, orden: 'mas' });
      expect(mio.mas.map((x) => x.productoId)).toEqual(ref.filter((x) => x.unidades > 0).map((x) => x.productoId));
      expect(mio.mas[0]?.[medida === 'valor' ? 'valor' : medida]).toBe(ref[0]?.[medida]);
    }
  });

  it('el filtro por categoría, talla y color solo deja esas ventas y el total es la suma de los productos', () => {
    const talla = 'M';
    const r = selVendidos(e, { desde: DESDE, hasta: HOY, localId: 'todos', categoria: 'camisas', talla, colorId: null, medida: 'unidades', n: 500 });
    expect(r.mas.length).toBeGreaterThan(0);
    expect(r.mas.every((x) => x.categoria === 'camisas')).toBe(true);
    const todas = selVendidos(e, { desde: DESDE, hasta: HOY, localId: 'todos', categoria: 'camisas', talla: null, colorId: null, medida: 'unidades', n: 500 });
    expect(r.total.unidades).toBeLessThan(todas.total.unidades);
    expect(r.total.unidades).toBe(r.mas.reduce((s, x) => s + x.unidades, 0));
    const color = e.colores[Object.keys(e.colores)[0] ?? ''];
    const c = selVendidos(e, { desde: DESDE, hasta: HOY, localId: 'todos', categoria: null, talla: null, colorId: color?.id ?? null, medida: 'valor', n: 5 });
    expect(c.total.valor).toBeLessThan(selVendidos(e, { desde: DESDE, hasta: HOY, localId: 'todos', categoria: null, talla: null, colorId: null, medida: 'valor', n: 5 }).total.valor);
  });

  it('con un local solo cuenta las ventas de ese local', () => {
    const local = Object.values(e.locales).find((l) => l.vende);
    const un = selVendidos(e, { desde: DESDE, hasta: HOY, localId: local?.id ?? '', categoria: null, talla: null, colorId: null, medida: 'valor', n: 3 });
    expect(Math.abs(un.total.valor - selResumenVentas(e, { desde: DESDE, hasta: HOY, localId: local?.id ?? '' }).netas)).toBeLessThanOrEqual(1);
  });

  it('los menos vendidos son los de menor medida y la participación suma a lo sumo 100 %', () => {
    const r = selVendidos(e, { desde: DESDE, hasta: HOY, localId: 'todos', categoria: null, talla: null, colorId: null, medida: 'valor', n: 10 });
    expect(r.menos[0]?.valor ?? 0).toBeLessThanOrEqual(r.mas[0]?.valor ?? 0);
    const orden = r.menos.map((x) => x.valor);
    expect(orden).toEqual([...orden].sort((a, b) => a - b));
    expect(r.mas.reduce((s, x) => s + x.participacion, 0)).toBeLessThanOrEqual(1.0000001);
  });
});

describe('opciones, fábrica y colores', () => {
  it('ofrece las categorías, tallas y colores del catálogo', () => {
    const o = selOpcionesFiltroProductos(e);
    expect(o.categorias.length).toBeGreaterThanOrEqual(8);
    expect(o.tallas).toContain('M');
    expect(o.tallas.indexOf('S')).toBeLessThan(o.tallas.indexOf('XL'));
    expect(o.colores.length).toBeGreaterThan(10);
  });

  it('la fábrica de las camisas es un proveedor existente de tipo fábrica', () => {
    const p = selProveedorDeCategoria(e, { categoria: 'camisas' });
    expect(p).not.toBeNull();
    expect(e.proveedores[p?.id ?? '']?.tipo).toBe('fabrica');
  });

  it('los colores traen su muestra y las participaciones suman 1', () => {
    const c = selColoresQueRotan(e, { categoria: 'camisas', desde: sumarDias(HOY, -179), hasta: HOY, hoy: HOY });
    expect(c.length).toBeGreaterThan(3);
    expect(c.reduce((s, x) => s + x.proporcion, 0)).toBeCloseTo(1, 9);
    expect(c.every((x) => /^#[0-9a-fA-F]{6}$/.test(x.hex))).toBe(true);
    const tallas = selTallasYColores(e, { categoria: 'camisas', desde: sumarDias(HOY, -179), hasta: HOY });
    expect(c.reduce((s, x) => s + x.unidades, 0)).toBe(tallas.tallas.reduce((s, x) => s + x.unidades, 0));
  });
});

describe('rotación', () => {
  it('la tienda es la de selDiasInventario y cada categoría trae su estado', () => {
    const r = selResumenRotacion(e, { hoy: HOY, diasSinMovimiento: 60 });
    expect(r.tienda.dias).toBe(selDiasInventario(e, { hoy: HOY }).dias);
    expect(r.categorias.length).toBeGreaterThan(5);
    expect(r.categorias.some((c) => c.estado === 'dormida')).toBe(true);
    expect(r.dormidasACosto).toBe(r.dormidas.reduce((s, d) => s + d.aCosto, 0));
    expect(r.dormidas.length).toBeGreaterThan(0);
    expect(selResumenRotacion(e, { hoy: HOY, diasSinMovimiento: 120 }).dormidas.length).toBeLessThanOrEqual(r.dormidas.length);
  });
});

describe('clientes', () => {
  const rango = { desde: sumarDias(HOY, -364), hasta: HOY, hoy: HOY };

  it('la proporción de consumidor final es la de selComportamientoClientes', () => {
    const c = selClientesPeriodo(e, rango);
    const ref = selComportamientoClientes(e, rango);
    expect(c.ventas).toBe(ref.numVentas);
    expect(c.conCliente).toBe(ref.conCliente);
    expect(c.consumidorFinal).toBeCloseTo(ref.consumidorFinal, 12);
    expect(c.consumidorFinal).toBeGreaterThan(0.5);
  });

  it('nuevos y recurrentes suman los clientes y los segmentos suman todas las ventas', () => {
    const c = selClientesPeriodo(e, rango);
    expect(c.nuevos + c.recurrentes).toBe(c.clientes);
    expect(c.segmentos.reduce((s, x) => s + x.ventas, 0)).toBe(c.ventas);
    expect(Math.abs(c.segmentos.reduce((s, x) => s + x.valor, 0) - c.valor)).toBeLessThanOrEqual(1);
    expect(c.canales.reduce((s, x) => s + x.ventas, 0)).toBe(c.ventas);
    expect(c.segmentos.at(-1)?.id).toBe('consumidor_final');
    expect(c.comprasPorCliente).toBeGreaterThanOrEqual(1);
  });

  it('un período corto tiene menos clientes nuevos que uno largo', () => {
    const corto = selClientesPeriodo(e, { desde: sumarDias(HOY, -29), hasta: HOY, hoy: HOY });
    const largo = selClientesPeriodo(e, rango);
    expect(corto.nuevos).toBeLessThanOrEqual(largo.nuevos);
  });
});

describe('medios de pago', () => {
  it('compara el último mes con el de hace un año con las mismas definiciones de selMediosDePago', () => {
    const m = selMediosComparados(e, { hoy: HOY });
    const ahora = selMediosDePago(e, { desde: sumarDias(HOY, -30), hasta: sumarDias(HOY, -1) });
    expect(m.hayAnterior).toBe(true);
    expect(m.filas.reduce((s, f) => s + f.ahora, 0)).toBeCloseTo(1, 9);
    expect(m.filas[0]?.medio).toBe(ahora[0]?.medio);
    expect(m.digitalAhora).toBeGreaterThan(m.digitalAntes ?? 1);
  });
});

describe('mapa de calor', () => {
  it('el selector trae 13 horas y la pantalla usa de 10 a 21 (12 columnas)', () => {
    const m = selMapaCalor(e, { desde: sumarDias(HOY, -83), hasta: HOY, localId: 'todos' });
    expect(m.valores).toHaveLength(7);
    expect(m.valores[0]).toHaveLength(13);
    const fuera = m.valores.reduce((s, f) => s + (f[0] ?? 0), 0);
    expect(fuera).toBe(0);
  });
});
