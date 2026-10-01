import { BotonPildora, Select, SelectorRango, textoRango, Toolbar } from '@/ui';
import { useMoneda } from '@/estado';
import type { FiltrosPantalla } from '../hooks';
import { TEXTOS } from '../textos';

/**
 * Fechas y local de la pantalla: valen para todos los reportes que los usan (cada reporte dice cuáles) y para
 * la tarjeta del contador. Las fechas arrancan en el mes en curso y el local en el de la barra superior.
 */
export function BarraFiltros({ f }: { f: FiltrosPantalla }) {
  const { moneda } = useMoneda();
  const nombreLocal = f.opcionesLocal.find((o) => o.valor === f.localId)?.etiqueta ?? 'Todos los locales';
  return (
    <div className="border border-line bg-surface" data-testid="reportes-filtros">
      <Toolbar
        filtros={
          <>
            <BotonPildora etiqueta="Fechas" valor={textoRango(f.rango, f.hoy)} anchoPanel={720} data-testid="reportes-filtro-fechas">
              <SelectorRango soloPanel hoy={f.hoy} valor={f.rango} alCambiar={f.cambiarRango} />
            </BotonPildora>
            <BotonPildora etiqueta="Local" valor={nombreLocal} anchoPanel={260} data-testid="reportes-filtro-local">
              <Select
                etiqueta="Local"
                etiquetaOculta
                valor={f.localId}
                alCambiar={f.cambiarLocal}
                opciones={f.opcionesLocal.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
                data-testid="reportes-select-local"
              />
            </BotonPildora>
          </>
        }
        derecha={
          <span className="t-small text-muted">
            {TEXTOS.filtrosTitulo} · cifras en {moneda}
          </span>
        }
      />
    </div>
  );
}
