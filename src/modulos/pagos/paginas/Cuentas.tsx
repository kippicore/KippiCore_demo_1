import { ArrowLeftRight, BookOpen, Landmark, Pencil, Plus, ReceiptText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import type { CuentaDinero } from '@/dominio/tipos';
import { useSel } from '@/estado';
import { selPendientesConciliar, selSaldosCuentas, type SaldoCuenta } from '@/selectores';
import { entero } from '@/lib/formato';
import { BotonAccionesFila, Badge, Button, Dinero, EmptyState, FranjaResumen, ItemMenu, Menu, Table, Termino, useResaltar, type ColumnaTabla } from '@/ui';
import { pendientesPorCuenta } from '../calculos';
import { DialogoCuenta, DialogoMovimiento, DialogoTransferir } from '../componentes/DialogosCuentas';
import { EncabezadoPagos } from '../componentes/EncabezadoPagos';
import { useNombresLocales } from '../hooks';
import { TIPOS_CUENTA, TXT } from '../textos';

/** Caja y bancos: saldo de cada cuenta, con su libro, transferencias y movimientos. */
export default function Cuentas() {
  const navegar = useNavigate();
  const resaltar = useResaltar();
  const nombres = useNombresLocales();
  const saldos = useSel(selSaldosCuentas);
  const pendientes = useSel(selPendientesConciliar);
  const [transferir, setTransferir] = useState<{ abierto: boolean; origen: string | null }>({ abierto: false, origen: null });
  const [movimiento, setMovimiento] = useState<{ abierto: boolean; cuenta: string | null }>({ abierto: false, cuenta: null });
  const [formulario, setFormulario] = useState<{ abierto: boolean; editar: CuentaDinero | null }>({ abierto: false, editar: null });

  const porCuenta = useMemo(() => pendientesPorCuenta(pendientes), [pendientes]);
  const suma = (tipos: string[]) => saldos.cuentas.filter((c) => tipos.includes(c.cuenta.tipo)).reduce((a, c) => a + c.saldo, 0);

  const columnas: ColumnaTabla<SaldoCuenta>[] = [
    {
      id: 'cuenta',
      encabezado: 'Cuenta',
      celda: (s) => (
        <div className="min-w-0 py-1">
          <p className="truncate t-body font-semibold text-ink">{s.cuenta.nombre}</p>
          <p className="truncate t-small text-muted">{[s.cuenta.entidad, s.cuenta.numeroEnmascarado].filter(Boolean).join(' · ') || TIPOS_CUENTA[s.cuenta.tipo]}</p>
        </div>
      ),
      ordenar: (s) => s.cuenta.orden,
    },
    { id: 'tipo', encabezado: 'Tipo', celda: (s) => <span className="t-small text-ink-2">{TIPOS_CUENTA[s.cuenta.tipo]}</span>, ancho: 170 },
    { id: 'local', encabezado: 'Local', celda: (s) => <span className="t-small text-ink-2">{s.cuenta.localId ? (nombres[s.cuenta.localId] ?? s.cuenta.localId) : 'Negocio en general'}</span>, ancho: 160 },
    { id: 'saldo', encabezado: 'Saldo', numerica: true, celda: (s) => <Dinero valor={s.saldo} className="font-semibold" />, ordenar: (s) => s.saldo, ancho: 150 },
    {
      id: 'pendientes',
      encabezado: 'Por conciliar',
      numerica: true,
      celda: (s) => {
        const n = porCuenta.get(s.cuenta.id)?.n ?? 0;
        return n > 0 ? (
          <Badge tono="neutral" tamano="sm">
            {entero(n)}
          </Badge>
        ) : (
          <span className="t-small text-muted">Al día</span>
        );
      },
      ordenar: (s) => porCuenta.get(s.cuenta.id)?.n ?? 0,
      ancho: 130,
    },
  ];

  return (
    <>
      <EncabezadoPagos
        titulo={<Termino id="cajaYBancos" />}
        subtitulo={TXT.cuentas.subtitulo}
        migaActual="Caja y bancos"
        acciones={
          <>
            <Button variante="secondary" icono={ArrowLeftRight} onClick={() => setTransferir({ abierto: true, origen: null })} data-testid="abrir-transferir">
              Transferir
            </Button>
            <Button variante="secondary" icono={ReceiptText} onClick={() => setMovimiento({ abierto: true, cuenta: null })} data-testid="abrir-movimiento">
              Registrar movimiento
            </Button>
            <Button icono={Plus} onClick={() => setFormulario({ abierto: true, editar: null })} data-testid="nueva-cuenta">
              Nueva cuenta
            </Button>
          </>
        }
      />
      <FranjaResumen
        className="mt-8"
        cifras={[
          { etiqueta: 'Plata disponible', valor: <Dinero valor={saldos.total} data-testid="cuentas-total" /> },
          { etiqueta: 'Cajas de los locales', valor: <Dinero valor={suma(['caja'])} /> },
          { etiqueta: 'Banco y billeteras', valor: <Dinero valor={suma(['banco', 'billetera'])} /> },
          { etiqueta: 'Datáfono por abonar', valor: <Dinero valor={suma(['puente'])} /> },
        ]}
      />
      <Table
        className="mt-6"
        etiqueta="Cuentas de dinero"
        columnas={columnas}
        filas={saldos.cuentas}
        clave={(s) => s.cuenta.id}
        sustantivo={['cuenta', 'cuentas']}
        porPagina={0}
        alAbrir={(s) => navegar(rutas.cuenta(s.cuenta.id))}
        resaltada={(s) => s.cuenta.id === resaltar}
        ordenInicial={{ id: 'cuenta', dir: 'asc' }}
        totales={{ saldo: <Dinero valor={saldos.total} /> }}
        data-testid="tabla-cuentas"
        accionesFila={(s) => (
          <Menu disparador={<BotonAccionesFila aria-label={`Acciones de ${s.cuenta.nombre}`} />} etiqueta={`Acciones de ${s.cuenta.nombre}`}>
            <ItemMenu icono={BookOpen} onSelect={() => navegar(rutas.cuenta(s.cuenta.id))}>
              Ver el libro
            </ItemMenu>
            <ItemMenu icono={ArrowLeftRight} onSelect={() => setTransferir({ abierto: true, origen: s.cuenta.id })}>
              Transferir desde aquí
            </ItemMenu>
            <ItemMenu icono={ReceiptText} onSelect={() => setMovimiento({ abierto: true, cuenta: s.cuenta.id })}>
              Registrar un movimiento
            </ItemMenu>
            <ItemMenu icono={Pencil} onSelect={() => setFormulario({ abierto: true, editar: s.cuenta })}>
              Editar
            </ItemMenu>
          </Menu>
        )}
        vacio={<EmptyState tamano="tabla" icono={Landmark} titulo="Aún no hay cuentas" texto="Crea la primera caja, cuenta bancaria o billetera para ver cuánta plata tienes." />}
      />
      <p className="mt-4 max-w-[72ch] t-small text-muted">
        <strong className="font-semibold text-ink">Datáfono por abonar</strong> es lo que cobraste con tarjeta y todavía no llega al banco: el abono llega al siguiente día hábil, ya sin comisión ni retenciones. Míralo en la pestaña Datáfono.
      </p>
      <DialogoTransferir abierto={transferir.abierto} origenInicial={transferir.origen} alCerrar={() => setTransferir({ abierto: false, origen: null })} />
      <DialogoMovimiento abierto={movimiento.abierto} cuentaInicial={movimiento.cuenta} alCerrar={() => setMovimiento({ abierto: false, cuenta: null })} />
      <DialogoCuenta abierto={formulario.abierto} editar={formulario.editar} alCerrar={() => setFormulario({ abierto: false, editar: null })} />
    </>
  );
}
