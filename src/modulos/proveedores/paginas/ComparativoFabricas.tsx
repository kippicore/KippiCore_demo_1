import { Factory, Info } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useHoy, useSel } from '@/estado';
import { entero, numero, porcentaje } from '@/lib/formato';
import { BadgeEstado, BotonEnlace, Card, Dinero, EmptyState, EncabezadoPagina, EncabezadoSeccion, Icono, Table, type ColumnaTabla } from '@/ui';
import { hallazgosComparativo } from '../calculos';
import { GraficosComparativo } from '../componentes/GraficosComparativo';
import { HallazgoFabrica } from '../componentes/HallazgoFabrica';
import { HistorialEntregas } from '../componentes/HistorialEntregas';
import { NavegacionProveedores } from '../componentes/Navegacion';
import { InsigniaDefectos, InsigniaRetraso } from '../componentes/Piezas';
import { selComparativo, type FilaComparativo } from '../selectores';
import { TEXTOS, VEREDICTOS } from '../textos';

/** Comparativo de fábricas (PRD 7.6, P14): costo por unidad, puntualidad y defectos, para ver de un vistazo quién llega tarde. */
export default function ComparativoFabricas() {
  const navegar = useNavigate();
  const hoy = useHoy();
  const filas = useSel(selComparativo, { hoy });
  const hallazgos = useMemo(() => hallazgosComparativo(filas), [filas]);

  const columnas: ColumnaTabla<FilaComparativo>[] = [
    {
      id: 'fabrica',
      encabezado: 'Fábrica',
      ordenar: (f) => f.nombre,
      truncar: true,
      ancho: 230,
      celda: (f) => (
        <div className="min-w-0">
          <Link to={rutas.proveedor(f.proveedorId)} onClick={(e) => e.stopPropagation()} className="block truncate font-semibold text-ink underline-offset-4 hover:underline">
            {f.nombre}
          </Link>
          <p className="truncate t-small text-muted">
            {f.categorias} · {f.proveedor.moneda}
          </p>
        </div>
      ),
    },
    {
      id: 'costo',
      encabezado: 'Costo por unidad',
      numerica: true,
      ordenar: (f) => f.costoPromedioUnidad,
      celda: (f) =>
        f.costoPromedioUnidad === null ? (
          <span className="text-muted">—</span>
        ) : (
          <div>
            <Dinero valor={f.costoPromedioUnidad} />
            <p className="t-small text-muted">FOB por prenda</p>
          </div>
        ),
    },
    {
      id: 'aTiempo',
      encabezado: 'A tiempo',
      alinear: 'der',
      ordenar: (f) => f.aTiempo,
      celda: (f) =>
        f.aTiempo === null ? (
          <span className="text-muted">—</span>
        ) : (
          <div className="flex flex-col items-end gap-1.5">
            <span className="num">{porcentaje(f.aTiempo, 0)}</span>
            <span aria-hidden className="block h-1 w-16 bg-selected">
              <span className="block h-full bg-ink" style={{ width: `${Math.round(f.aTiempo * 100)}%` }} />
            </span>
          </div>
        ),
    },
    {
      id: 'retraso',
      encabezado: 'Retraso promedio',
      alinear: 'der',
      ordenar: (f) => f.retrasoPromedio,
      celda: (f) => <InsigniaRetraso dias={f.retrasoPromedio} tamano="md" />,
    },
    {
      id: 'defectos',
      encabezado: 'Defectos',
      alinear: 'der',
      ordenar: (f) => f.defectos,
      celda: (f) => <InsigniaDefectos fraccion={f.defectos} tamano="md" />,
    },
    {
      id: 'entrega',
      encabezado: 'Entrega',
      numerica: true,
      ordenar: (f) => f.entregaPromedio,
      celda: (f) =>
        f.entregaPromedio === null ? (
          <span className="text-muted">—</span>
        ) : (
          <div className="whitespace-nowrap py-3">
            <span>{numero(f.entregaPromedio, 0)} días</span>
            <p className="t-small text-muted">{f.pedidosRecibidos === 1 ? '1 pedido' : `${entero(f.pedidosRecibidos)} pedidos`}</p>
          </div>
        ),
    },
    {
      id: 'veredicto',
      encabezado: 'En resumen',
      ordenar: (f) => ['incumple', 'reservas', 'confiable', 'sin_datos'].indexOf(f.veredicto),
      ancho: 170,
      celda: (f) => (
        <div className="flex flex-col items-start gap-1.5 py-3">
          <BadgeEstado estado={VEREDICTOS[f.veredicto]} />
          {f.motivos[0] && <span className="max-w-[150px] whitespace-normal t-small text-muted">{f.motivos[0]}</span>}
        </div>
      ),
    },
  ];

  return (
    <div className="pb-16" data-testid="proveedores-comparativo">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Proveedores', a: rutas.proveedores() }, { texto: 'Comparativo de fábricas' }]}
        titulo={TEXTOS.comparativo.titulo}
        subtitulo={TEXTOS.comparativo.subtitulo}
        pestanas={<NavegacionProveedores />}
      />

      {filas.length === 0 ? (
        <Card className="mt-8" padding="ninguno">
          <EmptyState
            icono={Factory}
            titulo="Aún no tienes fábricas registradas"
            texto="Registra tus fábricas en el directorio y, con cada pedido recibido, aquí verás cuál cumple y cuál no."
            accion={<BotonEnlace to={rutas.proveedores({ tipo: 'fabrica' })}>Ir al directorio</BotonEnlace>}
          />
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          <HallazgoFabrica hallazgos={hallazgos} filas={filas} />

          <section aria-labelledby="titulo-tabla">
            <EncabezadoSeccion titulo={<span id="titulo-tabla">Fábrica por fábrica</span>} />
            <Table
              etiqueta="Comparativo de fábricas"
              data-testid="tabla-comparativo"
              columnas={columnas}
              filas={filas}
              clave={(f) => f.proveedorId}
              sustantivo={['fábrica', 'fábricas']}
              porPagina={0}
              ordenInicial={{ id: 'retraso', dir: 'desc' }}
              alAbrir={(f) => navegar(rutas.proveedor(f.proveedorId))}
            />
            <p className="mt-3 flex max-w-[96ch] items-start gap-2 t-small text-muted">
              <Icono icono={Info} tamano={14} className="mt-0.5" />
              <span>
                {TEXTOS.comparativo.notaCosto} {TEXTOS.comparativo.notaCumplimiento}
              </span>
            </p>
          </section>

          <section aria-labelledby="titulo-graficos">
            <EncabezadoSeccion titulo={<span id="titulo-graficos">De un vistazo</span>} />
            <GraficosComparativo filas={filas} hallazgos={hallazgos} />
          </section>

          <section aria-labelledby="titulo-pedidos">
            <EncabezadoSeccion titulo={<span id="titulo-pedidos">Cómo les ha ido en cada pedido</span>} />
            <Card padding="normal" data-testid="comparativo-pedidos">
              <ul className="flex flex-col divide-y divide-line-soft">
                {filas.map((f) => (
                  <li key={f.proveedorId} className="grid grid-cols-1 gap-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                    <div className="min-w-0">
                      <Link to={rutas.proveedor(f.proveedorId)} className="t-body font-semibold text-ink underline-offset-4 hover:underline">
                        {f.nombre}
                      </Link>
                      <p className="t-small text-muted">{f.categorias}</p>
                    </div>
                    <HistorialEntregas entregas={f.entregas} />
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
