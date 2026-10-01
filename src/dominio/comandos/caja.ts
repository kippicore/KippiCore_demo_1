import type { EgresoCaja, EstadoDominio, Gasto, Id, MovimientoCuenta, SesionCaja } from '../tipos';
import { exigir } from '../errores';
import { idHijo } from '../motor/ids';
import { efectivoEsperado, sumaDenominaciones } from '../reglas/caja';
import { fechaDe } from '../reglas/fechas';
import { pesos } from '../reglas/texto';
import {
  enteroNoNegativo,
  enteroPositivo,
  idNuevo,
  personaQueActua,
  requerir,
  requerirExiste,
  textoObligatorio,
} from './comunes';
import {
  agregarMovimientoCuenta,
  claveCajaDia,
  manejador,
  marcarEditado,
  registrarAperturaCaja,
  registrarCierreCaja,
  traza,
} from './tx';

/** Caja (PLAN 6.7, 6.21, V8, W11): una sesión por local y día, arqueo ciego y revisión del dueño. */

const CATEGORIAS_EGRESO = ['servicios', 'transporte', 'mantenimiento', 'empaques', 'publicidad', 'otros'];

function sesionAbierta(estado: EstadoDominio, id: Id): SesionCaja {
  const s = requerirExiste(estado.sesionesCaja, id, 'la caja', 'sesionId');
  exigir(s.cierre === null, 'CAJA_CERRADA', 'Esa caja ya se cerró.', 'sesionId');
  return s;
}

export const cajaAbrir = manejador<'caja.abrir', SesionCaja>({
  validar(estado, d, ctx) {
    idNuevo(estado.sesionesCaja, d.sesionId, 'sesionId');
    const local = requerir(estado.locales, d.localId, 'el local', 'localId');
    exigir(local.vende && local.cuentaCajaId, 'LOCAL_SIN_CAJA', `${local.nombre} no tiene caja.`, 'localId');
    enteroNoNegativo(d.baseInicial, 'baseInicial', 'La base de la caja no puede ser negativa.');
    const hoy = fechaDe(ctx.ts);
    const abierta = estado.agregados.cajaAbierta[local.id];
    const previa = abierta ? estado.sesionesCaja[abierta] : undefined;
    exigir(
      !previa || previa.cierre !== null,
      'CAJA_ABIERTA',
      `La caja de ${local.nombre} sigue abierta desde ${previa ? fechaDe(previa.abierta.ts) : ''}.`,
      'localId',
    );
    exigir(
      !estado.agregados.cajaDia[claveCajaDia(local.id, hoy)],
      'CAJA_DEL_DIA',
      `La caja de ${local.nombre} ya se abrió hoy.`,
      'localId',
    );
    return {
      ...traza(ctx),
      id: d.sesionId,
      localId: local.id,
      cuentaId: local.cuentaCajaId,
      abierta: { ts: ctx.ts, por: personaQueActua(estado, ctx, d.por), baseInicial: d.baseInicial },
      egresos: [],
      cierre: null,
      revision: null,
    };
  },
  escribir(estado, sesion, ctx) {
    estado.sesionesCaja[sesion.id] = sesion;
    registrarAperturaCaja(estado, sesion);
    ctx.emitir({ tipo: 'CajaAbierta', sesionId: sesion.id, localId: sesion.localId });
  },
});

export const cajaEgreso = manejador<
  'caja.egreso',
  { sesionId: Id; egreso: EgresoCaja; gasto: Gasto; mov: MovimientoCuenta }
>({
  validar(estado, d, ctx) {
    const s = sesionAbierta(estado, d.sesionId);
    exigir(
      !s.egresos.some((e) => e.id === d.egresoId),
      'ID_DUPLICADO',
      'Ese egreso ya se registró.',
      'egresoId',
    );
    const concepto = textoObligatorio(d.concepto, 'concepto', 'Escribe en qué se usó la plata.');
    enteroPositivo(d.valor, 'valor', 'El valor del egreso debe ser mayor que cero.');
    exigir(
      CATEGORIAS_EGRESO.includes(d.categoria),
      'CATEGORIA_INVALIDA',
      'Elige una categoría de gasto de caja.',
      'categoria',
    );
    const disponible = efectivoEsperado(
      s.abierta.baseInicial,
      estado.agregados.efectivoSesion[s.id] ?? 0,
      s.egresos,
    );
    exigir(d.valor <= disponible, 'EFECTIVO_INSUFICIENTE', `En la caja hay ${pesos(disponible)}.`, 'valor');
    const gastoId = idHijo(d.egresoId, 'g');
    const movId = idHijo(d.egresoId, 'm');
    idNuevo(estado.gastos, gastoId);
    const fecha = fechaDe(ctx.ts);
    return {
      sesionId: s.id,
      egreso: { id: d.egresoId, ts: ctx.ts, concepto, valor: d.valor, categoria: d.categoria, gastoId },
      gasto: {
        ...traza(ctx),
        id: gastoId,
        fecha,
        localId: s.localId,
        categoria: d.categoria,
        concepto,
        valor: d.valor,
        iva: 0,
        proveedorId: null,
        estadoPago: 'pagado',
        medio: 'efectivo',
        cuentaId: s.cuentaId,
        movimientoCuentaId: movId,
        cuentaPorPagarId: null,
        recurrenteId: null,
        documento: { tipo: 'sesion_caja', id: s.id },
        soporte: null,
      },
      mov: {
        ...traza(ctx),
        id: movId,
        cuentaId: s.cuentaId,
        ts: ctx.ts,
        valor: -d.valor,
        tipo: 'gasto',
        descripcion: concepto,
        documento: { tipo: 'gasto', id: gastoId },
        contraparte: null,
        montoOrigen: null,
        transferenciaId: null,
        conciliado: true,
      },
    };
  },
  escribir(estado, plan, ctx) {
    const s = estado.sesionesCaja[plan.sesionId];
    if (!s) return;
    s.egresos.push(plan.egreso);
    estado.gastos[plan.gasto.id] = plan.gasto;
    agregarMovimientoCuenta(estado, plan.mov);
    ctx.emitir({ tipo: 'GastoRegistrado', gastoId: plan.gasto.id });
  },
});

