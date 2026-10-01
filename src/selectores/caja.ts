import type { BonoRegalo, COP, EstadoDominio, FechaISO, Id, MedioPago, SesionCaja } from '@/dominio/tipos';
import { efectivoEsperado } from '@/dominio/reglas/caja';
import { crearSelector } from './memo';
import { nombreEmpleado } from './base';

/** Caja (PLAN 6.23 `caja.ts`, 6.19 V8, W11). */

function nombrePersona(e: EstadoDominio, id: Id): string {
  const em = e.empleados[id];
  if (em) return nombreEmpleado(em);
  return e.usuarios[id]?.nombre ?? '';
}

/** Sesión de caja abierta del local (o null). */
export const selSesionAbierta = crearSelector<{ localId: Id }, SesionCaja | null>(
  'selSesionAbierta',
  ['sesionesCaja', 'agregados'],
  (e, { localId }) => {
    const id = e.agregados.cajaAbierta[localId];
    return id ? (e.sesionesCaja[id] ?? null) : null;
  },
);

export interface ResumenSesion {
  sesion: SesionCaja;
  localNombre: string;
  /** Ventas del local ese día por medio de pago (pagos, abonos y reembolsos con signo). */
  porMedio: Partial<Record<MedioPago, COP>>;
  /** Efectivo esperado: base + efectivo de la sesión − egresos (V8). Con la caja cerrada, la instantánea. */
  esperado: COP;
  egresos: COP;
  numVentas: number;
  totalVentas: COP;
  estado: 'abierta' | 'cerrada' | 'revisada';
  abrio: string;
  cerro: string | null;
}

export const selResumenSesion = crearSelector<{ sesionId: Id }, ResumenSesion | null>(
  'selResumenSesion',
  ['sesionesCaja', 'ventas', 'agregados', 'locales', 'empleados', 'usuarios'],
  (e, { sesionId }) => {
    const s = e.sesionesCaja[sesionId];
    if (!s) return null;
    const fecha = s.abierta.ts.slice(0, 10);
    const porMedio: Partial<Record<MedioPago, COP>> = {};
    let numVentas = 0;
    let totalVentas = 0;
    for (const v of Object.values(e.ventas)) {
      if (v.localId !== s.localId) continue;
      if (v.ts.slice(0, 10) === fecha && !v.anulacion) {
        numVentas += 1;
        totalVentas += v.total;
      }
      for (const p of v.pagos) {
        if (p.ts.slice(0, 10) !== fecha) continue;
        porMedio[p.medio] = (porMedio[p.medio] ?? 0) + p.valor;
      }
    }
    const egresos = s.egresos.reduce((a, x) => a + x.valor, 0);
    const esperado = s.cierre
      ? s.cierre.efectivoEsperado
      : efectivoEsperado(s.abierta.baseInicial, e.agregados.efectivoSesion[s.id] ?? 0, s.egresos);
    return {
      sesion: s,
      localNombre: e.locales[s.localId]?.nombre ?? s.localId,
      porMedio,
      esperado,
      egresos,
      numVentas,
      totalVentas,
      estado: s.revision ? 'revisada' : s.cierre ? 'cerrada' : 'abierta',
      abrio: nombrePersona(e, s.abierta.por),
      cerro: s.cierre ? nombrePersona(e, s.cierre.por) : null,
    };
  },
);

/** Efectivo en cajas (estimado): saldo de las cuentas tipo caja (V7), total y por local. */
export const selEfectivoEnCajas = crearSelector<{ localId: Id | 'todos' }, { total: COP; porLocal: Record<Id, COP> }>(
  'selEfectivoEnCajas',
  ['cuentas', 'agregados'],
  (e, { localId }) => {
    const porLocal: Record<Id, COP> = {};
    let total = 0;
    for (const c of Object.values(e.cuentas)) {
      if (c.tipo !== 'caja' || c.eliminadoEn || !c.localId) continue;
      if (localId !== 'todos' && c.localId !== localId) continue;
      const s = e.agregados.saldosCuentas[c.id] ?? 0;
      porLocal[c.localId] = (porLocal[c.localId] ?? 0) + s;
      total += s;
    }
    return { total, porLocal };
  },
);

export interface CierreDelDia {
  localId: Id;
  localNombre: string;
  sesionId: Id | null;
  estado: 'sin_abrir' | 'abierta' | 'cerrada' | 'revisada';
  /** Quien cerró (o abrió, si sigue abierta). */
  cajero: string;
  ciego: boolean;
  esperado: COP | null;
  contado: COP | null;
  /** contado − esperado (negativo = faltante); null si no ha cerrado. */
  diferencia: COP | null;
  revisado: boolean;
  notaRevision: string | null;
}

/** Cierres de un día en los tres locales (W11): estado, cajero, esperado, contado, diferencia y revisión. */
export const selCierresDelDia = crearSelector<{ fecha: FechaISO }, CierreDelDia[]>(
  'selCierresDelDia',
  ['sesionesCaja', 'locales', 'agregados', 'empleados', 'usuarios'],
  (e, { fecha }) =>
    Object.values(e.locales)
      .filter((l) => l.vende && !l.eliminadoEn)
      .sort((a, b) => a.orden - b.orden)
      .map((l) => {
        const id = e.agregados.cajaDia[`${l.id}@${fecha}`] ?? null;
        const s = id ? e.sesionesCaja[id] : undefined;
        if (!s)
          return {
            localId: l.id,
            localNombre: l.nombre,
            sesionId: null,
            estado: 'sin_abrir',
            cajero: '',
            ciego: false,
            esperado: null,
            contado: null,
            diferencia: null,
            revisado: false,
            notaRevision: null,
          } satisfies CierreDelDia;
        return {
          localId: l.id,
          localNombre: l.nombre,
          sesionId: s.id,
          estado: s.revision ? 'revisada' : s.cierre ? 'cerrada' : 'abierta',
          cajero: nombrePersona(e, s.cierre?.por ?? s.abierta.por),
          ciego: s.cierre?.ciego ?? false,
          esperado: s.cierre?.efectivoEsperado ?? efectivoEsperado(s.abierta.baseInicial, e.agregados.efectivoSesion[s.id] ?? 0, s.egresos),
          contado: s.cierre?.efectivoContado ?? null,
          diferencia: s.cierre?.diferencia ?? null,
          revisado: !!s.revision,
          notaRevision: s.revision?.nota ?? null,
        } satisfies CierreDelDia;
      }),
);

export interface BonoConSaldo extends BonoRegalo {
  redimido: COP;
  saldo: COP;
  estado: 'activo' | 'usado' | 'vencido';
}

/** Bonos de regalo con saldo y estado derivados (V12). */
export const selBonos = crearSelector<{ hoy: FechaISO; estado?: BonoConSaldo['estado']; localId?: Id | 'todos' }, BonoConSaldo[]>(
  'selBonos',
  ['bonos', 'agregados'],
  (e, { hoy, estado, localId }) =>
    Object.values(e.bonos)
      .map((b) => {
        const redimido = e.agregados.bonosRedimidos[b.id] ?? 0;
        const saldo = b.valor - redimido;
        const est: BonoConSaldo['estado'] = saldo <= 0 ? 'usado' : b.vence < hoy ? 'vencido' : 'activo';
        return { ...b, redimido, saldo, estado: est };
      })
      .filter((b) => (!estado || b.estado === estado) && (!localId || localId === 'todos' || b.localId === localId))
      .sort((a, b) => (a.vendidoEn < b.vendidoEn ? 1 : -1)),
);
