import type { jsPDF } from 'jspdf';

/**
 * Figtree estática embebida en el PDF (PLAN 5.12, R2). TTF estáticas (Regular 400, Bold 700, Black 900)
 * instanciadas desde la fuente variable autohospedada (@fontsource-variable/figtree, subconjunto latino que
 * incluye á é í ó ú ñ ü ¿ ¡ ¥ − y el espacio duro) con `fonttools varLib.instancer`; licencia OFL en
 * fuentes/OFL.txt. jsPDF las codifica como Identity-H (Unicode). Se cargan con import() diferido solo al exportar.
 *
 * Regular y Bold se registran bajo la MISMA familia 'Figtree' (autotable usa fontStyle 'bold' en encabezados);
 * Black aparte como 'Figtree-Black' (wordmark).
 */
export const FAMILIA_PDF = 'Figtree';
export const FAMILIA_PDF_BLACK = 'Figtree-Black';

let cache: Promise<{ regular: string; bold: string; black: string }> | null = null;

const base64DeDataUrl = (u: string) => u.slice(u.indexOf(',') + 1);

function cargarBase64(): Promise<{ regular: string; bold: string; black: string }> {
  cache ??= Promise.all([
    import('./fuentes/Figtree-Regular.ttf?inline'),
    import('./fuentes/Figtree-Bold.ttf?inline'),
    import('./fuentes/Figtree-Black.ttf?inline'),
  ]).then(([r, b, k]) => ({
    regular: base64DeDataUrl(r.default),
    bold: base64DeDataUrl(b.default),
    black: base64DeDataUrl(k.default),
  }));
  return cache;
}

/** Registra Figtree en el documento; false si no se pudo (se usa Helvetica con el normalizador ampliado). */
export async function registrarFigtree(doc: jsPDF): Promise<boolean> {
  try {
    const f = await cargarBase64();
    doc.addFileToVFS('Figtree-Regular.ttf', f.regular);
    doc.addFont('Figtree-Regular.ttf', FAMILIA_PDF, 'normal');
    doc.addFileToVFS('Figtree-Bold.ttf', f.bold);
    doc.addFont('Figtree-Bold.ttf', FAMILIA_PDF, 'bold');
    doc.addFileToVFS('Figtree-Black.ttf', f.black);
    doc.addFont('Figtree-Black.ttf', FAMILIA_PDF_BLACK, 'normal');
    doc.setFont(FAMILIA_PDF, 'normal');
    return true;
  } catch {
    cache = null;
    return false;
  }
}
