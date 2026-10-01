import { Check, Lock } from 'lucide-react';
import { useState } from 'react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { PERSONAS_ROL } from '@/config/permisos';
import { useAcciones, useAhora, useDinero, useSel } from '@/estado';
import { dinero, fechaLarga, hora, relativa } from '@/lib/formato';
import { avisar, Button, Dinero, EmptyState, Icono, PuntoEstado, Textarea } from '@/ui/ligero';
import { Pantalla } from '../componentes/Pantalla';
import { ParDato, Tarjeta, TarjetaTitulo } from '../componentes/Tarjeta';
import { nombreCorto, selDetalleCierre } from '../selectores';
import { TXT } from '../textos';
import { HojaApp } from '../componentes/HojaApp';

/**
 * Detalle de un cierre de caja (W11): el estado y la diferencia en grande, quién cerró y a qué hora, el arqueo por
 * denominación (el conteo ciego de quien cerró), cómo se llega al efectivo esperado (base + efectivo del día − egresos,
 * regla V8 del dominio), las ventas por medio de pago y los egresos. Abajo, "Marcar revisado" con una nota
 * (`revisarCierre`): queda en el registro y se ve en el escritorio.
 */
export default function Cierre() {
  const { sesionId } = useParamsRuta('appCierre');
  const d = useSel(selDetalleCierre, { sesionId: sesionId ?? '' });
  if (!d)
    return (
      <Pantalla testid="app-cierre-pagina" titulo="Cierre" volver={{ a: rutas.appCierres(), texto: TXT.cierres.titulo }}>
        <Tarjeta>
          <EmptyState tamano="compacto" icono={Lock} titulo="No encontramos ese cierre" texto="Puede que la caja no se haya abierto ese día. Vuelve a la lista de cierres." />
        </Tarjeta>
      </Pantalla>
    );
  return <DetalleCierre d={d} />;
}

