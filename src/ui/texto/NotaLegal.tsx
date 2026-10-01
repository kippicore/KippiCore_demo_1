import { Info } from 'lucide-react';
import { NOTAS_LEGALES, type TipoNotaLegal } from '@/config/textos/notas';
import { cn } from '../cn';
import { Icono } from '../primitivos/Icono';

/**
 * Nota legal (PLAN 8.7.32): t-small muted con ícono Info 14, sin caja. Toda cifra laboral, tributaria o aduanera en
 * pantalla va con su nota. Nunca cita números de normas.
 *
 *   <NotaLegal tipo="nomina" />  ·  <NotaLegal tipo="tributario" />  ·  <NotaLegal tipo="aduanero" />  ·  <NotaLegal tipo="contrato_realidad" />
 */
export function NotaLegal({ tipo, className }: { tipo: TipoNotaLegal; className?: string }) {
  return (
    <p className={cn('flex max-w-[72ch] items-start gap-1.5 t-small text-muted', className)} data-nota-legal={tipo}>
      <Icono icono={Info} tamano={14} className="mt-0.5" />
      <span>{NOTAS_LEGALES[tipo]}</span>
    </p>
  );
}
