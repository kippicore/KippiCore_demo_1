import { ArrowUpRight, Link2, Pencil, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Badge, BotonEnlace, Button, Dinero, Drawer, Icono, NotaLegal, ParesDatos, SelectorFecha } from '@/ui';
import { rutas } from '@/app/rutas';
import type { FechaISO, TipoEvento } from '@/dominio/tipos';
import { fechaLarga } from '@/lib/formato';
import { diasQueCubre, textoRecordatorio } from '../calculos';
import { ESTILO_TIPO } from '../estilos';
import { ETIQUETA_TURNO, ORIGENES, TIPOS_INFO } from '../textos';
import type { EventoAgenda } from '../tipos';
import { textoHorario } from './Chip';
import { useContextoCalendario } from './contexto';

export interface PropsDetalle {
  evento: EventoAgenda | null;
  alCerrar: () => void;
  alEditar: (e: EventoAgenda) => void;
  alEliminar: (e: EventoAgenda) => void;
  /** Mover un evento derivado a la fecha elegida (cambia en su módulo de origen). */
  alMover: (e: EventoAgenda, nueva: FechaISO) => void;
}

const EYEBROW_TIPO: Record<TipoEvento, string> = {
  turno: 'Turno',
  importacion: 'Llegada de importación',
  vencimiento: 'Vencimiento',
  campana: 'Campaña de temporada',
  cita: 'Cita con cliente',
  otro: 'Evento',
};

const EYEBROW_CITA: Partial<Record<NonNullable<EventoAgenda['subtipo']>, string>> = {
  toma_medidas: 'Cita · Toma de medidas',
  asesoria: 'Cita · Asesoría de imagen',
  seguimiento: 'Cita · Seguimiento',
};

function eyebrowDe(e: EventoAgenda): string {
  if (e.origen === 'obligacion') return 'Obligación ilustrativa';
  if (e.tipo === 'cita' && e.subtipo) return EYEBROW_CITA[e.subtipo] ?? EYEBROW_TIPO.cita;
  return EYEBROW_TIPO[e.tipo];
}

function textoCuando(e: EventoAgenda): string {
  const dias = diasQueCubre(e);
  const primero = dias[0] ?? e.inicio.slice(0, 10);
  const ultimo = dias[dias.length - 1] ?? primero;
  if (dias.length > 1) return `Del ${fechaLarga(primero).toLowerCase()} al ${fechaLarga(ultimo).toLowerCase()}`;
  const horario = textoHorario(e);
  return horario ? `${fechaLarga(primero)} · ${horario}` : fechaLarga(primero);
}

function ParesDelEvento({ e, local }: { e: EventoAgenda; local: string | null }): ReactNode {
  const pares: (readonly [ReactNode, ReactNode])[] = [['Cuándo', textoCuando(e)]];
  if (e.origen === 'turno' && e.turno) {
    pares.push(['Persona', e.turno.empleadoNombre], ['Turno', ETIQUETA_TURNO[e.turno.tipo]], ['Local', local ?? '—']);
  } else if (e.origen === 'importacion') {
    pares.push(['Pedido', e.importacionNumero ?? '—'], ['Proveedor', e.detalle ?? '—'], ['Contenido', e.contenido ?? '—'], ['Dónde llega', 'Bodega']);
  } else if (e.origen === 'cuenta') {
    pares.push(['Tercero', e.detalle ?? '—']);
    if (e.monto !== null) pares.push(['Valor', <Dinero key="valor" valor={e.monto} />]);
    else if (e.montoOrigen) pares.push(['Valor', e.montoOrigen]);
    if (local) pares.push(['Local', local]);
  } else if (e.origen === 'guardado') {
    pares.push(['Local', local ?? 'Toda la empresa']);
    if (e.clienteId)
      pares.push([
        'Cliente',
        <Link key="cliente" to={rutas.cliente(e.clienteId)} className="underline underline-offset-4 hover:no-underline" data-testid="detalle-cliente">
          {e.clienteNombre ?? 'Ver ficha'}
        </Link>,
      ]);
    if (e.empleadoNombre) pares.push(['Atiende', e.empleadoNombre]);
    pares.push(['Recordatorio', textoRecordatorio(e.recordatorioMin)]);
  }
  return <ParesDatos pares={pares} />;
}

