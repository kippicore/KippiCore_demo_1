import type {
  Adquirente,
  Cliente,
  COP,
  EstadoFactura,
  FechaHoraISO,
  FechaISO,
  Id,
  NotaCredito,
  ResolucionFacturacion,
} from '@/dominio/tipos';
import { diferenciaDias } from '@/dominio/reglas/fechas';

/** Cálculos propios de Facturación (D3): filtros, resumen, recorrido de estados y uso de resoluciones. Puros. */

export type ClaseDocumento = 'factura' | 'pos' | 'nota';
export type FiltroClase = 'todos' | 'factura_electronica' | 'documento_equivalente_pos' | 'notas';

/** Una fila de la lista: factura, documento POS o nota crédito. */
export interface FilaDocumento {
  id: Id;
  clase: ClaseDocumento;
  numero: string;
  ts: FechaHoraISO;
  ventaId: Id;
  ventaNumero: string;
  localId: Id;
  adquirente: string;
  documento: string | null;
  base: COP;
  iva: COP;
  /** Total de la factura o valor de la nota crédito. */
  total: COP;
  estado: EstadoFactura;
  /** Solo notas: el documento que afectan. */
  afecta: { id: Id; numero: string } | null;
  /** Solo facturas: lo acreditado con notas crédito. */
  acreditado: COP;
}

export interface FiltroDocumentos {
  clase: FiltroClase;
  estado: EstadoFactura | null;
  desde: FechaISO | null;
  hasta: FechaISO | null;
  texto: string;
  localId: Id | 'todos';
}

const sinTildes = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

export function coincideDocumento(f: FilaDocumento, filtro: FiltroDocumentos): boolean {
  if (filtro.clase === 'factura_electronica' && f.clase !== 'factura') return false;
  if (filtro.clase === 'documento_equivalente_pos' && f.clase !== 'pos') return false;
  if (filtro.clase === 'notas' && f.clase !== 'nota') return false;
  if (filtro.estado && f.estado !== filtro.estado) return false;
  const dia = f.ts.slice(0, 10);
  if (filtro.desde && dia < filtro.desde) return false;
  if (filtro.hasta && dia > filtro.hasta) return false;
  if (filtro.localId !== 'todos' && f.localId !== filtro.localId) return false;
  const q = sinTildes(filtro.texto.trim());
  if (q) {
    const pajar = sinTildes(
      [f.numero, f.ventaNumero, f.adquirente, f.documento ?? '', f.afecta?.numero ?? ''].join(' '),
    );
    if (!pajar.includes(q)) return false;
  }
  return true;
}

export function filtrarDocumentos(filas: readonly FilaDocumento[], filtro: FiltroDocumentos): FilaDocumento[] {
  return filas.filter((f) => coincideDocumento(f, filtro));
}

export interface ResumenDocumentos {
  documentos: number;
  facturas: number;
  pos: number;
  notas: number;
  /** Σ total de facturas y documentos POS. */
  facturado: COP;
  /** Σ IVA de facturas y documentos POS. */
  ivaFacturado: COP;
  /** Σ valor de notas crédito. */
  acreditado: COP;
  /** Σ IVA de notas crédito. */
  ivaAcreditado: COP;
  /** facturado − acreditado. */
  neto: COP;
  /** IVA generado neto de notas. */
  ivaNeto: COP;
  /** Documentos que aún no están aceptados. */
  pendientes: number;
}

export function resumirDocumentos(filas: readonly FilaDocumento[]): ResumenDocumentos {
  const r: ResumenDocumentos = {
    documentos: filas.length,
    facturas: 0,
    pos: 0,
    notas: 0,
    facturado: 0,
    ivaFacturado: 0,
    acreditado: 0,
    ivaAcreditado: 0,
    neto: 0,
    ivaNeto: 0,
    pendientes: 0,
  };
  for (const f of filas) {
    if (f.clase === 'nota') {
      r.notas += 1;
      r.acreditado += f.total;
      r.ivaAcreditado += f.iva;
    } else {
      if (f.clase === 'factura') r.facturas += 1;
      else r.pos += 1;
      r.facturado += f.total;
      r.ivaFacturado += f.iva;
    }
    if (f.estado !== 'aceptada') r.pendientes += 1;
  }
  r.neto = r.facturado - r.acreditado;
  r.ivaNeto = r.ivaFacturado - r.ivaAcreditado;
  return r;
}

// ---------------------------------------------------------------------------------------------------------
// Recorrido de estados (generada → enviada a la DIAN (simulación) → aceptada)
// ---------------------------------------------------------------------------------------------------------
export const ORDEN_ESTADOS: readonly EstadoFactura[] = ['generada', 'enviada', 'aceptada'];

/** Espera, en milisegundos, antes de pasar al estado siguiente: corta, para que la transición se vea. */
export const RETRASO_AVANCE_MS: Record<'generada' | 'enviada', number> = { generada: 1600, enviada: 2400 };

export function siguienteEstado(e: EstadoFactura): 'enviada' | 'aceptada' | null {
  return e === 'generada' ? 'enviada' : e === 'enviada' ? 'aceptada' : null;
}

export interface PasoRecorrido {
  estado: EstadoFactura;
  /** Instante en que se alcanzó, o null si falta. */
  ts: FechaHoraISO | null;
  situacion: 'hecho' | 'en_curso' | 'pendiente';
}

