import { useState } from 'react';
import type { CuentaDinero, Id, TipoCuenta } from '@/dominio/tipos';
import { rutas } from '@/app/rutas';
import { useAcciones, useDinero, useHoy, useSel } from '@/estado';
import { selLocalesQueVenden, selSaldosCuentas } from '@/selectores';
import { avisar, Button, Dialog, Input, InputNumero, Segmentado, Select, SelectorFecha } from '@/ui';
import { TIPOS_CUENTA } from '../textos';

/** Diálogos de Caja y bancos: transferir entre cuentas, registrar un movimiento y crear o editar una cuenta. */

// ---------------------------------------------------------------------------------------------------------
// Transferir
// ---------------------------------------------------------------------------------------------------------
export function DialogoTransferir({ abierto, origenInicial, alCerrar }: { abierto: boolean; origenInicial?: Id | null; alCerrar: () => void }) {
  return abierto ? <CuerpoTransferir key={origenInicial ?? 'x'} origenInicial={origenInicial ?? null} alCerrar={alCerrar} /> : null;
}

function CuerpoTransferir({ origenInicial, alCerrar }: { origenInicial: Id | null; alCerrar: () => void }) {
  const acciones = useAcciones();
  const hoy = useHoy();
  const dinero = useDinero();
  const cuentas = useSel(selSaldosCuentas).cuentas.filter((c) => c.cuenta.tipo !== 'puente');
  const [origenId, setOrigenId] = useState<Id>(origenInicial ?? cuentas.find((c) => c.cuenta.tipo === 'banco')?.cuenta.id ?? '');
  const [destinoId, setDestinoId] = useState<Id>(cuentas.find((c) => c.cuenta.id !== origenId && c.cuenta.tipo === 'billetera')?.cuenta.id ?? cuentas.find((c) => c.cuenta.id !== origenId)?.cuenta.id ?? '');
  const [valor, setValor] = useState<number | null>(null);
  const [fecha, setFecha] = useState<string | null>(hoy);
  const [descripcion, setDescripcion] = useState('Transferencia entre cuentas');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const opciones = cuentas.map((c) => ({ valor: c.cuenta.id, etiqueta: `${c.cuenta.nombre} · ${dinero.corta(c.saldo)}` }));

  const enviar = () => {
    const e: Record<string, string> = {};
    if (!valor || valor <= 0) e.valor = 'El valor debe ser mayor que cero.';
    if (origenId === destinoId) e.destinoId = 'El origen y el destino deben ser distintos.';
    if (!fecha) e.fecha = 'Elige la fecha.';
    if (!descripcion.trim()) e.descripcion = 'Escribe una descripción.';
    setErrores(e);
    if (Object.keys(e).length || !valor || !fecha) return;
    const r = acciones.transferirEntreCuentas({ origenId, destinoId, valor, fecha, descripcion: descripcion.trim() });
    if (!r.ok) {
      setErrores({ [r.error.campo === 'origenId' ? 'origenId' : (r.error.campo ?? 'general')]: r.error.mensaje });
      return;
    }
    const destino = cuentas.find((c) => c.cuenta.id === destinoId)?.cuenta;
    avisar({ tipo: 'exito', texto: `Transferiste ${dinero(valor)}`, detalle: `A ${destino?.nombre ?? 'la otra cuenta'}.`, accion: { texto: 'Ver el libro', a: rutas.cuenta(destinoId) } });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Caja y bancos"
      titulo="Transferir entre cuentas"
      descripcion="La plata sale de una cuenta y entra en la otra el mismo día."
      ancho="md"
      confirmarAlCerrar
      data-testid="dialogo-transferir"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={enviar} data-testid="transferir-confirmar">
            Transferir
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Select etiqueta="Sale de" valor={origenId} alCambiar={setOrigenId} enModal opciones={opciones} error={errores.origenId} />
        <Select etiqueta="Entra en" valor={destinoId} alCambiar={setDestinoId} enModal opciones={opciones} error={errores.destinoId} />
        <InputNumero etiqueta="Valor" prefijo="$" valor={valor} alCambiar={setValor} error={errores.valor} data-testid="transferir-valor" />
        <SelectorFecha etiqueta="Fecha" hoy={hoy} hasta={hoy} valor={fecha} alCambiar={setFecha} error={errores.fecha} enModal />
        <Input className="col-span-2" etiqueta="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} error={errores.descripcion} />
      </div>
      {errores.general && <p className="mt-4 t-small text-danger">{errores.general}</p>}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Movimiento
// ---------------------------------------------------------------------------------------------------------
type TipoMov = 'aporte_socio' | 'retiro_socio' | 'otro_ingreso' | 'otro_egreso' | 'ajuste';
const TIPOS_MOV: { valor: TipoMov; etiqueta: string }[] = [
  { valor: 'aporte_socio', etiqueta: 'Aporte del dueño (entra)' },
  { valor: 'retiro_socio', etiqueta: 'Retiro del dueño (sale)' },
  { valor: 'otro_ingreso', etiqueta: 'Otro ingreso (entra)' },
  { valor: 'otro_egreso', etiqueta: 'Otro egreso (sale)' },
  { valor: 'ajuste', etiqueta: 'Ajuste de saldo' },
];

export function DialogoMovimiento({ abierto, cuentaInicial, alCerrar }: { abierto: boolean; cuentaInicial?: Id | null; alCerrar: () => void }) {
  return abierto ? <CuerpoMovimiento key={cuentaInicial ?? 'x'} cuentaInicial={cuentaInicial ?? null} alCerrar={alCerrar} /> : null;
}

function CuerpoMovimiento({ cuentaInicial, alCerrar }: { cuentaInicial: Id | null; alCerrar: () => void }) {
  const acciones = useAcciones();
  const hoy = useHoy();
  const dinero = useDinero();
  const cuentas = useSel(selSaldosCuentas).cuentas.filter((c) => c.cuenta.tipo !== 'puente');
  const [cuentaId, setCuentaId] = useState<Id>(cuentaInicial ?? cuentas.find((c) => c.cuenta.tipo === 'banco')?.cuenta.id ?? '');
  const [tipo, setTipo] = useState<TipoMov>('otro_ingreso');
  const [sentido, setSentido] = useState<'suma' | 'resta'>('suma');
  const [valor, setValor] = useState<number | null>(null);
  const [fecha, setFecha] = useState<string | null>(hoy);
  const [descripcion, setDescripcion] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});

  const enviar = () => {
    const e: Record<string, string> = {};
    if (!valor || valor <= 0) e.valor = 'El valor debe ser mayor que cero.';
    if (!fecha) e.fecha = 'Elige la fecha.';
    if (!descripcion.trim()) e.descripcion = 'Escribe una descripción.';
    setErrores(e);
    if (Object.keys(e).length || !valor || !fecha) return;
    const r = acciones.registrarMovimientoCuenta({ cuentaId, tipo, valor: tipo === 'ajuste' && sentido === 'resta' ? -valor : valor, fecha, descripcion: descripcion.trim() });
    if (!r.ok) {
      setErrores({ [r.error.campo ?? 'general']: r.error.mensaje });
      return;
    }
    avisar({ tipo: 'exito', texto: 'Movimiento registrado', detalle: `${TIPOS_MOV.find((t) => t.valor === tipo)?.etiqueta ?? ''} · ${dinero(valor)}`, accion: { texto: 'Ver el libro', a: rutas.cuenta(cuentaId) } });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Caja y bancos"
      titulo="Registrar un movimiento"
      descripcion="Para lo que no es una venta ni un pago a proveedor: aportes, retiros, otros ingresos o un ajuste."
      ancho="md"
      confirmarAlCerrar
      data-testid="dialogo-movimiento"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={enviar} data-testid="movimiento-confirmar">
            Registrar movimiento
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Select etiqueta="Cuenta" valor={cuentaId} alCambiar={setCuentaId} enModal opciones={cuentas.map((c) => ({ valor: c.cuenta.id, etiqueta: `${c.cuenta.nombre} · ${dinero.corta(c.saldo)}` }))} />
        <Select etiqueta="Tipo" valor={tipo} alCambiar={(v) => setTipo(v as TipoMov)} enModal opciones={TIPOS_MOV} />
        {tipo === 'ajuste' && (
          <div className="col-span-2">
            <p className="mb-1.5 t-label text-ink">El ajuste</p>
            <Segmentado
              etiqueta="Sentido del ajuste"
              valor={sentido}
              alCambiar={setSentido}
              opciones={[
                { valor: 'suma', etiqueta: 'Suma al saldo' },
                { valor: 'resta', etiqueta: 'Resta del saldo' },
              ]}
            />
          </div>
        )}
        <InputNumero etiqueta="Valor" prefijo="$" valor={valor} alCambiar={setValor} error={errores.valor} data-testid="movimiento-valor" />
        <SelectorFecha etiqueta="Fecha" hoy={hoy} hasta={hoy} valor={fecha} alCambiar={setFecha} error={errores.fecha} enModal />
        <Input className="col-span-2" etiqueta="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} error={errores.descripcion} placeholder="Ej. Aporte para la importación de diciembre" />
      </div>
      {errores.general && <p className="mt-4 t-small text-danger">{errores.general}</p>}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Crear y editar una cuenta
// ---------------------------------------------------------------------------------------------------------
export function DialogoCuenta({ abierto, editar, alCerrar }: { abierto: boolean; editar: CuentaDinero | null; alCerrar: () => void }) {
  return abierto ? <CuerpoCuenta key={editar?.id ?? 'nueva'} editar={editar} alCerrar={alCerrar} /> : null;
}

const TIPOS_CREABLES: TipoCuenta[] = ['caja', 'banco', 'billetera'];

function CuerpoCuenta({ editar, alCerrar }: { editar: CuentaDinero | null; alCerrar: () => void }) {
  const acciones = useAcciones();
  const hoy = useHoy();
  const locales = useSel(selLocalesQueVenden);
  const existentes = useSel(selSaldosCuentas).cuentas;
  const [nombre, setNombre] = useState(editar?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoCuenta>(editar?.tipo ?? 'banco');
  const [localId, setLocalId] = useState<string>(editar?.localId ?? 'ninguno');
  const [entidad, setEntidad] = useState(editar?.entidad ?? '');
  const [numero, setNumero] = useState(editar?.numeroEnmascarado ?? '');
  const [saldo, setSaldo] = useState<number | null>(editar?.saldoInicial ?? 0);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const enviar = () => {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = 'Escribe el nombre de la cuenta.';
    if (saldo === null) e.saldoInicial = 'Escribe el saldo con el que arranca (puede ser 0).';
    setErrores(e);
    if (Object.keys(e).length || saldo === null) return;
    const base = {
      nombre: nombre.trim(),
      tipo,
      localId: localId === 'ninguno' ? null : localId,
      entidad: entidad.trim() || null,
      numeroEnmascarado: numero.trim() || null,
    };
    const r = editar
      ? acciones.editarCuenta({ cuentaId: editar.id, cambios: base })
      : acciones.crearCuenta({ datos: { ...base, saldoInicial: saldo, fechaSaldoInicial: hoy, orden: existentes.reduce((m, c) => Math.max(m, c.cuenta.orden), 0) + 1 } });
    if (!r.ok) {
      setErrores({ [r.error.campo ?? 'general']: r.error.mensaje });
      return;
    }
    avisar({ tipo: 'exito', texto: editar ? `Guardaste ${nombre.trim()}` : `Creaste la cuenta ${nombre.trim()}` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Caja y bancos"
      titulo={editar ? 'Editar cuenta' : 'Nueva cuenta'}
      ancho="md"
      confirmarAlCerrar
      data-testid="dialogo-cuenta-dinero"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={enviar} data-testid="cuenta-dinero-guardar">
            {editar ? 'Guardar cambios' : 'Crear cuenta'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Input className="col-span-2" etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} error={errores.nombre} placeholder="Ej. Cuenta de ahorros" data-testid="cuenta-dinero-nombre" />
        <Select
          etiqueta="Tipo"
          valor={tipo}
          alCambiar={(v) => setTipo(v as TipoCuenta)}
          enModal
          deshabilitado={!!editar}
          opciones={(editar && editar.tipo === 'puente' ? [...TIPOS_CREABLES, 'puente' as const] : TIPOS_CREABLES).map((t) => ({ valor: t, etiqueta: TIPOS_CUENTA[t] }))}
        />
        <Select etiqueta="Local" valor={localId} alCambiar={setLocalId} enModal opciones={[{ valor: 'ninguno', etiqueta: 'Del negocio en general' }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]} />
        <Input etiqueta="Entidad" opcional value={entidad} onChange={(e) => setEntidad(e.target.value)} placeholder="Ej. Banco Meridiano" />
        <Input etiqueta="Número (últimos dígitos)" opcional value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="•••• 2093" />
        {!editar && <InputNumero etiqueta="Saldo con el que arranca" prefijo="$" valor={saldo} alCambiar={setSaldo} error={errores.saldoInicial} />}
      </div>
      {errores.general && <p className="mt-4 t-small text-danger">{errores.general}</p>}
    </Dialog>
  );
}
