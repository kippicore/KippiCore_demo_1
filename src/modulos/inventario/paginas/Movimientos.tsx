import { SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Id, TipoMovimiento } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useFiltroLocal, useHoy, usePuede, useSel } from '@/estado';
import { selProductoPorReferencia } from '@/selectores';
import { rutas, type QueryDe } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { entero } from '@/lib/formato';
import { BotonExportar, BotonPildora, BuscadorProducto, Button, EncabezadoPagina, FranjaResumen, Select, SelectorRango, textoRango, Toolbar } from '@/ui';
import { DialogoAjuste } from '../componentes/DialogoAjuste';
import { PestanasModulo, useLocalesInventario } from '../componentes/comun';
import { TablaKardex } from '../componentes/TablaKardex';
import { selKardexVista } from '../selectores';
import { SUBTITULOS } from '../textos';

const GRUPOS: { valor: string; etiqueta: string; tipos: readonly TipoMovimiento[] }[] = [
  { valor: 'todos', etiqueta: 'Todos los movimientos', tipos: [] },
  { valor: 'ventas', etiqueta: 'Ventas y devoluciones', tipos: ['salida_venta', 'salida_separado', 'reingreso_separado', 'reingreso_anulacion', 'devolucion_cliente'] },
  { valor: 'traslados', etiqueta: 'Traslados', tipos: ['traslado_salida', 'traslado_entrada'] },
  { valor: 'importaciones', etiqueta: 'Entradas por importación', tipos: ['entrada_importacion'] },
  { valor: 'ajustes', etiqueta: 'Ajustes y conteos', tipos: ['ajuste_conteo', 'ajuste_manual'] },
];

type QueryMovimientos = QueryDe<'movimientos'>;

/** Kárdex general y ajustes: todos los movimientos del inventario, filtrables por referencia, local, tipo y fechas. */
export default function Movimientos() {
  const params = useParamsRuta('movimientos');
  const navegar = useNavigate();
  const hoy = useHoy();
  const puede = usePuede();
  const contexto = useFiltroLocal();
  const locales = useLocalesInventario();
  const [grupo, setGrupo] = useState('todos');
  const [ajuste, setAjuste] = useState(false);

  const producto = useSel(selProductoPorReferencia, { referencia: params.producto ?? '' });
  const localId: Id | 'todos' = params.local && locales.some((l) => l.id === params.local) ? params.local : contexto;
  const rango = { desde: params.desde ?? sumarDias(hoy, -30), hasta: params.hasta ?? hoy };
  const tipos = GRUPOS.find((g) => g.valor === grupo)?.tipos ?? [];

  const k = useSel(selKardexVista, {
    productoId: producto?.id,
    localId,
    desde: rango.desde,
    hasta: rango.hasta,
    tipos: tipos.length ? tipos : undefined,
  });
  const filas = useMemo(() => [...k.filas].reverse(), [k.filas]);

  const ir = (cambios: Partial<QueryMovimientos>) =>
    navegar(rutas.movimientos({ producto: params.producto, local: params.local, desde: params.desde, hasta: params.hasta, ...cambios }), { replace: true });

  const nombreLocal = localId === 'todos' ? 'Todos' : (locales.find((l) => l.id === localId)?.nombre ?? localId);
  const chips = [
    ...(producto ? [{ id: 'producto', texto: `Referencia: ${producto.referencia}`, alQuitar: () => ir({ producto: null }) }] : []),
    ...(params.local ? [{ id: 'local', texto: `Local: ${nombreLocal}`, alQuitar: () => ir({ local: null }) }] : []),
    ...(grupo !== 'todos' ? [{ id: 'grupo', texto: GRUPOS.find((g) => g.valor === grupo)?.etiqueta ?? '', alQuitar: () => setGrupo('todos') }] : []),
  ];

  return (
    <div className="pb-16">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: 'Movimientos' }]}
        titulo="Movimientos"
        subtitulo={SUBTITULOS.movimientos}
        acciones={
          <>
            {producto && <BotonExportar reporte="kardex" filtros={{ productoId: producto.id, desde: rango.desde, hasta: rango.hasta }} formatos={['excel']} menu />}
            {puede('inventario.ajustar') && (
              <Button icono={SlidersHorizontal} onClick={() => setAjuste(true)} data-testid="registrar-ajuste">
                Registrar ajuste
              </Button>
            )}
          </>
        }
        pestanas={<PestanasModulo />}
      />

      <FranjaResumen
        className="mt-8"
        cifras={[
          { etiqueta: 'Movimientos', valor: entero(filas.length) },
          { etiqueta: 'Entradas', valor: entero(k.entradas) },
          { etiqueta: 'Salidas', valor: entero(k.salidas) },
          { etiqueta: producto ? 'Saldo al final del rango' : 'Neto del rango', valor: entero(producto ? k.saldoFinal : k.entradas - k.salidas) },
        ]}
      />

      <div className="mt-4">
        <TablaKardex
          filas={filas}
          mostrarSaldo={!!producto}
          mostrarProducto={!producto}
          verCostos={puede('ver.costos')}
          resaltarId={params.resaltar}
          totales={{ entradas: k.entradas, salidas: k.salidas }}
          barra={
            <Toolbar
              filtros={
                <>
                  <BotonPildora etiqueta="Referencia" valor={producto ? producto.referencia : 'Todas'} anchoPanel={380}>
                    <BuscadorProducto
                      enModal
                      placeholder="Busca por nombre, referencia o código"
                      alElegir={(r) => ir({ producto: r.producto.referencia })}
                    />
                    {producto && (
                      <Button className="mt-3" variante="ghost" tamano="sm" icono={X} onClick={() => ir({ producto: null })}>
                        Ver todas las referencias
                      </Button>
                    )}
                  </BotonPildora>
                  <BotonPildora etiqueta="Local" valor={nombreLocal} anchoPanel={260}>
                    <Select
                      etiqueta="Local"
                      etiquetaOculta
                      valor={localId}
                      alCambiar={(v) => ir({ local: v })}
                      opciones={[{ valor: 'todos', etiqueta: 'Todos los locales' }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
                    />
                  </BotonPildora>
                  <BotonPildora etiqueta="Movimiento" valor={GRUPOS.find((g) => g.valor === grupo)?.etiqueta} anchoPanel={280}>
                    <Select etiqueta="Movimiento" etiquetaOculta valor={grupo} alCambiar={setGrupo} opciones={GRUPOS.map((g) => ({ valor: g.valor, etiqueta: g.etiqueta }))} />
                  </BotonPildora>
                  <BotonPildora etiqueta="Fechas" valor={textoRango(rango, hoy)} anchoPanel={720}>
                    <SelectorRango soloPanel hoy={hoy} valor={rango} alCambiar={(r) => ir({ desde: r.desde, hasta: r.hasta })} />
                  </BotonPildora>
                </>
              }
              chips={chips}
              alLimpiar={() => {
                setGrupo('todos');
                navegar(rutas.movimientos(), { replace: true });
              }}
            />
          }
        />
      </div>
      <DialogoAjuste abierto={ajuste} alCambiar={setAjuste} productoId={producto?.id ?? null} />
    </div>
  );
}
