import type { EstadoDominio, EstadoImportacion, FechaISO, Id, Importacion } from '@/dominio/tipos';
import { indiceEstado, retrasoDias } from '@/dominio/reglas/importaciones';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import { sumarDias } from '@/dominio/reglas/fechas';
import { crearSelector } from './memo';
import { existencia } from './inventario';
import { selRiesgosContratacion } from './personal';

/**
 * Entidades narrativas DINÁMICAS (PLAN 6.23 `narrativa.ts`, 5.6.3, 7.11, R24): parten de `meta.narrativa` y, si
 * la entidad guionada ya se resolvió (la importación avanzó, el saldo se pagó, la caja se revisó), eligen la
 * equivalente de hoy; si no hay ninguna, null. Las alertas, la guía y "Prueba esto" resuelven sus enlaces aquí:
 * nunca se escribe un número de importación a mano.
 */
export interface NarrativaDinamica {
  /** Variante crítica (Oxford azul cielo M) y su producto. */
  varianteCritica: Id | null;
  productoCritico: Id | null;
  /** Local donde se está acabando y local desde donde traer. */
  localEscasez: Id | null;
  localSurtido: Id | null;
  /** Importación que hoy está en puerto (o, si ninguna, en nacionalización o la próxima a llegar). */
  importacionEnPuerto: Id | null;
  /** Importación con más días de retraso hoy. */
  importacionRetrasada: Id | null;
  importacionEnTransito: Id | null;
  importacionEnProduccion: Id | null;
  /** Pago grande más próximo (el saldo a la fábrica, o la cuenta por pagar más grande de los próximos 30 días). */
  cxpGrande: Id | null;
  /** Cierre de anoche con diferencia y sin revisar. */
  sesionCajaFaltante: Id | null;
  /** Cliente VIP que cumple años hoy. */
  clienteCumpleanos: Id | null;
  clienteFrecuente: Id | null;
  empleadoLlegadasTarde: Id | null;
  contratistasRiesgo: Id[];
  solicitudDescuento: Id | null;
  solicitudTraslado: Id | null;
  solicitudAnulacion: Id | null;
  vendedorPersona: Id | null;
  bodegaPersona: Id | null;
  vendedoraEstrella: Id | null;
  proveedorSugerencia: Id | null;
}

const vigentes = (e: EstadoDominio) => Object.values(e.importaciones).filter((i) => !i.eliminadoEn);

function elegir(
  e: EstadoDominio,
  guionada: Id,
  estados: readonly EstadoImportacion[],
  orden: (a: Importacion, b: Importacion) => number,
): Id | null {
  const g = e.importaciones[guionada];
  if (g && !g.eliminadoEn && estados.includes(g.estado)) return g.id;
  return vigentes(e).filter((i) => estados.includes(i.estado)).sort(orden)[0]?.id ?? null;
}

const porLlegada = (a: Importacion, b: Importacion) =>
  a.hitos.recibido_bodega.estimada < b.hitos.recibido_bodega.estimada ? -1 : a.hitos.recibido_bodega.estimada > b.hitos.recibido_bodega.estimada ? 1 : a.numero < b.numero ? -1 : 1;

