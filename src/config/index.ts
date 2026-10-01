/** Configuración de la plantilla (PLAN 5.4): lo que cambia por cliente. */
import type { Parametros } from '@/dominio/tipos';
import { EMPRESA, MARCA } from './marca';
import { CLIENTES, DEMO } from './demo';
import { MONEDAS, TASA_EJEMPLO } from './monedas';
import { ID_BODEGA, LOCALES, LOCALES_QUE_VENDEN } from './locales';
import {
  PARAMETROS_DATAFONO,
  PARAMETROS_IMPUESTOS,
  PARAMETROS_INVENTARIO,
  PARAMETROS_VENTAS,
  RESOLUCIONES,
} from './negocio';
import { PARAMETROS_NOMINA } from './nomina';
import { PARAMETROS_ADUANAS } from './aduanas';
import { PARAMETROS_SEGMENTACION } from './segmentacion';
import { PARAMETROS_OBLIGACIONES } from './obligaciones';
import { PLANTILLA_TURNOS } from './turnos';

/** Parámetros iniciales del estado (6.3). */
export const PARAMETROS: Parametros = {
  nomina: PARAMETROS_NOMINA,
  impuestos: PARAMETROS_IMPUESTOS,
  obligaciones: PARAMETROS_OBLIGACIONES,
  aduanas: PARAMETROS_ADUANAS,
  ventas: PARAMETROS_VENTAS,
  datafono: PARAMETROS_DATAFONO,
  segmentacion: PARAMETROS_SEGMENTACION,
  inventario: PARAMETROS_INVENTARIO,
};

export const CONFIG = {
  empresa: EMPRESA,
  marca: MARCA,
  demo: DEMO,
  clientes: CLIENTES,
  monedas: MONEDAS,
  tasaEjemplo: TASA_EJEMPLO,
  locales: LOCALES,
  idBodega: ID_BODEGA,
  localesQueVenden: LOCALES_QUE_VENDEN,
  parametros: PARAMETROS,
  resoluciones: RESOLUCIONES,
  plantillaTurnos: PLANTILLA_TURNOS,
};
export type Config = typeof CONFIG;
