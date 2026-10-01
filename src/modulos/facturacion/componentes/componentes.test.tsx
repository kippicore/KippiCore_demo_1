import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { EstadoDominio } from '@/dominio/tipos';
import { almacenDatos } from '@/estado/datos';
import { almacenSesion } from '@/estado/sesion';
import { estadoDe } from '@/selectores/pruebas/construir';
import { selVistaFactura, selVistaNota } from '../selectores';
import { HojaFactura, HojaNota, HojaPos } from './HojaDocumento';
import { Recorrido } from './Recorrido';

let e: EstadoDominio;

beforeAll(() => {
  e = estadoDe();
}, 120_000);

afterEach(() => {
  cleanup();
  act(() => almacenSesion.getState().personalizarMarca({ nombreNegocio: null, nombrePersona: null }));
});

const conRuta = (nodo: React.ReactNode) => <MemoryRouter>{nodo}</MemoryRouter>;

describe('vista previa de la factura', () => {
  it('lleva la marca de agua, el emisor ficticio, la resolución, el IVA, el CUFE y el QR sin URL', () => {
    almacenDatos.setState({ estado: e, fase: 'listo' });
    const f = Object.values(e.facturas).find((x) => x.tipo === 'factura_electronica')!;
    const vista = selVistaFactura(e, { facturaId: f.id })!;
    render(conRuta(<HojaFactura vista={vista} />));
    expect(screen.getByTestId('facturacion-marca-agua').textContent).toBe('DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL');
    expect(screen.getByTestId('hoja-numero').textContent).toBe(f.numero);
    expect(screen.getByTestId('hoja-emisor').textContent).toContain(e.empresa.razonSocial);
    expect(screen.getByTestId('hoja-resolucion').textContent).toContain('(ficticia)');
    expect(screen.getByTestId('hoja-totales').textContent).toMatch(/IVA 19\s%/);
    expect(screen.getByTestId('hoja-codigo').textContent!.replace(/\s/g, '')).toBe(f.cufe);
    const qr = document.querySelector('[data-qr]')!;
    expect(qr.getAttribute('data-qr')).toBe(f.qrTexto);
    expect(f.qrTexto).not.toMatch(/https?:/);
  });

  it('con marca personalizada el emisor deja de ser HALDEN', () => {
    almacenDatos.setState({ estado: e, fase: 'listo' });
    act(() => almacenSesion.getState().personalizarMarca({ nombreNegocio: 'Casa Lúmina', nombrePersona: null }));
    const f = Object.values(e.facturas).find((x) => x.tipo === 'factura_electronica')!;
    render(conRuta(<HojaFactura vista={selVistaFactura(e, { facturaId: f.id })!} />));
    expect(screen.getByTestId('hoja-emisor').textContent).toContain('Casa Lúmina');
    expect(screen.getByTestId('hoja-emisor').textContent).not.toMatch(/halden/i);
    expect(document.querySelector('[data-marca="Casa Lúmina"]')).toBeTruthy();
  });

  it('el documento POS es una tirilla con CUDE y la misma marca de agua', () => {
    almacenDatos.setState({ estado: e, fase: 'listo' });
    const f = Object.values(e.facturas).find((x) => x.tipo === 'documento_equivalente_pos')!;
    render(conRuta(<HojaPos vista={selVistaFactura(e, { facturaId: f.id })!} />));
    expect(screen.getByTestId('factura-hoja').getAttribute('data-tipo')).toBe('documento_equivalente_pos');
    expect(screen.getByTestId('factura-hoja').textContent).toContain('CUDE (simulado)');
    expect(screen.getByTestId('facturacion-marca-agua')).toBeTruthy();
  });

  it('la nota crédito muestra el valor acreditado, su motivo y el documento que afecta', () => {
    almacenDatos.setState({ estado: e, fase: 'listo' });
    const n = Object.values(e.notasCredito)[0]!;
    render(conRuta(<HojaNota vista={selVistaNota(e, { notaId: n.id })!} estado="aceptada" />));
    expect(screen.getByTestId('hoja-motivo').textContent).toBe(n.motivo);
    expect(screen.getByTestId('hoja-total').textContent!.replace(/\D/g, '')).toBe(String(n.valor));
    expect(screen.getByTestId('nota-hoja').textContent).toContain(e.facturas[n.facturaId]!.numero);
    expect(screen.getByTestId('facturacion-marca-agua')).toBeTruthy();
  });
});

describe('recorrido ante la DIAN', () => {
  it('marca hechos y en curso según el estado', () => {
    almacenDatos.setState({ estado: e, fase: 'listo' });
    render(<Recorrido estado="enviada" historial={[{ estado: 'generada', ts: '2026-09-30T10:00:00' }, { estado: 'enviada', ts: '2026-09-30T10:00:02' }]} />);
    const situaciones = Array.from(document.querySelectorAll('[data-paso]')).map((x) => x.getAttribute('data-situacion'));
    expect(situaciones).toEqual(['hecho', 'hecho', 'en_curso']);
  });
});
