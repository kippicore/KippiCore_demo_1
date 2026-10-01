import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Badge, Button, InputNumero, SelectorFecha, avisar } from '@/ui';
import type { FechaISO, MonedaExtranjera, TasaCambio } from '@/dominio/tipos';
import { MONEDAS } from '@/config/monedas';
import { useAcciones, useHoy, useSel } from '@/estado';
import { cifraCorta, dinero, fecha as fechaTexto } from '@/lib/formato';
import { mesALaFecha } from '@/lib/fechas';
import { cifraCortaEn } from '@/lib/moneda';
import { selResumenVentas, selSaldosCuentas, selValorizacion } from '@/selectores';
import { aMonedaExtranjera, pesos, tasaVigenteDe, validarTasa, type ErroresTasa } from '../calculos';
import { TEXTOS } from '../textos';

const NOMBRE: Record<MonedaExtranjera, { unidad: string; plural: string }> = {
  USD: { unidad: 'dólar', plural: 'dólares' },
  CNY: { unidad: 'yuan', plural: 'yuanes' },
};

/** Etiqueta de origen de una tasa: la de ejemplo (precargada) o la que puso la persona. */
export function InsigniaOrigenTasa({ tasa }: { tasa: Pick<TasaCambio, 'fuente'> }) {
  return tasa.fuente === 'ejemplo' ? (
    <span data-testid="tasa-ejemplo">
      <Badge tono="outline" tamano="sm">
        {TEXTOS.monedas.etiquetaEjemplo}
      </Badge>
    </span>
  ) : (
    <span data-testid="tasa-propia">
      <Badge tono="accent" tamano="sm">
        {TEXTOS.monedas.etiquetaPropia}
      </Badge>
    </span>
  );
}

/**
 * Tarjeta de una moneda: la tasa que usa el sistema hoy, un campo para cambiarla con su fecha y, en vivo, lo que
 * valdrían tus cifras principales con la tasa que escribes.
 */
