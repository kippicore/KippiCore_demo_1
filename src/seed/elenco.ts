import type {
  DatosCliente,
  DatosContrato,
  DatosEmpleado,
  DatosUsuario,
  EsquemaComision,
  Eliminable,
  Id,
  Trazabilidad,
} from '@/dominio/tipos';

/**
 * Elenco de la demo (PLAN 1.5): dueño, 14 empleados y clientes con guion. Nombres ficticios y configurables;
 * EPS, fondos, ARL, cajas y bancos con nombres ficticios (R15). Las fechas de ingreso son relativas al ancla
 * (meses hacia atrás) para que la antigüedad se vea igual sin importar el día en que se abra la demo.
 */

const AFILIACIONES_A = {
  eps: 'EPS Cóndor Salud',
  pension: 'Fondo de Pensiones Cumbre',
  cesantias: 'Cesantías Cumbre',
  arl: 'ARL Resguardo',
  caja: 'Caja Sabana de Compensación',
};
const AFILIACIONES_B = {
  eps: 'EPS Ceiba',
  pension: 'Pensiones Altiplano',
  cesantias: 'Cesantías Altiplano',
  arl: 'ARL Resguardo',
  caja: 'Caja Sabana de Compensación',
};
/** Los contratistas cotizan por su cuenta: se registran sus afiliaciones como informativas. */
const AFILIACIONES_INDEPENDIENTE = {
  eps: 'EPS Ceiba',
  pension: 'Pensiones Altiplano',
  cesantias: 'No aplica',
  arl: 'ARL Resguardo',
  caja: 'No aplica',
};

export interface EmpleadoSeed {
  id: Id;
  contratoId: Id;
  /** Usuario de la demo si es persona de un rol (vendedor, bodega). */
  usuarioId: Id | null;
  /** Ingreso relativo al ancla: meses hacia atrás y día del mes. */
  ingreso: { mesesAtras: number; dia: number };
  datos: Omit<DatosEmpleado, 'fechaIngreso'>;
  contrato: Omit<DatosContrato, 'inicio'>;
}

type BaseContrato = Omit<DatosContrato, 'inicio' | 'salarioBase' | 'honorarios' | 'esquemaComisionId'>;
const LABORAL: BaseContrato = {
  tipo: 'laboral',
  modalidadLaboral: 'indefinido',
  fin: null,
  jornadaSemanalHoras: 42,
  riesgoArl: 1,
  periodicidadPago: 'quincenal',
  retencionFuente: null,
  verificacionesPila: [],
};
const PRESTACION: BaseContrato = {
  tipo: 'prestacion_servicios',
  modalidadLaboral: null,
  fin: null,
  jornadaSemanalHoras: 42,
  riesgoArl: 1,
  periodicidadPago: 'mensual',
  retencionFuente: null,
  verificacionesPila: [],
};

function laboral(
  salario: number,
  esquema: Id | null,
  extra: Partial<BaseContrato> = {},
): EmpleadoSeed['contrato'] {
  return { ...LABORAL, ...extra, salarioBase: salario, honorarios: null, esquemaComisionId: esquema };
}
function prestacion(
  honorarios: number,
  esquema: Id | null,
  extra: Partial<BaseContrato> = {},
): EmpleadoSeed['contrato'] {
  return { ...PRESTACION, ...extra, salarioBase: null, honorarios, esquemaComisionId: esquema };
}

export const ESQUEMAS_COMISION: Omit<EsquemaComision, keyof Trazabilidad | keyof Eliminable>[] = [
  {
    id: 'esq_3pct',
    nombre: '3 % sobre tus ventas sin IVA',
    base: 'base_sin_iva',
    componentes: [{ tipo: 'porcentaje', porcentaje: 0.03 }],
  },
  {
    id: 'esq_escalonado_p93',
    nombre: 'Escalonado por meta · Parque 93',
    base: 'base_sin_iva',
    componentes: [
      {
        tipo: 'escalonado',
        modo: 'total',
        tramos: [
          { desde: 0, porcentaje: 0.025 },
          { desde: 35_000_000, porcentaje: 0.03 },
          { desde: 45_000_000, porcentaje: 0.035 },
        ],
      },
      { tipo: 'bono_meta_local', valor: 300_000, cumplimientoMinimo: 1 },
    ],
  },
];

export const DUENO = {
  usuarioId: 'u_dueno',
  nombre: 'Juan Camilo Ospina',
  correo: 'juancamilo@halden.example',
  iniciales: 'JO',
} as const;

