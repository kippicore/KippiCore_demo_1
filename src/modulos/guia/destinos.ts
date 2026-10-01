import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { propagarHoy, rutas } from '@/app/rutas';
import { estadoActual, overrideHoy, useAhora, useEstadoDominio, useHoy, useSel } from '@/estado';
import { abrirAppDueno } from '@/movil/publico';
import { selFlujoProyectado, selNarrativa } from '@/selectores';

/**
 * A dónde lleva cada ítem de "Prueba esto" y de "Para ir más lejos" (PLAN 2.4). Todo se construye con `rutas.ts` y
 * las entidades se resuelven con `selNarrativa()`: nunca un número de importación ni un id escritos a mano. Si la
 * entidad guionada ya no existe (p. ej. la importación ya avanzó y no hay otra), el ítem lleva a la lista del módulo.
 */
export interface Destino {
  /** Qué pasa al elegirlo (navegar, abrir otra pestaña o abrir el modal de la app). */
  ir: () => void;
}

/** Cantidad de camisas que precarga el traslado del ítem 2. */
const CAMISAS_A_TRASLADAR = 3;

export function useDestinos(): Record<string, Destino> {
  const navegar = useNavigate();
  const { pathname, search } = useLocation();
  const hoy = useHoy();
  const ahora = useAhora();
  const estado = useEstadoDominio();
  const n = useSel(selNarrativa, { hoy });

  const aRuta = useCallback((url: string): Destino => ({ ir: () => navegar(url) }), [navegar]);
  const enOtraPestana = useCallback(
    (url: string): Destino => ({ ir: () => window.open(propagarHoy(`${window.location.origin}${url}`, overrideHoy()), '_blank', 'noopener') }),
    [],
  );

  return useMemo(() => {
    const producto = n.productoCritico ? estado.productos[n.productoCritico] : undefined;
    const importacion = n.importacionEnPuerto ? estado.importaciones[n.importacionEnPuerto] : undefined;
    const vendedor = n.vendedorPersona ? estado.empleados[n.vendedorPersona] : undefined;
    // El portal lo ve la agente de aduanas: la importación que hoy está esperando su reporte.
    const paraPortal = n.importacionRetrasada ?? n.importacionEnTransito ?? n.importacionEnPuerto;
    const importacionPortal = paraPortal ? estado.importaciones[paraPortal] : undefined;

    const traslado =
      producto && n.varianteCritica && n.localSurtido && n.localEscasez
        ? rutas.producto(producto.referencia, {
            trasladar: { origen: n.localSurtido, destino: n.localEscasez, varianteId: n.varianteCritica, cantidad: CAMISAS_A_TRASLADAR },
          })
        : rutas.inventario();

    const d: Record<string, Destino> = {
      venta: aRuta(rutas.pos()),
      traslado: aRuta(traslado),
      importacion: aRuta(importacion ? rutas.importacion(importacion.numero, { resaltar: 'cambiar-estado' }) : rutas.importaciones()),
      // La semana se calcula al elegir (el flujo de 90 días es costoso y no hace falta hasta entonces).
      flujo: {
        ir: () => {
          const e = estadoActual();
          const flujo = e ? selFlujoProyectado(e, { dias: 90, hoy, hora: ahora.slice(11, 16) }) : null;
          navegar(rutas.flujo({ semana: flujo?.semanaPuntoBajo.lunes || null }));
        },
      },
      'costo-empleado': aRuta(vendedor ? rutas.empleadoPestana(vendedor.slug, 'costo') : rutas.comparativoModalidades()),
      // El selector de rol vive en la barra superior: se resalta sin cambiar de pantalla (?resaltar=rol, 5.5.1).
      rol: {
        ir: () => {
          const q = new URLSearchParams(search);
          q.set('resaltar', 'rol');
          navegar({ pathname, search: `?${q.toString()}` });
        },
      },
      pedido: aRuta(rutas.sugerirPedido({ proveedor: n.proveedorSugerencia, desde: 'guia' })),
      celular: { ir: abrirAppDueno },
      whatsapp: aRuta(rutas.canalWhatsapp({ escenario: 'consulta-talla' })),
      moneda: aRuta(rutas.importaciones({ resaltar: 'moneda' })),
      contador: aRuta(rutas.reportes({ reporte: 'contador' })),
      'tabla-dinamica': aRuta(rutas.tablaDinamica()),
      tienda: enOtraPestana(rutas.tienda()),
      portal: enOtraPestana(importacionPortal ? rutas.seguimiento(importacionPortal.numero) : rutas.importaciones()),
    };
    return d;
  }, [n, estado, aRuta, enOtraPestana, navegar, pathname, search, hoy, ahora]);
}
