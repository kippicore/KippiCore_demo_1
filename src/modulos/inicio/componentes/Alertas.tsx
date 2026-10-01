import {
  Archive,
  Banknote,
  CalendarClock,
  Cake,
  CircleCheck,
  Clock,
  HandCoins,
  PackageMinus,
  Scale,
  ShieldCheck,
  Ship,
  UserX,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { Alerta, TipoAlerta } from '@/dominio/tipos';
import { useAhora, useFiltroLocal, useSel, useSesion } from '@/estado';
import { selAlertas } from '@/selectores';
import { Badge, BotonIcono, Button, Card, cn, EmptyState, EnlaceVerTodo, Icono, Pista } from '@/ui';
import { alertasVisibles } from '../calculos';
import { TXT } from '../textos';

/**
 * "Requiere tu atención" (PRD 7.1, PLAN 2.3.3): las alertas accionables de `selAlertas`, cada una con su ícono, su
 * título, una línea de contexto y un enlace que lleva directo al lugar donde se resuelve (los parámetros de enlace
 * profundo ya vienen armados con `rutas.ts`). Las nacidas de una acción del usuario (p. ej. el portal de seguimiento)
 * entran arriba con la marca "Nuevo" y un fundido. Descartar es estado de interfaz (store `sesion`), no de dominio.
 */
const ICONO_POR_TIPO: Record<TipoAlerta, LucideIcon> = {
  stock_bajo: PackageMinus,
  agotado: PackageMinus,
  importacion_estado: Ship,
  importacion_retrasada: Ship,
  pago_por_vencer: CalendarClock,
  pago_vencido: CalendarClock,
  inasistencia: UserX,
  llegada_tarde: Clock,
  separado_por_vencer: HandCoins,
  cumpleanos_vip: Cake,
  mercancia_dormida: Archive,
  aprobacion_pendiente: ShieldCheck,
  caja_con_diferencia: Banknote,
  caja_sin_cerrar: Banknote,
  riesgo_contrato_realidad: Scale,
};

const COLOR_POR_SEVERIDAD: Record<Alerta['severidad'], string> = {
  urgente: 'text-danger',
  atencion: 'text-warning',
  info: 'text-ink-2',
};

const ETIQUETA_SEVERIDAD: Record<Alerta['severidad'], string> = { urgente: 'Urgente', atencion: 'Atención', info: 'Para tu información' };

export function Alertas() {
  const localId = useFiltroLocal();
  const ahora = useAhora();
  const descartadas = useSesion((s) => s.alertasDescartadas);
  const leidas = useSesion((s) => s.notificacionesLeidas);
  const alertas = useSel(selAlertas, { localId, ahora, descartadas, leidas });
  const [todas, setTodas] = useState(false);
  const { visibles, ocultas } = alertasVisibles(alertas, todas);
  return (
    <Pista id="inicio.alertas">
      <Card
        titulo={TXT.alertas.titulo}
        accion={alertas.length > 0 ? <span className="t-small num text-muted" data-testid="inicio-alertas-total">{alertas.length}</span> : undefined}
        data-testid="inicio-alertas"
      >
        {alertas.length === 0 ? (
          <EmptyState tamano="compacto" icono={CircleCheck} titulo={TXT.alertas.vacioTitulo} texto={TXT.alertas.vacioTexto} />
        ) : (
          <>
            <ul aria-label={TXT.alertas.titulo}>
              {visibles.map((a, i) => (
                <FilaAlerta key={a.id} alerta={a} primera={i === 0} />
              ))}
            </ul>
            {(ocultas > 0 || todas) && alertas.length > 5 && (
              <Button variante="secondary" tamano="sm" anchoCompleto className="mt-3" onClick={() => setTodas((t) => !t)} aria-expanded={todas} data-testid="inicio-alertas-ver-todas">
                {todas ? TXT.alertas.verMenos : TXT.alertas.verTodas(alertas.length)}
              </Button>
            )}
          </>
        )}
      </Card>
    </Pista>
  );
}

function FilaAlerta({ alerta: a, primera }: { alerta: Alerta; primera: boolean }) {
  const descartar = useSesion((s) => s.descartarAlerta);
  const leer = useSesion((s) => s.marcarNotificacionLeida);
  const idNotificacion = a.id.startsWith('notificacion:') ? a.id.slice('notificacion:'.length) : null;
  const marcarLeida = () => {
    if (idNotificacion) leer(idNotificacion);
  };
  return (
    <li
      data-alerta={a.id}
      data-tipo={a.tipo}
      data-severidad={a.severidad}
      data-nueva={a.nueva ? 'si' : undefined}
      className={cn('relative flex gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0', a.nueva && 'animate-fade-in-slow')}
    >
      <span className={cn('mt-px shrink-0', COLOR_POR_SEVERIDAD[a.severidad])} title={ETIQUETA_SEVERIDAD[a.severidad]}>
        <Icono icono={ICONO_POR_TIPO[a.tipo]} tamano={20} />
        <span className="sr-only">{ETIQUETA_SEVERIDAD[a.severidad]}</span>
      </span>
      <div className="min-w-0 flex-1 pr-8">
        <p className="t-nav text-ink">
          {a.nueva && (
            <Badge tono="accent" tamano="sm" className="mr-2 align-middle">
              {TXT.alertas.nuevo}
            </Badge>
          )}
          {a.titulo}
        </p>
        <p className="mt-0.5 t-small text-muted">{a.contexto}</p>
        <div className="mt-1.5" onClickCapture={marcarLeida}>
          <EnlaceVerTodo a={a.accion.ruta}>{a.accion.texto}</EnlaceVerTodo>
        </div>
      </div>
      <BotonIcono
        icono={X}
        etiqueta={TXT.alertas.descartar}
        tamano="sm"
        className={cn('absolute right-0', primera ? 'top-0' : 'top-2')}
        onClick={() => {
          marcarLeida();
          descartar(a.id);
        }}
      />
    </li>
  );
}
