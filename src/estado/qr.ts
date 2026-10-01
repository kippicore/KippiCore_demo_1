import type { EntradaRegistro, FechaISO, Id, SobreComando, TipoComando } from '@/dominio/tipos';
import { USUARIOS_SISTEMA } from '@/dominio/tipos';
import { DEMO } from '@/config/demo';
import { PERSONAS_ROL } from '@/config/permisos';

/**
 * QR de la app del dueño (PLAN 5.6.8, 5.13): `/app#r=<datos>` con las últimas 1–3 entradas de NEGOCIO del
 * registro (venta, traslado, aprobación, cambio de estado de importación). Si el texto pasa de ~300 caracteres
 * (límite para un QR legible desde una pantalla), solo viaja la última venta.
 *
 * Formato compacto (para que una venta quepa): `[ancla, [entrada…]]` con cada entrada como
 * `[id, ts, marcaAgua, rol, seq, tipo, datos, usuarioId?]` (las horas del día del ancla sin la fecha, el tipo con
 * una letra, los datos SIN nulos y con claves abreviadas; al decodificar se restauran los nulos con el esqueleto
 * del comando). Luego `deflate-raw` + base64url con prefijo 'z' ('j' sin CompressionStream, sin comprimir).
 */
export interface ContenidoQr {
  ancla: FechaISO;
  entradas: EntradaRegistro[];
}

const TIPOS: Record<string, TipoComando> = {
  V: 'venta.registrar',
  T: 'traslado.solicitar',
  A: 'aprobacion.resolver',
  I: 'importacion.cambiarEstado',
};
const LETRA = Object.fromEntries(Object.entries(TIPOS).map(([k, v]) => [v, k])) as Record<string, string>;
const TIPOS_NEGOCIO = Object.values(TIPOS);

/** Claves abreviadas (las de los cuatro comandos de negocio). */
const CLAVES: Record<string, string> = {
  ventaId: 'v',
  localId: 'l',
  vendedorId: 'e',
  canal: 'c',
  tipo: 't',
  clienteId: 'k',
  clienteNuevo: 'K',
  lineas: 'L',
  varianteId: 'a',
  cantidad: 'n',
  precioLista: 'P',
  descuento: 'D',
  descuentoGlobal: 'G',
  aprobacionDescuentoId: 'Q',
  pagos: 'p',
  medio: 'm',
  valor: '$',
  recibido: 'r',
  referencia: 'f',
  sesionCajaId: 's',
  bonoId: 'b',
  fechaLimiteSeparado: 'F',
  ventaOrigenCambioId: 'C',
  facturaInmediata: 'X',
  nota: 'N',
  trasladoId: 'T',
  origenId: 'o',
  destinoId: 'd',
  motivo: 'M',
  requiereAprobacion: 'R',
  solicitudId: 'S',
  decision: 'x',
  importacionId: 'i',
  estado: 'E',
  fecha: 'h',
  origen: 'O',
  autor: 'A',
};
const CLAVES_INV = Object.fromEntries(Object.entries(CLAVES).map(([k, v]) => [v, k])) as Record<string, string>;

/** Campos que pueden ser null en cada comando (se restauran al decodificar). */
const NULOS: Record<string, { raiz: string[]; listas?: Record<string, string[]> }> = {
  'venta.registrar': {
    raiz: ['ts', 'clienteId', 'clienteNuevo', 'descuentoGlobal', 'aprobacionDescuentoId', 'fechaLimiteSeparado', 'ventaOrigenCambioId', 'facturaInmediata', 'nota'],
    listas: { lineas: ['precioLista', 'descuento'], pagos: ['recibido', 'referencia', 'sesionCajaId', 'bonoId'] },
  },
  'traslado.solicitar': { raiz: ['motivo', 'solicitudId'] },
  'aprobacion.resolver': { raiz: ['nota'] },
  'importacion.cambiarEstado': { raiz: ['nota', 'autor'] },
};

function compactar(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(compactar);
  if (x && typeof x === 'object') {
    const r: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) if (v !== null && v !== undefined) r[CLAVES[k] ?? k] = compactar(v);
    return r;
  }
  return x;
}

function expandir(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(expandir);
  if (x && typeof x === 'object') {
    const r: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) r[CLAVES_INV[k] ?? k] = expandir(v);
    return r;
  }
  return x;
}

