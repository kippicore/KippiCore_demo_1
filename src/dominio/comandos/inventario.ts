import type {
  ConteoFisico,
  EstadoDominio,
  Id,
  MotivoAjuste,
  MovimientoInventario,
  SolicitudAprobacion,
  Traslado,
} from '../tipos';
import { exigir, fallar } from '../errores';
import { idHijo } from '../motor/ids';
import {
  idNuevo,
  nombrePersona,
  personaQueActua,
  requerir,
  requerirExiste,
  textoObligatorio,
  enteroNoNegativo,
  enteroPositivo,
} from './comunes';
import {
  type CambioExistencia,
  type Contexto,
  emitirInventario,
  existencia,
  fijarConsecutivo,
  leerConsecutivo,
  manejador,
  marcarEditado,
  moverInventario,
  numeroDocumento,
  traza,
} from './tx';

/** Inventario (PLAN 6.21): ajustes, traslados y conteos. */

const MOTIVOS: MotivoAjuste[] = ['dano', 'perdida', 'error', 'hallazgo', 'otro'];

type MovPlan = Omit<MovimientoInventario, 'usuarioId'>;

function costoDe(estado: EstadoDominio, varianteId: Id): { productoId: Id; costo: number } {
  const v = estado.variantes[varianteId];
  const p = v ? estado.productos[v.productoId] : undefined;
  return { productoId: v?.productoId ?? '', costo: p?.costoVigente ?? 0 };
}

export function aplicarMovimientos(
  estado: EstadoDominio,
  movs: readonly MovPlan[],
  ctx: Contexto,
): CambioExistencia[] {
  return movs.map((m) => moverInventario(estado, { ...m }, ctx));
}

/** Suma cantidades por variante y verifica existencias del local (I2: nunca negativo). */
export function verificarExistencias(
  estado: EstadoDominio,
  localId: Id,
  lineas: readonly { varianteId: Id; cantidad: number }[],
  campo: string,
  extra: Record<Id, number> = {},
): void {
  const porVariante = new Map<Id, number>();
  for (const l of lineas) porVariante.set(l.varianteId, (porVariante.get(l.varianteId) ?? 0) + l.cantidad);
  const local = estado.locales[localId];
  for (const [v, cantidad] of porVariante) {
    const hay = existencia(estado, v, localId) + (extra[v] ?? 0);
    if (hay < cantidad) {
      const variante = estado.variantes[v];
      const producto = variante ? estado.productos[variante.productoId] : undefined;
      const color = variante ? estado.colores[variante.colorId] : undefined;
      fallar(
        'SIN_EXISTENCIAS',
        `La cantidad supera lo que hay en ${local?.nombre ?? 'el local'} (${hay}) de ${producto?.nombre ?? 'la prenda'}${color ? ` ${color.nombre.toLowerCase()}` : ''}${variante ? ` talla ${variante.talla}` : ''}. Pide un traslado o baja la cantidad.`,
        campo,
      );
    }
  }
}

export const inventarioAjustar = manejador<'inventario.ajustar', MovPlan>({
  validar(estado, d, ctx) {
    exigir(
      !estado.movimientos.some((m) => m.id === d.movimientoId),
      'ID_DUPLICADO',
      'Ese ajuste ya se registró.',
      'movimientoId',
    );
    const v = requerir(estado.variantes, d.varianteId, 'la variante', 'varianteId');
    requerir(estado.locales, d.localId, 'el local', 'localId');
    enteroNoNegativo(d.nuevaCantidad, 'nuevaCantidad', 'La nueva cantidad no puede ser negativa.');
    exigir(MOTIVOS.includes(d.motivo), 'MOTIVO_INVALIDO', 'Elige el motivo del ajuste.', 'motivo');
    const diferencia = d.nuevaCantidad - existencia(estado, v.id, d.localId);
    exigir(
      diferencia !== 0,
      'SIN_DIFERENCIA',
      'La cantidad es igual a la que hay; no hay nada que ajustar.',
      'nuevaCantidad',
    );
    const { productoId, costo } = costoDe(estado, v.id);
    const mov: MovPlan = {
      id: d.movimientoId,
      ts: ctx.ts,
      varianteId: v.id,
      productoId,
      localId: d.localId,
      cantidad: diferencia,
      tipo: 'ajuste_manual',
      costoUnitario: costo,
      documento: { tipo: 'ajuste', id: d.movimientoId },
      motivo: d.motivo,
    };
    if (d.nota) mov.nota = d.nota;
    return mov;
  },
  escribir(estado, mov, ctx) {
    emitirInventario(estado, ctx, [moverInventario(estado, mov, ctx)]);
  },
});

