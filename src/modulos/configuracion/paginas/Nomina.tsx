import { useMemo, useState } from 'react';
import { Dinero, InputNumero, NotaLegal, Select, SelectorFecha, Switch } from '@/ui';
import type { ParametrosNomina } from '@/dominio/tipos';
import { horasMes } from '@/dominio/reglas/nomina';
import { PARAMETROS_NOMINA } from '@/config/nomina';
import { TEXTOS_FIJOS } from '@/config/textos/notas';
import { useHoy, useSel } from '@/estado';
import { entero, numero, porcentaje } from '@/lib/formato';
import { ejemploNomina, type EjemploNomina } from '../calculos';
import { BarraGuardar, CampoCop, CampoHora, CampoNumero, CampoPct, SeccionAjustes } from '../componentes/Campos';
import { InsigniaVerificar, MarcoConfiguracion } from '../componentes/Marco';
import { useBorrador, useGuardarParametros } from '../hooks';
import { selParametros } from '../selectores';
import { TEXTOS } from '../textos';

const VERIFICAR = TEXTOS_FIJOS.valorIlustrativo;

export default function Nomina() {
  const guardados = useSel(selParametros).nomina;
  const hoy = useHoy();
  const { borrador, cambios, nCambios, poner, descartar, reemplazar } = useBorrador<ParametrosNomina>(guardados);
  const { guardar, errores, general } = useGuardarParametros('nomina');
  const e = (ruta: string) => errores[`nomina.${ruta}`];

  const alGuardar = () => {
    // `divisorHorasMes: null` vuelve al cálculo automático (jornada ÷ 6 × 30); el dominio lo admite.
    if (guardar(cambios as Record<string, unknown> | null, 'Parámetros de nómina guardados')) descartar();
  };

  const automatico = borrador.divisorHorasMes === null;

  return (
    <MarcoConfiguracion seccion="nomina" titulo="Parámetros de nómina" subtitulo={TEXTOS.nomina.subtitulo}>
      <div className="flex flex-col gap-6">
        <NotaLegal tipo="nomina" />
        <VistaPreviaNomina guardados={guardados} borrador={borrador} hoy={hoy} />

        <SeccionAjustes titulo="Salario mínimo y auxilio de transporte" insignia={<InsigniaVerificar texto={VERIFICAR} />} descripcion="La base de casi todos los cálculos de la nómina." data-testid="nomina-salario">
          <CampoCop etiqueta="Salario mínimo mensual" valor={borrador.smmlv} alCambiar={(v) => poner('smmlv', v)} error={e('smmlv')} data-testid="nomina-smmlv" />
          <CampoCop etiqueta="Auxilio de transporte" valor={borrador.auxilioTransporte} alCambiar={(v) => poner('auxilioTransporte', v)} error={e('auxilioTransporte')} data-testid="nomina-auxilio" />
          <CampoNumero
            etiqueta="Quién recibe el auxilio (en salarios mínimos)"
            decimales={1}
            valor={borrador.topeAuxilioSMMLV}
            alCambiar={(v) => poner('topeAuxilioSMMLV', v)}
            error={e('topeAuxilioSMMLV')}
            ayuda="Hasta este múltiplo del salario mínimo."
          />
          <Select
            className="sm:col-span-2 lg:col-span-3"
            etiqueta="Con qué se mide ese tope"
            valor={borrador.baseTopeAuxilio}
            alCambiar={(v) => poner('baseTopeAuxilio', v)}
            opciones={[
              { valor: 'devengado', etiqueta: 'Todo lo que gana en el mes (salario, comisiones y recargos)' },
              { valor: 'basico', etiqueta: 'Solo el salario básico' },
            ]}
          />
        </SeccionAjustes>

        <SeccionAjustes titulo="Jornada y valor de la hora" insignia={<InsigniaVerificar texto={VERIFICAR} />} descripcion="De aquí salen las horas extra y los recargos." data-testid="nomina-jornada">
          <CampoNumero etiqueta="Jornada máxima por semana" sufijo="horas" valor={borrador.jornadaMaximaSemanal.horas} alCambiar={(v) => poner('jornadaMaximaSemanal.horas', v)} error={e('jornadaMaximaSemanal.horas')} data-testid="nomina-jornada-horas" />
          <CampoNumero etiqueta="Jornada anterior" sufijo="horas" valor={borrador.jornadaMaximaSemanal.horasAnterior} alCambiar={(v) => poner('jornadaMaximaSemanal.horasAnterior', v)} error={e('jornadaMaximaSemanal.horasAnterior')} />
          <SelectorFecha etiqueta="La jornada nueva rige desde" hoy={hoy} valor={borrador.jornadaMaximaSemanal.desde} alCambiar={(f) => poner('jornadaMaximaSemanal.desde', f)} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Switch
              etiqueta="Calcular las horas del mes automáticamente"
              activo={automatico}
              alCambiar={(v) => poner('divisorHorasMes', v ? null : Math.round(horasMes({ ...borrador, divisorHorasMes: null }, hoy)))}
              valorTexto={automatico ? `Jornada ÷ 6 × 30 = ${numero(horasMes(borrador, hoy), 0)} horas` : 'A mano'}
            />
          </div>
          {!automatico && (
            <CampoNumero
              etiqueta="Horas del mes para el valor de la hora"
              sufijo="horas"
              valor={borrador.divisorHorasMes ?? 0}
              alCambiar={(v) => poner('divisorHorasMes', v)}
              error={e('divisorHorasMes')}
              ayuda="El salario se divide entre este número para sacar lo que vale una hora."
              data-testid="nomina-divisor"
            />
          )}
          <CampoHora etiqueta="La noche empieza a las" valor={borrador.jornadaNocturna.inicio} alCambiar={(v) => poner('jornadaNocturna.inicio', v)} />
          <CampoHora etiqueta="La noche termina a las" valor={borrador.jornadaNocturna.fin} alCambiar={(v) => poner('jornadaNocturna.fin', v)} />
          <CampoNumero etiqueta="Tolerancia de llegada tarde" sufijo="min" valor={borrador.toleranciaLlegadaTardeMin} alCambiar={(v) => poner('toleranciaLlegadaTardeMin', v)} error={e('toleranciaLlegadaTardeMin')} />
        </SeccionAjustes>

        <SeccionAjustes
          titulo="Recargos y horas extra"
          insignia={<InsigniaVerificar texto={VERIFICAR} />}
          descripcion="Cuánto se paga de más por trabajar de noche, en domingo o festivo, o fuera de la jornada. Verifica estos porcentajes con tu contador."
          columnas={4}
          data-testid="nomina-recargos"
        >
          <CampoPct etiqueta="Recargo nocturno" valor={borrador.recargos.nocturno} alCambiar={(v) => poner('recargos.nocturno', v)} error={e('recargos.nocturno')} data-testid="nomina-recargo-nocturno" />
          <CampoPct etiqueta="Dominical y festivo" valor={borrador.recargos.dominicalFestivo} alCambiar={(v) => poner('recargos.dominicalFestivo', v)} error={e('recargos.dominicalFestivo')} data-testid="nomina-recargo-dominical" />
          <CampoPct etiqueta="Hora extra diurna" valor={borrador.recargos.extraDiurna} alCambiar={(v) => poner('recargos.extraDiurna', v)} error={e('recargos.extraDiurna')} />
          <CampoPct etiqueta="Hora extra nocturna" valor={borrador.recargos.extraNocturna} alCambiar={(v) => poner('recargos.extraNocturna', v)} error={e('recargos.extraNocturna')} />
        </SeccionAjustes>

        <SeccionAjustes titulo="Descuentos al empleado" insignia={<InsigniaVerificar texto={VERIFICAR} />} descripcion="Lo que se le descuenta del sueldo para salud y pensión." columnas={4}>
          <CampoPct etiqueta="Salud" valor={borrador.trabajador.salud} alCambiar={(v) => poner('trabajador.salud', v)} error={e('trabajador.salud')} />
          <CampoPct etiqueta="Pensión" valor={borrador.trabajador.pension} alCambiar={(v) => poner('trabajador.pension', v)} error={e('trabajador.pension')} />
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="t-label text-ink">Aporte extra de pensión para sueldos altos</p>
            <p className="mb-2 t-small text-muted">Según cuántos salarios mínimos gana la persona, se descuenta un porcentaje adicional.</p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {borrador.fondoSolidaridad.map((t, i) => (
                <CampoPct
                  key={t.desdeSMMLV}
                  etiqueta={t.hastaSMMLV === null ? `Desde ${t.desdeSMMLV} salarios mínimos` : `De ${t.desdeSMMLV} a ${t.hastaSMMLV} salarios mínimos`}
                  decimales={2}
                  valor={t.porcentaje}
                  alCambiar={(v) => poner('fondoSolidaridad', borrador.fondoSolidaridad.map((x, j) => (j === i ? { ...x, porcentaje: v } : x)))}
                  error={e('fondoSolidaridad')}
                />
              ))}
            </div>
          </div>
        </SeccionAjustes>

        <SeccionAjustes titulo="Aportes que paga el negocio" insignia={<InsigniaVerificar texto={VERIFICAR} />} descripcion="Sobre el sueldo de cada empleado, además de lo que gana." columnas={4} data-testid="nomina-aportes">
          <CampoPct etiqueta="Salud" valor={borrador.empleador.salud} alCambiar={(v) => poner('empleador.salud', v)} error={e('empleador.salud')} />
          <CampoPct etiqueta="Pensión" valor={borrador.empleador.pension} alCambiar={(v) => poner('empleador.pension', v)} error={e('empleador.pension')} />
          <CampoPct etiqueta="Caja de compensación" valor={borrador.empleador.caja} alCambiar={(v) => poner('empleador.caja', v)} error={e('empleador.caja')} />
          <CampoPct etiqueta="ICBF" valor={borrador.empleador.icbf} alCambiar={(v) => poner('empleador.icbf', v)} error={e('empleador.icbf')} />
          <CampoPct etiqueta="SENA" valor={borrador.empleador.sena} alCambiar={(v) => poner('empleador.sena', v)} error={e('empleador.sena')} />
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <CampoPct
              key={n}
              etiqueta={`Riesgos laborales, nivel ${n}`}
              decimales={3}
              valor={borrador.empleador.arl[n]}
              alCambiar={(v) => poner(`empleador.arl.${n}`, v)}
              error={e(`empleador.arl.${n}`)}
              ayuda={n === 1 ? 'El de las tiendas y oficinas.' : undefined}
            />
          ))}
        </SeccionAjustes>

        <SeccionAjustes titulo="Lo que se aparta cada mes (provisiones)" insignia={<InsigniaVerificar texto={VERIFICAR} />} descripcion="Plata que el negocio separa para pagar prima, cesantías y vacaciones." columnas={4}>
          <CampoPct etiqueta="Cesantías" valor={borrador.provisiones.cesantias} decimales={2} alCambiar={(v) => poner('provisiones.cesantias', v)} error={e('provisiones.cesantias')} />
          <CampoPct etiqueta="Intereses de cesantías (anual)" valor={borrador.provisiones.interesesCesantiasAnual} alCambiar={(v) => poner('provisiones.interesesCesantiasAnual', v)} error={e('provisiones.interesesCesantiasAnual')} />
          <CampoPct etiqueta="Prima de servicios" valor={borrador.provisiones.prima} alCambiar={(v) => poner('provisiones.prima', v)} error={e('provisiones.prima')} />
          <CampoPct etiqueta="Vacaciones" valor={borrador.provisiones.vacaciones} alCambiar={(v) => poner('provisiones.vacaciones', v)} error={e('provisiones.vacaciones')} />
        </SeccionAjustes>

        <SeccionAjustes titulo="Exoneración de aportes" insignia={<InsigniaVerificar texto={VERIFICAR} />} descripcion="Cuando está activa, los sueldos por debajo del tope no pagan salud, ICBF ni SENA." columnas={2} data-testid="nomina-exoneracion">
          <div className="flex items-end pb-1">
            <Switch
              etiqueta="Exoneración activa"
              activo={borrador.exoneracion114.activa}
              alCambiar={(v) => poner('exoneracion114.activa', v)}
              valorTexto={borrador.exoneracion114.activa ? 'Activa' : 'No aplica'}
            />
          </div>
          <CampoNumero etiqueta="Tope (en salarios mínimos)" valor={borrador.exoneracion114.topeSMMLV} alCambiar={(v) => poner('exoneracion114.topeSMMLV', v)} error={e('exoneracion114.topeSMMLV')} />
        </SeccionAjustes>

        <SeccionAjustes titulo="Personas por prestación de servicios" insignia={<InsigniaVerificar texto={VERIFICAR} />} descripcion="Para quienes cobran honorarios en lugar de salario." data-testid="nomina-prestacion">
          <CampoPct etiqueta="Retención en la fuente" valor={borrador.prestacionServicios.retencionFuente} alCambiar={(v) => poner('prestacionServicios.retencionFuente', v)} error={e('prestacionServicios.retencionFuente')} />
          <CampoPct etiqueta="Base de aportes sobre lo pactado" valor={borrador.prestacionServicios.ibcPorcentaje} alCambiar={(v) => poner('prestacionServicios.ibcPorcentaje', v)} error={e('prestacionServicios.ibcPorcentaje')} />
          <CampoPct etiqueta="Seguridad social del contratista" valor={borrador.prestacionServicios.seguridadSocialContratista} alCambiar={(v) => poner('prestacionServicios.seguridadSocialContratista', v)} error={e('prestacionServicios.seguridadSocialContratista')} />
        </SeccionAjustes>

        <SeccionAjustes titulo="Incapacidades y alertas" insignia={<InsigniaVerificar texto={VERIFICAR} />} descripcion="Cuánto se paga en una incapacidad y cuándo avisarte de un posible contrato mal planteado." columnas={4}>
          <CampoPct etiqueta="Pago en incapacidad" valor={borrador.incapacidad.porcentajePago} alCambiar={(v) => poner('incapacidad.porcentajePago', v)} error={e('incapacidad.porcentajePago')} />
          <CampoNumero etiqueta="Días a cargo del negocio" sufijo="días" valor={borrador.incapacidad.diasACargoEmpleador} alCambiar={(v) => poner('incapacidad.diasACargoEmpleador', v)} error={e('incapacidad.diasACargoEmpleador')} />
          <CampoNumero etiqueta="Semanas que se revisan" valor={borrador.riesgoContratoRealidad.semanasRevisadas} alCambiar={(v) => poner('riesgoContratoRealidad.semanasRevisadas', v)} error={e('riesgoContratoRealidad.semanasRevisadas')} />
          <CampoNumero etiqueta="Turnos por semana para alertar" valor={borrador.riesgoContratoRealidad.minimoTurnosPorSemana} alCambiar={(v) => poner('riesgoContratoRealidad.minimoTurnosPorSemana', v)} error={e('riesgoContratoRealidad.minimoTurnosPorSemana')} />
        </SeccionAjustes>

        <BarraGuardar
          nCambios={nCambios}
          alGuardar={alGuardar}
          alDescartar={descartar}
          alEjemplo={() => reemplazar(structuredClone(PARAMETROS_NOMINA))}
          etiquetaGuardar={TEXTOS.nomina.guardar}
          error={general}
          data-testid="nomina-barra"
        />
      </div>
    </MarcoConfiguracion>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Vista previa en vivo
