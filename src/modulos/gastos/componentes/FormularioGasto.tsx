import { useMemo, useState } from 'react';
import { Button, Dialog, Dinero, GrupoRadio, Input, InputNumero, Select, SelectorFecha, avisar } from '@/ui';
import type { CategoriaGasto, FechaISO, Gasto, Id } from '@/dominio/tipos';
import { PREFIJOS } from '@/dominio/motor/ids';
import { baseSinIva } from '@/dominio/reglas/ventas';
import { useAcciones, useHoy, useSel } from '@/estado';
import { porcentaje } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import { validarBorradorGasto, type CampoGasto } from '../calculos';
import { selOpcionesGasto, selTarifaIva } from '../selectores';
import { AYUDA_CATEGORIA, CATEGORIAS, ETIQUETA_CATEGORIA, ETIQUETA_GENERAL, GENERAL, MEDIOS_PAGO, SIN_PROVEEDOR } from '../textos';

export interface PropsFormularioGasto {
  /** Gasto a editar; sin él, se registra uno nuevo. */
  gasto?: Gasto | null;
  /** Local con el que arranca el formulario nuevo ('general' si no hay uno elegido). */
  localInicial?: string;
  alCerrar: () => void;
  /** Se llama con el id y el mes del gasto guardado (la pantalla lo resalta). */
  alGuardar: (gastoId: Id, mes: string) => void;
}

const medioDeCuenta = (tipo: string, nombre: string): string =>
  tipo === 'caja' ? 'efectivo' : tipo === 'banco' ? 'transferencia' : /daviplata/i.test(nombre) ? 'daviplata' : /nequi/i.test(nombre) ? 'nequi' : 'transferencia';