function DetalleCierre({ d }: { d: NonNullable<ReturnType<typeof selDetalleCierre>> }) {
  const ahora = useAhora();
  const acciones = useAcciones();
  const din = useDinero();
  const [abierta, setAbierta] = useState(false);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const s = d.resumen.sesion;
  const c = s.cierre;
  const dif = c?.diferencia ?? 0;
  const revisada = d.resumen.estado === 'revisada';
  const puedeRevisar = d.resumen.estado === 'cerrada';

  const revisar = () => {
    setEnviando(true);
    const r = acciones.revisarCierre({ sesionId: s.id, nota: nota.trim() || null });
    setEnviando(false);
    if (!r.ok) {
      avisar({ tipo: 'error', texto: r.error.mensaje });
      return;
    }
    setAbierta(false);
    setNota('');
    avisar({ tipo: 'exito', texto: `Cierre de ${d.resumen.localNombre} marcado como revisado`, detalle: 'Quedó registrado y ya se ve en el computador.' });
  };

  return (
    <Pantalla
      testid="app-cierre-pagina"
      titulo={d.resumen.localNombre}
      volver={{ a: rutas.appCierres(), texto: TXT.cierres.titulo }}
      fecha={fechaLarga(d.fecha).replace(/ de \d{4}$/, '')}
    >
      {/* Estado y diferencia */}
      <Tarjeta className="p-4" data-testid="app-cierre-estado">
        {c ? (
          <>
            <p className="t-eyebrow text-ink-2">{TXT.cierres.diferencia}</p>
            <p className="mt-2 t-kpi text-ink" data-testid="app-cierre-diferencia">
              {dif === 0 ? <Dinero valor={0} /> : (
                <>
                  {dif < 0 ? '−' : '+'}
                  <Dinero valor={Math.abs(dif)} />
                </>
              )}
            </p>
            <p className="mt-1">
              {dif === 0 ? (
                <PuntoEstado tono="success" className="t-body text-ink">
                  {TXT.cierres.cuadro}
                </PuntoEstado>
              ) : (
                <PuntoEstado tono="danger" className="t-body text-ink">
                  <span>
                    {dif < 0 ? 'Faltan' : 'Sobran'} <Dinero valor={Math.abs(dif)} /> en efectivo
                  </span>
                </PuntoEstado>
              )}
            </p>
            <p className="mt-3 t-small text-muted">
              Cerró {nombreCorto(d.resumen.cerro ?? '')} · {hora(c.ts)} · abrió {nombreCorto(d.resumen.abrio)}
            </p>
            {c.ciego && (
              <p className="mt-2 flex items-start gap-2 t-small text-ink-2">
                <Icono icono={Lock} tamano={14} className="mt-0.5 shrink-0" />
                {TXT.cierres.ciego}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="t-h3 text-ink">{TXT.cierres.abierta}</p>
            <p className="mt-1 t-small text-muted">{TXT.cierres.abiertaTexto}</p>
          </>
        )}
      </Tarjeta>

      {/* Revisión */}
      {revisada && s.revision ? (
        <Tarjeta className="p-4 shadow-[inset_2px_0_0_var(--c-success)]" data-testid="app-cierre-revisado">
          <p className="flex items-center gap-2 t-label text-ink">
            <Icono icono={Check} tamano={16} />
            {TXT.cierres.revisado} por {s.revision.por === PERSONAS_ROL.dueno.usuarioId ? 'ti' : 'el dueño'} · {relativa(s.revision.ts, ahora)}
          </p>
          {s.revision.nota && <p className="mt-2 t-body text-ink">“{s.revision.nota}”</p>}
        </Tarjeta>
      ) : (
        puedeRevisar && (
          <Button tamano="lg" anchoCompleto icono={Check} onClick={() => setAbierta(true)} data-testid="app-marcar-revisado">
            {TXT.cierres.marcar}
          </Button>
        )
      )}

      {/* Efectivo */}
      {c && (
        <Tarjeta>
          <TarjetaTitulo titulo="Efectivo" />
          <dl className="divide-y divide-line-soft px-4 pb-2">
            <ParDato etiqueta={TXT.cierres.esperado}>
              <Dinero valor={c.efectivoEsperado} />
            </ParDato>
            <ParDato etiqueta={TXT.cierres.contado}>
              <Dinero valor={c.efectivoContado} />
            </ParDato>
            <ParDato etiqueta={TXT.cierres.diferencia}>
              <span className="font-semibold">
                {dif < 0 ? '−' : dif > 0 ? '+' : ''}
                <Dinero valor={Math.abs(dif)} />
              </span>
            </ParDato>
          </dl>
        </Tarjeta>
      )}

      {/* Arqueo por denominación */}
      {d.arqueo && c && (
        <Tarjeta data-testid="app-arqueo">
          <TarjetaTitulo titulo={TXT.cierres.arqueo} />
          <ul className="divide-y divide-line-soft px-4 pb-2">
            {d.arqueo.map((f) => (
              <li key={f.clave} className="flex min-h-11 items-center justify-between gap-3 py-2">
                <span className="t-body text-ink num">{f.cantidad === null ? 'Monedas' : `${f.cantidad} × ${dinero(Number(f.clave), 'COP')}`}</span>
                <span className="t-body num text-ink">
                  <Dinero valor={f.subtotal} />
                </span>
              </li>
            ))}
            <li className="flex min-h-11 items-center justify-between gap-3 py-2">
              <span className="t-label text-ink">Total contado</span>
              <span className="t-label num text-ink">
                <Dinero valor={c.efectivoContado} />
              </span>
            </li>
          </ul>
        </Tarjeta>
      )}

      {/* Cómo se calcula el esperado */}
      <Tarjeta data-testid="app-esperado">
        <TarjetaTitulo titulo={TXT.cierres.composicion} />
        <dl className="divide-y divide-line-soft px-4 pb-2">
          <ParDato etiqueta="Base de la caja">
            <Dinero valor={d.base} />
          </ParDato>
          <ParDato etiqueta="Efectivo cobrado en el día">
            <Dinero valor={d.efectivoDelDia} />
          </ParDato>
          <ParDato etiqueta="Egresos de caja">
            {d.resumen.egresos > 0 && '−'}
            <Dinero valor={d.resumen.egresos} />
          </ParDato>
          <ParDato etiqueta={`${TXT.cierres.esperado} en caja`}>
            <span className="font-semibold">
              <Dinero valor={d.resumen.esperado} />
            </span>
          </ParDato>
        </dl>
      </Tarjeta>

      {/* Ventas por medio de pago */}
      <Tarjeta>
        <TarjetaTitulo titulo={TXT.cierres.medios} />
        <dl className="divide-y divide-line-soft px-4 pb-2">
          {d.medios.map((m) => (
            <ParDato key={m.medio} etiqueta={m.etiqueta}>
              <Dinero valor={m.valor} />
            </ParDato>
          ))}
          <ParDato etiqueta={`${d.resumen.numVentas} ventas del día`}>
            <span className="font-semibold">
              <Dinero valor={d.resumen.totalVentas} />
            </span>
          </ParDato>
        </dl>
      </Tarjeta>

      {/* Egresos */}
      <Tarjeta>
        <TarjetaTitulo titulo={TXT.cierres.egresos} />
        {d.egresos.length === 0 ? (
          <p className="px-4 pb-4 t-small text-muted">{TXT.cierres.sinEgresos}</p>
        ) : (
          <ul className="divide-y divide-line-soft px-4 pb-2">
            {d.egresos.map((x) => (
              <li key={x.id} className="flex min-h-11 items-center justify-between gap-3 py-2">
                <span className="min-w-0 flex-1 truncate t-body text-ink">{x.concepto}</span>
                <span className="t-body num text-ink">
                  <Dinero valor={x.valor} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <HojaApp
        abierta={abierta}
        alCerrar={() => setAbierta(false)}
        titulo={TXT.cierres.marcar}
        pie={
          <Button tamano="lg" anchoCompleto cargando={enviando} onClick={revisar} data-testid="app-confirmar-revision">
            {TXT.cierres.marcar}
          </Button>
        }
      >
        <p className="t-body text-ink">
          {d.resumen.localNombre} · {dif === 0 ? 'cuadró' : `${dif < 0 ? 'faltaron' : 'sobraron'} ${din(Math.abs(dif))}`}
        </p>
        <Textarea
          className="mt-3"
          etiqueta={TXT.cierres.notaEtiqueta}
          opcional
          rows={3}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={TXT.cierres.notaEjemplo}
          data-testid="app-nota-revision"
        />
      </HojaApp>
    </Pantalla>
  );
}
