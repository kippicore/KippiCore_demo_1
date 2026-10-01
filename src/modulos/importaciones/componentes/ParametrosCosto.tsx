import { useMemo, useState } from 'react';
import type { CostosImportacion, Importacion, MontoMoneda } from '@/dominio/tipos';
import { calcularCostoAterrizado, unidadesLinea } from '@/dominio/reglas/costeo';
import { redondear } from '@/dominio/reglas/dinero';
import { useAcciones, useDinero, useHoy, useSel } from '@/estado';
import { selTasaVigente } from '@/selectores';
import { avisar, Button, Dialog, InputNumero, NotaLegal, Segmentado, Select, Switch } from '@/ui';
import { TEXTOS_COSTO } from '../textos';

/**
 * Parámetros de la calculadora (W4): flete, seguro, arancel, otros tributos aduaneros, IVA de importación, honorarios
 * del agente, puerto y bodegaje, transporte interno y el prorrateo. Son valores de ejemplo editables; mientras los
 * cambias se ve cuánto cambia el costo por prenda con las mismas reglas del cálculo.
 */
export function ParametrosCostoDialog({
  imp,
  tasaCosteo,
  abierto,
  alCambiar,
}: {
  imp: Importacion;
  tasaCosteo: number;
  abierto: boolean;
  alCambiar: (a: boolean) => void;
}) {
  if (!abierto) return null;
  return <ParametrosAbierto imp={imp} tasaCosteo={tasaCosteo} alCambiar={alCambiar} />;
}