export const selNarrativa = crearSelector<{ hoy: FechaISO }, NarrativaDinamica>(
  'selNarrativa',
  ['meta', 'importaciones', 'cuentasPorPagar', 'sesionesCaja', 'clientes', 'solicitudes', 'empleados', 'contratos', 'parametros', 'agregados', 'variantes', 'locales', 'tasas', 'proveedores'],
  (e, { hoy }) => {
    const n = e.meta.narrativa;
    // Variante crítica: la guionada si sigue escasa en algún local que vende; si no, ninguna.
    let varianteCritica: Id | null = null;
    let localEscasez: Id | null = null;
    let localSurtido: Id | null = null;
    if (n.varianteOxfordM && e.variantes[n.varianteOxfordM]) {
      const locales = Object.values(e.locales).filter((l) => l.vende && !l.eliminadoEn);
      const escaso = locales.filter((l) => existencia(e, n.varianteOxfordM, l.id) <= 1).sort((a, b) => existencia(e, n.varianteOxfordM, a.id) - existencia(e, n.varianteOxfordM, b.id))[0];
      const surtido = locales.sort((a, b) => existencia(e, n.varianteOxfordM, b.id) - existencia(e, n.varianteOxfordM, a.id))[0];
      if (escaso && surtido && existencia(e, n.varianteOxfordM, surtido.id) > 2) {
        varianteCritica = n.varianteOxfordM;
        localEscasez = escaso.id;
        localSurtido = surtido.id;
      }
    }
    const enPuerto =
      elegir(e, n.importacionEnPuerto, ['en_puerto'], porLlegada) ??
      elegir(e, n.importacionEnPuerto, ['en_nacionalizacion', 'nacionalizado', 'en_transporte_bogota'], porLlegada);
    const retrasadas = vigentes(e)
      .filter((i) => i.estado !== 'recibido_bodega' && retrasoDias(i, hoy) > 0)
      .sort((a, b) => retrasoDias(b, hoy) - retrasoDias(a, hoy) || (a.numero < b.numero ? -1 : 1));
    const guionRet = e.importaciones[n.importacionRetrasada];
    const importacionRetrasada = guionRet && guionRet.estado !== 'recibido_bodega' && retrasoDias(guionRet, hoy) > 0 ? guionRet.id : (retrasadas[0]?.id ?? null);
    const enTransito = elegir(e, n.importacionEnTransito, ['embarcado', 'en_transito'], porLlegada);
    const enProduccion = elegir(e, n.importacionEnProduccion, ['en_produccion', 'listo_despacho', 'anticipo_pagado'], porLlegada);
    // Pago grande: el saldo guionado si sigue pendiente; si no, la cuenta por pagar con mayor saldo en 30 días.
    let cxpGrande: Id | null = null;
    const sg = e.cuentasPorPagar[n.cxpSaldoGrande];
    if (sg && !sg.eliminadoEn && saldoCxP(sg) > 0) cxpGrande = sg.id;
    else {
      const hasta = sumarDias(hoy, 30);
      const tasa = (m: string) => (m === 'COP' ? 1 : Object.values(e.tasas).filter((t) => t.moneda === m && t.fecha <= hoy).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0]?.valor ?? 0);
      let mayor = 0;
      for (const c of Object.values(e.cuentasPorPagar)) {
        const f = c.programadaPara ?? c.fechaVencimiento;
        if (c.eliminadoEn || f < hoy || f > hasta) continue;
        const s = saldoCxP(c);
        const cop = c.moneda === 'COP' ? s : (s / 100) * tasa(c.moneda);
        if (s > 0 && cop > mayor) {
          mayor = cop;
          cxpGrande = c.id;
        }
      }
    }
    // Cierre de anoche con diferencia sin revisar.
    const anoche = sumarDias(hoy, -1);
    let sesionCajaFaltante: Id | null = null;
    const sf = e.sesionesCaja[n.sesionCajaFaltante];
    if (sf?.cierre && sf.cierre.diferencia !== 0 && !sf.revision && sf.abierta.ts.startsWith(anoche)) sesionCajaFaltante = sf.id;
    else
      for (const l of Object.values(e.locales)) {
        const id = e.agregados.cajaDia[`${l.id}@${anoche}`];
        const s = id ? e.sesionesCaja[id] : undefined;
        if (s?.cierre && s.cierre.diferencia !== 0 && !s.revision) {
          sesionCajaFaltante = s.id;
          break;
        }
      }
    // Cumpleaños de hoy.
    const md = hoy.slice(5, 10);
    const vip = e.clientes[n.clienteVip];
    const clienteCumpleanos =
      vip && !vip.eliminadoEn && vip.cumpleanos === md
        ? vip.id
        : (Object.values(e.clientes).find((c) => !c.eliminadoEn && c.cumpleanos === md)?.id ?? null);
    const pendiente = (id: Id, tipo: 'descuento' | 'traslado' | 'anulacion') => {
      const s = e.solicitudes[id];
      if (s && s.estado === 'pendiente') return s.id;
      return Object.values(e.solicitudes).find((x) => x.tipo === tipo && x.estado === 'pendiente')?.id ?? null;
    };
    const riesgos = selRiesgosContratacion(e, { hoy }).map((r) => r.empleadoId);
    const existe = (id: Id, tabla: Record<string, unknown>) => (id && tabla[id] ? id : null);
    return {
      varianteCritica,
      productoCritico: varianteCritica ? (e.variantes[varianteCritica]?.productoId ?? null) : null,
      localEscasez,
      localSurtido,
      importacionEnPuerto: enPuerto,
      importacionRetrasada,
      importacionEnTransito: enTransito,
      importacionEnProduccion: enProduccion,
      cxpGrande,
      sesionCajaFaltante,
      clienteCumpleanos,
      clienteFrecuente: existe(n.clienteFrecuente, e.clientes),
      empleadoLlegadasTarde: existe(n.empleadoLlegadasTarde, e.empleados),
      contratistasRiesgo: riesgos.length ? riesgos : [],
      solicitudDescuento: pendiente(n.solicitudDescuento, 'descuento'),
      solicitudTraslado: pendiente(n.solicitudTraslado, 'traslado'),
      solicitudAnulacion: pendiente(n.solicitudAnulacion, 'anulacion'),
      vendedorPersona: existe(n.vendedorPersona, e.empleados),
      bodegaPersona: existe(n.bodegaPersona, e.empleados),
      vendedoraEstrella: existe(n.vendedoraEstrella, e.empleados),
      proveedorSugerencia: existe(n.proveedorSugerencia, e.proveedores as Record<string, unknown>),
    };
  },
);

/** ¿La importación ya pasó por este estado? (útil para textos de la narrativa). */
export function importacionAlcanzo(i: Importacion, estado: EstadoImportacion): boolean {
  return indiceEstado(i.estado) >= indiceEstado(estado);
}
