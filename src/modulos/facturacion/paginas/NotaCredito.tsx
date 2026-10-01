import { useMemo } from 'react';
import { FileText, ShoppingBag } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { ESTADOS_FACTURA } from '@/config/estados';
import { useSel } from '@/estado';
import { BadgeEstado, BotonDocumentoPdf, BotonEnlace, EmptyState, EncabezadoPagina } from '@/ui';
import { useAvanceSimulado } from '../avance';
import { ORDEN_ESTADOS } from '../calculos';
import { HojaNota } from '../componentes/HojaDocumento';
import { Recorrido } from '../componentes/Recorrido';
import { selVistaNota } from '../selectores';
import { TEXTOS } from '../textos';

/** /panel/facturacion/notas-credito/:notaId — la nota crédito con su vista previa y el documento que afecta. */
export default function NotaCredito() {
  const { notaId } = useParamsRuta('notaCredito');
  const vista = useSel(selVistaNota, { notaId });
  const migasBase = [
    { texto: 'Inicio', a: rutas.inicio() },
    { texto: 'Facturación', a: rutas.facturacion() },
  ];
  useAvanceSimulado(vista ? [vista.nota] : [], 'nota');
  const estado = vista ? vista.nota.estado : 'generada';
  // Las notas no tienen historial propio: cada paso alcanzado se muestra con la hora de la nota.
  const historial = useMemo(
    () => (vista ? ORDEN_ESTADOS.filter((e) => ORDEN_ESTADOS.indexOf(e) <= ORDEN_ESTADOS.indexOf(estado)).map((e) => ({ estado: e, ts: vista.nota.ts })) : []),
    [vista, estado],
  );

  if (!vista) {
    return (
      <div data-testid="pagina-nota-credito">
        <EncabezadoPagina migas={[...migasBase, { texto: 'Nota crédito' }]} titulo="Nota crédito" />
        <div className="mt-8 border border-line bg-surface">
          <EmptyState
            icono={FileText}
            titulo={TEXTOS.detalle.noExisteTitulo}
            texto={TEXTOS.detalle.noExisteTexto}
            accion={<BotonEnlace to={rutas.facturacion({ tipo: undefined })}>{TEXTOS.detalle.volver}</BotonEnlace>}
          />
        </div>
      </div>
    );
  }

  const { nota, factura, venta } = vista;
  return (
    <div data-testid="pagina-nota-credito" data-estado={estado}>
      <EncabezadoPagina
        migas={[...migasBase, { texto: nota.numero }]}
        eyebrow="Nota crédito electrónica · simulación"
        titulo={nota.numero}
        insignia={<BadgeEstado estado={ESTADOS_FACTURA[estado]} />}
        acciones={
          <>
            <BotonDocumentoPdf documento={{ tipo: 'nota-credito', notaId: nota.id }} tamano="md" />
            {factura && (
              <BotonEnlace to={rutas.factura(factura.id)} variante="secondary" icono={FileText}>
                Ver {factura.numero}
              </BotonEnlace>
            )}
            {venta && (
              <BotonEnlace to={rutas.venta(venta.id)} variante="secondary" icono={ShoppingBag}>
                Ver venta
              </BotonEnlace>
            )}
          </>
        }
      />
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6">
        <HojaNota vista={vista} estado={estado} />
        <aside className="flex flex-col gap-4" aria-label="Detalle de la nota crédito">
          <Recorrido estado={estado} historial={historial} />
        </aside>
      </div>
    </div>
  );
}
