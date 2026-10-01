import { forwardRef, useMemo, useState } from 'react';
import { FolderOpen, TriangleAlert } from 'lucide-react';
import { atajosRango, BotonDocumentoPdf, BotonExportar, Button, EmptyState, FilasEsqueleto, NotaLegal, Retrasado, Select, Skeleton } from '@/ui';
import { REPORTES, type IdReporte } from '@/reportes';
import { useEstadoDominio, useMoneda, useSel } from '@/estado';
import { fecha } from '@/lib/formato';
import { nombreEmpleado, selLiquidaciones, selProductosActivos } from '@/selectores';
import { empleadosDeLiquidacion, estaVacio, grupoDe, liquidacionParaDesprendibles, opcionesLiquidacion } from '../calculos';
import type { FiltrosPantalla, VistaPrevia as Vista } from '../hooks';
import { usaFiltro } from '../hooks';
import { TEXTOS, TEXTOS_REPORTE } from '../textos';
import { VistaPrevia } from './VistaPrevia';

interface Props {
  id: IdReporte;
  f: FiltrosPantalla;
  vista: Vista;
}

/**
 * El reporte abierto: qué trae, para qué sirve, con qué filtros sale, las primeras filas y los totales tal como
 * quedarán en el archivo, y los botones PDF y Excel (`<BotonExportar>` con los MISMOS filtros que la vista previa).
 */
