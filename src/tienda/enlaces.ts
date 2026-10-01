import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

/** Agrega `marco=1` a una URL interna (la query que ya traiga se conserva). */
export function conMarco(url: string, enMarco: boolean): string {
  if (!enMarco) return url;
  const [base, hash] = url.split('#');
  const sep = (base ?? '').includes('?') ? '&' : '?';
  return `${base}${sep}marco=1${hash !== undefined ? `#${hash}` : ''}`;
}

/**
 * La tienda también se ve dentro de los marcos (`/tienda?marco=1`): ahí todos los enlaces internos conservan
 * `?marco=1` para que la navegación siga siendo "de marco" (sin la etiqueta de vitrina del layout).
 */
export function useEnlaces() {
  const { search } = useLocation();
  const enMarco = new URLSearchParams(search).get('marco') === '1';
  const navegar = useNavigate();
  const con = useCallback((url: string) => conMarco(url, enMarco), [enMarco]);
  const ir = useCallback((url: string, opciones?: { replace?: boolean }) => navegar(conMarco(url, enMarco), opciones), [enMarco, navegar]);
  return { enMarco, con, ir };
}
