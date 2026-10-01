import type { DatosSaludo } from '@/selectores';
import { alertasVisibles, type DiaPorLocal, elegirPorVisita, estadoCierre, frasePorComparacion, fraseSaludo, lectura30Dias, ritmoMeta, saludoDe, textoDeSegmentos } from './calculos';

const base: DatosSaludo = {
  franja: 'tarde',
  periodo: 'hoy',
  ventas: 7_260_000,
  numVentas: 19,
  variacion: 0.14,
  diaComparacion: 'miércoles',
  mejorLocal: { id: 'zr', nombre: 'Zona Rosa' },
  cierres: null,
  apertura: '10:00',
  localNombre: null,
};
const pesos = (n: number) => `$ ${n.toLocaleString('es-CO')}`;
const frase = (d: Partial<DatosSaludo>) => textoDeSegmentos(fraseSaludo({ ...base, ...d }), pesos);

describe('saludoDe', () => {
  it('sin nombre, nunca usa el del dueño ficticio', () => {
    expect(saludoDe('manana', null)).toBe('Buenos días.');
    expect(saludoDe('tarde', '  ')).toBe('Buenas tardes.');
    expect(saludoDe('noche', null)).toBe('Buenas noches.');
  });
  it('con el nombre que escribió el cliente', () => {
    expect(saludoDe('tarde', 'Hernán')).toBe('Buenas tardes, Hernán.');
  });
});

describe('frasePorComparacion', () => {
  it('más, menos, igual y sin base', () => {
    expect(frasePorComparacion(0.14, 'miércoles', true)).toMatch(/^14.%.más que el miércoles pasado a esta hora$/);
    expect(frasePorComparacion(-0.09, 'miércoles', false)).toMatch(/^9.%.menos que el miércoles pasado$/);
    expect(frasePorComparacion(0.001, 'lunes', false)).toBe('igual que el lunes pasado');
    expect(frasePorComparacion(null, 'lunes', false)).toBeNull();
  });
});

describe('fraseSaludo (tres variantes por hora)', () => {
  it('tarde: lo que llevas hoy, la comparación a esta hora y quién va adelante', () => {
    const f = frase({});
    expect(f).toContain('Hoy llevas $ 7.260.000 en 19 ventas, ');
    expect(f).toMatch(/14.% más que el miércoles pasado a esta hora\. Zona Rosa va adelante\.$/);
  });
  it('tarde con un local: la frase se adapta', () => {
    expect(frase({ localNombre: 'Usaquén', mejorLocal: null, ventas: 1_920_000, numVentas: 6 })).toMatch(/^Hoy Usaquén lleva \$ 1\.920\.000 en 6 ventas, /);
  });
  it('noche: cómo cerraste hoy', () => {
    const f = frase({ franja: 'noche', variacion: 0.09, ventas: 12_130_000, numVentas: 33 });
    expect(f).toMatch(/^Hoy cerraste en \$ 12\.130\.000 con 33 ventas, 9.% más que el miércoles pasado\. Zona Rosa fue el mejor local\.$/);
  });
  it('mañana: ayer, las cajas con faltante y la apertura', () => {
    const f = frase({
      franja: 'manana',
      periodo: 'ayer',
      ventas: 11_840_000,
      numVentas: 31,
      mejorLocal: { id: 'p93', nombre: 'Parque 93' },
      cierres: { cuadraron: ['Parque 93', 'Usaquén'], conDiferencia: [{ local: 'Zona Rosa', diferencia: -40_000, cajero: 'Natalia' }] },
    });
    expect(f).toBe('Ayer cerraste en $ 11.840.000 con 31 ventas; Parque 93 fue el mejor local. Las tres cajas cerraron; Zona Rosa con un faltante de $ 40.000. Los locales abren a las 10:00 a. m.');
  });
  it('mañana con las tres cajas cuadradas', () => {
    const f = frase({ franja: 'manana', cierres: { cuadraron: ['A', 'B', 'C'], conDiferencia: [] } });
    expect(f).toContain('Las tres cajas cerraron cuadradas.');
  });
  it('mañana con un local: solo cuenta su caja', () => {
    const f = frase({
      franja: 'manana',
      localNombre: 'Usaquén',
      mejorLocal: null,
      cierres: { cuadraron: ['Usaquén', 'Parque 93'], conDiferencia: [{ local: 'Zona Rosa', diferencia: -40_000, cajero: 'N' }] },
    });
    expect(f).toContain('La caja de Usaquén cerró cuadrada.');
    expect(f).not.toContain('Zona Rosa');
    expect(f).toMatch(/Usaquén abre a las 10:00 a\. m\.$/);
  });
  it('mañana con un sobrante lo dice', () => {
    const f = frase({ franja: 'manana', localNombre: 'Zona Rosa', mejorLocal: null, cierres: { cuadraron: [], conDiferencia: [{ local: 'Zona Rosa', diferencia: 5_000, cajero: 'N' }] } });
    expect(f).toContain('La caja de Zona Rosa cerró con un sobrante de $ 5.000.');
  });
  it('sin ventas no inventa cifras ni deja un $ 0 como protagonista', () => {
    expect(frase({ numVentas: 0, ventas: 0 })).toMatch(/^Todavía no hay ventas registradas hoy/);
    expect(frase({ franja: 'manana', numVentas: 0, ventas: 0 })).toMatch(/^Ayer no se registraron ventas\./);
  });
  it('las cifras de dinero viajan como segmentos (para que ruedan en pantalla)', () => {
    const dinero = fraseSaludo(base).filter((s) => s.tipo === 'dinero');
    expect(dinero).toEqual([{ tipo: 'dinero', valor: 7_260_000 }]);
  });
});

