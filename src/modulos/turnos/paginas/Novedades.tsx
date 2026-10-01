import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CalendarOff, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  BadgeEstado,
  BotonAccionesFila,
  BotonPildora,
  Button,
  ConfirmarEliminacion,
  EmptyState,
  Fecha,
  FranjaResumen,
  ItemMenu,
  Menu,
  NotaLegal,
  Segmentado,
  Select,
  Table,
  Toolbar,
  avisar,
  type ChipActivo,
  type ColumnaTabla,
} from '@/ui';
import { ESTADOS_PERSONAL, type Tono } from '@/config/estados';
import type { Id, TipoNovedad } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useAcciones, useHoy, useSel } from '@/estado';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { plural } from '@/lib/formato';
import { efectoEnNomina, type EstadoNovedad } from '../calculos';
import { DialogoNovedad } from '../componentes/DialogoNovedad';
import { EncabezadoTurnos, LimiteError } from '../componentes/Piezas';
import { selNovedadesVista, selParametrosTurnos, selPersonas, type FilaNovedad } from '../selectores';
import { ETIQUETA_NOVEDAD, TEXTOS, TIPOS_NOVEDAD } from '../textos';

const ETIQUETA_ESTADO: Record<EstadoNovedad, { etiqueta: string; tono: Tono }> = {
  vigente: { etiqueta: 'Vigente', tono: 'ink' },
  proxima: { etiqueta: 'Próxima', tono: 'outline' },
  pasada: { etiqueta: 'Pasada', tono: 'neutral' },
};

type FiltroEstado = 'todas' | EstadoNovedad;
const TODOS = '*';

export default function Novedades() {
  const [dialogo, setDialogo] = useState<{ novedadId: Id | null; empleadoId: Id | null } | null>(null);
  return (
    <>
      <EncabezadoTurnos
        seccion="novedades"
        titulo={TEXTOS.novedades.titulo}
        subtitulo={TEXTOS.novedades.subtitulo}
        acciones={
          <Button
            icono={Plus}
            onClick={() => setDialogo({ novedadId: null, empleadoId: null })}
            data-testid="novedades-registrar"
          >
            Registrar novedad
          </Button>
        }
      />
      <LimiteError testid="novedades-error">
        <CuerpoNovedades dialogo={dialogo} setDialogo={setDialogo} />
      </LimiteError>
    </>
  );
}

