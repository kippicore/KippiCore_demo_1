import { ArrowLeftRight, Check, Percent, ReceiptText, X, type LucideIcon } from 'lucide-react';
import { useRef, useState, type PointerEvent } from 'react';
import { useAcciones, useAhora, useSel } from '@/estado';
import { ESTADOS_APROBACION } from '@/config/estados';
import { relativa, unidades as unidadesTexto } from '@/lib/formato';
import { avisar, BadgeEstado, Button, cn, Dinero, EmptyState, Icono, Textarea } from '@/ui/ligero';
import { selSolicitudesApp, type SolicitudVista } from '../selectores';
import { TXT } from '../textos';
import { ParDato, Tarjeta } from './Tarjeta';
import { HojaApp } from './HojaApp';

/**
 * "Para aprobar" (W10 y W11): los descuentos por encima del 15 %, los traslados y las anulaciones que esperan al dueño.
 * Cada tarjeta se aprueba o se rechaza con un toque (botones de 48 px) o deslizando (→ aprueba, ← rechaza); al decidir,
 * la tarjeta se va deslizándose y la decisión queda en el registro con `resolverAprobacion` (aparece en el escritorio).
 * Anular una venta y rechazar piden confirmación en una hoja inferior: ninguna decisión se toma por un roce.
 */
const ICONO_TIPO: Record<SolicitudVista['tipo'], LucideIcon> = { descuento: Percent, traslado: ArrowLeftRight, anulacion: ReceiptText };
const ETIQUETA_TIPO: Record<SolicitudVista['tipo'], string> = { descuento: 'Descuento', traslado: 'Traslado', anulacion: 'Anulación' };

type Decision = 'aprobada' | 'rechazada';
const UMBRAL = 88;

function TarjetaSolicitud({ s, alDecidir, saliendo }: { s: SolicitudVista; alDecidir: (d: Decision) => void; saliendo: Decision | null }) {
  const ahora = useAhora();
  const [dx, setDx] = useState(0);
  const arrastre = useRef<{ x: number; y: number; activo: boolean } | null>(null);
  // El desplazamiento también va en una referencia: al soltar, `dx` del estado puede ir un movimiento atrasado.
  const ultimoDx = useRef(0);

  const alBajar = (e: PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    arrastre.current = { x: e.clientX, y: e.clientY, activo: false };
  };
  const alMover = (e: PointerEvent<HTMLElement>) => {
    const a = arrastre.current;
    if (!a) return;
    const mx = e.clientX - a.x;
    const my = e.clientY - a.y;
    if (!a.activo) {
      if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.5) {
        a.activo = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      } else return;
    }
    ultimoDx.current = Math.max(-140, Math.min(140, mx));
    setDx(ultimoDx.current);
  };
  const alSoltar = () => {
    const a = arrastre.current;
    arrastre.current = null;
    const final = ultimoDx.current;
    ultimoDx.current = 0;
    if (a?.activo && Math.abs(final) >= UMBRAL) alDecidir(final > 0 ? 'aprobada' : 'rechazada');
    setDx(0);
  };

  const Ico = ICONO_TIPO[s.tipo];
  const mueve = saliendo ? (saliendo === 'aprobada' ? 'translate-x-[110%]' : '-translate-x-[110%]') : '';
  return (
    <div className="relative overflow-hidden" data-testid="app-solicitud" data-solicitud={s.id} data-tipo={s.tipo}>
      {/* Lo que se descubre al deslizar */}
      <div aria-hidden className="absolute inset-0 flex items-center justify-between border border-line bg-surface-2 px-5 t-label text-ink-2">
        <span className={cn('inline-flex items-center gap-2 transition-opacity', dx > 24 ? 'opacity-100' : 'opacity-0')}>
          <Icono icono={Check} tamano={18} /> Aprobar
        </span>
        <span className={cn('inline-flex items-center gap-2 transition-opacity', dx < -24 ? 'opacity-100' : 'opacity-0')}>
          Rechazar <Icono icono={X} tamano={18} />
        </span>
      </div>
      <Tarjeta
        className={cn('relative touch-pan-y select-none transition-[transform,opacity] ease-enter', saliendo ? 'opacity-0 duration-(--dur-slow)' : dx === 0 ? 'duration-(--dur-slow)' : 'duration-0', mueve)}
      >
        <div onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar} style={{ transform: saliendo ? undefined : `translateX(${dx}px)` }}>
          <div className="flex items-center gap-2 px-4 pt-4">
            <Icono icono={Ico} tamano={16} className="text-ink-2" />
            <span className="t-eyebrow text-ink-2">{ETIQUETA_TIPO[s.tipo]}</span>
            <span className="ml-auto t-small text-muted">{relativa(s.ts, ahora)}</span>
          </div>
          <div className="px-4 pb-4 pt-2">
            <h3 className="t-h3 text-ink">{s.titulo}</h3>
            <p className="mt-0.5 t-small text-muted">Lo pide {s.solicitante}</p>
            <p className="mt-3 t-kpi-sm text-ink">{'dinero' in s.principal ? <Dinero valor={s.principal.dinero} /> : unidadesTexto(s.principal.unidades)}</p>
            <dl className="mt-2 divide-y divide-line-soft border-t border-line-soft">
              {s.datos.map((d) => (
                <ParDato key={d.etiqueta} etiqueta={d.etiqueta} className="py-2">
                  <span className="t-small">{d.dinero !== undefined ? <Dinero valor={d.dinero} /> : d.valor}</span>
                </ParDato>
              ))}
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variante="secondary" tamano="lg" onClick={() => alDecidir('rechazada')} data-testid="app-rechazar">
                {TXT.aprobar.rechazar}
              </Button>
              <Button variante="primary" tamano="lg" onClick={() => alDecidir('aprobada')} data-testid="app-aprobar">
                {TXT.aprobar.aprobar}
              </Button>
            </div>
          </div>
        </div>
      </Tarjeta>
    </div>
  );
}

