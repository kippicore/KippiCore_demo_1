import type { Color, Producto, Variante } from '../tipos';
import { exigir, fallar } from '../errores';
import { generarEan13 } from '../reglas/ean13';
import { slug } from '../reglas/texto';
import { MARCA } from '@/config/marca';
import { CODIGO_CATEGORIA } from '@/seed/catalogo';
import { CURVAS_TALLAS } from '@/seed/tallas';
import {
  enteroNoNegativo,
  enteroPositivo,
  fraccionValida,
  idNuevo,
  requerir,
  requerirExiste,
  textoObligatorio,
} from './comunes';
import {
  fijarConsecutivo,
  leerConsecutivo,
  manejador,
  marcarEditado,
  marcarEliminado,
  traza,
  existencia,
} from './tx';

/** Catálogo (PLAN 6.21): productos, variantes y colores. */

function sku(referencia: string, codigoColor: string, talla: string): string {
  return `${referencia}-${codigoColor}-${talla === 'Única' ? 'U' : talla}`;
}

export const productoCrear = manejador<
  'producto.crear',
  {
    producto: Producto;
    variantes: Variante[];
    consecutivoProducto: number | null;
    consecutivoVariante: number;
  }
>({
  validar(estado, d, ctx) {
    idNuevo(estado.productos, d.productoId, 'productoId');
    textoObligatorio(d.nombre, 'nombre', 'Escribe el nombre de la referencia.');
    enteroPositivo(d.precioVenta, 'precioVenta', 'El precio de venta debe ser mayor que cero.');
    fraccionValida(d.tarifaIva, 'tarifaIva', 'La tarifa de IVA debe estar entre 0 % y 100 %.');
    enteroNoNegativo(d.stockMinimo, 'stockMinimo', 'El stock mínimo no puede ser negativo.');
    requerir(estado.proveedores, d.proveedorId, 'el proveedor', 'proveedorId');
    if (d.costoManual !== null)
      enteroNoNegativo(d.costoManual, 'costoManual', 'El costo no puede ser negativo.');
    exigir(d.tallas.length > 0, 'SIN_TALLAS', 'Elige al menos una talla.', 'tallas');
    exigir(d.colorIds.length > 0, 'SIN_COLORES', 'Elige al menos un color.', 'colorIds');
    const curva = CURVAS_TALLAS[d.curvaTallas];
    exigir(curva, 'CURVA_INVALIDA', 'Elige una curva de tallas válida.', 'curvaTallas');
    for (const t of d.tallas)
      exigir(curva.includes(t), 'TALLA_INVALIDA', `La talla ${t} no es de la curva elegida.`, 'tallas');
    exigir(
      new Set(d.tallas).size === d.tallas.length && new Set(d.colorIds).size === d.colorIds.length,
      'DUPLICADOS',
      'Hay tallas o colores repetidos.',
      'tallas',
    );

    let referencia = d.referencia.trim();
    let consecutivoProducto: number | null = null;
    if (referencia === '') {
      consecutivoProducto = leerConsecutivo(estado, 'producto');
      referencia = `${MARCA.prefijoReferencia}-${CODIGO_CATEGORIA[d.categoria]}-${String(consecutivoProducto).padStart(4, '0')}`;
    }
    exigir(
      new RegExp(`^${MARCA.prefijoReferencia}-[A-Z]{3}-\\d{4}$`).test(referencia),
      'REFERENCIA_INVALIDA',
      `La referencia va con el formato ${MARCA.prefijoReferencia}-CAM-0142.`,
      'referencia',
    );
    exigir(
      !Object.values(estado.productos).some((p) => p.referencia === referencia),
      'REFERENCIA_DUPLICADA',
      `Ya existe la referencia ${referencia}.`,
      'referencia',
    );

    const producto: Producto = {
      ...traza(ctx),
      id: d.productoId,
      referencia,
      nombre: d.nombre.trim(),
      slug: slug(`${d.nombre}-${referencia.slice(-4)}`),
      categoria: d.categoria,
      linea: d.linea,
      tipoPrenda: d.tipoPrenda,
      curvaTallas: d.curvaTallas,
      temporada: d.temporada,
      proveedorId: d.proveedorId,
      material: d.material,
      descripcion: d.descripcion,
      precioVenta: d.precioVenta,
      tarifaIva: d.tarifaIva,
      costoVigente: d.costoManual ?? 0,
      historialCosto:
        d.costoManual !== null
          ? [{ fecha: ctx.hoy, costo: d.costoManual, importacionId: null, motivo: 'manual' }]
          : [],
      stockMinimo: d.stockMinimo,
      publicadoEnTienda: d.publicadoEnTienda,
      destacado: d.destacado,
      etiquetas: [...d.etiquetas],
    };
    const variantes: Variante[] = [];
    let consecutivoVariante = leerConsecutivo(estado, 'variante', 0);
    const ids = new Set<string>();
    for (const colorId of d.colorIds) {
      const color = requerirExiste(estado.colores, colorId, 'el color', 'colorIds');
      for (const talla of d.tallas) {
        const id = d.varianteIds[`${talla}|${colorId}`];
        exigir(id && !ids.has(id), 'ID_INVALIDO', 'Falta el identificador de una variante.', 'varianteIds');
        idNuevo(estado.variantes, id, 'varianteIds');
        ids.add(id);
        consecutivoVariante += 1;
        variantes.push({
          ...traza(ctx),
          id,
          productoId: d.productoId,
          talla,
          colorId,
          sku: sku(referencia, color.codigo, talla),
          ean13: generarEan13(MARCA.prefijoEan, MARCA.codigoEmpresaEan, consecutivoVariante),
        });
      }
    }
    return { producto, variantes, consecutivoProducto, consecutivoVariante };
  },
  escribir(estado, plan, ctx) {
    estado.productos[plan.producto.id] = plan.producto;
    for (const v of plan.variantes) estado.variantes[v.id] = v;
    if (plan.consecutivoProducto !== null) fijarConsecutivo(estado, 'producto', plan.consecutivoProducto);
    fijarConsecutivo(estado, 'variante', plan.consecutivoVariante);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'productos', id: plan.producto.id, accion: 'creada' });
  },
});

