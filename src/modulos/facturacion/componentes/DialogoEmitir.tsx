import { useDeferredValue, useState } from 'react';
import { useNavigate } from 'react-router';
import { FileText, ReceiptText } from 'lucide-react';
import { rutas } from '@/app/rutas';
import type { TipoDocumentoElectronico } from '@/dominio/tipos';
import { useAcciones, useHoy, useRolActivo, useSel, useUsuarioActivo } from '@/estado';
import { cedula, plural } from '@/lib/formato';
import { avisar, Button, Dialog, Dinero, EmptyState, Fecha, GrupoRadio, Input, cn } from '@/ui';
import {
  CONSUMIDOR_FINAL,
  validarAdquirente,
  type BorradorAdquirente,
} from '../calculos';
import { selResoluciones, selVentasSinDocumento, type VentaSinDocumento } from '../selectores';
import { TEXTOS } from '../textos';

type ModoAdquirente = 'consumidor' | 'cliente' | 'otro';
const BORRADOR_VACIO: BorradorAdquirente = { nombre: '', documento: '', correo: '' };

/**
 * "Emitir documento" desde una venta (PRD 7.13): elige una venta sin documento, el tipo y el adquirente. Los datos
 * salen de la venta (cliente, totales, IVA); el consecutivo y el CUFE/CUDE los pone el sistema.
 */
export function DialogoEmitir({ abierto, alCambiar }: { abierto: boolean; alCambiar: (a: boolean) => void }) {
  // El formulario se monta al abrir: así cada apertura empieza limpia, sin sincronizar estado con efectos.
  return abierto ? <FormularioEmitir alCambiar={alCambiar} /> : null;
}

