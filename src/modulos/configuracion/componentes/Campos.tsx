import { useId, useState, type ReactNode } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Button, Input, InputNumero, Select, cn } from '@/ui';
import { plural } from '@/lib/formato';
import { fraccionATexto, horaValida, textoAFraccion } from '../calculos';
import { MESES_OPCIONES } from '../textos';

/** Bloque de ajustes: título, explicación en una frase, insignia opcional y su rejilla de campos. */
export function SeccionAjustes({
  titulo,
  descripcion,
  insignia,
  children,
  columnas = 3,
  className,
  ...resto
}: {
  titulo: string;
  descripcion?: ReactNode;
  insignia?: ReactNode;
  children: ReactNode;
  columnas?: 2 | 3 | 4;
  className?: string;
  'data-testid'?: string;
}) {
  return (
    <section className={cn('border border-line bg-surface p-6', className)} {...resto}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="t-h3 text-ink">{titulo}</h2>
        {insignia}
      </div>
      {descripcion && <p className="mt-1.5 max-w-[72ch] t-small text-muted">{descripcion}</p>}
      <div className={cn('mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2', columnas === 3 && 'lg:grid-cols-3', columnas === 4 && 'lg:grid-cols-4')}>{children}</div>
    </section>
  );
}

interface PropsComunes {
  etiqueta: string;
  ayuda?: ReactNode;
  error?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

/** Porcentaje: se escribe como 8,5 y se guarda como 0,085. Admite hasta 3 decimales (los riesgos de la ARL). */
export function CampoPct({
  etiqueta,
  valor,
  alCambiar,
  decimales = 2,
  maximo = 1,
  ...resto
}: PropsComunes & { valor: number; alCambiar: (fraccion: number) => void; decimales?: 1 | 2 | 3; maximo?: number }) {
  const [texto, setTexto] = useState(() => fraccionATexto(valor, decimales));
  const [enfocado, setEnfocado] = useState(false);
  const [invalido, setInvalido] = useState(false);
  const [previo, setPrevio] = useState(valor);
  // Si el valor cambia desde fuera (descartar, valores de ejemplo, otra pestaña), el texto lo sigue.
  if (valor !== previo) {
    setPrevio(valor);
    if (!enfocado) {
      setTexto(fraccionATexto(valor, decimales));
      setInvalido(false);
    }
  }
  return (
    <Input
      {...resto}
      etiqueta={etiqueta}
      numerico
      sufijo="%"
      inputMode="decimal"
      autoComplete="off"
      value={texto}
      error={resto.error ?? (invalido ? 'Escribe un porcentaje, por ejemplo 8,5.' : undefined)}
      onFocus={(e) => {
        setEnfocado(true);
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d,]/g, '');
        setTexto(t);
        const f = textoAFraccion(t);
        setInvalido(f === null || f > maximo);
        if (f !== null && f <= maximo) alCambiar(f);
      }}
      onBlur={() => {
        setEnfocado(false);
        setTexto(fraccionATexto(valor, decimales));
        setInvalido(false);
      }}
    />
  );
}

/** Dinero en pesos (siempre COP: los parámetros se guardan en pesos). */
export function CampoCop({ etiqueta, valor, alCambiar, ...resto }: PropsComunes & { valor: number; alCambiar: (v: number) => void }) {
  return <InputNumero {...resto} etiqueta={etiqueta} prefijo="$" valor={valor} alCambiar={(v) => alCambiar(v ?? 0)} />;
}

/** Número con su unidad ("42 horas", "10 días"). */
export function CampoNumero({
  etiqueta,
  valor,
  alCambiar,
  sufijo,
  decimales = 0,
  ...resto
}: PropsComunes & { valor: number; alCambiar: (v: number) => void; sufijo?: string; decimales?: 0 | 1 | 2 }) {
  return <InputNumero {...resto} etiqueta={etiqueta} sufijo={sufijo} decimales={decimales} valor={valor} alCambiar={(v) => alCambiar(v ?? 0)} />;
}

/** Hora HH:mm en formato de 24 horas, validada al perder el foco. */
export function CampoHora({ etiqueta, valor, alCambiar, ...resto }: PropsComunes & { valor: string; alCambiar: (v: string) => void }) {
  const [texto, setTexto] = useState(valor);
  const [tocado, setTocado] = useState(false);
  const [previo, setPrevio] = useState(valor);
  if (valor !== previo) {
    setPrevio(valor);
    setTexto(valor);
  }
  const invalida = tocado && !horaValida(texto);
  return (
    <Input
      {...resto}
      etiqueta={etiqueta}
      value={texto}
      inputMode="numeric"
      placeholder="19:00"
      maxLength={5}
      error={resto.error ?? (invalida ? 'Escribe la hora como 19:00.' : undefined)}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d:]/g, '');
        setTexto(t);
        if (horaValida(t)) alCambiar(t);
      }}
      onBlur={() => {
        setTocado(true);
        if (!horaValida(texto)) setTexto(valor);
      }}
    />
  );
}

