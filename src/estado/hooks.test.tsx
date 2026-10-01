import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { generarEstado } from '@/generador';
import { selVentas, selKpisInicio } from '@/selectores';
import { almacenDatos } from './datos';
import { useSel, useDinero, useFiltroLocal, ContextoRolForzado, useRolActivo } from './hooks';
import { almacenSesion } from './sesion';

/** Contrato de useSel (5.7): instantáneas estables entre renders y lecturas; hooks de contexto. */
describe('useSel y hooks de contexto', () => {
  it('dos renders con parámetros iguales (objetos nuevos) devuelven la misma referencia', () => {
    almacenDatos.setState({ estado: generarEstado({ ancla: '2026-09-30', ahora: '2026-09-30T15:30:00' }), fase: 'listo' });
    const vistos: unknown[] = [];
    function Prueba({ n }: { n: number }) {
      const r = useSel(selVentas, { desde: '2026-09-01', hasta: '2026-09-30' });
      const k = useSel(selKpisInicio, { localId: 'todos', ahora: '2026-09-30T15:30:00' });
      vistos.push(r, k);
      return <span>{n}</span>;
    }
    const { rerender } = render(<Prueba n={1} />);
    rerender(<Prueba n={2} />);
    expect(vistos[0]).toBe(vistos[2]);
    expect(vistos[1]).toBe(vistos[3]);
  });

  it('el vendedor ve siempre su local; /app fuerza el rol dueño; useDinero convierte con la tasa vigente', () => {
    const vistos: string[] = [];
    function Local() {
      vistos.push(`${useRolActivo()}:${useFiltroLocal()}`);
      return null;
    }
    function Pesos() {
      const d = useDinero();
      vistos.push(d(3_950_000));
      return null;
    }
    act(() => almacenSesion.getState().cambiarRol('vendedor', 'usq'));
    render(
      <>
        <Local />
        <ContextoRolForzado.Provider value="dueno">
          <Local />
        </ContextoRolForzado.Provider>
      </>,
    );
    expect(vistos).toContain('vendedor:usq');
    expect(vistos.some((v) => v.startsWith('dueno:'))).toBe(true);
    act(() => almacenSesion.getState().cambiarMoneda('USD'));
    render(<Pesos />);
    expect(vistos.at(-1)).toMatch(/^US\$/);
    act(() => {
      almacenSesion.getState().cambiarMoneda('COP');
      almacenSesion.getState().cambiarRol('dueno');
    });
  });
});
