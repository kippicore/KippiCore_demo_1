import * as RP from '@radix-ui/react-popover';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, useState, type ComponentProps } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import type { FechaISO } from '@/dominio/tipos';
import { aDate, deDate, inicioMes, finMes, sumarDias, sumarMeses, sumarMesesAMes } from '@/lib/fechas';
import { fecha as formatoFecha, MESES } from '@/lib/formato';
import { cn } from '../cn';
import { Button } from './Button';
import { Campo, CLASE_CAMPO, type PropsCampo } from './Input';
import { Icono } from './Icono';

/**
 * Selector de fecha y de rango (PLAN 8.7.8): disparador como campo con `CalendarDays` ("30/09/2026" o
 * "01/09/2026 – 30/09/2026"); popover con atajos a la izquierda (rango) y uno o dos meses; semana desde el lunes;
 * días de 36 × 36 radio 0; hoy con punto camel; extremos `bg-ink`, tramo medio `bg-selected`. Pie: Cancelar · Aplicar.
 * `hoy` llega del reloj de la demo (`useHoy()`), nunca de `new Date()`.
 *
 *   <SelectorFecha etiqueta="Fecha del gasto" hoy={hoy} valor={f} alCambiar={setF} />
 *   <SelectorRango etiqueta="Fechas" hoy={hoy} valor={{ desde, hasta }} alCambiar={setRango} />
 */
export interface RangoFechas {
  desde: FechaISO;
  hasta: FechaISO;
}

const CLASES_DIA = {
  root: 'relative',
  months: 'flex gap-8',
  month: 'w-[252px]',
  month_caption: 'flex h-8 items-center px-1',
  caption_label: 't-label font-bold text-ink',
  nav: 'absolute right-0 top-0 z-1 flex gap-1',
  button_previous: 'inline-flex size-7 items-center justify-center border border-line-strong text-ink hover:border-ink disabled:text-disabled',
  button_next: 'inline-flex size-7 items-center justify-center border border-line-strong text-ink hover:border-ink disabled:text-disabled',
  month_grid: 'mt-2 w-full border-collapse',
  weekdays: '',
  weekday: 'h-8 w-9 t-micro font-medium text-ink-2',
  week: '',
  day: 'relative size-9 p-0 text-center',
  day_button:
    'relative inline-flex size-9 items-center justify-center rounded-none t-small num text-ink outline-none transition-colors duration-(--dur-instant) hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
  today: '[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-accent',
  selected: '[&>button]:bg-ink [&>button]:text-inverse [&>button:hover]:bg-ink',
  range_start: '[&>button]:bg-ink [&>button]:text-inverse',
  range_end: '[&>button]:bg-ink [&>button]:text-inverse',
  range_middle: '[&>button]:bg-selected! [&>button]:text-ink!',
  outside: '[&>button]:text-disabled',
  disabled: '[&>button]:text-disabled [&>button]:cursor-not-allowed',
  hidden: 'invisible',
} as const;

const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const formatters = {
  formatCaption: (d: Date) => `${mayus(MESES[d.getMonth()] ?? '')} ${d.getFullYear()}`,
  formatWeekdayName: (d: Date) => ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()] ?? '',
};
const componentes = {
  Chevron: ({ orientation }: { orientation?: 'left' | 'right' | 'up' | 'down' }) => <Icono icono={orientation === 'left' ? ChevronLeft : ChevronRight} tamano={14} />,
};

function Disparador({ id, texto, vacio, error, ...resto }: { id: string; texto: string | null; vacio: string; error?: boolean } & ComponentProps<'button'>) {
  return (
    <button
      id={id}
      type="button"
      aria-invalid={error || undefined}
      className={cn(CLASE_CAMPO, 'inline-flex h-10 items-center gap-2 px-3 text-left', !texto && 'text-placeholder')}
      {...resto}
    >
      <Icono icono={CalendarDays} tamano={16} className="text-muted" />
      <span className="num">{texto ?? vacio}</span>
    </button>
  );
}

