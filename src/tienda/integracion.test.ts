import { beforeAll, describe, expect, it } from 'vitest';
import type { EstadoDominio } from '@/dominio/tipos';
import { aplicarEnVivo } from '@/dominio/motor/vivo';
import { sobre } from '@/dominio/pruebas/fixtures';
import { activarVerificacionDeTablas, existencia, selVentas } from '@/selectores';
import { AHORA, estadoDe, HOY } from '@/selectores/pruebas/construir';
import { armarVentaWeb, detalleBolsa, productosDeSeccion, totalesBolsa } from './calculos';
import { selCatalogoTienda, selClientePorCelular, selPedidoTienda, selVendedorWeb } from './selectores';

/** La tienda sobre el estado de 18 meses: el catálogo es el inventario real y una compra es una venta real. */
let e: EstadoDominio;
const comprador = { nombres: 'Andrés Felipe', apellidos: 'Mejía Rincón', correo: 'andres.mejia@correo.example', celular: '3105550142', direccion: 'Carrera 11 # 93-07', complemento: '', barrio: 'Chicó Norte', ciudad: 'Bogotá', autorizacion: true };

beforeAll(() => {
  activarVerificacionDeTablas(true);
  e = estadoDe();
});

function comprar(estado: EstadoDominio, ventaId: string, cantidad: number) {
  const cat = selCatalogoTienda(estado, undefined);
  const p = cat.productos.find((x) => x.slug === 'camisa-de-popelina-blanca');
  const v = Object.values(cat.variantes).find((x) => x.productoId === p?.id && x.colorId === 'col_bla' && x.stock >= cantidad);
  if (!p || !v) throw new Error('sin variante');
  const lineas = [{ varianteId: v.id, cantidad }];
  const total = totalesBolsa(detalleBolsa(lineas, cat)).total;
  const vendedor = selVendedorWeb(estado, { fecha: HOY });
  const conocido = selClientePorCelular(estado, { celular: comprador.celular });
  const entrada = armarVentaWeb({ lineas, comprador, metodo: 'simulado', total, localId: cat.local.id, vendedorId: vendedor?.id ?? '', clienteExistenteId: conocido?.id ?? null, ahora: AHORA });
  const datos = { ...entrada, ventaId, ts: null, clienteNuevo: entrada.clienteNuevo ? { ...entrada.clienteNuevo, clienteId: `cl_${ventaId}` } : null, facturaInmediata: null } as Parameters<typeof sobre<'venta.registrar'>>[1];
  const r = aplicarEnVivo(estado, sobre('venta.registrar', datos, { rol: 'tienda', ts: AHORA }));
  return { r, v, total };
}

describe('catálogo de la tienda', () => {
  it('sale del inventario: publicados, existencias del local de despacho y novedades de la temporada más reciente', () => {
    const cat = selCatalogoTienda(e, undefined);
    expect(cat.local.id).toBe('p93');
    expect(cat.productos.length).toBe(Object.values(e.productos).filter((p) => p.publicadoEnTienda && !p.eliminadoEn).length);
    for (const v of Object.values(cat.variantes)) expect(v.stock).toBe(existencia(e, v.id, 'p93'));
    for (const p of cat.productos) {
      expect(p.unidades).toBe(p.tallas.reduce((a, t) => a + t.unidades, 0));
      expect(p.unidades).toBe(p.colores.reduce((a, c) => a + c.unidades, 0));
    }
    const nuevos = cat.productos.filter((p) => p.nuevo);
    expect(nuevos.length).toBeGreaterThan(0);
    expect(new Set(nuevos.map((p) => p.temporada)).size).toBe(1);
    expect(productosDeSeccion(cat.productos, 'novedades')).toHaveLength(nuevos.length);
    // Las seis secciones cubren todo el catálogo menos nada: cada producto aparece en al menos una.
    const cubiertos = new Set(['sastreria', 'camisas', 'pantalones', 'abrigos', 'zapatos-y-accesorios'].flatMap((s) => productosDeSeccion(cat.productos, s as 'camisas').map((p) => p.id)));
    expect(cubiertos.size).toBe(cat.productos.length);
  });

  it('el vendedor web es uno activo del local de despacho', () => {
    const v = selVendedorWeb(e, { fecha: HOY });
    expect(v).not.toBeNull();
    expect(e.empleados[v?.id ?? '']?.localId).toBe('p93');
  });
});

