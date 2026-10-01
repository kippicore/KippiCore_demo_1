import type { EstadoDominio, Id, SobreComando } from '@/dominio/tipos';
import { fechaDe } from '@/dominio/reglas/fechas';
import { idGenerado } from '@/dominio/motor/ids';
import { HISTORIA_IMPORTACIONES } from '@/seed/importaciones';
import { DEMANDA_TALLAS } from '@/seed/tallas';
import { masDias } from '../calendario';
import { existencias, type Gen, localVivo, varianteVendible } from '../contexto';
import type { IntencionGen } from '../tipos';

/** Reposición de los miércoles y recepción de traslados (PLAN 7.9). */

const ID_BODEGA = 'bod';

/** Recibe los traslados que llegan hoy (distribución de ayer y reposición de esta mañana). */
export function* materializarRecibirTraslados(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const fecha = fechaDe(it.ts);
  const ids = g.idx.tomar(g.idx.trasladosPorRecibir, fecha);
  if (!ids.length) return;
  const emitir = g.emisor(it);
  for (const id of ids) {
    const t = estado.traslados[id];
    if (!t || t.estado !== 'en_transito') continue;
    if (!localVivo(estado, t.destinoId)) continue;
    yield emitir('traslado.recibir', { trasladoId: id, recibidas: null, nota: null });
  }
}

/**
 * Miércoles 08:00: de la bodega a los locales lo que esté bajo el mínimo, hasta ≈ 2 semanas de demanda esperada.
 * Descuenta lo que ya viene en camino (traslados del usuario o del generador) y, los 10 días previos al ancla,
 * excluye la Oxford azul cielo M (N1).
 */
export function* materializarReposicion(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const fecha = fechaDe(it.ts);
  if (!localVivo(estado, ID_BODEGA)) return;
  const emitir = g.emisor(it);
  const A = g.plan.ancla;
  const [oxProd, oxTalla, oxColor] = HISTORIA_IMPORTACIONES.oxfordM.clave.split('|');
  const oxfordM = g.plan.productoPorId.get(oxProd ?? '')?.variantes[`${oxTalla}|${oxColor}`];
  const excluirOxford = fecha >= masDias(A, -10) && fecha < A;
  // En camino a cada local.
  const enCamino = new Map<string, number>();
  for (const t of Object.values(estado.traslados)) {
    if (t.estado !== 'solicitado' && t.estado !== 'en_transito') continue;
    for (const l of t.lineas) enCamino.set(`${l.varianteId}@${t.destinoId}`, (enCamino.get(`${l.varianteId}@${t.destinoId}`) ?? 0) + l.cantidad);
  }
  const reservado = new Map<Id, number>();
  const d = g.plan.demanda;
  // Primero el local que más vende (la reserva de la bodega no se la llevan los locales lentos).
  const locales = [...g.plan.localesVenta].sort(
    (a, b) => (b.perfil?.ventasDiaBase ?? 0) * (b.perfil?.unidadesPorVenta ?? 0) - (a.perfil?.ventasDiaBase ?? 0) * (a.perfil?.unidadesPorVenta ?? 0),
  );
  for (const local of locales) {
    if (!localVivo(estado, local.id)) continue;
    const lam = d.lambdaEsperado(local, fecha) || d.lambdaEsperado(local, masDias(fecha, 1));
    const unidadesDia = lam * (local.perfil?.unidadesPorVenta ?? 1.4);
    const lineas: { varianteId: Id; cantidad: number }[] = [];
    for (const p of g.plan.productos) {
      if (!d.seVende(p, fecha)) continue;
      const minimo = estado.productos[p.id]?.stockMinimo ?? 2;
      const part = d.participacionEfectiva(local.id, fecha, p.categoria);
      const t = d.productosDe(p.categoria, fecha);
      const totalPeso = t.acumulada[t.acumulada.length - 1] ?? 0;
      if (totalPeso <= 0) continue;
      const porProducto = (unidadesDia * part * p.pesoDemanda) / totalPeso;
      // El local surte la curva completa de lo que vende (≥ 1 unidad en dos semanas); lo demás se pide cuando
      // hace falta.
      if (porProducto * 14 < 1) continue;
      const tallas = DEMANDA_TALLAS[p.curva];
      for (const [clave, v] of Object.entries(p.variantes)) {
        if (excluirOxford && v === oxfordM) continue;
        if (!varianteVendible(estado, v)) continue;
        const [talla, color] = clave.split('|') as [string, Id];
        const porVariante = porProducto * (tallas[talla] ?? 0) * d.fraccionColor(p, color, fecha);
        const objetivo = Math.max(1, Math.round(porVariante * 14));
        const actual = existencias(estado, v, local.id) + (enCamino.get(`${v}@${local.id}`) ?? 0);
        if (actual >= Math.min(minimo, objetivo)) continue;
        const disponible = existencias(estado, v, ID_BODEGA) - (reservado.get(v) ?? 0);
        const cantidad = Math.min(disponible, objetivo - actual);
        if (cantidad <= 0) continue;
        lineas.push({ varianteId: v, cantidad });
        reservado.set(v, (reservado.get(v) ?? 0) + cantidad);
      }
    }
    if (!lineas.length) continue;
    const trasladoId = idGenerado('tr', 'repo', fecha, local.id);
    yield emitir('traslado.solicitar', {
      trasladoId,
      origenId: ID_BODEGA,
      destinoId: local.id,
      lineas,
      motivo: 'Reposición',
      requiereAprobacion: false,
      solicitudId: null,
    });
    if (!estado.traslados[trasladoId]) continue;
    yield emitir('traslado.despachar', { trasladoId });
    g.idx.agregar(g.idx.trasladosPorRecibir, fecha, trasladoId);
  }
}
