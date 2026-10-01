import { useState } from 'react';
import type { Cliente } from '@/dominio/tipos';
import { useAcciones } from '@/estado';
import { avisar, Button, Dialog, Input } from '@/ui';
import { TIPOS_TALLA, type ClaveTalla, type FilaTalla } from '../reglas';

/**
 * Tallas declaradas (editables). Las que se derivan de lo que compra no se tocan: se muestran como ayuda debajo de
 * cada campo, y la declarada manda cuando existe.
 */
export function ModalTallas({ cliente, tallas, alCerrar }: { cliente: Cliente; tallas: readonly FilaTalla[]; alCerrar: () => void }) {
  const acciones = useAcciones();
  const [valores, setValores] = useState<Record<ClaveTalla, string>>({
    camisa: cliente.tallasDeclaradas.camisa ?? '',
    pantalon: cliente.tallasDeclaradas.pantalon ?? '',
    blazer: cliente.tallasDeclaradas.blazer ?? '',
    calzado: cliente.tallasDeclaradas.calzado ?? '',
  });
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    const tallasDeclaradas: Cliente['tallasDeclaradas'] = {};
    for (const t of TIPOS_TALLA) if (valores[t.clave].trim()) tallasDeclaradas[t.clave] = valores[t.clave].trim();
    const r = acciones.editarCliente({ clienteId: cliente.id, cambios: { tallasDeclaradas } });
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    avisar({ tipo: 'exito', texto: 'Tallas guardadas', detalle: `Actualizamos las tallas de ${cliente.nombres}.` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      ancho="md"
      eyebrow={`${cliente.nombres} ${cliente.apellidos}`}
      titulo="Tallas declaradas"
      descripcion="Escribe las que él dice o las que le hayas tomado. Si dejas un campo vacío, usamos la que más ha comprado."
      data-testid="modal-tallas"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="tallas-guardar">
            Guardar tallas
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {tallas.map((t) => (
          <Input
            key={t.clave}
            etiqueta={t.etiqueta}
            opcional
            value={valores[t.clave]}
            onChange={(e) => {
              setValores((v) => ({ ...v, [t.clave]: e.target.value.toUpperCase().slice(0, 4) }));
              setError(null);
            }}
            ayuda={t.derivada ? `Según sus compras: ${t.derivada}` : 'Aún no hay compras de esta prenda'}
            autoComplete="off"
            data-testid={`talla-${t.clave}`}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-4 t-small text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
