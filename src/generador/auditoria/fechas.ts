import type { FechaISO, ParametrosAduanas } from '@/dominio/tipos';
import { hitosIniciales } from '@/dominio/reglas/importaciones';

export { diaSemana, diferenciaDias, minutosDeHora, sumarMesesAMes } from '@/dominio/reglas/fechas';

/** Llegada a bodega estimada al crear el pedido (los días por defecto de cada estado): base del retraso (P14). */
export function hitosInicialesFecha(
  fechaPedido: FechaISO,
  dias: ParametrosAduanas['diasEstimadosEntreEstados'],
): FechaISO {
  return hitosIniciales(fechaPedido, dias).recibido_bodega.estimada;
}
