import { useState, type ReactNode } from 'react';
import { History, UserRound, X } from 'lucide-react';
import { MEDIOS_PAGO } from '@/config/negocio';
import type { FechaISO, MedioPago } from '@/dominio/tipos';
import {
  BotonFiltros,
  BotonPildora,
  Button,
  BuscadorCliente,
  BuscadorProducto,
  Icono,
  Select,
  SelectorRango,
  textoRango,
  Toolbar,
  type ChipActivo,
} from '@/ui';
import {
  CLIENTE_CONSUMIDOR_FINAL,
  contarEnPanel,
  type FiltrosResueltos,
  type ParamsVentas,
} from '../filtros';
import type { OpcionesFiltro } from '../selectores';
import { CANALES, ESTADOS_FILTRO, etiquetaMedio, TEXTOS } from '../textos';

const TODOS = '*';

interface Props {
  hoy: FechaISO;
  resueltos: FiltrosResueltos;
  /** Parámetros crudos de la URL (para el valor de cada control). */
  params: ParamsVentas;
  opciones: OpcionesFiltro;
  etiquetas: { cliente: string | null; producto: string | null };
  historial: { desde: FechaISO; hasta: FechaISO } | null;
  texto: string;
  alCambiarTexto: (t: string) => void;
  alCambiar: (cambios: Partial<ParamsVentas>) => void;
  alLimpiar: () => void;
  /** El vendedor solo ve lo suyo: no elige local ni vendedor. */
  esVendedor: boolean;
  derecha: ReactNode;
}

const opcionesCon = <T extends string>(todos: string, lista: readonly { valor: T; etiqueta: string }[]) => [
  { valor: TODOS, etiqueta: todos },
  ...lista,
];

