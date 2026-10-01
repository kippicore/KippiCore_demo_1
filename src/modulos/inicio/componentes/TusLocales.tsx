import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { useAhora, useDinero, useFiltroLocal, usePuede, useSel } from '@/estado';
import { fraseAvanceMeta } from '@/lib/avanceMeta';
import { entero, porcentaje } from '@/lib/formato';
import { avanceMeta } from '@/selectores';
import { Badge, BarraProgreso, cn, Dinero, EncabezadoSeccion } from '@/ui';
import { estadoCierre } from '../calculos';
import { selLocalesInicio, type LocalInicio } from '../selectores';
import { TXT } from '../textos';

/**
 * "Tus tres locales" (PLAN 2.3.2): ventas del mes, margen, ticket promedio y unidades de cada punto de venta, una
 * barra de cumplimiento de la meta del mes y el estado del último cierre de caja ("Cuadró" / "Faltan $ 40.000").
 * Hace visible el "dividido por punto de venta". El local elegido en la barra superior lleva la marca "Filtro activo".
 */
export function TusLocales() {
  const ahora = useAhora();
  const hoy = ahora.slice(0, 10);
  const mes = hoy.slice(0, 7);
  const filas = useSel(selLocalesInicio, { mes, hoy });
  return (
    <section aria-label={TXT.locales.titulo} data-testid="inicio-locales">
      <EncabezadoSeccion titulo={TXT.locales.titulo} />
      <div className="grid grid-cols-3 gap-4">
        {filas.map((f) => (
          <TarjetaLocal key={f.localId} fila={f} hoy={hoy} ahora={ahora} mes={mes} />
        ))}
      </div>
    </section>
  );
}

function TarjetaLocal({ fila: f, hoy, ahora, mes }: { fila: LocalInicio; hoy: string; ahora: string; mes: string }) {
  const localId = useFiltroLocal();
  const puede = usePuede();
  const dinero = useDinero();
  const seleccionado = localId === f.localId;
  const cierre = estadoCierre(f.ultimoCierre, hoy, dinero);
  const avance = f.cumplimiento !== null ? avanceMeta(f.cumplimiento, ahora, mes) : null;
  return (
    <article
      className={cn('border bg-surface p-5 transition-colors duration-(--dur-instant)', seleccionado ? 'border-ink' : 'border-line')}
      data-testid={`inicio-local-${f.localId}`}
      data-seleccionado={seleccionado ? 'si' : undefined}
    >
      <header className="flex items-center justify-between gap-3">
        <h3 className="t-h3 text-ink">
          <Link to={rutas.ventas({ desde: `${mes}-01`, hasta: hoy, local: f.localId })} className="hover:underline hover:underline-offset-4">
            {f.nombre}
          </Link>
        </h3>
        {seleccionado && <Badge tono="accent" tamano="sm">{TXT.locales.seleccionado}</Badge>}
      </header>

      <p className="mt-3 t-eyebrow text-ink-2">{TXT.locales.ventas}</p>
      <p className="mt-1 t-kpi-sm num text-ink" data-testid={`inicio-local-${f.localId}-ventas`}>
        <Dinero valor={f.resumen.netas} corta animar />
      </p>

      <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-line-soft pt-3">
        {puede('ver.margenes') && <Dato etiqueta={TXT.locales.margen} valor={<Dinero valor={f.resumen.margen} corta />} nota={porcentaje(f.resumen.margenPct, 0)} />}
        <Dato etiqueta={TXT.locales.ticket} valor={<Dinero valor={f.resumen.ticket} corta />} />
        <Dato etiqueta={TXT.locales.unidades} valor={<span className="num">{entero(f.resumen.unidades)}</span>} />
      </dl>

      <div className="mt-4">
        {f.meta !== null && f.cumplimiento !== null && avance ? (
          <BarraProgreso
            meta
            valor={f.cumplimiento}
            etiqueta={TXT.locales.meta}
            detalle={
              <span title="Frente a lo que el mes debería llevar a esta fecha, repartiendo la meta por días">
                {fraseAvanceMeta(avance, f.cumplimiento)} · meta <Dinero valor={f.meta} corta />
              </span>
            }
          />
        ) : (
          <p className="t-small text-muted">{TXT.locales.sinMeta}</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-3">
        <span className="t-small text-muted">{TXT.locales.ultimoCierre}</span>
        {cierre && f.cierreSesionId ? (
          <Link to={rutas.caja({ sesion: f.cierreSesionId })} className="flex min-w-0 items-center gap-2" data-testid={`inicio-local-${f.localId}-cierre`} title={cierre.detalle}>
            <Badge tono={cierre.tono} tamano="sm">
              {cierre.etiqueta}
            </Badge>
            <span className="truncate t-small text-muted">{cierre.detalle.split(' · ')[0]}</span>
          </Link>
        ) : (
          <span className="t-small text-muted">{TXT.locales.sinCierre}</span>
        )}
      </div>
    </article>
  );
}

function Dato({ etiqueta, valor, nota }: { etiqueta: string; valor: React.ReactNode; nota?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate t-micro text-muted">{etiqueta}</dt>
      <dd className="mt-0.5 t-label num text-ink">
        {valor}
        {nota && <span className="block t-micro font-normal text-muted">{nota}</span>}
      </dd>
    </div>
  );
}
