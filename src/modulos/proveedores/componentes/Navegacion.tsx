import { rutas } from '@/app/rutas';
import { useMoneda } from '@/estado';
import { textoTasas } from '@/lib/moneda';
import { Pista, PestanasEnlace, Segmentado, Tooltip, useCambiarMoneda } from '@/ui';

/** Pestañas del módulo (directorio y comparativo) y, a la derecha, la moneda en la que se ven las cifras (W7). */
export function NavegacionProveedores({ conMoneda = true }: { conMoneda?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <PestanasEnlace
        etiqueta="Proveedores"
        className="min-w-0"
        pestanas={[
          { a: rutas.proveedores(), etiqueta: 'Directorio', fin: true },
          { a: rutas.comparativoFabricas(), etiqueta: 'Comparativo de fábricas' },
        ]}
      />
      {conMoneda && <ControlMoneda />}
    </div>
  );
}

/**
 * Selector de la moneda de las cifras. Tus fábricas cobran en dólares y yuanes: desde aquí se ven los saldos y las
 * compras en US$ o CN¥ (mismo estado que el selector de la barra superior). Aquí va la pista `proveedores.moneda`.
 */
export function ControlMoneda() {
  const { moneda } = useMoneda();
  const cambiar = useCambiarMoneda();
  return (
    <Pista id="proveedores.moneda" lado="abajo" alinear="fin" className="pb-2">
      <div className="flex items-center gap-3">
        <span className="t-small text-muted">Ver cifras en</span>
        <Tooltip texto={`${textoTasas()} · cambiar en Configuración`}>
          <span>
            <Segmentado
              tamano="sm"
              etiqueta="Moneda de las cifras"
              data-testid="proveedores-moneda"
              valor={moneda}
              alCambiar={(m) => m !== moneda && cambiar(m)}
              opciones={[
                { valor: 'COP', etiqueta: 'Pesos', 'data-testid': 'proveedores-moneda-COP' },
                { valor: 'USD', etiqueta: 'Dólares', 'data-testid': 'proveedores-moneda-USD' },
                { valor: 'CNY', etiqueta: 'Yuanes', 'data-testid': 'proveedores-moneda-CNY' },
              ]}
            />
          </span>
        </Tooltip>
      </div>
    </Pista>
  );
}