function FormularioEmitir({ alCambiar }: { alCambiar: (a: boolean) => void }) {
  const acciones = useAcciones();
  const navegar = useNavigate();
  const hoy = useHoy();
  const rol = useRolActivo();
  const { empleado } = useUsuarioActivo();
  const [texto, setTexto] = useState('');
  const textoDiferido = useDeferredValue(texto);
  const [elegida, setElegida] = useState<VentaSinDocumento | null>(null);
  const [tipo, setTipo] = useState<TipoDocumentoElectronico>('factura_electronica');
  const [modoElegido, setModoElegido] = useState<ModoAdquirente | null>(null);
  const [borrador, setBorrador] = useState<BorradorAdquirente>(BORRADOR_VACIO);
  const [tocado, setTocado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emitiendo, setEmitiendo] = useState(false);

  const vendedorId = rol === 'vendedor' ? (empleado?.id ?? '__sin_vendedor__') : null;
  const { filas, total } = useSel(selVentasSinDocumento, { texto: textoDiferido, vendedorId, limite: 6 });
  const resoluciones = useSel(selResoluciones, { hoy });

  // Sin elegir otra, la venta más reciente sin documento; el adquirente por defecto es el cliente de la venta.
  const venta = elegida ?? filas[0] ?? null;
  const modo: ModoAdquirente = modoElegido ?? (venta?.adquirente?.documento ? 'cliente' : 'consumidor');
  const elegir = (v: VentaSinDocumento) => {
    setElegida(v);
    setModoElegido(null);
    setError(null);
  };

  const erroresOtro = modo === 'otro' ? validarAdquirente(borrador) : {};
  const hayErrores = Object.keys(erroresOtro).length > 0;
  const resolucion = resoluciones.find((r) => r.resolucion.tipo === tipo);
  const siguienteNumero = resolucion ? `${resolucion.resolucion.prefijo}-${resolucion.siguiente}` : null;

  const emitir = () => {
    if (!venta) return;
    setTocado(true);
    if (hayErrores) return;
    setEmitiendo(true);
    setError(null);
    const adquirente =
      modo === 'cliente' && venta.adquirente
        ? venta.adquirente
        : modo === 'otro'
          ? {
              tipo: 'identificado' as const,
              clienteId: null,
              nombre: borrador.nombre.trim(),
              documento: borrador.documento.replace(/[^\d]/g, ''),
              correo: borrador.correo.trim() || null,
            }
          : CONSUMIDOR_FINAL;
    const r = acciones.emitirFactura({ ventaId: venta.id, tipo, adquirente });
    setEmitiendo(false);
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    const ev = r.eventos.find((x) => x.tipo === 'FacturaEmitida');
    const facturaId = ev && 'facturaId' in ev ? ev.facturaId : null;
    alCambiar(false);
    avisar({
      tipo: 'exito',
      texto: tipo === 'factura_electronica' ? 'Factura electrónica generada (simulación)' : 'Documento POS electrónico generado (simulación)',
      detalle: `Venta ${venta.numero}. En unos segundos pasa por la DIAN de demostración.`,
    });
    if (facturaId) navegar(rutas.factura(facturaId));
  };

  const opcionesAdquirente = [
    { valor: 'consumidor' as const, etiqueta: 'Consumidor final', descripcion: 'Sin identificar, como en la mayoría de las ventas de mostrador.' },
    ...(venta?.adquirente?.documento
      ? [
          {
            valor: 'cliente' as const,
            etiqueta: venta.adquirente.nombre,
            descripcion: `Cliente de la venta · documento ${cedula(venta.adquirente.documento)}`,
          },
        ]
      : []),
    { valor: 'otro' as const, etiqueta: 'Otro adquirente', descripcion: 'Escribe el nombre y el documento.' },
  ];

  return (
    <Dialog
      abierto
      alCambiar={alCambiar}
      eyebrow={TEXTOS.emitirDialogo.eyebrow}
      titulo={TEXTOS.emitirDialogo.titulo}
      descripcion={TEXTOS.emitirDialogo.descripcion}
      ancho="lg"
      data-testid="facturacion-dialogo-emitir"
      confirmarAlCerrar={tocado || texto !== ''}
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button
            onClick={emitir}
            cargando={emitiendo}
            disabled={!venta}
            motivo={!venta ? 'Elige una venta' : undefined}
            data-testid="facturacion-confirmar-emitir"
          >
            {tipo === 'factura_electronica' ? 'Emitir factura electrónica' : 'Emitir documento POS'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8">
        <section aria-label="Venta" className="flex min-w-0 flex-col gap-3">
          <Input
            buscar
            tamano="sm"
            etiqueta="Venta sin documento"
            placeholder="Número de venta o cliente"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            data-testid="facturacion-buscar-venta"
          />
          {filas.length === 0 ? (
            <EmptyState tamano="compacto" icono={ReceiptText} titulo={TEXTOS.emitirDialogo.sinVentas} texto="Prueba con otro número o con el nombre del cliente." />
          ) : (
            <ul className="flex flex-col border border-line" role="listbox" aria-label="Ventas sin documento" data-testid="facturacion-ventas-sin-documento">
              {filas.map((v) => {
                const activa = venta?.id === v.id;
                return (
                  <li key={v.id} className="border-b border-line-soft last:border-b-0">
                    <button
                      type="button"
                      role="option"
                      aria-selected={activa}
                      onClick={() => elegir(v)}
                      data-venta={v.id}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors duration-(--dur-instant)',
                        activa ? 'bg-selected shadow-[inset_2px_0_0_var(--c-ink)]' : 'hover:bg-surface-2',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block t-label num text-ink">{v.numero}</span>
                        <span className="block truncate t-small text-muted">
                          {v.clienteNombre} · <Fecha valor={v.ts} formato="fecha" />
                        </span>
                      </span>
                      <span className="shrink-0 t-label num text-ink">
                        <Dinero valor={v.total} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="t-small text-muted">
            {total > filas.length ? `Mostrando ${filas.length} de ${plural(total, 'venta')}. Afina la búsqueda para ver otras. ` : ''}
            {TEXTOS.emitirDialogo.ayudaVentas}
          </p>
        </section>

        <section aria-label="Documento" className="flex min-w-0 flex-col gap-5">
          <GrupoRadio
            etiqueta="Documento"
            tarjetas
            columnas={1}
            valor={tipo}
            alCambiar={setTipo}
            opciones={[
              {
                valor: 'factura_electronica',
                etiqueta: (
                  <span className="inline-flex items-center gap-2">
                    <FileText className="size-4" strokeWidth={1.5} aria-hidden /> Factura electrónica
                  </span>
                ),
                descripcion: 'Para quien la pide con sus datos. Hoja carta.',
              },
              {
                valor: 'documento_equivalente_pos',
                etiqueta: (
                  <span className="inline-flex items-center gap-2">
                    <ReceiptText className="size-4" strokeWidth={1.5} aria-hidden /> Documento equivalente POS
                  </span>
                ),
                descripcion: 'El de mostrador. Tirilla de 80 mm.',
              },
            ]}
          />

          <GrupoRadio
            etiqueta="Adquirente"
            valor={modo}
            alCambiar={(m) => {
              setModoElegido(m);
              setTocado(true);
            }}
            opciones={opcionesAdquirente}
          />
          {modo === 'otro' && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3" data-testid="facturacion-adquirente-otro">
              <Input
                etiqueta="Nombre o razón social"
                className="col-span-2"
                value={borrador.nombre}
                onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                error={tocado ? erroresOtro.nombre : undefined}
                data-testid="facturacion-adq-nombre"
              />
              <Input
                etiqueta="Documento"
                inputMode="numeric"
                value={borrador.documento}
                onChange={(e) => setBorrador({ ...borrador, documento: e.target.value })}
                error={tocado ? erroresOtro.documento : undefined}
                data-testid="facturacion-adq-documento"
              />
              <Input
                etiqueta="Correo"
                opcional
                type="email"
                value={borrador.correo}
                onChange={(e) => setBorrador({ ...borrador, correo: e.target.value })}
                error={tocado ? erroresOtro.correo : undefined}
              />
            </div>
          )}

          {venta && (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 border-t border-line-soft pt-4 t-small" data-testid="facturacion-resumen-emision">
              <dt className="text-muted">Número que sale</dt>
              <dd className="num text-ink" data-testid="facturacion-siguiente-numero">
                {siguienteNumero ?? '—'}
              </dd>
              <dt className="text-muted">Total (IVA incluido)</dt>
              <dd className="num text-ink">
                <Dinero valor={venta.total} /> · IVA <Dinero valor={venta.iva} />
              </dd>
            </dl>
          )}
          {error && (
            <p role="alert" className="t-small text-danger" data-testid="facturacion-error-emitir">
              {error}
            </p>
          )}
        </section>
      </div>
    </Dialog>
  );
}