describe('lectura30Dias', () => {
  const dias: DiaPorLocal[] = [
    { fecha: '2026-09-28', total: 300, porLocal: { a: 100, b: 200 } },
    { fecha: '2026-09-29', total: 500, porLocal: { a: 400, b: 100 } },
    { fecha: '2026-09-30', total: 0, porLocal: {} },
  ];
  const l = lectura30Dias(dias, [
    { id: 'a', nombre: 'A' },
    { id: 'b', nombre: 'B' },
  ]);
  it('el total es la suma de las barras y el promedio es por día', () => {
    expect(l.total).toBe(800);
    expect(l.promedio).toBe(267);
  });
  it('el mejor día ignora los días sin ventas', () => {
    expect(l.mejorDia).toEqual({ fecha: '2026-09-29', valor: 500 });
  });
  it('los aportes suman 100 % y van del mayor al menor', () => {
    expect(l.aportes.map((a) => a.nombre)).toEqual(['A', 'B']);
    expect(l.aportes.reduce((a, x) => a + x.proporcion, 0)).toBeCloseTo(1);
    expect(l.aportes[0]?.valor).toBe(500);
  });
  it('sin ventas no divide entre cero', () => {
    const v = lectura30Dias([{ fecha: '2026-09-30', total: 0, porLocal: {} }], [{ id: 'a', nombre: 'A' }]);
    expect(v.total).toBe(0);
    expect(v.mejorDia).toBeNull();
    expect(v.aportes[0]?.proporcion).toBe(0);
  });
});

describe('ritmoMeta', () => {
  it('compara lo logrado con lo transcurrido del mes', () => {
    expect(ritmoMeta(0.5, '2026-09-15', '2026-09').alDia).toBe(true);
    expect(ritmoMeta(0.4, '2026-09-15', '2026-09').alDia).toBe(false);
    expect(ritmoMeta(0.4, '2026-09-15', '2026-09').transcurrido).toBe(0.5);
  });
  it('un mes ya cerrado cuenta completo', () => {
    expect(ritmoMeta(1.01, '2026-10-02', '2026-09').transcurrido).toBe(1);
  });
});

describe('estadoCierre', () => {
  const d = (n: number) => `$ ${n}`;
  it('sin cierre no hay estado', () => {
    expect(estadoCierre(null, '2026-09-30', d)).toBeNull();
  });
  it('cuadró, faltante y sobrante', () => {
    expect(estadoCierre({ fecha: '2026-09-29', diferencia: 0, cajero: 'A', revisado: false }, '2026-09-30', d)).toMatchObject({ tono: 'success', etiqueta: 'Cuadró', detalle: 'ayer · cerró A' });
    expect(estadoCierre({ fecha: '2026-09-29', diferencia: -40000, cajero: 'N', revisado: false }, '2026-09-30', d)).toMatchObject({ tono: 'danger', etiqueta: 'Faltan $ 40000' });
    expect(estadoCierre({ fecha: '2026-09-29', diferencia: 5000, cajero: '', revisado: true }, '2026-09-30', d)).toMatchObject({ tono: 'neutral', etiqueta: 'Sobran $ 5000', detalle: 'ayer · revisado' });
  });
});

describe('elegirPorVisita y alertasVisibles', () => {
  it('rota y da la vuelta', () => {
    expect(elegirPorVisita(['a', 'b', 'c'], 0)).toBe('a');
    expect(elegirPorVisita(['a', 'b', 'c'], 4)).toBe('b');
    expect(elegirPorVisita([], 3)).toBeNull();
  });
  it('cinco visibles; "ver todas" muestra el resto', () => {
    const diez = Array.from({ length: 10 }, (_, i) => i);
    expect(alertasVisibles(diez, false)).toEqual({ visibles: [0, 1, 2, 3, 4], ocultas: 5 });
    expect(alertasVisibles(diez, true).visibles).toHaveLength(10);
    expect(alertasVisibles([1, 2], false).ocultas).toBe(0);
  });
});
