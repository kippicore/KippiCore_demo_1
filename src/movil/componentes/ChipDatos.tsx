import { Info } from 'lucide-react';
import { useState } from 'react';
import { APP } from '@/config/textos/guia';
import { useDatos } from '@/estado';
import { cn, Icono } from '@/ui/ligero';
import { HojaLigera } from '@/ui/movil/Movil';
import { TXT } from '../textos';
import { esPwaInstalada, esIosNavegador } from './entorno';

/**
 * Chip permanente "Datos de ejemplo de este celular" (PLAN 8.5.3): 28 px, `bg-surface-2`, ícono `Info`. Abre una hoja
 * con la explicación de una línea y, si el celular llegó por el código QR, lo que pasó con las acciones del computador
 * (`useDatos(s => s.qr)`: adoptadas, fusionadas, de otra fecha o ilegibles). En la app instalada en iPhone agrega que
 * esa instalación guarda sus propios datos (el almacenamiento de la app instalada es aparte del de Safari).
 */
export function ChipDatos({ className }: { className?: string }) {
  const [abierta, setAbierta] = useState(false);
  const qr = useDatos((s) => s.qr);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        data-testid="chip-datos-ejemplo"
        className={cn('inline-flex h-11 items-center', className)}
        aria-label={APP.chipDatos}
      >
        <span className="inline-flex h-7 items-center gap-1.5 bg-surface-2 px-2.5 t-micro font-semibold text-ink">
          <Icono icono={Info} tamano={12} />
          {APP.chipDatos}
        </span>
      </button>
      <HojaLigera abierta={abierta} alCerrar={() => setAbierta(false)} titulo={APP.chipDatos}>
        <div data-testid="chip-explicacion">
          <p className="t-body-lg text-ink">{TXT.chip.base}</p>
          <p className="mt-2 t-body text-muted">{TXT.chip.qr}</p>
          {qr && (
            <p data-testid="chip-resultado-qr" data-resultado={qr.resultado} className="mt-4 border-l-2 border-accent pl-3 t-body text-ink">
              {qr.resultado === 'adoptado' && TXT.chip.adoptado(qr.entradas)}
              {qr.resultado === 'fusionado' && TXT.chip.fusionado(qr.entradas)}
              {qr.resultado === 'otra_ancla' && TXT.chip.otraAncla}
              {qr.resultado === 'invalido' && TXT.chip.invalido}
            </p>
          )}
          {esPwaInstalada() && esIosNavegador() && <p className="mt-4 t-body text-muted">{APP.explicacionPwaIos}</p>}
        </div>
      </HojaLigera>
    </>
  );
}
