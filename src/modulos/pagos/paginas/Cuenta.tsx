import { ArrowLeftRight, BookOpen, Check, Landmark, ReceiptText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useHoy, useSel } from '@/estado';
import { selLibroCuenta, selSaldosCuentas, type MovimientoLibro } from '@/selectores';
import { entero } from '@/lib/formato';
import { Badge, BotonEnlace, BotonPildora, Button, Dinero, EmptyState, Fecha, FranjaResumen, SelectorRango, Table, textoRango, Toolbar, useResaltar, type ColumnaTabla } from '@/ui';
import { DialogoMovimiento, DialogoTransferir } from '../componentes/DialogosCuentas';
import { EncabezadoPagos } from '../componentes/EncabezadoPagos';
import { useConciliar } from '../hooks';
import { TIPOS_CUENTA, TIPOS_MOVIMIENTO_CUENTA } from '../textos';

/** Libro de una cuenta: cada pago y movimiento con su saldo acumulado y su estado de conciliación. */
export default function Cuenta() {
  const p = useParamsRuta('cuenta');
  const hoy = useHoy();
  const navegar = useNavigate();
  const resaltar = useResaltar();
  const conciliar = useConciliar();
  const saldos = useSel(selSaldosCuentas);
  const cuenta = saldos.cuentas.find((c) => c.cuenta.id === p.cuentaId) ?? null;
  const rango = { desde: p.desde ?? sumarDias(hoy, -29), hasta: p.hasta ?? hoy };
  const libro = useSel(selLibroCuenta, { cuentaId: p.cuentaId, desde: rango.desde, hasta: rango.hasta });
  const [texto, setTexto] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [transferir, setTransferir] = useState(false);
  const [movimiento, setMovimiento] = useState(false);

  const filas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return q ? libro.filas.filter((f) => f.descripcion.toLowerCase().includes(q)) : libro.filas;
  }, [libro.filas, texto]);
  const entra = libro.filas.reduce((a, f) => a + (f.valor > 0 ? f.valor : 0), 0);
  const sale = libro.filas.reduce((a, f) => a + (f.valor < 0 ? -f.valor : 0), 0);
  const sinConciliar = libro.filas.filter((f) => !f.conciliado).length;

  if (!cuenta)
    return (
      <>
        <EncabezadoPagos titulo="Cuenta" migaActual="Cuenta" migasExtra={[{ texto: 'Caja y bancos', a: rutas.cuentas() }]} />
        <EmptyState icono={Landmark} titulo="Esa cuenta ya no existe" texto="Puede que se haya cambiado el enlace. Elige una cuenta de la lista." accion={<BotonEnlace to={rutas.cuentas()}>Ver caja y bancos</BotonEnlace>} />
      </>
    );

  const elegidas = filas.filter((f) => seleccion.has(f.id));
  const refs = (lista: MovimientoLibro[]) => lista.map((f) => ({ tipo: f.tipo === 'pago_venta' ? ('pago_venta' as const) : ('movimiento' as const), id: f.id, ventaId: f.ventaId }));

  const columnas: ColumnaTabla<MovimientoLibro>[] = [
    { id: 'fecha', encabezado: 'Fecha', celda: (f) => <Fecha valor={f.ts} formato="fechaHora" />, ordenar: (f) => f.ts, ancho: 215 },
    {
      id: 'descripcion',
      encabezado: 'Descripción',
      celda: (f) => (
        <div className="min-w-0 py-1">
          <p className="truncate t-body text-ink" title={f.descripcion}>
            {f.ventaId ? (
              <Link to={rutas.venta(f.ventaId)} className="underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>
                {f.descripcion}
              </Link>
            ) : (
              f.descripcion
            )}
          </p>
          <p className="t-small text-muted">{TIPOS_MOVIMIENTO_CUENTA[f.tipo]}</p>
        </div>
      ),
      ordenar: (f) => f.descripcion,
    },
    { id: 'entra', encabezado: 'Entra', numerica: true, celda: (f) => (f.valor > 0 ? <Dinero valor={f.valor} /> : <span className="text-subtle">—</span>), ordenar: (f) => f.valor, ancho: 130 },
    { id: 'sale', encabezado: 'Sale', numerica: true, celda: (f) => (f.valor < 0 ? <Dinero valor={-f.valor} /> : <span className="text-subtle">—</span>), ancho: 130 },
    { id: 'saldo', encabezado: 'Saldo', numerica: true, celda: (f) => <Dinero valor={f.saldo} className="font-semibold" />, ordenar: (f) => f.saldo, ancho: 140 },
    {
      id: 'conciliado',
      encabezado: 'Conciliado',
      alinear: 'centro',
      celda: (f) =>
        f.conciliado ? (
          <span className="inline-flex items-center gap-1 t-small text-ink">
            <Check size={14} aria-hidden /> Sí
          </span>
        ) : (
          <span className="t-small text-muted">Pendiente</span>
        ),
      ancho: 120,
    },
  ];

  return (
    <>
      <EncabezadoPagos
        eyebrow="Cuenta"
        titulo={cuenta.cuenta.nombre}
        insignia={<Badge tono="outline">{TIPOS_CUENTA[cuenta.cuenta.tipo]}</Badge>}
        subtitulo={[cuenta.cuenta.entidad, cuenta.cuenta.numeroEnmascarado].filter(Boolean).join(' · ') || undefined}
        migaActual={cuenta.cuenta.nombre}
        migasExtra={[{ texto: 'Caja y bancos', a: rutas.cuentas() }]}
        acciones={
          <>
            <Button variante="secondary" icono={ReceiptText} onClick={() => setMovimiento(true)}>
              Registrar movimiento
            </Button>
            <Button icono={ArrowLeftRight} onClick={() => setTransferir(true)}>
              Transferir
            </Button>
          </>
        }
      />
      <FranjaResumen
        className="mt-8"
        cifras={[
          { etiqueta: 'Saldo hoy', valor: <Dinero valor={cuenta.saldo} data-testid="cuenta-saldo" /> },
          { etiqueta: 'Entró en el período', valor: <Dinero valor={entra} /> },
          { etiqueta: 'Salió en el período', valor: <Dinero valor={sale} /> },
          { etiqueta: 'Por conciliar', valor: <span className="num">{entero(sinConciliar)}</span> },
        ]}
      />
      <Table
        className="mt-6"
        etiqueta="Libro de la cuenta"
        columnas={columnas}
        filas={filas}
        clave={(f) => f.id}
        sustantivo={['movimiento', 'movimientos']}
        ordenInicial={{ id: 'fecha', dir: 'desc' }}
        resaltada={(f) => f.id === resaltar}
        seleccion={seleccion}
        alSeleccionar={setSeleccion}
        accionesLote={
          <>
            <Button
              variante="ghost"
              tamano="sm"
              icono={Check}
              onClick={() => {
                if (conciliar(refs(elegidas.filter((f) => !f.conciliado)), true)) setSeleccion(new Set());
              }}
              data-testid="libro-conciliar"
            >
              Marcar como conciliado
            </Button>
            <Button
              variante="ghost"
              tamano="sm"
              onClick={() => {
                if (conciliar(refs(elegidas.filter((f) => f.conciliado)), false)) setSeleccion(new Set());
              }}
            >
              Quitar conciliación
            </Button>
          </>
        }
        totales={{ entra: <Dinero valor={entra} />, sale: <Dinero valor={sale} />, saldo: <Dinero valor={libro.saldoFinal} /> }}
        data-testid="tabla-libro"
        vacio={<EmptyState tamano="tabla" icono={BookOpen} titulo="Sin movimientos en este período" texto="Amplía las fechas para ver más del libro de esta cuenta." />}
        barra={
          <Toolbar
            buscar={{ valor: texto, alCambiar: setTexto, placeholder: 'Buscar en la descripción' }}
            filtros={
              <BotonPildora etiqueta="Fechas" valor={textoRango(rango, hoy)} anchoPanel={720}>
                <SelectorRango soloPanel hoy={hoy} valor={rango} alCambiar={(r) => navegar(rutas.cuenta(p.cuentaId, { desde: r.desde, hasta: r.hasta }), { replace: true })} />
              </BotonPildora>
            }
          />
        }
      />
      <DialogoTransferir abierto={transferir} origenInicial={cuenta.cuenta.id} alCerrar={() => setTransferir(false)} />
      <DialogoMovimiento abierto={movimiento} cuentaInicial={cuenta.cuenta.id} alCerrar={() => setMovimiento(false)} />
    </>
  );
}
