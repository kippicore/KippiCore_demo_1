import { useState, type ReactNode } from 'react';
import type { Descuento } from '@/dominio/tipos';
import { Button, InputNumero, Popover, Segmentado } from '@/ui';

/**
 * Descuento por línea o global (% o valor). Se escribe el porcentaje como número ("15" o "7,5") y se guarda como
 * fracción (0,15) como espera el dominio; el valor va en pesos. "Quitar" deja la línea sin descuento.
 *
 *   <PopoverDescuento titulo="Descuento de la línea" valor={l.descuento} alAplicar={(d) => …} disparador={<BotonIcono … />} />
 */
export interface PropsPopoverDescuento {
  titulo: string;
  valor: Descuento | null;
  alAplicar: (d: Descuento | null) => void;
  disparador: ReactNode;
  /** Base sobre la que se calcula (para el aviso "= $ 20.000"). Opcional. */
  ayuda?: ReactNode;
}

export function PopoverDescuento({ titulo, valor, alAplicar, disparador, ayuda }: PropsPopoverDescuento) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<'porcentaje' | 'valor'>(valor?.tipo ?? 'porcentaje');
  const [texto, setTexto] = useState<number | null>(valor ? (valor.tipo === 'porcentaje' ? Math.round(valor.valor * 1000) / 10 : valor.valor) : null);
  const invalido = texto !== null && (texto < 0 || (tipo === 'porcentaje' && texto > 100));
  const aplicar = () => {
    if (texto === null || texto === 0) alAplicar(null);
    else alAplicar({ tipo, valor: tipo === 'porcentaje' ? texto / 100 : texto });
    setAbierto(false);
  };
  return (
    <Popover
      abierto={abierto}
      alCambiar={(a) => {
        if (a) {
          setTipo(valor?.tipo ?? 'porcentaje');
          setTexto(valor ? (valor.tipo === 'porcentaje' ? Math.round(valor.valor * 1000) / 10 : valor.valor) : null);
        }
        setAbierto(a);
      }}
      titulo={titulo}
      ancho={272}
      alinear="end"
      disparador={disparador}
      etiqueta={titulo}
    >
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!invalido) aplicar();
        }}
        className="flex flex-col gap-3"
        data-testid="pos-form-descuento"
      >
        <Segmentado
          etiqueta="Tipo de descuento"
          valor={tipo}
          alCambiar={(t) => {
            setTipo(t);
            setTexto(null);
          }}
          opciones={[
            { valor: 'porcentaje', etiqueta: 'Porcentaje' },
            { valor: 'valor', etiqueta: 'Valor en pesos' },
          ]}
        />
        <InputNumero
          etiqueta={tipo === 'porcentaje' ? 'Porcentaje' : 'Valor del descuento'}
          etiquetaOculta
          valor={texto}
          alCambiar={setTexto}
          decimales={tipo === 'porcentaje' ? 1 : 0}
          prefijo={tipo === 'valor' ? '$' : undefined}
          sufijo={tipo === 'porcentaje' ? '%' : undefined}
          placeholder={tipo === 'porcentaje' ? 'Ej. 10' : 'Ej. 20.000'}
          error={invalido ? (tipo === 'porcentaje' ? 'Escribe un porcentaje entre 0 y 100.' : 'El valor no puede ser negativo.') : undefined}
          data-testid="pos-descuento-valor"
        />
        {ayuda && <p className="t-small text-muted">{ayuda}</p>}
        <div className="flex items-center justify-between gap-2">
          <Button
            variante="ghost"
            tamano="sm"
            disabled={!valor}
            onClick={() => {
              alAplicar(null);
              setAbierto(false);
            }}
          >
            Quitar
          </Button>
          <Button type="submit" tamano="sm" disabled={invalido} data-testid="pos-descuento-aplicar">
            Aplicar
          </Button>
        </div>
      </form>
    </Popover>
  );
}
