import { useState } from 'react';
import type { Id } from '@/dominio/tipos';
import type { FiltrosReporte, IdReporte } from '@/reportes/tipos';
import { emitirUI, useAhora, useEstadoDominio, useFiltroLocal, useMarca, useMoneda, useRolActivo, useUsuarioActivo } from '@/estado';
import { descargarBlob } from '@/lib/descargar';

/**
 * `<BotonExportar reporte="ventas" filtros={…} />` (PLAN 5.7, 5.12): exporta con la DEFINICIÓN ÚNICA de
 * src/reportes/definiciones.ts en la moneda activa, descarga el archivo y emite `pdf_generado` o
 * `excel_generado` con `{ reporte }` (6.18). Implementación funcional de F2-B; F2-C le da el diseño (8.7.1).
 * jsPDF y ExcelJS se cargan solo al hacer clic.
 */
export interface PropsBotonExportar {
  reporte: IdReporte;
  /** Filtros del reporte; lo que falte se completa con el contexto (mes en curso, local activo, rol). */
  filtros?: Partial<Pick<FiltrosReporte, 'desde' | 'hasta' | 'localId' | 'productoId' | 'liquidacionId'>>;
  formatos?: readonly ('pdf' | 'excel')[];
  /** Texto del botón (por defecto "Exportar a PDF" / "Exportar a Excel"). */
  etiqueta?: (formato: 'pdf' | 'excel') => string;
}

export function BotonExportar({ reporte, filtros, formatos = ['pdf', 'excel'], etiqueta }: PropsBotonExportar) {
  const estado = useEstadoDominio();
  const marca = useMarca();
  const { moneda, tasa } = useMoneda();
  const ahora = useAhora();
  const localActivo = useFiltroLocal();
  const rol = useRolActivo();
  const { empleado } = useUsuarioActivo();
  const [preparando, setPreparando] = useState<'pdf' | 'excel' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportar = async (formato: 'pdf' | 'excel') => {
    setPreparando(formato);
    setError(null);
    try {
      const { exportarReporte } = await import('@/reportes/exportar');
      const hoy = ahora.slice(0, 10);
      const localId: Id | 'todos' = filtros?.localId ?? localActivo;
      const f: FiltrosReporte = {
        desde: filtros?.desde ?? `${hoy.slice(0, 7)}-01`,
        hasta: filtros?.hasta ?? hoy,
        localId,
        hoy,
        ahora,
        productoId: filtros?.productoId ?? null,
        liquidacionId: filtros?.liquidacionId ?? null,
        rol,
        vendedorId: rol === 'vendedor' ? (empleado?.id ?? null) : null,
      };
      const archivo = await exportarReporte(reporte, estado, f, formato, {
        marca: marca.nombre,
        descriptor: marca.descriptor,
        moneda,
        tasa,
        nombreLocal: localId === 'todos' ? 'Todos los locales' : (estado.locales[localId]?.nombre ?? localId),
      });
      descargarBlob(new Blob([archivo.datos], { type: archivo.tipo }), archivo.nombre);
      emitirUI(formato === 'pdf' ? 'pdf_generado' : 'excel_generado', { reporte });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo preparar el archivo. Intenta de nuevo.');
    } finally {
      setPreparando(null);
    }
  };

  return (
    <span data-testid={`exportar-${reporte}`} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      {formatos.map((fmt) => (
        <button key={fmt} type="button" disabled={preparando !== null} onClick={() => void exportar(fmt)} data-formato={fmt}>
          {preparando === fmt ? 'Preparando el archivo…' : (etiqueta?.(fmt) ?? (fmt === 'pdf' ? 'Exportar a PDF' : 'Exportar a Excel'))}
        </button>
      ))}
      {error && (
        <span role="alert" style={{ color: '#9b2c2c', fontSize: 13 }}>
          {error}
        </span>
      )}
    </span>
  );
}
