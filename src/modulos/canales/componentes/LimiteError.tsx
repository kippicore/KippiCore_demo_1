import { TriangleAlert } from 'lucide-react';
import { Component, type ReactNode } from 'react';
import { Button, EmptyState } from '@/ui';
import { TEXTOS } from '../textos';

/** Si algo falla al calcular o pintar la vista, se muestra un estado de error con salida (nunca una pantalla en blanco). */
export class LimiteError extends Component<{ children: ReactNode }, { fallo: boolean }> {
  override state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  override render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <div className="mt-10 border border-line bg-surface" data-testid="canales-error">
        <EmptyState
          icono={TriangleAlert}
          titulo={TEXTOS.errores.titulo}
          texto={TEXTOS.errores.texto}
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
