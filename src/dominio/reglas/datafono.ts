import type { COP, Fraccion, ParametrosDatafono } from '../tipos';
import { redondear } from './dinero';

/** Abono neto del datáfono (PLAN 6.20.12, V11). Comisión y retenciones ilustrativas. */
export interface CobradoDatafono {
  debito: COP;
  credito: COP;
}

export interface AbonoCalculado {
  bruto: COP;
  comision: COP;
  retenciones: { fuente: COP; iva: COP; ica: COP };
  neto: COP;
}

export function calcularAbonoDatafono(
  cobrado: CobradoDatafono,
  parametros: ParametrosDatafono,
  iva: Fraccion,
): AbonoCalculado {
  const bruto = cobrado.debito + cobrado.credito;
  const comision = redondear(
    cobrado.debito * parametros.comisionDebito + cobrado.credito * parametros.comisionCredito,
  );
  const sinIva = bruto / (1 + iva);
  const ivaIncluido = bruto - sinIva;
  const retenciones = {
    fuente: redondear(sinIva * parametros.retenciones.fuente),
    iva: redondear(ivaIncluido * parametros.retenciones.iva),
    ica: redondear(sinIva * parametros.retenciones.ica),
  };
  const neto = bruto - comision - retenciones.fuente - retenciones.iva - retenciones.ica;
  return { bruto, comision, retenciones, neto };
}