function restaurarNulos(tipo: TipoComando, datos: Record<string, unknown>): Record<string, unknown> {
  const n = NULOS[tipo];
  if (!n) return datos;
  for (const k of n.raiz) if (!(k in datos)) datos[k] = null;
  for (const [lista, campos] of Object.entries(n.listas ?? {})) {
    const items = datos[lista];
    if (Array.isArray(items)) for (const it of items as Record<string, unknown>[]) for (const c of campos) if (!(c in it)) it[c] = null;
  }
  return datos;
}

function usuarioDeRol(rol: SobreComando['rol']): Id {
  if (rol === 'portal') return USUARIOS_SISTEMA.portalAduanas;
  if (rol === 'tienda') return USUARIOS_SISTEMA.tiendaWeb;
  if (rol === 'sistema') return USUARIOS_SISTEMA.sistema;
  return PERSONAS_ROL[rol].usuarioId;
}

const corto = (ts: string, ancla: FechaISO) => (ts.startsWith(`${ancla}T`) ? ts.slice(11) : ts);
const largo = (ts: string, ancla: FechaISO) => (ts.length <= 8 ? `${ancla}T${ts}` : ts);

function aCompacto(c: ContenidoQr): unknown {
  return [
    c.ancla,
    c.entradas.map((e) => {
      const fila: unknown[] = [e.id, corto(e.ts, c.ancla), corto(e.marcaAgua, c.ancla), e.rol, e.seq, LETRA[e.comando.tipo] ?? e.comando.tipo, compactar(e.comando.datos)];
      if (e.usuarioId !== usuarioDeRol(e.rol)) fila.push(e.usuarioId);
      return fila;
    }),
  ];
}

function deCompacto(x: unknown): ContenidoQr | null {
  if (!Array.isArray(x) || typeof x[0] !== 'string' || !Array.isArray(x[1])) return null;
  const ancla = x[0];
  const entradas: EntradaRegistro[] = [];
  for (const f of x[1] as unknown[][]) {
    const [id, ts, marca, rol, seq, t, datos, usuarioId] = f as [string, string, string, SobreComando['rol'], number, string, unknown, string?];
    const tipo = TIPOS[t] ?? (t as TipoComando);
    entradas.push({
      id,
      ts: largo(ts, ancla),
      marcaAgua: largo(marca, ancla),
      usuarioId: usuarioId ?? usuarioDeRol(rol),
      rol,
      origen: 'usuario',
      seq,
      comando: { tipo, datos: restaurarNulos(tipo, expandir(datos) as Record<string, unknown>) } as SobreComando['comando'],
    });
  }
  return { ancla, entradas };
}

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
  const json = new TextEncoder().encode(JSON.stringify(aCompacto(c)));
  if (!hayCompresion()) return `j${aBase64Url(json)}`;
  const z = `z${aBase64Url(await transformar(json, new CompressionStream('deflate-raw')))}`;
  const j = `j${aBase64Url(json)}`;
  return z.length <= j.length ? z : j;
}

/** Últimas entradas de negocio del registro (1–3) que caben en el QR; si no caben, la última venta. */
export async function codificarQr(ancla: FechaISO, registro: readonly EntradaRegistro[]): Promise<string | null> {
  const negocio = registro.filter((e) => TIPOS_NEGOCIO.includes(e.comando.tipo));
  if (negocio.length === 0) return null;
  for (const n of [3, 2, 1]) {
    if (negocio.length < n) continue;
    const t = await empacar({ ancla, entradas: negocio.slice(-n) });
    if (t.length <= DEMO.largoMaximoQr) return t;
  }
  const ultimaVenta = [...negocio].reverse().find((e) => e.comando.tipo === 'venta.registrar');
  return ultimaVenta ? empacar({ ancla, entradas: [ultimaVenta] }) : null;
}

export async function decodificarQr(datos: string): Promise<ContenidoQr | null> {
  try {
    const tipo = datos[0];
    const cuerpo = deBase64Url(datos.slice(1));
    const json = tipo === 'z' ? await transformar(cuerpo, new DecompressionStream('deflate-raw')) : cuerpo;
    return deCompacto(JSON.parse(new TextDecoder().decode(json)));
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

/** URL de la app del dueño con las últimas acciones en el hash (y `?hoy=` si la pestaña lo tiene, 5.9). */
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