/** Los tres pasos con su situación: el siguiente al actual está "en curso" mientras el documento no esté aceptado. */
export function pasosRecorrido(
  actual: EstadoFactura,
  historial: readonly { estado: EstadoFactura; ts: FechaHoraISO }[],
): PasoRecorrido[] {
  const i = ORDEN_ESTADOS.indexOf(actual);
  return ORDEN_ESTADOS.map((estado, k) => ({
    estado,
    ts: historial.find((h) => h.estado === estado)?.ts ?? null,
    situacion: k <= i ? 'hecho' : k === i + 1 ? 'en_curso' : 'pendiente',
  }));
}

export function minutosEntre(a: FechaHoraISO, b: FechaHoraISO): number {
  const f = (t: string) => {
    const [d = '', h = '00:00'] = t.split('T');
    const [yy = 0, mm = 1, dd = 1] = d.split('-').map(Number);
    const [hh = 0, mi = 0] = h.split(':').map(Number);
    return Date.UTC(yy, mm - 1, dd, hh, mi) / 60_000;
  };
  return Math.max(0, Math.round(f(b) - f(a)));
}

/**
 * El dominio solo avanza el estado de las facturas (`factura.avanzarEstado`); una nota crédito nace "generada" y no
 * tiene comando propio. Para que el recorrido se vea completo, el estado que se MUESTRA de una nota recién emitida
 * sigue el reloj de la app: generada el primer minuto, enviada el segundo y aceptada desde el tercero.
 */
export function estadoMostradoNota(n: Pick<NotaCredito, 'estado' | 'ts'>, ahora: FechaHoraISO): EstadoFactura {
  if (n.estado !== 'generada') return n.estado;
  const minutos = minutosEntre(n.ts, ahora);
  return minutos >= 2 ? 'aceptada' : minutos >= 1 ? 'enviada' : 'generada';
}

// ---------------------------------------------------------------------------------------------------------
// Adquirente, códigos y resoluciones
// ---------------------------------------------------------------------------------------------------------
export const CONSUMIDOR_FINAL: Adquirente = {
  tipo: 'consumidor_final',
  clienteId: null,
  nombre: 'Consumidor final',
  documento: null,
  correo: null,
};

export function adquirenteDeCliente(
  c: Pick<Cliente, 'id' | 'nombres' | 'apellidos' | 'documento' | 'correo'>,
): Adquirente {
  return {
    tipo: 'identificado',
    clienteId: c.id,
    nombre: `${c.nombres} ${c.apellidos}`.trim(),
    documento: c.documento?.numero ?? null,
    correo: c.correo ?? null,
  };
}

export interface BorradorAdquirente {
  nombre: string;
  documento: string;
  correo: string;
}

/** Valida el adquirente digitado a mano; devuelve errores por campo (vacío = válido). */
export function validarAdquirente(b: BorradorAdquirente): Partial<Record<keyof BorradorAdquirente, string>> {
  const e: Partial<Record<keyof BorradorAdquirente, string>> = {};
  if (b.nombre.trim().length < 3) e.nombre = 'Escribe el nombre o la razón social del adquirente.';
  const doc = b.documento.replace(/[^\d]/g, '');
  if (doc.length < 5 || doc.length > 12) e.documento = 'El documento debe tener entre 5 y 12 dígitos.';
  if (b.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.correo.trim()))
    e.correo = 'Ese correo no parece válido.';
  return e;
}

/** Parte un código de 96 hexadecimales en renglones de `ancho` caracteres, para leerlo sin que se desborde. */
export function partirCodigo(codigo: string, ancho = 32): string[] {
  const r: string[] = [];
  for (let i = 0; i < codigo.length; i += ancho) r.push(codigo.slice(i, i + ancho));
  return r;
}

/** Texto del QR de una nota crédito (sin URL de la DIAN). */
export function textoQrNota(
  n: Pick<NotaCredito, 'numero' | 'ts' | 'valor' | 'cude'>,
  facturaNumero: string,
): string {
  return `NumNC: ${n.numero}\nAfecta: ${facturaNumero}\nFecNC: ${n.ts.slice(0, 10)}\nValTotal: ${n.valor}\nCUDE: ${n.cude}\nDocumento de demostración`;
}

export interface UsoResolucion {
  resolucion: ResolucionFacturacion;
  emitidos: number;
  ultimo: number;
  siguiente: number;
  restantes: number;
  /** 0–1 */
  usado: number;
  vigente: boolean;
  /** Días hasta el vencimiento (negativo si ya venció). */
  diasParaVencer: number;
}

export function usoDeResolucion(
  r: ResolucionFacturacion,
  numeros: readonly string[],
  hoy: FechaISO,
): UsoResolucion {
  let ultimo = 0;
  for (const n of numeros) {
    const k = Number(n.slice(n.lastIndexOf('-') + 1));
    if (Number.isFinite(k) && k > ultimo) ultimo = k;
  }
  const siguiente = Math.max(ultimo + 1, r.desde);
  const total = r.hasta - r.desde + 1;
  return {
    resolucion: r,
    emitidos: numeros.length,
    ultimo,
    siguiente,
    restantes: Math.max(0, r.hasta - siguiente + 1),
    usado: total > 0 ? Math.min(1, numeros.length / total) : 1,
    vigente: hoy >= r.vigenteDesde && hoy <= r.vigenteHasta,
    diasParaVencer: diferenciaDias(hoy, r.vigenteHasta),
  };
}

/** Lo que aún se puede acreditar de un documento. */
export function saldoAcreditable(total: COP, notas: readonly Pick<NotaCredito, 'valor'>[]): COP {
  return Math.max(0, total - notas.reduce((s, n) => s + n.valor, 0));
}
