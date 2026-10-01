import { useMemo, useState } from 'react';
import { Button, Dialog, Dinero, GrupoRadio, Input, InputNumero, Select, Switch, avisar } from '@/ui';
import type { CategoriaGasto, GastoRecurrente, MesISO } from '@/dominio/tipos';
import { PREFIJOS } from '@/dominio/motor/ids';
import { baseSinIva } from '@/dominio/reglas/ventas';
import { useAcciones, useHoy, useSel } from '@/estado';
import { mesAnio, porcentaje } from '@/lib/formato';
import { mesesAlrededor, validarBorradorRecurrente, type CampoRecurrente } from '../calculos';
import { selOpcionesGasto, selTarifaIva } from '../selectores';
import { AYUDA_CATEGORIA, CATEGORIAS, ETIQUETA_CATEGORIA, ETIQUETA_GENERAL, GENERAL, SIN_PROVEEDOR } from '../textos';

const SIN_FIN = 'sin-fin';
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export interface PropsFormularioRecurrente {
  recurrente?: GastoRecurrente | null;
  alCerrar: () => void;
}

/** Crear o editar la plantilla de un gasto que se repite cada mes (arriendo, internet, vigilancia). */
export function FormularioRecurrente({ recurrente, alCerrar }: PropsFormularioRecurrente) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const opciones = useSel(selOpcionesGasto);
  const tarifa = useSel(selTarifaIva);
  const edicion = !!recurrente;
  const cuentaInicial = opciones.cuentas.find((c) => c.cuenta.tipo === 'banco') ?? opciones.cuentas[0];

  const [nombre, setNombre] = useState(recurrente?.nombre ?? '');
  const [categoria, setCategoria] = useState<CategoriaGasto | null>(recurrente?.categoria ?? null);
  const [localId, setLocalId] = useState<string>(recurrente ? (recurrente.localId ?? GENERAL) : GENERAL);
  const [valor, setValor] = useState<number | null>(recurrente?.valor ?? null);
  const [iva, setIva] = useState<number | null>(recurrente ? recurrente.iva : null);
  const [dia, setDia] = useState<number | null>(recurrente?.diaDelMes ?? 1);
  const [proveedorId, setProveedorId] = useState<string>(recurrente?.proveedorId ?? SIN_PROVEEDOR);
  const [formaPago, setFormaPago] = useState<'cuenta_por_pagar' | 'debito_automatico'>(recurrente?.formaPago ?? 'cuenta_por_pagar');
  const [diasPlazo, setDiasPlazo] = useState<number | null>(recurrente?.diasPlazo ?? 15);
  const [cuentaId, setCuentaId] = useState<string | null>(recurrente?.cuentaId ?? cuentaInicial?.cuenta.id ?? null);
  const [desde, setDesde] = useState<MesISO | null>(recurrente?.desde ?? hoy.slice(0, 7));
  const [hasta, setHasta] = useState<MesISO | null>(recurrente?.hasta ?? null);
  const [activo, setActivo] = useState(recurrente?.activo ?? true);
  const [errores, setErrores] = useState<Partial<Record<CampoRecurrente, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);

  const borrador = { nombre, categoria, valor, iva, diaDelMes: dia, desde, hasta, formaPago, cuentaId, diasPlazo };
  const validar = (campo?: CampoRecurrente) => {
    const e = validarBorradorRecurrente(borrador);
    setErrores((prev) => (campo ? { ...prev, [campo]: e[campo] } : e));
    return e;
  };
  const alPerderFoco = (campo: CampoRecurrente) => () => {
    setTocado(true);
    validar(campo);
  };
  const cambio = (campo: CampoRecurrente, f: () => void) => {
    f();
    if (tocado || errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const mesesDesde = useMemo(() => mesesAlrededor(hoy, 24, 6).map((m) => ({ valor: m, etiqueta: mayuscula(mesAnio(m)) })), [hoy]);
  const mesesHasta = useMemo(
    () => [{ valor: SIN_FIN, etiqueta: 'Sin fecha final' }, ...mesesAlrededor(hoy, 6, 36).filter((m) => !desde || m >= desde).map((m) => ({ valor: m, etiqueta: mayuscula(mesAnio(m)) }))],
    [hoy, desde],
  );
  const proveedores = [{ valor: SIN_PROVEEDOR, etiqueta: 'Sin proveedor' }, ...opciones.proveedores.map((p) => ({ valor: p.id, etiqueta: p.nombreCorto }))];
  const sugerenciaIva = valor && valor > 0 ? valor - baseSinIva(valor, tarifa) : null;
  const cuentaElegida = opciones.cuentas.find((c) => c.cuenta.id === cuentaId);

  const guardar = () => {
    setTocado(true);
    setErrorGeneral(null);
    const e = validar();
    if (Object.keys(e).length > 0) return;
    const datos = {
      nombre: nombre.trim(),
      categoria: categoria as CategoriaGasto,
      localId: localId === GENERAL ? null : localId,
      valor: valor as number,
      iva: iva ?? 0,
      diaDelMes: dia as number,
      proveedorId: proveedorId === SIN_PROVEEDOR ? null : proveedorId,
      formaPago,
      diasPlazo: formaPago === 'cuenta_por_pagar' ? (diasPlazo ?? 0) : 0,
      cuentaId: formaPago === 'debito_automatico' ? cuentaId : null,
      desde: desde as MesISO,
      hasta,
      activo,
    };
    const r = recurrente
      ? acciones.editarGastoRecurrente({ recurrenteId: recurrente.id, cambios: datos })
      : acciones.crearGastoRecurrente({ recurrenteId: acciones.nuevoId(PREFIJOS.gastoRecurrente), datos });
    if (!r.ok) {
      const campo = r.error.campo as CampoRecurrente | undefined;
      if (campo && ['nombre', 'categoria', 'valor', 'iva', 'diaDelMes', 'desde', 'hasta', 'cuentaId', 'diasPlazo'].includes(campo)) setErrores({ [campo]: r.error.mensaje });
      else setErrorGeneral(r.error.mensaje);
      return;
    }
    avisar({ tipo: 'exito', texto: edicion ? 'Recurrente actualizado' : 'Recurrente creado', detalle: `${datos.nombre} · el día ${datos.diaDelMes} de cada mes` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Gastos recurrentes"
      titulo={edicion ? 'Editar recurrente' : 'Nuevo gasto recurrente'}
      descripcion="Lo defines una vez y se genera cada mes con la fecha y la forma de pago que elijas."
      ancho="md"
      confirmarAlCerrar={tocado}
      data-testid="recurrente-formulario"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="recurrente-guardar">
            {edicion ? 'Guardar cambios' : 'Crear recurrente'}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-2 gap-x-6 gap-y-4"
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
      >
        <Input
          className="col-span-2"
          etiqueta="Nombre"
          placeholder="Ej.: Arriendo Usaquén"
          value={nombre}
          onChange={(ev) => cambio('nombre', () => setNombre(ev.target.value))}
          onBlur={alPerderFoco('nombre')}
          error={errores.nombre}
          autoComplete="off"
          data-testid="recurrente-nombre"
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
          data-testid="recurrente-categoria"
        />
        <Select
          etiqueta="Local"
          valor={localId}
          alCambiar={setLocalId}
          enModal
          opciones={[...opciones.locales.map((l) => ({ valor: l.id, etiqueta: l.nombre })), { valor: GENERAL, etiqueta: ETIQUETA_GENERAL }]}
        />
        <InputNumero
          etiqueta="Valor mensual (con IVA)"
          prefijo="$"
          valor={valor}
          alCambiar={(v) => cambio('valor', () => setValor(v))}
          onBlur={alPerderFoco('valor')}
          error={errores.valor}
          data-testid="recurrente-valor"
        />
        <div>
          <InputNumero etiqueta="IVA incluido" opcional prefijo="$" valor={iva} alCambiar={(v) => cambio('iva', () => setIva(v))} onBlur={alPerderFoco('iva')} error={errores.iva} />
          {sugerenciaIva !== null && sugerenciaIva > 0 && sugerenciaIva !== iva && (
            <button type="button" className="mt-1.5 t-small font-bold text-ink underline underline-offset-4" onClick={() => cambio('iva', () => setIva(sugerenciaIva))}>
              Calcular el IVA del {porcentaje(tarifa, 0)}
            </button>
          )}
        </div>
        <InputNumero
          etiqueta="Día del mes"
          valor={dia}
          alCambiar={(v) => cambio('diaDelMes', () => setDia(v))}
          onBlur={alPerderFoco('diaDelMes')}
          error={errores.diaDelMes}
          ayuda="De 1 a 28, para que exista en todos los meses."
          data-testid="recurrente-dia"
        />
        <Select etiqueta="Proveedor" opcional valor={proveedorId} alCambiar={setProveedorId} enModal opciones={proveedores} />

        <div className="col-span-2 mt-2 border-t border-line-soft pt-4">
          <GrupoRadio
            etiqueta="¿Cómo se paga?"
            tarjetas
            columnas={2}
            valor={formaPago}
            alCambiar={setFormaPago}
            opciones={[
              { valor: 'cuenta_por_pagar', etiqueta: 'Queda por pagar', descripcion: 'Aparece en lo que debo, con un plazo.' },
              { valor: 'debito_automatico', etiqueta: 'Débito automático', descripcion: 'Sale de una cuenta el mismo día.' },
            ]}
          />
          <div className="mt-4 grid grid-cols-2 gap-x-6">
            {formaPago === 'cuenta_por_pagar' ? (
              <InputNumero etiqueta="Días de plazo" sufijo="días" valor={diasPlazo} alCambiar={(v) => cambio('diasPlazo', () => setDiasPlazo(v))} error={errores.diasPlazo} />
            ) : (
              <Select
                etiqueta="Cuenta del débito"
                placeholder="Elige una cuenta"
                valor={cuentaId}
                alCambiar={(v) => cambio('cuentaId', () => setCuentaId(v))}
                enModal
                error={errores.cuentaId}
                opciones={opciones.cuentas.map((c) => ({ valor: c.cuenta.id, etiqueta: c.cuenta.nombre }))}
                ayuda={
                  cuentaElegida ? (
                    <>
                      Saldo hoy: <Dinero valor={cuentaElegida.saldo} />
                    </>
                  ) : undefined
                }
              />
            )}
          </div>
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line-soft pt-4">
          <Select etiqueta="Empieza en" valor={desde} alCambiar={(v) => cambio('desde', () => setDesde(v))} enModal error={errores.desde} opciones={mesesDesde} />
          <Select
            etiqueta="Termina en"
            opcional
            valor={hasta ?? SIN_FIN}
            alCambiar={(v) => cambio('hasta', () => setHasta(v === SIN_FIN ? null : v))}
            enModal
            error={errores.hasta}
            opciones={mesesHasta}
          />
          <Switch etiqueta="Activo" activo={activo} alCambiar={setActivo} valorTexto={activo ? 'Se genera cada mes' : 'En pausa'} />
        </div>
        {errorGeneral && (
          <p role="alert" className="col-span-2 border border-danger bg-danger-soft px-4 py-3 t-body text-ink">
            {errorGeneral}
          </p>
        )}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}
