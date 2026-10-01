/**
 * Textos propios del panel "Prueba esto" y de la página "Cómo arrancaríamos" (E2). Los ítems, el cierre y el menú "?"
 * viven en `config/textos/guia.ts` (compartidos con la app del dueño); aquí está lo que solo usa el escritorio.
 */
export const TEXTOS_GUIA = {
  minimizar: 'Minimizar Prueba esto',
  abrir: 'Abrir Prueba esto',
  hechoEtiqueta: 'Hecho',
  masLejosContador: '{{hechos}}/{{total}}',
  verLista: 'Ver la lista otra vez',
  linea: {
    comoArrancariamos: 'Cómo arrancaríamos',
    hablar: 'Hablar con KippiCore',
    separador: 'o',
  },
} as const;

export const TEXTOS_ARRANCAR = {
  subtitulo: 'Una forma de pasar de tus Excel y tu cuaderno a un solo sistema, por etapas y con lo que más te duele primero.',
  semana: 'Semana',
  verEnDemo: 'Míralo en la demo',
  etapasDetalle: [
    {
      incluye: ['Punto de venta en cada local', 'Inventario por talla, color y local', 'Cierre de caja cada noche'],
      demo: 'Punto de venta',
    },
    {
      incluye: ['Importaciones desde China, con sus avisos', 'Proveedores y costo aterrizado', 'Pagos, datáfono y flujo de caja'],
      demo: 'Importaciones',
    },
    {
      incluye: ['Nómina, comisiones y turnos', 'Reportes y archivo para tu contador', 'Análisis de lo que más rota'],
      demo: 'Nómina',
    },
  ],
  excelItems: ['Referencias y existencias', 'Clientes', 'Proveedores'],
  dispositivos: [
    { titulo: 'Computador del local', texto: 'El punto de venta y la administración completa.' },
    { titulo: 'Tablet', texto: 'Para el piso de venta y el conteo de inventario.' },
    { titulo: 'Celular', texto: 'Tú ves cómo va el día y cómo cerraron las cajas.' },
  ],
  internetNota: 'Lo definimos contigo en la implementación, según el internet de cada local.',
  cierre: 'Cuéntanos cómo trabajas hoy y armamos el plan contigo.',
} as const;
