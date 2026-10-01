import { useMemo } from 'react';
import { ArrowRight, Ban, Lock, PackageMinus, Percent, ReceiptText, ScanBarcode, Clock } from 'lucide-react';
import { BarraProgreso, BotonEnlace, Card, Dinero, EmptyState, EncabezadoPagina, Icono, Kpi } from '@/ui';
import { PARAMETROS_VENTAS } from '@/config/negocio';
import { useAhora, useDinero, useSel, useUsuarioActivo } from '@/estado';
import { selLocales, selMiDia } from '@/selectores';
import { rutas } from '@/app/rutas';
import { fechaLarga, porcentaje } from '@/lib/formato';
import { LimiteError } from '../componentes/Piezas';
import { Marcacion } from '../componentes/Marcacion';
import { TEXTOS } from '../textos';

/** Inicio del vendedor (W8): su día, su plata y lo que le toca al dueño decidir. Solo cifras propias y del local. */
export default function MiDia() {
  return (
    <LimiteError testid="mi-dia-error">
      <CuerpoMiDia />
    </LimiteError>
  );
}

function CuerpoMiDia() {
  const { empleado } = useUsuarioActivo();
  const ahora = useAhora();
  const dinero = useDinero();
  const locales = useSel(selLocales, { incluirBodega: true });
  const mi = useSel(selMiDia, { empleadoId: empleado?.id ?? '', ahora });
  const nombreLocal = useMemo(() => {
    const m = new Map(locales.map((l) => [l.id, l.nombre]));
    return (id: string) => m.get(id) ?? id;
  }, [locales]);

  if (!empleado)
    return (
      <div className="mt-8 border border-line bg-surface">
        <EmptyState icono={Clock} titulo="Esta vista es para el equipo de ventas" texto="Cambia el rol a vendedor para ver su día: sus ventas, su comisión y su marcación." />
      </div>
    );

  const limites = [
    { icono: Ban, titulo: 'Anular una venta', alternativa: 'Pides la anulación y la aprueba el dueño.' },
    { icono: Percent, titulo: `Dar más del ${porcentaje(PARAMETROS_VENTAS.descuentoMaximoVendedor, 0)} de descuento`, alternativa: 'Pides la aprobación y el dueño responde desde su celular.' },
    { icono: PackageMinus, titulo: 'Ajustar el inventario', alternativa: 'Le avisas al dueño o al jefe de bodega.' },
    { icono: Lock, titulo: 'Ver cuánto debería haber al cerrar la caja', alternativa: 'Cuentas el efectivo primero; el sistema compara después (arqueo ciego).' },
  ];

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: 'Mi día' }]}
        titulo={`Hola, ${empleado.nombres.split(' ')[0]}`}
        subtitulo={fechaLarga(ahora)}
        acciones={
          <BotonEnlace to={rutas.pos()} icono={ScanBarcode} data-testid="mi-dia-registrar-venta">
            Registrar venta
          </BotonEnlace>
        }
      />

      <p className="mt-8 max-w-[70ch] t-body-lg text-ink" data-testid="mi-dia-resumen">
        Hoy llevas <Dinero valor={mi.ventasHoy.netas} className="font-bold" /> en{' '}
        <strong className="num">
          {mi.ventasHoy.numVentas} {mi.ventasHoy.numVentas === 1 ? 'venta' : 'ventas'}
        </strong>
        . Tu comisión del mes: <Dinero valor={mi.comisionMes} className="font-bold" />.
        {mi.meta && (
          <>
            {' '}
            Meta del local: <strong className="num">{porcentaje(mi.meta.avance, 0)}</strong>.
          </>
        )}
      </p>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 wide:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Marcacion empleado={empleado} siguiente={mi.siguienteMarcacion} turnoHoy={mi.turnoHoy} marcacionesHoy={mi.marcacionesHoy} nombreLocal={nombreLocal} />

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Kpi etiqueta="Ventas de hoy" valor={mi.ventasHoy.netas} formatear={dinero} nota={`${mi.ventasHoy.numVentas} ${mi.ventasHoy.numVentas === 1 ? 'venta' : 'ventas'} · hasta las ${ahora.slice(11, 16)}`} data-testid="mi-dia-kpi-ventas" />
            <Kpi etiqueta="Tu comisión del mes" valor={mi.comisionMes} formatear={dinero} nota="Se calcula sobre tus ventas sin IVA" data-testid="mi-dia-kpi-comision" />
          </div>
          {mi.meta && (
            <Card padding="compacta" data-testid="mi-dia-meta">
              <p className="t-eyebrow text-ink-2">Meta del local este mes</p>
              <div className="mt-3">
                <BarraProgreso
                  valor={mi.meta.avance}
                  meta
                  alto={4}
                  etiqueta={<span className="t-h3 num">{porcentaje(mi.meta.avance, 0)}</span>}
                  detalle={
                    <span>
                      <Dinero valor={mi.meta.ventasMes} corta /> de <Dinero valor={mi.meta.valor} corta />
                    </span>
                  }
                />
              </div>
              <p className="mt-3 t-small text-ink-2">
                {mi.meta.avance >= 1 ? 'El local ya cumplió la meta del mes.' : <>Al local le faltan <Dinero valor={mi.meta.valor - mi.meta.ventasMes} corta /> para cumplirla.</>}
              </p>
            </Card>
          )}
          <div className="flex flex-wrap gap-3">
            <BotonEnlace to={rutas.miTurno()} variante="secondary" iconoDerecha={ArrowRight}>
              Ver mi turno y mi asistencia
            </BotonEnlace>
            <BotonEnlace to={rutas.misComisiones()} variante="secondary" icono={ReceiptText}>
              Mis comisiones
            </BotonEnlace>
          </div>
        </div>
      </div>

      <section className="mt-10" data-testid="mi-dia-limites">
        <h2 className="t-h3 text-ink">{TEXTOS.miDia.nunca}</h2>
        <p className="mt-1 max-w-[70ch] t-small text-ink-2">{TEXTOS.miDia.nuncaAyuda}</p>
        <ul className="mt-4 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-2">
          {limites.map((l) => (
            <li key={l.titulo} className="flex gap-3 bg-surface p-5">
              <Icono icono={l.icono} tamano={20} className="mt-0.5 text-ink-2" />
              <div>
                <p className="t-body font-bold text-ink">{l.titulo}</p>
                <p className="mt-1 t-small text-ink-2">{l.alternativa}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
