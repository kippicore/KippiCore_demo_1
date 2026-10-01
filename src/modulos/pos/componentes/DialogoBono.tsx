import { Gift } from 'lucide-react';
import { useState } from 'react';
import type { BonoRegalo, Id, MedioPago } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { MEDIOS_PAGO } from '@/config/negocio';
import { useAcciones, useEstadoDominio, useHoy } from '@/estado';
import { dinero as formatoDinero, fecha } from '@/lib/formato';
import { Button, Dialog, Icono, InputNumero, Select, SelectorFecha } from '@/ui';

/**
 * Venta de bono de regalo (PRD 7.2): plata recibida por anticipado, no es venta hasta que se redime. Se cobra con
 * cualquier medio menos otro bono o saldo a favor; el código lo asigna el sistema (BR-000214).
 */
const MEDIOS_BONO: readonly MedioPago[] = ['efectivo', 'datafono_debito', 'datafono_credito', 'nequi', 'daviplata', 'transferencia', 'qr_bre_b'];
const VALORES_RAPIDOS = [50_000, 100_000, 200_000] as const;

export interface PropsDialogoBono {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  localId: Id;
  /** Hay caja abierta (para cobrar en efectivo). */
  cajaAbierta: boolean;
}

export function DialogoBono({ abierto, alCambiar, localId, cajaAbierta }: PropsDialogoBono) {
  const acciones = useAcciones();
  const hoy = useHoy();
  const e = useEstadoDominio();
  const [valor, setValor] = useState<number | null>(100_000);
  const [medio, setMedio] = useState<MedioPago>('efectivo');
  const [vence, setVence] = useState<string>(sumarDias(hoy, 365));
  const [error, setError] = useState<string | null>(null);
  const [vendido, setVendido] = useState<Pick<BonoRegalo, 'codigo' | 'valor' | 'vence'> | null>(null);
  const local = e.locales[localId]?.nombre ?? '';

  const vender = () => {
    if (!valor || valor <= 0) return setError('Escribe el valor del bono.');
    if (medio === 'efectivo' && !cajaAbierta) return setError(`Abre la caja de ${local} para recibir el efectivo.`);
    const r = acciones.venderBono({
      codigo: null,
      valor,
      localId,
      vence,
      pago: { medio, valor, recibido: medio === 'efectivo' ? valor : null, referencia: null, sesionCajaId: null, bonoId: null },
    });
    if (!r.ok) return setError(r.error.mensaje);
    const nuevo = Object.values(r.despues.bonos).find((b) => !r.antes.bonos[b.id]);
    setError(null);
    setVendido(nuevo ? { codigo: nuevo.codigo, valor: nuevo.valor, vence: nuevo.vence } : { codigo: '', valor, vence });
  };

  const cerrar = () => {
    alCambiar(false);
    setVendido(null);
    setError(null);
  };

  return (
    <Dialog
      abierto={abierto}
      alCambiar={(a) => (a ? alCambiar(true) : cerrar())}
      eyebrow="Punto de venta"
      titulo={vendido ? 'Bono de regalo vendido' : 'Vender un bono de regalo'}
      descripcion={vendido ? undefined : `Se cobra ahora y se redime después como un medio de pago en ${local} o en cualquier otro local.`}
      ancho="sm"
      data-testid="pos-dialogo-bono"
      pie={
        vendido ? (
          <Button onClick={cerrar} data-testid="pos-bono-listo">
            Listo
          </Button>
        ) : (
          <>
            <Button variante="secondary" onClick={cerrar}>
              Cancelar
            </Button>
            <Button icono={Gift} onClick={vender} data-testid="pos-bono-vender">
              Vender bono
            </Button>
          </>
        )
      }
    >
      {vendido ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center" data-testid="pos-bono-vendido">
          <Icono icono={Gift} tamano={28} className="text-ink-2" />
          <p className="t-eyebrow text-ink-2">Código del bono</p>
          <p className="t-kpi-sm num text-ink" data-testid="pos-bono-codigo-vendido">
            {vendido.codigo}
          </p>
          <p className="t-body text-ink-2">
            {formatoDinero(vendido.valor, 'COP')} · vence el {fecha(vendido.vence)}
          </p>
          <p className="t-small text-muted">Entrégale el código al cliente: con él se redime en cualquier local.</p>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            vender();
          }}
        >
          <div>
            <InputNumero etiqueta="Valor del bono" prefijo="$" sufijo="COP" valor={valor} alCambiar={setValor} error={error && !valor ? error : undefined} data-testid="pos-bono-valor" />
            <div className="mt-2 flex gap-1.5">
              {VALORES_RAPIDOS.map((v) => (
                <Button key={v} variante="secondary" tamano="sm" onClick={() => setValor(v)}>
                  {formatoDinero(v, 'COP')}
                </Button>
              ))}
            </div>
          </div>
          <Select etiqueta="Medio de pago" valor={medio} alCambiar={(m) => setMedio(m as MedioPago)} opciones={MEDIOS_BONO.map((m) => ({ valor: m, etiqueta: MEDIOS_PAGO[m].etiqueta }))} enModal />
          <SelectorFecha etiqueta="Vence" hoy={hoy} desde={sumarDias(hoy, 1)} valor={vence} alCambiar={setVence} enModal />
          {error && valor ? (
            <p role="alert" className="t-small text-danger" data-testid="pos-bono-error">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </Dialog>
  );
}
