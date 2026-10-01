import { FileSpreadsheet } from 'lucide-react';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useParamsRuta } from '@/app/useParamsRuta';
import { emitirUI, useAhora, useDinero, useHoy, useMarca, useSel } from '@/estado';
import { descargarBlob, nombreArchivo } from '@/lib/descargar';
import { crearLibroExcel } from '@/lib/exportar/excel';
import { entero, fechaHora } from '@/lib/formato';
import { DIMENSIONES, MEDIDAS, selLocalesQueVenden, selPivote, type Dimension } from '@/selectores';
import { NOMBRES_CATEGORIA } from '@/seed/catalogo';
import { Button } from '@/ui';
import {
  columnasVisibles,
  descripcionPivote,
  etiquetaExcel,
  FILTROS_PIVOTE_INICIALES,
  hojaPivote,
  opcionesDePivote,
  prepararPivote,
  textoFiltrosPivote,
  type ConfigPivote,
  type FiltrosPivote,
} from '../calculos';
import { EncabezadoAnalisis } from '../componentes/EncabezadoAnalisis';
import { LimiteErrores } from '../componentes/Piezas';
import { ConstructorPivote, GraficoResultado, MAX_COLUMNAS, SinResultados, TablaResultado } from '../componentes/Pivote';
import { EJEMPLOS_PIVOTE } from '../textos';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CONFIG_INICIAL: ConfigPivote = { filas: ['mes'], columna: 'local', medida: 'ventas' };

/**
 * Tabla dinámica (PRD 7.12): el dueño elige las filas, las columnas y la medida entre 15 dimensiones y 7 medidas, y
 * la tabla se arma al instante con sus totales, un gráfico asociado y exportación a Excel. Los totales de las
 * medidas que no se suman (número de ventas, ticket, margen %) se recalculan con las ventas de cada fila y columna.
 * Emite `tabla_dinamica_modificada` al cambiar filas, columnas o medida y `excel_generado` con `{ reporte: 'pivote' }`.
 */
