import { beforeAll, describe, expect, it } from 'vitest';
import type { DatosRegistrarVenta, EstadoDominio } from '@/dominio/tipos';
import { generarEstado, hashEstado } from '@/generador';
import { fijarOverrideParaPruebas } from './reloj';
import { almacenDatos } from './datos';
import { almacenSesion } from './sesion';
import { crearAcciones } from './acciones';
import { suscribirDominio } from './eventos';

/**
 * Store de datos en Node (sin localStorage: modo memoria) con el motor por tramos: iniciar, ejecutar una venta,
 * reconstruir (la venta se reaplica exacta) y restaurar (5.6.9: estado idéntico a una construcción limpia).
 */
const HOY = '2026-09-30T15:30';

function ventaDePrueba(e: EstadoDominio): Omit<DatosRegistrarVenta, 'ventaId'> & { ventaId?: string } {
  const variante = Object.values(e.variantes).find((v) => (e.agregados.existencias[`${v.id}@usq`] ?? 0) > 2);
  const p = variante ? e.productos[variante.productoId] : undefined;
  if (!variante || !p) throw new Error('sin variante con existencias en Usaquén');
  return {
    ts: null,
    localId: 'usq',
    vendedorId: 'em_scardenas',
    canal: 'local',
    tipo: 'contado',
    clienteId: null,
    clienteNuevo: null,
    lineas: [{ varianteId: variante.id, cantidad: 1, precioLista: null, descuento: null }],
    descuentoGlobal: null,
    aprobacionDescuentoId: null,
    pagos: [{ medio: 'nequi', valor: p.precioVenta, recibido: null, referencia: 'NEQ-1', sesionCajaId: null, bonoId: null }],
    fechaLimiteSeparado: null,
    ventaOrigenCambioId: null,
    facturaInmediata: null,
    nota: null,
  };
}

describe('estado: iniciar, ejecutar, reconstruir y restaurar', () => {
  beforeAll(async () => {
    fijarOverrideParaPruebas(HOY);
    await almacenDatos.getState().iniciar();
  });

  it('construye con el ancla de ?hoy= y la misma huella que Node', () => {
    const s = almacenDatos.getState();
    expect(s.fase).toBe('listo');
    expect(s.ancla).toBe('2026-09-30');
    expect(s.modo).toBe('memoria');
    expect(hashEstado(s.estado as EstadoDominio)).toBe(hashEstado(generarEstado({ ancla: '2026-09-30', ahora: `${HOY}:00` })));
    expect(s.medicion?.estrategia).toBe('hilo');
  });

  it('una acción arma el sobre, aplica en vivo, anota el registro y emite eventos', () => {
    const e = almacenDatos.getState().estado as EstadoDominio;
    const eventos: string[] = [];
    const quitar = suscribirDominio('*', (x) => eventos.push(`${x.tipo}:${x.contexto.origen}`));
    const r = crearAcciones('vendedor').registrarVenta(ventaDePrueba(e));
    quitar();
    expect(r.ok).toBe(true);
    const s = almacenDatos.getState();
    expect(s.registro.length).toBe(1);
    const entrada = s.registro[0];
    expect(entrada?.marcaAgua).toBe(`${HOY}:00`);
    expect(entrada?.rol).toBe('vendedor');
    expect(entrada?.usuarioId).toBe('u_vendedor');
    const ventaId = (entrada?.comando.datos as { ventaId: string }).ventaId;
    expect(ventaId.startsWith('vt_')).toBe(true);
    expect(s.estado?.ventas[ventaId]).toBeDefined();
    expect(eventos).toContain('VentaRegistrada:usuario');
    // Un comando inválido no cambia nada.
    const malo = crearAcciones('vendedor').registrarVenta({ ...ventaDePrueba(e), lineas: [] });
    expect(malo.ok).toBe(false);
    expect(almacenDatos.getState().registro.length).toBe(1);
  });

  it('reconstruir reaplica la venta exacta (mismo id, mismo número)', async () => {
    const antes = almacenDatos.getState();
    const ventaId = (antes.registro[0]?.comando.datos as { ventaId: string }).ventaId;
    const numero = antes.estado?.ventas[ventaId]?.numero;
    await antes.reconstruir();
    const despues = almacenDatos.getState();
    expect(despues.estado).not.toBe(antes.estado);
    expect(despues.estado?.ventas[ventaId]?.numero).toBe(numero);
    expect(despues.estado?.meta.omitidosUsuario).toEqual([]);
  });

  it('restaurar borra el registro y el ancla y reconstruye con ancla = hoy: idéntico a una construcción limpia', async () => {
    almacenSesion.getState().cambiarRol('vendedor', 'usq');
    almacenSesion.getState().cambiarMoneda('USD');
    almacenSesion.getState().personalizarMarca({ nombreNegocio: 'Mi tienda', nombrePersona: 'Hernán' });
    await almacenDatos.getState().restaurar();
    const s = almacenDatos.getState();
    expect(s.registro).toEqual([]);
    expect(s.ancla).toBe('2026-09-30');
    expect(hashEstado(s.estado as EstadoDominio)).toBe(hashEstado(generarEstado({ ancla: '2026-09-30', ahora: `${HOY}:00` })));
    const ses = almacenSesion.getState();
    expect(ses.rol).toBe('dueno');
    expect(ses.localId).toBe('todos');
    expect(ses.moneda).toBe('COP');
    expect(ses.marcaPersonalizada.nombreNegocio).toBe('Mi tienda');
  });
});
