import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Categoria, CurvaTallas, Id, LineaProducto, Producto, TipoPrenda } from '@/dominio/tipos';
import { margenBruto } from '@/dominio/reglas/costeo';
import { PREFIJOS } from '@/dominio/motor/ids';
import { useAcciones, usePuede, useSel } from '@/estado';
import { porcentaje, entero } from '@/lib/formato';
import { NOMBRES_CATEGORIA, NOMBRES_LINEA } from '@/seed/catalogo';
import { CURVAS_TALLAS } from '@/seed/tallas';
import { avisar, Button, CajaTalla, Dialog, Dinero, Input, InputNumero, MuestraColor, Prenda, Select, Switch, Textarea } from '@/ui';
import { selColoresActivos, selFabricas } from '../selectores';
import { CATEGORIAS_ORDEN, CURVA_POR_TIPO, NOMBRES_CURVA, TEMPORADAS, TIPOS_POR_CATEGORIA, TIPOS_PRENDA } from '../textos';

/**
 * Formulario de producto: crear (con sus tallas y colores; el SKU y el EAN-13 salen solos) y editar (datos,
 * precio, stock mínimo y tienda). Valida al perder el foco y al enviar; los errores del dominio salen junto al
 * campo que nombran. Bodega puede crear y editar datos, pero no cambia precios ni costos.
 */
interface Valores {
  nombre: string;
  categoria: Categoria | '';
  tipoPrenda: TipoPrenda | '';
  linea: LineaProducto;
  curva: CurvaTallas;
  temporada: string;
  proveedorId: Id | '';
  material: string;
  descripcion: string;
  precio: number | null;
  iva: number;
  stockMinimo: number | null;
  costo: number | null;
  publicado: boolean;
  destacado: boolean;
  tallas: string[];
  colorIds: Id[];
}

const IVAS = [
  { valor: '0.19', etiqueta: '19 % (general)' },
  { valor: '0.05', etiqueta: '5 %' },
  { valor: '0', etiqueta: 'Sin IVA' },
];

function inicialDe(p?: Producto): Valores {
  return {
    nombre: p?.nombre ?? '',
    categoria: p?.categoria ?? '',
    tipoPrenda: p?.tipoPrenda ?? '',
    linea: p?.linea ?? 'casual',
    curva: p?.curvaTallas ?? 'superior',
    temporada: p?.temporada ?? TEMPORADAS[1],
    proveedorId: p?.proveedorId ?? '',
    material: p?.material ?? '',
    descripcion: p?.descripcion ?? '',
    precio: p?.precioVenta ?? null,
    iva: p?.tarifaIva ?? 0.19,
    stockMinimo: p?.stockMinimo ?? 2,
    costo: p && p.costoVigente > 0 ? p.costoVigente : null,
    publicado: p?.publicadoEnTienda ?? true,
    destacado: p?.destacado ?? false,
    tallas: [],
    colorIds: [],
  };
}

export interface PropsFormularioProducto {
  /** Sin producto: se crea; con producto: se edita. */
  producto?: Producto;
  /** Después de guardar: crear manda a la ficha; editar se queda. */
  alGuardar: (referencia: string) => void;
  alCancelar: () => void;
}

