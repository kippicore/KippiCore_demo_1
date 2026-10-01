/** Copy de la interfaz del punto de venta y de la caja (A1). Español de Colombia, tono directo (PLAN 8.11). */
export const TEXTOS = {
  escaneo: {
    boton: 'Simular escaneo',
    ayuda: 'Escribe o escanea un código y presiona Enter.',
  },
  masVendidos: (local: string) => `Lo más vendido en ${local}`,
  grillaAyuda: (local: string) => `Toca una talla para agregarla. Las existencias son las de ${local}.`,
  carritoVacio: {
    titulo: 'El carrito está vacío',
    texto: 'Escanea o busca una prenda, o toca una de las más vendidas.',
  },
  autorizacionDatos: 'El cliente autoriza el tratamiento de sus datos personales para contacto comercial (Ley 1581 de 2012).',
  separadoSinCliente: 'Un separado necesita un cliente: búscalo o créalo arriba.',
  exito: {
    pie: 'El inventario, las ventas del día, la comisión, el cliente y la caja ya están actualizados. Toca "Ver" para abrir cada módulo con la fila cambiada resaltada.',
  },
  caja: {
    titulo: 'Caja',
    subtitulo: 'Abre la caja, registra los egresos y cierra con arqueo ciego. El dueño revisa los cierres de los tres locales.',
    revisionAyuda: 'La revisión y su nota quedan en el registro y se ven también en el escritorio y en la app.',
  },
} as const;
