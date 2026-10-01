import { useMemo, useState } from 'react';
import { Button, Dialog, Input, Select, SelectorFecha, Switch, Textarea, avisar } from '@/ui';
import type { FechaISO, Id, Novedad, TipoNovedad } from '@/dominio/tipos';
import { PREFIJOS } from '@/dominio/motor/ids';
import { useAcciones, useHoy, useSel } from '@/estado';
import { nombreEmpleado, selEmpleadosActivos } from '@/selectores';
import { fechaLarga, plural } from '@/lib/formato';
import {
  diasDeNovedad,
  efectoEnNomina,
  validarBorradorNovedad,
  type BorradorNovedad,
  type CampoNovedad,
} from '../calculos';
import { selParametrosTurnos, selTurnosEnRango } from '../selectores';
import { AYUDA_NOVEDAD, ETIQUETA_NOVEDAD, REMUNERADA_POR_DEFECTO, TIPOS_NOVEDAD } from '../textos';

export interface PropsDialogoNovedad {
  /** Novedad a editar; sin ella, se registra una nueva. */
  novedad?: Novedad | null;
  empleadoInicial?: Id | null;
  alCerrar: () => void;
  /** Se llama con el id guardado (la pantalla lo resalta). */
  alGuardar: (novedadId: Id) => void;
}

