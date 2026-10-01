import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Dialog, GrupoRadio, Input, InputNumero, Select, avisar } from '@/ui';
import { PREFIJOS } from '@/dominio/motor/ids';
import type { ComponenteComision, COP, EsquemaComision, Id, Local, MesISO, MetaVentas } from '@/dominio/tipos';
import { useAcciones } from '@/estado';
import { mesAnio } from '@/lib/formato';
import { ETIQUETA_COMPONENTE, frasesEsquema, validarEsquema, type CampoEsquema } from '../calculos';
import { FraseVista } from './Piezas';

/**
 * Esquemas de comisión (PRD 7.9): porcentaje sobre ventas, escalonado por metas y bono por cumplimiento de la meta del
 * local. El formulario trabaja en porcentajes (3 = 3 %) y guarda fracciones (0,03). La validación es la del dominio.
 */
interface ComponenteBorrador {
  clave: string;
  tipo: ComponenteComision['tipo'];
  /** porcentaje (en %). */
  porcentaje: number | null;
  /** escalonado. */
  modo: 'total' | 'marginal';
  tramos: { clave: string; desde: number | null; porcentaje: number | null }[];
  /** bono: valor y cumplimiento mínimo (en %). */
  valor: number | null;
  cumplimiento: number | null;
}

let contadorClaves = 0;
const clave = () => `c${(contadorClaves += 1)}`;

const aPorcentaje = (f: number) => Math.round(f * 10000) / 100;

function desdeComponente(c: ComponenteComision): ComponenteBorrador {
  const base: ComponenteBorrador = { clave: clave(), tipo: c.tipo, porcentaje: null, modo: 'total', tramos: [], valor: null, cumplimiento: 100 };
  if (c.tipo === 'porcentaje') return { ...base, porcentaje: aPorcentaje(c.porcentaje) };
  if (c.tipo === 'escalonado') return { ...base, modo: c.modo, tramos: c.tramos.map((t) => ({ clave: clave(), desde: t.desde, porcentaje: aPorcentaje(t.porcentaje) })) };
  return { ...base, valor: c.valor, cumplimiento: aPorcentaje(c.cumplimientoMinimo) };
}

function nuevoComponente(tipo: ComponenteComision['tipo']): ComponenteBorrador {
  const base: ComponenteBorrador = { clave: clave(), tipo, porcentaje: null, modo: 'total', tramos: [], valor: null, cumplimiento: 100 };
  if (tipo === 'escalonado') return { ...base, tramos: [{ clave: clave(), desde: 0, porcentaje: null }] };
  return base;
}

function haciaComponente(b: ComponenteBorrador): ComponenteComision {
  if (b.tipo === 'porcentaje') return { tipo: 'porcentaje', porcentaje: (b.porcentaje ?? 0) / 100 };
  if (b.tipo === 'escalonado') return { tipo: 'escalonado', modo: b.modo, tramos: b.tramos.map((t) => ({ desde: t.desde ?? 0, porcentaje: (t.porcentaje ?? 0) / 100 })) };
  return { tipo: 'bono_meta_local', valor: b.valor ?? 0, cumplimientoMinimo: (b.cumplimiento ?? 0) / 100 };
}