// ---------- Traslados ----------

export interface PlanTrasladoNuevo {
  traslado: Traslado;
  solicitud: SolicitudAprobacion | null;
  consecutivo: number;
}

/** Valida y arma un traslado nuevo (lo usa también la distribución de una importación). */
export function planearTraslado(
  estado: EstadoDominio,
  ctx: Contexto,
  o: {
    trasladoId: Id;
    origenId: Id;
    destinoId: Id;
    lineas: readonly { varianteId: Id; cantidad: number }[];
    motivo: string | null;
    requiereAprobacion: boolean;
    solicitudId: Id | null;
    importacionId?: Id;
    /** Existencias que entran en el mismo comando antes del traslado (recepción). */
    extra?: Record<Id, number>;
    /** Consecutivos ya usados por el mismo comando. */
    usados?: number;
  },
): PlanTrasladoNuevo {
  idNuevo(estado.traslados, o.trasladoId, 'trasladoId');
  const origen = requerir(estado.locales, o.origenId, 'el local de origen', 'origenId');
  const destino = requerir(estado.locales, o.destinoId, 'el local de destino', 'destinoId');
  exigir(origen.id !== destino.id, 'MISMO_LOCAL', 'El origen y el destino deben ser distintos.', 'destinoId');
  exigir(o.lineas.length > 0, 'SIN_LINEAS', 'Agrega al menos una prenda al traslado.', 'lineas');
  for (const l of o.lineas) {
    requerir(estado.variantes, l.varianteId, 'la variante', 'lineas');
    enteroPositivo(l.cantidad, 'lineas', 'Las cantidades deben ser mayores que cero.');
  }
  verificarExistencias(estado, origen.id, o.lineas, 'lineas', o.extra);
  const consecutivo = leerConsecutivo(estado, 'traslado', 1 + (o.usados ?? 0));
  const solicitante = personaQueActua(estado, ctx, null);
  let solicitud: SolicitudAprobacion | null = null;
  if (o.requiereAprobacion) {
    exigir(o.solicitudId, 'ID_INVALIDO', 'Falta el identificador de la solicitud.', 'solicitudId');
    idNuevo(estado.solicitudes, o.solicitudId, 'solicitudId');
    const unidades = o.lineas.reduce((a, l) => a + l.cantidad, 0);
    solicitud = {
      ...traza(ctx),
      id: o.solicitudId,
      tipo: 'traslado',
      estado: 'pendiente',
      solicitadoPor: ctx.usuarioId,
      ts: ctx.ts,
      resumen: `${nombrePersona(estado, solicitante)} pide trasladar ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'} de ${origen.nombre} a ${destino.nombre}`,
      datos: { tipo: 'traslado', trasladoId: o.trasladoId },
      resolucion: null,
      usadaEnVentaId: null,
    };
  }
  const traslado: Traslado = {
    ...traza(ctx),
    id: o.trasladoId,
    numero: numeroDocumento('TR', consecutivo, 6),
    origenId: origen.id,
    destinoId: destino.id,
    lineas: o.lineas.map((l) => ({ varianteId: l.varianteId, cantidad: l.cantidad, recibida: null })),
    estado: 'solicitado',
    aprobacion: o.requiereAprobacion ? 'pendiente' : 'no_requerida',
    solicitadoPor: solicitante,
    fechas: { solicitado: ctx.ts },
  };
  if (o.motivo) traslado.motivo = o.motivo;
  if (o.importacionId) traslado.importacionId = o.importacionId;
  return { traslado, solicitud, consecutivo };
}

export function escribirTrasladoNuevo(estado: EstadoDominio, plan: PlanTrasladoNuevo, ctx: Contexto): void {
  estado.traslados[plan.traslado.id] = plan.traslado;
  fijarConsecutivo(estado, 'traslado', plan.consecutivo);
  if (plan.solicitud) {
    estado.solicitudes[plan.solicitud.id] = plan.solicitud;
    ctx.emitir({ tipo: 'AprobacionSolicitada', solicitudId: plan.solicitud.id });
  }
  ctx.emitir({ tipo: 'TrasladoCambiado', trasladoId: plan.traslado.id, estado: 'solicitado' });
}

