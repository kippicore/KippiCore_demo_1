import type { Categoria, EstadoDominio, FechaISO, Id } from '@/dominio/tipos';
import { estadoCxP } from '@/dominio/reglas/cuentas';
import { diasDelMes, mesDe, rangoFechas } from '@/dominio/reglas/fechas';
import { NOMBRES_CATEGORIA } from '@/seed/catalogo';
import { NOTAS_LEGALES } from '@/config/textos/notas';
import { ETIQUETA_CATEGORIA_CXP, etiquetaCategoriaGasto } from '@/config/textos/categorias';
import {
  hechosEnFechas,
  hechosEnRango,
  hechosFiltrados,
  nombreCliente,
  nombreEmpleado,
  resumirHechos,
  selAsistencia,
  selClientes,
  selComisiones,
  selCostoAterrizado,
  selCuentasPorCobrar,
  selCuentasPorPagar,
  selEstadoResultados,
  selGastos,
  selImportaciones,
  selKardex,
  selResumenSesion,
  selSegmentos,
  selValorizacion,
  selVentas,
  separadoCanceladoEnSuMes,
  type FiltroVentas,
} from '@/selectores';
import type { DefinicionReporte, FiltrosReporte, HojaReporte, IdReporte } from './tipos';

/**
 * DEFINICIONES ÚNICAS de reportes (PLAN 5.12, 7.15, T9; dueño F2-B). Cada reporte se define UNA vez: filtros,
 * columnas, filas desde selectores y totales. Los botones "Exportar" de los módulos (A2 kardex, A3 ventas,
 * B1 importaciones, C1 nómina) y el centro de reportes (D4) llaman a esta misma definición con
 * `<BotonExportar reporte>`: un solo cálculo de filas y cero descuadres. Las 12 de PRD 7.15 + "Exportar para tu
 * contador". Los totales de dinero salen de los mismos selectores que muestran las pantallas.
 */

const ETIQUETA_ESTADO_VENTA = {
  pagada: 'Pagada',
  separado: 'Separado',
  credito: 'Crédito',
  devuelta: 'Devuelta',
  devuelta_parcial: 'Devuelta parcial',
  anulada: 'Anulada',
} as const;

const enLocal = (f: FiltrosReporte, localId: Id | null) => f.localId === 'todos' || localId === f.localId;
const nombreLocal = (e: EstadoDominio, id: Id | null) => (id ? (e.locales[id]?.nombre ?? id) : 'General');

/** Filtro de la lista de ventas (A3) que corresponde a los filtros del reporte. */
function filtroVentasDe(f: FiltrosReporte): FiltroVentas {
  const r: FiltroVentas = { desde: f.desde, hasta: f.hasta, localId: f.localId };
  if (f.vendedorId) r.vendedorId = f.vendedorId;
  if (f.clienteId) r.clienteId = f.clienteId;
  if (f.medio) r.medio = f.medio;
  if (f.canal) r.canal = f.canal;
  if (f.estado) r.estado = f.estado;
  if (f.productoId) r.productoId = f.productoId;
  if (f.texto?.trim()) r.texto = f.texto.trim();
  return r;
}

const anuladaOCanceladaEnSuMes = (e: EstadoDominio, ventaId: Id) => {
  const v = e.ventas[ventaId];
  return !v || !!v.anulacion || separadoCanceladoEnSuMes(v);
};

