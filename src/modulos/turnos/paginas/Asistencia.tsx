import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, CalendarOff, ClipboardCheck, PencilLine } from 'lucide-react';
import {
  BadgeEstado,
  BarraProgreso,
  BotonAccionesFila,
  BotonEnlace,
  BotonExportar,
  BotonPildora,
  EmptyState,
  FranjaResumen,
  ItemMenu,
  Menu,
  Segmentado,
  Select,
  SelectorRango,
  Table,
  Toolbar,
  textoRango,
  type ChipActivo,
  type ColumnaTabla,
} from '@/ui';
import { ESTADOS_ASISTENCIA } from '@/config/estados';
import type { FechaISO, Id } from '@/dominio/tipos';
import { diaSemana } from '@/dominio/reglas/fechas';
import { sumarHoras } from '@/dominio/reglas/asistencia';
import { useAhora, useSel } from '@/estado';
import { selLocales } from '@/selectores';
import { rutas } from '@/app/rutas';
import { DIAS_CORTOS, fechaCorta, hora, porcentaje } from '@/lib/formato';
import { puntualidad, rangoHoras, textoHoras, textoMinutos } from '../calculos';
import { DialogoMarcaciones } from '../componentes/DialogoMarcaciones';
import { EncabezadoTurnos, LimiteError } from '../componentes/Piezas';
import { useFiltrosAsistencia, type FiltrosAsistencia } from '../hooks';
import { selAsistenciaVista, selPersonas, type AsistenciaVista, type FilaAsistencia } from '../selectores';
import { ETIQUETA_TIPO_TURNO, TEXTOS } from '../textos';

type ResumenFila = AsistenciaVista['resumen'][number];

export default function Asistencia() {
  const f = useFiltrosAsistencia();
  return (
    <>
      <EncabezadoTurnos
        seccion="asistencia"
        titulo={TEXTOS.asistencia.titulo}
        subtitulo={TEXTOS.asistencia.subtitulo}
        local={f.local === 'todos' ? null : f.local}
        acciones={
          <BotonExportar
            reporte="asistencia"
            menu
            filtros={{ desde: f.desde, hasta: f.hasta, localId: f.local }}
          />
        }
      />
      <LimiteError testid="asistencia-error">
        <CuerpoAsistencia f={f} />
      </LimiteError>
    </>
  );
}

const diaYFecha = (fecha: FechaISO) => `${DIAS_CORTOS[diaSemana(fecha)]} ${fechaCorta(fecha)}`;
const TODOS = '*';

