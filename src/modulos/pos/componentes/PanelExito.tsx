import { ArrowUpRight, Banknote, CircleUser, FilePlus2, Package, ReceiptText, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Adquirente, Id, TipoDocumentoElectronico } from '@/dominio/tipos';
import { rutas } from '@/app/rutas';
import { MEDIOS_PAGO } from '@/config/negocio';
import { useAcciones, useDinero, useEstadoDominio } from '@/estado';
import { dinero as formatoDinero, entero, fecha } from '@/lib/formato';
import { BotonDocumentoPdf, Button, Cifra, Dinero, Icono, avisar } from '@/ui';
import type { EfectoPos } from '../efectos';
import { TEXTOS } from '../textos';

/**
 * Venta registrada y "Lo que acaba de pasar" (W1): el carrito se reemplaza por este panel. A la izquierda, la venta
 * (número, total que cuenta desde 0, cliente, vendedor, medios) y sus documentos; a la derecha, cada efecto como
 * antes → después con la cifra rodando 900 ms (filas escalonadas 80 ms) y un "Ver" que abre el módulo con la fila
 * cambiada resaltada. Las cifras salen de los mismos selectores sobre el estado de antes y el de después.
 */
export interface PropsPanelExito {
  ventaId: Id;
  efectos: readonly EfectoPos[];
  alNueva: () => void;
}

