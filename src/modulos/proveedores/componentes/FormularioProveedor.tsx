import { useMemo, useState } from 'react';
import type { Categoria, CategoriaProveedorLocal, DatosProveedor, Moneda, Proveedor, TipoProveedor } from '@/dominio/tipos';
import { PREFIJOS } from '@/dominio/motor/ids';
import { useAcciones, useSel } from '@/estado';
import { selLocalesQueVenden } from '@/selectores';
import { rutas } from '@/app/rutas';
import { Button, Checkbox, Dialog, GrupoRadio, Input, InputNumero, Select, Textarea, avisar } from '@/ui';
import { validarProveedor, type ErroresProveedor } from '../calculos';
import { CATEGORIAS_LOCAL, CATEGORIAS_PRODUCTO, NOMBRES_MONEDA, TIPOS_PROVEEDOR } from '../textos';
import { Estrellas } from './Piezas';

/** Crear o editar un proveedor (fábrica o local). Las reglas son las del dominio; aquí solo se adelantan los mensajes. */

interface Borrador {
  tipo: TipoProveedor;
  nombre: string;
  nombreCorto: string;
  nit: string;
  ciudad: string;
  pais: string;
  moneda: Moneda;
  condicionesPago: string;
  dias: number | null;
  categoriaLocal: CategoriaProveedorLocal | '';
  localId: string;
  categoriasProducto: Categoria[];
  calificacion: 1 | 2 | 3 | 4 | 5;
  nota: string;
}

const POR_DEFECTO: Record<TipoProveedor, Pick<Borrador, 'ciudad' | 'pais' | 'moneda' | 'condicionesPago' | 'dias'>> = {
  fabrica: { ciudad: '', pais: 'China', moneda: 'USD', condicionesPago: '30 % anticipo, 70 % al quedar listo para despacho', dias: 40 },
  local: { ciudad: 'Bogotá', pais: 'Colombia', moneda: 'COP', condicionesPago: '', dias: null },
};

function borradorDe(p: Proveedor | null): Borrador {
  if (!p)
    return {
      tipo: 'fabrica',
      nombre: '',
      nombreCorto: '',
      nit: '',
      ...POR_DEFECTO.fabrica,
      categoriaLocal: '',
      localId: 'ninguno',
      categoriasProducto: [],
      calificacion: 4,
      nota: '',
    };
  return {
    tipo: p.tipo,
    nombre: p.nombre,
    nombreCorto: p.nombreCorto,
    nit: p.nit ?? '',
    ciudad: p.ciudad,
    pais: p.pais,
    moneda: p.moneda,
    condicionesPago: p.condicionesPago,
    dias: p.diasEntregaPactados,
    categoriaLocal: p.categoriaLocal ?? '',
    localId: p.localId ?? 'ninguno',
    categoriasProducto: [...p.categoriasProducto],
    calificacion: p.calificacion,
    nota: p.nota ?? '',
  };
}

export interface PropsFormularioProveedor {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  /** null = proveedor nuevo. */
  proveedor: Proveedor | null;
  /** Después de crear (con el id nuevo) o de editar. */
  alGuardar?: (id: string, creado: boolean) => void;
}

export function FormularioProveedor({ abierto, alCambiar, proveedor, alGuardar }: PropsFormularioProveedor) {
  if (!abierto) return null;
  return <Cuerpo key={proveedor?.id ?? 'nuevo'} alCambiar={alCambiar} proveedor={proveedor} alGuardar={alGuardar} />;
}

