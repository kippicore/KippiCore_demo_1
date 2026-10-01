import type {
  Adquirente,
  Canal,
  Cliente,
  COP,
  DatosCliente,
  DatosPago,
  EstadoDominio,
  Factura,
  FechaHoraISO,
  Id,
  MedioPago,
  NotaCredito,
  PagoVenta,
  SesionCaja,
  Tabla,
  TipoDocumentoElectronico,
} from '../tipos';
import { exigir, fallar } from '../errores';
import { efectivoEsperado } from '../reglas/caja';
import { codigoUnicoSimulado } from '../reglas/cufe';
import { fechaDe } from '../reglas/fechas';
import { pesos } from '../reglas/texto';
import { type Contexto, leerConsecutivo, traza } from './tx';

/** Validaciones y piezas compartidas por los manejadores (fase `validar`: nunca escriben). */

type ConEliminacion = { eliminadoEn?: string };

/** Entidad existente y no eliminada (G3). `nombre` va en el mensaje: "el producto", "la venta". */
export function requerir<T extends ConEliminacion>(
  tabla: Tabla<T>,
  id: Id | null | undefined,
  nombre: string,
  campo?: string,
): T {
  const e = id ? tabla[id] : undefined;
  if (!e) fallar('NO_EXISTE', `No encontramos ${nombre}. Puede que ya no exista.`, campo);
  if (e.eliminadoEn) fallar('ELIMINADO', `No se puede usar ${nombre}: fue eliminado.`, campo);
  return e;
}

/** Entidad existente (para tablas sin eliminación suave). */
export function requerirExiste<T>(
  tabla: Tabla<T>,
  id: Id | null | undefined,
  nombre: string,
  campo?: string,
): T {
  const e = id ? tabla[id] : undefined;
  if (!e) fallar('NO_EXISTE', `No encontramos ${nombre}. Puede que ya no exista.`, campo);
  return e;
}

/** El ID que crea el comando no debe existir ya en la tabla. */
export function idNuevo(tabla: Tabla<unknown>, id: Id, campo = 'id'): void {
  exigir(
    typeof id === 'string' && id.length > 0,
    'ID_INVALIDO',
    'Falta el identificador del registro.',
    campo,
  );
  exigir(!(id in tabla), 'ID_DUPLICADO', 'Ese registro ya existe.', campo);
}

export function textoObligatorio(valor: string | null | undefined, campo: string, mensaje: string): string {
  const t = (valor ?? '').trim();
  exigir(t.length > 0, 'CAMPO_OBLIGATORIO', mensaje, campo);
  return t;
}

export function enteroPositivo(n: number, campo: string, mensaje: string): void {
  exigir(Number.isInteger(n) && n > 0, 'VALOR_INVALIDO', mensaje, campo);
}

export function enteroNoNegativo(n: number, campo: string, mensaje: string): void {
  exigir(Number.isInteger(n) && n >= 0, 'VALOR_INVALIDO', mensaje, campo);
}

export function fraccionValida(x: number, campo: string, mensaje: string): void {
  exigir(typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1, 'VALOR_INVALIDO', mensaje, campo);
}

export function fechaValida(f: string | null | undefined, campo: string): void {
  exigir(
    typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f),
    'FECHA_INVALIDA',
    'Escribe una fecha válida.',
    campo,
  );
}

export function tsValido(ts: string | null | undefined, campo: string): void {
  exigir(
    typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(ts),
    'FECHA_INVALIDA',
    'Escribe una fecha y hora válidas.',
    campo,
  );
}

