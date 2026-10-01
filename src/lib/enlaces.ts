import { MARCA } from '@/config/marca';
import { SUFIJO_PRUEBA } from '@/config/textos/mensajes';

/**
 * Enlaces de mensajería (PLAN R14, 8.11.5, C18). Los de clientes, empleados y contactos NUNCA llevan
 * destinatario: `https://wa.me/?text=…` y `mailto:?subject=…&body=…`; el usuario elige a quién, nada se envía
 * solo. Todos los textos prellenados terminan con "(mensaje de prueba desde la demo de KippiCore)".
 * La única excepción es "Hablar con KippiCore" (número de Miguel, configurable en config/marca.ts).
 */
export function conSufijo(texto: string): string {
  const t = texto.trimEnd();
  return t.endsWith(SUFIJO_PRUEBA) ? t : `${t}\n\n${SUFIJO_PRUEBA}`;
}

/** WhatsApp sin destinatario. */
export function enlaceWhatsapp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(conSufijo(texto))}`;
}

/** Correo sin destinatario. */
export function enlaceCorreo(asunto: string, cuerpo: string): string {
  return `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(conSufijo(cuerpo))}`;
}

/** Texto para "Copiar para WeChat" (simulado): el mismo mensaje con el sufijo. */
export function textoWechat(texto: string): string {
  return conSufijo(texto);
}

/** "Hablar con KippiCore" (2.6): el único enlace con número. null si no está configurado. */
export function enlaceHablarConKippicore(): string | null {
  const n = MARCA.hablarConKippicore.whatsapp;
  if (!n) return null;
  return `https://wa.me/${n.replace(/\D/g, '')}?text=${encodeURIComponent(MARCA.hablarConKippicore.texto)}`;
}
