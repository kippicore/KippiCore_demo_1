import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { TriangleAlert } from 'lucide-react';
import { Badge, Button, EmptyState, EncabezadoPagina, Icono, cn } from '@/ui';
import { rutas } from '@/app/rutas';
import { SECCIONES, type SeccionId } from '../textos';

/** Marco común de las pantallas de Configuración: encabezado con migas y navegación lateral entre secciones. */
export function MarcoConfiguracion({
  seccion,
  titulo,
  subtitulo,
  insignia,
  acciones,
  children,
}: {
  seccion: SeccionId;
  titulo: string;
  subtitulo: ReactNode;
  insignia?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Configuración', a: rutas.configuracion() }, { texto: titulo }]}
        titulo={titulo}
        insignia={insignia}
        subtitulo={subtitulo}
        acciones={acciones}
      />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-12">
        <NavegacionConfiguracion actual={seccion} />
        <div className="min-w-0" data-testid={`config-${seccion}`}>
          <LimiteError>{children}</LimiteError>
        </div>
      </div>
    </>
  );
}

function NavegacionConfiguracion({ actual }: { actual: SeccionId }) {
  return (
    <nav aria-label="Secciones de configuración" data-testid="config-nav" className="lg:sticky lg:top-(--sticky-top) lg:self-start">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
        {SECCIONES.map((s) => {
          const activa = s.id === actual;
          return (
            <li key={s.id} className="shrink-0">
              <Link
                to={s.a}
                aria-current={activa ? 'page' : undefined}
                data-testid={`config-nav-${s.id}`}
                className={cn(
                  'flex h-10 items-center gap-3 border-l-2 px-3 t-nav whitespace-nowrap transition-colors duration-(--dur-instant) outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus',
                  activa ? 'border-ink bg-selected font-bold text-ink' : 'border-transparent text-ink-2 hover:bg-selected/60 hover:text-ink',
                )}
              >
                <Icono icono={s.icono} tamano={16} />
                {s.corto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Si algo se rompe dentro de una sección, el resto de la configuración sigue a la mano. */
export class LimiteError extends Component<{ children: ReactNode }, { error: boolean }> {
  override state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Configuración: error de pantalla', error.message, info.componentStack);
  }
  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <EmptyState
        icono={TriangleAlert}
        titulo="No pudimos mostrar esta sección"
        texto="Tus datos están a salvo. Vuelve a intentarlo o entra a otra sección."
        accion={
          <Button variante="secondary" onClick={() => this.setState({ error: false })}>
            Intentar de nuevo
          </Button>
        }
      />
    );
  }
}

/** Insignia "Valor ilustrativo · verificar" (nómina, impuestos) o "Valor de ejemplo · …" (aduanas). */
export function InsigniaVerificar({ texto, className }: { texto: string; className?: string }) {
  return (
    <Badge tono="warning" tamano="sm" className={className}>
      {texto}
    </Badge>
  );
}
