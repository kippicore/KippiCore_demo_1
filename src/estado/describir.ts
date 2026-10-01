import type { EntradaRegistro, EstadoDominio, EstadoImportacion } from '@/dominio/tipos';

/**
 * Frase del toast de una entrada remota (PLAN 5.6.8): se arma con la entrada recibida (no con eventos de dominio,
 * que no existen en una reconstrucción) y con el estado ya reconstruido para resolver nombres.
 */
const ESTADOS: Record<EstadoImportacion, string> = {
  cotizado: 'la cotización',
  pedido_confirmado: 'la confirmación del pedido',
  anticipo_pagado: 'el pago del anticipo',
  en_produccion: 'el inicio de la producción',
  listo_despacho: 'que está listo para despacho',
  saldo_pagado: 'el pago del saldo',
  embarcado: 'el embarque',
  en_transito: 'el tránsito',
  en_puerto: 'la llegada a puerto',
  en_nacionalizacion: 'el inicio de la nacionalización',
  nacionalizado: 'el levante',
  en_transporte_bogota: 'el transporte a Bogotá',
  recibido_bodega: 'la recepción en bodega',
};

function quien(estado: EstadoDominio | null, e: EntradaRegistro): string {
  if (e.rol === 'portal') return 'La agente de aduanas';
  if (e.rol === 'tienda') return 'La tienda web';
  const u = estado?.usuarios[e.usuarioId];
  return u?.nombre ?? 'Otra pestaña';
}

export function describirEntrada(e: EntradaRegistro, estado: EstadoDominio | null): string {
  const c = e.comando;
  switch (c.tipo) {
    case 'importacion.cambiarEstado': {
      const imp = estado?.importaciones[c.datos.importacionId];
      const autor = c.datos.autor ?? quien(estado, e);
      return `${autor} reportó ${ESTADOS[c.datos.estado]} de ${imp?.numero ?? 'una importación'}`;
    }
    case 'venta.registrar': {
      const v = estado?.ventas[c.datos.ventaId];
      const local = estado?.locales[c.datos.localId]?.nombre;
      const canal = c.datos.canal === 'web' ? ' en la tienda web' : local ? ` en ${local}` : '';
      return `Nueva venta${canal}${v ? ` · ${v.numero}` : ''}`;
    }
    case 'traslado.solicitar':
      return `${quien(estado, e)} pidió un traslado`;
    case 'aprobacion.resolver':
      return `${quien(estado, e)} ${c.datos.decision === 'aprobada' ? 'aprobó' : 'rechazó'} una solicitud`;
    case 'caja.cerrar':
      return `${quien(estado, e)} cerró una caja`;
    default:
      return `${quien(estado, e)} hizo un cambio en otra pestaña`;
  }
}
