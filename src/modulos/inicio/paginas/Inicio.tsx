import { Alertas } from '../componentes/Alertas';
import { HallazgoSemana } from '../componentes/HallazgoSemana';
import { SinMovimiento, TopProductos } from '../componentes/ListasProductos';
import { ProximosEventos } from '../componentes/ProximosEventos';
import { Saludo } from '../componentes/Saludo';
import { SeccionSegura } from '../componentes/SeccionSegura';
import { TarjetasKpi } from '../componentes/TarjetasKpi';
import { TusLocales } from '../componentes/TusLocales';
import { VentasPorLocal } from '../componentes/VentasPorLocal';
import { TXT } from '../textos';

/**
 * Inicio del dueño (D1, PRD 7.1, PLAN 2.3): el estado del negocio hoy, esta semana y este mes en una pantalla.
 * Orden: saludo con la frase del día · seis indicadores · ventas de 30 días por local con "Requiere tu atención" ·
 * tus tres locales · más vendidos, sin movimiento y próximos eventos · hallazgo de la semana. Lo esencial (saludo,
 * indicadores, gráfico y las primeras alertas) cabe arriba del pliegue a 1440 × 900 y a 1366 × 657. Cada bloque va en
 * su propia frontera de error y todo respeta el local, la moneda y el rol activos.
 */
export default function Inicio() {
  return (
    <div data-testid="inicio">
      <SeccionSegura nombre="saludo" titulo={TXT.titulo}>
        <Saludo />
      </SeccionSegura>

      <div className="mt-6">
        <SeccionSegura nombre="kpis" titulo={TXT.kpis.aria}>
          <TarjetasKpi />
        </SeccionSegura>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 desk:grid-cols-12">
        <div className="min-w-0 desk:col-span-6">
          <SeccionSegura nombre="ventas-30" titulo={TXT.grafico.titulo}>
            <VentasPorLocal />
          </SeccionSegura>
        </div>
        <div className="min-w-0 desk:col-span-6">
          <SeccionSegura nombre="alertas" titulo={TXT.alertas.titulo}>
            <Alertas />
          </SeccionSegura>
        </div>
      </div>

      <div className="mt-10">
        <SeccionSegura nombre="locales" titulo={TXT.locales.titulo}>
          <TusLocales />
        </SeccionSegura>
      </div>

      <div className="mt-10 grid grid-cols-1 items-stretch gap-6 desk:grid-cols-3">
        <SeccionSegura nombre="top" titulo={TXT.top.titulo}>
          <TopProductos />
        </SeccionSegura>
        <SeccionSegura nombre="dormidos" titulo={TXT.dormidos.titulo}>
          <SinMovimiento />
        </SeccionSegura>
        <SeccionSegura nombre="eventos" titulo={TXT.eventos.titulo}>
          <ProximosEventos />
        </SeccionSegura>
      </div>

      <div className="mt-10">
        <SeccionSegura nombre="hallazgo">
          <HallazgoSemana />
        </SeccionSegura>
      </div>
    </div>
  );
}
