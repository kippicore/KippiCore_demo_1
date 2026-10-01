import { useCallback, useState } from 'react';
import { avisar } from '@/ui';
import type { Parametros } from '@/dominio/tipos';
import { useAcciones } from '@/estado';
import { contarCambios, diferencia, establecerEn } from './calculos';

/**
 * Borrador de un formulario de parámetros: muestra lo guardado hasta que la persona cambia algo. Mientras no haya
 * cambios sigue lo guardado (si otra pestaña lo cambia, se ve al instante); al guardar, el borrador se suelta y
 * vuelve a mostrar lo guardado.
 */
export function useBorrador<T extends object>(inicial: T) {
  const [editado, setEditado] = useState<T | null>(null);
  const borrador = editado ?? inicial;
  const cambios = diferencia(inicial, borrador);
  const sucio = editado !== null && cambios !== null;
  const poner = useCallback((ruta: string, valor: unknown) => setEditado((prev) => establecerEn(prev ?? inicial, ruta, valor)), [inicial]);
  return {
    borrador,
    cambios,
    nCambios: contarCambios(cambios),
    sucio,
    poner,
    /** Reemplaza todo el borrador (volver a los valores de ejemplo). */
    reemplazar: (v: T) => setEditado(v),
    descartar: () => setEditado(null),
  };
}

export type SeccionParametros = keyof Parametros;

/**
 * Guarda los cambios de una sección de parámetros con `editarParametros` (un solo comando con lo que cambió).
 * Devuelve los errores por campo (clave = ruta completa, p. ej. 'nomina.recargos.nocturno') y uno general.
 */
export function useGuardarParametros(seccion: SeccionParametros) {
  const acciones = useAcciones();
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const guardar = (cambios: unknown, mensaje: string): boolean => {
    setErrores({});
    setGeneral(null);
    if (cambios === null || typeof cambios !== 'object') return true;
    const r = acciones.editarParametros({ seccion, cambios: cambios as Record<string, unknown> });
    if (!r.ok) {
      if (r.error.campo) setErrores({ [r.error.campo]: r.error.mensaje });
      else setGeneral(r.error.mensaje);
      return false;
    }
    avisar({ tipo: 'exito', texto: mensaje });
    return true;
  };
  const limpiar = () => {
    setErrores({});
    setGeneral(null);
  };
  return { guardar, errores, general, limpiar };
}
