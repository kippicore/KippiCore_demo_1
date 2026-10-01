import { useState } from 'react';
import { Button, Dialog, InputNumero, Select, SelectorFecha, avisar } from '@/ui';
import type { FechaISO, MonedaExtranjera, TasaCambio } from '@/dominio/tipos';
import { MONEDAS } from '@/config/monedas';
import { useAcciones, useHoy } from '@/estado';
import { fecha as fechaTexto } from '@/lib/formato';
import { pesos, validarTasa, type ErroresTasa } from '../calculos';

/** Agregar una tasa de otra fecha o editar una del historial. */
export function DialogoTasa({
  tasa,
  tasas,
  alCerrar,
}: {
  /** null = agregar una tasa nueva. */
  tasa: TasaCambio | null;
  tasas: readonly TasaCambio[];
  alCerrar: () => void;
}) {
  const acciones = useAcciones();
  const hoy = useHoy();
  const [moneda, setMoneda] = useState<MonedaExtranjera>(tasa?.moneda ?? 'USD');
  const [valor, setValor] = useState<number | null>(tasa?.valor ?? null);
  const [fecha, setFecha] = useState<FechaISO | null>(tasa?.fecha ?? hoy);
  const [errores, setErrores] = useState<ErroresTasa>({});
  const [general, setGeneral] = useState<string | null>(null);
  const sucio = valor !== (tasa?.valor ?? null) || fecha !== (tasa?.fecha ?? hoy) || moneda !== (tasa?.moneda ?? 'USD');

  const guardar = () => {
    setGeneral(null);
    const e = validarTasa(valor, fecha, hoy);
    setErrores(e);
    if (Object.keys(e).length > 0 || valor === null || !fecha) return;
    const r = tasa ? acciones.editarTasa({ tasaId: tasa.id, valor, fecha }) : acciones.registrarTasa({ moneda, fecha, valor });
    if (!r.ok) {
      if (r.error.campo === 'valor' || r.error.campo === 'fecha') setErrores({ [r.error.campo]: r.error.mensaje });
      else setGeneral(r.error.mensaje);
      return;
    }
    const reemplaza = !tasa && tasas.some((t) => t.moneda === moneda && t.fecha === fecha);
    avisar({
      tipo: 'exito',
      texto: tasa ? 'Tasa actualizada' : reemplaza ? 'Tasa reemplazada' : 'Tasa agregada',
      detalle: `${MONEDAS[moneda].simbolo} 1 = ${pesos(valor)} · ${fechaTexto(fecha)}`,
    });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Monedas y tasas"
      titulo={tasa ? 'Editar tasa' : 'Agregar una tasa'}
      descripcion={tasa ? 'Cambia el valor o la fecha de esta tasa del historial.' : 'Registra la tasa de un día. Si ya había una de ese día, se reemplaza.'}
      ancho="sm"
      confirmarAlCerrar={sucio}
      data-testid="tasa-dialogo"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="tasa-dialogo-guardar">
            {tasa ? 'Guardar cambios' : 'Agregar tasa'}
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="grid grid-cols-1 gap-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
      >
        <Select
          etiqueta="Moneda"
          valor={moneda}
          alCambiar={(v) => setMoneda(v as MonedaExtranjera)}
          deshabilitado={!!tasa}
          enModal
          opciones={[
            { valor: 'USD', etiqueta: 'Dólar estadounidense (US$)' },
            { valor: 'CNY', etiqueta: 'Yuan chino (CN¥)' },
          ]}
        />
        <InputNumero
          etiqueta={`Pesos por 1 ${MONEDAS[moneda].simbolo}`}
          prefijo="$"
          decimales={2}
          valor={valor}
          alCambiar={setValor}
          error={errores.valor}
          data-testid="tasa-dialogo-valor"
        />
        <SelectorFecha etiqueta="Fecha de la tasa" hoy={hoy} hasta={hoy} valor={fecha} alCambiar={setFecha} error={errores.fecha} enModal />
        {general && <p className="t-small text-danger">{general}</p>}
      </form>
    </Dialog>
  );
}
