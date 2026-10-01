import { describe, expect, it } from 'vitest';
import type { ResolucionFacturacion } from '@/dominio/tipos';
import {
  adquirenteDeCliente,
  coincideDocumento,
  CONSUMIDOR_FINAL,
  filtrarDocumentos,
  minutosEntre,
  partirCodigo,
  pasosRecorrido,
  resumirDocumentos,
  saldoAcreditable,
  siguienteEstado,
  textoQrNota,
  usoDeResolucion,
  validarAdquirente,
  type FiltroDocumentos,
  type FilaDocumento,
} from './calculos';

const fila = (extra: Partial<FilaDocumento>): FilaDocumento => ({
  id: 'f1',
  clase: 'factura',
  numero: 'HAL-FE-1001',
  ts: '2026-09-30T10:00:00',
  ventaId: 'v1',
  ventaNumero: 'V-000001',
  localId: 'usq',
  adquirente: 'Consumidor final',
  documento: null,
  base: 100_000,
  iva: 19_000,
  total: 119_000,
  estado: 'aceptada',
  afecta: null,
  acreditado: 0,
  ...extra,
});

const FILTRO: FiltroDocumentos = { clase: 'todos', estado: null, desde: null, hasta: null, texto: '', localId: 'todos' };

describe('filtros de documentos', () => {
  const filas = [
    fila({ id: 'a', numero: 'HAL-FE-1001', adquirente: 'María Gómez', documento: '52123456' }),
    fila({ id: 'b', clase: 'pos', numero: 'HAL-POS-2001', localId: 'zr', ts: '2026-09-15T09:00:00' }),
    fila({
      id: 'c',
      clase: 'nota',
      numero: 'HAL-NC-0001',
      total: 59_500,
      iva: 9_500,
      base: 50_000,
      afecta: { id: 'a', numero: 'HAL-FE-1001' },
      estado: 'generada',
    }),
  ];

  it('filtra por tipo, estado, local y fechas', () => {
    expect(filtrarDocumentos(filas, { ...FILTRO, clase: 'factura_electronica' }).map((f) => f.id)).toEqual(['a']);
    expect(filtrarDocumentos(filas, { ...FILTRO, clase: 'documento_equivalente_pos' }).map((f) => f.id)).toEqual(['b']);
    expect(filtrarDocumentos(filas, { ...FILTRO, clase: 'notas' }).map((f) => f.id)).toEqual(['c']);
    expect(filtrarDocumentos(filas, { ...FILTRO, estado: 'generada' }).map((f) => f.id)).toEqual(['c']);
    expect(filtrarDocumentos(filas, { ...FILTRO, localId: 'zr' }).map((f) => f.id)).toEqual(['b']);
    expect(filtrarDocumentos(filas, { ...FILTRO, desde: '2026-09-20', hasta: '2026-09-30' }).map((f) => f.id)).toEqual(['a', 'c']);
  });

  it('busca sin tildes ni mayúsculas, por número, adquirente, documento, venta y documento afectado', () => {
    expect(coincideDocumento(filas[0]!, { ...FILTRO, texto: 'maria gomez' })).toBe(true);
    expect(coincideDocumento(filas[0]!, { ...FILTRO, texto: '52123456' })).toBe(true);
    expect(coincideDocumento(filas[0]!, { ...FILTRO, texto: 'v-000001' })).toBe(true);
    expect(coincideDocumento(filas[2]!, { ...FILTRO, texto: 'hal-fe-1001' })).toBe(true);
    expect(coincideDocumento(filas[1]!, { ...FILTRO, texto: 'maría' })).toBe(false);
  });
});

describe('resumen de documentos', () => {
  it('suma facturado, acreditado con notas, neto, IVA neto y pendientes', () => {
    const r = resumirDocumentos([
      fila({ id: 'a' }),
      fila({ id: 'b', clase: 'pos', total: 238_000, iva: 38_000, estado: 'enviada' }),
      fila({ id: 'c', clase: 'nota', total: 59_500, iva: 9_500, estado: 'generada' }),
    ]);
    expect(r.documentos).toBe(3);
    expect([r.facturas, r.pos, r.notas]).toEqual([1, 1, 1]);
    expect(r.facturado).toBe(357_000);
    expect(r.acreditado).toBe(59_500);
    expect(r.neto).toBe(297_500);
    expect(r.ivaFacturado).toBe(57_000);
    expect(r.ivaNeto).toBe(47_500);
    expect(r.pendientes).toBe(2);
  });

  it('una lista vacía da ceros', () => {
    expect(resumirDocumentos([]).neto).toBe(0);
  });
});

