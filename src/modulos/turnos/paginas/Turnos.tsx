import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Copy, Plus, Users } from 'lucide-react';
import { BotonIcono, Button, ConfirmarEliminacion, Dialog, Dinero, EmptyState, FranjaResumen, ItemMenu, Menu, Pista, Segmentado, avisar } from '@/ui';
import type { FechaISO, Id, Turno } from '@/dominio/tipos';
import { lunesDe, sumarDias } from '@/dominio/reglas/fechas';
import { useAcciones, useHoy, useSel } from '@/estado';
import { selLocales, selRiesgosContratacion } from '@/selectores';
import { fechaLarga } from '@/lib/formato';
import {
  etiquetaSemana,
  evaluarTurno,
  fraseExceso,
  propuestaDeArrastre,
  rangoHoras,
  textoHoras,
  type DestinoArrastre,
  type EvaluacionTurno,
  type OrigenArrastre,
} from '../calculos';
import { CuadriculaTurnos } from '../componentes/CuadriculaTurnos';
import { DialogoTurno } from '../componentes/DialogoTurno';
import { PanelRecargos } from '../componentes/PanelRecargos';
import { EncabezadoTurnos, LimiteError } from '../componentes/Piezas';
import { useFiltrosTurnos, type FiltrosTurnos } from '../hooks';
import { selParametrosTurnos, selRecargosDetallados, selSemanaLocal } from '../selectores';
import { ETIQUETA_NOVEDAD, ETIQUETA_TIPO_TURNO, TEXTOS } from '../textos';

type DialogoAbierto = { turno: Turno | null; empleadoId: Id | null; fecha: FechaISO | null } | null;

export default function Turnos() {
  const f = useFiltrosTurnos();
  const [dialogo, setDialogo] = useState<DialogoAbierto>(null);
  return (
    <>
      <EncabezadoTurnos
        seccion="turnos"
        titulo={TEXTOS.turnos.titulo}
        subtitulo={TEXTOS.turnos.subtitulo}
        local={f.localDeLaUrl ? f.local : null}
        acciones={
          <Button icono={Plus} onClick={() => setDialogo({ turno: null, empleadoId: null, fecha: null })} data-testid="turnos-programar">
            Programar turno
          </Button>
        }
      />
      <LimiteError>
        <CuerpoTurnos f={f} dialogo={dialogo} setDialogo={setDialogo} />
      </LimiteError>
    </>
  );
}

interface Pendiente {
  origen: OrigenArrastre;
  destino: DestinoArrastre;
  evaluacion: Extract<EvaluacionTurno, { resultado: 'exceso' }>;
  nombre: string;
}

