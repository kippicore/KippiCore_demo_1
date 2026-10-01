import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button, EmptyState, EncabezadoPagina, PestanasEnlace } from '@/ui';
import { rutas } from '@/app/rutas';
import { pestanasPersonal } from '@/modulos/personal/publico';

export type SeccionTurnos = 'turnos' | 'asistencia' | 'novedades';

export interface PropsEncabezadoTurnos {
  seccion: SeccionTurnos;
  titulo: string;
  subtitulo: string;
  acciones?: ReactNode;
  /** Se conservan al saltar entre pestañas. */
  local?: string | null;
}

const NOMBRES: Record<SeccionTurnos, string> = {
  turnos: 'Turnos',
  asistencia: 'Asistencia',
  novedades: 'Novedades',
};

/** Encabezado común de las tres pantallas del dueño: migas y las pestañas del módulo. */
export function EncabezadoTurnos({ seccion, titulo, subtitulo, acciones, local }: PropsEncabezadoTurnos) {
  return (
    <EncabezadoPagina
      migas={[
        { texto: 'Inicio', a: rutas.inicio() },
        { texto: 'Personal y nómina', a: rutas.personal() },
        { texto: NOMBRES[seccion] },
      ]}
      titulo={titulo}
      subtitulo={subtitulo}
      acciones={acciones}
      pestanas={
        <PestanasEnlace etiqueta="Secciones de personal y nómina" pestanas={pestanasPersonal(local ?? null)} />
      }
    />
  );
}

interface EstadoLimite {
  fallo: boolean;
}

/** Si un cálculo falla, la pantalla muestra un estado de error diseñado en vez de quedarse en blanco. */
export class LimiteError extends Component<{ children: ReactNode; testid?: string }, EstadoLimite> {
  override state: EstadoLimite = { fallo: false };

  static getDerivedStateFromError(): EstadoLimite {
    return { fallo: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[C2] No se pudo mostrar la sección', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.fallo) return this.props.children;
    return (
      <div className="mt-8 border border-line bg-surface" data-testid={this.props.testid ?? 'turnos-error'}>
        <EmptyState
          icono={TriangleAlert}
          titulo="No pudimos armar esta sección"
          texto="Algo falló al calcular estas cifras. Tus datos están intactos: intenta de nuevo."
          accion={
            <Button variante="secondary" onClick={() => this.setState({ fallo: false })}>
              Intentar de nuevo
            </Button>
          }
        />
      </div>
    );
  }
}
