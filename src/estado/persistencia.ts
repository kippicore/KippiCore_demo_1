import type { EntradaRegistro, FechaISO } from '@/dominio/tipos';
import { fusionarRegistros } from '@/dominio/motor/registro';
import { diferenciaDias } from '@/dominio/reglas/fechas';
import { DEMO } from '@/config/demo';
import { borrar, clave, escribirJson, leerJson, modoAlmacen } from './almacen';
import { esModoQa, hoyBogota, hoyReal, overrideHoy } from './reloj';

/**
 * Registro de comandos del usuario y ancla de fecha (PLAN 5.6.3, 5.6.5, 5.6.10).
 *
 * - El ancla se fija en la primera visita y se guarda; sin registro y con más de 7 días, se renueva sola.
 * - Con `?hoy=` (QA) el ancla es SIEMPRE la fecha de `?hoy=` y las claves son `kc:halden:v1:qa:*` (5.9).
 * - Antes de escribir el registro se relee y se fusiona por id (otra pestaña pudo agregar entradas).
 */

export interface AnclaGuardada {
  ancla: FechaISO;
  /** Fecha real de la primera visita. */
  fijadaEn: FechaISO;
}

export interface RegistroGuardado {
  version: number;
  versionGenerador: number;
  semilla: string;
  ancla: FechaISO;
  entradas: EntradaRegistro[];
}

export interface ResultadoCarga {
  ancla: FechaISO;
  fijadaEn: FechaISO;
  entradas: EntradaRegistro[];
  /** Avisos para Configuración › Datos (versiones, entradas descartadas). */
  avisos: string[];
  /** El ancla se renovó sola (sin registro y > 7 días). */
  renovada: boolean;
}

/** IDs generados contienen `_g_`: tras un cambio del generador, un comando que los toca podría apuntar a otra entidad. */
function referenciaGenerados(e: EntradaRegistro): boolean {
  return JSON.stringify(e.comando.datos).includes('_g_');
}

export function cargar(): ResultadoCarga {
  const avisos: string[] = [];
  const hoy = esModoQa() ? hoyBogota() : hoyReal();
  const guardada = leerJson<AnclaGuardada>(clave('ancla'));
  const registro = leerJson<RegistroGuardado>(clave('registro'));
  let entradas: EntradaRegistro[] = [];
  let ancla: FechaISO;
  let fijadaEn: FechaISO;
  let renovada = false;

  if (registro) {
    if (registro.version !== DEMO.versionRegistro) {
      avisos.push('Tus cambios de una versión anterior de la demo no se pudieron conservar.');
    } else if (registro.semilla !== DEMO.semilla) {
      avisos.push('Tus cambios eran de otros datos de ejemplo y no se pudieron conservar.');
    } else {
      entradas = registro.entradas;
      if (registro.versionGenerador !== DEMO.versionGenerador) {
        const antes = entradas.length;
        entradas = entradas.filter((e) => !referenciaGenerados(e));
        const perdidos = antes - entradas.length;
        if (perdidos > 0)
          avisos.push(
            `${perdidos} ${perdidos === 1 ? 'cambio' : 'cambios'} de tu sesión anterior no se pudieron conservar tras una actualización de la demo.`,
          );
      }
    }
  }

  if (esModoQa()) {
    // QA: ancla = fecha de ?hoy=; un registro de otra fecha no se mezcla.
    ancla = (overrideHoy() ?? hoy).slice(0, 10);
    fijadaEn = guardada?.fijadaEn ?? hoy;
    if (registro && registro.ancla !== ancla) entradas = [];
  } else if (guardada) {
    ancla = guardada.ancla;
    fijadaEn = guardada.fijadaEn;
    if (registro && registro.ancla !== ancla) entradas = [];
    if (entradas.length === 0 && diferenciaDias(ancla, hoy) > DEMO.diasRenovacionAncla) {
      ancla = hoy;
      fijadaEn = hoy;
      renovada = true;
    }
  } else {
    ancla = registro && entradas.length > 0 ? registro.ancla : hoy;
    fijadaEn = hoy;
  }
  escribirJson(clave('ancla'), { ancla, fijadaEn } satisfies AnclaGuardada);
  return { ancla, fijadaEn, entradas, avisos, renovada };
}

/** Relee el registro guardado (otra pestaña) y fusiona por id antes de escribir (5.6.5). */
export function guardarRegistro(ancla: FechaISO, entradas: readonly EntradaRegistro[]): EntradaRegistro[] {
  const actual = leerJson<RegistroGuardado>(clave('registro'));
  const fusionado =
    actual && actual.ancla === ancla && actual.version === DEMO.versionRegistro
      ? fusionarRegistros(entradas, actual.entradas)
      : [...entradas];
  const datos: RegistroGuardado = {
    version: DEMO.versionRegistro,
    versionGenerador: DEMO.versionGenerador,
    semilla: DEMO.semilla,
    ancla,
    entradas: fusionado,
  };
  escribirJson(clave('registro'), datos);
  return fusionado;
}

/** Lee el registro tal como está guardado (para fusionar entradas remotas). */
export function leerRegistro(ancla: FechaISO): EntradaRegistro[] {
  const r = leerJson<RegistroGuardado>(clave('registro'));
  return r && r.ancla === ancla && r.version === DEMO.versionRegistro ? r.entradas : [];
}

/** Fija el ancla (QR que trae otra ancla a un celular sin registro). */
export function fijarAncla(ancla: FechaISO): void {
  escribirJson(clave('ancla'), { ancla, fijadaEn: esModoQa() ? hoyBogota() : hoyReal() } satisfies AnclaGuardada);
}

/** Restaurar (5.6.9): borra registro y ancla. */
export function borrarRegistroYAncla(): void {
  borrar(clave('registro'));
  borrar(clave('ancla'));
}

/** Tamaño aproximado del registro en bytes (Configuración › Datos). */
export function tamanoRegistro(entradas: readonly EntradaRegistro[]): number {
  return JSON.stringify(entradas).length;
}

export { modoAlmacen };
