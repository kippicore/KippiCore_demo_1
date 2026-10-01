import { ArrowRight, CalendarClock, ChartNoAxesCombined, TrendingDown, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import type { FechaISO, ResultadoComando } from '@/dominio/tipos';
import { lunesDe } from '@/dominio/reglas/fechas';
import { emitirUI, useAcciones, useAhora, useDinero, useHoy, useSel } from '@/estado';
import { selFlujoProyectado } from '@/selectores';
import { relativaDias } from '@/lib/formato';
import { avisar, Badge, Button, Card, cn, Dinero, EmptyState, Fecha, GraficoDinero, Icono, Kpi, ListaQueCambio, NotaLegal, Segmentado } from '@/ui';
import { diaMesCorto, diaYMes, textoSemana, type SemanaFlujo } from '../calculos';
import { EncabezadoPagos } from '../componentes/EncabezadoPagos';
import { PagosDeLaSemana } from '../componentes/PagosDeLaSemana';
import { selFlujoDetalle, type MovimientoVista } from '../selectores';
import { TXT } from '../textos';

type Dias = '30' | '60' | '90';

interface CambioHecho {
  concepto: string;
  nuevaFecha: FechaISO;
  antes: { saldo: number; fecha: FechaISO };
  despues: { saldo: number; fecha: FechaISO };
}

/** Flujo de caja proyectado a 30/60/90 días (W5): la línea de saldo, el punto bajo explicado y los pagos de cada semana. */
export default function Flujo() {
  const params = useParamsRuta('flujo');
  const navegar = useNavigate();
  const hoy = useHoy();
  const hora = useAhora().slice(11, 16);
  const d = useDinero();
  const acciones = useAcciones();
  const dias: Dias = params.dias ?? '90';
  const diasN = Number(dias);
  const detalle = useSel(selFlujoDetalle, { dias: diasN, hoy, hora });
  const [cambio, setCambio] = useState<CambioHecho | null>(null);

  useEffect(() => {
    emitirUI('flujo_caja_visto');
  }, []);

  const { flujo, semanas, resumen, semanaBajo } = detalle;
  const lunesParam = params.semana ? lunesDe(params.semana) : null;
  const semanaElegida: SemanaFlujo | null = semanas.find((s) => s.lunes === lunesParam) ?? semanaBajo ?? semanas[0] ?? null;

  const ir = (nuevosDias: Dias, semana: FechaISO | null) => navegar(rutas.flujo({ dias: nuevosDias, semana }), { replace: true });
  const elegirSemana = (lunes: FechaISO) => ir(dias, lunes);

  const primeraProyectada = flujo.serie[0]?.fecha ?? hoy;
  const xSemana = semanaElegida ? (semanaElegida.lunes < primeraProyectada ? primeraProyectada : semanaElegida.lunes) : null;

  const grandes = useMemo(
    () =>
      detalle.movimientos
        .filter((m) => m.valor < 0 && -m.valor >= 3_000_000)
        .sort((a, b) => a.valor - b.valor)
        .slice(0, 6),
    [detalle.movimientos],
  );

  const reprogramar = (m: MovimientoVista, fecha: FechaISO): string | null => {
    const antes = { saldo: flujo.puntoBajo.saldo, fecha: flujo.puntoBajo.fecha };
    let r: ResultadoComando;
    if (m.clase === 'cxp' && m.cxp) r = acciones.programarCuentaPorPagar({ cxpId: m.cxp.id, fecha });
    else if (m.clase === 'importacion' && m.importacion)
      r = acciones.crearCuentaPorPagar({
        datos: {
          categoria: m.importacion.categoria,
          terceroNombre: m.importacion.tercero,
          proveedorId: null,
          empleadoId: null,
          concepto: m.concepto,
          localId: null,
          moneda: 'COP',
          valor: -m.valor,
          fechaEmision: hoy,
          fechaVencimiento: fecha,
          documento: { tipo: 'importacion', id: m.importacion.id },
          soporte: null,
          nota: 'Registrada al reprogramar el pago desde el flujo de caja.',
        },
      });
    else return 'Este pago no se puede reprogramar desde aquí.';
    if (!r.ok) return r.error.mensaje;
    const nuevo = selFlujoProyectado(r.despues, { dias: diasN, hoy, hora });
    const despues = { saldo: nuevo.puntoBajo.saldo, fecha: nuevo.puntoBajo.fecha };
    setCambio({ concepto: m.concepto, nuevaFecha: fecha, antes, despues });
    avisar({
      tipo: 'exito',
      texto: `Moviste el pago al ${diaYMes(fecha)}`,
      detalle: `Tu punto más bajo ahora es ${d(despues.saldo)} el ${diaYMes(despues.fecha)}.`,
    });
    return null;
  };

  const sinPeriodo = !semanaElegida;

  return (
    <>
      <EncabezadoPagos
        titulo="Flujo de caja"
        subtitulo={TXT.flujo.subtitulo}
        migaActual="Flujo de caja"
        acciones={
          <Segmentado
            etiqueta="Período del flujo de caja"
            valor={dias}
            alCambiar={(v) => ir(v, null)}
            data-testid="flujo-dias"
            opciones={[
              { valor: '30', etiqueta: '30 días', 'data-testid': 'flujo-dias-30' },
              { valor: '60', etiqueta: '60 días', 'data-testid': 'flujo-dias-60' },
              { valor: '90', etiqueta: '90 días', 'data-testid': 'flujo-dias-90' },
            ]}
          />
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-4 desk:grid-cols-4" data-testid="flujo-kpis">
        <Kpi etiqueta="Hoy tienes" valor={flujo.saldoInicial} formatear={d.corta} completo={d(flujo.saldoInicial)} nota="En cajas, banco y billeteras" data-testid="flujo-kpi-hoy" />
        <Kpi etiqueta={`Entra en ${dias} días`} valor={resumen.entra} formatear={d.corta} completo={d(resumen.entra)} nota="Ventas, datáfono y separados" data-testid="flujo-kpi-entra" />
        <Kpi etiqueta={`Sale en ${dias} días`} valor={resumen.sale} formatear={d.corta} completo={d(resumen.sale)} nota="Nómina, proveedores, impuestos y arriendos" data-testid="flujo-kpi-sale" />
        <Kpi
          etiqueta="Tu punto más bajo"
          valor={flujo.puntoBajo.saldo}
          formatear={d.corta}
          completo={d(flujo.puntoBajo.saldo)}
          nota={`${diaYMes(flujo.puntoBajo.fecha)} · ${relativaDias(flujo.puntoBajo.fecha, hoy)}`}
          destacada
          data-testid="flujo-kpi-bajo"
        />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 desk:grid-cols-12">
        <Card className="min-w-0 desk:col-span-8" padding="normal" data-testid="flujo-grafico">
          <GraficoDinero
            tipo="linea"
            titulo={`Tu saldo en los próximos ${dias} días`}
            lectura="La línea continua es la plata que de verdad hubo; la punteada, la que calculamos que vas a tener."
            datos={detalle.filas}
            x="fecha"
            series={[
              { clave: 'real', nombre: 'Saldo real', color: 1 },
              { clave: 'proyectado', nombre: 'Saldo proyectado', punteada: true },
            ]}
            formatoX={diaMesCorto}
            referencia={{ valor: flujo.puntoBajo.saldo, etiqueta: `Punto más bajo · ${d.corta(flujo.puntoBajo.saldo)}` }}
            referenciaX={xSemana ? { x: xSemana, etiqueta: 'Semana elegida' } : null}
            alto={320}
            data-testid="flujo-linea"
          />
        </Card>

        <Card className="desk:col-span-4" padding="normal" data-testid="flujo-punto-bajo">
          <p className="flex items-center gap-2 t-eyebrow text-ink-2">
            <Icono icono={TrendingDown} tamano={14} />
            Tu punto más bajo
          </p>
          <p className="mt-3 t-kpi num text-ink">
            <Dinero valor={flujo.puntoBajo.saldo} data-testid="punto-bajo-valor" />
          </p>
          <p className="mt-1 t-body text-ink-2">
            <Fecha valor={flujo.puntoBajo.fecha} formato="larga" /> · {relativaDias(flujo.puntoBajo.fecha, hoy)}
          </p>
          <p className="mt-5 max-w-[44ch] border-l-2 border-accent pl-3 t-body text-ink" data-testid="punto-bajo-explicacion">
            {flujo.explicacion}
          </p>
          {flujo.principales.length > 0 && (
            <ul className="mt-5 divide-y divide-line-soft border-y border-line-soft">
              {flujo.principales.map((p) => (
                <li key={`${p.concepto}-${p.fecha}`} className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate t-small text-ink-2" title={p.concepto}>
                    {p.concepto}
                  </span>
                  <span className="shrink-0 t-small font-semibold num text-ink">
                    <Dinero valor={p.valor} corta />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {semanaBajo && (
            <Button variante="secondary" tamano="sm" className="mt-5" iconoDerecha={ArrowRight} onClick={() => elegirSemana(semanaBajo.lunes)} data-testid="ver-semana-bajo">
              Ver los pagos de esa semana
            </Button>
          )}
        </Card>
      </div>

      {cambio && (
        <section className="mt-6 border border-ink bg-surface p-6" data-testid="flujo-cambio" aria-live="polite">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="t-eyebrow text-ink-2">Qué cambió</p>
              <h2 className="mt-1 t-h3 text-ink">Moviste un pago y el flujo se recalculó</h2>
            </div>
            <button type="button" aria-label="Cerrar" onClick={() => setCambio(null)} className="-mr-2 -mt-1 inline-flex size-8 items-center justify-center text-ink hover:bg-surface-2">
              <Icono icono={X} tamano={16} />
            </button>
          </div>
          <ListaQueCambio
            className="mt-4"
            filas={[
              { icono: CalendarClock, texto: cambio.concepto, despues: diaYMes(cambio.nuevaFecha) },
              { icono: TrendingDown, texto: 'Valor de tu punto más bajo', antes: d(cambio.antes.saldo), despues: d(cambio.despues.saldo) },
              { icono: ChartNoAxesCombined, texto: 'Día de tu punto más bajo', antes: diaYMes(cambio.antes.fecha), despues: diaYMes(cambio.despues.fecha) },
            ]}
          />
        </section>
      )}

      <div className="mt-10 grid grid-cols-1 gap-6 desk:grid-cols-12">
        <section className="desk:col-span-5" aria-label="Semana por semana">
          <h2 className="t-h2 text-ink">Semana por semana</h2>
          <p className="mt-1 mb-4 t-small text-muted">Toca una semana para ver sus pagos.</p>
          <ul className="border border-line bg-surface" data-testid="flujo-semanas">
            <li className="grid grid-cols-[1fr_76px_76px_88px] items-center gap-2 border-b border-ink px-4 py-2.5 t-eyebrow text-ink-2" aria-hidden>
              <span>Semana</span>
              <span className="text-right">Entra</span>
              <span className="text-right">Sale</span>
              <span className="text-right">Saldo al cierre</span>
            </li>
            {semanas.map((s) => {
              const elegida = s.lunes === semanaElegida?.lunes;
              return (
                <li key={s.lunes} className="border-b border-line-soft last:border-b-0">
                  <button
                    type="button"
                    onClick={() => elegirSemana(s.lunes)}
                    aria-pressed={elegida}
                    data-testid="flujo-semana"
                    data-lunes={s.lunes}
                    data-bajo={s.esPuntoBajo || undefined}
                    className={cn(
                      'grid min-h-12 w-full grid-cols-[1fr_76px_76px_88px] items-center gap-2 px-4 py-2 text-left outline-none transition-colors duration-(--dur-instant) hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
                      elegida && 'bg-selected shadow-[inset_2px_0_0_var(--c-ink)]',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block t-body font-semibold text-ink num">{textoSemana(s.lunes)}</span>
                      {s.esPuntoBajo && (
                        <Badge tono="accent" tamano="sm" className="mt-0.5">
                          Punto más bajo
                        </Badge>
                      )}
                    </span>
                    <span className="text-right t-small num text-ink-2">
                      <Dinero valor={s.ingresos} corta />
                    </span>
                    <span className="text-right t-small num text-ink-2">
                      <Dinero valor={s.egresos} corta />
                    </span>
                    <span className="text-right t-body font-semibold num text-ink">
                      <Dinero valor={s.saldoCierre} corta />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {grandes.length > 0 && (
            <div className="mt-8" data-testid="flujo-grandes">
              <h3 className="t-h3 text-ink">Los pagos grandes que vienen</h3>
              <ul className="mt-3 divide-y divide-line-soft border-y border-line-soft">
                {grandes.map((m, i) => (
                  <li key={`${m.fechaEfectiva}-${m.concepto}-${i}`}>
                    <button
                      type="button"
                      onClick={() => elegirSemana(lunesDe(m.fechaEfectiva))}
                      className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate t-body text-ink" title={m.concepto}>
                          {m.concepto}
                        </span>
                        <span className="block t-small text-muted">
                          <Fecha valor={m.fechaEfectiva} formato="larga" />
                        </span>
                      </span>
                      <span className="shrink-0 t-body font-semibold num text-ink">
                        <Dinero valor={-m.valor} corta />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="min-w-0 desk:col-span-7" aria-label="Pagos de la semana elegida">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="t-h2 text-ink" data-testid="semana-titulo">
                {semanaElegida ? `Semana del ${textoSemana(semanaElegida.lunes)}` : 'Pagos de la semana'}
              </h2>
              {semanaElegida && (
                <p className="mt-1 t-small text-muted">
                  Cierra con <Dinero valor={semanaElegida.saldoCierre} /> · lo más bajo de la semana: <Dinero valor={semanaElegida.saldoMinimo} />
                </p>
              )}
            </div>
            {semanaElegida?.esPuntoBajo && <Badge tono="accent">Aquí está tu punto más bajo</Badge>}
          </div>
          <div className="mt-4 border border-line bg-surface p-6">
            {sinPeriodo ? (
              <EmptyState tamano="tabla" icono={CalendarClock} titulo="Sin semanas para mostrar" texto="Elige otro período para ver el flujo de caja." />
            ) : (
              <PagosDeLaSemana semana={semanaElegida} movimientos={detalle.movimientos} hoy={hoy} dias={diasN} alReprogramar={reprogramar} />
            )}
          </div>
        </section>
      </div>

      <section className="mt-10 border-t border-line pt-6" aria-label="Cómo se calcula">
        <h2 className="t-h3 text-ink">Cómo se calcula</h2>
        <p className="mt-2 max-w-[72ch] t-body text-muted">
          Parte de lo que hay hoy en tus cuentas. Suma lo que vendes en promedio cada día de la semana (últimas ocho semanas, ajustado por la temporada), los abonos del datáfono al siguiente día hábil y los separados que
          vencen. Resta las cuentas por pagar con su fecha, la nómina como se paga de verdad (quincenas), la seguridad social, la prima, las cesantías, el IVA bimestral, la retención y el ICA, y los gastos fijos de cada mes.
          Si reprogramas un pago, la línea y la explicación se recalculan al instante.
        </p>
        <NotaLegal tipo="tributario" className="mt-3" />
      </section>
    </>
  );
}
