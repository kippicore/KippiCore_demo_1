import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Award, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  BarraProgreso,
  BotonAccionesFila,
  BotonExportar,
  Button,
  ConfirmarEliminacion,
  Dinero,
  Drawer,
  EmptyState,
  ItemMenu,
  Kpi,
  Menu,
  ParesDatos,
  Table,
  avisar,
  type ColumnaTabla,
} from '@/ui';
import type { EsquemaComision, Local, MetaVentas } from '@/dominio/tipos';
import { useAcciones, useDinero, useHoy, useSel } from '@/estado';
import { mesAnio, plural, porcentaje } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { selComisiones, type ComisionEmpleado } from '@/selectores';
import { frasesEsquema, mesEfectivo, ultimoDiaDelMes } from '../calculos';
import { DesgloseComision, TablaDetalleComision } from '../componentes/DetalleComision';
import { DialogoEsquema, DialogoMeta } from '../componentes/DialogosComision';
import { CeldaPersona, EncabezadoPersonal, FraseVista, LimiteError, NotaNomina, SelectorMes } from '../componentes/Piezas';
import { selEsquemasConUso, selMetasLocales, type EsquemaConUso, type MetaLocal } from '../selectores';
import { TEXTOS } from '../textos';

/** Comisiones por vendedor y periodo (PRD 7.9, W1/W8): con el detalle de cada venta, los esquemas y las metas por local. */
export default function Comisiones() {
  return (
    <div className="pb-16" data-testid="personal-comisiones">
      <EncabezadoPersonal titulo={TEXTOS.comisiones.titulo} subtitulo={TEXTOS.comisiones.subtitulo} />
      <LimiteError>
        <Cuerpo />
      </LimiteError>
    </div>
  );
}

