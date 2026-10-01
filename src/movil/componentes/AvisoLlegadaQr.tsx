import { MonitorSmartphone, X } from 'lucide-react';
import { useState } from 'react';
import { useDatos, useEstadoDominio } from '@/estado';
import { Button, cn, Icono } from '@/ui/ligero';
import { TXT } from '../textos';

/** Se cierra una vez por carga (volver a Hoy desde otra pestaña no lo trae de vuelta). */
let cerrado = false;

/**
 * W10: el aviso elegante de lo que llegó por el código QR. Si el cliente abrió la app con el QR de "Ver app del
 * dueño", la venta que acaba de hacer en el computador ya está aquí (el QR la trajo en el hash y `estado/qr.ts` la
 * incorporó al registro). Dice "Llegó tu venta V-0xxxx desde el computador" con un botón para verla. Si el celular ya
 * tenía datos de otra fecha o el código no se pudo leer, lo dice sin alarmar.
 */
export function AvisoLlegadaQr({ alVerVenta }: { alVerVenta: (ventaId: string) => void }) {
  const qr = useDatos((s) => s.qr);
  const registro = useDatos((s) => s.registro);
  const e = useEstadoDominio();
  const [oculto, setOculto] = useState(cerrado);
  if (!qr || oculto) return null;

  const cerrar = () => {
    cerrado = true;
    setOculto(true);
  };

  let titulo: string;
  let detalle: string;
  let ventaId: string | null = null;
  if (qr.resultado === 'otra_ancla') {
    titulo = TXT.qr.otraAncla;
    detalle = TXT.qr.otraAnclaDetalle;
  } else if (qr.resultado === 'invalido') {
    titulo = TXT.qr.invalido;
    detalle = TXT.qr.invalidoDetalle;
  } else {
    // Las acciones que trajo el código son las últimas `qr.entradas` del registro.
    const traidas = qr.entradas > 0 ? registro.slice(-qr.entradas) : [];
    const ventas = traidas.filter((x) => x.comando.tipo === 'venta.registrar');
    const ultima = ventas.at(-1)?.comando.datos as { ventaId?: string } | undefined;
    const venta = ultima?.ventaId ? e.ventas[ultima.ventaId] : undefined;
    if (venta) {
      ventaId = venta.id;
      titulo = TXT.qr.titulo(venta.numero);
      detalle = TXT.qr.detalle;
    } else if (traidas.length > 0) {
      titulo = TXT.qr.varias(traidas.length);
      detalle = TXT.qr.variasDetalle;
    } else return null;
  }
  const buena = ventaId !== null || (qr.resultado !== 'otra_ancla' && qr.resultado !== 'invalido');

  return (
    <article
      data-testid="app-aviso-qr"
      data-resultado={qr.resultado}
      role="status"
      className={cn('relative animate-stack-in border border-line bg-surface p-4 pr-12', buena ? 'shadow-[inset_2px_0_0_var(--c-accent)]' : 'shadow-[inset_2px_0_0_var(--c-line-strong)]')}
    >
      <div className="flex items-start gap-3">
        <Icono icono={MonitorSmartphone} tamano={22} className={buena ? 'mt-0.5 text-accent-ink' : 'mt-0.5 text-subtle'} />
        <div className="min-w-0 flex-1">
          <p className="t-h3 text-ink">{titulo}</p>
          <p className="mt-1 t-small text-muted">{detalle}</p>
          {ventaId && (
            <Button variante="secondary" tamano="lg" anchoCompleto className="mt-3" onClick={() => alVerVenta(ventaId)} data-testid="app-aviso-qr-ver">
              {TXT.qr.ver}
            </Button>
          )}
        </div>
      </div>
      <button type="button" onClick={cerrar} aria-label={TXT.qr.cerrar} className="absolute right-1 top-1 inline-flex size-11 items-center justify-center text-ink-2 active:bg-surface-2">
        <Icono icono={X} tamano={18} />
      </button>
    </article>
  );
}
