import type { ReactNode } from 'react';
import { Input, Select, SelectorFecha } from '@/ui';
import type { DatosEmpleado, Empleado, FechaISO } from '@/dominio/tipos';
import type { BorradorEmpleado, CampoEmpleado } from '../calculos';
import { enmascararCuenta } from '../calculos';
import type { OpcionesPersonal } from '../selectores';
import { CARGOS, ETIQUETA_CARGO, ETIQUETA_CUENTA, ETIQUETA_DOCUMENTO } from '../textos';

/** Borrador vacío para una persona nueva (la fecha de ingreso arranca en hoy). */
export function borradorVacio(hoy: FechaISO, localId: string | null = null): BorradorEmpleado {
  return {
    nombres: '',
    apellidos: '',
    tipoDocumento: 'CC',
    numeroDocumento: '',
    fechaNacimiento: null,
    cargo: null,
    localId,
    fechaIngreso: hoy,
    celular: '',
    correo: '',
    contactoNombre: '',
    contactoParentesco: '',
    contactoCelular: '',
    eps: '',
    pension: '',
    cesantias: '',
    arl: '',
    caja: '',
    cuentaEntidad: '',
    cuentaTipo: 'ahorros',
    cuentaNumero: '',
  };
}

/** Borrador de una persona existente (la cuenta ya viene enmascarada: se conserva si no se toca). */
export function borradorDe(e: Empleado): BorradorEmpleado {
  return {
    nombres: e.nombres,
    apellidos: e.apellidos,
    tipoDocumento: e.documento.tipo,
    numeroDocumento: e.documento.numero,
    fechaNacimiento: e.fechaNacimiento,
    cargo: e.cargo,
    localId: e.localId,
    fechaIngreso: e.fechaIngreso,
    celular: e.celular,
    correo: e.correo,
    contactoNombre: e.contactoEmergencia.nombre,
    contactoParentesco: e.contactoEmergencia.parentesco,
    contactoCelular: e.contactoEmergencia.celular,
    eps: e.afiliaciones.eps,
    pension: e.afiliaciones.pension,
    cesantias: e.afiliaciones.cesantias,
    arl: e.afiliaciones.arl,
    caja: e.afiliaciones.caja,
    cuentaEntidad: e.cuentaPago.entidad,
    cuentaTipo: e.cuentaPago.tipo,
    cuentaNumero: e.cuentaPago.numeroEnmascarado,
  };
}

/** Los datos del comando `empleado.crear` / `empleado.editar` a partir del borrador (sin slug ni contrato). */
export function datosDeBorrador(b: BorradorEmpleado, slug: string): DatosEmpleado {
  return {
    slug,
    nombres: b.nombres.trim(),
    apellidos: b.apellidos.trim(),
    documento: { tipo: b.tipoDocumento, numero: b.numeroDocumento.trim() },
    fechaNacimiento: b.fechaNacimiento,
    cargo: b.cargo as NonNullable<BorradorEmpleado['cargo']>,
    localId: b.localId,
    fechaIngreso: b.fechaIngreso as FechaISO,
    fechaRetiro: null,
    celular: b.celular.replace(/\s/g, ''),
    correo: b.correo.trim(),
    contactoEmergencia: { nombre: b.contactoNombre.trim(), parentesco: b.contactoParentesco.trim(), celular: b.contactoCelular.replace(/\s/g, '') },
    afiliaciones: { eps: b.eps.trim(), pension: b.pension.trim(), cesantias: b.cesantias.trim(), arl: b.arl.trim(), caja: b.caja.trim() },
    cuentaPago: { entidad: b.cuentaEntidad.trim(), tipo: b.cuentaTipo, numeroEnmascarado: enmascararCuenta(b.cuentaNumero) },
  };
}

export interface PropsCamposEmpleado {
  borrador: BorradorEmpleado;
  alCambiar: (cambios: Partial<BorradorEmpleado>, campo?: CampoEmpleado) => void;
  alPerderFoco: (campo: CampoEmpleado) => () => void;
  errores: Partial<Record<CampoEmpleado, string>>;
  opciones: OpcionesPersonal;
  hoy: FechaISO;
  /** Dentro de un modal los desplegables y calendarios deben abrirse sobre él. */
  enModal?: boolean;
}

function Bloque({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: ReactNode }) {
  return (
    <fieldset className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line-soft pt-6 first:border-t-0 first:pt-0">
      <legend className="col-span-2 mb-1 t-h3 text-ink">{titulo}</legend>
      {ayuda && <p className="col-span-2 -mt-2 t-small text-muted">{ayuda}</p>}
      {children}
    </fieldset>
  );
}

