import type { DatosContacto, DatosProveedor, Fraccion, Id } from '@/dominio/tipos';

/**
 * Proveedores y contactos de la cadena (PLAN 1.5, 7.9). Cinco fábricas chinas (nombre comercial en inglés,
 * como se presentan en la práctica) y diez proveedores locales. Todos los nombres son ficticios; F2-A1 los
 * buscó en la web el 01/10/2026 sin encontrar coincidencias exactas con empresas reales. Teléfonos, correos y
 * WeChat son inventados (dominios .example) y los enlaces de la demo nunca llevan destinatario (R14).
 */
export interface PerfilFabrica {
  /** Días entre pedidos (o 'semestral' antes de junio y diciembre). */
  cadencia: number | 'semestral';
  /** Fracción de unidades defectuosas al recibir (P14). */
  defectos: Fraccion;
  /** Retraso promedio de la llegada en días (P14). */
  retrasoPromedioDias: number;
  /** Fracción de pedidos a tiempo (P14). */
  aTiempo: Fraccion;
  puertoOrigen: string;
}

export interface ProveedorSeed {
  id: Id;
  datos: Omit<DatosProveedor, 'contactoIds'>;
  perfil: PerfilFabrica | null;
}

const FABRICA = {
  tipo: 'fabrica',
  nit: null,
  pais: 'China',
  moneda: 'USD',
  condicionesPago: '30 % anticipo, 70 % al quedar listo para despacho',
  diasEntregaPactados: 40,
  categoriaLocal: null,
  localId: null,
  nota: null,
} as const;

const LOCAL = {
  tipo: 'local' as const,
  ciudad: 'Bogotá',
  pais: 'Colombia',
  moneda: 'COP' as const,
  diasEntregaPactados: null,
  categoriasProducto: [],
  nota: null,
};

