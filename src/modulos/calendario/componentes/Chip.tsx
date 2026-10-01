import { useDraggable } from '@dnd-kit/core';
import { ArrowUpRight, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Dinero, Icono, cn } from '@/ui';
import { ESTADOS_POR_PAGAR } from '@/config/estados';
import type { FechaISO } from '@/dominio/tipos';
import { hora } from '@/lib/formato';
import { diasQueCubre } from '../calculos';
import { CLASE_RESALTADO, ESTILO_TIPO } from '../estilos';
import { ETIQUETA_TURNO, TIPOS_INFO } from '../textos';
import type { EventoAgenda } from '../tipos';
import { useContextoCalendario } from './contexto';

/** Piezas visuales de un evento: ficha de una línea (mes), tarjeta de dos (semana y día) y su versión arrastrable. */

/** "11:00 a. m. – 12:00 p. m." / "11:00 a. m." / null si es de todo el día. */
export function textoHorario(e: Pick<EventoAgenda, 'inicio' | 'fin' | 'todoElDia'>): string | null {
  if (e.todoElDia) return null;
  const mismoDia = e.fin && e.fin.slice(0, 10) === e.inicio.slice(0, 10);
  return mismoDia && e.fin ? `${hora(e.inicio)} – ${hora(e.fin)}` : hora(e.inicio);
}

/** Texto de ayuda (title) con todo lo importante de un evento. */
export function textoCompleto(e: EventoAgenda, local: string | null): string {
  const partes = [e.titulo, textoHorario(e), local, e.estadoTexto, e.origen !== 'guardado' ? `Viene de ${TIPOS_INFO[e.tipo].modulo}` : null];
  return partes.filter(Boolean).join(' · ');
}

const MARCA_ORIGEN = (e: EventoAgenda) => e.origen !== 'guardado';

/** Una cuenta por pagar ya cumplida (se ve apagada y con la marca de visto). */
export const estaPagado = (e: EventoAgenda): boolean => e.origen === 'cuenta' && e.estadoTexto === ESTADOS_POR_PAGAR.pagado.etiqueta;

export interface PropsChipVisual {
  evento: EventoAgenda;
  /** En un evento largo, solo el primer día de cada semana lleva el texto. */
  inicioSegmento?: boolean;
  finSegmento?: boolean;
  resaltado?: boolean;
  /** Antepone la hora en los eventos con hora. */
  conHora?: boolean;
  className?: string;
}

