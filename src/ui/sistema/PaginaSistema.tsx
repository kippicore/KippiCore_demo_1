import { CircleDollarSign, ClipboardList, Download, MoreHorizontal, Pencil, Plus, Printer, Shirt, ShoppingBag, SlidersHorizontal, Trash2, Wallet } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { TipoPrenda } from '@/dominio/tipos';
import { ESTADOS_CAJA, ESTADOS_CLIENTE, ESTADOS_POR_PAGAR, ESTADOS_VENTA } from '@/config/estados';
import { useDinero, useEstadoDominio, useHoy, useSel } from '@/estado';
import { selProductosActivos, selVariantesPorProducto } from '@/selectores';
import { cifraCorta, dinero, entero, fechaCorta } from '@/lib/formato';
import { sumarDias } from '@/lib/fechas';
import * as UI from '@/ui';
import { avisar } from '@/ui/primitivos/Toast';
import { ChipDatosEjemplo, EncabezadoMovil, HojaLigera } from '@/ui/movil/Movil';

/**
 * Página interna del sistema de diseño `/panel/_sistema` (SOLO en desarrollo, PLAN 9.2 F2-C): todos los componentes
 * de 8.7–8.9 con sus variantes y estados, con datos reales de la demo. Es la referencia visual de los constructores.
 */