describe('recorrido de estados', () => {
  it('el orden es generada → enviada → aceptada', () => {
    expect(siguienteEstado('generada')).toBe('enviada');
    expect(siguienteEstado('enviada')).toBe('aceptada');
    expect(siguienteEstado('aceptada')).toBeNull();
  });

  it('marca hecho, en curso y pendiente', () => {
    const p = pasosRecorrido('generada', [{ estado: 'generada', ts: '2026-09-30T10:00:00' }]);
    expect(p.map((x) => x.situacion)).toEqual(['hecho', 'en_curso', 'pendiente']);
    expect(p[0]?.ts).toBe('2026-09-30T10:00:00');
    expect(pasosRecorrido('aceptada', []).map((x) => x.situacion)).toEqual(['hecho', 'hecho', 'hecho']);
  });

  it('cuenta minutos entre instantes', () => {
    expect(minutosEntre('2026-09-30T10:00:00', '2026-09-30T10:07:00')).toBe(7);
    expect(minutosEntre('2026-09-30T23:59:00', '2026-10-01T00:01:00')).toBe(2);
    expect(minutosEntre('2026-09-30T10:05:00', '2026-09-30T10:00:00')).toBe(0);
  });
});

describe('adquirente', () => {
  it('consumidor final no lleva documento', () => {
    expect(CONSUMIDOR_FINAL).toMatchObject({ tipo: 'consumidor_final', clienteId: null, documento: null });
  });

  it('toma los datos del cliente', () => {
    expect(
      adquirenteDeCliente({ id: 'cl1', nombres: 'María', apellidos: 'Gómez', documento: { tipo: 'CC', numero: '52123456' }, correo: 'm@x.co' }),
    ).toEqual({ tipo: 'identificado', clienteId: 'cl1', nombre: 'María Gómez', documento: '52123456', correo: 'm@x.co' });
  });

  it('valida el adquirente digitado a mano', () => {
    expect(validarAdquirente({ nombre: '', documento: '', correo: '' })).toEqual({
      nombre: expect.any(String),
      documento: expect.any(String),
    });
    expect(validarAdquirente({ nombre: 'Ana Ríos', documento: '1.020.304.050', correo: '' })).toEqual({});
    expect(validarAdquirente({ nombre: 'Ana Ríos', documento: '1020304050', correo: 'no-es-correo' }).correo).toBeTruthy();
    expect(validarAdquirente({ nombre: 'Ana Ríos', documento: '1020304050', correo: 'ana@correo.co' })).toEqual({});
  });
});

describe('códigos y resoluciones', () => {
  it('parte el código en renglones del mismo ancho', () => {
    const c = 'a'.repeat(96);
    expect(partirCodigo(c)).toHaveLength(3);
    expect(partirCodigo(c, 48)).toEqual(['a'.repeat(48), 'a'.repeat(48)]);
  });

  it('el QR de la nota no trae URL de la DIAN', () => {
    const t = textoQrNota({ numero: 'HAL-NC-0001', ts: '2026-09-30T10:00:00', valor: 59_500, cude: 'abc' }, 'HAL-FE-1001');
    expect(t).toContain('HAL-NC-0001');
    expect(t).toContain('Afecta: HAL-FE-1001');
    expect(t).not.toMatch(/https?:/);
  });

  const res: ResolucionFacturacion = {
    id: 'r',
    tipo: 'factura_electronica',
    numero: '18764000000000',
    prefijo: 'HAL-FE',
    desde: 1,
    hasta: 100,
    vigenteDesde: '2024-01-01',
    vigenteHasta: '2027-12-31',
  };

  it('calcula el uso de la resolución y el siguiente consecutivo', () => {
    const u = usoDeResolucion(res, ['HAL-FE-1', 'HAL-FE-2', 'HAL-FE-10'], '2026-09-30');
    expect(u.emitidos).toBe(3);
    expect(u.ultimo).toBe(10);
    expect(u.siguiente).toBe(11);
    expect(u.restantes).toBe(90);
    expect(u.usado).toBeCloseTo(0.03);
    expect(u.vigente).toBe(true);
    expect(u.diasParaVencer).toBeGreaterThan(400);
  });

  it('una resolución vencida o agotada se nota', () => {
    const vencida = usoDeResolucion({ ...res, vigenteHasta: '2026-01-01' }, [], '2026-09-30');
    expect(vencida.vigente).toBe(false);
    expect(vencida.diasParaVencer).toBeLessThan(0);
    const agotada = usoDeResolucion(res, ['HAL-FE-100'], '2026-09-30');
    expect(agotada.restantes).toBe(0);
  });

  it('el saldo acreditable nunca baja de cero', () => {
    expect(saldoAcreditable(119_000, [{ valor: 59_500 }])).toBe(59_500);
    expect(saldoAcreditable(119_000, [{ valor: 119_000 }])).toBe(0);
    expect(saldoAcreditable(100, [{ valor: 150 }])).toBe(0);
  });
});
