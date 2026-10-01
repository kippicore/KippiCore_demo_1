import { useState } from 'react';
import type { AbonoCxP, CategoriaCxP, Id, Moneda } from '@/dominio/tipos';
import { copDeCentavos } from '@/dominio/reglas/dinero';
import { rutas } from '@/app/rutas';
import { useAcciones, useDinero, useHoy, useSel } from '@/estado';
import { selLocalesQueVenden, selProveedores, selSaldosCuentas, selTasaVigente, type FilaCxP } from '@/selectores';
import { dineroOrigen } from '@/lib/moneda';
import { avisar, Button, Checkbox, Dialog, Dinero, Input, InputNumero, SelectorFecha, Select, Textarea } from '@/ui';
import { mitadRedondeada } from '../calculos';
import { CATEGORIAS_CXP, MEDIOS_PAGO_CXP, ORDEN_CATEGORIAS_CXP } from '../textos';

/** Diálogos de las cuentas por pagar: pagar (total o parcial), programar y crear o editar. */

const ESCALA = (m: Moneda) => (m === 'COP' ? 1 : 100);

// ---------------------------------------------------------------------------------------------------------
// Pagar
// ---------------------------------------------------------------------------------------------------------
export function DialogoPagar({ fila, alCerrar }: { fila: FilaCxP | null; alCerrar: () => void }) {
  return fila ? <CuerpoPagar key={fila.cxp.id} fila={fila} alCerrar={alCerrar} /> : null;
}