export const PROVEEDORES: ProveedorSeed[] = [
  {
    id: 'pr_huameng',
    datos: {
      ...FABRICA,
      nombre: 'Guangzhou Huameng Garment Co., Ltd.',
      nombreCorto: 'Guangzhou Huameng',
      ciudad: 'Guangzhou',
      categoriasProducto: ['camisas', 'polos'],
      calificacion: 5,
    },
    perfil: {
      cadencia: 90,
      defectos: 0.011,
      retrasoPromedioDias: 0,
      aTiempo: 0.96,
      puertoOrigen: 'Shenzhen (Yantian)',
    },
  },
  {
    id: 'pr_weiye',
    datos: {
      ...FABRICA,
      nombre: 'Ningbo Weiye Garments Co., Ltd.',
      nombreCorto: 'Ningbo Weiye',
      ciudad: 'Ningbo',
      categoriasProducto: ['blazers', 'trajes'],
      calificacion: 3,
    },
    perfil: { cadencia: 150, defectos: 0.048, retrasoPromedioDias: 12, aTiempo: 0.4, puertoOrigen: 'Ningbo' },
  },
  {
    id: 'pr_lanxin',
    datos: {
      ...FABRICA,
      nombre: 'Hangzhou Lanxin Knitwear Co., Ltd.',
      nombreCorto: 'Hangzhou Lanxin',
      ciudad: 'Hangzhou',
      categoriasProducto: ['punto', 'abrigos_chaquetas', 'accesorios'],
      calificacion: 4,
    },
    perfil: {
      cadencia: 'semestral',
      defectos: 0.02,
      retrasoPromedioDias: 4,
      aTiempo: 0.75,
      puertoOrigen: 'Shanghái',
    },
  },
  {
    id: 'pr_yuefeng',
    datos: {
      ...FABRICA,
      moneda: 'CNY',
      nombre: 'Shaoxing Yuefeng Apparel Co., Ltd.',
      nombreCorto: 'Shaoxing Yuefeng',
      ciudad: 'Shaoxing',
      categoriasProducto: ['pantalones'],
      calificacion: 4,
    },
    perfil: { cadencia: 120, defectos: 0.025, retrasoPromedioDias: 3, aTiempo: 0.8, puertoOrigen: 'Ningbo' },
  },
  {
    id: 'pr_ruifeng',
    datos: {
      ...FABRICA,
      moneda: 'CNY',
      nombre: 'Wenzhou Ruifeng Footwear Co., Ltd.',
      nombreCorto: 'Wenzhou Ruifeng',
      ciudad: 'Wenzhou',
      categoriasProducto: ['calzado', 'accesorios'],
      calificacion: 4,
    },
    perfil: { cadencia: 240, defectos: 0.03, retrasoPromedioDias: 5, aTiempo: 0.7, puertoOrigen: 'Ningbo' },
  },
  // Proveedores locales.
  {
    id: 'pr_arr_p93',
    datos: {
      ...LOCAL,
      nombre: 'Inmuebles Altamira 93 S.A.S.',
      nombreCorto: 'Inmuebles Altamira 93',
      nit: '900.618.244-9',
      condicionesPago: 'Mensual anticipado, vence el día 5',
      categoriaLocal: 'arriendo',
      localId: 'p93',
      calificacion: 4,
    },
    perfil: null,
  },
  {
    id: 'pr_arr_usq',
    datos: {
      ...LOCAL,
      nombre: 'Rentas Casona de Usaquén S.A.S.',
      nombreCorto: 'Rentas Casona de Usaquén',
      nit: '901.005.317-0',
      condicionesPago: 'Mensual anticipado, vence el día 5',
      categoriaLocal: 'arriendo',
      localId: 'usq',
      calificacion: 5,
    },
    perfil: null,
  },
  {
    id: 'pr_arr_zr',
    datos: {
      ...LOCAL,
      nombre: 'Copropiedad Paseo Granate P.H.',
      nombreCorto: 'Paseo Granate',
      nit: '830.092.641-6',
      condicionesPago: 'Mensual anticipado, vence el día 5 (incluye administración)',
      categoriaLocal: 'arriendo',
      localId: 'zr',
      calificacion: 4,
    },
    perfil: null,
  },
  {
    id: 'pr_aduanas',
    datos: {
      ...LOCAL,
      nombre: 'Agencia de Aduanas Litoral S.A.S. Nivel 2',
      nombreCorto: 'Agencia de Aduanas Litoral',
      nit: '900.774.512-5',
      ciudad: 'Buenaventura',
      condicionesPago: 'Honorarios al levante; tributos girados por el importador',
      categoriaLocal: 'aduanas',
      localId: null,
      calificacion: 5,
    },
    perfil: null,
  },
  {
    id: 'pr_carga',
    datos: {
      ...LOCAL,
      nombre: 'Cordillera Carga Internacional S.A.S.',
      nombreCorto: 'Cordillera Carga',
      nit: '901.330.468-7',
      condicionesPago: 'Flete marítimo al embarque; gastos en destino al arribo',
      categoriaLocal: 'carga',
      localId: null,
      calificacion: 4,
    },
    perfil: null,
  },
  {
    id: 'pr_transporte',
    datos: {
      ...LOCAL,
      nombre: 'Transportes Sabana Carga S.A.S.',
      nombreCorto: 'Transportes Sabana Carga',
      nit: '900.452.119-1',
      condicionesPago: 'Contra entrega en bodega, 15 días',
      categoriaLocal: 'transporte',
      localId: null,
      calificacion: 4,
    },
    perfil: null,
  },
  {
    id: 'pr_empaques',
    datos: {
      ...LOCAL,
      nombre: 'Empaques Kraft del Norte S.A.S.',
      nombreCorto: 'Empaques Kraft del Norte',
      nit: '901.117.903-8',
      condicionesPago: '30 días',
      categoriaLocal: 'empaques',
      localId: null,
      calificacion: 4,
    },
    perfil: null,
  },
  {
    id: 'pr_vigilancia',
    datos: {
      ...LOCAL,
      nombre: 'Vigilancia Escudo Sabanero Ltda.',
      nombreCorto: 'Escudo Sabanero',
      nit: '900.893.256-4',
      condicionesPago: 'Mensual, vence el día 10',
      categoriaLocal: 'vigilancia',
      localId: null,
      calificacion: 3,
    },
    perfil: null,
  },
  {
    id: 'pr_contador',
    datos: {
      ...LOCAL,
      nombre: 'Contable Mirador S.A.S.',
      nombreCorto: 'Contable Mirador',
      nit: '901.268.034-1',
      condicionesPago: 'Honorarios mensuales, vencen el día 15',
      categoriaLocal: 'contabilidad',
      localId: null,
      calificacion: 5,
    },
    perfil: null,
  },
  {
    id: 'pr_publicidad',
    datos: {
      ...LOCAL,
      nombre: 'Estudio Contraluz Publicidad S.A.S.',
      nombreCorto: 'Estudio Contraluz',
      nit: '901.482.735-0',
      condicionesPago: '50 % al aprobar la campaña, 50 % al publicar',
      categoriaLocal: 'publicidad',
      localId: null,
      calificacion: 4,
    },
    perfil: null,
  },
];

