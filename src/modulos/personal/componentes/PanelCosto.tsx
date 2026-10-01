import { useEffect, useState } from 'react';
import { UserX } from 'lucide-react';
import { Dinero, EmptyState, Segmentado, Switch } from '@/ui';
import type { Contrato, Empleado, EsquemaComision } from '@/dominio/tipos';
import { emitirUI, useAhora, useHoy, useSel } from '@/estado';
import { numero } from '@/lib/formato';
import { selComparativoModalidades, type ModoCosto } from '@/selectores';
import { ahorroExoneracion, costoOculto, segmentosCosto, vecesDelContrato } from '../calculos';
import { selCostoFicha, selParametrosNomina } from '../selectores';
import { MODOS_COSTO, TEXTOS } from '../textos';
import { BarraCosto, LeyendaCosto } from './BarraCosto';
import { ComparativoLadoALado } from './ComparativoLadoALado';
import { DesgloseLaboral, DesglosePrestacionVista } from './Desglose';
import { NotaNomina } from './Piezas';

/**
 * "Lo que de verdad te cuesta un empleado" (W6): conmutador de dos modos ("Salario pactado" y "Este mes, con
 * comisiones y recargos"), barra apilada, interruptor de exoneración que cambia los aportes en vivo, desglose en cuatro
 * grupos y el comparativo con la prestación de servicios. Las cifras salen de `selCostoEmpleado`; aquí solo se muestran.
 */
export interface PropsPanelCosto {
  empleado: Empleado;
  contrato: Contrato | null;
  esquema: EsquemaComision | null;
  retirado: boolean;
}

