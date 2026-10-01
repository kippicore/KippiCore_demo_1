import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { unzipSync, strFromU8 } from 'fflate';
import { generarEan13 } from '@/dominio/reglas/ean13';
import { crearDocumentoPdf } from './pdf';
import { crearLibroExcel, sumaColumna } from './excel';
import { normalizarTextoPdf } from './texto-pdf';

/** Exportes (5.12, R2, T18): PDF con Figtree embebida y tildes; Excel con totales en caché. */
const FRASE = `Ñandú, cigüeña, ¿sí? ¡Año! ${String.fromCharCode(0x2212)}$${String.fromCharCode(0xa0)}1.250.000`;

describe('PDF con Figtree', () => {
  it('la frase de control sale con Figtree (familia con normal y bold) y ancho > 0', async () => {
    const pdf = await crearDocumentoPdf({
      marca: 'HALDEN',
      descriptor: 'Moda masculina · Bogotá',
      titulo: 'Prueba de tildes',
      filtros: 'Local: Usaquén · Cifras en COP',
      generado: 'Generado el 30/09/2026, 3:30 p. m.',
      pie: 'Generado con KippiCore CRM',
      marcaAgua: 'DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL',
    });
    expect(pdf.fuente).toBe('Figtree');
    const fuentes = pdf.doc.getFontList();
    expect(fuentes.Figtree).toEqual(expect.arrayContaining(['normal', 'bold']));
    expect(fuentes['Figtree-Black']).toBeDefined();
    pdf.parrafo(FRASE);
    expect(pdf.doc.getTextWidth(FRASE)).toBeGreaterThan(0);
    pdf.tabla([{ titulo: 'Producto' }, { titulo: 'Valor', alineacion: 'right' }], [['Camisa Oxford entallada', '$ 219.900']], ['Total', '$ 219.900']);
    pdf.codigoBarras(generarEan13('20', '481', 1), 20, 200, 40, 12);
    pdf.qr('NumFac: HAL-FE-1043', 80, 200, 20);
    const bytes = new Uint8Array(pdf.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(5000);
  });

  it('el normalizador cambia el espacio angosto y, en respaldo, el signo menos', () => {
    const angosto = String.fromCharCode(0x202f);
    expect(normalizarTextoPdf(`1${angosto}%`)).toBe(`1${String.fromCharCode(0xa0)}%`);
    expect(normalizarTextoPdf(FRASE, true)).toContain('-$');
  });
});

describe('Excel con valores en caché', () => {
  it('la fila de totales trae { formula, result } igual a la suma y se relee', async () => {
    const filas = [
      { fecha: '2026-09-01', concepto: 'Camisa', valor: 219_900, unidades: 1, pct: 0.61 },
      { fecha: '2026-09-02', concepto: 'Pantalón', valor: 199_900, unidades: 2, pct: 0.58 },
    ];
    const buf = await crearLibroExcel({
      marca: 'HALDEN',
      titulo: 'Ventas',
      filtros: 'Todos los locales',
      moneda: 'COP',
      generado: '30/09/2026',
      hojas: [
        {
          nombre: 'Ventas',
          columnas: [
            { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
            { clave: 'concepto', titulo: 'Concepto', tipo: 'texto' },
            { clave: 'valor', titulo: 'Valor', tipo: 'moneda' },
            { clave: 'unidades', titulo: 'Unidades', tipo: 'entero' },
            { clave: 'pct', titulo: 'Margen', tipo: 'porcentaje' },
          ],
          filas,
          totales: { valor: 'suma', unidades: 'suma', pct: 0.6 },
        },
      ],
    });
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buf);
    const ws = libro.getWorksheet('Ventas');
    expect(ws?.getCell('A1').value).toBe('HALDEN · Ventas');
    const total = ws?.getRow(7);
    const v = total?.getCell(3).value as { formula: string; result: number };
    expect(v.formula).toBe('SUM(C5:C6)');
    expect(v.result).toBe(sumaColumna(filas, 'valor'));
    expect((total?.getCell(4).value as { result: number }).result).toBe(3);
    expect(total?.getCell(5).value).toBe(0.6);
    expect(ws?.getCell('C5').numFmt).toBe('"$" #,##0');
    expect(ws?.getCell('A5').value).toBeInstanceOf(Date);
    // fullCalcOnLoad queda en el XML del libro (ExcelJS no lo relee).
    const xml = strFromU8(unzipSync(new Uint8Array(buf))['xl/workbook.xml'] ?? new Uint8Array());
    expect(xml).toMatch(/fullCalcOnLoad="1"/);
  });
});
