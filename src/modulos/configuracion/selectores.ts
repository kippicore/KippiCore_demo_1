import type { CuentaDinero, Empresa, Id, Local, Parametros, TasaCambio, UsuarioDemo } from '@/dominio/tipos';
import { crearSelector } from '@/selectores/memo';
import { promedio } from './calculos';

/**
 * Selectores locales de Configuración (E3). Componen las tablas del estado sin repetir reglas de negocio: solo
 * reúnen lo que cada pantalla necesita. Cada uno declara TODAS las tablas que lee.
 */

export const selEmpresa = crearSelector<void, Empresa>('selEmpresaConfig', ['empresa'], (e) => e.empresa);

export const selParametros = crearSelector<void, Parametros>('selParametrosConfig', ['parametros'], (e) => e.parametros);

export const selTasas = crearSelector<void, TasaCambio[]>('selTasasConfig', ['tasas'], (e) => Object.values(e.tasas));

export const selUsuarios = crearSelector<void, UsuarioDemo[]>('selUsuariosConfig', ['usuarios'], (e) =>
  Object.values(e.usuarios)
    .filter((u) => !u.eliminadoEn)
    .sort((a, b) => (a.rol === b.rol ? a.nombre.localeCompare(b.nombre) : a.rol === 'dueno' ? -1 : b.rol === 'dueno' ? 1 : a.rol < b.rol ? -1 : 1)),
);

/** Cuentas tipo caja (para elegir la caja de un local). */
export const selCajas = crearSelector<void, CuentaDinero[]>('selCajasConfig', ['cuentas'], (e) =>
  Object.values(e.cuentas)
    .filter((c) => !c.eliminadoEn && c.tipo === 'caja')
    .sort((a, b) => a.orden - b.orden),
);

// ---------------------------------------------------------------------------------------------------------
// Locales y lo que pasaría si se eliminan
// ---------------------------------------------------------------------------------------------------------
export interface FilaLocalConfig {
  local: Local;
  /** Unidades en existencia hoy. */
  unidades: number;
  /** Ventas históricas del local (se conservan aunque se elimine). */
  ventas: number;
  empleados: number;
  cajaAbierta: boolean;
  cajaNombre: string | null;
  /** Por qué no se puede eliminar todavía (vacío = se puede). */
  impedimentos: string[];
}

export const selLocalesConfig = crearSelector<void, FilaLocalConfig[]>(
  'selLocalesConfig',
  ['locales', 'agregados', 'ventas', 'empleados', 'cuentas'],
  (e) => {
    const unidades: Record<Id, number> = {};
    for (const [clave, n] of Object.entries(e.agregados.existencias)) {
      const i = clave.lastIndexOf('@');
      if (i < 0) continue;
      const id = clave.slice(i + 1);
      unidades[id] = (unidades[id] ?? 0) + n;
    }
    const ventas: Record<Id, number> = {};
    for (const v of Object.values(e.ventas)) ventas[v.localId] = (ventas[v.localId] ?? 0) + 1;
    const empleados: Record<Id, number> = {};
    for (const em of Object.values(e.empleados)) if (!em.eliminadoEn && !em.fechaRetiro && em.localId) empleados[em.localId] = (empleados[em.localId] ?? 0) + 1;
    return Object.values(e.locales)
      .filter((l) => !l.eliminadoEn)
      .sort((a, b) => a.orden - b.orden)
      .map((local) => {
        const u = unidades[local.id] ?? 0;
        const abierta = !!e.agregados.cajaAbierta[local.id];
        const impedimentos: string[] = [];
        if (u > 0) impedimentos.push(`Tiene ${u} ${u === 1 ? 'unidad' : 'unidades'} en existencia: trasládalas a otro local antes de eliminarlo.`);
        if (abierta) impedimentos.push('Tiene la caja abierta: ciérrala antes de eliminarlo.');
        return {
          local,
          unidades: u,
          ventas: ventas[local.id] ?? 0,
          empleados: empleados[local.id] ?? 0,
          cajaAbierta: abierta,
          cajaNombre: local.cuentaCajaId ? (e.cuentas[local.cuentaCajaId]?.nombre ?? null) : null,
          impedimentos,
        };
      });
  },
);

// ---------------------------------------------------------------------------------------------------------
// Aduanas: costos típicos de un pedido (promedio de las importaciones reales)
// ---------------------------------------------------------------------------------------------------------
export interface CostosTipicosPedido {
  pedidos: number;
  honorarios: number;
  bodegaje: number;
  transporte: number;
  /** Unidades y FOB promedio por pedido (en dólares): sirven de base del simulador. */
  unidades: number;
}

export const selCostosTipicos = crearSelector<void, CostosTipicosPedido>('selCostosTipicosConfig', ['importaciones'], (e) => {
  const imps = Object.values(e.importaciones).filter((i) => !i.eliminadoEn);
  return {
    pedidos: imps.length,
    honorarios: promedio(imps.map((i) => i.costos.honorariosAgente).filter((x) => x > 0)),
    bodegaje: promedio(imps.map((i) => i.costos.bodegajePuerto).filter((x) => x > 0)),
    transporte: promedio(imps.map((i) => i.costos.transporteInterno).filter((x) => x > 0)),
    unidades: promedio(
      imps.map((i) => i.lineas.reduce((s, l) => s + Object.values(l.cantidades).reduce((a, b) => a + b, 0), 0)).filter((x) => x > 0),
    ),
  };
});
