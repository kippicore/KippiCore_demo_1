import { describe, expect, it } from 'vitest';
import type { ResultadoPivote } from '@/selectores';
import {
  columnasVisibles,
  compararNatural,
  datosGraficoPivote,
  encontrarEstrella,
  esAditiva,
  estadoRotacion,
  franjaMasFuerte,
  hojaPivote,
  mesesParaVender,
  mesesRecientes,
  notaFranja,
  prepararPivote,
  rangoDePeriodo,
  resumenMeses,
  rotacionAnual,
  textoFranjaHoras,
  ticketVsVolumen,
  tipoMedida,
} from './calculos';

const res = (p: Partial<ResultadoPivote> & Pick<ResultadoPivote, 'filas' | 'columnas'>): ResultadoPivote => ({
  medida: 'ventas',
  totalesColumna: {},
  total: 0,
  ...p,
});

describe('períodos', () => {
  it('rangoDePeriodo cuenta el día de hoy dentro del período', () => {
    expect(rangoDePeriodo('2026-09-30', '30d')).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' });
    expect(rangoDePeriodo('2026-09-30', '90d').desde).toBe('2026-07-03');
  });

  it('mesesRecientes cruza el cambio de año y 0 es "sin límite"', () => {
    expect(mesesRecientes('2026-02-10', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
    expect(mesesRecientes('2026-02-10', 1)).toEqual(['2026-02']);
    expect(mesesRecientes('2026-02-10', 0)).toEqual([]);
  });
});

describe('medidas y orden natural', () => {
  it('numVentas, ticket y margen % no se suman', () => {
    expect(['ventas', 'ventasSinIva', 'unidades', 'margen'].every((m) => esAditiva(m as never))).toBe(true);
    expect(['numVentas', 'ticket', 'margenPct'].some((m) => esAditiva(m as never))).toBe(false);
  });

  it('el tipo de medida decide el formato', () => {
    expect(tipoMedida('ventas')).toBe('dinero');
    expect(tipoMedida('ticket')).toBe('dinero');
    expect(tipoMedida('unidades')).toBe('entero');
    expect(tipoMedida('numVentas')).toBe('entero');
    expect(tipoMedida('margenPct')).toBe('porcentaje');
  });

  it('los días van de lunes a domingo, las tallas de S a XXL y las numéricas por número', () => {
    const dias = ['Dom', 'Jue', 'Lun', 'Sáb', 'Mar'].sort((a, b) => compararNatural('diaSemana', a, b));
    expect(dias).toEqual(['Lun', 'Mar', 'Jue', 'Sáb', 'Dom']);
    const tallas = ['XL', 'S', '40', 'XXL', 'M', '32', 'L', 'Única'].sort((a, b) => compararNatural('talla', a, b));
    expect(tallas).toEqual(['S', 'M', 'L', 'XL', 'XXL', '32', '40', 'Única']);
  });
});

describe('prepararPivote', () => {
  it('ordena los días en su orden natural y deja los totales intactos', () => {
    const r = res({
      columnas: ['Total'],
      filas: [
        { clave: ['Sáb'], celdas: { Total: 90 }, total: 90 },
        { clave: ['Lun'], celdas: { Total: 10 }, total: 10 },
        { clave: ['Dom'], celdas: { Total: 50 }, total: 50 },
      ],
      totalesColumna: { Total: 150 },
      total: 150,
    });
    const p = prepararPivote(r, ['diaSemana'], []);
    expect(p.filas.map((f) => f.etiquetas[0])).toEqual(['Lun', 'Sáb', 'Dom']);
    expect(p.total).toBe(150);
  });

  it('las dimensiones sin orden propio van de mayor a menor valor', () => {
    const r = res({
      columnas: ['Total'],
      filas: [
        { clave: ['Camisas'], celdas: { Total: 10 }, total: 10 },
        { clave: ['Polos'], celdas: { Total: 70 }, total: 70 },
        { clave: ['Trajes'], celdas: { Total: 40 }, total: 40 },
      ],
    });
    expect(prepararPivote(r, ['categoria'], []).filas.map((f) => f.etiquetas[0])).toEqual(['Polos', 'Trajes', 'Camisas']);
  });

  it('con dos dimensiones de fila agrupa por la primera y ordena la segunda por su sentido', () => {
    const r = res({
      columnas: ['Total'],
      filas: [
        { clave: ['2026-02', 'Sáb'], celdas: { Total: 1 }, total: 1 },
        { clave: ['2026-01', 'Dom'], celdas: { Total: 2 }, total: 2 },
        { clave: ['2026-01', 'Lun'], celdas: { Total: 3 }, total: 3 },
      ],
    });
    expect(prepararPivote(r, ['mes', 'diaSemana'], []).filas.map((f) => f.id)).toEqual(['2026-01 · Lun', '2026-01 · Dom', '2026-02 · Sáb']);
  });

  it('las columnas naturales (talla) se ordenan y las demás por valor; el tope deja las de mayor valor', () => {
    const r = res({
      columnas: ['XL', 'S', 'M'],
      filas: [{ clave: ['x'], celdas: { XL: 5, S: 1, M: 9 }, total: 15 }],
      totalesColumna: { XL: 5, S: 1, M: 9 },
    });
    const p = prepararPivote(r, ['categoria'], ['talla']);
    expect(p.columnas).toEqual(['S', 'M', 'XL']);
    const v = columnasVisibles(p, 2);
    expect(v.visibles).toEqual(['M', 'XL']);
    expect(v.ocultas).toBe(1);
    expect(columnasVisibles(p, 5)).toEqual({ visibles: ['S', 'M', 'XL'], ocultas: 0 });
  });
});

describe('gráfico de la tabla dinámica', () => {
  const filas = Array.from({ length: 40 }, (_, i) => ({ clave: [`2026-08-${String(i + 1).padStart(2, '0')}`], celdas: { A: i, B: 2 * i }, total: 3 * i }));
  const r = res({ columnas: ['A', 'B'], filas, totalesColumna: { A: 1, B: 2 }, total: 3 });

  it('con fechas muestra las últimas 24 en líneas y apila las medidas que se suman', () => {
    const p = prepararPivote(r, ['fecha'], ['local']);
    const g = datosGraficoPivote(p, p.columnas);
    expect(g.datos).toHaveLength(24);
    expect(g.criterio).toBe('ultimas');
    expect(g.fueraDelGrafico).toBe(16);
    expect(g.tipo).toBe('linea');
    expect(g.series).toHaveLength(2);
    expect(g.apiladas).toBe(true);
    expect(g.datos[23]?.x).toBe('2026-08-40');
  });

  it('una medida que no se suma (ticket) no se apila', () => {
    const p = prepararPivote({ ...r, medida: 'ticket' }, ['mes'], ['local']);
    expect(datosGraficoPivote(p, p.columnas).apiladas).toBe(false);
  });

  it('con más de 4 columnas dibuja solo el total y con categorías deja las 12 de mayor valor', () => {
    const muchas = res({
      columnas: ['a', 'b', 'c', 'd', 'e'],
      filas: Array.from({ length: 30 }, (_, i) => ({ clave: [`P${String(i)}`], celdas: { a: 1 }, total: i })),
    });
    const p = prepararPivote(muchas, ['producto'], ['talla']);
    const g = datosGraficoPivote(p, p.columnas);
    expect(g.series).toHaveLength(1);
    expect(g.series[0]?.clave).toBe('total');
    expect(g.criterio).toBe('mayores');
    expect(g.datos).toHaveLength(12);
    expect(g.datos[0]?.x).toBe('P29');
  });
});

describe('hojaPivote (Excel)', () => {
  const r = res({
    columnas: ['Norte', 'Sur'],
    filas: [
      { clave: ['Camisas'], celdas: { Norte: 100, Sur: 50 }, total: 150 },
      { clave: ['Polos'], celdas: { Norte: 40 }, total: 40 },
    ],
    totalesColumna: { Norte: 140, Sur: 50 },
    total: 190,
  });

  it('una medida que se suma lleva fórmula SUM en cada total', () => {
    const p = prepararPivote(r, ['categoria'], ['local']);
    const h = hojaPivote(p, ['Categoría'], 'Ventas $', (v) => v);
    expect(h.columnas.map((c) => c.titulo)).toEqual(['Categoría', 'Norte', 'Sur', 'Total']);
    expect(h.columnas[1]?.tipo).toBe('moneda');
    expect(h.filas).toHaveLength(2);
    expect(h.filas[1]).toMatchObject({ d0: 'Polos', c0: 40, c1: null, total: 40 });
    expect(h.totales).toEqual({ d0: 'Total', c0: 'suma', c1: 'suma', total: 'suma' });
    expect(h.nota).toBeUndefined();
  });

  it('una medida que no se suma lleva el valor ya calculado y lo explica', () => {
    const p = prepararPivote({ ...r, medida: 'ticket' }, ['categoria'], ['local']);
    const h = hojaPivote(p, ['Categoría'], 'Ticket promedio', (v) => v);
    expect(h.totales).toEqual({ d0: 'Total', c0: 140, c1: 50, total: 190 });
    expect(h.nota).toContain('no se suma');
  });

  it('convierte solo el dinero a la moneda activa; unidades y porcentajes quedan como están', () => {
    const dolar = (v: number) => v / 2;
    const dinero = hojaPivote(prepararPivote(r, ['categoria'], []), ['Categoría'], 'Ventas $', dolar);
    expect(dinero.filas[0]?.total).toBe(75);
    const unidades = hojaPivote(prepararPivote({ ...r, medida: 'unidades' }, ['categoria'], []), ['Categoría'], 'Unidades', dolar);
    expect(unidades.filas[0]?.total).toBe(150);
    expect(unidades.columnas.at(-1)?.tipo).toBe('entero');
    const pct = hojaPivote(prepararPivote({ ...r, medida: 'margenPct' }, ['categoria'], []), ['Categoría'], 'Margen %', dolar);
    expect(pct.columnas.at(-1)?.tipo).toBe('porcentaje');
  });

  it('sin columnas la última columna se llama como la medida', () => {
    const h = hojaPivote(prepararPivote(r, ['categoria'], []), ['Categoría'], 'Ventas $', (v) => v);
    expect(h.columnas.map((c) => c.titulo)).toEqual(['Categoría', 'Ventas $']);
  });
});

describe('mapa de calor', () => {
  it('encuentra la franja de 4 horas con más ventas y la describe', () => {
    const valores = Array.from({ length: 7 }, () => Array.from({ length: 12 }, () => 1));
    for (let c = 5; c <= 8; c++) valores[5]![c] = 10; // sábado, 3 a 7 p. m.
    const f = franjaMasFuerte(valores);
    expect(f).toMatchObject({ fila: 5, desde: 5, hasta: 8, horaDesde: 15, horaHasta: 19 });
    expect(f?.participacion).toBeCloseTo(40 / (40 + 80), 9);
    expect(notaFranja(f!, '33 %')).toBe('Sábados de 3 a 7 p. m.: 33 % de tus ventas');
  });

  it('sin ventas no hay franja', () => {
    expect(franjaMasFuerte(Array.from({ length: 7 }, () => Array.from({ length: 12 }, () => 0)))).toBeNull();
  });

  it('las horas cruzan el mediodía con a. m. y p. m.', () => {
    expect(textoFranjaHoras(11, 15)).toBe('de 11 a. m. a 3 p. m.');
    expect(textoFranjaHoras(15, 19)).toBe('de 3 a 7 p. m.');
    expect(textoFranjaHoras(10, 12)).toBe('de 10 a. m. a 12 p. m.');
  });
});

describe('series por mes', () => {
  const serie = [
    { mes: '2026-07', netas: 100, anioAnterior: 80 },
    { mes: '2026-08', netas: 150, anioAnterior: 100 },
    { mes: '2026-09', netas: 60, anioAnterior: 120 },
  ];

  it('con el mes en curso incompleto lo deja fuera del mejor mes y de la comparación', () => {
    const r = resumenMeses(serie, '2026-09-10');
    expect(r.mesEnCursoIncompleto).toBe(true);
    expect(r.mejor?.mes).toBe('2026-08');
    expect(r.comparables).toBe(2);
    expect(r.variacion).toBeCloseTo(250 / 180 - 1, 9);
  });

  it('el último día del mes ya cuenta completo', () => {
    const r = resumenMeses(serie, '2026-09-30');
    expect(r.mesEnCursoIncompleto).toBe(false);
    expect(r.comparables).toBe(3);
  });

  it('sin año anterior no hay variación', () => {
    expect(resumenMeses([{ mes: '2026-01', netas: 5, anioAnterior: null }], '2026-02-20').variacion).toBeNull();
  });
});

describe('rotación de inventario', () => {
  it('la rotación anual es 365 entre los días de inventario', () => {
    expect(rotacionAnual(73)).toBe(5);
    expect(rotacionAnual(Infinity)).toBeNull();
    expect(rotacionAnual(0)).toBeNull();
  });

  it('dormida con más de 1,3 veces los días de la tienda, ágil con menos de 0,7', () => {
    expect(estadoRotacion(190, 500, 240, 105)).toBe('dormida');
    expect(estadoRotacion(105, 500, 400, 105)).toBe('normal');
    expect(estadoRotacion(60, 500, 800, 105)).toBe('agil');
    expect(estadoRotacion(Infinity, 120, 0, 105)).toBe('sin_ventas');
  });

  it('los meses para vender se redondean y nunca bajan de uno', () => {
    expect(mesesParaVender(190)).toBe(6);
    expect(mesesParaVender(5)).toBe(1);
    expect(mesesParaVender(Infinity)).toBeNull();
  });
});

describe('frases', () => {
  it('la vendedora estrella vende al menos 15 % más que el promedio y se compara su accesorio con el del resto', () => {
    const v = [
      { nombre: 'Valentina', numVentas: 100, conAccesorio: 0.46, vecesPromedio: 1.4 },
      { nombre: 'Camilo', numVentas: 100, conAccesorio: 0.18, vecesPromedio: 0.95 },
      { nombre: 'Santiago', numVentas: 100, conAccesorio: 0.16, vecesPromedio: 0.9 },
    ];
    const e = encontrarEstrella(v);
    expect(e?.nombre).toBe('Valentina');
    expect(e?.porcentajeMas).toBeCloseTo(0.4, 9);
    expect(e?.accesorioResto).toBeCloseTo(0.17, 9);
    expect(e?.destacaAccesorio).toBe(true);
    expect(encontrarEstrella(v.map((x) => ({ ...x, vecesPromedio: 1.05 })))).toBeNull();
    expect(encontrarEstrella(v.slice(0, 2))).toBeNull();
  });

  it('ticket contra volumen: el local con menos ventas pero cada venta más cara', () => {
    const r = ticketVsVolumen([
      { nombre: 'Parque 93', numVentas: 270, ticket: 520_000 },
      { nombre: 'Zona Rosa', numVentas: 420, ticket: 315_000 },
      { nombre: 'Usaquén', numVentas: 180, ticket: 365_000 },
    ]);
    expect(r?.localTicket).toBe('Parque 93');
    expect(r?.localVolumen).toBe('Zona Rosa');
    expect(r?.veces).toBeCloseTo(520 / 315, 9);
    expect(ticketVsVolumen([{ nombre: 'A', numVentas: 5, ticket: 9 }])).toBeNull();
    // Si el de más volumen también tiene el ticket más alto, no hay contraste que contar.
    expect(
      ticketVsVolumen([
        { nombre: 'A', numVentas: 50, ticket: 900 },
        { nombre: 'B', numVentas: 10, ticket: 100 },
      ]),
    ).toBeNull();
  });
});
