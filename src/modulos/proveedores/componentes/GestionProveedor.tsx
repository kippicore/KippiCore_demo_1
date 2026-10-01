import { useCallback, useState, type ReactNode } from 'react';
import type { Proveedor } from '@/dominio/tipos';
import { useAcciones, useDinero } from '@/estado';
import { rutas } from '@/app/rutas';
import { plural } from '@/lib/formato';
import { ConfirmarEliminacion, avisar } from '@/ui';
import { FormularioProveedor } from './FormularioProveedor';

/**
 * Crear, editar y eliminar proveedores desde el directorio y desde la ficha: un solo lugar para los diálogos y
 * para la confirmación con consecuencias (con cifras) antes de eliminar.
 */
export interface ObjetivoEliminar {
  proveedor: Proveedor;
  saldoCop: number;
  pedidos: number;
  enCurso: number;
}

export function useGestionProveedor(opciones: { alGuardar?: (id: string, creado: boolean) => void; alEliminar?: (p: Proveedor) => void } = {}): {
  abrirNuevo: () => void;
  abrirEditar: (p: Proveedor) => void;
  pedirEliminar: (o: ObjetivoEliminar) => void;
  dialogos: ReactNode;
} {
  const acciones = useAcciones();
  const d = useDinero();
  const [formulario, setFormulario] = useState<{ proveedor: Proveedor | null } | null>(null);
  const [eliminar, setEliminar] = useState<ObjetivoEliminar | null>(null);
  const { alGuardar, alEliminar } = opciones;

  const abrirNuevo = useCallback(() => setFormulario({ proveedor: null }), []);
  const abrirEditar = useCallback((p: Proveedor) => setFormulario({ proveedor: p }), []);
  const pedirEliminar = useCallback((o: ObjetivoEliminar) => {
    if (o.enCurso > 0) {
      avisar({
        tipo: 'alerta',
        texto: `No puedes eliminar a ${o.proveedor.nombreCorto} todavía`,
        detalle: `Tiene ${plural(o.enCurso, 'importación', 'importaciones')} en curso. Cuando lleguen a la bodega podrás eliminarlo.`,
        accion: { texto: 'Ver importaciones', a: rutas.importaciones() },
      });
      return;
    }
    setEliminar(o);
  }, []);

  const confirmar = () => {
    if (!eliminar) return;
    const p = eliminar.proveedor;
    const r = acciones.eliminarProveedor({ proveedorId: p.id, motivo: null });
    setEliminar(null);
    if (!r.ok) {
      avisar({ tipo: 'error', texto: r.error.mensaje });
      return;
    }
    avisar({ tipo: 'exito', texto: `${p.nombreCorto} se eliminó del directorio` });
    alEliminar?.(p);
  };

  const consecuencias = eliminar ? (
    <>
      Dejará de aparecer en el directorio y en los filtros.
      {eliminar.pedidos > 0 && ` Sus ${plural(eliminar.pedidos, 'pedido')} se conservan en Importaciones.`}
      {eliminar.saldoCop > 0 && ` Ojo: todavía le debes ${d(eliminar.saldoCop)}; esa cuenta por pagar sigue en Pagos.`}
    </>
  ) : null;

  return {
    abrirNuevo,
    abrirEditar,
    pedirEliminar,
    dialogos: (
      <>
        <FormularioProveedor abierto={formulario !== null} alCambiar={(a) => !a && setFormulario(null)} proveedor={formulario?.proveedor ?? null} alGuardar={alGuardar} />
        <ConfirmarEliminacion
          abierto={eliminar !== null}
          alCambiar={(a) => !a && setEliminar(null)}
          pregunta={eliminar ? `¿Eliminar a ${eliminar.proveedor.nombreCorto}?` : ''}
          consecuencias={consecuencias}
          accion="Eliminar proveedor"
          alConfirmar={confirmar}
        />
      </>
    ),
  };
}
