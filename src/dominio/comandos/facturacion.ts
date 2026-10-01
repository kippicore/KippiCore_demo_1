import type { EstadoFactura, Id, NotaCredito } from '../tipos';
import { exigir } from '../errores';
import {
  idNuevo,
  planearFactura,
  planearNotaCredito,
  type PlanDocumento,
  requerirExiste,
  textoObligatorio,
  totalNotasCredito,
} from './comunes';
import { fijarConsecutivo, manejador, marcarEditado } from './tx';

/** Facturación simulada (PLAN 6.14, 6.21): factura electrónica, documento POS y nota crédito. */

export const facturaEmitir = manejador<'factura.emitir', PlanDocumento>({
  validar(estado, d, ctx) {
    idNuevo(estado.facturas, d.facturaId, 'facturaId');
    const v = requerirExiste(estado.ventas, d.ventaId, 'la venta', 'ventaId');
    exigir(!v.anulacion, 'VENTA_ANULADA', `La venta ${v.numero} está anulada.`, 'ventaId');
    exigir(
      v.facturaId === null,
      'YA_FACTURADA',
      `La venta ${v.numero} ya tiene documento electrónico.`,
      'ventaId',
    );
    exigir(
      d.tipo === 'factura_electronica' || d.tipo === 'documento_equivalente_pos',
      'TIPO_INVALIDO',
      'Elige factura electrónica o documento POS.',
      'tipo',
    );
    return planearFactura(estado, ctx, {
      facturaId: d.facturaId,
      tipo: d.tipo,
      adquirente: { ...d.adquirente },
      ventaId: v.id,
      ts: ctx.ts,
      totales: { subtotal: v.subtotal, descuentos: v.descuentos, base: v.base, iva: v.iva, total: v.total },
    });
  },
  escribir(estado, plan, ctx) {
    estado.facturas[plan.factura.id] = plan.factura;
    fijarConsecutivo(estado, plan.tipoConsecutivo, plan.consecutivo);
    const v = estado.ventas[plan.factura.ventaId];
    if (v) {
      v.facturaId = plan.factura.id;
      marcarEditado(v, ctx);
    }
    ctx.emitir({ tipo: 'FacturaEmitida', facturaId: plan.factura.id, ventaId: plan.factura.ventaId });
  },
});

const ANTERIOR: Record<'enviada' | 'aceptada', EstadoFactura> = { enviada: 'generada', aceptada: 'enviada' };

export const facturaAvanzarEstado = manejador<
  'factura.avanzarEstado',
  { id: Id; estado: 'enviada' | 'aceptada' }
>({
  validar(estado, d) {
    const f = requerirExiste(estado.facturas, d.facturaId, 'la factura', 'facturaId');
    exigir(
      d.estado === 'enviada' || d.estado === 'aceptada',
      'ESTADO_INVALIDO',
      'El estado sigue el orden generada → enviada → aceptada.',
      'estado',
    );
    exigir(
      f.estado === ANTERIOR[d.estado],
      'ESTADO_INVALIDO',
      `La factura está ${f.estado}; sigue el orden generada → enviada → aceptada.`,
      'estado',
    );
    return { id: f.id, estado: d.estado };
  },
  escribir(estado, plan, ctx) {
    const f = estado.facturas[plan.id];
    if (!f) return;
    f.estado = plan.estado;
    f.historial.push({ estado: plan.estado, ts: ctx.ts });
    marcarEditado(f, ctx);
    ctx.emitir({ tipo: 'FacturaEstado', facturaId: f.id, estado: plan.estado });
  },
});

export const notaCreditoEmitir = manejador<'notaCredito.emitir', { nota: NotaCredito; consecutivo: number }>({
  validar(estado, d, ctx) {
    const f = requerirExiste(estado.facturas, d.facturaId, 'la factura', 'facturaId');
    const motivo = textoObligatorio(d.motivo, 'motivo', 'Escribe el motivo de la nota crédito.');
    let base: number;
    let valor: number;
    if (d.devolucionId) {
      const dev = requerirExiste(estado.devoluciones, d.devolucionId, 'la devolución', 'devolucionId');
      exigir(
        dev.ventaId === f.ventaId,
        'DEVOLUCION_AJENA',
        'La devolución no es de la venta de esta factura.',
        'devolucionId',
      );
      exigir(
        dev.notaCreditoId === null,
        'YA_ACREDITADA',
        'La devolución ya tiene nota crédito.',
        'devolucionId',
      );
      valor = dev.valorTotal;
      base = dev.lineas.reduce((a, l) => a + l.base, 0);
    } else {
      valor = f.total - totalNotasCredito(estado, f.id);
      let baseAcreditada = 0;
      for (const n of Object.values(estado.notasCredito)) if (n.facturaId === f.id) baseAcreditada += n.base;
      base = f.base - baseAcreditada;
    }
    return planearNotaCredito(estado, ctx, {
      notaId: d.notaId,
      facturaId: f.id,
      devolucionId: d.devolucionId,
      motivo,
      base,
      iva: valor - base,
      valor,
      ts: ctx.ts,
    });
  },
  escribir(estado, plan, ctx) {
    estado.notasCredito[plan.nota.id] = plan.nota;
    fijarConsecutivo(estado, 'nota_credito', plan.consecutivo);
    if (plan.nota.devolucionId) {
      const dev = estado.devoluciones[plan.nota.devolucionId];
      if (dev) dev.notaCreditoId = plan.nota.id;
    }
    ctx.emitir({ tipo: 'NotaCreditoEmitida', notaId: plan.nota.id });
  },
});
