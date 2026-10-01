import { ArrowRight } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { porcentaje } from '@/lib/formato';
import { BotonEnlace } from '@/ui';
import type { Hallazgos } from '../calculos';
import type { FilaComparativo } from '../selectores';
import { InsigniaDefectos, InsigniaRetraso } from './Piezas';

/**
 * El momento de la pantalla: qué fábrica llega tarde y con más defectos, dicho en una frase y con las cifras de la
 * protagonista frente a la mejor fábrica. Todo sale de las entregas reales (selectores), nada está escrito a mano.
 */
export function HallazgoFabrica({ hallazgos, filas }: { hallazgos: Hallazgos<FilaComparativo>; filas: readonly FilaComparativo[] }) {
  const protagonista = hallazgos.masTarde ?? hallazgos.masDefectos;
  const contraste = hallazgos.menosDefectos && hallazgos.menosDefectos.proveedorId !== protagonista?.proveedorId ? hallazgos.menosDefectos : hallazgos.masPuntual;
  const comparadas = [protagonista, contraste && contraste.proveedorId !== protagonista?.proveedorId ? contraste : null].filter((f): f is FilaComparativo => !!f);
  const hayDatos = filas.some((f) => f.pedidosRecibidos > 0);

  return (
    <section
      data-testid="comparativo-hallazgo"
      aria-labelledby="hallazgo-titular"
      className="grid grid-cols-1 gap-8 border border-line border-l-2 border-l-accent bg-surface p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-end"
    >
      <div className="min-w-0">
        <p className="t-eyebrow text-accent-ink">Lo que dicen tus entregas</p>
        <h2 id="hallazgo-titular" className="mt-2 max-w-[36ch] t-h1 text-ink" data-testid="hallazgo-titular">
          {hallazgos.titular}
        </h2>
        {hallazgos.apoyo.map((frase) => (
          <p key={frase} className="mt-2 max-w-[64ch] t-body text-muted">
            {frase}
          </p>
        ))}
        {protagonista && (
          <div className="mt-5">
            <BotonEnlace to={rutas.proveedor(protagonista.proveedorId)} variante="secondary" iconoDerecha={ArrowRight} data-testid="hallazgo-ver-ficha">
              Ver ficha de {protagonista.nombre}
            </BotonEnlace>
          </div>
        )}
      </div>

      {hayDatos && comparadas.length > 0 && (
        <table className="w-full min-w-0" data-testid="hallazgo-contraste">
          <caption className="sr-only">La fábrica del hallazgo frente a la de mejor desempeño</caption>
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="pb-2 text-left t-eyebrow text-ink-2">
                Fábrica
              </th>
              <th scope="col" className="pb-2 text-right t-eyebrow text-ink-2">
                A tiempo
              </th>
              <th scope="col" className="pb-2 text-right t-eyebrow text-ink-2">
                Retraso
              </th>
              <th scope="col" className="pb-2 text-right t-eyebrow text-ink-2">
                Defectos
              </th>
            </tr>
          </thead>
          <tbody>
            {comparadas.map((f, i) => (
              <tr key={f.proveedorId} className="border-b border-line-soft">
                <th scope="row" className={i === 0 ? 'py-3 pr-3 text-left t-label font-bold text-ink' : 'py-3 pr-3 text-left t-label font-normal text-ink-2'}>
                  {f.nombre}
                </th>
                <td className="py-3 text-right t-body num">{f.aTiempo === null ? '—' : porcentaje(f.aTiempo, 0)}</td>
                <td className="py-3 text-right">
                  <InsigniaRetraso dias={f.retrasoPromedio} tamano="md" />
                </td>
                <td className="py-3 text-right">
                  <InsigniaDefectos fraccion={f.defectos} tamano="md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
