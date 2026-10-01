import { useState } from 'react';
import { Dinero, InputNumero, NotaLegal, Switch } from '@/ui';
import type { ParametrosAduanas } from '@/dominio/tipos';
import { ETIQUETAS_ESTADO_IMPORTACION, FASES_IMPORTACION, PARAMETROS_ADUANAS } from '@/config/aduanas';
import { TEXTOS_FIJOS } from '@/config/textos/notas';
import { useHoy, useSel } from '@/estado';
import { entero, plural } from '@/lib/formato';
import { pedidoEjemplo, pesos, tasaVigenteDe } from '../calculos';
import { BarraGuardar, CampoCop, CampoNumero, CampoPct, SeccionAjustes } from '../componentes/Campos';
import { InsigniaVerificar, MarcoConfiguracion } from '../componentes/Marco';
import { useBorrador, useGuardarParametros } from '../hooks';
import { selCostosTipicos, selParametros, selTasas } from '../selectores';
import { TEXTOS } from '../textos';

const EJEMPLO = TEXTOS_FIJOS.valorEjemploAduanas;

export default function Aduanas() {
  const guardados = useSel(selParametros).aduanas;
  const { borrador, cambios, nCambios, poner, descartar, reemplazar } = useBorrador<ParametrosAduanas>(guardados);
  const { guardar, errores, general } = useGuardarParametros('aduanas');
  const e = (ruta: string) => errores[`aduanas.${ruta}`];

  const diasTotales = Object.entries(borrador.diasEstimadosEntreEstados).reduce((s, [, d]) => s + d, 0);

  return (
    <MarcoConfiguracion seccion="aduanas" titulo="Aduanas" subtitulo={TEXTOS.aduanas.subtitulo}>
      <div className="flex flex-col gap-6">
        <NotaLegal tipo="aduanero" />
        <SimuladorPedido guardados={guardados} borrador={borrador} />

        <SeccionAjustes
          titulo="Tributos de importación"
          insignia={<InsigniaVerificar texto={EJEMPLO} />}
          descripcion={TEXTOS.aduanas.nota}
          columnas={3}
          data-testid="aduanas-tributos"
        >
          <CampoPct etiqueta="Arancel" valor={borrador.arancelPct} alCambiar={(v) => poner('arancelPct', v)} error={e('arancelPct')} ayuda="Sobre el valor de la mercancía puesta en el puerto." data-testid="aduanas-arancel" />
          <CampoCop etiqueta="Otros tributos por prenda" valor={borrador.otrosTributosPorUnidad} alCambiar={(v) => poner('otrosTributosPorUnidad', v)} error={e('otrosTributosPorUnidad')} ayuda="Un valor fijo por unidad que algunos productos pagan además del arancel. Empieza en cero." data-testid="aduanas-otros" />
          <CampoPct etiqueta="IVA de importación" valor={borrador.ivaImportacionPct} alCambiar={(v) => poner('ivaImportacionPct', v)} error={e('ivaImportacionPct')} data-testid="aduanas-iva" />
          <CampoPct etiqueta="Seguro de la carga" valor={borrador.seguroPctSobreFOB} decimales={2} alCambiar={(v) => poner('seguroPctSobreFOB', v)} error={e('seguroPctSobreFOB')} ayuda="Sobre lo que cuesta la mercancía en la fábrica." />
          <div className="flex items-start pt-6 sm:col-span-2">
            <Switch
              etiqueta="El IVA de importación suma al costo"
              activo={borrador.ivaImportacionSumaAlCosto}
              alCambiar={(v) => poner('ivaImportacionSumaAlCosto', v)}
              valorTexto={borrador.ivaImportacionSumaAlCosto ? 'Encarece cada prenda' : 'Se descuenta: no encarece la prenda'}
            />
          </div>
        </SeccionAjustes>

        <SeccionAjustes
          titulo="Días entre un estado y el siguiente"
          insignia={<InsigniaVerificar texto={EJEMPLO} />}
          descripcion={`Con estos tiempos se estima cuándo llega cada pedido. En total, ${plural(diasTotales, 'día')} de la cotización a la bodega.`}
          columnas={4}
          data-testid="aduanas-dias"
        >
          {FASES_IMPORTACION.map((fase) => (
            <div key={fase.id} className="contents">
              <p className="t-eyebrow text-ink-2 sm:col-span-2 lg:col-span-4">{fase.nombre}</p>
              {fase.estados
                .filter((estado) => estado !== 'cotizado')
                .map((estado) => (
                  <CampoNumero
                    key={estado}
                    etiqueta={ETIQUETAS_ESTADO_IMPORTACION[estado]}
                    sufijo="días"
                    valor={borrador.diasEstimadosEntreEstados[estado]}
                    alCambiar={(v) => poner(`diasEstimadosEntreEstados.${estado}`, v)}
                    error={e(`diasEstimadosEntreEstados.${estado}`)}
                  />
                ))}
            </div>
          ))}
        </SeccionAjustes>

        <BarraGuardar
          nCambios={nCambios}
          alGuardar={() => guardar(cambios, 'Parámetros de aduanas guardados') && descartar()}
          alDescartar={descartar}
          alEjemplo={() => reemplazar(structuredClone(PARAMETROS_ADUANAS))}
          error={general}
          data-testid="aduanas-barra"
        />
      </div>
    </MarcoConfiguracion>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Simulador: cuánto cuesta traer un pedido de ejemplo
// ---------------------------------------------------------------------------------------------------------
function SimuladorPedido({ guardados, borrador }: { guardados: ParametrosAduanas; borrador: ParametrosAduanas }) {
  const hoy = useHoy();
  const tasas = useSel(selTasas);
  const tipicos = useSel(selCostosTipicos);
  const tasaUsd = tasaVigenteDe(tasas, 'USD', hoy)?.valor ?? 4000;

  const [unidades, setUnidades] = useState<number | null>(null);
  const [fob, setFob] = useState<number | null>(18);
  const [flete, setFlete] = useState<number | null>(1_200);
  const [honorarios, setHonorarios] = useState<number | null>(null);
  const [bodegaje, setBodegaje] = useState<number | null>(null);
  const [transporte, setTransporte] = useState<number | null>(null);

  const entrada = {
    unidades: unidades ?? (tipicos.unidades || 500),
    fobUnitarioUsd: fob ?? 0,
    fleteUsd: flete ?? 0,
    honorarios: honorarios ?? (tipicos.honorarios || 1_800_000),
    bodegaje: bodegaje ?? (tipicos.bodegaje || 600_000),
    transporte: transporte ?? (tipicos.transporte || 450_000),
    tasaUsd,
  };
  const antes = pedidoEjemplo(guardados, entrada);
  const ahora = pedidoEjemplo(borrador, entrada);

  const porPrenda = (total: number) => (entrada.unidades > 0 ? Math.round(total / entrada.unidades) : 0);
  const pasos = ahora.cascada.filter((p) => p.valor !== 0 || ['arancel', 'otros_tributos', 'iva_importacion'].includes(p.concepto));

  return (
    <section className="border border-ink bg-surface p-6" aria-label="Pedido de ejemplo" data-testid="aduanas-simulador">
      <h2 className="t-h3 text-ink">¿Cuánto cuesta traer un pedido?</h2>
      <p className="mt-1 max-w-[72ch] t-small text-muted">
        Un pedido de ejemplo con los valores de abajo. Cambia el arancel, el IVA o el seguro y mira cómo se mueve el costo, sin guardar.
        {tipicos.pedidos > 0 && ` Los honorarios y gastos de puerto vienen del promedio de tus ${plural(tipicos.pedidos, 'pedido')}.`}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-3">
        <InputNumero etiqueta="Prendas del pedido" sufijo="unid." valor={entrada.unidades} alCambiar={setUnidades} data-testid="aduanas-sim-unidades" />
        <InputNumero etiqueta="Precio en fábrica por prenda" prefijo="US$" decimales={2} valor={fob} alCambiar={setFob} />
        <InputNumero etiqueta="Flete marítimo" prefijo="US$" valor={flete} alCambiar={setFlete} />
        <InputNumero etiqueta="Honorarios del agente de aduanas" prefijo="$" valor={entrada.honorarios} alCambiar={setHonorarios} ayuda="Honorario de ejemplo." />
        <InputNumero etiqueta="Bodegaje en el puerto" prefijo="$" valor={entrada.bodegaje} alCambiar={setBodegaje} />
        <InputNumero etiqueta="Transporte hasta Bogotá" prefijo="$" valor={entrada.transporte} alCambiar={setTransporte} />
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
          {pasos.map((p) => {
            const previo = antes.cascada.find((x) => x.concepto === p.concepto)?.valor ?? 0;
            return (
              <tr key={p.concepto} className="border-b border-line-soft">
                <td className="py-2 pr-4 text-ink-2">{p.etiqueta}</td>
                <td className="num px-4 py-2 text-right text-ink-2">
                  <Dinero valor={previo} />
                </td>
                <td className={previo !== p.valor ? 'num py-2 pl-4 text-right font-semibold text-ink' : 'num py-2 pl-4 text-right text-ink-2'} data-testid={`aduanas-sim-${p.concepto}`}>
                  <Dinero valor={p.valor} />
                </td>
              </tr>
            );
          })}
          <tr className="border-b border-line-soft">
            <td className="py-2.5 pr-4 font-bold text-ink">Costo total del pedido</td>
            <td className="num px-4 py-2.5 text-right text-ink-2">
              <Dinero valor={antes.total} />
            </td>
            <td className="num py-2.5 pl-4 text-right font-bold" data-testid="aduanas-sim-total">
              <Dinero valor={ahora.total} />
            </td>
          </tr>
          <tr>
            <td className="py-2.5 pr-4 font-bold text-ink">Cada prenda llega a costar</td>
            <td className="num px-4 py-2.5 text-right text-ink-2">
              <Dinero valor={porPrenda(antes.total)} />
            </td>
            <td className="num py-2.5 pl-4 text-right font-bold" data-testid="aduanas-sim-prenda">
              <Dinero valor={porPrenda(ahora.total)} />
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 t-small text-muted">
        Con el dólar a {pesos(tasaUsd)}. El costo de las {entero(entrada.unidades)} prendas incluye fábrica, flete, seguro, tributos y los gastos de llegada a la bodega.
      </p>
    </section>
  );
}