function Seccion({ id, titulo, nota, children }: { id: string; titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-line pt-8">
      <h2 className="t-h2 text-ink">{titulo}</h2>
      {nota && <p className="mt-1 max-w-[72ch] t-small text-muted">{nota}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-center gap-6 py-3">
      <p className="t-eyebrow text-ink-2">{etiqueta}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

const TIPOS: TipoPrenda[] = ['camisa', 'polo', 'sweater', 'blazer', 'chaleco', 'abrigo', 'chaqueta', 'traje', 'pantalon', 'zapato', 'cinturon', 'corbata', 'billetera'];
const INDICE = [
  ['tipografia', 'Tipografía'],
  ['color', 'Color'],
  ['botones', 'Botones'],
  ['campos', 'Campos'],
  ['controles', 'Controles'],
  ['insignias', 'Insignias'],
  ['tarjetas', 'Tarjetas y KPI'],
  ['tabla', 'Tabla y filtros'],
  ['capas', 'Capas'],
  ['graficos', 'Gráficos'],
  ['prendas', 'Prendas'],
  ['piezas', 'Piezas'],
  ['conectados', 'Conectados'],
  ['movil', 'App móvil'],
] as const;

export default function PaginaSistema() {
  const e = useEstadoDominio();
  const hoy = useHoy();
  const d = useDinero();
  const productos = useSel(selProductosActivos);
  const variantes = useSel(selVariantesPorProducto);
  const oxford = productos.find((p) => p.referencia === 'HL-CAM-0142') ?? productos[0];
  const variante = oxford ? variantes[oxford.id]?.[0] : undefined;
  const [modal, setModal] = useState(false);
  const [cajon, setCajon] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [hoja, setHoja] = useState(false);
  const [check, setCheck] = useState(true);
  const [sw, setSw] = useState(true);
  const [radio, setRadio] = useState<'efectivo' | 'nequi' | 'tarjeta'>('nequi');
  const [sel, setSel] = useState<string | null>('usq');
  const [num, setNum] = useState<number | null>(1250000);
  const [fecha, setFecha] = useState<string | null>(hoy);
  const [rango, setRango] = useState({ desde: `${hoy.slice(0, 7)}-01`, hasta: hoy });
  const [tab, setTab] = useState('resumen');
  const [vista, setVista] = useState<'tabla' | 'tarjetas'>('tabla');
  const [q, setQ] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [densidad, setDensidad] = UI.useDensidadTabla('sistema');
  const [valorCifra, setValorCifra] = useState(7_260_000);
  const [paso, setPaso] = useState(1);
  const [talla, setTalla] = useState('M');

  const filas = useMemo(
    () =>
      Object.values(e.ventas)
        .slice(-180)
        .reverse()
        .filter((v) => !q || v.numero.toLowerCase().includes(q.toLowerCase())),
    [e.ventas, q],
  );
  const dias = useMemo(() => {
    const r: { dia: string; p93: number; usq: number; zr: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dia = sumarDias(hoy, -i);
      const fila = { dia, p93: 0, usq: 0, zr: 0 };
      for (const v of Object.values(e.ventas)) if (v.ts.startsWith(dia) && (v.localId === 'p93' || v.localId === 'usq' || v.localId === 'zr')) fila[v.localId] += v.total;
      r.push(fila);
    }
    return r;
  }, [e.ventas, hoy]);
  const calor = useMemo(() => Array.from({ length: 7 }, (_, f) => Array.from({ length: 12 }, (_, c) => Math.round((f >= 4 ? 2 : 1) * (c > 4 && c < 9 ? 3 : 1) * (1 + ((f * 7 + c * 3) % 5)) * 400_000))), []);
  const columnas: UI.ColumnaTabla<(typeof filas)[number]>[] = [
    { id: 'numero', encabezado: 'Venta', celda: (v) => <span className="font-semibold">{v.numero}</span>, ordenar: (v) => v.numero },
    { id: 'fecha', encabezado: 'Fecha', celda: (v) => <UI.Fecha valor={v.ts} formato="fechaHora" />, ordenar: (v) => v.ts },
    { id: 'local', encabezado: 'Local', celda: (v) => e.locales[v.localId]?.nombre ?? '', ordenar: (v) => v.localId },
    { id: 'estado', encabezado: 'Estado', celda: (v) => <UI.BadgeEstado estado={ESTADOS_VENTA[v.tipo === 'separado' ? 'separado' : 'pagada']} tamano="sm" /> },
    { id: 'total', encabezado: 'Total', numerica: true, celda: (v) => <UI.Dinero valor={v.total} />, ordenar: (v) => v.total },
  ];

  return (
    <div className="pb-24">
      <UI.EncabezadoPagina
        migas={[{ texto: 'Inicio', a: '/panel/inicio' }, { texto: 'Sistema de diseño' }]}
        titulo="Sistema de diseño"
        subtitulo="Tokens, componentes y piezas de la demo HALDEN (PLAN 8). Solo en desarrollo: es la referencia visual de cada paquete."
        acciones={
          <>
            <UI.BotonIcono icono={MoreHorizontal} etiqueta="Más opciones" />
            <UI.Button variante="secondary" icono={Download}>
              Exportar
            </UI.Button>
            <UI.Button icono={Plus}>Registrar venta</UI.Button>
          </>
        }
      />
      <nav aria-label="Secciones" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 t-small">
        {INDICE.map(([id, t]) => (
          <a key={id} href={`#${id}`} className="text-ink-2 hover:text-ink hover:underline hover:underline-offset-4">
            {t}
          </a>
        ))}
      </nav>

      <div className="mt-10 flex flex-col gap-14">
        <Seccion id="tipografia" titulo="Tipografía" nota="Figtree (OFL), una sola familia. Cifras tabulares verificadas: 111.111 y 000.000 miden lo mismo con `num`.">
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              <p className="t-display">Sastrería</p>
              <p className="t-h1">Título de página</p>
              <p className="t-h2">Título de sección</p>
              <p className="t-h3">Título de tarjeta</p>
              <p className="t-eyebrow text-ink-2">Sobretítulo</p>
              <p className="t-body-lg">Cuerpo de la tienda, 16 px.</p>
              <p className="t-body">Cuerpo del escritorio, 15 px: lo que usarían tú y tu equipo cada día.</p>
              <p className="t-small text-muted">Ayuda y segunda línea, 13 px.</p>
              <p className="t-micro text-ink-2">Leyendas y etiquetas directas, 12 px (mínimo absoluto).</p>
            </div>
            <div className="flex flex-col gap-4">
              <p className="t-wordmark">HALDEN</p>
              <p className="t-kpi-xl">{d(12_438_900)}</p>
              <p className="t-kpi">{d.corta(412_600_000)}</p>
              <p className="t-kpi-sm">{entero(1248)} uds.</p>
              <div className="flex flex-col items-start gap-1 border border-line bg-surface p-4 t-kpi-sm">
                <span className="num" data-testid="tnum-1">111.111</span>
                <span className="num" data-testid="tnum-0">000.000</span>
              </div>
              <p className="t-ref text-muted">HL-CAM-0142 · 2048100014237</p>
            </div>
          </div>
        </Seccion>

        <Seccion id="color" titulo="Color" nota="Negro, blanco y aire. El camel solo señala.">
          <div className="grid grid-cols-6 gap-3">
            {['canvas', 'surface', 'surface-2', 'selected', 'product', 'line', 'line-strong', 'control', 'ink', 'ink-2', 'muted', 'subtle', 'accent', 'accent-soft', 'success', 'success-soft', 'warning', 'warning-soft', 'danger', 'danger-soft', 'chart-1', 'chart-2', 'chart-3', 'chart-4'].map((c) => (
              <div key={c} className="border border-line bg-surface">
                <div className="h-14" style={{ background: `var(--c-${c})` }} />
                <p className="px-2 py-1.5 t-micro text-ink-2">{c}</p>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion id="botones" titulo="Botones" nota="Radio 0. Un solo primario por zona. Deshabilitado siempre dice por qué.">
          {(['primary', 'secondary', 'ghost', 'destructive', 'link'] as const).map((v) => (
            <Fila key={v} etiqueta={v}>
              <UI.Button variante={v} tamano="sm">
                Guardar cambios
              </UI.Button>
              <UI.Button variante={v} icono={Plus}>
                Registrar venta
              </UI.Button>
              <UI.Button variante={v} tamano="lg">
                Agregar a la bolsa
              </UI.Button>
              <UI.Button variante={v} cargando>
                Guardando
              </UI.Button>
              <UI.Tooltip texto="Disponible solo para el dueño" envolver>
                <UI.Button variante={v} disabled motivo="Disponible solo para el dueño">
                  Anular venta
                </UI.Button>
              </UI.Tooltip>
            </Fila>
          ))}
          <Fila etiqueta="Solo ícono">
            <UI.BotonIcono icono={Pencil} etiqueta="Editar" tamano="sm" />
            <UI.BotonIcono icono={Printer} etiqueta="Imprimir" />
            <UI.BotonIcono icono={Trash2} etiqueta="Eliminar" tamano="lg" variante="secondary" />
          </Fila>
          <div className="sobre-ink mt-3 flex gap-3 bg-ink p-6">
            <UI.Button variante="inverse" tamano="lg">
              Entrar como dueño
            </UI.Button>
          </div>
        </Seccion>

        <Seccion id="campos" titulo="Campos">
          <div className="grid max-w-[880px] grid-cols-2 gap-x-6 gap-y-4">
            <UI.Input etiqueta="Nombre del cliente" placeholder="Andrés Gutiérrez" />
            <UI.Input etiqueta="Correo" opcional placeholder="nombre@halden.example" ayuda="Para enviarle la factura electrónica." />
            <UI.Input etiqueta="Celular" defaultValue="30012345" error="Escribe un celular de 10 dígitos que empiece por 3." />
            <UI.InputNumero etiqueta="Valor" prefijo="$" valor={num} alCambiar={setNum} />
            <UI.Input etiqueta="Deshabilitado" disabled defaultValue="Usaquén" />
            <UI.Input etiqueta="Solo lectura" readOnly defaultValue="HL-CAM-0142" />
            <UI.Select etiqueta="Local" placeholder="Elige un local" valor={sel} alCambiar={setSel} opciones={Object.values(e.locales).map((l) => ({ valor: l.id, etiqueta: l.nombre }))} />
            <UI.SelectorFecha etiqueta="Fecha del gasto" hoy={hoy} valor={fecha} alCambiar={setFecha} />
            <UI.SelectorRango etiqueta="Fechas" hoy={hoy} valor={rango} alCambiar={setRango} />
            <UI.Textarea etiqueta="Nota" opcional placeholder="Toma de medidas el sábado" />
          </div>
        </Seccion>

        <Seccion id="controles" titulo="Controles">
          <Fila etiqueta="Checkbox">
            <UI.Checkbox etiqueta="Solo con existencias" marcado={check} alCambiar={setCheck} />
            <UI.Checkbox etiqueta="Indeterminado" marcado="indeterminate" alCambiar={() => undefined} />
            <UI.Checkbox etiqueta="Deshabilitado" marcado={false} deshabilitado alCambiar={() => undefined} />
          </Fila>
          <Fila etiqueta="Interruptor">
            <UI.Switch etiqueta="Exoneración de aportes" activo={sw} alCambiar={setSw} valorTexto={sw ? 'Exonerado' : 'No exonerado'} />
          </Fila>
          <Fila etiqueta="Radio">
            <UI.GrupoRadio orientacion="horizontal" valor={radio} alCambiar={setRadio} opciones={[{ valor: 'efectivo', etiqueta: 'Efectivo' }, { valor: 'nequi', etiqueta: 'Nequi' }, { valor: 'tarjeta', etiqueta: 'Tarjeta' }]} />
          </Fila>
          <Fila etiqueta="Tarjetas de radio">
            <UI.GrupoRadio
              tarjetas
              columnas={3}
              className="w-full max-w-[720px]"
              valor={radio}
              alCambiar={setRadio}
              opciones={[
                { valor: 'efectivo', etiqueta: 'Efectivo', descripcion: 'Entra a la caja del local' },
                { valor: 'nequi', etiqueta: 'Nequi', descripcion: 'Transferencia a la cuenta del negocio' },
                { valor: 'tarjeta', etiqueta: 'Tarjeta', descripcion: 'Datáfono: comisión y retenciones' },
              ]}
            />
          </Fila>
          <Fila etiqueta="Segmentado">
            <UI.Segmentado etiqueta="Vista" valor={vista} alCambiar={setVista} opciones={[{ valor: 'tabla', etiqueta: 'Tabla' }, { valor: 'tarjetas', etiqueta: 'Tarjetas' }]} />
          </Fila>
          <div className="mt-4 max-w-[720px]">
            <UI.Tabs valor={tab} alCambiar={setTab} pestanas={[{ valor: 'resumen', etiqueta: 'Resumen' }, { valor: 'lineas', etiqueta: 'Líneas', contador: 3 }, { valor: 'pagos', etiqueta: 'Pagos' }, { valor: 'historial', etiqueta: 'Historial' }]}>
              <UI.PanelTab valor={tab} className="pt-4 t-body text-muted">
                Contenido de la pestaña «{tab}».
              </UI.PanelTab>
            </UI.Tabs>
          </div>
          <div className="mt-6">
            <UI.Stepper pasos={[{ nombre: 'Proveedor' }, { nombre: 'Líneas' }, { nombre: 'Costos' }, { nombre: 'Confirmar' }]} actual={paso} alElegir={setPaso} className="max-w-[720px]" />
            <UI.Button variante="ghost" tamano="sm" className="mt-3" onClick={() => setPaso((p) => (p + 1) % 4)}>
              Siguiente paso
            </UI.Button>
          </div>
        </Seccion>

        <Seccion id="insignias" titulo="Insignias y estados" nota="El tono sale de config/estados.ts; el color nunca es la única señal.">
          <Fila etiqueta="Tonos">
            {(['ink', 'outline', 'neutral', 'muted', 'success', 'warning', 'danger', 'accent'] as const).map((t) => (
              <UI.Badge key={t} tono={t}>
                {t}
              </UI.Badge>
            ))}
          </Fila>
          <Fila etiqueta="Mapa canónico">
            <UI.BadgeEstado estado={ESTADOS_VENTA.pagada} />
            <UI.BadgeEstado estado={ESTADOS_VENTA.separado} />
            <UI.BadgeEstado estado={ESTADOS_POR_PAGAR.vencido} />
            <UI.BadgeEstado estado={ESTADOS_CAJA.con_diferencia} />
            <UI.BadgeEstado estado={ESTADOS_CLIENTE.vip} />
            <UI.Badge tono="danger" tamano="sm">
              Retraso de 6 días
            </UI.Badge>
          </Fila>
        </Seccion>

        <Seccion id="tarjetas" titulo="Tarjetas y KPI">
          <div className="grid grid-cols-3 gap-4 wide:grid-cols-6">
            <UI.Kpi etiqueta="Ventas de hoy" valor={d.convertir(valorCifra)} formatear={(n) => cifraCorta(n, d.moneda)} variacion={{ valor: 0.14, comparado: 'vs. el miércoles pasado' }} serie={[3, 5, 4, 6, 8, 7, 9]} destacada />
            <UI.Kpi etiqueta="Ventas del mes" valor={d.convertir(412_600_000)} formatear={(n) => cifraCorta(n, d.moneda)} variacion={{ valor: 0.094, comparado: 'vs. agosto' }} serie={[5, 6, 4, 7, 8, 7, 9]} a="/panel/ventas" />
            <UI.Kpi etiqueta="Gastos del mes" valor={d.convertir(48_200_000)} formatear={(n) => cifraCorta(n, d.moneda)} variacion={{ valor: -0.031, comparado: 'vs. agosto', buenoCuando: 'baja' }} />
            <UI.Kpi etiqueta="Unidades" valor={1248} formatear={entero} variacion={{ valor: 0, comparado: 'vs. agosto' }} />
            <UI.Kpi etiqueta="Ticket promedio" valor={d.convertir(375_000)} formatear={(n) => cifraCorta(n, d.moneda)} nota="31 ventas" />
            <UI.Card titulo="Card base" accion={<UI.EnlaceVerTodo a="/panel/inicio" />}>
              <p className="t-body text-muted">Borde de 1 px, sin sombra.</p>
            </UI.Card>
          </div>
          <UI.Button variante="ghost" tamano="sm" className="mt-3" onClick={() => setValorCifra((v) => v + 389_800)}>
            Sumar una venta (contador de 900 ms)
          </UI.Button>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <UI.EmptyState tamano="compacto" icono={ClipboardList} titulo="Aún no hay conteos físicos en Zona Rosa" texto="Un conteo compara lo que hay en el estante con lo que dice el sistema y te muestra las diferencias." accion={<UI.Button variante="secondary">Iniciar conteo</UI.Button>} />
            <div className="flex flex-col gap-3 border border-line bg-surface p-5">
              <UI.Skeleton className="h-3 w-1/2" />
              <UI.Skeleton className="h-8 w-3/4" />
              <UI.Skeleton className="h-3 w-2/3" />
              <UI.Skeleton className="aspect-[3/4] w-24" />
            </div>
            <div className="flex flex-col gap-4 border border-line bg-surface p-5">
              <UI.BarraProgreso valor={0.68} etiqueta="Meta del mes" meta />
              <UI.BarraProgreso valor={0.42} etiqueta="Recepción de IMP-2026-07" detalle="210 de 500 uds." />
            </div>
          </div>
        </Seccion>

        <Seccion id="tabla" titulo="Tabla y barra de filtros" nota="Cabecera fija, totales fijos, selección con barra de lote negra, densidad recordada.">
          <UI.FranjaResumen
            className="mb-4"
            cifras={[
              { etiqueta: 'Ventas', valor: <UI.Dinero valor={filas.reduce((s, v) => s + v.total, 0)} corta /> },
              { etiqueta: 'Número de ventas', valor: entero(filas.length) },
              { etiqueta: 'Ticket promedio', valor: <UI.Dinero valor={filas.length ? filas.reduce((s, v) => s + v.total, 0) / filas.length : 0} corta /> },
              { etiqueta: 'Descuentos', valor: <UI.Dinero valor={0} /> },
            ]}
          />
          <UI.Table
            columnas={columnas}
            filas={filas}
            clave={(v) => v.id}
            sustantivo={['venta', 'ventas']}
            densidad={densidad}
            porPagina={25}
            alAbrir={() => setCajon(true)}
            seleccion={seleccion}
            alSeleccionar={setSeleccion}
            accionesLote={<UI.Button variante="ghost" tamano="sm" icono={Download}>Exportar</UI.Button>}
            accionesFila={() => (
              <UI.Menu disparador={<UI.BotonAccionesFila />}>
                <UI.ItemMenu icono={Pencil}>Editar</UI.ItemMenu>
                <UI.SeparadorMenu />
                <UI.ItemMenu icono={Trash2} peligro onSelect={() => setConfirmar(true)}>
                  Anular venta
                </UI.ItemMenu>
              </UI.Menu>
            )}
            totales={{ total: <UI.Dinero valor={filas.reduce((s, v) => s + v.total, 0)} /> }}
            vacio={<UI.EmptyState tamano="tabla" icono={ShoppingBag} titulo="Ningún resultado con estos filtros" texto="Prueba con otro número de venta o limpia los filtros." accion={<UI.Button variante="secondary" onClick={() => setQ('')}>Limpiar filtros</UI.Button>} />}
            barra={
              <UI.Toolbar
                buscar={{ valor: q, alCambiar: setQ, placeholder: 'Buscar por número, cliente o referencia' }}
                filtros={
                  <>
                    <UI.BotonFiltros contador={2}>
                      <UI.Checkbox etiqueta="Solo separados" marcado={false} alCambiar={() => undefined} />
                    </UI.BotonFiltros>
                    <UI.BotonPildora etiqueta="Local" valor="Usaquén">
                      <UI.Select etiqueta="Local" etiquetaOculta valor={sel} alCambiar={setSel} opciones={Object.values(e.locales).map((l) => ({ valor: l.id, etiqueta: l.nombre }))} />
                    </UI.BotonPildora>
                    <UI.BotonPildora etiqueta="Fechas" valor={UI.textoRango(rango, hoy)} anchoPanel={720}>
                      <UI.SelectorRango soloPanel hoy={hoy} valor={rango} alCambiar={setRango} />
                    </UI.BotonPildora>
                    <UI.BotonPildora etiqueta="Estado" icono={SlidersHorizontal} />
                  </>
                }
                derecha={
                  <>
                    <UI.SelectorDensidad valor={densidad} alCambiar={setDensidad} />
                    <UI.Segmentado etiqueta="Vista" tamano="sm" valor={vista} alCambiar={setVista} opciones={[{ valor: 'tabla', etiqueta: 'Tabla' }, { valor: 'tarjetas', etiqueta: 'Tarjetas' }]} />
                    <UI.BotonExportar reporte="ventas" menu />
                  </>
                }
                chips={[{ id: 'local', texto: 'Local: Usaquén', alQuitar: () => undefined }, { id: 'fechas', texto: `Fechas: ${UI.textoRango(rango, hoy)}`, alQuitar: () => undefined }]}
                alLimpiar={() => undefined}
              />
            }
          />
        </Seccion>

        <Seccion id="capas" titulo="Capas: modal, cajón, confirmación, popover, menú, aviso">
          <Fila etiqueta="Abrir">
            <UI.Button variante="secondary" onClick={() => setModal(true)}>
              Modal
            </UI.Button>
            <UI.Button variante="secondary" onClick={() => setCajon(true)}>
              Cajón de detalle
            </UI.Button>
            <UI.Button variante="secondary" onClick={() => setConfirmar(true)}>
              Confirmar anulación
            </UI.Button>
            <UI.Popover titulo="Local" disparador={<UI.Button variante="secondary">Popover</UI.Button>}>
              <p className="t-body text-muted">Contenido del popover, 16 px de padding.</p>
            </UI.Popover>
            <UI.Menu disparador={<UI.Button variante="secondary">Menú</UI.Button>} alinear="start">
              <UI.ItemMenu icono={Pencil} atajo="E">
                Editar
              </UI.ItemMenu>
              <UI.ItemMenu icono={Printer}>Imprimir</UI.ItemMenu>
              <UI.SeparadorMenu />
              <UI.ItemMenu icono={Trash2} peligro>
                Eliminar gasto
              </UI.ItemMenu>
            </UI.Menu>
            <UI.Button
              variante="secondary"
              onClick={() =>
                avisar({ tipo: 'exito', texto: `Venta V-017089 registrada · ${dinero(199_900)}`, detalle: 'Inventario −1 · Comisión de Sebastián +$ 5.039 · Caja Usaquén actualizada', accion: { texto: 'Ver venta', a: '/panel/ventas' } })
              }
            >
              Aviso de venta
            </UI.Button>
            <UI.Tooltip texto="Tasa de ejemplo: US$ 1 = $ 3.950">
              <UI.Button variante="ghost">Tooltip</UI.Button>
            </UI.Tooltip>
          </Fila>
          <UI.Dialog
            abierto={modal}
            alCambiar={setModal}
            eyebrow="Costos y gastos"
            titulo="Nuevo gasto"
            confirmarAlCerrar
            pie={
              <>
                <UI.Button variante="secondary" onClick={() => setModal(false)}>
                  Cancelar
                </UI.Button>
                <UI.Button onClick={() => setModal(false)}>Guardar gasto</UI.Button>
              </>
            }
          >
            <div className="grid grid-cols-2 gap-4">
              <UI.Input etiqueta="Concepto" placeholder="Internet Zona Rosa · octubre" />
              <UI.InputNumero etiqueta="Valor" prefijo="$" valor={num} alCambiar={setNum} />
            </div>
          </UI.Dialog>
          <UI.Drawer
            abierto={cajon}
            alCambiar={setCajon}
            eyebrow="Venta"
            titulo="V-017088"
            insignia={<UI.BadgeEstado estado={ESTADOS_VENTA.pagada} />}
            acciones={[{ icono: Printer, etiqueta: 'Imprimir', onClick: () => undefined }]}
            alAnterior={() => undefined}
            alSiguiente={() => undefined}
            pie={<UI.Button>Emitir factura electrónica</UI.Button>}
          >
            <UI.ParesDatos pares={[['Cliente', 'Andrés Gutiérrez'], ['Local', 'Usaquén'], ['Vendedor', 'Sebastián Cárdenas'], ['Total', <UI.Dinero key="t" valor={429_800} />]]} />
            <UI.ListaQueCambio
              filas={[
                { icono: Shirt, texto: 'Inventario de Usaquén · Camisa Oxford M azul cielo', antes: 3, despues: 2, a: '/panel/inventario' },
                { icono: CircleDollarSign, texto: 'Ventas de hoy', antes: d.corta(7_260_000), despues: d.corta(7_689_800) },
                { icono: Wallet, texto: 'Caja de Usaquén', despues: '+' + d(429_800) },
              ]}
            />
          </UI.Drawer>
          <UI.ConfirmarEliminacion
            abierto={confirmar}
            alCambiar={setConfirmar}
            pregunta="¿Anular la venta V-017088?"
            consecuencias={`Se devolverán 2 unidades al inventario de Usaquén y se restará ${dinero(389_800)} de las ventas de hoy.`}
            accion="Anular venta"
            alConfirmar={() => avisar({ texto: 'Venta V-017088 anulada' })}
          />
        </Seccion>

        <Seccion id="graficos" titulo="Gráficos" nota="Grises fijos por local con etiqueta directa; camel solo para el hallazgo.">
          <div className="grid grid-cols-12 gap-6">
            <UI.Card className="col-span-8">
              <UI.GraficoDinero tipo="barras" apiladas titulo="Ventas de los últimos 14 días por local" lectura="Los sábados venden casi el doble que los martes." datos={dias} x="dia" formatoX={fechaCorta} series={[{ clave: 'p93', nombre: 'Parque 93', color: 1 }, { clave: 'usq', nombre: 'Usaquén', color: 2 }, { clave: 'zr', nombre: 'Zona Rosa', color: 3 }]} />
            </UI.Card>
            <UI.Card className="col-span-4">
              <UI.GraficoDinero tipo="barras" titulo="Parque 93" datos={dias} x="dia" formatoX={fechaCorta} series={[{ clave: 'p93', nombre: 'Parque 93', color: 1 }]} destacarX={dias[dias.length - 4]?.dia} alto={240} />
            </UI.Card>
            <UI.Card className="col-span-6">
              <UI.GraficoDinero tipo="linea" titulo="Tendencia por local" datos={dias} x="dia" formatoX={fechaCorta} series={[{ clave: 'p93', nombre: 'Parque 93', color: 1 }, { clave: 'usq', nombre: 'Usaquén', color: 2 }, { clave: 'zr', nombre: 'Zona Rosa', color: 3 }]} />
            </UI.Card>
            <UI.Card className="col-span-6">
              <UI.GraficoDinero tipo="area" titulo="Flujo de caja proyectado" datos={dias.map((x, i) => ({ dia: x.dia, saldo: 40_000_000 - i * 3_200_000 + (i % 3) * 2_000_000 }))} x="dia" formatoX={fechaCorta} series={[{ clave: 'saldo', nombre: 'Saldo' }]} referencia={{ valor: 10_000_000, etiqueta: 'Mínimo de caja' }} />
            </UI.Card>
            <UI.Card className="col-span-7">
              <h3 className="mb-4 t-h3">Ventas por hora y día</h3>
              <UI.MapaCalor valores={calor} formatoValor={(n) => d.corta(n)} hallazgo={{ fila: 5, desde: 5, hasta: 8, nota: 'Sábados de 3 a 6 p. m.: 22 % de tus ventas' }} />
            </UI.Card>
            <UI.Card className="col-span-5">
              <h3 className="mb-6 t-h3">Estado de resultados</h3>
              <UI.GraficoCascada formato={(n) => cifraCorta(n)} pasos={[{ etiqueta: 'Ventas', valor: 355_000_000, total: true }, { etiqueta: 'Costo', valor: -168_000_000 }, { etiqueta: 'Nómina', valor: -62_000_000 }, { etiqueta: 'Arriendos', valor: -38_000_000 }, { etiqueta: 'Otros', valor: -21_000_000 }, { etiqueta: 'Utilidad', valor: 66_000_000, total: true }]} />
            </UI.Card>
          </div>
        </Seccion>

        <Seccion id="prendas" titulo="Prendas" nota="Dibujo técnico de moda, 13 tipos, coloreados por variante, sobre el gris de producto en 3:4.">
          <div className="grid grid-cols-7 gap-2">
            {TIPOS.map((t, i) => {
              const c = [e.colores.col_azc, e.colores.col_azn, e.colores.col_cml, e.colores.col_car, e.colores.col_ram, e.colores.col_bla, e.colores.col_vin][i % 7];
              return (
                <figure key={t}>
                  <UI.Prenda tipo={t} color={c?.hex ?? '#B9CBE0'} patron={c?.patron} nombre={`${t}, ${c?.nombre}`} />
                  <figcaption className="mt-2 t-small text-ink">{t}</figcaption>
                </figure>
              );
            })}
            <figure>
              <UI.Prenda tipo="blazer" color="#5A7499" vista="detalle" tamano="hero" />
              <figcaption className="mt-2 t-small text-ink">Vista detalle</figcaption>
            </figure>
          </div>
          <div className="mt-4 flex items-end gap-4">
            <UI.MiniaturaPrenda tipo="camisa" color="#B9CBE0" />
            <UI.MiniaturaPrenda tipo="camisa" color="#B9CBE0" tamano="buscador" />
            <UI.MiniaturaPrenda tipo="camisa" color="#B9CBE0" tamano="bolsa" />
            <div className="w-24">
              <UI.Prenda tipo="sweater" color="#A67C52" vista="tejido" />
            </div>
          </div>
        </Seccion>

        <Seccion id="piezas" titulo="Piezas">
          <Fila etiqueta="Avatares">
            <UI.Avatar nombre="Sebastián Cárdenas" tamano={24} />
            <UI.Avatar nombre="Sebastián Cárdenas" tamano={32} indicador="presente" />
            <UI.Avatar nombre="Natalia Ríos" tamano={40} indicador="ausente" />
            <UI.Avatar nombre="Juan Camilo Ospina" tamano={56} />
            <UI.GrupoAvatares nombres={['Sebastián Cárdenas', 'Natalia Ríos', 'Mateo Herrera', 'Daniela Moreno', 'Juliana Vargas']} />
          </Fila>
          <Fila etiqueta="Color y talla">
            {Object.values(e.colores)
              .slice(0, 8)
              .map((c, i) => (
                <UI.MuestraColor key={c.id} hex={c.hex} nombre={c.nombre} patron={c.patron} tamano={24} seleccionada={i === 2} agotada={i === 5} />
              ))}
            <span className="w-6" />
            {['S', 'M', 'L', 'XL', 'XXL'].map((t) => (
              <UI.CajaTalla key={t} talla={t} seleccionada={talla === t} agotada={t === 'XXL'} unidades={t === 'XXL' ? 0 : 3} motivo={t === 'XXL' ? 'Agotada aquí · 2 en Usaquén' : undefined} onClick={() => setTalla(t)} />
            ))}
          </Fila>
          <Fila etiqueta="Códigos">
            {variante && <UI.CodigoBarras ean={variante.ean13} copiable />}
            <UI.CodigoQR valor="https://halden.demo/app" tamano={96} mostrarUrl />
          </Fila>
          <Fila etiqueta="Términos y notas">
            <span className="t-h3">
              <UI.Termino id="porCobrar" />
            </span>
            <UI.NotaLegal tipo="nomina" />
          </Fila>
          <div className="mt-4 grid grid-cols-2 gap-6">
            <UI.Card titulo="Línea de tiempo">
              <UI.Timeline pasos={UI.pasosImportacion('en_puerto', { detalle: (x) => (x === 'en_puerto' ? 'Estimada 12/10/2026 · Real 14/10/2026' : undefined) }).slice(4, 11)} />
              <UI.TimelineCompacta estado="en_puerto" className="mt-4" />
            </UI.Card>
            <div className="relative min-h-64 overflow-hidden border border-line bg-surface p-6">
              <UI.MarcaAguaDocumento />
              <p className="t-eyebrow text-ink-2">Factura electrónica</p>
              <p className="mt-2 t-h2">HAL-FE-1043</p>
              <p className="mt-2 t-body text-muted">Vista previa con marca de agua.</p>
            </div>
          </div>
          <div className="mt-6">
            <UI.Kanban
              columnas={[{ id: 'fabrica', titulo: 'Fábrica', resumen: '2 · US$ 48,2 mil' }, { id: 'viaje', titulo: 'Viaje', resumen: '1' }, { id: 'aduana', titulo: 'Aduana', resumen: '1' }]}
              tarjetas={[
                { id: 'a', columna: 'fabrica', titulo: 'IMP-2026-09' },
                { id: 'b', columna: 'fabrica', titulo: 'IMP-2026-08' },
                { id: 'c', columna: 'viaje', titulo: 'IMP-2026-07' },
                { id: 'f', columna: 'aduana', titulo: 'IMP-2026-06' },
              ]}
              pintar={(t) => (
                <UI.TarjetaTablero>
                  <p className="t-label font-bold">{t.titulo}</p>
                  <p className="t-small text-muted">Guangzhou Huameng</p>
                  <UI.TimelineCompacta estado={t.columna === 'fabrica' ? 'en_produccion' : t.columna === 'viaje' ? 'en_transito' : 'en_nacionalizacion'} className="mt-3" />
                </UI.TarjetaTablero>
              )}
              alMover={(id, col) => avisar({ texto: `Moviste ${id} a ${col}` })}
            />
          </div>
          <div className="mt-6 flex items-start gap-8">
            <UI.MarcoTelefono src="/app?marco=1" escala={0.6} titulo="Vista previa de la app" />
            <UI.MarcoNavegador className="flex-1" titulo="Tienda" alto={420}>
              <div className="flex h-full items-center justify-center bg-tienda-hero">
                <p className="t-display text-sobre-hero">Sastrería de temporada</p>
              </div>
            </UI.MarcoNavegador>
          </div>
        </Seccion>

        <Seccion id="conectados" titulo="Conectados" nota="Leen el contexto (local, moneda, rol) y los selectores.">
          <Fila etiqueta="Cifras">
            <UI.Dinero valor={1_250_000} />
            <UI.Dinero valor={412_600_000} corta conMoneda />
            <UI.Fecha valor={hoy} formato="larga" />
            <UI.Fecha valor={`${hoy}T15:45:00`} formato="hora" />
          </Fila>
          <Fila etiqueta="Marca">
            <UI.Marca descriptor />
          </Fila>
          <Fila etiqueta="Buscadores">
            <UI.BuscadorProducto alElegir={(r) => avisar({ texto: `Elegiste ${r.producto.nombre}` })} className="w-[420px]" />
            <UI.BuscadorCliente alElegir={(c) => avisar({ texto: c ? `${c.nombres} ${c.apellidos}` : 'Consumidor final' })} alCrear={() => undefined} className="w-[360px]" />
          </Fila>
          <Fila etiqueta="Exportar">
            <UI.BotonExportar reporte="ventas" />
            <UI.BotonExportar reporte="ventas" menu />
            <UI.ImportarExcelSimulado que="tus referencias y existencias" />
          </Fila>
          <Fila etiqueta="Rol">
            <UI.SoloRol roles={['dueno']} alternativa={<span className="t-small text-muted">Oculto para este rol</span>}>
              <span className="t-small text-ink">Visible solo para el dueño</span>
            </UI.SoloRol>
          </Fila>
          <UI.AvisoNavegadorInterno forzar className="mt-2 max-w-[560px]" />
          {oxford && (
            <div className="mt-6 max-w-[880px]">
              <h3 className="mb-3 t-h3">Matriz talla × color × local · {oxford.nombre}</h3>
              <UI.MatrizExistencias productoId={oxford.id} />
            </div>
          )}
        </Seccion>

        <Seccion id="movil" titulo="App móvil (tema oscuro)">
          <div data-theme="dark" className="w-[390px] bg-canvas pb-6 text-ink">
            <EncabezadoMovil titulo="Hoy" fecha="Miércoles 30 de septiembre · Todos los locales" chip={<ChipDatosEjemplo />} />
            <div className="mt-4 px-4">
              <div className="border border-line bg-surface p-4">
                <p className="t-eyebrow text-ink-2">Vendido hoy</p>
                <p className="mt-2 t-kpi-xl">{d(7_260_000)}</p>
              </div>
              <UI.Button anchoCompleto tamano="lg" className="mt-3" onClick={() => setHoja(true)}>
                Marcar revisado
              </UI.Button>
            </div>
          </div>
          <HojaLigera abierta={hoja} alCerrar={() => setHoja(false)} titulo="Cierre de Zona Rosa" pie={<UI.Button anchoCompleto tamano="lg" onClick={() => setHoja(false)}>Marcar revisado</UI.Button>}>
            <p className="t-body text-muted">Faltan {dinero(40_000)} en efectivo. Cerró Natalia Ríos (arqueo ciego).</p>
          </HojaLigera>
        </Seccion>
      </div>
    </div>
  );
}
