import { Dinero, GrupoRadio, InputNumero, Select, SelectorFecha } from '@/ui';
import type { Contrato, DatosContrato, FechaISO, ParametrosNomina } from '@/dominio/tipos';
import { useHoy, useSel } from '@/estado';
import { selComparativoModalidades } from '@/selectores';
import type { BorradorContrato, CampoContrato } from '../calculos';
import type { OpcionesPersonal } from '../selectores';
import { ETIQUETA_MODALIDAD, ETIQUETA_PERIODICIDAD, ETIQUETA_RIESGO_ARL, ETIQUETA_VINCULACION } from '../textos';

/** Borrador de un contrato nuevo (laboral a término indefinido, 42 horas, quincenal). */
export function contratoVacio(hoy: FechaISO, parametros: Pick<ParametrosNomina, 'jornadaMaximaSemanal'>): BorradorContrato {
  const j = parametros.jornadaMaximaSemanal;
  return {
    tipo: 'laboral',
    modalidadLaboral: 'indefinido',
    inicio: hoy,
    fin: null,
    salarioBase: null,
    honorarios: null,
    jornadaSemanalHoras: hoy >= j.desde ? j.horas : j.horasAnterior,
    riesgoArl: 1,
    esquemaComisionId: null,
    periodicidadPago: 'quincenal',
    retencionFuente: null,
  };
}

export function contratoComoBorrador(c: Contrato): BorradorContrato {
  return {
    tipo: c.tipo,
    modalidadLaboral: c.modalidadLaboral ?? 'indefinido',
    inicio: c.inicio,
    fin: c.fin,
    salarioBase: c.salarioBase,
    honorarios: c.honorarios,
    jornadaSemanalHoras: c.jornadaSemanalHoras,
    riesgoArl: c.riesgoArl,
    esquemaComisionId: c.esquemaComisionId,
    periodicidadPago: c.periodicidadPago,
    retencionFuente: c.retencionFuente,
  };
}

/** Los datos del comando de contrato a partir del borrador. */
export function datosDeContrato(b: BorradorContrato): DatosContrato {
  const laboral = b.tipo === 'laboral';
  return {
    tipo: b.tipo,
    modalidadLaboral: laboral ? b.modalidadLaboral : null,
    inicio: b.inicio as FechaISO,
    fin: b.fin,
    salarioBase: laboral ? b.salarioBase : null,
    honorarios: laboral ? null : b.honorarios,
    jornadaSemanalHoras: b.jornadaSemanalHoras as number,
    riesgoArl: laboral ? b.riesgoArl : 1,
    esquemaComisionId: b.esquemaComisionId,
    periodicidadPago: laboral ? b.periodicidadPago : 'mensual',
    retencionFuente: laboral ? null : b.retencionFuente,
    verificacionesPila: [],
  };
}

export interface PropsCamposContrato {
  borrador: BorradorContrato;
  alCambiar: (cambios: Partial<BorradorContrato>, campo?: CampoContrato) => void;
  alPerderFoco: (campo: CampoContrato) => () => void;
  errores: Partial<Record<CampoContrato, string>>;
  opciones: OpcionesPersonal;
  parametros: ParametrosNomina;
  /** Primer día que se puede elegir como inicio. */
  desde?: FechaISO;
  enModal?: boolean;
}

/** Vista previa de lo que costaría el contrato (con la exoneración vigente): sale de `selComparativoModalidades`. */
function CostoDelContrato({ b, parametros }: { b: BorradorContrato; parametros: ParametrosNomina }) {
  const hoy = useHoy();
  const valor = b.tipo === 'laboral' ? b.salarioBase : b.honorarios;
  const cmp = useSel(selComparativoModalidades, { valorMensual: Math.max(valor ?? 0, 1), exoneracion: true, fecha: hoy, riesgoArl: b.riesgoArl });
  if (!valor || valor <= 0 || (b.tipo === 'laboral' && valor < parametros.smmlv)) return null;
  const costo = b.tipo === 'laboral' ? cmp.laboral.costoEmpleador : cmp.prestacion.costoEmpleador;
  return (
    <p className="col-span-2 border border-line bg-surface-2 px-4 py-3 t-body text-ink-2" data-testid="personal-costo-contrato" data-costo={costo}>
      {b.tipo === 'laboral' ? 'Con este salario' : 'Con estos honorarios'}, el negocio paga unos <Dinero valor={costo} className="font-bold text-ink" /> al mes
      {b.tipo === 'laboral' ? ' (con auxilio, aportes y prestaciones, y con exoneración de aportes). Sin comisiones ni recargos.' : ', sin aportes ni prestaciones a su cargo. Sin comisiones.'}
    </p>
  );
}

