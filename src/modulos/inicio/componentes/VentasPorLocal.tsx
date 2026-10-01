import { useMemo, type ReactNode } from 'react';
import { rutas } from '@/app/rutas';
import { useAhora, useFiltroLocal, useSel } from '@/estado';
import { fechaCorta, porcentaje } from '@/lib/formato';
import { Card, colorDeLocal, Dinero, EnlaceVerTodo, GraficoDinero, type SerieGrafico } from '@/ui';
import { lectura30Dias } from '../calculos';
import { selVentas30Dias } from '../selectores';
import { TXT } from '../textos';

/**
 * "Ventas de los últimos 30 días por local" (PLAN 2.3.2): barras apiladas en grises con el nombre de cada local
 * escrito junto a su serie; el camel resalta solo al local seleccionado en la barra superior. La suma de las barras
 * es la misma de `selVentas` (los tres locales). Arriba, el total, el promedio diario, el mejor día y quién aportó más.
 */
export function VentasPorLocal({ alto = 212 }: { alto?: number }) {
  const hoy = useAhora().slice(0, 10);
  const localId = useFiltroLocal();
  const v = useSel(selVentas30Dias, { hoy });
  const lectura = useMemo(() => lectura30Dias(v.dias, v.locales), [v]);
  const datos = useMemo(() => v.dias.map((d) => ({ fecha: d.fecha, ...d.porLocal })), [v]);
  const series: SerieGrafico[] = useMemo(
    () => v.locales.map((l) => ({ clave: l.id, nombre: l.nombre, color: l.id === localId ? 'acento' : colorDeLocal(l.orden) })),
    [v, localId],
  );
  // Con un local elegido, su aporte; con "Todos", el del local que más vendió.
  const aporte = localId === 'todos' ? lectura.aportes[0] : lectura.aportes.find((a) => a.localId === localId);
  return (
    <Card
      titulo={TXT.grafico.titulo}
      accion={<EnlaceVerTodo a={rutas.ventas({ desde: v.desde, hasta: v.hasta, ...(localId === 'todos' ? {} : { local: localId }) })}>{TXT.grafico.verVentas}</EnlaceVerTodo>}
      data-testid="inicio-ventas-30"
    >
      <dl className="mb-4 grid grid-cols-4 gap-4" data-testid="inicio-ventas-30-resumen">
        <Dato etiqueta={TXT.grafico.total} valor={<Dinero valor={lectura.total} corta animar data-testid="inicio-30-total" />} />
        <Dato etiqueta={TXT.grafico.promedio} valor={<Dinero valor={lectura.promedio} corta animar />} />
        <Dato
          etiqueta={TXT.grafico.mejorDia}
          valor={lectura.mejorDia ? <Dinero valor={lectura.mejorDia.valor} corta /> : <span className="text-subtle">—</span>}
          nota={lectura.mejorDia ? fechaCorta(lectura.mejorDia.fecha) : undefined}
        />
        <Dato
          etiqueta={localId === 'todos' ? TXT.grafico.aportoMas : TXT.grafico.aporteDe}
          valor={aporte ? <span className="num">{porcentaje(aporte.proporcion, 0)}</span> : <span className="text-subtle">—</span>}
          nota={localId === 'todos' ? aporte?.nombre : undefined}
        />
      </dl>
      <GraficoDinero tipo="barras" apiladas datos={datos} x="fecha" series={series} formatoX={fechaCorta} alto={alto} />
    </Card>
  );
}

function Dato({ etiqueta, valor, nota }: { etiqueta: string; valor: ReactNode; nota?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate t-eyebrow text-ink-2">{etiqueta}</dt>
      <dd className="mt-1 t-h3 num text-ink">
        {valor}
        {nota && <span className="block t-small font-normal text-muted">{nota}</span>}
      </dd>
    </div>
  );
}
