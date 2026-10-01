import { Bell, CircleAlert, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Notificacion } from '@/dominio/tipos';
import { rolPuedeVer, rutaDeUrl, rutas } from '@/app/rutas';
import { useAhora, useDinero, useEstadoDominio, useHoy, useRolActivo, useSel, useSesion } from '@/estado';
import { selBuscarProducto, selClientes, selNotificaciones, selVariantesPorProducto } from '@/selectores';
import { celular, fechaLarga, relativa } from '@/lib/formato';
import { diferenciaDias } from '@/lib/fechas';
import { MenuAyuda } from '@/modulos/guia/publico';
import { BotonAppDueno } from '@/movil/publico';
import { SelectorLocal, SelectorMoneda, SelectorRol } from '@/ui/conectados/Contexto';
import { cn } from '@/ui/cn';
import { Combobox, Resaltado, type GrupoCombobox } from '@/ui/primitivos/Combobox';
import { Icono } from '@/ui/primitivos/Icono';
import { Popover } from '@/ui/primitivos/Popover';
import { Avatar } from '@/ui/primitivos/Piezas';
import { MiniaturaPrenda } from '@/ui/prenda/Prenda';

/**
 * Barra superior flotante (PLAN 8.4.3): separada de los bordes, 56 px, `glass` (rgba(237,237,237,.8) + blur 9 px),
 * radio 8, sin borde ni sombra. Izquierda: buscador global (⌘K / Ctrl K). Derecha: local · moneda · rol | Ver app del
 * dueño · "?" · notificaciones.
 */
export function BarraSuperior({ resaltar }: { resaltar: string | null }) {
  return (
    <div data-testid="barra-superior" className="glass flex h-(--topbar-h) items-center gap-3 rounded-chrome pl-3 pr-2">
      <BuscadorGlobal />
      <span className="flex-1" />
      <div className="flex items-center gap-1">
        <SelectorLocal />
        <span className="mx-1">
          <SelectorMoneda resaltar={resaltar === 'moneda'} />
        </span>
        <SelectorRol resaltar={resaltar === 'rol'} />
        <span aria-hidden className="mx-2 h-6 w-px bg-line-strong" />
        <BotonAppDueno />
        <MenuAyuda />
        <Notificaciones />
      </div>
    </div>
  );
}

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

function BuscadorGlobal() {
  const [texto, setTexto] = useState('');
  const q = useDeferredValue(texto.trim());
  const ref = useRef<HTMLInputElement | null>(null);
  const navegar = useNavigate();
  const rol = useRolActivo();
  const e = useEstadoDominio();
  const d = useDinero();
  const hoy = useHoy();
  const productos = useSel(selBuscarProducto, { texto: q, limite: 5 });
  const variantes = useSel(selVariantesPorProducto);
  const clientes = useSel(selClientes, { hoy, texto: q || '__ninguno__' });

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
        ev.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  const ir = (url: string) => {
    setTexto('');
    (document.activeElement as HTMLElement | null)?.blur();
    navegar(url);
  };
  const puede = (url: string) => {
    const n = rutaDeUrl(url.split('?')[0] ?? url);
    return !n || rolPuedeVer(n, rol);
  };

  const grupos = useMemo<GrupoCombobox[]>(() => {
    if (!q) return [];
    const norm = q.toLowerCase().replace(/\s/g, '');
    // Número de venta: "V-000482", "v482" o "482" (al menos 3 cifras); primero las que terminan igual.
    const cifras = norm.replace(/\D/g, '');
    const ventas =
      cifras.length >= 3 && /^(v-?)?\d+$/.test(norm)
        ? Object.values(e.ventas)
            .filter((v) => v.numero.replace(/\D/g, '').includes(cifras))
            .sort((a, b) => Number(b.numero.replace(/\D/g, '').endsWith(cifras)) - Number(a.numero.replace(/\D/g, '').endsWith(cifras)))
            .slice(0, 4)
        : [];
    const importaciones = Object.values(e.importaciones)
      .filter((i) => i.numero.toLowerCase().includes(norm))
      .slice(0, 3);
    const r: GrupoCombobox[] = [
      {
        titulo: 'Productos',
        items: productos.map((p) => {
          const v = p.variante ?? variantes[p.producto.id]?.[0];
          const c = v ? e.colores[v.colorId] : undefined;
          return {
            id: `p-${p.producto.id}`,
            texto: p.producto.nombre,
            alElegir: () => ir(rutas.producto(p.producto.referencia)),
            contenido: (
              <span className="flex min-w-0 items-center gap-3">
                <MiniaturaPrenda tipo={p.producto.tipoPrenda} color={c?.hex ?? '#C9C9C7'} patron={c?.patron} tamano="buscador" />
                <span className="min-w-0">
                  <span className="block truncate t-body font-semibold">
                    <Resaltado texto={p.producto.nombre} consulta={q} />
                  </span>
                  <span className="block t-small num text-muted">
                    {p.producto.referencia} · {d(p.producto.precioVenta)}
                  </span>
                </span>
              </span>
            ),
          };
        }),
      },
      {
        titulo: 'Clientes',
        items: (puede(rutas.clientes()) ? clientes.slice(0, 4) : []).map((f) => {
          const nombre = `${f.cliente.nombres} ${f.cliente.apellidos}`;
          return {
            id: `c-${f.cliente.id}`,
            texto: nombre,
            alElegir: () => ir(rutas.cliente(f.cliente.id)),
            contenido: (
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar nombre={nombre} tamano={24} />
                <span className="truncate t-body">
                  <Resaltado texto={nombre} consulta={q} />
                </span>
                <span className="ml-auto t-small num text-muted">{celular(f.cliente.celular)}</span>
              </span>
            ),
          };
        }),
      },
      {
        titulo: 'Ventas',
        items: (puede(rutas.ventas()) ? ventas : []).map((v) => ({
          id: `v-${v.id}`,
          texto: v.numero,
          alElegir: () => ir(rutas.venta(v.id)),
          contenido: (
            <span className="flex flex-1 items-center gap-3">
              <span className="t-body font-semibold num">{v.numero}</span>
              <span className="ml-auto t-small num text-muted">
                {e.locales[v.localId]?.nombre} · {d(v.total)}
              </span>
            </span>
          ),
        })),
      },
      {
        titulo: 'Importaciones',
        items: (puede(rutas.importaciones()) ? importaciones : []).map((i) => ({
          id: `i-${i.id}`,
          texto: i.numero,
          alElegir: () => ir(rutas.importacion(i.numero)),
          contenido: (
            <span className="flex flex-1 items-center gap-3">
              <span className="t-body font-semibold num">{i.numero}</span>
              <span className="ml-auto truncate t-small text-muted">{e.proveedores[i.proveedorId]?.nombre}</span>
            </span>
          ),
        })),
      },
    ];
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, productos, clientes, e, d, rol]);

  return (
    <Combobox
      ref={ref}
      texto={texto}
      alCambiarTexto={setTexto}
      grupos={grupos}
      placeholder="Buscar referencia, cliente o venta"
      etiqueta="Buscar en KippiCore"
      atajo={MAC ? '⌘K' : 'Ctrl K'}
      claseCampo="bg-surface/70 border-transparent hover:border-transparent focus:bg-surface max-wide:t-small"
      className="w-[340px] min-w-[220px] shrink"
      anchoLista={420}
      vacio={(t) => `No encontramos «${t}». Prueba con la referencia (HL-CAM-0142), el nombre o el número de venta.`}
      data-testid="buscador-global"
    />
  );
}

