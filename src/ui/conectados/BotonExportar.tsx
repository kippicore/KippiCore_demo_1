import { useState } from 'react';
import type { Id } from '@/dominio/tipos';
import type { FiltrosReporte, IdReporte } from '@/reportes/tipos';
import { emitirUI, useAhora, useEstadoDominio, useFiltroLocal, useMarca, useMoneda, useRolActivo, useUsuarioActivo } from '@/estado';
import { descargarBlob } from '@/lib/descargar';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button, type TamanoBoton, type VarianteBoton } from '../primitivos/Button';
import { Icono } from '../primitivos/Icono';
import { ItemMenu, Menu } from '../primitivos/Popover';

/**
 * `<BotonExportar reporte="ventas" filtros={…} />` (PLAN 5.7, 5.12): exporta con la DEFINICIÓN ÚNICA de
 * src/reportes/definiciones.ts en la moneda activa, descarga el archivo y emite `pdf_generado` o
 * `excel_generado` con `{ reporte }` (6.18). jsPDF y ExcelJS se cargan solo al hacer clic.
 *
 * Diseño (F2-C, 8.7.1 / 8.7.13): por defecto, dos botones `secondary sm` con ícono ("PDF" · "Excel"); con
 * `menu`, un solo "Exportar" (`Download`) que abre el menú Excel / PDF (barras de herramientas). Mientras prepara:
 * spinner sin cambiar el ancho. Error junto al botón, nunca en un toast. Conserva `data-testid="exportar-<id>"` y
 * `data-formato` en cada botón o ítem.
 *
 *   <BotonExportar reporte="ventas" filtros={{ desde, hasta }} menu />
 *   <BotonExportar reporte="ventas" filtros={filtroDeLaLista} menu />        // FiltroVentas: medio, canal, cliente…
 *   <BotonExportar reporte="contador" formatos={['excel']} etiqueta={() => 'Descargar el Excel del contador'} variante="primary" />
 */
export interface PropsBotonExportar {
  reporte: IdReporte;
  /**
   * Filtros del reporte; lo que falte se completa con el contexto (mes en curso, local activo, rol). El reporte
   * `ventas` acepta además los filtros de la lista (vendedor, cliente, medio, canal, estado, prenda, texto): pásale el
   * mismo `FiltroVentas` de la pantalla. El vendedor del rol vendedor siempre es el suyo (no se puede cambiar).
   */
  filtros?: Partial<
    Pick<
      FiltrosReporte,
      'desde' | 'hasta' | 'localId' | 'productoId' | 'liquidacionId' | 'vendedorId' | 'clienteId' | 'medio' | 'canal' | 'estado' | 'texto'
    >
  >;
  formatos?: readonly ('pdf' | 'excel')[];
  /** Texto del botón (por defecto "Exportar a PDF" / "Exportar a Excel"). */
  etiqueta?: (formato: 'pdf' | 'excel') => string;
  /** Un solo botón "Exportar" con menú (barras de herramientas). */
  menu?: boolean;
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
}

export function BotonExportar({ reporte, filtros, formatos = ['pdf', 'excel'], etiqueta, menu, variante = 'secondary', tamano = 'sm' }: PropsBotonExportar) {
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
        vendedorId: rol === 'vendedor' ? (empleado?.id ?? null) : (filtros?.vendedorId ?? null),
        clienteId: filtros?.clienteId ?? null,
        medio: filtros?.medio ?? null,
        canal: filtros?.canal ?? null,
        estado: filtros?.estado ?? null,
        texto: filtros?.texto ?? null,
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

  const texto = (fmt: 'pdf' | 'excel') => etiqueta?.(fmt) ?? (fmt === 'pdf' ? 'PDF' : 'Excel');
  return (
    <span data-testid={`exportar-${reporte}`} className="inline-flex flex-wrap items-center gap-2">
      {menu ? (
        <Menu
          etiqueta="Exportar"
          ancho={220}
          disparador={
            <Button variante={variante} tamano={tamano} icono={Download} cargando={preparando !== null}>
              {preparando ? 'Preparando…' : 'Exportar'}
            </Button>
          }
        >
          {formatos.map((fmt) => (
            <ItemMenu key={fmt} icono={fmt === 'pdf' ? FileText : FileSpreadsheet} onSelect={() => void exportar(fmt)} data-testid={`exportar-${reporte}-${fmt}`}>
              <span data-formato={fmt}>{fmt === 'pdf' ? 'Exportar a PDF' : 'Exportar a Excel'}</span>
            </ItemMenu>
          ))}
        </Menu>
      ) : (
        formatos.map((fmt) => (
          <Button
            key={fmt}
            variante={variante}
            tamano={tamano}
            icono={fmt === 'pdf' ? FileText : FileSpreadsheet}
            cargando={preparando === fmt}
            disabled={preparando !== null && preparando !== fmt}
            onClick={() => void exportar(fmt)}
            data-formato={fmt}
          >
            {texto(fmt)}
          </Button>
        ))
      )}
      {error && (
        <span role="alert" className="t-small text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

/** Ícono suelto para tarjetas de reporte (decorativo). */
export function IconoExportar({ formato }: { formato: 'pdf' | 'excel' }) {
  return <Icono icono={formato === 'pdf' ? FileText : FileSpreadsheet} tamano={16} />;
}
