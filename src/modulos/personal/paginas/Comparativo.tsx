import { useEffect, useMemo, useState } from 'react';
import { BotonEnlace, Dinero, InputNumero, Select, Switch } from '@/ui';
import { emitirUI, useHoy, useSel } from '@/estado';
import { plural } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import { selComparativoModalidades, selNarrativa } from '@/selectores';
import { AvisoRiesgoLista } from '../componentes/AlertasRiesgo';
import { ComparativoLadoALado } from '../componentes/ComparativoLadoALado';
import { EncabezadoPersonal, LimiteError } from '../componentes/Piezas';
import { selExposicionContratistas, selParametrosNomina, selPresetsComparativo } from '../selectores';
import { ETIQUETA_CARGO, ETIQUETA_RIESGO_ARL, TEXTOS } from '../textos';

/** "¿Cuánto me cuesta en cada modalidad?" (W6): el mismo valor como contrato laboral y como prestación de servicios. */
export default function Comparativo() {
  return (
    <div className="pb-16" data-testid="personal-comparativo-pagina">
      <EncabezadoPersonal titulo={TEXTOS.comparativo.titulo} subtitulo={TEXTOS.comparativo.subtitulo} />
      <LimiteError>
        <Cuerpo />
      </LimiteError>
    </div>
  );
}

const LIBRE = 'libre';

function Cuerpo() {
  const hoy = useHoy();
  const parametros = useSel(selParametrosNomina);
  const presets = useSel(selPresetsComparativo, { hoy });
  const narrativa = useSel(selNarrativa, { hoy });
  const inicial = presets.find((p) => p.empleadoId === narrativa.vendedorPersona && p.tipo === 'laboral') ?? presets.find((p) => p.tipo === 'laboral');
  const [preset, setPreset] = useState<string>(inicial?.empleadoId ?? LIBRE);
  const [valor, setValor] = useState<number | null>(inicial?.valor ?? 1_950_000);
  const [riesgoArl, setRiesgoArl] = useState<1 | 2 | 3 | 4 | 5>(inicial?.riesgoArl ?? 1);
  const [exoneracion, setExoneracion] = useState(true);

  // Evento de la guía: al montar el comparativo, sin persona (CONTRATOS 10).
  useEffect(() => {
    emitirUI('costo_empleador_visto', {});
  }, []);

  const elegido = presets.find((p) => p.empleadoId === preset) ?? null;
  const valorEfectivo = valor ?? 0;
  const cmp = useSel(selComparativoModalidades, { valorMensual: Math.max(valorEfectivo, 1), exoneracion: exoneracion && parametros.exoneracion114.activa, fecha: hoy, riesgoArl });
  const exposicion = useSel(selExposicionContratistas, { hoy, exoneracion });
  const bajoMinimo = valorEfectivo > 0 && valorEfectivo < parametros.smmlv;
  const opciones = useMemo(
    () => [{ valor: LIBRE, etiqueta: 'Un valor que escribo yo' }, ...presets.map((p) => ({ valor: p.empleadoId, etiqueta: `${p.nombre} · ${ETIQUETA_CARGO[p.cargo]}` }))],
    [presets],
  );

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section aria-label="Valor a comparar" className="border border-line bg-surface p-6" data-testid="personal-comparativo-controles">
        <div className="grid grid-cols-1 items-start gap-x-6 gap-y-4 desk:grid-cols-[1.4fr_1fr_1fr_auto]">
          <Select
            etiqueta="Tomar el valor de"
            valor={preset}
            alCambiar={(v) => {
              setPreset(v);
              const p = presets.find((x) => x.empleadoId === v);
              if (p) {
                setValor(p.valor);
                setRiesgoArl(p.riesgoArl);
              }
            }}
            opciones={opciones}
            ayuda={elegido ? `Su valor actual por ${elegido.tipo === 'laboral' ? 'contrato laboral' : 'prestación de servicios'}.` : 'O escribe el valor mensual que quieres comparar.'}
            data-testid="personal-comparativo-preset"
          />
          <InputNumero
            etiqueta="Valor mensual"
            prefijo="$"
            valor={valor}
            alCambiar={(v) => {
              setValor(v);
              setPreset(LIBRE);
            }}
            error={bajoMinimo ? 'Por debajo del salario mínimo no se puede contratar laboralmente.' : undefined}
            data-testid="personal-comparativo-valor"
          />
          <Select
            etiqueta="Riesgo de ARL"
            valor={String(riesgoArl)}
            alCambiar={(v) => setRiesgoArl(Number(v) as 1 | 2 | 3 | 4 | 5)}
            opciones={([1, 2, 3, 4, 5] as const).map((r) => ({ valor: String(r), etiqueta: ETIQUETA_RIESGO_ARL[r] }))}
            ayuda="Cuánto aporta el negocio a la ARL en el contrato laboral."
          />
          {parametros.exoneracion114.activa && (
            <div className="pt-7" data-testid="personal-comparativo-exoneracion">
              <Switch etiqueta="Exoneración de aportes" activo={exoneracion} alCambiar={setExoneracion} valorTexto={exoneracion ? 'Exonerado' : 'No exonerado'} />
            </div>
          )}
        </div>
      </section>

      {valorEfectivo > 0 ? (
        <ComparativoLadoALado cmp={cmp} sujeto={elegido ? `el cargo de ${elegido.nombre.split(' ')[0]}` : 'este cargo'} />
      ) : (
        <p className="border border-line bg-surface px-6 py-10 text-center t-body text-muted" data-testid="personal-comparativo-vacio">
          Escribe el valor mensual para ver las dos modalidades lado a lado.
        </p>
      )}

      <section aria-label="Tus contratistas hoy" className="flex flex-col gap-4" data-testid="personal-comparativo-contratistas">
        <div>
          <h2 className="t-h2 text-ink">Tus contratistas, hoy</h2>
          <p className="mt-1 max-w-[72ch] t-body text-muted">Mira si alguno de los que tienes por prestación de servicios se parece más a un empleado.</p>
        </div>
        {exposicion.filas.length > 0 ? (
          <>
            <AvisoRiesgoLista exposicion={exposicion} />
            <p className="t-body text-ink-2">
              {TEXTOS.comparativo.siEmpleados}: <Dinero valor={exposicion.diferencia} className="font-bold text-ink" /> al mes entre {plural(exposicion.filas.length, 'persona')}.
            </p>
          </>
        ) : (
          <p className="border border-line bg-surface px-5 py-4 t-body text-ink-2">{TEXTOS.comparativo.sinRiesgo}</p>
        )}
        <div>
          <BotonEnlace to={rutas.personal({ riesgo: 'contrato-realidad' })} variante="secondary" tamano="sm">
            Revisar el riesgo de contrato realidad
          </BotonEnlace>
        </div>
      </section>
    </div>
  );
}