export const cajaCerrar = manejador<
  'caja.cerrar',
  { sesionId: Id; cierre: NonNullable<SesionCaja['cierre']>; ajuste: MovimientoCuenta | null }
>({
  validar(estado, d, ctx) {
    const s = sesionAbierta(estado, d.sesionId);
    enteroNoNegativo(d.efectivoContado, 'efectivoContado', 'Escribe el efectivo contado.');
    if (d.denominaciones) {
      exigir(
        sumaDenominaciones(d.denominaciones) === d.efectivoContado,
        'CONTEO_DESCUADRADO',
        'El total no coincide con las denominaciones contadas.',
        'denominaciones',
      );
    }
    exigir(
      ctx.ts >= s.abierta.ts,
      'FECHA_INVALIDA',
      'La caja no se puede cerrar antes de abrirla.',
      'sesionId',
    );
    const esperado = efectivoEsperado(
      s.abierta.baseInicial,
      estado.agregados.efectivoSesion[s.id] ?? 0,
      s.egresos,
    );
    const diferencia = d.efectivoContado - esperado;
    const local = estado.locales[s.localId];
    return {
      sesionId: s.id,
      cierre: {
        ts: ctx.ts,
        por: personaQueActua(estado, ctx, d.por),
        ciego: ctx.actor !== 'dueno',
        denominaciones: d.denominaciones ? { ...d.denominaciones } : null,
        efectivoContado: d.efectivoContado,
        efectivoEsperado: esperado,
        diferencia,
        observacion: d.observacion,
      },
      // La cuenta de la caja refleja el efectivo contado: la diferencia del arqueo queda como ajuste.
      ajuste:
        diferencia === 0
          ? null
          : {
              ...traza(ctx),
              id: idHijo(s.id, 'arqueo'),
              cuentaId: s.cuentaId,
              ts: ctx.ts,
              valor: diferencia,
              tipo: 'ajuste',
              descripcion: `${diferencia < 0 ? 'Faltante' : 'Sobrante'} en el arqueo de ${local?.nombre ?? 'la caja'}`,
              documento: { tipo: 'sesion_caja', id: s.id },
              contraparte: null,
              montoOrigen: null,
              transferenciaId: null,
              conciliado: true,
            },
    };
  },
  escribir(estado, plan, ctx) {
    const s = estado.sesionesCaja[plan.sesionId];
    if (!s) return;
    s.cierre = plan.cierre;
    registrarCierreCaja(estado, s);
    marcarEditado(s, ctx);
    if (plan.ajuste) agregarMovimientoCuenta(estado, plan.ajuste);
    ctx.emitir({
      tipo: 'CajaCerrada',
      sesionId: s.id,
      localId: s.localId,
      diferencia: plan.cierre.diferencia,
    });
  },
});

export const cajaRevisarCierre = manejador<
  'caja.revisarCierre',
  { sesionId: Id; nota: string | null; por: Id }
>({
  validar(estado, d, ctx) {
    const s = requerirExiste(estado.sesionesCaja, d.sesionId, 'la caja', 'sesionId');
    exigir(s.cierre !== null, 'CAJA_ABIERTA', 'La caja todavía no se ha cerrado.', 'sesionId');
    exigir(s.revision === null, 'YA_REVISADO', 'Ese cierre ya está revisado.', 'sesionId');
    return { sesionId: s.id, nota: d.nota, por: ctx.usuarioId };
  },
  escribir(estado, plan, ctx) {
    const s = estado.sesionesCaja[plan.sesionId];
    if (!s) return;
    s.revision = { ts: ctx.ts, por: plan.por, nota: plan.nota };
    marcarEditado(s, ctx);
    ctx.emitir({ tipo: 'CierreRevisado', sesionId: s.id, localId: s.localId });
  },
});