export const EMPLEADOS: EmpleadoSeed[] = [
  {
    id: 'em_scardenas',
    contratoId: 'ct_scardenas_1',
    usuarioId: 'u_vendedor',
    ingreso: { mesesAtras: 34, dia: 3 },
    datos: {
      slug: 'sebastian-cardenas',
      nombres: 'Sebastián',
      apellidos: 'Cárdenas Ruiz',
      documento: { tipo: 'CC', numero: '1020456789' },
      fechaNacimiento: '1996-04-18',
      cargo: 'vendedor',
      localId: 'usq',
      fechaRetiro: null,
      celular: '3104567821',
      correo: 'sebastian.cardenas@halden.example',
      contactoEmergencia: { nombre: 'Marta Ruiz', parentesco: 'Mamá', celular: '3157781204' },
      afiliaciones: AFILIACIONES_A,
      cuentaPago: { entidad: 'Banco Meridiano', tipo: 'ahorros', numeroEnmascarado: '•••• 4821' },
    },
    contrato: laboral(1_950_000, 'esq_3pct'),
  },
  {
    id: 'em_wdiaz',
    contratoId: 'ct_wdiaz_1',
    usuarioId: 'u_bodega',
    ingreso: { mesesAtras: 52, dia: 15 },
    datos: {
      slug: 'wilson-diaz',
      nombres: 'Wilson',
      apellidos: 'Díaz Forero',
      documento: { tipo: 'CC', numero: '80214377' },
      fechaNacimiento: '1983-11-02',
      cargo: 'jefe_bodega',
      localId: 'bod',
      fechaRetiro: null,
      celular: '3118094456',
      correo: 'wilson.diaz@halden.example',
      contactoEmergencia: { nombre: 'Gloria Forero', parentesco: 'Esposa', celular: '3123345598' },
      afiliaciones: AFILIACIONES_B,
      cuentaPago: { entidad: 'Banco Cordillera', tipo: 'ahorros', numeroEnmascarado: '•••• 1176' },
    },
    contrato: laboral(2_400_000, null, { riesgoArl: 2 }),
  },
  {
    id: 'em_vgomez',
    contratoId: 'ct_vgomez_1',
    usuarioId: null,
    ingreso: { mesesAtras: 41, dia: 1 },
    datos: {
      slug: 'valentina-gomez',
      nombres: 'Valentina',
      apellidos: 'Gómez Arango',
      documento: { tipo: 'CC', numero: '1032447815' },
      fechaNacimiento: '1994-08-27',
      cargo: 'vendedor',
      localId: 'p93',
      fechaRetiro: null,
      celular: '3016652290',
      correo: 'valentina.gomez@halden.example',
      contactoEmergencia: { nombre: 'Jorge Gómez', parentesco: 'Papá', celular: '3006618843' },
      afiliaciones: AFILIACIONES_A,
      cuentaPago: { entidad: 'Banco Meridiano', tipo: 'ahorros', numeroEnmascarado: '•••• 9034' },
    },
    contrato: laboral(2_100_000, 'esq_escalonado_p93'),
  },
  {
    id: 'em_lmpardo',
    contratoId: 'ct_lmpardo_1',
    usuarioId: null,
    ingreso: { mesesAtras: 60, dia: 10 },
    datos: {
      slug: 'luz-marina-pardo',
      nombres: 'Luz Marina',
      apellidos: 'Pardo Camacho',
      documento: { tipo: 'CC', numero: '52318904' },
      fechaNacimiento: '1978-02-14',
      cargo: 'administracion',
      localId: null,
      fechaRetiro: null,
      celular: '3142290871',
      correo: 'luzmarina.pardo@halden.example',
      contactoEmergencia: { nombre: 'Andrés Camacho', parentesco: 'Hijo', celular: '3185542210' },
      afiliaciones: AFILIACIONES_B,
      cuentaPago: { entidad: 'Banco Cordillera', tipo: 'corriente', numeroEnmascarado: '•••• 3310' },
    },
    contrato: laboral(3_000_000, null, { jornadaSemanalHoras: 40, periodicidadPago: 'mensual' }),
  },
  {
    id: 'em_casuarez',
    contratoId: 'ct_casuarez_1',
    usuarioId: null,
    ingreso: { mesesAtras: 27, dia: 5 },
    datos: {
      slug: 'camilo-andres-suarez',
      nombres: 'Camilo Andrés',
      apellidos: 'Suárez Lozano',
      documento: { tipo: 'CC', numero: '1015472230' },
      fechaNacimiento: '1997-06-09',
      cargo: 'vendedor',
      localId: 'p93',
      fechaRetiro: null,
      celular: '3205581137',
      correo: 'camilo.suarez@halden.example',
      contactoEmergencia: { nombre: 'Patricia Lozano', parentesco: 'Mamá', celular: '3134406621' },
      afiliaciones: AFILIACIONES_A,
      cuentaPago: { entidad: 'Nequi', tipo: 'nequi', numeroEnmascarado: '•••• 1137' },
    },
    contrato: laboral(1_950_000, 'esq_3pct'),
  },
  {
    id: 'em_srojas',
    contratoId: 'ct_srojas_1',
    usuarioId: null,
    // "Uno contratado hace ~5 meses" (7.4).
    ingreso: { mesesAtras: 5, dia: 2 },
    datos: {
      slug: 'santiago-rojas',
      nombres: 'Santiago',
      apellidos: 'Rojas Bermúdez',
      documento: { tipo: 'CC', numero: '1019088342' },
      fechaNacimiento: '1999-12-03',
      cargo: 'vendedor',
      localId: 'p93',
      fechaRetiro: null,
      celular: '3002298814',
      correo: 'santiago.rojas@halden.example',
      contactoEmergencia: { nombre: 'Clara Bermúdez', parentesco: 'Mamá', celular: '3116672043' },
      afiliaciones: AFILIACIONES_B,
      cuentaPago: { entidad: 'Banco Meridiano', tipo: 'ahorros', numeroEnmascarado: '•••• 7752' },
    },
    contrato: laboral(1_850_000, 'esq_3pct'),
  },
  {
    id: 'em_lsmendez',
    contratoId: 'ct_lsmendez_1',
    usuarioId: null,
    ingreso: { mesesAtras: 22, dia: 16 },
    datos: {
      slug: 'laura-sofia-mendez',
      nombres: 'Laura Sofía',
      apellidos: 'Méndez Galvis',
      documento: { tipo: 'CC', numero: '1022934476' },
      fechaNacimiento: '1998-03-21',
      cargo: 'cajero',
      localId: 'p93',
      fechaRetiro: null,
      celular: '3176609125',
      correo: 'laura.mendez@halden.example',
      contactoEmergencia: { nombre: 'Rubén Méndez', parentesco: 'Papá', celular: '3108843327' },
      afiliaciones: AFILIACIONES_A,
      cuentaPago: { entidad: 'Daviplata', tipo: 'daviplata', numeroEnmascarado: '•••• 9125' },
    },
    contrato: laboral(1_800_000, null),
  },
  {
    id: 'em_dmoreno',
    contratoId: 'ct_dmoreno_1',
    usuarioId: null,
    ingreso: { mesesAtras: 14, dia: 1 },
    datos: {
      slug: 'daniela-moreno',
      nombres: 'Daniela',
      apellidos: 'Moreno Quintero',
      documento: { tipo: 'CC', numero: '1026583319' },
      fechaNacimiento: '1997-10-30',
      cargo: 'vendedor',
      localId: 'usq',
      fechaRetiro: null,
      celular: '3193307748',
      correo: 'daniela.moreno@halden.example',
      contactoEmergencia: { nombre: 'Felipe Quintero', parentesco: 'Hermano', celular: '3016651190' },
      afiliaciones: AFILIACIONES_INDEPENDIENTE,
      cuentaPago: { entidad: 'Nequi', tipo: 'nequi', numeroEnmascarado: '•••• 7748' },
    },
    contrato: prestacion(1_900_000, 'esq_3pct'),
  },
  {
    id: 'em_mherrera',
    contratoId: 'ct_mherrera_1',
    usuarioId: null,
    ingreso: { mesesAtras: 19, dia: 8 },
    datos: {
      slug: 'mateo-herrera',
      nombres: 'Mateo',
      apellidos: 'Herrera Salazar',
      documento: { tipo: 'CC', numero: '1018765220' },
      fechaNacimiento: '1998-01-12',
      cargo: 'vendedor',
      localId: 'zr',
      fechaRetiro: null,
      celular: '3128874401',
      correo: 'mateo.herrera@halden.example',
      contactoEmergencia: { nombre: 'Lucía Salazar', parentesco: 'Mamá', celular: '3002214478' },
      afiliaciones: AFILIACIONES_B,
      cuentaPago: { entidad: 'Banco Meridiano', tipo: 'ahorros', numeroEnmascarado: '•••• 4401' },
    },
    contrato: laboral(1_900_000, 'esq_3pct'),
  },
  {
    id: 'em_nrios',
    contratoId: 'ct_nrios_1',
    usuarioId: null,
    ingreso: { mesesAtras: 31, dia: 20 },
    datos: {
      slug: 'natalia-rios',
      nombres: 'Natalia',
      apellidos: 'Ríos Echeverry',
      documento: { tipo: 'CC', numero: '1032198854' },
      fechaNacimiento: '1995-05-05',
      cargo: 'vendedor',
      localId: 'zr',
      fechaRetiro: null,
      celular: '3157720936',
      correo: 'natalia.rios@halden.example',
      contactoEmergencia: { nombre: 'Germán Ríos', parentesco: 'Papá', celular: '3104476652' },
      afiliaciones: AFILIACIONES_A,
      cuentaPago: { entidad: 'Banco Cordillera', tipo: 'ahorros', numeroEnmascarado: '•••• 0936' },
    },
    contrato: laboral(1_900_000, 'esq_3pct'),
  },
  {
    id: 'em_jvargas',
    contratoId: 'ct_jvargas_1',
    usuarioId: null,
    ingreso: { mesesAtras: 11, dia: 4 },
    datos: {
      slug: 'juliana-vargas',
      nombres: 'Juliana',
      apellidos: 'Vargas Cifuentes',
      documento: { tipo: 'CC', numero: '1000376641' },
      fechaNacimiento: '2001-09-17',
      cargo: 'vendedor',
      localId: 'zr',
      fechaRetiro: null,
      celular: '3218806543',
      correo: 'juliana.vargas@halden.example',
      contactoEmergencia: { nombre: 'Sandra Cifuentes', parentesco: 'Mamá', celular: '3125598012' },
      afiliaciones: AFILIACIONES_INDEPENDIENTE,
      cuentaPago: { entidad: 'Nequi', tipo: 'nequi', numeroEnmascarado: '•••• 6543' },
    },
    contrato: prestacion(1_100_000, 'esq_3pct', { jornadaSemanalHoras: 21 }),
  },
  {
    id: 'em_jtorres',
    contratoId: 'ct_jtorres_1',
    usuarioId: null,
    ingreso: { mesesAtras: 16, dia: 12 },
    datos: {
      slug: 'julian-torres',
      nombres: 'Julián',
      apellidos: 'Torres Duarte',
      documento: { tipo: 'CC', numero: '1013654987' },
      fechaNacimiento: '2000-07-25',
      cargo: 'auxiliar_bodega',
      localId: 'bod',
      fechaRetiro: null,
      celular: '3502287716',
      correo: 'julian.torres@halden.example',
      contactoEmergencia: { nombre: 'Rosa Duarte', parentesco: 'Mamá', celular: '3115590023' },
      afiliaciones: AFILIACIONES_B,
      cuentaPago: { entidad: 'Daviplata', tipo: 'daviplata', numeroEnmascarado: '•••• 7716' },
    },
    // Salario mínimo: recibe auxilio de transporte (1.5).
    contrato: laboral(1_750_905, null, { riesgoArl: 2 }),
  },
  {
    id: 'em_hbeltran',
    contratoId: 'ct_hbeltran_1',
    usuarioId: null,
    ingreso: { mesesAtras: 46, dia: 1 },
    datos: {
      slug: 'hernando-beltran',
      nombres: 'Hernando',
      apellidos: 'Beltrán Acosta',
      documento: { tipo: 'CC', numero: '79456123' },
      fechaNacimiento: '1968-03-08',
      cargo: 'sastre',
      // Taller en Usaquén; atiende los tres locales.
      localId: 'usq',
      fechaRetiro: null,
      celular: '3133351840',
      correo: 'hernando.beltran@halden.example',
      contactoEmergencia: { nombre: 'Esperanza Acosta', parentesco: 'Esposa', celular: '3142207761' },
      afiliaciones: AFILIACIONES_INDEPENDIENTE,
      cuentaPago: { entidad: 'Banco Cordillera', tipo: 'ahorros', numeroEnmascarado: '•••• 1840' },
    },
    contrato: prestacion(2_400_000, null, { jornadaSemanalHoras: 30 }),
  },
  {
    id: 'em_apinzon',
    contratoId: 'ct_apinzon_1',
    usuarioId: null,
    ingreso: { mesesAtras: 9, dia: 15 },
    datos: {
      slug: 'alejandro-pinzon',
      nombres: 'Alejandro',
      apellidos: 'Pinzón Holguín',
      documento: { tipo: 'CC', numero: '1020771845' },
      fechaNacimiento: '1995-11-11',
      cargo: 'contenido_redes',
      localId: null,
      fechaRetiro: null,
      celular: '3017734408',
      correo: 'alejandro.pinzon@halden.example',
      contactoEmergencia: { nombre: 'Mónica Holguín', parentesco: 'Hermana', celular: '3168820054' },
      afiliaciones: AFILIACIONES_INDEPENDIENTE,
      cuentaPago: { entidad: 'Banco Meridiano', tipo: 'ahorros', numeroEnmascarado: '•••• 4408' },
    },
    contrato: prestacion(2_600_000, null, { jornadaSemanalHoras: 20 }),
  },
];

