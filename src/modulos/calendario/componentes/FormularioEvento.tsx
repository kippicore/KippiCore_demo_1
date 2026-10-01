import { X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Avatar, Button, Combobox, Dialog, Icono, Input, Resaltado, Select, SelectorFecha, Switch, Textarea, avisar } from '@/ui';
import { rutas } from '@/app/rutas';
import type { EventoCalendario, FechaISO, Id } from '@/dominio/tipos';
import { PREFIJOS } from '@/dominio/motor/ids';
import { useAcciones, useHoy, useSel } from '@/estado';
import { celular, fechaLarga } from '@/lib/formato';
import { selCliente, selClientes, selEmpleadosActivos, selLocales } from '@/selectores';
import {
  borradorDeEvento,
  borradorNuevo,
  CLASES_EVENTO,
  datosDeBorrador,
  OPCIONES_RECORDATORIO,
  ORDEN_CLASES,
  SIN_EMPLEADO,
  SIN_LOCAL,
  validarBorradorEvento,
  type BorradorEvento,
  type CampoEvento,
  type ClaseEvento,
} from '../calculos';
import { FORMULARIO } from '../textos';

export interface PropsFormularioEvento {
  /** Evento guardado a editar; sin él, se crea uno nuevo. */
  evento?: EventoCalendario | null;
  fechaInicial: FechaISO;
  localInicial: Id | 'todos';
  alCerrar: () => void;
  /** Se llama con el id y la fecha del evento guardado (la pantalla lo destella). */
  alGuardar: (eventoId: Id, fecha: FechaISO) => void;
}

function ClienteDeLaCita({ clienteId, alElegir, alQuitar }: { clienteId: Id | null; alElegir: (id: Id) => void; alQuitar: () => void }) {
  const hoy = useHoy();
  const [texto, setTexto] = useState('');
  const diferido = useDeferredValue(texto);
  const filas = useSel(selClientes, { hoy, texto: diferido.trim() || '__ninguno__' });
  const ficha = useSel(selCliente, { clienteId: clienteId ?? '', hoy });
  const items = useMemo(
    () =>
      (diferido.trim() ? filas : []).slice(0, 8).map((f) => {
        const nombre = `${f.cliente.nombres} ${f.cliente.apellidos}`;
        return {
          id: f.cliente.id,
          texto: nombre,
          alElegir: () => {
            alElegir(f.cliente.id);
            setTexto('');
          },
          contenido: (
            <span className="flex min-w-0 items-center gap-3">
              <Avatar nombre={nombre} tamano={24} />
              <span className="min-w-0 truncate t-body text-ink">
                <Resaltado texto={nombre} consulta={diferido} />
              </span>
              <span className="ml-auto shrink-0 t-small num text-muted">{celular(f.cliente.celular)}</span>
            </span>
          ),
        };
      }),
    [filas, diferido, alElegir],
  );
  if (clienteId && ficha) {
    const nombre = `${ficha.cliente.nombres} ${ficha.cliente.apellidos}`;
    return (
      <div className="flex h-10 items-center gap-3 border border-line-strong bg-surface px-3" data-testid="evento-cliente-elegido">
        <Avatar nombre={nombre} tamano={24} />
        <span className="min-w-0 truncate t-body text-ink">{nombre}</span>
        <button type="button" onClick={alQuitar} aria-label={FORMULARIO.quitarCliente} className="ml-auto inline-flex size-6 items-center justify-center text-ink-2 hover:bg-surface-2">
          <Icono icono={X} tamano={14} />
        </button>
      </div>
    );
  }
  return (
    <Combobox
      texto={texto}
      alCambiarTexto={setTexto}
      placeholder={FORMULARIO.clientePlaceholder}
      etiqueta={FORMULARIO.cliente}
      grupos={[{ titulo: 'Clientes', items }]}
      vacio={(q) => `No encontramos «${q}». Revisa el nombre, el celular o la cédula.`}
      enModal
      data-testid="evento-cliente-buscar"
    />
  );
}

