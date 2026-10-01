import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { almacenDatos } from '@/estado/datos';
import { almacenSesion } from '@/estado/sesion';
import { selVentas } from '@/selectores';
import { estadoDe, HOY } from '@/selectores/pruebas/construir';
import { BarraTotales } from './BarraTotales';

afterEach(() => {
  cleanup();
  act(() => almacenSesion.getState().cambiarRol('dueno', null));
});

describe('barra de totales del filtro', () => {
  it('pinta exactamente las cifras de selVentas, sin sumar filas', () => {
    const e = estadoDe();
    almacenDatos.setState({ estado: e, fase: 'listo' });
    const { totales } = selVentas(e, { desde: '2026-09-01', hasta: HOY, localId: 'todos' });
    render(<BarraTotales totales={totales} />);
    const valor = (id: string) => Number(screen.getByTestId(`valor-${id}`).getAttribute('data-valor'));
    expect(valor('vendido')).toBe(totales.ventas);
    expect(valor('devoluciones')).toBe(totales.devoluciones);
    expect(valor('netas')).toBe(totales.netas);
    expect(valor('ticket')).toBe(totales.ticket);
    expect(valor('descuentos')).toBe(totales.descuentos);
    expect(valor('unidades')).toBe(totales.unidades);
    expect(screen.getByTestId('ventas-totales')).toBeTruthy();
  });

  it('el dueño ve el margen bruto y el vendedor, nunca', () => {
    const e = estadoDe();
    almacenDatos.setState({ estado: e, fase: 'listo' });
    const { totales } = selVentas(e, { desde: HOY, hasta: HOY, localId: 'todos' });
    render(<BarraTotales totales={totales} />);
    expect(screen.getByTestId('total-netas').textContent).toContain('Margen bruto');
    cleanup();
    act(() => almacenSesion.getState().cambiarRol('vendedor', 'usq'));
    render(<BarraTotales totales={totales} />);
    expect(screen.getByTestId('total-netas').textContent).not.toContain('Margen');
  });
});