export function FormularioProducto({ producto, alGuardar, alCancelar }: PropsFormularioProducto) {
  const acciones = useAcciones();
  const puede = usePuede();
  const editando = !!producto;
  const puedeVerCostos = puede('ver.costos');
  const puedeCambiarPrecios = puede('ver.costos');
  const fabricas = useSel(selFabricas);
  const colores = useSel(selColoresActivos);
  const [v, setV] = useState<Valores>(() => inicialDe(producto));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [dialogoColor, setDialogoColor] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cambiar = <K extends keyof Valores>(k: K, valor: Valores[K]) => setV((x) => ({ ...x, [k]: valor }));

  const validar = (x: Valores): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!x.nombre.trim()) e.nombre = 'Escribe el nombre de la referencia.';
    if (!editando) {
      if (!x.categoria) e.categoria = 'Elige la categoría.';
      if (!x.tipoPrenda) e.tipoPrenda = 'Elige el tipo de prenda.';
      if (x.tallas.length === 0) e.tallas = 'Elige al menos una talla.';
      if (x.colorIds.length === 0) e.colorIds = 'Elige al menos un color.';
    }
    if (!x.proveedorId) e.proveedorId = 'Elige la fábrica que la produce.';
    if (!x.precio || x.precio <= 0) e.precio = 'El precio de venta debe ser mayor que cero.';
    if (x.stockMinimo === null || x.stockMinimo < 0) e.stockMinimo = 'El stock mínimo no puede ser negativo.';
    return e;
  };

  const marcar = (campo: string) => {
    setTocados((t) => ({ ...t, [campo]: true }));
    setErrores(validar(v));
  };
  const error = (campo: string) => (tocados[campo] || tocados.__todo ? errores[campo] : undefined);

  const tiposDisponibles = v.categoria ? TIPOS_POR_CATEGORIA[v.categoria] : [];
  const tallasCurva = CURVAS_TALLAS[v.curva];
  const colorPrincipal = colores.find((c) => c.id === v.colorIds[0]);
  const margen = v.precio && v.costo ? margenBruto(v.precio, v.iva, v.costo) : null;
  const variantesNuevas = v.tallas.length * v.colorIds.length;

  const elegirCategoria = (c: Categoria) => {
    const tipos = TIPOS_POR_CATEGORIA[c];
    const tipo = tipos.length === 1 ? (tipos[0] as TipoPrenda) : '';
    setV((x) => ({ ...x, categoria: c, tipoPrenda: tipo, curva: tipo ? CURVA_POR_TIPO[tipo] : x.curva, tallas: [] }));
  };
  const elegirTipo = (t: TipoPrenda) => setV((x) => ({ ...x, tipoPrenda: t, curva: CURVA_POR_TIPO[t], tallas: [] }));
  const alternar = (lista: string[], valor: string) => (lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]);

  const guardar = () => {
    const e = validar(v);
    setErrores(e);
    setTocados({ __todo: true });
    if (Object.keys(e).length > 0 || enviando) return;
    setEnviando(true);
    if (editando && producto) {
      const cambios: Parameters<typeof acciones.editarProducto>[0]['cambios'] = {
        nombre: v.nombre.trim(),
        linea: v.linea,
        temporada: v.temporada,
        proveedorId: v.proveedorId as Id,
        material: v.material.trim(),
        descripcion: v.descripcion.trim(),
        stockMinimo: v.stockMinimo ?? 0,
        publicadoEnTienda: v.publicado,
        destacado: v.destacado,
        ...(puedeCambiarPrecios ? { precioVenta: v.precio ?? 0, tarifaIva: v.iva, ...(v.costo !== null && v.costo !== producto.costoVigente ? { costoManual: v.costo } : {}) } : {}),
      };
      const r = acciones.editarProducto({ productoId: producto.id, cambios });
      setEnviando(false);
      if (!r.ok) {
        setErrores({ [r.error.campo ?? '__general']: r.error.mensaje });
        setTocados({ __todo: true });
        return;
      }
      avisar({ tipo: 'exito', texto: 'Cambios guardados', detalle: `${v.nombre.trim()} · ${producto.referencia}` });
      alGuardar(producto.referencia);
      return;
    }
    const r = acciones.crearProducto({
      referencia: '',
      nombre: v.nombre.trim(),
      categoria: v.categoria as Categoria,
      linea: v.linea,
      tipoPrenda: v.tipoPrenda as TipoPrenda,
      curvaTallas: v.curva,
      temporada: v.temporada,
      proveedorId: v.proveedorId as Id,
      material: v.material.trim(),
      descripcion: v.descripcion.trim(),
      precioVenta: v.precio ?? 0,
      tarifaIva: v.iva,
      stockMinimo: v.stockMinimo ?? 0,
      publicadoEnTienda: v.publicado,
      destacado: v.destacado,
      etiquetas: [],
      tallas: v.tallas,
      colorIds: v.colorIds,
      costoManual: puedeVerCostos ? v.costo : null,
    });
    setEnviando(false);
    if (!r.ok) {
      setErrores({ [r.error.campo ?? '__general']: r.error.mensaje });
      setTocados({ __todo: true });
      return;
    }
    const nuevo = Object.values(r.despues.productos).find((p) => !r.antes.productos[p.id]);
    avisar({ tipo: 'exito', texto: `Referencia ${nuevo?.referencia ?? ''} creada`, detalle: `${variantesNuevas} variantes con su SKU y código de barras.` });
    alGuardar(nuevo?.referencia ?? '');
  };

  const opcionesFabrica = useMemo(() => fabricas.map((f) => ({ valor: f.id, etiqueta: f.nombre })), [fabricas]);

  return (
    <form
      className="grid grid-cols-12 gap-x-10 gap-y-8"
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        guardar();
      }}
      data-testid="formulario-producto"
    >
      <div className="col-span-12 space-y-10 xl:col-span-8">
        <section aria-labelledby="f-datos">
          <h2 id="f-datos" className="t-h2 text-ink">
            Datos de la referencia
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
            <Input
              className="col-span-2"
              etiqueta="Nombre"
              value={v.nombre}
              onChange={(e) => cambiar('nombre', e.target.value)}
              onBlur={() => marcar('nombre')}
              error={error('nombre')}
              placeholder="Camisa Oxford entallada"
              data-testid="producto-nombre"
            />
            {editando ? (
              <>
                <Input etiqueta="Referencia" value={producto?.referencia ?? ''} readOnly ayuda="No cambia: es la que usan la tienda y las etiquetas." />
                <Input etiqueta="Categoría" value={v.categoria ? `${NOMBRES_CATEGORIA[v.categoria]} · ${TIPOS_PRENDA[v.tipoPrenda as TipoPrenda] ?? ''}` : ''} readOnly />
              </>
            ) : (
              <>
                <Select
                  etiqueta="Categoría"
                  valor={v.categoria || null}
                  alCambiar={(c) => elegirCategoria(c as Categoria)}
                  opciones={CATEGORIAS_ORDEN.map((c) => ({ valor: c, etiqueta: NOMBRES_CATEGORIA[c] }))}
                  placeholder="Elige la categoría"
                  error={error('categoria')}
                  data-testid="producto-categoria"
                />
                <Select
                  etiqueta="Tipo de prenda"
                  valor={v.tipoPrenda || null}
                  alCambiar={(t) => elegirTipo(t as TipoPrenda)}
                  opciones={tiposDisponibles.map((t) => ({ valor: t, etiqueta: TIPOS_PRENDA[t] }))}
                  placeholder={v.categoria ? 'Elige el tipo' : 'Primero la categoría'}
                  deshabilitado={!v.categoria}
                  error={error('tipoPrenda')}
                  data-testid="producto-tipo"
                />
              </>
            )}
            <Select etiqueta="Línea" valor={v.linea} alCambiar={(l) => cambiar('linea', l as LineaProducto)} opciones={(Object.keys(NOMBRES_LINEA) as LineaProducto[]).map((l) => ({ valor: l, etiqueta: NOMBRES_LINEA[l] }))} />
            <Select etiqueta="Temporada" valor={v.temporada} alCambiar={(t) => cambiar('temporada', t)} opciones={TEMPORADAS.map((t) => ({ valor: t, etiqueta: t }))} />
            <Select
              className="col-span-2"
              etiqueta="Fábrica"
              valor={v.proveedorId || null}
              alCambiar={(f) => cambiar('proveedorId', f)}
              opciones={opcionesFabrica}
              placeholder="Elige la fábrica"
              error={error('proveedorId')}
              data-testid="producto-proveedor"
            />
            <Input className="col-span-2" etiqueta="Material" opcional value={v.material} onChange={(e) => cambiar('material', e.target.value)} placeholder="100 % algodón Oxford" />
            <Textarea className="col-span-2" etiqueta="Descripción" opcional value={v.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} placeholder="Corte, caída, detalles; es lo que lee el cliente en la tienda" rows={3} />
          </div>
        </section>

        {!editando && (
          <section aria-labelledby="f-variantes">
            <h2 id="f-variantes" className="t-h2 text-ink">
              Tallas y colores
            </h2>
            <p className="mt-1 max-w-[72ch] t-body text-muted">Cada talla en cada color es una variante con su propio SKU y código de barras EAN-13, creados al guardar.</p>
            <div className="mt-4">
              <p className="mb-1.5 t-label text-ink">Tallas · {NOMBRES_CURVA[v.curva]}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Tallas">
                {tallasCurva.map((t) => (
                  <CajaTalla key={t} talla={t} seleccionada={v.tallas.includes(t)} onClick={() => { cambiar('tallas', alternar(v.tallas, t)); }} />
                ))}
              </div>
              {error('tallas') && <p className="mt-1.5 t-small text-danger">{error('tallas')}</p>}
            </div>
            <div className="mt-6">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="t-label text-ink">Colores</p>
                <Button variante="ghost" tamano="sm" icono={Plus} onClick={() => setDialogoColor(true)}>
                  Crear color
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4" role="group" aria-label="Colores">
                {colores.map((c) => {
                  const activo = v.colorIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => cambiar('colorIds', alternar(v.colorIds, c.id))}
                      data-testid={`color-${c.id}`}
                      className={`flex h-11 items-center gap-2.5 border px-3 text-left t-body transition-colors duration-(--dur-instant) ${activo ? 'border-ink bg-selected font-semibold' : 'border-line-strong bg-surface hover:border-ink'}`}
                    >
                      <MuestraColor hex={c.hex} nombre={c.nombre} patron={c.patron} tamano={16} />
                      <span className="truncate">{c.nombre}</span>
                    </button>
                  );
                })}
              </div>
              {error('colorIds') && <p className="mt-1.5 t-small text-danger">{error('colorIds')}</p>}
            </div>
          </section>
        )}

        <section aria-labelledby="f-precio">
          <h2 id="f-precio" className="t-h2 text-ink">
            Precio y stock
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
            <InputNumero
              etiqueta="Precio de venta (IVA incluido)"
              prefijo="$"
              valor={v.precio}
              alCambiar={(n) => cambiar('precio', n)}
              onBlur={() => marcar('precio')}
              error={error('precio')}
              readOnly={!puedeCambiarPrecios && editando}
              ayuda={!puedeCambiarPrecios && editando ? 'Solo el dueño cambia precios y costos.' : undefined}
              data-testid="producto-precio"
            />
            <Select etiqueta="IVA" valor={String(v.iva)} alCambiar={(x) => cambiar('iva', Number(x))} opciones={IVAS} deshabilitado={!puedeCambiarPrecios && editando} />
            <InputNumero
              etiqueta="Stock mínimo"
              valor={v.stockMinimo}
              alCambiar={(n) => cambiar('stockMinimo', n)}
              onBlur={() => marcar('stockMinimo')}
              error={error('stockMinimo')}
              ayuda="Por talla y color en cada local: debajo de esto, la celda se marca y aparece la alerta."
              data-testid="producto-minimo"
            />
            {puedeVerCostos && (
              <InputNumero
                etiqueta="Costo unitario"
                opcional
                prefijo="$"
                valor={v.costo}
                alCambiar={(n) => cambiar('costo', n)}
                ayuda={margen !== null ? `Con este costo, el margen sobre el precio sin IVA es ${porcentaje(margen, 0)}.` : 'Si la mercancía viene de una importación, el costo real lo pone "Aplicar al inventario".'}
                data-testid="producto-costo"
              />
            )}
          </div>
        </section>

        <section aria-labelledby="f-tienda">
          <h2 id="f-tienda" className="t-h2 text-ink">
            Tienda web
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            <Switch etiqueta="Publicar en la tienda web" activo={v.publicado} alCambiar={(a) => cambiar('publicado', a)} />
            <Switch etiqueta="Destacar en la portada de la tienda" activo={v.destacado} alCambiar={(a) => cambiar('destacado', a)} />
          </div>
        </section>

        {errores.__general && <p className="t-body text-danger">{errores.__general}</p>}

        <div className="flex items-center gap-3 border-t border-line pt-6">
          <Button type="submit" cargando={enviando} data-testid="producto-guardar">
            {editando ? 'Guardar cambios' : 'Crear producto'}
          </Button>
          <Button variante="secondary" onClick={alCancelar}>
            Cancelar
          </Button>
          {!editando && variantesNuevas > 0 && <span className="t-small num text-muted">Se crearán {entero(variantesNuevas)} variantes.</span>}
        </div>
      </div>

      <aside className="col-span-12 xl:col-span-4" aria-label="Vista previa">
        <div className="sticky top-(--sticky-top) border border-line bg-surface p-5 xl:mt-1">
          <p className="mb-3 t-eyebrow text-ink-2">Así se verá</p>
          {v.tipoPrenda ? (
            <Prenda tipo={v.tipoPrenda} color={colorPrincipal?.hex ?? '#C9C9C7'} patron={colorPrincipal?.patron} nombre={v.nombre || 'Vista previa de la prenda'} tamano="hero" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center bg-product px-8 text-center t-body text-muted">Elige la categoría y el tipo de prenda para ver su ilustración.</div>
          )}
          <p className="mt-3 t-nav text-ink">{v.nombre || 'Nombre de la referencia'}</p>
          {v.precio ? (
            <p className="t-body-lg num text-ink">
              <Dinero valor={v.precio} />
            </p>
          ) : null}
        </div>
      </aside>

      <ColorNuevo abierto={dialogoColor} alCambiar={setDialogoColor} alCrear={(id) => cambiar('colorIds', [...v.colorIds, id])} />
    </form>
  );
}

