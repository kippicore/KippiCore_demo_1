import { ArrowRight, Eye, PackageCheck, Plus, Send, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { EstadoTraslado, Id } from '@/dominio/tipos';
import { useAcciones, useFiltroLocal, usePuede, useSel } from '@/estado';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { entero } from '@/lib/formato';
import { avisar, BadgeEstado, BotonAccionesFila, Button, EmptyState, EncabezadoPagina, Fecha, FranjaResumen, ItemMenu, Menu, Segmentado, Table, Toolbar, type ColumnaTabla } from '@/ui';
import { accionesTraslado } from '../calculos';
import { BadgeTraslado, PestanasModulo } from '../componentes/comun';
import { DialogoTraslado } from '../componentes/DialogoTraslado';
import { selVistaTraslados, type FilaTraslado } from '../selectores';
import { SUBTITULOS, VACIOS } from '../textos';

type FiltroEstado = EstadoTraslado | 'todos';

/** Lista de traslados entre locales con su estado; se despacha y se recibe desde la fila. */
export default function Traslados() {
  const params = useParamsRuta('traslados');
  const navegar = useNavigate();
  const acciones = useAcciones();
  const puede = usePuede();
  const contexto = useFiltroLocal();
  const [texto, setTexto] = useState('');
  const [nuevo, setNuevo] = useState(false);
  const estado: FiltroEstado = params.estado ?? 'todos';
  const todas = useSel(selVistaTraslados, { localId: contexto });

  const conteo = useMemo(() => {
    const c: Record<FiltroEstado, number> = { todos: todas.length, solicitado: 0, en_transito: 0, recibido: 0, cancelado: 0 };
    for (const f of todas) c[f.traslado.estado] += 1;
    return c;
  }, [todas]);
  const unidadesEnTransito = useMemo(() => todas.filter((f) => f.traslado.estado === 'en_transito').reduce((a, f) => a + f.unidades, 0), [todas]);

  const filas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return todas.filter((f) => (estado === 'todos' || f.traslado.estado === estado) && (!q || `${f.traslado.numero} ${f.origen} ${f.destino} ${f.resumen}`.toLowerCase().includes(q)));
  }, [todas, estado, texto]);

  const ir = (e: FiltroEstado) => navegar(rutas.traslados({ estado: e === 'todos' ? null : e }), { replace: true });

  const despachar = (id: Id, numero: string) => {
    const r = acciones.despacharTraslado({ trasladoId: id });
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ tipo: 'exito', texto: `${numero} va en tránsito`, detalle: 'Las existencias ya salieron del origen.' });
  };
  const recibir = (id: Id, numero: string) => {
    const r = acciones.recibirTraslado({ trasladoId: id, recibidas: null, nota: null });
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ tipo: 'exito', texto: `${numero} recibido`, detalle: 'Las existencias ya están en el destino.' });
  };

  const columnas: ColumnaTabla<FilaTraslado>[] = [
    {
      id: 'numero',
      encabezado: 'Traslado',
      ordenar: (f) => f.traslado.numero,
      ancho: 110,
      celda: (f) => <span className="t-ref whitespace-nowrap font-bold">{f.traslado.numero}</span>,
    },
    {
      id: 'fecha',
      encabezado: 'Solicitado',
      ancho: 160,
      ordenar: (f) => f.traslado.fechas.solicitado,
      celda: (f) => (
        <span className="whitespace-nowrap">
          <Fecha valor={f.traslado.fechas.solicitado} formato="fechaHora" />
        </span>
      ),
    },
    {
      id: 'ruta',
      encabezado: 'Ruta',
      ordenar: (f) => `${f.origen}${f.destino}`,
      celda: (f) => (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          {f.origen}
          <ArrowRight size={14} aria-hidden className="text-ink-2" />
          {f.destino}
        </span>
      ),
    },
    { id: 'prendas', encabezado: 'Prendas', truncar: true, celda: (f) => f.resumen },
    { id: 'unidades', encabezado: 'Unidades', numerica: true, ancho: 90, ordenar: (f) => f.unidades, celda: (f) => entero(f.unidades) },
    { id: 'solicito', encabezado: 'Solicitó', ancho: 110, ordenar: (f) => f.solicitante, celda: (f) => f.solicitante },
    {
      id: 'estado',
      encabezado: 'Estado',
      ordenar: (f) => f.traslado.estado,
      celda: (f) => (
        <span className="inline-flex items-center gap-2">
          <BadgeTraslado estado={f.traslado.estado} />
          {f.traslado.aprobacion === 'pendiente' && f.traslado.estado === 'solicitado' && <BadgeEstado estado={{ etiqueta: 'Por aprobar', tono: 'accent' }} tamano="sm" />}
        </span>
      ),
    },
  ];

  return (
    <div className="pb-16">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: 'Traslados' }]}
        titulo="Traslados"
        subtitulo={SUBTITULOS.traslados}
        acciones={
          puede('traslado.solicitar') && (
            <Button icono={Plus} onClick={() => setNuevo(true)} data-testid="nuevo-traslado">
              Nuevo traslado
            </Button>
          )
        }
        pestanas={<PestanasModulo />}
      />

      <FranjaResumen
        className="mt-8"
        cifras={[
          { etiqueta: 'Por despachar', valor: entero(conteo.solicitado) },
          { etiqueta: 'En tránsito', valor: entero(conteo.en_transito) },
          { etiqueta: 'Unidades en tránsito', valor: entero(unidadesEnTransito) },
          { etiqueta: 'Recibidos', valor: entero(conteo.recibido) },
        ]}
      />

      <div className="mt-4">
        <Table
          columnas={columnas}
          filas={filas}
          clave={(f) => f.traslado.id}
          sustantivo={['traslado', 'traslados']}
          etiqueta="Traslados entre locales"
          alAbrir={(f) => navegar(rutas.traslado(f.traslado.id))}
          resaltada={(f) => !!params.resaltar && (f.traslado.id === params.resaltar || f.traslado.numero === params.resaltar)}
          porPagina={25}
          data-testid="tabla-traslados"
          vacio={<EmptyState tamano="tabla" icono={Truck} titulo={VACIOS.traslados.titulo} texto={VACIOS.traslados.texto} accion={puede('traslado.solicitar') ? <Button variante="secondary" onClick={() => setNuevo(true)}>Solicitar un traslado</Button> : undefined} />}
          barra={
            <Toolbar
              buscar={{ valor: texto, alCambiar: setTexto, placeholder: 'Buscar por número, local o prenda' }}
              filtros={null}
              derecha={
                <Segmentado
                  etiqueta="Estado del traslado"
                  valor={estado}
                  alCambiar={ir}
                  opciones={[
                    { valor: 'todos', etiqueta: `Todos ${entero(conteo.todos)}`, 'data-testid': 'estado-todos' },
                    { valor: 'solicitado', etiqueta: `Solicitados ${entero(conteo.solicitado)}`, 'data-testid': 'estado-solicitado' },
                    { valor: 'en_transito', etiqueta: `En tránsito ${entero(conteo.en_transito)}`, 'data-testid': 'estado-en_transito' },
                    { valor: 'recibido', etiqueta: `Recibidos ${entero(conteo.recibido)}`, 'data-testid': 'estado-recibido' },
                    { valor: 'cancelado', etiqueta: `Cancelados ${entero(conteo.cancelado)}`, 'data-testid': 'estado-cancelado' },
                  ]}
                />
              }
            />
          }
          accionesFila={(f) => {
            const a = accionesTraslado(f.traslado);
            return (
              <Menu etiqueta={`Acciones de ${f.traslado.numero}`} disparador={<BotonAccionesFila aria-label={`Acciones de ${f.traslado.numero}`} />}>
                <ItemMenu icono={Eye} onSelect={() => navegar(rutas.traslado(f.traslado.id))}>
                  Ver el traslado
                </ItemMenu>
                {puede('traslado.despachar') && a.despachar && (
                  <ItemMenu icono={Send} onSelect={() => despachar(f.traslado.id, f.traslado.numero)}>
                    Despachar
                  </ItemMenu>
                )}
                {puede('traslado.recibir') && a.recibir && (
                  <ItemMenu icono={PackageCheck} onSelect={() => recibir(f.traslado.id, f.traslado.numero)}>
                    Marcar recibido
                  </ItemMenu>
                )}
              </Menu>
            );
          }}
        />
      </div>

      <DialogoTraslado abierto={nuevo} alCambiar={setNuevo} inicial={{}} irAlDetalle />
    </div>
  );
}