export const productoEditar = manejador<
  'producto.editar',
  { id: string; cambios: Partial<Producto>; costo: number | null }
>({
  validar(estado, d, ctx) {
    const p = requerir(estado.productos, d.productoId, 'la referencia', 'productoId');
    const c = d.cambios;
    if (ctx.actor === 'bodega') {
      exigir(
        c.precioVenta === undefined && c.costoManual === undefined,
        'SIN_PERMISO',
        'Bodega puede editar datos y stock mínimo, pero no precios ni costos.',
        'precioVenta',
      );
    }
    if (c.nombre !== undefined) textoObligatorio(c.nombre, 'nombre', 'Escribe el nombre de la referencia.');
    if (c.precioVenta !== undefined)
      enteroPositivo(c.precioVenta, 'precioVenta', 'El precio de venta debe ser mayor que cero.');
    if (c.tarifaIva !== undefined)
      fraccionValida(c.tarifaIva, 'tarifaIva', 'La tarifa de IVA debe estar entre 0 % y 100 %.');
    if (c.stockMinimo !== undefined)
      enteroNoNegativo(c.stockMinimo, 'stockMinimo', 'El stock mínimo no puede ser negativo.');
    if (c.proveedorId !== undefined)
      requerir(estado.proveedores, c.proveedorId, 'el proveedor', 'proveedorId');
    if (c.curvaTallas !== undefined && c.curvaTallas !== p.curvaTallas) {
      exigir(
        !Object.values(estado.variantes).some((v) => v.productoId === p.id && !v.eliminadoEn),
        'CURVA_CON_VARIANTES',
        'No se puede cambiar la curva de tallas de una referencia que ya tiene variantes.',
        'curvaTallas',
      );
    }
    let costo: number | null = null;
    if (c.costoManual !== undefined && c.costoManual !== null) {
      enteroNoNegativo(c.costoManual, 'costoManual', 'El costo no puede ser negativo.');
      if (c.costoManual !== p.costoVigente) costo = c.costoManual;
    }
    const { costoManual: _c, ...resto } = c;
    const cambios: Partial<Producto> = {};
    for (const [k, v] of Object.entries(resto))
      if (v !== undefined) (cambios as Record<string, unknown>)[k] = Array.isArray(v) ? [...v] : v;
    return { id: p.id, cambios, costo };
  },
  escribir(estado, plan, ctx) {
    const p = estado.productos[plan.id];
    if (!p) return;
    Object.assign(p, plan.cambios);
    if (plan.costo !== null) {
      p.costoVigente = plan.costo;
      p.historialCosto.push({ fecha: ctx.hoy, costo: plan.costo, importacionId: null, motivo: 'manual' });
    }
    marcarEditado(p, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'productos', id: plan.id, accion: 'editada' });
  },
});

export const productoEliminar = manejador<
  'producto.eliminar',
  { id: string; variantes: string[]; motivo: string | null }
