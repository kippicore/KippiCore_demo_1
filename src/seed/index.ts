/** Semilla de la plantilla (PLAN 5.4): lo que cambia por cliente junto con src/config. */
import {
  CATALOGO,
  CODIGO_CATEGORIA,
  CONSECUTIVO_PRODUCTO_INICIAL,
  NOMBRES_CATEGORIA,
  NOMBRES_LINEA,
} from './catalogo';
import { COLORES, FAMILIA_COLOR } from './colores';
import { CURVAS_TALLAS, CURVA_PEDIDO, DEMANDA_TALLAS } from './tallas';
import { CLIENTES_GUION, DUENO, EMPLEADOS, ESQUEMAS_COMISION, USUARIOS } from './elenco';
import { CADENA_IMPORTACION, CONTACTOS, CONTACTO_FABRICA, PROVEEDORES } from './proveedores';
import { BANDAS_SALDO, CUENTAS } from './cuentas';
import { GASTOS_OCASIONALES, GASTOS_RECURRENTES } from './gastos';
import { CAMPANAS, CITAS } from './calendario';
import { COSTOS_EJEMPLO, HISTORIA_IMPORTACIONES, IMPORTACIONES_EN_CURSO } from './importaciones';
import { TIPOS_LATENTES_CLIENTES } from './clientes';

export const SEED = {
  catalogo: CATALOGO,
  codigoCategoria: CODIGO_CATEGORIA,
  nombresCategoria: NOMBRES_CATEGORIA,
  nombresLinea: NOMBRES_LINEA,
  consecutivoProductoInicial: CONSECUTIVO_PRODUCTO_INICIAL,
  colores: COLORES,
  familiaColor: FAMILIA_COLOR,
  curvasTallas: CURVAS_TALLAS,
  demandaTallas: DEMANDA_TALLAS,
  curvaPedido: CURVA_PEDIDO,
  dueno: DUENO,
  empleados: EMPLEADOS,
  usuarios: USUARIOS,
  esquemasComision: ESQUEMAS_COMISION,
  clientesGuion: CLIENTES_GUION,
  proveedores: PROVEEDORES,
  contactos: CONTACTOS,
  cadenaImportacion: CADENA_IMPORTACION,
  contactoFabrica: CONTACTO_FABRICA,
  cuentas: CUENTAS,
  bandasSaldo: BANDAS_SALDO,
  gastosRecurrentes: GASTOS_RECURRENTES,
  gastosOcasionales: GASTOS_OCASIONALES,
  campanas: CAMPANAS,
  citas: CITAS,
  importacionesEnCurso: IMPORTACIONES_EN_CURSO,
  historiaImportaciones: HISTORIA_IMPORTACIONES,
  costosEjemplo: COSTOS_EJEMPLO,
  tiposLatentesClientes: TIPOS_LATENTES_CLIENTES,
};
export type Seed = typeof SEED;