export function PanelCosto({ empleado, contrato, esquema, retirado }: PropsPanelCosto) {
  const hoy = useHoy();
  const ahora = useAhora();
  const parametros = useSel(selParametrosNomina);
  const [modo, setModo] = useState<ModoCosto>('pactado');
  const [exoneracion, setExoneracion] = useState(true);

  // Evento de la guía: al montar la pestaña "costo" (CONTRATOS 10).
  useEffect(() => {
    emitirUI('costo_empleador_visto', { empleadoId: empleado.id });
  }, [empleado.id]);

  const r = useSel(selCostoFicha, { empleadoId: empleado.id, modo, exoneracion, hoy, ahora });
  const valorBase = contrato?.tipo === 'laboral' ? (contrato.salarioBase ?? 0) : (contrato?.honorarios ?? 0);
  const cmp = useSel(selComparativoModalidades, { valorMensual: Math.max(valorBase, 1), exoneracion, fecha: hoy, riesgoArl: contrato?.riesgoArl ?? 1 });
  const costo = r.costo;

  if (!contrato || !costo) {
    return (
      <div className="mt-8 border border-line bg-surface" data-testid="personal-costo-vacio">
        <EmptyState icono={UserX} titulo="Todavía no hay un costo para mostrar" texto={TEXTOS.costo.sinContrato} />
      </div>
    );
  }

  const laboral = costo.tipo === 'laboral';
  const segmentos = segmentosCosto(costo.barras, costo.tipo);
  const oculto = costoOculto(costo.barras);
  const veces = vecesDelContrato(costo.costo, valorBase);
  const ahorro = ahorroExoneracion(r.conExoneracion ?? 0, r.sinExoneracion ?? 0);
  const exoneracionDisponible = parametros.exoneracion114.activa && laboral;
  const insumos = costo.insumos;
  const horasExtra = insumos.horasExtraDiurnas + insumos.horasExtraNocturnas;

  return (
    <div className="mt-8 flex flex-col gap-10" data-testid="personal-panel-costo" data-modo={modo} data-exoneracion={exoneracion ? 'si' : 'no'}>
      {retirado && (
        <p className="border border-line bg-surface-2 px-4 py-3 t-body text-ink-2" data-testid="personal-costo-retirado">
          Esta persona ya está retirada: el costo que ves es el de su último contrato.
        </p>
      )}

      <section aria-label="Cómo calcular el costo" className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="mb-1.5 t-label text-ink">Qué quieres ver</p>
          <Segmentado
            etiqueta="Modo de cálculo del costo"
            valor={modo}
            alCambiar={setModo}
            opciones={[
              { valor: 'pactado', etiqueta: MODOS_COSTO.pactado.etiqueta, 'data-testid': 'personal-modo-pactado' },
              { valor: 'mes_actual', etiqueta: MODOS_COSTO.mes_actual.etiqueta, 'data-testid': 'personal-modo-mes' },
            ]}
            data-testid="personal-modos"
          />
          <p className="mt-2 max-w-[56ch] t-small text-muted">{modo === 'pactado' ? TEXTOS.costo.pactadoNota : TEXTOS.costo.mesActualNota}</p>
        </div>
        {laboral && (
          <div className="max-w-[48ch]" data-testid="personal-exoneracion">
            <Switch
              etiqueta={TEXTOS.costo.exoneracion}
              activo={exoneracion && exoneracionDisponible}
              alCambiar={setExoneracion}
              deshabilitado={!exoneracionDisponible}
              valorTexto={exoneracion && exoneracionDisponible ? 'Exonerado' : 'No exonerado'}
            />
            <p className="mt-1 t-small text-muted">{TEXTOS.costo.exoneracionAyuda}</p>
          </div>
        )}
      </section>

      <section aria-label="Resumen del costo" className="grid grid-cols-1 gap-6 desk:grid-cols-[1.75fr_1fr]">
        <div className="border border-line bg-surface p-8" data-testid="personal-costo" data-costo={costo.costo} data-neto={costo.neto} data-modo={modo}>
          <p className="t-eyebrow text-ink-2">{TEXTOS.costo.titulo}</p>
          <p className="mt-3 t-h2 text-ink">
            {laboral ? 'Un salario de ' : 'Honorarios de '}
            <Dinero valor={valorBase} data-testid="personal-valor-base" />
            {modo === 'mes_actual' ? (laboral ? ', con comisiones y recargos,' : ', con comisiones,') : ''} le cuesta al negocio
          </p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-3 t-kpi-xl text-ink">
            <Dinero valor={costo.costo} animar data-testid="personal-costo-total" />
            <span className="t-body text-muted">al mes</span>
          </p>
          <p className="mt-3 t-body text-ink-2">
            {laboral && veces !== null && oculto > 0 ? (
              <>
                Es <strong className="font-bold text-ink">{numero(veces, 2)} veces</strong> lo que dice el contrato: <Dinero valor={oculto} className="font-bold text-ink" /> que se pagan o se provisionan sin que aparezcan en el salario.
              </>
            ) : (
              TEXTOS.costo.prestacionResumen
            )}
          </p>
          <div className="mt-8">
            <BarraCosto segmentos={segmentos} />
          </div>
          <div className="mt-8 border-t border-line-soft pt-6">
            <LeyendaCosto segmentos={segmentos} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="border border-line bg-surface p-6" data-testid="personal-recibe">
            <p className="t-eyebrow text-ink-2">Lo que recibe la persona</p>
            <p className="mt-3 t-kpi text-ink">
              <Dinero valor={costo.neto} animar />
            </p>
            <p className="mt-1 t-small text-muted">
              {laboral
                ? `Neto a pagar: lo que gana menos lo que se le descuenta (salud ${numero(parametros.trabajador.salud * 100, 1)} % y pensión ${numero(parametros.trabajador.pension * 100, 1)} %).`
                : 'Neto a pagar: honorarios menos la retención en la fuente.'}
            </p>
            {laboral && costo.laboral && (
              <p className="mt-4 border-t border-line-soft pt-3 t-small text-ink-2">
                Valor de la hora ordinaria: <Dinero valor={costo.laboral.valorHora} className="font-semibold text-ink" />. Es la base de los recargos y las horas extra.
              </p>
            )}
          </div>

          {laboral && exoneracionDisponible && (
            <div className="border border-line bg-surface p-6" data-testid="personal-ahorro-exoneracion" data-ahorro={ahorro}>
              <p className="t-eyebrow text-ink-2">Exoneración de aportes</p>
              {ahorro > 0 ? (
                <p className="mt-3 t-body text-ink-2">
                  {TEXTOS.costo.ahorroExoneracion.split('{valor}')[0]}
                  <strong className="font-bold text-ink">
                    <Dinero valor={ahorro} />
                  </strong>
                  {TEXTOS.costo.ahorroExoneracion.split('{valor}')[1]}
                </p>
              ) : (
                <p className="mt-3 t-body text-ink-2">{TEXTOS.costo.sinAhorro}</p>
              )}
              <p className="mt-2 t-small text-muted">Valor ilustrativo · verificar</p>
            </div>
          )}

          {modo === 'mes_actual' && (
            <div className="border border-line bg-surface p-6" data-testid="personal-que-entra">
              <p className="t-eyebrow text-ink-2">Qué entra este mes</p>
              <ul className="mt-3 divide-y divide-line-soft">
                <li className="flex items-baseline justify-between gap-4 py-2">
                  <span className="t-body text-ink">
                    Comisión
                    {esquema && <span className="ml-2 t-small text-muted">{esquema.nombre}</span>}
                  </span>
                  <Dinero valor={costo.comisiones} className="t-body" />
                </li>
                {insumos.ventasComisionables > 0 && (
                  <li className="flex items-baseline justify-between gap-4 py-2">
                    <span className="t-small text-muted">Ventas del mes sin IVA, proyectadas</span>
                    <Dinero valor={insumos.ventasComisionables} corta className="t-small text-ink-2" />
                  </li>
                )}
                <li className="flex items-baseline justify-between gap-4 py-2">
                  <span className="t-body text-ink">Horas con recargo nocturno</span>
                  <span className="t-body num">{numero(insumos.horasRecargoNocturno, 1)} h</span>
                </li>
                <li className="flex items-baseline justify-between gap-4 py-2">
                  <span className="t-body text-ink">Horas en domingo o festivo</span>
                  <span className="t-body num">{numero(insumos.horasDominicalFestivo, 1)} h</span>
                </li>
                <li className="flex items-baseline justify-between gap-4 py-2">
                  <span className="t-body text-ink">Horas extra</span>
                  <span className="t-body num">{numero(horasExtra, 1)} h</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </section>

      <section aria-label="Desglose del costo" className="flex flex-col gap-4">
        <div>
          <h2 className="t-h2 text-ink">Cómo se arma esa cifra</h2>
          <p className="mt-1 max-w-[72ch] t-body text-muted">{TEXTOS.lista.notaCosto}</p>
        </div>
        {laboral && costo.laboral ? (
          <DesgloseLaboral linea={{ laboral: costo.laboral.desglose }} parametros={parametros} animar />
        ) : (
          costo.prestacion && <DesglosePrestacionVista linea={{ prestacion: costo.prestacion.desglose, netoAPagar: costo.neto }} />
        )}
      </section>

      <section aria-label="Comparativo de modalidades" className="flex flex-col gap-4">
        <div>
          <h2 className="t-h2 text-ink">{laboral ? '¿Y si fuera por prestación de servicios?' : '¿Y si tuviera contrato laboral?'}</h2>
          <p className="mt-1 max-w-[72ch] t-body text-muted">El mismo valor mensual en las dos modalidades, con lo que le queda a la persona.</p>
        </div>
        <ComparativoLadoALado cmp={cmp} sujeto={`el cargo de ${empleado.nombres}`} sinNota />
      </section>

      {/* La nota legal acompaña a todo cálculo; el comparativo ya trae la suya, esta cubre el resto de la pestaña. */}
      <NotaNomina />
    </div>
  );
}
