import { useState } from 'react';
import type { Id, Producto } from '@/dominio/tipos';
import { useAcciones, useSel } from '@/estado';
import { CURVAS_TALLAS } from '@/seed/tallas';
import { avisar, Button, Dialog, Select } from '@/ui';
import { selColoresActivos, selVariantesDetalle } from '../selectores';

/** Agrega una talla en un color a una referencia; el SKU y el código de barras EAN-13 salen solos. */
export function DialogoVariante(props: { producto: Producto; abierto: boolean; alCambiar: (a: boolean) => void }) {
  return props.abierto ? <CuerpoVariante {...props} /> : null;
}

function CuerpoVariante({ producto, abierto, alCambiar }: { producto: Producto; abierto: boolean; alCambiar: (a: boolean) => void }) {
  const acciones = useAcciones();
  const colores = useSel(selColoresActivos);
  const existentes = useSel(selVariantesDetalle, { productoId: producto.id });
  const [colorId, setColorId] = useState<Id | ''>('');
  const [talla, setTalla] = useState('');
  const [error, setError] = useState<string | null>(null);

  const usadas = new Set(existentes.filter((f) => f.color.id === colorId).map((f) => f.variante.talla));
  const tallasLibres = CURVAS_TALLAS[producto.curvaTallas].filter((t) => !usadas.has(t));

  const agregar = () => {
    if (!colorId || !talla) return;
    const r = acciones.agregarVariante({ productoId: producto.id, talla, colorId });
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    const color = colores.find((c) => c.id === colorId);
    alCambiar(false);
    avisar({ tipo: 'exito', texto: `Variante agregada: ${color?.nombre ?? ''} · talla ${talla}`, detalle: 'Ya tiene su SKU y su código de barras.' });
  };

  return (
    <Dialog
      abierto={abierto}
      alCambiar={alCambiar}
      eyebrow={producto.referencia}
      titulo="Agregar variante"
      descripcion="Una talla en un color que todavía no tiene esta referencia."
      ancho="sm"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={agregar} disabled={!colorId || !talla} data-testid="variante-confirmar">
            Agregar variante
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          etiqueta="Color"
          valor={colorId || null}
          alCambiar={(c) => {
            setColorId(c);
            setTalla('');
            setError(null);
          }}
          opciones={colores.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
          placeholder="Elige el color"
          enModal
          data-testid="variante-color"
        />
        <Select
          etiqueta="Talla"
          valor={talla || null}
          alCambiar={setTalla}
          opciones={tallasLibres.map((t) => ({ valor: t, etiqueta: t }))}
          placeholder={colorId ? (tallasLibres.length ? 'Elige la talla' : 'Ya tiene todas las tallas') : 'Primero el color'}
          deshabilitado={!colorId || tallasLibres.length === 0}
          enModal
          error={error ?? undefined}
          data-testid="variante-talla"
        />
      </div>
    </Dialog>
  );
}