function ParametrosAbierto({
  imp,
  tasaCosteo,
  alCambiar,
}: {
  imp: Importacion;
  tasaCosteo: number;
  alCambiar: (a: boolean) => void;
}) {
  const hoy = useHoy();
  const dinero = useDinero();
  const acciones = useAcciones();
  const tasaUsd = useSel(selTasaVigente, { moneda: 'USD', fecha: hoy });
  const tasaCny = useSel(selTasaVigente, { moneda: 'CNY', fecha: hoy });
  const [costos, setCostos] = useState<CostosImportacion>(imp.costos);
  const [metodo, setMetodo] = useState<'valor' | 'cantidad'>(imp.metodoProrrateo);
  const [error, setError] = useState<string | null>(null);

  const unidades = imp.lineas.reduce((a, l) => a + unidadesLinea(l), 0);
  const calculo = useMemo(
    () =>
      calcularCostoAterrizado({
        lineas: imp.lineas,
        costos,
        moneda: imp.moneda,
        metodoProrrateo: metodo,
        tasaCosteo,
        tasasOtras: { USD: tasaUsd, CNY: tasaCny },
      }),
    [imp.lineas, imp.moneda, costos, metodo, tasaCosteo, tasaUsd, tasaCny],
  );
  const base = useMemo(
    () =>
      calcularCostoAterrizado({
        lineas: imp.lineas,
        costos: imp.costos,
        moneda: imp.moneda,
        metodoProrrateo: imp.metodoProrrateo,
        tasaCosteo,
        tasasOtras: { USD: tasaUsd, CNY: tasaCny },
      }),
    [imp, tasaCosteo, tasaUsd, tasaCny],
  );
  const sucio = JSON.stringify(costos) !== JSON.stringify(imp.costos) || metodo !== imp.metodoProrrateo;
  const promedio = unidades > 0 ? redondear(calculo.total / unidades) : 0;
  const promedioBase = unidades > 0 ? redondear(base.total / unidades) : 0;

  const cambiar = (parcial: Partial<CostosImportacion>) => setCostos((c) => ({ ...c, ...parcial }));
  const monto = (clave: 'flete' | 'seguro', etiqueta: string) => {
    const m: MontoMoneda = costos[clave];
    const minor = m.moneda !== 'COP';
    return (
      <div className="flex items-end gap-2">
        <InputNumero
          className="flex-1"
          etiqueta={etiqueta}
          valor={minor ? m.valor / 100 : m.valor}
          alCambiar={(v) => cambiar({ [clave]: { ...m, valor: Math.round((v ?? 0) * (minor ? 100 : 1)) } })}
          decimales={minor ? 2 : 0}
          prefijo={m.moneda === 'COP' ? '$' : m.moneda === 'USD' ? 'US$' : 'CN¥'}
        />
        <Select
          etiqueta={`Moneda de ${etiqueta.toLowerCase()}`}
          etiquetaOculta
          className="w-24"
          valor={m.moneda}
          alCambiar={(v) => {
            const nueva = v as MontoMoneda['moneda'];
            const valorUnidades = m.moneda === 'COP' ? m.valor : m.valor / 100;
            cambiar({
              [clave]: { moneda: nueva, valor: Math.round(valorUnidades * (nueva === 'COP' ? 1 : 100)) },
            });
          }}
          opciones={[
            { valor: 'USD', etiqueta: 'US$' },
            { valor: 'CNY', etiqueta: 'CN¥' },
            { valor: 'COP', etiqueta: 'COP' },
          ]}
          enModal
        />
      </div>
    );
  };
  const pesos = (
    clave: 'honorariosAgente' | 'bodegajePuerto' | 'transporteInterno' | 'otros' | 'otrosTributosAduaneros',
    etiqueta: string,
    ayuda?: string,
  ) => (
    <InputNumero
      etiqueta={etiqueta}
      prefijo="$"
      valor={costos[clave]}
      alCambiar={(v) => cambiar({ [clave]: v ?? 0 })}
      ayuda={ayuda}
    />
  );

  const guardar = () => {
    const r = acciones.actualizarCostosImportacion({
      importacionId: imp.id,
      costos,
      metodoProrrateo: metodo,
    });
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    avisar({ tipo: 'exito', texto: 'Parámetros del costo guardados' });
    alCambiar(false);
  };

  return (
    <Dialog
      abierto
      alCambiar={alCambiar}
      ancho="lg"
      eyebrow={imp.numero}
      titulo="Parámetros del costo"
      descripcion={`${TEXTOS_COSTO.valorEjemplo}. Con estos valores calculamos lo que cuesta cada prenda puesta en la bodega.`}
      confirmarAlCerrar={sucio}
      data-testid="dialogo-parametros"
      pie={
        <>
          <span className="mr-auto t-small text-muted" data-testid="preview-promedio">
            Costo promedio por prenda: <strong className="font-bold text-ink num">{dinero(promedio)}</strong>
            {promedio !== promedioBase && <span className="ml-1">(antes {dinero(promedioBase)})</span>}
          </span>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="guardar-parametros">
            Guardar parámetros
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <p className="border-l-2 border-danger pl-3 t-small text-ink">{error}</p>}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {monto('flete', 'Flete internacional')}
          {monto('seguro', 'Seguro')}
          <InputNumero
            etiqueta="Arancel (%)"
            sufijo="%"
            valor={Math.round(costos.arancelPct * 1000) / 10}
            alCambiar={(v) => cambiar({ arancelPct: (v ?? 0) / 100 })}
            decimales={1}
          />
          {pesos(
            'otrosTributosAduaneros',
            'Otros tributos aduaneros',
            'El componente específico del arancel de confecciones.',
          )}
          <InputNumero
            etiqueta="IVA de importación (%)"
            sufijo="%"
            valor={Math.round(costos.ivaImportacionPct * 1000) / 10}
            alCambiar={(v) => cambiar({ ivaImportacionPct: (v ?? 0) / 100 })}
            decimales={1}
          />
          {pesos('honorariosAgente', 'Honorarios del agente de aduanas')}
          {pesos('bodegajePuerto', 'Puerto y bodegaje')}
          {pesos('transporteInterno', 'Transporte a Bogotá')}
          {pesos('otros', 'Otros gastos')}
        </div>
        <Switch
          activo={!costos.ivaSumaAlCosto}
          alCambiar={(v) => cambiar({ ivaSumaAlCosto: !v })}
          etiqueta={TEXTOS_COSTO.ivaDescontable}
          valorTexto={costos.ivaSumaAlCosto ? 'El IVA suma al costo' : 'El IVA no suma al costo'}
        />
        <div>
          <p className="mb-1.5 t-label text-ink">{TEXTOS_COSTO.prorrateo}</p>
          <Segmentado
            etiqueta={TEXTOS_COSTO.prorrateo}
            valor={metodo}
            alCambiar={setMetodo}
            opciones={[
              { valor: 'valor', etiqueta: TEXTOS_COSTO.prorrateoValor },
              { valor: 'cantidad', etiqueta: TEXTOS_COSTO.prorrateoCantidad },
            ]}
          />
        </div>
        <NotaLegal tipo="aduanero" />
      </div>
    </Dialog>
  );
}
