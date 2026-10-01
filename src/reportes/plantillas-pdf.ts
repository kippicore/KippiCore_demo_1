import type { EstadoDominio, FechaHoraISO, Id } from '@/dominio/tipos';
import { MARCA } from '@/config/marca';
import { NOTAS_LEGALES, TEXTOS_FIJOS } from '@/config/textos/notas';
import { crearDocumentoPdf } from '@/lib/exportar/pdf';
import { nombreArchivo } from '@/lib/exportar/nombre';
import { celular as fmtCelular, dinero, fecha, fechaHora, hora, nit as fmtNit, porcentaje } from '@/lib/formato';
import { nombreCliente, nombreEmpleado } from '@/selectores';
import type { ArchivoReporte } from './exportar';

/**
 * Plantillas PDF únicas (PLAN 5.12, D3, A1, A2, C1): factura electrónica, documento equivalente POS (80 mm),
 * nota crédito, desprendible de nómina (con "Nómina electrónica: transmitida (simulación)") y hoja de etiquetas
 * con EAN-13 vectorial. Todas con la marca activa; las de facturación con la marca de agua de demostración.
 */
export interface ContextoPlantilla {
  /** Marca activa (personalizada o HALDEN). */
  marca: string;
  descriptor: string;
  /** Instante de generación (reloj de la app). */
  ahora: FechaHoraISO;
}

const MIME_PDF = 'application/pdf';

function emisor(e: EstadoDominio, marca: string): string[] {
  const em = e.empresa;
  return [`${em.razonSocial} (${marca})`, `NIT ${fmtNit(em.nit)}`, `${em.direccion}, ${em.ciudad} · ${em.telefono}`];
}

function documentoVenta(e: EstadoDominio, facturaId: Id) {
  const f = e.facturas[facturaId];
  if (!f) throw new Error('No existe ese documento.');
  const v = e.ventas[f.ventaId];
  const res = e.resoluciones[f.resolucionId];
  return { f, v, res };
}

/** Factura electrónica (simulada) tamaño carta/A4. */
export async function pdfFactura(e: EstadoDominio, facturaId: Id, ctx: ContextoPlantilla): Promise<ArchivoReporte> {
  const { f, v, res } = documentoVenta(e, facturaId);
  if (f.tipo === 'documento_equivalente_pos') return pdfDocumentoPos(e, facturaId, ctx);
  const pdf = await crearDocumentoPdf({
    marca: ctx.marca,
    descriptor: ctx.descriptor,
    titulo: `Factura electrónica de venta ${f.numero}`,
    subtitulo: emisor(e, ctx.marca).join(' · '),
    filtros: res ? `Resolución ${res.numero} del ${fecha(res.vigenteDesde)} · ${res.prefijo} ${res.desde} a ${res.hasta} (ficticia)` : undefined,
    generado: `Expedida el ${fechaHora(f.ts)}`,
    pie: MARCA.pieReportes,
    marcaAgua: TEXTOS_FIJOS.marcaDeAgua,
  });
  pdf.pares([
    ['Adquirente', f.adquirente.nombre],
    ['Documento', f.adquirente.documento ?? 'Consumidor final'],
    ['Venta', v?.numero ?? ''],
    ['Estado', f.estado === 'aceptada' ? 'Aceptada por la DIAN (simulación)' : f.estado === 'enviada' ? 'Enviada a la DIAN (simulación)' : 'Generada'],
  ]);
  pdf.tabla(
    [{ titulo: 'Descripción' }, { titulo: 'Cant.', alineacion: 'right' }, { titulo: 'Precio', alineacion: 'right' }, { titulo: 'Descuento', alineacion: 'right' }, { titulo: 'Total', alineacion: 'right' }],
    (v?.lineas ?? []).map((l) => [l.descripcion, String(l.cantidad), dinero(l.precioLista), dinero(l.descuentoAsignado), dinero(l.totalFinal)]),
    null,
  );
  pdf.pares(
    [
      ['Subtotal', dinero(f.subtotal)],
      ['Descuentos', dinero(f.descuentos)],
      ['Base gravable', dinero(f.base)],
      [`IVA ${porcentaje(e.parametros.impuestos.ivaGeneral, 0)}`, dinero(f.iva)],
      ['Total', dinero(f.total)],
    ],
    { negritaUltimo: true },
  );
  pdf.parrafo(`CUFE: ${f.cufe}`, { tamano: 7 });
  const y = pdf.y;
  pdf.qr(f.qrTexto, pdf.margen, y, 28);
  pdf.espacio(32);
  pdf.parrafo(TEXTOS_FIJOS.marcaDeAgua, { tamano: 8, negrita: true });
  return { datos: pdf.arrayBuffer(), nombre: nombreArchivo(`factura ${f.numero}`, f.ts.slice(0, 10), 'pdf'), tipo: MIME_PDF };
}

