import { ChevronRight } from 'lucide-react';
import { useAhora, useDinero, useEstadoDominio, useFiltroLocal, useSel } from '@/estado';
import { selCierresDelDia, selVentas } from '@/selectores';
import { sumarDias } from '@/dominio/reglas/fechas';
import { fechaLarga, hora } from '@/lib/formato';
import { Dinero } from '@/ui/conectados/Cifras';
import { PuntoEstado } from '@/ui/primitivos/Badge';
import { Icono } from '@/ui/primitivos/Icono';
import { ChipDatosEjemplo, EncabezadoMovil } from '@/ui/movil/Movil';

/**
 * Esqueleto de F2-B con el diseño de F2-C (PLAN 9.1.6, 8.5): E1 reemplaza esta página. Lo primero útil de "Hoy":
 * la cifra protagonista, las últimas ventas (también las que trae el QR) y los cierres de anoche. Solo piezas
 * ligeras (presupuesto de arranque). Conserva `data-testid`: `app-hoy`, `app-ventas-hoy`, `app-ultimas-ventas` y
 * `data-venta`.
 */
export default function Hoy() {
  const ahora = useAhora();
  const hoy = ahora.slice(0, 10);
  const local = useFiltroLocal();
  const e = useEstadoDominio();
  const dinero = useDinero();
  const { filas, totales } = useSel(selVentas, { desde: hoy, hasta: hoy });
  const cierres = useSel(selCierresDelDia, { fecha: sumarDias(hoy, -1) });
  const nombreLocal = local === 'todos' ? 'Todos los locales' : (e.locales[local]?.nombre ?? local);
  return (
    <section data-testid="app-hoy" className="pb-6">
      <EncabezadoMovil titulo="Hoy" fecha={`${fechaLarga(hoy).replace(/ de \d{4}$/, '')} · ${nombreLocal}`} chip={<ChipDatosEjemplo />} />
      <div className="mt-5 flex flex-col gap-3 px-4">
        <article className="border border-line bg-surface p-4">
          <p className="t-eyebrow text-ink-2">Vendido hoy</p>
          <p data-testid="app-ventas-hoy" className="mt-2">
            <Dinero valor={totales.netas} contarDesdeCero claveSesion="app-hoy-vendido" className="t-kpi-xl text-ink" />
          </p>
          <p className="mt-1 t-small text-muted">
            <span className="num">{totales.numVentas}</span> ventas en los tres locales
          </p>
        </article>

        <article className="border border-line bg-surface">
          <h2 className="px-4 pb-1 pt-4 t-eyebrow text-ink-2">Cierres de anoche</h2>
          <ul className="divide-y divide-line-soft">
            {cierres.map((c) => (
              <li key={c.localId} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block t-body font-semibold text-ink">{c.localNombre}</span>
                  <span className="block t-small text-muted">{c.cajero}</span>
                </span>
                {c.diferencia === null ? (
                  <PuntoEstado tono="neutral" className="t-small text-muted">
                    Sin cierre
                  </PuntoEstado>
                ) : c.diferencia === 0 ? (
                  <PuntoEstado tono="success" className="t-small text-ink">
                    Cuadró
                  </PuntoEstado>
                ) : (
                  <PuntoEstado tono="danger" className="t-small text-ink">
                    {c.diferencia < 0 ? 'Faltan' : 'Sobran'} {dinero(Math.abs(c.diferencia))}
                  </PuntoEstado>
                )}
                <Icono icono={ChevronRight} tamano={16} className="text-subtle" />
              </li>
            ))}
          </ul>
        </article>

        <article className="border border-line bg-surface">
          <h2 className="px-4 pb-1 pt-4 t-eyebrow text-ink-2">Últimas ventas</h2>
          <ul data-testid="app-ultimas-ventas" className="divide-y divide-line-soft">
            {filas.slice(0, 5).map((v) => (
              <li key={v.id} data-venta={v.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block t-body font-semibold num text-ink">{v.numero}</span>
                  <span className="block t-small text-muted">
                    {e.locales[v.localId]?.nombre} · {hora(v.ts)}
                  </span>
                </span>
                <span className="t-body num text-ink">{dinero(v.total)}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
