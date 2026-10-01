import { act, fireEvent, render } from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import { Cifra } from '../texto/Cifra';
import { InputNumero } from './Input';
import { BotonAccionesFila, Table } from './Table';

/** Defectos de componentes compartidos pedidos por las oleadas A y B (docs/informes/pendientes_compartidos.md). */
describe('componentes compartidos (oleadas A y B)', () => {
  it('BotonAccionesFila reenvía ref y todas las propiedades (sirve como disparador de <Menu>)', () => {
    const ref = createRef<HTMLButtonElement>();
    const abajo = vi.fn();
    const { getByRole } = render(<BotonAccionesFila ref={ref} aria-label="Acciones de V-1" aria-expanded="false" data-state="closed" onPointerDown={abajo} />);
    const b = getByRole('button', { name: 'Acciones de V-1' });
    expect(ref.current).toBe(b);
    expect(b.getAttribute('data-state')).toBe('closed');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    fireEvent.pointerDown(b);
    expect(abajo).toHaveBeenCalledTimes(1);
    expect(b.getAttribute('type')).toBe('button');
  });

  it('InputNumero selecciona todo al enfocar: lo que se teclea reemplaza el valor', () => {
    function Prueba() {
      const [v, setV] = useState<number | null>(80000);
      return (
        <>
          <InputNumero etiqueta="Valor" valor={v} alCambiar={setV} />
          <output data-testid="v">{String(v)}</output>
        </>
      );
    }
    const { getByLabelText, getByTestId } = render(<Prueba />);
    const campo = getByLabelText('Valor') as HTMLInputElement;
    expect(campo.value).toBe('80.000');
    act(() => campo.focus());
    expect(campo.value).toBe('80000');
    expect(campo.selectionStart).toBe(0);
    expect(campo.selectionEnd).toBe(campo.value.length);
    fireEvent.change(campo, { target: { value: '95000' } });
    expect(getByTestId('v').textContent).toBe('95000');
  });

  it('Table desplaza a la fila resaltada solo cuando cambia la fila, no en cada render', () => {
    const desplazar = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = desplazar;
    try {
      const filas = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      const columnas = [{ id: 'id', encabezado: 'Id', celda: (f: { id: string }) => f.id }];
      const { rerender } = render(<Table columnas={columnas} filas={filas} clave={(f) => f.id} resaltada={(f) => f.id === 'b'} />);
      expect(desplazar).toHaveBeenCalledTimes(1);
      rerender(<Table columnas={columnas} filas={filas} clave={(f) => f.id} resaltada={(f) => f.id === 'b'} />);
      rerender(<Table columnas={columnas} filas={[...filas]} clave={(f) => f.id} resaltada={(f) => f.id === 'b'} />);
      expect(desplazar).toHaveBeenCalledTimes(1);
      rerender(<Table columnas={columnas} filas={filas} clave={(f) => f.id} resaltada={(f) => f.id === 'c'} />);
      expect(desplazar).toHaveBeenCalledTimes(2);
    } finally {
      HTMLElement.prototype.scrollIntoView = original;
    }
  });

  it('Cifra con contarDesdeCero cuenta desde 0 también con el doble efecto de StrictMode', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      const { getByTestId } = render(
        <StrictMode>
          <Cifra valor={1000} formatear={(n) => String(Math.round(n))} contarDesdeCero data-testid="c" />
        </StrictMode>,
      );
      expect(getByTestId('c').firstElementChild?.textContent).toBe('0');
      act(() => {
        vi.advanceTimersByTime(300);
      });
      const intermedio = Number(getByTestId('c').firstElementChild?.textContent);
      expect(intermedio).toBeGreaterThan(0);
      expect(intermedio).toBeLessThan(1000);
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      expect(getByTestId('c').firstElementChild?.textContent).toBe('1000');
    } finally {
      vi.useRealTimers();
    }
  });
});
