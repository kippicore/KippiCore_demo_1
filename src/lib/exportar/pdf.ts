import type { jsPDF } from 'jspdf';
import { barrasEan13 } from '../codigos/barras';
import { matrizQr } from '../codigos/qr';
import { FAMILIA_PDF, FAMILIA_PDF_BLACK, registrarFigtree } from './fuentes';
import { normalizarTextoPdf } from './texto-pdf';

/**
 * Documento PDF con la marca activa (PLAN 5.12): encabezado con el wordmark (Figtree Black, tracking simulado con
 * charSpace), título en mayúsculas, línea de filtros y moneda, fecha y hora de generación; pie
 * "Generado con KippiCore CRM · Página 2 de 5"; marca de agua diagonal opcional. jsPDF y autotable se cargan
 * con import() (nunca en la carga inicial).
 *
 * Las cifras llegan YA formateadas (lib/formato.ts): este módulo no formatea.
 */
export interface OpcionesPdf {
  /** Wordmark: marca activa (HALDEN o la personalizada). */
  marca: string;
  descriptor?: string;
  titulo: string;
  subtitulo?: string;
  /** "Local: Usaquén · Del 01/09/2026 al 30/09/2026 · Cifras en COP" */
  filtros?: string;
  /** "Generado el 30/09/2026, 3:45 p. m." */
  generado: string;
  /** "Generado con KippiCore CRM" */
  pie: string;
  orientacion?: 'vertical' | 'horizontal';
  /** 'a4' o [ancho, alto] en mm (documento POS de 80 mm). */
  formato?: 'a4' | [number, number];
  /** "DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL" */
  marcaAgua?: string | null;
  /** Encabezado compacto (tirilla POS, etiquetas). */
  compacto?: boolean;
  /** Sin encabezado ni pie (hojas de etiquetas). */
  sinEncabezado?: boolean;
}

export type AlineacionPdf = 'left' | 'right' | 'center';
export interface ColumnaPdf {
  titulo: string;
  alineacion?: AlineacionPdf;
  /** Ancho en mm (opcional). */
  ancho?: number;
}

export interface DocumentoPdf {
  readonly doc: jsPDF;
  /** Familia en uso: 'Figtree' o 'helvetica' (respaldo). */
  readonly fuente: string;
  /** Cursor vertical en mm. */
  y: number;
  readonly margen: number;
  readonly anchoUtil: number;
  texto(t: string): string;
  titulo2(t: string): void;
  parrafo(t: string, opciones?: { tamano?: number; negrita?: boolean; color?: [number, number, number] }): void;
  resumen(kpis: { etiqueta: string; valor: string }[]): void;
  tabla(columnas: ColumnaPdf[], filas: string[][], totales?: string[] | null): void;
  /** Pares etiqueta → valor en dos columnas (fichas, desprendibles). */
  pares(pares: [string, string][], opciones?: { negritaUltimo?: boolean }): void;
  codigoBarras(ean: string, x: number, y: number, ancho: number, alto: number): void;
  qr(texto: string, x: number, y: number, tamano: number): void;
  espacio(mm: number): void;
  nuevaPagina(): void;
  /** Cierra el documento (pies y marca de agua) y lo devuelve como bytes. */
  arrayBuffer(): ArrayBuffer;
  blob(): Blob;
}

const NEGRO: [number, number, number] = [10, 10, 10];
const GRIS: [number, number, number] = [110, 110, 110];

