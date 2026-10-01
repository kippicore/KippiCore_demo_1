import { Mail, MessageCircle, MessageSquareText, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import type { Contacto, Proveedor } from '@/dominio/tipos';
import { useAcciones, useMarca } from '@/estado';
import { enlaceCorreo, enlaceWhatsapp, textoWechat } from '@/lib/enlaces';
import { Badge, BotonIcono, Button, Card, ConfirmarEliminacion, EmptyState, ItemMenu, Menu, avisar } from '@/ui';
import { saludoContacto } from '../calculos';
import { CANALES, ROLES_CONTACTO } from '../textos';
import { FormularioContacto } from './FormularioContacto';

/**
 * Contactos del proveedor: a quién escribirle y por dónde. Los enlaces nunca llevan destinatario (el que escribe
 * elige a quién), los textos van en inglés para las fábricas y WeChat es simulado ("Copiar para WeChat").
 */
export function Contactos({ proveedor, contactos }: { proveedor: Proveedor; contactos: readonly Contacto[] }) {
  const acciones = useAcciones();
  const marca = useMarca();
  const [formulario, setFormulario] = useState<{ contacto: Contacto | null } | null>(null);
  const [eliminar, setEliminar] = useState<Contacto | null>(null);

  const copiarWechat = async (c: Contacto) => {
    try {
      await navigator.clipboard.writeText(textoWechat(saludoContacto(c, marca.nombre)));
      avisar({ texto: 'Mensaje copiado para pegarlo en WeChat', detalle: c.wechat ? `ID de WeChat de ejemplo: ${c.wechat}` : undefined });
    } catch {
      avisar({ tipo: 'alerta', texto: 'No pudimos copiar el mensaje', detalle: 'Tu navegador no dejó acceder al portapapeles.' });
    }
  };

  const confirmarEliminar = () => {
    if (!eliminar) return;
    const c = eliminar;
    const r = acciones.eliminarContacto({ contactoId: c.id });
    setEliminar(null);
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ texto: `${c.nombre} ya no es contacto de ${proveedor.nombreCorto}` });
  };

  return (
    <Card
      titulo="Contactos"
      data-testid="ficha-contactos"
      accion={
        <Button variante="ghost" tamano="sm" icono={Plus} onClick={() => setFormulario({ contacto: null })} data-testid="agregar-contacto">
          Agregar contacto
        </Button>
      }
    >
      {contactos.length === 0 ? (
        <EmptyState
          tamano="compacto"
          icono={UserRound}
          titulo="Aún no tienes un contacto aquí"
          texto="Agrega a la persona que te atiende para tener a mano su WhatsApp, su correo y su WeChat."
          accion={
            <Button variante="secondary" tamano="sm" onClick={() => setFormulario({ contacto: null })}>
              Agregar contacto
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line-soft">
          {contactos.map((c) => (
            <li key={c.id} className="py-4 first:pt-0 last:pb-0" data-testid={`contacto-${c.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate t-body font-bold text-ink">{c.nombre}</p>
                  <p className="truncate t-small text-muted">{c.empresa}</p>
                </div>
                <Badge tono="outline" tamano="sm">
                  {ROLES_CONTACTO[c.rol]}
                </Badge>
              </div>
              <dl className="mt-2 grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-1 t-small">
                <dt className="text-muted">WhatsApp</dt>
                <dd className="num text-ink">{c.whatsapp}</dd>
                <dt className="text-muted">Correo</dt>
                <dd className="truncate text-ink">{c.correo}</dd>
                {c.wechat && (
                  <>
                    <dt className="text-muted">WeChat</dt>
                    <dd className="truncate text-ink">{c.wechat}</dd>
                  </>
                )}
                <dt className="text-muted">Prefiere</dt>
                <dd className="text-ink">
                  {CANALES[c.canalPreferido]} · {c.idioma === 'en' ? 'inglés' : 'español'}, {c.tratamiento === 'usted' ? 'de usted' : 'de tú'}
                </dd>
              </dl>
              <div className="mt-3 flex items-center gap-1">
                <Menu
                  alinear="start"
                  disparador={
                    <Button variante="secondary" tamano="sm" data-testid={`escribir-${c.id}`}>
                      Escribir
                    </Button>
                  }
                >
                  <ItemMenu icono={MessageCircle} onSelect={() => window.open(enlaceWhatsapp(saludoContacto(c, marca.nombre)), '_blank', 'noopener,noreferrer')}>
                    Abrir en WhatsApp
                  </ItemMenu>
                  <ItemMenu
                    icono={Mail}
                    onSelect={() => window.open(enlaceCorreo(c.idioma === 'en' ? `Follow-up from ${marca.nombre}` : `Seguimiento de ${marca.nombre}`, saludoContacto(c, marca.nombre)), '_blank', 'noopener,noreferrer')}
                  >
                    Abrir en correo
                  </ItemMenu>
                  <ItemMenu icono={MessageSquareText} onSelect={() => void copiarWechat(c)}>
                    Copiar para WeChat
                  </ItemMenu>
                </Menu>
                <span className="flex-1" />
                <BotonIcono icono={Pencil} etiqueta={`Editar a ${c.nombre}`} tamano="sm" variante="ghost" onClick={() => setFormulario({ contacto: c })} />
                <BotonIcono icono={Trash2} etiqueta={`Eliminar a ${c.nombre}`} tamano="sm" variante="ghost" onClick={() => setEliminar(c)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <FormularioContacto abierto={formulario !== null} alCambiar={(a) => !a && setFormulario(null)} proveedor={proveedor} contacto={formulario?.contacto ?? null} />
      <ConfirmarEliminacion
        abierto={eliminar !== null}
        alCambiar={(a) => !a && setEliminar(null)}
        pregunta={eliminar ? `¿Eliminar a ${eliminar.nombre}?` : ''}
        consecuencias={eliminar ? `Dejará de aparecer como contacto de ${proveedor.nombreCorto}. Los mensajes que ya le enviaste se conservan en la bandeja de salida.` : ''}
        accion="Eliminar contacto"
        alConfirmar={confirmarEliminar}
        nota={null}
      />
    </Card>
  );
}
