import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { entero } from '@/lib/formato';
import { Dinero, EmptyState, Fecha, Table, type ColumnaTabla } from '@/ui';
import type { FilaKardexVista } from '../selectores';
import { MOTIVOS_AJUSTE, TIPOS_MOVIMIENTO, VACIOS } from '../textos';
import { EnlaceDocumento } from './comun';

/**
 * Tabla del kárdex (ficha y movimientos). Las filas llegan en orden de aplicación (la más reciente primero si
 * así se ordena fuera); el saldo es el acumulado de ese orden, no de la hora. Las entradas y las salidas van en
 * columnas separadas. El costo unitario solo lo ve quien puede ver costos.
 */
export interface PropsTablaKardex {
  filas: readonly FilaKardexVista[];
  /** Con producto o variante elegida el saldo tiene sentido; en el kárdex general no. */
  mostrarSaldo: boolean;
  mostrarProducto: boolean;
  verCostos: boolean;
  resaltarId?: string | null;
  barra?: ReactNode;
  totales?: { entradas: number; salidas: number };
  vacio?: ReactNode;
}

export function TablaKardex({ filas, mostrarSaldo, mostrarProducto, verCostos, resaltarId, barra, totales, vacio }: PropsTablaKardex) {
  const columnas: ColumnaTabla<FilaKardexVista>[] = [
    {
      id: 'fecha',
      encabezado: 'Fecha y hora',
      ancho: 150,
      ordenar: (f) => f.movimiento.ts,
      celda: (f) => (
        <span className="whitespace-nowrap">
          <Fecha valor={f.movimiento.ts} formato="fechaHora" />
        </span>
      ),
    },
    {
      id: 'tipo',
      encabezado: 'Movimiento',
      ancho: 190,
      ordenar: (f) => f.movimiento.tipo,
      celda: (f) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          {f.movimiento.cantidad >= 0 ? <ArrowDownToLine size={14} aria-hidden className="shrink-0 text-success" /> : <ArrowUpFromLine size={14} aria-hidden className="shrink-0 text-ink-2" />}
          <span>
            {TIPOS_MOVIMIENTO[f.movimiento.tipo]}
            <span className="block t-small">
              <EnlaceDocumento documento={f.documento} />
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'prenda',
      encabezado: mostrarProducto ? 'Prenda' : 'Variante',
      truncar: true,
      ordenar: (f) => (mostrarProducto ? f.producto : `${f.color}${f.talla}`),
      celda: (f) => (
        <span className="block min-w-0">
          <span className="block truncate">{mostrarProducto ? `${f.producto} · ${f.color} · ${f.talla}` : `${f.color} · ${f.talla}`}</span>
          <span className="block truncate t-small text-muted">{f.local}</span>
        </span>
      ),
    },
    {
      id: 'entrada',
      encabezado: 'Entra',
      numerica: true,
      ancho: 70,
      ordenar: (f) => f.movimiento.cantidad,
      celda: (f) => (f.movimiento.cantidad > 0 ? <span className="font-semibold">{entero(f.movimiento.cantidad)}</span> : <span className="text-disabled">—</span>),
    },
    {
      id: 'salida',
      encabezado: 'Sale',
      numerica: true,
      ancho: 70,
      ordenar: (f) => -f.movimiento.cantidad,
      celda: (f) => (f.movimiento.cantidad < 0 ? <span className="font-semibold">{entero(-f.movimiento.cantidad)}</span> : <span className="text-disabled">—</span>),
    },
    ...(mostrarSaldo ? [{ id: 'saldo', encabezado: 'Saldo', numerica: true, ordenar: (f: FilaKardexVista) => f.orden, celda: (f: FilaKardexVista) => <strong className="font-bold">{entero(f.saldo)}</strong> } satisfies ColumnaTabla<FilaKardexVista>] : []),
    ...(verCostos ? [{ id: 'costo', encabezado: 'Costo', numerica: true, ancho: 110, celda: (f: FilaKardexVista) => <Dinero valor={f.movimiento.costoUnitario} /> } satisfies ColumnaTabla<FilaKardexVista>] : []),
    {
      id: 'nota',
      encabezado: 'Nota',
      truncar: true,
      celda: (f) => [f.movimiento.motivo ? MOTIVOS_AJUSTE[f.movimiento.motivo] : null, f.movimiento.nota ?? null, f.usuario !== 'Sistema' ? `Registró ${f.usuario}` : null].filter(Boolean).join(' · ') || '',
    },
  ];
  return (
    <Table
      columnas={columnas}
      filas={filas}
      clave={(f) => f.movimiento.id}
      sustantivo={['movimiento', 'movimientos']}
      etiqueta="Kárdex"
      resaltada={(f) => !!resaltarId && f.movimiento.id === resaltarId}
      barra={barra}
      totales={totales ? { entrada: entero(totales.entradas), salida: entero(totales.salidas) } : undefined}
      data-testid="tabla-kardex"
      vacio={vacio ?? <EmptyState tamano="tabla" icono={ArrowDownToLine} titulo={VACIOS.kardex.titulo} texto={VACIOS.kardex.texto} />}
    />
  );
}
