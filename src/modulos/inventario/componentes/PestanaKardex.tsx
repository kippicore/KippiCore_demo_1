import { CircleAlert, CircleCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Id, Producto, TipoMovimiento } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { usePuede, useHoy, useSel } from '@/estado';
import { entero } from '@/lib/formato';
import { BotonExportar, BotonPildora, FranjaResumen, Select, SelectorRango, textoRango, Toolbar, type RangoFechas } from '@/ui';
import { selKardexVista, selVariantesDetalle } from '../selectores';
import { useLocalesInventario } from './comun';
import { TablaKardex } from './TablaKardex';

const GRUPOS: { valor: string; etiqueta: string; tipos: readonly TipoMovimiento[] }[] = [
  { valor: 'todos', etiqueta: 'Todos los movimientos', tipos: [] },
  { valor: 'ventas', etiqueta: 'Ventas y devoluciones', tipos: ['salida_venta', 'salida_separado', 'reingreso_separado', 'reingreso_anulacion', 'devolucion_cliente'] },
  { valor: 'traslados', etiqueta: 'Traslados', tipos: ['traslado_salida', 'traslado_entrada'] },
  { valor: 'importaciones', etiqueta: 'Entradas por importación', tipos: ['entrada_importacion'] },
  { valor: 'ajustes', etiqueta: 'Ajustes y conteos', tipos: ['ajuste_conteo', 'ajuste_manual'] },
];

/** Kárdex de la referencia: cada movimiento con su saldo en orden de aplicación; el saldo final cuadra con las existencias. */
export function PestanaKardex({ producto, resaltarId }: { producto: Producto; resaltarId: string | null }) {
  const hoy = useHoy();
  const puede = usePuede();
  const locales = useLocalesInventario();
  const variantes = useSel(selVariantesDetalle, { productoId: producto.id });
  const [localId, setLocalId] = useState<Id | 'todos'>('todos');
  const [varianteId, setVarianteId] = useState<Id | 'todas'>('todas');
  const [grupo, setGrupo] = useState('todos');
  const [rango, setRango] = useState<RangoFechas>({ desde: sumarDias(hoy, -90), hasta: hoy });

  const tipos = GRUPOS.find((g) => g.valor === grupo)?.tipos ?? [];
  const k = useSel(selKardexVista, {
    productoId: producto.id,
    varianteId: varianteId === 'todas' ? undefined : varianteId,
    localId,
    desde: rango.desde,
    hasta: rango.hasta,
    tipos: tipos.length ? tipos : undefined,
  });
  const filas = useMemo(() => [...k.filas].reverse(), [k.filas]);
  const alDia = rango.hasta >= hoy;
  const cuadra = k.saldoFinal === k.existenciasActuales;
  const nombreLocal = localId === 'todos' ? 'Todos' : (locales.find((l) => l.id === localId)?.nombre ?? localId);
  const nombreVariante = varianteId === 'todas' ? 'Todas' : (() => {
    const f = variantes.find((x) => x.variante.id === varianteId);
    return f ? `${f.color.nombre} · ${f.variante.talla}` : '';
  })();

  return (
    <div data-testid="pestana-kardex">
      <FranjaResumen
        cifras={[
          { etiqueta: 'Saldo al inicio del rango', valor: entero(k.saldoInicial) },
          { etiqueta: 'Entradas', valor: entero(k.entradas) },
          { etiqueta: 'Salidas', valor: entero(k.salidas) },
          { etiqueta: 'Saldo final', valor: <span data-testid="kardex-saldo-final">{entero(k.saldoFinal)}</span> },
        ]}
      />
      {alDia && (
        <p className={`mt-3 flex items-center gap-2 t-small ${cuadra ? 'text-success' : 'text-warning'}`} data-testid="kardex-cuadre" data-cuadra={cuadra}>
          {cuadra ? <CircleCheck size={16} aria-hidden /> : <CircleAlert size={16} aria-hidden />}
          {cuadra
            ? `El saldo del kárdex (${entero(k.saldoFinal)}) cuadra con las existencias de hoy (${entero(k.existenciasActuales)}).`
            : `El saldo del kárdex (${entero(k.saldoFinal)}) no coincide con las existencias de hoy (${entero(k.existenciasActuales)}).`}
        </p>
      )}
      <div className="mt-4">
        <TablaKardex
          filas={filas}
          mostrarSaldo
          mostrarProducto={false}
          verCostos={puede('ver.costos')}
          resaltarId={resaltarId}
          totales={{ entradas: k.entradas, salidas: k.salidas }}
          barra={
            <Toolbar
              filtros={
                <>
                  <BotonPildora etiqueta="Local" valor={nombreLocal} anchoPanel={260}>
                    <Select
                      etiqueta="Local"
                      etiquetaOculta
                      valor={localId}
                      alCambiar={(v) => setLocalId(v)}
                      opciones={[{ valor: 'todos', etiqueta: 'Todos los locales' }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
                    />
                  </BotonPildora>
                  <BotonPildora etiqueta="Variante" valor={nombreVariante} anchoPanel={280}>
                    <Select
                      etiqueta="Variante"
                      etiquetaOculta
                      valor={varianteId}
                      alCambiar={(v) => setVarianteId(v)}
                      opciones={[{ valor: 'todas', etiqueta: 'Todas las variantes' }, ...variantes.map((f) => ({ valor: f.variante.id, etiqueta: `${f.color.nombre} · ${f.variante.talla}` }))]}
                    />
                  </BotonPildora>
                  <BotonPildora etiqueta="Movimiento" valor={GRUPOS.find((g) => g.valor === grupo)?.etiqueta} anchoPanel={280}>
                    <Select etiqueta="Movimiento" etiquetaOculta valor={grupo} alCambiar={setGrupo} opciones={GRUPOS.map((g) => ({ valor: g.valor, etiqueta: g.etiqueta }))} />
                  </BotonPildora>
                  <BotonPildora etiqueta="Fechas" valor={textoRango(rango, hoy)} anchoPanel={720}>
                    <SelectorRango soloPanel hoy={hoy} valor={rango} alCambiar={setRango} />
                  </BotonPildora>
                </>
              }
              derecha={<BotonExportar reporte="kardex" filtros={{ productoId: producto.id, desde: rango.desde, hasta: rango.hasta }} formatos={['excel']} menu />}
            />
          }
        />
      </div>
    </div>
  );
}
