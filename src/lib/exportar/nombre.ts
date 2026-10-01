/** Nombre de archivo seguro: sin tildes ni símbolos, con fecha. "Ventas detalladas" → "ventas-detalladas-2026-09-30.pdf". */
export function nombreArchivo(base: string, fecha: string, extension: 'pdf' | 'xlsx'): string {
  const limpio = base
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${limpio}-${fecha}.${extension}`;
}
