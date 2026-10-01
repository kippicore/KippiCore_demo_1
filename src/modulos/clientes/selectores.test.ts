import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PARAMETROS_SEGMENTACION as P } from '@/config/segmentacion';
import { activarVerificacionDeTablas, selClientes, selCumpleanosMes, selMetricasClientes, selSegmentos } from '@/selectores';
import { AHORA, estadoDe, HOY } from '@/selectores/pruebas/construir';
import { SEGMENTOS_ORDEN } from './reglas';
import { selCumpleanosPagina, selListaClientes, selPerfilCliente, selUmbralesSegmentacion } from './selectores';

/** Se verifica que cada selector declare TODAS las tablas que lee (si no, el caché quedaría viejo). */
beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

const e = estadoDe();

describe('selListaClientes', () => {
  it('los chips cuentan lo mismo que el selector de segmentos y suman el total', () => {
    const l = selListaClientes(e, { hoy: HOY });
    const g = selSegmentos(e, { hoy: HOY });
    expect(l.conteos).toEqual(g);
    expect(SEGMENTOS_ORDEN.reduce((a, s) => a + l.conteos[s], 0)).toBe(l.total);
    expect(l.filas).toHaveLength(l.total);
    expect(l.total).toBe(Object.values(e.clientes).filter((c) => !c.eliminadoEn).length);
  });

  it('filtrar por segmento deja solo ese segmento pero los chips conservan los conteos', () => {
    const todos = selListaClientes(e, { hoy: HOY });
    const vip = selListaClientes(e, { hoy: HOY, segmento: 'vip' });
    expect(vip.filas.length).toBe(todos.conteos.vip);
    expect(vip.filas.every((f) => f.metricas.segmento === 'vip')).toBe(true);
    expect(vip.conteos).toEqual(todos.conteos);
  });

  it('los totales son la suma de las filas del filtro y el ticket sale de ellas', () => {
    const l = selListaClientes(e, { hoy: HOY, segmento: 'frecuente' });
    expect(l.totales.clientes).toBe(l.filas.length);
    expect(l.totales.valor).toBe(l.filas.reduce((a, f) => a + f.metricas.valor, 0));
    expect(l.totales.compras).toBe(l.filas.reduce((a, f) => a + f.metricas.compras, 0));
    expect(l.totales.ticket).toBe(Math.round(l.totales.valor / l.totales.compras));
  });

  it('respeta local, vendedor y búsqueda como el selector compartido', () => {
    const l = selListaClientes(e, { hoy: HOY, localId: 'usq', vendedorId: 'em_scardenas', texto: 'a' });
    const c = selClientes(e, { hoy: HOY, localId: 'usq', vendedorId: 'em_scardenas', texto: 'a' });
    expect(l.filas.map((f) => f.cliente.id)).toEqual(c.map((f) => f.cliente.id));
  });

  it('cada fila trae una explicación coherente con su segmento', () => {
    const l = selListaClientes(e, { hoy: HOY });
    for (const f of l.filas) {
      expect(f.explicacion.segmento).toBe(f.metricas.segmento);
      expect(f.explicacion.corta.length).toBeGreaterThan(0);
    }
    const vip = l.filas.find((f) => f.metricas.segmento === 'vip');
    expect(vip?.metricas.valor12m).toBeGreaterThanOrEqual(P.vipValor12m);
    const riesgo = l.filas.find((f) => f.metricas.segmento === 'en_riesgo' && f.metricas.ultimaCompra && f.metricas.ultimaCompra < HOY);
    expect(riesgo?.explicacion.corta.join('')).toMatch(/\d+ días sin comprar/);
  });

  it('los umbrales son los del estado', () => {
    expect(selUmbralesSegmentacion(e)).toEqual(e.parametros.segmentacion);
  });
});

