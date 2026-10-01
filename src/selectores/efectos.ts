import type { EstadoDominio, Id } from '@/dominio/tipos';
import { mesDe } from '@/dominio/reglas/fechas';
import { rutas } from '@/app/rutas';
import { existencia } from './inventario';
import { selVentasHoyHastaHora } from './ventas';
import { selComisiones } from './personal';
import { selMetricasClientes } from './clientes';
import { selResumenSesion } from './caja';
import { nombreCliente, nombreEmpleado } from './base';

/**
 * "Lo que acaba de pasar" (W1, PLAN 6.23 `efectos.ts`, 5.6.6): cada efecto de una venta medido con los MISMOS
 * selectores sobre el estado de antes y el de después (exacto por construcción; el caché por WeakMap guarda los
 * dos). El POS anima cada cifra de `antes` a `despues` y enlaza con `?resaltar=`.
 */
export interface EfectoVenta {
  clave: 'inventario' | 'ventas_hoy' | 'ventas_hoy_local' | 'comision' | 'cliente' | 'caja';
  etiqueta: string;
  antes: number;
  despues: number;
  formato: 'dinero' | 'entero';
  /** Detalle corto ("sobre la venta sin IVA", "Camisa Oxford entallada · Azul cielo · M"). */
  detalle: string | null;
  enlace: string;
}

export function selEfectosVenta(antes: EstadoDominio, despues: EstadoDominio, ventaId: Id): EfectoVenta[] {
  const v = despues.ventas[ventaId];
  if (!v) return [];
  const hoy = v.ts.slice(0, 10);
  const r: EfectoVenta[] = [];
  const local = despues.locales[v.localId]?.nombre ?? v.localId;
  for (const l of v.lineas) {
    const p = despues.productos[l.productoId];
    r.push({
      clave: 'inventario',
      etiqueta: `Inventario en ${local}`,
      antes: existencia(antes, l.varianteId, v.localId),
      despues: existencia(despues, l.varianteId, v.localId),
      formato: 'entero',
      detalle: l.descripcion,
      enlace: p ? rutas.producto(p.referencia, { resaltar: l.varianteId }) : rutas.inventario(),
    });
  }
  const vhA = selVentasHoyHastaHora(antes, { hoy, ahora: v.ts, localId: 'todos' });
  const vhD = selVentasHoyHastaHora(despues, { hoy, ahora: v.ts, localId: 'todos' });
  r.push({ clave: 'ventas_hoy', etiqueta: 'Ventas de hoy', antes: vhA.hoy.netas, despues: vhD.hoy.netas, formato: 'dinero', detalle: null, enlace: rutas.ventas({ desde: hoy, hasta: hoy, resaltar: v.id }) });
  const vlA = selVentasHoyHastaHora(antes, { hoy, ahora: v.ts, localId: v.localId });
  const vlD = selVentasHoyHastaHora(despues, { hoy, ahora: v.ts, localId: v.localId });
  r.push({ clave: 'ventas_hoy_local', etiqueta: `Ventas de hoy en ${local}`, antes: vlA.hoy.netas, despues: vlD.hoy.netas, formato: 'dinero', detalle: null, enlace: rutas.ventas({ desde: hoy, hasta: hoy, local: v.localId, resaltar: v.id }) });
  const cA = selComisiones(antes, { mes: mesDe(hoy), hoy, empleadoId: v.vendedorId })[0];
  const cD = selComisiones(despues, { mes: mesDe(hoy), hoy, empleadoId: v.vendedorId })[0];
  if (cD?.esquema)
    r.push({
      clave: 'comision',
      etiqueta: `Comisión del mes de ${nombreEmpleado(despues.empleados[v.vendedorId])}`,
      antes: cA?.comision.total ?? 0,
      despues: cD.comision.total,
      formato: 'dinero',
      detalle: cD.esquema.base === 'base_sin_iva' ? 'sobre la venta sin IVA' : 'sobre la venta con IVA',
      enlace: rutas.comisiones({ mes: mesDe(hoy), empleado: v.vendedorId }),
    });
  if (v.clienteId) {
    const mA = selMetricasClientes(antes, { hoy })[v.clienteId];
    const mD = selMetricasClientes(despues, { hoy })[v.clienteId];
    r.push({
      clave: 'cliente',
      etiqueta: `Compras de ${nombreCliente(despues.clientes[v.clienteId])}`,
      antes: mA?.compras ?? 0,
      despues: mD?.compras ?? 0,
      formato: 'entero',
      detalle: mA ? null : 'cliente nuevo',
      enlace: rutas.cliente(v.clienteId, {}),
    });
  }
  const sesion = v.pagos.find((p) => p.sesionCajaId)?.sesionCajaId;
  if (sesion) {
    const sA = selResumenSesion(antes, { sesionId: sesion });
    const sD = selResumenSesion(despues, { sesionId: sesion });
    r.push({ clave: 'caja', etiqueta: `Efectivo esperado en la caja de ${local}`, antes: sA?.esperado ?? 0, despues: sD?.esperado ?? 0, formato: 'dinero', detalle: null, enlace: rutas.caja({ sesion, resaltar: sesion }) });
  }
  return r;
}
