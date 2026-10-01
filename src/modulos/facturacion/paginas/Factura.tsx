import { useState } from 'react';
import { Link } from 'react-router';
import { Ban, FileMinus2, FileText, ShoppingBag } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { ESTADOS_FACTURA, TIPOS_DOCUMENTO_ELECTRONICO } from '@/config/estados';
import { usePuede, useRolActivo, useSel, useUsuarioActivo } from '@/estado';
import { entero } from '@/lib/formato';
import {
  BadgeEstado,
  BotonDocumentoPdf,
  BotonEnlace,
  Button,
  Card,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  Pista,
} from '@/ui';
import { useAvanceNotas, useAvanceSimulado, useEstadoNota } from '../avance';
import { DialogoNotaCredito } from '../componentes/DialogoNotaCredito';
import { HojaFactura, HojaPos } from '../componentes/HojaDocumento';
import { Recorrido } from '../componentes/Recorrido';
import { selVistaFactura } from '../selectores';
import { TEXTOS } from '../textos';

/** /panel/facturacion/:facturaId — la vista previa del documento, su recorrido ante la DIAN y sus notas crédito. */
export default function Factura() {
  const { facturaId } = useParamsRuta('factura');
  const vista = useSel(selVistaFactura, { facturaId });
  const rol = useRolActivo();
  const { empleado } = useUsuarioActivo();
  const puede = usePuede();
  const estadoNota = useEstadoNota();
  const [nota, setNota] = useState(false);
  useAvanceSimulado(vista ? [{ id: vista.factura.id, estado: vista.factura.estado }] : []);
  useAvanceNotas(vista?.notas ?? []);

  const migasBase = rol === 'vendedor' ? [{ texto: 'Ventas', a: rutas.ventas() }] : [{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Facturación', a: rutas.facturacion() }];

  if (!vista) {
    return (
      <div data-testid="pagina-factura">
        <EncabezadoPagina migas={[...migasBase, { texto: 'Documento' }]} titulo="Documento" />
        <div className="mt-8 border border-line bg-surface">
          <EmptyState
            icono={FileText}
            titulo={TEXTOS.detalle.noExisteTitulo}
            texto={TEXTOS.detalle.noExisteTexto}
            accion={<BotonEnlace to={rol === 'vendedor' ? rutas.ventas() : rutas.facturacion()}>{TEXTOS.detalle.volver}</BotonEnlace>}
          />
        </div>
      </div>
    );
  }

  const { factura: f, venta, resolucion } = vista;
  if (rol === 'vendedor' && venta && venta.vendedorId !== empleado?.id) {
    return (
      <div data-testid="pagina-factura">
        <EncabezadoPagina migas={[...migasBase, { texto: f.numero }]} titulo={f.numero} />
        <div className="mt-8 border border-line bg-surface">
          <EmptyState
            icono={Ban}
            titulo={TEXTOS.detalle.ajenoTitulo}
            texto={TEXTOS.detalle.ajenoTexto}
            accion={<BotonEnlace to={rutas.ventas()}>Ir a Ventas</BotonEnlace>}
          />
        </div>
      </div>
    );
  }

  const esPos = f.tipo === 'documento_equivalente_pos';
  const tipoEtiqueta = TIPOS_DOCUMENTO_ELECTRONICO[f.tipo].etiqueta;
  const puedeNota = puede('notaCredito.emitir');

  return (
    <div data-testid="pagina-factura" data-estado={f.estado}>
      <EncabezadoPagina
        migas={[...migasBase, { texto: f.numero }]}
        eyebrow={`${tipoEtiqueta} · simulación`}
        titulo={f.numero}
        insignia={<BadgeEstado estado={ESTADOS_FACTURA[f.estado]} />}
        acciones={
          <>
            <BotonDocumentoPdf
              documento={esPos ? { tipo: 'pos', facturaId: f.id } : { tipo: 'factura', facturaId: f.id }}
              etiqueta={esPos ? 'Descargar tirilla (80 mm)' : 'Descargar PDF'}
              tamano="md"
            />
            {venta && (
              <BotonEnlace to={rutas.venta(venta.id)} variante="secondary" icono={ShoppingBag}>
                Ver venta
              </BotonEnlace>
            )}
            {puedeNota && (
              <Button
                variante="secondary"
                icono={FileMinus2}
                onClick={() => setNota(true)}
                disabled={vista.saldo <= 0}
                motivo={vista.saldo <= 0 ? 'Este documento ya está acreditado por completo' : undefined}
                data-testid="facturacion-emitir-nota"
              >
                Emitir nota crédito
              </Button>
            )}
          </>
        }
      />

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6">
        <Pista id="facturacion.marca" alinear="fin" className={esPos ? 'mx-auto w-full max-w-[400px]' : undefined}>
          {esPos ? <HojaPos vista={vista} /> : <HojaFactura vista={vista} />}
        </Pista>

        <aside className="flex flex-col gap-4" aria-label="Detalle del documento">
          <Recorrido estado={f.estado} historial={f.historial} />

          {resolucion && (
            <Card titulo="Resolución" padding="compacta" data-testid="factura-resolucion">
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 t-small">
                <dt className="text-muted">Número</dt>
                <dd className="num text-ink">{resolucion.numero}</dd>
                <dt className="text-muted">Prefijo</dt>
                <dd className="num text-ink">{resolucion.prefijo}</dd>
                <dt className="text-muted">Rango</dt>
                <dd className="num text-ink">
                  {entero(resolucion.desde)} a {entero(resolucion.hasta)}
                </dd>
                <dt className="text-muted">Vigencia</dt>
                <dd className="text-ink">
                  <Fecha valor={resolucion.vigenteDesde} /> a <Fecha valor={resolucion.vigenteHasta} />
                </dd>
              </dl>
              <p className="mt-3 border-t border-line-soft pt-3 t-small text-muted">Resolución ficticia, solo para la demostración.</p>
            </Card>
          )}

          <Card titulo="Notas crédito" padding="compacta" data-testid="factura-notas">
            {vista.notas.length === 0 ? (
              <p className="t-small text-muted">Este documento no tiene notas crédito. Se generan solas con una devolución o una anulación.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line-soft">
                {vista.notas.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <Link to={rutas.notaCredito(n.id)} className="min-w-0 underline-offset-4 hover:underline" data-nota={n.id}>
                      <span className="block t-label num text-ink">{n.numero}</span>
                      <span className="block truncate t-small text-muted">
                        <Fecha valor={n.ts} formato="fecha" /> · {n.motivo}
                      </span>
                    </Link>
                    <span className="shrink-0 text-right">
                      <span className="block t-label num text-accent-ink">
                        <Dinero valor={-n.valor} />
                      </span>
                      <span className="block t-small text-muted">{ESTADOS_FACTURA[estadoNota(n)].etiqueta.replace(' a la DIAN (simulación)', '')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 border-t border-line-soft pt-3 t-small">
              <dt className="text-muted">Acreditado</dt>
              <dd className="text-right num text-ink">
                <Dinero valor={vista.acreditado} />
              </dd>
              <dt className="text-muted">Por acreditar</dt>
              <dd className="text-right num text-ink" data-testid="factura-saldo">
                <Dinero valor={vista.saldo} />
              </dd>
            </dl>
          </Card>
        </aside>
      </div>

      {puedeNota && <DialogoNotaCredito vista={vista} abierto={nota} alCambiar={setNota} />}
    </div>
  );
}