export const RE_CELULAR = /^3\d{9}$/;
export const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida datos de cliente (completos al crear; parciales al editar). */
export function validarDatosCliente(
  estado: EstadoDominio,
  datos: Partial<DatosCliente>,
  completo: boolean,
  excluirId: Id | null,
): void {
  if (completo || datos.nombres !== undefined)
    textoObligatorio(datos.nombres, 'nombres', 'Escribe el nombre del cliente.');
  if (completo || datos.apellidos !== undefined)
    textoObligatorio(datos.apellidos, 'apellidos', 'Escribe el apellido del cliente.');
  if (completo || datos.celular !== undefined) {
    exigir(
      RE_CELULAR.test(datos.celular ?? ''),
      'CELULAR_INVALIDO',
      'Escribe un celular de 10 dígitos que empiece por 3.',
      'celular',
    );
    const repetido = Object.values(estado.clientes).find(
      (c) => !c.eliminadoEn && c.id !== excluirId && c.celular === datos.celular,
    );
    exigir(
      !repetido,
      'CELULAR_DUPLICADO',
      `Ese celular ya es de ${repetido ? `${repetido.nombres} ${repetido.apellidos}` : 'otro cliente'}.`,
      'celular',
    );
  }
  if (datos.correo)
    exigir(RE_CORREO.test(datos.correo), 'CORREO_INVALIDO', 'Escribe un correo válido.', 'correo');
  if (datos.documento) {
    textoObligatorio(datos.documento.numero, 'documento', 'Escribe el número de documento.');
    const doc = datos.documento;
    const repetido = Object.values(estado.clientes).find(
      (c) =>
        !c.eliminadoEn &&
        c.id !== excluirId &&
        c.documento?.tipo === doc.tipo &&
        c.documento.numero === doc.numero,
    );
    exigir(!repetido, 'DOCUMENTO_DUPLICADO', 'Ya hay un cliente con ese documento.', 'documento');
  }
  if (completo || datos.autorizacionDatos !== undefined) {
    exigir(
      datos.autorizacionDatos?.aceptada === true,
      'SIN_AUTORIZACION',
      'Marca la autorización de tratamiento de datos.',
      'autorizacionDatos',
    );
  }
  if (datos.cumpleanos)
    exigir(
      /^\d{2}-\d{2}$/.test(datos.cumpleanos),
      'FECHA_INVALIDA',
      'El cumpleaños va como mes y día.',
      'cumpleanos',
    );
}

export function construirCliente(id: Id, datos: DatosCliente, ctx: Contexto): Cliente {
  return { ...traza(ctx), ...datos, id, notas: [] };
}

/** Sesión abierta de un local, o null (agregado `cajaAbierta`). */
export function sesionAbiertaDelLocal(estado: EstadoDominio, localId: Id): SesionCaja | null {
  const id = estado.agregados.cajaAbierta[localId];
  const s = id ? estado.sesionesCaja[id] : undefined;
  return s && s.cierre === null ? s : null;
}

/** Cuenta que recibe la plata de un medio (parametros.ventas.cuentaPorMedio). */
export function cuentaDeMedio(estado: EstadoDominio, medio: MedioPago, localId: Id): Id | null {
  const destino = estado.parametros.ventas.cuentaPorMedio[medio];
  if (destino === 'caja_del_local') return estado.locales[localId]?.cuentaCajaId ?? null;
  return destino;
}

/**
 * Saldo a favor de un cliente (V3): devoluciones con saldo a favor o cambio + abonos de separados cancelados
 * − lo redimido con el medio 'saldo_a_favor' (los reembolsos a saldo a favor son pagos negativos y suman).
 */
export function saldoAFavorCliente(estado: EstadoDominio, clienteId: Id): COP {
  let saldo = 0;
  const ventasCliente = new Set<Id>();
  for (const v of Object.values(estado.ventas)) {
    if (v.clienteId !== clienteId) continue;
    ventasCliente.add(v.id);
    if (v.separado?.cerrado?.resultado === 'cancelado') for (const p of v.pagos) saldo += p.valor;
    for (const p of v.pagos) if (p.medio === 'saldo_a_favor') saldo -= p.valor;
  }
  for (const d of Object.values(estado.devoluciones)) {
    if (ventasCliente.has(d.ventaId) && (d.compensacion === 'saldo_favor' || d.compensacion === 'cambio'))
      saldo += d.valorTotal;
  }
  return saldo;
}

/** Saldo de un bono de regalo (V12): valor − Σ redimido (agregado `bonosRedimidos`). */
export function saldoBono(estado: EstadoDominio, bonoId: Id): COP {
  const bono = estado.bonos[bonoId];
  if (!bono) return 0;
  return bono.valor - (estado.agregados.bonosRedimidos[bonoId] ?? 0);
}

/** Lo que ya usa el mismo comando de bonos y saldo a favor (varios pagos con el mismo medio). */
export interface UsoEnComando {
  bonos: Record<Id, COP>;
  saldoFavor: COP;
}

export function nuevoUso(): UsoEnComando {
  return { bonos: {}, saldoFavor: 0 };
}

