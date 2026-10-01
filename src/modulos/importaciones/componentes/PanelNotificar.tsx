import { BellRing } from 'lucide-react';
import { useState } from 'react';
import { rutas } from '@/app/rutas';
import type { EstadoImportacion, FechaISO, Importacion } from '@/dominio/tipos';
import { ETIQUETAS_ESTADO_IMPORTACION } from '@/config/aduanas';
import { useAcciones, useAhora, useMarca, useSel } from '@/estado';
import { plural } from '@/lib/formato';
import { selAvisosEstado, type DestinatarioAvisoVista } from '@/selectores';
import { avisar, Badge, Button, Checkbox, Dialog, Icono, Segmentado, Textarea } from '@/ui';
import { canalesDisponibles, eleccionInicial, mensajesDeAvisos, type CanalAviso, type EleccionAviso } from '../calculos';
import { ETIQUETAS_CANAL, ETIQUETAS_ROL_CONTACTO } from '../textos';
import { AccionesMensaje } from './AccionesMensaje';

/**
 * Panel "Notificar a" (W3): los destinatarios que DEBEN actuar en el estado al que pasó el pedido (matriz de
 * avisos), con el mensaje ya redactado (en usted; en inglés para la fábrica y nunca por la nacionalización), el canal
 * y los botones reales sin destinatario. "Enviar" deja los mensajes en la bandeja de salida como "Enviado
 * (simulación)": en la versión real saldrían por WhatsApp, correo o WeChat.
 */
export function PanelNotificar({
  imp,
  estado,
  fecha,
  abierto,
  alCambiar,
}: {
  imp: Importacion;
  estado: EstadoImportacion;
  fecha: FechaISO;
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
}) {
  if (!abierto) return null;
  return <PanelAbierto key={`${imp.id}-${estado}-${fecha}`} imp={imp} estado={estado} fecha={fecha} alCambiar={alCambiar} />;
}

function etiquetaRol(d: DestinatarioAvisoVista): string {
  if (d.tipo === 'bodega') return 'Bodega · equipo interno';
  if (d.tipo === 'fabrica') return 'Fábrica';
  if (d.tipo === 'agente_carga') return ETIQUETAS_ROL_CONTACTO.agente_carga;
  if (d.tipo === 'agente_aduanas') return ETIQUETAS_ROL_CONTACTO.agente_aduanas;
  if (d.tipo === 'transportador') return ETIQUETAS_ROL_CONTACTO.transportador;
  return 'Tú';
}