/** Movimientos de salida de un traslado (despacho). */
export function movimientosSalida(
  estado: EstadoDominio,
  t: Pick<Traslado, 'id' | 'origenId' | 'lineas'>,
  ctx: Contexto,
): MovPlan[] {
  return t.lineas.map((l, i) => {
    const { productoId, costo } = costoDe(estado, l.varianteId);
    return {
      id: idHijo(t.id, `s${i + 1}`),
      ts: ctx.ts,
      varianteId: l.varianteId,
      productoId,
      localId: t.origenId,
      cantidad: -l.cantidad,
      tipo: 'traslado_salida',
      costoUnitario: costo,
      documento: { tipo: 'traslado', id: t.id },
    };
  });
}

export const trasladoSolicitar = manejador<'traslado.solicitar', PlanTrasladoNuevo>({
  validar(estado, d, ctx) {
    return planearTraslado(estado, ctx, d);
  },
  escribir(estado, plan, ctx) {
    escribirTrasladoNuevo(estado, plan, ctx);
  },
});

export const trasladoDespachar = manejador<'traslado.despachar', { id: Id; movs: MovPlan[] }>({
  validar(estado, d, ctx) {
    const t = requerirExiste(estado.traslados, d.trasladoId, 'el traslado', 'trasladoId');
    exigir(
      t.estado === 'solicitado',
      'ESTADO_INVALIDO',
      `El traslado ${t.numero} ya no está solicitado.`,
      'trasladoId',
    );
    exigir(
      t.aprobacion === 'no_requerida' || t.aprobacion === 'aprobada',
      'SIN_APROBACION',
      'El traslado está esperando la aprobación del dueño.',
      'trasladoId',
    );
    verificarExistencias(estado, t.origenId, t.lineas, 'trasladoId');
    return { id: t.id, movs: movimientosSalida(estado, t, ctx) };
  },
  escribir(estado, plan, ctx) {
    const t = estado.traslados[plan.id];
    if (!t) return;
    const cambios = aplicarMovimientos(estado, plan.movs, ctx);
    t.estado = 'en_transito';
    t.fechas.despachado = ctx.ts;
    marcarEditado(t, ctx);
    emitirInventario(estado, ctx, cambios);
    ctx.emitir({ tipo: 'TrasladoCambiado', trasladoId: t.id, estado: 'en_transito' });
  },
});

export const trasladoRecibir = manejador<
  'traslado.recibir',
  { id: Id; recibidas: number[]; movs: MovPlan[]; nota: string | null }
>({
  validar(estado, d, ctx) {
    const t = requerirExiste(estado.traslados, d.trasladoId, 'el traslado', 'trasladoId');
    exigir(
      t.estado === 'en_transito',
      'ESTADO_INVALIDO',
      `El traslado ${t.numero} no está en tránsito.`,
      'trasladoId',
    );
    const movs: MovPlan[] = [];
    const recibidas = t.lineas.map((l, i) => {
      const r = d.recibidas ? (d.recibidas[l.varianteId] ?? l.cantidad) : l.cantidad;
      enteroNoNegativo(r, 'recibidas', 'Las cantidades recibidas no pueden ser negativas.');
      exigir(
        r <= l.cantidad,
        'RECIBIDAS_EXCEDEN',
        'Se recibieron más unidades de las que salieron.',
        'recibidas',
      );
      const { productoId, costo } = costoDe(estado, l.varianteId);
      const base = {
        ts: ctx.ts,
        varianteId: l.varianteId,
        productoId,
        localId: t.destinoId,
        costoUnitario: costo,
        documento: { tipo: 'traslado' as const, id: t.id },
      };
      movs.push({ ...base, id: idHijo(t.id, `e${i + 1}`), cantidad: l.cantidad, tipo: 'traslado_entrada' });
      // I4: la diferencia queda como ajuste por pérdida en destino, con nota.
      if (r < l.cantidad)
        movs.push({
          ...base,
          id: idHijo(t.id, `p${i + 1}`),
          cantidad: r - l.cantidad,
          tipo: 'ajuste_manual',
          motivo: 'perdida',
          nota: `Faltante al recibir ${t.numero}`,
        });
      return r;
    });
    return { id: t.id, recibidas, movs, nota: d.nota };
  },
  escribir(estado, plan, ctx) {
    const t = estado.traslados[plan.id];
    if (!t) return;
    const cambios = aplicarMovimientos(estado, plan.movs, ctx);
    t.lineas.forEach((l, i) => {
      l.recibida = plan.recibidas[i] ?? l.cantidad;
    });
    t.estado = 'recibido';
    t.fechas.recibido = ctx.ts;
    if (plan.nota) t.nota = plan.nota;
    marcarEditado(t, ctx);
    emitirInventario(estado, ctx, cambios);
    ctx.emitir({ tipo: 'TrasladoCambiado', trasladoId: t.id, estado: 'recibido' });
  },
});

