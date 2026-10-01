import { useMemo } from 'react';
import { useDinero } from '@/estado';
import { cifraCorta as cifraCortaDe, dinero as dineroDe } from '@/lib/formato';
import { GraficoBase, type Fila, type PropsGraficoBase } from '../graficos/GraficoBase';

/**
 * `<GraficoDinero>` (PLAN 8.9.2): todo gráfico con cifras de dinero. Recibe las series EN COP y convierte series,
 * ejes y tooltips a la moneda activa (cifra corta en el eje, completa en el tooltip y en "Ver como tabla").
 *
 *   <GraficoDinero tipo="barras" apiladas datos={dias} x="dia" formatoX={fechaCorta}
 *     series={[{ clave: 'p93', nombre: 'Parque 93', color: 1 }, …]} titulo="Ventas de los últimos 30 días por local" />
 */
export function GraficoDinero(p: Omit<PropsGraficoBase, 'formatoY' | 'formatoValor'>) {
  const d = useDinero();
  const datos = useMemo(
    () =>
      p.datos.map((f) => {
        const r: Fila = { ...f };
        for (const s of p.series) {
          const v = f[s.clave];
          if (typeof v === 'number') r[s.clave] = d.convertir(v);
        }
        return r;
      }),
    [p.datos, p.series, d],
  );
  const referencia = p.referencia ? { ...p.referencia, valor: d.convertir(p.referencia.valor) } : p.referencia;
  return (
    <GraficoBase
      {...p}
      datos={datos}
      referencia={referencia}
      formatoY={(n) => cifraCortaDe(n, d.moneda)}
      formatoValor={(n) => dineroDe(n, d.moneda)}
    />
  );
}

