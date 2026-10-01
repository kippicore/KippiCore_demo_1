import {
  CalendarClock,
  Cake,
  ChartNoAxesCombined,
  Eye,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  RotateCcw,
  Shirt,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { rutas } from '@/app/rutas';
import { useDinero, useHoy, useMarca, useSel } from '@/estado';
import { entero, porcentaje } from '@/lib/formato';
import type { EscenarioCanal } from '@/seed/escenarios-canales';
import {
  Badge,
  Button,
  Card,
  cn,
  EncabezadoPagina,
  Icono,
  Kpi,
  Pista,
  PestanasEnlace,
  Segmentado,
} from '@/ui';
import { selIndicadoresCanales, type IndicadorCanal } from '../selectores';
import { TEXTOS } from '../textos';

/** Etiqueta de vitrina (PRD 7.14): en cada vista, con la marca activa. */
export function EtiquetaVitrina({ className }: { className?: string }) {
  const marca = useMarca();
  return (
    <p
      className={cn(
        'inline-flex min-h-8 items-center gap-2 bg-ink px-3 py-1.5 t-micro font-semibold text-inverse',
        className,
      )}
      data-testid="canales-etiqueta-vitrina"
    >
      <Icono icono={Eye} tamano={14} />
      {TEXTOS.etiqueta(marca.nombre)}
    </p>
  );
}

type Actual = 'resumen' | 'whatsapp' | 'instagram' | 'web';

/** Encabezado común de las cuatro vistas, con las pestañas de canales y la etiqueta de vitrina. */
export function EncabezadoCanales({
  actual,
  titulo,
  subtitulo,
  acciones,
}: {
  actual: Actual;
  titulo: string;
  subtitulo: string;
  acciones?: ReactNode;
}) {
  const pestanas = [
    { a: rutas.canales(), etiqueta: TEXTOS.pestanas.resumen, fin: true },
    { a: rutas.canalWhatsapp({}), etiqueta: TEXTOS.pestanas.whatsapp },
    { a: rutas.canalInstagram(), etiqueta: TEXTOS.pestanas.instagram },
    { a: rutas.canalWeb(), etiqueta: TEXTOS.pestanas.web },
  ];
  return (
    <>
      <EncabezadoPagina
        migas={
          actual === 'resumen'
            ? [{ texto: 'Inicio', a: rutas.inicio() }, { texto: TEXTOS.encabezado.titulo }]
            : [
                { texto: 'Inicio', a: rutas.inicio() },
                { texto: TEXTOS.encabezado.titulo, a: rutas.canales() },
                { texto: TEXTOS.pestanas[actual] },
              ]
        }
        titulo={titulo}
        subtitulo={subtitulo}
        acciones={
          <>
            {acciones}
            <EtiquetaVitrina />
          </>
        }
        pestanas={<PestanasEnlace etiqueta="Canales digitales" pestanas={pestanas} />}
      />
    </>
  );
}

const ICONOS: Record<EscenarioCanal['icono'], LucideIcon> = {
  Shirt,
  CalendarClock,
  Megaphone,
  Cake,
  ChartNoAxesCombined,
  UserRoundCheck,
  MessageCircle,
  LayoutGrid,
};

export interface OpcionEscenario {
  valor: string;
  titulo: string;
  icono: LucideIcon;
}

export function opcionDe(e: EscenarioCanal): OpcionEscenario {
  return { valor: e.id, titulo: e.titulo, icono: ICONOS[e.icono] };
}

/** Selector de escenarios (pista `canales.escenarios`): botones compactos con ícono y una frase debajo. */
export function SelectorEscenarios({
  opciones,
  valor,
  alElegir,
  descripcion,
  acciones,
}: {
  opciones: OpcionEscenario[];
  valor: string;
  alElegir: (v: string) => void;
  descripcion: string;
  acciones?: ReactNode;
}) {
  return (
    <div data-testid="canales-escenarios">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Pista id="canales.escenarios" alinear="inicio" lado="abajo">
          <p className="t-eyebrow text-ink-2">{TEXTOS.whatsapp.escenarios}</p>
        </Pista>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      <div role="radiogroup" aria-label={TEXTOS.whatsapp.escenarios} className="flex flex-wrap gap-2">
        {opciones.map((o) => {
          const activo = o.valor === valor;
          return (
            <Button
              key={o.valor}
              role="radio"
              aria-checked={activo}
              variante={activo ? 'primary' : 'secondary'}
              tamano="sm"
              icono={o.icono}
              onClick={() => alElegir(o.valor)}
              data-testid={`escenario-${o.valor}`}
            >
              {o.titulo}
            </Button>
          );
        })}
      </div>
      <p className="mt-3 max-w-[80ch] t-body text-ink-2" data-testid="canales-escenario-descripcion">
        {descripcion}
      </p>
    </div>
  );
}

/** Repetir el escenario y elegir la velocidad de la reproducción. */
export function ControlesReproduccion({
  velocidad,
  alVelocidad,
  alRepetir,
}: {
  velocidad: 1 | 4;
  alVelocidad: (v: 1 | 4) => void;
  alRepetir: () => void;
}) {
  return (
    <>
      <Segmentado
        etiqueta={TEXTOS.chat.velocidad}
        tamano="sm"
        valor={String(velocidad)}
        alCambiar={(v) => alVelocidad(v === '4' ? 4 : 1)}
        opciones={[
          { valor: '1', etiqueta: TEXTOS.chat.normal, 'data-testid': 'canales-velocidad-normal' },
          { valor: '4', etiqueta: TEXTOS.chat.rapida, 'data-testid': 'canales-velocidad-rapida' },
        ]}
      />
      <Button
        variante="secondary"
        tamano="sm"
        icono={RotateCcw}
        onClick={alRepetir}
        data-testid="canales-repetir"
      >
        {TEXTOS.chat.repetir}
      </Button>
    </>
  );
}

/** Indicadores de un canal: mensajes y respuesta simulados; ventas atribuidas reales de ese canal. */
export function IndicadoresCanal({
  canal,
  className,
}: {
  canal: 'whatsapp' | 'instagram';
  className?: string;
}) {
  const hoy = useHoy();
  const dinero = useDinero();
  const i = useSel(selIndicadoresCanales, { hoy });
  const c: IndicadorCanal = canal === 'whatsapp' ? i.whatsapp : i.instagram;
  const completo = useMemo(() => dinero(c.valor), [dinero, c.valor]);
  return (
    <Card
      padding="compacta"
      titulo={TEXTOS.indicadores.titulo}
      className={className}
      data-testid="canales-indicadores"
      accion={
        <Badge tono="neutral" tamano="sm">
          {TEXTOS.indicadores.simulado}
        </Badge>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <Kpi
          etiqueta={TEXTOS.indicadores.mensajes}
          valor={c.mensajesEnviados}
          formatear={entero}
          nota={`${entero(c.conversaciones)} conversaciones`}
          data-testid="canales-kpi-mensajes"
        />
        <Kpi
          etiqueta={TEXTOS.indicadores.respuesta}
          valor={c.tasaRespuesta}
          formatear={(n) => porcentaje(n, 0)}
          nota="de los mensajes se responden"
          data-testid="canales-kpi-respuesta"
        />
        <Kpi
          etiqueta={TEXTOS.indicadores.ventas}
          valor={c.valor}
          formatear={dinero.corta}
          completo={completo}
          nota={TEXTOS.indicadores.ventasNota(c.ventas)}
          data-testid="canales-kpi-ventas"
        />
      </div>
      <p className="mt-3 t-small text-muted">{TEXTOS.indicadores.ayuda}</p>
    </Card>
  );
}
