import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BotonIcono, Button, Segmentado, Select } from '@/ui';
import type { FechaISO, Id } from '@/dominio/tipos';
import { moverPeriodo, tituloPeriodo, VISTAS } from '../calculos';
import { TEXTOS } from '../textos';
import type { Vista } from '../tipos';

export interface PropsBarra {
  vista: Vista;
  fecha: FechaISO;
  hoy: FechaISO;
  local: Id | 'todos';
  locales: readonly { id: Id; nombre: string }[];
  alIr: (cambios: { vista?: Vista; fecha?: FechaISO }) => void;
  alCambiarLocal: (l: Id | 'todos') => void;
}

/** Navegación del calendario: Hoy, anterior y siguiente, el período, la vista (mes, semana, día) y el local. */
export function BarraCalendario({ vista, fecha, hoy, local, locales, alIr, alCambiarLocal }: PropsBarra) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3" data-testid="calendario-barra">
      <div className="flex items-center gap-1">
        <Button variante="secondary" tamano="sm" onClick={() => alIr({ fecha: hoy })} data-testid="calendario-hoy">
          {TEXTOS.hoy}
        </Button>
        <BotonIcono icono={ChevronLeft} etiqueta={TEXTOS.anterior[vista]} tamano="sm" onClick={() => alIr({ fecha: moverPeriodo(vista, fecha, -1) })} data-testid="calendario-anterior" />
        <BotonIcono icono={ChevronRight} etiqueta={TEXTOS.siguiente[vista]} tamano="sm" onClick={() => alIr({ fecha: moverPeriodo(vista, fecha, 1) })} data-testid="calendario-siguiente" />
      </div>
      <h2 className="min-w-0 t-h2 text-ink" aria-live="polite" data-testid="calendario-titulo">
        {tituloPeriodo(vista, fecha)}
      </h2>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        <div className="w-[200px]">
          <Select
            etiqueta={TEXTOS.filtroLocal}
            etiquetaOculta
            tamano="sm"
            valor={local}
            alCambiar={(v) => alCambiarLocal(v)}
            opciones={[{ valor: 'todos', etiqueta: TEXTOS.todosLosLocales }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
            data-testid="calendario-local"
          />
        </div>
        <Segmentado
          etiqueta="Vista del calendario"
          valor={vista}
          alCambiar={(v) => alIr({ vista: v })}
          opciones={VISTAS.map((v) => ({ valor: v, etiqueta: TEXTOS.vistas[v], 'data-testid': `calendario-vista-${v}` }))}
          data-testid="calendario-vistas"
        />
      </div>
    </div>
  );
}
