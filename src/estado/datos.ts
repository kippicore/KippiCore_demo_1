import { createStore, type StoreApi, useStore } from 'zustand';
import type {
  EntradaRegistro,
  EstadoDominio,
  FechaHoraISO,
  FechaISO,
  ResultadoComando,
  SobreComando,
} from '@/dominio/tipos';
import { fusionarRegistros } from '@/dominio/motor/registro';
import type * as MotorVivoModulo from '@/dominio/motor/vivo';
import { DEMO } from '@/config/demo';
import { modoAlmacen, type ModoAlmacen } from './almacen';
import { describirEntrada } from './describir';
import { emitirDominio, emitirRemota } from './eventos';
import {
  borrarRegistroYAncla,
  cargar,
  fijarAncla,
  guardarRegistro,
  leerRegistro,
} from './persistencia';
import { datosQrDeUrl, decodificarQr, type ResultadoQr } from './qr';
import { ahoraBogota } from './reloj';
import { difundir, iniciarSincronizacion } from './sincronizacion';
import { construirConMotor, type Medicion } from './worker/cliente';

/**
 * Store `useDatos` (PLAN 5.6, 5.7): estado de dominio, fase de carga, registro y las tres operaciones de
 * escritura (`ejecutar`, `reconstruir`, `restaurar`). Los componentes NO lo leen directamente: usan `useSel`,
 * `useAcciones` y los hooks de estado/hooks.ts. Los marcos (`?marco=1`) adoptan el store de la pestaña padre.
 */
export type FaseDatos = 'inicial' | 'construyendo' | 'listo' | 'error';

export interface EstadoDatos {
  estado: EstadoDominio | null;
  fase: FaseDatos;
  /** 0–100 durante la primera construcción. */
  progreso: number;
  /** Hay una reconstrucción en curso con el estado anterior visible (entrada remota, restaurar, actualizar). */
  reconstruyendo: boolean;
  error: string | null;
  ancla: FechaISO;
  /** Fecha real de la primera visita. */
  fijadaEn: FechaISO;
  registro: EntradaRegistro[];
  /** Avisos de persistencia para Configuración › Datos. */
  avisos: string[];
  modo: ModoAlmacen;
  /** Instante (`ahora`) hasta el que se construyó el estado. */
  construidoHasta: FechaHoraISO | null;
  medicion: Medicion | null;
  /** Lo que trajo el QR al abrir /app (chip de E1). */
  qr: ResultadoQr | null;
  iniciar: () => Promise<void>;
  ejecutar: (sobre: SobreComando) => ResultadoComando;
  reconstruir: () => Promise<void>;
  restaurar: () => Promise<void>;
}

type Api = StoreApi<EstadoDatos>;

/**
 * Motor en vivo (Immer + comandos + semilla) en un chunk diferido: se pide al arrancar, en paralelo con la
 * construcción en el worker, y está listo mucho antes de que el estado llegue (la carga inicial no lo paga).
 */
type MotorVivo = typeof MotorVivoModulo;
let motorVivo: MotorVivo | null = null;
let cargandoMotor: Promise<MotorVivo> | null = null;
function cargarMotorVivo(): Promise<MotorVivo> {
  cargandoMotor ??= import('@/dominio/motor/vivo').then((m) => {
    // En producción no se congela el estado (la congelación profunda costaría decenas de ms, 5.6.6).
    m.configurarCongelado(import.meta.env.DEV);
    motorVivo = m;
    return m;
  });
  return cargandoMotor;
}

function enMarco(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      window.parent !== window &&
      new URLSearchParams(window.location.search).get('marco') === '1'
    );
  } catch {
    return false;
  }
}

function storeDelPadre(): Api | null {
  if (!enMarco()) return null;
  try {
    return (window.parent as unknown as { __kcDatos?: Api }).__kcDatos ?? null;
  } catch {
    return null;
  }
}

/** Escuchas de "restaurar" de la sesión (estado/sesion.ts se registra aquí para no crear un ciclo). */
const alRestaurar = new Set<() => void>();
export function registrarAlRestaurar(f: () => void): void {
  alRestaurar.add(f);
}