/** Registrar o editar un gasto (PRD 7.8): fecha, local o general, categoría, valor, IVA, proveedor, medio de pago y soporte. */
export function FormularioGasto({ gasto, localInicial = GENERAL, alCerrar, alGuardar }: PropsFormularioGasto) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const opciones = useSel(selOpcionesGasto);
  const tarifa = useSel(selTarifaIva);
  const edicion = !!gasto;

  const cuentaInicial = opciones.cuentas.find((c) => c.cuenta.tipo === 'banco') ?? opciones.cuentas[0];
  const [fecha, setFecha] = useState<FechaISO | null>(gasto?.fecha ?? hoy);
  const [concepto, setConcepto] = useState(gasto?.concepto ?? '');
  const [categoria, setCategoria] = useState<CategoriaGasto | null>(gasto?.categoria ?? null);
  const [localId, setLocalId] = useState<string>(gasto ? (gasto.localId ?? GENERAL) : localInicial);
  const [valor, setValor] = useState<number | null>(gasto?.valor ?? null);
  const [iva, setIva] = useState<number | null>(gasto ? gasto.iva : null);
  const [proveedorId, setProveedorId] = useState<string>(gasto?.proveedorId ?? SIN_PROVEEDOR);
  const [soporte, setSoporte] = useState(gasto?.soporte?.nombreArchivo ?? '');
  const [pago, setPago] = useState<'ya' | 'debo'>('ya');
  const [cuentaId, setCuentaId] = useState<string | null>(cuentaInicial?.cuenta.id ?? null);
  const [medio, setMedio] = useState<string>(cuentaInicial ? medioDeCuenta(cuentaInicial.cuenta.tipo, cuentaInicial.cuenta.nombre) : 'transferencia');
  const [vence, setVence] = useState<FechaISO | null>(null);
  const [errores, setErrores] = useState<Partial<Record<CampoGasto | 'localId' | 'proveedorId', string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [tocado, setTocado] = useState(false);

  const borrador = { fecha, concepto, categoria, valor, iva, pago: edicion ? null : pago, cuentaId, vence };
  const validar = (campo?: CampoGasto) => {
    const e = validarBorradorGasto(borrador, edicion);
    setErrores((prev) => (campo ? { ...prev, [campo]: e[campo] } : e));
    return e;
  };
  const alPerderFoco = (campo: CampoGasto) => () => {
    setTocado(true);
    validar(campo);
  };
  const cambio = (campo: CampoGasto, f: () => void) => {
    f();
    if (tocado || errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const cuentaElegida = opciones.cuentas.find((c) => c.cuenta.id === cuentaId);
  const sugerenciaIva = valor && valor > 0 ? valor - baseSinIva(valor, tarifa) : null;
  const proveedores = useMemo(
    () => [{ valor: SIN_PROVEEDOR, etiqueta: 'Sin proveedor' }, ...opciones.proveedores.map((p) => ({ valor: p.id, etiqueta: p.nombreCorto }))],
    [opciones.proveedores],
  );

  const guardar = () => {
    setTocado(true);
    setErrorGeneral(null);
    const e = validar();
    if (Object.keys(e).length > 0) return;
    setGuardando(true);
    const datos = {
      fecha: fecha as FechaISO,
      localId: localId === GENERAL ? null : localId,
      categoria: categoria as CategoriaGasto,
      concepto: concepto.trim(),
      valor: valor as number,
      iva: iva ?? 0,
      proveedorId: proveedorId === SIN_PROVEEDOR ? null : proveedorId,
      documento: gasto?.documento ?? null,
      soporte: soporte.trim() ? { nombreArchivo: soporte.trim(), estado: 'adjunto' as const, fecha: gasto?.soporte?.fecha ?? hoy } : null,
    };
    const gastoId = gasto?.id ?? acciones.nuevoId(PREFIJOS.gasto);
    const r = edicion
      ? acciones.editarGasto({ gastoId, cambios: datos })
      : acciones.registrarGasto({
          gastoId,
          datos,
          pago: pago === 'ya' ? { tipo: 'inmediato', cuentaId: cuentaId as string, medio } : { tipo: 'por_pagar', vence: vence as FechaISO },
        });
    setGuardando(false);
    if (!r.ok) {
      const campo = r.error.campo as CampoGasto | 'localId' | 'proveedorId' | undefined;
      if (campo && ['fecha', 'concepto', 'categoria', 'valor', 'iva', 'cuentaId', 'vence', 'localId', 'proveedorId'].includes(campo)) setErrores({ [campo]: r.error.mensaje });
      else setErrorGeneral(r.error.mensaje);
      return;
    }
    avisar({
      tipo: 'exito',
      texto: edicion ? 'Gasto actualizado' : 'Gasto registrado',
      detalle: `${datos.concepto}${edicion ? '' : pago === 'ya' ? ' · pagado' : ' · queda por pagar'}`,
      accion: { texto: 'Ver gasto', a: rutas.gastos({ mes: datos.fecha.slice(0, 7), resaltar: gastoId }) },
    });
    alGuardar(gastoId, datos.fecha.slice(0, 7));
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Costos y gastos"
      titulo={edicion ? 'Editar gasto' : 'Registrar gasto'}
      descripcion={edicion ? 'Corrige los datos del gasto. Las cifras del mes se recalculan al guardar.' : 'Anota lo que pagaste o lo que debes. Entra a los resultados del mes en que ocurrió.'}
      ancho="md"
      confirmarAlCerrar={tocado}
      data-testid="gastos-formulario"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} cargando={guardando} data-testid="gastos-guardar">
            {edicion ? 'Guardar cambios' : 'Registrar gasto'}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-2 gap-x-6 gap-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
        noValidate
      >
        <SelectorFecha etiqueta="Fecha del gasto" hoy={hoy} valor={fecha} alCambiar={(f) => cambio('fecha', () => setFecha(f))} error={errores.fecha} enModal />
        <Select
          etiqueta="Local"
          valor={localId}
          alCambiar={setLocalId}
          enModal
          error={errores.localId}
          opciones={[...opciones.locales.map((l) => ({ valor: l.id, etiqueta: l.nombre })), { valor: GENERAL, etiqueta: ETIQUETA_GENERAL }]}
          ayuda={localId === GENERAL ? 'Un gasto general no es de un local; se puede repartir en el estado de resultados.' : undefined}
        />
        <Input
          className="col-span-2"
          etiqueta="Concepto"
          placeholder="Ej.: Arriendo Usaquén, pauta en Instagram"
          value={concepto}
          onChange={(ev) => cambio('concepto', () => setConcepto(ev.target.value))}
          onBlur={alPerderFoco('concepto')}
          error={errores.concepto}
          autoComplete="off"
          data-testid="gastos-concepto"
        />
        <Select
          etiqueta="Categoría"
          placeholder="Elige una categoría"
          valor={categoria}
          alCambiar={(v) => cambio('categoria', () => setCategoria(v as CategoriaGasto))}
          enModal
          error={errores.categoria}
          ayuda={categoria ? AYUDA_CATEGORIA[categoria] : undefined}
          opciones={CATEGORIAS.map((c) => ({ valor: c, etiqueta: ETIQUETA_CATEGORIA[c] }))}
          data-testid="gastos-categoria"
        />
        <Select etiqueta="Proveedor" opcional valor={proveedorId} alCambiar={setProveedorId} enModal error={errores.proveedorId} opciones={proveedores} />
        <InputNumero
          etiqueta="Valor total (con IVA)"
          prefijo="$"
          valor={valor}
          alCambiar={(v) => cambio('valor', () => setValor(v))}
          onBlur={alPerderFoco('valor')}
          error={errores.valor}
          data-testid="gastos-valor"
        />
        <div>
          <InputNumero etiqueta="IVA incluido" opcional prefijo="$" valor={iva} alCambiar={(v) => cambio('iva', () => setIva(v))} onBlur={alPerderFoco('iva')} error={errores.iva} />
          {sugerenciaIva !== null && sugerenciaIva > 0 && sugerenciaIva !== iva && (
            <button type="button" className="mt-1.5 t-small font-bold text-ink underline underline-offset-4" onClick={() => cambio('iva', () => setIva(sugerenciaIva))}>
              Calcular el IVA del {porcentaje(tarifa, 0)}
            </button>
          )}
        </div>

        {!edicion && (
          <div className="col-span-2 mt-2 border-t border-line-soft pt-4">
            <GrupoRadio
              etiqueta="¿Ya lo pagaste?"
              tarjetas
              columnas={2}
              valor={pago}
              alCambiar={setPago}
              opciones={[
                { valor: 'ya', etiqueta: 'Ya lo pagué', descripcion: 'Sale de una cuenta hoy mismo.' },
                { valor: 'debo', etiqueta: 'Lo debo', descripcion: 'Queda en lo que debo, con fecha límite.' },
              ]}
            />
            {pago === 'ya' ? (
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
                <Select
                  etiqueta="¿De dónde sale la plata?"
                  placeholder="Elige una cuenta"
                  valor={cuentaId}
                  enModal
                  error={errores.cuentaId}
                  alCambiar={(v) =>
                    cambio('cuentaId', () => {
                      setCuentaId(v);
                      const c = opciones.cuentas.find((x) => x.cuenta.id === v);
                      if (c) setMedio(medioDeCuenta(c.cuenta.tipo, c.cuenta.nombre));
                    })
                  }
                  opciones={opciones.cuentas.map((c) => ({ valor: c.cuenta.id, etiqueta: c.cuenta.nombre }))}
                  ayuda={
                    cuentaElegida ? (
                      <>
                        Saldo hoy: <Dinero valor={cuentaElegida.saldo} />
                      </>
                    ) : undefined
                  }
                />
                <Select etiqueta="Medio de pago" valor={medio} alCambiar={setMedio} enModal opciones={MEDIOS_PAGO.map((m) => ({ valor: m.valor, etiqueta: m.etiqueta }))} />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-x-6">
                <SelectorFecha etiqueta="Tienes hasta" hoy={hoy} valor={vence} alCambiar={(f) => cambio('vence', () => setVence(f))} desde={fecha ?? undefined} error={errores.vence} enModal />
              </div>
            )}
          </div>
        )}
        {edicion && (
          <p className="col-span-2 t-small text-muted">
            {gasto?.estadoPago === 'pagado' ? 'Este gasto ya está pagado. Si cambias el valor, el movimiento de la cuenta se ajusta.' : 'Este gasto está por pagar. Si ya tiene abonos, su valor no se puede cambiar.'}
          </p>
        )}
        <Input
          className="col-span-2"
          etiqueta="Soporte"
          opcional
          placeholder="Número de factura o nombre del documento"
          ayuda="En la demostración no se sube ningún archivo: queda anotado el nombre del soporte."
          value={soporte}
          onChange={(ev) => setSoporte(ev.target.value)}
          autoComplete="off"
        />
        {errorGeneral && (
          <p role="alert" className="col-span-2 border border-danger bg-danger-soft px-4 py-3 t-body text-ink" data-testid="gastos-error-formulario">
            {errorGeneral}
          </p>
        )}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}