export function PanelExito({ ventaId, efectos, alNueva }: PropsPanelExito) {
  const e = useEstadoDominio();
  const d = useDinero();
  const acciones = useAcciones();
  const navegar = useNavigate();
  const venta = e.ventas[ventaId];
  const [emitiendo, setEmitiendo] = useState<TipoDocumentoElectronico | null>(null);
  const [errorDoc, setErrorDoc] = useState<string | null>(null);

  // "N" = nueva venta (atajo del panel de éxito).
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (ev.metaKey || ev.ctrlKey || ev.altKey || (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (ev.key === 'n' || ev.key === 'N') {
        ev.preventDefault();
        alNueva();
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [alNueva]);

  if (!venta) return null;
  const cliente = venta.clienteId ? e.clientes[venta.clienteId] : null;
  const vendedor = e.empleados[venta.vendedorId];
  const factura = venta.facturaId ? e.facturas[venta.facturaId] : null;
  const local = e.locales[venta.localId]?.nombre ?? '';
  const pagos = venta.pagos.filter((p) => p.tipo !== 'reembolso');
  const cambio = pagos.reduce((s, p) => s + (p.cambio ?? 0), 0);
  const saldo = Math.max(0, venta.total - pagos.reduce((s, p) => s + p.valor, 0));

  const adquirente = (): Adquirente =>
    cliente
      ? { tipo: 'identificado', clienteId: cliente.id, nombre: `${cliente.nombres} ${cliente.apellidos}`, documento: cliente.documento?.numero ?? null, correo: cliente.correo }
      : { tipo: 'consumidor_final', clienteId: null, nombre: 'Consumidor final', documento: null, correo: null };

  const emitir = (tipo: TipoDocumentoElectronico) => {
    setEmitiendo(tipo);
    setErrorDoc(null);
    const r = acciones.emitirFactura({ ventaId, tipo, adquirente: adquirente() });
    setEmitiendo(null);
    if (!r.ok) return setErrorDoc(r.error.mensaje);
    const evento = r.eventos.find((x) => x.tipo === 'FacturaEmitida');
    const facturaId = evento && 'facturaId' in evento ? evento.facturaId : null;
    if (tipo === 'factura_electronica' && facturaId) {
      avisar({ tipo: 'exito', texto: 'Factura electrónica generada (simulación)' });
      navegar(rutas.factura(facturaId));
    } else avisar({ tipo: 'exito', texto: 'Documento POS electrónico generado (simulación)', detalle: 'Ya puedes descargarlo en formato de tirilla.' });
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,380px)_minmax(0,1fr)] gap-4" data-testid="pos-exito">
      <section className="flex min-h-0 flex-col gap-4 border border-line bg-surface p-5" aria-label="Venta registrada">
        <svg viewBox="0 0 40 40" className="size-10 text-success" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="20" cy="20" r="18" pathLength="1" className="animate-draw [stroke-dasharray:1]" />
          <path d="M12 20.5l5.5 5.5L28.5 14.5" pathLength="1" className="animate-draw [stroke-dasharray:1] [animation-delay:200ms]" />
        </svg>
        <div>
          <p className="t-eyebrow text-ink-2">Venta registrada</p>
          <h2 className="mt-1 t-h1 num text-ink" data-testid="pos-venta-numero">
            {venta.numero}
          </h2>
          <p className="mt-2 t-kpi-xl num text-ink" data-testid="pos-exito-total">
            <Dinero valor={venta.total} contarDesdeCero />
          </p>
          <p className="mt-1 t-small text-muted">
            IVA incluido <Dinero valor={venta.iva} />
          </p>
        </div>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 t-small">
          <dt className="text-muted">Cliente</dt>
          <dd className="truncate text-ink">{cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'Consumidor final'}</dd>
          <dt className="text-muted">Vendedor</dt>
          <dd className="truncate text-ink">{vendedor ? `${vendedor.nombres} ${vendedor.apellidos}` : '—'}</dd>
          <dt className="text-muted">Local</dt>
          <dd className="text-ink">{local}</dd>
          <dt className="text-muted">{venta.tipo === 'separado' ? 'Abonos' : 'Pagó con'}</dt>
          <dd className="text-ink num">{pagos.map((p) => `${MEDIOS_PAGO[p.medio].corta} ${d(p.valor)}`).join(' · ')}</dd>
          {cambio > 0 && (
            <>
              <dt className="text-muted">Cambio</dt>
              <dd className="font-semibold text-ink num">{formatoDinero(cambio, 'COP')}</dd>
            </>
          )}
          {venta.tipo === 'separado' && (
            <>
              <dt className="text-muted">Saldo</dt>
              <dd className="text-ink num">
                <Dinero valor={saldo} />
                {venta.separado && <span className="text-muted"> · límite {fecha(venta.separado.fechaLimite)}</span>}
              </dd>
            </>
          )}
        </dl>
        <div className="mt-auto flex flex-col gap-2">
          {factura ? (
            <div className="flex flex-col gap-2 border border-line bg-surface-2 p-3" data-testid="pos-documento-emitido">
              <p className="t-label text-ink">
                <Icono icono={ReceiptText} tamano={14} className="mr-1.5 inline" />
                {factura.tipo === 'documento_equivalente_pos' ? 'Documento POS electrónico' : 'Factura electrónica'} <span className="num">{factura.numero}</span>
              </p>
              <p className="t-small text-muted">Simulación sin validez fiscal.</p>
              <div className="flex flex-wrap items-center gap-2">
                {factura.tipo === 'documento_equivalente_pos' && <BotonDocumentoPdf documento={{ tipo: 'pos', facturaId: factura.id }} etiqueta="Descargar tirilla (80 mm)" />}
                <Button variante="secondary" tamano="sm" iconoDerecha={ArrowUpRight} onClick={() => navegar(rutas.factura(factura.id))}>
                  Ver documento
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button tamano="lg" anchoCompleto icono={FilePlus2} cargando={emitiendo === 'factura_electronica'} onClick={() => emitir('factura_electronica')} data-testid="pos-emitir-factura">
                Emitir factura electrónica
              </Button>
              <Button variante="secondary" tamano="lg" anchoCompleto icono={ReceiptText} cargando={emitiendo === 'documento_equivalente_pos'} onClick={() => emitir('documento_equivalente_pos')} data-testid="pos-emitir-pos">
                Documento POS electrónico (simulado)
              </Button>
            </>
          )}
          {errorDoc && (
            <p role="alert" className="t-small text-danger">
              {errorDoc}
            </p>
          )}
          <Button variante="ghost" anchoCompleto onClick={alNueva} data-testid="pos-nueva-venta">
            Nueva venta <kbd className="ml-2 inline-flex h-5 min-w-5 items-center justify-center border border-line-strong px-1 font-sans t-micro text-ink-2">N</kbd>
          </Button>
        </div>
      </section>

      <section className="flex min-h-0 flex-col border border-line bg-surface p-5" aria-label="Lo que acaba de pasar">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="t-h2 text-ink">Lo que acaba de pasar</h2>
          <p className="t-small text-muted">Cada cifra, antes → después</p>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-line-soft overflow-y-auto border-y border-line-soft" data-testid="pos-efectos">
          {efectos.map((x, i) => (
            <FilaEfecto key={`${x.clave}-${i}`} efecto={x} indice={i} baseVenta={venta.base} />
          ))}
        </ul>
        <p className="mt-3 t-small text-muted">{TEXTOS.exito.pie}</p>
      </section>
    </div>
  );
}

