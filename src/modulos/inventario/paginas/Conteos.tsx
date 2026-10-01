import { ClipboardList, Eye, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Categoria, Id } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useAcciones, useFiltroLocal, useHoy, usePuede, useSel } from '@/estado';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { ESTADOS_CONTEO } from '@/config/estados';
import { entero } from '@/lib/formato';
import { NOMBRES_CATEGORIA } from '@/seed/catalogo';
import { avisar, BadgeEstado, BotonAccionesFila, Button, Checkbox, Dialog, EmptyState, EncabezadoPagina, Fecha, FranjaResumen, ItemMenu, Menu, Select, Switch, Table, type ColumnaTabla } from '@/ui';
import { PestanasModulo, useLocalesInventario } from '../componentes/comun';
import { selVistaConteos, type FilaConteo } from '../selectores';
import { CATEGORIAS_ORDEN, SUBTITULOS, VACIOS } from '../textos';

/** Lista de conteos físicos; desde aquí se inicia uno por local (o por categorías) y se abre para contar. */
export default function Conteos() {
  const params = useParamsRuta('conteos');
  const navegar = useNavigate();
  const puede = usePuede();
  const hoy = useHoy();
  const filas = useSel(selVistaConteos);
  const locales = useLocalesInventario();
  const [iniciando, setIniciando] = useState(false);

  const stats = useMemo(() => {
    const enCurso = filas.filter((f) => f.conteo.estado === 'en_curso').length;
    const desde = sumarDias(hoy, -90);
    const aplicados = filas.filter((f) => f.conteo.estado === 'aplicado' && f.conteo.iniciado.slice(0, 10) >= desde).length;
    const ultimo = filas.filter((f) => f.conteo.estado === 'aplicado')[0]?.conteo.iniciado ?? null;
    const sinContar = locales.filter((l) => !filas.some((f) => f.conteo.localId === l.id && f.conteo.estado !== 'cancelado' && f.conteo.iniciado.slice(0, 10) >= sumarDias(hoy, -60))).length;
    return { enCurso, aplicados, ultimo, sinContar };
  }, [filas, hoy, locales]);

  const columnas: ColumnaTabla<FilaConteo>[] = [
    { id: 'numero', encabezado: 'Conteo', ordenar: (f) => f.conteo.numero, celda: (f) => <span className="t-ref font-bold">{f.conteo.numero}</span> },
    { id: 'local', encabezado: 'Local', ancho: 140, ordenar: (f) => f.local, celda: (f) => <span className="whitespace-nowrap">{f.local}</span> },
    { id: 'alcance', encabezado: 'Alcance', truncar: true, celda: (f) => (f.conteo.categorias ? f.conteo.categorias.map((c) => NOMBRES_CATEGORIA[c]).join(', ') : 'Todo el local') },
    { id: 'inicio', encabezado: 'Iniciado', ancho: 170, ordenar: (f) => f.conteo.iniciado, celda: (f) => <span className="whitespace-nowrap"><Fecha valor={f.conteo.iniciado} formato="fechaHora" /></span> },
    {
      id: 'avance',
      encabezado: 'Contadas',
      numerica: true,
      ordenar: (f) => f.contadas / Math.max(1, f.lineas),
      celda: (f) => (
        <span>
          {entero(f.contadas)} <span className="text-muted">de {entero(f.lineas)}</span>
        </span>
      ),
    },
    {
      id: 'diferencias',
      encabezado: 'Con diferencia',
      numerica: true,
      ordenar: (f) => f.conDiferencia,
      celda: (f) => (f.conDiferencia > 0 ? <strong className="font-bold">{entero(f.conDiferencia)}</strong> : <span className="text-disabled">—</span>),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      ordenar: (f) => f.conteo.estado,
      celda: (f) => <BadgeEstado estado={f.conteo.estado === 'en_curso' && f.conDiferencia > 0 ? ESTADOS_CONTEO.con_diferencias : ESTADOS_CONTEO[f.conteo.estado]} tamano="sm" />,
    },
  ];

  return (
    <div className="pb-16">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: 'Conteos físicos' }]}
        titulo="Conteos físicos"
        subtitulo={SUBTITULOS.conteos}
        acciones={
          puede('conteo.iniciar') && (
            <Button icono={Play} onClick={() => setIniciando(true)} data-testid="iniciar-conteo">
              Iniciar conteo
            </Button>
          )
        }
        pestanas={<PestanasModulo />}
      />

      <FranjaResumen
        className="mt-8"
        cifras={[
          { etiqueta: 'En curso', valor: entero(stats.enCurso) },
          { etiqueta: 'Aplicados en 90 días', valor: entero(stats.aplicados) },
          { etiqueta: 'Último conteo', valor: <span className="t-kpi-sm">{stats.ultimo ? <Fecha valor={stats.ultimo} formato="relativaDias" /> : '—'}</span> },
          { etiqueta: 'Locales sin contar en 60 días', valor: entero(stats.sinContar) },
        ]}
      />

      <div className="mt-4">
        <Table
          columnas={columnas}
          filas={filas}
          clave={(f) => f.conteo.id}
          sustantivo={['conteo', 'conteos']}
          etiqueta="Conteos físicos"
          alAbrir={(f) => navegar(rutas.conteo(f.conteo.id))}
          resaltada={(f) => !!params.resaltar && (f.conteo.id === params.resaltar || f.conteo.numero === params.resaltar)}
          porPagina={25}
          data-testid="tabla-conteos"
          vacio={
            <EmptyState
              tamano="tabla"
              icono={ClipboardList}
              titulo={VACIOS.conteos.titulo}
              texto={VACIOS.conteos.texto}
              accion={puede('conteo.iniciar') ? <Button onClick={() => setIniciando(true)}>Iniciar conteo</Button> : undefined}
            />
          }
          accionesFila={(f) => (
            <Menu etiqueta={`Acciones de ${f.conteo.numero}`} disparador={<BotonAccionesFila aria-label={`Acciones de ${f.conteo.numero}`} />}>
              <ItemMenu icono={Eye} onSelect={() => navegar(rutas.conteo(f.conteo.id))}>
                {f.conteo.estado === 'en_curso' ? 'Seguir contando' : 'Ver el conteo'}
              </ItemMenu>
            </Menu>
          )}
        />
      </div>

      <DialogoIniciar abierto={iniciando} alCambiar={setIniciando} />
    </div>
  );
}