function ventas(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const filtro = filtroVentasDe(f);
  const r = selVentas(e, filtro);
  const detalle: HojaReporte = {
    nombre: 'Ventas detalladas',
    columnas: [
      { clave: 'numero', titulo: 'Venta', tipo: 'texto' },
      { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
      { clave: 'local', titulo: 'Local', tipo: 'texto' },
      { clave: 'vendedor', titulo: 'Vendedor', tipo: 'texto' },
      { clave: 'cliente', titulo: 'Cliente', tipo: 'texto' },
      { clave: 'canal', titulo: 'Canal', tipo: 'texto' },
      { clave: 'estado', titulo: 'Estado', tipo: 'texto' },
      { clave: 'unidades', titulo: 'Unidades', tipo: 'entero' },
      { clave: 'descuentos', titulo: 'Descuentos', tipo: 'moneda' },
      { clave: 'total', titulo: 'Total con IVA', tipo: 'moneda' },
      { clave: 'devuelto', titulo: 'Devuelto', tipo: 'moneda' },
      { clave: 'saldo', titulo: 'Saldo', tipo: 'moneda' },
    ],
    filas: r.filas.map((x) => ({
      numero: x.numero,
      fecha: x.ts.slice(0, 10),
      local: nombreLocal(e, x.localId),
      vendedor: nombreEmpleado(e.empleados[x.vendedorId]),
      cliente: x.clienteId ? nombreCliente(e.clientes[x.clienteId]) : 'Consumidor final',
      canal: x.canal,
      estado: e.ventas[x.id]?.separado?.cerrado?.resultado === 'cancelado' ? 'Separado cancelado' : ETIQUETA_ESTADO_VENTA[x.estado],
      unidades: x.unidades,
      descuentos: x.descuentos,
      // Lo que esta venta suma a "Vendido con IVA" (= selVentas.totales.ventas): 0 si se anuló o si es un separado
      // cancelado en su mismo mes; un separado cancelado en un mes posterior sí fue venta de su periodo (V4).
      total: anuladaOCanceladaEnSuMes(e, x.id) ? 0 : x.total,
      devuelto: x.devuelto,
      saldo: x.saldo,
    })),
    totales: { unidades: 'suma', descuentos: 'suma', total: 'suma', devuelto: 'suma', saldo: 'suma' },
  };
  // Resumen por día y local (V4: devoluciones y cancelaciones en su fecha).
  const hechos = hechosFiltrados(e, filtro);
  const grupos = new Map<string, typeof hechos>();
  for (const h of hechos) {
    const k = `${h.fecha}|${h.localId}`;
    const g = grupos.get(k);
    if (g) g.push(h);
    else grupos.set(k, [h]);
  }
  const resumen: HojaReporte = {
    nombre: 'Ventas resumidas',
    columnas: [
      { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
      { clave: 'local', titulo: 'Local', tipo: 'texto' },
      { clave: 'numVentas', titulo: 'Ventas', tipo: 'entero' },
      { clave: 'ventas', titulo: 'Vendido con IVA', tipo: 'moneda' },
      { clave: 'devoluciones', titulo: 'Devoluciones', tipo: 'moneda' },
      { clave: 'netas', titulo: 'Ventas netas', tipo: 'moneda' },
      { clave: 'unidades', titulo: 'Unidades', tipo: 'entero' },
      { clave: 'ticket', titulo: 'Ticket promedio', tipo: 'moneda' },
    ],
    filas: [...grupos.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([k, hs]) => {
        const s = resumirHechos(hs);
        return {
          fecha: k.split('|')[0] ?? '',
          local: nombreLocal(e, k.split('|')[1] ?? null),
          numVentas: s.numVentas,
          ventas: s.ventas,
          devoluciones: s.devoluciones,
          netas: s.netas,
          unidades: s.unidades,
          ticket: s.ticket,
        };
      }),
    totales: { numVentas: r.totales.numVentas, ventas: 'suma', devoluciones: 'suma', netas: 'suma', unidades: 'suma', ticket: r.totales.ticket },
  };
  return [detalle, resumen];
}

function cierreCaja(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const sesiones = Object.values(e.sesionesCaja)
    .filter((s) => s.abierta.ts.slice(0, 10) >= f.desde && s.abierta.ts.slice(0, 10) <= f.hasta && enLocal(f, s.localId))
    .sort((a, b) => (a.abierta.ts < b.abierta.ts ? -1 : a.abierta.ts > b.abierta.ts ? 1 : a.localId < b.localId ? -1 : 1));
  return [
    {
      nombre: 'Cierres de caja',
      columnas: [
        { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
        { clave: 'local', titulo: 'Local', tipo: 'texto' },
        { clave: 'abrio', titulo: 'Abrió', tipo: 'texto' },
        { clave: 'cerro', titulo: 'Cerró', tipo: 'texto' },
        { clave: 'base', titulo: 'Base', tipo: 'moneda' },
        { clave: 'efectivo', titulo: 'Ventas en efectivo', tipo: 'moneda' },
        { clave: 'egresos', titulo: 'Egresos', tipo: 'moneda' },
        { clave: 'esperado', titulo: 'Esperado', tipo: 'moneda' },
        { clave: 'contado', titulo: 'Contado', tipo: 'moneda' },
        { clave: 'diferencia', titulo: 'Diferencia', tipo: 'moneda' },
        { clave: 'revisado', titulo: 'Revisado', tipo: 'texto' },
      ],
      filas: sesiones.map((s) => {
        const r = selResumenSesion(e, { sesionId: s.id });
        return {
          fecha: s.abierta.ts.slice(0, 10),
          local: nombreLocal(e, s.localId),
          abrio: r?.abrio ?? '',
          cerro: r?.cerro ?? 'Abierta',
          base: s.abierta.baseInicial,
          efectivo: r?.porMedio.efectivo ?? 0,
          egresos: r?.egresos ?? 0,
          esperado: r?.esperado ?? 0,
          contado: s.cierre?.efectivoContado ?? null,
          diferencia: s.cierre?.diferencia ?? null,
          revisado: s.revision ? 'Sí' : s.cierre ? 'No' : '—',
        };
      }),
      totales: { efectivo: 'suma', egresos: 'suma', diferencia: 'suma' },
    },
  ];
}

function inventario(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const locales = Object.values(e.locales)
    .filter((l) => !l.eliminadoEn && (f.localId === 'todos' || l.id === f.localId))
    .sort((a, b) => a.orden - b.orden);
  const verCostos = f.rol !== 'vendedor';
  const filas: HojaReporte['filas'] = [];
  for (const v of Object.values(e.variantes)) {
    if (v.eliminadoEn) continue;
    const p = e.productos[v.productoId];
    if (!p || p.eliminadoEn) continue;
    const fila: Record<string, string | number | null> = {
      referencia: p.referencia,
      producto: p.nombre,
      sku: v.sku,
      talla: v.talla,
      color: e.colores[v.colorId]?.nombre ?? '',
    };
    let total = 0;
    for (const l of locales) {
      const n = e.agregados.existencias[`${v.id}@${l.id}`] ?? 0;
      fila[`l_${l.id}`] = n;
      total += n;
    }
    if (total === 0) continue;
    fila.total = total;
    if (verCostos) {
      fila.costo = p.costoVigente;
      fila.aCosto = total * p.costoVigente;
    }
    fila.aPrecio = total * p.precioVenta;
    filas.push(fila);
  }
  filas.sort((a, b) => (String(a.sku) < String(b.sku) ? -1 : 1));
  const totales: HojaReporte['totales'] = { total: 'suma', aPrecio: 'suma' };
  for (const l of locales) if (totales) totales[`l_${l.id}`] = 'suma';
  if (verCostos && totales) totales.aCosto = 'suma';
  const existencias: HojaReporte = {
    nombre: 'Existencias por local',
    columnas: [
      { clave: 'referencia', titulo: 'Referencia', tipo: 'texto' },
      { clave: 'producto', titulo: 'Producto', tipo: 'texto' },
      { clave: 'sku', titulo: 'SKU', tipo: 'texto' },
      { clave: 'talla', titulo: 'Talla', tipo: 'texto' },
      { clave: 'color', titulo: 'Color', tipo: 'texto' },
      ...locales.map((l) => ({ clave: `l_${l.id}`, titulo: l.nombre, tipo: 'entero' as const })),
      { clave: 'total', titulo: 'Total', tipo: 'entero' },
      ...(verCostos
        ? [
            { clave: 'costo', titulo: 'Costo unitario', tipo: 'moneda' as const },
            { clave: 'aCosto', titulo: 'Valor a costo', tipo: 'moneda' as const },
          ]
        : []),
      { clave: 'aPrecio', titulo: 'Valor a precio de venta', tipo: 'moneda' },
    ],
    filas,
    totales,
    nota: verCostos ? 'Costo de reposición: última importación aplicada.' : undefined,
  };
  const val = selValorizacion(e, { localId: f.localId });
  const valorizacion: HojaReporte = {
    nombre: 'Inventario valorizado',
    columnas: [
      { clave: 'local', titulo: 'Local', tipo: 'texto' },
      { clave: 'unidades', titulo: 'Unidades', tipo: 'entero' },
      ...(verCostos ? [{ clave: 'aCosto', titulo: 'Valor a costo', tipo: 'moneda' as const }] : []),
      { clave: 'aPrecio', titulo: 'Valor a precio de venta', tipo: 'moneda' },
    ],
    filas: val.porLocal.map((x) => ({ local: x.nombre, unidades: x.unidades, ...(verCostos ? { aCosto: x.aCosto } : {}), aPrecio: x.aPrecio })),
    totales: { unidades: 'suma', ...(verCostos ? { aCosto: 'suma' as const } : {}), aPrecio: 'suma' },
    nota: verCostos ? val.metodo : undefined,
  };
  return [valorizacion, existencias];
}

const TIPO_MOVIMIENTO: Record<string, string> = {
  entrada_importacion: 'Entrada por importación',
  salida_venta: 'Venta',
  salida_separado: 'Separado',
  reingreso_separado: 'Separado cancelado',
  reingreso_anulacion: 'Venta anulada',
  devolucion_cliente: 'Devolución',
  traslado_salida: 'Traslado (salida)',
  traslado_entrada: 'Traslado (entrada)',
  ajuste_conteo: 'Ajuste por conteo',
  ajuste_manual: 'Ajuste manual',
};

function kardex(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const productoId = f.productoId || e.meta.narrativa.productoOxford;
  const p = e.productos[productoId];
  const k = selKardex(e, { productoId, localId: f.localId, desde: f.desde, hasta: f.hasta });
  return [
    {
      nombre: `Kardex ${p?.referencia ?? ''}`.trim(),
      columnas: [
        { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
        { clave: 'hora', titulo: 'Hora', tipo: 'texto' },
        { clave: 'tipo', titulo: 'Movimiento', tipo: 'texto' },
        { clave: 'local', titulo: 'Local', tipo: 'texto' },
        { clave: 'sku', titulo: 'SKU', tipo: 'texto' },
        { clave: 'entrada', titulo: 'Entrada', tipo: 'entero' },
        { clave: 'salida', titulo: 'Salida', tipo: 'entero' },
        { clave: 'saldo', titulo: 'Saldo', tipo: 'entero' },
        ...(f.rol === 'vendedor' ? [] : [{ clave: 'costo', titulo: 'Costo unitario', tipo: 'moneda' as const }]),
      ],
      filas: k.filas.map((x) => ({
        fecha: x.movimiento.ts.slice(0, 10),
        hora: x.movimiento.ts.slice(11, 16),
        tipo: TIPO_MOVIMIENTO[x.movimiento.tipo] ?? x.movimiento.tipo,
        local: nombreLocal(e, x.movimiento.localId),
        sku: e.variantes[x.movimiento.varianteId]?.sku ?? '',
        entrada: x.movimiento.cantidad > 0 ? x.movimiento.cantidad : null,
        salida: x.movimiento.cantidad < 0 ? -x.movimiento.cantidad : null,
        saldo: x.saldo,
        ...(f.rol === 'vendedor' ? {} : { costo: x.movimiento.costoUnitario }),
      })),
      totales: { entrada: 'suma', salida: 'suma', saldo: k.saldoFinal },
      nota: `${p?.nombre ?? ''} · saldo inicial ${k.saldoInicial} · saldo en orden de aplicación (I2).`,
    },
  ];
}

function importaciones(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const filas = selImportaciones(e, { hoy: f.hoy }).filter((x) => !x.esCargaInicial && x.importacion.fechaPedido <= f.hasta && x.llegadaEstimada >= f.desde);
  const costo: HojaReporte['filas'] = [];
  for (const x of filas) {
    const c = selCostoAterrizado(e, { importacionId: x.importacion.id, hoy: f.hoy });
    for (const p of c?.porProductoDetalle ?? [])
      costo.push({
        numero: x.importacion.numero,
        referencia: p.referencia,
        producto: p.nombre,
        unidades: p.unidades,
        costoUnitario: p.costoUnitario,
        costoTotal: p.costoUnitario * p.unidades,
        precio: p.precioVenta,
        margen: p.margenProyectado,
      });
  }
  return [
    {
      nombre: 'Importaciones',
      columnas: [
        { clave: 'numero', titulo: 'Importación', tipo: 'texto' },
        { clave: 'proveedor', titulo: 'Fábrica', tipo: 'texto' },
        { clave: 'estado', titulo: 'Estado', tipo: 'texto' },
        { clave: 'pedido', titulo: 'Pedido', tipo: 'fecha' },
        { clave: 'llegada', titulo: 'Llegada a bodega', tipo: 'fecha' },
        { clave: 'unidades', titulo: 'Unidades', tipo: 'entero' },
        { clave: 'moneda', titulo: 'Moneda', tipo: 'texto' },
        { clave: 'fobOrigen', titulo: 'FOB (moneda de origen)', tipo: 'numero' },
        { clave: 'fobCop', titulo: 'FOB', tipo: 'moneda' },
        { clave: 'retraso', titulo: 'Días de retraso', tipo: 'entero' },
      ],
      filas: filas.map((x) => ({
        numero: x.importacion.numero,
        proveedor: x.proveedorNombre,
        estado: x.importacion.estado,
        pedido: x.importacion.fechaPedido,
        llegada: x.llegadaEstimada,
        unidades: x.unidades,
        moneda: x.importacion.moneda,
        fobOrigen: x.fobOrigen / 100,
        fobCop: x.fobCop,
        retraso: x.retrasoDias,
      })),
      totales: { unidades: 'suma', fobCop: 'suma' },
    },
    {
      nombre: 'Costo aterrizado',
      columnas: [
        { clave: 'numero', titulo: 'Importación', tipo: 'texto' },
        { clave: 'referencia', titulo: 'Referencia', tipo: 'texto' },
        { clave: 'producto', titulo: 'Producto', tipo: 'texto' },
        { clave: 'unidades', titulo: 'Unidades', tipo: 'entero' },
        { clave: 'costoUnitario', titulo: 'Costo aterrizado por prenda', tipo: 'moneda' },
        { clave: 'costoTotal', titulo: 'Costo aterrizado total', tipo: 'moneda' },
        { clave: 'precio', titulo: 'Precio de venta', tipo: 'moneda' },
        { clave: 'margen', titulo: 'Margen proyectado', tipo: 'porcentaje' },
      ],
      filas: costo,
      totales: { unidades: 'suma', costoTotal: 'suma' },
      nota: `${NOTAS_LEGALES.aduanero} Costo de reposición: última importación aplicada.`,
    },
  ];
}

function cuentas(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const pp = selCuentasPorPagar(e, { hoy: f.hoy, estado: 'pendientes', localId: f.localId });
  const pc = selCuentasPorCobrar(e, { hoy: f.hoy, localId: f.localId });
  return [
    {
      nombre: 'Por pagar',
      columnas: [
        { clave: 'numero', titulo: 'Cuenta', tipo: 'texto' },
        { clave: 'tercero', titulo: 'Tercero', tipo: 'texto' },
        { clave: 'concepto', titulo: 'Concepto', tipo: 'texto' },
        { clave: 'categoria', titulo: 'Categoría', tipo: 'texto' },
        { clave: 'vence', titulo: 'Vence', tipo: 'fecha' },
        { clave: 'estado', titulo: 'Estado', tipo: 'texto' },
        { clave: 'moneda', titulo: 'Moneda de origen', tipo: 'texto' },
        { clave: 'saldo', titulo: 'Saldo', tipo: 'moneda' },
      ],
      filas: pp.filas.map((x) => ({
        numero: x.cxp.numero,
        tercero: x.cxp.terceroNombre,
        concepto: x.cxp.concepto,
        categoria: ETIQUETA_CATEGORIA_CXP[x.cxp.categoria] ?? x.cxp.categoria,
        vence: x.fechaPago,
        estado: estadoCxP(x.cxp, f.hoy),
        moneda: x.cxp.moneda,
        saldo: x.saldoCop,
      })),
      totales: { saldo: 'suma' },
      nota: 'Saldos en moneda extranjera convertidos con la tasa vigente.',
    },
    {
      nombre: 'Por cobrar',
      columnas: [
        { clave: 'venta', titulo: 'Venta', tipo: 'texto' },
        { clave: 'cliente', titulo: 'Cliente', tipo: 'texto' },
        { clave: 'local', titulo: 'Local', tipo: 'texto' },
        { clave: 'tipo', titulo: 'Tipo', tipo: 'texto' },
        { clave: 'limite', titulo: 'Fecha límite', tipo: 'fecha' },
        { clave: 'total', titulo: 'Total', tipo: 'moneda' },
        { clave: 'abonado', titulo: 'Abonado', tipo: 'moneda' },
        { clave: 'saldo', titulo: 'Saldo', tipo: 'moneda' },
      ],
      filas: pc.filas.map((x) => ({
        venta: x.numeroVenta,
        cliente: x.clienteId ? nombreCliente(e.clientes[x.clienteId]) : 'Consumidor final',
        local: nombreLocal(e, x.localId),
        tipo: x.tipo === 'separado' ? 'Separado' : 'Crédito',
        limite: x.fechaLimite,
        total: x.total,
        abonado: x.abonado,
        saldo: x.saldo,
      })),
      totales: { total: 'suma', abonado: 'suma', saldo: 'suma' },
    },
  ];
}

function gastos(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const g = selGastos(e, { desde: f.desde, hasta: f.hasta, localId: f.localId });
  const porCat = new Map<string, { total: number; iva: number; n: number }>();
  for (const x of g.filas) {
    const a = porCat.get(x.categoria) ?? { total: 0, iva: 0, n: 0 };
    a.total += x.valor;
    a.iva += x.iva;
    a.n += 1;
    porCat.set(x.categoria, a);
  }
  return [
    {
      nombre: 'Gastos por categoría',
      columnas: [
        { clave: 'categoria', titulo: 'Categoría', tipo: 'texto' },
        { clave: 'n', titulo: 'Gastos', tipo: 'entero' },
        { clave: 'sinIva', titulo: 'Valor sin IVA', tipo: 'moneda' },
        { clave: 'iva', titulo: 'IVA', tipo: 'moneda' },
        { clave: 'total', titulo: 'Total', tipo: 'moneda' },
      ],
      filas: [...porCat.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([c, x]) => ({ categoria: etiquetaCategoriaGasto(c), n: x.n, sinIva: x.total - x.iva, iva: x.iva, total: x.total })),
      totales: { n: 'suma', sinIva: 'suma', iva: 'suma', total: 'suma' },
    },
    {
      nombre: 'Detalle de gastos',
      columnas: [
        { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
        { clave: 'local', titulo: 'Local', tipo: 'texto' },
        { clave: 'categoria', titulo: 'Categoría', tipo: 'texto' },
        { clave: 'concepto', titulo: 'Concepto', tipo: 'texto' },
        { clave: 'estado', titulo: 'Pago', tipo: 'texto' },
        { clave: 'iva', titulo: 'IVA', tipo: 'moneda' },
        { clave: 'valor', titulo: 'Total', tipo: 'moneda' },
      ],
      filas: g.filas.map((x) => ({
        fecha: x.fecha,
        local: nombreLocal(e, x.localId),
        categoria: etiquetaCategoriaGasto(x.categoria),
        concepto: x.concepto,
        estado: x.estadoPago === 'pagado' ? 'Pagado' : 'Por pagar',
        iva: x.iva,
        valor: x.valor,
      })),
      totales: { iva: 'suma', valor: 'suma' },
    },
  ];
}

function resultados(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const locales = Object.values(e.locales).filter((l) => l.vende && !l.eliminadoEn).sort((a, b) => a.orden - b.orden);
  const cols = f.localId === 'todos' ? [...locales.map((l) => l.id), 'todos'] : [f.localId];
  const er = Object.fromEntries(cols.map((c) => [c, selEstadoResultados(e, { desde: f.desde, hasta: f.hasta, localId: c, prorratear: c !== 'todos' })]));
  // La columna Total reparte igual que los locales: "gastos operativos del local" es la suma de los locales y los
  // generales (los que ningún local explica: administración, bodega) son el resto del gasto del negocio. Así la
  // columna Total suma lo mismo que las de los locales y la utilidad operativa cuadra fila a fila.
  const porLocal = locales.filter((l) => er[l.id]);
  const sumaLocales = (k: 'gastosOperativos' | 'gastosGeneralesProrrateados') => porLocal.reduce((a, l) => a + (er[l.id]?.[k] ?? 0), 0);
  const gastoNegocio = (er['todos']?.gastosOperativos ?? 0) + (er['todos']?.gastosGeneralesProrrateados ?? 0);
  const totalOperativos = sumaLocales('gastosOperativos');
  const total = {
    gastosOperativos: totalOperativos,
    gastosGeneralesProrrateados: gastoNegocio - totalOperativos,
    utilidadOperativa: er['todos']?.utilidadOperativa ?? 0,
  };
  const valor = (c: string, k: keyof typeof total | 'ventasNetas' | 'costoVentas' | 'utilidadBruta'): number => {
    if (c === 'todos' && porLocal.length > 0 && (k === 'gastosOperativos' || k === 'gastosGeneralesProrrateados' || k === 'utilidadOperativa')) return total[k];
    return er[c]?.[k] ?? 0;
  };
  const linea = (concepto: string, k: 'ventasNetas' | 'costoVentas' | 'utilidadBruta' | 'gastosOperativos' | 'gastosGeneralesProrrateados' | 'utilidadOperativa') =>
    Object.fromEntries([['concepto', concepto], ...cols.map((c) => [c, valor(c, k)])]) as Record<string, string | number>;
  return [
    {
      nombre: 'Estado de resultados',
      columnas: [
        { clave: 'concepto', titulo: 'Concepto', tipo: 'texto' },
        ...cols.map((c) => ({ clave: c, titulo: c === 'todos' ? 'Total' : nombreLocal(e, c), tipo: 'moneda' as const })),
      ],
      filas: [
        linea('Ventas netas sin IVA', 'ventasNetas'),
        linea('Costo de la mercancía vendida', 'costoVentas'),
        linea('Utilidad bruta', 'utilidadBruta'),
        linea('Gastos operativos del local', 'gastosOperativos'),
        linea('Gastos generales prorrateados', 'gastosGeneralesProrrateados'),
        linea('Utilidad operativa', 'utilidadOperativa'),
      ],
      totales: null,
      nota: 'Las compras de mercancía no son gasto: son inventario. Gastos generales prorrateados por participación en las ventas.',
    },
  ];
}

function nomina(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const liqs = Object.values(e.liquidaciones)
    .filter((l) => (f.liquidacionId ? l.id === f.liquidacionId : l.periodo.fin >= f.desde && l.periodo.fin <= f.hasta))
    .sort((a, b) => (a.periodo.fin < b.periodo.fin ? -1 : 1));
  const filas: HojaReporte['filas'] = [];
  for (const l of liqs)
    for (const x of l.lineas) {
      if (!enLocal(f, x.localId)) continue;
      filas.push({
        periodo: l.periodo.etiqueta,
        empleado: nombreEmpleado(e.empleados[x.empleadoId]),
        local: nombreLocal(e, x.localId),
        tipo: x.tipo === 'laboral' ? 'Laboral' : 'Prestación de servicios',
        dias: x.insumos.diasLaborados,
        devengado: x.laboral?.totalDevengado ?? x.prestacion?.totalBruto ?? 0,
        deducciones: x.laboral?.totalDeducciones ?? x.prestacion?.retencionFuente ?? 0,
        neto: x.netoAPagar,
        aportes: x.laboral?.totalAportes ?? 0,
        provisiones: x.laboral?.totalProvisiones ?? 0,
        costo: x.costoEmpleador,
      });
    }
  return [
    {
      nombre: 'Nómina',
      columnas: [
        { clave: 'periodo', titulo: 'Periodo', tipo: 'texto' },
        { clave: 'empleado', titulo: 'Empleado', tipo: 'texto' },
        { clave: 'local', titulo: 'Local', tipo: 'texto' },
        { clave: 'tipo', titulo: 'Vinculación', tipo: 'texto' },
        { clave: 'dias', titulo: 'Días', tipo: 'entero' },
        { clave: 'devengado', titulo: 'Devengado', tipo: 'moneda' },
        { clave: 'deducciones', titulo: 'Deducciones', tipo: 'moneda' },
        { clave: 'neto', titulo: 'Neto a pagar', tipo: 'moneda' },
        { clave: 'aportes', titulo: 'Aportes del empleador', tipo: 'moneda' },
        { clave: 'provisiones', titulo: 'Provisiones', tipo: 'moneda' },
        { clave: 'costo', titulo: 'Costo para el negocio', tipo: 'moneda' },
      ],
      filas,
      totales: { devengado: 'suma', deducciones: 'suma', neto: 'suma', aportes: 'suma', provisiones: 'suma', costo: 'suma' },
      nota: `${NOTAS_LEGALES.nomina} Nómina electrónica: transmitida (simulación).`,
    },
  ];
}

function asistencia(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const a = selAsistencia(e, { desde: f.desde, hasta: f.hasta, ahora: f.ahora, localId: f.localId });
  return [
    {
      nombre: 'Asistencia por empleado',
      columnas: [
        { clave: 'empleado', titulo: 'Empleado', tipo: 'texto' },
        { clave: 'turnos', titulo: 'Turnos', tipo: 'entero' },
        { clave: 'aTiempo', titulo: 'A tiempo', tipo: 'entero' },
        { clave: 'tardes', titulo: 'Llegadas tarde', tipo: 'entero' },
        { clave: 'minutosTarde', titulo: 'Minutos tarde', tipo: 'entero' },
        { clave: 'ausencias', titulo: 'Ausencias', tipo: 'entero' },
        { clave: 'horas', titulo: 'Horas trabajadas', tipo: 'numero' },
        { clave: 'extras', titulo: 'Horas extra', tipo: 'numero' },
      ],
      filas: a.resumen.map((x) => ({
        empleado: x.nombre,
        turnos: x.turnos,
        aTiempo: x.aTiempo,
        tardes: x.tardes,
        minutosTarde: x.minutosTarde,
        ausencias: x.ausencias,
        horas: Math.round(x.horasTrabajadas * 100) / 100,
        extras: Math.round(x.horasExtra * 100) / 100,
      })),
      totales: { turnos: 'suma', aTiempo: 'suma', tardes: 'suma', minutosTarde: 'suma', ausencias: 'suma', horas: 'suma', extras: 'suma' },
    },
  ];
}

function comisiones(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const mes = mesDe(f.hasta);
  const c = selComisiones(e, { mes, hoy: f.hoy < f.hasta ? f.hoy : f.hasta, empleadoId: f.rol === 'vendedor' ? (f.vendedorId ?? undefined) : undefined }).filter(
    (x) => enLocal(f, x.localId),
  );
  return [
    {
      nombre: 'Comisiones',
      columnas: [
        { clave: 'vendedor', titulo: 'Vendedor', tipo: 'texto' },
        { clave: 'local', titulo: 'Local', tipo: 'texto' },
        { clave: 'esquema', titulo: 'Esquema', tipo: 'texto' },
        { clave: 'ventas', titulo: 'Ventas con IVA', tipo: 'moneda' },
        { clave: 'base', titulo: 'Base comisionable', tipo: 'moneda' },
        { clave: 'comision', titulo: 'Comisión', tipo: 'moneda' },
      ],
      filas: c.map((x) => ({
        vendedor: x.nombre,
        local: nombreLocal(e, x.localId),
        esquema: x.esquema?.nombre ?? '',
        ventas: x.ventasConIva,
        base: x.base,
        comision: x.comision.total,
      })),
      totales: { ventas: 'suma', base: 'suma', comision: 'suma' },
      nota: `Mes ${mes}. La base es la venta sin IVA menos devoluciones (P1).`,
    },
    {
      nombre: 'Detalle por venta',
      columnas: [
        { clave: 'vendedor', titulo: 'Vendedor', tipo: 'texto' },
        { clave: 'venta', titulo: 'Venta', tipo: 'texto' },
        { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
        { clave: 'tipo', titulo: 'Tipo', tipo: 'texto' },
        { clave: 'base', titulo: 'Base', tipo: 'moneda' },
      ],
      filas: c.flatMap((x) => x.detalle.map((d) => ({ vendedor: x.nombre, venta: d.numero, fecha: d.fecha, tipo: d.tipo, base: d.base }))),
      totales: { base: 'suma' },
    },
  ];
}

function clientes(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const lista = selClientes(e, { hoy: f.hoy, localId: f.localId, vendedorId: f.rol === 'vendedor' ? (f.vendedorId ?? undefined) : undefined });
  const seg = selSegmentos(e, { hoy: f.hoy });
  return [
    {
      nombre: 'Clientes',
      columnas: [
        { clave: 'cliente', titulo: 'Cliente', tipo: 'texto' },
        { clave: 'celular', titulo: 'Celular', tipo: 'texto' },
        { clave: 'segmento', titulo: 'Segmento', tipo: 'texto' },
        { clave: 'compras', titulo: 'Compras', tipo: 'entero' },
        { clave: 'valor', titulo: 'Valor histórico', tipo: 'moneda' },
        { clave: 'ticket', titulo: 'Ticket promedio', tipo: 'moneda' },
        { clave: 'ultima', titulo: 'Última compra', tipo: 'fecha' },
        { clave: 'local', titulo: 'Local habitual', tipo: 'texto' },
      ],
      filas: lista.map((x) => ({
        cliente: nombreCliente(x.cliente),
        celular: x.cliente.celular,
        segmento: x.metricas.segmento,
        compras: x.metricas.compras,
        valor: x.metricas.valor,
        ticket: x.metricas.ticket,
        ultima: x.metricas.ultimaCompra,
        local: nombreLocal(e, x.metricas.localHabitualId),
      })),
      totales: { compras: 'suma', valor: 'suma' },
    },
    {
      nombre: 'Segmentos',
      columnas: [
        { clave: 'segmento', titulo: 'Segmento', tipo: 'texto' },
        { clave: 'clientes', titulo: 'Clientes', tipo: 'entero' },
      ],
      filas: Object.entries(seg).map(([s, n]) => ({ segmento: s, clientes: n })),
      totales: { clientes: 'suma' },
    },
  ];
}

/** "Exportar para tu contador" (5.12, C9): ventas, compras e importaciones, gastos, nómina e IVA. */
function contador(e: EstadoDominio, f: FiltrosReporte): HojaReporte[] {
  const nota = 'Valores ilustrativos de la demo · se validan con tu contador.';
  const hechos = hechosEnRango(hechosEnFechas(e, { desde: f.desde, hasta: f.hasta }), f.desde, f.hasta, f.localId);
  const dias = rangoFechas(f.desde, f.hasta);
  const ventasDia = dias.map((d) => {
    const s = resumirHechos(hechos.filter((h) => h.fecha === d));
    return { fecha: d, ventas: s.numVentas, base: s.baseNeta, iva: s.netas - s.baseNeta, total: s.netas };
  });
  const compras: HojaReporte['filas'] = [];
  for (const x of selImportaciones(e, { hoy: f.hoy })) {
    const r = x.importacion.recepcion;
    if (!r || r.fecha < f.desde || r.fecha > f.hasta) continue;
    const c = selCostoAterrizado(e, { importacionId: x.importacion.id, hoy: f.hoy });
    compras.push({
      fecha: r.fecha,
      documento: x.importacion.numero,
      proveedor: x.proveedorNombre,
      fob: c?.fobCop ?? 0,
      tributos: c?.tributos ?? 0,
      ivaImportacion: c?.ivaImportacion ?? 0,
      total: c?.total ?? 0,
    });
  }
  const g = selGastos(e, { desde: f.desde, hasta: f.hasta, localId: f.localId });
  const ivaDescontableGastos = g.iva;
  const ivaImportaciones = compras.reduce((a, x) => a + Number(x.ivaImportacion ?? 0), 0);
  const ivaGenerado = ventasDia.reduce((a, x) => a + x.iva, 0);
  const nominaH = nomina(e, { ...f, liquidacionId: null })[0];
  return [
    {
      nombre: 'Ventas',
      columnas: [
        { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
        { clave: 'ventas', titulo: 'Número de ventas', tipo: 'entero' },
        { clave: 'base', titulo: 'Base gravable', tipo: 'moneda' },
        { clave: 'iva', titulo: 'IVA generado', tipo: 'moneda' },
        { clave: 'total', titulo: 'Total', tipo: 'moneda' },
      ],
      filas: ventasDia,
      totales: { ventas: 'suma', base: 'suma', iva: 'suma', total: 'suma' },
      nota,
    },
    {
      nombre: 'Compras e importaciones',
      columnas: [
        { clave: 'fecha', titulo: 'Fecha de recepción', tipo: 'fecha' },
        { clave: 'documento', titulo: 'Importación', tipo: 'texto' },
        { clave: 'proveedor', titulo: 'Proveedor', tipo: 'texto' },
        { clave: 'fob', titulo: 'FOB', tipo: 'moneda' },
        { clave: 'tributos', titulo: 'Tributos aduaneros', tipo: 'moneda' },
        { clave: 'ivaImportacion', titulo: 'IVA de importación', tipo: 'moneda' },
        { clave: 'total', titulo: 'Costo aterrizado', tipo: 'moneda' },
      ],
      filas: compras,
      totales: { fob: 'suma', tributos: 'suma', ivaImportacion: 'suma', total: 'suma' },
      nota,
    },
    ...gastos(e, f).map((h) => ({ ...h, nombre: h.nombre === 'Detalle de gastos' ? 'Gastos' : h.nombre, nota })),
    { ...(nominaH as HojaReporte), nota: `${nota} ${NOTAS_LEGALES.nomina}` },
    {
      nombre: 'IVA generado y descontable',
      columnas: [
        { clave: 'concepto', titulo: 'Concepto', tipo: 'texto' },
        { clave: 'valor', titulo: 'Valor', tipo: 'moneda' },
      ],
      filas: [
        { concepto: 'IVA generado en ventas', valor: ivaGenerado },
        { concepto: 'IVA descontable en gastos', valor: -ivaDescontableGastos },
        { concepto: 'IVA descontable en importaciones', valor: -ivaImportaciones },
      ],
      totales: { valor: 'suma' },
      nota: `${nota} ${NOTAS_LEGALES.tributario}`,
    },
  ];
}

export const REPORTES: Record<IdReporte, DefinicionReporte> = {
  ventas: {
    id: 'ventas',
    titulo: 'Ventas detalladas y resumidas',
    descripcion: 'Cada venta del periodo y el resumen por día y local, con devoluciones en su fecha.',
    filtros: ['rango', 'local'],
    roles: ['dueno', 'vendedor'],
    orientacion: 'horizontal',
    hojas: ventas,
  },
  'cierre-caja': {
    id: 'cierre-caja',
    titulo: 'Cierre de caja',
    descripcion: 'Apertura, efectivo, egresos, esperado, contado y diferencia de cada caja.',
    filtros: ['rango', 'local'],
    roles: ['dueno'],
    orientacion: 'horizontal',
    hojas: cierreCaja,
  },
  inventario: {
    id: 'inventario',
    titulo: 'Inventario valorizado y existencias por local',
    descripcion: 'Unidades por talla, color y local, a costo y a precio de venta.',
    filtros: ['local'],
    roles: ['dueno', 'bodega'],
    orientacion: 'horizontal',
    hojas: inventario,
  },
  kardex: {
    id: 'kardex',
    titulo: 'Kárdex por referencia',
    descripcion: 'Entradas, salidas y saldo de una referencia en orden de aplicación.',
    filtros: ['rango', 'local', 'producto'],
    roles: ['dueno', 'bodega'],
    orientacion: 'horizontal',
    hojas: kardex,
  },
  importaciones: {
    id: 'importaciones',
    titulo: 'Importaciones y costo aterrizado',
    descripcion: 'Pedidos a las fábricas, su estado y el costo real por prenda.',
    filtros: ['rango'],
    roles: ['dueno'],
    orientacion: 'horizontal',
    notaLegal: 'aduanero',
    hojas: importaciones,
  },
  cuentas: {
    id: 'cuentas',
    titulo: 'Cuentas por pagar y por cobrar',
    descripcion: 'Lo que debes y lo que te deben hoy.',
    filtros: ['local'],
    roles: ['dueno'],
    orientacion: 'horizontal',
    hojas: cuentas,
  },
  gastos: {
    id: 'gastos',
    titulo: 'Gastos por categoría',
    descripcion: 'Gastos del periodo por categoría y su detalle.',
    filtros: ['rango', 'local'],
    roles: ['dueno'],
    orientacion: 'vertical',
    hojas: gastos,
  },
  resultados: {
    id: 'resultados',
    titulo: 'Estado de resultados simplificado',
    descripcion: 'Ventas, costo, utilidad bruta, gastos y utilidad operativa por local.',
    filtros: ['rango', 'local'],
    roles: ['dueno'],
    orientacion: 'vertical',
    hojas: resultados,
  },
  nomina: {
    id: 'nomina',
    titulo: 'Nómina del periodo y desprendibles',
    descripcion: 'Devengado, deducciones, neto, aportes y costo para el negocio.',
    filtros: ['rango', 'local', 'liquidacion'],
    roles: ['dueno'],
    orientacion: 'horizontal',
    notaLegal: 'nomina',
    hojas: nomina,
  },
  asistencia: {
    id: 'asistencia',
    titulo: 'Asistencia',
    descripcion: 'Turnos, llegadas tarde, ausencias y horas trabajadas.',
    filtros: ['rango', 'local'],
    roles: ['dueno'],
    orientacion: 'horizontal',
    hojas: asistencia,
  },
  comisiones: {
    id: 'comisiones',
    titulo: 'Comisiones por vendedor',
    descripcion: 'Base sin IVA, comisión del mes y el detalle por venta.',
    filtros: ['rango', 'local'],
    roles: ['dueno', 'vendedor'],
    orientacion: 'vertical',
    hojas: comisiones,
  },
  clientes: {
    id: 'clientes',
    titulo: 'Clientes y segmentos',
    descripcion: 'Compras, valor histórico y segmento de cada cliente.',
    filtros: ['local'],
    roles: ['dueno', 'vendedor'],
    orientacion: 'horizontal',
    hojas: clientes,
  },
  contador: {
    id: 'contador',
    titulo: 'Exportar para tu contador',
    descripcion: 'Un solo Excel con ventas, compras e importaciones, gastos, nómina e IVA del periodo.',
    filtros: ['rango', 'local'],
    roles: ['dueno'],
    orientacion: 'horizontal',
    notaLegal: 'tributario',
    hojas: contador,
  },
};

export const IDS_REPORTES = Object.keys(REPORTES) as IdReporte[];

/** Categoría legible (utilidad para las hojas). */
export function nombreCategoria(c: Categoria): string {
  return NOMBRES_CATEGORIA[c];
}

/** Rango por defecto de los reportes: del día 1 del mes hasta hoy. */
export function rangoPorDefecto(hoy: FechaISO): { desde: FechaISO; hasta: FechaISO } {
  return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
}

/** Último mes completo respecto de `hoy` (el 1 de octubre: septiembre entero). */
export function rangoUltimoMesCompleto(hoy: FechaISO): { desde: FechaISO; hasta: FechaISO } {
  const [a, m] = hoy.split('-').map(Number) as [number, number];
  const mes = m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
  return rangoDeMes(mes);
}

/**
 * Rango con el que abre cada reporte. El estado de resultados es un cierre de periodo:
 * abre en el último mes completo (con "Hoy" o con 1 día del mes cargarían el arriendo entero a un día y darían
 * pérdidas absurdas). Los demás, del día 1 del mes hasta hoy.
 */
export function rangoPorDefectoDe(id: IdReporte, hoy: FechaISO): { desde: FechaISO; hasta: FechaISO } {
  return id === 'resultados' ? rangoUltimoMesCompleto(hoy) : rangoPorDefecto(hoy);
}

/** Mes completo como rango. */
export function rangoDeMes(mes: string): { desde: FechaISO; hasta: FechaISO } {
  return { desde: `${mes}-01`, hasta: `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}` };
}