/** Crear o editar un evento guardado (campaña, cita, obligación propia u otro): fecha, hora, local, cliente y recordatorio. */
export function FormularioEvento({ evento, fechaInicial, localInicial, alCerrar, alGuardar }: PropsFormularioEvento) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const edicion = !!evento;
  const locales = useSel(selLocales, { incluirBodega: true });
  const empleados = useSel(selEmpleadosActivos, { fecha: hoy });
  const inicial = useMemo(() => (evento ? borradorDeEvento(evento) : borradorNuevo(fechaInicial, localInicial)), [evento, fechaInicial, localInicial]);
  const [b, setB] = useState<BorradorEvento>(inicial);
  const [errores, setErrores] = useState<Partial<Record<CampoEvento | 'general', string>>>({});
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const hayCambios = JSON.stringify(b) !== JSON.stringify(inicial);

  const poner = <K extends keyof BorradorEvento>(k: K, v: BorradorEvento[K]) => {
    setB((x) => ({ ...x, [k]: v }));
    if (errores[k as CampoEvento]) setErrores((e) => ({ ...e, [k]: undefined }));
  };
  const validarCampo = (campo: CampoEvento) => {
    setTocado(true);
    const e = validarBorradorEvento(b);
    setErrores((prev) => ({ ...prev, [campo]: e[campo] }));
  };
  const esCita = !!b.clase && CLASES_EVENTO[b.clase].tipo === 'cita';

  const guardar = () => {
    setTocado(true);
    const e = validarBorradorEvento(b);
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    setGuardando(true);
    const datos = datosDeBorrador(b);
    const eventoId = evento?.id ?? acciones.nuevoId(PREFIJOS.evento);
    const r = edicion ? acciones.editarEvento({ eventoId, cambios: datos }) : acciones.crearEvento({ eventoId, datos });
    setGuardando(false);
    if (!r.ok) {
      const campo = r.error.campo as CampoEvento | 'inicio' | 'fin' | undefined;
      if (campo && ['titulo', 'fecha', 'fechaFin', 'horaInicio', 'horaFin', 'clase'].includes(campo)) setErrores({ [campo]: r.error.mensaje });
      else if (campo === 'inicio') setErrores({ fecha: r.error.mensaje });
      else if (campo === 'fin') setErrores({ fechaFin: r.error.mensaje });
      else setErrores({ general: r.error.mensaje });
      return;
    }
    const fecha = datos.inicio.slice(0, 10);
    avisar({
      tipo: 'exito',
      texto: edicion ? 'Evento actualizado' : 'Evento creado',
      detalle: `${datos.titulo} · ${fechaLarga(fecha)}`,
      accion: { texto: 'Ver en el calendario', a: rutas.calendario({ vista: 'dia', fecha, resaltar: eventoId }) },
    });
    alGuardar(eventoId, fecha);
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow={FORMULARIO.eyebrow}
      titulo={edicion ? FORMULARIO.editarTitulo : FORMULARIO.nuevoTitulo}
      descripcion={edicion ? FORMULARIO.editarDescripcion : FORMULARIO.nuevoDescripcion}
      ancho="md"
      confirmarAlCerrar={hayCambios}
      data-testid="calendario-formulario"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar} data-testid="evento-cancelar">
            {FORMULARIO.cancelar}
          </Button>
          <Button onClick={guardar} cargando={guardando} data-testid="evento-guardar">
            {edicion ? FORMULARIO.guardar : FORMULARIO.crear}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-2 gap-x-6 gap-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
        noValidate
      >
        {errores.general && (
          <p role="alert" className="col-span-2 border border-danger bg-danger-soft px-4 py-3 t-small text-ink" data-testid="evento-error">
            {errores.general}
          </p>
        )}
        <Input
          className="col-span-2"
          etiqueta={FORMULARIO.titulo}
          placeholder={FORMULARIO.tituloPlaceholder}
          value={b.titulo}
          onChange={(ev) => poner('titulo', ev.target.value)}
          onBlur={() => validarCampo('titulo')}
          error={errores.titulo}
          autoComplete="off"
          data-testid="evento-titulo"
        />
        <Select
          className="col-span-2"
          etiqueta={FORMULARIO.clase}
          placeholder={FORMULARIO.clasePlaceholder}
          valor={b.clase}
          alCambiar={(v) => poner('clase', v as ClaseEvento)}
          enModal
          error={errores.clase}
          ayuda={b.clase ? CLASES_EVENTO[b.clase].ayuda : undefined}
          opciones={ORDEN_CLASES.map((c) => ({ valor: c, etiqueta: CLASES_EVENTO[c].etiqueta }))}
          data-testid="evento-clase"
        />
        <SelectorFecha etiqueta={FORMULARIO.fecha} hoy={hoy} valor={b.fecha} alCambiar={(f) => poner('fecha', f)} error={errores.fecha} enModal />
        <SelectorFecha
          etiqueta={FORMULARIO.fechaFin}
          opcional
          hoy={hoy}
          valor={b.fechaFin}
          desde={b.fecha ?? undefined}
          alCambiar={(f) => poner('fechaFin', f)}
          error={errores.fechaFin}
          ayuda={errores.fechaFin ? undefined : FORMULARIO.fechaFinAyuda}
          enModal
         
        />
        <div className="col-span-2">
          <Switch etiqueta={FORMULARIO.todoElDia} activo={b.todoElDia} alCambiar={(v) => poner('todoElDia', v)} />
        </div>
        {!b.todoElDia && (
          <>
            <Input
              etiqueta={FORMULARIO.horaInicio}
              type="time"
              value={b.horaInicio}
              onChange={(ev) => poner('horaInicio', ev.target.value)}
              onBlur={() => validarCampo('horaInicio')}
              error={errores.horaInicio}
              data-testid="evento-hora-inicio"
            />
            <Input
              etiqueta={FORMULARIO.horaFin}
              opcional
              type="time"
              value={b.horaFin}
              onChange={(ev) => poner('horaFin', ev.target.value)}
              onBlur={() => validarCampo('horaFin')}
              error={errores.horaFin}
              data-testid="evento-hora-fin"
            />
          </>
        )}
        <Select
          etiqueta={FORMULARIO.local}
          valor={b.localId}
          alCambiar={(v) => poner('localId', v)}
          enModal
          opciones={[{ valor: SIN_LOCAL, etiqueta: FORMULARIO.sinLocal }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
          data-testid="evento-local"
        />
        <Select
          etiqueta={FORMULARIO.recordatorio}
          valor={b.recordatorio}
          alCambiar={(v) => poner('recordatorio', v)}
          enModal
          ayuda={FORMULARIO.recordatorioAyuda}
          opciones={OPCIONES_RECORDATORIO.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
          data-testid="evento-recordatorio"
        />
        {esCita && (
          <div className="col-span-2 flex flex-col">
            <p className="mb-1.5 t-label text-ink">{FORMULARIO.cliente}</p>
            <ClienteDeLaCita clienteId={b.clienteId} alElegir={(id) => poner('clienteId', id)} alQuitar={() => poner('clienteId', null)} />
          </div>
        )}
        {esCita && (
          <Select
            className="col-span-2"
            etiqueta={FORMULARIO.empleado}
            opcional
            valor={b.empleadoId}
            alCambiar={(v) => poner('empleadoId', v)}
            enModal
            opciones={[{ valor: SIN_EMPLEADO, etiqueta: FORMULARIO.sinEmpleado }, ...empleados.map((e) => ({ valor: e.id, etiqueta: `${e.nombres} ${e.apellidos}` }))]}
          />
        )}
        <Textarea
          className="col-span-2"
          etiqueta={FORMULARIO.descripcion}
          opcional
          rows={3}
          placeholder={FORMULARIO.descripcionPlaceholder}
          value={b.descripcion}
          onChange={(ev) => poner('descripcion', ev.target.value)}
          data-testid="evento-descripcion"
        />
      </form>
      {tocado && Object.values(errores).some(Boolean) && <span className="sr-only" aria-live="polite">Revisa los campos marcados.</span>}
    </Dialog>
  );
}
