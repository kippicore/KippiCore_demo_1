import { render } from '@testing-library/react';
import { CATALOGO } from '@/seed/catalogo';
import { COLORES } from '@/seed/colores';
import type { TipoPrenda } from '@/dominio/tipos';
import { Prenda } from './Prenda';
import { DIBUJOS, VISTA_DETALLE } from './dibujos';
import { coloresPrenda, luminancia } from './colores';

/** PLAN 8.8.1: el catálogo no tiene tipos sin ilustración; cada referencia se dibuja en todos sus colores. */
const TIPOS: TipoPrenda[] = ['camisa', 'polo', 'sweater', 'blazer', 'chaleco', 'abrigo', 'chaqueta', 'traje', 'pantalon', 'zapato', 'cinturon', 'corbata', 'billetera'];

describe('<Prenda>', () => {
  it('tiene dibujo y vista de detalle para los 13 tipos', () => {
    expect(Object.keys(DIBUJOS).sort()).toEqual([...TIPOS].sort());
    expect(Object.keys(VISTA_DETALLE).sort()).toEqual([...TIPOS].sort());
  });

  it('recorre todo el catálogo semilla: cada referencia y cada color se ilustran', () => {
    const colores = new Map(COLORES.map((c) => [c.id, c]));
    let dibujadas = 0;
    for (const ref of CATALOGO) {
      expect(TIPOS, `${ref.referencia} usa un tipo sin ilustración`).toContain(ref.tipoPrenda);
      for (const colorId of ref.colorIds) {
        const color = colores.get(colorId);
        expect(color, `${ref.referencia}: color ${colorId} inexistente`).toBeDefined();
        if (!color) continue;
        const { container, unmount } = render(<Prenda tipo={ref.tipoPrenda} color={color.hex} patron={color.patron} nombre={`${ref.nombre}, ${color.nombre}`} />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('data-prenda')).toBe(ref.tipoPrenda);
        expect(svg?.getAttribute('aria-label')).toBe(`${ref.nombre}, ${color.nombre}`);
        expect(svg?.getAttribute('viewBox')).toBe('0 0 300 400');
        expect(container.querySelectorAll('path').length).toBeGreaterThan(3);
        if (color.patron !== 'liso') expect(container.querySelector('pattern[id$="-p"]')).not.toBeNull();
        // El fondo es el gris de producto (token), nunca un color fijo.
        expect(container.querySelector('svg > rect')?.getAttribute('fill')).toBe('var(--c-product)');
        unmount();
        dibujadas++;
      }
    }
    expect(dibujadas).toBeGreaterThan(200);
  });

  it('vistas detalle y tejido; sin nombre es decorativa', () => {
    const { container } = render(<Prenda tipo="blazer" color="#1F2A44" vista="detalle" />);
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(VISTA_DETALLE.blazer);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    const t = render(<Prenda tipo="sweater" color="#A67C52" vista="tejido" />);
    expect(t.container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(2);
  });

  it('coloreado 8.8.3: trazo claro sobre colores oscuros y oscuro sobre claros', () => {
    const marino = coloresPrenda('#1F2A44');
    expect(marino.oscuro).toBe(true);
    expect(luminancia(marino.S)).toBeGreaterThan(luminancia('#1F2A44'));
    const cielo = coloresPrenda('#B9CBE0');
    expect(cielo.oscuro).toBe(false);
    expect(luminancia(cielo.S)).toBeLessThan(luminancia('#B9CBE0'));
  });
});
