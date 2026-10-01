import { useState } from 'react';
import { PanelTab, Table, Tabs, type ColumnaTabla } from '@/ui';
import { entero, plural } from '@/lib/formato';
import { esNumerica, type VistaHoja } from '../calculos';

interface Fila {
  indice: number;
  celdas: Record<string, string>;
}

/**
 * Las primeras filas y los totales de cada hoja del reporte, tal como saldrán en el archivo. Si el reporte trae
 * varias hojas (ventas, contador…), se cambia de hoja con pestañas. Los totales suman TODAS las filas.
 */
export function VistaPrevia({ hojas, cargando }: { hojas: readonly VistaHoja[]; cargando: boolean }) {
  const [activa, setActiva] = useState('0');
  const hoja = hojas[Number(activa)] ?? hojas[0];
  if (!hoja) return null;
  const tabla = <TablaHoja key={activa} hoja={hoja} />;
  return (
    <div data-testid="reportes-vista" aria-busy={cargando} className={cargando ? 'opacity-60 transition-opacity duration-(--dur-fast)' : 'transition-opacity duration-(--dur-fast)'}>
      {hojas.length > 1 ? (
        <Tabs
          valor={activa}
          alCambiar={setActiva}
          etiqueta="Hojas del archivo"
          pestanas={hojas.map((h, i) => ({ valor: String(i), etiqueta: h.nombre, contador: h.totalFilas, 'data-testid': `reportes-hoja-${i}` }))}
        >
          {hojas.map((h, i) => (
            <PanelTab key={i} valor={String(i)} className="pt-4">
              {String(i) === activa && <TablaHoja hoja={h} />}
            </PanelTab>
          ))}
        </Tabs>
      ) : (
        tabla
      )}
    </div>
  );
}

function TablaHoja({ hoja }: { hoja: VistaHoja }) {
  const columnas: ColumnaTabla<Fila>[] = hoja.columnas.map((c) => ({
    id: c.clave,
    encabezado: c.titulo,
    numerica: esNumerica(c.tipo),
    alinear: esNumerica(c.tipo) ? 'der' : 'izq',
    celda: (f) => <span className="whitespace-nowrap">{f.celdas[c.clave] ?? '—'}</span>,
  }));
  const totales = hoja.totales ? Object.fromEntries(Object.entries(hoja.totales).map(([k, v]) => [k, v === '' ? undefined : v])) : undefined;
  const vistas = hoja.filas.length;
  return (
    <div data-testid="reportes-hoja" data-hoja={hoja.nombre}>
      {hoja.totalFilas === 0 ? (
        <p className="border border-line-soft bg-surface-2 px-4 py-6 t-body text-muted" data-testid="reportes-hoja-vacia">
          Esta hoja no trae filas con los filtros elegidos.
        </p>
      ) : (
        <Table
          columnas={columnas}
          filas={hoja.filas}
          clave={(f) => String(f.indice)}
          sustantivo={['fila', 'filas']}
          etiqueta={`Vista previa de ${hoja.nombre}`}
          densidad="compacta"
          porPagina={0}
          totales={totales}
          data-testid="reportes-tabla"
        />
      )}
      <p className="mt-3 t-small text-muted" data-testid="reportes-conteo">
        {hoja.totalFilas === 0
          ? 'Sin filas.'
          : vistas < hoja.totalFilas
            ? `Mostrando las primeras ${entero(vistas)} de ${plural(hoja.totalFilas, 'fila')}. El archivo trae todas${hoja.totales ? ' y los totales suman todas' : ''}.`
            : `${plural(hoja.totalFilas, 'fila')}, todas incluidas en el archivo.`}
      </p>
      {hoja.nota && <p className="mt-1 t-small text-muted">{hoja.nota}</p>}
    </div>
  );
}