function Cuerpo() {
  const { mes: mesParam, empleado } = useParamsRuta('comisiones');
  const navegar = useNavigate();
  const hoy = useHoy();
  const dinero = useDinero();
  const mes = mesEfectivo(mesParam, hoy);
  const enCurso = mes === hoy.slice(0, 7);
  const comisiones = useSel(selComisiones, { mes, hoy });
  const metas = useSel(selMetasLocales, { mes, hoy });
  const esquemas = useSel(selEsquemasConUso);

  const [esquema, setEsquema] = useState<{ esquema: EsquemaComision | null } | null>(null);
  const [meta, setMeta] = useState<{ local: Local; meta: MetaVentas | null } | null>(null);
  const [aEliminar, setAEliminar] = useState<EsquemaConUso | null>(null);
  const acciones = useAcciones();

  const total = comisiones.reduce((a, c) => a + c.comision.total, 0);
  const base = comisiones.reduce((a, c) => a + c.base, 0);
  const mejor = comisiones[0];
  const elegida = empleado ? (comisiones.find((c) => c.empleadoId === empleado) ?? null) : null;
  const ir = (cambios: { mes?: string; empleado?: string | null }) => navegar(rutas.comisiones({ mes: cambios.mes ?? mes, empleado: cambios.empleado === undefined ? empleado : cambios.empleado }), { replace: true });

  const columnas: ColumnaTabla<ComisionEmpleado>[] = useMemo(
    () => [
      { id: 'persona', encabezado: 'Vendedor', ancho: '26%', celda: (c) => <CeldaPersona empleado={{ cargo: 'vendedor' }} nombre={c.nombre} detalle={c.esquema?.nombre} />, ordenar: (c) => c.nombre },
      { id: 'ventas', encabezado: 'Ventas sin IVA', numerica: true, alinear: 'der', celda: (c) => <Dinero valor={c.base} />, ordenar: (c) => c.base },
      {
        id: 'meta',
        encabezado: 'Meta del local',
        ancho: '20%',
        celda: (c) =>
          c.metaLocalMes > 0 ? (
            <span className="flex min-w-[140px] flex-col gap-1">
              <span className="t-small num text-ink-2">{porcentaje(c.ventasLocalMes / c.metaLocalMes, 0)} de la meta</span>
              <BarraProgreso valor={c.ventasLocalMes / c.metaLocalMes} meta alto={2} />
            </span>
          ) : (
            <span className="text-muted">Sin meta</span>
          ),
        ordenar: (c) => (c.metaLocalMes > 0 ? c.ventasLocalMes / c.metaLocalMes : -1),
      },
      { id: 'comision', encabezado: 'Comisión', numerica: true, alinear: 'der', celda: (c) => <Dinero valor={c.comision.total} className="font-bold text-ink" />, ordenar: (c) => c.comision.total },
    ],
    [],
  );

  const eliminar = () => {
    if (!aEliminar) return;
    const r = acciones.eliminarEsquemaComision({ esquemaId: aEliminar.esquema.id });
    if (!r.ok) avisar({ tipo: 'error', texto: r.error.mensaje });
    else avisar({ tipo: 'exito', texto: 'Esquema eliminado', detalle: aEliminar.esquema.nombre });
    setAEliminar(null);
  };

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section aria-label="Mes" className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <SelectorMes hoy={hoy} valor={mes} alCambiar={(m) => ir({ mes: m, empleado: null })} className="w-[240px]" />
          {enCurso && <p className="max-w-[56ch] pb-2 t-small text-muted">{TEXTOS.comisiones.mesEnCurso}</p>}
        </div>
        <BotonExportar reporte="comisiones" menu filtros={{ desde: `${mes}-01`, hasta: ultimoDiaDelMes(mes) }} />
      </section>

      <section aria-label="Cifras del mes" className="grid grid-cols-2 gap-4 wide:grid-cols-4">
        <Kpi etiqueta={`Comisiones de ${enCurso ? 'este mes' : mesAnio(mes)}`} valor={total} formatear={dinero.corta} completo={dinero(total)} destacada nota={`${plural(comisiones.length, 'vendedor')} con esquema`} data-testid="personal-comisiones-total" />
        <Kpi etiqueta="Ventas que cuentan" valor={base} formatear={dinero.corta} completo={dinero(base)} nota="Sin IVA, menos devoluciones" />
        <Kpi etiqueta="Quien más ganó" valor={mejor?.comision.total ?? 0} formatear={dinero.corta} completo={dinero(mejor?.comision.total ?? 0)} nota={mejor ? mejor.nombre : 'Sin comisiones'} />
        <Kpi etiqueta="Comisión sobre ventas" valor={base > 0 ? total / base : 0} formatear={(n) => porcentaje(n, 1)} nota="Lo que cuesta vender, en promedio" />
      </section>

      <section aria-label="Comisión por vendedor" data-testid="personal-comisiones-tabla">
        <Table
          columnas={columnas}
          filas={comisiones}
          clave={(c) => c.empleadoId}
          sustantivo={['vendedor', 'vendedores']}
          etiqueta="Comisión por vendedor"
          alAbrir={(c) => ir({ empleado: c.empleadoId })}
          resaltada={(c) => c.empleadoId === empleado}
          porPagina={25}
          totales={{ ventas: <Dinero valor={base} />, comision: <Dinero valor={total} /> }}
          vacio={<EmptyState tamano="tabla" icono={Award} titulo={TEXTOS.comisiones.vacioTitulo} texto={TEXTOS.comisiones.vacioTexto} />}
        />
        <p className="mt-3 max-w-[72ch] t-small text-muted">{TEXTOS.comisiones.baseNota}</p>
      </section>

      <section aria-label={TEXTOS.comisiones.esquemasTitulo} className="flex flex-col gap-4" data-testid="personal-esquemas">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="t-h2 text-ink">{TEXTOS.comisiones.esquemasTitulo}</h2>
            <p className="mt-1 max-w-[72ch] t-body text-muted">{TEXTOS.comisiones.esquemasTexto}</p>
          </div>
          <Button icono={Plus} variante="secondary" onClick={() => setEsquema({ esquema: null })} data-testid="personal-nuevo-esquema">
            Nuevo esquema
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 desk:grid-cols-2">
          {esquemas.map((x) => (
            <article key={x.esquema.id} className="flex flex-col gap-3 border border-line bg-surface p-5" data-testid={`personal-esquema-${x.esquema.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="t-h3 text-ink">{x.esquema.nombre}</h3>
                  <p className="mt-0.5 t-small text-muted">
                    {x.personas.length > 0 ? `Lo usan ${plural(x.personas.length, 'persona')}: ${x.personas.map((p) => p.nombre.split(' ')[0]).join(', ')}` : 'Todavía no lo usa nadie'}
                  </p>
                </div>
                <Menu etiqueta={`Acciones de ${x.esquema.nombre}`} disparador={<BotonAccionesFila aria-label={`Acciones de ${x.esquema.nombre}`} />}>
                  <ItemMenu icono={Pencil} onSelect={() => setEsquema({ esquema: x.esquema })}>
                    Editar
                  </ItemMenu>
                  <ItemMenu icono={Trash2} peligro deshabilitado={x.personas.length > 0} onSelect={() => setAEliminar(x)}>
                    {x.personas.length > 0 ? 'En uso: no se puede eliminar' : 'Eliminar'}
                  </ItemMenu>
                </Menu>
              </div>
              <ul className="flex flex-col gap-1.5">
                {frasesEsquema(x.esquema).map((f, i) => (
                  <li key={i}>
                    <FraseVista frase={f} className="t-body text-ink-2" />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={TEXTOS.comisiones.metasTitulo} className="flex flex-col gap-4" data-testid="personal-metas">
        <div>
          <h2 className="t-h2 text-ink">{TEXTOS.comisiones.metasTitulo}</h2>
          <p className="mt-1 max-w-[72ch] t-body text-muted">
            {TEXTOS.comisiones.metasTexto} Meta de {mesAnio(mes)}, con IVA.
          </p>
        </div>
        <ul className="divide-y divide-line-soft border border-line bg-surface">
          {metas.map((m: MetaLocal) => (
            <li key={m.local.id} className="grid grid-cols-[180px_1fr_auto] items-center gap-6 px-5 py-4" data-testid={`personal-meta-${m.local.id}`} data-meta={m.meta?.valor ?? 0}>
              <span className="t-body font-semibold text-ink">{m.local.nombre}</span>
              <span className="min-w-0">
                {m.meta ? (
                  <BarraProgreso
                    meta
                    valor={m.cumplimiento ?? 0}
                    etiqueta={
                      <span>
                        <Dinero valor={m.ventas} corta /> de <Dinero valor={m.meta.valor} corta />
                      </span>
                    }
                    detalle={m.cumplimiento !== null ? `${porcentaje(m.cumplimiento, 0)} de la meta` : ''}
                  />
                ) : (
                  <span className="t-body text-muted">Sin meta fijada para este mes</span>
                )}
              </span>
              <Button variante="secondary" tamano="sm" onClick={() => setMeta({ local: m.local, meta: m.meta })} data-testid={`personal-fijar-meta-${m.local.id}`}>
                {m.meta ? 'Cambiar meta' : 'Fijar meta'}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <NotaNomina />

      <Drawer
        abierto={!!elegida}
        alCambiar={(a) => !a && ir({ empleado: null })}
        eyebrow={`Comisión de ${mesAnio(mes)}`}
        titulo={elegida?.nombre ?? ''}
        ancho="lg"
        data-testid="personal-cajon-comision"
      >
        {elegida && (
          <>
            <ParesDatos
              columnas={3}
              pares={[
                ['Comisión', <Dinero key="c" valor={elegida.comision.total} className="t-kpi-sm font-bold text-ink" />],
                ['Ventas sin IVA que cuentan', <Dinero key="b" valor={elegida.base} />],
                ['Esquema', elegida.esquema?.nombre ?? 'Sin esquema'],
              ]}
            />
            <DesgloseComision comision={elegida} />
            <TablaDetalleComision comision={elegida} />
          </>
        )}
      </Drawer>

      {esquema && <DialogoEsquema esquema={esquema.esquema} alCerrar={() => setEsquema(null)} />}
      {meta && <DialogoMeta local={meta.local} mes={mes} meta={meta.meta} alCerrar={() => setMeta(null)} />}
      <ConfirmarEliminacion
        abierto={!!aEliminar}
        alCambiar={(a) => !a && setAEliminar(null)}
        pregunta={`¿Eliminar el esquema «${aEliminar?.esquema.nombre ?? ''}»?`}
        consecuencias="Ninguna persona lo usa hoy, así que las comisiones de este y otros meses no cambian. Si lo necesitas de nuevo, tendrás que crearlo otra vez."
        accion="Eliminar esquema"
        alConfirmar={eliminar}
      />
    </div>
  );
}