>({
  validar(estado, d) {
    const p = requerir(estado.productos, d.productoId, 'la referencia', 'productoId');
    const variantes = Object.values(estado.variantes)
      .filter((v) => v.productoId === p.id && !v.eliminadoEn)
      .map((v) => v.id);
    let unidades = 0;
    for (const v of variantes)
      for (const l of Object.keys(estado.locales)) unidades += existencia(estado, v, l);
    exigir(
      unidades === 0,
      'CON_EXISTENCIAS',
      `Tiene ${unidades} unidades en existencia; trasládalas o ajústalas antes de eliminarla.`,
      'productoId',
    );
    const enSeparado = Object.values(estado.ventas).some(
      (v) =>
        v.tipo === 'separado' &&
        !v.anulacion &&
        !v.separado?.cerrado &&
        v.lineas.some((l) => l.productoId === p.id),
    );
    exigir(!enSeparado, 'EN_SEPARADO', 'Hay un separado activo con esta referencia.', 'productoId');
    return { id: p.id, variantes, motivo: d.motivo };
  },
  escribir(estado, plan, ctx) {
    const p = estado.productos[plan.id];
    if (!p) return;
    marcarEliminado(p, ctx, plan.motivo);
    for (const id of plan.variantes) {
      const v = estado.variantes[id];
      if (v) marcarEliminado(v, ctx, plan.motivo);
    }
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'productos', id: plan.id, accion: 'eliminada' });
  },
});

export const varianteAgregar = manejador<'variante.agregar', { variante: Variante; consecutivo: number }>({
  validar(estado, d, ctx) {
    const p = requerir(estado.productos, d.productoId, 'la referencia', 'productoId');
    idNuevo(estado.variantes, d.varianteId, 'varianteId');
    exigir(
      CURVAS_TALLAS[p.curvaTallas].includes(d.talla),
      'TALLA_INVALIDA',
      `La talla ${d.talla} no es de la curva de esta referencia.`,
      'talla',
    );
    const color = requerirExiste(estado.colores, d.colorId, 'el color', 'colorId');
    const repetida = Object.values(estado.variantes).some(
      (v) => v.productoId === p.id && !v.eliminadoEn && v.talla === d.talla && v.colorId === d.colorId,
    );
    exigir(
      !repetida,
      'VARIANTE_DUPLICADA',
      `Ya existe la talla ${d.talla} en ${color.nombre.toLowerCase()}.`,
      'talla',
    );
    const consecutivo = leerConsecutivo(estado, 'variante');
    return {
      consecutivo,
      variante: {
        ...traza(ctx),
        id: d.varianteId,
        productoId: p.id,
        talla: d.talla,
        colorId: color.id,
        sku: sku(p.referencia, color.codigo, d.talla),
        ean13: generarEan13(MARCA.prefijoEan, MARCA.codigoEmpresaEan, consecutivo),
      },
    };
  },
  escribir(estado, plan, ctx) {
    estado.variantes[plan.variante.id] = plan.variante;
    fijarConsecutivo(estado, 'variante', plan.consecutivo);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'variantes', id: plan.variante.id, accion: 'creada' });
  },
});

export const varianteEliminar = manejador<'variante.eliminar', { id: string }>({
  validar(estado, d) {
    const v = requerir(estado.variantes, d.varianteId, 'la variante', 'varianteId');
    let unidades = 0;
    for (const l of Object.keys(estado.locales)) unidades += existencia(estado, v.id, l);
    exigir(
      unidades === 0,
      'CON_EXISTENCIAS',
      `La variante tiene ${unidades} unidades en existencia.`,
      'varianteId',
    );
    return { id: v.id };
  },
  escribir(estado, plan, ctx) {
    const v = estado.variantes[plan.id];
    if (!v) return;
    marcarEliminado(v, ctx, null);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'variantes', id: plan.id, accion: 'eliminada' });
  },
});

export const colorCrear = manejador<'color.crear', Color>({
  validar(estado, d) {
    idNuevo(estado.colores, d.colorId, 'colorId');
    const nombre = textoObligatorio(d.nombre, 'nombre', 'Escribe el nombre del color.');
    const codigo = d.codigo.trim().toUpperCase();
    exigir(
      /^[A-Z]{3}$/.test(codigo),
      'CODIGO_INVALIDO',
      'El código del color son tres letras, como AZC.',
      'codigo',
    );
    exigir(/^#[0-9A-Fa-f]{6}$/.test(d.hex), 'HEX_INVALIDO', 'El color va en formato #RRGGBB.', 'hex');
    for (const c of Object.values(estado.colores)) {
      if (c.codigo === codigo)
        fallar('CODIGO_DUPLICADO', `El código ${codigo} ya es de ${c.nombre}.`, 'codigo');
      if (c.nombre.toLowerCase() === nombre.toLowerCase())
        fallar('NOMBRE_DUPLICADO', `Ya existe el color ${c.nombre}.`, 'nombre');
    }
    return { id: d.colorId, nombre, codigo, hex: d.hex.toUpperCase(), patron: 'liso' };
  },
  escribir(estado, color, ctx) {
    estado.colores[color.id] = color;
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'colores', id: color.id, accion: 'creada' });
  },
});