/** Lista de solicitudes pendientes con sus hojas de confirmación. `limite` recorta (Hoy muestra las primeras). */
export function ListaSolicitudes({ limite, vacio = true }: { limite?: number; vacio?: boolean }) {
  const pendientes = useSel(selSolicitudesApp, { estado: 'pendiente' });
  const acciones = useAcciones();
  const [saliendo, setSaliendo] = useState<Record<string, Decision>>({});
  const [confirmando, setConfirmando] = useState<{ s: SolicitudVista; decision: Decision } | null>(null);
  const [nota, setNota] = useState('');

  const ejecutar = (s: SolicitudVista, decision: Decision, notaTexto: string | null) => {
    setSaliendo((x) => ({ ...x, [s.id]: decision }));
    setTimeout(() => {
      const r = acciones.resolverAprobacion({ solicitudId: s.id, decision, nota: notaTexto });
      if (!r.ok) {
        setSaliendo((x) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== s.id)));
        avisar({ tipo: 'error', texto: r.error.mensaje });
        return;
      }
      avisar({
        tipo: 'exito',
        texto: `${decision === 'aprobada' ? 'Aprobaste' : 'Rechazaste'}: ${s.titulo}`,
        detalle: 'Quedó registrado y ya se ve en el computador.',
      });
    }, 240);
  };

  const decidir = (s: SolicitudVista, decision: Decision) => {
    if (decision === 'rechazada' || s.tipo === 'anulacion') {
      setNota('');
      setConfirmando({ s, decision });
      return;
    }
    ejecutar(s, decision, null);
  };

  const visibles = limite ? pendientes.slice(0, limite) : pendientes;
  if (pendientes.length === 0)
    return vacio ? (
      <Tarjeta data-testid="app-aprobar-vacio">
        <EmptyState tamano="compacto" icono={Check} titulo={TXT.aprobar.vacio} texto={TXT.aprobar.vacioTexto} />
      </Tarjeta>
    ) : null;

  return (
    <>
      <div className="flex flex-col gap-3" data-testid="app-lista-aprobar">
        {visibles.map((s) => (
          <TarjetaSolicitud key={s.id} s={s} saliendo={saliendo[s.id] ?? null} alDecidir={(d) => decidir(s, d)} />
        ))}
      </div>
      <HojaApp
        abierta={!!confirmando}
        alCerrar={() => setConfirmando(null)}
        titulo={confirmando?.decision === 'aprobada' ? 'Confirma la anulación' : 'Rechazar solicitud'}
        pie={
          confirmando && (
            <div className="grid grid-cols-2 gap-3">
              <Button variante="secondary" tamano="lg" onClick={() => setConfirmando(null)}>
                Volver
              </Button>
              <Button
                variante={confirmando.decision === 'aprobada' ? 'destructive' : 'primary'}
                tamano="lg"
                data-testid="app-confirmar-decision"
                onClick={() => {
                  const c = confirmando;
                  setConfirmando(null);
                  ejecutar(c.s, c.decision, c.decision === 'rechazada' ? nota.trim() || null : null);
                }}
              >
                {confirmando.decision === 'aprobada' ? 'Anular venta' : 'Rechazar'}
              </Button>
            </div>
          )
        }
      >
        {confirmando && (
          <div>
            <p className="t-body-lg text-ink">{confirmando.s.titulo}</p>
            <p className="mt-1 t-small text-muted">Lo pide {confirmando.s.solicitante}</p>
            {confirmando.decision === 'aprobada' ? (
              <p className="mt-3 border-l-2 border-danger pl-3 t-body text-ink">{confirmando.s.consecuencia}</p>
            ) : (
              <Textarea etiqueta={TXT.aprobar.notaRechazo} opcional value={nota} onChange={(e) => setNota(e.target.value)} rows={3} className="mt-3" />
            )}
          </div>
        )}
      </HojaApp>
    </>
  );
}

/** Solicitudes ya resueltas (las últimas), con quién y cuándo. */
export function ListaResueltas() {
  const resueltas = useSel(selSolicitudesApp, { estado: 'resueltas' });
  const ahora = useAhora();
  if (resueltas.length === 0) return null;
  return (
    <Tarjeta data-testid="app-resueltas">
      <h2 className="px-4 pb-1 pt-4 t-eyebrow text-ink-2">{TXT.aprobar.resueltas}</h2>
      <ul className="divide-y divide-line-soft">
        {resueltas.map((s) => (
          <li key={s.id} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate t-body font-semibold text-ink">{s.titulo}</span>
              <span className="block truncate t-small text-muted">
                {s.resolucion ? `${s.resolucion.por} · ${relativa(s.resolucion.ts, ahora)}` : s.solicitante}
                {s.resolucion?.nota ? ` · ${s.resolucion.nota}` : ''}
              </span>
            </span>
            <BadgeEstado estado={ESTADOS_APROBACION[s.estado]} tamano="sm" />
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
