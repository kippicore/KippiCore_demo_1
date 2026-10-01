import { Printer, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Producto } from '@/dominio/tipos';
import { useHoy } from '@/estado';
import { rutas } from '@/app/rutas';
import { entero, relativaDias } from '@/lib/formato';
import { BotonAccionesFila, CodigoBarras, ItemMenu, Menu, MuestraColor, Table, type ColumnaTabla } from '@/ui';
import type { FilaVariante } from '../selectores';

/**
 * Variantes de la referencia con su SKU y su código de barras EAN-13 (vectorial, nítido en pantalla y en el PDF).
 * La acción de eliminar solo se ofrece sin existencias; el dominio lo vuelve a verificar.
 */
export interface PropsTablaVariantes {
  producto: Producto;
  filas: readonly FilaVariante[];
  puedeEditar: boolean;
  alAjustar: (varianteId: string) => void;
  alEliminar: (fila: FilaVariante) => void;
}

export function TablaVariantes({ producto, filas, puedeEditar, alAjustar, alEliminar }: PropsTablaVariantes) {
  const navegar = useNavigate();
  const hoy = useHoy();
  const columnas: ColumnaTabla<FilaVariante>[] = [
    {
      id: 'variante',
      encabezado: 'Color y talla',
      ordenar: (f) => `${f.color.nombre} ${f.variante.talla}`,
      celda: (f) => (
        <span className="inline-flex items-center gap-2.5">
          <MuestraColor hex={f.color.hex} nombre={f.color.nombre} patron={f.color.patron} tamano={16} />
          <span>
            {f.color.nombre} · <strong className="font-semibold">{f.variante.talla}</strong>
          </span>
        </span>
      ),
    },
    { id: 'sku', encabezado: 'SKU', celda: (f) => <span className="t-ref">{f.variante.sku}</span> },
    { id: 'ean', encabezado: 'Código de barras EAN-13', celda: (f) => <CodigoBarras ean={f.variante.ean13} alto={30} ancho={1.05} copiable /> },
    { id: 'existencias', encabezado: 'Existencias', numerica: true, ordenar: (f) => f.total, celda: (f) => <strong className="font-bold">{entero(f.total)}</strong> },
    {
      id: 'camino',
      encabezado: 'En camino',
      numerica: true,
      celda: (f) =>
        f.enCamino ? (
          <span title={`${f.enCamino.numero} · llegan ${relativaDias(f.enCamino.fechaEstimada, hoy)}`}>{entero(f.enCamino.unidades)}</span>
        ) : (
          <span className="text-disabled">—</span>
        ),
    },
  ];
  return (
    <Table
      columnas={columnas}
      filas={filas}
      clave={(f) => f.variante.id}
      sustantivo={['variante', 'variantes']}
      etiqueta={`Variantes de ${producto.referencia}`}
      porPagina={0}
      densidad="comoda"
      data-testid="tabla-variantes"
      accionesFila={(f) => (
        <Menu etiqueta={`Acciones de ${f.variante.sku}`} disparador={<BotonAccionesFila aria-label={`Acciones de ${f.variante.sku}`} />}>
          {puedeEditar && (
            <ItemMenu icono={SlidersHorizontal} onSelect={() => alAjustar(f.variante.id)}>
              Ajustar existencias
            </ItemMenu>
          )}
          <ItemMenu icono={Printer} onSelect={() => navegar(rutas.etiquetas({ producto: producto.referencia }))}>
            Imprimir etiqueta
          </ItemMenu>
          {puedeEditar && (
            <ItemMenu icono={Trash2} peligro deshabilitado={f.total > 0 || !!f.enCamino} onSelect={() => alEliminar(f)}>
              {f.total > 0 ? 'Eliminar (tiene existencias)' : 'Eliminar variante'}
            </ItemMenu>
          )}
        </Menu>
      )}
    />
  );
}
