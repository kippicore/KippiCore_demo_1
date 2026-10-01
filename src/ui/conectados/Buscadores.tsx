import { UserPlus } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import type { Cliente, Id } from '@/dominio/tipos';
import { useDinero, useEstadoDominio, useFiltroLocal, useHoy, useSel } from '@/estado';
import { selBuscarProducto, selClientes, selExistencia, selVariantePorEan, selVariantesPorProducto, type ResultadoBusqueda } from '@/selectores';
import { celular, entero } from '@/lib/formato';
import { Combobox, Resaltado } from '../primitivos/Combobox';
import { Icono } from '../primitivos/Icono';
import { Avatar } from '../primitivos/Piezas';
import { MiniaturaPrenda } from '../prenda/Prenda';

/**
 * Buscadores conectados (PLAN 8.7.4). Filtran con los selectores (sin tildes, por nombre, referencia, SKU o EAN) y
 * muestran el ítem rico de 8.7.4.
 *
 *   <BuscadorProducto alElegir={(r) => agregar(r.variante ?? null, r.producto)} autoFocus />   // POS: Enter con un EAN-13 elige la variante
 *   <BuscadorCliente alElegir={(c) => setCliente(c)} alCrear={(texto) => abrirCrear(texto)} />   // primera opción fija: Consumidor final
 */
export interface PropsBuscadorProducto {
  alElegir: (r: ResultadoBusqueda) => void;
  placeholder?: string;
  /** Local para "14 en este local" (por defecto, el del contexto). */
  localId?: Id | 'todos';
  autoFocus?: boolean;
  enModal?: boolean;
  className?: string;
}

export function BuscadorProducto({ alElegir, placeholder = 'Buscar por nombre, referencia o código', localId, autoFocus, enModal, className }: PropsBuscadorProducto) {
  const [texto, setTexto] = useState('');
  const diferido = useDeferredValue(texto);
  const e = useEstadoDominio();
  const contexto = useFiltroLocal();
  const local = localId ?? contexto;
  const d = useDinero();
  const resultados = useSel(selBuscarProducto, { texto: diferido, limite: 8 });
  const variantes = useSel(selVariantesPorProducto);
  const existencias = (productoId: Id) => {
    let n = 0;
    for (const v of variantes[productoId] ?? []) {
      if (local === 'todos') for (const l of Object.keys(e.locales)) n += selExistencia(e, { varianteId: v.id, localId: l });
      else n += selExistencia(e, { varianteId: v.id, localId: local });
    }
    return n;
  };
  const items = resultados.map((r) => {
    const v = r.variante ?? variantes[r.producto.id]?.[0];
    const color = v ? e.colores[v.colorId] : undefined;
    const n = existencias(r.producto.id);
    return {
      id: r.variante?.id ?? r.producto.id,
      texto: r.producto.nombre,
      alElegir: () => {
        alElegir(r);
        setTexto('');
      },
      contenido: (
        <span className="flex min-w-0 items-center gap-3">
          <MiniaturaPrenda tipo={r.producto.tipoPrenda} color={color?.hex ?? '#C9C9C7'} patron={color?.patron} tamano="buscador" />
          <span className="min-w-0">
            <span className="block truncate t-body font-semibold text-ink">
              <Resaltado texto={r.producto.nombre} consulta={texto} />
              {r.variante && <span className="font-normal text-muted"> · {color?.nombre} · {r.variante.talla}</span>}
            </span>
            <span className="block t-small num text-muted">
              {r.producto.referencia} · {d(r.producto.precioVenta)} · {entero(n)} {local === 'todos' ? 'en total' : 'en este local'}
            </span>
          </span>
        </span>
      ),
    };
  });
  return (
    <Combobox
      texto={texto}
      alCambiarTexto={setTexto}
      placeholder={placeholder}
      etiqueta="Buscar producto"
      grupos={[{ titulo: 'Productos', items }]}
      vacio={(q) => `No encontramos «${q}». Revisa la referencia o escanea el código.`}
      alEnter={(q) => {
        const v = selVariantePorEan(e, { ean: q.trim() });
        const p = v ? e.productos[v.productoId] : undefined;
        if (v && p) {
          alElegir({ producto: p, variante: v, coincidencia: 'ean' });
          setTexto('');
        }
      }}
      autoFocus={autoFocus}
      enModal={enModal}
      className={className}
      data-testid="buscador-producto"
    />
  );
}

export interface PropsBuscadorCliente {
  /** null = Consumidor final. */
  alElegir: (c: Cliente | null) => void;
  alCrear?: (texto: string) => void;
  placeholder?: string;
  enModal?: boolean;
  className?: string;
}

export function BuscadorCliente({ alElegir, alCrear, placeholder = 'Buscar cliente por nombre, celular o cédula', enModal, className }: PropsBuscadorCliente) {
  const [texto, setTexto] = useState('');
  const diferido = useDeferredValue(texto);
  const hoy = useHoy();
  const filas = useSel(selClientes, { hoy, texto: diferido.trim() || '__ninguno__' });
  const items = useMemo(
    () =>
      (diferido.trim() ? filas : []).slice(0, 8).map((f) => {
        const nombre = `${f.cliente.nombres} ${f.cliente.apellidos}`;
        return {
          id: f.cliente.id,
          texto: nombre,
          alElegir: () => {
            alElegir(f.cliente);
            setTexto('');
          },
          contenido: (
            <span className="flex min-w-0 items-center gap-3">
              <Avatar nombre={nombre} tamano={24} />
              <span className="min-w-0 truncate t-body text-ink">
                <Resaltado texto={nombre} consulta={diferido} />
              </span>
              <span className="ml-auto shrink-0 t-small num text-muted">{celular(f.cliente.celular)}</span>
            </span>
          ),
        };
      }),
    [filas, diferido, alElegir],
  );
  return (
    <Combobox
      texto={texto}
      alCambiarTexto={setTexto}
      placeholder={placeholder}
      etiqueta="Buscar cliente"
      abrirAlEnfocar
      fijo={{
        id: 'consumidor-final',
        texto: 'Consumidor final',
        alElegir: () => {
          alElegir(null);
          setTexto('');
        },
        contenido: (
          <span className="flex items-center gap-3">
            <span className="inline-flex size-6 items-center justify-center rounded-full border border-line-strong t-micro text-ink-2">CF</span>
            <span className="t-body text-ink">Consumidor final</span>
            <span className="t-small text-muted">· sin datos del cliente</span>
          </span>
        ),
      }}
      grupos={[{ titulo: 'Clientes', items }]}
      vacio={(q) => (
        <span className="flex flex-col items-start gap-2">
          <span>No encontramos «{q}».</span>
          {alCrear && (
            <button type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => alCrear(q)} className="inline-flex h-8 items-center gap-2 px-2 -ml-2 t-nav text-ink hover:bg-surface-2">
              <Icono icono={UserPlus} tamano={16} />
              Crear cliente
            </button>
          )}
        </span>
      )}
      enModal={enModal}
      className={className}
      data-testid="buscador-cliente"
    />
  );
}
