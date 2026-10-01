import { Link } from 'react-router';
import { useMemo, useState } from 'react';
import { rutas } from '@/app/rutas';
import type { EstadoImportacion, FechaISO, Importacion } from '@/dominio/tipos';
import { hitosAlCambiarEstado, llegadaABodega } from '@/dominio/reglas/importaciones';
import { fecha as fechaTexto } from '@/lib/formato';
import { ETIQUETAS_ESTADO_IMPORTACION, FASES_IMPORTACION } from '@/config/aduanas';
import { MATRIZ_AVISOS } from '@/config/textos/mensajes';
import { useAcciones, useAhora, useHoy, useMarca, useRolActivo, useSel } from '@/estado';
import { selAvisosEstado } from '@/selectores';
import { avisar, Button, Dialog, Select, SelectorFecha, Textarea, type OpcionSelect } from '@/ui';
import { estadosDisponibles, faseDeEstado } from '../calculos';
import { ETIQUETAS_CANAL } from '../textos';

/**
 * "Cambiar estado" (W3): elige el nuevo estado, la fecha y una nota; al guardar, KippiCore pasa al panel
 * "Notificar a" con los avisos de la matriz. Un paso atrás es una corrección: solo el dueño y con nota. La llegada
 * a bodega se registra en Inventario → Recepción.
 */
const CONSECUENCIAS: Partial<Record<EstadoImportacion, string>> = {
  pedido_confirmado: 'Se generan en Por pagar el anticipo (30 %) y el saldo (70 %) a la fábrica.',
  listo_despacho: 'Ahora toca pagar el saldo a la fábrica: te lo recordamos en Inicio y en Pagos.',
  en_nacionalizacion: 'Se genera en Por pagar la cuenta de los tributos aduaneros (valores de ejemplo).',
};

export function CambiarEstadoDialog({
  imp,
  abierto,
  alCambiar,
  estadoInicial,
  alCambiado,
}: {
  imp: Importacion;
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  /** Estado preseleccionado (al soltar una tarjeta del tablero sobre otra fase). */
  estadoInicial?: EstadoImportacion | null;
  alCambiado: (estado: EstadoImportacion, fecha: FechaISO) => void;
}) {
  if (!abierto) return null;
  return (
    <CambiarEstadoAbierto
      imp={imp}
      alCambiar={alCambiar}
      estadoInicial={estadoInicial}
      alCambiado={alCambiado}
    />
  );
}

