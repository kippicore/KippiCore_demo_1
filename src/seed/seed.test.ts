import { describe, expect, it } from 'vitest';
import type { TipoPrenda } from '@/dominio/tipos';
import { SEED } from '@/seed';
import { CONFIG } from '@/config';
import { PLANTILLA_TURNOS } from '@/config/turnos';
import { PERMISOS_COMANDOS } from '@/config/permisos';

const TIPOS_ILUSTRADOS: TipoPrenda[] = [
  'camisa',
  'blazer',
  'pantalon',
  'polo',
  'abrigo',
  'chaqueta',
  'sweater',
  'traje',
  'chaleco',
  'zapato',
  'cinturon',
  'corbata',
  'billetera',
];

/** Marcas reales y entidades conocidas que no deben aparecer en los datos (R15). */
const NOMBRES_REALES = [
  'zara',
  'falabella',
  'arturo calle',
  'hugo boss',
  'nike',
  'adidas',
  'bancolombia',
  'davivienda',
  'bbva',
  'banco de bogotá',
  'sura',
  'sanitas',
  'compensar',
  'colsubsidio',
  'cafam',
  'porvenir',
  'protección',
  'colpensiones',
  'colfondos',
  'positiva',
  'nueva eps',
  'famisanar',
  'salud total',
  'maersk',
  'msc',
  'cosco',
  'evergreen',
  'hapag',
  'addi',
  'sistecrédito',
  'alibaba',
  'andino',
  'atlantis',
  'unicentro',
  'santafé',
];

const INGLES_PROHIBIDO = /\b(slim|fit|stretch|sweater|chino stretch|menswear|shirt|jacket|shoes)\b/i;

describe('semilla', () => {
  it('tiene ≈ 85 referencias únicas con nombre en español y precio terminado en 900', () => {
    expect(SEED.catalogo).toHaveLength(85);
    const refs = new Set(SEED.catalogo.map((r) => r.referencia));
    expect(refs.size).toBe(85);
    for (const r of SEED.catalogo) {
      expect(r.precioVenta % 1000, r.referencia).toBe(900);
      expect(r.referencia).toMatch(/^HL-(CAM|BLZ|PAN|POL|ABR|PUN|TRJ|CAL|ACC)-\d{4}$/);
      expect(r.nombre).not.toMatch(INGLES_PROHIBIDO);
      expect(TIPOS_ILUSTRADOS).toContain(r.tipoPrenda);
      expect(SEED.proveedores.some((p) => p.id === r.proveedorId)).toBe(true);
      for (const c of r.colorIds)
        expect(
          SEED.colores.some((x) => x.id === c),
          c,
        ).toBe(true);
      expect(r.fob.centavos).toBeGreaterThan(0);
    }
  });

  it('da entre 500 y 900 variantes (PRD 9)', () => {
    const total = SEED.catalogo.reduce(
      (s, r) => s + SEED.curvasTallas[r.curvaTallas].length * r.colorIds.length,
      0,
    );
    expect(total).toBeGreaterThanOrEqual(500);
    expect(total).toBeLessThanOrEqual(900);
  });

  it('incluye las referencias del guion con sus precios', () => {
    const oxford = SEED.catalogo.find((r) => r.referencia === 'HL-CAM-0142');
    const chino = SEED.catalogo.find((r) => r.nombre === 'Pantalón chino elástico');
    expect(oxford?.nombre).toBe('Camisa Oxford entallada');
    expect(oxford?.precioVenta).toBe(219_900);
    expect(oxford?.fob).toEqual({ moneda: 'USD', centavos: 1140 });
    expect(chino?.precioVenta).toBe(199_900);
    expect(SEED.catalogo.filter((r) => r.narrativa === 'sin_movimiento')).toHaveLength(5);
    expect(SEED.catalogo.filter((r) => r.narrativa === 'top5')).toHaveLength(5);
  });

  it('las demandas por talla suman 1', () => {
    for (const curva of Object.values(SEED.demandaTallas)) {
      const suma = Object.values(curva).reduce((a, b) => a + b, 0);
      expect(suma).toBeCloseTo(1, 6);
    }
  });

  it('tiene el elenco de 14 empleados con slugs únicos y el dueño aparte', () => {
    expect(SEED.empleados).toHaveLength(14);
    expect(new Set(SEED.empleados.map((e) => e.datos.slug)).size).toBe(14);
    const prestacion = SEED.empleados
      .filter((e) => e.contrato.tipo === 'prestacion_servicios')
      .map((e) => e.datos.slug);
    expect(prestacion).toEqual(
      expect.arrayContaining(['daniela-moreno', 'juliana-vargas', 'hernando-beltran', 'alejandro-pinzon']),
    );
    for (const e of SEED.empleados) {
      if (e.contrato.tipo === 'laboral')
        expect(e.contrato.salarioBase).toBeGreaterThanOrEqual(CONFIG.parametros.nomina.smmlv);
    }
  });

  it('la plantilla de turnos no pasa de 42 horas netas por semana', () => {
    const horas = new Map<string, number>();
    for (const t of PLANTILLA_TURNOS) {
      const [hi, mi] = t.inicio.split(':').map(Number) as [number, number];
      const [hf, mf] = t.fin.split(':').map(Number) as [number, number];
      const netas = (hf * 60 + mf - hi * 60 - mi - t.descansoMin) / 60;
      horas.set(t.empleadoId, (horas.get(t.empleadoId) ?? 0) + netas);
      expect(SEED.empleados.some((e) => e.id === t.empleadoId)).toBe(true);
    }
    for (const [, h] of horas) expect(h).toBeLessThanOrEqual(42);
    // Riesgo de contrato realidad (P22): los contratistas con turno tienen al menos 3 turnos por semana.
    expect(PLANTILLA_TURNOS.filter((t) => t.empleadoId === 'em_jvargas').length).toBeGreaterThanOrEqual(3);
  });

  it('no usa nombres de marcas o entidades reales conocidas', () => {
    const texto = JSON.stringify({ seed: SEED, empresa: CONFIG.empresa }).toLowerCase();
    for (const n of NOMBRES_REALES) expect(texto.includes(n), n).toBe(false);
  });

  it('la configuración tiene la tasa de ejemplo única y un permiso por comando', () => {
    expect(CONFIG.tasaEjemplo.valores).toEqual({ USD: 3950, CNY: 548 });
    expect(Object.keys(PERMISOS_COMANDOS).length).toBeGreaterThan(100);
    expect(CONFIG.clientes.proporcionVentasConCliente).toBe(0.15);
    const suma = SEED.tiposLatentesClientes.reduce((s, t) => s + t.proporcion, 0);
    expect(suma).toBeCloseTo(1, 6);
  });
});
