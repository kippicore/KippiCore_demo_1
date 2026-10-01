import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button, Dinero, EmptyState, EncabezadoPagina, Pista, PestanasEnlace, Select } from '@/ui';
import type { MesISO } from '@/dominio/tipos';
import { mesAnio } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import { mesesHasta, type Frase } from '../calculos';

// ---------------------------------------------------------------------------------------------------------
// Frase con cifras
// ---------------------------------------------------------------------------------------------------------
/** Pinta una frase del cálculo: texto, dinero en la moneda activa y énfasis. */
export function FraseVista({ frase, className }: { frase: Frase; className?: string }) {
  return (
    <p className={className}>
      {frase.map((s, i) => {
        if (typeof s === 'string') return <Fragment key={i}>{s}</Fragment>;
        if ('dinero' in s) return <Dinero key={i} valor={s.dinero} corta className={'enfasis' in s ? 'font-bold text-ink' : undefined} />;
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
// Selector de mes
// ---------------------------------------------------------------------------------------------------------
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Los últimos 19 meses (desde marzo de 2025 en la demo) hasta el mes en curso. */
export function SelectorMes({ hoy, valor, alCambiar, etiqueta = 'Mes', className }: { hoy: string; valor: MesISO; alCambiar: (m: MesISO) => void; etiqueta?: string; className?: string }) {
  const meses = mesesHasta(hoy, 19);
  const opciones = (meses.includes(valor) ? meses : [valor, ...meses]).map((m) => ({ valor: m, etiqueta: mayuscula(mesAnio(m)) }));
  return <Select etiqueta={etiqueta} valor={valor} alCambiar={(v) => alCambiar(v)} opciones={opciones} className={className} data-testid="gastos-selector-mes" />;
}

// ---------------------------------------------------------------------------------------------------------
// Encabezado común de las cuatro pantallas
// ---------------------------------------------------------------------------------------------------------
export interface PropsEncabezadoGastos {
  titulo: string;
  subtitulo: string;
  acciones?: ReactNode;
  /** Se conservan al saltar entre pestañas del módulo. */
  mes?: MesISO;
  local?: string | null;
  migaFinal?: string;
}

/** Encabezado con las pestañas del módulo; la pista "Estado de resultados" vive sobre su pestaña (CONTRATOS 10). */
export function EncabezadoGastos({ titulo, subtitulo, acciones, mes, local, migaFinal }: PropsEncabezadoGastos) {
  const q = { mes, local: local ?? null };
  const pestanaResultados = (
    // La pista es un botón dentro de un enlace: su clic abre el globo y no navega. El span solo intercepta ese clic
    // (el teclado ya llega al botón de la pista y al enlace por separado).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <span
      className="inline-flex"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-testid^="pista-"], [role="dialog"]')) e.preventDefault();
      }}
    >
      <Pista id="gastos.resultados" alinear="inicio">
        Estado de resultados
      </Pista>
    </span>
  );
  return (
    <EncabezadoPagina
      migas={[{ texto: 'Inicio', a: rutas.inicio() }, ...(migaFinal ? [{ texto: 'Costos y gastos', a: rutas.gastos() }, { texto: migaFinal }] : [{ texto: 'Costos y gastos' }])]}
      titulo={titulo}
      subtitulo={subtitulo}
      acciones={acciones}
      pestanas={
        <PestanasEnlace
          etiqueta="Secciones de costos y gastos"
          pestanas={[
            { a: rutas.gastos({ mes: q.mes, local: q.local }), etiqueta: 'Gastos', fin: true },
            { a: rutas.gastosRecurrentes(), etiqueta: 'Recurrentes' },
            { a: rutas.estadoResultados({ mes: q.mes, local: q.local === 'general' ? null : q.local }), etiqueta: pestanaResultados },
            { a: rutas.puntoEquilibrio({ mes: q.mes, local: q.local === 'general' ? null : q.local }), etiqueta: 'Punto de equilibrio' },
          ]}
        />
      }
    />
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
    console.error('[B4] No se pudo mostrar la sección', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.fallo) return this.props.children;
    return (
      <div className="mt-8 border border-line bg-surface" data-testid="gastos-error">
        <EmptyState
          icono={TriangleAlert}
          titulo="No pudimos armar esta sección"
          texto="Algo falló al calcular estas cifras. Tus datos están intactos: intenta de nuevo."
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