/** Contactos de la cadena de importación (1.5). WeChat es simulado: "Copiar para WeChat". */
export const CONTACTOS: (DatosContacto & { id: Id })[] = [
  {
    id: 'co_lily_chen',
    nombre: 'Lily Chen',
    empresa: 'Guangzhou Huameng Garment Co., Ltd.',
    rol: 'proveedor',
    proveedorId: 'pr_huameng',
    correo: 'lily.chen@huameng-garment.example',
    whatsapp: '+86 138 2716 4405',
    pais: 'China',
    idioma: 'en',
    tratamiento: 'tu',
    canalPreferido: 'wechat',
    wechat: 'lilychen_hm88',
  },
  {
    id: 'co_kevin_wang',
    nombre: 'Kevin Wang',
    empresa: 'Ningbo Weiye Garments Co., Ltd.',
    rol: 'proveedor',
    proveedorId: 'pr_weiye',
    correo: 'kevin.wang@weiye-garments.example',
    whatsapp: '+86 139 5742 8810',
    pais: 'China',
    idioma: 'en',
    tratamiento: 'tu',
    canalPreferido: 'correo',
    wechat: 'kwang_nbweiye',
  },
  {
    id: 'co_vivian_zhou',
    nombre: 'Vivian Zhou',
    empresa: 'Hangzhou Lanxin Knitwear Co., Ltd.',
    rol: 'proveedor',
    proveedorId: 'pr_lanxin',
    correo: 'vivian.zhou@lanxin-knit.example',
    whatsapp: '+86 136 0571 2293',
    pais: 'China',
    idioma: 'en',
    tratamiento: 'tu',
    canalPreferido: 'wechat',
    wechat: 'vivianz_lanxin',
  },
  {
    id: 'co_jason_liu',
    nombre: 'Jason Liu',
    empresa: 'Shaoxing Yuefeng Apparel Co., Ltd.',
    rol: 'proveedor',
    proveedorId: 'pr_yuefeng',
    correo: 'jason.liu@yuefeng-apparel.example',
    whatsapp: '+86 137 5752 6618',
    pais: 'China',
    idioma: 'en',
    tratamiento: 'tu',
    canalPreferido: 'whatsapp',
    wechat: 'jasonliu_sx',
  },
  {
    id: 'co_cherry_huang',
    nombre: 'Cherry Huang',
    empresa: 'Wenzhou Ruifeng Footwear Co., Ltd.',
    rol: 'proveedor',
    proveedorId: 'pr_ruifeng',
    correo: 'cherry.huang@ruifeng-shoes.example',
    whatsapp: '+86 135 7788 0421',
    pais: 'China',
    idioma: 'en',
    tratamiento: 'tu',
    canalPreferido: 'wechat',
    wechat: 'cherry_rfshoes',
  },
  {
    id: 'co_felipe_navarro',
    nombre: 'Felipe Navarro',
    empresa: 'Cordillera Carga Internacional S.A.S.',
    rol: 'agente_carga',
    proveedorId: 'pr_carga',
    correo: 'felipe.navarro@cordilleracarga.example',
    whatsapp: '+57 316 442 8190',
    pais: 'Colombia',
    idioma: 'es',
    tratamiento: 'usted',
    canalPreferido: 'whatsapp',
    wechat: null,
  },
  {
    id: 'co_carolina_mejia',
    nombre: 'Carolina Mejía',
    empresa: 'Agencia de Aduanas Litoral S.A.S. Nivel 2',
    rol: 'agente_aduanas',
    proveedorId: 'pr_aduanas',
    correo: 'carolina.mejia@aduanaslitoral.example',
    whatsapp: '+57 310 885 2047',
    pais: 'Colombia',
    idioma: 'es',
    tratamiento: 'usted',
    canalPreferido: 'whatsapp',
    wechat: null,
  },
  {
    id: 'co_oscar_rincon',
    nombre: 'Óscar Rincón',
    empresa: 'Transportes Sabana Carga S.A.S.',
    rol: 'transportador',
    proveedorId: 'pr_transporte',
    correo: 'oscar.rincon@sabanacarga.example',
    whatsapp: '+57 313 207 6654',
    pais: 'Colombia',
    idioma: 'es',
    tratamiento: 'usted',
    canalPreferido: 'whatsapp',
    wechat: null,
  },
];

/** Contactos de la cadena preseleccionados en toda importación (agente de carga, aduanas y transportador). */
export const CADENA_IMPORTACION: Id[] = ['co_felipe_navarro', 'co_carolina_mejia', 'co_oscar_rincon'];
/** Contacto principal de cada fábrica. */
export const CONTACTO_FABRICA: Record<Id, Id> = {
  pr_huameng: 'co_lily_chen',
  pr_weiye: 'co_kevin_wang',
  pr_lanxin: 'co_vivian_zhou',
  pr_yuefeng: 'co_jason_liu',
  pr_ruifeng: 'co_cherry_huang',
};