function ColorNuevo({ abierto, alCambiar, alCrear }: { abierto: boolean; alCambiar: (a: boolean) => void; alCrear: (id: Id) => void }) {
  const acciones = useAcciones();
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [hex, setHex] = useState('#1F2A44');
  const [error, setError] = useState<{ campo: string; mensaje: string } | null>(null);
  const crear = () => {
    const colorId = acciones.nuevoId(PREFIJOS.color);
    const r = acciones.crearColor({ colorId, nombre, hex, codigo });
    if (!r.ok) {
      setError({ campo: r.error.campo ?? 'nombre', mensaje: r.error.mensaje });
      return;
    }
    alCrear(colorId);
    setNombre('');
    setCodigo('');
    setError(null);
    alCambiar(false);
    avisar({ tipo: 'exito', texto: `Color ${nombre.trim()} creado` });
  };
  return (
    <Dialog
      abierto={abierto}
      alCambiar={alCambiar}
      eyebrow="Catálogo"
      titulo="Crear un color"
      ancho="sm"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={crear} disabled={!nombre.trim() || codigo.length !== 3}>
            Crear color
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} error={error?.campo === 'nombre' ? error.mensaje : undefined} placeholder="Azul petróleo" />
        <Input
          etiqueta="Código de tres letras"
          value={codigo}
          maxLength={3}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          error={error?.campo === 'codigo' ? error.mensaje : undefined}
          ayuda="Va dentro del SKU, por ejemplo AZP."
          placeholder="AZP"
        />
        <div className="flex items-end gap-3">
          <Input className="flex-1" etiqueta="Color (#RRGGBB)" value={hex} onChange={(e) => setHex(e.target.value)} error={error?.campo === 'hex' ? error.mensaje : undefined} />
          <MuestraColor hex={/^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#C9C9C7'} nombre="Vista previa del color" tamano={24} className="mb-2" />
        </div>
      </div>
    </Dialog>
  );
}
