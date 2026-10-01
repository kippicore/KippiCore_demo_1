import type { EstadoDominio, Moneda } from '@/dominio/tipos';
import { MARCA } from '@/config/marca';
import { NOTAS_LEGALES } from '@/config/textos/notas';
import { crearDocumentoPdf, type AlineacionPdf } from '@/lib/exportar/pdf';
import { crearLibroExcel, sumaColumna, type TipoColumnaExcel, type ValorCelda } from '@/lib/exportar/excel';
import { dinero, entero, fecha, fechaHora, numero, porcentaje } from '@/lib/formato';
import { convertirParaMostrar } from '@/lib/moneda';
import { nombreArchivo } from '@/lib/exportar/nombre';
import { REPORTES } from './definiciones';
import type { ContextoExportacion, FiltrosReporte, HojaReporte, IdReporte } from './tipos';

/**
 * Exportación de una definición a PDF o Excel (PLAN 5.12). Convierte el dinero a la moneda activa con la tasa
 * vigente y lo dice en el encabezado; el PDF formatea con lib/formato; el Excel escribe valores numéricos con
 * formato y totales `{ formula, result }`. La usa `<BotonExportar reporte>` (ui/conectados) y el centro de
 * reportes (D4). jsPDF y ExcelJS se cargan con import() dentro de lib/exportar.
 */
export interface ArchivoReporte {
  datos: ArrayBuffer;
  nombre: string;
  tipo: string;
}

function convertirHoja(h: HojaReporte, moneda: Moneda, tasa: number): HojaReporte {
  if (moneda === 'COP') return h;
  const claves = h.columnas.filter((c) => c.tipo === 'moneda').map((c) => c.clave);
  const conv = (v: ValorCelda) => (typeof v === 'number' ? convertirParaMostrar(v, moneda, tasa) : v);
  const filas = h.filas.map((f) => {
    const r = { ...f };
    for (const k of claves) r[k] = conv(f[k] ?? null);
    return r;
  });
  const totales = h.totales ? { ...h.totales } : null;
  if (totales) for (const k of claves) if (typeof totales[k] === 'number') totales[k] = conv(totales[k] as number) as number;
  return { ...h, filas, totales };
}

function celda(v: ValorCelda | undefined, tipo: TipoColumnaExcel, moneda: Moneda): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'string') return tipo === 'fecha' && /^\d{4}-\d{2}-\d{2}/.test(v) ? fecha(v) : v;
  switch (tipo) {
    case 'moneda':
      return dinero(v, moneda);
    case 'porcentaje':
      return porcentaje(v);
    case 'entero':
      return entero(v);
    case 'numero':
      return numero(v, 2);
    default:
      return String(v);
  }
}

function textoFiltros(f: FiltrosReporte, ctx: ContextoExportacion, filtros: readonly string[]): string {
  const partes: string[] = [];
  if (filtros.includes('local')) partes.push(`Local: ${ctx.nombreLocal}`);
  if (filtros.includes('rango')) partes.push(`Del ${fecha(f.desde)} al ${fecha(f.hasta)}`);
  else partes.push(`Corte al ${fecha(f.hoy)}`);
  partes.push(`Cifras en ${ctx.moneda}`);
  return partes.join(' · ');
}

const MIME_PDF = 'application/pdf';
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Hojas de un reporte ya convertidas a la moneda activa (lo que se escribe en el archivo). */
export function hojasParaExportar(id: IdReporte, estado: EstadoDominio, f: FiltrosReporte, ctx: Pick<ContextoExportacion, 'moneda' | 'tasa'>): HojaReporte[] {
  return REPORTES[id].hojas(estado, f).map((h) => convertirHoja(h, ctx.moneda, ctx.tasa));
}

export async function exportarReporte(
  id: IdReporte,
  estado: EstadoDominio,
  filtros: FiltrosReporte,
  formato: 'pdf' | 'excel',
  ctx: ContextoExportacion,
): Promise<ArchivoReporte> {
  const def = REPORTES[id];
  const hojas = hojasParaExportar(id, estado, filtros, ctx);
  const filtrosTexto = textoFiltros(filtros, ctx, def.filtros);
  const generado = `Generado el ${fechaHora(filtros.ahora)}`;
  if (formato === 'excel') {
    const datos = await crearLibroExcel({
      marca: ctx.marca,
      titulo: def.titulo,
      filtros: filtrosTexto,
      moneda: ctx.moneda,
      generado,
      hojas: hojas.map((h) => ({ nombre: h.nombre, columnas: h.columnas, filas: h.filas, totales: h.totales, nota: h.nota })),
    });
    return { datos, nombre: nombreArchivo(def.titulo, filtros.hoy, 'xlsx'), tipo: MIME_XLSX };
  }
  const pdf = await crearDocumentoPdf({
    marca: ctx.marca,
    descriptor: ctx.descriptor,
    titulo: def.titulo,
    filtros: filtrosTexto,
    generado,
    pie: MARCA.pieReportes,
    orientacion: def.orientacion,
  });
  for (const h of hojas) {
    if (hojas.length > 1) pdf.titulo2(h.nombre);
    const alin = (t: TipoColumnaExcel): AlineacionPdf => (t === 'texto' || t === 'fecha' ? 'left' : 'right');
    const filas = h.filas.map((f) => h.columnas.map((c) => celda(f[c.clave], c.tipo, ctx.moneda)));
    const totales = h.totales
      ? h.columnas.map((c, i) => {
          const t = h.totales?.[c.clave];
          if (t === 'suma') return celda(sumaColumna(h.filas, c.clave), c.tipo, ctx.moneda);
          if (t !== undefined) return celda(t, c.tipo, ctx.moneda);
          return i === 0 ? 'Total' : '';
        })
      : null;
    pdf.tabla(
      h.columnas.map((c) => ({ titulo: c.titulo, alineacion: alin(c.tipo), ancho: c.anchoPdf })),
      filas,
      totales,
    );
    if (h.nota) pdf.parrafo(h.nota, { tamano: 8, color: [110, 110, 110] });
  }
  if (def.notaLegal) pdf.parrafo(NOTAS_LEGALES[def.notaLegal], { tamano: 8, color: [110, 110, 110] });
  return { datos: pdf.arrayBuffer(), nombre: nombreArchivo(def.titulo, filtros.hoy, 'pdf'), tipo: MIME_PDF };
}
