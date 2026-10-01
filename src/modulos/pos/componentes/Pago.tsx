import { ChevronDown, Plus, X } from 'lucide-react';
import type { Dispatch } from 'react';
import type { COP, FechaISO, MedioPago } from '@/dominio/tipos';
import { BILLETES_FRECUENTES, MEDIOS_PAGO } from '@/config/negocio';
import { useHoy, useSel } from '@/estado';
import { dinero as formatoDinero } from '@/lib/formato';
import { BotonIcono, Button, InputNumero, ItemMenu, Menu, Input, SelectorFecha, Segmentado, Select, cn } from '@/ui';
import { cuentaEfectivo, recibidoConBillete, type PagoEdicion } from '../calculos';
import type { AccionPos } from '../estadoPos';
import { selBonoPorCodigo } from '../selectores';
import { TEXTOS } from '../textos';
import { seleccionarTodo } from './campos';

/**
 * Pago de la venta: contado o separado, medios (los de PRD 4.3), pago dividido (el último pago toma el resto),
 * efectivo con billetes frecuentes y cambio, código del bono de regalo y referencia del datáfono. Los montos de
 * efectivo van en pesos colombianos (la plata física no se convierte aunque el panel muestre otra moneda).
 * Compacto a propósito: con pago dividido el POS completo sigue cabiendo sin desplazamiento a 1366 × 657.
 */
const RAPIDOS: readonly MedioPago[] = ['efectivo', 'datafono_debito', 'datafono_credito', 'nequi'];
const OTROS: readonly MedioPago[] = ['daviplata', 'transferencia', 'qr_bre_b', 'bono_regalo', 'credito_financiera', 'saldo_a_favor'];

export interface PropsPago {
  tipo: 'contado' | 'separado';
  abono: COP | null;
  fechaLimite: FechaISO | null;
  pagos: readonly PagoEdicion[];
  /** Valor que cobra cada pago (el último, el resto). */
  valores: readonly COP[];
  objetivo: COP;
  total: COP;
  /** El separado necesita un cliente identificado. */
  puedeSeparado: boolean;
  abonoMinimo: COP;
  maxFecha: FechaISO;
  /** Saldo a favor del cliente (0 si no hay): habilita ese medio. */
  saldoAFavor: COP;
  alTipo: (t: 'contado' | 'separado') => void;
  despachar: Dispatch<AccionPos>;
}

