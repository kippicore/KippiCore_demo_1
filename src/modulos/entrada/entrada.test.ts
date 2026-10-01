import { describe, expect, it } from 'vitest';
import { ENTRADA } from '@/config/textos/guia';
import { letrasPorRenglon } from './componentes/Wordmark';
import { TEXTOS_ENTRADA } from './textos';

describe('Wordmark de la entrada', () => {
  it('un nombre corto va en un solo renglón con todas sus letras', () => {
    expect(letrasPorRenglon('HALDEN')).toBe(6);
    expect(letrasPorRenglon('Kippi')).toBe(5);
  });

  it('un nombre largo se parte en dos renglones (mitad de las letras, o su palabra más larga)', () => {
    expect(letrasPorRenglon('Boutique Alameda')).toBeLessThan('Boutique Alameda'.length);
    expect(letrasPorRenglon('Distribuidora Textil Andina')).toBe(16);
    expect(letrasPorRenglon('Distribuidoraandinadecolombia')).toBe('Distribuidoraandinadecolombia'.length);
  });
});

describe('textos de la entrada', () => {
  it('titular + frase reproducen la frase de 2.2.1', () => {
    expect(`${TEXTOS_ENTRADA.titular}: ${TEXTOS_ENTRADA.frase.charAt(0).toLowerCase()}${TEXTOS_ENTRADA.frase.slice(1)}`).toBe(ENTRADA.frase);
  });

  it('la firma lleva la marca activa y la frase de celular es la corta', () => {
    expect(ENTRADA.firma.replace('{{marca}}', 'HALDEN')).toBe('KIPPICORE CRM · DEMO PARA HALDEN');
    expect(ENTRADA.fraseCelular).toBe('Tu negocio, con todo en un solo lugar.');
  });
});