function DialogoIniciar({ abierto, alCambiar }: { abierto: boolean; alCambiar: (a: boolean) => void }) {
  const acciones = useAcciones();
  const navegar = useNavigate();
  const contexto = useFiltroLocal();
  const locales = useLocalesInventario();
  const [localId, setLocalId] = useState<Id | ''>(contexto !== 'todos' ? contexto : '');
  const [todo, setTodo] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [error, setError] = useState<string | null>(null);

  const iniciar = () => {
    if (!localId) return setError('Elige el local que vas a contar.');
    const r = acciones.iniciarConteo({ localId, categorias: todo ? null : categorias });
    if (!r.ok) return setError(r.error.mensaje);
    const creado = Object.values(r.despues.conteos).find((c) => !r.antes.conteos[c.id]);
    alCambiar(false);
    avisar({ tipo: 'exito', texto: `Conteo ${creado?.numero ?? ''} iniciado`, detalle: 'Cuenta las prendas y anota lo que encuentres.' });
    if (creado) navegar(rutas.conteo(creado.id));
  };

  return (
    <Dialog
      abierto={abierto}
      alCambiar={alCambiar}
      eyebrow="Conteo físico"
      titulo="Iniciar un conteo"
      descripcion="Elige el local y, si quieres, solo algunas categorías. El sistema guarda lo que hay hoy para que veas las diferencias."
      ancho="md"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={iniciar} disabled={!localId || (!todo && categorias.length === 0)} data-testid="conteo-confirmar">
            Iniciar conteo
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Select
          etiqueta="Local"
          valor={localId || null}
          alCambiar={(v) => {
            setLocalId(v);
            setError(null);
          }}
          opciones={locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))}
          placeholder="Elige el local"
          enModal
          error={error ?? undefined}
          data-testid="conteo-local"
        />
        <Switch etiqueta="Contar todo el local" activo={todo} alCambiar={setTodo} />
        {!todo && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2" role="group" aria-label="Categorías a contar">
            {CATEGORIAS_ORDEN.map((c) => (
              <Checkbox
                key={c}
                etiqueta={NOMBRES_CATEGORIA[c]}
                marcado={categorias.includes(c)}
                alCambiar={(v) => setCategorias((x) => (v ? [...x, c] : x.filter((y) => y !== c)))}
              />
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