const ICONOS: Record<EfectoPos['clave'], typeof Package> = {
  inventario: Package,
  ventas_hoy: ShoppingBag,
  ventas_hoy_local: ShoppingBag,
  comision: TrendingUp,
  cliente: CircleUser,
  caja: Wallet,
};

function FilaEfecto({ efecto: x, indice, baseVenta }: { efecto: EfectoPos; indice: number; baseVenta: number }) {
  const [rodando, setRodando] = useState(false);
  useEffect(() => {
    // Cada fila arranca su conteo cuando termina de entrar (escalonado de 80 ms).
    const t = setTimeout(() => setRodando(true), 280 + indice * 80);
    return () => clearTimeout(t);
  }, [indice]);
  const d = useDinero();
  const valor = rodando ? x.despues : x.antes;
  const cifra: ReactNode =
    x.formato === 'dinero' ? (
      <Dinero valor={valor} animar incremento className="font-bold" />
    ) : (
      <Cifra valor={valor} formatear={entero} incremento={(n) => entero(n)} className="font-bold" />
    );
  const mostrarAntesDespues = x.mostrarAntesDespues !== false;
  return (
    <li className="grid grid-cols-[20px_minmax(0,1fr)_auto_auto] items-center gap-x-3 py-2.5 animate-row-in" style={{ animationDelay: `${indice * 80}ms` }} data-testid={`pos-efecto-${x.clave}`}>
      <Icono icono={x.clave === 'caja' ? Banknote : ICONOS[x.clave]} tamano={16} className="text-ink-2" />
      <div className="min-w-0">
        <p className="truncate t-body text-ink" title={x.etiqueta}>
          {x.etiqueta}
        </p>
        {x.clave === 'caja' && x.porMedio && x.porMedio.length > 0 ? (
          <p className="truncate t-small num text-muted" data-testid="pos-efecto-caja-medios">
            {x.porMedio.map((m) => `${MEDIOS_PAGO[m.medio].corta} ${m.valor > 0 ? '+' : '−'}${d(Math.abs(m.valor))}`).join(' · ')}
          </p>
        ) : x.detalle ? (
          <p className="truncate t-small text-muted" title={x.detalle}>
            {x.clave === 'comision' ? `${x.detalle} (base ${d(baseVenta)})` : x.detalle}
          </p>
        ) : null}
      </div>
      {mostrarAntesDespues ? (
        <p className="t-body num text-ink" data-testid={`pos-efecto-${x.clave}-cifras`}>
          <span className="text-muted">{x.formato === 'dinero' ? <Dinero valor={x.antes} /> : entero(x.antes)} → </span>
          {cifra}
        </p>
      ) : (
        <span />
      )}
      <Link to={x.enlace} className="inline-flex h-8 items-center gap-1 px-2 t-nav text-ink hover:bg-surface-2" data-testid={`pos-ver-${x.clave}`}>
        Ver <Icono icono={ArrowUpRight} tamano={14} />
      </Link>
    </li>
  );
}
