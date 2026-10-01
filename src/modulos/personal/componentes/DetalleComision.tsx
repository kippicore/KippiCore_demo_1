import { useMemo } from 'react';
import { Link } from 'react-router';
import { Receipt } from 'lucide-react';
import { Badge, BarraProgreso, Dinero, EmptyState, Fecha, Table, type ColumnaTabla } from '@/ui';
import type { Tono } from '@/config/estados';
import { porcentaje } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import type { ComisionEmpleado, DetalleComision } from '@/selectores';
import { ETIQUETA_COMPONENTE, frasesEsquema, repartirProporcional } from '../calculos';
import { ETIQUETA_TIPO_DETALLE, TEXTOS } from '../textos';
import { FraseVista } from './Piezas';

const TONO_TIPO: Record<DetalleComision['tipo'], Tono> = { venta: 'neutral', devolucion: 'warning', cancelacion: 'muted' };

interface FilaDetalle extends DetalleComision {
  /** Lo que esta venta aporta a la comisión (proporcional a su base). */
  parte: number;
  baseComisionable: number;
}

/**
 * Detalle por venta de una comisión (PLAN 9.4 C1): cada venta con su base y lo que aporta a la comisión. El esquema se
 * calcula sobre el total del mes; aquí se reparte de forma proporcional y en pesos enteros para que la columna sume
 * exactamente la comisión que muestra `selComisiones`.
 */
export function TablaDetalleComision({ comision, className }: { comision: ComisionEmpleado; className?: string }) {
  const filas = useMemo<FilaDetalle[]>(() => {
    const bases = comision.detalle.map((d) => (comision.esquema?.base === 'total_con_iva' ? d.total : d.base));
    const partes = repartirProporcional(bases, comision.comision.total);
    return comision.detalle.map((d, i) => ({ ...d, baseComisionable: bases[i] ?? 0, parte: partes[i] ?? 0 }));
  }, [comision]);
  const columnas: ColumnaTabla<FilaDetalle>[] = [
    { id: 'fecha', encabezado: 'Fecha', ancho: 120, celda: (f) => <Fecha valor={f.fecha} />, ordenar: (f) => f.fecha },
    {
      id: 'venta',
      encabezado: 'Venta',
      ancho: 160,
      celda: (f) => (
        <Link to={rutas.venta(f.ventaId)} className="font-semibold text-ink underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>
          {f.numero || f.ventaId}
        </Link>
      ),
      ordenar: (f) => f.numero,
    },
    {
      id: 'tipo',
      encabezado: 'Tipo',
      celda: (f) => (
        <Badge tono={TONO_TIPO[f.tipo]} tamano="sm">
          {ETIQUETA_TIPO_DETALLE[f.tipo]}
        </Badge>
      ),
      ordenar: (f) => f.tipo,
    },
    { id: 'base', encabezado: comision.esquema?.base === 'total_con_iva' ? 'Venta con IVA' : 'Venta sin IVA', numerica: true, alinear: 'der', celda: (f) => <Dinero valor={f.baseComisionable} />, ordenar: (f) => f.baseComisionable },
    { id: 'parte', encabezado: 'Aporta a la comisión', numerica: true, alinear: 'der', celda: (f) => <Dinero valor={f.parte} />, ordenar: (f) => f.parte },
  ];
  return (
    <div className={className} data-testid="personal-detalle-comision">
      <Table
        columnas={columnas}
        filas={filas}
        clave={(f) => `${f.ventaId}|${f.tipo}|${f.fecha}`}
        sustantivo={['movimiento', 'movimientos']}
        etiqueta="Detalle de la comisión por venta"
        porPagina={25}
        ordenInicial={{ id: 'fecha', dir: 'desc' }}
        totales={{ base: <Dinero valor={comision.base} />, parte: <Dinero valor={comision.comision.total} /> }}
        vacio={<EmptyState tamano="tabla" icono={Receipt} titulo="Sin ventas en este mes" texto="Cuando este vendedor registre ventas aparecerán aquí con lo que aportan a su comisión." />}
      />
      <p className="mt-3 max-w-[72ch] t-small text-muted">{TEXTOS.comisiones.repartoNota}</p>
    </div>
  );
}

/** Cómo se arma la comisión: una línea por componente del esquema y, si hay meta, el avance del local. */
export function DesgloseComision({ comision, conMeta = true }: { comision: ComisionEmpleado; conMeta?: boolean }) {
  const esquema = comision.esquema;
  if (!esquema) return null;
  const frases = frasesEsquema(esquema);
  const cumplimiento = comision.metaLocalMes > 0 ? comision.ventasLocalMes / comision.metaLocalMes : null;
  return (
    <div className="flex flex-col gap-5" data-testid="personal-desglose-comision">
      <ul className="divide-y divide-line-soft border-y border-line-soft">
        {comision.comision.componentes.map((c, i) => (
          <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3" data-testid={`personal-componente-${c.tipo}`} data-valor={c.valor}>
            <span className="min-w-0 max-w-[64ch]">
              <span className="block t-eyebrow text-ink-2">{ETIQUETA_COMPONENTE[c.tipo]}</span>
              <FraseVista frase={frases[i] ?? []} className="t-body text-ink-2" />
            </span>
            <Dinero valor={c.valor} className="t-body font-semibold text-ink" />
          </li>
        ))}
      </ul>
      {conMeta && cumplimiento !== null && (
        <BarraProgreso
          meta
          valor={cumplimiento}
          etiqueta="Meta del local este mes"
          detalle={`${porcentaje(cumplimiento, 0)} de la meta`}
        />
      )}
    </div>
  );
}
