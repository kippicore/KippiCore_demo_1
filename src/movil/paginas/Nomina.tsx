import { Users } from 'lucide-react';
import { useState } from 'react';
import { rutas } from '@/app/rutas';
import type { PeriodoNomina } from '@/dominio/tipos';
import { useAhora, useSel } from '@/estado';
import { porcentaje, plural } from '@/lib/formato';
import { selCostoNominaPorLocal, selLiquidaciones, selPeriodoAbierto, selVistaPreviaNomina } from '@/selectores';
import { Badge, Dinero, EmptyState, NotaLegal } from '@/ui/ligero';
import { SegmentadoMovil } from '../componentes/ControlesTactiles';
import { Pantalla } from '../componentes/Pantalla';
import { CifraSecundaria, FilaLista, Lista, Tarjeta, TarjetaTitulo } from '../componentes/Tarjeta';
import { TXT } from '../textos';

/**
 * Nómina (PRD 6.5): lo que cuesta de verdad el periodo que sigue por liquidar (la misma vista previa que el
 * escritorio, `selVistaPreviaNomina`, con exoneración), su reparto por local y las liquidaciones recientes. Solo
 * lectura: aprobar y pagar la nómina se hace en el computador, con la verificación de la PILA.
 */
export default function Nomina() {
  const hoy = useAhora().slice(0, 10);
  const periodos = useSel(selPeriodoAbierto, { hoy });
  const hay = [periodos.quincenal, periodos.mensual].filter((p): p is PeriodoNomina => !!p);
  const [via, setVia] = useState<'quincenal' | 'mensual'>(periodos.quincenal ? 'quincenal' : 'mensual');
  const periodo = via === 'quincenal' ? periodos.quincenal : periodos.mensual;
  return (
    <Pantalla testid="app-nomina" titulo={TXT.nomina.titulo} volver={{ a: rutas.appMas(), texto: 'Más' }} fecha={periodo?.etiqueta ?? 'Sin periodo por liquidar'}>
      {hay.length > 1 && (
        <SegmentadoMovil
          etiqueta="Periodicidad"
          valor={via}
          alCambiar={setVia}
          opciones={[
            { valor: 'quincenal', etiqueta: 'Quincenal' },
            { valor: 'mensual', etiqueta: 'Mensual' },
          ]}
        />
      )}
      {periodo ? (
        <CostoDelPeriodo periodo={periodo} />
      ) : (
        <Tarjeta>
          <EmptyState tamano="compacto" icono={Users} titulo={TXT.nomina.vacio} texto={TXT.nomina.vacioTexto} />
        </Tarjeta>
      )}
      <PorLocal />
      <Liquidadas />
      <NotaLegal tipo="nomina" />
    </Pantalla>
  );
}

function CostoDelPeriodo({ periodo }: { periodo: PeriodoNomina }) {
  const ahora = useAhora();
  const v = useSel(selVistaPreviaNomina, { periodo, exoneracion: true, ahora });
  const l = v.liquidacion;
  if (!l)
    return (
      <Tarjeta>
        <EmptyState tamano="compacto" icono={Users} titulo={TXT.nomina.vacio} texto={v.error ?? TXT.nomina.vacioTexto} />
      </Tarjeta>
    );
  return (
    <>
      <Tarjeta className="p-4" data-testid="app-nomina-costo">
        <p className="t-eyebrow text-ink-2">Costo para el negocio</p>
        <p className="mt-2">
          <Dinero valor={l.totales.costo} className="t-kpi-xl text-ink max-[374px]:text-kpi" />
        </p>
        <p className="mt-1 t-small text-muted">
          {plural(l.lineas.length, 'persona', 'personas')} · sueldos, aportes y provisiones del periodo
        </p>
        <p className="mt-2 t-small text-muted">{TXT.nomina.exoneracion}</p>
      </Tarjeta>
      <div className="grid grid-cols-2 gap-3">
        <CifraSecundaria etiqueta="Devengado">
          <Dinero valor={l.totales.devengado} corta />
        </CifraSecundaria>
        <CifraSecundaria etiqueta="Neto a pagar">
          <Dinero valor={l.totales.neto} corta />
        </CifraSecundaria>
        <CifraSecundaria etiqueta="Aportes">
          <Dinero valor={l.totales.aportes} corta />
        </CifraSecundaria>
        <CifraSecundaria etiqueta="Provisiones">
          <Dinero valor={l.totales.provisiones} corta />
        </CifraSecundaria>
      </div>
    </>
  );
}

function PorLocal() {
  const hoy = useAhora().slice(0, 10);
  const { locales } = useSel(selCostoNominaPorLocal, { mes: hoy.slice(0, 7) });
  const con = locales.filter((x) => x.costo > 0);
  if (con.length === 0) return null;
  return (
    <Tarjeta data-testid="app-nomina-locales">
      <TarjetaTitulo titulo="Costo de nómina por local, este mes" />
      <Lista>
        {con.map((x) => (
          <FilaLista
            key={x.localId}
            principal={x.nombre}
            secundaria={x.porcentaje !== null ? `${porcentaje(x.porcentaje)} de sus ventas` : 'Costo compartido'}
            derecha={
              <span className="t-body num text-ink">
                <Dinero valor={x.costo} corta />
              </span>
            }
          />
        ))}
      </Lista>
    </Tarjeta>
  );
}

function Liquidadas() {
  const liq = useSel(selLiquidaciones)
    .filter((x) => x.estado === 'pagada' || x.estado === 'aprobada')
    .sort((a, b) => (a.periodo.fin < b.periodo.fin ? 1 : -1))
    .slice(0, 3);
  if (liq.length === 0) return null;
  return (
    <Tarjeta data-testid="app-nomina-liquidadas">
      <TarjetaTitulo titulo="Liquidaciones recientes" />
      <Lista>
        {liq.map((x) => (
          <FilaLista
            key={x.id}
            principal={<span className="num">{x.numero}</span>}
            secundaria={x.periodo.etiqueta}
            derecha={
              <span className="flex flex-col items-end gap-1">
                <span className="t-body num text-ink">
                  <Dinero valor={x.totales.costo} corta />
                </span>
                <Badge tono={x.estado === 'pagada' ? 'success' : 'outline'} tamano="sm">
                  {x.estado === 'pagada' ? 'Pagada' : 'Aprobada'}
                </Badge>
              </span>
            }
          />
        ))}
      </Lista>
    </Tarjeta>
  );
}
