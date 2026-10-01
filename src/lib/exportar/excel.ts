import type { Moneda } from '@/dominio/tipos';

/**
 * Libro .xlsx (PLAN 5.12): fila 1 "<marca> · <título>", fila 2 filtros y moneda, fila 4 encabezados en negrita
 * sobre negro, congelados y con autofiltro; formatos de moneda, fecha y porcentaje; ancho = máx(título,
 * contenido) con tope; fila de totales en negrita con `{ formula: 'SUM(…)', result }` y `fullCalcOnLoad`:
 * el VALOR EN CACHÉ hace que las vistas previas (WhatsApp, Gmail, Quick Look, Drive) muestren los totales.
 * ExcelJS se carga con import() (nunca en la carga inicial).
 */
export type TipoColumnaExcel = 'texto' | 'moneda' | 'numero' | 'entero' | 'fecha' | 'porcentaje';

export interface ColumnaExcel {
  clave: string;
  titulo: string;
  tipo: TipoColumnaExcel;
  ancho?: number;
}

export type ValorCelda = string | number | null;

/** 'suma' = fórmula SUM con su resultado en caché; un valor = celda fija (totales no aditivos ya calculados). */
export type TotalExcel = 'suma' | number | string;

export interface HojaExcel {
  nombre: string;
  columnas: ColumnaExcel[];
  filas: Record<string, ValorCelda>[];
  /** null = sin fila de totales. La primera columna lleva "Total" si no se indica otra cosa. */
  totales: Record<string, TotalExcel> | null;
  /** Nota bajo los filtros (p. ej. "Valores ilustrativos de la demo · se validan con tu contador"). */
  nota?: string;
}

export interface OpcionesExcel {
  marca: string;
  titulo: string;
  /** "Local: Usaquén · Del 01/09/2026 al 30/09/2026" */
  filtros: string;
  moneda: Moneda;
  generado: string;
  hojas: HojaExcel[];
}

export const FORMATO_MONEDA: Record<Moneda, string> = {
  COP: '"$" #,##0',
  USD: '"US$" #,##0.00',
  CNY: '"CN¥" #,##0.00',
};

const FILA_ENCABEZADO = 4;

function letraColumna(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function aFechaExcel(v: string): Date {
  return new Date(Date.UTC(Number(v.slice(0, 4)), Number(v.slice(5, 7)) - 1, Number(v.slice(8, 10))));
}

/** Suma exacta de una columna (el `result` en caché). */
export function sumaColumna(filas: readonly Record<string, ValorCelda>[], clave: string): number {
  let s = 0;
  for (const f of filas) {
    const v = f[clave];
    if (typeof v === 'number') s += v;
  }
  return Math.round(s * 100) / 100;
}

/** Nombre de hoja válido para Excel (máx. 31, sin : \ / ? * [ ]). */
function nombreHoja(n: string): string {
  return n.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31);
}

export async function crearLibroExcel(o: OpcionesExcel): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default;
  const libro = new ExcelJS.Workbook();
  libro.creator = 'KippiCore CRM';
  libro.calcProperties.fullCalcOnLoad = true;
  for (const h of o.hojas) {
    const ws = libro.addWorksheet(nombreHoja(h.nombre), {
      views: [{ state: 'frozen', ySplit: FILA_ENCABEZADO }],
    });
    ws.getCell('A1').value = `${o.marca} · ${o.titulo}`;
    ws.getCell('A1').font = { bold: true, size: 14 };
    ws.getCell('A2').value = `${o.filtros} · Cifras en ${o.moneda} · ${o.generado}`;
    ws.getCell('A2').font = { size: 9, color: { argb: 'FF6E6E6E' } };
    if (h.nota) {
      ws.getCell('A3').value = h.nota;
      ws.getCell('A3').font = { size: 9, italic: true, color: { argb: 'FF6E6E6E' } };
    }
    const fila = ws.getRow(FILA_ENCABEZADO);
    h.columnas.forEach((c, i) => {
      const celda = fila.getCell(i + 1);
      celda.value = c.titulo;
      celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A0A0A' } };
      celda.alignment = { vertical: 'middle' };
    });
    fila.commit();
    const formatos: Record<TipoColumnaExcel, string | undefined> = {
      texto: undefined,
      moneda: FORMATO_MONEDA[o.moneda],
      numero: '#,##0.00',
      entero: '#,##0',
      fecha: 'dd/mm/yyyy',
      porcentaje: '0.0%',
    };
    h.filas.forEach((f, k) => {
      const r = ws.getRow(FILA_ENCABEZADO + 1 + k);
      h.columnas.forEach((c, i) => {
        const v = f[c.clave] ?? null;
        const celda = r.getCell(i + 1);
        celda.value = c.tipo === 'fecha' && typeof v === 'string' && v.length >= 10 ? aFechaExcel(v) : v;
        const fmt = formatos[c.tipo];
        if (fmt) celda.numFmt = fmt;
      });
      r.commit();
    });
    const primera = FILA_ENCABEZADO + 1;
    const ultima = FILA_ENCABEZADO + h.filas.length;
    if (h.totales) {
      const r = ws.getRow(ultima + 1);
      h.columnas.forEach((c, i) => {
        const celda = r.getCell(i + 1);
        const tot = h.totales?.[c.clave];
        if (tot === 'suma') {
          const col = letraColumna(i + 1);
          celda.value = {
            formula: h.filas.length > 0 ? `SUM(${col}${primera}:${col}${ultima})` : '0',
            result: sumaColumna(h.filas, c.clave),
          };
        } else if (tot !== undefined) celda.value = tot;
        else if (i === 0) celda.value = 'Total';
        const fmt = formatos[c.tipo];
        if (fmt && c.tipo !== 'texto') celda.numFmt = fmt;
        celda.font = { bold: true };
        celda.border = { top: { style: 'thin', color: { argb: 'FF0A0A0A' } } };
      });
      r.commit();
    }
    if (h.columnas.length > 0) {
      ws.autoFilter = {
        from: { row: FILA_ENCABEZADO, column: 1 },
        to: { row: Math.max(FILA_ENCABEZADO, ultima), column: h.columnas.length },
      };
    }
    h.columnas.forEach((c, i) => {
      let largo = c.titulo.length;
      for (const f of h.filas.slice(0, 500)) {
        const v = f[c.clave];
        const l = v === null || v === undefined ? 0 : c.tipo === 'moneda' ? String(Math.round(Number(v))).length + 5 : String(v).length;
        if (l > largo) largo = l;
      }
      ws.getColumn(i + 1).width = c.ancho ?? Math.min(48, Math.max(10, largo + 2));
    });
  }
  return (await libro.xlsx.writeBuffer()) as ArrayBuffer;
}