/** Documento equivalente electrónico POS (simulado), tirilla de 80 mm. */
export async function pdfDocumentoPos(e: EstadoDominio, facturaId: Id, ctx: ContextoPlantilla): Promise<ArchivoReporte> {
  const { f, v } = documentoVenta(e, facturaId);
  const lineas = v?.lineas.length ?? 0;
  const pdf = await crearDocumentoPdf({
    marca: ctx.marca,
    descriptor: emisor(e, ctx.marca).join(' · '),
    titulo: TEXTOS_FIJOS.documentoPos,
    subtitulo: `${f.numero} · ${fecha(f.ts)} ${hora(f.ts)}`,
    generado: v ? `${e.locales[v.localId]?.nombre ?? ''} · Atendió ${nombreEmpleado(e.empleados[v.vendedorId])}` : '',
    pie: MARCA.pieReportes,
    formato: [80, 150 + lineas * 9],
    compacto: true,
    marcaAgua: TEXTOS_FIJOS.marcaDeAgua,
  });
  pdf.tabla(
    [{ titulo: 'Producto' }, { titulo: 'Total', alineacion: 'right' }],
    (v?.lineas ?? []).map((l) => [`${l.cantidad} × ${l.descripcion}`, dinero(l.totalFinal)]),
    null,
  );
  pdf.pares(
    [
      ['Base', dinero(f.base)],
      ['IVA', dinero(f.iva)],
      ['Total', dinero(f.total)],
    ],
    { negritaUltimo: true },
  );
  for (const p of v?.pagos ?? []) pdf.parrafo(`${p.medio.replace(/_/g, ' ')}: ${dinero(p.valor)}${p.cambio ? ` · cambio ${dinero(p.cambio)}` : ''}`, { tamano: 7 });
  pdf.parrafo(`CUDE: ${f.cufe.slice(0, 48)}…`, { tamano: 6 });
  pdf.qr(f.qrTexto, 25, pdf.y, 30);
  pdf.espacio(33);
  pdf.parrafo(TEXTOS_FIJOS.marcaDeAgua, { tamano: 6.5, negrita: true });
  return { datos: pdf.arrayBuffer(), nombre: nombreArchivo(`documento pos ${f.numero}`, f.ts.slice(0, 10), 'pdf'), tipo: MIME_PDF };
}

/** Nota crédito (simulada). */
export async function pdfNotaCredito(e: EstadoDominio, notaId: Id, ctx: ContextoPlantilla): Promise<ArchivoReporte> {
  const n = e.notasCredito[notaId];
  if (!n) throw new Error('No existe esa nota crédito.');
  const f = e.facturas[n.facturaId];
  const pdf = await crearDocumentoPdf({
    marca: ctx.marca,
    descriptor: ctx.descriptor,
    titulo: `Nota crédito ${n.numero}`,
    subtitulo: emisor(e, ctx.marca).join(' · '),
    filtros: `Afecta el documento ${f?.numero ?? ''}`,
    generado: `Expedida el ${fechaHora(n.ts)}`,
    pie: MARCA.pieReportes,
    marcaAgua: TEXTOS_FIJOS.marcaDeAgua,
  });
  pdf.pares(
    [
      ['Adquirente', f?.adquirente.nombre ?? ''],
      ['Motivo', n.motivo],
      ['Base', dinero(n.base)],
      ['IVA', dinero(n.iva)],
      ['Valor', dinero(n.valor)],
    ],
    { negritaUltimo: true },
  );
  pdf.parrafo(`CUDE: ${n.cude}`, { tamano: 7 });
  pdf.parrafo(TEXTOS_FIJOS.marcaDeAgua, { tamano: 8, negrita: true });
  return { datos: pdf.arrayBuffer(), nombre: nombreArchivo(`nota credito ${n.numero}`, n.ts.slice(0, 10), 'pdf'), tipo: MIME_PDF };
}