/** Registrar o editar una incapacidad, vacaciones, licencia o permiso, con lo que cambia en turnos y nómina a la vista. */
export function DialogoNovedad({ novedad, empleadoInicial, alCerrar, alGuardar }: PropsDialogoNovedad) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const parametros = useSel(selParametrosTurnos);
  const activos = useSel(selEmpleadosActivos, { fecha: hoy });
  const edicion = !!novedad;
  const inicial = useMemo(
    () => ({
      empleadoId: (novedad?.empleadoId ?? empleadoInicial ?? null) as Id | null,
      tipo: (novedad?.tipo ?? null) as TipoNovedad | null,
      desde: (novedad?.desde ?? hoy) as FechaISO | null,
      hasta: (novedad?.hasta ?? hoy) as FechaISO | null,
      remunerada: novedad?.remunerada ?? true,
      soporte: novedad?.soporte?.nombreArchivo ?? '',
      nota: novedad?.nota ?? '',
    }),
    [novedad, empleadoInicial, hoy],
  );
  const [b, setB] = useState(inicial);
  const [errores, setErrores] = useState<Partial<Record<CampoNovedad, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);
  const hayCambios = JSON.stringify(b) !== JSON.stringify(inicial);

  const cambiar = (c: Partial<typeof b>, campo?: CampoNovedad) => {
    setB((p) => ({ ...p, ...c }));
    setTocado(true);
    setErrorGeneral(null);
    if (campo) setErrores((p) => ({ ...p, [campo]: undefined }));
  };
  const borrador: BorradorNovedad = {
    empleadoId: b.empleadoId,
    tipo: b.tipo,
    desde: b.desde,
    hasta: b.hasta,
  };
  const erroresForma = validarBorradorNovedad(borrador);
  const rangoOk = !erroresForma.desde && !erroresForma.hasta && !!b.desde && !!b.hasta;
  const turnos = useSel(selTurnosEnRango, {
    empleadoId: b.empleadoId ?? '',
    desde: b.desde ?? hoy,
    hasta: rangoOk ? (b.hasta as FechaISO) : (b.desde ?? hoy),
  });
  const dias = rangoOk ? diasDeNovedad(b.desde as FechaISO, b.hasta as FechaISO) : null;

  const personas = useMemo(() => {
    const lista = activos.map((x) => ({ valor: x.id, etiqueta: nombreEmpleado(x) }));
    // Una novedad de alguien ya retirado se puede editar: su nombre sigue en la lista.
    return novedad && !lista.some((x) => x.valor === novedad.empleadoId)
      ? [{ valor: novedad.empleadoId, etiqueta: 'Persona retirada' }, ...lista]
      : lista;
  }, [activos, novedad]);

  const guardar = () => {
    setTocado(true);
    setErrorGeneral(null);
    const e = validarBorradorNovedad(borrador);
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    const datos = {
      empleadoId: b.empleadoId as Id,
      tipo: b.tipo as TipoNovedad,
      desde: b.desde as FechaISO,
      hasta: b.hasta as FechaISO,
      remunerada: b.remunerada,
      soporte: b.soporte.trim()
        ? { nombreArchivo: b.soporte.trim(), estado: 'adjunto' as const, fecha: hoy }
        : null,
      nota: b.nota.trim() || null,
    };
    const novedadId = novedad?.id ?? acciones.nuevoId(PREFIJOS.novedad);
    const r = novedad
      ? acciones.editarNovedad({ novedadId, cambios: datos })
      : acciones.registrarNovedad({ novedadId, datos });
    if (!r.ok) {
      const campo = r.error.campo as CampoNovedad | undefined;
      if (campo && ['empleadoId', 'tipo', 'desde', 'hasta'].includes(campo))
        setErrores({ [campo]: r.error.mensaje });
      else setErrorGeneral(r.error.mensaje);
      return;
    }
    avisar({
      tipo: 'exito',
      texto: edicion ? 'Novedad actualizada' : 'Novedad registrada',
      detalle: `${ETIQUETA_NOVEDAD[datos.tipo]} · ${fechaLarga(datos.desde)}`,
    });
    alGuardar(novedadId);
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Novedades"
      titulo={edicion ? 'Editar novedad' : 'Registrar novedad'}
      descripcion="Incapacidades, vacaciones, licencias y permisos. La persona no se programa en esos días y la nómina los tiene en cuenta."
      ancho="md"
      confirmarAlCerrar={hayCambios}
      data-testid="novedades-dialogo"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="novedades-guardar">
            {edicion ? 'Guardar cambios' : 'Registrar novedad'}
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
          opciones={personas}
          data-testid="novedades-persona"
        />
        <Select
          etiqueta="Tipo de novedad"
          placeholder="Elige el tipo"
          valor={b.tipo}
          alCambiar={(v) =>
            cambiar({ tipo: v as TipoNovedad, remunerada: REMUNERADA_POR_DEFECTO[v as TipoNovedad] }, 'tipo')
          }
          enModal
          error={errores.tipo}
          ayuda={b.tipo ? AYUDA_NOVEDAD[b.tipo] : undefined}
          opciones={TIPOS_NOVEDAD.map((t) => ({ valor: t, etiqueta: ETIQUETA_NOVEDAD[t] }))}
          data-testid="novedades-tipo"
        />
        <SelectorFecha
          etiqueta="Desde"
          hoy={hoy}
          valor={b.desde}
          alCambiar={(f) => cambiar({ desde: f, hasta: b.hasta && b.hasta < f ? f : b.hasta }, 'desde')}
          error={errores.desde}
          enModal
        />
        <SelectorFecha
          etiqueta="Hasta"
          hoy={hoy}
          valor={b.hasta}
          alCambiar={(f) => cambiar({ hasta: f }, 'hasta')}
          error={errores.hasta ?? (tocado ? erroresForma.hasta : undefined)}
          desde={b.desde ?? undefined}
          enModal
        />
        <div className="col-span-2">
          <Switch
            etiqueta="Se paga"
            activo={b.remunerada}
            alCambiar={(v) => cambiar({ remunerada: v })}
            valorTexto={b.remunerada ? 'Sí' : 'No'}
          />
        </div>
        <Input
          className="col-span-2"
          etiqueta="Soporte"
          opcional
          placeholder="Ej.: incapacidad-eps.pdf"
          value={b.soporte}
          onChange={(ev) => cambiar({ soporte: ev.target.value })}
          ayuda="Documento simulado: en la versión real se adjunta el archivo."
          autoComplete="off"
        />
        <Textarea
          className="col-span-2"
          etiqueta="Nota"
          opcional
          rows={2}
          value={b.nota}
          onChange={(ev) => cambiar({ nota: ev.target.value })}
          placeholder="Ej.: Cita médica programada, regresa el lunes."
        />

        {dias !== null && b.tipo && (
          <div className="col-span-2 border-t border-line-soft pt-4" data-testid="novedades-resumen">
            <p className="t-small text-ink-2">
              <strong className="num text-ink">{plural(dias, 'día')}</strong> de calendario
              {turnos.length > 0 ? (
                <>
                  ; hay <strong className="num text-ink">{plural(turnos.length, 'turno')}</strong>{' '}
                  {turnos.length === 1 ? 'programado que habrá' : 'programados que habrá'} que cubrir.
                </>
              ) : (
                '; no tiene turnos programados en esas fechas.'
              )}
            </p>
            <p className="mt-1 t-small text-muted">
              {efectoEnNomina(b.tipo, b.remunerada, dias, parametros.incapacidad)}
            </p>
          </div>
        )}
        {errorGeneral && (
          <p className="col-span-2 t-small text-danger" role="alert" data-testid="novedades-error-general">
            {errorGeneral}
          </p>
        )}
      </form>
    </Dialog>
  );
}