function CuerpoPagar({ fila, alCerrar }: { fila: FilaCxP; alCerrar: () => void }) {
  const acciones = useAcciones();
  const hoy = useHoy();
  const dinero = useDinero();
  const { cxp } = fila;
  const esCop = cxp.moneda === 'COP';
  const saldoUnidades = fila.saldoOrigen / ESCALA(cxp.moneda);
  const cuentas = useSel(selSaldosCuentas).cuentas.filter((c) => c.cuenta.tipo !== 'puente');
  const tasaVigente = useSel(selTasaVigente, { moneda: cxp.moneda, fecha: hoy });
  const [valor, setValor] = useState<number | null>(saldoUnidades);
  const [fecha, setFecha] = useState(hoy);
  const [cuentaId, setCuentaId] = useState<Id>(cuentas.find((c) => c.cuenta.tipo === 'banco')?.cuenta.id ?? cuentas[0]?.cuenta.id ?? '');
  const [medio, setMedio] = useState<AbonoCxP['medio']>(esCop ? 'transferencia' : 'giro_internacional');
  const [tasa, setTasa] = useState<number | null>(esCop ? null : tasaVigente);
  const [soporte, setSoporte] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const centavos = valor === null ? 0 : Math.round(valor * ESCALA(cxp.moneda));
  const equivalenteCop = esCop ? (valor ?? 0) : tasa ? copDeCentavos(centavos, tasa) : 0;
  const restante = fila.saldoOrigen - centavos;

  const enviar = () => {
    const e: Record<string, string> = {};
    if (!valor || valor <= 0) e.valor = 'Escribe cuánto vas a pagar.';
    else if (centavos > fila.saldoOrigen) e.valor = `El saldo es de ${esCop ? dinero(fila.saldoOrigen) : dineroOrigen(fila.saldoOrigen, cxp.moneda as Exclude<Moneda, 'COP'>)}.`;
    if (!cuentaId) e.cuentaId = 'Elige de qué cuenta sale la plata.';
    if (!esCop && (!tasa || tasa <= 0)) e.tasa = 'Escribe la tasa de cambio del pago.';
    setErrores(e);
    if (Object.keys(e).length) return;
    setEnviando(true);
    const r = acciones.pagarCuentaPorPagar({
      cxpId: cxp.id,
      fecha,
      valorCOP: esCop ? valor : null,
      centavos: esCop ? null : centavos,
      tasa: esCop ? null : tasa,
      cuentaId,
      medio,
      soporte: soporte ? { nombreArchivo: `soporte-${cxp.numero}.pdf`, estado: 'adjunto', fecha } : null,
    });
    setEnviando(false);
    if (!r.ok) {
      setErrores({ [r.error.campo ?? 'general']: r.error.mensaje });
      return;
    }
    avisar({
      tipo: 'exito',
      texto: restante > 0 ? `Pago parcial registrado a ${cxp.terceroNombre}` : `Pagaste ${cxp.terceroNombre}`,
      detalle: restante > 0 ? `Quedan ${esCop ? dinero(restante) : dineroOrigen(restante, cxp.moneda as Exclude<Moneda, 'COP'>)} por pagar de ${cxp.numero}.` : `${cxp.numero} quedó pagada.`,
      accion: { texto: 'Ver la cuenta', a: rutas.cuenta(cuentaId) },
    });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow={cxp.numero}
      titulo={`Pagar a ${cxp.terceroNombre}`}
      descripcion={cxp.concepto}
      ancho="md"
      data-testid="dialogo-pagar"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={enviar} cargando={enviando} data-testid="pagar-confirmar">
            {valor && valor > 0 ? `Pagar ${esCop ? dinero(valor) : dineroOrigen(centavos, cxp.moneda as Exclude<Moneda, 'COP'>)}` : 'Pagar'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div className="col-span-2">
          <div className="flex flex-wrap items-end gap-3">
            <InputNumero
              className="min-w-0 flex-1"
              etiqueta={esCop ? 'Valor a pagar' : `Valor a pagar (${cxp.moneda})`}
              prefijo={esCop ? '$' : cxp.moneda === 'USD' ? 'US$' : 'CN¥'}
              valor={valor}
              alCambiar={setValor}
              decimales={esCop ? 0 : 2}
              error={errores.valor ?? errores.valorCOP ?? errores.centavos}
              ayuda={`Saldo: ${esCop ? dinero(fila.saldoOrigen) : `${dineroOrigen(fila.saldoOrigen, cxp.moneda as Exclude<Moneda, 'COP'>)} · ${dinero(fila.saldoCop)}`}`}
              data-testid="pagar-valor"
            />
            <div className="flex gap-2 pb-0.5">
              <Button variante="secondary" tamano="sm" onClick={() => setValor(saldoUnidades)}>
                Todo
              </Button>
              <Button variante="secondary" tamano="sm" onClick={() => setValor(esCop ? mitadRedondeada(saldoUnidades) : Math.round(saldoUnidades / 2))}>
                La mitad
              </Button>
            </div>
          </div>
        </div>
        {!esCop && (
          <>
            <InputNumero etiqueta="Tasa del día (COP por unidad)" prefijo="$" valor={tasa} alCambiar={setTasa} decimales={2} error={errores.tasa} ayuda="La tasa vigente de ejemplo; cámbiala si pagaste a otra." />
            <div className="flex flex-col justify-end pb-1.5">
              <p className="t-small text-muted">Equivale a</p>
              <p className="t-body font-semibold num text-ink">
                <Dinero valor={equivalenteCop} />
              </p>
            </div>
          </>
        )}
        <Select
          etiqueta="Sale de la cuenta"
          valor={cuentaId}
          alCambiar={setCuentaId}
          enModal
          error={errores.cuentaId}
          opciones={cuentas.map((c) => ({ valor: c.cuenta.id, etiqueta: `${c.cuenta.nombre} · ${dinero.corta(c.saldo)}` }))}
        />
        <Select etiqueta="Medio de pago" valor={medio} alCambiar={(v) => setMedio(v as AbonoCxP['medio'])} enModal opciones={Object.entries(MEDIOS_PAGO_CXP).map(([valor, etiqueta]) => ({ valor, etiqueta }))} />
        <SelectorFecha etiqueta="Fecha del pago" hoy={hoy} hasta={hoy} valor={fecha} alCambiar={setFecha} enModal />
        <div className="flex items-end pb-1">
          <Checkbox etiqueta="Adjuntar soporte (simulado)" marcado={soporte} alCambiar={setSoporte} />
        </div>
      </div>
      {errores.general && <p className="mt-4 t-small text-danger">{errores.general}</p>}
      {valor !== null && valor > 0 && restante > 0 && (
        <p className="mt-5 border-l-2 border-accent pl-3 t-small text-ink">
          Es un pago parcial: quedarán {esCop ? dinero(restante) : dineroOrigen(restante, cxp.moneda as Exclude<Moneda, 'COP'>)} por pagar.
        </p>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Programar
// ---------------------------------------------------------------------------------------------------------
export function DialogoProgramar({ fila, alCerrar }: { fila: FilaCxP | null; alCerrar: () => void }) {
  return fila ? <CuerpoProgramar key={fila.cxp.id} fila={fila} alCerrar={alCerrar} /> : null;
}

function CuerpoProgramar({ fila, alCerrar }: { fila: FilaCxP; alCerrar: () => void }) {
  const acciones = useAcciones();
  const hoy = useHoy();
  const { cxp } = fila;
  const [fecha, setFecha] = useState<string | null>(cxp.programadaPara ?? (cxp.fechaVencimiento >= hoy ? cxp.fechaVencimiento : hoy));
  const [error, setError] = useState<string | null>(null);

  const guardar = (f: string | null) => {
    const r = acciones.programarCuentaPorPagar({ cxpId: cxp.id, fecha: f });
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    avisar({ tipo: 'exito', texto: f ? `Programaste el pago a ${cxp.terceroNombre}` : `Quitaste la programación de ${cxp.numero}` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow={cxp.numero}
      titulo="Programar el pago"
      descripcion={`${cxp.terceroNombre} · ${cxp.concepto}`}
      ancho="sm"
      data-testid="dialogo-programar"
      pie={
        <>
          {cxp.programadaPara && (
            <Button variante="ghost" onClick={() => guardar(null)} className="mr-auto">
              Quitar programación
            </Button>
          )}
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={() => (fecha ? guardar(fecha) : setError('Elige la fecha en que vas a pagar.'))} data-testid="programar-confirmar">
            Programar
          </Button>
        </>
      }
    >
      <SelectorFecha etiqueta="Voy a pagar el" hoy={hoy} desde={hoy} valor={fecha} alCambiar={setFecha} error={error ?? undefined} enModal />
      <p className="mt-4 t-small text-muted">Programar no mueve plata: le avisa al flujo de caja en qué fecha vas a pagar.</p>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Crear y editar
// ---------------------------------------------------------------------------------------------------------
export function DialogoCuentaPorPagar({ abierto, editar, alCerrar }: { abierto: boolean; editar: FilaCxP | null; alCerrar: () => void }) {
  return abierto ? <CuerpoCuenta key={editar?.cxp.id ?? 'nueva'} editar={editar} alCerrar={alCerrar} /> : null;
}

function CuerpoCuenta({ editar, alCerrar }: { editar: FilaCxP | null; alCerrar: () => void }) {
  const acciones = useAcciones();
  const hoy = useHoy();
  const locales = useSel(selLocalesQueVenden);
  const proveedores = useSel(selProveedores, { hoy });
  const c = editar?.cxp ?? null;
  const [tercero, setTercero] = useState(c?.terceroNombre ?? '');
  const [concepto, setConcepto] = useState(c?.concepto ?? '');
  const [categoria, setCategoria] = useState<CategoriaCxP>(c?.categoria ?? 'proveedor_local');
  const [localId, setLocalId] = useState<string>(c?.localId ?? 'general');
  const [moneda, setMoneda] = useState<Moneda>(c?.moneda ?? 'COP');
  const [valor, setValor] = useState<number | null>(c ? c.valor / ESCALA(c.moneda) : null);
  const [emision, setEmision] = useState<string | null>(c?.fechaEmision ?? hoy);
  const [vence, setVence] = useState<string | null>(c?.fechaVencimiento ?? null);
  const [proveedorId, setProveedorId] = useState<string>(c?.proveedorId ?? 'ninguno');
  const [nota, setNota] = useState(c?.nota ?? '');
  const [soporte, setSoporte] = useState(c?.soporte?.estado === 'adjunto');
  const [errores, setErrores] = useState<Record<string, string>>({});

  const conAbonos = (c?.abonos.length ?? 0) > 0;

  const elegirProveedor = (id: string) => {
    setProveedorId(id);
    const p = proveedores.find((x) => x.proveedor.id === id)?.proveedor;
    if (!p) return;
    if (!tercero.trim()) setTercero(p.nombreCorto);
    if (!conAbonos) setMoneda(p.moneda);
    if (p.tipo === 'fabrica') setCategoria('proveedor_importacion');
  };

  const enviar = () => {
    const e: Record<string, string> = {};
    if (!tercero.trim()) e.terceroNombre = 'Escribe a quién se le debe.';
    if (!concepto.trim()) e.concepto = 'Escribe el concepto.';
    if (!valor || valor <= 0) e.valor = 'El valor debe ser mayor que cero.';
    if (!emision) e.fechaEmision = 'Elige la fecha de emisión.';
    if (!vence) e.fechaVencimiento = 'Elige cuándo vence.';
    else if (emision && vence < emision) e.fechaVencimiento = 'El vencimiento no puede ser antes de la emisión.';
    setErrores(e);
    if (Object.keys(e).length || !valor || !emision || !vence) return;
    const datos = {
      categoria,
      terceroNombre: tercero.trim(),
      proveedorId: proveedorId === 'ninguno' ? null : proveedorId,
      empleadoId: c?.empleadoId ?? null,
      concepto: concepto.trim(),
      localId: localId === 'general' ? null : localId,
      moneda,
      valor: Math.round(valor * ESCALA(moneda)),
      fechaEmision: emision,
      fechaVencimiento: vence,
      documento: c?.documento ?? null,
      soporte: soporte ? (c?.soporte ?? { nombreArchivo: `soporte-${tercero.trim().toLowerCase().replace(/\s+/g, '-')}.pdf`, estado: 'adjunto' as const, fecha: hoy }) : null,
      nota: nota.trim() || null,
    };
    const r = c ? acciones.editarCuentaPorPagar({ cxpId: c.id, cambios: datos }) : acciones.crearCuentaPorPagar({ datos });
    if (!r.ok) {
      setErrores({ [r.error.campo ?? 'general']: r.error.mensaje });
      return;
    }
    avisar({ tipo: 'exito', texto: c ? `Guardaste ${c.numero}` : `Registraste la cuenta de ${tercero.trim()}` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow={c ? c.numero : 'Lo que debo'}
      titulo={c ? 'Editar cuenta por pagar' : 'Registrar cuenta por pagar'}
      ancho="lg"
      confirmarAlCerrar
      data-testid="dialogo-cuenta"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={enviar} data-testid="cuenta-guardar">
            {c ? 'Guardar cambios' : 'Registrar cuenta'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Select
          etiqueta="Proveedor registrado"
          opcional
          valor={proveedorId}
          alCambiar={elegirProveedor}
          enModal
          opciones={[{ valor: 'ninguno', etiqueta: 'Ninguno (escribir el nombre)' }, ...proveedores.map((p) => ({ valor: p.proveedor.id, etiqueta: p.proveedor.nombreCorto, grupo: p.proveedor.tipo === 'fabrica' ? 'Fábricas' : 'Locales' }))]}
        />
        <Input etiqueta="¿A quién le debes?" value={tercero} onChange={(ev) => setTercero(ev.target.value)} error={errores.terceroNombre} placeholder="Ej. Estudio Contraluz" data-testid="cuenta-tercero" />
        <Input className="col-span-2" etiqueta="Concepto" value={concepto} onChange={(ev) => setConcepto(ev.target.value)} error={errores.concepto} placeholder="Ej. Pauta en redes sociales de octubre" data-testid="cuenta-concepto" />
        <Select
          etiqueta="Categoría"
          valor={categoria}
          alCambiar={(v) => setCategoria(v as CategoriaCxP)}
          enModal
          opciones={ORDEN_CATEGORIAS_CXP.map((k) => ({ valor: k, etiqueta: CATEGORIAS_CXP[k] }))}
        />
        <Select
          etiqueta="Local"
          valor={localId}
          alCambiar={setLocalId}
          enModal
          opciones={[{ valor: 'general', etiqueta: 'General del negocio' }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
        />
        <Select
          etiqueta="Moneda de la deuda"
          valor={moneda}
          alCambiar={(v) => setMoneda(v as Moneda)}
          enModal
          deshabilitado={conAbonos}
          ayuda={conAbonos ? 'No se puede cambiar: ya tiene pagos.' : undefined}
          opciones={[
            { valor: 'COP', etiqueta: 'Pesos colombianos (COP)' },
            { valor: 'USD', etiqueta: 'Dólares (USD)' },
            { valor: 'CNY', etiqueta: 'Yuanes (CNY)' },
          ]}
        />
        <InputNumero
          etiqueta="Valor"
          prefijo={moneda === 'COP' ? '$' : moneda === 'USD' ? 'US$' : 'CN¥'}
          valor={valor}
          alCambiar={setValor}
          decimales={moneda === 'COP' ? 0 : 2}
          error={errores.valor}
          data-testid="cuenta-valor"
        />
        <SelectorFecha etiqueta="Fecha de emisión" hoy={hoy} valor={emision} alCambiar={setEmision} error={errores.fechaEmision} enModal />
        <SelectorFecha etiqueta="Vence el" hoy={hoy} valor={vence} alCambiar={setVence} error={errores.fechaVencimiento} enModal />
        <Textarea className="col-span-2" etiqueta="Nota" opcional value={nota} onChange={(ev) => setNota(ev.target.value)} rows={2} />
        <div className="col-span-2">
          <Checkbox etiqueta="Adjuntar soporte (simulado)" marcado={soporte} alCambiar={setSoporte} />
        </div>
      </div>
      {errores.general && <p className="mt-4 t-small text-danger">{errores.general}</p>}
    </Dialog>
  );
}
