import type { EstadoImportacion, EventoVista, FechaISO, HitoImportacion, Importacion } from '@/dominio/tipos';
import { ESTADOS_IMPORTACION } from '@/dominio/tipos';
import { DENOMINACIONES } from '@/config/negocio';
import { diaSemana, diferenciaDias } from '@/dominio/reglas/fechas';
import { DIAS, MESES, fechaCorta, hora, numero } from '@/lib/formato';

/**
 * Cálculos de PRESENTACIÓN de la app del dueño (E1). Ninguno reimplementa una regla de negocio: ordenan, agrupan y
 * escalan lo que ya calcularon los selectores (filas del arqueo, alturas de las barras, días de la agenda, hitos).
 */

// ---------------------------------------------------------------------------------------------------------
// Arqueo por denominación (W11)
// ---------------------------------------------------------------------------------------------------------
export interface FilaArqueo {
  /** '100000' · … · 'monedas'. */
  clave: string;
  etiqueta: string;
  /** Billetes contados (null en monedas: se cuentan por valor). */
  cantidad: number | null;
  /** Valor que aporta a lo contado. */
  subtotal: number;
}

/** Filas del arqueo de mayor a menor denominación, sin las que quedaron en cero. Σ subtotal = efectivo contado. */
export function filasArqueo(denominaciones: Record<string, number>): FilaArqueo[] {
  const r: FilaArqueo[] = [];
  for (const clave of DENOMINACIONES) {
    const n = denominaciones[clave] ?? 0;
    if (!n) continue;
    if (clave === 'monedas') r.push({ clave, etiqueta: 'Monedas', cantidad: null, subtotal: n });
    else r.push({ clave, etiqueta: String(Number(clave)), cantidad: n, subtotal: Number(clave) * n });
  }
  return r;
}

// ---------------------------------------------------------------------------------------------------------
// Barras táctiles
// ---------------------------------------------------------------------------------------------------------
/** Altura de cada barra (0–1) respecto de la mayor; las negativas o nulas quedan en 0 y la mayor llena el alto. */
export function alturasRelativas(valores: readonly number[]): number[] {
  const max = Math.max(0, ...valores);
  return valores.map((v) => (max > 0 && v > 0 ? v / max : 0));
}

/** Índice de la barra bajo un punto horizontal `x` (0–ancho) en un gráfico de `n` barras. */
export function indiceBajoPunto(x: number, ancho: number, n: number): number {
  if (n <= 0 || ancho <= 0) return 0;
  return Math.max(0, Math.min(n - 1, Math.floor((x / ancho) * n)));
}

/** Cuáles etiquetas del eje X se muestran para que no se encimen (máx. `max`, siempre la primera y la última). */
export function etiquetasVisibles(n: number, max = 6): Set<number> {
  if (n <= max) return new Set(Array.from({ length: n }, (_, i) => i));
  const paso = Math.ceil((n - 1) / (max - 1));
  const s = new Set<number>();
  for (let i = 0; i < n; i += paso) s.add(i);
  s.add(n - 1);
  // Si la penúltima quedó pegada a la última, se quita.
  const ult = n - 1;
  const ant = [...s].filter((i) => i !== ult).sort((a, b) => b - a)[0];
  if (ant !== undefined && ult - ant < paso / 2) s.delete(ant);
  return s;
}

/** "3 p. m." para el eje de horas (hora entera). */
export function etiquetaHora(h: number): string {
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

// ---------------------------------------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------------------------------------
export interface DiaAgenda {
  fecha: FechaISO;
  /** "Hoy" · "Mañana" · "Viernes 3 de octubre". */
  titulo: string;
  eventos: EventoVista[];
}

/** Agrupa los eventos por día (en orden) con el título del día en palabras. Los de varios días se ubican en su inicio. */
export function agruparPorDia(eventos: readonly EventoVista[], hoy: FechaISO): DiaAgenda[] {
  const dias = new Map<FechaISO, EventoVista[]>();
  const ordenados = [...eventos].sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0));
  for (const ev of ordenados) {
    const f = ev.inicio.slice(0, 10) < hoy ? hoy : ev.inicio.slice(0, 10);
    const l = dias.get(f);
    if (l) l.push(ev);
    else dias.set(f, [ev]);
  }
  return [...dias.entries()].map(([fecha, lista]) => ({ fecha, titulo: tituloDia(fecha, hoy), eventos: lista }));
}

