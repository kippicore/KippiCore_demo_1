import { MiniaturaPrenda, Prenda } from '@/ui/ligero';
import type { PrendaVista } from '../selectores';

/** La "foto" de la prenda sobre su fondo de producto (`bg-product`: gris claro también en oscuro, 8.1.1). */
export function FotoPrenda({ p, grande }: { p: PrendaVista | null; grande?: boolean }) {
  if (!p) return <span aria-hidden className={grande ? 'block h-40 w-full bg-product' : 'block h-[52px] w-10 bg-product'} />;
  if (grande)
    return (
      <span className="flex h-44 w-full items-center justify-center bg-product">
        <span className="block h-36 w-28">
          <Prenda tipo={p.tipo} color={p.color} patron={p.patron} nombre={p.nombre} tamano="hero" />
        </span>
      </span>
    );
  return (
    <span className="flex h-[52px] w-10 shrink-0 items-center justify-center bg-product">
      <MiniaturaPrenda tipo={p.tipo} color={p.color} patron={p.patron} nombre={p.nombre} tamano="buscador" />
    </span>
  );
}
