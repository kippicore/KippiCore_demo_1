import { useMemo } from 'react';
import { matrizQr } from '@/lib/codigos/qr';
import { cn } from '../cn';

/**
 * Código QR (PLAN 8.7.28): corrección M, zona de silencio de 4 módulos, negro sobre blanco (también en tema oscuro),
 * sin logotipo ni colores. Tamaños 160 (acceso a la app), 96 (factura, documento POS), 72 (pie de PDF). Debajo,
 * opcionalmente, la URL sin el hash en t-small muted truncada al centro.
 *
 *   <CodigoQR valor={urlApp} tamano={160} mostrarUrl />
 *
 * Importa `qrcode`: cárgalo diferido donde no sea lo primero que se ve (modal "Ver app del dueño").
 */
export function truncarAlCentro(texto: string, max = 42): string {
  if (texto.length <= max) return texto;
  const mitad = Math.floor((max - 1) / 2);
  return `${texto.slice(0, mitad)}…${texto.slice(-mitad)}`;
}

export function CodigoQR({ valor, tamano = 160, mostrarUrl, etiqueta = 'Código QR', className }: { valor: string; tamano?: 72 | 96 | 120 | 160; mostrarUrl?: boolean; etiqueta?: string; className?: string }) {
  const { d, total } = useMemo(() => {
    const { tamano: n, modulos } = matrizQr(valor, 'M');
    let ruta = '';
    for (let f = 0; f < n; f++) for (let c = 0; c < n; c++) if (modulos[f * n + c]) ruta += `M${c + 4} ${f + 4}h1v1h-1z`;
    return { d: ruta, total: n + 8 };
  }, [valor]);
  const sinHash = valor.split('#')[0] ?? valor;
  return (
    <figure className={cn('inline-flex flex-col items-center', className)} data-qr={valor}>
      <svg viewBox={`0 0 ${total} ${total}`} width={tamano} height={tamano} shapeRendering="crispEdges" role="img" aria-label={etiqueta} className="block bg-white">
        <path d={d} fill="black" />
      </svg>
      {mostrarUrl && (
        <figcaption className="mt-2 max-w-full t-small text-muted" title={sinHash} style={{ maxWidth: Math.max(tamano, 200) }}>
          {truncarAlCentro(sinHash.replace(/^https?:\/\//, ''))}
        </figcaption>
      )}
    </figure>
  );
}