function PanelAbierto({ imp, estado, fecha, alCambiar }: { imp: Importacion; estado: EstadoImportacion; fecha: FechaISO; alCambiar: (a: boolean) => void }) {
  const marca = useMarca().nombre;
  const hora = useAhora().slice(11, 16);
  const acciones = useAcciones();
  const avisos = useSel(selAvisosEstado, { importacionId: imp.id, estado, marca, hora, fecha });
  const destinatarios = avisos?.destinatarios ?? [];
  const [elecciones, setElecciones] = useState<Record<string, EleccionAviso | undefined>>(() =>
    Object.fromEntries(destinatarios.map((d) => [d.tipo, eleccionInicial(d) ?? undefined])),
  );
  const [error, setError] = useState<string | null>(null);

  const cambiar = (tipo: string, parcial: Partial<EleccionAviso>) =>
    setElecciones((a) => {
      const actual = a[tipo];
      return actual ? { ...a, [tipo]: { ...actual, ...parcial } } : a;
    });
  const seleccionados = mensajesDeAvisos(imp.id, destinatarios, elecciones);

  const enviar = () => {
    if (seleccionados.length === 0) {
      alCambiar(false);
      return;
    }
    const r = acciones.registrarMensajes({ mensajes: seleccionados });
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    alCambiar(false);
    avisar({
      tipo: 'exito',
      texto: `${plural(seleccionados.length, 'aviso')} en la bandeja de salida`,
      detalle: 'Enviado (simulación)',
      accion: { texto: 'Ver bandeja', a: rutas.importacionPestana(imp.numero, 'mensajes') },
    });
  };

  return (
    <Dialog
      abierto
      alCambiar={alCambiar}
      ancho="xl"
      eyebrow={`${imp.numero} · ${ETIQUETAS_ESTADO_IMPORTACION[estado]}`}
      titulo="Notificar a"
      descripcion={avisos?.para ? `Para: ${avisos.para.charAt(0).toLowerCase()}${avisos.para.slice(1)}. Reporta: ${avisos.reporta.charAt(0).toLowerCase()}${avisos.reporta.slice(1)}.` : 'En este estado no hace falta avisar a nadie.'}
      data-testid="panel-notificar"
      pie={
        <>
          <span className="mr-auto t-small text-muted">Los avisos quedan en la bandeja de salida como “Enviado (simulación)”.</span>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Ahora no
          </Button>
          <Button onClick={enviar} data-testid="enviar-avisos" disabled={destinatarios.length === 0}>
            {seleccionados.length > 0 ? `Enviar ${plural(seleccionados.length, 'aviso')}` : 'Listo, sin enviar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="border-l-2 border-danger pl-3 t-small text-ink">{error}</p>}
        {avisos?.creaTributos && (
          <p className="border-l-2 border-accent pl-3 t-small text-ink">
            También se generó en Por pagar la cuenta de los tributos aduaneros. Valores de ejemplo · se validan con tu agente de aduanas.
          </p>
        )}
        {destinatarios.length === 0 && (
          <p className="t-body text-muted">En este estado no hay a quién avisar. Cuando cambie el estado, aquí aparecerán los avisos que correspondan.</p>
        )}
        {destinatarios.map((d) => {
          const e = elecciones[d.tipo];
          if (!e)
            return (
              <div key={d.tipo} className="flex items-start gap-3 border border-line bg-surface-2 p-4" data-testid={`aviso-${d.tipo}`}>
                <Icono icono={BellRing} tamano={18} className="mt-0.5 text-ink-2" />
                <div>
                  <p className="t-label font-bold text-ink">Tú · alerta en Inicio</p>
                  <p className="t-small text-muted">{avisos?.para ? `${avisos.para}.` : ''} No se manda un mensaje: te aparece como alerta en Inicio y en las notificaciones.</p>
                </div>
              </div>
            );
          const canales = canalesDisponibles(d);
          return (
            <section key={d.tipo} className="border border-line bg-surface p-4" data-testid={`aviso-${d.tipo}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Checkbox
                  marcado={e.incluir}
                  alCambiar={(v) => cambiar(d.tipo, { incluir: v })}
                  aria-label={`Avisar a ${d.nombre}`}
                  etiqueta={
                    <span>
                      <span className="font-bold text-ink">{d.nombre}</span>
                      <span className="ml-2 t-small text-muted">
                        {etiquetaRol(d)} · {d.empresa}
                      </span>
                    </span>
                  }
                />
                <div className="flex items-center gap-2">
                  <Badge tono={d.idioma === 'en' ? 'accent' : 'neutral'} tamano="sm">
                    {d.idioma === 'en' ? 'Inglés' : d.tratamiento === 'usted' ? 'Español · usted' : 'Español · tú'}
                  </Badge>
                  <Segmentado
                    etiqueta={`Canal para ${d.nombre}`}
                    tamano="sm"
                    valor={e.canal}
                    alCambiar={(v) => cambiar(d.tipo, { canal: v as CanalAviso })}
                    opciones={canales.map((c) => ({ valor: c, etiqueta: ETIQUETAS_CANAL[c] }))}
                  />
                </div>
              </div>
              <Textarea
                className="mt-3"
                etiqueta={`Mensaje para ${d.nombre}`}
                etiquetaOculta
                value={e.texto}
                onChange={(ev) => cambiar(d.tipo, { texto: ev.target.value })}
                rows={4}
                lang={d.idioma}
                data-testid={`texto-${d.tipo}`}
              />
              <AccionesMensaje
                className="mt-3 flex flex-wrap items-center gap-2"
                idBase={`aviso-${d.tipo}`}
                asunto={d.asunto}
                cuerpo={e.texto}
                canales={{ whatsapp: !!d.telefono, correo: !!d.correo, wechat: d.tipo === 'fabrica' || !!d.wechat }}
              />
            </section>
          );
        })}
      </div>
    </Dialog>
  );
}
