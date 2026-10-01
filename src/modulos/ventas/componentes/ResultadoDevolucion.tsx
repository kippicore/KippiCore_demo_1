import { Banknote, CircleCheck, FileText, PackageCheck, TrendingDown, UserRound } from 'lucide-react';
import { rutas } from '@/app/rutas';
import type { Devolucion, EstadoDominio, Id, NotaCredito } from '@/dominio/tipos';
import { selCliente, selExistencia, selResumenVentas } from '@/selectores';
import { BotonDocumentoPdf, BotonEnlace, Dinero, ListaQueCambio } from '@/ui';
import { etiquetaMedio } from '../textos';

export interface FilaCambioUI {
  kind: 'inventario' | 'ventas' | 'reembolso' | 'saldo';
  texto: string;
  antes?: number;
  despues?: number;
  dinero?: boolean;
  negativo?: boolean;
  a?: string;
}

/** Lo que cambió con una devolución, medido con el estado de antes y de después (como "Lo que acaba de pasar"). */
export interface EfectosDevolucion {
  devolucion: Devolucion;
  nota: NotaCredito | null;
  ventaId: Id;
  clienteId: Id | null;
  filas: FilaCambioUI[];
}

export function calcularEfectos(
  antes: EstadoDominio,
  despues: EstadoDominio,
  devolucionId: Id | null,
  hoy: string,
): EfectosDevolucion | null {
  const devolucion =
    (devolucionId ? despues.devoluciones[devolucionId] : null) ??
    Object.values(despues.devoluciones).find((d) => !antes.devoluciones[d.id]);
  if (!devolucion) return null;
  const venta = despues.ventas[devolucion.ventaId];
  if (!venta) return null;
  const nota = devolucion.notaCreditoId ? (despues.notasCredito[devolucion.notaCreditoId] ?? null) : null;
  const filas: FilaCambioUI[] = [];
  for (const l of devolucion.lineas) {
    if (!l.reingresa) continue;
    const p = despues.productos[despues.variantes[l.varianteId]?.productoId ?? ''];
    const va = despues.variantes[l.varianteId];
    const color = va ? despues.colores[va.colorId]?.nombre : '';
    filas.push({
      kind: 'inventario',
      texto: `Inventario de ${despues.locales[devolucion.localId]?.nombre ?? ''} · ${p?.nombre ?? 'Prenda'} · ${color} · ${va?.talla ?? ''}`,
      antes: selExistencia(antes, { varianteId: l.varianteId, localId: devolucion.localId }),
      despues: selExistencia(despues, { varianteId: l.varianteId, localId: devolucion.localId }),
      a: p ? rutas.producto(p.referencia, { resaltar: l.varianteId }) : undefined,
    });
  }
  const rango = { desde: hoy, hasta: hoy, localId: 'todos' as const };
  filas.push({
    kind: 'ventas',
    texto: 'Ventas netas de hoy',
    antes: selResumenVentas(antes, rango).netas,
    despues: selResumenVentas(despues, rango).netas,
    dinero: true,
    a: rutas.ventas({ resaltar: venta.id }),
  });
  if (devolucion.reembolso) {
    filas.push({
      kind: 'reembolso',
      texto: `Reembolso en ${etiquetaMedio(devolucion.reembolso.medio).toLowerCase()}`,
      despues: devolucion.valorTotal,
      dinero: true,
      negativo: true,
    });
  }
  if (venta.clienteId && devolucion.compensacion !== 'reembolso') {
    filas.push({
      kind: 'saldo',
      texto: `Saldo a favor de ${despues.clientes[venta.clienteId]?.nombres ?? 'el cliente'}`,
      antes: selCliente(antes, { clienteId: venta.clienteId, hoy })?.metricas.saldoAFavor ?? 0,
      despues: selCliente(despues, { clienteId: venta.clienteId, hoy })?.metricas.saldoAFavor ?? 0,
      dinero: true,
      a: rutas.cliente(venta.clienteId),
    });
  }
  return { devolucion, nota, ventaId: venta.id, clienteId: venta.clienteId, filas };
}

const ICONOS = {
  inventario: PackageCheck,
  ventas: TrendingDown,
  reembolso: Banknote,
  saldo: UserRound,
} as const;

export function ResultadoDevolucion({ efectos }: { efectos: EfectosDevolucion }) {
  const { devolucion: d, nota } = efectos;
  const cambio = d.compensacion === 'cambio';
  return (
    <section
      aria-label="Resultado de la devolución"
      className="mx-auto max-w-[760px] border border-line bg-surface p-8"
      data-testid="resultado-devolucion"
    >
      <div className="flex items-start gap-3">
        <CircleCheck aria-hidden className="mt-1 size-6 shrink-0 text-success" strokeWidth={1.5} />
        <div>
          <p className="t-eyebrow text-ink-2">{cambio ? 'Cambio registrado' : 'Devolución registrada'}</p>
          <h2 className="mt-1 t-h2 num" data-testid="resultado-numero">
            {d.numero} · <Dinero valor={d.valorTotal} />
          </h2>
          <p className="mt-2 t-body text-muted">
            {cambio
              ? 'El valor quedó como saldo a favor del cliente. Ábrelo en el punto de venta para que elija la prenda nueva.'
              : d.compensacion === 'saldo_favor'
                ? 'El valor quedó como saldo a favor del cliente, listo para su próxima compra.'
                : 'La plata ya salió por el medio que elegiste y la venta quedó actualizada.'}
          </p>
        </div>
      </div>

      <ListaQueCambio
        className="mt-6"
        filas={efectos.filas.map((f) => ({
          icono: ICONOS[f.kind],
          texto: f.texto,
          antes: f.antes === undefined ? undefined : f.dinero ? <Dinero valor={f.antes} /> : f.antes,
          despues:
            f.despues === undefined ? undefined : f.dinero ? (
              <>
                {f.negativo ? '−' : ''}
                <Dinero valor={f.despues} />
              </>
            ) : (
              f.despues
            ),
          a: f.a,
        }))}
      />

      {nota && (
        <div
          className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-5"
          data-testid="resultado-nota-credito"
        >
          <span className="flex items-center gap-2 t-body text-ink">
            <FileText aria-hidden className="size-4 text-ink-2" strokeWidth={1.5} />
            Nota crédito <strong className="font-semibold num">{nota.numero}</strong> por{' '}
            <Dinero valor={nota.valor} />
          </span>
          <BotonDocumentoPdf documento={{ tipo: 'nota-credito', notaId: nota.id }} etiqueta="Descargar PDF" />
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
        <BotonEnlace to={rutas.ventas({ resaltar: efectos.ventaId })} variante="secondary">
          Volver a ventas
        </BotonEnlace>
        <BotonEnlace
          to={rutas.venta(efectos.ventaId)}
          variante={cambio ? 'secondary' : 'primary'}
          data-testid="resultado-ver-venta"
        >
          Ver la venta
        </BotonEnlace>
        {cambio && (
          <BotonEnlace to={rutas.pos(efectos.clienteId ? { cliente: efectos.clienteId } : undefined)} data-testid="resultado-abrir-pos">
            Abrir el punto de venta
          </BotonEnlace>
        )}
      </div>
    </section>
  );
}
