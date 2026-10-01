import type {
  ClaveExistencia,
  COP,
  EstadoDominio,
  EventoDominio,
  FechaHoraISO,
  FechaISO,
  Id,
  MapaComandos,
  MedioPago,
  MovimientoCuenta,
  MovimientoInventario,
  Origen,
  PagoVenta,
  SobreComando,
  TipoComando,
  TipoConsecutivo,
  Trazabilidad,
} from '../tipos';
import type { Actor } from '@/config/permisos';
import { fechaDe } from '../reglas/fechas';

/**
 * Primitivas de escritura (PLAN 5.4, 6.21). Los agregados materializados SOLO se escriben aquí.
 * Patrón atómico de todo manejador (5.6.4): `validar(estado, datos, ctx) → plan` (sin efectos; aquí van
 * todos los `fallar`) y `escribir(estado, plan, ctx)` (sin `throw`). En modo construcción `estado` es el
 * objeto real; en modo vivo es un borrador de Immer. El plan guarda IDs y valores calculados: `escribir`
 * siempre vuelve a leer las entidades desde `estado` (nunca muta referencias tomadas en `validar`).
 */
export interface Contexto {
  sobre: SobreComando;
  /** Instante del comando (sobre.ts). */
  ts: FechaHoraISO;
  /** Fecha del comando (Bogotá). */
  hoy: FechaISO;
  usuarioId: Id;
  actor: Actor;
  origen: Origen;
  /** Emite un evento de dominio (no-op en modo construcción). */
  emitir: (evento: EventoDominio) => void;
  /** true en modo vivo (hay eventos). */
  conEventos: boolean;
}

export interface Manejador<K extends TipoComando, P> {
  validar(estado: EstadoDominio, datos: MapaComandos[K], ctx: Contexto): P;
  escribir(estado: EstadoDominio, plan: P, ctx: Contexto): void;
}

/** Forma genérica de un manejador para el registro (el plan es opaco fuera del manejador). */
export interface ManejadorGenerico<K extends TipoComando> {
  validar(estado: EstadoDominio, datos: MapaComandos[K], ctx: Contexto): unknown;
  escribir(estado: EstadoDominio, plan: never, ctx: Contexto): void;
}

export type RegistroManejadores = { [K in TipoComando]: ManejadorGenerico<K> };

/** Ayuda de tipos para declarar un manejador. */
export function manejador<K extends TipoComando, P>(m: Manejador<K, P>): Manejador<K, P> {
  return m;
}

export function crearContexto(sobre: SobreComando, emitir: ((e: EventoDominio) => void) | null): Contexto {
  return {
    sobre,
    ts: sobre.ts,
    hoy: fechaDe(sobre.ts),
    usuarioId: sobre.usuarioId,
    actor: sobre.rol,
    origen: sobre.origen,
    emitir: emitir ?? (() => undefined),
    conEventos: emitir !== null,
  };
}

export function traza(ctx: Contexto, ts: FechaHoraISO = ctx.ts): Trazabilidad {
  return { creadoEn: ts, creadoPor: ctx.usuarioId, origen: ctx.origen };
}

/** Marca una entidad como editada (sobre el borrador o el objeto real). */
export function marcarEditado(entidad: Partial<Trazabilidad>, ctx: Contexto): void {
  entidad.actualizadoEn = ctx.ts;
  entidad.actualizadoPor = ctx.usuarioId;
}

export function marcarEliminado(
  entidad: { eliminadoEn?: string; eliminadoPor?: string; motivoEliminacion?: string },
  ctx: Contexto,
  motivo: string | null,
): void {
  entidad.eliminadoEn = ctx.ts;
  entidad.eliminadoPor = ctx.usuarioId;
  if (motivo) entidad.motivoEliminacion = motivo;
}

// ---------- Consecutivos ----------

/** Siguiente valor del consecutivo SIN consumirlo (para el plan). `n` = cuántos se necesitan. */
export function leerConsecutivo(estado: EstadoDominio, tipo: TipoConsecutivo, n = 1): number {
  return estado.meta.consecutivos[tipo] + n;
}

export function fijarConsecutivo(estado: EstadoDominio, tipo: TipoConsecutivo, valor: number): void {
  if (valor > estado.meta.consecutivos[tipo]) estado.meta.consecutivos[tipo] = valor;
}

/** 'V' + 482 → 'V-000482'. */
export function numeroDocumento(prefijo: string, n: number, digitos: number): string {
  return `${prefijo}-${String(n).padStart(digitos, '0')}`;
}

// ---------- Inventario ----------

export function claveExistencia(varianteId: Id, localId: Id): ClaveExistencia {
  return `${varianteId}@${localId}`;
}

export function existencia(estado: EstadoDominio, varianteId: Id, localId: Id): number {
  return estado.agregados.existencias[claveExistencia(varianteId, localId)] ?? 0;
}

export interface CambioExistencia {
  varianteId: Id;
  localId: Id;
  antes: number;
  despues: number;
}

