import { lazy, Suspense } from 'react';
import { rutas } from '@/app/rutas';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useAhora, useEstadoDominio, useFiltroLocal, useSel } from '@/estado';
import { fechaLarga, porcentaje } from '@/lib/formato';
import { selSolicitudesPendientes } from '@/selectores';
import { AvisoNavegadorInterno, BarraProgreso, Dinero, Pista, Skeleton } from '@/ui/ligero';
import { AvisoActualizar } from '../componentes/AvisoActualizar';
import { AvisoLlegadaQr } from '../componentes/AvisoLlegadaQr';
import { ChipDatos } from '../componentes/ChipDatos';
import { Diferido } from '../componentes/Diferido';
import { FilaCierre } from '../componentes/FilaCierre';
import { Pantalla } from '../componentes/Pantalla';
import { ListaSolicitudes } from '../componentes/Solicitudes';
import { FilaLista, Lista, Tarjeta, TarjetaTitulo } from '../componentes/Tarjeta';
import { useHojaVenta } from '../componentes/useHojaVenta';
import { selCierresApp, selCifraHoy, selMetaMes } from '../selectores';
import { TXT } from '../textos';

/** Todo lo que va debajo del pliegue se carga en otro chunk, después del primer pintado (ver `HoyResto`). */
const HoyResto = lazy(() => import('../componentes/HoyResto'));

/**
 * Hoy (W10 y W11), la primera pantalla del celular. Lo primero útil, en este orden: lo que llegó del computador por el
 * código QR, la cifra protagonista (la misma que ve el escritorio: `selKpisInicio`), los cierres de caja de anoche de
 * los tres locales y lo que espera tu aprobación. Lo demás (por local, por hora, alertas, últimas ventas) se carga
 * después del primer pintado para cuidar el presupuesto de arranque (< 2,5 s con CPU ×4).
 * Conserva `data-testid`: `app-hoy`, `app-ventas-hoy`, `app-ultimas-ventas` y `data-venta`.
 */
export default function Hoy() {
  const ahora = useAhora();
  const hoy = ahora.slice(0, 10);
  const local = useFiltroLocal();
  const e = useEstadoDominio();
  const nombreLocal = local === 'todos' ? 'Todos los locales' : (e.locales[local]?.nombre ?? local);
  const { abrir, hoja } = useHojaVenta();
  return (
    <Pantalla testid="app-hoy" titulo={TXT.hoy.titulo} fecha={`${fechaLarga(hoy).replace(/ de \d{4}$/, '')} · ${nombreLocal}`} chip={<ChipDatos />}>
      <AvisoNavegadorInterno className="-mx-4 -mt-1" />
      <AvisoLlegadaQr alVerVenta={abrir} />
      <AvisoActualizar />
      <CifraProtagonista />
      <CierresDeAnoche />
      <ParaAprobar />
      <Diferido alto={900} className="mt-1">
        <Suspense fallback={<Skeleton style={{ height: 900 }} />}>
          <div className="flex flex-col gap-3">
            <HoyResto alAbrirVenta={abrir} />
          </div>
        </Suspense>
      </Diferido>
      {hoja}
    </Pantalla>
  );
}

// ---------------------------------------------------------------------------------------------------------
// La cifra protagonista (`app.hoy`)
// ---------------------------------------------------------------------------------------------------------
function CifraProtagonista() {
  const ahora = useAhora();
  const local = useFiltroLocal();
  const c = useSel(selCifraHoy, { ahora, localId: local });
  const v = c.variacion;
  return (
    <Pista id="app.hoy">
      <Tarjeta className="p-4" data-testid="app-cifra-hoy">
        <p className="t-eyebrow text-ink-2">{c.antesDeAbrir ? TXT.hoy.vendidoAyer : TXT.hoy.vendidoHoy}</p>
        <p data-testid="app-ventas-hoy" className="mt-2">
          <Dinero valor={c.valor} contarDesdeCero claveSesion="app-hoy-vendido" className="t-kpi-xl text-ink max-[374px]:text-kpi" />
        </p>
        {v !== null && c.comparacion && (
          <p className="mt-1 t-small text-ink-2" data-testid="app-variacion">
            <span aria-hidden className={v >= 0 ? 'text-success' : 'text-danger'}>
              {v >= 0 ? '▲' : '▼'}
            </span>{' '}
            <span className="num">{porcentaje(Math.abs(v))}</span> {c.comparacion}
          </p>
        )}
        <p className="mt-1 t-small text-muted">{c.antesDeAbrir ? c.detalle : `${TXT.hoy.ventasEn(c.numVentas)}${local === 'todos' ? ' en los tres locales' : ''}`}</p>
        <Diferido alto={36} className="mt-3">
          <MetaDelMes />
        </Diferido>
      </Tarjeta>
    </Pista>
  );
}

function MetaDelMes() {
  const hoy = useAhora().slice(0, 10);
  const local = useFiltroLocal();
  const m = useSel(selMetaMes, { mes: hoy.slice(0, 7), hoy, localId: local });
  if (m.cumplimiento === null) return null;
  return <BarraProgreso alto={2} meta valor={m.cumplimiento} etiqueta={TXT.hoy.metaMes} detalle={`${porcentaje(m.cumplimiento, 0)} de la meta`} />;
}

// ---------------------------------------------------------------------------------------------------------
// Cierres de anoche (W11)
// ---------------------------------------------------------------------------------------------------------
function CierresDeAnoche() {
  const hoy = useAhora().slice(0, 10);
  const local = useFiltroLocal();
  const cierres = useSel(selCierresApp, { fecha: sumarDias(hoy, -1) }).filter((c) => local === 'todos' || c.localId === local);
  return (
    <Tarjeta data-testid="app-cierres" aria-label={TXT.hoy.cierres}>
      <TarjetaTitulo titulo={TXT.hoy.cierres} a={rutas.appCierres()} textoA="Ver todos" />
      <Lista>
        {cierres.map((c) => (
          <FilaCierre key={c.localId} c={c} />
        ))}
      </Lista>
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Para aprobar (W10, W11)
// ---------------------------------------------------------------------------------------------------------
function ParaAprobar() {
  const n = useSel(selSolicitudesPendientes).length;
  return (
    <section data-testid="app-para-aprobar" aria-label={TXT.hoy.aprobar} className="flex flex-col gap-3">
      <h2 className="mt-2 flex min-h-11 items-center t-eyebrow text-ink-2">
        {TXT.hoy.aprobar}
        {n > 0 && <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center bg-ink px-1.5 t-micro font-bold text-inverse num">{n}</span>}
      </h2>
      <ListaSolicitudes limite={3} />
      {n > 3 && (
        <Tarjeta>
          <FilaLista a={rutas.appAprobar()} principal={`Ver las ${n} solicitudes`} />
        </Tarjeta>
      )}
    </section>
  );
}
