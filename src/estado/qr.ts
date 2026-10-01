import type { EntradaRegistro, FechaISO, TipoComando } from '@/dominio/tipos';
import { DEMO } from '@/config/demo';

/**
 * QR de la app del dueño (PLAN 5.6.8, 5.13): `/app#r=<datos>` con las últimas 1–3 entradas de negocio del
 * registro. `datos` = 'z' + base64url(deflate-raw(JSON({ ancla, entradas }))); si el texto pasa de ~300
 * caracteres solo viaja la última venta; sin CompressionStream, 'j' + base64url(JSON) de la última venta.
 */
export interface ContenidoQr {
  ancla: FechaISO;
  entradas: EntradaRegistro[];
}

const TIPOS_NEGOCIO: readonly TipoComando[] = [
  'venta.registrar',
  'traslado.solicitar',
  'aprobacion.resolver',
  'importacion.cambiarEstado',
];

function aBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto: string): Uint8Array {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const r = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) r[i] = bin.charCodeAt(i);
  return r;
}

async function transformar(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const salida = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(salida).arrayBuffer());
}

const hayCompresion = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

async function empacar(c: ContenidoQr): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(c));
  if (!hayCompresion()) return `j${aBase64Url(json)}`;
  return `z${aBase64Url(await transformar(json, new CompressionStream('deflate-raw')))}`;
}

/** Últimas entradas de negocio del registro (1–3) que caben en el QR; si no, la última venta. */
export async function codificarQr(ancla: FechaISO, registro: readonly EntradaRegistro[]): Promise<string | null> {
  const negocio = registro.filter((e) => TIPOS_NEGOCIO.includes(e.comando.tipo));
  if (negocio.length === 0) return null;
  const ultimaVenta = [...negocio].reverse().find((e) => e.comando.tipo === 'venta.registrar');
  if (hayCompresion()) {
    for (const n of [3, 2, 1]) {
      const t = await empacar({ ancla, entradas: negocio.slice(-n) });
      if (t.length <= DEMO.largoMaximoQr) return t;
    }
  }
  if (!ultimaVenta) return null;
  return empacar({ ancla, entradas: [ultimaVenta] });
}

export async function decodificarQr(datos: string): Promise<ContenidoQr | null> {
  try {
    const tipo = datos[0];
    const cuerpo = deBase64Url(datos.slice(1));
    const json = tipo === 'z' ? await transformar(cuerpo, new DecompressionStream('deflate-raw')) : cuerpo;
    const c = JSON.parse(new TextDecoder().decode(json)) as ContenidoQr;
    if (typeof c.ancla !== 'string' || !Array.isArray(c.entradas)) return null;
    return c;
  } catch {
    return null;
  }
}

/** Datos del hash `#r=` de la URL actual (o null). */
export function datosQrDeUrl(): string | null {
  try {
    const h = globalThis.location?.hash ?? '';
    const m = /^#r=([A-Za-z0-9_-]+)$/.exec(h);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/** URL de la app del dueño con las últimas acciones en el hash. */
export function urlAppConAcciones(origen: string, datos: string | null, hoy: string | null): string {
  const q = hoy ? `?hoy=${encodeURIComponent(hoy)}` : '';
  return `${origen}/app${q}${datos ? `#r=${datos}` : ''}`;
}

/**
 * Cómo se aplicó lo que traía el QR (chip "Datos de ejemplo de este celular", E1):
 * 'adoptado' (sin registro: se adoptaron ancla y entradas), 'fusionado' (mismo ancla), 'otra_ancla' (no se mezcla).
 */
export interface ResultadoQr {
  resultado: 'adoptado' | 'fusionado' | 'otra_ancla' | 'invalido';
  entradas: number;
  ancla: FechaISO | null;
}
