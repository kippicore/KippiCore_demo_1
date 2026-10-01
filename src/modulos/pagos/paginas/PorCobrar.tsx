import { HandCoins, MessageCircle, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { ESTADOS_POR_COBRAR } from '@/config/estados';
import { useFiltroLocal, useHoy, useSel } from '@/estado';
import { relativaDias } from '@/lib/formato';
import { BotonAccionesFila, BadgeEstado, BotonExportar, Button, Dinero, EmptyState, Fecha, FranjaResumen, ItemMenu, Menu, Segmentado, Table, Termino, Toolbar, useResaltar, type ColumnaTabla } from '@/ui';
import { DialogoAbono, DialogoCobro } from '../componentes/DialogosCobro';
import { EncabezadoPagos } from '../componentes/EncabezadoPagos';
import { selCobros, type FilaCobro } from '../selectores';
import { TXT } from '../textos';

type Filtro = 'todos' | 'separados-por-vencer' | 'vencidos' | 'credito';

export default function PorCobrar() {
  const params = useParamsRuta('porCobrar');
  const navegar = useNavigate();
  const hoy = useHoy();
  const localId = useFiltroLocal();
  const resaltar = useResaltar();
  const filtro: Filtro = params.filtro ?? 'todos';
  const [texto, setTexto] = useState('');
  const [cobrando, setCobrando] = useState<FilaCobro | null>(null);
  const [abonando, setAbonando] = useState<FilaCobro | null>(null);

  const vista = useSel(selCobros, { hoy, localId, filtro: filtro === 'todos' ? undefined : filtro });
  const { resumen } = vista;

  const filas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return vista.filas;
    return vista.filas.filter((f) => `${f.numeroVenta} ${f.cliente?.nombre ?? ''} ${f.cliente?.celular ?? ''}`.toLowerCase().includes(q));
  }, [vista.filas, texto]);

  const elegir = (f: Filtro) => navegar(rutas.porCobrar({ filtro: f === 'todos' ? null : f }), { replace: true });

  const columnas: ColumnaTabla<FilaCobro>[] = [
    {
      id: 'venta',
      encabezado: 'Venta',
      celda: (f) => (
        <Link to={rutas.venta(f.ventaId)} className="num whitespace-nowrap text-ink underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>
          {f.numeroVenta}
        </Link>
      ),
      ordenar: (f) => f.numeroVenta,
      ancho: 92,
    },
    {
      id: 'cliente',
      encabezado: 'Cliente',
      celda: (f) => (
        <div className="min-w-0 py-1">
          <p className="truncate t-body font-semibold text-ink">{f.cliente?.nombre ?? 'Sin cliente registrado'}</p>
          <p className="truncate t-small text-muted">
            {f.tipo === 'separado' ? 'Separado' : 'Crédito'} · {f.localNombre}
          </p>
        </div>
      ),
      ordenar: (f) => f.cliente?.nombre ?? '',
      truncar: true,
    },
    {
      id: 'abonado',
      encabezado: 'Abonado',
      celda: (f) => (
        <div>
          <Dinero valor={f.abonado} corta />
          <p className="t-small text-muted">
            de <Dinero valor={f.total} corta />
          </p>
        </div>
      ),
      ordenar: (f) => f.abonado,
      ancho: 96,
    },
    { id: 'saldo', encabezado: 'Saldo', numerica: true, celda: (f) => <Dinero valor={f.saldo} className="font-semibold" />, ordenar: (f) => f.saldo, ancho: 110 },
    {
      id: 'limite',
      encabezado: 'Fecha límite',
      celda: (f) =>
        f.fechaLimite ? (
          <div>
            <Fecha valor={f.fechaLimite} />
            <p className="t-small text-muted">{relativaDias(f.fechaLimite, hoy)}</p>
          </div>
        ) : (
          <span className="t-small text-muted">Sin fecha</span>
        ),
      ordenar: (f) => f.fechaLimite ?? '9999',
      ancho: 112,
    },
    { id: 'estado', encabezado: 'Estado', celda: (f) => <BadgeEstado estado={ESTADOS_POR_COBRAR[f.estado]} />, ordenar: (f) => f.estado, ancho: 104 },
    {
      id: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      alinear: 'der',
      ancho: 122,
      celda: (f) => (
        <Button
          variante="secondary"
          tamano="sm"
          icono={MessageCircle}
          onClick={(e) => {
            e.stopPropagation();
            setCobrando(f);
          }}
          data-testid="cobro-recordar"
        >
          Recordar
        </Button>
      ),
    },
  ];

  return (
    <>
      <EncabezadoPagos
        titulo={<Termino id="porCobrar" />}
        subtitulo={TXT.porCobrar.subtitulo}
        migaActual="Plata que me deben"
        acciones={<BotonExportar reporte="cuentas" filtros={{ localId }} menu />}
      />
      <FranjaResumen
        className="mt-8"
        cifras={[
          { etiqueta: 'Plata que me deben', valor: <Dinero valor={resumen.saldo} data-testid="cxc-saldo" /> },
          { etiqueta: `Por vencer · ${resumen.nPorVencer}`, valor: <Dinero valor={resumen.porVencer} /> },
          { etiqueta: `Vencido · ${resumen.nVencidos}`, valor: <Dinero valor={resumen.vencido} /> },
          { etiqueta: 'Separados · Créditos', valor: <span className="num">{resumen.nSeparados} · {resumen.nCredito}</span> },
        ]}
      />
      <Table
        className="mt-6"
        etiqueta="Plata que me deben"
        columnas={columnas}
        filas={filas}
        clave={(f) => f.ventaId}
        sustantivo={['saldo', 'saldos']}
        resaltada={(f) => f.ventaId === resaltar}
        accionesFila={(f) => (
          <Menu disparador={<BotonAccionesFila aria-label={`Acciones de ${f.numeroVenta}`} />} etiqueta={`Acciones de ${f.numeroVenta}`}>
            <ItemMenu icono={HandCoins} onSelect={() => setAbonando(f)} data-testid="cobro-abonar">
              Registrar un abono
            </ItemMenu>
            <ItemMenu icono={MessageCircle} onSelect={() => setCobrando(f)}>
              Recordar por WhatsApp
            </ItemMenu>
          </Menu>
        )}
        ordenInicial={{ id: 'limite', dir: 'asc' }}
        totales={{ saldo: <Dinero valor={filas.reduce((a, f) => a + f.saldo, 0)} /> }}
        data-testid="tabla-cxc"
        vacio={
          <EmptyState
            tamano="tabla"
            icono={Wallet}
            titulo={TXT.porCobrar.vacioTitulo}
            texto={TXT.porCobrar.vacioTexto}
            accion={
              filtro !== 'todos' ? (
                <Button variante="secondary" onClick={() => elegir('todos')}>
                  Ver todos los saldos
                </Button>
              ) : undefined
            }
          />
        }
        barra={
          <Toolbar
            buscar={{ valor: texto, alCambiar: setTexto, placeholder: 'Buscar por cliente, celular o número de venta' }}
            derecha={
              <Segmentado
                etiqueta="Filtro de saldos"
                valor={filtro}
                alCambiar={elegir}
                data-testid="filtro-cxc"
                opciones={[
                  { valor: 'todos', etiqueta: 'Todos' },
                  { valor: 'separados-por-vencer', etiqueta: 'Separados por vencer', 'data-testid': 'filtro-separados' },
                  { valor: 'vencidos', etiqueta: 'Vencidos' },
                  { valor: 'credito', etiqueta: 'A crédito' },
                ]}
              />
            }
          />
        }
      />
      <DialogoCobro fila={cobrando} alCerrar={() => setCobrando(null)} />
      <DialogoAbono fila={abonando} alCerrar={() => setAbonando(null)} />
    </>
  );
}