export default function TablaDinamica() {
  const { vista } = useParamsRuta('tablaDinamica');
  const hoy = useHoy();
  const ahora = useAhora();
  const d = useDinero();
  const marca = useMarca();
  const locales = useSel(selLocalesQueVenden);

  // `?vista=<ejemplo>` abre la tabla con ese ejemplo armado.
  const inicial = useMemo(() => EJEMPLOS_PIVOTE.find((e) => e.id === vista) ?? null, [vista]);
  const [config, setConfig] = useState<ConfigPivote>(inicial ? { filas: inicial.filas, columna: inicial.columnas[0] ?? null, medida: inicial.medida } : CONFIG_INICIAL);
  const [filtros, setFiltros] = useState<FiltrosPivote>(FILTROS_PIVOTE_INICIALES);
  const [ejemplo, setEjemplo] = useState<string | null>(inicial?.id ?? null);
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState<string | null>(null);

  const cambiarConfig = useCallback((c: ConfigPivote, deEjemplo: string | null = null) => {
    setConfig(c);
    setEjemplo(deEjemplo);
    emitirUI('tabla_dinamica_modificada', { filas: c.filas.join(','), columnas: c.columna ?? '', medida: c.medida });
  }, []);

  // El resultado se calcula de forma diferida: los controles responden de inmediato aunque la tabla tarde unos milisegundos.
  const opciones = useMemo(() => opcionesDePivote(config, filtros, hoy), [config, filtros, hoy]);
  const opcionesDif = useDeferredValue(opciones);
  const calculando = opcionesDif !== opciones;
  const resultado = useSel(selPivote, opcionesDif);
  const configDif = useMemo<ConfigPivote>(() => ({ filas: opcionesDif.filas, columna: opcionesDif.columnas[0] ?? null, medida: opcionesDif.medida }), [opcionesDif]);
  const prep = useMemo(() => prepararPivote(resultado, opcionesDif.filas, opcionesDif.columnas), [resultado, opcionesDif]);
  const { visibles, ocultas } = useMemo(() => columnasVisibles(prep, MAX_COLUMNAS), [prep]);

  const nombresLocales = useMemo(() => locales.map((l) => l.nombre), [locales]);
  const nombresCategorias = useMemo(() => Object.values(NOMBRES_CATEGORIA), []);
  const hayFiltros = filtros.periodo !== 'todo' || filtros.local !== 'todos' || filtros.categoria !== 'todas';

  const exportar = async () => {
    setExportando(true);
    setErrorExportar(null);
    try {
      const nombresDims = prep.filasDims.map((x: Dimension) => DIMENSIONES[x]);
      const datos = await crearLibroExcel({
        marca: marca.nombre,
        titulo: `Tabla dinámica · ${descripcionPivote(configDif)}`,
        filtros: textoFiltrosPivote(filtros),
        moneda: d.moneda,
        generado: `Generado el ${fechaHora(ahora)}`,
        hojas: [hojaPivote(prep, nombresDims, MEDIDAS[prep.medida], d.convertir, etiquetaExcel)],
      });
      descargarBlob(new Blob([datos], { type: MIME_XLSX }), nombreArchivo(`Tabla dinamica ${descripcionPivote(configDif)}`, hoy, 'xlsx'));
      emitirUI('excel_generado', { reporte: 'pivote' });
    } catch (e) {
      setErrorExportar(e instanceof Error ? e.message : 'No se pudo preparar el archivo. Intenta de nuevo.');
    } finally {
      setExportando(false);
    }
  };

  const intercambiar = () => {
    const c = config.columna;
    const f = config.filas[0];
    if (!c || !f || config.filas.length !== 1) return;
    cambiarConfig({ ...config, filas: [c], columna: f });
  };

  const sinFilas = prep.filas.length === 0;
  return (
    <>
      <EncabezadoAnalisis
        titulo="Tabla dinámica"
        subtitulo="Cruza tus ventas como quieras: elige qué ver hacia abajo, hacia el lado y qué medir. Se arma al instante."
        migaActual="Tabla dinámica"
        acciones={
          <div className="flex items-center gap-3">
            {errorExportar && (
              <span role="alert" className="t-small text-danger">
                {errorExportar}
              </span>
            )}
            <Button variante="secondary" icono={FileSpreadsheet} cargando={exportando} disabled={sinFilas} onClick={() => void exportar()} data-testid="pivote-exportar">
              {exportando ? 'Preparando…' : 'Exportar a Excel'}
            </Button>
          </div>
        }
      />

      <div className="mt-8 flex flex-col gap-6">
        <ConstructorPivote
          config={config}
          filtros={filtros}
          alCambiarConfig={(c) => cambiarConfig(c)}
          alCambiarFiltros={setFiltros}
          locales={nombresLocales}
          categorias={nombresCategorias}
          ejemplo={ejemplo}
          alElegirEjemplo={(id) => {
            const e = EJEMPLOS_PIVOTE.find((x) => x.id === id);
            if (e) cambiarConfig({ filas: e.filas, columna: e.columnas[0] ?? null, medida: e.medida }, id);
          }}
          alIntercambiar={intercambiar}
        />

        <section aria-busy={calculando} aria-label="Resultado de la tabla dinámica" className="flex flex-col gap-6" data-testid="pivote-resultado" data-calculando={calculando || undefined}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="t-h2 text-ink" data-testid="pivote-titulo">
              {descripcionPivote(configDif)}
            </h2>
            <p className="t-small num text-muted" data-testid="pivote-resumen" aria-live="polite">
              {calculando ? 'Calculando…' : `${entero(prep.filas.length)} ${prep.filas.length === 1 ? 'fila' : 'filas'}${prep.columnasDims.length > 0 ? ` · ${entero(prep.columnas.length)} ${prep.columnas.length === 1 ? 'columna' : 'columnas'}` : ''}`}
            </p>
          </div>
          <div className={calculando ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {sinFilas ? (
              <SinResultados hayFiltros={hayFiltros} alQuitarFiltros={() => setFiltros(FILTROS_PIVOTE_INICIALES)} />
            ) : (
              <LimiteErrores titulo="No pudimos armar esta tabla">
                <div className="flex flex-col gap-6">
                  <GraficoResultado prep={prep} visibles={visibles} />
                  <div>
                    <TablaResultado prep={prep} visibles={visibles} />
                    {ocultas > 0 && (
                      <p className="mt-3 t-small text-muted" data-testid="pivote-ocultas">
                        Se muestran las {String(visibles.length)} columnas con más {prep.medida === 'unidades' ? 'unidades' : 'valor'} de {entero(prep.columnas.length)}; los totales incluyen todas. El Excel lleva todas las columnas.
                      </p>
                    )}
                    {!['ventas', 'ventasSinIva', 'unidades', 'margen'].includes(prep.medida) && (
                      <p className="mt-3 max-w-[72ch] t-small text-muted" data-testid="pivote-nota-no-aditiva">
                        {MEDIDAS[prep.medida]} no se suma: cada total se calcula de nuevo con todas las ventas de su fila o de su columna, por eso no es la suma de lo que ves.
                      </p>
                    )}
                  </div>
                </div>
              </LimiteErrores>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
