import { Cake, ChevronLeft, ChevronRight, MessageCircle, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Segmento } from '@/dominio/reglas/segmentacion';
import { ESTADOS_CLIENTE } from '@/config/estados';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useAhora, useFiltroLocal, useHoy, useMarca, useRolActivo, useSel, useUsuarioActivo } from '@/estado';
import { entero, mesAnio, plural } from '@/lib/formato';
import { selLocalesQueVenden } from '@/selectores';
import {
  Avatar,
  Badge,
  BotonEnlace,
  BotonIcono,
  BotonPildora,
  Button,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  FranjaResumen,
  Select,
  Table,
  Toolbar,
  type ChipActivo,
  type ColumnaTabla,
} from '@/ui';
import { LimiteError } from '../componentes/LimiteError';
import { ModalMensaje } from '../componentes/ModalMensaje';
import { InsigniaSegmento } from '../componentes/Partes';
import { armarMensaje, moverMes, SEGMENTOS_ORDEN } from '../reglas';
import { selCumpleanosPagina, type FilaCumple } from '../selectores';
import { TEXTOS } from '../textos';

export default function Cumpleanos() {
  return (
    <div className="pb-24">
      <LimiteError titulo="No pudimos cargar los cumpleaños" texto="Recarga la página. Tus datos de la demo siguen a salvo en este navegador.">
        <CumpleanosDelMes />
      </LimiteError>
    </div>
  );
}

