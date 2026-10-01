import { MARCA } from '@/config/marca';
import { enlaceHablarConKippicore } from '@/lib/enlaces';

/**
 * "Hablar con KippiCore" (PLAN 2.4, 2.8): `wa.me` al número de Miguel cuando está configurado
 * (`MARCA.hablarConKippicore.whatsapp`, solo dígitos con indicativo). Si no lo está, el enlace NO lleva destinatario
 * (`wa.me/?text=…`): WhatsApp deja elegir a quién, y la demo nunca inventa un número ni le escribe a nadie.
 */
export function enlaceHablar(): string {
  return enlaceHablarConKippicore() ?? `https://wa.me/?text=${encodeURIComponent(MARCA.hablarConKippicore.texto)}`;
}

/** ¿Hay un número real configurado? */
export function hayNumeroKippicore(): boolean {
  return enlaceHablarConKippicore() !== null;
}