/** Usuarios de la demo (personas de los roles, 5.8). */
export const USUARIOS: (DatosUsuario & { id: Id })[] = [
  {
    id: 'u_dueno',
    nombre: DUENO.nombre,
    correo: DUENO.correo,
    iniciales: DUENO.iniciales,
    rol: 'dueno',
    empleadoId: null,
    localFijoId: null,
    activo: true,
  },
  {
    id: 'u_vendedor',
    nombre: 'Sebastián Cárdenas',
    correo: 'sebastian.cardenas@halden.example',
    iniciales: 'SC',
    rol: 'vendedor',
    empleadoId: 'em_scardenas',
    localFijoId: 'usq',
    activo: true,
  },
  {
    id: 'u_bodega',
    nombre: 'Wilson Díaz',
    correo: 'wilson.diaz@halden.example',
    iniciales: 'WD',
    rol: 'bodega',
    empleadoId: 'em_wdiaz',
    localFijoId: 'bod',
    activo: true,
  },
];

/** Clientes con guion (1.5, 7.7). Sus compras y fechas las siembra el generador (N8, N12). */
export interface ClienteGuion {
  id: Id;
  datos: Omit<DatosCliente, 'cumpleanos' | 'autorizacionDatos'>;
  /** 'ancla' = cumple el día del ancla (N8). */
  cumpleanos: string | 'ancla';
  /** Alta relativa al ancla (meses hacia atrás). */
  altaMesesAtras: number;
  guion: string;
}

