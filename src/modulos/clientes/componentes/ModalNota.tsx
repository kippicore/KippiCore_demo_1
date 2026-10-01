import { useState } from 'react';
import type { Id } from '@/dominio/tipos';
import { useAcciones } from '@/estado';
import { avisar, Button, Dialog, Textarea } from '@/ui';

/** Agrega una nota a la ficha (`agregarNotaCliente`). */
export function ModalNota({ clienteId, nombre, alCerrar }: { clienteId: Id; nombre: string; alCerrar: () => void }) {
  const acciones = useAcciones();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    const r = acciones.agregarNotaCliente({ clienteId, texto });
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    avisar({ tipo: 'exito', texto: 'Nota guardada', detalle: `Quedó en la ficha de ${nombre}.` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      ancho="md"
      eyebrow={nombre}
      titulo="Agregar nota"
      descripcion="Anota lo que no se ve en las ventas: una preferencia, una talla que cambió, un encargo."
      confirmarAlCerrar={texto.trim().length > 0}
      data-testid="modal-nota"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="nota-guardar">
            Guardar nota
          </Button>
        </>
      }
    >
      <Textarea
        etiqueta="Nota"
        rows={5}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setError(null);
        }}
        error={error}
        placeholder="Por ejemplo: prefiere camisas sin bolsillo y le gusta que lo llamen por la tarde."
        data-testid="nota-texto"
      />
    </Dialog>
  );
}