export async function crearDocumentoPdf(o: OpcionesPdf): Promise<DocumentoPdf> {
  const [{ jsPDF: JsPdf, GState }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new JsPdf({
    orientation: o.orientacion === 'horizontal' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: o.formato ?? 'a4',
    compress: true,
  });
  const conFigtree = await registrarFigtree(doc);
  const fuente = conFigtree ? FAMILIA_PDF : 'helvetica';
  const fuenteBlack = conFigtree ? FAMILIA_PDF_BLACK : 'helvetica';
  const estiloBlack = conFigtree ? 'normal' : 'bold';
  const t = (s: string) => normalizarTextoPdf(s, !conFigtree);
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const compacto = o.compacto ?? false;
  const margen = compacto ? 5 : 15;
  const anchoUtil = ancho - margen * 2;
  let cerrado = false;

  const encabezado = (): number => {
    if (o.sinEncabezado) return margen;
    let y = margen + (compacto ? 4 : 6);
    doc.setTextColor(...NEGRO);
    doc.setFont(fuenteBlack, estiloBlack);
    doc.setFontSize(compacto ? 13 : 16);
    doc.setCharSpace(compacto ? 0.6 : 0.9);
    doc.text(t(o.marca.toUpperCase()), compacto ? ancho / 2 : margen, y, { align: compacto ? 'center' : 'left' });
    doc.setCharSpace(0);
    if (o.descriptor) {
      doc.setFont(fuente, 'normal');
      doc.setFontSize(compacto ? 7 : 8);
      doc.setTextColor(...GRIS);
      y += compacto ? 4 : 4.5;
      doc.text(t(o.descriptor), compacto ? ancho / 2 : margen, y, { align: compacto ? 'center' : 'left' });
    }
    y += compacto ? 6 : 9;
    doc.setTextColor(...NEGRO);
    doc.setFont(fuente, 'bold');
    doc.setFontSize(compacto ? 9 : 13);
    const tituloLineas = doc.splitTextToSize(t(o.titulo.toUpperCase()), anchoUtil) as string[];
    doc.text(tituloLineas, compacto ? ancho / 2 : margen, y, { align: compacto ? 'center' : 'left' });
    y += tituloLineas.length * (compacto ? 4 : 5.5);
    doc.setFont(fuente, 'normal');
    doc.setFontSize(compacto ? 7 : 8.5);
    doc.setTextColor(...GRIS);
    for (const linea of [o.subtitulo, o.filtros, o.generado].filter((x): x is string => !!x)) {
      const ls = doc.splitTextToSize(t(linea), anchoUtil) as string[];
      doc.text(ls, compacto ? ancho / 2 : margen, y, { align: compacto ? 'center' : 'left' });
      y += ls.length * (compacto ? 3.3 : 4);
    }
    doc.setDrawColor(10, 10, 10);
    doc.setLineWidth(0.3);
    doc.line(margen, y, ancho - margen, y);
    return y + (compacto ? 4 : 7);
  };

  const pd: DocumentoPdf = {
    doc,
    fuente,
    y: encabezado(),
    margen,
    anchoUtil,
    texto: t,
    titulo2(s) {
      asegurar(12);
      doc.setFont(fuente, 'bold');
      doc.setFontSize(compacto ? 8 : 10.5);
      doc.setTextColor(...NEGRO);
      doc.text(t(s.toUpperCase()), margen, this.y);
      this.y += compacto ? 4.5 : 6.5;
    },
    parrafo(s, op = {}) {
      doc.setFont(fuente, op.negrita ? 'bold' : 'normal');
      const tam = op.tamano ?? (compacto ? 7.5 : 9);
      doc.setFontSize(tam);
      doc.setTextColor(...(op.color ?? NEGRO));
      const lineas = doc.splitTextToSize(t(s), anchoUtil) as string[];
      const altoTexto = lineas.length * tam * 0.42;
      asegurar(altoTexto);
      doc.text(lineas, margen, this.y + tam * 0.3);
      this.y += altoTexto + 2;
    },
    resumen(kpis) {
      const n = Math.min(4, Math.max(1, kpis.length));
      const anchoCaja = anchoUtil / n;
      kpis.forEach((k, i) => {
        const fila = Math.floor(i / n);
        const col = i % n;
        const x = margen + col * anchoCaja;
        const y = this.y + fila * 16;
        doc.setFont(fuente, 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...GRIS);
        doc.text(t(k.etiqueta), x, y);
        doc.setFont(fuente, 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...NEGRO);
        doc.text(t(k.valor), x, y + 6);
      });
      this.y += Math.ceil(kpis.length / n) * 16 + 2;
    },
    tabla(columnas, filas, totales) {
      autoTable(doc, {
        startY: this.y,
        margin: { left: margen, right: margen, bottom: 16 },
        head: [columnas.map((c) => t(c.titulo))],
        body: filas.map((f) => f.map(t)),
        foot: totales ? [totales.map(t)] : undefined,
        showFoot: 'lastPage',
        theme: 'plain',
        styles: {
          font: fuente,
          fontSize: compacto ? 7 : 8,
          cellPadding: compacto ? 0.8 : 1.6,
          textColor: NEGRO,
          lineColor: [225, 225, 225],
          lineWidth: { bottom: 0.1 },
        },
        headStyles: { fontStyle: 'bold', fillColor: NEGRO, textColor: [255, 255, 255] },
        footStyles: { fontStyle: 'bold', fillColor: [245, 245, 245] },
        columnStyles: Object.fromEntries(
          columnas.map((c, i) => [
            i,
            { halign: c.alineacion ?? 'left', ...(c.ancho ? { cellWidth: c.ancho } : {}) },
          ]),
        ),
      });
      const fin = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? this.y;
      this.y = fin + (compacto ? 3 : 6);
    },
    pares(pares, op = {}) {
      doc.setFontSize(compacto ? 7.5 : 9);
      pares.forEach(([a, b], i) => {
        const negrita = op.negritaUltimo && i === pares.length - 1;
        doc.setFont(fuente, negrita ? 'bold' : 'normal');
        doc.setTextColor(...(negrita ? NEGRO : GRIS));
        doc.text(t(a), margen, this.y);
        doc.setTextColor(...NEGRO);
        doc.text(t(b), ancho - margen, this.y, { align: 'right' });
        this.y += compacto ? 3.6 : 4.8;
      });
      this.y += 1.5;
    },
    codigoBarras(ean, x, y, anchoB, altoB) {
      const modulo = anchoB / 95;
      doc.setFillColor(...NEGRO);
      for (const b of barrasEan13(ean)) doc.rect(x + b.x * modulo, y, b.ancho * modulo, altoB, 'F');
    },
    qr(texto, x, y, tamano) {
      const { tamano: n, modulos } = matrizQr(texto);
      const m = tamano / n;
      doc.setFillColor(...NEGRO);
      for (let f = 0; f < n; f++) for (let c = 0; c < n; c++) if (modulos[f * n + c]) doc.rect(x + c * m, y + f * m, m, m, 'F');
    },
    espacio(mm) {
      this.y += mm;
    },
    nuevaPagina() {
      doc.addPage();
      this.y = encabezado();
    },
    arrayBuffer() {
      cerrar();
      return doc.output('arraybuffer');
    },
    blob() {
      cerrar();
      return doc.output('blob');
    },
  };

  function asegurar(mm: number): void {
    if (pd.y + mm > alto - 16 && !compacto) {
      doc.addPage();
      pd.y = margen + 5;
    }
  }

  function cerrar(): void {
    if (cerrado) return;
    cerrado = true;
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      if (o.marcaAgua) {
        doc.saveGraphicsState();
        doc.setGState(new GState({ opacity: 0.1 }));
        doc.setFont(fuente, 'bold');
        doc.setFontSize(compacto ? 14 : 30);
        doc.setTextColor(...NEGRO);
        doc.text(t(o.marcaAgua), ancho / 2, alto / 2, { align: 'center', angle: compacto ? 60 : 35 });
        doc.restoreGraphicsState();
      }
      if (!o.sinEncabezado) {
        doc.setFont(fuente, 'normal');
        doc.setFontSize(compacto ? 6.5 : 7.5);
        doc.setTextColor(...GRIS);
        const pie = compacto ? o.pie : `${o.pie} · Página ${p} de ${total}`;
        doc.text(t(pie), ancho / 2, alto - (compacto ? 4 : 8), { align: 'center' });
      }
    }
  }

  return pd;
}
