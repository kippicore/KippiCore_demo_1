import { useState } from 'react';
import type { Id } from '@/dominio/tipos';
import { BASE_CAJA } from '@/config/negocio';
import { useAcciones, useEstadoDominio } from '@/estado';
import { dinero } from '@/lib/formato';
import { Button, Dialog, InputNumero, avisar } from '@/ui';

/**
 * Apertura de caja (PRD 7.2): la base inicial con la que arranca el efectivo del local ese día. Se usa en el POS
 * ("si se cobra en efectivo sin caja abierta, se ofrece abrirla en el mismo flujo") y en la pantalla de Caja.
 */
export interface PropsDialogoAbrirCaja {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  localId: Id;
  alAbrir?: () => void;
}

export function DialogoAbrirCaja({ abierto, alCambiar, localId, alAbrir }: PropsDialogoAbrirCaja) {
  const e = useEstadoDominio();
  const acciones = useAcciones();
  const [base, setBase] = useState<number | null>(BASE_CAJA);
  const [error, setError] = useState<string | null>(null);
  const local = e.locales[localId]?.nombre ?? 'el local';
  const abrir = () => {
    if (base === null || base < 0) return setError('Escribe la base con la que arranca la caja.');
    const r = acciones.abrirCaja({ localId, baseInicial: base, por: null });
    if (!r.ok) return setError(r.error.mensaje);
    setError(null);
    avisar({ tipo: 'exito', texto: `Caja de ${local} abierta`, detalle: 'Ya puedes recibir efectivo.' });
    alCambiar(false);
    alAbrir?.();
  };
  return (
    <Dialog
      abierto={abierto}
      alCambiar={(a) => {
        if (a) {
          setBase(BASE_CAJA);
          setError(null);
        }
        alCambiar(a);
      }}
      eyebrow="Caja"
      titulo={`Abrir la caja de ${local}`}
      descripcion="La base es el efectivo con el que arranca la caja hoy. Al cerrar, el conteo se compara con la base más el efectivo de las ventas, menos los egresos."
      ancho="sm"
      data-testid="pos-dialogo-abrir-caja"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={abrir} data-testid="pos-abrir-caja-confirmar">
            Abrir caja
          </Button>
        </>
      }
    >
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          abrir();
        }}
      >
        <InputNumero etiqueta="Base inicial" prefijo="$" sufijo="COP" valor={base} alCambiar={setBase} error={error ?? undefined} ayuda={`Lo habitual: ${dinero(BASE_CAJA, 'COP')} de cambio.`} data-testid="pos-base-inicial" />
      </form>
    </Dialog>
  );
}
