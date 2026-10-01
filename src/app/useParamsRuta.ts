import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router';
import { leerParamsRuta, type NombreRuta, type ParamsLeidos } from './rutas';

/**
 * Parámetros tipados de una ruta (PLAN 5.5.1): `const { referencia, trasladar } = useParamsRuta('producto')`.
 * Valores de consulta inválidos llegan como null (la pantalla se muestra sin el efecto).
 */
export function useParamsRuta<N extends NombreRuta>(nombre: N): ParamsLeidos<N> {
  const params = useParams();
  const { search } = useLocation();
  return useMemo(() => leerParamsRuta(nombre, params, search), [nombre, params, search]);
}
