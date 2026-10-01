import { describe, expect, it } from 'vitest';
import { rutas } from '@/app/rutas';
import { leerParamsRuta } from '@/app/rutas';
import {
  contarEnPanel,
  filtroDeSelector,
  paramsConCambios,
  rangoPorDefecto,
  resolverFiltros,
  type ParamsVentas,
} from './filtros';

const HOY = '2026-09-30';
const vacios: ParamsVentas = {
  desde: null,
  hasta: null,
  local: null,
  vendedor: null,
  cliente: null,
  medio: null,
  canal: null,
  estado: null,
  producto: null,
};
const ctx = { hoy: HOY, localSesion: 'todos' as const, vendedorFijoId: null };

describe('filtros de ventas ↔ URL', () => {
  it('sin parámetros: mes en curso hasta hoy, todos los locales y ningún filtro activo', () => {
    const r = resolverFiltros(vacios, ctx);
    expect(r.rango).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' });
    expect(r.rangoExplicito).toBe(false);
    expect(r.localId).toBe('todos');
    expect(r.activos).toEqual([]);
    expect(rangoPorDefecto(HOY)).toEqual(r.rango);
  });

  it('el local de la barra superior es el de partida; el de la URL lo reemplaza', () => {
    expect(resolverFiltros(vacios, { ...ctx, localSesion: 'usq' }).localId).toBe('usq');
    const r = resolverFiltros({ ...vacios, local: 'zr' }, { ...ctx, localSesion: 'usq' });
    expect(r.localId).toBe('zr');
    expect(r.activos).toContain('local');
  });

  it('un rango a medias se completa; uno al revés se acomoda', () => {
    expect(resolverFiltros({ ...vacios, desde: '2026-08-10' }, ctx).rango).toEqual({
      desde: '2026-08-10',
      hasta: HOY,
    });
    expect(resolverFiltros({ ...vacios, hasta: '2026-08-20' }, ctx).rango).toEqual({
      desde: '2026-08-01',
      hasta: '2026-08-20',
    });
    expect(resolverFiltros({ ...vacios, desde: '2026-08-20', hasta: '2026-08-10' }, ctx).rango).toEqual({
      desde: '2026-08-10',
      hasta: '2026-08-20',
    });
  });

  it('un enlace ?resaltar= a una venta anterior ensancha el rango por defecto, no el explícito', () => {
    const r = resolverFiltros(vacios, { ...ctx, fechaResaltada: '2026-06-17' });
    expect(r.rango).toEqual({ desde: '2026-06-01', hasta: HOY });
    const e = resolverFiltros({ ...vacios, desde: '2026-09-10' }, { ...ctx, fechaResaltada: '2026-06-17' });
    expect(e.rango.desde).toBe('2026-09-10');
  });

  it('el vendedor queda fijo en sus ventas y en su local', () => {
    const r = resolverFiltros(
      { ...vacios, vendedor: 'em_otro', local: 'zr' },
      { ...ctx, localSesion: 'usq', vendedorFijoId: 'em_scardenas' },
    );
    expect(r.vendedorId).toBe('em_scardenas');
    expect(r.localId).toBe('usq');
    expect(r.activos).not.toContain('vendedor');
    expect(r.activos).not.toContain('local');
  });

  it('un medio inventado se ignora', () => {
    expect(resolverFiltros({ ...vacios, medio: 'cheque' }, ctx).medio).toBeNull();
    expect(resolverFiltros({ ...vacios, medio: 'nequi' }, ctx).medio).toBe('nequi');
  });

  it('arma los parámetros del selector solo con lo que hay', () => {
    const r = resolverFiltros(
      { ...vacios, medio: 'nequi', cliente: 'consumidor_final', estado: 'anulada' },
      ctx,
    );
    expect(filtroDeSelector(r, '  ')).toEqual({
      desde: '2026-09-01',
      hasta: HOY,
      localId: 'todos',
      clienteId: 'consumidor_final',
      medio: 'nequi',
      estado: 'anulada',
    });
    expect(filtroDeSelector(r, ' oxford ').texto).toBe('oxford');
  });

  it('los filtros viajan a la URL y vuelven iguales (ida y vuelta con rutas.ts)', () => {
    const p = paramsConCambios(vacios, {
      desde: '2026-08-01',
      hasta: '2026-08-31',
      local: 'p93',
      vendedor: 'em_scardenas',
      cliente: 'consumidor_final',
      medio: 'datafono_credito',
      canal: 'whatsapp',
      estado: 'devuelta_parcial',
      producto: 'pd_1',
    });
    const url = rutas.ventas(p);
    expect(url).toContain('desde=2026-08-01');
    expect(url).toContain('cliente=consumidor_final');
    const leidos = leerParamsRuta('ventas', {}, url.split('?')[1] ?? '');
    expect(leidos).toMatchObject({ ...p, resaltar: null });
  });

  it('cambiar un filtro descarta ?resaltar= y conserva el resto', () => {
    const p = paramsConCambios({ ...vacios, local: 'usq', resaltar: 'vt_1' }, { canal: 'web' });
    expect(p.resaltar).toBeNull();
    expect(p.local).toBe('usq');
    expect(p.canal).toBe('web');
  });

  it('cuenta solo los filtros del panel "Filtros"', () => {
    expect(contarEnPanel(['fechas', 'local', 'estado', 'cliente', 'medio'])).toBe(2);
  });
});
