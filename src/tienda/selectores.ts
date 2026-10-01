import type { COP, FechaISO, Id, TipoPrenda } from '@/dominio/tipos';
import { crearSelector, existencia, selVentaDetalle, type DetalleVenta } from '@/selectores';
import { ordenarTallas } from './calculos';
import type { CatalogoTienda, ColorTienda, PatronColor, ProductoTienda, TallaTienda, VarianteTienda } from './tipos';

/**
 * Selectores locales de la tienda (D6). Componen los compartidos (`existencia`, `selVentaDetalle`) y declaran TODAS
 * las tablas que leen. La tienda es un reflejo del inventario: no guarda precios, existencias ni productos propios.
 */

/** Catálogo publicado con las existencias del local de despacho web (`parametros.ventas.localDespachoWebId`). */
export const selCatalogoTienda = crearSelector<void, CatalogoTienda>(
  'selCatalogoTienda',
  ['productos', 'variantes', 'colores', 'locales', 'parametros', 'agregados'],
  (e) => {
    const localId = e.parametros.ventas.localDespachoWebId;
    const local = e.locales[localId];
    const porProducto = new Map<Id, VarianteTienda[]>();
    const variantes: Record<Id, VarianteTienda> = {};
    for (const v of Object.values(e.variantes)) {
      if (v.eliminadoEn) continue;
      const x: VarianteTienda = { id: v.id, productoId: v.productoId, talla: v.talla, colorId: v.colorId, sku: v.sku, stock: existencia(e, v.id, localId) };
      variantes[v.id] = x;
      const l = porProducto.get(v.productoId);
      if (l) l.push(x);
      else porProducto.set(v.productoId, [x]);
    }
    const publicados = Object.values(e.productos).filter((p) => !p.eliminadoEn && p.publicadoEnTienda);
    // Temporada más reciente: 'Temporada 2026-II' > 'Temporada 2026-I' > 'Colección permanente'.
    let reciente = '';
    for (const p of publicados) if (p.temporada.startsWith('Temporada') && p.temporada > reciente) reciente = p.temporada;
    const productos: ProductoTienda[] = [];
    for (const p of publicados) {
      const vs = porProducto.get(p.id) ?? [];
      if (vs.length === 0) continue;
      const colores: ColorTienda[] = [];
      const tallas = new Map<string, number>();
      let unidades = 0;
      for (const v of vs) {
        unidades += v.stock;
        tallas.set(v.talla, (tallas.get(v.talla) ?? 0) + v.stock);
        const existente = colores.find((c) => c.id === v.colorId);
        if (existente) existente.unidades += v.stock;
        else {
          const c = e.colores[v.colorId];
          colores.push({
            id: v.colorId,
            nombre: c?.nombre ?? v.colorId,
            codigo: c?.codigo ?? '',
            hex: c?.hex ?? '#999999',
            patron: (c?.patron ?? 'liso') as PatronColor,
            unidades: v.stock,
          });
        }
      }
      const tallasOrdenadas: TallaTienda[] = ordenarTallas([...tallas.keys()]).map((t) => ({ talla: t, unidades: tallas.get(t) ?? 0 }));
      productos.push({
        id: p.id,
        slug: p.slug,
        referencia: p.referencia,
        nombre: p.nombre,
        categoria: p.categoria,
        linea: p.linea,
        tipoPrenda: p.tipoPrenda,
        curvaTallas: p.curvaTallas,
        temporada: p.temporada,
        material: p.material,
        descripcion: p.descripcion,
        precio: p.precioVenta,
        tarifaIva: p.tarifaIva,
        destacado: p.destacado,
        nuevo: reciente !== '' && p.temporada === reciente,
        colores,
        tallas: tallasOrdenadas,
        unidades,
      });
    }
    return { local: { id: localId, nombre: local?.nombre ?? localId }, productos, variantes };
  },
);

/** Vendedor al que se le acredita la venta web: uno activo del local de despacho (si no, cualquiera activo). */
export const selVendedorWeb = crearSelector<{ fecha: FechaISO }, { id: Id; nombre: string } | null>(
  'selVendedorWeb',
  ['empleados', 'parametros'],
  (e, { fecha }) => {
    const despacho = e.parametros.ventas.localDespachoWebId;
    const activos = Object.values(e.empleados).filter((x) => !x.eliminadoEn && x.cargo === 'vendedor' && (x.fechaRetiro === null || x.fechaRetiro >= fecha));
    const elegido = activos.find((x) => x.localId === despacho) ?? activos[0];
    return elegido ? { id: elegido.id, nombre: `${elegido.nombres.split(' ')[0]} ${elegido.apellidos.split(' ')[0]}` } : null;
  },
);

/** Cliente existente con ese celular (la compra web se suma a su historial en vez de duplicarlo). */
export const selClientePorCelular = crearSelector<{ celular: string }, { id: Id; nombres: string } | null>(
  'selClientePorCelular',
  ['clientes'],
  (e, { celular }) => {
    if (!celular) return null;
    for (const id in e.clientes) {
      const c = e.clientes[id];
      if (c && !c.eliminadoEn && c.celular === celular) return { id: c.id, nombres: c.nombres };
    }
    return null;
  },
);

export interface LineaPedidoTienda {
  lineaId: Id;
  descripcion: string;
  cantidad: number;
  total: COP;
  tipoPrenda: TipoPrenda;
  hex: string;
  patron: PatronColor;
}

export interface PedidoTienda {
  detalle: DetalleVenta;
  local: { id: Id; nombre: string };
  cliente: { id: Id; nombres: string; apellidos: string; correo: string | null } | null;
  lineas: LineaPedidoTienda[];
}

/** Lo que muestra la confirmación: la venta tal como quedó en el sistema. */
export const selPedidoTienda = crearSelector<{ ventaId: Id }, PedidoTienda | null>(
  'selPedidoTienda',
  ['ventas', 'devoluciones', 'facturas', 'locales', 'clientes', 'productos', 'variantes', 'colores'],
  (e, { ventaId }) => {
    const detalle = selVentaDetalle(e, { ventaId });
    if (!detalle) return null;
    const v = detalle.venta;
    const c = v.clienteId ? e.clientes[v.clienteId] : undefined;
    return {
      detalle,
      local: { id: v.localId, nombre: e.locales[v.localId]?.nombre ?? v.localId },
      cliente: c ? { id: c.id, nombres: c.nombres, apellidos: c.apellidos, correo: c.correo } : null,
      lineas: v.lineas.map((l) => {
        const p = e.productos[l.productoId];
        const color = e.colores[e.variantes[l.varianteId]?.colorId ?? ''];
        return {
          lineaId: l.id,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          total: l.totalFinal,
          tipoPrenda: p?.tipoPrenda ?? 'camisa',
          hex: color?.hex ?? '#999999',
          patron: (color?.patron ?? 'liso') as PatronColor,
        };
      }),
    };
  },
);
