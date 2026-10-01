import { UserPlus, Users, X } from 'lucide-react';
import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import type { Importacion } from '@/dominio/tipos';
import { useAcciones, usePuede, useSel } from '@/estado';
import { celular } from '@/lib/formato';
import { avisar, Avatar, Badge, Button, EmptyState, Select } from '@/ui';
import { selContactosCadena } from '../selectores';
import { ETIQUETAS_CANAL, ETIQUETAS_ROL_CONTACTO } from '../textos';

/** Cadena de este pedido: quiénes aparecen preseleccionados en "Notificar a" y por qué canal prefieren recibir los avisos. */
export function TabContactos({ imp }: { imp: Importacion }) {
  const acciones = useAcciones();
  const puede = usePuede();
  const todos = useSel(selContactosCadena);
  const editable = puede('importacion.editar');
  const delPedido = imp.contactoIds
    .map((id) => todos.find((f) => f.contacto.id === id))
    .filter((f): f is NonNullable<typeof f> => !!f);
  const disponibles = todos.filter(
    (f) =>
      !imp.contactoIds.includes(f.contacto.id) &&
      (f.contacto.rol !== 'proveedor' || f.contacto.proveedorId === imp.proveedorId),
  );

  const guardar = (ids: string[], texto: string) => {
    const r = acciones.editarImportacion({ importacionId: imp.id, cambios: { contactoIds: ids } });
    if (!r.ok) avisar({ tipo: 'error', texto: r.error.mensaje });
    else avisar({ tipo: 'exito', texto });
  };

  return (
    <div className="space-y-4" data-testid="tab-contactos">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-[60ch] t-body text-muted">
          Estas personas reciben los avisos de este pedido cuando cambia de estado: la fábrica en inglés, la
          cadena en usted.
        </p>
        <Link
          to={rutas.contactosCadena()}
          className="t-label font-bold text-ink underline-offset-4 hover:underline"
        >
          Ver todo el directorio
        </Link>
      </div>
      {delPedido.length === 0 ? (
        <div className="border border-line bg-surface">
          <EmptyState
            tamano="tabla"
            icono={Users}
            titulo="Este pedido todavía no tiene contactos"
            texto="Agrega a la fábrica, al agente de carga, al agente de aduanas y al transportador para que aparezcan en “Notificar a”."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line-soft border border-line bg-surface">
          {delPedido.map((f) => (
            <li
              key={f.contacto.id}
              className="flex flex-wrap items-center gap-4 p-4"
              data-testid={`contacto-${f.contacto.id}`}
            >
              <Avatar nombre={f.contacto.nombre} tamano={40} />
              <div className="min-w-0 flex-1">
                <p className="t-label font-bold text-ink">{f.contacto.nombre}</p>
                <p className="t-small text-muted">
                  {f.contacto.empresa} · {f.contacto.pais}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tono="outline" tamano="sm">
                  {ETIQUETAS_ROL_CONTACTO[f.contacto.rol]}
                </Badge>
                <Badge tono="neutral" tamano="sm">
                  {f.contacto.idioma === 'en'
                    ? 'Inglés'
                    : f.contacto.tratamiento === 'usted'
                      ? 'En usted'
                      : 'En tú'}
                </Badge>
                <span className="t-small text-muted">
                  Prefiere {ETIQUETAS_CANAL[f.contacto.canalPreferido]}
                </span>
              </div>
              <div className="hidden t-small text-muted desk:block">
                <p className="num">{f.contacto.whatsapp ? celular(f.contacto.whatsapp) : ''}</p>
                <p>{f.contacto.correo}</p>
              </div>
              {editable && (
                <Button
                  variante="ghost"
                  tamano="sm"
                  icono={X}
                  onClick={() =>
                    guardar(
                      imp.contactoIds.filter((x) => x !== f.contacto.id),
                      `${f.contacto.nombre} salió de este pedido`,
                    )
                  }
                >
                  Quitar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && disponibles.length > 0 && (
        <div className="flex items-end gap-3">
          <Select
            className="w-[360px]"
            etiqueta="Agregar a este pedido"
            placeholder="Elige un contacto"
            valor={null}
            alCambiar={(id) => guardar([...imp.contactoIds, id], 'Contacto agregado al pedido')}
            opciones={disponibles.map((f) => ({
              valor: f.contacto.id,
              etiqueta: `${f.contacto.nombre} · ${ETIQUETAS_ROL_CONTACTO[f.contacto.rol]}`,
            }))}
          />
          <span className="pb-2 t-small text-muted inline-flex items-center gap-1">
            <UserPlus size={14} aria-hidden /> Lo ves enseguida en “Notificar a”.
          </span>
        </div>
      )}
    </div>
  );
}