function CuerpoAsistencia({ f }: { f: FiltrosAsistencia }) {
  const ahora = useAhora();
  const navegar = useNavigate();
  const personas = useSel(selPersonas);
  const locales = useSel(selLocales, { incluirBodega: true });
  const vista = useSel(selAsistenciaVista, {
    desde: f.desde,
    hasta: f.hasta,
    ahora,
    empleadoId: f.empleado ?? undefined,
    localId: f.local,
  });
  const [pestana, setPestana] = useState<'personas' | 'dias'>(f.empleado ? 'dias' : 'personas');
  const [corrigiendo, setCorrigiendo] = useState<{ empleadoId: Id; nombre: string; fecha: FechaISO } | null>(
    null,
  );
  const nombreLocal = useMemo(() => new Map(locales.map((l) => [l.id, l.nombre])), [locales]);
  const local = (id: Id | null) => (id ? (nombreLocal.get(id) ?? id) : '—');

  const totales = useMemo(() => {
    const t = { horas: 0, extra: 0, tardes: 0, minutosTarde: 0, ausencias: 0, aTiempo: 0, turnos: 0 };
    for (const r of vista.resumen) {
      t.horas += r.horasTrabajadas;
      t.extra += r.horasExtra;
      t.tardes += r.tardes;
      t.minutosTarde += r.minutosTarde;
      t.ausencias += r.ausencias;
      t.aTiempo += r.aTiempo;
      t.turnos += r.turnos;
    }
    return t;
  }, [vista.resumen]);
  const nomina = useMemo(() => sumarHoras(vista.filas.map((x) => x.dia)), [vista.filas]);
  const punt = puntualidad(totales.aTiempo, totales.tardes);

  const chips: ChipActivo[] = [];
  if (f.empleado)
    chips.push({
      id: 'persona',
      texto: `Persona: ${personas[f.empleado]?.nombre ?? '…'}`,
      alQuitar: () => f.cambiar({ empleado: null }),
    });
  if (f.local !== 'todos')
    chips.push({
      id: 'local',
      texto: `Local: ${local(f.local)}`,
      alQuitar: () => f.cambiar({ local: 'todos' }),
    });

  const colDias: ColumnaTabla<FilaAsistencia>[] = [
    {
      id: 'fecha',
      encabezado: 'Día',
      ancho: 130,
      ordenar: (x) => `${x.dia.fecha}|${x.corto}`,
      celda: (x) => (
        <span className="num whitespace-nowrap font-bold text-ink">{diaYFecha(x.dia.fecha)}</span>
      ),
    },
    {
      id: 'persona',
      encabezado: 'Persona',
      ancho: 150,
      ordenar: (x) => x.corto,
      celda: (x) => (
        <span className="whitespace-nowrap" title={x.nombre}>
          {x.corto}
        </span>
      ),
    },
    {
      id: 'local',
      encabezado: 'Local',
      ancho: 130,
      celda: (x) => <span className="whitespace-nowrap">{local(x.localId)}</span>,
    },
    {
      id: 'turno',
      encabezado: 'Turno',
      ancho: 280,
      celda: (x) =>
        x.turno ? (
          <span className="num whitespace-nowrap">{`${ETIQUETA_TIPO_TURNO[x.turno.tipo]} · ${rangoHoras(x.turno.inicio, x.turno.fin)}`}</span>
        ) : (
          <span className="text-muted">Sin turno</span>
        ),
    },
    {
      id: 'entrada',
      encabezado: 'Entró',
      ancho: 110,
      numerica: true,
      celda: (x) =>
        x.dia.entrada ? (
          <span className="num whitespace-nowrap">{hora(x.dia.entrada)}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      id: 'salida',
      encabezado: 'Salió',
      ancho: 110,
      numerica: true,
      celda: (x) =>
        x.dia.salida ? (
          <span className="num whitespace-nowrap">{hora(x.dia.salida)}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      ancho: 190,
      celda: (x) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <BadgeEstado estado={ESTADOS_ASISTENCIA[x.dia.estado]} tamano="sm" />
          {x.dia.minutosTarde > 0 && (
            <span className="t-small num text-ink-2">{textoMinutos(x.dia.minutosTarde)}</span>
          )}
        </span>
      ),
    },
    {
      id: 'horas',
      encabezado: 'Horas',
      numerica: true,
      ordenar: (x) => x.dia.horasTrabajadas,
      celda: (x) => (
        <span className="num">{x.dia.horasTrabajadas > 0 ? textoHoras(x.dia.horasTrabajadas) : '—'}</span>
      ),
    },
    {
      id: 'extra',
      encabezado: 'Extra',
      numerica: true,
      ordenar: (x) => x.dia.horasExtraDiurnas + x.dia.horasExtraNocturnas,
      celda: (x) => {
        const e = x.dia.horasExtraDiurnas + x.dia.horasExtraNocturnas;
        return <span className="num">{e > 0 ? textoHoras(e) : '—'}</span>;
      },
    },
  ];

  const colPersonas: ColumnaTabla<ResumenFila>[] = [
    {
      id: 'persona',
      encabezado: 'Persona',
      ancho: 170,
      ordenar: (r) => r.corto,
      celda: (r) => (
        <span className="font-bold text-ink" title={r.nombre}>
          {r.corto}
        </span>
      ),
    },
    { id: 'local', encabezado: 'Local', ancho: 150, celda: (r) => local(r.localId) },
    {
      id: 'turnos',
      encabezado: 'Turnos',
      numerica: true,
      ordenar: (r) => r.turnos,
      celda: (r) => <span className="num">{r.turnos}</span>,
    },
    {
      id: 'atiempo',
      encabezado: 'A tiempo',
      numerica: true,
      ordenar: (r) => r.aTiempo,
      celda: (r) => <span className="num">{r.aTiempo}</span>,
    },
    {
      id: 'tardes',
      encabezado: 'Llegadas tarde',
      ancho: 170,
      numerica: true,
      ordenar: (r) => r.tardes,
      celda: (r) => (
        <span className="num">{r.tardes > 0 ? `${r.tardes} · ${textoMinutos(r.minutosTarde)}` : '0'}</span>
      ),
    },
    {
      id: 'ausencias',
      encabezado: 'Ausencias',
      numerica: true,
      ordenar: (r) => r.ausencias,
      celda: (r) => <span className="num">{r.ausencias}</span>,
    },
    {
      id: 'puntualidad',
      encabezado: 'Puntualidad',
      ancho: 150,
      ordenar: (r) => puntualidad(r.aTiempo, r.tardes) ?? -1,
      celda: (r) => {
        const p = puntualidad(r.aTiempo, r.tardes);
        return p === null ? (
          <span className="text-muted">Sin entradas</span>
        ) : (
          <BarraProgreso valor={p} detalle={porcentaje(p, 0)} />
        );
      },
    },
    {
      id: 'horas',
      encabezado: 'Horas',
      ancho: 120,
      numerica: true,
      ordenar: (r) => r.horasTrabajadas,
      celda: (r) => <span className="num">{textoHoras(r.horasTrabajadas)}</span>,
    },
    {
      id: 'extra',
      encabezado: 'Extra',
      numerica: true,
      ordenar: (r) => r.horasExtra,
      celda: (r) => <span className="num">{r.horasExtra > 0 ? textoHoras(r.horasExtra) : '—'}</span>,
    },
  ];

  const barra = (
    <Toolbar
      filtros={
        <>
          <BotonPildora
            etiqueta="Fechas"
            valor={textoRango({ desde: f.desde, hasta: f.hasta }, f.hoy)}
            anchoPanel={720}
            data-testid="asistencia-filtro-fechas"
          >
            <SelectorRango
              soloPanel
              hoy={f.hoy}
              valor={{ desde: f.desde, hasta: f.hasta }}
              alCambiar={(r) => f.cambiar({ desde: r.desde, hasta: r.hasta })}
            />
          </BotonPildora>
          <BotonPildora
            etiqueta="Local"
            valor={f.local === 'todos' ? 'Todos' : local(f.local)}
            data-testid="asistencia-filtro-local"
          >
            <Select
              etiqueta="Local"
              valor={f.local}
              alCambiar={(v) => f.cambiar({ local: v })}
              opciones={[
                { valor: 'todos', etiqueta: 'Todos los locales' },
                ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre })),
              ]}
              data-testid="asistencia-select-local"
            />
          </BotonPildora>
          <BotonPildora
            etiqueta="Persona"
            valor={f.empleado ? (personas[f.empleado]?.nombre.split(' ')[0] ?? '…') : 'Todas'}
            data-testid="asistencia-filtro-persona"
          >
            <Select
              etiqueta="Persona"
              valor={f.empleado ?? TODOS}
              alCambiar={(v) => f.cambiar({ empleado: v === TODOS ? null : v })}
              opciones={[
                { valor: TODOS, etiqueta: 'Todas las personas' },
                ...Object.values(personas).map((p) => ({ valor: p.id, etiqueta: p.nombre })),
              ]}
              data-testid="asistencia-select-persona"
            />
          </BotonPildora>
        </>
      }
      derecha={
        <Segmentado
          etiqueta="Vista"
          tamano="sm"
          valor={pestana}
          alCambiar={setPestana}
          opciones={[
            { valor: 'personas', etiqueta: 'Por persona' },
            { valor: 'dias', etiqueta: 'Por día' },
          ]}
          data-testid="asistencia-vista"
        />
      }
      chips={chips}
      alLimpiar={f.limpiar}
    />
  );

  const vacio = (
    <EmptyState
      tamano="tabla"
      icono={ClipboardCheck}
      titulo={TEXTOS.asistencia.vacioTitulo}
      texto={TEXTOS.asistencia.vacioTexto}
      accion={
        <BotonEnlace
          to={rutas.turnos({ local: f.local === 'todos' ? null : f.local })}
          variante="secondary"
          icono={ArrowRight}
        >
          Ir a los turnos
        </BotonEnlace>
      }
    />
  );

  return (
    <>
      <FranjaResumen
        className="mt-8"
        cifras={[
          {
            etiqueta: 'Horas trabajadas',
            valor: <span data-testid="asistencia-kpi-horas">{textoHoras(totales.horas)}</span>,
          },
          {
            etiqueta: 'Horas extra',
            valor: <span data-testid="asistencia-kpi-extra">{textoHoras(totales.extra)}</span>,
          },
          {
            etiqueta: 'Llegadas tarde',
            valor: (
              <span data-testid="asistencia-kpi-tardes">
                {totales.tardes}
                {totales.tardes > 0 && (
                  <span className="ml-2 t-small font-normal text-muted">
                    {textoMinutos(totales.minutosTarde)} en total
                  </span>
                )}
              </span>
            ),
          },
          {
            etiqueta: 'Ausencias',
            valor: <span data-testid="asistencia-kpi-ausencias">{totales.ausencias}</span>,
          },
        ]}
      />

      <div
        className="mt-4 grid grid-cols-1 gap-4 border border-line bg-surface p-5 md:grid-cols-[minmax(0,1fr)_auto]"
        data-testid="asistencia-nomina"
      >
        <div>
          <h2 className="t-label text-ink">{TEXTOS.asistencia.alimentaNomina}</h2>
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
            <Dato etiqueta="Extra diurnas" valor={textoHoras(nomina.horasExtraDiurnas)} />
            <Dato etiqueta="Extra nocturnas" valor={textoHoras(nomina.horasExtraNocturnas)} />
            <Dato etiqueta="Recargo nocturno" valor={textoHoras(nomina.horasRecargoNocturno)} />
            <Dato etiqueta="Dominical y festivo" valor={textoHoras(nomina.horasDominicalFestivo)} />
            <Dato etiqueta="Puntualidad" valor={punt === null ? '—' : porcentaje(punt, 0)} />
          </dl>
        </div>
        <div className="flex items-end">
          <BotonEnlace to={rutas.nomina()} variante="secondary" iconoDerecha={ArrowRight}>
            Ver en la nómina
          </BotonEnlace>
        </div>
      </div>

      {pestana === 'personas' ? (
        <Table
          className="mt-4"
          etiqueta="Asistencia por persona"
          columnas={colPersonas}
          filas={vista.resumen}
          clave={(r) => r.empleadoId}
          sustantivo={['persona', 'personas']}
          porPagina={0}
          ordenInicial={{ id: 'persona', dir: 'asc' }}
          alAbrir={(r) => {
            f.cambiar({ empleado: r.empleadoId });
            setPestana('dias');
          }}
          totales={{
            persona: <span className="font-bold text-ink">Todas</span>,
            turnos: <span className="num">{totales.turnos}</span>,
            atiempo: <span className="num">{totales.aTiempo}</span>,
            tardes: <span className="num">{totales.tardes}</span>,
            ausencias: <span className="num">{totales.ausencias}</span>,
            horas: <span className="num">{textoHoras(totales.horas)}</span>,
            extra: <span className="num">{textoHoras(totales.extra)}</span>,
          }}
          barra={barra}
          vacio={vacio}
          data-testid="asistencia-tabla-personas"
        />
      ) : (
        <Table
          className="mt-4"
          etiqueta="Asistencia por día"
          columnas={colDias}
          filas={vista.filas}
          clave={(x) => `${x.dia.empleadoId}@${x.dia.fecha}`}
          sustantivo={['registro', 'registros']}
          porPagina={50}
          ordenInicial={{ id: 'fecha', dir: 'desc' }}
          totales={{
            persona: <span className="font-bold text-ink">Total</span>,
            horas: <span className="num">{textoHoras(totales.horas)}</span>,
            extra: <span className="num">{textoHoras(totales.extra)}</span>,
          }}
          barra={barra}
          vacio={vacio}
          accionesFila={(x) => (
            <Menu
              etiqueta={`Acciones de ${x.corto} el ${diaYFecha(x.dia.fecha)}`}
              disparador={
                <BotonAccionesFila aria-label={`Acciones de ${x.corto} el ${diaYFecha(x.dia.fecha)}`} />
              }
            >
              {(x.dia.entrada || x.dia.salida) && (
                <ItemMenu
                  icono={PencilLine}
                  onSelect={() =>
                    setCorrigiendo({ empleadoId: x.dia.empleadoId, nombre: x.nombre, fecha: x.dia.fecha })
                  }
                >
                  Corregir marcaciones
                </ItemMenu>
              )}
              <ItemMenu
                icono={CalendarOff}
                onSelect={() => navegar(rutas.novedades({ empleado: x.dia.empleadoId }))}
              >
                Ver o registrar novedades
              </ItemMenu>
            </Menu>
          )}
          data-testid="asistencia-tabla-dias"
        />
      )}

      {corrigiendo && (
        <DialogoMarcaciones
          key={`${corrigiendo.empleadoId}@${corrigiendo.fecha}`}
          empleadoId={corrigiendo.empleadoId}
          nombre={corrigiendo.nombre}
          fecha={corrigiendo.fecha}
          alCerrar={() => setCorrigiendo(null)}
        />
      )}
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="t-small text-ink-2">{etiqueta}</dt>
      <dd className="t-h3 num text-ink">{valor}</dd>
    </div>
  );
}
