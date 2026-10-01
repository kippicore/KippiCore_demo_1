import { Bell, CircleCheck, Coins, Compass, Landmark, Ship, Users, type LucideIcon } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { useAhora, useFiltroLocal, useMarca, useMoneda, useSel, useSesion } from '@/estado';
import { plural } from '@/lib/formato';
import { selAlertas, selCuentasPorPagar, selImportaciones, selPeriodoAbierto, selSolicitudesPendientes } from '@/selectores';
import { Dinero, Icono } from '@/ui/ligero';
import { ChipDatos } from '../componentes/ChipDatos';
import { InterruptorMovil } from '../componentes/ControlesTactiles';
import { TarjetaAbrirEnComputador, TarjetaInstalar } from '../componentes/Instalacion';
import { Pantalla } from '../componentes/Pantalla';
import { FilaLista, Lista, Tarjeta, TarjetaTitulo } from '../componentes/Tarjeta';
import { TXT } from '../textos';

/**
 * Más (PRD 6.5): lo que no cabe en las cuatro pestañas — Para aprobar, importaciones, nómina, pagos pendientes,
 * alertas, moneda y "Cómo arrancaríamos" —, la apariencia (modo claro), los datos de ejemplo de este celular, cómo
 * instalar la app y la tarjeta para abrir el sistema completo en el computador. Cada fila resume su contenido con
 * los mismos selectores que el escritorio.
 */
function Icono44({ icono }: { icono: LucideIcon }) {
  return (
    <span className="flex size-9 items-center justify-center bg-surface-2 text-ink-2">
      <Icono icono={icono} tamano={18} />
    </span>
  );
}

export default function Mas() {
  const ahora = useAhora();
  const hoy = ahora.slice(0, 10);
  const local = useFiltroLocal();
  const { moneda } = useMoneda();
  const marca = useMarca();
  const tema = useSesion((s) => s.tema);
  const cambiarTema = useSesion((s) => s.cambiarTema);
  const descartadas = useSesion((s) => s.alertasDescartadas);
  const leidas = useSesion((s) => s.notificacionesLeidas);
  const pendientes = useSel(selSolicitudesPendientes).length;
  const importaciones = useSel(selImportaciones, { hoy, incluirRecibidas: false });
  const periodos = useSel(selPeriodoAbierto, { hoy });
  const porPagar = useSel(selCuentasPorPagar, { hoy, estado: 'pendientes' });
  const alertas = useSel(selAlertas, { localId: local, ahora, descartadas, leidas }).length;
  const periodo = periodos.quincenal ?? periodos.mensual;

  return (
    <Pantalla testid="app-mas" titulo={TXT.mas.titulo} fecha="Lo demás de tu negocio, al alcance del pulgar">
      <Tarjeta aria-label="Secciones">
        <Lista data-testid="app-mas-lista">
          <FilaLista
            data-testid="app-mas-aprobar"
            a={rutas.appAprobar()}
            inicio={<Icono44 icono={CircleCheck} />}
            principal="Para aprobar"
            secundaria={pendientes > 0 ? `${plural(pendientes, 'solicitud', 'solicitudes')} esperando` : 'Todo al día'}
            derecha={pendientes > 0 ? <span className="inline-flex h-6 min-w-6 items-center justify-center bg-ink px-1.5 t-label font-bold text-inverse num">{pendientes}</span> : undefined}
          />
          <FilaLista
            data-testid="app-mas-importaciones"
            a={rutas.appImportaciones()}
            inicio={<Icono44 icono={Ship} />}
            principal="Importaciones"
            secundaria={importaciones.length > 0 ? `${plural(importaciones.length, 'pedido', 'pedidos')} en camino desde China` : 'Sin pedidos en camino'}
          />
          <FilaLista
            data-testid="app-mas-nomina"
            a={rutas.appNomina()}
            inicio={<Icono44 icono={Users} />}
            principal="Nómina"
            secundaria={periodo ? periodo.etiqueta : 'Sin periodo por liquidar'}
          />
          <FilaLista
            data-testid="app-mas-pagos"
            a={rutas.appPagos()}
            inicio={<Icono44 icono={Landmark} />}
            principal="Pagos pendientes"
            secundaria={
              <>
                {plural(porPagar.filas.length, 'pago', 'pagos')} · <Dinero valor={porPagar.totalCop} corta />
              </>
            }
          />
          <FilaLista
            data-testid="app-mas-alertas"
            a={rutas.appAlertas()}
            inicio={<Icono44 icono={Bell} />}
            principal="Alertas"
            secundaria={alertas > 0 ? `${plural(alertas, 'alerta', 'alertas')} por mirar` : 'Sin alertas por ahora'}
          />
          <FilaLista data-testid="app-mas-moneda" a={rutas.appMoneda()} inicio={<Icono44 icono={Coins} />} principal="Moneda" secundaria={`Viendo las cifras en ${moneda}`} />
          <FilaLista data-testid="app-mas-arrancar" a={rutas.appComoArrancariamos()} inicio={<Icono44 icono={Compass} />} principal="Cómo arrancaríamos" secundaria="Etapas, tus Excel y tu equipo" />
        </Lista>
      </Tarjeta>

      <Tarjeta>
        <TarjetaTitulo titulo={TXT.mas.apariencia} />
        <InterruptorMovil
          data-testid="app-modo-claro"
          etiqueta={TXT.mas.modoClaro}
          ayuda={TXT.mas.modoClaroAyuda}
          activo={tema === 'claro'}
          alCambiar={(v) => cambiarTema(v ? 'claro' : 'oscuro')}
        />
      </Tarjeta>

      <TarjetaAbrirEnComputador />
      <TarjetaInstalar />

      <Tarjeta className="p-4">
        <h2 className="t-eyebrow text-ink-2">{TXT.mas.datos}</h2>
        <p className="mt-2 t-small text-muted">Esta es una demostración con datos de ejemplo de {marca.nombre}. Lo que haces aquí se guarda solo en este celular.</p>
        <ChipDatos className="mt-1" />
      </Tarjeta>
    </Pantalla>
  );
}
