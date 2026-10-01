import { CircleCheck, Lock, Minus, Plus, Wallet } from 'lucide-react';
import { useState } from 'react';
import type { CategoriaGasto, Id } from '@/dominio/tipos';
import { rutas } from '@/app/rutas';
import { ESTADOS_CAJA } from '@/config/estados';
import { DENOMINACIONES, MEDIOS_PAGO } from '@/config/negocio';
import { useAcciones, useEstadoDominio, useHoy, usePuede, useSel } from '@/estado';
import { selCierresDelDia, selResumenSesion, type ResumenSesion } from '@/selectores';
import { dinero as formatoDinero, entero, hora } from '@/lib/formato';
import { BadgeEstado, BotonEnlace, BotonIcono, Button, Dialog, Dinero, EmptyState, FranjaResumen, Icono, Input, InputNumero, Pista, Segmentado, Select, Textarea, avisar, cn } from '@/ui';
import { denominacionesParaCierre, lecturaDiferencia, totalArqueo, valorDenominacion } from '../calculos';
import { DialogoAbrirCaja } from './DialogoAbrirCaja';
import { seleccionarTodo } from './campos';

/**
 * Caja de un local (PRD 7.2, W11): apertura con base, egresos, ventas por medio de pago y cierre con ARQUEO CIEGO:
 * quien cierra cuenta por denominación sin ver cuánto debería haber; el esperado y la diferencia aparecen solo
 * después de confirmar el conteo. El dueño (`ver.esperadoCajaAntesDeContar`) sí ve el esperado mientras cuenta.
 */
export interface PropsCajaDelLocal {
  localId: Id;
}

export function CajaDelLocal({ localId }: PropsCajaDelLocal) {
  const hoy = useHoy();
  const e = useEstadoDominio();
  const cierres = useSel(selCierresDelDia, { fecha: hoy });
  const fila = cierres.find((c) => c.localId === localId);
  const resumen = useSel(selResumenSesion, { sesionId: fila?.sesionId ?? '' });
  const [abriendo, setAbriendo] = useState(false);
  const local = e.locales[localId]?.nombre ?? '';

  if (!fila || fila.estado === 'sin_abrir' || !resumen)
    return (
      <>
        <div className="border border-line bg-surface" data-testid="caja-sin-abrir">
          <EmptyState
            icono={Wallet}
            titulo={`La caja de ${local} no está abierta`}
            texto="Ábrela con la base de cambio para empezar a recibir efectivo. Los otros medios de pago se pueden recibir con la caja cerrada."
            accion={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button icono={Wallet} onClick={() => setAbriendo(true)} data-testid="caja-abrir">
                  Abrir caja
                </Button>
                <BotonEnlace to={rutas.pos()} variante="secondary">
                  Ir al punto de venta
                </BotonEnlace>
              </div>
            }
          />
        </div>
        <DialogoAbrirCaja abierto={abriendo} alCambiar={setAbriendo} localId={localId} />
      </>
    );

  if (resumen.estado !== 'abierta') return <CierreRegistrado resumen={resumen} />;
  return <CajaAbierta resumen={resumen} localId={localId} />;
}

