import QRCode from 'qrcode';

/**
 * QR (PLAN 5.13): `qrcode` arma la matriz; en pantalla se dibuja como un solo `<path>` SVG y en PDF como
 * rectángulos. Corrección de errores M. La factura simulada codifica texto, nunca una URL de la DIAN.
 */
export interface MatrizQr {
  tamano: number;
  /** true = módulo negro; índice fila × tamano + columna. */
  modulos: boolean[];
}

export function matrizQr(texto: string, correccion: 'L' | 'M' | 'Q' | 'H' = 'M'): MatrizQr {
  const qr = QRCode.create(texto, { errorCorrectionLevel: correccion });
  const tamano = qr.modules.size;
  const modulos: boolean[] = [];
  for (let i = 0; i < tamano * tamano; i++) modulos.push(qr.modules.data[i] === 1);
  return { tamano, modulos };
}

/** SVG del QR con margen de 4 módulos (zona silenciosa). */
export function qrASvg(texto: string, opciones: { color?: string; fondo?: string; margen?: number } = {}): string {
  const { tamano, modulos } = matrizQr(texto);
  const m = opciones.margen ?? 4;
  let d = '';
  for (let f = 0; f < tamano; f++)
    for (let c = 0; c < tamano; c++) if (modulos[f * tamano + c]) d += `M${c + m} ${f + m}h1v1h-1z`;
  const total = tamano + m * 2;
  const fondo = opciones.fondo ? `<rect width="${total}" height="${total}" fill="${opciones.fondo}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="Código QR">${fondo}<path d="${d}" fill="${opciones.color ?? '#0A0A0A'}"/></svg>`;
}
