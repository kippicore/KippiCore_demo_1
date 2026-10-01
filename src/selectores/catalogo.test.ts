import { beforeAll, describe, expect, it } from 'vitest';
import type { EstadoDominio } from '@/dominio/tipos';
import { selCatalogo } from './catalogo';
import { estadoDe } from './pruebas/construir';

let e: EstadoDominio;
beforeAll(() => {
  e = estadoDe();
}, 120_000);

describe('selCatalogo · estado de stock por referencia', () => {
  it('"stock bajo" es la excepción (pocas referencias), no la regla: la alerta conserva su valor', () => {
    const filas = selCatalogo(e, {});
    const bajas = filas.filter((f) => f.estadoStock === 'bajo');
    expect(filas.length).toBeGreaterThan(80);
    expect(bajas.length).toBeGreaterThanOrEqual(5);
    expect(bajas.length).toBeLessThanOrEqual(20);
    expect(bajas.some((f) => f.producto.nombre.includes('Oxford'))).toBe(true);
  });
});