describe('comprar en la tienda', () => {
  it('registra una venta con canal web, descuenta el inventario del local de despacho y la confirmación la lee', () => {
    const cat = selCatalogoTienda(e, undefined);
    const webAntes = Object.values(e.ventas).filter((v) => v.canal === 'web').length;
    const { r, v, total } = comprar(e, 'vt_tienda_1', 2);
    if (!r.ok) throw new Error(r.error.mensaje);
    const venta = r.despues.ventas['vt_tienda_1'];
    expect(venta?.canal).toBe('web');
    expect(venta?.localId).toBe('p93');
    expect(venta?.total).toBe(total);
    expect(venta?.pagos).toHaveLength(1);
    expect(venta?.pagos[0]?.medio).toBe('pasarela_web');
    expect(Object.values(r.despues.ventas).filter((x) => x.canal === 'web').length).toBe(webAntes + 1);
    expect(existencia(r.despues, v.id, 'p93')).toBe(existencia(e, v.id, 'p93') - 2);
    // El catálogo de la tienda refleja el nuevo stock.
    expect(selCatalogoTienda(r.despues, undefined).variantes[v.id]?.stock).toBe((cat.variantes[v.id]?.stock ?? 0) - 2);
    // La venta aparece en Ventas por el canal web.
    expect(selVentas(r.despues, { desde: HOY, hasta: HOY, canal: 'web' }).filas.some((f) => f.id === 'vt_tienda_1')).toBe(true);
    // La confirmación.
    const pedido = selPedidoTienda(r.despues, { ventaId: 'vt_tienda_1' });
    expect(pedido?.local.nombre).toBe('Parque 93');
    expect(pedido?.cliente?.nombres).toBe('Andrés Felipe');
    expect(pedido?.lineas).toHaveLength(1);
    expect(pedido?.detalle.pagado).toBe(total);
    expect(selClientePorCelular(r.despues, { celular: comprador.celular })?.nombres).toBe('Andrés Felipe');
  });

  it('una segunda compra con el mismo celular se suma al mismo cliente', () => {
    const primera = comprar(e, 'vt_tienda_2', 1);
    if (!primera.r.ok) throw new Error(primera.r.error.mensaje);
    const segunda = comprar(primera.r.despues, 'vt_tienda_3', 1);
    if (!segunda.r.ok) throw new Error(segunda.r.error.mensaje);
    expect(segunda.r.despues.ventas['vt_tienda_3']?.clienteId).toBe(primera.r.despues.ventas['vt_tienda_2']?.clienteId);
  });

  it('no deja comprar más de lo que hay (el dominio revalida y nada cambia)', () => {
    const cat = selCatalogoTienda(e, undefined);
    const p = cat.productos[0];
    const v = Object.values(cat.variantes).find((x) => x.productoId === p?.id && x.stock >= 0);
    if (!p || !v) throw new Error('sin variante');
    const entrada = armarVentaWeb({ lineas: [{ varianteId: v.id, cantidad: v.stock + 1 }], comprador, metodo: 'simulado', total: p.precio * (v.stock + 1), localId: 'p93', vendedorId: selVendedorWeb(e, { fecha: HOY })?.id ?? '', clienteExistenteId: null, ahora: AHORA });
    const datos = { ...entrada, ventaId: 'vt_tienda_x', ts: null, clienteNuevo: entrada.clienteNuevo ? { ...entrada.clienteNuevo, clienteId: 'cl_tienda_x' } : null, facturaInmediata: null } as Parameters<typeof sobre<'venta.registrar'>>[1];
    const r = aplicarEnVivo(e, sobre('venta.registrar', datos, { rol: 'tienda', ts: AHORA }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.codigo).toBe('SIN_EXISTENCIAS');
  });
});