export interface PropsSelectorFecha extends PropsCampo {
  hoy: FechaISO;
  valor: FechaISO | null;
  alCambiar: (f: FechaISO) => void;
  desde?: FechaISO;
  hasta?: FechaISO;
  placeholder?: string;
  enModal?: boolean;
}

export function SelectorFecha({ hoy, valor, alCambiar, desde, hasta, placeholder = 'Elige una fecha', enModal, ...campo }: PropsSelectorFecha) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  return (
    <Campo id={id} {...campo}>
      <RP.Root open={abierto} onOpenChange={setAbierto}>
        <RP.Trigger asChild>
          <Disparador id={id} texto={valor ? formatoFecha(valor) : null} vacio={placeholder} error={!!campo.error} />
        </RP.Trigger>
        <RP.Portal>
          <RP.Content align="start" sideOffset={8} collisionPadding={12} className={cn('rounded-none border border-line bg-surface p-4 text-ink shadow-float animate-pop-in', enModal ? 'z-(--z-modal-popover)' : 'z-(--z-popover)')}>
            <DayPicker
              mode="single"
              locale={es}
              weekStartsOn={1}
              today={aDate(hoy)}
              defaultMonth={aDate(valor ?? hoy)}
              selected={valor ? aDate(valor) : undefined}
              onSelect={(d) => {
                if (!d) return;
                alCambiar(deDate(d));
                setAbierto(false);
              }}
              disabled={[...(desde ? [{ before: aDate(desde) }] : []), ...(hasta ? [{ after: aDate(hasta) }] : [])]}
              showOutsideDays
              classNames={CLASES_DIA}
              formatters={formatters}
              components={componentes}
            />
          </RP.Content>
        </RP.Portal>
      </RP.Root>
    </Campo>
  );
}

/** Atajos de rango (8.7.8) calculados con el reloj de la demo. */
export function atajosRango(hoy: FechaISO): { id: string; etiqueta: string; rango: RangoFechas }[] {
  const mesAnterior = sumarMesesAMes(hoy.slice(0, 7), -1);
  return [
    { id: 'hoy', etiqueta: 'Hoy', rango: { desde: hoy, hasta: hoy } },
    { id: 'ayer', etiqueta: 'Ayer', rango: { desde: sumarDias(hoy, -1), hasta: sumarDias(hoy, -1) } },
    { id: '7d', etiqueta: 'Últimos 7 días', rango: { desde: sumarDias(hoy, -6), hasta: hoy } },
    { id: 'mes', etiqueta: 'Este mes', rango: { desde: inicioMes(hoy.slice(0, 7)), hasta: hoy } },
    { id: 'mes-anterior', etiqueta: 'Mes anterior', rango: { desde: inicioMes(mesAnterior), hasta: finMes(mesAnterior) } },
    { id: '90d', etiqueta: 'Últimos 90 días', rango: { desde: sumarDias(hoy, -89), hasta: hoy } },
    { id: 'anio', etiqueta: 'Este año', rango: { desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy } },
  ];
}

/** Nombre corto de un rango si coincide con un atajo ("Este mes"), si no "01/09/2026 – 30/09/2026". */
export function textoRango(r: RangoFechas, hoy: FechaISO): string {
  const a = atajosRango(hoy).find((x) => x.rango.desde === r.desde && x.rango.hasta === r.hasta);
  if (a) return a.etiqueta;
  return r.desde === r.hasta ? formatoFecha(r.desde) : `${formatoFecha(r.desde)} – ${formatoFecha(r.hasta)}`;
}

export interface PropsSelectorRango extends PropsCampo {
  hoy: FechaISO;
  valor: RangoFechas;
  alCambiar: (r: RangoFechas) => void;
  /** Solo el panel (para usarlo dentro de un `BotonPildora`). */
  soloPanel?: boolean;
  alCerrar?: () => void;
  enModal?: boolean;
}

