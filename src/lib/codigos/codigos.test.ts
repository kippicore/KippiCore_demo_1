import { describe, expect, it } from 'vitest';
import { generarEan13 } from '@/dominio/reglas/ean13';
import { barrasEan13, ean13ASvg } from './barras';
import { matrizQr, qrASvg } from './qr';

describe('códigos (5.13)', () => {
  it('EAN-13: 95 módulos con guardas y SVG nítido', () => {
    const ean = generarEan13('20', '481', 1);
    const barras = barrasEan13(ean);
    const negros = barras.reduce((a, b) => a + b.ancho, 0);
    expect(negros).toBeGreaterThan(20);
    expect(barras[0]).toMatchObject({ x: 0, ancho: 1, guarda: true });
    expect(ean13ASvg(ean)).toContain('<svg');
    expect(() => barrasEan13('1234567890123')).toThrow();
  });

  it('QR: matriz cuadrada y SVG con un solo path', () => {
    const m = matrizQr('NumFac: HAL-FE-1043 · Documento de demostración');
    expect(m.modulos.length).toBe(m.tamano * m.tamano);
    const svg = qrASvg('hola');
    expect(svg.match(/<path/g)?.length).toBe(1);
  });
});
