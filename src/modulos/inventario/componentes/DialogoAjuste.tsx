import { useMemo, useState } from 'react';
import type { Id, MotivoAjuste } from '@/dominio/tipos';
import { useAcciones, useFiltroLocal, useSel } from '@/estado';
import { entero } from '@/lib/formato';
import { avisar, BuscadorProducto, Button, Dialog, InputNumero, MiniaturaPrenda, Select, Textarea } from '@/ui';
import { selInfoVariantes, selVariantesDetalle } from '../selectores';
import { MOTIVOS_AJUSTE } from '../textos';
import { useLocalesInventario } from './comun';

/**
 * Ajuste de existencias con motivo (daño, pérdida, error de registro, hallazgo u otro). El dominio calcula la
 * diferencia contra lo que dice el sistema y la deja en el kárdex con su motivo y su nota.
 */
export interface PropsDialogoAjuste {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  /** Referencia que se está mirando; si falta, se busca la prenda. */
  productoId?: Id | null;
  varianteId?: Id | null;
  localId?: Id | null;
}

/** Se monta al abrir (y se desmonta al cerrar): cada apertura parte de cero sin efectos de reinicio. */
export function DialogoAjuste(props: PropsDialogoAjuste) {
  return props.abierto ? <CuerpoAjuste {...props} /> : null;
}

function CuerpoAjuste({ abierto, alCambiar, productoId: productoInicial, varianteId: varianteInicial, localId: localInicial }: PropsDialogoAjuste) {
  const acciones = useAcciones();
  const contexto = useFiltroLocal();
  const locales = useLocalesInventario();
  const [productoId, setProductoId] = useState<Id | ''>(productoInicial ?? '');
  const [varianteId, setVarianteId] = useState<Id | ''>(varianteInicial ?? '');
  const [localId, setLocalId] = useState<Id | ''>(localInicial ?? (contexto !== 'todos' ? contexto : ''));
  const [cantidad, setCantidad] = useState<number | null>(null);
  const [motivo, setMotivo] = useState<MotivoAjuste | ''>('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState<{ campo: string; mensaje: string } | null>(null);

  const variantes = useSel(selVariantesDetalle, { productoId: productoId || '__ninguno__' });
  const info = useSel(selInfoVariantes, { ids: varianteId ? [varianteId] : [] });
  const actual = varianteId && localId ? (info[varianteId]?.existencias[localId] ?? 0) : null;
  const opcionesVariante = useMemo(
    () => variantes.map((f) => ({ valor: f.variante.id, etiqueta: `${f.color.nombre} · talla ${f.variante.talla}` })),
    [variantes],
  );
  const i = varianteId ? info[varianteId] : undefined;

  const puedeEnviar = !!varianteId && !!localId && cantidad !== null && !!motivo && cantidad !== actual;

  const enviar = () => {
    if (!puedeEnviar || !varianteId || !localId || cantidad === null || !motivo) return;
    const r = acciones.ajustarInventario({ varianteId, localId, nuevaCantidad: cantidad, motivo, nota: nota.trim() || null });
    if (!r.ok) {
      setError({ campo: r.error.campo ?? 'nuevaCantidad', mensaje: r.error.mensaje });
      return;
    }
    alCambiar(false);
    avisar({ tipo: 'exito', texto: 'Ajuste registrado', detalle: `${i?.producto.nombre ?? ''}: de ${entero(actual ?? 0)} a ${entero(cantidad)} en ${locales.find((l) => l.id === localId)?.nombre ?? ''}.` });
  };

  return (
    <Dialog
      abierto={abierto}
      alCambiar={alCambiar}
      eyebrow="Existencias"
      titulo="Ajustar existencias"
      descripcion="Corrige lo que dice el sistema cuando no coincide con lo que hay en el estante. Queda en el kárdex con su motivo."
      ancho="md"
      confirmarAlCerrar={cantidad !== null}
      data-testid="dialogo-ajuste"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={!puedeEnviar} data-testid="ajuste-confirmar">
            Registrar ajuste
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!productoInicial && !productoId && (
          <div>
            <p className="mb-1.5 t-label text-ink">Prenda</p>
            <BuscadorProducto
              enModal
              alElegir={(r) => {
                setProductoId(r.producto.id);
                setVarianteId(r.variante?.id ?? '');
              }}
            />
          </div>
        )}
        {productoId && (
          <>
            {i && (
              <p className="flex items-center gap-3 border border-line bg-surface-2 p-3 t-body text-ink">
                <MiniaturaPrenda tipo={i.producto.tipoPrenda} color={i.color?.hex ?? '#C9C9C7'} patron={i.color?.patron} tamano="buscador" />
                <span>
                  <strong className="font-semibold">{i.producto.nombre}</strong>
                  <span className="block t-small text-muted">{i.producto.referencia}</span>
                </span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Select etiqueta="Color y talla" valor={varianteId || null} alCambiar={setVarianteId} opciones={opcionesVariante} placeholder="Elige la variante" enModal data-testid="ajuste-variante" />
              <Select
                etiqueta="Local"
                valor={localId || null}
                alCambiar={setLocalId}
                opciones={locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))}
                placeholder="Elige el local"
                enModal
                data-testid="ajuste-local"
              />
            </div>
            <div className="grid grid-cols-2 items-end gap-4">
              <InputNumero
                etiqueta="Cantidad que hay en realidad"
                valor={cantidad}
                alCambiar={(v) => {
                  setCantidad(v);
                  setError(null);
                }}
                ayuda={actual !== null ? `El sistema dice ${entero(actual)}.` : 'Elige la variante y el local.'}
                error={error?.campo === 'nuevaCantidad' ? error.mensaje : cantidad !== null && actual !== null && cantidad === actual ? 'Es igual a la que dice el sistema.' : undefined}
                data-testid="ajuste-cantidad"
              />
              <Select
                etiqueta="Motivo"
                valor={motivo || null}
                alCambiar={(v) => setMotivo(v as MotivoAjuste)}
                opciones={(Object.keys(MOTIVOS_AJUSTE) as MotivoAjuste[]).map((m) => ({ valor: m, etiqueta: MOTIVOS_AJUSTE[m] }))}
                placeholder="¿Por qué cambia?"
                enModal
                error={error?.campo === 'motivo' ? error.mensaje : undefined}
                data-testid="ajuste-motivo"
              />
            </div>
            <Textarea etiqueta="Nota" opcional value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Qué pasó, quién lo encontró, a qué se debe" rows={2} />
            {error && !['nuevaCantidad', 'motivo'].includes(error.campo) && <p className="t-small text-danger">{error.mensaje}</p>}
            {!varianteInicial && (
              <button type="button" className="self-start t-small font-bold text-ink underline underline-offset-4" onClick={() => { setProductoId(''); setVarianteId(''); }}>
                Cambiar de prenda
              </button>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
