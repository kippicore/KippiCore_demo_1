import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BotonEnlace, Button, EncabezadoPagina, avisar } from '@/ui';
import { PREFIJOS } from '@/dominio/motor/ids';
import { useAcciones, useHoy, useSel } from '@/estado';
import { rutas } from '@/app/rutas';
import {
  slugDe,
  validarContrato,
  validarEmpleado,
  type BorradorContrato,
  type BorradorEmpleado,
  type CampoContrato,
  type CampoEmpleado,
} from '../calculos';
import { borradorVacio, CamposEmpleado, datosDeBorrador } from '../componentes/CamposEmpleado';
import { CamposContrato, contratoVacio, datosDeContrato } from '../componentes/CamposContrato';
import { LimiteError, NotaNomina } from '../componentes/Piezas';
import { selOpcionesPersonal, selParametrosNomina } from '../selectores';
import { nombreEmpleado } from '@/selectores';

/** Campos del dominio que no se llaman igual en el formulario. */
const CAMPO_DOMINIO: Record<string, CampoEmpleado> = { documento: 'numeroDocumento' };
const CAMPOS_CONTRATO: readonly string[] = ['inicio', 'fin', 'salarioBase', 'honorarios', 'jornadaSemanalHoras', 'retencionFuente'];

/** Nuevo empleado (PRD 7.9): la ficha completa y su contrato, con lo que le costaría al negocio mientras lo llenas. */
export default function EmpleadoNuevo() {
  return (
    <div className="pb-16" data-testid="personal-nuevo-pagina">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Personal y nómina', a: rutas.personal() }, { texto: 'Nuevo empleado' }]}
        titulo="Nuevo empleado"
        subtitulo="Registra a la persona con su contrato: verás enseguida cuánto le cuesta al negocio"
      />
      <LimiteError>
        <Formulario />
      </LimiteError>
    </div>
  );
}

function Formulario() {
  const hoy = useHoy();
  const navegar = useNavigate();
  const acciones = useAcciones();
  const opciones = useSel(selOpcionesPersonal);
  const parametros = useSel(selParametrosNomina);
  const [b, setB] = useState<BorradorEmpleado>(() => borradorVacio(hoy));
  const [c, setC] = useState<BorradorContrato>(() => contratoVacio(hoy, parametros));
  const [erroresE, setErroresE] = useState<Partial<Record<CampoEmpleado, string>>>({});
  const [erroresC, setErroresC] = useState<Partial<Record<CampoContrato, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const validarE = (campo?: CampoEmpleado) => {
    const e = validarEmpleado(b, hoy);
    setErroresE((prev) => (campo ? { ...prev, [campo]: e[campo] } : e));
    return e;
  };
  const validarC = (campo?: CampoContrato) => {
    const e = validarContrato(c, parametros, b.fechaIngreso, hoy);
    setErroresC((prev) => (campo ? { ...prev, [campo]: e[campo] } : e));
    return e;
  };

  const guardar = () => {
    setTocado(true);
    setErrorGeneral(null);
    const eE = validarE();
    const eC = validarC();
    if (Object.keys(eE).length + Object.keys(eC).length > 0) {
      // El primer campo con error recibe el foco para que se vea qué corregir.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setGuardando(true);
    const slug = slugDe(b.nombres, b.apellidos, new Set(opciones.slugs));
    const empleadoId = acciones.nuevoId(PREFIJOS.empleado);
    const contratoId = acciones.nuevoId(PREFIJOS.contrato);
    const r = acciones.crearEmpleado({ empleadoId, contratoId, datos: datosDeBorrador(b, slug), contrato: datosDeContrato(c) });
    setGuardando(false);
    if (!r.ok) {
      const campo = r.error.campo;
      if (campo && CAMPOS_CONTRATO.includes(campo)) setErroresC({ [campo]: r.error.mensaje });
      else if (campo && (CAMPO_DOMINIO[campo] ?? campo) in b) setErroresE({ [CAMPO_DOMINIO[campo] ?? campo]: r.error.mensaje });
      else setErrorGeneral(r.error.mensaje);
      return;
    }
    avisar({
      tipo: 'exito',
      texto: 'Empleado creado',
      detalle: `${nombreEmpleado({ nombres: b.nombres, apellidos: b.apellidos })} ya está en tu equipo`,
      accion: { texto: 'Ver su costo', a: rutas.empleadoPestana(slug, 'costo') },
    });
    navegar(rutas.empleado(slug), { replace: true });
  };

  return (
    <form
      className="mx-auto mt-8 flex max-w-[880px] flex-col gap-8"
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        guardar();
      }}
      data-testid="personal-formulario-nuevo"
    >
      <section className="border border-line bg-surface p-6" aria-label="Datos de la persona">
        <h2 className="t-h2 text-ink">Datos de la persona</h2>
        <p className="mt-1 mb-6 t-small text-muted">Lo mismo que pide la ficha: datos personales, cargo, afiliaciones, cuenta de pago y contacto de emergencia.</p>
        <CamposEmpleado
          borrador={b}
          alCambiar={(cambios, campo) => {
            setB((prev) => ({ ...prev, ...cambios }));
            // El contrato empieza el día del ingreso mientras no se cambie a mano.
            if (cambios.fechaIngreso && (!c.inicio || c.inicio === b.fechaIngreso)) setC((prev) => ({ ...prev, inicio: cambios.fechaIngreso ?? prev.inicio }));
            if (campo && (tocado || erroresE[campo])) setErroresE((prev) => ({ ...prev, [campo]: undefined }));
          }}
          alPerderFoco={(campo) => () => {
            if (tocado || b[campo]) validarE(campo);
          }}
          errores={erroresE}
          opciones={opciones}
          hoy={hoy}
        />
      </section>

      <section className="border border-line bg-surface p-6" aria-label="Contrato">
        <h2 className="t-h2 text-ink">Contrato</h2>
        <p className="mt-1 mb-6 t-small text-muted">Elige la modalidad y el valor: el costo para el negocio se calcula al instante con los parámetros ilustrativos.</p>
        <CamposContrato
          borrador={c}
          alCambiar={(cambios, campo) => {
            setC((prev) => ({ ...prev, ...cambios }));
            if (campo && (tocado || erroresC[campo])) setErroresC((prev) => ({ ...prev, [campo]: undefined }));
          }}
          alPerderFoco={(campo) => () => {
            if (tocado) validarC(campo);
          }}
          errores={erroresC}
          opciones={opciones}
          parametros={parametros}
          desde={b.fechaIngreso ?? undefined}
        />
      </section>

      {errorGeneral && (
        <p role="alert" className="border border-danger bg-danger-soft px-4 py-3 t-body text-ink" data-testid="personal-error-formulario">
          {errorGeneral}
        </p>
      )}
      <NotaNomina />
      <div className="flex items-center justify-end gap-3 border-t border-line pt-6">
        <BotonEnlace to={rutas.personal()} variante="secondary">
          Cancelar
        </BotonEnlace>
        <Button type="submit" cargando={guardando} data-testid="personal-crear">
          Crear empleado
        </Button>
      </div>
    </form>
  );
}
