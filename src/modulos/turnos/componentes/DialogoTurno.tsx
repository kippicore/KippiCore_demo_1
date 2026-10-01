import { useMemo, useState } from 'react';
import { Trash2, TriangleAlert } from 'lucide-react';
import { Button, Checkbox, Dialog, Icono, Input, InputNumero, Select, SelectorFecha, avisar } from '@/ui';
import type { FechaISO, Id, TipoTurno, Turno } from '@/dominio/tipos';
import { lunesDe } from '@/dominio/reglas/fechas';
import { horasNetasTurno, horasNocturnasTurno } from '@/dominio/reglas/jornada';
import { useAcciones, useHoy, useSel } from '@/estado';
import { fechaLarga } from '@/lib/formato';
import {
  evaluarTurno,
  fraseExceso,
  plantillaTurno,
  rangoHoras,
  textoHoras,
  validarBorradorTurno,
  type BorradorTurno,
  type CampoTurno,
} from '../calculos';
import { selHorasSemana } from '@/selectores';
import { selNovedadesDe, selParametrosTurnos } from '../selectores';
import { AYUDA_TIPO_TURNO, ETIQUETA_NOVEDAD, ETIQUETA_TIPO_TURNO, TIPOS_TURNO } from '../textos';

export interface PersonaOpcion {
  id: Id;
  nombre: string;
}

export interface PropsDialogoTurno {
  /** Turno a editar; sin él, se programa uno nuevo. */
  turno?: Turno | null;
  empleadoInicial?: Id | null;
  fechaInicial?: FechaISO | null;
  localId: Id;
  personas: readonly PersonaOpcion[];
  alCerrar: () => void;
  /** Se llama con el turno guardado (la pantalla lo muestra). */
  alGuardar: () => void;
  alEliminar?: (turno: Turno) => void;
}

/**
 * Programar o corregir un turno con la validación de la jornada en vivo: si la semana de la persona pasa del
 * máximo, el formulario lo dice con las horas exactas y pide confirmar que son horas extra antes de guardar.
 */
