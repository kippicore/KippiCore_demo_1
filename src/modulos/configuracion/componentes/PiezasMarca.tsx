import { useId, useState, type CSSProperties } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Badge, Button, Icono, Input, cn } from '@/ui';
import { contraste, hexValido, normalizarHex, textoSobre } from '../calculos';

export interface ColoresMarca {
  acento: string;
  acentoTexto: string;
  acentoSuave: string;
  tiendaHero: string;
}

/** Selector de color: muestra el color, el campo del código y avisa si el código no es válido. */
export function CampoColor({
  etiqueta,
  valor,
  alCambiar,
  ayuda,
  'data-testid': testid,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (hex: string) => void;
  ayuda?: string;
  'data-testid'?: string;
}) {
  const id = useId();
  const [texto, setTexto] = useState(valor);
  const [enfocado, setEnfocado] = useState(false);
  const [previo, setPrevio] = useState(valor);
  if (valor !== previo) {
    setPrevio(valor);
    if (!enfocado) setTexto(valor);
  }
  const invalido = texto !== '' && normalizarHex(texto) === null;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block t-label text-ink">
        {etiqueta}
      </label>
      <div className="flex items-stretch gap-2">
        <input
          type="color"
          aria-label={`${etiqueta}: elegir color`}
          value={hexValido(valor) ? valor.toLowerCase() : '#000000'}
          onChange={(e) => alCambiar(e.target.value.toUpperCase())}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-none border border-line-strong bg-surface p-1"
        />
        <Input
          id={id}
          className="min-w-0 flex-1"
          value={texto}
          maxLength={7}
          autoComplete="off"
          spellCheck={false}
          data-testid={testid}
          error={invalido ? 'Escribe el color como #A67C52.' : undefined}
          onFocus={() => setEnfocado(true)}
          onChange={(e) => {
            setTexto(e.target.value);
            const h = normalizarHex(e.target.value);
            if (h) alCambiar(h);
          }}
          onBlur={() => {
            setEnfocado(false);
            const h = normalizarHex(texto);
            setTexto(h ?? valor);
          }}
        />
      </div>
      {ayuda && <p className="mt-1.5 max-w-[72ch] t-small text-muted">{ayuda}</p>}
    </div>
  );
}

/** Tamaño de letra del wordmark según el largo del nombre, para que quepa en una línea o dos. */
function tamanoWordmark(nombre: string): string {
  const n = nombre.length;
  if (n <= 7) return '3.5rem';
  if (n <= 11) return '2.5rem';
  if (n <= 16) return '1.75rem';
  return '1.25rem';
}

/** El wordmark tipográfico (solo letras, en mayúsculas, peso 900) con el nombre que se está escribiendo. */
export function WordmarkVista({ nombre, descriptor, className }: { nombre: string; descriptor?: string; className?: string }) {
  return (
    <div className={cn('min-w-0', className)} data-testid="config-wordmark">
      <p className="t-wordmark-entrada break-words text-ink" style={{ fontSize: tamanoWordmark(nombre) }} data-marca={nombre}>
        {nombre}
      </p>
      {descriptor && <p className="mt-3 t-eyebrow text-ink-2">{descriptor}</p>}
    </div>
  );
}

/**
 * Maqueta de cómo queda la marca: barra lateral con el nombre, un indicador, una insignia y la portada de la tienda.
 * Los colores del borrador se aplican solo dentro de este recuadro (las variables del acento se reescriben aquí).
 */
export function VistaPreviaMarca({ nombre, colores }: { nombre: string; colores: ColoresMarca }) {
  const ok = Object.values(colores).every(hexValido);
  const c: ColoresMarca = ok ? colores : { acento: '#A67C52', acentoTexto: '#7A5634', acentoSuave: '#F3ECE4', tiendaHero: '#1F2A44' };
  const estilo = {
    '--color-accent': c.acento,
    '--color-accent-ink': c.acentoTexto,
    '--color-accent-soft': c.acentoSuave,
  } as CSSProperties;
  const legible = contraste(c.acentoTexto, c.acentoSuave);
  return (
    <div data-testid="config-vista-previa" style={estilo}>
      <div className="grid overflow-hidden border border-line bg-canvas sm:grid-cols-[132px_minmax(0,1fr)]">
        <div className="hidden border-r border-line bg-surface p-4 sm:block">
          <p className="truncate t-wordmark text-ink" title={nombre}>
            {nombre}
          </p>
          <ul className="mt-5 space-y-2.5 t-small text-ink-2">
            <li className="flex items-center gap-2 font-bold text-ink">
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              Inicio
            </li>
            <li className="pl-3.5">Ventas</li>
            <li className="pl-3.5">Inventario</li>
          </ul>
        </div>
        <div className="min-w-0 p-5">
          <p className="t-eyebrow text-ink-2">Ventas de hoy</p>
          <p className="mt-1 inline-block border-b-2 border-accent t-kpi num text-ink">$ 4.280.000</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tono="accent">Destacado</Badge>
            <Button tamano="sm">Registrar venta</Button>
            <span className="t-small font-bold text-accent-ink underline underline-offset-4">Ver detalle</span>
          </div>
          <p className="mt-4 inline-flex bg-accent-soft px-3 py-2 t-small text-accent-ink">Una pista o un aviso con tu color de marca.</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 px-6 py-5" style={{ backgroundColor: c.tiendaHero, color: textoSobre(c.tiendaHero) }}>
        <p className="t-wordmark-tienda truncate">{nombre}</p>
        <p className="t-small">Portada de la tienda web</p>
      </div>
      {legible < 4.5 && (
        <p className="mt-3 flex items-start gap-1.5 t-small text-ink" data-testid="config-aviso-contraste">
          <Icono icono={TriangleAlert} tamano={14} className="mt-0.5 text-warning" />
          <span>El color del texto casi no se lee sobre el fondo suave. Oscurece el texto o aclara el fondo.</span>
        </p>
      )}
    </div>
  );
}
