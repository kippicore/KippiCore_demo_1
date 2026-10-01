import { CircleCheck, ExternalLink } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { ESTADOS_CAJA } from '@/config/estados';
import { DENOMINACIONES, MEDIOS_PAGO } from '@/config/negocio';
import type { Id } from '@/dominio/tipos';
import { useAcciones, useEstadoDominio, useSel } from '@/estado';
import { selResumenSesion } from '@/selectores';
import { dinero as formatoDinero, entero, fecha, fechaHora, hora } from '@/lib/formato';
import { Badge, BadgeEstado, Button, Dinero, Drawer, EmptyState, Textarea, avisar } from '@/ui';
import { lecturaDiferencia, valorDenominacion } from '../calculos';
import { TEXTOS } from '../textos';

/**
 * Detalle de un cierre de caja (W11): quién abrió y cerró, el efectivo esperado con su composición (base + ventas en
 * efectivo − egresos), lo contado por denominación, la diferencia, las ventas por medio de pago, los egresos y la
 * revisión del dueño con su nota ("Hablé con Natalia; se descuenta del cambio de mañana"). Solo el dueño revisa.
 */
export interface PropsDetalleCierre {
  sesionId: Id | null;
  alCerrar: () => void;
}

export function DetalleCierre({ sesionId, alCerrar }: PropsDetalleCierre) {
  return (
    <Drawer abierto={!!sesionId} alCambiar={(a) => !a && alCerrar()} eyebrow="Cierre de caja" titulo={<Titulo sesionId={sesionId} />} ancho="md" data-testid="caja-detalle">
      {sesionId && <Cuerpo sesionId={sesionId} alCerrar={alCerrar} />}
    </Drawer>
  );
}

function Titulo({ sesionId }: { sesionId: Id | null }) {
  const r = useSel(selResumenSesion, { sesionId: sesionId ?? '' });
  return <>{r ? `${r.localNombre} · ${fecha(r.sesion.abierta.ts)}` : 'Caja'}</>;
}