/**
 * Detalle de un evento (cajón). Los guardados aquí se editan y eliminan; los que vienen de otro módulo (turnos,
 * llegadas, pagos) dicen de dónde son, no se editan aquí y llevan a su origen; si se pueden mover, se mueven con
 * el mismo comando de su módulo.
 */
export function DetalleEvento({ evento, alCerrar, alEditar, alEliminar, alMover }: PropsDetalle) {
  const { nombreLocal } = useContextoCalendario();
  const [nueva, setNueva] = useState<FechaISO | null>(null);
  const { hoy } = useContextoCalendario();
  if (!evento)
    return <Drawer abierto={false} alCambiar={() => alCerrar()} titulo="Evento" />;
  const e = evento;
  const derivado = e.origen !== 'guardado';
  const origen = derivado ? ORIGENES[e.origen as Exclude<typeof e.origen, 'guardado'>] : null;
  const local = nombreLocal(e.localId);
  const fechaNueva = nueva ?? e.fechaOrigen;
  const estilo = ESTILO_TIPO[e.tipo];
  return (
    <Drawer
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow={eyebrowDe(e)}
      titulo={e.titulo}
      insignia={e.estadoTexto ? <Badge tono={e.estadoTono ?? 'neutral'}>{e.estadoTexto}</Badge> : undefined}
      data-testid="calendario-detalle"
      pie={
        derivado ? (
          <BotonEnlace to={e.enlace} variante="secondary" iconoDerecha={ArrowUpRight} data-testid="detalle-abrir-origen">
            {origen?.abrir}
          </BotonEnlace>
        ) : (
          <>
            <Button variante="ghost" icono={Trash2} onClick={() => alEliminar(e)} data-testid="detalle-eliminar">
              Eliminar
            </Button>
            <Button icono={Pencil} onClick={() => alEditar(e)} data-testid="detalle-editar">
              Editar
            </Button>
          </>
        )
      }
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className={`relative inline-block h-5 w-8 border border-line-soft ${estilo.fondo}`}>
          <span className={`absolute inset-y-0 left-0 w-[3px] ${estilo.barra}`} />
        </span>
        <p className="t-small text-ink-2">{TIPOS_INFO[e.tipo].etiqueta}</p>
      </div>

      {derivado && origen && (
        <div className="border border-line bg-surface-2 p-4" data-testid="detalle-origen">
          <p className="flex items-center gap-2 t-label text-ink">
            <Icono icono={Link2} tamano={16} />
            Viene de {origen.modulo}
          </p>
          <p className="mt-2 t-body text-ink-2">{origen.texto}</p>
        </div>
      )}

      <ParesDelEvento e={e} local={local} />

      {e.descripcion && (
        <div>
          <p className="t-small text-muted">Notas</p>
          <p className="mt-0.5 whitespace-pre-line t-body text-ink">{e.descripcion}</p>
        </div>
      )}

      {e.ilustrativo && <NotaLegal tipo="tributario" />}

      {derivado && e.movible && origen && (
        <section className="flex flex-col gap-3 border-t border-line-soft pt-6" data-testid="detalle-mover">
          <SelectorFecha etiqueta={origen.mover} hoy={hoy} valor={fechaNueva} alCambiar={setNueva} enModal />
          <div>
            <Button
              variante="secondary"
              tamano="sm"
              disabled={fechaNueva === e.fechaOrigen}
              onClick={() => {
                alMover(e, fechaNueva);
                setNueva(null);
              }}
              data-testid="detalle-mover-confirmar"
            >
              Mover
            </Button>
          </div>
        </section>
      )}
    </Drawer>
  );
}
