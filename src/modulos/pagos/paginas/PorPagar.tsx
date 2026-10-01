import { CalendarClock, CreditCard, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import type { CategoriaCxP, FechaISO } from '@/dominio/tipos';
import type { EstadoCxP } from '@/dominio/reglas/cuentas';
import { lunesDe, sumarDias } from '@/dominio/reglas/fechas';
import { ESTADOS_POR_PAGAR } from '@/config/estados';
import { useAcciones, useDinero, useHoy, useAhora, useSel } from '@/estado';
import { selCuentasPorPagar, selSaldosCuentas, type FilaCxP } from '@/selectores';
import { relativaDias } from '@/lib/formato';
import { dineroOrigen } from '@/lib/moneda';
import {
  avisar,
  Badge,
  BadgeEstado,
  BotonExportar,
  BotonPildora,
  Button,
  Card,
  ConfirmarEliminacion,
  Dinero,
  Drawer,
  EmptyState,
  Fecha,
  FranjaResumen,
  GrupoRadio,
  ItemMenu,
  Menu,
  NotaLegal,
  ParesDatos,
  SelectorFecha,
  SeparadorMenu,
  Table,
  Termino,
  Toolbar,
  useResaltar,
  BotonEnlace,
  type ColumnaTabla,
} from '@/ui';
import { estaEnSemana, textoSemana } from '../calculos';
import { DialogoCuentaPorPagar, DialogoPagar, DialogoProgramar } from '../componentes/DialogosCxP';
import { BotonMas } from '../componentes/BotonMas';
import { EncabezadoPagos } from '../componentes/EncabezadoPagos';
import { useLocalEfectivo, useNombresLocales } from '../hooks';
import { selFlujoDetalle } from '../selectores';
import { CATEGORIAS_CXP, MEDIOS_PAGO_CXP, ORDEN_CATEGORIAS_CXP, TIPOS_FLUJO, TXT } from '../textos';

type VistaEstado = 'pendientes' | 'todos' | EstadoCxP;

const OPCIONES_ESTADO: { valor: VistaEstado; etiqueta: string }[] = [
  { valor: 'pendientes', etiqueta: 'Por pagar (todas)' },
  { valor: 'vencido', etiqueta: 'Vencidas' },
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'programado', etiqueta: 'Programadas' },
  { valor: 'pago_parcial', etiqueta: 'Con pago parcial' },
  { valor: 'pagado', etiqueta: 'Pagadas' },
  { valor: 'todos', etiqueta: 'Todas' },
];

export default function PorPagar() {
  const p = useParamsRuta('porPagar');
  return <Vista key={`${p.local}|${p.semana}|${p.estado}|${p.resaltar}`} paramLocal={p.local} paramSemana={p.semana} paramEstado={p.estado} resaltarId={p.resaltar} />;
}