function CumpleanosDelMes() {
  const navegar = useNavigate();
  const hoy = useHoy();
  const ahora = useAhora();
  const marca = useMarca();
  const rol = useRolActivo();
  const { empleado } = useUsuarioActivo();
  const localGlobal = useFiltroLocal();
  const { mes: mesUrl } = useParamsRuta('cumpleanos');
  const mesActual = hoy.slice(0, 7);
  const mes = mesUrl ?? mesActual;
  const esVendedor = rol === 'vendedor';
  const [q, setQ] = useState('');
  const [segmento, setSegmento] = useState<Segmento | null>(null);
  const [localElegido, setLocalElegido] = useState<string | null>(null);
  const [felicitando, setFelicitando] = useState<string | null>(null);
  const locales = useSel(selLocalesQueVenden);
  const localId = localGlobal !== 'todos' ? localGlobal : (localElegido ?? 'todos');
  const datos = useSel(selCumpleanosPagina, { mes, hoy, localId, vendedorId: esVendedor ? (empleado?.id ?? undefined) : undefined });
  const nombreLocal = (id: string | null) => (id ? (locales.find((l) => l.id === id)?.nombre ?? '') : '');

  const filas = useMemo(() => {
    const t = q.trim().toLowerCase();
    const filtradas = datos.filas.filter(
      (f) => (!segmento || f.segmento === segmento) && (!t || `${f.cliente.nombres} ${f.cliente.apellidos}`.toLowerCase().includes(t)),
    );
    // Primero los de hoy, luego los que vienen y al final los que ya pasaron.
    const orden = { hoy: 0, proximo: 1, pasado: 2 } as const;
    return [...filtradas].sort((a, b) => orden[a.estado] - orden[b.estado] || (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  }, [datos.filas, q, segmento]);

  const irAMes = (m: string) => navegar(rutas.cumpleanos({ mes: m }), { replace: true });
  const chips: ChipActivo[] = [];
  if (segmento) chips.push({ id: 'segmento', texto: `Segmento: ${ESTADOS_CLIENTE[segmento].etiqueta}`, alQuitar: () => setSegmento(null) });
  if (localGlobal === 'todos' && localElegido) chips.push({ id: 'local', texto: `Local: ${nombreLocal(localElegido)}`, alQuitar: () => setLocalElegido(null) });
  const limpiar = () => {
    setQ('');
    setSegmento(null);
    setLocalElegido(null);
  };

  const columnas: ColumnaTabla<FilaCumple>[] = [
    {
      id: 'dia',
      encabezado: 'Día',
      ancho: 150,
      ordenar: (f) => f.fecha,
      celda: (f) => (
        <span className="flex items-center gap-2">
          <Fecha valor={f.fecha} formato="corta" />
          {f.estado === 'hoy' && <Badge tono="accent" tamano="sm">Hoy</Badge>}
        </span>
      ),
    },
    {
      id: 'cliente',
      encabezado: 'Cliente',
      ordenar: (f) => `${f.cliente.apellidos} ${f.cliente.nombres}`.toLowerCase(),
      celda: (f) => (
        <span className="flex items-center gap-3">
          <Avatar nombre={`${f.cliente.nombres} ${f.cliente.apellidos}`} tamano={32} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">
              {f.cliente.nombres} {f.cliente.apellidos}
            </span>
            <span className="block t-small text-muted">
              {f.edad ? `Cumple ${plural(f.edad, 'año')}` : 'Cumpleaños'} · {nombreLocal(f.localHabitualId) || 'Sin local'}
            </span>
          </span>
        </span>
      ),
    },
    { id: 'segmento', encabezado: 'Segmento', ordenar: (f) => SEGMENTOS_ORDEN.indexOf(f.segmento), celda: (f) => <InsigniaSegmento segmento={f.segmento} tamano="sm" /> },
    { id: 'trato', encabezado: 'Trato', celda: (f) => <span className="t-small text-ink-2">{f.cliente.tratamiento === 'usted' ? TEXTOS.trato.usted : TEXTOS.trato.tu}</span> },
    {
      id: 'mensaje',
      encabezado: 'Mensaje sugerido',
      celda: (f) => (
        <span className="block max-w-[38ch] truncate t-small text-ink-2">
          {armarMensaje('cumpleanos', f.cliente, f.cliente.tratamiento, {
            marca: marca.nombre,
            local: nombreLocal(f.localHabitualId) || 'nuestro local',
            ahora,
            producto: null,
            novedad: '',
            cobro: null,
          })}
        </span>
      ),
    },
    {
      id: 'accion',
      encabezado: <span className="sr-only">Acción</span>,
      alinear: 'der',
      ancho: 150,
      celda: (f) =>
        f.felicitado ? (
          <Badge tono="success" tamano="sm">
            Felicitado
          </Badge>
        ) : (
          <Button
            variante={f.estado === 'hoy' ? 'primary' : 'secondary'}
            tamano="sm"
            icono={MessageCircle}
            onClick={(e) => {
              e.stopPropagation();
              setFelicitando(f.cliente.id);
            }}
            data-testid={`felicitar-${f.cliente.id}`}
          >
            Felicitar
          </Button>
        ),
    },
  ];

  const hayFiltros = chips.length > 0 || !!q.trim();

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Clientes', a: rutas.clientes({}) }, { texto: 'Cumpleaños' }]}
        titulo="Cumpleaños"
        subtitulo="Salúdalos en su día: el mensaje ya viene escrito en el trato que prefiere cada uno."
        acciones={
          <BotonEnlace to={rutas.clientes({})} variante="secondary" icono={UsersRound}>
            Ver clientes
          </BotonEnlace>
        }
      />

      <div className="mt-8 flex items-center gap-2" data-testid="selector-mes">
        <BotonIcono icono={ChevronLeft} etiqueta="Mes anterior" variante="secondary" onClick={() => irAMes(moverMes(mes, -1))} data-testid="mes-anterior" />
        <p className="min-w-52 text-center t-h3 text-ink" data-testid="mes-actual">
          {mesAnio(mes).replace(/^./, (c) => c.toUpperCase())}
        </p>
        <BotonIcono icono={ChevronRight} etiqueta="Mes siguiente" variante="secondary" onClick={() => irAMes(moverMes(mes, 1))} data-testid="mes-siguiente" />
        {mes !== mesActual && (
          <Button variante="ghost" tamano="sm" onClick={() => irAMes(mesActual)}>
            Ir al mes actual
          </Button>
        )}
      </div>

      <FranjaResumen
        className="mt-4"
        cifras={[
          { etiqueta: 'Cumpleaños del mes', valor: entero(datos.total) },
          { etiqueta: 'Hoy', valor: mes === mesActual ? entero(datos.hoy) : '—' },
          { etiqueta: 'Clientes VIP', valor: entero(datos.vip) },
          { etiqueta: 'Ya felicitados', valor: `${entero(datos.felicitados)} de ${entero(datos.total)}` },
        ]}
      />

      <Table
        className="mt-4"
        etiqueta="Cumpleaños del mes"
        data-testid="tabla-cumpleanos"
        columnas={columnas}
        filas={filas}
        clave={(f) => f.cliente.id}
        sustantivo={['cumpleaños', 'cumpleaños']}
        porPagina={50}
        alAbrir={(f) => navegar(rutas.cliente(f.cliente.id, {}))}
        barra={
          <Toolbar
            buscar={{ valor: q, alCambiar: setQ, placeholder: 'Buscar por nombre', etiqueta: 'Buscar cumpleaños' }}
            filtros={
              <>
                <BotonPildora etiqueta="Segmento" valor={segmento ? ESTADOS_CLIENTE[segmento].etiqueta : 'Todos'} anchoPanel={260}>
                  <Select
                    etiqueta="Segmento"
                    etiquetaOculta
                    valor={segmento ?? 'todos'}
                    alCambiar={(v) => setSegmento(v === 'todos' ? null : (v as Segmento))}
                    opciones={[{ valor: 'todos', etiqueta: 'Todos los segmentos' }, ...SEGMENTOS_ORDEN.map((s) => ({ valor: s, etiqueta: ESTADOS_CLIENTE[s].etiqueta }))]}
                  />
                </BotonPildora>
                {localGlobal === 'todos' && !esVendedor && (
                  <BotonPildora etiqueta="Local" valor={localElegido ? nombreLocal(localElegido) : 'Todos'} anchoPanel={260}>
                    <Select
                      etiqueta="Local"
                      etiquetaOculta
                      valor={localElegido ?? 'todos'}
                      alCambiar={(v) => setLocalElegido(v === 'todos' ? null : v)}
                      opciones={[{ valor: 'todos', etiqueta: 'Todos los locales' }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
                    />
                  </BotonPildora>
                )}
              </>
            }
            chips={chips}
            alLimpiar={chips.length ? limpiar : undefined}
          />
        }
        vacio={
          <EmptyState
            tamano="tabla"
            icono={Cake}
            titulo={TEXTOS.vacios.cumpleanos.titulo}
            texto={TEXTOS.vacios.cumpleanos.texto}
            accion={
              hayFiltros ? (
                <Button variante="secondary" onClick={limpiar}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        }
      />

      {felicitando && <ModalMensaje clienteId={felicitando} tipoInicial="cumpleanos" alCerrar={() => setFelicitando(null)} />}
    </>
  );
}
