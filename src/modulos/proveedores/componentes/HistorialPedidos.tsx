import { PackageOpen } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { ETIQUETAS_ESTADO_IMPORTACION } from '@/config/aduanas';
import { TONO_ESTADO_IMPORTACION } from '@/config/estados';
import { rutas } from '@/app/rutas';
import { entero, porcentaje } from '@/lib/formato';
import { dineroOrigen } from '@/lib/moneda';
import type { FilaImportacion } from '@/selectores';
import { Badge, BotonEnlace, Dinero, EmptyState, Fecha, Table, type ColumnaTabla } from '@/ui';
import type { EntregaPedido } from '../calculos';
import { InsigniaRetraso } from './Piezas';

/** Historial de pedidos de una fábrica: cada fila enlaza a su importación; para los recibidos, puntualidad y defectos. */
export function HistorialPedidos({ filas, entregas }: { filas: readonly FilaImportacion[]; entregas: readonly EntregaPedido[] }) {
  const navegar = useNavigate();
  const porNumero = useMemo(() => new Map(entregas.map((e) => [e.numero, e])), [entregas]);

  const columnas: ColumnaTabla<FilaImportacion>[] = [
    {
      id: 'pedido',
      encabezado: 'Pedido',
      ordenar: (f) => f.importacion.fechaPedido,
      celda: (f) => (
        <div className="whitespace-nowrap">
          <Link to={rutas.importacion(f.importacion.numero)} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink underline-offset-4 hover:underline" data-testid={`pedido-${f.importacion.numero}`}>
            {f.importacion.numero}
          </Link>
          <p className="t-small text-muted">
            <Fecha valor={f.importacion.fechaPedido} /> · {entero(f.unidades)} uds.
          </p>
        </div>
      ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      ordenar: (f) => f.llegadaEstimada,
      celda: (f) => (
        <div className="flex flex-col items-start gap-1">
          <Badge tono={TONO_ESTADO_IMPORTACION[f.importacion.estado]}>{ETIQUETAS_ESTADO_IMPORTACION[f.importacion.estado]}</Badge>
          <span className="t-small text-muted whitespace-nowrap">
            {f.importacion.estado === 'recibido_bodega' ? 'Recibido' : 'Llega'} <Fecha valor={f.llegadaEstimada} />
            {f.retrasoDias > 0 && <span className="text-danger"> · retraso de {f.retrasoDias} {f.retrasoDias === 1 ? 'día' : 'días'}</span>}
          </span>
        </div>
      ),
    },
    {
      id: 'fob',
      encabezado: 'Valor FOB',
      numerica: true,
      ordenar: (f) => f.fobCop,
      celda: (f) => (
        <div className="whitespace-nowrap">
          <Dinero valor={f.fobCop} />
          <p className="t-small text-muted">{dineroOrigen(f.fobOrigen, f.importacion.moneda)}</p>
        </div>
      ),
    },
    {
      id: 'llegada',
      encabezado: 'Cómo llegó',
      alinear: 'der',
      ordenar: (f) => porNumero.get(f.importacion.numero)?.retraso ?? null,
      celda: (f) => {
        const e = porNumero.get(f.importacion.numero);
        if (!e) return <span className="t-small text-muted">{f.esCargaInicial ? 'Carga inicial' : f.importacion.estado === 'recibido_bodega' ? '—' : 'En camino'}</span>;
        return (
          <div className="flex flex-col items-end gap-1">
            <InsigniaRetraso dias={e.retraso} />
            <span className="whitespace-nowrap t-small text-muted">{e.tasaDefectos === null ? '—' : `${porcentaje(e.tasaDefectos, 1)} defectos`}</span>
          </div>
        );
      },
    },
  ];

  return (
    <Table
      etiqueta="Historial de pedidos"
      data-testid="ficha-historial"
      columnas={columnas}
      filas={filas}
      clave={(f) => f.importacion.id}
      sustantivo={['pedido', 'pedidos']}
      porPagina={25}
      ordenInicial={{ id: 'pedido', dir: 'desc' }}
      alAbrir={(f) => navegar(rutas.importacion(f.importacion.numero))}
      vacio={
        <EmptyState
          tamano="tabla"
          icono={PackageOpen}
          titulo="Todavía no le has hecho pedidos"
          texto="Cuando crees una importación a esta fábrica, aquí verás su historia: cuánto pediste, cuándo llegó y cómo vino la mercancía."
          accion={<BotonEnlace to={rutas.importacionNueva()}>Crear un pedido</BotonEnlace>}
        />
      }
    />
  );
}
