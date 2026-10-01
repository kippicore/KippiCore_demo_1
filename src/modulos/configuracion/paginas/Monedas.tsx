import { useMemo, useState } from 'react';
import { Coins, Info, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  BotonAccionesFila,
  Button,
  ConfirmarEliminacion,
  EmptyState,
  Fecha,
  GraficoLineas,
  Icono,
  ItemMenu,
  Menu,
  Segmentado,
  SeparadorMenu,
  Table,
  avisar,
  useCambiarMoneda,
  type ColumnaTabla,
} from '@/ui';
import type { Moneda, TasaCambio } from '@/dominio/tipos';
import { MONEDAS } from '@/config/monedas';
import { useAcciones, useHoy, useMoneda, useSel } from '@/estado';
import { fecha as fechaTexto, fechaCorta, numero, variacion } from '@/lib/formato';
import { historialTasas, pesos, pesosFijos, tasaVigenteDe, type FilaTasa } from '../calculos';
import { DialogoTasa } from '../componentes/DialogoTasa';
import { InsigniaOrigenTasa, TarjetaTasa } from '../componentes/TarjetaTasa';
import { MarcoConfiguracion } from '../componentes/Marco';
import { selTasas } from '../selectores';
import { TEXTOS } from '../textos';

type FiltroMoneda = 'USD' | 'CNY' | 'todas';

