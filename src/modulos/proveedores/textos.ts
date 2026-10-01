import type { Categoria, CategoriaProveedorLocal, Moneda, RolContacto, TipoProveedor } from '@/dominio/tipos';
import type { EstiloEstado } from '@/config/estados';

/** Copy de la interfaz de Proveedores (B2). Todo en español de Colombia; ninguna cifra se escribe a mano aquí. */

export const CATEGORIAS_PRODUCTO: Record<Categoria, string> = {
  camisas: 'Camisas',
  blazers: 'Blazers',
  pantalones: 'Pantalones',
  polos: 'Polos',
  abrigos_chaquetas: 'Abrigos y chaquetas',
  punto: 'Punto',
  trajes: 'Trajes',
  calzado: 'Calzado',
  accesorios: 'Accesorios',
};

export const CATEGORIAS_LOCAL: Record<CategoriaProveedorLocal, string> = {
  arriendo: 'Arriendo',
  servicios: 'Servicios',
  empaques: 'Empaques',
  publicidad: 'Publicidad',
  sastreria: 'Sastrería y arreglos',
  vigilancia: 'Vigilancia',
  transporte: 'Transporte',
  mantenimiento: 'Mantenimiento',
  tecnologia: 'Tecnología',
  contabilidad: 'Contabilidad',
  aduanas: 'Agente de aduanas',
  carga: 'Agente de carga',
};

export const TIPOS_PROVEEDOR: Record<TipoProveedor, { etiqueta: string; plural: string; descripcion: string }> = {
  fabrica: {
    etiqueta: 'Fábrica',
    plural: 'Fábricas',
    descripcion: 'Te fabrica la mercancía y te cobra en dólares o yuanes.',
  },
  local: {
    etiqueta: 'Proveedor local',
    plural: 'Proveedores locales',
    descripcion: 'Arriendos, servicios, empaques, publicidad, vigilancia y demás gastos en pesos.',
  },
};

export const ROLES_CONTACTO: Record<RolContacto, string> = {
  proveedor: 'Contacto comercial',
  agente_carga: 'Agente de carga',
  agente_aduanas: 'Agente de aduanas',
  transportador: 'Transportador',
  otro: 'Otro',
};

export const CANALES: Record<'whatsapp' | 'correo' | 'wechat', string> = {
  whatsapp: 'WhatsApp',
  correo: 'Correo',
  wechat: 'WeChat',
};

export const NOMBRES_MONEDA: Record<Moneda, string> = {
  COP: 'Pesos (COP)',
  USD: 'Dólares (USD)',
  CNY: 'Yuanes (CNY)',
};

/** Veredicto de una fábrica según su puntualidad y sus defectos (calculos.ts). */
export const VEREDICTOS: Record<'confiable' | 'reservas' | 'incumple' | 'sin_datos', EstiloEstado> = {
  confiable: { etiqueta: 'Cumple', tono: 'success' },
  reservas: { etiqueta: 'Con reservas', tono: 'warning' },
  incumple: { etiqueta: 'Incumple', tono: 'danger' },
  sin_datos: { etiqueta: 'Sin entregas', tono: 'neutral' },
};

export const TEXTOS = {
  directorio: {
    titulo: 'Proveedores',
    subtitulo: 'Tus fábricas en China y tus proveedores locales: cuánto les has comprado, cuánto les debes y quién te cumple.',
    buscar: 'Buscar por nombre, ciudad o categoría',
    vacioTitulo: 'Ningún proveedor con estos filtros',
    vacioTexto: 'Prueba con otro nombre o limpia los filtros para ver todo el directorio.',
    sinProveedoresTitulo: 'Aún no tienes proveedores registrados',
    sinProveedoresTexto: 'Registra tu primera fábrica o tu primer proveedor local para empezar a ver cuánto les compras y les debes.',
    nuevo: 'Nuevo proveedor',
    comparar: 'Comparar fábricas',
  },
  comparativo: {
    titulo: 'Comparativo de fábricas',
    subtitulo: 'Costo por prenda, puntualidad y defectos de cada fábrica, calculados con lo que de verdad te han entregado.',
    notaCosto:
      'El costo promedio por unidad es el valor FOB de fábrica por prenda y depende de lo que fabrica cada una: un blazer no se compara con un polo.',
    notaCumplimiento:
      'Un pedido cuenta como “a tiempo” si llegó a la bodega a más tardar en la fecha estimada con la que se hizo, sin contar reprogramaciones. Los datos de ejemplo de la demo son ficticios.',
    sinEntregas: 'Aún sin pedidos recibidos',
  },
  ficha: {
    noEncontradoTitulo: 'No encontramos a ese proveedor',
    noEncontradoTexto: 'Pudo haberse eliminado o el enlace está incompleto. Vuelve al directorio para buscarlo.',
  },
} as const;