export function DialogoTurno({ turno, empleadoInicial, fechaInicial, localId, personas, alCerrar, alGuardar, alEliminar }: PropsDialogoTurno) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const parametros = useSel(selParametrosTurnos);
  const edicion = !!turno;
  const inicial = useMemo<BorradorTurno>(() => {
    if (turno) return { empleadoId: turno.empleadoId, fecha: turno.fecha, tipo: turno.tipo, inicio: turno.inicio, fin: turno.fin, descansoMin: turno.descansoMin };
    const p = plantillaTurno('apertura', localId);
    return { empleadoId: empleadoInicial ?? null, fecha: fechaInicial ?? hoy, tipo: 'apertura', inicio: p.inicio, fin: p.fin, descansoMin: p.descansoMin };
  }, [turno, empleadoInicial, fechaInicial, localId, hoy]);
  const [b, setB] = useState<BorradorTurno>(inicial);
  const [aceptaExceso, setAceptaExceso] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<CampoTurno, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);
  const hayCambios = JSON.stringify(b) !== JSON.stringify(inicial);

  const cambiar = (c: Partial<BorradorTurno>, campo?: CampoTurno) => {
    setB((p) => ({ ...p, ...c }));
    setTocado(true);
    setErrorGeneral(null);
    if (campo) setErrores((p) => ({ ...p, [campo]: undefined }));
  };
  const cambiarTipo = (tipo: TipoTurno) => {
    // Al cambiar el tipo, el horario vuelve al habitual de ese tipo en este local.
    const p = plantillaTurno(tipo, localId);
    cambiar({ tipo, inicio: p.inicio, fin: p.fin, descansoMin: edicion ? b.descansoMin : p.descansoMin }, 'tipo');
  };

  // Validación en vivo contra la jornada de la semana de la persona y las novedades.
  const lunes = b.fecha ? lunesDe(b.fecha) : hoy;
  const semana = useSel(selHorasSemana, { empleadoId: b.empleadoId ?? '', lunes });
  const novedades = useSel(selNovedadesDe, { empleadoId: b.empleadoId ?? '' });
  const erroresForma = validarBorradorTurno(b);
  const formaOk = Object.keys(erroresForma).length === 0;
  const evaluacion = useMemo(
    () =>
      formaOk && b.empleadoId && b.fecha
        ? evaluarTurno({ empleadoId: b.empleadoId, fecha: b.fecha, inicio: b.inicio, fin: b.fin, descansoMin: b.descansoMin ?? 0, excluirId: turno?.id ?? null }, semana.turnos, novedades, semana.maximo)
        : null,
    [formaOk, b, turno?.id, semana.turnos, semana.maximo, novedades],
  );
  const nombre = personas.find((x) => x.id === b.empleadoId)?.nombre ?? 'La persona';
  const netas = formaOk ? horasNetasTurno({ inicio: b.inicio, fin: b.fin, descansoMin: b.descansoMin ?? 0 }) : null;
  const nocturnas = formaOk ? horasNocturnasTurno({ inicio: b.inicio, fin: b.fin }, parametros.jornadaNocturna) : 0;
  const exceso = evaluacion?.resultado === 'exceso' ? evaluacion : null;

  const guardar = () => {
    setTocado(true);
    setErrorGeneral(null);
    const e = validarBorradorTurno(b);
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    if (evaluacion?.resultado === 'novedad') return setErrorGeneral(`${nombre} está en ${ETIQUETA_NOVEDAD[evaluacion.novedad.tipo].toLowerCase()} ese día. Elige otro día.`);
    if (evaluacion?.resultado === 'solapa') return setErrorGeneral(`${nombre} ya tiene un turno de ${rangoHoras(evaluacion.con.inicio, evaluacion.con.fin)} ese día.`);
    if (exceso && !aceptaExceso) return setErrorGeneral('Confirma que son horas extra o ajusta el turno.');
    const datos = {
      empleadoId: b.empleadoId as Id,
      localId,
      fecha: b.fecha as FechaISO,
      tipo: b.tipo as TipoTurno,
      inicio: b.inicio,
      fin: b.fin,
      aceptarExceso: aceptaExceso,
    };
    const r = turno ? acciones.moverTurno({ turnoId: turno.id, ...datos }) : acciones.asignarTurno({ ...datos, descansoMin: b.descansoMin ?? 0 });
    if (!r.ok) {
      const campo = r.error.campo as CampoTurno | undefined;
      if (campo && ['empleadoId', 'fecha', 'tipo', 'inicio', 'fin', 'descansoMin'].includes(campo)) setErrores({ [campo]: r.error.mensaje });
      else setErrorGeneral(r.error.mensaje);
      return;
    }
    avisar({ tipo: 'exito', texto: edicion ? 'Turno actualizado' : 'Turno programado', detalle: `${nombre} · ${ETIQUETA_TIPO_TURNO[datos.tipo]} · ${fechaLarga(datos.fecha)}` });
    alGuardar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Turnos"
      titulo={edicion ? 'Editar turno' : 'Programar turno'}
      descripcion={edicion ? 'Cambia el día, la persona o el horario. La jornada de la semana se recalcula al guardar.' : 'Elige la persona, el día y el tipo de turno. Si pasa de la jornada máxima, te avisamos.'}
      ancho="md"
      confirmarAlCerrar={hayCambios}
      data-testid="turnos-dialogo"
      pie={
        <>
          {edicion && alEliminar && turno && (
            <Button variante="ghost" icono={Trash2} onClick={() => alEliminar(turno)} data-testid="turnos-eliminar" className="mr-auto">
              Eliminar turno
            </Button>
          )}
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="turnos-guardar">
            {edicion ? 'Guardar cambios' : 'Programar turno'}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-2 gap-x-6 gap-y-4"
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
      >
        <Select
          etiqueta="Persona"
          placeholder="Elige a quién"
          valor={b.empleadoId}
          alCambiar={(v) => cambiar({ empleadoId: v }, 'empleadoId')}
          enModal
          error={errores.empleadoId}
          opciones={personas.map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
          data-testid="turnos-persona"
        />
        <SelectorFecha etiqueta="Día" hoy={hoy} valor={b.fecha} alCambiar={(f) => cambiar({ fecha: f }, 'fecha')} error={errores.fecha} enModal />
        <Select
          className="col-span-2"
          etiqueta="Tipo de turno"
          valor={b.tipo}
          alCambiar={(v) => cambiarTipo(v as TipoTurno)}
          enModal
          error={errores.tipo}
          ayuda={b.tipo ? AYUDA_TIPO_TURNO[b.tipo] : undefined}
          opciones={TIPOS_TURNO.map((t) => ({ valor: t, etiqueta: ETIQUETA_TIPO_TURNO[t] }))}
          data-testid="turnos-tipo"
        />
        <Input etiqueta="Entra a las" placeholder="10:00" value={b.inicio} onChange={(ev) => cambiar({ inicio: ev.target.value }, 'inicio')} error={errores.inicio ?? (tocado ? erroresForma.inicio : undefined)} autoComplete="off" inputMode="numeric" data-testid="turnos-inicio" />
        <Input etiqueta="Sale a las" placeholder="18:00" value={b.fin} onChange={(ev) => cambiar({ fin: ev.target.value }, 'fin')} error={errores.fin ?? (tocado ? erroresForma.fin : undefined)} autoComplete="off" inputMode="numeric" data-testid="turnos-fin" />
        <InputNumero
          className="col-span-2"
          etiqueta="Descanso (minutos)"
          valor={b.descansoMin}
          alCambiar={(v) => cambiar({ descansoMin: v }, 'descansoMin')}
          error={errores.descansoMin ?? (tocado ? erroresForma.descansoMin : undefined)}
          disabled={edicion}
          ayuda={edicion ? 'El descanso se define al programar el turno; para cambiarlo, elimínalo y prográmalo de nuevo.' : 'Las horas de la jornada se cuentan sin el descanso.'}
          sufijo="min"
          data-testid="turnos-descanso"
        />

        {netas !== null && (
          <div className="col-span-2 border-t border-line-soft pt-4" data-testid="turnos-resumen">
            <p className="t-small text-ink-2">
              Este turno: <strong className="num text-ink">{textoHoras(netas)}</strong> de trabajo
              {nocturnas > 0 && (
                <>
                  , de las cuales <strong className="num text-ink">{textoHoras(nocturnas)}</strong> son nocturnas (llevan recargo)
                </>
              )}
              .
            </p>
            {b.empleadoId && evaluacion && (evaluacion.resultado === 'ok' || evaluacion.resultado === 'exceso') && (
              <p className="mt-1 t-small text-ink-2">
                Esa semana, {nombre} quedaría con <strong className="num text-ink">{textoHoras(evaluacion.horas)}</strong> de {textoHoras(evaluacion.maximo)}.
              </p>
            )}
          </div>
        )}

        {evaluacion?.resultado === 'solapa' && (
          <p className="col-span-2 flex gap-2 border border-line-strong bg-danger-soft px-3 py-2 t-small text-ink" role="alert" data-testid="turnos-aviso-solape">
            <Icono icono={TriangleAlert} tamano={16} />
            <span>
              {nombre} ya tiene un turno de {rangoHoras(evaluacion.con.inicio, evaluacion.con.fin)} ese día: se cruza con este.
            </span>
          </p>
        )}
        {evaluacion?.resultado === 'novedad' && (
          <p className="col-span-2 flex gap-2 border border-line-strong bg-danger-soft px-3 py-2 t-small text-ink" role="alert" data-testid="turnos-aviso-novedad">
            <Icono icono={TriangleAlert} tamano={16} />
            <span>{nombre} está en {ETIQUETA_NOVEDAD[evaluacion.novedad.tipo].toLowerCase()} ese día: no se le programan turnos.</span>
          </p>
        )}
        {exceso && (
          <div className="col-span-2 border border-line-strong bg-warning-soft px-3 py-3" role="alert" data-testid="turnos-aviso-exceso">
            <p className="flex gap-2 t-small font-bold text-ink">
              <Icono icono={TriangleAlert} tamano={16} />
              Esto pasa de la jornada máxima
            </p>
            <p className="mt-1 t-small text-ink">{fraseExceso(nombre, exceso.horas, exceso.maximo)}</p>
            <Checkbox className="mt-2" marcado={aceptaExceso} alCambiar={setAceptaExceso} etiqueta="Confirmo que son horas extra y se pagan con recargo" data-testid="turnos-acepta-exceso" />
          </div>
        )}
        {errorGeneral && (
          <p className="col-span-2 t-small text-danger" role="alert" data-testid="turnos-error-general">
            {errorGeneral}
          </p>
        )}
      </form>
    </Dialog>
  );
}
