import { ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { useAhora, useDinero, useEstadoDominio, useFiltroLocal, useSel } from '@/estado';
import { ESTADOS_VENTA } from '@/config/estados';
import { DIAS_CORTOS, MESES, entero, porcentaje } from '@/lib/formato';
import { diaSemana } from '@/dominio/reglas/fechas';
import { selVentas } from '@/selectores';
import { BadgeEstado, Button, Dinero, EmptyState } from '@/ui/ligero';
import { BarrasTactiles } from '../componentes/BarrasTactiles';
import { SegmentadoMovil } from '../componentes/ControlesTactiles';
import { useHojaVenta } from '../componentes/useHojaVenta';
import { Pantalla } from '../componentes/Pantalla';
import { CifraSecundaria, FilaLista, Lista, Tarjeta } from '../componentes/Tarjeta';
import { etiquetaHora, momentoVenta } from '../calculos';
import { selPeriodoVentas, selVentasPorHora, selVentasPorLocal, type PeriodoApp } from '../selectores';
import { TXT } from '../textos';

const COLOR_LOCAL: Record<number, string> = { 1: 'bg-chart-1', 2: 'bg-chart-2', 3: 'bg-chart-3', 4: 'bg-chart-4' };
const PASO = 12;

/**
 * Ventas (PLAN 4.4): el día, los últimos 7 días o el mes, por local, con una cifra grande, barras que se tocan (el valor
 * aparece arriba, 8.5.4), cuatro cifras secundarias y la lista de ventas con su detalle en una hoja. Las cifras salen
 * de los mismos selectores que Inicio y Ventas del escritorio (`selVentas`, `selKpisInicio`, `selVentasHoyHastaHora`).
 */
export default function Ventas() {
  const ahora = useAhora();
  const hoy = ahora.slice(0, 10);
  const local = useFiltroLocal();
  const e = useEstadoDominio();
  const dinero = useDinero();
  const [periodo, setPeriodo] = useState<PeriodoApp>('hoy');
  const [visibles, setVisibles] = useState(PASO);
  const { abrir, hoja } = useHojaVenta();
  const p = useSel(selPeriodoVentas, { periodo, ahora, localId: local });
  const { filas, totales } = useSel(selVentas, { desde: p.desde, hasta: p.hasta, localId: local });
  const porLocal = useSel(selVentasPorLocal, { desde: p.desde, hasta: p.hasta });
  const porHora = useSel(selVentasPorHora, { fecha: hoy, localId: local, hastaHora: Number(ahora.slice(11, 13)) });
  const max = Math.max(1, ...porLocal.map((l) => l.resumen.netas));
  const v = p.variacion;

  const barras =
    periodo === 'hoy'
      ? porHora.map((h) => ({ clave: String(h.hora), etiqueta: etiquetaHora(h.hora), valor: h.netas, nota: TXT.hoy.ventasEn(h.numVentas) }))
      : p.serie.map((d) => ({
          clave: d.fecha,
          etiqueta: periodo === 'semana' ? DIAS_CORTOS[diaSemana(d.fecha)] : String(Number(d.fecha.slice(8, 10))),
          nombre: `${DIAS_CORTOS[diaSemana(d.fecha)]} ${Number(d.fecha.slice(8, 10))} de ${MESES[Number(d.fecha.slice(5, 7)) - 1]}`,
          valor: d.netas,
          nota: TXT.hoy.ventasEn(d.numVentas),
        }));

  return (
    <Pantalla testid="app-ventas" titulo={TXT.ventas.titulo} fecha={periodo === 'hoy' ? 'Lo vendido hoy en los locales' : periodo === 'semana' ? 'Los últimos 7 días' : p.ultimos30 ? 'Los últimos 30 días' : 'Lo que va del mes'}>
      <SegmentadoMovil
        etiqueta="Periodo"
        valor={periodo}
        alCambiar={(x) => {
          setPeriodo(x);
          setVisibles(PASO);
        }}
        opciones={(['hoy', 'semana', 'mes'] as const).map((k) => ({ valor: k, etiqueta: k === 'mes' && p.ultimos30 ? '30 días' : TXT.ventas.periodos[k], 'data-testid': `app-periodo-${k}` }))}
        data-testid="app-periodos"
      />

      <Tarjeta className="p-4" data-testid="app-ventas-cifra">
        <p className="t-eyebrow text-ink-2">{periodo === 'mes' && p.ultimos30 ? 'Vendido en 30 días' : TXT.ventas.vendido[periodo]}</p>
        <p className="mt-2" data-testid="app-ventas-total">
          <Dinero valor={totales.netas} animar className="t-kpi-xl text-ink max-[374px]:text-kpi" />
        </p>
        {v !== null && p.comparacion && (
          <p className="mt-1 t-small text-ink-2">
            <span aria-hidden className={v >= 0 ? 'text-success' : 'text-danger'}>
              {v >= 0 ? '▲' : '▼'}
            </span>{' '}
            <span className="num">{porcentaje(Math.abs(v))}</span> {p.comparacion}
          </p>
        )}
      </Tarjeta>

      {barras.length > 0 && (
        <Tarjeta className="p-4" data-testid="app-ventas-barras">
          <BarrasTactiles titulo={periodo === 'hoy' ? TXT.hoy.porHora : 'Ventas por día'} inicial={periodo === 'hoy' ? 'mayor' : 'ultima'} formatear={(x) => dinero(x)} datos={barras} />
        </Tarjeta>
      )}

      <div className="grid grid-cols-2 gap-3">
        <CifraSecundaria etiqueta={TXT.ventas.numero} data-testid="app-ventas-numero">
          <span className="num">{entero(totales.numVentas)}</span>
        </CifraSecundaria>
        <CifraSecundaria etiqueta={TXT.ventas.ticket}>
          <Dinero valor={totales.ticket} corta />
        </CifraSecundaria>
        <CifraSecundaria etiqueta={TXT.ventas.unidades}>
          <span className="num">{entero(totales.unidades)}</span>
        </CifraSecundaria>
        <CifraSecundaria etiqueta={TXT.ventas.margen} nota={`${porcentaje(totales.margenPct)} de la venta sin IVA`}>
          <Dinero valor={totales.margen} corta />
        </CifraSecundaria>
      </div>

      <Tarjeta className="p-4" data-testid="app-ventas-por-local">
        <h2 className="t-eyebrow text-ink-2">{TXT.ventas.porLocal}</h2>
        <ul className="mt-3 flex flex-col gap-4">
          {porLocal.map((l) => (
            <li key={l.localId} className={local !== 'todos' && local !== l.localId ? 'opacity-50' : undefined}>
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

      <Tarjeta aria-label={TXT.ventas.lista}>
        <h2 className="px-4 pb-1 pt-4 t-eyebrow text-ink-2">{TXT.ventas.lista}</h2>
        {filas.length === 0 ? (
          <EmptyState tamano="compacto" icono={ReceiptText} titulo={TXT.ventas.vacio} texto={TXT.ventas.vacioTexto} />
        ) : (
          <>
            <Lista data-testid="app-lista-ventas">
              {filas.slice(0, visibles).map((f) => (
                <FilaLista
                  key={f.id}
                  data-venta={f.id}
                  onClick={() => abrir(f.id)}
                  principal={<span className="num">{f.numero}</span>}
                  secundaria={`${e.locales[f.localId]?.nombre ?? ''} · ${momentoVenta(f.ts, hoy)}`}
                  derecha={
                    <span className="flex flex-col items-end gap-1">
                      <span className="t-body num text-ink">
                        <Dinero valor={f.total} />
                      </span>
                      {f.estado !== 'pagada' && <BadgeEstado tamano="sm" estado={ESTADOS_VENTA[f.estado]} />}
                    </span>
                  }
                />
              ))}
            </Lista>
            {filas.length > visibles && (
              <div className="border-t border-line-soft p-3">
                <Button variante="secondary" tamano="lg" anchoCompleto onClick={() => setVisibles((n) => n + PASO * 2)} data-testid="app-ver-mas-ventas">
                  {TXT.ventas.verMas} ({filas.length - visibles})
                </Button>
              </div>
            )}
          </>
        )}
      </Tarjeta>
      {hoja}
    </Pantalla>
  );
}