function CambiarEstadoAbierto({
  imp,
  alCambiar,
  estadoInicial,
  alCambiado,
}: {
  imp: Importacion;
  alCambiar: (abierto: boolean) => void;
  estadoInicial?: EstadoImportacion | null;
  alCambiado: (estado: EstadoImportacion, fecha: FechaISO) => void;
}) {
  const rol = useRolActivo();
  const hoy = useHoy();
  const hora = useAhora().slice(11, 16);
  const marca = useMarca().nombre;
  const acciones = useAcciones();
  const opciones = useMemo(() => estadosDisponibles(imp.estado, rol === 'dueno'), [imp.estado, rol]);
  const [estado, setEstado] = useState<EstadoImportacion | null>(() => {
    const siguiente = opciones.find((o) => !o.correccion)?.estado ?? null;
    return estadoInicial && opciones.some((o) => o.estado === estadoInicial) ? estadoInicial : siguiente;
  });
  const [fecha, setFecha] = useState<FechaISO>(hoy);
  const [nota, setNota] = useState('');
  const [errores, setErrores] = useState<{ estado?: string; fecha?: string; nota?: string }>({});
  const [guardando, setGuardando] = useState(false);

  const elegido = opciones.find((o) => o.estado === estado) ?? null;
  const avisos = useSel(selAvisosEstado, {
    importacionId: imp.id,
    estado: estado ?? imp.estado,
    marca,
    hora,
    fecha,
  });
  const quien = estado && avisos ? avisos.destinatarios.filter((d) => d.preseleccionado) : [];
  // Si el paso ocurre antes o después de lo estimado, la llegada a bodega se corre igual: se dice antes de guardar.
  const llegadaHoy = llegadaABodega(imp);
  const llegadaNueva = estado && !elegido?.correccion ? llegadaABodega({ hitos: hitosAlCambiarEstado(imp, estado, fecha) }) : llegadaHoy;

  const opcionesSelect: OpcionSelect[] = opciones.map((o) => ({
    valor: o.estado,
    etiqueta: `${ETIQUETAS_ESTADO_IMPORTACION[o.estado]}${o.correccion ? ' (corrección)' : ''}`,
    grupo: FASES_IMPORTACION.find((f) => f.id === faseDeEstado(o.estado))?.nombre,
  }));

  const guardar = () => {
    if (!estado) {
      setErrores({ estado: 'Elige el estado al que pasa el pedido.' });
      return;
    }
    if (elegido?.correccion && nota.trim() === '') {
      setErrores({ nota: 'Escribe por qué se corrige el estado.' });
      return;
    }
    setGuardando(true);
    const r = acciones.cambiarEstadoImportacion({
      importacionId: imp.id,
      estado,
      fecha,
      nota: nota.trim() || null,
      origen: 'panel',
      autor: null,
    });
    setGuardando(false);
    if (!r.ok) {
      const campo =
        r.error.campo === 'estado' || r.error.campo === 'fecha' || r.error.campo === 'nota'
          ? r.error.campo
          : 'estado';
      setErrores({ [campo]: r.error.mensaje });
      return;
    }
    avisar({
      tipo: 'exito',
      texto: `${imp.numero} pasó a ${ETIQUETAS_ESTADO_IMPORTACION[estado]}`,
      ...(llegadaNueva !== llegadaHoy ? { detalle: `La llegada a bodega ahora se estima el ${fechaTexto(llegadaNueva)} (antes ${fechaTexto(llegadaHoy)}).` } : {}),
    });
    alCambiar(false);
    alCambiado(estado, fecha);
  };

  return (
    <Dialog
      abierto
      alCambiar={alCambiar}
      eyebrow={imp.numero}
      titulo="Cambiar estado"
      descripcion={`Estado actual: ${ETIQUETAS_ESTADO_IMPORTACION[imp.estado]}. Al guardar, KippiCore redacta el aviso para quien le toca actuar.`}
      data-testid="dialogo-cambiar-estado"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} cargando={guardando} disabled={!estado} data-testid="guardar-estado">
            Guardar y preparar avisos
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {opciones.length === 0 ? (
          <p className="t-body text-muted">
            Este pedido ya llegó a Bogotá. La recepción se registra en{' '}
            <Link
              className="font-bold text-ink underline underline-offset-4"
              to={rutas.recepcion({ importacion: imp.numero })}
            >
              Inventario → Recepción
            </Link>
            .
          </p>
        ) : (
          <>
            <Select
              etiqueta="Nuevo estado"
              valor={estado}
              alCambiar={(v) => {
                setEstado(v as EstadoImportacion);
                setErrores({});
              }}
              opciones={opcionesSelect}
              enModal
              error={errores.estado}
              data-testid="select-estado"
            />
            <SelectorFecha
              etiqueta="Fecha en que ocurrió"
              hoy={hoy}
              valor={fecha}
              alCambiar={setFecha}
              enModal
              error={errores.fecha}
              hasta={hoy}
            />
            <Textarea
              etiqueta="Nota"
              opcional={!elegido?.correccion}
              placeholder={
                elegido?.correccion ? 'Por qué vuelve un paso atrás' : 'Algo que quieras dejar registrado'
              }
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              error={errores.nota}
              ayuda={
                elegido?.correccion ? 'Es una corrección: queda en el historial con tu nota.' : undefined
              }
            />
            {estado && llegadaNueva !== llegadaHoy && (
              <p className="border-l-2 border-accent pl-3 t-small text-ink" data-testid="cambio-llegada">
                Con esta fecha, la llegada a bodega se estima el {fechaTexto(llegadaNueva)} (hoy dice {fechaTexto(llegadaHoy)}): los pasos que
                siguen se corren los mismos días.
              </p>
            )}
            {estado && CONSECUENCIAS[estado] && (
              <p className="border-l-2 border-accent pl-3 t-small text-ink">{CONSECUENCIAS[estado]}</p>
            )}
            {estado && !elegido?.correccion && (
              <div className="border-t border-line-soft pt-4" data-testid="quien-recibe">
                <p className="t-eyebrow text-ink-2">Quién recibe el aviso</p>
                {quien.length === 0 ? (
                  <p className="mt-2 t-small text-muted">
                    {MATRIZ_AVISOS[estado].para
                      ? 'En este estado no se avisa a nadie por defecto; puedes redactar un aviso opcional después.'
                      : 'En este estado no hace falta avisar a nadie.'}
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {quien.map((d) => (
                      <li key={d.tipo} className="flex items-baseline justify-between gap-3 t-body">
                        <span className="font-semibold text-ink">
                          {d.tipo === 'dueno' ? 'Tú, como alerta en Inicio' : d.nombre}
                        </span>
                        <span className="t-small text-muted">
                          {d.tipo === 'dueno'
                            ? 'Sin mensaje'
                            : `${ETIQUETAS_CANAL[d.canal as keyof typeof ETIQUETAS_CANAL] ?? 'App'} · ${d.idioma === 'en' ? 'en inglés' : 'le habla de usted'}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