function CuerpoNovedades({
  dialogo,
  setDialogo,
}: {
  dialogo: { novedadId: Id | null; empleadoId: Id | null } | null;
  setDialogo: (d: { novedadId: Id | null; empleadoId: Id | null } | null) => void;
}) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const navegar = useNavigate();
  const params = useParamsRuta('novedades') as { empleado: string | null; resaltar: string | null };
  const personas = useSel(selPersonas);
  const filas = useSel(selNovedadesVista, { hoy });
  const parametros = useSel(selParametrosTurnos);
  const [estado, setEstado] = useState<FiltroEstado>('todas');
  const [tipo, setTipo] = useState<TipoNovedad | typeof TODOS>(TODOS);
  const [aEliminar, setAEliminar] = useState<FilaNovedad | null>(null);
  const empleado = params.empleado && personas[params.empleado] ? params.empleado : null;
  const resaltar = params.resaltar;

  const visibles = useMemo(
    () =>
      filas.filter(
        (x) =>
          (!empleado || x.novedad.empleadoId === empleado) &&
          (estado === 'todas' || x.estado === estado) &&
          (tipo === TODOS || x.novedad.tipo === tipo),
      ),
    [filas, empleado, estado, tipo],
  );
  const fueraHoy = filas.filter((x) => x.estado === 'vigente');
  const proximas = filas.filter((x) => x.estado === 'proxima' && x.novedad.desde <= sumarDias(hoy, 30));
  const porCubrir = filas.filter((x) => x.estado !== 'pasada').reduce((a, x) => a + x.turnosPorCubrir, 0);
  const diasAnio = filas
    .filter((x) => x.novedad.desde.slice(0, 4) === hoy.slice(0, 4))
    .reduce((a, x) => a + x.dias, 0);

  const cambiarEmpleado = (id: Id | null) => navegar(rutas.novedades({ empleado: id }), { replace: true });
  const limpiar = () => {
    setEstado('todas');
    setTipo(TODOS);
    cambiarEmpleado(null);
  };
  const chips: ChipActivo[] = [];
  if (empleado)
    chips.push({
      id: 'persona',
      texto: `Persona: ${personas[empleado]?.nombre ?? '…'}`,
      alQuitar: () => cambiarEmpleado(null),
    });
  if (estado !== 'todas')
    chips.push({
      id: 'estado',
      texto: `Estado: ${ETIQUETA_ESTADO[estado].etiqueta}`,
      alQuitar: () => setEstado('todas'),
    });
  if (tipo !== TODOS)
    chips.push({ id: 'tipo', texto: `Tipo: ${ETIQUETA_NOVEDAD[tipo]}`, alQuitar: () => setTipo(TODOS) });

  const eliminar = (x: FilaNovedad) => {
    const r = acciones.eliminarNovedad({ novedadId: x.novedad.id });
    setAEliminar(null);
    if (!r.ok) {
      avisar({ tipo: 'error', texto: r.error.mensaje });
      return;
    }
    avisar({
      tipo: 'exito',
      texto: 'Novedad eliminada',
      detalle: `${ETIQUETA_NOVEDAD[x.novedad.tipo]} · ${x.nombre}`,
    });
  };

  const columnas: ColumnaTabla<FilaNovedad>[] = [
    {
      id: 'persona',
      encabezado: 'Persona',
      ancho: 170,
      ordenar: (x) => x.nombre,
      celda: (x) => (
        <span className="whitespace-nowrap font-bold text-ink" title={x.nombre}>
          {personas[x.novedad.empleadoId]?.nombre.split(' ').slice(0, 2).join(' ') ?? x.nombre}
        </span>
      ),
    },
    {
      id: 'tipo',
      encabezado: 'Tipo',
      ordenar: (x) => ETIQUETA_NOVEDAD[x.novedad.tipo],
      celda: (x) =>
        x.novedad.tipo === 'vacaciones' ? (
          <BadgeEstado estado={ESTADOS_PERSONAL.vacaciones} tamano="sm" />
        ) : x.novedad.tipo === 'incapacidad' ? (
          <BadgeEstado estado={ESTADOS_PERSONAL.incapacidad} tamano="sm" />
        ) : (
          <Badge tono="outline" tamano="sm">
            {ETIQUETA_NOVEDAD[x.novedad.tipo]}
          </Badge>
        ),
    },
    {
      id: 'desde',
      encabezado: 'Desde',
      ordenar: (x) => x.novedad.desde,
      celda: (x) => <Fecha valor={x.novedad.desde} formato="fecha" className="num" />,
    },
    {
      id: 'hasta',
      encabezado: 'Hasta',
      ordenar: (x) => x.novedad.hasta,
      celda: (x) => <Fecha valor={x.novedad.hasta} formato="fecha" className="num" />,
    },
    {
      id: 'dias',
      encabezado: 'Días',
      ancho: 80,
      numerica: true,
      ordenar: (x) => x.dias,
      celda: (x) => <span className="num">{x.dias}</span>,
    },
    { id: 'paga', encabezado: 'Se paga', celda: (x) => (x.novedad.remunerada ? 'Sí' : 'No') },
    {
      id: 'estado',
      encabezado: 'Estado',
      ordenar: (x) => x.estado,
      celda: (x) => (
        <Badge tono={ETIQUETA_ESTADO[x.estado].tono} tamano="sm">
          {ETIQUETA_ESTADO[x.estado].etiqueta}
        </Badge>
      ),
    },
    {
      id: 'cubrir',
      encabezado: 'Por cubrir',
      numerica: true,
      ordenar: (x) => x.turnosPorCubrir,
      celda: (x) => <span className="num">{x.estado === 'pasada' ? '—' : x.turnosPorCubrir}</span>,
    },
    {
      id: 'efecto',
      encabezado: 'Qué pasa en la nómina',
      ancho: 340,
      celda: (x) => efectoEnNomina(x.novedad.tipo, x.novedad.remunerada, x.dias, parametros.incapacidad),
    },
  ];

  return (
    <>
      <FranjaResumen
        className="mt-8"
        cifras={[
          {
            etiqueta: 'Fuera hoy',
            valor: (
              <span data-testid="novedades-kpi-hoy">
                {fueraHoy.length} {fueraHoy.length === 1 ? 'persona' : 'personas'}
              </span>
            ),
          },
          {
            etiqueta: 'Próximos 30 días',
            valor: (
              <span data-testid="novedades-kpi-proximas">
                {plural(proximas.length, 'novedad', 'novedades')}
              </span>
            ),
          },
          {
            etiqueta: 'Turnos por cubrir',
            valor: <span data-testid="novedades-kpi-cubrir">{porCubrir}</span>,
          },
          {
            etiqueta: 'Días de novedad este año',
            valor: <span data-testid="novedades-kpi-anio">{diasAnio}</span>,
          },
        ]}
      />

      <Table
        className="mt-4"
        etiqueta="Novedades del equipo"
        columnas={columnas}
        filas={visibles}
        clave={(x) => x.novedad.id}
        sustantivo={['novedad', 'novedades']}
        porPagina={25}
        ordenInicial={{ id: 'desde', dir: 'desc' }}
        resaltada={(x) => x.novedad.id === resaltar}
        alAbrir={(x) => setDialogo({ novedadId: x.novedad.id, empleadoId: null })}
        barra={
          <Toolbar
            filtros={
              <>
                <BotonPildora
                  etiqueta="Persona"
                  valor={empleado ? (personas[empleado]?.nombre.split(' ')[0] ?? '…') : 'Todas'}
                  data-testid="novedades-filtro-persona"
                >
                  <Select
                    etiqueta="Persona"
                    valor={empleado ?? TODOS}
                    alCambiar={(v) => cambiarEmpleado(v === TODOS ? null : v)}
                    opciones={[
                      { valor: TODOS, etiqueta: 'Todas las personas' },
                      ...Object.values(personas).map((p) => ({ valor: p.id, etiqueta: p.nombre })),
                    ]}
                    data-testid="novedades-select-persona"
                  />
                </BotonPildora>
                <BotonPildora
                  etiqueta="Tipo"
                  valor={tipo === TODOS ? 'Todos' : ETIQUETA_NOVEDAD[tipo]}
                  data-testid="novedades-filtro-tipo"
                >
                  <Select
                    etiqueta="Tipo"
                    valor={tipo}
                    alCambiar={(v) => setTipo(v as TipoNovedad | typeof TODOS)}
                    opciones={[
                      { valor: TODOS, etiqueta: 'Todos los tipos' },
                      ...TIPOS_NOVEDAD.map((t) => ({ valor: t, etiqueta: ETIQUETA_NOVEDAD[t] })),
                    ]}
                    data-testid="novedades-select-tipo"
                  />
                </BotonPildora>
              </>
            }
            derecha={
              <Segmentado
                etiqueta="Estado"
                tamano="sm"
                valor={estado}
                alCambiar={setEstado}
                opciones={[
                  { valor: 'todas', etiqueta: 'Todas' },
                  { valor: 'vigente', etiqueta: 'Vigentes' },
                  { valor: 'proxima', etiqueta: 'Próximas' },
                  { valor: 'pasada', etiqueta: 'Pasadas' },
                ]}
                data-testid="novedades-estado"
              />
            }
            chips={chips}
            alLimpiar={limpiar}
          />
        }
        vacio={
          <EmptyState
            tamano="tabla"
            icono={CalendarOff}
            titulo={TEXTOS.novedades.vacioTitulo}
            texto={TEXTOS.novedades.vacioTexto}
            accion={
              <Button icono={Plus} onClick={() => setDialogo({ novedadId: null, empleadoId: empleado })}>
                Registrar novedad
              </Button>
            }
          />
        }
        accionesFila={(x) => (
          <Menu
            etiqueta={`Acciones de la novedad de ${x.nombre}`}
            disparador={<BotonAccionesFila aria-label={`Acciones de la novedad de ${x.nombre}`} />}
          >
            <ItemMenu
              icono={Pencil}
              onSelect={() => setDialogo({ novedadId: x.novedad.id, empleadoId: null })}
            >
              Editar
            </ItemMenu>
            <ItemMenu icono={Trash2} peligro onSelect={() => setAEliminar(x)}>
              Eliminar
            </ItemMenu>
          </Menu>
        )}
        data-testid="novedades-tabla"
      />
      <div className="mt-3">
        <NotaLegal tipo="nomina" />
      </div>

      {dialogo && (
        <DialogoNovedad
          key={dialogo.novedadId ?? `nueva-${dialogo.empleadoId}`}
          novedad={
            dialogo.novedadId
              ? (filas.find((x) => x.novedad.id === dialogo.novedadId)?.novedad ?? null)
              : null
          }
          empleadoInicial={dialogo.empleadoId}
          alCerrar={() => setDialogo(null)}
          alGuardar={(id) => {
            setDialogo(null);
            navegar(rutas.novedades({ empleado, resaltar: id }), { replace: true });
          }}
        />
      )}

      <ConfirmarEliminacion
        abierto={!!aEliminar}
        alCambiar={(a) => !a && setAEliminar(null)}
        pregunta={
          aEliminar
            ? `¿Eliminar la ${ETIQUETA_NOVEDAD[aEliminar.novedad.tipo].toLowerCase()} de ${aEliminar.nombre}?`
            : ''
        }
        consecuencias={
          aEliminar
            ? `Se quitan ${plural(aEliminar.dias, 'día')} de novedad. ${aEliminar.estado === 'pasada' ? 'La asistencia de esos días se recalcula y puede aparecer como ausencia.' : 'Esos días vuelven a quedar disponibles para programarle turnos.'}`
            : ''
        }
        accion="Eliminar novedad"
        alConfirmar={() => aEliminar && eliminar(aEliminar)}
        nota={null}
      />
    </>
  );
}