const ICONO_SEVERIDAD: Record<Notificacion['severidad'], LucideIcon> = { info: Info, atencion: TriangleAlert, urgente: CircleAlert };

function Notificaciones() {
  const leidas = useSesion((s) => s.notificacionesLeidas);
  const marcar = useSesion((s) => s.marcarNotificacionLeida);
  const lista = useSel(selNotificaciones, { leidas });
  const ahora = useAhora();
  const navegar = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const pendientes = lista.filter((n) => !n.leida).length;
  const grupos = useMemo(() => {
    const m = new Map<string, typeof lista>();
    for (const n of lista.slice(0, 30)) {
      const dia = n.notificacion.ts.slice(0, 10);
      m.set(dia, [...(m.get(dia) ?? []), n]);
    }
    return [...m.entries()];
  }, [lista]);
  const hoy = ahora.slice(0, 10);
  const tituloDia = (dia: string) => {
    const dd = diferenciaDias(dia, hoy);
    return dd === 0 ? 'Hoy' : dd === 1 ? 'Ayer' : fechaLarga(dia).replace(/ de \d{4}$/, '');
  };
  return (
    <Popover
      abierto={abierto}
      alCambiar={setAbierto}
      alinear="end"
      ancho={400}
      compacto
      etiqueta="Notificaciones"
      disparador={
        <button
          type="button"
          aria-label={pendientes ? `Notificaciones: ${pendientes} sin leer` : 'Notificaciones'}
          title="Notificaciones"
          data-testid="notificaciones"
          className="relative inline-flex size-9 items-center justify-center text-ink transition-colors duration-(--dur-instant) hover:bg-surface/70 data-[state=open]:bg-surface"
        >
          <Icono icono={Bell} tamano={18} />
          {pendientes > 0 && <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-accent ring-2 ring-surface" />}
        </button>
      }
    >
      <div className="flex items-center justify-between px-3 pb-2 pt-2">
        <p className="t-label font-bold text-ink">Notificaciones</p>
        {pendientes > 0 && (
          <button type="button" className="t-small text-ink-2 underline-offset-4 hover:underline" onClick={() => lista.forEach((n) => !n.leida && marcar(n.notificacion.id))}>
            Marcar todas como leídas
          </button>
        )}
      </div>
      <div className="max-h-[440px] overflow-y-auto">
        {grupos.length === 0 && <p className="px-3 py-6 t-body text-muted">Aquí aparecen los avisos de tus importaciones, aprobaciones y cierres de caja.</p>}
        {grupos.map(([dia, ns]) => (
          <section key={dia}>
            <p className="px-3 pb-1 pt-3 t-eyebrow text-ink-2">{tituloDia(dia)}</p>
            <ul>
              {ns.map(({ notificacion: n, leida }) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      marcar(n.id);
                      setAbierto(false);
                      if (n.enlace) navegar(n.enlace);
                    }}
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                  >
                    <Icono icono={ICONO_SEVERIDAD[n.severidad]} tamano={16} className="mt-0.5 text-ink-2" />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block t-body text-ink', !leida && 'font-semibold')}>{n.titulo}</span>
                      {n.detalle && <span className="mt-0.5 block t-small text-muted">{n.detalle}</span>}
                      <span className="mt-1 block t-micro num text-ink-2">{relativa(n.ts, ahora)}</span>
                    </span>
                    {!leida && <span aria-label="Sin leer" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Popover>
  );
}