function PanelRango({ hoy, valor, alAplicar, alCancelar }: { hoy: FechaISO; valor: RangoFechas; alAplicar: (r: RangoFechas) => void; alCancelar: () => void }) {
  const [borrador, setBorrador] = useState<DateRange | undefined>({ from: aDate(valor.desde), to: aDate(valor.hasta) });
  const [mes, setMes] = useState(aDate(sumarMeses(inicioMes(valor.hasta.slice(0, 7)), -1)));
  const atajos = atajosRango(hoy);
  const actual = borrador?.from && borrador.to ? { desde: deDate(borrador.from), hasta: deDate(borrador.to) } : null;
  return (
    <div className="flex flex-col">
      <div className="flex gap-6">
        <ul className="flex w-40 shrink-0 flex-col border-r border-line-soft pr-4">
          {atajos.map((a) => {
            const activo = actual?.desde === a.rango.desde && actual.hasta === a.rango.hasta;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setBorrador({ from: aDate(a.rango.desde), to: aDate(a.rango.hasta) });
                    setMes(aDate(sumarMeses(inicioMes(a.rango.hasta.slice(0, 7)), -1)));
                  }}
                  className={cn('flex h-8 w-full items-center px-2 text-left t-body transition-colors hover:bg-surface-2', activo ? 'font-semibold text-ink' : 'text-ink-2')}
                >
                  {a.etiqueta}
                </button>
              </li>
            );
          })}
          <li>
            <span className={cn('flex h-8 items-center px-2 t-body', actual && !atajos.some((a) => a.rango.desde === actual.desde && a.rango.hasta === actual.hasta) ? 'font-semibold text-ink' : 'text-ink-2')}>
              Personalizado
            </span>
          </li>
        </ul>
        <DayPicker
          mode="range"
          locale={es}
          weekStartsOn={1}
          numberOfMonths={2}
          month={mes}
          onMonthChange={setMes}
          today={aDate(hoy)}
          selected={borrador}
          onSelect={setBorrador}
          disabled={{ after: aDate(hoy) }}
          classNames={CLASES_DIA}
          formatters={formatters}
          components={componentes}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-4">
        <span className="t-small num text-ink-2">{actual ? textoRango(actual, hoy) : 'Elige el día final'}</span>
        <div className="flex gap-2">
          <Button variante="ghost" tamano="sm" onClick={alCancelar}>
            Cancelar
          </Button>
          <Button tamano="sm" disabled={!actual} motivo="Elige el día final" onClick={() => actual && alAplicar(actual)}>
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SelectorRango({ hoy, valor, alCambiar, soloPanel, alCerrar, enModal, ...campo }: PropsSelectorRango) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  if (soloPanel)
    return (
      <PanelRango
        hoy={hoy}
        valor={valor}
        alAplicar={(r) => {
          alCambiar(r);
          alCerrar?.();
        }}
        alCancelar={() => alCerrar?.()}
      />
    );
  return (
    <Campo id={id} {...campo}>
      <RP.Root open={abierto} onOpenChange={setAbierto}>
        <RP.Trigger asChild>
          <Disparador id={id} texto={textoRango(valor, hoy)} vacio="Elige las fechas" error={!!campo.error} />
        </RP.Trigger>
        <RP.Portal>
          <RP.Content align="start" sideOffset={8} collisionPadding={12} className={cn('rounded-none border border-line bg-surface p-4 text-ink shadow-float animate-pop-in', enModal ? 'z-(--z-modal-popover)' : 'z-(--z-popover)')}>
            <PanelRango
              hoy={hoy}
              valor={valor}
              alAplicar={(r) => {
                alCambiar(r);
                setAbierto(false);
              }}
              alCancelar={() => setAbierto(false)}
            />
          </RP.Content>
        </RP.Portal>
      </RP.Root>
    </Campo>
  );
}
