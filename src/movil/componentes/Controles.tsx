import { Check } from 'lucide-react';
import { useState } from 'react';
import { emitirUI, useEstadoDominio, useFiltroLocal, useMoneda, useSel, useSesion, useTasasVigentes } from '@/estado';
import { selLocalesQueVenden } from '@/selectores';
import { MONEDAS } from '@/config/monedas';
import { textoTasas } from '@/lib/moneda';
import type { Moneda } from '@/dominio/tipos';
import { dinero } from '@/lib/formato';
import { cn, Icono } from '@/ui/ligero';
import { BotonEncabezadoMovil, LocalEncabezado } from '@/ui/movil/Movil';
import { TXT } from '../textos';
import { HojaApp } from './HojaApp';

/**
 * Controles del encabezado de cada pestaña (PLAN 8.5.2): a la derecha, el selector de local (`MapPin` + nombre corto)
 * y la moneda (chip `COP`). Cada uno abre una hoja inferior (nunca un menú flotante: 8.5.4). Cambian el MISMO estado
 * que los selectores del escritorio (`sesion.localId` y `sesion.moneda`), así que las cifras de la app y del
 * escritorio siempre coinciden.
 */
export function ControlesEncabezado() {
  const local = useFiltroLocal();
  const e = useEstadoDominio();
  const nombre = local === 'todos' ? 'Todos' : (e.locales[local]?.nombre ?? local);
  const { moneda } = useMoneda();
  const [abierta, setAbierta] = useState<'local' | 'moneda' | null>(null);
  return (
    <>
      <LocalEncabezado nombre={nombre} onClick={() => setAbierta('local')} />
      <BotonEncabezadoMovil etiqueta={`Moneda: ${MONEDAS[moneda].nombre}`} onClick={() => setAbierta('moneda')}>
        <span data-testid="app-moneda" className="num">
          {moneda}
        </span>
      </BotonEncabezadoMovil>
      <HojaLocal abierta={abierta === 'local'} alCerrar={() => setAbierta(null)} />
      <HojaMoneda abierta={abierta === 'moneda'} alCerrar={() => setAbierta(null)} />
    </>
  );
}

function OpcionHoja({ activa, titulo, detalle, onClick, testid }: { activa: boolean; titulo: string; detalle?: string; onClick: () => void; testid: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activa}
      onClick={onClick}
      data-testid={testid}
      className={cn('flex min-h-14 w-full items-center gap-3 border-b border-line-soft px-1 text-left active:bg-surface-2', activa && 'font-semibold')}
    >
      <span className="min-w-0 flex-1">
        <span className="block t-body text-ink">{titulo}</span>
        {detalle && <span className="block t-small text-muted">{detalle}</span>}
      </span>
      {activa && <Icono icono={Check} tamano={18} className="text-ink" />}
    </button>
  );
}

export function HojaLocal({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  const local = useFiltroLocal();
  const cambiar = useSesion((s) => s.cambiarLocal);
  const locales = useSel(selLocalesQueVenden);
  return (
    <HojaApp abierta={abierta} alCerrar={alCerrar} titulo="Ver datos de">
      <div role="radiogroup" aria-label="Local">
        <OpcionHoja
          testid="app-local-todos"
          activa={local === 'todos'}
          titulo={TXT.comun.todos}
          detalle="Los tres locales juntos"
          onClick={() => {
            cambiar('todos');
            alCerrar();
          }}
        />
        {locales.map((l) => (
          <OpcionHoja
            key={l.id}
            testid={`app-local-${l.id}`}
            activa={local === l.id}
            titulo={l.nombre}
            detalle={l.zona}
            onClick={() => {
              cambiar(l.id);
              alCerrar();
            }}
          />
        ))}
      </div>
    </HojaApp>
  );
}

/** Opciones de moneda con la tasa de ejemplo. Emite `moneda_cambiada` como el selector de la barra del escritorio. */
export function OpcionesMoneda({ alElegir }: { alElegir?: () => void }) {
  const { moneda, cambiar } = useMoneda();
  const elegir = (m: Moneda) => {
    if (m !== moneda) {
      cambiar(m);
      emitirUI('moneda_cambiada', { a: m });
    }
    alElegir?.();
  };
  const tasas = useTasasVigentes();
  const etiquetaTasa = textoTasas(tasas).split(':')[0];
  const detalle = (m: Moneda) =>
    m === 'COP' ? 'La moneda de los datos' : `${etiquetaTasa}: ${MONEDAS[m].simbolo} 1 = ${dinero(tasas[m])}`;
  return (
    <div role="radiogroup" aria-label="Moneda">
      {(['COP', 'USD', 'CNY'] as const).map((m) => (
        <OpcionHoja key={m} testid={`app-moneda-${m}`} activa={moneda === m} titulo={`${MONEDAS[m].nombre} · ${m}`} detalle={detalle(m)} onClick={() => elegir(m)} />
      ))}
    </div>
  );
}

export function HojaMoneda({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  return (
    <HojaApp abierta={abierta} alCerrar={alCerrar} titulo="Ver cifras en">
      <OpcionesMoneda alElegir={alCerrar} />
    </HojaApp>
  );
}
