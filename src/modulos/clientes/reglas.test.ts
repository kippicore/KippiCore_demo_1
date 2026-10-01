import { describe, expect, it } from 'vitest';
import { PARAMETROS_SEGMENTACION as P } from '@/config/segmentacion';
import {
  armarMensaje,
  descripcionSegmento,
  diasParaCumple,
  edadQueCumple,
  estadoCumple,
  explicarSegmento,
  fechaCumple,
  haceDias,
  moverMes,
  saludoDeHora,
  tallasPreferidas,
  textoNovedad,
  type ContextoMensaje,
  type MetricasParaExplicar,
  type Parte,
} from './reglas';

const HOY = '2026-09-30';

/** La frase como texto plano (las cifras en pesos se marcan como [$ valor]). */
const texto = (partes: readonly Parte[]) => partes.map((p) => (typeof p === 'string' ? p : `[$ ${p.dinero}]`)).join('');

const base: MetricasParaExplicar = {
  segmento: 'ocasional',
  registro: '2025-08-01',
  compras: 2,
  primeraCompra: '2025-09-01',
  ultimaCompra: '2026-06-01',
  ultimaAntesDeHoy: '2026-06-01',
  valor12m: 600_000,
  compras12m: 2,
};

describe('explicarSegmento (por qué es lo que es)', () => {
  it('VIP: dice cuánto compró y desde cuánto es VIP', () => {
    const e = explicarSegmento({ ...base, segmento: 'vip', valor12m: 3_829_100, compras12m: 7 }, P, HOY);
    expect(texto(e.porQue)).toBe('Compró [$ 3829100] en los últimos 12 meses. Desde [$ 3000000] al año lo tratamos como VIP.');
    expect(e.progreso).toBeNull();
    expect(texto(e.corta)).toBe('[$ 3829100] en 12 meses');
  });

  it('frecuente: cuenta las compras y cuánto le falta para VIP, con la barra proporcional', () => {
    const e = explicarSegmento({ ...base, segmento: 'frecuente', valor12m: 2_100_000, compras12m: 4 }, P, HOY);
    expect(texto(e.porQue)).toContain('4 compras en los últimos 12 meses');
    expect(texto(e.porQue)).toContain('Desde 3 compras');
    expect(texto(e.progreso?.texto ?? [])).toBe('Le faltan [$ 900000] en compras para llegar a VIP.');
    expect(e.progreso?.valor).toBeCloseTo(0.7, 5);
  });

  it('frecuente que hoy cruza el umbral VIP: avisa que mañana será VIP', () => {
    const e = explicarSegmento({ ...base, segmento: 'frecuente', valor12m: 3_100_000, compras12m: 4 }, P, HOY);
    expect(texto(e.progreso?.texto ?? [])).toContain('mañana será VIP');
    expect(e.progreso?.valor).toBe(1);
  });

  it('ocasional: cuántas compras le faltan para ser frecuente', () => {
    const e = explicarSegmento({ ...base, segmento: 'ocasional', compras12m: 1 }, P, HOY);
    expect(texto(e.porQue)).toContain('1 vez en los últimos 12 meses');
    expect(texto(e.progreso?.texto ?? [])).toBe('Con 2 compras más en 12 meses pasa a frecuente.');
    expect(e.progreso?.valor).toBeCloseTo(1 / 3, 5);
  });

  it('ocasional que hoy completa las compras: mañana será frecuente', () => {
    const e = explicarSegmento({ ...base, segmento: 'ocasional', compras12m: 3 }, P, HOY);
    expect(texto(e.progreso?.texto ?? [])).toContain('mañana será frecuente');
  });

  it('ocasional sin compras: cuenta desde cuándo está registrado', () => {
    const e = explicarSegmento({ ...base, segmento: 'ocasional', compras: 0, compras12m: 0, primeraCompra: null, ultimaCompra: null, ultimaAntesDeHoy: null, valor12m: 0, registro: '2026-06-22' }, P, HOY);
    expect(texto(e.porQue)).toBe('Está registrado hace 100 días y todavía no ha comprado.');
    expect(texto(e.corta)).toBe('Sin compras todavía');
  });

  it('en riesgo: los días sin comprar y el umbral de 90', () => {
    const e = explicarSegmento({ ...base, segmento: 'en_riesgo', ultimaCompra: '2026-06-10', ultimaAntesDeHoy: '2026-06-10' }, P, HOY);
    expect(texto(e.porQue)).toBe('No compra hace 112 días. Pasados 90 días sin volver lo marcamos en riesgo.');
    expect(texto(e.corta)).toBe('112 días sin comprar');
    expect(e.sugerencia).toContain('Escríbele');
  });

  it('en riesgo que volvió hoy: lo dice y avisa que mañana sale del riesgo', () => {
    const e = explicarSegmento({ ...base, segmento: 'en_riesgo', ultimaCompra: HOY, ultimaAntesDeHoy: '2026-05-01' }, P, HOY);
    expect(texto(e.porQue)).toBe('Volvió hoy después de 152 días sin comprar. Mañana deja de estar en riesgo.');
  });

  it('nuevo: desde su primera compra (o su registro) y cuántos días le quedan como nuevo', () => {
    const conCompra = explicarSegmento({ ...base, segmento: 'nuevo', primeraCompra: '2026-09-07', ultimaCompra: '2026-09-07', compras: 1 }, P, HOY);
    expect(texto(conCompra.porQue)).toContain('Hizo su primera compra hace 23 días');
    expect(texto(conCompra.progreso?.texto ?? [])).toContain('Le quedan 37 días');
    const sinCompra = explicarSegmento({ ...base, segmento: 'nuevo', compras: 0, primeraCompra: null, ultimaCompra: null, registro: '2026-09-29' }, P, HOY);
    expect(texto(sinCompra.porQue)).toContain('Se registró ayer');
    // Primera compra HOY: el segmento cuenta desde el registro (la compra de hoy no cuenta aún).
    const hoyMismo = explicarSegmento({ ...base, segmento: 'nuevo', compras: 1, primeraCompra: HOY, ultimaCompra: HOY, registro: '2026-09-20' }, P, HOY);
    expect(texto(hoyMismo.porQue)).toContain('Se registró hace 10 días');
  });

  it('las descripciones de los chips usan los umbrales vigentes', () => {
    expect(texto(descripcionSegmento('vip', P))).toBe('Compra [$ 3000000] o más al año.');
    expect(texto(descripcionSegmento('frecuente', { ...P, frecuenteCompras12m: 5 }))).toBe('5 o más compras al año.');
    expect(texto(descripcionSegmento('en_riesgo', P))).toBe('Lleva más de 90 días sin volver.');
    expect(texto(descripcionSegmento('nuevo', P))).toBe('Llegó en los últimos 60 días.');
  });

  it('haceDias', () => {
    expect(haceDias(0)).toBe('hoy');
    expect(haceDias(1)).toBe('ayer');
    expect(haceDias(1248)).toBe('hace 1.248 días');
  });
});

