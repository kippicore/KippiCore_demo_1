import { Copy, Mail, MessageCircle } from 'lucide-react';
import { enlaceCorreo, enlaceWhatsapp, textoWechat } from '@/lib/enlaces';
import { avisar, clasesBoton, Icono } from '@/ui';

/**
 * Los tres botones reales de un mensaje (W3, R14): "Abrir en WhatsApp" (`wa.me` con el texto), "Abrir en correo"
 * (`mailto:` con asunto y cuerpo) y "Copiar para WeChat". Ninguno lleva destinatario: el usuario elige a quién; todos
 * terminan con "(mensaje de prueba desde la demo de KippiCore)". Nada se envía solo.
 */
export interface PropsAccionesMensaje {
  asunto: string | null;
  cuerpo: string;
  /** Qué canales se ofrecen según los datos del destinatario. */
  canales: { whatsapp: boolean; correo: boolean; wechat: boolean };
  idBase: string;
  className?: string;
}

export async function copiarParaWechat(cuerpo: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(textoWechat(cuerpo));
    return true;
  } catch {
    return false;
  }
}

export function AccionesMensaje({ asunto, cuerpo, canales, idBase, className }: PropsAccionesMensaje) {
  const copiar = async () => {
    const ok = await copiarParaWechat(cuerpo);
    avisar(
      ok
        ? { tipo: 'exito', texto: 'Mensaje copiado. Pégalo en WeChat.' }
        : { tipo: 'alerta', texto: 'No pudimos copiarlo automáticamente.', detalle: 'Selecciona el texto del mensaje y cópialo a mano.' },
    );
  };
  const clase = clasesBoton({ variante: 'secondary', tamano: 'sm' });
  return (
    <div className={className ?? 'flex flex-wrap items-center gap-2'}>
      {canales.whatsapp && (
        <a className={clase} href={enlaceWhatsapp(cuerpo)} target="_blank" rel="noreferrer" data-testid={`${idBase}-whatsapp`}>
          <Icono icono={MessageCircle} tamano={14} />
          Abrir en WhatsApp
        </a>
      )}
      {canales.correo && (
        <a className={clase} href={enlaceCorreo(asunto ?? '', cuerpo)} data-testid={`${idBase}-correo`}>
          <Icono icono={Mail} tamano={14} />
          Abrir en correo
        </a>
      )}
      {canales.wechat && (
        <button type="button" className={clase} onClick={() => void copiar()} data-testid={`${idBase}-wechat`}>
          <Icono icono={Copy} tamano={14} />
          Copiar para WeChat
        </button>
      )}
    </div>
  );
}
