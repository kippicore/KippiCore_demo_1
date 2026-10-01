import { TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Card, EmptyState } from '@/ui';
import { TXT } from '../textos';

/**
 * Cada bloque de Inicio va en su propia frontera de error: si uno falla, el resto de la pantalla sigue viva y el
 * bloque muestra un estado de error diseñado con "Intentar de nuevo" (DoD: vacío, carga y error).
 */
interface Props {
  nombre: string;
  titulo?: string;
  children: ReactNode;
  className?: string;
}

interface Estado {
  fallo: boolean;
}

export class SeccionSegura extends Component<Props, Estado> {
  override state: Estado = { fallo: false };

  static getDerivedStateFromError(): Estado {
    return { fallo: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`Inicio · ${this.props.nombre}:`, error.message, info.componentStack);
  }

  override render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <Card titulo={this.props.titulo} className={this.props.className} data-testid={`inicio-error-${this.props.nombre}`}>
        <EmptyState
          tamano="compacto"
          icono={TriangleAlert}
          titulo={TXT.error.titulo}
          texto={TXT.error.texto}
          accion={
            <Button variante="secondary" tamano="sm" onClick={() => this.setState({ fallo: false })}>
              {TXT.error.reintentar}
            </Button>
          }
        />
      </Card>
    );
  }
}