export const trasladoCancelar = manejador<
  'traslado.cancelar',
  { id: Id; movs: MovPlan[]; motivo: string; solicitudes: Id[] }
>({
  validar(estado, d, ctx) {
    const t = requerirExiste(estado.traslados, d.trasladoId, 'el traslado', 'trasladoId');
    exigir(
      t.estado === 'solicitado' || t.estado === 'en_transito',
      'ESTADO_INVALIDO',
      `El traslado ${t.numero} ya no se puede cancelar.`,
      'trasladoId',
    );
    const motivo = textoObligatorio(d.motivo, 'motivo', 'Escribe por qué se cancela el traslado.');
    const movs: MovPlan[] =
      t.estado === 'en_transito'
        ? t.lineas.map((l, i) => {
            const { productoId, costo } = costoDe(estado, l.varianteId);
            return {
              id: idHijo(t.id, `r${i + 1}`),
              ts: ctx.ts,
              varianteId: l.varianteId,
              productoId,
              localId: t.origenId,
              cantidad: l.cantidad,
              tipo: 'traslado_entrada',
              costoUnitario: costo,
              documento: { tipo: 'traslado', id: t.id },
              nota: 'Traslado cancelado: reingresa en origen',
            };
          })
        : [];
    const solicitudes = Object.values(estado.solicitudes)
      .filter((s) => s.estado === 'pendiente' && s.datos.tipo === 'traslado' && s.datos.trasladoId === t.id)
      .map((s) => s.id);
    return { id: t.id, movs, motivo, solicitudes };
  },
  escribir(estado, plan, ctx) {
    const t = estado.traslados[plan.id];
    if (!t) return;
    const cambios = aplicarMovimientos(estado, plan.movs, ctx);
    t.estado = 'cancelado';
    t.fechas.cancelado = ctx.ts;
    t.nota = plan.motivo;
    marcarEditado(t, ctx);
    for (const id of plan.solicitudes) {
      const s = estado.solicitudes[id];
      if (s) s.estado = 'vencida';
    }
    emitirInventario(estado, ctx, cambios);
    ctx.emitir({ tipo: 'TrasladoCambiado', trasladoId: t.id, estado: 'cancelado' });
  },
});

// ---------- Conteos ----------

export const conteoIniciar = manejador<'conteo.iniciar', { conteo: ConteoFisico; consecutivo: number }>({
  validar(estado, d, ctx) {
    idNuevo(estado.conteos, d.conteoId, 'conteoId');
    const local = requerir(estado.locales, d.localId, 'el local', 'localId');
    const enCurso = Object.values(estado.conteos).find(
      (c) => c.localId === local.id && c.estado === 'en_curso',
    );
    exigir(
      !enCurso,
      'CONTEO_EN_CURSO',
      `Ya hay un conteo en curso en ${local.nombre} (${enCurso?.numero ?? ''}).`,
      'localId',
    );
    if (d.categorias)
      exigir(
        d.categorias.length > 0,
        'SIN_CATEGORIAS',
        'Elige al menos una categoría o cuenta todo el local.',
        'categorias',
      );
    const lineas: ConteoFisico['lineas'] = {};
    for (const v of Object.values(estado.variantes)) {
      if (v.eliminadoEn) continue;
      const p = estado.productos[v.productoId];
      if (!p || p.eliminadoEn) continue;
      if (d.categorias && !d.categorias.includes(p.categoria)) continue;
      lineas[v.id] = { sistemaAlIniciar: existencia(estado, v.id, local.id), contado: null };
    }
    const consecutivo = leerConsecutivo(estado, 'conteo');
    return {
      consecutivo,
      conteo: {
        ...traza(ctx),
        id: d.conteoId,
        numero: numeroDocumento('CF', consecutivo, 6),
        localId: local.id,
        categorias: d.categorias ? [...d.categorias] : null,
        estado: 'en_curso',
        responsableId: personaQueActua(estado, ctx, null),
        iniciado: ctx.ts,
        lineas,
      },
    };
  },
  escribir(estado, plan, ctx) {
    estado.conteos[plan.conteo.id] = plan.conteo;
    fijarConsecutivo(estado, 'conteo', plan.consecutivo);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'conteos', id: plan.conteo.id, accion: 'creada' });
  },
});

