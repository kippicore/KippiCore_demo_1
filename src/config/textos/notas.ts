/** Notas legales fijas (PLAN 8.7.32, 8.11.5). Nunca citan números de normas. */
export type TipoNotaLegal = 'nomina' | 'tributario' | 'aduanero' | 'contrato_realidad';

export const NOTAS_LEGALES: Record<TipoNotaLegal, string> = {
  nomina:
    'Cálculo ilustrativo para la demo. Los valores se parametrizan y validan con el contador en la implementación.',
  tributario: 'Valores y fechas ilustrativos · se validan con tu contador.',
  aduanero: 'Valores de ejemplo · se validan con tu agente de aduanas.',
  contrato_realidad:
    'Una persona por prestación de servicios con horario fijo y marcación puede configurar una relación laboral. Revísalo con tu contador.',
};

export const TEXTOS_FIJOS = {
  firmaBarraLateral: 'Desarrollado por KippiCore',
  vitrina: 'Vista previa de lo que KippiCore puede construir para {{marca}}',
  marcaDeAgua: 'DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL',
  tasaEjemplo: 'Tasa de ejemplo',
  enviadoSimulado: 'Enviado (simulación)',
  wechatSimulado: 'WeChat (simulación)',
  copiarWechat: 'Copiar para WeChat',
  marcaEjemplo: '{{marca}} es una marca de ejemplo.',
  documentoPos: 'Documento equivalente electrónico POS (simulado)',
  nominaElectronica: 'Nómina electrónica: transmitida (simulación)',
  metodoCosto: 'Costo de reposición: última importación aplicada',
  valorIlustrativo: 'Valor ilustrativo · verificar',
  valorEjemploAduanas: 'Valor de ejemplo · se valida con tu agente de aduanas',
  contadorExcel: 'Valores ilustrativos de la demo · se validan con tu contador',
  enlaceSinDestinatario: 'En la versión real se abre el chat de esa persona.',
} as const;
