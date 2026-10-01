import { describe, expect, it } from 'vitest';
import { partesConPesos } from './texto';

describe('partesConPesos (el dinero de los textos del dominio sigue la moneda activa)', () => {
  const NB = String.fromCharCode(0xa0);
  it('separa un monto en pesos del resto de la frase', () => {
    expect(partesConPesos(`Nueva venta en la tienda web: $${NB}219.900`)).toEqual([{ texto: 'Nueva venta en la tienda web: ' }, { dinero: 219_900, corta: false }]);
    expect(partesConPesos('Se cobró $ 1.250.000 en total')).toEqual([{ texto: 'Se cobró ' }, { dinero: 1_250_000, corta: false }, { texto: ' en total' }]);
  });
  it('entiende "mil" y "millones" y los montos negativos', () => {
    expect(partesConPesos(`Tienes $${NB}58,1 millones quietos`)).toEqual([{ texto: 'Tienes ' }, { dinero: 58_100_000, corta: true }, { texto: ' quietos' }]);
    expect(partesConPesos(`$${NB}850 mil`)).toEqual([{ dinero: 850_000, corta: true }]);
    expect(partesConPesos(`Faltan −$${NB}40.000`)).toEqual([{ texto: 'Faltan ' }, { dinero: -40_000, corta: false }]);
  });
  it('devuelve null cuando no hay pesos', () => {
    expect(partesConPesos('Carolina reportó la llegada a puerto')).toBeNull();
  });
});