/** Planea un cobro (pago o abono) sin escribir nada. */
export function planearCobro(
  estado: EstadoDominio,
  _ctx: Contexto,
  p: DatosPago,
  o: {
    id: Id;
    ts: FechaHoraISO;
    tipo: 'pago' | 'abono';
    localId: Id;
    canal: Canal;
    clienteId: Id | null;
    uso: UsoEnComando;
    campo: string;
  },
): PagoVenta {
  enteroPositivo(p.valor, o.campo, 'Cada pago debe ser mayor que cero.');
  const base: PagoVenta = {
    id: o.id,
    ts: o.ts,
    tipo: o.tipo,
    medio: p.medio,
    valor: p.valor,
    recibido: null,
    cambio: null,
    referencia: p.referencia,
    cuentaId: null,
    sesionCajaId: null,
    bonoId: null,
    conciliado: false,
  };
  switch (p.medio) {
    case 'efectivo': {
      exigir(o.canal !== 'web', 'MEDIO_INVALIDO', 'La tienda web no recibe efectivo.', o.campo);
      const sesion = p.sesionCajaId
        ? estado.sesionesCaja[p.sesionCajaId]
        : sesionAbiertaDelLocal(estado, o.localId);
      const local = estado.locales[o.localId];
      exigir(
        sesion && sesion.localId === o.localId && sesion.cierre === null,
        'CAJA_CERRADA',
        `Abre la caja de ${local?.nombre ?? 'este local'} para recibir efectivo.`,
        o.campo,
      );
      const recibido = p.recibido ?? p.valor;
      exigir(
        recibido >= p.valor,
        'EFECTIVO_INSUFICIENTE',
        'El efectivo recibido no alcanza para el pago.',
        o.campo,
      );
      return {
        ...base,
        recibido,
        cambio: recibido - p.valor,
        cuentaId: sesion.cuentaId,
        sesionCajaId: sesion.id,
      };
    }
    case 'bono_regalo': {
      const bono = requerirExiste(estado.bonos, p.bonoId, 'el bono de regalo', o.campo);
      exigir(bono.vence >= fechaDe(o.ts), 'BONO_VENCIDO', `El bono ${bono.codigo} venció.`, o.campo);
      const usado = o.uso.bonos[bono.id] ?? 0;
      const saldo = saldoBono(estado, bono.id) - usado;
      exigir(
        saldo >= p.valor,
        'BONO_SIN_SALDO',
        `Al bono ${bono.codigo} le quedan ${pesos(Math.max(0, saldo))}.`,
        o.campo,
      );
      o.uso.bonos[bono.id] = usado + p.valor;
      return { ...base, bonoId: bono.id };
    }
    case 'saldo_a_favor': {
      exigir(o.clienteId, 'CLIENTE_REQUERIDO', 'Para usar saldo a favor, asocia el cliente.', o.campo);
      const saldo = saldoAFavorCliente(estado, o.clienteId) - o.uso.saldoFavor;
      exigir(
        saldo >= p.valor,
        'SALDO_FAVOR_INSUFICIENTE',
        `El cliente tiene ${pesos(Math.max(0, saldo))} de saldo a favor.`,
        o.campo,
      );
      o.uso.saldoFavor += p.valor;
      return base;
    }
    default: {
      const cuentaId = cuentaDeMedio(estado, p.medio, o.localId);
      exigir(
        cuentaId && estado.cuentas[cuentaId],
        'CUENTA_NO_CONFIGURADA',
        'Ese medio de pago no tiene una cuenta asignada en Configuración.',
        o.campo,
      );
      return { ...base, cuentaId };
    }
  }
}

const MEDIOS_REEMBOLSO: MedioPago[] = [
  'efectivo',
  'datafono_debito',
  'datafono_credito',
  'nequi',
  'daviplata',
  'transferencia',
  'qr_bre_b',
  'pasarela_web',
  'saldo_a_favor',
];

