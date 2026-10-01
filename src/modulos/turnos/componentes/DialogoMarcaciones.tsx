import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Dialog, Input, Textarea, avisar } from '@/ui';
import type { FechaISO, Id } from '@/dominio/tipos';
import { useAcciones, useSel } from '@/estado';
import { fechaLarga, hora } from '@/lib/formato';
import { selMarcacionesDia } from '../selectores';

const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const ETIQUETA = { entrada: 'Entrada', salida: 'Salida' } as const;

/**
 * Corregir o eliminar las marcaciones de una persona en un día (solo el dueño). Siempre pide el motivo: queda en la
 * marcación (`medio: corregida`, con su nota) y la asistencia, las horas extra y la nómina se recalculan.
 */
export function DialogoMarcaciones({
  empleadoId,
  nombre,
  fecha,
  alCerrar,
}: {
  empleadoId: Id;
  nombre: string;
  fecha: FechaISO;
  alCerrar: () => void;
}) {
  const acciones = useAcciones();
  const marcaciones = useSel(selMarcacionesDia, { empleadoId, fecha });
  const [horas, setHoras] = useState<Record<Id, string>>(() =>
    Object.fromEntries(marcaciones.map((m) => [m.id, m.ts.slice(11, 16)])),
  );
  const [motivo, setMotivo] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Id | null>(null);
  const hayCambios = marcaciones.some((m) => horas[m.id] !== m.ts.slice(11, 16)) || motivo.trim() !== '';

  const exigirMotivo = (): boolean => {
    if (motivo.trim()) return true;
    setErrores((p) => ({ ...p, motivo: 'Escribe por qué se corrige: queda anotado en la marcación.' }));
    return false;
  };

  const guardar = () => {
    setError(null);
    const e: Record<string, string> = {};
    const cambiadas = marcaciones.filter((m) => horas[m.id] !== m.ts.slice(11, 16));
    for (const m of cambiadas) if (!RE_HORA.test(horas[m.id] ?? '')) e[m.id] = 'Escribe la hora como 10:25.';
    if (cambiadas.length === 0) e.general = 'Cambia la hora de alguna marcación o elimínala.';
    else if (!motivo.trim()) e.motivo = 'Escribe por qué se corrige: queda anotado en la marcación.';
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    // Se aplican de una en una; si una falla (p. ej. rompe el orden entrada/salida) se detiene y se explica.
    for (const m of cambiadas) {
      const r = acciones.corregirMarcacion({
        marcacionId: m.id,
        ts: `${fecha}T${horas[m.id]}:00`,
        nota: motivo.trim(),
      });
      if (!r.ok) {
        setError(r.error.mensaje);
        return;
      }
    }
    avisar({
      tipo: 'exito',
      texto: 'Marcación corregida',
      detalle: `${nombre} · ${fechaLarga(fecha)}. La asistencia y la nómina se recalcularon.`,
    });
    alCerrar();
  };

  const eliminar = (id: Id) => {
    setError(null);
    if (!exigirMotivo()) return;
    const r = acciones.eliminarMarcacion({ marcacionId: id, nota: motivo.trim() });
    if (!r.ok) {
      setError(r.error.mensaje);
      setConfirmando(null);
      return;
    }
    avisar({ tipo: 'exito', texto: 'Marcación eliminada', detalle: `${nombre} · ${fechaLarga(fecha)}` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Asistencia"
      titulo="Corregir marcaciones"
      descripcion={`${nombre} · ${fechaLarga(fecha)}. Si se olvidó de marcar o se equivocó, corrígelo aquí.`}
      ancho="md"
      confirmarAlCerrar={hayCambios}
      data-testid="asistencia-dialogo-marcaciones"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button
            onClick={guardar}
            disabled={marcaciones.length === 0}
            data-testid="asistencia-guardar-marcaciones"
          >
            Guardar corrección
          </Button>
        </>
      }
    >
      {marcaciones.length === 0 ? (
        <p className="t-body text-ink-2">Ese día no hay marcaciones para corregir.</p>
      ) : (
        <div className="grid gap-4">
          {marcaciones.map((m) => (
            <div key={m.id} className="border-b border-line-soft pb-4 last:border-b-0 last:pb-0">
              <div className="flex items-end gap-4">
                <Input
                  className="w-[160px]"
                  etiqueta={`${ETIQUETA[m.tipo]} (antes ${hora(m.ts)})`}
                  value={horas[m.id] ?? ''}
                  onChange={(ev) => {
                    setHoras((p) => ({ ...p, [m.id]: ev.target.value }));
                    setErrores((p) => ({ ...p, [m.id]: '' }));
                  }}
                  error={errores[m.id] || undefined}
                  placeholder="10:25"
                  inputMode="numeric"
                  autoComplete="off"
                  data-testid={`asistencia-marcacion-${m.tipo}`}
                />
                {confirmando === m.id ? (
                  <div className="flex items-center gap-2 pb-0.5">
                    <Button variante="secondary" tamano="sm" onClick={() => setConfirmando(null)}>
                      Conservar
                    </Button>
                    <Button
                      variante="destructive"
                      tamano="sm"
                      onClick={() => eliminar(m.id)}
                      data-testid="asistencia-confirmar-eliminar-marcacion"
                    >
                      Eliminar {ETIQUETA[m.tipo].toLowerCase()}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variante="ghost"
                    tamano="sm"
                    icono={Trash2}
                    onClick={() => setConfirmando(m.id)}
                    data-testid={`asistencia-eliminar-${m.tipo}`}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
              {m.medio === 'corregida' && m.nota && (
                <p className="mt-1.5 t-small text-muted">Ya corregida antes: «{m.nota}»</p>
              )}
              {confirmando === m.id && (
                <p className="mt-2 t-small text-ink-2">
                  Se quita la {ETIQUETA[m.tipo].toLowerCase()} de las {hora(m.ts)} y la asistencia de ese día
                  se recalcula. Escribe el motivo abajo antes de confirmar.
                </p>
              )}
            </div>
          ))}
          <Textarea
            etiqueta="Motivo"
            value={motivo}
            onChange={(ev) => {
              setMotivo(ev.target.value);
              setErrores((p) => ({ ...p, motivo: '' }));
            }}
            error={errores.motivo || undefined}
            placeholder="Ej.: Olvidó marcar la entrada, llegó a las 10:05."
            rows={2}
            data-testid="asistencia-motivo"
          />
          {errores.general && <p className="t-small text-danger">{errores.general}</p>}
          {error && (
            <p className="t-small text-danger" role="alert" data-testid="asistencia-error-marcacion">
              {error}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
