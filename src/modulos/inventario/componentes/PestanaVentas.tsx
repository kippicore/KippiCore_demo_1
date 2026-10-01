import { Receipt } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Id, Producto } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useHoy, useSel } from '@/estado';
import { rutas } from '@/app/rutas';
import { entero, porcentaje } from '@/lib/formato';
import { BotonPildora, Dinero, EmptyState, Fecha, FranjaResumen, Select, SelectorRango, Table, textoRango, Toolbar, type ColumnaTabla, type RangoFechas } from '@/ui';
import { selVentasReferencia, type LineaVentaProducto } from '../selectores';
import { VACIOS } from '../textos';
import { useLocalesInventario } from './comun';

/** Ventas de la referencia (solo dueño): cada línea vendida o devuelta, con el local y la talla, y lo que dejó. */
export function PestanaVentas({ producto }: { producto: Producto }) {
  const hoy = useHoy();
  const locales = useLocalesInventario();
  const [rango, setRango] = useState<RangoFechas>({ desde: sumarDias(hoy, -90), hasta: hoy });
  const [localId, setLocalId] = useState<Id | 'todos'>('todos');
  const v = useSel(selVentasReferencia, { productoId: producto.id, desde: rango.desde, hasta: rango.hasta });
  const lineas = useMemo(() => (localId === 'todos' ? v.lineas : v.lineas.filter((l) => l.hecho.localId === localId)), [v.lineas, localId]);
  const unidades = lineas.reduce((a, l) => a + l.hecho.cantidad, 0);
  const base = lineas.reduce((a, l) => a + l.hecho.base, 0);
  const costo = lineas.reduce((a, l) => a + l.hecho.costo, 0);
  const mejorLocal = v.porLocal[0];

  const columnas: ColumnaTabla<LineaVentaProducto>[] = [
    { id: 'fecha', encabezado: 'Fecha y hora', ordenar: (l) => l.hecho.ts, celda: (l) => <Fecha valor={l.hecho.ts} formato="fechaHora" /> },
    {
      id: 'venta',
      encabezado: 'Venta',
      celda: (l) => (
        <Link to={rutas.venta(l.hecho.ventaId)} className="t-ref font-bold text-ink underline-offset-4 hover:underline">
          {l.numero}
        </Link>
      ),
    },
    {
      id: 'tipo',
      encabezado: 'Tipo',
      celda: (l) => (l.hecho.tipo === 'venta' ? 'Venta' : l.hecho.tipo === 'devolucion' ? 'Devolución' : 'Separado cancelado'),
    },
    { id: 'local', encabezado: 'Local', ordenar: (l) => l.local, celda: (l) => l.local },
    { id: 'variante', encabezado: 'Color y talla', celda: (l) => `${l.color} · ${l.talla}` },
    { id: 'cantidad', encabezado: 'Unidades', numerica: true, ordenar: (l) => l.hecho.cantidad, celda: (l) => entero(l.hecho.cantidad) },
    { id: 'total', encabezado: 'Valor (IVA incluido)', numerica: true, ordenar: (l) => l.hecho.total, celda: (l) => <Dinero valor={l.hecho.total} /> },
  ];

  return (
    <div data-testid="pestana-ventas">
      <FranjaResumen
        cifras={[
          { etiqueta: 'Unidades netas', valor: entero(unidades) },
          { etiqueta: 'Ventas sin IVA', valor: <Dinero valor={base} corta /> },
          { etiqueta: 'Margen de lo vendido', valor: base > 0 ? porcentaje((base - costo) / base, 0) : '—' },
          { etiqueta: 'Local que más vende', valor: <span className="t-kpi-sm">{mejorLocal?.nombre ?? '—'}</span> },
        ]}
      />
      <div className="mt-4">
        <Table
          columnas={columnas}
          filas={lineas}
          clave={(l) => `${l.hecho.ventaId}|${l.hecho.lineaId}|${l.hecho.tipo}`}
          sustantivo={['línea', 'líneas']}
          etiqueta={`Ventas de ${producto.referencia}`}
          vacio={<EmptyState tamano="tabla" icono={Receipt} titulo={VACIOS.ventasReferencia.titulo} texto={VACIOS.ventasReferencia.texto} />}
          totales={{ cantidad: entero(unidades), total: <Dinero valor={lineas.reduce((a, l) => a + l.hecho.total, 0)} /> }}
          data-testid="tabla-ventas-referencia"
          barra={
            <Toolbar
              filtros={
                <>
                  <BotonPildora etiqueta="Local" valor={localId === 'todos' ? 'Todos' : locales.find((l) => l.id === localId)?.nombre} anchoPanel={260}>
                    <Select
                      etiqueta="Local"
                      etiquetaOculta
                      valor={localId}
                      alCambiar={setLocalId}
                      opciones={[{ valor: 'todos', etiqueta: 'Todos los locales' }, ...locales.filter((l) => l.vende).map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
                    />
                  </BotonPildora>
                  <BotonPildora etiqueta="Fechas" valor={textoRango(rango, hoy)} anchoPanel={720}>
                    <SelectorRango soloPanel hoy={hoy} valor={rango} alCambiar={setRango} />
                  </BotonPildora>
                </>
              }
            />
          }
        />
      </div>
    </div>
  );
}
