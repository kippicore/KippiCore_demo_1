import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useBolsa } from './bolsa';
import { unidadesEnBolsa } from './calculos';

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

/**
 * Contador de la bolsa en el encabezado. El encabezado es del layout (`src/layouts/tienda`), que hoy pinta 0 fijo;
 * mientras el layout no lea `useCantidadBolsa()` de `@/tienda/publico`, cada página lo actualiza aquí sobre el mismo
 * enlace. Si el layout llega a pintar su propio contador, esto no agrega otro.
 */
export function useContadorEnEncabezado(): void {
  useEffect(() => {
    const ancla = document.querySelector<HTMLAnchorElement>('header a[aria-label^="Bolsa"]');
    if (!ancla) return;
    const pintar = (n: number) => {
      const propio = ancla.querySelector<HTMLElement>('[data-tienda-contador]');
      const ajeno = Array.from(ancla.querySelectorAll('span')).some((s) => !s.hasAttribute('data-tienda-contador') && s.textContent?.trim());
      ancla.setAttribute('aria-label', n > 0 ? `Bolsa: ${n} ${n === 1 ? 'artículo' : 'artículos'}` : 'Bolsa');
      if (ajeno) {
        propio?.remove();
        return;
      }
      if (n <= 0) {
        propio?.remove();
        return;
      }
      if (propio) {
        propio.textContent = String(n);
        return;
      }
      const span = document.createElement('span');
      span.setAttribute('data-tienda-contador', '');
      span.setAttribute('data-testid', 'tienda-contador-bolsa');
      span.className = 'absolute right-0.5 top-0.5 inline-flex size-4 items-center justify-center rounded-full bg-ink t-micro num text-inverse';
      span.textContent = String(n);
      ancla.appendChild(span);
    };
    pintar(unidadesEnBolsa(useBolsa.getState().lineas));
    return useBolsa.subscribe((s) => pintar(unidadesEnBolsa(s.lineas)));
  }, []);
}
