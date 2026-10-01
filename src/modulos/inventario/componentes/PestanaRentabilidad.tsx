import { TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Producto } from '@/dominio/tipos';
import { margenBruto, precioSugerido } from '@/dominio/reglas/costeo';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useAcciones, useDinero, useHoy, useSel } from '@/estado';
import { selMargenProducto } from '@/selectores';
import { rutas } from '@/app/rutas';
import { mesCorto, porcentaje } from '@/lib/formato';
import { avisar, Button, Card, Dinero, EmptyState, Fecha, FranjaResumen, GraficoCascada, GraficoDinero, InputNumero, Table, type ColumnaTabla } from '@/ui';
import { ultimoCambioDeCosto } from '../calculos';
import { selHistorialCosto, selVentasReferencia, type FilaHistorialCosto } from '../selectores';
import { METODO_COSTO } from '../textos';

/**
 * Rentabilidad de la referencia (solo dueño). El margen sale del `costoVigente` (el que deja "Aplicar al
 * inventario" de las importaciones) y se nombra el método. Si el costo subió, dice cuánto cayó el margen y a qué
 * precio hay que venderla para recuperarlo.
 */
export function PestanaRentabilidad({ producto }: { producto: Producto }) {
  const hoy = useHoy();
  const d = useDinero();
  const acciones = useAcciones();
  const m = useSel(selMargenProducto, { productoId: producto.id });
  const historial = useSel(selHistorialCosto, { productoId: producto.id });
  const ventas = useSel(selVentasReferencia, { productoId: producto.id, desde: sumarDias(hoy, -365), hasta: hoy });
  const cambio = useMemo(() => ultimoCambioDeCosto([...historial].reverse()), [historial]);
  const margenAnterior = cambio ? margenBruto(producto.precioVenta, producto.tarifaIva, cambio.costoAnterior) : null;
  const [objetivo, setObjetivo] = useState<number | null>(() => Math.round((margenAnterior ?? m?.margenPct ?? 0.6) * 100));

  if (!m) return null;
  if (producto.costoVigente <= 0)
    return (
      <EmptyState
        icono={TrendingUp}
        titulo="Esta referencia todavía no tiene costo"
        texto="El costo llega cuando aplicas una importación al inventario, o puedes escribirlo en la pestaña Editar. Sin costo no se puede calcular el margen."
      />
    );

  const sugerido = objetivo && objetivo > 0 && objetivo < 95 ? precioSugerido(producto.costoVigente, objetivo / 100, producto.tarifaIva) : null;
  const margenConSugerido = sugerido ? margenBruto(sugerido, producto.tarifaIva, producto.costoVigente) : null;

  const aplicar = () => {
    if (!sugerido) return;
    const r = acciones.editarProducto({ productoId: producto.id, cambios: { precioVenta: sugerido } });
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ tipo: 'exito', texto: 'Precio actualizado', detalle: `${producto.nombre} ahora cuesta ${d(sugerido)}.` });
  };

  const columnas: ColumnaTabla<FilaHistorialCosto>[] = [
    { id: 'fecha', encabezado: 'Desde', ordenar: (h) => h.fecha, celda: (h) => <Fecha valor={h.fecha} /> },
    { id: 'costo', encabezado: 'Costo por prenda', numerica: true, ordenar: (h) => h.costo, celda: (h) => <Dinero valor={h.costo} /> },
    {
      id: 'origen',
      encabezado: 'Lo fijó',
      celda: (h) =>
        h.importacion ? (
          <Link to={rutas.importacion(h.importacion)} className="font-semibold text-ink underline-offset-4 hover:underline">
            Importación {h.importacion}
          </Link>
        ) : (
          'Ajuste manual'
        ),
    },
  ];

  const meses = ventas.porMes.map((x) => ({ mes: x.mes, base: x.base, costo: x.costo }));

  return (
    <div className="space-y-10" data-testid="pestana-rentabilidad">
      <FranjaResumen
        cifras={[
          { etiqueta: 'Precio con IVA', valor: <Dinero valor={m.precio} /> },
          { etiqueta: 'Costo vigente', valor: <Dinero valor={m.costo} /> },
          { etiqueta: 'Margen por prenda', valor: <Dinero valor={m.margen} /> },
          { etiqueta: 'Margen sobre el precio sin IVA', valor: <span data-testid="margen-pct">{porcentaje(m.margenPct, 0)}</span> },
        ]}
      />
      <p className="-mt-6 t-small text-muted" data-testid="metodo-costo">
        {METODO_COSTO}.
      </p>

      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-12 xl:col-span-7" titulo="De lo que paga el cliente a lo que te queda">
          <GraficoCascada
            formato={(n) => d.corta(n)}
            pasos={[
              { etiqueta: 'Precio con IVA', valor: m.precio, total: true },
              { etiqueta: 'IVA', valor: -(m.precio - m.base) },
              { etiqueta: 'Costo', valor: -m.costo },
              { etiqueta: 'Margen', valor: m.margen, total: true },
            ]}
          />
        </Card>

        <Card className="col-span-12 xl:col-span-5" titulo="¿A cuánto la vendo?" data-testid="precio-sugerido">
          {cambio && margenAnterior !== null && (
            <p className="mb-4 t-body text-ink" data-testid="cambio-costo">
              El costo pasó de <strong className="font-bold"><Dinero valor={cambio.costoAnterior} /></strong> a <strong className="font-bold"><Dinero valor={cambio.costoActual} /></strong> (
              {cambio.variacion > 0 ? 'subió' : 'bajó'} {porcentaje(Math.abs(cambio.variacion), 0)}). Tu margen era {porcentaje(margenAnterior, 0)} y hoy es {porcentaje(m.margenPct, 0)}.
            </p>
          )}
          <div className="flex items-end gap-3">
            <InputNumero etiqueta="Margen que quieres" sufijo="%" valor={objetivo} alCambiar={setObjetivo} className="w-40" data-testid="margen-objetivo" />
          </div>
          {sugerido ? (
            <div className="mt-4 border border-line bg-surface-2 p-4">
              <p className="t-small text-muted">Precio sugerido para mantener {objetivo} %</p>
              <p className="mt-1 t-kpi-sm num text-ink" data-testid="precio-sugerido-valor">
                <Dinero valor={sugerido} />
              </p>
              <p className="mt-1 t-small text-muted">
                {sugerido === producto.precioVenta
                  ? 'Es el precio que ya tiene.'
                  : `Hoy cuesta ${d(producto.precioVenta)}; con el precio sugerido el margen sería ${porcentaje(margenConSugerido ?? 0, 0)}. Termina en ,900 como el resto de la tienda.`}
              </p>
              <Button className="mt-3" tamano="sm" onClick={aplicar} disabled={sugerido === producto.precioVenta} data-testid="aplicar-precio">
                Aplicar a la referencia
              </Button>
            </div>
          ) : (
            <p className="mt-4 t-small text-muted">Escribe un margen entre 1 y 94 para ver el precio.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-12 xl:col-span-7" titulo="Ventas y costo de lo vendido, mes a mes">
          {meses.length > 0 ? (
            <GraficoDinero
              tipo="barras"
              datos={meses}
              x="mes"
              formatoX={(x) => mesCorto(x)}
              series={[
                { clave: 'base', nombre: 'Ventas sin IVA', color: 1 },
                { clave: 'costo', nombre: 'Costo de lo vendido', color: 3 },
              ]}
              alto={220}
              lectura={`En los últimos 12 meses dejó un margen de ${porcentaje(ventas.margenPct, 0)} sobre lo vendido sin IVA.`}
            />
          ) : (
            <p className="t-body text-muted">Todavía no hay ventas de esta referencia en los últimos 12 meses.</p>
          )}
        </Card>
        <div className="col-span-12 xl:col-span-5">
          <h3 className="mb-3 t-h3 text-ink">Historial del costo</h3>
          <Table columnas={columnas} filas={historial} clave={(h) => `${h.fecha}|${h.costo}`} porPagina={0} sustantivo={['cambio', 'cambios']} etiqueta="Historial del costo" data-testid="historial-costo" />
        </div>
      </div>
    </div>
  );
}