function Vista({ paramLocal, paramSemana, paramEstado, resaltarId }: { paramLocal: string | null; paramSemana: FechaISO | null; paramEstado: EstadoCxP | null; resaltarId: string | null }) {
  const hoy = useHoy();
  const hora = useAhora().slice(11, 16);
  const acciones = useAcciones();
  const dinero = useDinero();
  const resaltar = useResaltar() ?? resaltarId;
  const localId = useLocalEfectivo(paramLocal);
  const nombres = useNombresLocales();

  const [estado, setEstado] = useState<VistaEstado>(paramEstado ?? (resaltarId ? 'todos' : 'pendientes'));
  const [categoria, setCategoria] = useState<CategoriaCxP | 'todas'>('todas');
  const [texto, setTexto] = useState('');
  const [semana, setSemana] = useState<FechaISO | null>(paramSemana ? lunesDe(paramSemana) : null);
  const [pagando, setPagando] = useState<FilaCxP | null>(null);
  const [programando, setProgramando] = useState<FilaCxP | null>(null);
  const [formulario, setFormulario] = useState<{ abierto: boolean; editar: FilaCxP | null }>({ abierto: false, editar: null });
  const [eliminando, setEliminando] = useState<FilaCxP | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const cuentas = useSel(selSaldosCuentas).cuentas;
  const nombreCuenta = (id: string) => cuentas.find((c) => c.cuenta.id === id)?.cuenta.nombre ?? id;

  const base = useSel(selCuentasPorPagar, { hoy, estado: 'pendientes', localId });
  const todas = useSel(selCuentasPorPagar, { hoy, localId });
  const lista = useSel(selCuentasPorPagar, {
    hoy,
    localId,
    estado: estado === 'todos' ? undefined : estado,
    categoria: categoria === 'todas' ? undefined : categoria,
    desde: semana ?? undefined,
    hasta: semana ? sumarDias(semana, 6) : undefined,
  });
  const global = useSel(selCuentasPorPagar, { hoy, estado: 'pendientes' });
  const previsto = useSel(selFlujoDetalle, { dias: 30, hoy, hora });

  const filas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return lista.filas;
    return lista.filas.filter((f) => `${f.cxp.numero} ${f.cxp.terceroNombre} ${f.cxp.concepto}`.toLowerCase().includes(q));
  }, [lista.filas, texto]);

  const venceEn7 = base.filas.filter((f) => f.diasParaVencer >= 0 && f.diasParaVencer <= 7).reduce((a, f) => a + f.saldoCop, 0);
  const pagadoMes = useMemo(() => {
    const mes = hoy.slice(0, 7);
    let t = 0;
    for (const f of todas.filas) for (const a of f.cxp.abonos) if (a.ts.startsWith(mes)) t += a.valorCOP;
    return t;
  }, [todas.filas, hoy]);

  const proximos = useMemo(
    () =>
      previsto.movimientos
        .filter((m) => m.valor < 0 && m.clase !== 'cxp')
        .sort((a, b) => (a.fechaEfectiva < b.fechaEfectiva ? -1 : a.fechaEfectiva > b.fechaEfectiva ? 1 : a.valor - b.valor)),
    [previsto.movimientos],
  );
  const totalPrevisto = proximos.reduce((a, m) => a - m.valor, 0);

  const detalle = detalleId ? (todas.filas.find((f) => f.cxp.id === detalleId) ?? null) : null;

  const eliminar = () => {
    if (!eliminando) return;
    const r = acciones.eliminarCuentaPorPagar({ cxpId: eliminando.cxp.id, motivo: null });
    if (!r.ok) avisar({ tipo: 'error', texto: r.error.mensaje });
    else avisar({ texto: `Eliminaste ${eliminando.cxp.numero}` });
    setEliminando(null);
  };

  const columnas: ColumnaTabla<FilaCxP>[] = [
    { id: 'numero', encabezado: 'Cuenta', celda: (f) => <span className="num whitespace-nowrap text-ink-2">{f.cxp.numero}</span>, ordenar: (f) => f.cxp.numero, ancho: 112 },
    {
      id: 'tercero',
      encabezado: 'A quién y por qué',
      celda: (f) => (
        <div className="min-w-0 py-1">
          <p className="truncate t-body font-semibold text-ink" title={f.cxp.terceroNombre}>
            {f.cxp.terceroNombre}
          </p>
          <p className="truncate t-small text-muted" title={f.cxp.concepto}>
            {f.cxp.concepto}
          </p>
        </div>
      ),
      ordenar: (f) => f.cxp.terceroNombre,
      truncar: true,
    },
    {
      id: 'categoria',
      encabezado: 'Categoría',
      celda: (f) => (
        <div className="py-1">
          <p className="t-small text-ink-2">{CATEGORIAS_CXP[f.cxp.categoria]}</p>
          <p className="t-small text-muted">{f.cxp.localId ? (nombres[f.cxp.localId] ?? f.cxp.localId) : 'General'}</p>
        </div>
      ),
      ordenar: (f) => CATEGORIAS_CXP[f.cxp.categoria],
      ancho: 150,
    },
    {
      id: 'vence',
      encabezado: 'Pago',
      celda: (f) => (
        <div>
          <Fecha valor={f.fechaPago} />
          {f.estado !== 'pagado' && <p className="t-small text-muted">{f.cxp.programadaPara ? `Programado · ${relativaDias(f.fechaPago, hoy)}` : relativaDias(f.fechaPago, hoy)}</p>}
        </div>
      ),
      ordenar: (f) => f.fechaPago,
      ancho: 128,
    },
    {
      id: 'saldo',
      encabezado: 'Saldo',
      numerica: true,
      celda: (f) => (
        <div className="text-right">
          <Dinero valor={f.estado === 'pagado' ? 0 : f.saldoCop} />
          {f.cxp.moneda !== 'COP' && f.estado !== 'pagado' && <p className="t-small num text-muted">{dineroOrigen(f.saldoOrigen, f.cxp.moneda)}</p>}
        </div>
      ),
      ordenar: (f) => f.saldoCop,
      ancho: 140,
    },
    { id: 'estado', encabezado: 'Estado', celda: (f) => <BadgeEstado estado={ESTADOS_POR_PAGAR[f.estado]} />, ordenar: (f) => f.estado, ancho: 118 },
    {
      id: 'pagar',
      encabezado: <span className="sr-only">Pagar</span>,
      celda: (f) =>
        f.estado === 'pagado' ? null : (
          <Button
            variante="secondary"
            tamano="sm"
            icono={CreditCard}
            onClick={(ev) => {
              ev.stopPropagation();
              setPagando(f);
            }}
            data-testid="pagar-fila"
          >
            Pagar
          </Button>
        ),
      alinear: 'der',
      ancho: 104,
    },
  ];

  const chips = [
    ...(estado !== 'pendientes' ? [{ id: 'estado', texto: `Estado: ${OPCIONES_ESTADO.find((o) => o.valor === estado)?.etiqueta ?? estado}`, alQuitar: () => setEstado('pendientes') }] : []),
    ...(categoria !== 'todas' ? [{ id: 'cat', texto: `Categoría: ${CATEGORIAS_CXP[categoria]}`, alQuitar: () => setCategoria('todas') }] : []),
    ...(semana ? [{ id: 'semana', texto: `Semana del ${textoSemana(semana)}`, alQuitar: () => setSemana(null) }] : []),
  ];
  const limpiar = () => {
    setEstado('pendientes');
    setCategoria('todas');
    setSemana(null);
    setTexto('');
  };

  return (
    <>
      <EncabezadoPagos
        titulo={<Termino id="porPagar" />}
        subtitulo={TXT.porPagar.subtitulo}
        migaActual="Lo que debo"
        acciones={
          <>
            <BotonExportar reporte="cuentas" filtros={{ localId }} menu />
            <Button icono={Plus} onClick={() => setFormulario({ abierto: true, editar: null })} data-testid="nueva-cxp">
              {TXT.porPagar.nueva}
            </Button>
          </>
        }
      />

      <FranjaResumen
        className="mt-8"
        cifras={[
          { etiqueta: 'Lo que debo hoy', valor: <Dinero valor={base.totalCop} data-testid="cxp-total" /> },
          { etiqueta: 'Vencido', valor: <Dinero valor={base.vencidoCop} data-testid="cxp-vencido" /> },
          { etiqueta: 'Vence en 7 días', valor: <Dinero valor={venceEn7} /> },
          { etiqueta: 'Pagado este mes', valor: <Dinero valor={pagadoMes} /> },
        ]}
      />
      {localId !== 'todos' && global.filas.length > base.filas.length && <p className="mt-3 t-small text-muted">{TXT.generales.sinLocalNota(global.filas.length - base.filas.length)}</p>}

      <Table
        className="mt-6"
        etiqueta="Cuentas por pagar"
        columnas={columnas}
        filas={filas}
        clave={(f) => f.cxp.id}
        sustantivo={['cuenta', 'cuentas']}
        alAbrir={(f) => setDetalleId(f.cxp.id)}
        resaltada={(f) => f.cxp.id === resaltar}
        ordenInicial={{ id: 'vence', dir: 'asc' }}
        totales={{ saldo: <Dinero valor={filas.reduce((a, f) => a + (f.estado === 'pagado' ? 0 : f.saldoCop), 0)} /> }}
        data-testid="tabla-cxp"
        accionesFila={(f) => (
          <Menu disparador={<BotonMas aria-label={`Acciones de ${f.cxp.numero}`} />} etiqueta={`Acciones de ${f.cxp.numero}`}>
            {f.estado !== 'pagado' && (
              <ItemMenu icono={CalendarClock} onSelect={() => setProgramando(f)}>
                {f.cxp.programadaPara ? 'Cambiar fecha programada' : 'Programar pago'}
              </ItemMenu>
            )}
            <ItemMenu icono={Pencil} onSelect={() => setFormulario({ abierto: true, editar: f })}>
              Editar
            </ItemMenu>
            <SeparadorMenu />
            <ItemMenu icono={Trash2} peligro deshabilitado={f.cxp.abonos.length > 0} onSelect={() => setEliminando(f)}>
              {f.cxp.abonos.length > 0 ? 'Eliminar (ya tiene pagos)' : 'Eliminar'}
            </ItemMenu>
          </Menu>
        )}
        vacio={
          <EmptyState
            tamano="tabla"
            icono={ReceiptText}
            titulo={TXT.porPagar.vacioTitulo}
            texto={TXT.porPagar.vacioTexto}
            accion={
              <Button variante="secondary" onClick={limpiar}>
                Limpiar filtros
              </Button>
            }
          />
        }
        barra={
          <Toolbar
            buscar={{ valor: texto, alCambiar: setTexto, placeholder: 'Buscar por proveedor, concepto o número' }}
            filtros={
              <>
                <BotonPildora etiqueta="Estado" valor={OPCIONES_ESTADO.find((o) => o.valor === estado)?.etiqueta}>
                  <GrupoRadio valor={estado} alCambiar={setEstado} opciones={OPCIONES_ESTADO} />
                </BotonPildora>
                <BotonPildora etiqueta="Categoría" valor={categoria === 'todas' ? 'Todas' : CATEGORIAS_CXP[categoria]} anchoPanel={300}>
                  <GrupoRadio
                    valor={categoria}
                    alCambiar={setCategoria}
                    opciones={[{ valor: 'todas', etiqueta: 'Todas' }, ...ORDEN_CATEGORIAS_CXP.map((k) => ({ valor: k, etiqueta: CATEGORIAS_CXP[k] }))]}
                  />
                </BotonPildora>
                <BotonPildora etiqueta="Semana" valor={semana ? textoSemana(semana) : 'Todas'} anchoPanel={300}>
                  <SelectorFecha etiqueta="Pagos de la semana que incluye" hoy={hoy} valor={semana} alCambiar={(f) => setSemana(lunesDe(f))} enModal />
                  {semana && (
                    <Button variante="ghost" tamano="sm" className="mt-3" onClick={() => setSemana(null)}>
                      Ver todas las semanas
                    </Button>
                  )}
                </BotonPildora>
              </>
            }
            chips={chips}
            alLimpiar={limpiar}
          />
        }
      />
      {semana && filas.length > 0 && (
        <p className="mt-3 t-small text-muted">
          Semana del {textoSemana(semana)}: {filas.filter((f) => estaEnSemana(f.fechaPago, semana)).length} cuentas con pago en esos días.
        </p>
      )}

      <section className="mt-12" aria-label="Lo que viene sin cuenta por pagar" data-testid="previsto">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="t-h2 text-ink">{TXT.porPagar.previstoTitulo}</h2>
            <p className="mt-1 max-w-[72ch] t-small text-muted">{TXT.porPagar.previstoTexto}</p>
          </div>
          <BotonEnlace to={rutas.flujo({ dias: '30' })} variante="secondary" tamano="sm">
            Ver en el flujo de caja
          </BotonEnlace>
        </div>
        {proximos.length === 0 ? (
          <Card padding="compacta">
            <EmptyState tamano="compacto" icono={CalendarClock} titulo="Nada previsto en los próximos 30 días" texto="Cuando se acerque una obligación sin cuenta por pagar, aparece aquí." />
          </Card>
        ) : (
          <div className="border border-line bg-surface">
            <ul className="divide-y divide-line-soft">
              {proximos.slice(0, 8).map((m, i) => (
                <li key={`${m.fechaEfectiva}-${m.concepto}-${i}`} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-[120px] shrink-0 t-small num text-ink-2">
                    <Fecha valor={m.fechaEfectiva} formato="corta" /> · {relativaDias(m.fechaEfectiva, hoy)}
                  </span>
                  <span className="min-w-0 flex-1 truncate t-body text-ink" title={m.concepto}>
                    {m.concepto}
                  </span>
                  <Badge tono="neutral" tamano="sm">
                    {TIPOS_FLUJO[m.tipo]}
                  </Badge>
                  <span className="w-[120px] shrink-0 text-right t-body font-semibold num text-ink">
                    <Dinero valor={-m.valor} />
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-ink px-5 py-3">
              <span className="t-label text-ink">
                {proximos.length > 8 ? `Y ${proximos.length - 8} más · ` : ''}Total previsto
              </span>
              <span className="t-body font-bold num text-ink">
                <Dinero valor={totalPrevisto} />
              </span>
            </div>
          </div>
        )}
        <NotaLegal tipo="tributario" className="mt-3" />
      </section>

      <DialogoPagar fila={pagando} alCerrar={() => setPagando(null)} />
      <DialogoProgramar fila={programando} alCerrar={() => setProgramando(null)} />
      <DialogoCuentaPorPagar abierto={formulario.abierto} editar={formulario.editar} alCerrar={() => setFormulario({ abierto: false, editar: null })} />
      <ConfirmarEliminacion
        abierto={!!eliminando}
        alCambiar={(a) => !a && setEliminando(null)}
        pregunta={eliminando ? `¿Eliminar la cuenta ${eliminando.cxp.numero}?` : ''}
        consecuencias={eliminando ? `Se quitan ${dinero(eliminando.saldoCop)} que le debías a ${eliminando.cxp.terceroNombre} y el flujo de caja se recalcula.` : ''}
        accion="Eliminar cuenta"
        alConfirmar={eliminar}
      />
      <Drawer
        abierto={!!detalle}
        alCambiar={(a) => !a && setDetalleId(null)}
        eyebrow="Cuenta por pagar"
        titulo={detalle?.cxp.numero ?? ''}
        insignia={detalle ? <BadgeEstado estado={ESTADOS_POR_PAGAR[detalle.estado]} /> : null}
        pie={
          detalle && detalle.estado !== 'pagado' ? (
            <>
              <Button
                variante="secondary"
                icono={CalendarClock}
                onClick={() => {
                  setProgramando(detalle);
                  setDetalleId(null);
                }}
              >
                Programar
              </Button>
              <Button
                icono={CreditCard}
                onClick={() => {
                  setPagando(detalle);
                  setDetalleId(null);
                }}
              >
                Pagar
              </Button>
            </>
          ) : undefined
        }
        data-testid="detalle-cxp"
      >
        {detalle && (
          <>
            <ParesDatos
              pares={[
                ['A quién', detalle.cxp.terceroNombre],
                ['Categoría', CATEGORIAS_CXP[detalle.cxp.categoria]],
                ['Concepto', detalle.cxp.concepto],
                ['Local', detalle.cxp.localId ? (nombres[detalle.cxp.localId] ?? detalle.cxp.localId) : 'General del negocio'],
                ['Emitida', <Fecha key="e" valor={detalle.cxp.fechaEmision} />],
                ['Vence', <Fecha key="v" valor={detalle.cxp.fechaVencimiento} />],
                ['Pago programado', detalle.cxp.programadaPara ? <Fecha key="p" valor={detalle.cxp.programadaPara} /> : 'Sin programar'],
                ['Soporte', detalle.cxp.soporte ? `${detalle.cxp.soporte.nombreArchivo} (simulado)` : 'Sin soporte'],
                ['Valor', detalle.cxp.moneda === 'COP' ? <Dinero key="vl" valor={detalle.cxp.valor} /> : dineroOrigen(detalle.cxp.valor, detalle.cxp.moneda)],
                ['Saldo', <Dinero key="s" valor={detalle.saldoCop} />],
              ]}
            />
            {detalle.cxp.nota && <p className="t-body text-muted">{detalle.cxp.nota}</p>}
            <section>
              <h3 className="t-h3 text-ink">Pagos registrados</h3>
              {detalle.cxp.abonos.length === 0 ? (
                <p className="mt-2 t-body text-muted">Todavía no se ha pagado nada de esta cuenta.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line-soft border-y border-line-soft">
                  {detalle.cxp.abonos.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="t-body text-ink">
                          <Fecha valor={a.ts} formato="fecha" /> · {MEDIOS_PAGO_CXP[a.medio]}
                        </p>
                        <p className="t-small text-muted">Desde {nombreCuenta(a.cuentaId)}</p>
                      </div>
                      <div className="text-right">
                        <p className="t-body font-semibold num text-ink">
                          <Dinero valor={a.valorCOP} />
                        </p>
                        {a.montoOrigen && <p className="t-small num text-muted">{dineroOrigen(a.montoOrigen.centavos, a.montoOrigen.moneda)}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </Drawer>
    </>
  );
}