export function tituloDia(fecha: FechaISO, hoy: FechaISO): string {
  const d = diferenciaDias(hoy, fecha);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  const dia = DIAS[diaSemana(fecha)] ?? '';
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${Number(fecha.slice(8, 10))} de ${MESES[Number(fecha.slice(5, 7)) - 1]}`;
}

/** "11:00 a. m." o "Todo el día". */
export function horaEvento(ev: Pick<EventoVista, 'inicio' | 'todoElDia'>): string {
  return ev.todoElDia ? 'Todo el día' : hora(ev.inicio);
}

// ---------------------------------------------------------------------------------------------------------
// Importaciones: hitos
// ---------------------------------------------------------------------------------------------------------
export interface PasoHito {
  estado: EstadoImportacion;
  /** 'hecho' | 'actual' | 'pendiente' */
  situacion: 'hecho' | 'actual' | 'pendiente';
  estimada: FechaISO;
  real: FechaISO | null;
  /** Días de diferencia entre lo real y lo estimado (+ tarde, − antes); null si aún no llega. */
  desviacion: number | null;
  /** Días que lleva vencido un paso que no se alcanzó. */
  vencidoDias: number;
  nota: string | null;
  porPortal: boolean;
}

/** Hitos de los 13 estados con su situación frente al estado actual. */
export function pasosHito(estadoActual: EstadoImportacion, hitos: Record<EstadoImportacion, HitoImportacion>, hoy: FechaISO): PasoHito[] {
  const actual = ESTADOS_IMPORTACION.indexOf(estadoActual);
  return ESTADOS_IMPORTACION.map((e, i) => {
    const h = hitos[e];
    const alcanzado = i <= actual;
    return {
      estado: e,
      situacion: i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente',
      estimada: h.estimada,
      real: alcanzado ? (h.real ?? h.estimada) : null,
      desviacion: alcanzado && h.real ? diferenciaDias(h.estimada, h.real) : null,
      vencidoDias: !alcanzado ? Math.max(0, diferenciaDias(h.estimada, hoy)) : 0,
      nota: h.nota,
      porPortal: h.actualizadoPor === 'portal-aduanas',
    };
  });
}

/** "Carga consolidada · 5,4 m³", "Contenedor de 20 pies" o "Carga aérea · 180 kg". */
export function textoCarga(carga: Importacion['carga']): string {
  if (carga.tipo === 'consolidada') return `Carga consolidada · ${numero(carga.m3, 1)} m³`;
  if (carga.tipo === 'contenedor') return `Contenedor de ${carga.pies} pies`;
  return `Carga aérea · ${numero(carga.kg)} kg`;
}

// ---------------------------------------------------------------------------------------------------------
// Varios
// ---------------------------------------------------------------------------------------------------------
/** Fecha de una venta para la lista: "Hoy, 3:45 p. m." o "29 sep, 3:45 p. m." */
export function momentoVenta(ts: string, hoy: FechaISO): string {
  return ts.slice(0, 10) === hoy ? `Hoy, ${hora(ts)}` : `${fechaCorta(ts)}, ${hora(ts)}`;
}

/** Nombre corto del local para el encabezado ("Parque 93"); 'todos' → "Todos". */
export function nombreCortoLocal(id: string, nombres: Record<string, string>): string {
  return id === 'todos' ? 'Todos' : (nombres[id] ?? id);
}
