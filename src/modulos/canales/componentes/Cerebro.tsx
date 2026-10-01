import { Brain, CircleCheck, Database } from 'lucide-react';
import { Badge, Card, cn, Dinero, EmptyState, Icono } from '@/ui';
import { hora } from '@/lib/formato';
import { REGLAS, TEXTOS } from '../textos';
import { diaYMes } from '../reglas';
import type { ConsultaInventario, DefRegla, EntradaRegistro, Guion, Traza } from '../tipos';

/**
 * El "cerebro" de la automatización (W9): a la derecha del teléfono, el flujo de cinco nodos que se enciende uno a
 * uno mientras el teléfono dice "escribiendo…", la consulta al inventario real con las cifras por local, las
 * reglas (la que se activó se ilumina) y el registro de lo que acaba de decidir el bot.
 */
interface Props {
  guion: Guion | null;
  traza: Traza | null;
  nodoActivo: number;
  consultas: ConsultaInventario[] | null;
  escribiendo: boolean;
  registro: EntradaRegistro[];
  reglas: DefRegla[];
}

export function Cerebro({ guion, traza, nodoActivo, consultas, escribiendo, registro, reglas }: Props) {
  return (
    <div
      className="flex min-w-0 flex-col gap-4"
      data-testid="canales-cerebro"
      data-regla-activa={traza && nodoActivo >= 3 ? traza.regla : ''}
    >
      <Card padding="compacta">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 t-eyebrow text-ink-2">
              <Icono icono={Brain} tamano={16} />
              {TEXTOS.cerebro.titulo}
            </p>
            <h2 className="mt-1.5 t-h2 text-ink">{TEXTOS.cerebro.flujo}</h2>
          </div>
          {guion && (
            <p className="max-w-[40ch] t-small text-muted">
              <span className="font-semibold text-ink-2">{TEXTOS.cerebro.disparador}:</span>{' '}
              {guion.disparador.charAt(0).toLowerCase() + guion.disparador.slice(1)}
            </p>
          )}
        </div>
        <ol className="mt-5 grid grid-cols-5 gap-2" data-testid="canales-flujo">
          {(traza?.flujo ?? guion?.flujo ?? []).map((nodo, i) => {
            const detalle = traza?.nodos[i] ?? null;
            const activo = nodoActivo === i && detalle !== null;
            const alcanzado = !!traza && nodoActivo >= i && detalle !== null;
            const omitido = !!traza && detalle === null && nodoActivo >= 3;
            return (
              <li
                key={`${guion?.id}-${i}`}
                className="relative min-w-0"
                data-nodo={i}
                data-estado={activo ? 'activo' : alcanzado ? 'alcanzado' : omitido ? 'omitido' : 'inactivo'}
              >
                {i < 4 && (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-[17px] h-px',
                      alcanzado && nodoActivo > i ? 'bg-ink' : 'bg-line-strong',
                    )}
                  />
                )}
                <div className="flex flex-col items-center text-center">
                  <span
                    key={`${activo}`}
                    className={cn(
                      'relative inline-flex size-9 items-center justify-center rounded-full border t-label num transition-colors duration-(--dur-base)',
                      activo
                        ? 'border-ink bg-ink text-inverse'
                        : alcanzado
                          ? 'border-ink bg-surface text-ink'
                          : 'border-line-strong bg-surface text-muted',
                    )}
                  >
                    {alcanzado && !activo ? <Icono icono={CircleCheck} tamano={18} /> : i + 1}
                    {activo && escribiendo && (
                      <span aria-hidden className="absolute inset-0 rounded-full bg-ink animate-hint" />
                    )}
                  </span>
                  <p className={cn('mt-2 t-label', alcanzado ? 'text-ink' : 'text-muted')}>{nodo.titulo}</p>
                  <p
                    className={cn(
                      'mt-1 min-h-[3.4rem] break-words t-small',
                      alcanzado ? 'text-ink-2' : 'text-subtle',
                    )}
                    data-testid={`canales-nodo-detalle-${i}`}
                  >
                    {alcanzado ? detalle : omitido ? 'No hizo falta' : nodo.descripcion}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid grid-cols-1 gap-4 wide:grid-cols-2">
        <Card
          padding="compacta"
          titulo={
            consultas
              ? TEXTOS.cerebro.inventario
              : guion?.audiencia
                ? TEXTOS.cerebro.audiencia
                : (guion?.datos?.titulo ?? TEXTOS.cerebro.inventario)
          }
          accion={
            <Badge tono="success" tamano="sm" icono={Database}>
              {TEXTOS.indicadores.real}
            </Badge>
          }
          data-testid="canales-datos"
        >
          {consultas ? (
            <div className="flex flex-col gap-4" data-testid="canales-consulta">
              {consultas.map((c) => (
                <Consulta key={c.variante} c={c} />
              ))}
            </div>
          ) : guion?.audiencia ? (
            <Audiencia a={guion.audiencia} />
          ) : guion?.datos ? (
            <dl className="flex flex-col" data-testid="canales-datos-clave">
              {guion.datos.filas.map((f) => (
                <div
                  key={f.etiqueta}
                  className="flex items-baseline justify-between gap-4 border-b border-line-soft py-2 last:border-b-0"
                >
                  <dt className="t-small text-muted">{f.etiqueta}</dt>
                  <dd className="text-right t-label num text-ink">{f.valor}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState
              tamano="compacto"
              icono={Database}
              titulo="Esperando una pregunta"
              texto={TEXTOS.cerebro.sinConsulta}
            />
          )}
        </Card>

        <Card padding="compacta" titulo={TEXTOS.cerebro.registro}>
          {registro.length === 0 ? (
            <p className="t-body text-muted">{TEXTOS.cerebro.sinRegistro}</p>
          ) : (
            <ol className="flex flex-col gap-3" data-testid="canales-registro">
              {registro.slice(0, 4).map((r) => (
                <li key={r.id} className="animate-row-in border-l-2 border-ink pl-3">
                  <p className="t-label text-ink">
                    {REGLAS[r.regla].nombre}{' '}
                    <span className="font-normal text-muted num">· {hora(r.ts)}</span>
                  </p>
                  {r.detalle && <p className="mt-0.5 break-words t-small text-ink-2">{r.detalle}</p>}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card padding="compacta" titulo={TEXTOS.cerebro.reglas}>
        <ul className="grid grid-cols-1 gap-2 desk:grid-cols-2" data-testid="canales-reglas">
          {reglas.map((r) => {
            const activa = !!traza && nodoActivo >= 3 && traza.regla === r.id;
            const delEscenario = guion?.reglas.includes(r.id);
            return (
              <li
                key={r.id}
                data-regla={r.id}
                data-activa={activa ? 'true' : 'false'}
                className={cn(
                  'border px-3 py-2.5 transition-colors duration-(--dur-base)',
                  activa ? 'border-ink bg-ink text-inverse' : 'border-line bg-surface text-ink',
                )}
              >
                <p className="flex items-center justify-between gap-2 t-label">
                  {r.nombre}
                  {activa ? (
                    <span className="t-eyebrow">{TEXTOS.cerebro.activa}</span>
                  ) : delEscenario ? (
                    <span aria-hidden className="size-1.5 rounded-full bg-accent" />
                  ) : null}
                </p>
                <p className={cn('mt-0.5 t-small', activa ? 'text-inverse/80' : 'text-muted')}>
                  {activa ? r.hace : r.cuando}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

const ESTILO_BARRAS = `
@keyframes canales-barra { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@media (prefers-reduced-motion: reduce) { .canales-barra { animation: none !important; } }
`;

function Consulta({ c }: { c: ConsultaInventario }) {
  const max = Math.max(1, ...c.filas.map((f) => f.unidades));
  return (
    <div data-testid="canales-consulta-fila">
      <style>{ESTILO_BARRAS}</style>
      <p className="t-label text-ink">
        {c.producto} <span className="font-normal text-muted">· {c.variante}</span>
      </p>
      {c.filas.length === 0 ? (
        <p className="mt-2 t-small text-muted">
          {TEXTOS.cerebro.sinExistencias}
          {c.enCamino ? `. ${TEXTOS.cerebro.enCamino(c.enCamino.unidades, diaYMes(c.enCamino.fecha))}` : ''}
        </p>
      ) : (
        <>
          <ul className="mt-2 flex flex-col gap-1.5">
            {c.filas.map((f, i) => (
              <li
                key={f.localId}
                className="grid grid-cols-[96px_1fr_32px] items-center gap-3 t-small"
                data-testid="canales-consulta-local"
                data-local={f.localId}
              >
                <span className="truncate text-ink-2">{f.local}</span>
                <span className="h-2 bg-surface-2">
                  <span
                    className="canales-barra block h-full origin-left bg-ink"
                    style={{
                      width: `${(f.unidades / max) * 100}%`,
                      animation: `canales-barra 600ms var(--ease-enter) ${i * 140}ms both`,
                    }}
                  />
                </span>
                <span className="text-right font-semibold num text-ink">{f.unidades}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex items-baseline justify-between gap-3 border-t border-line-soft pt-2 t-small text-muted">
            <span>
              {TEXTOS.cerebro.total}:{' '}
              <span className="font-semibold num text-ink">{TEXTOS.cerebro.unidades(c.total)}</span>
            </span>
            <span>
              Precio de lista{' '}
              <span className="font-semibold num text-ink">
                <Dinero valor={c.precio} />
              </span>
            </span>
          </p>
        </>
      )}
    </div>
  );
}

function Audiencia({ a }: { a: NonNullable<Guion['audiencia']> }) {
  const filas = [
    { etiqueta: 'Clientes que lo reciben', valor: a.total },
    { etiqueta: 'En trato de usted', valor: a.usted },
    { etiqueta: 'En trato de tú', valor: a.tu },
  ];
  return (
    <div data-testid="canales-audiencia">
      <p className="t-small text-muted">{a.segmentos}: cada cliente recibe el aviso en su trato.</p>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {filas.map((f) => (
          <div key={f.etiqueta} className="border border-line bg-surface-2 p-3">
            <dd className="t-kpi-sm num text-ink">{f.valor}</dd>
            <dt className="mt-1 t-small text-muted">{f.etiqueta}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
