import { describe, expect, it } from 'vitest';
import type { EntradaRegistro } from '@/dominio/tipos';
import { DEMO } from '@/config/demo';
import { codificarQr, decodificarQr, urlAppConAcciones } from './qr';

/** QR de la app (5.6.8): últimas 1–3 acciones de negocio en el hash, ≤ 300 caracteres; si no, la última venta. */
const venta = (id: string, ts: string): EntradaRegistro => ({
  id: `en_mg2x3k9l${id}ab3f`,
  ts,
  marcaAgua: ts,
  usuarioId: 'u_dueno',
  rol: 'dueno',
  origen: 'usuario',
  seq: 1,
  comando: {
    tipo: 'venta.registrar',
    datos: {
      ventaId: `vt_mg2x3k9l${id}c4d1`,
      ts: null,
      localId: 'usq',
      vendedorId: 'em_scardenas',
      canal: 'local',
      tipo: 'contado',
      clienteId: null,
      clienteNuevo: null,
      lineas: [{ varianteId: 'va_cam_0142_azc_m', cantidad: 1, precioLista: null, descuento: null }],
      descuentoGlobal: null,
      aprobacionDescuentoId: null,
      pagos: [{ medio: 'efectivo', valor: 219900, recibido: 220000, referencia: null, sesionCajaId: 'sc_g_20260930_usq', bonoId: null }],
      fechaLimiteSeparado: null,
      ventaOrigenCambioId: null,
      facturaInmediata: null,
      nota: null,
    },
  },
});

describe('QR con las últimas acciones', () => {
  it('codifica y decodifica sin perder datos y una venta cabe en ~300 caracteres', async () => {
    const reg = [venta('01', '2026-09-30T15:31:00'), venta('02', '2026-09-30T15:32:00'), venta('03', '2026-09-30T15:33:00')];
    const datos = await codificarQr('2026-09-30', reg);
    expect(datos).not.toBeNull();
    expect((datos ?? '').length).toBeLessThanOrEqual(DEMO.largoMaximoQr);
    const c = await decodificarQr(datos ?? '');
    expect(c?.ancla).toBe('2026-09-30');
    // La última entrada viaja completa e idéntica (nulos restaurados).
    expect(c?.entradas.at(-1)).toEqual(reg[2]);
    expect(urlAppConAcciones('https://demo.example', datos, '2026-09-30T15:30')).toMatch(/^https:\/\/demo\.example\/app\?hoy=2026-09-30T15%3A30#r=z/);
  });

  it('sin acciones de negocio no hay datos; con datos corruptos, null', async () => {
    expect(await codificarQr('2026-09-30', [])).toBeNull();
    expect(await decodificarQr('zno-es-base64')).toBeNull();
  });
});