export function Pago({ tipo, abono, fechaLimite, pagos, valores, objetivo, total, puedeSeparado, abonoMinimo, maxFecha, saldoAFavor, alTipo, despachar }: PropsPago) {
  const hoy = useHoy();
  const multiple = pagos.length > 1;
  const medios = OTROS.filter((m) => m !== 'saldo_a_favor' || saldoAFavor > 0);
  const opcionesMedio = [...RAPIDOS, ...medios].map((m) => ({ valor: m, etiqueta: MEDIOS_PAGO[m].etiqueta }));
  const mediosEnUso = new Set(pagos.map((p) => p.medio));
  const siguienteMedio: MedioPago = !mediosEnUso.has('efectivo') ? 'efectivo' : !mediosEnUso.has('nequi') ? 'nequi' : 'datafono_debito';
  const ultimoValor = valores[valores.length - 1] ?? 0;
  const primero = pagos[0]?.medio;
  const primeroEsOtro = !!primero && (OTROS as readonly MedioPago[]).includes(primero);

  return (
    <section aria-label="Pago" className="flex flex-col gap-2" data-testid="pos-pago">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="t-eyebrow text-ink-2">Pago</p>
          <Button
            variante="ghost"
            tamano="sm"
            icono={Plus}
            disabled={multiple ? ultimoValor <= 1 : objetivo <= 1}
            onClick={() => despachar({ t: 'dividir', medio: siguienteMedio, valorActual: ultimoValor })}
            data-testid="pos-dividir-pago"
          >
            {multiple ? 'Otro pago' : 'Dividir pago'}
          </Button>
        </div>
        <Segmentado
          tamano="sm"
          etiqueta="Tipo de venta"
          valor={tipo}
          alCambiar={alTipo}
          opciones={[
            { valor: 'contado', etiqueta: 'De contado', 'data-testid': 'pos-tipo-contado' },
            { valor: 'separado', etiqueta: 'Separado', 'data-testid': 'pos-tipo-separado' },
          ]}
        />
      </div>

      {tipo === 'separado' && (
        <div className="flex flex-col gap-0.5 border border-line bg-surface-2 px-2 pb-1.5 pt-1" data-testid="pos-separado">
          <div className="grid grid-cols-2 gap-2">
            <InputNumero
              etiqueta="Abono inicial"
              prefijo="$"
              valor={abono}
              alCambiar={(v) => despachar({ t: 'abono', valor: v })}
              onFocus={seleccionarTodo}
              placeholder={`Mínimo ${formatoDinero(abonoMinimo, 'COP')}`}
              error={abono !== null && abono < abonoMinimo ? 'No alcanza el mínimo.' : abono !== null && abono >= total ? 'Si paga todo, cóbrala de contado.' : undefined}
              data-testid="pos-abono"
            />
            <SelectorFecha etiqueta="Fecha límite" hoy={hoy} desde={hoy} hasta={maxFecha} valor={fechaLimite} alCambiar={(f) => despachar({ t: 'fechaLimite', fecha: f })} />
          </div>
          <p className={cn('t-small', puedeSeparado ? 'text-muted' : 'text-danger')}>{puedeSeparado ? `Abono mínimo ${formatoDinero(abonoMinimo, 'COP')}. La mercancía queda reservada.` : TEXTOS.separadoSinCliente}</p>
        </div>
      )}

      {!multiple && (
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Medio de pago">
          {RAPIDOS.map((m) => (
            <ChipMedio key={m} activo={primero === m} onClick={() => despachar({ t: 'medio', indice: 0, medio: m })} testid={`pos-medio-${m}`}>
              {MEDIOS_PAGO[m].corta}
            </ChipMedio>
          ))}
          <Menu
            alinear="start"
            etiqueta="Otros medios de pago"
            disparador={
              <button
                type="button"
                data-testid="pos-medio-mas"
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 border px-3 t-label transition-colors duration-(--dur-instant) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                  primeroEsOtro ? 'border-ink bg-ink text-inverse' : 'border-line-strong bg-surface text-ink hover:border-ink',
                )}
              >
                {primeroEsOtro && primero ? MEDIOS_PAGO[primero].corta : 'Otros'}
                <ChevronDown size={14} aria-hidden />
              </button>
            }
          >
            {medios.map((m) => (
              <ItemMenu key={m} onSelect={() => despachar({ t: 'medio', indice: 0, medio: m })} data-testid={`pos-medio-${m}`}>
                {MEDIOS_PAGO[m].etiqueta}
              </ItemMenu>
            ))}
          </Menu>
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {pagos.map((p, i) => {
          const valor = valores[i] ?? 0;
          const esUltimo = i === pagos.length - 1;
          return (
            <li key={p.clave} className="flex flex-col gap-1.5" data-testid="pos-pago-fila" data-medio={p.medio}>
              {multiple && (
                <div className="flex items-start gap-1.5">
                  <Select
                    tamano="sm"
                    valor={p.medio}
                    alCambiar={(m) => despachar({ t: 'medio', indice: i, medio: m as MedioPago })}
                    opciones={opcionesMedio}
                    etiqueta={`Medio del pago ${i + 1}`}
                    etiquetaOculta
                    className="w-[150px] shrink-0"
                    data-testid={`pos-medio-pago-${i}`}
                  />
                  <InputNumero
                    tamano="sm"
                    etiqueta={`Valor del pago ${i + 1}`}
                    etiquetaOculta
                    prefijo="$"
                    valor={valor}
                    readOnly={esUltimo}
                    alCambiar={(v) => despachar({ t: 'valorPago', indice: i, valor: v })}
                    onFocus={seleccionarTodo}
                    title={esUltimo ? 'El último pago toma el resto' : undefined}
                    className="w-[112px] shrink-0"
                    data-testid={`pos-valor-pago-${i}`}
                  />
                  {p.medio !== 'efectivo' && <DetallePago p={p} valor={valor} indice={i} despachar={despachar} enLinea />}
                  <BotonIcono icono={X} etiqueta={`Quitar el pago ${i + 1}`} variante="ghost" tamano="sm" className="ml-auto" onClick={() => despachar({ t: 'quitarPago', indice: i })} />
                </div>
              )}
              {(!multiple || p.medio === 'efectivo') && <DetallePago p={p} valor={valor} indice={i} despachar={despachar} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ChipMedio({ activo, onClick, children, testid }: { activo: boolean; onClick: () => void; children: string; testid: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activo}
      onClick={onClick}
      data-testid={testid}
      className={cn(
        'inline-flex h-8 items-center border px-3 t-label transition-colors duration-(--dur-instant) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        activo ? 'border-ink bg-ink text-inverse' : 'border-line-strong bg-surface text-ink hover:border-ink',
      )}
    >
      {children}
    </button>
  );
}

/** Detalle de un pago: billetes y recibido (efectivo), código del bono, o la referencia (resto). `enLinea`: dentro de la fila. */
function DetallePago({ p, valor, indice, despachar, enLinea }: { p: PagoEdicion; valor: COP; indice: number; despachar: Dispatch<AccionPos>; enLinea?: boolean }) {
  const hoy = useHoy();
  const bono = useSel(selBonoPorCodigo, { codigo: p.bonoCodigo, hoy });
  if (p.medio === 'efectivo') {
    const c = cuentaEfectivo(valor, p.recibido);
    return (
      <div className="flex flex-wrap items-center gap-1.5" data-testid="pos-efectivo">
        {BILLETES_FRECUENTES.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => despachar({ t: 'recibido', indice, valor: recibidoConBillete(valor, b) })}
            className="inline-flex h-8 items-center border border-line-strong bg-surface px-2.5 t-label num text-ink transition-colors duration-(--dur-instant) hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            aria-label={`Recibió billetes de ${formatoDinero(b, 'COP')}`}
            data-testid={`pos-billete-${b}`}
          >
            {formatoDinero(b, 'COP')}
          </button>
        ))}
        <InputNumero
          tamano="sm"
          etiqueta="Efectivo recibido"
          etiquetaOculta
          prefijo="$"
          placeholder="Recibido"
          valor={p.recibido}
          alCambiar={(v) => despachar({ t: 'recibido', indice, valor: v })}
          onFocus={seleccionarTodo}
          error={c.falta > 0 ? `Faltan ${formatoDinero(c.falta, 'COP')}` : undefined}
          className="w-[116px]"
          data-testid="pos-recibido"
        />
        {p.recibido !== null && (
          <button type="button" onClick={() => despachar({ t: 'recibido', indice, valor: null })} className="inline-flex h-8 items-center px-2 t-small text-ink-2 underline underline-offset-4 hover:no-underline" aria-label="Cobrar el valor exacto">
            Exacto
          </button>
        )}
      </div>
    );
  }
  if (p.medio === 'bono_regalo') {
    const error = p.bonoCodigo && !bono ? 'No encontramos ese bono.' : bono && bono.estado !== 'activo' ? `Ese bono está ${bono.estado === 'usado' ? 'usado' : 'vencido'}.` : bono && bono.saldo < valor ? `Al bono le quedan ${formatoDinero(bono.saldo, 'COP')}.` : undefined;
    return (
      <div className={cn('flex min-w-0 flex-col gap-1', enLinea && 'flex-1')}>
        <Input
          tamano="sm"
          etiqueta="Código del bono"
          etiquetaOculta
          placeholder="Código del bono"
          value={p.bonoCodigo}
          onChange={(ev) => despachar({ t: 'bono', indice, codigo: ev.target.value.toUpperCase() })}
          error={error}
          data-testid="pos-bono-codigo"
        />
        {bono && bono.estado === 'activo' && !error && (
          <p className="t-small text-ink-2" data-testid="pos-bono-saldo">
            Saldo del bono: <strong className="font-semibold num text-ink">{formatoDinero(bono.saldo, 'COP')}</strong>
          </p>
        )}
      </div>
    );
  }
  if (p.medio === 'saldo_a_favor') return <p className={cn('t-small text-ink-2', enLinea && 'flex h-8 min-w-0 flex-1 items-center truncate')}>Sale del saldo a favor del cliente.</p>;
  return (
    <Input
      tamano="sm"
      etiqueta="Referencia"
      etiquetaOculta
      placeholder={p.medio === 'datafono_debito' || p.medio === 'datafono_credito' ? 'Aprobación del datáfono (opcional)' : 'Referencia (opcional)'}
      value={p.referencia}
      onChange={(ev) => despachar({ t: 'referencia', indice, texto: ev.target.value })}
      className={enLinea ? 'min-w-0 flex-1' : undefined}
      data-testid="pos-referencia"
    />
  );
}
