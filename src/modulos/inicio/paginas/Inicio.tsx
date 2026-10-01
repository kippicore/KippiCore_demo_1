import { useAhora, useDinero, useFiltroLocal, useMarca, useSel } from '@/estado';
import { selKpisInicio } from '@/selectores';
import { cifraCorta, entero, fechaLarga, porcentaje } from '@/lib/formato';
import { Kpi } from '@/ui/primitivos/Card';
import { EncabezadoPagina } from '@/ui/primitivos/EncabezadoPagina';

/**
 * Esqueleto de F2-B con el diseño de F2-C (PLAN 9.1.6): el paquete D1 reemplaza esta página. Muestra las seis
 * tarjetas de indicadores con el componente `Kpi` (cifra, variación, micrográfico). Conserva `data-testid="kpis-inicio"`.
 */
export default function Inicio() {
  const localId = useFiltroLocal();
  const ahora = useAhora();
  const kpis = useSel(selKpisInicio, { localId, ahora });
  const dinero = useDinero();
  const marca = useMarca();
  // La cifra animada recibe el valor YA convertido a la moneda activa: se formatea con cifraCorta de esa moneda.
  const formato = (f: string) => (n: number) => (f === 'dinero' ? cifraCorta(n, dinero.moneda) : f === 'porcentaje' ? porcentaje(n) : entero(n));
  return (
    <>
      <EncabezadoPagina titulo="Inicio" subtitulo={`${fechaLarga(ahora)} · ${marca.nombre}`} />
      <ul data-testid="kpis-inicio" className="mt-8 grid grid-cols-3 gap-4 wide:grid-cols-6">
        {kpis.tarjetas.map((k) => (
          <li key={k.id} data-kpi={k.id}>
            <Kpi
              etiqueta={k.etiqueta}
              valor={k.formato === 'dinero' ? dinero.convertir(k.valor) : k.valor}
              formatear={formato(k.formato)}
              completo={k.formato === 'dinero' ? dinero(k.valor) : undefined}
              variacion={k.variacion !== null && k.comparacion ? { valor: k.variacion, comparado: k.comparacion } : undefined}
              nota={k.detalle ?? undefined}
              serie={k.serie}
              className="h-full"
            />
          </li>
        ))}
      </ul>
    </>
  );
}