/** Desprendible de pago de un empleado en una liquidación (C1). */
export async function pdfDesprendible(e: EstadoDominio, liquidacionId: Id, empleadoId: Id, ctx: ContextoPlantilla): Promise<ArchivoReporte> {
  const l = e.liquidaciones[liquidacionId];
  const x = l?.lineas.find((y) => y.empleadoId === empleadoId);
  const em = e.empleados[empleadoId];
  if (!l || !x || !em) throw new Error('No existe ese desprendible.');
  const pdf = await crearDocumentoPdf({
    marca: ctx.marca,
    descriptor: ctx.descriptor,
    titulo: `Desprendible de pago · ${l.periodo.etiqueta}`,
    subtitulo: `${nombreEmpleado(em)} · CC ${em.documento.numero} · ${em.cargo.replace(/_/g, ' ')}`,
    filtros: `Liquidación ${l.numero} · ${x.tipo === 'laboral' ? 'Contrato laboral' : 'Prestación de servicios'}`,
    generado: `Generado el ${fechaHora(ctx.ahora)}`,
    pie: MARCA.pieReportes,
  });
  if (x.laboral) {
    const d = x.laboral.devengados;
    pdf.titulo2('Devengado');
    pdf.pares(
      [
        ['Salario', dinero(d.salario)],
        ['Auxilio de transporte', dinero(d.auxilioTransporte)],
        ['Comisiones', dinero(d.comisiones)],
        ['Horas extra y recargos', dinero(d.horasExtraDiurnas + d.horasExtraNocturnas + d.recargoNocturno + d.recargoDominicalFestivo)],
        ['Incapacidades y vacaciones', dinero(d.incapacidad + d.vacaciones)],
        ['Total devengado', dinero(x.laboral.totalDevengado)],
      ],
      { negritaUltimo: true },
    );
    pdf.titulo2('Deducciones');
    pdf.pares(
      [
        ['Salud', dinero(x.laboral.deducciones.salud)],
        ['Pensión', dinero(x.laboral.deducciones.pension)],
        ['Fondo de solidaridad', dinero(x.laboral.deducciones.fondoSolidaridad)],
        ['Total deducciones', dinero(x.laboral.totalDeducciones)],
      ],
      { negritaUltimo: true },
    );
  } else if (x.prestacion) {
    pdf.pares(
      [
        ['Honorarios', dinero(x.prestacion.honorarios)],
        ['Comisiones', dinero(x.prestacion.comisiones)],
        ['Retención en la fuente', dinero(x.prestacion.retencionFuente)],
        ['Planilla de seguridad social verificada', x.prestacion.pilaVerificada ? 'Sí' : 'Pendiente de soporte'],
      ],
      {},
    );
  }
  pdf.pares([['Neto a pagar', dinero(x.netoAPagar)]], { negritaUltimo: true });
  pdf.parrafo(`Pago a ${em.cuentaPago.entidad} ${em.cuentaPago.numeroEnmascarado} · Celular ${fmtCelular(em.celular)}`, { tamano: 8 });
  pdf.parrafo(TEXTOS_FIJOS.nominaElectronica, { negrita: true, tamano: 8.5 });
  pdf.parrafo(NOTAS_LEGALES.nomina, { tamano: 8, color: [110, 110, 110] });
  return { datos: pdf.arrayBuffer(), nombre: nombreArchivo(`desprendible ${nombreEmpleado(em)} ${l.periodo.etiqueta}`, l.periodo.fin, 'pdf'), tipo: MIME_PDF };
}

/** Hoja de etiquetas A4 (3 × 8) con EAN-13 vectorial, referencia, talla, color y precio (A2). */
export async function pdfEtiquetas(e: EstadoDominio, varianteIds: readonly Id[], ctx: ContextoPlantilla, copias = 1): Promise<ArchivoReporte> {
  const pdf = await crearDocumentoPdf({
    marca: ctx.marca,
    titulo: 'Etiquetas',
    generado: '',
    pie: MARCA.pieReportes,
    sinEncabezado: true,
  });
  const doc = pdf.doc;
  const cols = 3;
  const filasHoja = 8;
  const ancho = 210 / cols;
  const alto = 297 / filasHoja;
  const lista = varianteIds.flatMap((id) => Array.from({ length: copias }, () => id));
  lista.forEach((id, i) => {
    const v = e.variantes[id];
    const p = v ? e.productos[v.productoId] : undefined;
    if (!v || !p) return;
    const enHoja = i % (cols * filasHoja);
    if (i > 0 && enHoja === 0) doc.addPage();
    const x = (enHoja % cols) * ancho + 6;
    const y = Math.floor(enHoja / cols) * alto + 6;
    doc.setFont(pdf.fuente, 'bold');
    doc.setFontSize(7);
    doc.text(pdf.texto(ctx.marca.toUpperCase()), x, y + 2);
    doc.setFont(pdf.fuente, 'normal');
    doc.setFontSize(7.5);
    doc.text(pdf.texto(p.nombre).slice(0, 38), x, y + 6);
    doc.text(pdf.texto(`${p.referencia} · ${e.colores[v.colorId]?.nombre ?? ''} · Talla ${v.talla}`), x, y + 9.5);
    doc.setFont(pdf.fuente, 'bold');
    doc.setFontSize(10);
    doc.text(pdf.texto(dinero(p.precioVenta)), x, y + 14.5);
    pdf.codigoBarras(v.ean13, x, y + 16.5, 46, 10);
    doc.setFont(pdf.fuente, 'normal');
    doc.setFontSize(6.5);
    doc.text(v.ean13, x, y + 29.5);
  });
  return { datos: pdf.arrayBuffer(), nombre: nombreArchivo('etiquetas', ctx.ahora.slice(0, 10), 'pdf'), tipo: MIME_PDF };
}

/** Nombre del adquirente para mostrar (utilidad de D3). */
export function nombreAdquirente(e: EstadoDominio, clienteId: Id | null): string {
  return clienteId ? nombreCliente(e.clientes[clienteId]) : 'Consumidor final';
}