/** Planea un reembolso (pago negativo) sin escribir nada. */
export function planearReembolso(
  estado: EstadoDominio,
  r: { medio: MedioPago; sesionCajaId: Id | null },
  o: { id: Id; ts: FechaHoraISO; valor: COP; localId: Id; clienteId: Id | null; campo: string },
): PagoVenta {
  exigir(
    MEDIOS_REEMBOLSO.includes(r.medio),
    'MEDIO_INVALIDO',
    'Ese medio no sirve para devolver plata.',
    o.campo,
  );
  const base: PagoVenta = {
    id: o.id,
    ts: o.ts,
    tipo: 'reembolso',
    medio: r.medio,
    valor: -o.valor,
    recibido: null,
    cambio: null,
    referencia: null,
    cuentaId: null,
    sesionCajaId: null,
    bonoId: null,
    conciliado: false,
  };
  if (r.medio === 'saldo_a_favor') {
    exigir(o.clienteId, 'CLIENTE_REQUERIDO', 'Para dejar saldo a favor, asocia el cliente.', o.campo);
    return base;
  }
  if (r.medio === 'efectivo') {
    const sesion = r.sesionCajaId
      ? estado.sesionesCaja[r.sesionCajaId]
      : sesionAbiertaDelLocal(estado, o.localId);
    exigir(
      sesion && sesion.localId === o.localId && sesion.cierre === null,
      'CAJA_CERRADA',
      'Abre la caja del local para devolver efectivo.',
      o.campo,
    );
    const disponible = efectivoEsperado(
      sesion.abierta.baseInicial,
      estado.agregados.efectivoSesion[sesion.id] ?? 0,
      sesion.egresos,
    );
    exigir(
      disponible >= o.valor,
      'EFECTIVO_INSUFICIENTE',
      `En la caja hay ${pesos(disponible)}; no alcanza para devolver ${pesos(o.valor)}.`,
      o.campo,
    );
    return { ...base, cuentaId: sesion.cuentaId, sesionCajaId: sesion.id };
  }
  const cuentaId = cuentaDeMedio(estado, r.medio, o.localId);
  exigir(
    cuentaId && estado.cuentas[cuentaId],
    'CUENTA_NO_CONFIGURADA',
    'Ese medio no tiene una cuenta asignada en Configuración.',
    o.campo,
  );
  return { ...base, cuentaId };
}

/** Nombre de una persona por empleadoId o usuarioId. */
export function nombrePersona(estado: EstadoDominio, id: Id): string {
  const e = estado.empleados[id];
  if (e) return `${e.nombres} ${e.apellidos.split(' ')[0] ?? ''}`.trim();
  return estado.usuarios[id]?.nombre ?? id;
}

/** Persona que actúa: la indicada, o el empleado del usuario del sobre, o el usuario. */
export function personaQueActua(estado: EstadoDominio, ctx: Contexto, por: Id | null): Id {
  if (por) {
    exigir(
      estado.empleados[por] || estado.usuarios[por],
      'NO_EXISTE',
      'No encontramos a esa persona.',
      'por',
    );
    return por;
  }
  return estado.usuarios[ctx.usuarioId]?.empleadoId ?? ctx.usuarioId;
}

/** Usuario dueño (para el rol): ¿el actor puede hacer cosas reservadas al dueño? */
export function esDueno(ctx: Contexto): boolean {
  return ctx.actor === 'dueno';
}

// ---------- Facturación ----------

export interface PlanDocumento {
  factura: Factura;
  tipoConsecutivo: 'factura' | 'documento_pos';
  consecutivo: number;
}

/** Planea una factura electrónica o un documento POS (simulados) a partir de los totales de la venta. */
export function planearFactura(
  estado: EstadoDominio,
  ctx: Contexto,
  o: {
    facturaId: Id;
    tipo: TipoDocumentoElectronico;
    adquirente: Adquirente;
    ventaId: Id;
    ts: FechaHoraISO;
    totales: { subtotal: COP; descuentos: COP; base: COP; iva: COP; total: COP };
    /** Consecutivos ya usados por el mismo comando (si emite varios). */
    usados?: number;
  },
): PlanDocumento {
  const resolucion = Object.values(estado.resoluciones).find((r) => r.tipo === o.tipo);
  exigir(resolucion, 'SIN_RESOLUCION', 'No hay una resolución de facturación para ese documento.', 'tipo');
  const fecha = fechaDe(o.ts);
  exigir(
    fecha >= resolucion.vigenteDesde && fecha <= resolucion.vigenteHasta,
    'RESOLUCION_VENCIDA',
    'La resolución de facturación no está vigente.',
    'tipo',
  );
  const tipoConsecutivo = o.tipo === 'factura_electronica' ? 'factura' : 'documento_pos';
  const consecutivo = Math.max(
    leerConsecutivo(estado, tipoConsecutivo, 1 + (o.usados ?? 0)),
    resolucion.desde,
  );
  exigir(
    consecutivo <= resolucion.hasta,
    'RESOLUCION_AGOTADA',
    'Se agotó el rango de la resolución de facturación.',
    'tipo',
  );
  if (o.adquirente.tipo === 'identificado')
    textoObligatorio(o.adquirente.nombre, 'adquirente', 'Escribe el nombre del adquirente.');
  const numero = `${resolucion.prefijo}-${consecutivo}`;
  const cufe = codigoUnicoSimulado({
    numero,
    ts: o.ts,
    total: o.totales.total,
    iva: o.totales.iva,
    nitEmisor: estado.empresa.nit,
    adquirente: o.adquirente.documento ?? o.adquirente.nombre,
  });
  const generado = ctx.origen === 'generado';
  const factura: Factura = {
    ...traza(ctx, o.ts),
    id: o.facturaId,
    tipo: o.tipo,
    numero,
    resolucionId: resolucion.id,
    ventaId: o.ventaId,
    ts: o.ts,
    adquirente: o.adquirente,
    ...o.totales,
    cufe,
    qrTexto: `NumFac: ${numero}\nFecFac: ${fecha}\nValTotal: ${o.totales.total}\n${o.tipo === 'factura_electronica' ? 'CUFE' : 'CUDE'}: ${cufe}\nDocumento de demostración`,
    estado: generado ? 'aceptada' : 'generada',
    historial: generado
      ? [
          { estado: 'generada', ts: o.ts },
          { estado: 'enviada', ts: o.ts },
          { estado: 'aceptada', ts: o.ts },
        ]
      : [{ estado: 'generada', ts: o.ts }],
  };
  return { factura, tipoConsecutivo, consecutivo };
}

