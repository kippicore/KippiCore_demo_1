/** `<meta name="theme-color">` = el `canvas` del tema activo (leído del token, sin hex en el código). */
export function sincronizarColorTema(): void {
  const valor = getComputedStyle(document.documentElement).getPropertyValue('--c-canvas').trim();
  if (valor) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', valor);
}
