import { rutas } from '@/app/rutas';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useAhora, useDinero, useFiltroLocal, usePuede, useSel } from '@/estado';
import { selKpisInicio, type Kpi as DatosKpi } from '@/selectores';
import { cifraCorta, entero, porcentaje } from '@/lib/formato';
import { Kpi } from '@/ui';
import { TXT } from '../textos';

/**
 * Las seis tarjetas de indicadores (PRD 7.1, PLAN 2.3.2), cada una clicable hacia el detalle de su módulo, con
 * micrográfico y variación. Cuando entra una venta (aquí, en el POS o en otra pestaña) la cifra rueda con `<Cifra>`.
 * Conserva `data-testid="kpis-inicio"` (lo usan la prueba de arranque y los flujos de la fase 4).
 */
export function TarjetasKpi() {
  const localId = useFiltroLocal();
  const ahora = useAhora();
  const puede = usePuede();
  const dinero = useDinero();
  const kpis = useSel(selKpisInicio, { localId, ahora });
  const hoy = ahora.slice(0, 10);
  const mes = hoy.slice(0, 7);
  const local = localId === 'todos' ? {} : { local: localId };
  const ayer = kpis.antesDeAbrir;

  // La cifra animada recibe el valor YA convertido a la moneda activa: se formatea con la cifra corta de esa moneda.
  const formato = (k: DatosKpi) => (n: number) => (k.formato === 'dinero' ? cifraCorta(n, dinero.moneda) : k.formato === 'porcentaje' ? porcentaje(n) : entero(n));
  const destino: Record<DatosKpi['id'], string> = {
    ventas_hoy: ayer ? rutas.ventas({ desde: sumarDias(hoy, -1), hasta: sumarDias(hoy, -1), ...local }) : rutas.ventas({ desde: hoy, hasta: hoy, ...local }),
    ventas_mes: rutas.ventas({ desde: `${mes}-01`, hasta: hoy, ...local }),
    ticket: rutas.ventas({ desde: `${mes}-01`, hasta: hoy, ...local }),
    unidades: rutas.ventas({ desde: `${mes}-01`, hasta: hoy, ...local }),
    margen: rutas.estadoResultados({ mes, ...local }),
    efectivo: rutas.caja(),
  };

  const tarjetas = kpis.tarjetas.filter((k) => k.id !== 'margen' || puede('ver.margenes'));
  return (
    <ul data-testid="kpis-inicio" aria-label={TXT.kpis.aria} className="grid grid-cols-3 gap-4 desk:grid-cols-6">
      {tarjetas.map((k) => (
        <li key={k.id} data-kpi={k.id} className="min-w-0">
          <Kpi
            etiqueta={k.etiqueta}
            valor={k.formato === 'dinero' ? dinero.convertir(k.valor) : k.valor}
            formatear={formato(k)}
            completo={k.formato === 'dinero' ? dinero(k.valor) : undefined}
            variacion={k.variacion !== null && k.comparacion ? { valor: k.variacion, comparado: k.comparacion } : undefined}
            nota={k.detalle ?? undefined}
            serie={k.serie}
            a={destino[k.id]}
            className="h-full"
            data-testid={`kpi-${k.id}`}
          />
        </li>
      ))}
    </ul>
  );
}
