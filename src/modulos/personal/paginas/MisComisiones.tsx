import { useNavigate } from 'react-router';
import { Award, UserX } from 'lucide-react';
import { BotonEnlace, BotonExportar, Card, EmptyState, EncabezadoPagina, Kpi } from '@/ui';
import { useDinero, useHoy, useSel, useUsuarioActivo } from '@/estado';
import { mesAnio, porcentaje } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { selComisiones } from '@/selectores';
import { mesEfectivo, ultimoDiaDelMes } from '../calculos';
import { DesgloseComision, TablaDetalleComision } from '../componentes/DetalleComision';
import { LimiteError, NotaNomina, SelectorMes } from '../componentes/Piezas';
import { TEXTOS } from '../textos';

/**
 * Mis comisiones (rol vendedor, W8): solo lo suyo. Nunca muestra salarios, costos ni nada de otras personas: la
 * comisión del mes, la meta de su local en porcentaje y cada venta que la suma.
 */
export default function MisComisiones() {
  return (
    <div className="pb-16" data-testid="personal-mis-comisiones">
      <EncabezadoPagina
        migas={[{ texto: 'Mi día', a: rutas.miDia() }, { texto: 'Mis comisiones' }]}
        titulo={TEXTOS.misComisiones.titulo}
        subtitulo={TEXTOS.misComisiones.subtitulo}
      />
      <LimiteError>
        <Cuerpo />
      </LimiteError>
    </div>
  );
}

function Cuerpo() {
  const { empleado } = useUsuarioActivo();
  const { mes: mesParam } = useParamsRuta('misComisiones');
  const navegar = useNavigate();
  const hoy = useHoy();
  const dinero = useDinero();
  const mes = mesEfectivo(mesParam, hoy);
  const enCurso = mes === hoy.slice(0, 7);
  const c = useSel(selComisiones, { mes, hoy, empleadoId: empleado?.id ?? '' })[0] ?? null;

  if (!empleado)
    return (
      <Card className="mt-8" padding="ninguno">
        <EmptyState icono={UserX} titulo={TEXTOS.misComisiones.sinEmpleadoTitulo} texto={TEXTOS.misComisiones.sinEmpleadoTexto} accion={<BotonEnlace to={rutas.miDia()}>Ir a Mi día</BotonEnlace>} />
      </Card>
    );
  if (!c?.esquema)
    return (
      <Card className="mt-8" padding="ninguno">
        <EmptyState icono={Award} titulo={TEXTOS.misComisiones.sinEsquemaTitulo} texto={TEXTOS.misComisiones.sinEsquemaTexto} accion={<BotonEnlace to={rutas.miDia()}>Ir a Mi día</BotonEnlace>} />
      </Card>
    );

  const cumplimiento = c.metaLocalMes > 0 ? c.ventasLocalMes / c.metaLocalMes : null;
  return (
    <div className="mt-8 flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <SelectorMes hoy={hoy} valor={mes} alCambiar={(m) => navegar(rutas.misComisiones({ mes: m }), { replace: true })} className="w-[240px]" />
          {enCurso && <p className="max-w-[56ch] pb-2 t-small text-muted">{TEXTOS.comisiones.mesEnCurso}</p>}
        </div>
        <BotonExportar reporte="comisiones" menu filtros={{ desde: `${mes}-01`, hasta: ultimoDiaDelMes(mes) }} />
      </div>

      <section aria-label="Tu comisión" className="grid grid-cols-1 gap-4 desk:grid-cols-3">
        <Kpi etiqueta={`Tu comisión de ${enCurso ? 'este mes' : mesAnio(mes)}`} valor={c.comision.total} formatear={dinero.corta} completo={dinero(c.comision.total)} destacada data-testid="personal-mi-comision" />
        <Kpi etiqueta="Tus ventas sin IVA" valor={c.base} formatear={dinero.corta} completo={dinero(c.base)} nota="Menos devoluciones y separados cancelados" />
        <Kpi etiqueta="Meta de tu local" valor={cumplimiento ?? 0} formatear={(n) => porcentaje(n, 0)} nota={cumplimiento === null ? 'Sin meta fijada este mes' : 'Del mes, con lo que lleva el local'} />
      </section>

      <section aria-label="Cómo se calcula" className="flex flex-col gap-3">
        <h2 className="t-h2 text-ink">Cómo se calcula tu comisión</h2>
        <p className="t-body text-muted">{c.esquema.nombre}</p>
        <DesgloseComision comision={c} />
      </section>

      <section aria-label="Tus ventas" className="flex flex-col gap-3">
        <h2 className="t-h2 text-ink">Las ventas que la suman</h2>
        <TablaDetalleComision comision={c} />
      </section>
      <NotaNomina />
    </div>
  );
}
