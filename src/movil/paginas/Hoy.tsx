import { useAhora, useDinero, useSel } from '@/estado';
import { selCierresDelDia, selVentas } from '@/selectores';
import { sumarDias } from '@/dominio/reglas/fechas';

/**
 * Esqueleto de F2-B (PLAN 9.1.6): E1 reemplaza esta página. Muestra en crudo lo primero útil de "Hoy": ventas de
 * hoy, las últimas ventas (también las que trae el QR) y los cierres de anoche.
 */
export default function Hoy() {
  const ahora = useAhora();
  const hoy = ahora.slice(0, 10);
  const dinero = useDinero();
  const { filas, totales } = useSel(selVentas, { desde: hoy, hasta: hoy });
  const cierres = useSel(selCierresDelDia, { fecha: sumarDias(hoy, -1) });
  return (
    <section data-testid="app-hoy" style={{ padding: 16 }}>
      <h1 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: 18 }}>Hoy</h1>
      <p data-testid="app-ventas-hoy">
        {dinero(totales.netas)} en {totales.numVentas} ventas
      </p>
      <h2 style={{ fontSize: 14 }}>Últimas ventas</h2>
      <ul data-testid="app-ultimas-ventas">
        {filas.slice(0, 5).map((v) => (
          <li key={v.id} data-venta={v.id}>
            {v.numero} · {dinero(v.total)}
          </li>
        ))}
      </ul>
      <h2 style={{ fontSize: 14 }}>Cierres de anoche</h2>
      <ul>
        {cierres.map((c) => (
          <li key={c.localId}>
            {c.localNombre}: {c.diferencia === null ? 'sin cierre' : c.diferencia === 0 ? 'cuadró' : dinero(c.diferencia)}
          </li>
        ))}
      </ul>
    </section>
  );
}
