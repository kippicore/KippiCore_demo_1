import { numero, porcentaje } from '@/lib/formato';
import { Card, GraficoBase, GraficoDinero, type SerieGrafico } from '@/ui';
import { nombreEje, type Hallazgos } from '../calculos';
import type { FilaComparativo } from '../selectores';

/** Tres lecturas de un vistazo: retraso, defectos y costo por unidad. La barra del hallazgo va en camel. */
export function GraficosComparativo({ filas, hallazgos }: { filas: readonly FilaComparativo[]; hallazgos: Hallazgos<FilaComparativo> }) {
  const eje = (f: FilaComparativo) => nombreEje(f.nombre);
  const ordenado = (clave: (f: FilaComparativo) => number | null) =>
    [...filas].filter((f) => clave(f) !== null).sort((a, b) => (clave(b) ?? 0) - (clave(a) ?? 0));

  const retraso = ordenado((f) => f.retrasoPromedio).map((f) => ({ fabrica: eje(f), retraso: f.retrasoPromedio }));
  const defectos = ordenado((f) => f.defectos).map((f) => ({ fabrica: eje(f), defectos: f.defectos }));
  const masCara = ordenado((f) => f.costoPromedioUnidad)[0];
  const costo = ordenado((f) => f.costoPromedioUnidad).map((f) => ({ fabrica: eje(f), costo: f.costoPromedioUnidad }));

  const serie = (clave: string, nombre: string): SerieGrafico[] => [{ clave, nombre, color: 1 }];
  const masTarde = hallazgos.masTarde;
  const masDefectos = hallazgos.masDefectos;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 min-[1700px]:grid-cols-3" data-testid="comparativo-graficos">
      <Card padding="normal" data-testid="grafico-retraso">
        <GraficoBase
          tipo="barras"
          titulo="Retraso promedio"
          lectura={masTarde ? `${masTarde.nombre} es la que más tarde llega: ${numero(masTarde.retrasoPromedio ?? 0, 1)} días en promedio.` : 'Días de retraso frente a la fecha con la que se hizo cada pedido.'}
          datos={retraso}
          x="fabrica"
          series={serie('retraso', 'Retraso (días)')}
          destacarX={masTarde ? eje(masTarde) : null}
          formatoY={(n) => `${numero(n, 0)} d`}
          formatoValor={(n) => `${numero(n, 1)} días`}
          alto={240}
        />
      </Card>
      <Card padding="normal" data-testid="grafico-defectos">
        <GraficoBase
          tipo="barras"
          titulo="Tasa de defectos"
          lectura={masDefectos ? `${masDefectos.nombre} tiene la mayor tasa: ${porcentaje(masDefectos.defectos ?? 0, 1)} de las prendas llegan defectuosas.` : 'Prendas defectuosas sobre las recibidas en bodega.'}
          datos={defectos}
          x="fabrica"
          series={serie('defectos', 'Defectos')}
          destacarX={masDefectos ? eje(masDefectos) : null}
          formatoY={(n) => porcentaje(n, 0)}
          formatoValor={(n) => porcentaje(n, 1)}
          alto={240}
        />
      </Card>
      <Card padding="normal" className="md:col-span-2 min-[1700px]:col-span-1" data-testid="grafico-costo">
        <GraficoDinero
          tipo="barras"
          titulo="Costo promedio por unidad"
          lectura={masCara ? `El costo depende de lo que fabrica cada una: ${masCara.nombre} es la más cara por prenda.` : 'Valor FOB de fábrica por prenda.'}
          datos={costo}
          x="fabrica"
          series={serie('costo', 'Costo por unidad')}
          alto={240}
        />
      </Card>
    </div>
  );
}