/** Todos los campos de la ficha de una persona (PRD 7.9): datos, cargo, afiliaciones, cuenta y emergencia. */
export function CamposEmpleado({ borrador: b, alCambiar, alPerderFoco, errores, opciones, hoy, enModal }: PropsCamposEmpleado) {
  const texto = (campo: CampoEmpleado, valor: string) => ({
    value: valor,
    onChange: (ev: { target: { value: string } }) => alCambiar({ [campo]: ev.target.value } as Partial<BorradorEmpleado>, campo),
    onBlur: alPerderFoco(campo),
    error: errores[campo],
    autoComplete: 'off' as const,
  });
  const sugerencia = (id: string, valores: readonly string[]) => (
    <datalist id={id}>
      {[...valores, 'No aplica'].map((v) => (
        <option key={v} value={v} />
      ))}
    </datalist>
  );
  return (
    <div className="flex flex-col gap-6" data-testid="personal-campos-empleado">
      <Bloque titulo="Datos personales">
        <Input etiqueta="Nombres" {...texto('nombres', b.nombres)} data-testid="personal-nombres" />
        <Input etiqueta="Apellidos" {...texto('apellidos', b.apellidos)} data-testid="personal-apellidos" />
        <Select
          etiqueta="Tipo de documento"
          valor={b.tipoDocumento}
          alCambiar={(v) => alCambiar({ tipoDocumento: v as BorradorEmpleado['tipoDocumento'] })}
          opciones={(['CC', 'CE', 'PPT'] as const).map((t) => ({ valor: t, etiqueta: ETIQUETA_DOCUMENTO[t] }))}
          enModal={enModal}
        />
        <Input etiqueta="Número de documento" inputMode="numeric" {...texto('numeroDocumento', b.numeroDocumento)} data-testid="personal-documento" />
        <SelectorFecha
          etiqueta="Fecha de nacimiento"
          opcional
          hoy={hoy}
          valor={b.fechaNacimiento}
          alCambiar={(f) => alCambiar({ fechaNacimiento: f }, 'fechaNacimiento')}
          error={errores.fechaNacimiento}
          enModal={enModal}
        />
        <Input etiqueta="Celular" inputMode="tel" placeholder="3101234567" {...texto('celular', b.celular)} data-testid="personal-celular" />
        <Input className="col-span-2" etiqueta="Correo" type="email" placeholder="nombre@correo.co" {...texto('correo', b.correo)} data-testid="personal-correo" />
      </Bloque>

      <Bloque titulo="Cargo y local">
        <Select
          etiqueta="Cargo"
          placeholder="Elige el cargo"
          valor={b.cargo}
          alCambiar={(v) => alCambiar({ cargo: v as BorradorEmpleado['cargo'] }, 'cargo')}
          opciones={CARGOS.map((c) => ({ valor: c, etiqueta: ETIQUETA_CARGO[c] }))}
          error={errores.cargo}
          enModal={enModal}
          data-testid="personal-cargo"
        />
        <Select
          etiqueta="Local"
          valor={b.localId ?? 'general'}
          alCambiar={(v) => alCambiar({ localId: v === 'general' ? null : v })}
          opciones={[...opciones.locales.map((l) => ({ valor: l.id, etiqueta: l.nombre })), { valor: 'general', etiqueta: 'Administración (varios locales)' }]}
          enModal={enModal}
          data-testid="personal-local"
        />
        <SelectorFecha
          etiqueta="Fecha de ingreso"
          hoy={hoy}
          valor={b.fechaIngreso}
          alCambiar={(f) => alCambiar({ fechaIngreso: f }, 'fechaIngreso')}
          error={errores.fechaIngreso}
          enModal={enModal}
        />
      </Bloque>

      <Bloque titulo="Afiliaciones" ayuda="Escribe el nombre o elige uno de los que ya usa tu equipo. Si no aplica, escribe «No aplica».">
        <Input etiqueta="EPS" list="personal-lista-eps" {...texto('eps', b.eps)} />
        <Input etiqueta="Fondo de pensión" list="personal-lista-pension" {...texto('pension', b.pension)} />
        <Input etiqueta="Fondo de cesantías" list="personal-lista-cesantias" {...texto('cesantias', b.cesantias)} />
        <Input etiqueta="ARL" list="personal-lista-arl" {...texto('arl', b.arl)} />
        <Input etiqueta="Caja de compensación" list="personal-lista-caja" {...texto('caja', b.caja)} />
        {sugerencia('personal-lista-eps', opciones.sugerencias.eps)}
        {sugerencia('personal-lista-pension', opciones.sugerencias.pension)}
        {sugerencia('personal-lista-cesantias', opciones.sugerencias.cesantias)}
        {sugerencia('personal-lista-arl', opciones.sugerencias.arl)}
        {sugerencia('personal-lista-caja', opciones.sugerencias.caja)}
      </Bloque>

      <Bloque titulo="Cuenta para el pago">
        <Input etiqueta="Banco o billetera" list="personal-lista-entidades" {...texto('cuentaEntidad', b.cuentaEntidad)} />
        {sugerencia('personal-lista-entidades', opciones.sugerencias.entidades)}
        <Select
          etiqueta="Tipo de cuenta"
          valor={b.cuentaTipo}
          alCambiar={(v) => alCambiar({ cuentaTipo: v as BorradorEmpleado['cuentaTipo'] })}
          opciones={(['ahorros', 'corriente', 'nequi', 'daviplata'] as const).map((t) => ({ valor: t, etiqueta: ETIQUETA_CUENTA[t] }))}
          enModal={enModal}
        />
        <Input
          className="col-span-2"
          etiqueta="Número de cuenta o celular de la billetera"
          inputMode="numeric"
          ayuda="Por seguridad solo se guardan los últimos cuatro dígitos."
          {...texto('cuentaNumero', b.cuentaNumero)}
        />
      </Bloque>

      <Bloque titulo="Contacto de emergencia">
        <Input etiqueta="Nombre" {...texto('contactoNombre', b.contactoNombre)} />
        <Input etiqueta="Parentesco" placeholder="Madre, pareja, amigo…" {...texto('contactoParentesco', b.contactoParentesco)} />
        <Input etiqueta="Celular" inputMode="tel" {...texto('contactoCelular', b.contactoCelular)} />
      </Bloque>
    </div>
  );
}
