import { FileText } from 'lucide-react';
import { useState } from 'react';
import type { DocumentoImportacion, Importacion, TipoDocumentoImportacion } from '@/dominio/tipos';
import { useAcciones, useHoy, usePuede } from '@/estado';
import { avisar, Badge, Button, Dialog, Fecha, Input, Select, SelectorFecha, Table, type ColumnaTabla } from '@/ui';
import { ETIQUETAS_DOCUMENTO, ETIQUETAS_ESTADO_DOCUMENTO } from '../textos';

/**
 * Documentos del pedido (simulados con nombre, número y estado): proforma, factura comercial, lista de empaque, BL o
 * guía aérea y las declaraciones. Los que aún no existen aparecen como pendientes y se pueden registrar.
 */
interface FilaDoc {
  tipo: TipoDocumentoImportacion;
  doc: DocumentoImportacion | null;
}

function tiposDe(imp: Importacion): TipoDocumentoImportacion[] {
  const transporte: TipoDocumentoImportacion = imp.carga.tipo === 'aerea' ? 'guia_aerea' : 'bl';
  return ['proforma', 'factura_comercial', 'lista_empaque', transporte, 'declaracion_importacion', 'declaracion_cambio', 'declaracion_valor'];
}

const TONO: Record<DocumentoImportacion['estado'], 'warning' | 'neutral' | 'success'> = { pendiente: 'warning', recibido: 'neutral', aprobado: 'success' };

export function TabDocumentos({ imp }: { imp: Importacion }) {
  const puede = usePuede();
  const [editando, setEditando] = useState<TipoDocumentoImportacion | null>(null);
  const tipos = new Set(tiposDe(imp));
  for (const d of imp.documentos) tipos.add(d.tipo);
  const filas: FilaDoc[] = [...tipos].map((tipo) => ({ tipo, doc: imp.documentos.find((d) => d.tipo === tipo) ?? null }));
  const editable = puede('importacion.documento');

  const columnas: ColumnaTabla<FilaDoc>[] = [
    { id: 'tipo', encabezado: 'Documento', celda: (f) => <span className="font-semibold text-ink">{ETIQUETAS_DOCUMENTO[f.tipo]}</span>, ancho: 280 },
    { id: 'archivo', encabezado: 'Archivo', celda: (f) => (f.doc ? <span className="t-body text-ink-2">{f.doc.nombreArchivo}</span> : <span className="text-muted">Sin archivo todavía</span>), truncar: true },
    { id: 'numero', encabezado: 'Número', celda: (f) => <span className="num">{f.doc?.numero ?? '—'}</span>, ancho: 140 },
    { id: 'fecha', encabezado: 'Fecha', celda: (f) => (f.doc?.fecha ? <Fecha valor={f.doc.fecha} /> : <span className="text-muted">—</span>), ancho: 120 },
    {
      id: 'estado',
      encabezado: 'Estado',
      celda: (f) => <Badge tono={TONO[f.doc?.estado ?? 'pendiente']} tamano="sm">{ETIQUETAS_ESTADO_DOCUMENTO[f.doc?.estado ?? 'pendiente']}</Badge>,
      ancho: 130,
    },
  ];

  return (
    <div className="space-y-4" data-testid="tab-documentos">
      <p className="t-body text-muted">Los documentos de este pedido son de ejemplo: en la versión real se adjuntan los archivos que te envían la fábrica y la agencia.</p>
      <Table
        columnas={columnas}
        filas={filas}
        clave={(f) => f.tipo}
        sustantivo={['documento', 'documentos']}
        porPagina={0}
        accionesFila={editable ? (f) => (
          <Button variante="ghost" tamano="sm" onClick={() => setEditando(f.tipo)} data-testid={`doc-${f.tipo}`}>
            {f.doc ? 'Actualizar' : 'Registrar'}
          </Button>
        ) : undefined}
      />
      {editando && <DialogoDocumento imp={imp} tipo={editando} alCerrar={() => setEditando(null)} />}
    </div>
  );
}

function DialogoDocumento({ imp, tipo, alCerrar }: { imp: Importacion; tipo: TipoDocumentoImportacion; alCerrar: () => void }) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const actual = imp.documentos.find((d) => d.tipo === tipo) ?? null;
  const [nombre, setNombre] = useState(actual?.nombreArchivo ?? `${tipo}_${imp.numero}.pdf`);
  const [numero, setNumero] = useState(actual?.numero ?? '');
  const [estado, setEstado] = useState<DocumentoImportacion['estado']>(actual?.estado ?? 'recibido');
  const [fecha, setFecha] = useState(actual?.fecha ?? hoy);
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    if (numero.trim() === '') return setError('Escribe el número del documento.');
    const r = acciones.registrarDocumentoImportacion({ importacionId: imp.id, documento: { tipo, numero: numero.trim(), nombreArchivo: nombre.trim(), estado, fecha } });
    if (!r.ok) return setError(r.error.mensaje);
    avisar({ tipo: 'exito', texto: `${ETIQUETAS_DOCUMENTO[tipo]} guardado` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow={imp.numero}
      titulo={ETIQUETAS_DOCUMENTO[tipo]}
      descripcion="Registra el número y el estado del documento. Es un registro de ejemplo: no se sube ningún archivo."
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} icono={FileText}>
            Guardar documento
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input etiqueta="Número del documento" value={numero} onChange={(e) => { setNumero(e.target.value); setError(null); }} error={error ?? undefined} placeholder="Por ejemplo, FA-2026-07" />
        <Input etiqueta="Nombre del archivo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Select
            etiqueta="Estado"
            valor={estado}
            alCambiar={(v) => setEstado(v as DocumentoImportacion['estado'])}
            opciones={(Object.keys(ETIQUETAS_ESTADO_DOCUMENTO) as DocumentoImportacion['estado'][]).map((e) => ({ valor: e, etiqueta: ETIQUETAS_ESTADO_DOCUMENTO[e] }))}
            enModal
          />
          <SelectorFecha etiqueta="Fecha" hoy={hoy} valor={fecha} alCambiar={setFecha} enModal />
        </div>
      </div>
    </Dialog>
  );
}