export default function Monedas() {
  const tasas = useSel(selTasas);
  const hoy = useHoy();
  const { moneda } = useMoneda();
  const cambiarMoneda = useCambiarMoneda();
  const acciones = useAcciones();
  const [filtro, setFiltro] = useState<FiltroMoneda>('USD');
  const [dialogo, setDialogo] = useState<{ tasa: TasaCambio | null } | null>(null);
  const [aEliminar, setAEliminar] = useState<FilaTasa | null>(null);

  const vigenteUsd = tasaVigenteDe(tasas, 'USD', hoy);
  const vigenteCny = tasaVigenteDe(tasas, 'CNY', hoy);
  const hayEjemplo = [vigenteUsd, vigenteCny].some((t) => t?.fuente === 'ejemplo');

  const filas = useMemo(() => historialTasas(tasas, filtro, hoy), [tasas, filtro, hoy]);
  const serieGrafico = useMemo(() => {
    const m = filtro === 'todas' ? 'USD' : filtro;
    const lista = historialTasas(tasas, m, hoy)
      .filter((f) => f.tasa.fecha <= hoy)
      .reverse();
    const base = lista[0]?.tasa.valor ?? 1;
    // El eje de los gráficos arranca en cero: se dibuja el cambio porcentual frente al primer registro.
    return lista.map((f) => ({ fecha: f.tasa.fecha, valor: Math.round((f.tasa.valor / base - 1) * 10000) / 100 }));
  }, [tasas, filtro, hoy]);
  const monedaGrafico = filtro === 'todas' ? 'USD' : filtro;

  // Al eliminar: la tasa que pasaría a regir y si la eliminada es la que se usa hoy.
  const consecuenciaEliminar = (f: FilaTasa) => {
    const mismas = tasas.filter((t) => t.moneda === f.tasa.moneda && t.id !== f.tasa.id).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    const siguiente = mismas.find((t) => t.fecha <= (f.vigente ? hoy : f.tasa.fecha));
    if (f.vigente && siguiente)
      return `Hoy el sistema pasará a usar la tasa del ${fechaTexto(siguiente.fecha)}: ${MONEDAS[f.tasa.moneda].simbolo} 1 = ${pesos(siguiente.valor)}. Las cifras en ${f.tasa.moneda === 'USD' ? 'dólares' : 'yuanes'} cambiarán en todas las pantallas.`;
    return 'Los días de esa fecha en adelante usan la tasa anterior del historial. Lo que ya se pagó no se modifica.';
  };

  const pedirEliminar = (f: FilaTasa) => {
    const otras = tasas.filter((t) => t.moneda === f.tasa.moneda && t.id !== f.tasa.id).length;
    if (otras === 0) {
      avisar({ tipo: 'alerta', texto: 'Es la única tasa de esta moneda', detalle: 'Edítala en lugar de eliminarla.' });
      return;
    }
    setAEliminar(f);
  };

  const eliminar = () => {
    if (!aEliminar) return;
    const r = acciones.eliminarTasa({ tasaId: aEliminar.tasa.id });
    if (!r.ok) avisar({ tipo: 'error', texto: r.error.mensaje });
    else avisar({ tipo: 'exito', texto: 'Tasa eliminada', detalle: `${aEliminar.tasa.moneda} del ${fechaTexto(aEliminar.tasa.fecha)}` });
    setAEliminar(null);
  };

  const columnas: ColumnaTabla<FilaTasa>[] = [
    {
      id: 'fecha',
      encabezado: 'Fecha',
      ordenar: (f) => f.tasa.fecha,
      celda: (f) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Fecha valor={f.tasa.fecha} />
          {f.vigente && (
            <Badge tono="success" tamano="sm">
              En uso hoy
            </Badge>
          )}
        </span>
      ),
    },
    {
      id: 'moneda',
      encabezado: 'Moneda',
      ordenar: (f) => f.tasa.moneda,
      celda: (f) => (
        <span>
          {MONEDAS[f.tasa.moneda].simbolo} <span className="text-muted">· {f.tasa.moneda}</span>
        </span>
      ),
    },
    { id: 'valor', encabezado: 'Pesos por unidad', numerica: true, alinear: 'der', ordenar: (f) => f.tasa.valor, celda: (f) => <span className="font-semibold">{pesosFijos(f.tasa.valor)}</span> },
    {
      id: 'variacion',
      encabezado: 'Frente a la anterior',
      numerica: true,
      alinear: 'der',
      ordenar: (f) => f.variacion ?? 0,
      celda: (f) => (f.variacion === null ? <span className="text-muted">—</span> : <span className="num">{variacion(f.variacion)}</span>),
    },
    {
      id: 'origen',
      encabezado: 'Origen',
      celda: (f) => <InsigniaOrigenTasa tasa={f.tasa} />,
    },
  ];

  return (
    <MarcoConfiguracion
      seccion="monedas"
      titulo="Monedas y tasas"
      subtitulo={TEXTOS.monedas.subtitulo}
      acciones={
        <Button variante="secondary" icono={Plus} onClick={() => setDialogo({ tasa: null })} data-testid="tasas-agregar">
          Agregar una tasa
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {hayEjemplo && (
          <p className="flex items-start gap-2 border border-line border-l-2 border-l-accent bg-surface px-5 py-3 t-small text-ink-2" data-testid="tasas-aviso-ejemplo">
            <Icono icono={Info} tamano={16} className="mt-0.5 shrink-0" />
            <span>{TEXTOS.monedas.notaEjemplo}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface px-5 py-3">
          <div>
            <p className="t-label text-ink">Ver todo el sistema en</p>
            <p className="t-small text-muted">Es el mismo selector de la barra superior: pruébalo antes y después de guardar una tasa.</p>
          </div>
          <Segmentado
            etiqueta="Moneda de visualización"
            valor={moneda}
            alCambiar={(m: Moneda) => cambiarMoneda(m)}
            opciones={[
              { valor: 'COP', etiqueta: 'Pesos', 'data-testid': 'tasas-ver-COP' },
              { valor: 'USD', etiqueta: 'Dólares', 'data-testid': 'tasas-ver-USD' },
              { valor: 'CNY', etiqueta: 'Yuanes', 'data-testid': 'tasas-ver-CNY' },
            ]}
          />
        </div>

        <TarjetaTasa moneda="USD" tasas={tasas} />
        <TarjetaTasa moneda="CNY" tasas={tasas} />

        <section aria-label="Historial de tasas" data-testid="tasas-historial">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="t-h3 text-ink">Historial de tasas</h2>
              <p className="mt-1 max-w-[72ch] t-small text-muted">{TEXTOS.monedas.nota}</p>
            </div>
            <Segmentado
              etiqueta="Moneda del historial"
              valor={filtro}
              alCambiar={setFiltro}
              opciones={[
                { valor: 'USD', etiqueta: 'Dólar' },
                { valor: 'CNY', etiqueta: 'Yuan' },
                { valor: 'todas', etiqueta: 'Ambas' },
              ]}
            />
          </div>
          {serieGrafico.length > 1 && (
            <div className="mb-4 border border-line bg-surface p-5">
              <GraficoLineas
                datos={serieGrafico}
                x="fecha"
                series={[{ clave: 'valor', nombre: 'Cambio acumulado', color: 1 }]}
                formatoX={fechaCorta}
                formatoY={(n) => `${numero(n, 1)} %`}
                formatoValor={(n) => `${n > 0 ? '+' : ''}${numero(n, 2)} %`}
                alto={220}
                titulo={`Cuánto se ha movido ${monedaGrafico === 'USD' ? 'el dólar' : 'el yuan'} desde el primer registro`}
                data-testid="tasas-grafico"
              />
            </div>
          )}
          <Table
            columnas={columnas}
            filas={filas}
            clave={(f) => f.tasa.id}
            sustantivo={['tasa', 'tasas']}
            ordenInicial={{ id: 'fecha', dir: 'desc' }}
            porPagina={25}
            accionesFila={(f) => (
              <Menu etiqueta={`Acciones de la tasa del ${fechaTexto(f.tasa.fecha)}`} disparador={<BotonAccionesFila aria-label={`Acciones de la tasa del ${fechaTexto(f.tasa.fecha)}`} />}>
                <ItemMenu icono={Pencil} onSelect={() => setDialogo({ tasa: f.tasa })}>
                  Editar
                </ItemMenu>
                <SeparadorMenu />
                <ItemMenu icono={Trash2} peligro onSelect={() => pedirEliminar(f)}>
                  Eliminar
                </ItemMenu>
              </Menu>
            )}
            vacio={<EmptyState tamano="tabla" icono={Coins} titulo="Sin tasas registradas" texto="Agrega la tasa del día para ver las cifras en dólares y yuanes." />}
          />
        </section>
      </div>

      {dialogo && <DialogoTasa key={dialogo.tasa?.id ?? 'nueva'} tasa={dialogo.tasa} tasas={tasas} alCerrar={() => setDialogo(null)} />}
      <ConfirmarEliminacion
        abierto={aEliminar !== null}
        alCambiar={(a) => !a && setAEliminar(null)}
        pregunta={aEliminar ? `¿Eliminar la tasa del ${fechaTexto(aEliminar.tasa.fecha)}?` : ''}
        consecuencias={aEliminar ? consecuenciaEliminar(aEliminar) : ''}
        accion="Eliminar tasa"
        alConfirmar={eliminar}
      />
    </MarcoConfiguracion>
  );
}