/** Ficha de una línea (vista de mes): barra izquierda de 3 px, fondo suave del tipo y el título. */
export function ChipVisual({ evento, inicioSegmento = true, finSegmento = true, resaltado, conHora, className }: PropsChipVisual) {
  const estilo = ESTILO_TIPO[evento.tipo];
  const hecho = estaPagado(evento);
  return (
    <span
      className={cn(
        'relative flex h-6 w-full min-w-0 items-center gap-1.5 overflow-hidden pr-1.5 t-small text-ink',
        estilo.fondo,
        evento.tipo === 'otro' && 'border border-line-soft',
        inicioSegmento ? 'pl-2.5' : 'pl-1.5',
        !finSegmento && 'pr-0',
        hecho && 'text-muted',
        evento.ilustrativo && 'border border-dashed border-danger/50',
        resaltado && CLASE_RESALTADO,
        className,
      )}
    >
      {inicioSegmento && <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', estilo.barra)} />}
      {inicioSegmento && (
        <>
          {conHora && !evento.todoElDia && <span className="num shrink-0 text-ink-2">{evento.inicio.slice(11, 16)}</span>}
          {hecho && <Icono icono={Check} tamano={12} className="shrink-0 text-success" />}
          <span className="truncate font-medium">{evento.titulo}</span>
          {MARCA_ORIGEN(evento) && <Icono icono={ArrowUpRight} tamano={12} className="ml-auto shrink-0 text-ink-2" />}
        </>
      )}
    </span>
  );
}

/** Línea de contexto de una tarjeta: hora, local y estado; el monto va con `<Dinero>`. */
export function SubtituloEvento({ evento }: { evento: EventoAgenda }): ReactNode {
  const { nombreLocal } = useContextoCalendario();
  const local = nombreLocal(evento.localId);
  const horario = textoHorario(evento);
  const partes: ReactNode[] = [];
  if (evento.turno) partes.push(ETIQUETA_TURNO[evento.turno.tipo]);
  if (horario) partes.push(horario);
  if (evento.tipo === 'importacion') {
    if (evento.estadoTexto) partes.push(evento.estadoTexto);
    if (evento.detalle) partes.push(evento.detalle);
  } else if (evento.tipo === 'vencimiento') {
    if (evento.monto !== null) partes.push(<Dinero key="monto" valor={evento.monto} corta />);
    else if (evento.montoOrigen) partes.push(evento.montoOrigen);
    if (evento.estadoTexto) partes.push(evento.estadoTexto);
  } else if (evento.tipo === 'campana') {
    const dias = diasQueCubre(evento);
    if (dias.length > 1) partes.push(`${dias.length} días`);
  } else if (evento.tipo === 'cita' && evento.clienteNombre && !evento.titulo.includes(evento.clienteNombre)) {
    partes.push(evento.clienteNombre);
  }
  if (local && evento.tipo !== 'turno' && evento.tipo !== 'importacion') partes.push(local);
  return (
    <>
      {partes.map((p, i) => (
        <span key={i}>
          {i > 0 && <span aria-hidden> · </span>}
          {p}
        </span>
      ))}
    </>
  );
}

export interface PropsTarjeta {
  evento: EventoAgenda;
  resaltado?: boolean;
  /** Muestra "Hasta 20 sep" en eventos de varios días. */
  fecha?: FechaISO;
  className?: string;
}

/** Tarjeta de dos líneas (semana y día): título en negrita y contexto debajo. */
export function TarjetaVisual({ evento, resaltado, fecha, className }: PropsTarjeta) {
  const estilo = ESTILO_TIPO[evento.tipo];
  const dias = diasQueCubre(evento);
  const continua = dias.length > 1 && fecha && fecha !== dias[0];
  const hecho = estaPagado(evento);
  return (
    <span
      className={cn(
        'relative flex min-h-10 w-full min-w-0 flex-col justify-center py-1 pl-3 pr-2 text-left text-ink',
        estilo.fondo,
        evento.tipo === 'otro' && 'border border-line-soft',
        hecho && 'text-muted',
        evento.ilustrativo && 'border border-dashed border-danger/50',
        resaltado && CLASE_RESALTADO,
        className,
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', estilo.barra)} />
      <span className="flex min-w-0 items-center gap-1.5">
        {hecho && <Icono icono={Check} tamano={12} className="shrink-0 text-success" />}
        <span className="truncate t-small font-semibold">{evento.titulo}</span>
        {MARCA_ORIGEN(evento) && <Icono icono={ArrowUpRight} tamano={12} className="ml-auto shrink-0 text-ink-2" />}
      </span>
      <span className="truncate t-small text-ink-2">
        {continua ? <span>Continúa · </span> : null}
        <SubtituloEvento evento={evento} />
      </span>
    </span>
  );
}

interface PropsArrastrable {
  evento: EventoAgenda;
  fecha: FechaISO;
  /** Solo las vistas con días como destino (mes y semana) dejan arrastrar. */
  arrastrable: boolean;
  children: ReactNode;
  className?: string;
}

/** Botón que abre el detalle y, si el evento se puede mover, se arrastra a otro día (dnd-kit). */
export function Arrastrable({ evento, fecha, arrastrable, children, className }: PropsArrastrable) {
  const { abrir, resaltadoId, nombreLocal } = useContextoCalendario();
  const puede = arrastrable && evento.movible;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `${evento.id}@${fecha}`, data: { evento, desde: fecha }, disabled: !puede });
  return (
    <button
      ref={setNodeRef}
      // Sin atributos de arrastre cuando no se puede mover: sigue siendo un botón normal que abre el detalle.
      {...(puede ? { ...listeners, ...attributes } : {})}
      type="button"
      onClick={() => abrir(evento)}
      title={textoCompleto(evento, nombreLocal(evento.localId))}
      aria-label={textoCompleto(evento, nombreLocal(evento.localId))}
      data-evento-id={evento.id}
      data-testid={`evento-${evento.id}`}
      data-tipo={evento.tipo}
      data-movible={puede || undefined}
      data-resaltada={resaltadoId === evento.id || undefined}
      className={cn(
        'block w-full min-w-0 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus',
        puede ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDragging && 'opacity-30',
        className,
      )}
    >
      {children}
    </button>
  );
}