/** Valor ya acreditado con notas crédito a una factura. */
export function totalNotasCredito(estado: EstadoDominio, facturaId: Id): COP {
  let s = 0;
  for (const n of Object.values(estado.notasCredito)) if (n.facturaId === facturaId) s += n.valor;
  return s;
}

/** Planea una nota crédito (por devolución o anulación). */
export function planearNotaCredito(
  estado: EstadoDominio,
  ctx: Contexto,
  o: {
    notaId: Id;
    facturaId: Id;
    devolucionId: Id | null;
    motivo: string;
    base: COP;
    iva: COP;
    valor: COP;
    ts: FechaHoraISO;
  },
): { nota: NotaCredito; consecutivo: number } {
  const factura = requerirExiste(estado.facturas, o.facturaId, 'la factura', 'facturaId');
  idNuevo(estado.notasCredito, o.notaId, 'notaCreditoId');
  exigir(o.valor > 0, 'VALOR_INVALIDO', 'La nota crédito debe tener valor.', 'valor');
  exigir(
    o.valor <= factura.total - totalNotasCredito(estado, factura.id),
    'NOTA_EXCEDE',
    'La nota crédito supera lo que queda de la factura.',
    'valor',
  );
  const consecutivo = leerConsecutivo(estado, 'nota_credito');
  const numero = `HAL-NC-${String(consecutivo).padStart(4, '0')}`;
  const generado = ctx.origen === 'generado';
  return {
    consecutivo,
    nota: {
      ...traza(ctx, o.ts),
      id: o.notaId,
      numero,
      facturaId: factura.id,
      devolucionId: o.devolucionId,
      ts: o.ts,
      motivo: o.motivo,
      base: o.base,
      iva: o.iva,
      valor: o.valor,
      cude: codigoUnicoSimulado({
        numero,
        ts: o.ts,
        total: o.valor,
        iva: o.iva,
        nitEmisor: estado.empresa.nit,
        adquirente: factura.numero,
      }),
      estado: generado ? 'aceptada' : 'generada',
    },
  };
}

/** Tasa vigente de una moneda en una fecha (la más reciente con fecha ≤ la dada). */
export function tasaVigente(estado: EstadoDominio, moneda: 'USD' | 'CNY', fecha: string): number | null {
  let mejor: { fecha: string; valor: number } | null = null;
  for (const t of Object.values(estado.tasas)) {
    if (t.moneda === moneda && t.fecha <= fecha && (!mejor || t.fecha > mejor.fecha)) mejor = t;
  }
  if (mejor) return mejor.valor;
  // Sin tasa anterior a la fecha: la más antigua disponible.
  let primera: { fecha: string; valor: number } | null = null;
  for (const t of Object.values(estado.tasas))
    if (t.moneda === moneda && (!primera || t.fecha < primera.fecha)) primera = t;
  return primera?.valor ?? null;
}

/** El generador nunca deja una cuenta en negativo (V7); al usuario solo se le avisa en la interfaz. */
export function exigirSaldoSiGenerado(estado: EstadoDominio, ctx: Contexto, cuentaId: Id, valor: COP): void {
  if (ctx.origen !== 'generado') return;
  const saldo = estado.agregados.saldosCuentas[cuentaId] ?? 0;
  exigir(
    saldo >= valor,
    'SALDO_INSUFICIENTE',
    `La cuenta no tiene saldo suficiente (${pesos(saldo)}).`,
    'cuentaId',
  );
}
