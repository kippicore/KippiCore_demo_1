import { useMemo, useState } from 'react';
import { Button, Dialog, Input, SelectorFecha, Textarea, avisar } from '@/ui';
import { PREFIJOS } from '@/dominio/motor/ids';
import { sumarDias } from '@/dominio/reglas/fechas';
import type { Contrato, Empleado, FechaISO, MesISO } from '@/dominio/tipos';
import { useAcciones, useHoy, useSel } from '@/estado';
import { mesAnio, plural } from '@/lib/formato';
import { nombreEmpleado } from '@/selectores';
import { validarContrato, validarEmpleado, validarRetiro, type BorradorContrato, type BorradorEmpleado, type CampoContrato, type CampoEmpleado, type CampoRetiro } from '../calculos';
import { selConsecuenciasRetiro, selOpcionesPersonal, selParametrosNomina } from '../selectores';
import { borradorDe, CamposEmpleado, datosDeBorrador } from './CamposEmpleado';
import { CamposContrato, contratoComoBorrador, datosDeContrato } from './CamposContrato';

/** Campos del dominio que no se llaman igual en el formulario. */
const CAMPO_DOMINIO: Record<string, CampoEmpleado> = { documento: 'numeroDocumento' };

// ---------------------------------------------------------------------------------------------------------
// Editar los datos de una persona
// ---------------------------------------------------------------------------------------------------------
export function DialogoEditarEmpleado({ empleado, alCerrar }: { empleado: Empleado; alCerrar: () => void }) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const opciones = useSel(selOpcionesPersonal);
  const inicial = useMemo(() => borradorDe(empleado), [empleado]);
  const [b, setB] = useState<BorradorEmpleado>(inicial);
  const [errores, setErrores] = useState<Partial<Record<CampoEmpleado, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);
  const sucio = JSON.stringify(b) !== JSON.stringify(inicial);

  const validar = (campo?: CampoEmpleado) => {
    const e = validarEmpleado(b, hoy);
    setErrores((prev) => (campo ? { ...prev, [campo]: e[campo] } : e));
    return e;
  };
  const guardar = () => {
    setTocado(true);
    setErrorGeneral(null);
    if (Object.keys(validar()).length > 0) return;
    const { slug: _slug, fechaRetiro: _fr, ...cambios } = datosDeBorrador(b, empleado.slug);
    const r = acciones.editarEmpleado({ empleadoId: empleado.id, cambios });
    if (!r.ok) {
      const campo = r.error.campo ? (CAMPO_DOMINIO[r.error.campo] ?? (r.error.campo as CampoEmpleado)) : undefined;
      if (campo && campo in b) setErrores({ [campo]: r.error.mensaje });
      else setErrorGeneral(r.error.mensaje);
      return;
    }
    avisar({ tipo: 'exito', texto: 'Datos actualizados', detalle: nombreEmpleado(empleado) });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Personal"
      titulo={`Editar a ${empleado.nombres}`}
      descripcion="Corrige los datos de la ficha. El contrato y el salario se cambian desde la pestaña Contrato."
      ancho="lg"
      confirmarAlCerrar={sucio}
      data-testid="personal-dialogo-editar"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="personal-guardar-datos">
            Guardar cambios
          </Button>
        </>
      }
    >
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
        noValidate
      >
        <CamposEmpleado
          borrador={b}
          alCambiar={(c, campo) => {
            setB((prev) => ({ ...prev, ...c }));
            if (campo && (tocado || errores[campo])) setErrores((prev) => ({ ...prev, [campo]: undefined }));
          }}
          alPerderFoco={(campo) => () => validar(campo)}
          errores={errores}
          opciones={opciones}
          hoy={hoy}
          enModal
        />
        {errorGeneral && (
          <p role="alert" className="mt-4 border border-danger bg-danger-soft px-4 py-3 t-body text-ink" data-testid="personal-error-formulario">
            {errorGeneral}
          </p>
        )}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Reemplazar el contrato vigente
