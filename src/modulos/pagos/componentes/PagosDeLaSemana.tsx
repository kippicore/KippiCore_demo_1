import { CalendarClock, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FechaISO } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { dineroOrigen } from '@/lib/moneda';
import { Badge, Button, Dinero, EmptyState, Fecha, Icono, SelectorFecha, Tooltip } from '@/ui';
import { diaCorto, movimientosDeSemana, textoSemana, type SemanaFlujo } from '../calculos';
import type { MovimientoVista } from '../selectores';
import { MOTIVO_NO_REPROGRAMABLE, TIPOS_FLUJO } from '../textos';

/**
 * Pagos de una semana del flujo de caja (W5): lo que sale, con "Reprogramar" en dos clics, y lo que entra agrupado.
 * Reprogramar mueve la línea y la explicación del punto bajo en vivo (el flujo se recalcula con la nueva fecha).
 */
export interface PropsPagosDeLaSemana {
  semana: SemanaFlujo;
  movimientos: readonly MovimientoVista[];
  hoy: FechaISO;
  dias: number;
  /** Devuelve el mensaje de error si no se pudo, o null si se movió. */
  alReprogramar: (m: MovimientoVista, fecha: FechaISO) => string | null;
}

function claveDe(m: MovimientoVista, i: number): string {
  return `${m.fechaEfectiva}|${m.tipo}|${m.refId ?? ''}|${m.concepto}|${i}`;
}

export function PagosDeLaSemana({ semana, movimientos, hoy, dias, alReprogramar }: PropsPagosDeLaSemana) {
  const [editando, setEditando] = useState<string | null>(null);
  const [fecha, setFecha] = useState<FechaISO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const delaSemana = useMemo(() => movimientosDeSemana(movimientos, semana.lunes, hoy, dias), [movimientos, semana.lunes, hoy, dias]);
  const salidas = delaSemana.filter((m) => m.valor < 0);
  const entradas = useMemo(() => {
    const porConcepto = new Map<string, { concepto: string; tipo: MovimientoVista['tipo']; valor: number }>();
    for (const m of delaSemana) {
      if (m.valor < 0) continue;
      const x = porConcepto.get(m.tipo) ?? { concepto: TIPOS_FLUJO[m.tipo], tipo: m.tipo, valor: 0 };
      x.valor += m.valor;
      porConcepto.set(m.tipo, x);
    }
    return [...porConcepto.values()].sort((a, b) => b.valor - a.valor);
  }, [delaSemana]);

  const abrir = (clave: string, m: MovimientoVista) => {
    setEditando(clave);
    setFecha(sumarDias(m.fechaEfectiva, 7));
    setError(null);
  };
  const cerrar = () => {
    setEditando(null);
    setError(null);
  };
  const aplicar = (m: MovimientoVista) => {
    if (!fecha) {
      setError('Elige la nueva fecha de pago.');
      return;
    }
    const e = alReprogramar(m, fecha);
    if (e) setError(e);
    else cerrar();
  };

  if (!delaSemana.length)
    return <EmptyState tamano="tabla" icono={CalendarClock} titulo="Nada previsto en esta semana" texto="Esta semana no tiene pagos ni cobros calculados. Elige otra semana de la lista." />;

  return (
    <div data-testid="pagos-semana">
      <section aria-label="Lo que sale esa semana">
        <h3 className="t-eyebrow text-ink-2">
          Lo que sale · <span className="num">{salidas.length}</span>
        </h3>
        {salidas.length === 0 ? (
          <p className="mt-2 t-body text-muted">Esta semana no sale plata.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
            {salidas.map((m, i) => {
              const clave = claveDe(m, i);
              const reprogramable = m.clase === 'cxp' || m.clase === 'importacion';
              const abierto = editando === clave;
              const motivo = MOTIVO_NO_REPROGRAMABLE[m.tipo] ?? 'Esta obligación no se reprograma desde aquí.';
              return (
                <li key={clave} data-testid="pago-semana" data-clase={m.clase}>
                  <div className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate t-body font-semibold text-ink" title={m.concepto}>
                        {m.concepto}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 t-small text-muted">
                        <span className="num">{diaCorto(m.fechaEfectiva)}</span>
                        <span aria-hidden>·</span>
                        <span>{TIPOS_FLUJO[m.tipo]}</span>
                        {m.cxp && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="num">{m.cxp.numero}</span>
                            {m.cxp.programadaPara && <Badge tono="outline" tamano="sm">Programado</Badge>}
                          </>
                        )}
                        {m.clase === 'importacion' && (
                          <Badge tono="neutral" tamano="sm">
                            Estimado
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="t-body font-semibold num text-ink">
                        <Dinero valor={-m.valor} />
                      </p>
                      {m.cxp && m.cxp.moneda !== 'COP' && <p className="t-small num text-muted">{dineroOrigen(m.cxp.saldoOrigen, m.cxp.moneda)}</p>}
                    </div>
                    <div className="w-[132px] shrink-0 text-right">
                      {reprogramable ? (
                        <Button variante="secondary" tamano="sm" icono={CalendarClock} aria-expanded={abierto} onClick={() => (abierto ? cerrar() : abrir(clave, m))} data-testid="reprogramar">
                          Reprogramar
                        </Button>
                      ) : (
                        <Tooltip texto={motivo} envolver>
                          <span className="inline-flex h-8 items-center gap-1.5 t-small text-muted">
                            <Icono icono={Lock} tamano={14} />
                            Fecha fija
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  {abierto && (
                    <div className="mb-3 border border-line bg-surface-2 p-4" data-testid="reprogramar-panel">
                      <div className="flex flex-wrap items-end gap-3">
                        <SelectorFecha etiqueta="Pagar el" hoy={hoy} desde={sumarDias(hoy, 1)} valor={fecha} alCambiar={setFecha} error={error ?? undefined} className="w-[200px]" />
                        <div className="flex gap-2 pb-0.5">
                          {[7, 14, 30].map((n) => (
                            <Button key={n} variante="ghost" tamano="sm" onClick={() => setFecha(sumarDias(m.fechaEfectiva, n))}>
                              +{n} días
                            </Button>
                          ))}
                        </div>
                        <span className="flex-1" />
                        <Button variante="ghost" tamano="sm" onClick={cerrar}>
                          Cancelar
                        </Button>
                        <Button tamano="sm" onClick={() => aplicar(m)} data-testid="reprogramar-aplicar">
                          Mover el pago
                        </Button>
                      </div>
                      {m.clase === 'importacion' && (
                        <p className="mt-3 t-small text-muted">Este pago todavía es un estimado: al moverlo se registra su cuenta por pagar con vencimiento en la fecha que elijas.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section aria-label="Lo que entra esa semana" className="mt-8">
        <h3 className="t-eyebrow text-ink-2">Lo que entra (calculado con tus ventas)</h3>
        {entradas.length === 0 ? (
          <p className="mt-2 t-body text-muted">Esta semana no entra plata calculada.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
            {entradas.map((x) => (
              <li key={x.tipo} className="flex items-center justify-between gap-4 py-3">
                <span className="t-body text-ink">{x.concepto}</span>
                <span className="t-body font-semibold num text-ink">
                  +<Dinero valor={x.valor} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-4 t-small text-muted">
        Semana del {textoSemana(semana.lunes)} · lo vencido cuenta desde mañana (<Fecha valor={sumarDias(hoy, 1)} formato="corta" />).
      </p>
    </div>
  );
}
