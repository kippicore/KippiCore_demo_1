import { useMemo, useState } from 'react';
import type { FechaISO, Id } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { rutas } from '@/app/rutas';
import { useAcciones, useHoy } from '@/estado';
import { hora } from '@/lib/formato';
import { avisar, Button, Dialog, Input, Segmentado, Select, SelectorFecha, Textarea } from '@/ui';

/**
 * Programa un seguimiento en el calendario (`crearEvento` tipo cita, subtipo seguimiento) ligado al cliente.
 * Solo el dueño tiene la agenda (permiso `evento.crear`).
 */
const HORAS = Array.from({ length: 24 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
});

const RECORDATORIOS = [
  { valor: '0', etiqueta: 'Sin recordatorio' },
  { valor: '60', etiqueta: '1 hora antes' },
  { valor: '1440', etiqueta: '1 día antes' },
];

interface Props {
  clienteId: Id;
  nombre: string;
  localId: Id | null;
  /** Si el cliente está en riesgo, el seguimiento sugerido es mañana; si no, en una semana. */
  urgente?: boolean;
  alCerrar: () => void;
}

export function ModalSeguimiento({ clienteId, nombre, localId, urgente, alCerrar }: Props) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const [titulo, setTitulo] = useState(`Seguimiento a ${nombre}`);
  const [fecha, setFecha] = useState<FechaISO>(sumarDias(hoy, urgente ? 1 : 7));
  const [horaElegida, setHora] = useState('10:00');
  const [detalle, setDetalle] = useState('');
  const [recordatorio, setRecordatorio] = useState('60');
  const [errores, setErrores] = useState<Partial<Record<'titulo' | 'inicio', string>>>({});
  const [general, setGeneral] = useState<string | null>(null);

  const atajo = useMemo(() => {
    const dias = (n: number) => sumarDias(hoy, n);
    return [
      { valor: dias(1), etiqueta: 'Mañana' },
      { valor: dias(7), etiqueta: 'En 1 semana' },
      { valor: dias(15), etiqueta: 'En 15 días' },
    ];
  }, [hoy]);

  const guardar = () => {
    setErrores({});
    setGeneral(null);
    if (fecha < hoy) {
      setErrores({ inicio: 'Elige una fecha desde hoy.' });
      return;
    }
    const r = acciones.crearEvento({
      datos: {
        tipo: 'cita',
        subtipo: 'seguimiento',
        titulo,
        inicio: `${fecha}T${horaElegida}:00`,
        fin: null,
        todoElDia: false,
        localId,
        clienteId,
        empleadoId: null,
        descripcion: detalle.trim() || null,
        recordatorioMin: Number(recordatorio) || null,
      },
    });
    if (!r.ok) {
      if (r.error.campo === 'titulo') setErrores({ titulo: r.error.mensaje });
      else if (r.error.campo === 'inicio') setErrores({ inicio: r.error.mensaje });
      else setGeneral(r.error.mensaje);
      return;
    }
    let eventoId: string | null = null;
    for (const e of r.eventos) if (e.tipo === 'EntidadCambiada' && e.coleccion === 'eventos') eventoId = e.id;
    avisar({
      tipo: 'exito',
      texto: 'Seguimiento programado',
      detalle: `Quedó en tu calendario para el ${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}.`,
      accion: { texto: 'Ver en el calendario', a: rutas.calendario({ vista: 'dia', fecha, resaltar: eventoId ? `ev:${eventoId}` : null }) },
    });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      ancho="md"
      eyebrow={nombre}
      titulo="Programar seguimiento"
      descripcion="Se guarda en el calendario como una cita con este cliente, para que no se te pase el momento de escribirle o llamarlo."
      data-testid="modal-seguimiento"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="seguimiento-guardar">
            Programar seguimiento
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Input
          className="col-span-2"
          etiqueta="Qué vas a hacer"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          error={errores.titulo}
          data-testid="seguimiento-titulo"
        />
        <SelectorFecha etiqueta="Fecha" enModal hoy={hoy} desde={hoy} valor={fecha} alCambiar={setFecha} error={errores.inicio} />
        <Select
          etiqueta="Hora"
          enModal
          valor={horaElegida}
          alCambiar={setHora}
          opciones={HORAS.map((h) => ({ valor: h, etiqueta: hora(h) }))}
        />
        <div className="col-span-2 -mt-2">
          <Segmentado etiqueta="Atajos de fecha" tamano="sm" valor={atajo.find((a) => a.valor === fecha)?.valor ?? ''} alCambiar={setFecha} opciones={atajo} />
        </div>
        <Select etiqueta="Recordatorio" enModal valor={recordatorio} alCambiar={setRecordatorio} opciones={RECORDATORIOS} />
        <div />
        <Textarea className="col-span-2" etiqueta="Detalle" opcional rows={3} value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Qué le quieres decir o qué tienes que llevarle." />
      </div>
      {general && (
        <p role="alert" className="mt-4 t-small text-danger">
          {general}
        </p>
      )}
    </Dialog>
  );
}