export const CLIENTES_GUION: ClienteGuion[] = [
  {
    id: 'cl_andres_gutierrez',
    datos: {
      nombres: 'Andrés',
      apellidos: 'Gutiérrez Mejía',
      documento: { tipo: 'CC', numero: '80765432' },
      celular: '3157781234',
      correo: 'andres.gutierrez@correo.example',
      anioNacimiento: 1985,
      barrio: 'Santa Bárbara',
      canalPreferido: 'whatsapp',
      tratamiento: 'tu',
      tallasDeclaradas: { camisa: 'M', pantalon: '32' },
      canalAlta: 'pos',
      localRegistroId: 'usq',
      registradoPorId: 'em_scardenas',
    },
    cumpleanos: '03-14',
    altaMesesAtras: 14,
    guion: 'Cliente frecuente de Usaquén: 6 compras previas; chino talla 32 (W1, N12).',
  },
  {
    id: 'cl_ricardo_penuela',
    datos: {
      nombres: 'Ricardo',
      apellidos: 'Peñuela Botero',
      documento: { tipo: 'CC', numero: '79123456' },
      celular: '3108765432',
      correo: 'ricardo.penuela@correo.example',
      anioNacimiento: 1971,
      barrio: 'Chicó',
      canalPreferido: 'whatsapp',
      tratamiento: 'usted',
      tallasDeclaradas: { camisa: 'L', pantalon: '34', blazer: '52', calzado: '42' },
      canalAlta: 'pos',
      localRegistroId: 'p93',
      registradoPorId: 'em_vgomez',
    },
    cumpleanos: 'ancla',
    altaMesesAtras: 17,
    guion:
      'VIP de Parque 93 (≈ $ 6,4 millones históricos), cumpleaños el día del ancla (N8) y toma de medidas el sábado.',
  },
];
