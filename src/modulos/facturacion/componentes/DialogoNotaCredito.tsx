import { useState } from 'react';
import { useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useAcciones } from '@/estado';
import { avisar, Button, Dialog, Dinero, Fecha, GrupoRadio, Input } from '@/ui';
import type { VistaFactura } from '../selectores';
import { TEXTOS } from '../textos';

const SALDO = '__saldo__';

/**
 * Nota crédito sobre una factura o un documento POS: por una devolución que aún no tiene nota, o por el saldo que
 * queda del documento (ajuste o anulación). El valor lo calcula el dominio; aquí solo se elige y se justifica.
 */
export function DialogoNotaCredito({
  vista,
  abierto,
  alCambiar,
}: {
  vista: VistaFactura;
  abierto: boolean;
  alCambiar: (a: boolean) => void;
}) {
  // El formulario se monta al abrir: así cada apertura empieza limpia, sin sincronizar estado con efectos.
  return abierto ? <FormularioNota vista={vista} alCambiar={alCambiar} /> : null;
}

function FormularioNota({ vista, alCambiar }: { vista: VistaFactura; alCambiar: (a: boolean) => void }) {
  const acciones = useAcciones();
  const navegar = useNavigate();
  const pendientes = vista.devolucionesPorAcreditar;
  const [origen, setOrigen] = useState<string>(() => pendientes[0]?.id ?? SALDO);
  const [motivo, setMotivo] = useState(() => pendientes[0]?.motivo ?? '');
  const [tocado, setTocado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emitiendo, setEmitiendo] = useState(false);

  const dev = pendientes.find((d) => d.id === origen) ?? null;
  const valor = dev ? dev.valor : vista.saldo;
  const errorMotivo = motivo.trim().length < 3 ? 'Escribe el motivo de la nota crédito.' : undefined;

  const elegir = (v: string) => {
    setOrigen(v);
    const d = pendientes.find((x) => x.id === v);
    if (d && !motivo.trim()) setMotivo(d.motivo);
  };

  const emitir = () => {
    setTocado(true);
    if (errorMotivo) return;
    setEmitiendo(true);
    setError(null);
    const r = acciones.emitirNotaCredito({ facturaId: vista.factura.id, devolucionId: dev ? dev.id : null, motivo: motivo.trim() });
    setEmitiendo(false);
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    const ev = r.eventos.find((x) => x.tipo === 'NotaCreditoEmitida');
    const notaId = ev && 'notaId' in ev ? ev.notaId : null;
    alCambiar(false);
    avisar({ tipo: 'exito', texto: 'Nota crédito generada (simulación)', detalle: `Afecta ${vista.factura.numero}.` });
    if (notaId) navegar(rutas.notaCredito(notaId));
  };

  return (
    <Dialog
      abierto
      alCambiar={alCambiar}
      eyebrow={TEXTOS.notaDialogo.eyebrow}
      titulo={`${TEXTOS.notaDialogo.titulo} sobre ${vista.factura.numero}`}
      descripcion={TEXTOS.notaDialogo.descripcion}
      ancho="md"
      data-testid="facturacion-dialogo-nota"
      confirmarAlCerrar={tocado}
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button
            onClick={emitir}
            cargando={emitiendo}
            disabled={valor <= 0}
            motivo={valor <= 0 ? 'Este documento ya está acreditado por completo' : undefined}
            data-testid="facturacion-confirmar-nota"
          >
            Emitir nota crédito
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <GrupoRadio
          etiqueta="¿Qué se acredita?"
          tarjetas
          columnas={1}
          valor={origen}
          alCambiar={elegir}
          opciones={[
            ...pendientes.map((d) => ({
              valor: d.id,
              etiqueta: (
                <span className="inline-flex items-baseline gap-2">
                  Devolución <span className="num">{d.numero}</span>
                </span>
              ),
              descripcion: (
                <span>
                  <Dinero valor={d.valor} /> · <Fecha valor={d.ts} formato="fecha" /> · {d.motivo}
                </span>
              ),
            })),
            {
              valor: SALDO,
              etiqueta: 'Saldo del documento',
              descripcion: (
                <span>
                  Acredita lo que queda sin acreditar: <Dinero valor={vista.saldo} />
                </span>
              ),
              deshabilitado: vista.saldo <= 0,
            },
          ]}
        />
        <Input
          etiqueta="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Por ejemplo: devolución por talla"
          error={tocado ? errorMotivo : undefined}
          data-testid="facturacion-motivo-nota"
        />
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 border-t border-line-soft pt-4 t-small">
          <dt className="text-muted">Valor de la nota</dt>
          <dd className="num text-ink" data-testid="facturacion-valor-nota">
            <Dinero valor={valor} />
          </dd>
          <dt className="text-muted">Quedaría sin acreditar</dt>
          <dd className="num text-ink">
            <Dinero valor={Math.max(0, vista.saldo - valor)} />
          </dd>
        </dl>
        {error && (
          <p role="alert" className="t-small text-danger" data-testid="facturacion-error-nota">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