// ---------------------------------------------------------------------------------------------------------
export function DialogoContrato({ empleado, vigente, alCerrar, alGuardado }: { empleado: Empleado; vigente: Contrato; alCerrar: () => void; alGuardado?: () => void }) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const opciones = useSel(selOpcionesPersonal);
  const parametros = useSel(selParametrosNomina);
  const minimo = sumarDias(vigente.inicio, 1);
  const inicial = useMemo<BorradorContrato>(() => ({ ...contratoComoBorrador(vigente), inicio: hoy > vigente.inicio ? hoy : minimo, fin: null }), [vigente, hoy, minimo]);
  const [b, setB] = useState<BorradorContrato>(inicial);
  const [errores, setErrores] = useState<Partial<Record<CampoContrato, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);
  const sucio = JSON.stringify(b) !== JSON.stringify(inicial);

  const validar = (campo?: CampoContrato) => {
    const e = validarContrato(b, parametros, minimo, hoy);
    setErrores((prev) => (campo ? { ...prev, [campo]: e[campo] } : e));
    return e;
  };
  const guardar = () => {
    setTocado(true);
    setErrorGeneral(null);
    if (Object.keys(validar()).length > 0) return;
    const datos = datosDeContrato(b);
    const r = acciones.reemplazarContrato({ empleadoId: empleado.id, contratoId: acciones.nuevoId(PREFIJOS.contrato), desde: datos.inicio, contrato: datos });
    if (!r.ok) {
      const campo = r.error.campo as CampoContrato | undefined;
      if (campo && ['inicio', 'fin', 'salarioBase', 'honorarios', 'jornadaSemanalHoras', 'retencionFuente'].includes(campo)) setErrores({ [campo]: r.error.mensaje });
      else setErrorGeneral(r.error.mensaje);
      return;
    }
    avisar({ tipo: 'exito', texto: 'Contrato actualizado', detalle: `${nombreEmpleado(empleado)} · el nuevo contrato cuenta desde esa fecha` });
    alGuardado?.();
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Contrato"
      titulo={`Nuevo contrato de ${empleado.nombres}`}
      descripcion="El contrato vigente termina el día anterior y el nuevo cuenta desde la fecha que elijas. Las nóminas ya aprobadas conservan el contrato con el que se liquidaron."
      ancho="lg"
      confirmarAlCerrar={sucio}
      data-testid="personal-dialogo-contrato"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="personal-guardar-contrato">
            Guardar contrato
          </Button>
        </>
      }
    >
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
        noValidate
      >
        <CamposContrato
          borrador={b}
          alCambiar={(c, campo) => {
            setB((prev) => ({ ...prev, ...c }));
            if (campo && (tocado || errores[campo])) setErrores((prev) => ({ ...prev, [campo]: undefined }));
          }}
          alPerderFoco={(campo) => () => validar(campo)}
          errores={errores}
          opciones={opciones}
          parametros={parametros}
          desde={minimo}
          enModal
        />
        {errorGeneral && (
          <p role="alert" className="mt-4 border border-danger bg-danger-soft px-4 py-3 t-body text-ink" data-testid="personal-error-formulario">
            {errorGeneral}
          </p>
        )}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Retirar a una persona