// ---------------------------------------------------------------------------------------------------------
function VistaPreviaNomina({ guardados, borrador, hoy }: { guardados: ParametrosNomina; borrador: ParametrosNomina; hoy: string }) {
  const [salarioPropio, setSalarioPropio] = useState<number | null>(null);
  const [exoneracion, setExoneracion] = useState(true);
  const salario = salarioPropio ?? borrador.smmlv;
  const antes = useMemo(() => ejemploNomina(guardados, salario, exoneracion, hoy), [guardados, salario, exoneracion, hoy]);
  const ahora = useMemo(() => ejemploNomina(borrador, salario, exoneracion, hoy), [borrador, salario, exoneracion, hoy]);
  const cambia = antes.costo !== ahora.costo || antes.valorHora !== ahora.valorHora || antes.neto !== ahora.neto;

  const filas: { id: string; etiqueta: string; v: (x: EjemploNomina) => number; fuerte?: boolean }[] = [
    { id: 'salario', etiqueta: 'Salario', v: (x) => x.salario },
    { id: 'auxilio', etiqueta: 'Auxilio de transporte', v: (x) => x.auxilio },
    { id: 'neto', etiqueta: 'Lo que recibe la persona', v: (x) => x.neto },
    { id: 'aportes', etiqueta: 'Aportes del negocio', v: (x) => x.aportes },
    { id: 'provisiones', etiqueta: 'Lo que se aparta (prima, cesantías, vacaciones)', v: (x) => x.provisiones },
    { id: 'costo', etiqueta: 'Cuánto le cuesta al negocio', v: (x) => x.costo, fuerte: true },
  ];

  return (
    <section className="border border-ink bg-surface p-6" aria-label="Vista previa" data-testid="nomina-vista-previa">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="t-h3 text-ink">Así se ve con tus valores</h2>
          <p className="mt-1 max-w-[72ch] t-small text-muted">Un empleado con sueldo fijo todo el mes. Cambia cualquier valor de abajo y esta tabla se recalcula al instante, sin guardar.</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <InputNumero className="w-[200px]" etiqueta="Salario de ejemplo" prefijo="$" valor={salario} alCambiar={setSalarioPropio} data-testid="nomina-salario-ejemplo" />
          <Switch etiqueta="Con exoneración" activo={exoneracion} alCambiar={setExoneracion} />
        </div>
      </div>
      <table className="mt-5 w-full t-body">
        <thead>
          <tr className="border-b border-ink text-left t-eyebrow text-ink-2">
            <th className="py-2 pr-4 font-semibold">Concepto</th>
            <th className="px-4 py-2 text-right font-semibold">Con lo guardado</th>
            <th className="py-2 pl-4 text-right font-semibold">Con tus cambios</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const a = f.v(antes);
            const b = f.v(ahora);
            return (
              <tr key={f.id} className="border-b border-line-soft">
                <td className={f.fuerte ? 'py-2.5 pr-4 font-bold text-ink' : 'py-2.5 pr-4 text-ink-2'}>{f.etiqueta}</td>
                <td className="num px-4 py-2.5 text-right text-ink-2">
                  <Dinero valor={a} />
                </td>
                <td className={`num py-2.5 pl-4 text-right ${f.fuerte ? 'font-bold' : ''} ${a !== b ? 'text-ink' : 'text-ink-2'}`} data-testid={`nomina-prev-${f.id}`}>
                  <Dinero valor={b} />
                  {a !== b && <span className="ml-2 t-small font-normal text-muted">{b > a ? '▲' : '▼'} {porcentaje(Math.abs(b / (a || 1) - 1))}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 t-small text-muted" data-testid="nomina-prev-hora">
        Cada hora vale <Dinero valor={ahora.valorHora} /> (el salario ÷ {entero(ahora.divisor)} horas al mes).
        {cambia ? ' Tienes cambios sin guardar: la nómina real sigue usando lo guardado hasta que guardes.' : ''}
      </p>
    </section>
  );
}