/** Agrega un movimiento al libro y actualiza el agregado de existencias (I1). */
export function moverInventario(
  estado: EstadoDominio,
  mov: Omit<MovimientoInventario, 'usuarioId'> & { usuarioId?: Id },
  ctx: Contexto,
): CambioExistencia {
  const clave = claveExistencia(mov.varianteId, mov.localId);
  const antes = estado.agregados.existencias[clave] ?? 0;
  const despues = antes + mov.cantidad;
  estado.agregados.existencias[clave] = despues;
  const m: MovimientoInventario = { ...mov, usuarioId: mov.usuarioId ?? ctx.usuarioId };
  if (m.motivo === undefined) delete m.motivo;
  if (m.nota === undefined) delete m.nota;
  estado.movimientos.push(m);
  return { varianteId: mov.varianteId, localId: mov.localId, antes, despues };
}

/** Emite InventarioMovido y, si aplica, StockBajo (locales que venden, bajo el mínimo del producto). */
export function emitirInventario(estado: EstadoDominio, ctx: Contexto, cambios: CambioExistencia[]): void {
  if (!ctx.conEventos || cambios.length === 0) return;
  ctx.emitir({ tipo: 'InventarioMovido', cambios });
  for (const c of cambios) {
    if (c.despues >= c.antes) continue;
    const variante = estado.variantes[c.varianteId];
    const producto = variante ? estado.productos[variante.productoId] : undefined;
    const local = estado.locales[c.localId];
    if (producto && local?.vende && c.despues < producto.stockMinimo) {
      ctx.emitir({
        tipo: 'StockBajo',
        varianteId: c.varianteId,
        localId: c.localId,
        existencia: c.despues,
        minimo: producto.stockMinimo,
      });
    }
  }
}

// ---------- Plata ----------

function sumarSaldo(estado: EstadoDominio, cuentaId: Id | null, valor: COP): void {
  if (!cuentaId || valor === 0) return;
  estado.agregados.saldosCuentas[cuentaId] = (estado.agregados.saldosCuentas[cuentaId] ?? 0) + valor;
}

export function claveDatafono(localId: Id, fecha: FechaISO): string {
  return `${localId}@${fecha}`;
}

/** Actualiza los agregados por un cobro (positivo) o su reverso (negativo): saldos, efectivo de la sesión y datáfono. */
export function registrarCobroEnAgregados(
  estado: EstadoDominio,
  cobro: { valor: COP; medio: MedioPago; cuentaId: Id | null; sesionCajaId: Id | null; ts: FechaHoraISO },
  localId: Id,
): void {
  sumarSaldo(estado, cobro.cuentaId, cobro.valor);
  if (cobro.medio === 'efectivo' && cobro.sesionCajaId) {
    estado.agregados.efectivoSesion[cobro.sesionCajaId] =
      (estado.agregados.efectivoSesion[cobro.sesionCajaId] ?? 0) + cobro.valor;
  }
  if (cobro.medio === 'datafono_debito' || cobro.medio === 'datafono_credito') {
    const clave = claveDatafono(localId, fechaDe(cobro.ts));
    const d = (estado.agregados.datafonoDia[clave] ??= { debito: 0, credito: 0 });
    if (cobro.medio === 'datafono_debito') d.debito += cobro.valor;
    else d.credito += cobro.valor;
  }
}

/** Agrega un pago (o reembolso) a una venta y actualiza los agregados. */
export function agregarPagoVenta(estado: EstadoDominio, ventaId: Id, pago: PagoVenta): void {
  const venta = estado.ventas[ventaId];
  if (!venta) return;
  venta.pagos.push(pago);
  registrarCobroEnAgregados(estado, pago, venta.localId);
}

/** Inserta un movimiento de cuenta y actualiza el saldo (V7). */
export function agregarMovimientoCuenta(estado: EstadoDominio, mov: MovimientoCuenta): void {
  estado.movimientosCuenta[mov.id] = mov;
  sumarSaldo(estado, mov.cuentaId, mov.valor);
}

/** Cambia el valor de un movimiento de cuenta existente (edición de un gasto pagado). */
export function cambiarValorMovimientoCuenta(estado: EstadoDominio, movId: Id, nuevoValor: COP): void {
  const mov = estado.movimientosCuenta[movId];
  if (!mov) return;
  sumarSaldo(estado, mov.cuentaId, nuevoValor - mov.valor);
  mov.valor = nuevoValor;
}

/** Elimina un movimiento de cuenta (solo al anular una aprobación de nómina no pagada o un traslado de cuentas). */
export function quitarMovimientoCuenta(estado: EstadoDominio, movId: Id): void {
  const mov = estado.movimientosCuenta[movId];
  if (!mov) return;
  sumarSaldo(estado, mov.cuentaId, -mov.valor);
  delete estado.movimientosCuenta[movId];
}

export function saldoCuenta(estado: EstadoDominio, cuentaId: Id): COP {
  return estado.agregados.saldosCuentas[cuentaId] ?? 0;
}

// ---------- Marcaciones ----------

export function claveMarcacionDia(empleadoId: Id, fecha: FechaISO): string {
  return `${empleadoId}@${fecha}`;
}

/** Reconstruye el índice del día (ordenado por ts) a partir de una lista de IDs. */
export function fijarIndiceMarcaciones(estado: EstadoDominio, clave: string, ids: Id[]): void {
  const ordenados = [...ids].sort((a, b) => {
    const ta = estado.marcaciones[a]?.ts ?? '';
    const tb = estado.marcaciones[b]?.ts ?? '';
    return ta < tb ? -1 : ta > tb ? 1 : a < b ? -1 : 1;
  });
  if (ordenados.length === 0) delete estado.agregados.marcacionesDia[clave];
  else estado.agregados.marcacionesDia[clave] = ordenados;
}