describe('tallasPreferidas', () => {
  it('la declarada manda; si no hay, la derivada; marca cuando difieren', () => {
    const t = tallasPreferidas({ camisas: 'L', pantalones: '34', blazers: '52' }, { camisa: 'M', pantalon: '34', calzado: '42' });
    const por = Object.fromEntries(t.map((x) => [x.clave, x]));
    expect(por.camisa).toMatchObject({ derivada: 'L', declarada: 'M', efectiva: 'M', difiere: true });
    expect(por.pantalon).toMatchObject({ efectiva: '34', difiere: false });
    expect(por.blazer).toMatchObject({ derivada: '52', declarada: null, efectiva: '52', difiere: false });
    expect(por.calzado).toMatchObject({ derivada: null, declarada: '42', efectiva: '42', difiere: false });
  });

  it('sin datos no inventa nada', () => {
    expect(tallasPreferidas({}, {}).every((x) => x.efectiva === null && !x.difiere)).toBe(true);
  });

  it('compara sin importar mayúsculas', () => {
    expect(tallasPreferidas({ camisas: 'xl' }, { camisa: 'XL' })[0]?.difiere).toBe(false);
  });
});

describe('armarMensaje (el trato correcto)', () => {
  const ctx: ContextoMensaje = {
    marca: 'HALDEN',
    local: 'Parque 93',
    ahora: '2026-09-30T09:15:00',
    producto: 'Camisa Oxford entallada',
    novedad: 'novedades en camisas y pantalones',
    cobro: { numero: 'V-017001', saldo: 389_800, abonado: 200_000, fechaLimite: '2026-10-15' },
  };
  const ricardo = { nombres: 'Ricardo Andrés' };

  it('cumpleaños: tú y usted cambian el texto, nunca queda un hueco sin llenar', () => {
    const tu = armarMensaje('cumpleanos', ricardo, 'tu', ctx);
    const usted = armarMensaje('cumpleanos', ricardo, 'usted', ctx);
    expect(tu).toContain('Ricardo, ¡feliz cumpleaños!');
    expect(tu).toContain('te tenemos un detalle');
    expect(usted).toContain('Ricardo, feliz cumpleaños.');
    expect(usted).toContain('le tenemos un detalle');
    for (const t of [tu, usted]) {
      expect(t).not.toMatch(/\{\{/);
      expect(t).toContain('Parque 93');
      expect(t).toContain('HALDEN');
    }
  });

  it('nueva colección: usa lo que más compra y su talla', () => {
    const t = armarMensaje('nueva_coleccion', ricardo, 'usted', ctx);
    expect(t).toBe('Ricardo, buenos días. Llegó la nueva colección a HALDEN: novedades en camisas y pantalones. ¿Le separamos algo en su talla?');
  });

  it('cobro: saldo en pesos (siempre COP) y fecha límite', () => {
    const t = armarMensaje('cobro', ricardo, 'usted', ctx);
    expect(t).toContain('separado V-017001');
    expect(t).toContain('$ 389.800');
    expect(t).toContain('vence el 15 de octubre');
    expect(t).not.toMatch(/\{\{/);
  });

  it('cobro de un crédito sin fecha límite no dice "vence el"', () => {
    const t = armarMensaje('cobro', ricardo, 'tu', { ...ctx, cobro: { numero: 'V-017002', saldo: 100_000, abonado: 0, fechaLimite: null } });
    expect(t).not.toContain('vence');
    expect(t).not.toMatch(/\{\{/);
  });

  it('seguimiento: nombra lo último que compró, o dice "su última compra"', () => {
    expect(armarMensaje('seguimiento', ricardo, 'usted', ctx)).toContain('con su última compra (Camisa Oxford entallada)');
    expect(armarMensaje('seguimiento', ricardo, 'tu', { ...ctx, producto: null })).toContain('con tu última compra?');
  });

  it('el saludo cambia con la hora de Bogotá', () => {
    expect(saludoDeHora('2026-09-30T08:00:00')).toBe('buenos días');
    expect(saludoDeHora('2026-09-30T12:00:00')).toBe('buenas tardes');
    expect(saludoDeHora('2026-09-30T17:59:00')).toBe('buenas tardes');
    expect(saludoDeHora('2026-09-30T18:00:00')).toBe('buenas noches');
  });

  it('textoNovedad', () => {
    expect(textoNovedad(['camisas', 'pantalones', 'blazers'])).toBe('novedades en camisas y pantalones');
    expect(textoNovedad(['abrigos_chaquetas'])).toBe('novedades en abrigos y chaquetas');
    expect(textoNovedad([])).toBe('prendas nuevas de la temporada');
  });
});

describe('cumpleaños', () => {
  it('el 29 de febrero se celebra el 28 en años no bisiestos', () => {
    expect(fechaCumple('02-29', 2027)).toBe('2027-02-28');
    expect(fechaCumple('02-29', 2028)).toBe('2028-02-29');
    expect(fechaCumple('09-30', 2026)).toBe('2026-09-30');
  });

  it('días para el próximo cumpleaños (hoy = 0, ya pasó = el del año siguiente)', () => {
    expect(diasParaCumple('09-30', HOY)).toBe(0);
    expect(diasParaCumple('10-05', HOY)).toBe(5);
    expect(diasParaCumple('09-29', HOY)).toBe(364);
    expect(diasParaCumple('01-01', HOY)).toBe(93);
  });

  it('estado frente a hoy y edad que cumple', () => {
    expect(estadoCumple('2026-09-30', HOY)).toBe('hoy');
    expect(estadoCumple('2026-09-12', HOY)).toBe('pasado');
    expect(estadoCumple('2026-10-02', HOY)).toBe('proximo');
    expect(edadQueCumple(1971, 2026)).toBe(55);
    expect(edadQueCumple(null, 2026)).toBeNull();
  });

  it('moverMes cruza el año', () => {
    expect(moverMes('2026-12', 1)).toBe('2027-01');
    expect(moverMes('2026-01', -1)).toBe('2025-12');
    expect(moverMes('2026-09', 0)).toBe('2026-09');
    expect(moverMes('2026-09', -13)).toBe('2025-08');
  });
});
