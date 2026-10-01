import { PackagePlus, Ruler } from 'lucide-react';
import { useMemo } from 'react';
import { rutas } from '@/app/rutas';
import type { Categoria } from '@/dominio/tipos';
import { useHoy, useSel } from '@/estado';
import { entero, porcentaje, unidades } from '@/lib/formato';
import { selTallasYColores } from '@/selectores';
import { NOMBRES_CATEGORIA } from '@/seed/catalogo';
import { Badge, BotonEnlace, Card, EmptyState, MuestraColor, Select } from '@/ui';
import { compararNatural, rangoDePeriodo } from '../calculos';
import { selColoresQueRotan, selOpcionesFiltroProductos, selProveedorDeCategoria } from '../selectores';
import type { IdPeriodo } from '../textos';
import { BarrasHorizontales, CabezaSeccion, SelectorPeriodo, type FilaBarra } from './Piezas';

export interface PropsVistaTC {
  categoria: Categoria;
  periodo: IdPeriodo;
  alCambiarCategoria: (c: Categoria) => void;
  alCambiarPeriodo: (p: IdPeriodo) => void;
  resaltar: string | null;
}

/** Categoría y período, con el botón "Sugerir pedido" hacia la fábrica que surte esa categoría (W12). */
function Controles({ categoria, periodo, alCambiarCategoria, alCambiarPeriodo }: Omit<PropsVistaTC, 'resaltar'>) {
  const opciones = useSel(selOpcionesFiltroProductos);
  const fabrica = useSel(selProveedorDeCategoria, { categoria });
  return (
    <Card padding="normal">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <Select
            etiqueta="Qué prenda quieres revisar"
            valor={categoria}
            alCambiar={(v) => alCambiarCategoria(v as Categoria)}
            opciones={opciones.categorias.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))}
            ancho={220}
            data-testid="tc-categoria"
          />
          <div>
            <p className="mb-1.5 t-label font-semibold text-ink">Período</p>
            <SelectorPeriodo valor={periodo} alCambiar={alCambiarPeriodo} opciones={['90d', '6m', '12m']} testid="tc-periodo" />
          </div>
        </div>
        {fabrica && (
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <BotonEnlace to={rutas.sugerirPedido({ proveedor: fabrica.id, desde: 'analisis' })} variante="primary" icono={PackagePlus} data-testid="tc-sugerir-pedido">
              Sugerir pedido
            </BotonEnlace>
            <p className="t-small text-muted" data-testid="tc-sugerir-fabrica">
              Con lo que rota y lo que se agota, para {fabrica.nombre}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Tallas que más rotan (P3, P4): cuánto pesa cada talla y en cuáles se pierden ventas por falta de existencias. */
export function VistaTallas(p: PropsVistaTC) {
  const hoy = useHoy();
  const rango = rangoDePeriodo(hoy, p.periodo);
  const r = useSel(selTallasYColores, { categoria: p.categoria, ...rango });
  const tallas = useMemo(() => [...r.tallas].sort((a, b) => compararNatural('talla', a.talla, b.talla)), [r.tallas]);
  const total = tallas.reduce((s, t) => s + t.unidades, 0);
  const porRotacion = [...tallas].sort((a, b) => b.unidades - a.unidades);
  const [t1, t2] = porRotacion;
  const perdidas = tallas.reduce((s, t) => s + t.insatisfecha, 0);
  // La talla que más se queda corta: más ventas perdidas por cada unidad vendida (con un mínimo para no marcar casualidades).
  const tasa = (t: (typeof tallas)[number]) => (t.unidades ? t.insatisfecha / t.unidades : 0);
  const corta = [...tallas].filter((t) => t.insatisfecha >= 3).sort((a, b) => tasa(b) - tasa(a))[0] ?? null;
  const nombre = NOMBRES_CATEGORIA[p.categoria].toLowerCase();

  const filas: FilaBarra[] = tallas.map((t) => ({
    id: t.talla,
    etiqueta: `Talla ${t.talla}`,
    valor: t.unidades,
    texto: (
      <span>
        {porcentaje(t.proporcion, 0)} <span className="font-normal text-muted">· {unidades(t.unidades)}</span>
      </span>
    ),
    nota: t.insatisfecha > 0 ? `${entero(t.insatisfecha)} ventas perdidas por falta de existencias` : 'Sin ventas perdidas por falta de existencias',
    tono: corta?.talla === t.talla ? 'alerta' : t === porRotacion[0] ? 'destacado' : 'normal',
    insignia: corta?.talla === t.talla ? <Badge tono="warning" tamano="sm">Se queda corta</Badge> : undefined,
  }));

  return (
    <div className="flex flex-col gap-6" data-testid="vista-tallas">
      <Controles {...p} />
      <Card padding="normal">
        <CabezaSeccion titulo={`Tallas de ${nombre}`} texto="Cuánto pesa cada talla en lo que vendes. Si una talla pesa mucho y se agota, el próximo pedido debe traer más de esa." />
        {total === 0 ? (
          <EmptyState tamano="tabla" icono={Ruler} titulo="Sin ventas de esta prenda en el período" texto="Elige otro período u otra prenda para ver qué tallas rotan." />
        ) : (
          <>
            <div className="mb-5 max-w-[72ch] border-l-2 border-accent pl-3 t-body text-ink" data-testid="tallas-lectura">
              {t1 && t2 ? (
                <>
                  La talla {t1.talla} es {porcentaje(t1.proporcion, 0)} de tus {nombre}; las dos que más rotan ({t1.talla} y {t2.talla}) suman {porcentaje(t1.proporcion + t2.proporcion, 0)}.{' '}
                </>
              ) : (
                t1 && (
                  <>
                    Casi todo lo que vendes de {nombre} es talla {t1.talla}.{' '}
                  </>
                )
              )}
              {corta ? (
                <>
                  La que más se queda corta es la {corta.talla}: {entero(corta.insatisfecha)} ventas perdidas por falta de existencias.
                </>
              ) : perdidas > 0 ? (
                <>En todo el historial se perdieron {entero(perdidas)} ventas por falta de existencias.</>
              ) : null}
            </div>
            <BarrasHorizontales filas={filas} testid="tallas-barras" anchoEtiqueta={240} anchoTexto={150} />
            <p className="mt-4 t-small text-muted">Las ventas perdidas son las que el sistema no pudo atender porque la talla estaba agotada; cuentan todo el historial.</p>
          </>
        )}
      </Card>
    </div>
  );
}

/** Colores que más rotan (P12), con su tendencia de los últimos 90 días contra los 90 anteriores. */
export function VistaColores(p: PropsVistaTC) {
  const hoy = useHoy();
  const rango = rangoDePeriodo(hoy, p.periodo);
  const colores = useSel(selColoresQueRotan, { categoria: p.categoria, ...rango, hoy });
  const nombre = NOMBRES_CATEGORIA[p.categoria].toLowerCase();
  const visibles = colores.slice(0, 12);
  const top = colores[0];
  const sube = [...colores].filter((c) => c.cambio >= 0.03 && c.recienteProporcion >= 0.05).sort((a, b) => b.cambio - a.cambio)[0];
  const filas: FilaBarra[] = visibles.map((c, i) => ({
    id: c.colorId,
    etiqueta: (
      <span className="inline-flex items-center gap-2">
        <MuestraColor hex={c.hex} nombre={c.nombre} patron={c.patron} tamano={16} />
        {c.nombre}
      </span>
    ),
    valor: c.unidades,
    texto: (
      <span>
        {porcentaje(c.proporcion, 0)} <span className="font-normal text-muted">· {unidades(c.unidades)}</span>
      </span>
    ),
    nota:
      c.cambio >= 0.03
        ? `Sube: de ${porcentaje(c.previaProporcion, 0)} a ${porcentaje(c.recienteProporcion, 0)} en los últimos 3 meses`
        : c.cambio <= -0.03
          ? `Baja: de ${porcentaje(c.previaProporcion, 0)} a ${porcentaje(c.recienteProporcion, 0)} en los últimos 3 meses`
          : undefined,
    tono: i === 0 ? 'destacado' : 'normal',
    insignia: c.cambio >= 0.03 ? <Badge tono="success" tamano="sm">Sube</Badge> : c.cambio <= -0.03 ? <Badge tono="neutral" tamano="sm">Baja</Badge> : undefined,
  }));
  return (
    <div className="flex flex-col gap-6" data-testid="vista-colores">
      <Controles {...p} />
      <Card padding="normal">
        <CabezaSeccion titulo={`Colores de ${nombre}`} texto="Los colores que más se venden. La etiqueta “Sube” o “Baja” compara los últimos 3 meses con los 3 anteriores." />
        {colores.length === 0 ? (
          <EmptyState tamano="tabla" icono={Ruler} titulo="Sin ventas de esta prenda en el período" texto="Elige otro período u otra prenda para ver qué colores rotan." />
        ) : (
          <>
            <div className="mb-5 max-w-[72ch] border-l-2 border-accent pl-3 t-body text-ink" data-testid="colores-lectura">
              {top && (
                <>
                  El {top.nombre.toLowerCase()} es {porcentaje(top.proporcion, 0)} de tus {nombre}.{' '}
                </>
              )}
              {sube && (
                <>
                  El {sube.nombre.toLowerCase()} va subiendo: de {porcentaje(sube.previaProporcion, 0)} a {porcentaje(sube.recienteProporcion, 0)} en los últimos 3 meses.
                </>
              )}
            </div>
            <BarrasHorizontales filas={filas} testid="colores-barras" anchoEtiqueta={240} anchoTexto={150} />
            {colores.length > visibles.length && <p className="mt-4 t-small text-muted">Y {entero(colores.length - visibles.length)} colores más con menos ventas.</p>}
          </>
        )}
      </Card>
    </div>
  );
}