function Cuerpo({ alCambiar, proveedor, alGuardar }: Omit<PropsFormularioProveedor, 'abierto'>) {
  const acciones = useAcciones();
  const locales = useSel(selLocalesQueVenden);
  const inicial = useMemo(() => borradorDe(proveedor), [proveedor]);
  const [b, setB] = useState<Borrador>(inicial);
  const [errores, setErrores] = useState<ErroresProveedor & { moneda?: string; general?: string }>({});
  const editando = proveedor !== null;
  const sucio = JSON.stringify(b) !== JSON.stringify(inicial);
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => {
    setB((x) => ({ ...x, [k]: v }));
    setErrores((e) => ({ ...e, [k]: undefined, general: undefined }));
  };
  const fabrica = b.tipo === 'fabrica';

  const cambiarTipo = (tipo: TipoProveedor) => setB((x) => ({ ...x, tipo, ...POR_DEFECTO[tipo] }));

  const guardar = () => {
    const e = validarProveedor(b);
    if (Object.keys(e).length) {
      setErrores(e);
      return;
    }
    const datos: DatosProveedor = {
      tipo: b.tipo,
      nombre: b.nombre.trim(),
      nombreCorto: b.nombreCorto.trim(),
      nit: !fabrica && b.nit.trim() ? b.nit.trim() : null,
      ciudad: b.ciudad.trim(),
      pais: b.pais.trim() || (fabrica ? 'China' : 'Colombia'),
      moneda: b.moneda,
      condicionesPago: b.condicionesPago.trim(),
      diasEntregaPactados: fabrica ? b.dias : null,
      categoriaLocal: !fabrica && b.categoriaLocal ? b.categoriaLocal : null,
      localId: !fabrica && b.localId !== 'ninguno' ? b.localId : null,
      categoriasProducto: fabrica ? b.categoriasProducto : [],
      calificacion: b.calificacion,
      contactoIds: proveedor?.contactoIds ?? [],
      nota: b.nota.trim() || null,
    };
    if (editando) {
      const { contactoIds: _sin, ...cambios } = datos;
      const r = acciones.editarProveedor({ proveedorId: proveedor.id, cambios });
      if (!r.ok) return setErrores(errorDe(r.error.campo, r.error.mensaje));
      avisar({ tipo: 'exito', texto: `Cambios guardados en ${datos.nombreCorto}` });
      alGuardar?.(proveedor.id, false);
    } else {
      const id = acciones.nuevoId(PREFIJOS.proveedor);
      const r = acciones.crearProveedor({ proveedorId: id, datos });
      if (!r.ok) return setErrores(errorDe(r.error.campo, r.error.mensaje));
      avisar({ tipo: 'exito', texto: `${datos.nombreCorto} quedó en tu directorio`, accion: { texto: 'Ver ficha', a: rutas.proveedor(id) } });
      alGuardar?.(id, true);
    }
    alCambiar(false);
  };

  const alternarCategoria = (c: Categoria, marcado: boolean) =>
    set('categoriasProducto', marcado ? [...b.categoriasProducto, c] : b.categoriasProducto.filter((x) => x !== c));

  return (
    <Dialog
      abierto
      alCambiar={alCambiar}
      confirmarAlCerrar={sucio}
      ancho="lg"
      data-testid="formulario-proveedor"
      eyebrow="Proveedores"
      titulo={editando ? `Editar ${proveedor.nombreCorto}` : 'Nuevo proveedor'}
      descripcion={editando ? undefined : 'Registra una fábrica o un proveedor local para ver cuánto le compras, cuánto le debes y cómo te cumple.'}
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="guardar-proveedor">
            {editando ? 'Guardar cambios' : 'Crear proveedor'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
        noValidate
      >
        {errores.general && (
          <p role="alert" className="border border-danger bg-danger-soft px-3 py-2 t-small text-ink">
            {errores.general}
          </p>
        )}
        {!editando && (
          <GrupoRadio<TipoProveedor>
            tarjetas
            columnas={2}
            etiqueta="¿Qué tipo de proveedor es?"
            valor={b.tipo}
            alCambiar={cambiarTipo}
            opciones={(['fabrica', 'local'] as const).map((t) => ({ valor: t, etiqueta: TIPOS_PROVEEDOR[t].etiqueta, descripcion: TIPOS_PROVEEDOR[t].descripcion }))}
          />
        )}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Input className="col-span-2" etiqueta="Nombre legal" value={b.nombre} onChange={(e) => set('nombre', e.target.value)} error={errores.nombre} placeholder={fabrica ? 'Guangzhou Huameng Garment Co., Ltd.' : 'Inmuebles Altamira 93 S.A.S.'} data-testid="campo-nombre" />
          <Input etiqueta="Nombre corto" value={b.nombreCorto} onChange={(e) => set('nombreCorto', e.target.value)} error={errores.nombreCorto} ayuda="Así lo verás en listas y gráficos." placeholder={fabrica ? 'Guangzhou Huameng' : 'Inmuebles Altamira 93'} data-testid="campo-nombre-corto" />
          {fabrica ? (
            <InputNumero etiqueta="Días de entrega pactados" opcional valor={b.dias} alCambiar={(v) => set('dias', v)} sufijo="días" ayuda="Tiempo de producción que te promete la fábrica." />
          ) : (
            <Input etiqueta="NIT" opcional value={b.nit} onChange={(e) => set('nit', e.target.value)} placeholder="900.618.244-9" inputMode="numeric" />
          )}
          <Input etiqueta="Ciudad" value={b.ciudad} onChange={(e) => set('ciudad', e.target.value)} error={errores.ciudad} placeholder={fabrica ? 'Guangzhou' : 'Bogotá'} data-testid="campo-ciudad" />
          <Input etiqueta="País" value={b.pais} onChange={(e) => set('pais', e.target.value)} />
          <Select
            etiqueta="Moneda en la que te cobra"
            enModal
            valor={b.moneda}
            alCambiar={(v) => set('moneda', v as Moneda)}
            opciones={(['USD', 'CNY', 'COP'] as const).map((m) => ({ valor: m, etiqueta: NOMBRES_MONEDA[m] }))}
            error={errores.moneda}
            data-testid="campo-moneda"
          />
          <Input className="col-span-2" etiqueta="Condiciones de pago" value={b.condicionesPago} onChange={(e) => set('condicionesPago', e.target.value)} error={errores.condicionesPago} placeholder={fabrica ? '30 % anticipo, 70 % al quedar listo para despacho' : 'Mensual anticipado, vence el día 5'} data-testid="campo-condiciones" />
          {fabrica ? (
            <fieldset className="col-span-2">
              <legend className="mb-1.5 t-label text-ink">
                Qué te fabrica <span className="font-normal text-muted">(opcional)</span>
              </legend>
              <div className="grid grid-cols-3 gap-x-4 gap-y-0.5">
                {(Object.keys(CATEGORIAS_PRODUCTO) as Categoria[]).map((c) => (
                  <Checkbox key={c} etiqueta={CATEGORIAS_PRODUCTO[c]} marcado={b.categoriasProducto.includes(c)} alCambiar={(v) => alternarCategoria(c, v)} />
                ))}
              </div>
            </fieldset>
          ) : (
            <>
              <Select
                etiqueta="Qué te vende"
                opcional
                enModal
                valor={b.categoriaLocal || 'ninguna'}
                alCambiar={(v) => set('categoriaLocal', v === 'ninguna' ? '' : (v as CategoriaProveedorLocal))}
                opciones={[{ valor: 'ninguna', etiqueta: 'Sin categoría' }, ...(Object.keys(CATEGORIAS_LOCAL) as CategoriaProveedorLocal[]).map((c) => ({ valor: c, etiqueta: CATEGORIAS_LOCAL[c] }))]}
              />
              <Select
                etiqueta="Local al que atiende"
                opcional
                enModal
                valor={b.localId}
                alCambiar={(v) => set('localId', v)}
                ayuda="Para arrendadores y servicios de un local. Déjalo en “Todos” si atiende a todo el negocio."
                opciones={[{ valor: 'ninguno', etiqueta: 'Todos los locales' }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
              />
            </>
          )}
          <div className="col-span-2">
            <p className="mb-1 t-label text-ink">Tu calificación</p>
            <Estrellas valor={b.calificacion} alCambiar={(v) => set('calificacion', v)} tamano={18} />
            <p className="mt-1 t-small text-muted">Es tu opinión interna; la puntualidad y los defectos se calculan solos con las entregas.</p>
          </div>
          <Textarea className="col-span-2" etiqueta="Nota" opcional value={b.nota} onChange={(e) => set('nota', e.target.value)} placeholder="Lo que quieras recordar de este proveedor" />
        </div>
        {/* Enviar con Enter desde un campo. */}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}

/** Lleva el error del dominio al campo que corresponde; si no hay campo visible, lo muestra arriba. */
function errorDe(campo: string | undefined, mensaje: string): ErroresProveedor & { moneda?: string; general?: string } {
  switch (campo) {
    case 'nombre':
    case 'nombreCorto':
    case 'moneda':
      return { [campo]: mensaje };
    default:
      return { general: mensaje };
  }
}
