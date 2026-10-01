import { RETIRO_SOCIO } from '@/config/negocio';
import type { DatosCuenta, Id } from '@/dominio/tipos';

/**
 * Cuentas de dinero (PLAN 7.10). Entidades con nombres genéricos ficticios. El saldo inicial es al inicio de la
 * ventana (fechaSaldoInicial la fija estadoInicial con inicioVentana). Nequi y Daviplata son medios de pago que
 * nombra el PRD; aquí son billeteras del negocio.
 */
export const CUENTAS: (Omit<DatosCuenta, 'fechaSaldoInicial'> & { id: Id })[] = [
  {
    id: 'cta_caja_p93',
    nombre: 'Caja Parque 93',
    tipo: 'caja',
    localId: 'p93',
    entidad: null,
    numeroEnmascarado: null,
    saldoInicial: 300_000,
    orden: 1,
  },
  {
    id: 'cta_caja_usq',
    nombre: 'Caja Usaquén',
    tipo: 'caja',
    localId: 'usq',
    entidad: null,
    numeroEnmascarado: null,
    saldoInicial: 300_000,
    orden: 2,
  },
  {
    id: 'cta_caja_zr',
    nombre: 'Caja Zona Rosa',
    tipo: 'caja',
    localId: 'zr',
    entidad: null,
    numeroEnmascarado: null,
    saldoInicial: 300_000,
    orden: 3,
  },
  {
    id: 'cta_corriente',
    nombre: 'Cuenta corriente',
    tipo: 'banco',
    localId: null,
    entidad: 'Banco Meridiano',
    numeroEnmascarado: '•••• 2093',
    saldoInicial: 95_000_000,
    orden: 4,
  },
  {
    id: 'cta_puente',
    nombre: 'Datáfono por abonar',
    tipo: 'puente',
    localId: null,
    entidad: null,
    numeroEnmascarado: null,
    saldoInicial: 0,
    orden: 5,
  },
  {
    id: 'cta_nequi',
    nombre: 'Nequi',
    tipo: 'billetera',
    localId: null,
    entidad: 'Nequi',
    numeroEnmascarado: '•••• 9312',
    saldoInicial: 0,
    orden: 6,
  },
  {
    id: 'cta_daviplata',
    nombre: 'Daviplata',
    tipo: 'billetera',
    localId: null,
    entidad: 'Daviplata',
    numeroEnmascarado: '•••• 9312',
    saldoInicial: 0,
    orden: 7,
  },
];

export const ID_CUENTA_CORRIENTE: Id = 'cta_corriente';
export const ID_CUENTA_PUENTE: Id = 'cta_puente';

/**
 * Bandas de saldo que mantiene el generador (7.10): retiro del socio el día 1 si se pasa del techo. El techo y el
 * colchón son los de `RETIRO_SOCIO` (config), los mismos con que el flujo proyecta los retiros futuros.
 */
export const BANDAS_SALDO = {
  techoCorriente: RETIRO_SOCIO.techo,
  objetivoTrasRetiro: RETIRO_SOCIO.colchon,
  objetivoPuntoBajo: 18_000_000,
} as const;
