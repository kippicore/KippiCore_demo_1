import { CheckCircle2, Shirt, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Id, Importacion } from '@/dominio/tipos';
import { unidadesLinea } from '@/dominio/reglas/costeo';
import { useAcciones, useDinero, useHoy, usePuede, useSel } from '@/estado';
import { cifraCorta, entero, fecha, numero, porcentaje } from '@/lib/formato';
import { avisar, Button, Dialog, Dinero, EmptyState, GraficoCascada, Kpi, ListaQueCambio, NotaLegal, Select, Segmentado, Switch, Table, type ColumnaTabla, type PasoCascada } from '@/ui';
import { cascadaPorPrenda, margenPromedioPorCategoria, tasaSimulada } from '../calculos';
import { selVistaCosto, type ProductoCostoVista } from '../selectores';
import { CATEGORIA_EN_PLURAL, TEXTOS_COSTO } from '../textos';
import { ParametrosCostoDialog } from './ParametrosCosto';

/**
 * Calculadora de costo aterrizado (W4, PRD 7.5): cascada de la fábrica a la bodega, costo real por prenda, simulador
 * "¿Y si el dólar sube?" (±10 %), precio sugerido para conservar el margen con "Aplicar a la referencia" e interruptor
 * "IVA descontable". "Aplicar al inventario" deja el costo como el último costo de reposición y muestra los márgenes
 * antes → después. El método se nombra siempre.
 */
const ETIQUETA_CORTA: Record<string, string> = {
  fob: 'Fábrica',
  flete: 'Flete',
  seguro: 'Seguro',
  arancel: 'Arancel',
  otros_tributos: 'Otros tributos',
  iva_importacion: 'IVA',
  agente: 'Agente',
  puerto: 'Puerto y bodegaje',
  transporte: 'A Bogotá',
  otros: 'Otros',
};

