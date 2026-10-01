import type { DiaSemana, HoraHHmm, Id, TipoTurno } from '@/dominio/tipos';

/**
 * Plantilla semanal de turnos por local (PLAN 7.8, T16). Rige para toda la ventana: las ventas se asignan
 * entre los vendedores con turno a esa hora; los turnos almacenados (últimas 13 semanas y próximas 3) se
 * copian de aquí. Apertura 10:00–6:00 p. m. y cierre 12:00 m.–8:00 p. m. (Zona Rosa 1:00–9:00 p. m.),
 * 8 h brutas con 1 h de descanso = 7 h netas; seis días = 42 h. Los cierres caen en la franja nocturna
 * desde las 7:00 p. m. (recargo estimado, 6.20.14).
 */
export interface TurnoPlantilla {
  empleadoId: Id;
  localId: Id;
  dia: DiaSemana;
  tipo: TipoTurno;
  inicio: HoraHHmm;
  fin: HoraHHmm;
  descansoMin: number;
}

type Franja = { tipo: TipoTurno; inicio: HoraHHmm; fin: HoraHHmm; descansoMin: number };

export const FRANJAS = {
  apertura: { tipo: 'apertura', inicio: '10:00', fin: '18:00', descansoMin: 60 },
  intermedio: { tipo: 'intermedio', inicio: '12:00', fin: '20:00', descansoMin: 60 },
  cierre: { tipo: 'cierre', inicio: '12:00', fin: '20:00', descansoMin: 60 },
  cierreZr: { tipo: 'cierre', inicio: '13:00', fin: '21:00', descansoMin: 60 },
  intermedioZr: { tipo: 'intermedio', inicio: '12:00', fin: '20:00', descansoMin: 60 },
  domingo: { tipo: 'completo', inicio: '11:00', fin: '19:00', descansoMin: 60 },
  bodega: { tipo: 'completo', inicio: '08:00', fin: '16:00', descansoMin: 60 },
  bodegaAux: { tipo: 'completo', inicio: '09:00', fin: '17:00', descansoMin: 60 },
  bodegaSabado: { tipo: 'completo', inicio: '08:00', fin: '14:00', descansoMin: 0 },
} as const satisfies Record<string, Franja>;

function semana(empleadoId: Id, localId: Id, dias: Partial<Record<DiaSemana, Franja>>): TurnoPlantilla[] {
  return (Object.entries(dias) as [string, Franja][]).map(([dia, f]) => ({
    empleadoId,
    localId,
    dia: Number(dia) as DiaSemana,
    ...f,
  }));
}

const F = FRANJAS;

// 0 = domingo · 1 = lunes … 6 = sábado.
export const PLANTILLA_TURNOS: TurnoPlantilla[] = [
  // Parque 93: tres vendedores y la cajera (P2).
  ...semana('em_vgomez', 'p93', {
    2: F.apertura,
    3: F.cierre,
    4: F.apertura,
    5: F.cierre,
    6: F.cierre,
    0: F.domingo,
  }),
  ...semana('em_casuarez', 'p93', {
    1: F.apertura,
    3: F.apertura,
    4: F.cierre,
    5: F.apertura,
    6: F.apertura,
    0: F.domingo,
  }),
  ...semana('em_srojas', 'p93', {
    1: F.cierre,
    2: F.cierre,
    3: F.intermedio,
    4: F.intermedio,
    5: F.intermedio,
    6: F.intermedio,
  }),
  ...semana('em_lsmendez', 'p93', {
    1: F.cierre,
    2: F.cierre,
    3: F.cierre,
    4: F.cierre,
    5: F.cierre,
    6: F.cierre,
  }),
  // Usaquén: Sebastián (laboral) y Daniela (prestación de servicios con turno fijo: riesgo señalado, P22).
  ...semana('em_scardenas', 'usq', {
    2: F.apertura,
    3: F.cierre,
    4: F.cierre,
    5: F.apertura,
    6: F.cierre,
    0: F.domingo,
  }),
  ...semana('em_dmoreno', 'usq', {
    1: F.apertura,
    2: F.cierre,
    4: F.apertura,
    5: F.cierre,
    6: F.apertura,
    0: F.domingo,
  }),
  // Zona Rosa: Mateo abre los miércoles (N6), Natalia cierra los martes (N14), Juliana de viernes a domingo (P22).
  ...semana('em_mherrera', 'zr', {
    1: F.cierreZr,
    2: F.apertura,
    3: F.apertura,
    5: F.apertura,
    6: F.apertura,
    0: F.domingo,
  }),
  ...semana('em_nrios', 'zr', {
    1: F.apertura,
    2: F.cierreZr,
    3: F.cierreZr,
    4: F.intermedioZr,
    5: F.cierreZr,
    6: F.cierreZr,
  }),
  ...semana('em_jvargas', 'zr', { 5: F.intermedioZr, 6: F.intermedioZr, 0: F.domingo }),
  // Bodega.
  ...semana('em_wdiaz', 'bod', {
    1: F.bodega,
    2: F.bodega,
    3: F.bodega,
    4: F.bodega,
    5: F.bodega,
    6: F.bodegaSabado,
  }),
  ...semana('em_jtorres', 'bod', {
    1: F.bodegaAux,
    2: F.bodegaAux,
    3: F.bodegaAux,
    4: F.bodegaAux,
    5: F.bodegaAux,
    6: F.bodegaSabado,
  }),
];

/** Semanas de turnos almacenados alrededor del ancla (ventana móvil, 7.8). */
export const SEMANAS_TURNOS = { atras: 13, adelante: 3 } as const;
