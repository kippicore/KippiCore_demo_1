import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { EstadoDominio } from '@/dominio/tipos';
import { almacenDatos } from '@/estado/datos';
import { bus, emitirUI } from '@/estado/eventos';
import { almacenGuia } from '@/estado/guia';
import { almacenSesion } from '@/estado/sesion';
import { estadoDe } from '@/selectores/pruebas/construir';
import { ProveedorTooltips } from '@/ui/primitivos/Tooltip';
import { almacenPanelLocal } from '../panelLocal';
import { GuiaFlotante } from './GuiaFlotante';

let e: EstadoDominio;

beforeAll(() => {
  e = estadoDe();
}, 120_000);

beforeEach(() => {
  vi.useFakeTimers();
  bus.historialUI.length = 0;
  almacenDatos.setState({ estado: e, fase: 'listo', registro: [] });
  almacenGuia.setState({ bienvenidaVista: false, completados: [], pistasVistas: [], pistasOcultas: false, panelMinimizado: false, visitas: 0 });
  almacenPanelLocal.setState({ abiertoEnRol: false });
  almacenSesion.setState({ rol: 'dueno' });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const montar = (ruta: string) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorTooltips>
        <GuiaFlotante />
      </ProveedorTooltips>
    </MemoryRouter>,
  );
const pasar = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('panel "Prueba esto"', () => {
  it('no aparece de inmediato: sale 1,2 s después de llegar a Inicio, desplegado y con los 8 ítems', () => {
    montar('/panel/inicio');
    expect(screen.queryByTestId('guia-panel')).toBeNull();
    pasar(1100);
    expect(screen.queryByTestId('guia-panel')).toBeNull();
    pasar(150);
    expect(screen.getByTestId('guia-panel')).toBeTruthy();
    expect(screen.getByTestId('guia-contador').textContent).toBe('0 de 8');
    expect(document.querySelectorAll('[data-testid^="guia-item-"][data-hecho]')).toHaveLength(8);
  });

  it('en otra pantalla la primera vez sale como píldora, no desplegado', () => {
    montar('/panel/ventas');
    pasar(1300);
    expect(screen.queryByTestId('guia-panel')).toBeNull();
    expect(screen.getByTestId('guia-pildora').textContent).toBe('Prueba esto · 0/8');
  });

  it('se oculta del todo en el POS (taparía "Confirmar venta") y en la caja', () => {
    almacenGuia.setState({ bienvenidaVista: true, panelMinimizado: false });
    const { unmount } = montar('/panel/pos');
    expect(screen.queryByTestId('guia-panel')).toBeNull();
    expect(screen.queryByTestId('guia-pildora')).toBeNull();
    unmount();
    montar('/panel/pos/caja');
    expect(screen.queryByTestId('guia-panel')).toBeNull();
    expect(screen.queryByTestId('guia-pildora')).toBeNull();
  });

  it('en la vista del vendedor arranca como píldora y se abre a mano', () => {
    almacenGuia.setState({ bienvenidaVista: true, panelMinimizado: false });
    act(() => almacenSesion.setState({ rol: 'vendedor' }));
    montar('/panel/mi-dia');
    expect(screen.queryByTestId('guia-panel')).toBeNull();
    act(() => screen.getByTestId('guia-pildora').click());
    expect(screen.getByTestId('guia-panel')).toBeTruthy();
  });

  it('marca los ítems con los EventoUI (el rol solo si pasa a vendedor o bodega) y avisa al completar', () => {
    almacenGuia.setState({ bienvenidaVista: true });
    montar('/panel/inicio');
    act(() => emitirUI('flujo_caja_visto'));
    expect(screen.getByTestId('guia-item-flujo').getAttribute('data-hecho')).toBe('si');
    expect(screen.getByTestId('guia-contador').textContent).toBe('1 de 8');
    act(() => emitirUI('rol_cambiado', { a: 'dueno' }));
    expect(screen.getByTestId('guia-item-rol').getAttribute('data-hecho')).toBe('no');
    act(() => emitirUI('rol_cambiado', { a: 'vendedor' }));
    expect(almacenGuia.getState().completados).toEqual(expect.arrayContaining(['flujo', 'rol']));
  });

  it('con 3 ítems aparece "Hablar con KippiCore"; con 8, la tarjeta de cierre', () => {
    almacenGuia.setState({ bienvenidaVista: true, completados: ['venta', 'traslado'] });
    montar('/panel/inicio');
    expect(screen.queryByTestId('guia-linea-kippicore')).toBeNull();
    act(() => emitirUI('flujo_caja_visto'));
    expect(screen.getByTestId('guia-linea-kippicore').textContent).toContain('Hablar con KippiCore');
    expect(screen.queryByTestId('guia-cierre')).toBeNull();
    act(() => {
      emitirUI('costo_empleador_visto');
      emitirUI('pedido_sugerido_visto');
      emitirUI('qr_abierto');
      emitirUI('rol_cambiado', { a: 'bodega' });
    });
    // Faltaba la importación (un evento de dominio): aún no es el 8 de 8.
    expect(screen.getByTestId('guia-contador').textContent).toBe('7 de 8');
    expect(screen.queryByTestId('guia-cierre')).toBeNull();
    act(() => almacenGuia.getState().completar('importacion'));
    expect(screen.getByTestId('guia-cierre').textContent).toContain('ESO ES KIPPICORE CRM.');
    expect(screen.getByTestId('guia-cierre-hablar').getAttribute('href')).toMatch(/^https:\/\/wa\.me\//);
  });

  it('un EventoUI emitido antes de montarse la guía (p. ej. abrir la app desde la entrada) también cuenta', () => {
    act(() => emitirUI('app_abierta'));
    almacenGuia.setState({ bienvenidaVista: true });
    montar('/panel/inicio');
    expect(screen.getByTestId('guia-item-celular').getAttribute('data-hecho')).toBe('si');
  });
});