export function TarjetaTasa({ moneda, tasas }: { moneda: MonedaExtranjera; tasas: readonly TasaCambio[] }) {
  const acciones = useAcciones();
  const hoy = useHoy();
  const vigente = tasaVigenteDe(tasas, moneda, hoy);
  const m = MONEDAS[moneda];

  const [valor, setValor] = useState<number | null>(vigente?.valor ?? null);
  const [fecha, setFecha] = useState<FechaISO | null>(hoy);
  const [errores, setErrores] = useState<ErroresTasa>({});
  const [general, setGeneral] = useState<string | null>(null);

  const ventas = useSel(selResumenVentas, { ...mesALaFecha(hoy), localId: 'todos' });
  const inventario = useSel(selValorizacion, { localId: 'todos' });
  const cuentas = useSel(selSaldosCuentas);
  const cifras = [
    { id: 'ventas', etiqueta: 'Ventas del mes', cop: ventas.netas },
    { id: 'inventario', etiqueta: 'Inventario a costo', cop: inventario.total.aCosto },
    { id: 'cuentas', etiqueta: 'Dinero en cuentas', cop: cuentas.total },
  ];

  const tasaActual = vigente?.valor ?? null;
  const cambio = valor !== null && valor > 0 && valor !== tasaActual;
  const existente = fecha ? tasas.find((t) => t.moneda === moneda && t.fecha === fecha) : undefined;

  const guardar = () => {
    setGeneral(null);
    const e = validarTasa(valor, fecha, hoy);
    setErrores(e);
    if (Object.keys(e).length > 0 || valor === null || !fecha) return;
    const r = existente
      ? acciones.editarTasa({ tasaId: existente.id, valor, fecha })
      : acciones.registrarTasa({ moneda, fecha, valor });
    if (!r.ok) {
      if (r.error.campo === 'valor' || r.error.campo === 'fecha') setErrores({ [r.error.campo]: r.error.mensaje });
      else setGeneral(r.error.mensaje);
      return;
    }
    const rige = !vigente || fecha >= vigente.fecha;
    avisar({
      tipo: 'exito',
      texto: `Tasa de ${NOMBRE[moneda].plural} guardada`,
      detalle: rige
        ? `${m.simbolo} 1 = ${pesos(valor)}. Todas las cifras en ${NOMBRE[moneda].plural} ya cambiaron.`
        : `Quedó registrada para el ${fechaTexto(fecha)}. La tasa de hoy sigue en ${pesos(tasaActual ?? 0)}.`,
    });
  };

  return (
    <section className="border border-line bg-surface p-6" data-testid={`tasa-tarjeta-${moneda}`} aria-label={`Tasa del ${NOMBRE[moneda].unidad}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-eyebrow text-ink-2">
            {m.nombre} · COP/{moneda}
          </p>
          <p className="mt-2 t-kpi num text-ink" data-testid={`tasa-vigente-${moneda}`}>
            {m.simbolo}&nbsp;1 = {vigente ? pesos(vigente.valor) : '—'}
          </p>
          <p className="mt-1 t-small text-muted">{vigente ? `Vigente desde el ${fechaTexto(vigente.fecha)}` : 'Todavía no hay una tasa registrada'}</p>
        </div>
        {vigente && <InsigniaOrigenTasa tasa={vigente} />}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
        <InputNumero
          etiqueta={`Pesos por 1 ${m.simbolo}`}
          prefijo="$"
          decimales={2}
          valor={valor}
          alCambiar={(v) => {
            setValor(v);
            if (errores.valor) setErrores((e) => ({ ...e, valor: undefined }));
          }}
          error={errores.valor}
          data-testid={`tasa-valor-${moneda}`}
        />
        <SelectorFecha
          etiqueta="Tasa del día"
          hoy={hoy}
          hasta={hoy}
          valor={fecha}
          alCambiar={(f) => {
            setFecha(f);
            if (errores.fecha) setErrores((e) => ({ ...e, fecha: undefined }));
          }}
          error={errores.fecha}
        />
      </div>
      <p className="mt-3 t-small text-muted" aria-live="polite">
        {valor !== null && valor > 0 ? (
          <>
            {pesos(1_000_000)} = <strong className="font-bold text-ink">{dinero(aMonedaExtranjera(1_000_000, valor) ?? 0, moneda)}</strong>
          </>
        ) : (
          'Escribe la tasa para ver la conversión.'
        )}
      </p>

      <div className="mt-6 border-t border-line-soft pt-4">
        <p className="t-label text-ink">Lo que valen tus cifras</p>
        <table className="mt-2 w-full t-small" data-testid={`tasa-efecto-${moneda}`}>
          <thead>
            <tr className="text-left text-ink-2">
              <th className="py-1.5 pr-2 font-semibold">Cifra</th>
              <th className="py-1.5 px-2 text-right font-semibold">En pesos</th>
              <th className="py-1.5 px-2 text-right font-semibold">Con la tasa de hoy</th>
              <th className="py-1.5 pl-2 text-right font-semibold">Con tu tasa</th>
            </tr>
          </thead>
          <tbody>
            {cifras.map((c) => (
              <tr key={c.id} className="border-t border-line-soft">
                <td className="py-2 pr-2">{c.etiqueta}</td>
                <td className="num px-2 py-2 text-right">{cifraCorta(c.cop)}</td>
                <td className="num px-2 py-2 text-right text-ink-2">{tasaActual ? cifraCortaEn(c.cop, moneda, tasaActual) : '—'}</td>
                <td className={cambio ? 'num py-2 pl-2 text-right font-bold text-ink' : 'num py-2 pl-2 text-right text-ink-2'} data-testid={`tasa-efecto-${moneda}-${c.id}`}>
                  {valor && valor > 0 ? cifraCortaEn(c.cop, moneda, valor) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {general && <p className="mt-4 t-small text-danger">{general}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="t-small text-muted">{existente ? 'Ya hay una tasa de ese día: se reemplaza.' : 'Se guarda como una tasa nueva del día elegido.'}</p>
        <Button iconoDerecha={ArrowRight} onClick={guardar} disabled={valor === null || valor <= 0} data-testid={`tasa-guardar-${moneda}`}>
          Guardar tasa
        </Button>
      </div>
    </section>
  );
}
