import { rutas } from '@/app/rutas';
import { useAhora, useDinero, useEstadoDominio, useFiltroLocal, useSel, useSesion } from '@/estado';
import { hora } from '@/lib/formato';
import { selAlertas, selVentas } from '@/selectores';
import { Dinero } from '@/ui/ligero';
import { etiquetaHora } from '../calculos';
import { selVentasPorHora, selVentasPorLocal } from '../selectores';
import { TXT } from '../textos';
import { BarrasTactiles } from './BarrasTactiles';
import { FilaAlerta } from './FilaAlerta';
import { TarjetaAbrirEnComputador } from './Instalacion';
import { FilaLista, Lista, Tarjeta, TarjetaTitulo } from './Tarjeta';

/**
 * Lo que va debajo del pliegue de Hoy: por local y por hora, requiere tu atención, últimas ventas y "Abre el sistema
 * completo en tu computador". Es un chunk APARTE que Hoy carga después del primer pintado (presupuesto de arranque de
 * /app: < 2,5 s con CPU ×4, F2-C), así que nada de esto se evalúa mientras se pinta la cifra protagonista.
 */
const COLOR_LOCAL: Record<number, string> = { 1: 'bg-chart-1', 2: 'bg-chart-2', 3: 'bg-chart-3', 4: 'bg-chart-4' };

export default function HoyResto({ alAbrirVenta }: { alAbrirVenta: (ventaId: string) => void }) {
  return (
    <>
      <PorLocalYHora />
      <Atencion />
      <UltimasVentas alAbrir={alAbrirVenta} />
      <TarjetaAbrirEnComputador />
    </>
  );
}

function PorLocalYHora() {
  const ahora = useAhora();
  const hoy = ahora.slice(0, 10);
  const local = useFiltroLocal();
  const dinero = useDinero();
  const porLocal = useSel(selVentasPorLocal, { desde: hoy, hasta: hoy });
  const porHora = useSel(selVentasPorHora, { fecha: hoy, localId: local, hastaHora: Number(ahora.slice(11, 13)) });
  const max = Math.max(1, ...porLocal.map((l) => l.resumen.netas));
  return (
    <>
      <Tarjeta className="p-4" data-testid="app-por-local">
        <h2 className="t-eyebrow text-ink-2">{TXT.hoy.porLocal}</h2>
        <ul className="mt-3 flex flex-col gap-4">
          {porLocal.map((l) => (
            <li key={l.localId} data-local={l.localId} className={local !== 'todos' && local !== l.localId ? 'opacity-50' : undefined}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="t-body font-semibold text-ink">{l.nombre}</span>
                <span className="t-body num text-ink">
                  <Dinero valor={l.resumen.netas} />
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full bg-line-soft">
                <div className={`h-full ${COLOR_LOCAL[l.orden] ?? 'bg-chart-3'}`} style={{ width: `${(l.resumen.netas / max) * 100}%` }} />
              </div>
              <p className="mt-1 t-small text-muted">{TXT.hoy.ventasEn(l.resumen.numVentas)}</p>
            </li>
          ))}
        </ul>
      </Tarjeta>
      {porHora.length > 0 && (
        <Tarjeta className="p-4" data-testid="app-por-hora">
          <h2 className="t-eyebrow text-ink-2">{TXT.hoy.porHora}</h2>
          <BarrasTactiles
            className="mt-3"
            titulo={TXT.hoy.porHora}
            inicial="mayor"
            formatear={(v) => dinero(v)}
            datos={porHora.map((h) => ({ clave: String(h.hora), etiqueta: etiquetaHora(h.hora), valor: h.netas, nota: TXT.hoy.ventasEn(h.numVentas) }))}
          />
        </Tarjeta>
      )}
    </>
  );
}

function Atencion() {
  const ahora = useAhora();
  const local = useFiltroLocal();
  const descartadas = useSesion((s) => s.alertasDescartadas);
  const leidas = useSesion((s) => s.notificacionesLeidas);
  const alertas = useSel(selAlertas, { localId: local, ahora, descartadas, leidas });
  if (alertas.length === 0) return null;
  return (
    <Tarjeta data-testid="app-atencion" aria-label={TXT.hoy.atencion}>
      <TarjetaTitulo titulo={TXT.hoy.atencion} a={rutas.appAlertas()} textoA={`${TXT.hoy.atencionVer} (${alertas.length})`} />
      <Lista>
        {alertas.slice(0, 3).map((a) => (
          <FilaAlerta key={a.id} a={a} compacta />
        ))}
      </Lista>
    </Tarjeta>
  );
}

function UltimasVentas({ alAbrir }: { alAbrir: (ventaId: string) => void }) {
  const hoy = useAhora().slice(0, 10);
  const local = useFiltroLocal();
  const e = useEstadoDominio();
  const { filas } = useSel(selVentas, { desde: hoy, hasta: hoy, localId: local });
  return (
    <Tarjeta aria-label={TXT.hoy.ultimas}>
      <TarjetaTitulo titulo={TXT.hoy.ultimas} a={rutas.appVentas()} textoA="Ver todas" />
      {filas.length === 0 ? (
        <div className="px-4 pb-4 pt-2">
          <p className="t-body font-semibold text-ink">{TXT.hoy.sinVentas}</p>
          <p className="mt-1 t-small text-muted">{TXT.hoy.sinVentasTexto}</p>
        </div>
      ) : (
        <Lista data-testid="app-ultimas-ventas">
          {filas.slice(0, 5).map((v) => (
            <FilaLista
              key={v.id}
              data-venta={v.id}
              onClick={() => alAbrir(v.id)}
              principal={<span className="num">{v.numero}</span>}
              secundaria={`${e.locales[v.localId]?.nombre ?? ''} · ${hora(v.ts)}`}
              derecha={
                <span className="t-body num text-ink">
                  <Dinero valor={v.total} />
                </span>
              }
            />
          ))}
        </Lista>
      )}
    </Tarjeta>
  );
}