export function DialogoEsquema({ esquema, alCerrar }: { esquema: EsquemaComision | null; alCerrar: () => void }) {
  const acciones = useAcciones();
  const edicion = !!esquema;
  const inicial = useMemo(
    () => ({ nombre: esquema?.nombre ?? '', base: esquema?.base ?? ('base_sin_iva' as EsquemaComision['base']), componentes: (esquema?.componentes ?? [{ tipo: 'porcentaje', porcentaje: 0.03 } as ComponenteComision]).map(desdeComponente) }),
    [esquema],
  );
  const [nombre, setNombre] = useState(inicial.nombre);
  const [base, setBase] = useState(inicial.base);
  const [componentes, setComponentes] = useState<ComponenteBorrador[]>(inicial.componentes);
  const [errores, setErrores] = useState<Partial<Record<CampoEsquema, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const sucio = JSON.stringify({ nombre, base, componentes }) !== JSON.stringify(inicial);

  const finales = componentes.map(haciaComponente);
  const vistaPrevia = frasesEsquema({ base, componentes: finales });

  const cambiar = (k: string, cambios: Partial<ComponenteBorrador>) => setComponentes((cs) => cs.map((c) => (c.clave === k ? { ...c, ...cambios } : c)));

  const guardar = () => {
    setErrorGeneral(null);
    const e = validarEsquema({ nombre, componentes: finales });
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    const datos = { nombre: nombre.trim(), base, componentes: finales };
    const r = edicion
      ? acciones.editarEsquemaComision({ esquemaId: (esquema as EsquemaComision).id, cambios: datos })
      : acciones.crearEsquemaComision({ esquemaId: acciones.nuevoId(PREFIJOS.esquema), datos });
    if (!r.ok) {
      if (r.error.campo === 'nombre' || r.error.campo === 'componentes') setErrores({ [r.error.campo]: r.error.mensaje });
      else setErrorGeneral(r.error.mensaje);
      return;
    }
    avisar({ tipo: 'exito', texto: edicion ? 'Esquema actualizado' : 'Esquema creado', detalle: datos.nombre });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Comisiones"
      titulo={edicion ? 'Editar esquema de comisión' : 'Nuevo esquema de comisión'}
      descripcion="Define cómo se calcula lo que gana un vendedor. Al guardar, la comisión del mes se recalcula en todas las pantallas."
      ancho="lg"
      confirmarAlCerrar={sucio}
      data-testid="personal-dialogo-esquema"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="personal-guardar-esquema">
            {edicion ? 'Guardar cambios' : 'Crear esquema'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-6"
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
        noValidate
      >
        <Input
          etiqueta="Nombre del esquema"
          placeholder="Ej.: 3 % sobre tus ventas sin IVA"
          value={nombre}
          onChange={(ev) => {
            setNombre(ev.target.value);
            if (errores.nombre) setErrores((p) => ({ ...p, nombre: undefined }));
          }}
          error={errores.nombre}
          autoComplete="off"
          data-testid="personal-esquema-nombre"
        />
        <GrupoRadio
          etiqueta="¿Sobre qué venta se calcula?"
          tarjetas
          columnas={2}
          valor={base}
          alCambiar={setBase}
          opciones={[
            { valor: 'base_sin_iva', etiqueta: 'Venta sin IVA', descripcion: 'El IVA no es del vendedor: es lo recomendado.' },
            { valor: 'total_con_iva', etiqueta: 'Venta con IVA', descripcion: 'La comisión sube con el impuesto.' },
          ]}
        />

        <div className="flex flex-col gap-4">
          <p className="t-label text-ink">Cómo se paga</p>
          {componentes.map((c, i) => (
            <div key={c.clave} className="border border-line p-4" data-testid={`personal-componente-form-${i}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="t-eyebrow text-ink-2">{ETIQUETA_COMPONENTE[c.tipo]}</p>
                {componentes.length > 1 && (
                  <Button variante="ghost" tamano="sm" icono={Trash2} onClick={() => setComponentes((cs) => cs.filter((x) => x.clave !== c.clave))}>
                    Quitar
                  </Button>
                )}
              </div>
              {c.tipo === 'porcentaje' && (
                <div className="mt-3 max-w-[240px]">
                  <InputNumero etiqueta="Porcentaje" sufijo="%" decimales={2} valor={c.porcentaje} alCambiar={(v) => cambiar(c.clave, { porcentaje: v })} data-testid="personal-esquema-porcentaje" />
                </div>
              )}
              {c.tipo === 'escalonado' && (
                <div className="mt-3 flex flex-col gap-3">
                  <Select
                    etiqueta="Cómo se aplica el porcentaje"
                    valor={c.modo}
                    alCambiar={(v) => cambiar(c.clave, { modo: v as 'total' | 'marginal' })}
                    enModal
                    opciones={[
                      { valor: 'total', etiqueta: 'Del tramo alcanzado, sobre todas las ventas' },
                      { valor: 'marginal', etiqueta: 'Cada porcentaje solo sobre su tramo' },
                    ]}
                  />
                  {c.tramos.map((t, j) => (
                    <div key={t.clave} className="grid grid-cols-[1fr_1fr_auto] items-end gap-4">
                      <InputNumero
                        etiqueta={j === 0 ? 'Desde (ventas del mes)' : `Tramo ${j + 1}: desde`}
                        prefijo="$"
                        valor={t.desde}
                        alCambiar={(v) => cambiar(c.clave, { tramos: c.tramos.map((x) => (x.clave === t.clave ? { ...x, desde: v } : x)) })}
                      />
                      <InputNumero
                        etiqueta="Porcentaje"
                        sufijo="%"
                        decimales={2}
                        valor={t.porcentaje}
                        alCambiar={(v) => cambiar(c.clave, { tramos: c.tramos.map((x) => (x.clave === t.clave ? { ...x, porcentaje: v } : x)) })}
                      />
                      <Button variante="ghost" tamano="sm" icono={Trash2} disabled={c.tramos.length <= 1} aria-label="Quitar tramo" onClick={() => cambiar(c.clave, { tramos: c.tramos.filter((x) => x.clave !== t.clave) })} />
                    </div>
                  ))}
                  <div>
                    <Button
                      variante="secondary"
                      tamano="sm"
                      icono={Plus}
                      onClick={() => {
                        const ultimo = c.tramos[c.tramos.length - 1];
                        cambiar(c.clave, { tramos: [...c.tramos, { clave: clave(), desde: ultimo?.desde ? ultimo.desde + 10_000_000 : null, porcentaje: null }] });
                      }}
                    >
                      Agregar tramo
                    </Button>
                  </div>
                </div>
              )}
              {c.tipo === 'bono_meta_local' && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <InputNumero etiqueta="Valor del bono" prefijo="$" valor={c.valor} alCambiar={(v) => cambiar(c.clave, { valor: v })} />
                  <InputNumero etiqueta="Se paga si el local llega al" sufijo="%" valor={c.cumplimiento} alCambiar={(v) => cambiar(c.clave, { cumplimiento: v })} ayuda="De la meta de ventas del mes." />
                </div>
              )}
            </div>
          ))}
          {errores.componentes && (
            <p role="alert" className="border border-danger bg-danger-soft px-4 py-3 t-body text-ink" data-testid="personal-esquema-error">
              {errores.componentes}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {(['porcentaje', 'escalonado', 'bono_meta_local'] as const).map((t) => (
              <Button key={t} variante="secondary" tamano="sm" icono={Plus} onClick={() => setComponentes((cs) => [...cs, nuevoComponente(t)])}>
                {ETIQUETA_COMPONENTE[t]}
              </Button>
            ))}
          </div>
        </div>

        <div className="border border-line bg-surface-2 p-4" data-testid="personal-esquema-vista">
          <p className="t-eyebrow text-ink-2">Así lo ve el vendedor</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {vistaPrevia.map((f, i) => (
              <li key={i}>
                <FraseVista frase={f} className="t-body text-ink-2" />
              </li>
            ))}
          </ul>
        </div>

        {errorGeneral && (
          <p role="alert" className="border border-danger bg-danger-soft px-4 py-3 t-body text-ink">
            {errorGeneral}
          </p>
        )}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Meta de ventas de un local
// ---------------------------------------------------------------------------------------------------------
export function DialogoMeta({ local, mes, meta, alCerrar }: { local: Local; mes: MesISO; meta: MetaVentas | null; alCerrar: () => void }) {
  const acciones = useAcciones();
  const [valor, setValor] = useState<COP | null>(meta?.valor ?? null);
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    if (!valor || valor <= 0) return setError('La meta debe ser mayor que cero.');
    const metaId: Id = meta?.id ?? acciones.nuevoId(PREFIJOS.meta);
    const r = acciones.fijarMeta({ metaId, localId: local.id, mes, valor });
    if (!r.ok) return setError(r.error.mensaje);
    avisar({ tipo: 'exito', texto: 'Meta guardada', detalle: `${local.nombre} · ${mesAnio(mes)}` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Metas"
      titulo={`Meta de ${local.nombre}`}
      descripcion={`Lo que debe vender el local en ${mesAnio(mes)}, con IVA. Si lo alcanza, los esquemas con bono por meta pagan el bono a su equipo.`}
      ancho="sm"
      confirmarAlCerrar={valor !== (meta?.valor ?? null)}
      data-testid="personal-dialogo-meta"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="personal-guardar-meta">
            Guardar meta
          </Button>
        </>
      }
    >
      <InputNumero
        etiqueta="Meta del mes"
        prefijo="$"
        valor={valor}
        alCambiar={(v) => {
          setValor(v);
          setError(null);
        }}
        error={error ?? undefined}
        data-testid="personal-meta-valor"
      />
    </Dialog>
  );
}