function conteoEnCurso(estado: EstadoDominio, id: Id): ConteoFisico {
  const c = requerirExiste(estado.conteos, id, 'el conteo', 'conteoId');
  exigir(
    c.estado === 'en_curso',
    'ESTADO_INVALIDO',
    `El conteo ${c.numero} ya no está en curso.`,
    'conteoId',
  );
  return c;
}

export const conteoGuardar = manejador<'conteo.guardar', { id: Id; cantidades: Record<Id, number> }>({
  validar(estado, d) {
    const c = conteoEnCurso(estado, d.conteoId);
    for (const [v, n] of Object.entries(d.cantidades)) {
      exigir(v in c.lineas, 'VARIANTE_FUERA', 'Esa prenda no hace parte de este conteo.', 'cantidades');
      enteroNoNegativo(n, 'cantidades', 'Las cantidades contadas no pueden ser negativas.');
    }
    return { id: c.id, cantidades: { ...d.cantidades } };
  },
  escribir(estado, plan, ctx) {
    const c = estado.conteos[plan.id];
    if (!c) return;
    for (const [v, n] of Object.entries(plan.cantidades)) {
      const l = c.lineas[v];
      if (l) l.contado = n;
    }
    marcarEditado(c, ctx);
  },
});

export const conteoAplicar = manejador<
  'conteo.aplicar',
  { id: Id; movs: MovPlan[]; motivos: Record<Id, MotivoAjuste>; por: Id }
>({
  validar(estado, d, ctx) {
    const c = conteoEnCurso(estado, d.conteoId);
    const movs: MovPlan[] = [];
    let i = 0;
    for (const [v, l] of Object.entries(c.lineas)) {
      if (l.contado === null) continue;
      const diferencia = l.contado - existencia(estado, v, c.localId);
      if (diferencia === 0) continue;
      const motivo = d.motivos[v];
      exigir(
        motivo && MOTIVOS.includes(motivo),
        'MOTIVO_REQUERIDO',
        'Cada diferencia necesita un motivo (daño, pérdida, error, hallazgo u otro).',
        'motivos',
      );
      const { productoId, costo } = costoDe(estado, v);
      movs.push({
        id: idHijo(c.id, `m${++i}`),
        ts: ctx.ts,
        varianteId: v,
        productoId,
        localId: c.localId,
        cantidad: diferencia,
        tipo: 'ajuste_conteo',
        costoUnitario: costo,
        documento: { tipo: 'conteo', id: c.id },
        motivo,
      });
    }
    return { id: c.id, movs, motivos: { ...d.motivos }, por: personaQueActua(estado, ctx, null) };
  },
  escribir(estado, plan, ctx) {
    const c = estado.conteos[plan.id];
    if (!c) return;
    const cambios = aplicarMovimientos(estado, plan.movs, ctx);
    c.estado = 'aplicado';
    c.aplicado = { ts: ctx.ts, por: plan.por, motivos: plan.motivos };
    marcarEditado(c, ctx);
    emitirInventario(estado, ctx, cambios);
    ctx.emitir({ tipo: 'ConteoAplicado', conteoId: c.id, diferencias: plan.movs.length });
  },
});

export const conteoCancelar = manejador<'conteo.cancelar', { id: Id }>({
  validar(estado, d) {
    return { id: conteoEnCurso(estado, d.conteoId).id };
  },
  escribir(estado, plan, ctx) {
    const c = estado.conteos[plan.id];
    if (!c) return;
    c.estado = 'cancelado';
    marcarEditado(c, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'conteos', id: c.id, accion: 'editada' });
  },
});
