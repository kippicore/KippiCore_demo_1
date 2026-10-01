/**
 * Textos propios de la entrada (E2). Los que comparten otros paquetes (firma, puertas, aviso de navegador interno)
 * viven en `config/textos/guia.ts`; aquí está lo que solo usa esta pantalla.
 */
export const TEXTOS_ENTRADA = {
  /** Titular de campaña (computador): mitad de la frase de 2.2.1; la otra mitad es `frase`. */
  titular: 'Así se vería tu negocio con todo en un solo lugar',
  frase: 'Tres locales, inventario, importaciones, pagos y nómina, al día y sin cuaderno.',
  guardar: 'Guardar nombre',
  vistaPrevia: 'Así se verá en toda la demo',
  guardado: 'Listo: la demo ahora es de {{nombre}}',
  restablecido: 'Volviste a HALDEN',
  marcoCelular: 'o ábrela aquí en un marco de celular →',
  progreso: 'Preparando 18 meses de historia de {{marca}}…',
  listo: 'Todo listo: {{locales}}, {{referencias}} y {{clientes}} con 18 meses de historia.',
  error: 'No pudimos preparar los datos de ejemplo. Recarga la página para intentarlo de nuevo.',
  cartel: {
    blazer: 'Blazer · Carbón',
    camisa: 'Camisa · Azul cielo',
    corbata: 'Corbata · Rayas marino',
  },
} as const;
