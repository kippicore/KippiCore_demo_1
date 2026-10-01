import { Pencil, Shirt } from 'lucide-react';
import { useState } from 'react';
import type { Importacion, LineaImportacion } from '@/dominio/tipos';
import { fobLinea, unidadesLinea } from '@/dominio/reglas/costeo';
import { copDeCentavos } from '@/dominio/reglas/dinero';
import { indiceEstado } from '@/dominio/reglas/importaciones';
import { useHoy, usePuede, useSel } from '@/estado';
import { entero } from '@/lib/formato';
import { dineroOrigen } from '@/lib/moneda';
import { selTasaVigente } from '@/selectores';
import { Button, Drawer, EmptyState, MuestraColor, ParesDatos, Table, type ColumnaTabla } from '@/ui';
import { selCatalogoPedido, type ProductoPedido } from '../selectores';
import { MontoOrigen } from './Montos';

/** Líneas del pedido: referencia, precio de fábrica, unidades por talla y color; el detalle abre en un cajón. */
export function TabLineas({ imp, alEditar }: { imp: Importacion; alEditar: () => void }) {
  const hoy = useHoy();
  const puede = usePuede();
  const catalogo = useSel(selCatalogoPedido, { proveedorId: null });
  const tasa = useSel(selTasaVigente, { moneda: imp.moneda, fecha: hoy });
  const [abierta, setAbierta] = useState<string | null>(null);
  const porId = new Map(catalogo.map((p) => [p.productoId, p]));
  const linea = imp.lineas.find((l) => l.id === abierta) ?? null;
  const editable = puede('importacion.editar') && indiceEstado(imp.estado) < indiceEstado('saldo_pagado');

  const resumenTallas = (l: LineaImportacion, p: ProductoPedido | undefined) => {
    if (!p) return '';
    return p.tallas
      .map((t) => ({
        t,
        n: p.colores.reduce((a, c) => a + (l.cantidades[p.variantes[`${t}|${c.id}`] ?? ''] ?? 0), 0),
      }))
      .filter((x) => x.n > 0)
      .map((x) => `${x.t} ${entero(x.n)}`)
      .join(' · ');
  };

  const columnas: ColumnaTabla<LineaImportacion>[] = [
    {
      id: 'ref',
      encabezado: 'Referencia',
      celda: (l) => {
        const p = porId.get(l.productoId);
        return (
          <span>
            <span className="font-semibold text-ink">{p?.nombre ?? 'Referencia'}</span>
            <span className="block t-small text-muted">{p?.referencia}</span>
          </span>
        );
      },
      ancho: 260,
    },
    {
      id: 'fob',
      encabezado: 'Precio de fábrica',
      numerica: true,
      celda: (l) => <span className="num">{dineroOrigen(l.costoUnitarioOrigen, imp.moneda)}</span>,
      ordenar: (l) => l.costoUnitarioOrigen,
      ancho: 150,
    },
    {
      id: 'unidades',
      encabezado: 'Prendas',
      numerica: true,
      celda: (l) => <span className="num">{entero(unidadesLinea(l))}</span>,
      ordenar: (l) => unidadesLinea(l),
      ancho: 90,
    },
    {
      id: 'tallas',
      encabezado: 'Por talla',
      celda: (l) => <span className="t-body text-ink-2">{resumenTallas(l, porId.get(l.productoId))}</span>,
      truncar: true,
    },
    {
      id: 'total',
      encabezado: 'Valor de fábrica',
      numerica: true,
      celda: (l) => (
        <MontoOrigen
          centavos={fobLinea(l)}
          moneda={imp.moneda}
          cop={copDeCentavos(fobLinea(l), tasa)}
          apilado
        />
      ),
      ordenar: (l) => fobLinea(l),
      ancho: 170,
    },
  ];
  const totalFob = imp.lineas.reduce((a, l) => a + fobLinea(l), 0);
  const totalUnidades = imp.lineas.reduce((a, l) => a + unidadesLinea(l), 0);
  const p = linea ? porId.get(linea.productoId) : undefined;

  return (
    <div className="space-y-4" data-testid="tab-lineas">
      <div className="flex items-center justify-between gap-4">
        <p className="t-body text-muted">Lo que se le pidió a la fábrica, por referencia, talla y color.</p>
        {editable && (
          <Button variante="secondary" icono={Pencil} onClick={alEditar} data-testid="editar-lineas">
            Editar líneas
          </Button>
        )}
      </div>
      <Table
        columnas={columnas}
        filas={imp.lineas}
        clave={(l) => l.id}
        sustantivo={['línea', 'líneas']}
        porPagina={0}
        alAbrir={(l) => setAbierta(l.id)}
        totales={{
          unidades: <span className="num">{entero(totalUnidades)}</span>,
          total: (
            <MontoOrigen
              centavos={totalFob}
              moneda={imp.moneda}
              cop={copDeCentavos(totalFob, tasa)}
              apilado
            />
          ),
        }}
        vacio={
          <EmptyState
            tamano="tabla"
            icono={Shirt}
            titulo="Este pedido aún no tiene líneas"
            texto="Agrega las referencias que le vas a pedir a la fábrica."
          />
        }
      />
      <Drawer
        abierto={linea !== null}
        alCambiar={(a) => !a && setAbierta(null)}
        eyebrow="Línea del pedido"
        titulo={p?.referencia ?? ''}
        ancho="lg"
        data-testid="detalle-linea"
      >
        {linea && p && (
          <>
            <ParesDatos
              pares={[
                ['Prenda', p.nombre],
                ['Precio de fábrica', dineroOrigen(linea.costoUnitarioOrigen, imp.moneda)],
                ['Prendas pedidas', entero(unidadesLinea(linea))],
                [
                  'Valor de fábrica',
                  <MontoOrigen
                    key="v"
                    centavos={fobLinea(linea)}
                    moneda={imp.moneda}
                    cop={copDeCentavos(fobLinea(linea), tasa)}
                  />,
                ],
              ]}
            />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" data-testid="matriz-linea">
                <caption className="sr-only">Unidades por color y talla</caption>
                <thead>
                  <tr>
                    <th scope="col" className="pb-2 text-left t-eyebrow text-ink-2">
                      Color
                    </th>
                    {p.tallas.map((t) => (
                      <th key={t} scope="col" className="pb-2 text-right t-eyebrow text-ink-2">
                        {t}
                      </th>
                    ))}
                    <th scope="col" className="pb-2 text-right t-eyebrow text-ink-2">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {p.colores.map((c) => {
                    const fila = p.tallas.map(
                      (t) => linea.cantidades[p.variantes[`${t}|${c.id}`] ?? ''] ?? 0,
                    );
                    const sumaFila = fila.reduce((a, n) => a + n, 0);
                    if (sumaFila === 0) return null;
                    return (
                      <tr key={c.id} className="border-t border-line-soft">
                        <th scope="row" className="py-2 text-left font-normal">
                          <span className="inline-flex items-center gap-2 t-body">
                            <MuestraColor hex={c.hex} nombre={c.nombre} patron={c.patron} />
                            {c.nombre}
                          </span>
                        </th>
                        {fila.map((n, i) => (
                          <td key={p.tallas[i]} className="py-2 text-right t-body num text-ink">
                            {n > 0 ? entero(n) : <span className="text-subtle">—</span>}
                          </td>
                        ))}
                        <td className="py-2 text-right t-body num font-bold text-ink">{entero(sumaFila)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
