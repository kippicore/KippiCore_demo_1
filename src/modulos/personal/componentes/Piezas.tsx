import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Avatar, Badge, Button, Dinero, EmptyState, EncabezadoPagina, NotaLegal, PestanasEnlace, Select } from '@/ui';
import { ESTADOS_PERSONAL } from '@/config/estados';
import type { Contrato, Empleado, MesISO } from '@/dominio/tipos';
import { mesAnio } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import { mesesRecientes, type Frase } from '../calculos';
import { ETIQUETA_CARGO, TEXTOS } from '../textos';

// ---------------------------------------------------------------------------------------------------------
// Frase con cifras
// ---------------------------------------------------------------------------------------------------------
/** Pinta una frase del cálculo: texto, dinero en la moneda activa y énfasis. */
export function FraseVista({ frase, className }: { frase: Frase; className?: string }) {
  return (
    <p className={className}>
      {frase.map((s, i) => {
        if (typeof s === 'string') return <Fragment key={i}>{s}</Fragment>;
        if ('dinero' in s) return <Dinero key={i} valor={s.dinero} corta className="font-bold text-ink" />;
        return (
          <strong key={i} className="font-bold text-ink">
            {s.enfasis}
          </strong>
        );
      })}
    </p>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Nota legal de nómina (visible en todo cálculo)
// ---------------------------------------------------------------------------------------------------------
export function NotaNomina({ className }: { className?: string }) {
  return (
    <div data-testid="personal-nota-nomina" className={className}>
      <NotaLegal tipo="nomina" />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Selector de mes
// ---------------------------------------------------------------------------------------------------------
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Los últimos 19 meses (desde marzo de 2025 en la demo) hasta el mes en curso. */
export function SelectorMes({ hoy, valor, alCambiar, etiqueta = 'Mes', className }: { hoy: string; valor: MesISO; alCambiar: (m: MesISO) => void; etiqueta?: string; className?: string }) {
  const meses = mesesRecientes(hoy, 19);
  const opciones = (meses.includes(valor) ? meses : [valor, ...meses]).map((m) => ({ valor: m, etiqueta: mayuscula(mesAnio(m)) }));
  return <Select etiqueta={etiqueta} valor={valor} alCambiar={(v) => alCambiar(v)} opciones={opciones} className={className} data-testid="personal-selector-mes" />;
}

// ---------------------------------------------------------------------------------------------------------
// Encabezado del módulo
// ---------------------------------------------------------------------------------------------------------
export interface PropsEncabezadoPersonal {
  titulo: string;
  subtitulo: string;
  acciones?: ReactNode;
  /** Migas finales (después de "Personal y nómina"). */
  migaFinal?: string;
  /** Sin pestañas del módulo (pantallas de detalle). */
  sinPestanas?: boolean;
}

/** Encabezado con las pestañas del módulo: Empleados · Nómina · Comparativo · Comisiones. */
export function EncabezadoPersonal({ titulo, subtitulo, acciones, migaFinal, sinPestanas }: PropsEncabezadoPersonal) {
  return (
    <EncabezadoPagina
      migas={[{ texto: 'Inicio', a: rutas.inicio() }, ...(migaFinal ? [{ texto: 'Personal y nómina', a: rutas.personal() }, { texto: migaFinal }] : [{ texto: 'Personal y nómina' }])]}
      titulo={titulo}
      subtitulo={subtitulo}
      acciones={acciones}
      pestanas={
        sinPestanas ? undefined : (
          <PestanasEnlace
            etiqueta="Secciones de personal y nómina"
            pestanas={[
              { a: rutas.personal(), etiqueta: 'Empleados', fin: true },
              { a: rutas.nomina(), etiqueta: 'Nómina' },
              { a: rutas.comparativoModalidades(), etiqueta: 'Comparativo de modalidades' },
              { a: rutas.comisiones(), etiqueta: 'Comisiones' },
            ]}
          />
        )
      }
    />
  );
}

// ---------------------------------------------------------------------------------------------------------
// Persona e insignias
// ---------------------------------------------------------------------------------------------------------
export function CeldaPersona({ empleado, nombre, detalle }: { empleado: Pick<Empleado, 'cargo'>; nombre: string; detalle?: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar nombre={nombre} tamano={32} />
      <span className="min-w-0">
        <span className="block truncate t-body font-semibold text-ink">{nombre}</span>
        <span className="block truncate t-small text-muted">{detalle ?? ETIQUETA_CARGO[empleado.cargo]}</span>
      </span>
    </span>
  );
}

/** Insignia de vinculación y, si aplica, la del riesgo de contrato realidad. */
export function InsigniasPersona({ tipo, riesgo, retirado, tamano = 'sm' }: { tipo: Contrato['tipo'] | null; riesgo?: boolean; retirado?: boolean; tamano?: 'sm' | 'md' }) {
  const e = tipo ? ESTADOS_PERSONAL[tipo] : null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {e && (
        <Badge tono={e.tono} tamano={tamano}>
          {e.etiqueta}
        </Badge>
      )}
      {riesgo && (
        <Badge tono={ESTADOS_PERSONAL.riesgo_contrato_realidad.tono} tamano={tamano} data-testid="personal-insignia-riesgo">
          {ESTADOS_PERSONAL.riesgo_contrato_realidad.etiqueta}
        </Badge>
      )}
      {retirado && (
        <Badge tono={ESTADOS_PERSONAL.retirado.tono} tamano={tamano}>
          {ESTADOS_PERSONAL.retirado.etiqueta}
        </Badge>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Controles dentro de una fila clicable
// ---------------------------------------------------------------------------------------------------------
/** Evita que un botón dentro de una fila de tabla abra también el detalle de la fila. */
export function SinPropagar({ children }: { children: ReactNode }) {
  return (
    <span role="presentation" className="inline-flex" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Límite de error
// ---------------------------------------------------------------------------------------------------------
interface EstadoLimite {
  fallo: boolean;
}

/** Si un cálculo falla, la pantalla muestra un estado de error diseñado en vez de quedarse en blanco. */
export class LimiteError extends Component<{ children: ReactNode; reintentar?: () => void }, EstadoLimite> {
  override state: EstadoLimite = { fallo: false };

  static getDerivedStateFromError(): EstadoLimite {
    return { fallo: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[C1] No se pudo mostrar la sección', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.fallo) return this.props.children;
    return (
      <div className="mt-8 border border-line bg-surface" data-testid="personal-error">
        <EmptyState
          icono={TriangleAlert}
          titulo={TEXTOS.error.titulo}
          texto={TEXTOS.error.texto}
          accion={
            <Button
              variante="secondary"
              onClick={() => {
                this.setState({ fallo: false });
                this.props.reintentar?.();
              }}
            >
              Intentar de nuevo
            </Button>
          }
        />
      </div>
    );
  }
}