/** Campos del contrato (PRD 7.9): laboral o prestación de servicios, con lo que cuestan. */
export function CamposContrato({ borrador: b, alCambiar, alPerderFoco, errores, opciones, parametros, desde, enModal }: PropsCamposContrato) {
  const hoy = useHoy();
  const laboral = b.tipo === 'laboral';
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4" data-testid="personal-campos-contrato">
      <div className="col-span-2">
        <GrupoRadio
          etiqueta="Tipo de vinculación"
          tarjetas
          columnas={2}
          valor={b.tipo}
          alCambiar={(v) =>
            alCambiar({
              tipo: v,
              periodicidadPago: v === 'laboral' ? 'quincenal' : 'mensual',
            })
          }
          opciones={[
            { valor: 'laboral', etiqueta: ETIQUETA_VINCULACION.laboral, descripcion: 'Salario, auxilio, aportes y prestaciones.' },
            { valor: 'prestacion_servicios', etiqueta: ETIQUETA_VINCULACION.prestacion_servicios, descripcion: 'Honorarios y retención. Solo si no hay horario ni órdenes.' },
          ]}
        />
      </div>
      {laboral ? (
        <>
          <InputNumero
            etiqueta="Salario mensual"
            prefijo="$"
            valor={b.salarioBase}
            alCambiar={(v) => alCambiar({ salarioBase: v }, 'salarioBase')}
            onBlur={alPerderFoco('salarioBase')}
            error={errores.salarioBase}
            data-testid="personal-salario"
          />
          <Select
            etiqueta="Modalidad"
            valor={b.modalidadLaboral}
            alCambiar={(v) => alCambiar({ modalidadLaboral: v as BorradorContrato['modalidadLaboral'] })}
            opciones={(['indefinido', 'fijo', 'obra_labor'] as const).map((m) => ({ valor: m, etiqueta: ETIQUETA_MODALIDAD[m] }))}
            enModal={enModal}
          />
        </>
      ) : (
        <>
          <InputNumero
            etiqueta="Honorarios mensuales"
            prefijo="$"
            valor={b.honorarios}
            alCambiar={(v) => alCambiar({ honorarios: v }, 'honorarios')}
            onBlur={alPerderFoco('honorarios')}
            error={errores.honorarios}
            data-testid="personal-honorarios"
          />
          <InputNumero
            etiqueta="Retención en la fuente"
            opcional
            sufijo="%"
            decimales={1}
            valor={b.retencionFuente === null ? null : Math.round(b.retencionFuente * 1000) / 10}
            alCambiar={(v) => alCambiar({ retencionFuente: v === null ? null : v / 100 }, 'retencionFuente')}
            error={errores.retencionFuente}
            ayuda={`Si lo dejas vacío se usa el parámetro (${Math.round(parametros.prestacionServicios.retencionFuente * 1000) / 10} %).`}
          />
        </>
      )}
      <InputNumero
        etiqueta="Horas de trabajo a la semana"
        sufijo="h"
        valor={b.jornadaSemanalHoras}
        alCambiar={(v) => alCambiar({ jornadaSemanalHoras: v }, 'jornadaSemanalHoras')}
        onBlur={alPerderFoco('jornadaSemanalHoras')}
        error={errores.jornadaSemanalHoras}
        ayuda={laboral ? undefined : 'Para un contratista es solo informativo: un horario fijo es una señal de relación laboral.'}
      />
      {laboral ? (
        <Select
          etiqueta="Riesgo de ARL"
          valor={String(b.riesgoArl)}
          alCambiar={(v) => alCambiar({ riesgoArl: Number(v) as BorradorContrato['riesgoArl'] })}
          opciones={([1, 2, 3, 4, 5] as const).map((r) => ({ valor: String(r), etiqueta: ETIQUETA_RIESGO_ARL[r] }))}
          enModal={enModal}
        />
      ) : (
        <div />
      )}
      {laboral && (
        <Select
          etiqueta="Cómo se le paga"
          valor={b.periodicidadPago}
          alCambiar={(v) => alCambiar({ periodicidadPago: v as BorradorContrato['periodicidadPago'] })}
          opciones={(['quincenal', 'mensual'] as const).map((p) => ({ valor: p, etiqueta: ETIQUETA_PERIODICIDAD[p] }))}
          enModal={enModal}
        />
      )}
      <Select
        etiqueta="Esquema de comisión"
        valor={b.esquemaComisionId ?? 'ninguno'}
        alCambiar={(v) => alCambiar({ esquemaComisionId: v === 'ninguno' ? null : v })}
        opciones={[{ valor: 'ninguno', etiqueta: 'Sin comisión' }, ...opciones.esquemas.map((e) => ({ valor: e.id, etiqueta: e.nombre }))]}
        enModal={enModal}
        data-testid="personal-esquema"
      />
      <SelectorFecha etiqueta="Empieza el" hoy={hoy} valor={b.inicio} alCambiar={(f) => alCambiar({ inicio: f }, 'inicio')} error={errores.inicio} desde={desde} enModal={enModal} />
      <div>
        <SelectorFecha
          etiqueta="Termina el"
          opcional
          hoy={hoy}
          valor={b.fin}
          alCambiar={(f) => alCambiar({ fin: f }, 'fin')}
          error={errores.fin}
          desde={b.inicio ?? undefined}
          enModal={enModal}
          ayuda={b.fin ? undefined : laboral && b.modalidadLaboral === 'fijo' ? 'En un contrato a término fijo, la fecha final.' : 'Sin fecha final.'}
        />
        {b.fin && (
          <button type="button" className="mt-1.5 t-small font-bold text-ink underline underline-offset-4" onClick={() => alCambiar({ fin: null }, 'fin')}>
            Quitar la fecha final
          </button>
        )}
      </div>
      <CostoDelContrato b={b} parametros={parametros} />
    </div>
  );
}