// ---------------------------------------------------------------------------------------------------------
// Caja abierta
// ---------------------------------------------------------------------------------------------------------
function CajaAbierta({ resumen: r, localId }: { resumen: ResumenSesion; localId: Id }) {
  const puede = usePuede();
  const veEsperado = puede('ver.esperadoCajaAntesDeContar');
  const [egreso, setEgreso] = useState(false);
  const s = r.sesion;
  const medios = (Object.entries(r.porMedio) as [keyof typeof MEDIOS_PAGO, number][]).filter(([m]) => veEsperado || m !== 'efectivo').sort((a, b) => b[1] - a[1]);
  const efectivoVentas = r.esperado - s.abierta.baseInicial + r.egresos;
  return (
    <div className="grid grid-cols-1 gap-6 desk:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]" data-testid="caja-abierta">
      <div className="flex min-w-0 flex-col gap-6">
        <FranjaResumen
          className="md:grid-cols-4"
          cifras={[
            { etiqueta: 'Base inicial', valor: <Dinero valor={s.abierta.baseInicial} /> },
            { etiqueta: 'Ventas de hoy', valor: <span data-testid="caja-num-ventas">{entero(r.numVentas)}</span> },
            { etiqueta: 'Egresos', valor: <Dinero valor={r.egresos} /> },
            {
              etiqueta: 'Efectivo esperado',
              valor: veEsperado ? (
                <span data-testid="caja-esperado-visible">
                  <Dinero valor={r.esperado} animar />
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 t-body text-muted" data-testid="caja-esperado-oculto">
                  <Icono icono={Lock} tamano={16} />
                  Al contar
                </span>
              ),
            },
          ]}
        />
        <section className="border border-line bg-surface p-5" aria-label="Ventas por medio de pago">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="t-h3 text-ink">Ventas por medio de pago</h2>
            <p className="t-small text-muted">Abrió {r.abrio} a las {hora(s.abierta.ts)}</p>
          </div>
          {medios.length === 0 && !veEsperado ? (
            <p className="t-body text-muted">Todavía no hay ventas con otros medios de pago hoy.</p>
          ) : (
            <dl className="divide-y divide-line-soft border-y border-line-soft" data-testid="caja-medios">
              {medios.map(([m, v]) => (
                <div key={m} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="t-body text-ink-2">{MEDIOS_PAGO[m].etiqueta}</dt>
                  <dd className="t-body num text-ink">
                    <Dinero valor={v} />
                  </dd>
                </div>
              ))}
              {!veEsperado && (
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="t-body text-ink-2">Efectivo</dt>
                  <dd className="t-small text-muted">Se muestra al confirmar el conteo</dd>
                </div>
              )}
            </dl>
          )}
          {veEsperado && (
            <p className="mt-3 t-small text-muted">
              Efectivo esperado = base <Dinero valor={s.abierta.baseInicial} /> + efectivo de las ventas <Dinero valor={efectivoVentas} /> − egresos <Dinero valor={r.egresos} />.
            </p>
          )}
        </section>
        <section className="border border-line bg-surface p-5" aria-label="Egresos de caja">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="t-h3 text-ink">Egresos de caja</h2>
            <Button variante="secondary" tamano="sm" icono={Plus} onClick={() => setEgreso(true)} data-testid="caja-registrar-egreso">
              Registrar egreso
            </Button>
          </div>
          {s.egresos.length === 0 ? (
            <p className="t-body text-muted">Sin egresos hoy. Si sale plata de la caja (domicilios, aseo, cambio), regístralo aquí para que el cierre cuadre.</p>
          ) : (
            <ul className="divide-y divide-line-soft border-y border-line-soft" data-testid="caja-egresos">
              {s.egresos.map((x) => (
                <li key={x.id} className="flex items-baseline justify-between gap-3 py-2.5 t-body">
                  <span className="min-w-0 flex-1 truncate text-ink">{x.concepto}</span>
                  <span className="shrink-0 t-small num text-muted">{hora(x.ts)}</span>
                  <span className="w-28 shrink-0 text-right num text-ink">
                    −<Dinero valor={x.valor} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <ArqueoCierre resumen={r} veEsperado={veEsperado} />
      <DialogoEgreso abierto={egreso} alCambiar={setEgreso} resumen={r} veEsperado={veEsperado} localId={localId} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Arqueo y cierre
// ---------------------------------------------------------------------------------------------------------
function ArqueoCierre({ resumen: r, veEsperado }: { resumen: ResumenSesion; veEsperado: boolean }) {
  const acciones = useAcciones();
  const [modo, setModo] = useState<'denominacion' | 'total'>('denominacion');
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [manual, setManual] = useState<number | null>(null);
  const [observacion, setObservacion] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contado = modo === 'denominacion' ? totalArqueo(cantidades) : (manual ?? 0);
  const hayConteo = modo === 'denominacion' ? Object.values(cantidades).some((n) => n > 0) : manual !== null;
  const diferenciaPrevia = contado - r.esperado;

  const cerrar = () => {
    const x = acciones.cerrarCaja({
      sesionId: r.sesion.id,
      denominaciones: modo === 'denominacion' ? denominacionesParaCierre(cantidades) : null,
      efectivoContado: contado,
      observacion: observacion.trim() || null,
      por: null,
    });
    if (!x.ok) {
      setError(x.error.mensaje);
      setConfirmando(false);
      return;
    }
    setConfirmando(false);
    avisar({ tipo: 'exito', texto: `Caja de ${r.localNombre} cerrada`, detalle: 'Ya puedes ver el esperado y la diferencia.' });
  };

  return (
    <section className="flex min-w-0 flex-col gap-4 border border-line bg-surface p-5" aria-label="Arqueo y cierre de caja" data-testid="caja-arqueo">
      <div>
        <h2 className="t-h3 text-ink">Arqueo y cierre</h2>
        <p className="mt-1 t-small text-muted">
          {veEsperado ? 'Cuenta el efectivo de la caja. Como dueño puedes ver el esperado mientras cuentas.' : 'Cuenta el efectivo sin ver cuánto debería haber. Al confirmar el conteo verás el esperado y la diferencia.'}
        </p>
      </div>
      <Segmentado
        etiqueta="Cómo contar"
        valor={modo}
        alCambiar={setModo}
        opciones={[
          { valor: 'denominacion', etiqueta: 'Por denominación', 'data-testid': 'caja-modo-denominacion' },
          { valor: 'total', etiqueta: 'Digitar el total', 'data-testid': 'caja-modo-total' },
        ]}
      />
      {modo === 'denominacion' && (
        <ul className="divide-y divide-line-soft border-y border-line-soft" data-testid="caja-denominaciones">
          {DENOMINACIONES.map((k) => {
            const v = valorDenominacion(k);
            const n = cantidades[k] ?? 0;
            return (
              <li key={k} className="flex items-center gap-3 py-1.5">
                <span className="w-24 shrink-0 t-label num text-ink">{v === null ? 'Monedas' : formatoDinero(v, 'COP')}</span>
                {v === null ? (
                  <InputNumero tamano="sm" etiqueta="Total en monedas" etiquetaOculta prefijo="$" valor={n || null} alCambiar={(x) => setCantidades((c) => ({ ...c, [k]: x ?? 0 }))} className="min-w-0 flex-1" onFocus={seleccionarTodo}
                      data-testid={`caja-den-${k}`} />
                ) : (
                  <div className="flex items-center gap-1">
                    <BotonIcono icono={Minus} etiqueta={`Una menos de ${formatoDinero(v, 'COP')}`} tamano="sm" disabled={n <= 0} onClick={() => setCantidades((c) => ({ ...c, [k]: Math.max(0, n - 1) }))} />
                    <Input
                      tamano="sm"
                      etiqueta={`Cantidad de billetes o monedas de ${formatoDinero(v, 'COP')}`}
                      etiquetaOculta
                      numerico
                      inputMode="numeric"
                      value={n === 0 ? '' : String(n)}
                      placeholder="0"
                      onChange={(ev) => setCantidades((c) => ({ ...c, [k]: Math.max(0, Math.min(9999, Number(ev.target.value.replace(/\D/g, '')) || 0)) }))}
                      className="w-16"
                      onFocus={seleccionarTodo}
                      data-testid={`caja-den-${k}`}
                    />
                    <BotonIcono icono={Plus} etiqueta={`Una más de ${formatoDinero(v, 'COP')}`} tamano="sm" onClick={() => setCantidades((c) => ({ ...c, [k]: n + 1 }))} />
                  </div>
                )}
                <span className="ml-auto w-28 shrink-0 text-right t-body num text-ink-2">{(v === null ? n : v * n) > 0 ? formatoDinero(v === null ? n : v * n, 'COP') : '—'}</span>
              </li>
            );
          })}
        </ul>
      )}
      <Pista id="caja.arqueo" lado="arriba" alinear="fin">
        <InputNumero
          etiqueta="Efectivo contado"
          prefijo="$"
          sufijo="COP"
          valor={modo === 'denominacion' ? (hayConteo ? contado : null) : manual}
          alCambiar={setManual}
          onFocus={seleccionarTodo}
          readOnly={modo === 'denominacion'}
          placeholder={modo === 'denominacion' ? 'Suma de lo que contaste' : 'Escribe el total contado'}
          ayuda={modo === 'denominacion' ? 'Se suma solo con las denominaciones.' : undefined}
          data-testid="caja-efectivo-contado"
        />
      </Pista>
      {veEsperado && hayConteo && (
        <p className="t-small num text-ink-2" data-testid="caja-diferencia-previa">
          Esperado <Dinero valor={r.esperado} /> · diferencia{' '}
          <strong className={cn('font-semibold', diferenciaPrevia === 0 ? 'text-success' : diferenciaPrevia < 0 ? 'text-danger' : 'text-warning')}>
            {diferenciaPrevia === 0 ? 'cuadra' : <Dinero valor={diferenciaPrevia} />}
          </strong>
        </p>
      )}
      <Textarea etiqueta="Observación" opcional placeholder="Ej. Se pagó un domicilio con plata de la caja" rows={2} value={observacion} onChange={(ev) => setObservacion(ev.target.value)} className="[&_textarea]:min-h-14" />
      {error && (
        <p role="alert" className="t-small text-danger">
          {error}
        </p>
      )}
      <Button tamano="lg" anchoCompleto disabled={!hayConteo} motivo="Cuenta el efectivo para poder cerrar." onClick={() => setConfirmando(true)} data-testid="caja-cerrar">
        Cerrar caja
      </Button>
      <Dialog
        abierto={confirmando}
        alCambiar={setConfirmando}
        eyebrow="Cierre de caja"
        titulo={`¿Cerrar la caja de ${r.localNombre}?`}
        descripcion={veEsperado ? undefined : 'Después de confirmar, el conteo no se puede cambiar y verás el esperado y la diferencia.'}
        ancho="sm"
        data-testid="caja-dialogo-cierre"
        pie={
          <>
            <Button variante="secondary" onClick={() => setConfirmando(false)}>
              Seguir contando
            </Button>
            <Button onClick={cerrar} data-testid="caja-confirmar-cierre">
              Confirmar y cerrar caja
            </Button>
          </>
        }
      >
        <dl className="divide-y divide-line-soft border-y border-line-soft">
          <div className="flex items-baseline justify-between py-2.5">
            <dt className="t-body text-ink-2">Efectivo contado</dt>
            <dd className="t-body num font-bold text-ink" data-testid="caja-confirmar-contado">
              <Dinero valor={contado} />
            </dd>
          </div>
          {veEsperado && (
            <div className="flex items-baseline justify-between py-2.5">
              <dt className="t-body text-ink-2">Efectivo esperado</dt>
              <dd className="t-body num text-ink">
                <Dinero valor={r.esperado} />
              </dd>
            </div>
          )}
        </dl>
      </Dialog>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Egreso
// ---------------------------------------------------------------------------------------------------------
const CATEGORIAS: { valor: CategoriaGasto; etiqueta: string }[] = [
  { valor: 'transporte', etiqueta: 'Transporte y domicilios' },
  { valor: 'servicios', etiqueta: 'Servicios' },
  { valor: 'mantenimiento', etiqueta: 'Mantenimiento y aseo' },
  { valor: 'empaques', etiqueta: 'Empaques' },
  { valor: 'publicidad', etiqueta: 'Publicidad' },
  { valor: 'otros', etiqueta: 'Otros' },
];

function DialogoEgreso({ abierto, alCambiar, resumen: r, veEsperado }: { abierto: boolean; alCambiar: (a: boolean) => void; resumen: ResumenSesion; veEsperado: boolean; localId: Id }) {
  const acciones = useAcciones();
  const [concepto, setConcepto] = useState('');
  const [valor, setValor] = useState<number | null>(null);
  const [categoria, setCategoria] = useState<CategoriaGasto>('transporte');
  const [errores, setErrores] = useState<{ concepto?: string; valor?: string }>({});
  const registrar = () => {
    const err: { concepto?: string; valor?: string } = {};
    if (!concepto.trim()) err.concepto = 'Escribe en qué se usó la plata.';
    if (!valor || valor <= 0) err.valor = 'Escribe cuánto salió de la caja.';
    // El mensaje del dominio dice cuánto hay en la caja: al vendedor (arqueo ciego) no se le revela el esperado.
    else if (valor > r.esperado) err.valor = veEsperado ? `En la caja hay ${formatoDinero(r.esperado, 'COP')}.` : 'Ese egreso supera el efectivo de la caja.';
    setErrores(err);
    if (err.concepto || err.valor || !valor) return;
    const x = acciones.registrarEgresoCaja({ sesionId: r.sesion.id, concepto: concepto.trim(), valor, categoria });
    if (!x.ok) return setErrores({ valor: veEsperado ? x.error.mensaje : 'No se pudo registrar el egreso. Revisa el valor.' });
    avisar({ tipo: 'exito', texto: 'Egreso registrado', detalle: `${concepto.trim()} · ${formatoDinero(valor, 'COP')}` });
    setConcepto('');
    setValor(null);
    alCambiar(false);
  };
  return (
    <Dialog
      abierto={abierto}
      alCambiar={alCambiar}
      eyebrow="Caja"
      titulo="Registrar un egreso"
      descripcion="Plata que salió de la caja durante el día. Queda como gasto del local y se descuenta del efectivo esperado."
      ancho="sm"
      data-testid="caja-dialogo-egreso"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={registrar} data-testid="caja-egreso-guardar">
            Registrar egreso
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          registrar();
        }}
      >
        <Input etiqueta="Concepto" placeholder="Ej. Domicilio a Chapinero" value={concepto} onChange={(ev) => setConcepto(ev.target.value)} error={errores.concepto} data-testid="caja-egreso-concepto" />
        <InputNumero etiqueta="Valor" prefijo="$" sufijo="COP" valor={valor} alCambiar={setValor} error={errores.valor} onFocus={seleccionarTodo} data-testid="caja-egreso-valor" />
        <Select etiqueta="Categoría" valor={categoria} alCambiar={(v) => setCategoria(v as CategoriaGasto)} opciones={CATEGORIAS} enModal />
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Cierre ya registrado
// ---------------------------------------------------------------------------------------------------------
function CierreRegistrado({ resumen: r }: { resumen: ResumenSesion }) {
  const c = r.sesion.cierre;
  if (!c) return null;
  const lectura = lecturaDiferencia(c.diferencia);
  return (
    <section className="border border-line bg-surface p-6" aria-label="Cierre de la caja de hoy" data-testid="caja-cerrada">
      <div className="flex flex-wrap items-center gap-3">
        <Icono icono={CircleCheck} tamano={28} className={lectura === 'cuadro' ? 'text-success' : 'text-ink-2'} />
        <h2 className="t-h2 text-ink">Caja de {r.localNombre} cerrada</h2>
        <BadgeEstado estado={r.estado === 'revisada' ? ESTADOS_CAJA.revisado : lectura === 'cuadro' ? ESTADOS_CAJA.cuadro : ESTADOS_CAJA.con_diferencia} />
      </div>
      <p className="mt-2 t-body text-muted">
        Cerró {r.cerro} a las {hora(c.ts)}
        {c.ciego ? ' con arqueo ciego: contó sin ver el esperado.' : '.'}
      </p>
      <FranjaResumen
        className="mt-5"
        cifras={[
          { etiqueta: 'Efectivo esperado', valor: <span data-testid="caja-cerrada-esperado"><Dinero valor={c.efectivoEsperado} /></span> },
          { etiqueta: 'Efectivo contado', valor: <span data-testid="caja-cerrada-contado"><Dinero valor={c.efectivoContado} /></span> },
          {
            etiqueta: 'Diferencia',
            valor: (
              <span className={lectura === 'cuadro' ? 'text-success' : lectura === 'faltante' ? 'text-danger' : 'text-warning'} data-testid="caja-cerrada-diferencia">
                {lectura === 'cuadro' ? 'Cuadró' : <Dinero valor={c.diferencia} />}
              </span>
            ),
          },
          { etiqueta: 'Ventas del día', valor: <span>{entero(r.numVentas)}</span> },
        ]}
      />
      <p className="mt-4 t-small text-muted">
        {lectura === 'cuadro' ? 'El conteo coincide con lo que dicen las ventas, la base y los egresos.' : lectura === 'faltante' ? 'Faltó efectivo frente a lo esperado. El dueño lo ve en la revisión de cierres.' : 'Sobró efectivo frente a lo esperado. El dueño lo ve en la revisión de cierres.'}
      </p>
    </section>
  );
}