// ---------------------------------------------------------------------------------------------------------
export function DialogoRetiro({ empleado, alCerrar, alRetirado }: { empleado: Empleado; alCerrar: () => void; alRetirado?: () => void }) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const [fecha, setFecha] = useState<FechaISO | null>(hoy);
  const [motivo, setMotivo] = useState('');
  const [errores, setErrores] = useState<Partial<Record<CampoRetiro, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const consecuencias = useSel(selConsecuenciasRetiro, { empleadoId: empleado.id, fecha: fecha ?? hoy });
  const nombre = nombreEmpleado(empleado);

  const confirmar = () => {
    const e = validarRetiro({ fecha, motivo }, empleado.fechaIngreso);
    setErrores(e);
    setErrorGeneral(null);
    if (Object.keys(e).length > 0) return;
    const r = acciones.retirarEmpleado({ empleadoId: empleado.id, fecha: fecha as FechaISO, motivo: motivo.trim() });
    if (!r.ok) {
      if (r.error.campo === 'fecha' || r.error.campo === 'motivo') setErrores({ [r.error.campo]: r.error.mensaje });
      else setErrorGeneral(r.error.mensaje);
      return;
    }
    avisar({ tipo: 'exito', texto: `${nombre} quedó retirado del equipo`, detalle: 'Su ficha y sus desprendibles se conservan.' });
    alRetirado?.();
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Personal"
      titulo={`¿Retirar a ${nombre}?`}
      descripcion="La persona deja de aparecer en las nóminas y en los turnos desde esa fecha. Su ficha, sus desprendibles y su historial se conservan."
      ancho="md"
      confirmarAlCerrar={motivo.trim().length > 0}
      data-testid="personal-dialogo-retiro"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button variante="destructive" onClick={confirmar} data-testid="personal-confirmar-retiro">
            Retirar a {empleado.nombres}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectorFecha etiqueta="Último día" hoy={hoy} valor={fecha} alCambiar={setFecha} desde={empleado.fechaIngreso} error={errores.fecha} enModal />
        <Textarea
          etiqueta="Motivo del retiro"
          placeholder="Renuncia, terminación del contrato, mutuo acuerdo…"
          value={motivo}
          onChange={(ev) => {
            setMotivo(ev.target.value);
            if (errores.motivo) setErrores((p) => ({ ...p, motivo: undefined }));
          }}
          error={errores.motivo}
          data-testid="personal-motivo-retiro"
        />
        {(consecuencias.turnosFuturos > 0 || consecuencias.usuarios > 0) && (
          <ul className="list-disc border border-line bg-surface-2 py-3 pl-8 pr-4 t-body text-ink-2" data-testid="personal-consecuencias-retiro">
            {consecuencias.turnosFuturos > 0 && <li>Se quitan {plural(consecuencias.turnosFuturos, 'turno programado', 'turnos programados')} después de esa fecha.</li>}
            {consecuencias.usuarios > 0 && <li>Se desactiva su usuario de la demostración.</li>}
          </ul>
        )}
        {errorGeneral && (
          <p role="alert" className="border border-danger bg-danger-soft px-4 py-3 t-body text-ink">
            {errorGeneral}
          </p>
        )}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Verificación de la PILA de un contratista (soporte simulado)
// ---------------------------------------------------------------------------------------------------------
export function DialogoPila({ contrato, nombre, mes, alCerrar }: { contrato: Contrato; nombre: string; mes: MesISO; alCerrar: () => void }) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const [soporte, setSoporte] = useState(`Planilla PILA ${mes}.pdf`);
  const [error, setError] = useState<string | null>(null);

  const confirmar = () => {
    if (!soporte.trim()) return setError('Escribe el nombre del soporte de la planilla.');
    const r = acciones.verificarPila({ contratoId: contrato.id, periodo: mes, verificada: true, soporte: { nombreArchivo: soporte.trim(), estado: 'adjunto', fecha: hoy } });
    if (!r.ok) return setError(r.error.mensaje);
    avisar({ tipo: 'exito', texto: 'Planilla verificada', detalle: `${nombre} · ${mesAnio(mes)}` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Seguridad social"
      titulo={`Verificar la planilla de ${mesAnio(mes)}`}
      descripcion={`Antes de pagarle a ${nombre} confirma que aportó su seguridad social. En la demostración no se sube un archivo: queda anotado el nombre del soporte.`}
      ancho="sm"
      data-testid="personal-dialogo-pila"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={confirmar} data-testid="personal-confirmar-pila">
            Marcar como verificada
          </Button>
        </>
      }
    >
      <Input etiqueta="Soporte de la planilla" value={soporte} onChange={(ev) => setSoporte(ev.target.value)} error={error ?? undefined} autoComplete="off" data-testid="personal-soporte-pila" />
    </Dialog>
  );
}
