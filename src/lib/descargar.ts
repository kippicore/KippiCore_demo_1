/** Descarga un archivo generado en el navegador (único uso del DOM en lib, PLAN 5.3). */
export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Nombre de archivo seguro: sin tildes ni símbolos, con fecha. "Ventas detalladas" → "ventas-detalladas-2026-09-30". */
export function nombreArchivo(base: string, fecha: string, extension: 'pdf' | 'xlsx'): string {
  const limpio = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${limpio}-${fecha}.${extension}`;
}
