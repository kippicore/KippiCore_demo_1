import { useState } from 'react';
import { Button, Checkbox, Dialog, Input, InputNumero, Select, Switch, avisar } from '@/ui';
import type { DatosLocal, FranjaHorario, Local, TipoLocal } from '@/dominio/tipos';
import { PREFIJOS } from '@/dominio/motor/ids';
import { useAcciones, useHoy } from '@/estado';
import { armarHorario, resumirHorario, validarBorradorLocal, type CampoLocal, type HorarioResumido } from '../calculos';
import { TIPOS_LOCAL } from '../textos';
import { CampoHora } from './Campos';

const FRANJA_NUEVA: FranjaHorario = { abre: '10:00', cierra: '20:00' };

/** Crear o editar un local. Al crear uno que vende, puede dejar lista su caja para abrir turnos. */
export function FormularioLocal({
  local,
  codigosOcupados,
  siguienteOrden,
  alCerrar,
}: {
  local: Local | null;
  codigosOcupados: readonly string[];
  siguienteOrden: number;
  alCerrar: () => void;
}) {
  const acciones = useAcciones();
  const hoy = useHoy();
  const edicion = !!local;
  const inicial = {
    nombre: local?.nombre ?? '',
    codigo: local?.codigo ?? '',
    tipo: (local?.tipo ?? 'tienda_calle') as TipoLocal,
    vende: local?.vende ?? true,
    direccion: local?.direccion ?? '',
    zona: local?.zona ?? '',
    arriendo: local?.arriendoMensual ?? (0 as number | null),
    area: local?.areaM2 ?? (null as number | null),
    horario: (local ? resumirHorario(local.horario) : { semana: FRANJA_NUEVA, sabado: FRANJA_NUEVA, domingo: { abre: '11:00', cierra: '19:00' } }) as HorarioResumido,
  };
  const [nombre, setNombre] = useState(inicial.nombre);
  const [codigo, setCodigo] = useState(inicial.codigo);
  const [tipo, setTipo] = useState<TipoLocal>(inicial.tipo);
  const [vende, setVende] = useState(inicial.vende);
  const [direccion, setDireccion] = useState(inicial.direccion);
  const [zona, setZona] = useState(inicial.zona);
  const [arriendo, setArriendo] = useState<number | null>(inicial.arriendo);
  const [area, setArea] = useState<number | null>(inicial.area);
  const [horario, setHorario] = useState<HorarioResumido>(inicial.horario);
  const [crearCaja, setCrearCaja] = useState(true);
  const [errores, setErrores] = useState<Partial<Record<CampoLocal, string>>>({});
  const [general, setGeneral] = useState<string | null>(null);

  const sucio = JSON.stringify({ nombre, codigo, tipo, vende, direccion, zona, arriendo, area, horario }) !== JSON.stringify(inicial);
  const ocupados = codigosOcupados.filter((c) => c !== local?.codigo);
  const esBodega = tipo === 'bodega';

  const cambiarFranja = (dia: keyof HorarioResumido, campo: 'abre' | 'cierra', v: string) =>
    setHorario((h) => ({ ...h, [dia]: { ...(h[dia] ?? FRANJA_NUEVA), [campo]: v } }));
  const alternarDia = (dia: keyof HorarioResumido, abierto: boolean) => setHorario((h) => ({ ...h, [dia]: abierto ? FRANJA_NUEVA : null }));

  const guardar = () => {
    setGeneral(null);
    const e = validarBorradorLocal({ nombre, codigo, direccion, arriendo, area, horario }, ocupados);
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    const horarioCambio = JSON.stringify(horario) !== JSON.stringify(inicial.horario);
    const datos: Omit<DatosLocal, 'horario' | 'horarioFestivo' | 'cuentaCajaId' | 'orden'> = {
      codigo: codigo.trim().toUpperCase(),
      nombre: nombre.trim(),
      tipo,
      vende: !esBodega && vende,
      direccion: direccion.trim(),
      zona: zona.trim(),
      arriendoMensual: arriendo ?? 0,
      areaM2: area ?? 0,
    };
    if (local) {
      const r = acciones.editarLocal({ localId: local.id, cambios: { ...datos, ...(horarioCambio ? { horario: armarHorario(horario) } : {}) } });
      if (!r.ok) {
        const campo = r.error.campo;
        if (campo === 'codigo') setErrores({ codigo: r.error.mensaje });
        else setGeneral(r.error.mensaje);
        return;
      }
      avisar({ tipo: 'exito', texto: 'Local actualizado', detalle: datos.nombre });
      alCerrar();
      return;
    }
    const localId = acciones.nuevoId(PREFIJOS.local);
    const r = acciones.crearLocal({
      localId,
      datos: { ...datos, horario: armarHorario(horario), horarioFestivo: horario.domingo, cuentaCajaId: null, orden: siguienteOrden },
    });
    if (!r.ok) {
      if (r.error.campo === 'codigo') setErrores({ codigo: r.error.mensaje });
      else setGeneral(r.error.mensaje);
      return;
    }
    let detalle = 'Ya aparece en el selector de local de la barra superior.';
    if (crearCaja && datos.vende) {
      const cuentaId = acciones.nuevoId(PREFIJOS.cuenta);
      const c = acciones.crearCuenta({
        cuentaId,
        datos: { nombre: `Caja ${datos.nombre}`, tipo: 'caja', localId, entidad: null, numeroEnmascarado: null, saldoInicial: 0, fechaSaldoInicial: hoy, orden: siguienteOrden * 10 },
      });
      if (c.ok) {
        acciones.editarLocal({ localId, cambios: { cuentaCajaId: cuentaId } });
        detalle = 'Ya aparece en el selector de local y tiene su caja lista para abrir turno.';
      }
    }
    avisar({ tipo: 'exito', texto: 'Local creado', detalle: `${datos.nombre}. ${detalle}` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Locales"
      titulo={edicion ? `Editar ${local.nombre}` : 'Nuevo local'}
      descripcion="Lo que cambies aquí se refleja en el selector de local, el inventario y los reportes."
      ancho="lg"
      confirmarAlCerrar={sucio}
      data-testid="local-formulario"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="local-guardar">
            {edicion ? 'Guardar cambios' : 'Crear local'}
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="grid grid-cols-2 gap-x-6 gap-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
      >
        <Input
          etiqueta="Nombre del local"
          placeholder="Ej.: Andino"
          value={nombre}
          error={errores.nombre}
          onChange={(ev) => setNombre(ev.target.value)}
          autoComplete="off"
          data-testid="local-nombre"
        />
        <Input
          etiqueta="Código"
          placeholder="AND"
          maxLength={5}
          value={codigo}
          error={errores.codigo}
          ayuda="Corto, para etiquetas y reportes."
          onChange={(ev) => setCodigo(ev.target.value.toUpperCase())}
          autoComplete="off"
          data-testid="local-codigo"
        />
        <Select etiqueta="Tipo de local" valor={tipo} alCambiar={(v) => setTipo(v as TipoLocal)} opciones={TIPOS_LOCAL} enModal />
        <div className="flex items-end pb-1">
          {esBodega ? (
            <p className="t-small text-muted">Una bodega guarda mercancía; no vende al público.</p>
          ) : (
            <Switch etiqueta="Vende al público" activo={vende} alCambiar={setVende} valorTexto={vende ? 'Sí' : 'No'} />
          )}
        </div>
        <Input className="col-span-2" etiqueta="Dirección" value={direccion} error={errores.direccion} onChange={(ev) => setDireccion(ev.target.value)} autoComplete="off" data-testid="local-direccion" />
        <Input etiqueta="Zona o barrio" opcional value={zona} onChange={(ev) => setZona(ev.target.value)} autoComplete="off" />
        <div className="grid grid-cols-2 gap-x-4">
          <InputNumero etiqueta="Arriendo mensual" prefijo="$" valor={arriendo} alCambiar={setArriendo} error={errores.arriendo} data-testid="local-arriendo" />
          <InputNumero etiqueta="Área" sufijo="m²" valor={area} alCambiar={setArea} error={errores.area} data-testid="local-area" />
        </div>

        <fieldset className="col-span-2 border-t border-line-soft pt-4">
          <legend className="pr-3 t-label text-ink">Horario</legend>
          <div className="mt-2 flex flex-col gap-3">
            {(
              [
                ['semana', 'Lunes a viernes'],
                ['sabado', 'Sábado'],
                ['domingo', 'Domingo y festivos'],
              ] as const
            ).map(([dia, nombreDia]) => {
              const f = horario[dia];
              return (
                <div key={dia} className="grid grid-cols-[148px_120px_120px] items-start gap-4">
                  <div className="pt-2">
                    <Checkbox etiqueta={nombreDia} marcado={f !== null} alCambiar={(v) => alternarDia(dia, v)} />
                  </div>
                  {f ? (
                    <>
                      <CampoHora etiqueta="Abre" valor={f.abre} alCambiar={(v) => cambiarFranja(dia, 'abre', v)} error={errores[dia]} />
                      <CampoHora etiqueta="Cierra" valor={f.cierra} alCambiar={(v) => cambiarFranja(dia, 'cierra', v)} />
                    </>
                  ) : (
                    <p className="col-span-2 pt-2 t-small text-muted">Cerrado</p>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>

        {!edicion && !esBodega && vende && (
          <div className="col-span-2 border-t border-line-soft pt-4">
            <Checkbox etiqueta="Crear también su caja" marcado={crearCaja} alCambiar={setCrearCaja} />
            <p className="ml-6 t-small text-muted">Con la caja lista se puede abrir turno y registrar ventas en este local.</p>
          </div>
        )}
        {general && <p className="col-span-2 t-small text-danger">{general}</p>}
      </form>
    </Dialog>
  );
}
