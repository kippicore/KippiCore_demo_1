/**
 * Lo que la app necesita saber del dispositivo (instalación, iOS, navegador interno). Solo lectura del navegador,
 * siempre dentro de try/catch: en modo privado, en un marco o en un entorno sin `matchMedia` no debe romper nada.
 */

/** ¿Se abrió desde el ícono de la pantalla de inicio (PWA instalada)? */
export function esPwaInstalada(): boolean {
  try {
    const nav = globalThis.navigator as unknown as { standalone?: boolean } | undefined;
    return !!nav?.standalone || !!globalThis.matchMedia?.('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

export function esIosNavegador(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}

/** WhatsApp, Instagram, Facebook y similares: no se puede instalar desde ahí. */
export function esNavegadorInternoApp(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\//i.test(ua);
}

/** Enlace de la demo sin el hash del QR ni la marca de marco: es el que se comparte o se copia. */
export function enlaceParaCompartir(): string {
  try {
    const u = new URL(globalThis.location.href);
    u.hash = '';
    u.pathname = '/';
    u.searchParams.delete('marco');
    u.searchParams.delete('fuente');
    return u.toString();
  } catch {
    return '';
  }
}