/** Día y mes de una fecha que se repite cada año ('06-30'). */
export function CampoDiaMes({ etiqueta, valor, alCambiar, ayuda }: PropsComunes & { valor: string; alCambiar: (v: string) => void }) {
  const id = useId();
  const [mes = '01', dia = '01'] = valor.split('-');
  const diasEnMes = [4, 6, 9, 11].includes(Number(mes)) ? 30 : mes === '02' ? 29 : 31;
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 t-label text-ink" id={`${id}-et`}>
        {etiqueta}
      </legend>
      <div className="grid grid-cols-[1fr_88px] gap-3">
        <Select
          etiqueta={`${etiqueta}: mes`}
          etiquetaOculta
          valor={mes}
          alCambiar={(m) => alCambiar(`${m}-${String(Math.min(Number(dia), [4, 6, 9, 11].includes(Number(m)) ? 30 : m === '02' ? 29 : 31)).padStart(2, '0')}`)}
          opciones={MESES_OPCIONES}
        />
        <Select
          etiqueta={`${etiqueta}: día`}
          etiquetaOculta
          valor={dia}
          alCambiar={(d) => alCambiar(`${mes}-${d}`)}
          opciones={Array.from({ length: diasEnMes }, (_, i) => ({ valor: String(i + 1).padStart(2, '0'), etiqueta: String(i + 1) }))}
        />
      </div>
      {ayuda && <p className="mt-1.5 max-w-[72ch] t-small text-muted">{ayuda}</p>}
    </fieldset>
  );
}

/**
 * Barra de guardado pegada abajo de la pantalla: dice cuántos cambios hay y ofrece guardar, descartar o volver a
 * los valores de ejemplo. Solo aparece si hay algo que guardar (o si se ofrece volver a los valores de ejemplo).
 */
export function BarraGuardar({
  nCambios,
  alGuardar,
  alDescartar,
  alEjemplo,
  etiquetaGuardar = 'Guardar cambios',
  error,
  resumen,
  fija = true,
  ...resto
}: {
  nCambios: number;
  alGuardar: () => void;
  alDescartar: () => void;
  /** Carga en el borrador los valores de ejemplo originales (no guarda). */
  alEjemplo?: () => void;
  etiquetaGuardar?: string;
  error?: string | null;
  /** Texto cuando hay cambios (por defecto, "N cambios sin guardar"). */
  resumen?: string;
  /** Pegada abajo de la pantalla (por defecto); falsa cuando hay varias barras en una misma pantalla. */
  fija?: boolean;
  'data-testid'?: string;
}) {
  const sucio = nCambios > 0;
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border bg-surface px-5 py-3',
        fija ? 'sticky bottom-4 z-(--z-sticky) mt-6' : '',
        sucio ? 'border-ink' : 'border-line',
      )}
      role="region"
      aria-label="Guardar cambios"
      {...resto}
    >
      <p className="t-small text-ink-2" aria-live="polite">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : sucio ? (
          (resumen ?? (
            <>
              <strong className="font-bold text-ink">{plural(nCambios, 'cambio')}</strong> sin guardar
            </>
          ))
        ) : (
          'Todo guardado.'
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {alEjemplo && (
          <Button variante="ghost" tamano="sm" icono={RotateCcw} onClick={alEjemplo} data-testid="config-valores-ejemplo">
            Volver a los valores de ejemplo
          </Button>
        )}
        <Button variante="secondary" tamano="sm" onClick={alDescartar} disabled={!sucio} data-testid="config-descartar">
          Descartar
        </Button>
        <Button tamano="sm" icono={Save} onClick={alGuardar} disabled={!sucio} data-testid="config-guardar">
          {etiquetaGuardar}
        </Button>
      </div>
    </div>
  );
}

/** Dato en dos líneas: etiqueta pequeña y valor (resúmenes de las pantallas). */
export function DatoResumen({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="t-eyebrow text-ink-2">{etiqueta}</p>
      <div className="mt-1 t-body font-semibold text-ink">{children}</div>
    </div>
  );
}