export const PanelReporte = forwardRef<HTMLElement, Props>(function PanelReporte({ id, f, vista }, ref) {
  const def = REPORTES[id];
  const { moneda } = useMoneda();
  const grupo = grupoDe(id);
  const vacio = vista.estado === 'listo' && estaVacio(vista.hojas);
  const textoFiltros = useMemo(() => {
    const partes: string[] = [];
    if (usaFiltro(id, 'rango')) partes.push(f.rango.desde === f.rango.hasta ? fecha(f.rango.desde) : `Del ${fecha(f.rango.desde)} al ${fecha(f.rango.hasta)}`);
    else partes.push(`Corte al ${fecha(f.hoy)}`);
    if (usaFiltro(id, 'local')) partes.push(f.opcionesLocal.find((o) => o.valor === f.localId)?.etiqueta ?? 'Todos los locales');
    partes.push(`Cifras en ${moneda}`);
    return partes.join(' · ');
  }, [id, f.rango, f.hoy, f.localId, f.opcionesLocal, moneda]);

  return (
    <section ref={ref} aria-label={def.titulo} data-reporte={id} data-testid="reportes-panel" className="scroll-mt-28 border border-line bg-surface p-6 desk:p-8">
      <header className="flex flex-col gap-4 desk:flex-row desk:items-start desk:justify-between desk:gap-8">
        <div className="min-w-0 max-w-[62ch]">
          <p className="t-eyebrow text-ink-2">{id === 'contador' ? TEXTOS.contador.eyebrow : (grupo?.titulo ?? 'Reporte')}</p>
          <h2 className="mt-2 t-h2 text-ink" data-testid="reportes-panel-titulo">
            {def.titulo}
          </h2>
          <p className="mt-2 t-body text-ink-2">{TEXTOS_REPORTE[id].sencillo}</p>
          <p className="mt-2 t-small text-muted">
            <span className="font-semibold text-ink-2">{TEXTOS.panel.sirvePara}:</span> {TEXTOS_REPORTE[id].sirvePara}
          </p>
        </div>
        {!vacio && vista.estado !== 'error' && (
          <div className="flex shrink-0 flex-col gap-2 desk:items-end" data-testid="reportes-descargas">
            <BotonExportar reporte={id} filtros={filtrosDeExportacion(id, f)} tamano="md" />
            <p className="t-small text-muted">Se descarga con los filtros de abajo.</p>
          </div>
        )}
      </header>

      <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-4 border-y border-line-soft py-4" data-testid="reportes-panel-filtros">
        <p className="t-label text-ink" data-testid="reportes-filtros-texto">
          {textoFiltros}
        </p>
        {!usaFiltro(id, 'rango') && <p className="t-small text-muted">{TEXTOS.panel.sinFechas}</p>}
        {usaFiltro(id, 'producto') && <SelectorReferencia f={f} />}
        {usaFiltro(id, 'liquidacion') && <SelectorPeriodoNomina f={f} />}
      </div>

      <div className="mt-6">
        {vista.estado === 'error' ? (
          <EmptyState
            tamano="tabla"
            icono={TriangleAlert}
            titulo={TEXTOS.panel.errorTitulo}
            texto={TEXTOS.panel.errorTexto}
            accion={
              <Button variante="secondary" onClick={vista.reintentar}>
                {TEXTOS.panel.reintentar}
              </Button>
            }
          />
        ) : vista.estado === 'cargando' && vista.hojas.length === 0 ? (
          <div data-testid="reportes-cargando" aria-busy="true" aria-label="Preparando la vista previa">
            <Retrasado>
              <Skeleton className="mb-3 h-6 w-48" />
              <FilasEsqueleto filas={6} columnas={6} alto={36} />
            </Retrasado>
          </div>
        ) : vacio ? (
          <div className="border border-line-soft" data-testid="reportes-vacio">
            <EmptyState
              tamano="tabla"
              icono={FolderOpen}
              titulo={TEXTOS.panel.vacioTitulo}
              texto={TEXTOS.panel.vacioTexto}
              accion={
                usaFiltro(id, 'rango') ? (
                  <Button
                    variante="secondary"
                    onClick={() => {
                      const r = atajosRango(f.hoy).find((a) => a.id === '90d')?.rango;
                      if (r) f.cambiarRango(r);
                    }}
                  >
                    {TEXTOS.panel.vacioAccion}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <p className="mb-3 t-eyebrow text-ink-2">{TEXTOS.panel.vistaPrevia}</p>
            <VistaPrevia key={id} hojas={vista.hojas} cargando={vista.estado === 'cargando'} />
          </>
        )}
      </div>

      {id === 'nomina' && !vacio && vista.estado !== 'error' && <Desprendibles f={f} />}
      {def.notaLegal && <NotaLegal tipo={def.notaLegal} className="mt-6" />}
    </section>
  );
});

/** Lo que `<BotonExportar>` recibe: los mismos filtros de la vista previa. */
function filtrosDeExportacion(id: IdReporte, f: FiltrosPantalla) {
  return {
    desde: f.filtros.desde,
    hasta: f.filtros.hasta,
    localId: f.filtros.localId,
    productoId: usaFiltro(id, 'producto') ? f.productoId : null,
    liquidacionId: f.filtros.liquidacionId ?? null,
  };
}

function SelectorReferencia({ f }: { f: FiltrosPantalla }) {
  const productos = useSel(selProductosActivos);
  return (
    <Select
      etiqueta="Referencia"
      valor={f.productoId}
      alCambiar={f.cambiarProducto}
      opciones={productos.map((p) => ({ valor: p.id, etiqueta: `${p.referencia} · ${p.nombre}` }))}
      className="w-[400px]"
      data-testid="reportes-select-referencia"
    />
  );
}

function SelectorPeriodoNomina({ f }: { f: FiltrosPantalla }) {
  const liquidaciones = useSel(selLiquidaciones);
  return (
    <Select
      etiqueta="Periodo de nómina"
      valor={f.liquidacionId}
      alCambiar={f.cambiarLiquidacion}
      opciones={opcionesLiquidacion(liquidaciones)}
      className="w-[320px]"
      data-testid="reportes-select-periodo"
    />
  );
}

/** Desprendibles de pago del periodo elegido (plantilla PDF única). */
function Desprendibles({ f }: { f: FiltrosPantalla }) {
  const e = useEstadoDominio();
  const liquidaciones = useSel(selLiquidaciones);
  const liq = liquidacionParaDesprendibles(liquidaciones, f.liquidacionId, f.rango, f.localId);
  const empleados = liq ? empleadosDeLiquidacion(liq, f.localId) : [];
  const [elegido, setElegido] = useState<string | null>(null);
  if (!liq || empleados.length === 0) return null;
  const empleadoId = elegido && empleados.includes(elegido) ? elegido : (empleados[0] ?? '');
  return (
    <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-3 border border-line-soft bg-surface-2 p-4" data-testid="reportes-desprendibles">
      <div className="min-w-0">
        <p className="t-label font-bold text-ink">Desprendibles de {liq.periodo.etiqueta}</p>
        <p className="mt-1 t-small text-muted">Elige a quién y descarga su desprendible de pago.</p>
      </div>
      <Select
        etiqueta="Empleado"
        etiquetaOculta
        valor={empleadoId}
        alCambiar={setElegido}
        opciones={empleados.map((id) => ({ valor: id, etiqueta: nombreEmpleado(e.empleados[id]) }))}
        className="w-[260px]"
        data-testid="reportes-select-empleado"
      />
      <BotonDocumentoPdf documento={{ tipo: 'desprendible', liquidacionId: liq.id, empleadoId }} etiqueta="Desprendible en PDF" tamano="md" />
    </div>
  );
}