function Cuerpo({ sesionId, alCerrar }: { sesionId: Id; alCerrar: () => void }) {
  const e = useEstadoDominio();
  const acciones = useAcciones();
  const r = useSel(selResumenSesion, { sesionId });
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!r)
    return <EmptyState tamano="compacto" icono={CircleCheck} titulo="No encontramos esa caja" texto="Puede que el enlace sea de otra sesión de la demostración." accion={<Button variante="secondary" onClick={alCerrar}>Volver a la caja</Button>} />;
  const s = r.sesion;
  const c = s.cierre;
  const nombre = (id: Id) => (e.empleados[id] ? `${e.empleados[id]?.nombres} ${e.empleados[id]?.apellidos}` : (e.usuarios[id]?.nombre ?? '—'));
  const estado = r.estado === 'abierta' ? ESTADOS_CAJA.abierta : c && c.diferencia === 0 ? (r.estado === 'revisada' ? ESTADOS_CAJA.revisado : ESTADOS_CAJA.cuadro) : r.estado === 'revisada' ? ESTADOS_CAJA.revisado : ESTADOS_CAJA.con_diferencia;
  const lectura = c ? lecturaDiferencia(c.diferencia) : null;
  const efectivoVentas = r.esperado - s.abierta.baseInicial + r.egresos;
  const otrosMedios = (Object.entries(r.porMedio) as [keyof typeof MEDIOS_PAGO, number][]).filter(([m]) => m !== 'efectivo').sort((a, b) => b[1] - a[1]);

  const revisar = () => {
    const x = acciones.revisarCierre({ sesionId, nota: nota.trim() || null });
    if (!x.ok) return setError(x.error.mensaje);
    setError(null);
    avisar({ tipo: 'exito', texto: `Cierre de ${r.localNombre} marcado como revisado` });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <BadgeEstado estado={estado} />
        {lectura === 'faltante' && c && <Badge tono="danger">Faltan {formatoDinero(Math.abs(c.diferencia), 'COP')}</Badge>}
        {lectura === 'sobrante' && c && <Badge tono="warning">Sobran {formatoDinero(c.diferencia, 'COP')}</Badge>}
        {r.estado === 'revisada' && <Badge tono="neutral">Revisado</Badge>}
      </div>

      <section aria-label="Arqueo" data-testid="caja-detalle-arqueo">
        <h3 className="mb-3 t-eyebrow text-ink-2">Efectivo</h3>
        <dl className="divide-y divide-line-soft border-y border-line-soft">
          <Fila etiqueta="Base inicial" valor={<Dinero valor={s.abierta.baseInicial} />} />
          <Fila etiqueta="Efectivo de las ventas" valor={<Dinero valor={efectivoVentas} />} />
          <Fila etiqueta={`Egresos de caja${s.egresos.length ? ` (${s.egresos.length})` : ''}`} valor={r.egresos ? <>−<Dinero valor={r.egresos} /></> : <Dinero valor={0} />} />
          <Fila etiqueta={c ? 'Efectivo esperado al cerrar' : 'Efectivo esperado hasta ahora'} valor={<Dinero valor={r.esperado} />} fuerte testid="caja-detalle-esperado" />
          {c && <Fila etiqueta="Efectivo contado" valor={<Dinero valor={c.efectivoContado} />} fuerte testid="caja-detalle-contado" />}
          {c && (
            <Fila
              etiqueta="Diferencia"
              valor={
                <span className={lectura === 'cuadro' ? 'text-success' : lectura === 'faltante' ? 'text-danger' : 'text-warning'} data-testid="caja-detalle-diferencia">
                  {lectura === 'cuadro' ? 'Cuadró' : <Dinero valor={c.diferencia} />}
                </span>
              }
              fuerte
            />
          )}
        </dl>
        <p className="mt-2 t-small text-muted">
          Abrió {nombre(s.abierta.por)} a las {hora(s.abierta.ts)}
          {c ? ` · cerró ${nombre(c.por)} a las ${hora(c.ts)}${c.ciego ? ' con arqueo ciego (contó sin ver el esperado)' : ''}` : ' · la caja sigue abierta'}.
        </p>
      </section>

      {c?.denominaciones && (
        <section aria-label="Conteo por denominación">
          <h3 className="mb-3 t-eyebrow text-ink-2">Lo que contó por denominación</h3>
          <table className="w-full border-collapse t-body">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="h-8 text-left t-eyebrow text-ink-2">Denominación</th>
                <th scope="col" className="h-8 text-right t-eyebrow text-ink-2">Cantidad</th>
                <th scope="col" className="h-8 text-right t-eyebrow text-ink-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {DENOMINACIONES.filter((k) => (c.denominaciones?.[k] ?? 0) > 0).map((k) => {
                const n = c.denominaciones?.[k] ?? 0;
                const v = valorDenominacion(k);
                return (
                  <tr key={k} className="border-b border-line-soft">
                    <th scope="row" className="h-9 text-left font-normal text-ink">{v === null ? 'Monedas' : formatoDinero(v, 'COP')}</th>
                    <td className="text-right num text-ink-2">{v === null ? '—' : `× ${entero(n)}`}</td>
                    <td className="text-right num text-ink">{formatoDinero(v === null ? n : v * n, 'COP')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section aria-label="Ventas por medio de pago">
        <h3 className="mb-3 t-eyebrow text-ink-2">
          Ventas del día · {entero(r.numVentas)} {r.numVentas === 1 ? 'venta' : 'ventas'}
        </h3>
        <dl className="divide-y divide-line-soft border-y border-line-soft" data-testid="caja-detalle-medios">
          {r.porMedio.efectivo !== undefined && <Fila etiqueta="Efectivo" valor={<Dinero valor={r.porMedio.efectivo} />} />}
          {otrosMedios.map(([m, v]) => (
            <Fila key={m} etiqueta={MEDIOS_PAGO[m].etiqueta} valor={<Dinero valor={v} />} />
          ))}
          <Fila etiqueta="Total vendido" valor={<Dinero valor={r.totalVentas} />} fuerte />
        </dl>
        <Link to={rutas.ventas({ desde: s.abierta.ts.slice(0, 10), hasta: s.abierta.ts.slice(0, 10), local: s.localId })} className="mt-3 inline-flex items-center gap-1.5 t-nav text-ink underline-offset-4 hover:underline">
          Ver las ventas de ese día <ExternalLink size={14} aria-hidden />
        </Link>
      </section>

      {s.egresos.length > 0 && (
        <section aria-label="Egresos de caja">
          <h3 className="mb-3 t-eyebrow text-ink-2">Egresos de caja</h3>
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {s.egresos.map((x) => (
              <li key={x.id} className="flex items-baseline justify-between gap-3 py-2 t-body">
                <span className="min-w-0 truncate text-ink">{x.concepto}</span>
                <span className="shrink-0 t-small num text-muted">{hora(x.ts)}</span>
                <span className="w-28 shrink-0 text-right num text-ink">−<Dinero valor={x.valor} /></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c?.observacion && (
        <section aria-label="Observación del cierre">
          <h3 className="mb-2 t-eyebrow text-ink-2">Observación de quien cerró</h3>
          <p className="t-body text-ink">{c.observacion}</p>
        </section>
      )}

      {c && (
        <section aria-label="Revisión del dueño" data-testid="caja-revision">
          <h3 className="mb-3 t-eyebrow text-ink-2">Revisión del dueño</h3>
          {s.revision ? (
            <div className="border border-line bg-surface-2 p-4">
              <p className="t-label text-ink">
                <CircleCheck size={14} className="mr-1.5 inline text-success" aria-hidden />
                Revisado por {nombre(s.revision.por)} · {fechaHora(s.revision.ts)}
              </p>
              {s.revision.nota && <p className="mt-2 t-body text-ink-2" data-testid="caja-revision-nota">«{s.revision.nota}»</p>}
            </div>
          ) : (
            <form
              onSubmit={(ev) => {
                ev.preventDefault();
                revisar();
              }}
              className="flex flex-col gap-3"
            >
              <Textarea etiqueta="Nota de la revisión" opcional placeholder="Ej. Hablé con Natalia; se descuenta del cambio de mañana" value={nota} onChange={(ev) => setNota(ev.target.value)} error={error ?? undefined} data-testid="caja-nota-revision" />
              <div>
                <Button type="submit" data-testid="caja-marcar-revisado">
                  Marcar revisado
                </Button>
              </div>
              <p className="t-small text-muted">{TEXTOS.caja.revisionAyuda}</p>
            </form>
          )}
        </section>
      )}
    </>
  );
}

function Fila({ etiqueta, valor, fuerte, testid }: { etiqueta: string; valor: ReactNode; fuerte?: boolean; testid?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5" data-testid={testid}>
      <dt className={fuerte ? 't-label text-ink' : 't-body text-ink-2'}>{etiqueta}</dt>
      <dd className={fuerte ? 't-body num font-bold text-ink' : 't-body num text-ink'}>{valor}</dd>
    </div>
  );
}