function CuerpoTurnos({ f, dialogo, setDialogo }: { f: FiltrosTurnos; dialogo: DialogoAbierto; setDialogo: (d: DialogoAbierto) => void }) {
  const acciones = useAcciones();
  const hoy = useHoy();
  const locales = useSel(selLocales, { incluirBodega: true });
  const semana = useSel(selSemanaLocal, { localId: f.local, lunes: f.lunes });
  const recargos = useSel(selRecargosDetallados, { localId: f.local, lunes: f.lunes });
  const parametros = useSel(selParametrosTurnos);
  const riesgos = useSel(selRiesgosContratacion, { hoy });
  const conRiesgo = useMemo(() => new Set(riesgos.map((r) => r.empleadoId)), [riesgos]);
  const nombresLocales = useMemo(() => new Map(locales.map((l) => [l.id, l.nombre])), [locales]);
  const localNombre = locales.find((l) => l.id === f.local)?.nombre ?? '';

  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [aEliminar, setAEliminar] = useState<Turno | null>(null);
  const [copia, setCopia] = useState<{ direccion: 'anterior' | 'siguiente'; mensaje: string } | null>(null);

  const filaDe = (empleadoId: Id) => semana.filas.find((x) => x.empleadoId === empleadoId);

  const evaluar = (origen: OrigenArrastre, destino: DestinoArrastre): EvaluacionTurno | null => {
    const p = propuestaDeArrastre(origen, destino, f.local);
    const fila = filaDe(destino.empleadoId);
    return p && fila ? evaluarTurno(p, fila.turnos, fila.novedades, fila.maximo) : null;
  };

  /** Programa o mueve el turno; el dominio vuelve a validar y su mensaje (en español) se muestra tal cual. */
  const ejecutar = (origen: OrigenArrastre, destino: DestinoArrastre, aceptarExceso: boolean) => {
    const p = propuestaDeArrastre(origen, destino, f.local);
    if (!p) return;
    const nombre = filaDe(destino.empleadoId)?.nombre ?? 'La persona';
    const r =
      origen.clase === 'plantilla'
        ? acciones.asignarTurno({ empleadoId: p.empleadoId, localId: f.local, fecha: p.fecha, tipo: p.tipo, inicio: p.inicio, fin: p.fin, descansoMin: p.descansoMin, aceptarExceso })
        : acciones.moverTurno({ turnoId: origen.turno.id, empleadoId: p.empleadoId, localId: f.local, fecha: p.fecha, tipo: p.tipo, inicio: p.inicio, fin: p.fin, aceptarExceso });
    if (!r.ok) {
      avisar({ tipo: 'error', texto: r.error.mensaje });
      return;
    }
    avisar({
      tipo: 'exito',
      texto: origen.clase === 'plantilla' ? 'Turno programado' : 'Turno movido',
      detalle: `${nombre} · ${ETIQUETA_TIPO_TURNO[p.tipo]} ${rangoHoras(p.inicio, p.fin)} · ${fechaLarga(p.fecha)}`,
    });
  };

  const alSoltar = (origen: OrigenArrastre, destino: DestinoArrastre) => {
    const ev = evaluar(origen, destino);
    if (!ev) return;
    const nombre = filaDe(destino.empleadoId)?.nombre ?? 'La persona';
    if (ev.resultado === 'novedad') {
      avisar({ tipo: 'alerta', texto: `${nombre} está en ${ETIQUETA_NOVEDAD[ev.novedad.tipo].toLowerCase()} ese día`, detalle: 'No se le programan turnos mientras dure la novedad.' });
      return;
    }
    if (ev.resultado === 'solapa') {
      avisar({ tipo: 'alerta', texto: `${nombre} ya tiene un turno de ${rangoHoras(ev.con.inicio, ev.con.fin)} ese día`, detalle: 'Mueve o elimina ese turno primero.' });
      return;
    }
    if (ev.resultado === 'exceso') {
      setPendiente({ origen, destino, evaluacion: ev, nombre });
      return;
    }
    ejecutar(origen, destino, false);
  };

  const copiar = (direccion: 'anterior' | 'siguiente', aceptarExceso: boolean) => {
    const lunesOrigen = direccion === 'anterior' ? sumarDias(f.lunes, -7) : f.lunes;
    const lunesDestino = direccion === 'anterior' ? f.lunes : sumarDias(f.lunes, 7);
    const r = acciones.copiarSemanaTurnos({ localId: f.local, lunesOrigen, lunesDestino, aceptarExceso });
    if (!r.ok) {
      if (r.error.codigo === 'JORNADA_EXCEDIDA' && !aceptarExceso) setCopia({ direccion, mensaje: r.error.mensaje });
      else avisar({ tipo: 'alerta', texto: r.error.mensaje });
      return;
    }
    const n = r.eventos.filter((e) => e.tipo === 'TurnoCambiado').length;
    avisar({ tipo: 'exito', texto: `Se copiaron ${n} ${n === 1 ? 'turno' : 'turnos'}`, detalle: `${localNombre} · ${etiquetaSemana(lunesDestino)}` });
    if (direccion === 'siguiente') f.cambiar({ semana: lunesDestino });
  };

  const eliminar = (t: Turno) => {
    const r = acciones.eliminarTurno({ turnoId: t.id });
    setAEliminar(null);
    if (!r.ok) {
      avisar({ tipo: 'error', texto: r.error.mensaje });
      return;
    }
    avisar({ tipo: 'exito', texto: 'Turno eliminado', detalle: `${ETIQUETA_TIPO_TURNO[t.tipo]} · ${fechaLarga(t.fecha)}` });
  };

  const personas = semana.filas.map((x) => ({ id: x.empleadoId, nombre: x.nombre }));
  const esSemanaActual = f.lunes === lunesDe(hoy);
  const eliminando = aEliminar ? semana.filas.find((x) => x.empleadoId === aEliminar.empleadoId) : null;

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4" data-testid="turnos-controles">
        <div className="flex flex-wrap items-center gap-3">
          <Segmentado
            etiqueta="Local"
            valor={f.local}
            alCambiar={(v) => f.cambiar({ local: v })}
            opciones={locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))}
            data-testid="turnos-selector-local"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BotonIcono icono={ChevronLeft} etiqueta="Semana anterior" variante="secondary" onClick={() => f.cambiar({ semana: sumarDias(f.lunes, -7) })} data-testid="turnos-semana-anterior" />
          <p className="min-w-[250px] text-center t-body font-bold text-ink num" data-testid="turnos-semana-etiqueta" aria-live="polite">
            {etiquetaSemana(f.lunes)}
          </p>
          <BotonIcono icono={ChevronRight} etiqueta="Semana siguiente" variante="secondary" onClick={() => f.cambiar({ semana: sumarDias(f.lunes, 7) })} data-testid="turnos-semana-siguiente" />
          <Button variante="secondary" icono={CalendarDays} disabled={esSemanaActual} onClick={() => f.cambiar({ semana: hoy })}>
            Esta semana
          </Button>
          <Menu etiqueta="Copiar semana" disparador={<Button variante="secondary" icono={Copy} data-testid="turnos-copiar">Copiar semana</Button>}>
            <ItemMenu icono={Copy} onSelect={() => copiar('anterior', false)}>
              {TEXTOS.turnos.copiarAnterior}
            </ItemMenu>
            <ItemMenu icono={Copy} onSelect={() => copiar('siguiente', false)}>
              {TEXTOS.turnos.copiarSiguiente}
            </ItemMenu>
          </Menu>
        </div>
      </div>

      <FranjaResumen
        className="mt-4"
        cifras={[
          { etiqueta: 'Horas programadas', valor: <span data-testid="turnos-kpi-horas">{textoHoras(semana.horasLocal)}</span> },
          {
            etiqueta: 'Pasadas de la jornada',
            valor: (
              <span data-testid="turnos-kpi-exceso">
                {semana.conExceso} {semana.conExceso === 1 ? 'persona' : 'personas'}
              </span>
            ),
          },
          {
            etiqueta: <Pista id="turnos.recargos">Recargos estimados de la semana</Pista>,
            valor: (
              <span data-testid="turnos-kpi-recargos">
                <Dinero valor={recargos.total} />
              </span>
            ),
          },
          { etiqueta: 'Horas con recargo', valor: <span data-testid="turnos-kpi-horas-recargo">{textoHoras(recargos.horasNocturnas + recargos.horasDominicalFestivo)}</span> },
        ]}
      />

      {semana.filas.length === 0 ? (
        <div className="mt-6 border border-line bg-surface">
          <EmptyState icono={Users} titulo={TEXTOS.turnos.sinEquipoTitulo} texto={TEXTOS.turnos.sinEquipoTexto} />
        </div>
      ) : (
        <div className="mt-6">
          <CuadriculaTurnos
            semana={semana}
            localId={f.local}
            hoy={hoy}
            nombresLocales={nombresLocales}
            jornadaNocturnaInicio={parametros.jornadaNocturna}
            conRiesgo={conRiesgo}
            evaluar={evaluar}
            alSoltar={alSoltar}
            alAbrirTurno={(t) => setDialogo({ turno: t, empleadoId: t.empleadoId, fecha: t.fecha })}
            alNuevoTurno={(d) => setDialogo({ turno: null, empleadoId: d.empleadoId, fecha: d.fecha })}
          />
        </div>
      )}

      <PanelRecargos recargos={recargos} parametros={parametros} localNombre={localNombre} />

      {dialogo && (
        <DialogoTurno
          key={dialogo.turno?.id ?? `${dialogo.empleadoId}|${dialogo.fecha}`}
          turno={dialogo.turno}
          empleadoInicial={dialogo.empleadoId}
          fechaInicial={dialogo.fecha}
          localId={f.local}
          personas={personas}
          alCerrar={() => setDialogo(null)}
          alGuardar={() => setDialogo(null)}
          alEliminar={(t) => {
            setDialogo(null);
            setAEliminar(t);
          }}
        />
      )}

      <Dialog
        abierto={!!pendiente}
        alCambiar={(a) => !a && setPendiente(null)}
        eyebrow="Jornada máxima"
        titulo={TEXTOS.turnos.excesoTitulo}
        ancho="sm"
        data-testid="turnos-confirmar-exceso"
        pie={
          <>
            <Button variante="secondary" onClick={() => setPendiente(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (pendiente) ejecutar(pendiente.origen, pendiente.destino, true);
                setPendiente(null);
              }}
              data-testid="turnos-confirmar-exceso-si"
            >
              Programar con horas extra
            </Button>
          </>
        }
      >
        {pendiente && (
          <p className="t-body text-ink-2" data-testid="turnos-exceso-frase">
            {fraseExceso(pendiente.nombre, pendiente.evaluacion.horas, pendiente.evaluacion.maximo)}
          </p>
        )}
      </Dialog>

      <Dialog
        abierto={!!copia}
        alCambiar={(a) => !a && setCopia(null)}
        eyebrow="Copiar semana"
        titulo="Esa semana pasa de la jornada máxima"
        ancho="sm"
        pie={
          <>
            <Button variante="secondary" onClick={() => setCopia(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (copia) copiar(copia.direccion, true);
                setCopia(null);
              }}
            >
              Copiar con horas extra
            </Button>
          </>
        }
      >
        <p className="t-body text-ink-2">{copia?.mensaje}</p>
      </Dialog>

      <ConfirmarEliminacion
        abierto={!!aEliminar}
        alCambiar={(a) => !a && setAEliminar(null)}
        pregunta={aEliminar ? `¿Eliminar el turno de ${eliminando?.nombre ?? 'esta persona'}?` : ''}
        consecuencias={
          aEliminar
            ? `Se quita el turno de ${ETIQUETA_TIPO_TURNO[aEliminar.tipo].toLowerCase()} del ${fechaLarga(aEliminar.fecha)} (${rangoHoras(aEliminar.inicio, aEliminar.fin)}). Sus horas de la semana bajan${eliminando ? ` de ${textoHoras(eliminando.horas)}` : ''}.`
            : ''
        }
        accion="Eliminar turno"
        alConfirmar={() => aEliminar && eliminar(aEliminar)}
        nota={null}
      />
    </>
  );
}
