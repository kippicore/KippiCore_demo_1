import type { Eliminable, FechaHoraISO, Id, Trazabilidad } from './comunes';

/** Clientes (PLAN 6.8). */
export type CanalPreferido = 'whatsapp' | 'instagram' | 'correo' | 'llamada';
export type OrigenCliente = 'pos' | 'whatsapp' | 'instagram' | 'web' | 'importado';
export interface NotaCliente {
  id: Id;
  ts: FechaHoraISO;
  autorId: Id;
  texto: string;
}

export interface Cliente extends Trazabilidad, Eliminable {
  id: Id;
  nombres: string;
  apellidos: string;
  documento: { tipo: 'CC' | 'CE' | 'PA' | 'NIT'; numero: string } | null;
  /** '3001234567' (se muestra '300 123 4567'). */
  celular: string;
  correo: string | null;
  /** 'MM-DD' */
  cumpleanos: string | null;
  anioNacimiento: number | null;
  barrio: string | null;
  canalPreferido: CanalPreferido;
  /** 'usted' por defecto para VIP; mensajes prellenados y bot lo respetan. */
  tratamiento: 'tu' | 'usted';
  autorizacionDatos: { aceptada: boolean; fecha: FechaHoraISO; canal: OrigenCliente };
  tallasDeclaradas: Partial<Record<'camisa' | 'pantalon' | 'calzado' | 'blazer', string>>;
  /** Por dónde llegó el cliente. Se llama `canalAlta` (no `origen`) porque `origen` ya es de Trazabilidad (ajuste F2-A1). */
  canalAlta: OrigenCliente;
  localRegistroId: Id | null;
  /** Empleado. */
  registradoPorId: Id | null;
  notas: NotaCliente[];
  // derivado: compras, valor histórico, ticket promedio, frecuencia, última compra, segmento,
  //           tallas preferidas (moda de sus compras), colores y líneas que más compra,
  //           local habitual, vendedor que más lo atiende, saldo a favor, saldo por cobrar
}