export function CalculadoraCosto({ imp }: { imp: Importacion }) {
  const hoy = useHoy();
  const dinero = useDinero();
  const acciones = useAcciones();
  const puede = usePuede();
  const [pct, setPct] = useState(0);
  const [vista, setVista] = useState<'prenda' | 'pedido'>('prenda');
  const [lineaSel, setLineaSel] = useState<Id | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [parametros, setParametros] = useState(false);
  const [errorAplicar, setErrorAplicar] = useState<string | null>(null);

  const base = useSel(selVistaCosto, { importacionId: imp.id, hoy, tasaSimulada: null });
  const tasaSim = base && pct !== 0 ? tasaSimulada(base.tasaBase, pct) : null;
  const v = useSel(selVistaCosto, { importacionId: imp.id, hoy, tasaSimulada: tasaSim });

  const unidades = imp.lineas.reduce((a, l) => a + unidadesLinea(l), 0);
  const editable = puede('importacion.actualizarCostos');

  const lineaActiva = lineaSel ?? v?.productos[0]?.lineaId ?? null;
  const desglose = v && lineaActiva ? cascadaPorPrenda(v.costo, imp.lineas, imp.metodoProrrateo, lineaActiva) : null;
  const productoActivo = v?.productos.find((p) => p.lineaId === lineaActiva) ?? null;

  const pasos: PasoCascada[] = useMemo(() => {
    if (!v) return [];
    if (vista === 'prenda' && desglose) {
      const intermedios = desglose.pasos.slice(1).map((p) => ({ etiqueta: ETIQUETA_CORTA[p.concepto] ?? p.etiqueta, valor: dinero.convertir(p.valor) }));
      return [
        { etiqueta: ETIQUETA_CORTA.fob ?? 'Fábrica', valor: dinero.convertir(desglose.pasos[0]?.valor ?? 0), total: true },
        ...intermedios,
        { etiqueta: 'Costo por prenda', valor: dinero.convertir(desglose.costoUnitario), total: true },
      ];
    }
    const [primero, ...resto] = v.costo.cascada.filter((p) => p.valor !== 0 || p.concepto === 'fob');
    return [
      { etiqueta: ETIQUETA_CORTA.fob ?? 'Fábrica', valor: dinero.convertir(primero?.valor ?? 0), total: true },
      ...resto.map((p) => ({ etiqueta: ETIQUETA_CORTA[p.concepto] ?? p.etiqueta, valor: dinero.convertir(p.valor) })),
      { etiqueta: 'Total puesto en bodega', valor: dinero.convertir(v.costo.total), total: true },
    ];
  }, [v, vista, desglose, dinero]);

  if (!v || !base)
    return <EmptyState icono={Shirt} titulo="No pudimos calcular el costo" texto="Revisa que el pedido tenga líneas y tasa de cambio." />;

  const margenes = margenPromedioPorCategoria(v.productos.map((p) => ({ unidades: p.unidades, margenActual: p.margenActual, margenProyectado: p.margenProyectado, categoria: p.categoria })));
  const margenTotalAntes = margenes.reduce((a, m) => a + m.antes * m.unidades, 0) / Math.max(1, margenes.reduce((a, m) => a + m.unidades, 0));
  const margenTotalDespues = margenes.reduce((a, m) => a + m.despues * m.unidades, 0) / Math.max(1, margenes.reduce((a, m) => a + m.unidades, 0));
  const promedio = unidades > 0 ? v.costo.total / unidades : 0;
  const promedioBase = unidades > 0 ? base.costo.total / unidades : 0;
  const aplicada = imp.costosAplicados;

  const destacado: ProductoCostoVista | null = [...v.productos].sort((a, b) => b.unidades - a.unidades)[0] ?? null;

  const aplicarPrecio = (p: ProductoCostoVista) => {
    const r = acciones.editarProducto({ productoId: p.productoId, cambios: { precioVenta: p.precioSugerido } });
    if (!r.ok) {
      avisar({ tipo: 'error', texto: r.error.mensaje });
      return;
    }
    avisar({ tipo: 'exito', texto: `Precio de ${p.referencia} actualizado`, detalle: `Ahora cuesta ${dinero(p.precioSugerido)} con IVA.` });
  };

  const aplicarCostos = () => {
    setErrorAplicar(null);
    const r = acciones.aplicarCostosImportacion({ importacionId: imp.id, tasaCosteo: tasaSim });
    if (!r.ok) {
      setErrorAplicar(r.error.mensaje);
      return;
    }
    setAplicando(false);
    setPct(0);
    const camisas = margenes[0];
    avisar({
      tipo: 'exito',
      texto: `Se actualizaron ${v.variantesAfectadas} variantes`,
      detalle: camisas ? `Margen promedio de ${CATEGORIA_EN_PLURAL[camisas.categoria as keyof typeof CATEGORIA_EN_PLURAL] ?? camisas.categoria}: ${porcentaje(camisas.antes, 0)} → ${porcentaje(camisas.despues, 0)}` : undefined,
    });
  };

  const guardarIva = (descontable: boolean) => {
    const r = acciones.actualizarCostosImportacion({ importacionId: imp.id, costos: { ...imp.costos, ivaSumaAlCosto: !descontable }, metodoProrrateo: imp.metodoProrrateo });
    if (!r.ok) avisar({ tipo: 'error', texto: r.error.mensaje });
  };
  const guardarMetodo = (metodo: 'valor' | 'cantidad') => {
    const r = acciones.actualizarCostosImportacion({ importacionId: imp.id, costos: imp.costos, metodoProrrateo: metodo });
    if (!r.ok) avisar({ tipo: 'error', texto: r.error.mensaje });
  };

  const columnas: ColumnaTabla<ProductoCostoVista>[] = [
    {
      id: 'ref',
      encabezado: 'Referencia',
      celda: (p) => (
        <span>
          <span className="font-semibold text-ink">{p.nombre}</span>
          <span className="block t-small text-muted">{p.referencia}</span>
        </span>
      ),
      ordenar: (p) => p.referencia,
      ancho: 240,
    },
    { id: 'unidades', encabezado: 'Prendas', numerica: true, celda: (p) => <span className="num">{entero(p.unidades)}</span>, ordenar: (p) => p.unidades, ancho: 80 },
    { id: 'costo', encabezado: 'Costo por prenda', numerica: true, celda: (p) => <Dinero valor={p.costoUnitario} />, ordenar: (p) => p.costoUnitario, ancho: 130 },
    {
      id: 'vigente',
      encabezado: 'Costo hoy',
      numerica: true,
      celda: (p) => <span className="text-muted"><Dinero valor={p.costoVigente} /></span>,
      ordenar: (p) => p.costoVigente,
      ancho: 110,
    },
    { id: 'precio', encabezado: 'Precio de venta', numerica: true, celda: (p) => <Dinero valor={p.precioVenta} />, ordenar: (p) => p.precioVenta, ancho: 130 },
    {
      id: 'margen',
      encabezado: 'Margen',
      numerica: true,
      celda: (p) => (
        <span className="num whitespace-nowrap">
          <span className="text-muted">{porcentaje(p.margenActual, 0)} → </span>
          <strong className={p.margenProyectado < p.margenActual - 0.0005 ? 'font-bold text-danger' : 'font-bold text-ink'}>{porcentaje(p.margenProyectado, 0)}</strong>
        </span>
      ),
      ordenar: (p) => p.margenProyectado,
      ancho: 130,
    },
    {
      id: 'sugerido',
      encabezado: 'Precio sugerido',
      numerica: true,
      celda: (p) => (p.precioSugerido > p.precioVenta ? <Dinero valor={p.precioSugerido} /> : <span className="text-muted">Sin cambio</span>),
      ordenar: (p) => p.precioSugerido,
      ancho: 140,
    },
  ];

  return (
    <div className="space-y-8" data-testid="calculadora-costo">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[72ch]">
          <h2 className="t-h2 text-ink">{TEXTOS_COSTO.titulo}</h2>
          <p className="mt-1 t-body text-muted">
            Método: <strong className="font-semibold text-ink">{TEXTOS_COSTO.metodo}</strong>. {TEXTOS_COSTO.valorEjemplo}.
          </p>
          {aplicada && (
            <p className="mt-2 inline-flex items-center gap-2 t-small text-ink" data-testid="costos-aplicados">
              <CheckCircle2 size={16} className="text-success" aria-hidden />
              Aplicado al inventario el {fecha(aplicada.ts)} con la tasa {numero(aplicada.tasaCosteo, 2)}.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {editable && (
            <Button variante="secondary" icono={SlidersHorizontal} onClick={() => setParametros(true)} data-testid="editar-parametros">
              Parámetros
            </Button>
          )}
          {editable && (
            <Button onClick={() => setAplicando(true)} data-testid="aplicar-inventario">
              {TEXTOS_COSTO.aplicar}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 wide:grid-cols-4" data-testid="kpis-costo">
        <Kpi
          etiqueta="Costo real por prenda"
          valor={promedio}
          formatear={dinero.corta}
          completo={dinero(promedio)}
          nota={pct !== 0 ? `Antes ${dinero(promedioBase)}` : 'Promedio puesto en bodega'}
          variacion={pct !== 0 && promedioBase > 0 ? { valor: promedio / promedioBase - 1, comparado: 'con el dólar simulado', buenoCuando: 'baja' } : undefined}
          destacada
        />
        <Kpi etiqueta="Total del pedido en bodega" valor={v.costo.total} formatear={dinero.corta} completo={dinero(v.costo.total)} nota={`${entero(unidades)} prendas`} />
        <Kpi etiqueta="Tributos a girar" valor={v.costo.tributos} formatear={dinero.corta} completo={dinero(v.costo.tributos)} nota="Arancel, otros tributos e IVA" />
        <Kpi etiqueta="Margen promedio" valor={margenTotalDespues} formatear={(n) => porcentaje(n, 0)} nota={`Hoy ${porcentaje(margenTotalAntes, 0)} con el costo anterior`} />
      </div>

      <div className="grid gap-6 wide:grid-cols-[minmax(0,1fr)_340px]">
        <section className="border border-line bg-surface p-6" aria-label="De la fábrica a la bodega">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="t-h3 font-bold text-ink">De la fábrica a la bodega</h3>
              <p className="t-small text-muted">{vista === 'prenda' ? 'Lo que suma cada paso al costo de una prenda.' : 'Lo que suma cada paso al pedido completo.'}</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              {vista === 'prenda' && (
                <Select
                  className="w-64"
                  etiqueta="Referencia"
                  etiquetaOculta
                  valor={lineaActiva}
                  alCambiar={setLineaSel}
                  opciones={v.productos.filter((p) => p.lineaId).map((p) => ({ valor: p.lineaId as Id, etiqueta: `${p.referencia} · ${p.nombre}` }))}
                  tamano="sm"
                />
              )}
              <Segmentado etiqueta="Qué mostrar" tamano="sm" valor={vista} alCambiar={setVista} opciones={[{ valor: 'prenda', etiqueta: 'Por prenda' }, { valor: 'pedido', etiqueta: 'Todo el pedido' }]} />
            </div>
          </div>
          <div data-testid="cascada-costo">
            <GraficoCascada pasos={pasos} formato={(n) => cifraCorta(n, dinero.moneda)} alto={260} />
          </div>
          {vista === 'prenda' && productoActivo && desglose && (
            <p className="mt-4 t-body text-ink" data-testid="costo-prenda-activa">
              {productoActivo.nombre}: <strong className="font-bold num">{dinero(desglose.costoUnitario)}</strong> puesta en bodega
              {productoActivo.precioVenta > 0 && (
                <>
                  , se vende en <Dinero valor={productoActivo.precioVenta} /> con IVA. Margen {porcentaje(productoActivo.margenProyectado, 0)}.
                </>
              )}
            </p>
          )}
          {vista === 'prenda' && imp.metodoProrrateo === 'cantidad' && <p className="mt-1 t-small text-muted">Con el reparto por cantidad, cada prenda lleva la misma parte del precio de fábrica, el flete y los tributos.</p>}
        </section>

        <aside className="space-y-6">
          <section className="border border-line bg-surface p-6" aria-label={TEXTOS_COSTO.simulador}>
            <h3 className="t-h3 font-bold text-ink">{TEXTOS_COSTO.simulador}</h3>
            <p className="mt-1 t-small text-muted">{TEXTOS_COSTO.simuladorAyuda}</p>
            <div className="mt-5">
              <label htmlFor="simulador-tasa" className="flex items-baseline justify-between t-label text-ink">
                <span>Variación de la tasa</span>
                <span className="num font-bold" data-testid="simulador-valor">
                  {pct > 0 ? '+' : pct < 0 ? '−' : ''}
                  {Math.abs(pct)} %
                </span>
              </label>
              <input
                id="simulador-tasa"
                type="range"
                min={-10}
                max={10}
                step={1}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                className="mt-3 w-full accent-ink"
                data-testid="simulador-tasa"
                aria-valuetext={`${pct} por ciento`}
              />
              <div className="mt-1 flex justify-between t-small text-muted num">
                <span>−10 %</span>
                <span>0</span>
                <span>+10 %</span>
              </div>
              <p className="mt-4 t-body text-ink">
                {imp.moneda === 'USD' ? 'US$' : 'CN¥'} 1 = <strong className="font-bold num">$ {numero(tasaSim ?? base.tasaBase, 2)}</strong>
                {pct !== 0 && <span className="text-muted"> (hoy $ {numero(base.tasaBase, 2)})</span>}
              </p>
              {pct !== 0 && (
                <Button variante="ghost" tamano="sm" className="mt-2 -ml-3" onClick={() => setPct(0)}>
                  Volver a la tasa real
                </Button>
              )}
            </div>
          </section>

          <section className="border border-line bg-surface p-6">
            <h3 className="t-h3 font-bold text-ink">Cómo se cuenta</h3>
            <div className="mt-4 space-y-4">
              <Switch
                activo={!imp.costos.ivaSumaAlCosto}
                alCambiar={guardarIva}
                etiqueta={TEXTOS_COSTO.ivaDescontable}
                deshabilitado={!editable}
                valorTexto={imp.costos.ivaSumaAlCosto ? 'Suma' : 'No suma'}
              />
              <p className="t-small text-muted">{TEXTOS_COSTO.ivaDescontableAyuda}</p>
              <div>
                <p className="mb-1.5 t-label text-ink">{TEXTOS_COSTO.prorrateo}</p>
                <Segmentado
                  etiqueta={TEXTOS_COSTO.prorrateo}
                  tamano="sm"
                  valor={imp.metodoProrrateo}
                  alCambiar={editable ? guardarMetodo : () => undefined}
                  opciones={[
                    { valor: 'valor', etiqueta: 'Por valor' },
                    { valor: 'cantidad', etiqueta: 'Por cantidad' },
                  ]}
                />
              </div>
            </div>
          </section>
        </aside>
      </div>

      {destacado && destacado.precioSugerido > destacado.precioVenta && (
        <section className="border border-ink bg-surface p-6" data-testid="precio-sugerido" aria-label="Precio sugerido">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-[70ch]">
              <p className="t-eyebrow text-accent-ink">Precio sugerido</p>
              <p className="mt-1 t-h2 normal-case">
                Para mantener tu {porcentaje(destacado.margenActual, 0)}: <Dinero valor={destacado.precioSugerido} />
              </p>
              <p className="mt-1 t-body text-muted">
                {destacado.nombre} costará <Dinero valor={destacado.costoUnitario} /> puesta en bodega; hoy se vende en <Dinero valor={destacado.precioVenta} /> con IVA y el margen baja a {porcentaje(destacado.margenProyectado, 0)}. El precio sugerido termina en 900.
              </p>
            </div>
            {editable && (
              <Button variante="secondary" onClick={() => aplicarPrecio(destacado)} data-testid="aplicar-precio">
                Aplicar a la referencia
              </Button>
            )}
          </div>
        </section>
      )}

      <Table
        data-testid="tabla-referencias-costo"
        columnas={columnas}
        filas={v.productos}
        clave={(p) => p.productoId}
        sustantivo={['referencia', 'referencias']}
        porPagina={0}
        accionesFila={editable ? (p) => (p.precioSugerido > p.precioVenta ? <Button variante="ghost" tamano="sm" onClick={() => aplicarPrecio(p)}>Aplicar precio</Button> : null) : undefined}
      />
      <NotaLegal tipo="aduanero" />

      <ParametrosCostoDialog imp={imp} tasaCosteo={base.tasaBase} abierto={parametros} alCambiar={setParametros} />

      <Dialog
        abierto={aplicando}
        alCambiar={setAplicando}
        ancho="lg"
        eyebrow={imp.numero}
        titulo={TEXTOS_COSTO.aplicar}
        descripcion={`${TEXTOS_COSTO.aplicarDescripcion} Método: ${TEXTOS_COSTO.metodo.toLowerCase()}.`}
        data-testid="dialogo-aplicar"
        pie={
          <>
            <Button variante="secondary" onClick={() => setAplicando(false)}>
              Cancelar
            </Button>
            <Button onClick={aplicarCostos} data-testid="confirmar-aplicar">
              {TEXTOS_COSTO.aplicar}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {errorAplicar && <p className="border-l-2 border-danger pl-3 t-small text-ink">{errorAplicar}</p>}
          {tasaSim && (
            <p className="border-l-2 border-accent pl-3 t-small text-ink">
              Vas a aplicar el costo con el dólar simulado ({pct > 0 ? '+' : '−'}
              {Math.abs(pct)} %): {imp.moneda === 'USD' ? 'US$' : 'CN¥'} 1 = $ {numero(tasaSim, 2)}.
            </p>
          )}
          <ListaQueCambio
            filas={v.productos.map((p) => ({
              icono: Shirt,
              texto: (
                <span>
                  {p.nombre} <span className="text-muted">· {p.referencia} · {p.variantes} variantes</span>
                </span>
              ),
              antes: <Dinero valor={p.costoVigente} />,
              despues: <Dinero valor={p.costoUnitario} />,
            }))}
          />
          <div className="border border-line bg-surface-2 p-4" data-testid="resumen-margenes">
            <p className="t-body text-ink">
              Se actualizarán <strong className="font-bold">{v.variantesAfectadas} variantes</strong>.
            </p>
            <ul className="mt-2 space-y-1">
              {margenes.map((m) => (
                <li key={m.categoria} className="t-body text-ink num">
                  Margen promedio de {CATEGORIA_EN_PLURAL[m.categoria as keyof typeof CATEGORIA_EN_PLURAL] ?? m.categoria}: <span className="text-muted">{porcentaje(m.antes, 0)} → </span>
                  <strong className="font-bold">{porcentaje(m.despues, 0)}</strong>
                </li>
              ))}
            </ul>
          </div>
          <NotaLegal tipo="aduanero" />
        </div>
      </Dialog>
    </div>
  );
}