describe('selPerfilCliente', () => {
  const vipId = e.meta.narrativa.clienteVip;
  const perfil = selPerfilCliente(e, { clienteId: vipId, hoy: HOY });

  it('el cliente VIP de la narrativa: segmento, historial y cifras vienen del dominio', () => {
    expect(perfil).not.toBeNull();
    if (!perfil) return;
    const m = selMetricasClientes(e, { hoy: HOY })[vipId];
    expect(perfil.ficha.metricas).toEqual(m);
    expect(perfil.explicacion.segmento).toBe('vip');
    expect(perfil.historial).toHaveLength(Object.values(e.ventas).filter((v) => v.clienteId === vipId).length);
  });

  it('el historial va de lo más reciente a lo más antiguo (la compra nueva queda arriba)', () => {
    if (!perfil) throw new Error('sin perfil');
    const ts = perfil.historial.map((h) => h.ts);
    expect([...ts].sort().reverse()).toEqual(ts);
    expect(perfil.historial[0]?.resumen.length).toBeGreaterThan(0);
  });

  it('qué compra: categorías y colores salen de sus compras y las proporciones suman 1', () => {
    if (!perfil) throw new Error('sin perfil');
    expect(perfil.unidades).toBeGreaterThan(0);
    expect(perfil.categorias.reduce((a, c) => a + c.proporcion, 0)).toBeCloseTo(1, 5);
    expect(perfil.lineas.reduce((a, c) => a + c.proporcion, 0)).toBeCloseTo(1, 5);
    // Mismos colores que las métricas del dominio (el orden entre empates puede variar), de más a menos comprado.
    expect(new Set(perfil.colores.map((c) => c.id))).toEqual(new Set(selMetricasClientes(e, { hoy: HOY })[vipId]?.colores));
    const unidades = perfil.colores.map((c) => c.unidades);
    expect([...unidades].sort((a, b) => b - a)).toEqual(unidades);
    expect(perfil.colores.every((c) => /^#[0-9a-f]{6}$/i.test(c.hex))).toBe(true);
  });

  it('tallas: la declarada manda sobre la derivada', () => {
    if (!perfil) throw new Error('sin perfil');
    const camisa = perfil.tallas.find((t) => t.clave === 'camisa');
    expect(camisa?.declarada).toBe(perfil.ficha.cliente.tallasDeclaradas.camisa ?? null);
    expect(camisa?.efectiva).toBe(camisa?.declarada ?? camisa?.derivada);
  });

  it('el contexto del mensaje: local habitual y novedad en lo que más compra', () => {
    if (!perfil) throw new Error('sin perfil');
    expect(perfil.contexto.local).toBe(perfil.localHabitual?.nombre);
    expect(perfil.contexto.novedad).toMatch(/^novedades en /);
    expect(perfil.contexto.producto).toBeTruthy();
  });

  it('un cliente con un separado con saldo trae el cobro más urgente', () => {
    const conSaldo = Object.values(selMetricasClientes(e, { hoy: HOY })).find((m) => m.porCobrar > 0);
    expect(conSaldo).toBeDefined();
    if (!conSaldo) return;
    const p = selPerfilCliente(e, { clienteId: conSaldo.clienteId, hoy: HOY });
    expect(p?.porCobrar.length).toBeGreaterThan(0);
    expect(p?.contexto.cobro?.saldo).toBe(p?.porCobrar[0]?.saldo);
    expect(p?.porCobrar.reduce((a, f) => a + f.saldo, 0)).toBe(conSaldo.porCobrar);
  });

  it('un cliente inexistente o eliminado devuelve null', () => {
    expect(selPerfilCliente(e, { clienteId: 'cl_no_existe', hoy: HOY })).toBeNull();
  });

  it('sin mensajes, notas ni seguimientos al inicio (se llenan con las acciones del usuario)', () => {
    if (!perfil) throw new Error('sin perfil');
    expect(perfil.mensajes).toEqual([]);
    expect(perfil.notas).toEqual([]);
  });

  it('el reloj fija el cálculo: AHORA y HOY van juntos', () => {
    expect(AHORA.startsWith(HOY)).toBe(true);
  });
});

describe('selCumpleanosPagina', () => {
  it('septiembre: los mismos clientes que el selector compartido, con el estado frente a hoy', () => {
    const p = selCumpleanosPagina(e, { mes: '2026-09', hoy: HOY });
    expect(p.total).toBe(selCumpleanosMes(e, { mes: '2026-09', hoy: HOY }).length);
    expect(p.hoy).toBe(Object.values(e.clientes).filter((c) => !c.eliminadoEn && c.cumpleanos === '09-30').length);
    expect(p.filas.filter((f) => f.estado === 'hoy').every((f) => f.fecha === HOY)).toBe(true);
    expect(p.filas.every((f) => f.estado === 'hoy' || f.estado === 'pasado')).toBe(true);
  });

  it('octubre: todos son próximos y vienen ordenados por fecha', () => {
    const p = selCumpleanosPagina(e, { mes: '2026-10', hoy: HOY });
    expect(p.filas.length).toBeGreaterThan(0);
    expect(p.filas.every((f) => f.estado === 'proximo')).toBe(true);
    const fechas = p.filas.map((f) => f.fecha);
    expect([...fechas].sort()).toEqual(fechas);
    expect(p.felicitados).toBe(0);
  });

  it('el filtro de local deja solo a los clientes de ese local habitual', () => {
    const p = selCumpleanosPagina(e, { mes: '2026-10', hoy: HOY, localId: 'zr' });
    expect(p.filas.every((f) => f.localHabitualId === 'zr')).toBe(true);
  });

  it('la edad que cumple sale del año de nacimiento', () => {
    const p = selCumpleanosPagina(e, { mes: '2026-10', hoy: HOY });
    const f = p.filas.find((x) => x.cliente.anioNacimiento);
    expect(f?.edad).toBe(2026 - (f?.cliente.anioNacimiento ?? 0));
  });
});