function crearAlmacenDatos(): Api {
  // Cuenta de cambios del registro: si cambia durante una construcción, se reconstruye otra vez.
  let versionRegistro = 0;
  let construyendo: Promise<void> | null = null;
  let pendiente = false;
  let sincronizacionIniciada = false;

  const api = createStore<EstadoDatos>()((set, get) => {
    async function construir(primera: boolean): Promise<void> {
      if (construyendo) {
        pendiente = true;
        return construyendo;
      }
      const ejecutarUna = async () => {
        do {
          pendiente = false;
          const v = versionRegistro;
          const { ancla, registro } = get();
          const ahora = ahoraBogota();
          set(primera && !get().estado ? { fase: 'construyendo', progreso: 0 } : { reconstruyendo: true });
          try {
            const r = await construirConMotor(
              { ancla, ahora, semilla: DEMO.semilla, escala: DEMO.escala, registro },
              (p) => {
                if (!get().estado) set({ progreso: p });
              },
            );
            if (versionRegistro !== v) {
              pendiente = true;
              continue;
            }
            await cargarMotorVivo();
            set({
              estado: r.estado,
              fase: 'listo',
              progreso: 100,
              reconstruyendo: false,
              error: null,
              construidoHasta: ahora,
              medicion: r.medicion,
            });
          } catch (e) {
            set({
              fase: get().estado ? 'listo' : 'error',
              reconstruyendo: false,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        } while (pendiente);
      };
      construyendo = ejecutarUna().finally(() => {
        construyendo = null;
      });
      return construyendo;
    }

    function iniciarSinc(): void {
      if (sincronizacionIniciada) return;
      sincronizacionIniciada = true;
      iniciarSincronizacion({
        alRecibirEntrada: (ancla, entrada) => {
          if (ancla !== get().ancla) return;
          if (get().registro.some((e) => e.id === entrada.id)) return;
          versionRegistro++;
          set({ registro: fusionarRegistros(get().registro, [entrada]) });
          void construir(false).then(() => {
            emitirRemota({ entrada, texto: describirEntrada(entrada, get().estado) });
          });
        },
        alRestaurar: (ancla) => {
          versionRegistro++;
          set({ ancla, registro: [] });
          void construir(false);
        },
        alCambiarRegistroGuardado: () => {
          const guardado = leerRegistro(get().ancla);
          const nuevas = guardado.filter((e) => !get().registro.some((x) => x.id === e.id));
          if (nuevas.length === 0) return;
          versionRegistro++;
          set({ registro: fusionarRegistros(get().registro, nuevas) });
          void construir(false).then(() => {
            for (const entrada of nuevas) emitirRemota({ entrada, texto: describirEntrada(entrada, get().estado) });
          });
        },
      });
    }

    return {
      estado: null,
      fase: 'inicial',
      progreso: 0,
      reconstruyendo: false,
      error: null,
      ancla: '',
      fijadaEn: '',
      registro: [],
      avisos: [],
      modo: 'local',
      construidoHasta: null,
      medicion: null,
      qr: null,

      async iniciar() {
        if (get().fase !== 'inicial') return;
        set({ fase: 'construyendo' });
        void cargarMotorVivo();
        const c = cargar();
        let { ancla, entradas } = c;
        let qr: ResultadoQr | null = null;
        const datosQr = datosQrDeUrl();
        if (datosQr) {
          const contenido = await decodificarQr(datosQr);
          if (!contenido) qr = { resultado: 'invalido', entradas: 0, ancla: null };
          else if (entradas.length === 0) {
            ancla = contenido.ancla;
            entradas = contenido.entradas;
            fijarAncla(ancla);
            guardarRegistro(ancla, entradas);
            qr = { resultado: 'adoptado', entradas: contenido.entradas.length, ancla };
          } else if (contenido.ancla === ancla) {
            entradas = fusionarRegistros(entradas, contenido.entradas);
            guardarRegistro(ancla, entradas);
            qr = { resultado: 'fusionado', entradas: contenido.entradas.length, ancla };
          } else {
            qr = { resultado: 'otra_ancla', entradas: contenido.entradas.length, ancla: contenido.ancla };
          }
          try {
            history.replaceState(history.state, '', location.pathname + location.search);
          } catch {
            // sin history
          }
        }
        set({
          ancla,
          fijadaEn: c.fijadaEn,
          registro: entradas,
          avisos: c.avisos,
          modo: modoAlmacen(),
          qr,
        });
        iniciarSinc();
        await construir(true);
      },

      ejecutar(sobre) {
        const { estado, registro, ancla } = get();
        if (!estado || !motorVivo) {
          return {
            ok: false,
            error: { codigo: 'SIN_DATOS', mensaje: 'Los datos todavía se están preparando. Intenta en un momento.' },
          };
        }
        const r = motorVivo.aplicarEnVivo(estado, sobre);
        if (!r.ok) return r;
        let seq = 0;
        for (const e of registro) if (e.seq > seq) seq = e.seq;
        const entrada: EntradaRegistro = { ...sobre, seq: seq + 1 };
        versionRegistro++;
        const guardado = guardarRegistro(ancla, [...registro, entrada]);
        set({ estado: r.despues, registro: guardado, modo: modoAlmacen() });
        difundir({ tipo: 'entrada', ancla, entrada });
        emitirDominio(r.eventos, sobre);
        return r;
      },

      async reconstruir() {
        await construir(false);
      },

      async restaurar() {
        borrarRegistroYAncla();
        const c = cargar();
        versionRegistro++;
        set({ ancla: c.ancla, fijadaEn: c.fijadaEn, registro: [], avisos: [] });
        for (const f of alRestaurar) f();
        difundir({ tipo: 'restaurar', ancla: c.ancla });
        await construir(false);
      },
    };
  });
  return api;
}

const padre = storeDelPadre();

/** Store de datos (vanilla). Solo `estado/**` y `ui/conectados` lo usan directamente. */
export const almacenDatos: Api = padre ?? crearAlmacenDatos();
(globalThis as unknown as { __kcDatos?: Api }).__kcDatos = almacenDatos;
/** true en un marco que adoptó el store de la pestaña padre (no construye ni sincroniza). */
export const datosAdoptados = padre !== null;

export function useDatos<T>(selector: (s: EstadoDatos) => T): T {
  return useStore(almacenDatos, selector);
}

/** Estado de dominio actual (o null mientras se construye). */
export function estadoActual(): EstadoDominio | null {
  return almacenDatos.getState().estado;
}
