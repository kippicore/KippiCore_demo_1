import { TriangleAlert } from 'lucide-react';
import { Component, type ReactNode } from 'react';
import { Button, EmptyState } from '@/ui';

/** Si algo falla al calcular o pintar la pantalla, se muestra un estado de error con salida (nunca una pantalla en blanco). */
interface Props {
  titulo: string;
  texto: string;
  children: ReactNode;
}

export class LimiteError extends Component<Props, { fallo: boolean }> {
  override state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  override render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <div className="mt-10 border border-line bg-surface" data-testid="clientes-error">
        <EmptyState
          icono={TriangleAlert}
          titulo={this.props.titulo}
          texto={this.props.texto}
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
