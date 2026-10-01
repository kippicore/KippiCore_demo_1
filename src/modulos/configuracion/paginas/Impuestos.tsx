import { Dinero, NotaLegal, Select, Switch } from '@/ui';
import type { Parametros } from '@/dominio/tipos';
import { baseSinIva } from '@/dominio/reglas/ventas';
import { PARAMETROS_DATAFONO, PARAMETROS_IMPUESTOS } from '@/config/negocio';
import { PARAMETROS_OBLIGACIONES } from '@/config/obligaciones';
import { useSel } from '@/estado';
import { BarraGuardar, CampoDiaMes, CampoNumero, CampoPct, SeccionAjustes } from '../componentes/Campos';
import { InsigniaVerificar, MarcoConfiguracion } from '../componentes/Marco';
import { useBorrador, useGuardarParametros } from '../hooks';
import { selParametros } from '../selectores';
import { TEXTOS } from '../textos';

type Forma = Pick<Parametros, 'impuestos' | 'obligaciones' | 'datafono'>;
const forma = (p: Parametros): Forma => ({ impuestos: p.impuestos, obligaciones: p.obligaciones, datafono: p.datafono });
const ILUSTRATIVO = 'Valor ilustrativo · se valida con tu contador';

export default function Impuestos() {
  const guardados = forma(useSel(selParametros));
  const { borrador, cambios, nCambios, poner, descartar, reemplazar } = useBorrador<Forma>(guardados);
  const impuestos = useGuardarParametros('impuestos');
  const obligaciones = useGuardarParametros('obligaciones');
  const datafono = useGuardarParametros('datafono');
  const c = cambios as Partial<Record<keyof Forma, unknown>> | null;

  const alGuardar = () => {
    const a = impuestos.guardar(c?.impuestos ?? null, 'Impuestos guardados');
    const b = obligaciones.guardar(c?.obligaciones ?? null, 'Fechas guardadas');
    const d = datafono.guardar(c?.datafono ?? null, 'Datáfono guardado');
    if (a && b && d) descartar();
  };

  const i = borrador.impuestos;
  const precioEjemplo = 189_900;
  const base = baseSinIva(precioEjemplo, i.ivaGeneral);

  return (
    <MarcoConfiguracion seccion="impuestos" titulo="Impuestos y obligaciones" subtitulo={TEXTOS.impuestos.subtitulo}>
      <div className="flex flex-col gap-6">
        <NotaLegal tipo="tributario" />

        <SeccionAjustes
          titulo="IVA y retenciones"
          insignia={<InsigniaVerificar texto={ILUSTRATIVO} />}
          descripcion="Con estos porcentajes el sistema separa el IVA de cada venta y calcula las retenciones de las compras y los honorarios."
          data-testid="impuestos-iva"
        >
          <CampoPct etiqueta="IVA general" valor={i.ivaGeneral} alCambiar={(v) => poner('impuestos.ivaGeneral', v)} error={impuestos.errores['impuestos.ivaGeneral']} data-testid="impuestos-iva-general" />
          <CampoPct etiqueta="Retención en honorarios" valor={i.retencionHonorarios} alCambiar={(v) => poner('impuestos.retencionHonorarios', v)} error={impuestos.errores['impuestos.retencionHonorarios']} />
          <CampoPct etiqueta="Retención en compras" valor={i.retencionCompras} alCambiar={(v) => poner('impuestos.retencionCompras', v)} error={impuestos.errores['impuestos.retencionCompras']} />
          <CampoNumero etiqueta="Industria y comercio (por cada mil pesos)" decimales={2} valor={i.icaTarifaPorMil} alCambiar={(v) => poner('impuestos.icaTarifaPorMil', v)} error={impuestos.errores['impuestos.icaTarifaPorMil']} />
          <Select
            etiqueta="IVA se declara"
            valor={i.periodicidadIva}
            alCambiar={(v) => poner('impuestos.periodicidadIva', v)}
            opciones={[
              { valor: 'bimestral', etiqueta: 'Cada dos meses' },
              { valor: 'cuatrimestral', etiqueta: 'Cada cuatro meses' },
            ]}
          />
          <Select
            etiqueta="Industria y comercio se declara"
            valor={i.periodicidadIca}
            alCambiar={(v) => poner('impuestos.periodicidadIca', v)}
            opciones={[
              { valor: 'bimestral', etiqueta: 'Cada dos meses' },
              { valor: 'anual', etiqueta: 'Una vez al año' },
            ]}
          />
          <div className="sm:col-span-2 lg:col-span-3">
            <Switch
              etiqueta="El IVA de los gastos se descuenta"
              activo={i.ivaGastosDescontable}
              alCambiar={(v) => poner('impuestos.ivaGastosDescontable', v)}
              valorTexto={i.ivaGastosDescontable ? 'El estado de resultados usa los gastos sin IVA' : 'El IVA suma al gasto'}
            />
          </div>
          <p className="t-small text-ink-2 sm:col-span-2 lg:col-span-3" data-testid="impuestos-ejemplo-iva">
            Ejemplo: una camisa de <Dinero valor={precioEjemplo} /> con IVA incluido tiene una base de <Dinero valor={base} /> y <Dinero valor={precioEjemplo - base} /> de IVA.
          </p>
        </SeccionAjustes>

        <SeccionAjustes
          titulo="Pagos con tarjeta (datáfono)"
          insignia={<InsigniaVerificar texto={ILUSTRATIVO} />}
          descripcion="Lo que cobra el banco y lo que retiene antes de abonarte la plata."
          columnas={3}
          data-testid="impuestos-datafono"
        >
          <CampoPct etiqueta="Comisión tarjeta débito" valor={borrador.datafono.comisionDebito} alCambiar={(v) => poner('datafono.comisionDebito', v)} error={datafono.errores['datafono.comisionDebito']} />
          <CampoPct etiqueta="Comisión tarjeta crédito" valor={borrador.datafono.comisionCredito} alCambiar={(v) => poner('datafono.comisionCredito', v)} error={datafono.errores['datafono.comisionCredito']} />
          <CampoPct etiqueta="Crédito con financiera aliada" valor={borrador.datafono.comisionFinanciera} alCambiar={(v) => poner('datafono.comisionFinanciera', v)} error={datafono.errores['datafono.comisionFinanciera']} />
          <CampoPct etiqueta="Retención en la fuente" valor={borrador.datafono.retenciones.fuente} decimales={3} alCambiar={(v) => poner('datafono.retenciones.fuente', v)} error={datafono.errores['datafono.retenciones.fuente']} />
          <CampoPct etiqueta="Retención de IVA" valor={borrador.datafono.retenciones.iva} decimales={3} alCambiar={(v) => poner('datafono.retenciones.iva', v)} error={datafono.errores['datafono.retenciones.iva']} />
          <CampoPct etiqueta="Retención de industria y comercio" valor={borrador.datafono.retenciones.ica} decimales={3} alCambiar={(v) => poner('datafono.retenciones.ica', v)} error={datafono.errores['datafono.retenciones.ica']} />
          <CampoNumero etiqueta="Días hábiles para el abono" sufijo="días" valor={borrador.datafono.diasAbono} alCambiar={(v) => poner('datafono.diasAbono', v)} error={datafono.errores['datafono.diasAbono']} />
        </SeccionAjustes>

        <SeccionAjustes
          titulo="Fechas de lo que hay que pagar"
          insignia={<InsigniaVerificar texto={ILUSTRATIVO} />}
          descripcion="El calendario y el flujo de caja usan estas fechas para avisarte qué viene y cuánto."
          columnas={3}
          data-testid="impuestos-fechas"
        >
          <CampoNumero etiqueta="Seguridad social: día hábil del mes" sufijo="día" valor={borrador.obligaciones.pilaDiaHabil} alCambiar={(v) => poner('obligaciones.pilaDiaHabil', v)} error={obligaciones.errores['obligaciones.pilaDiaHabil']} />
          <CampoDiaMes etiqueta="Prima de mitad de año" valor={borrador.obligaciones.primaFechas[0]} alCambiar={(v) => poner('obligaciones.primaFechas', [v, borrador.obligaciones.primaFechas[1]])} />
          <CampoDiaMes etiqueta="Prima de fin de año" valor={borrador.obligaciones.primaFechas[1]} alCambiar={(v) => poner('obligaciones.primaFechas', [borrador.obligaciones.primaFechas[0], v])} />
          <CampoDiaMes etiqueta="Consignación de cesantías" valor={borrador.obligaciones.cesantiasFecha} alCambiar={(v) => poner('obligaciones.cesantiasFecha', v)} />
          <CampoDiaMes etiqueta="Intereses de cesantías" valor={borrador.obligaciones.interesesCesantiasFecha} alCambiar={(v) => poner('obligaciones.interesesCesantiasFecha', v)} />
          <span aria-hidden className="hidden lg:block" />
          <CampoNumero etiqueta="IVA: día de vencimiento" sufijo="día" valor={borrador.obligaciones.ivaVencimientoDia} alCambiar={(v) => poner('obligaciones.ivaVencimientoDia', v)} error={obligaciones.errores['obligaciones.ivaVencimientoDia']} ayuda="Del mes que sigue al periodo." />
          <CampoNumero etiqueta="Retención: día de vencimiento" sufijo="día" valor={borrador.obligaciones.retencionVencimientoDia} alCambiar={(v) => poner('obligaciones.retencionVencimientoDia', v)} error={obligaciones.errores['obligaciones.retencionVencimientoDia']} />
          <CampoNumero etiqueta="Industria y comercio: día de vencimiento" sufijo="día" valor={borrador.obligaciones.icaVencimientoDia} alCambiar={(v) => poner('obligaciones.icaVencimientoDia', v)} error={obligaciones.errores['obligaciones.icaVencimientoDia']} />
        </SeccionAjustes>

        <BarraGuardar
          nCambios={nCambios}
          alGuardar={alGuardar}
          alDescartar={descartar}
          alEjemplo={() => reemplazar(structuredClone({ impuestos: PARAMETROS_IMPUESTOS, obligaciones: PARAMETROS_OBLIGACIONES, datafono: PARAMETROS_DATAFONO }))}
          error={impuestos.general ?? obligaciones.general ?? datafono.general}
          data-testid="impuestos-barra"
        />
      </div>
    </MarcoConfiguracion>
  );
}