/** Barra de filtros de la lista: buscador, grupo píldora (Filtros · Local · Fechas · Estado) y chips activos. */
export function BarraFiltros({
  hoy,
  resueltos,
  params,
  opciones,
  etiquetas,
  historial,
  texto,
  alCambiarTexto,
  alCambiar,
  alLimpiar,
  esVendedor,
  derecha,
}: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const alAbrir = (id: string) => (v: boolean) => {
    // En pantallas bajas (1366 × 657) el panel no cabe debajo de la barra: se sube la barra al borde de la página.
    if (v) document.getElementById('ventas-barra')?.scrollIntoView({ block: 'start' });
    setAbierto(v ? id : abierto === id ? null : abierto);
  };
  const nombreLocal = (id: string) => opciones.locales.find((l) => l.id === id)?.nombre ?? id;
  const nombreVendedor = (id: string) => opciones.vendedores.find((v) => v.id === id)?.nombre ?? id;
  const estadoEtiqueta = (e: string) => ESTADOS_FILTRO.find((x) => x.valor === e)?.etiqueta ?? e;
  const activos = resueltos.activos;

  const chips: ChipActivo[] = [];
  if (activos.includes('fechas'))
    chips.push({
      id: 'fechas',
      texto: `Fechas: ${textoRango(resueltos.rango, hoy)}`,
      alQuitar: () => alCambiar({ desde: null, hasta: null }),
    });
  if (activos.includes('local'))
    chips.push({
      id: 'local',
      texto: `Local: ${nombreLocal(resueltos.localId)}`,
      alQuitar: () => alCambiar({ local: null }),
    });
  if (activos.includes('vendedor') && params.vendedor)
    chips.push({
      id: 'vendedor',
      texto: `Vendedor: ${nombreVendedor(params.vendedor)}`,
      alQuitar: () => alCambiar({ vendedor: null }),
    });
  if (activos.includes('cliente') && params.cliente)
    chips.push({
      id: 'cliente',
      texto: `Cliente: ${params.cliente === CLIENTE_CONSUMIDOR_FINAL ? 'Consumidor final' : (etiquetas.cliente ?? '…')}`,
      alQuitar: () => alCambiar({ cliente: null }),
    });
  if (resueltos.medio)
    chips.push({
      id: 'medio',
      texto: `Pago: ${etiquetaMedio(resueltos.medio)}`,
      alQuitar: () => alCambiar({ medio: null }),
    });
  if (resueltos.canal)
    chips.push({
      id: 'canal',
      texto: `Canal: ${CANALES[resueltos.canal]}`,
      alQuitar: () => alCambiar({ canal: null }),
    });
  if (resueltos.estado)
    chips.push({
      id: 'estado',
      texto: `Estado: ${estadoEtiqueta(resueltos.estado)}`,
      alQuitar: () => alCambiar({ estado: null }),
    });
  if (activos.includes('producto'))
    chips.push({
      id: 'producto',
      texto: `Prenda: ${etiquetas.producto ?? '…'}`,
      alQuitar: () => alCambiar({ producto: null }),
    });
  if (texto.trim())
    chips.push({ id: 'texto', texto: `Búsqueda: ${texto.trim()}`, alQuitar: () => alCambiarTexto('') });

  const medios = (Object.keys(MEDIOS_PAGO) as MedioPago[]).map((m) => ({
    valor: m,
    etiqueta: etiquetaMedio(m),
  }));
  const canales = (Object.keys(CANALES) as (keyof typeof CANALES)[]).map((c) => ({
    valor: c,
    etiqueta: CANALES[c],
  }));

  return (
    <Toolbar
      buscar={{ valor: texto, alCambiar: alCambiarTexto, placeholder: TEXTOS.lista.buscar }}
      filtros={
        <>
          <BotonFiltros
            contador={contarEnPanel(activos)}
            abierto={abierto === 'filtros'}
            alCambiar={alAbrir('filtros')}
            anchoPanel={360}
            data-testid="filtro-mas"
          >
            <div className="flex flex-col gap-4">
              {!esVendedor && (
                <Select
                  etiqueta="Vendedor"
                  valor={params.vendedor ?? TODOS}
                  alCambiar={(v) => alCambiar({ vendedor: v === TODOS ? null : v })}
                  opciones={opcionesCon(
                    'Todos los vendedores',
                    opciones.vendedores.map((v) => ({ valor: v.id, etiqueta: v.nombre })),
                  )}
                  data-testid="filtro-vendedor"
                />
              )}
              <div>
                <p className="mb-1.5 t-label text-ink">Cliente</p>
                {params.cliente ? (
                  <div className="flex h-10 items-center gap-2 border border-line-strong px-3 t-body text-ink">
                    <Icono icono={UserRound} tamano={16} className="text-muted" />
                    <span className="min-w-0 flex-1 truncate" data-testid="filtro-cliente-valor">
                      {params.cliente === CLIENTE_CONSUMIDOR_FINAL
                        ? 'Consumidor final'
                        : (etiquetas.cliente ?? 'Cliente')}
                    </span>
                    <button
                      type="button"
                      aria-label="Quitar el cliente"
                      onClick={() => alCambiar({ cliente: null })}
                      className="inline-flex size-6 items-center justify-center hover:bg-surface-2"
                    >
                      <Icono icono={X} tamano={14} />
                    </button>
                  </div>
                ) : (
                  <BuscadorCliente
                    placeholder="Buscar por nombre, celular o cédula"
                    alElegir={(c) => alCambiar({ cliente: c ? c.id : CLIENTE_CONSUMIDOR_FINAL })}
                  />
                )}
              </div>
              <Select
                etiqueta="Medio de pago"
                valor={resueltos.medio ?? TODOS}
                alCambiar={(v) => alCambiar({ medio: v === TODOS ? null : v })}
                opciones={opcionesCon('Todos los medios', medios)}
                data-testid="filtro-medio"
              />
              <Select
                etiqueta="Canal"
                valor={resueltos.canal ?? TODOS}
                alCambiar={(v) => alCambiar({ canal: v === TODOS ? null : (v as ParamsVentas['canal']) })}
                opciones={opcionesCon('Todos los canales', canales)}
                data-testid="filtro-canal"
              />
              <div>
                <p className="mb-1.5 t-label text-ink">Prenda</p>
                {params.producto ? (
                  <div className="flex h-10 items-center gap-2 border border-line-strong px-3 t-body text-ink">
                    <span className="min-w-0 flex-1 truncate">{etiquetas.producto ?? 'Prenda'}</span>
                    <button
                      type="button"
                      aria-label="Quitar la prenda"
                      onClick={() => alCambiar({ producto: null })}
                      className="inline-flex size-6 items-center justify-center hover:bg-surface-2"
                    >
                      <Icono icono={X} tamano={14} />
                    </button>
                  </div>
                ) : (
                  <BuscadorProducto
                    placeholder="Nombre, referencia o código"
                    localId="todos"
                    alElegir={(r) => alCambiar({ producto: r.producto.id })}
                  />
                )}
              </div>
              {activos.length > 0 && (
                <Button
                  variante="ghost"
                  tamano="sm"
                  onClick={() => {
                    alLimpiar();
                    setAbierto(null);
                  }}
                >
                  {TEXTOS.lista.limpiar}
                </Button>
              )}
            </div>
          </BotonFiltros>
          {!esVendedor && (
            <BotonPildora
              etiqueta="Local"
              valor={resueltos.localId === 'todos' ? 'Todos' : nombreLocal(resueltos.localId)}
              abierto={abierto === 'local'}
              alCambiar={alAbrir('local')}
              data-testid="filtro-local"
            >
              <Select
                etiqueta="Local"
                etiquetaOculta
                valor={resueltos.localId}
                alCambiar={(v) => {
                  alCambiar({ local: v });
                  setAbierto(null);
                }}
                opciones={[
                  { valor: 'todos', etiqueta: 'Todos los locales' },
                  ...opciones.locales.map((l) => ({ valor: l.id, etiqueta: l.nombre })),
                ]}
                data-testid="filtro-local-select"
              />
            </BotonPildora>
          )}
          <BotonPildora
            etiqueta="Fechas"
            valor={textoRango(resueltos.rango, hoy)}
            anchoPanel={780}
            abierto={abierto === 'fechas'}
            alCambiar={alAbrir('fechas')}
            data-testid="filtro-fechas"
          >
            {historial && (
              <Button
                variante="ghost"
                tamano="sm"
                icono={History}
                className="mb-3"
                onClick={() => {
                  alCambiar({ desde: historial.desde, hasta: historial.hasta });
                  setAbierto(null);
                }}
                data-testid="filtro-todo-historial"
              >
                Todo el historial
              </Button>
            )}
            <SelectorRango
              soloPanel
              hoy={hoy}
              valor={resueltos.rango}
              alCambiar={(r) => alCambiar({ desde: r.desde, hasta: r.hasta })}
              alCerrar={() => setAbierto(null)}
            />
          </BotonPildora>
          <BotonPildora
            etiqueta="Estado"
            valor={resueltos.estado ? estadoEtiqueta(resueltos.estado) : undefined}
            abierto={abierto === 'estado'}
            alCambiar={alAbrir('estado')}
            data-testid="filtro-estado"
          >
            <Select
              etiqueta="Estado"
              etiquetaOculta
              valor={resueltos.estado ?? TODOS}
              alCambiar={(v) => {
                alCambiar({ estado: v === TODOS ? null : (v as ParamsVentas['estado']) });
                setAbierto(null);
              }}
              opciones={opcionesCon('Todos los estados', ESTADOS_FILTRO)}
              data-testid="filtro-estado-select"
            />
          </BotonPildora>
        </>
      }
      derecha={derecha}
      chips={chips}
      alLimpiar={() => {
        alCambiarTexto('');
        alLimpiar();
      }}
    />
  );
}
