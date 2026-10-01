/**
 * Textos de la guía (PLAN 2.2, 2.4–2.8). El paquete E2 es dueño del componente; los textos viven aquí.
 * Los destinos de los ítems se construyen con src/app/rutas.ts y selNarrativa() (nunca números a mano).
 */

export const ENTRADA = {
  firma: 'KIPPICORE CRM · DEMO PARA {{marca}}',
  datosAl: 'Datos al {{fechaLarga}}',
  frase:
    'Así se vería tu negocio con todo en un solo lugar: tres locales, inventario, importaciones, pagos y nómina, al día y sin cuaderno.',
  fraseCelular: 'Tu negocio, con todo en un solo lugar.',
  personalizar: 'Personalizar con el nombre de mi negocio',
  personalizarCorto: 'Personalizar',
  campoNegocio: 'Nombre de tu negocio',
  campoPersona: 'Tu nombre (para el saludo)',
  volverAHalden: 'Volver a {{marcaOriginal}}',
  puertaComputador: {
    ceja: 'EN EL COMPUTADOR',
    titulo: 'EL SISTEMA COMPLETO',
    texto:
      'Ventas, inventario por local, importaciones desde China, pagos y nómina. Lo que usarían tú y tu equipo cada día.',
    boton: 'ENTRAR COMO DUEÑO',
    botonVisitaRepetida: 'CONTINUAR COMO DUEÑO',
    ibasEn: 'Ibas en: {{modulo}}',
    vendedor: 'o mira lo que ve un vendedor →',
  },
  puertaCelular: {
    ceja: 'EN TU CELULAR',
    titulo: 'LA APP DEL DUEÑO',
    texto:
      'Cómo va el día y cómo cerraron las cajas de los tres locales, desde donde estés. Apunta la cámara de tu celular al código.',
    marco: 'o ábrela aquí en un marco de celular →',
    boton: 'ABRIR LA APP DEL DUEÑO',
  },
  sistemaCompletoCelular: {
    titulo: 'El sistema completo',
    texto: 'Está pensado para computador. Mándate el enlace y ábrelo allá.',
    compartir: 'COMPARTIR ENLACE',
    copiar: 'Copiar enlace',
    copiado: 'Enlace copiado',
  },
  navegadorInterno: 'Para la mejor experiencia, ábrelo en Safari o Chrome',
  navegadorInternoIos: 'Allá podrás agregarlo a tu pantalla de inicio',
  pie: 'Demostración con datos ficticios: nombres, cifras y documentos son de ejemplo. Lo que registres se guarda solo en este navegador.',
  cargando: 'Preparando 18 meses de historia de {{marca}}… {{porcentaje}} %',
} as const;

export interface ItemPruebaEsto {
  id: string;
  texto: string;
  hecho: string;
}

/** Los 8 ítems de "Prueba esto" (2.4). La detección de completado vive en la guía (E2). */
export const PRUEBA_ESTO = {
  titulo: 'PRUEBA ESTO',
  subtitulo: '8 cosas que puedes hacer en 10 minutos',
  contador: '{{hechos}} de 8',
  pildora: 'Prueba esto · {{hechos}}/8',
  items: [
    {
      id: 'venta',
      texto: 'Registra una venta y mira todo lo que se mueve',
      hecho: 'Hecho: registraste una venta',
    },
    { id: 'traslado', texto: 'Pasa camisas de un local a otro', hecho: 'Hecho: pediste un traslado' },
    {
      id: 'importacion',
      texto: 'Mueve tu importación y avísale a quien le toca',
      hecho: 'Hecho: moviste tu importación',
    },
    {
      id: 'flujo',
      texto: 'Mira cuánta plata vas a tener en 90 días',
      hecho: 'Hecho: viste tu flujo de caja',
    },
    {
      id: 'costo-empleado',
      texto: 'Descubre cuánto te cuesta de verdad un vendedor',
      hecho: 'Hecho: viste el costo de un empleado',
    },
    {
      id: 'rol',
      texto: 'Mira el sistema como lo vería tu vendedor',
      hecho: 'Hecho: viste la vista del vendedor',
    },
    {
      id: 'pedido',
      texto: 'Arma el próximo pedido a China con lo que más se vende',
      hecho: 'Hecho: armaste un pedido sugerido',
    },
    {
      id: 'celular',
      texto: 'Mira en tu celular cómo cerraron las cajas',
      hecho: 'Hecho: abriste la app del dueño',
    },
  ] satisfies ItemPruebaEsto[],
  lineaKippicore: '¿Lo quieres con tus datos?',
  paraIrMasLejos: {
    titulo: 'Para ir más lejos',
    items: [
      {
        id: 'whatsapp',
        texto: 'Pregúntale al WhatsApp si hay una camisa en tu talla',
        hecho: 'Hecho: probaste el WhatsApp',
      },
      { id: 'moneda', texto: 'Mira tus importaciones en dólares', hecho: 'Hecho: cambiaste la moneda' },
      {
        id: 'contador',
        texto: 'Exporta lo que necesita tu contador',
        hecho: 'Hecho: exportaste el archivo del contador',
      },
      {
        id: 'tabla-dinamica',
        texto: 'Arma tu propia tabla dinámica',
        hecho: 'Hecho: armaste una tabla dinámica',
      },
      {
        id: 'tienda',
        texto: 'Compra en tu tienda web y mira la venta llegar',
        hecho: 'Hecho: compraste en la tienda web',
      },
      {
        id: 'portal',
        texto: 'Actualiza una importación como si fueras la agente de aduanas',
        hecho: 'Hecho: actualizaste el portal',
      },
    ] satisfies ItemPruebaEsto[],
  },
  cierre: {
    titulo: 'ESO ES KIPPICORE CRM.',
    texto:
      'Lo que acabas de ver funciona con datos de ejemplo. Imagínalo con tus referencias, tus tres locales y tu equipo.',
    comoArrancariamos: 'CÓMO ARRANCARÍAMOS',
    hablar: 'HABLAR CON KIPPICORE',
    seguir: 'Seguir explorando',
  },
} as const;

/** Pistas contextuales (2.5): id → texto (máximo 25 palabras). */
export const PISTAS_TEXTOS: Record<string, string> = {
  'inicio.alertas':
    'Estas alertas salen solas de tus datos. Haz clic en cualquiera y te lleva directo a resolverla.',
  'pos.escaneo':
    '¿No tienes lector a mano? Este botón hace lo mismo que pasar una etiqueta por el lector de código de barras.',
  'caja.arqueo': 'Quien cierra cuenta sin ver cuánto debería haber. Así sabes si de verdad cuadró.',
  'ventas.totales':
    'Filtra por local, vendedor o medio de pago y estos totales se recalculan solos. Se acabó sumar en Excel.',
  'inventario.local':
    'Cada talla y cada color, en cada local. Abre una referencia para ver dónde está cada unidad y moverla.',
  'importaciones.estado':
    'Cambia el estado y KippiCore redacta el aviso para quien le toca actuar: fábrica, transportador o bodega. Tú solo confirmas.',
  'importaciones.sugerir':
    'Cantidades por talla y color según lo que rota, lo que tienes y lo que viene en camino. Ajústalas y manda el borrador.',
  'proveedores.moneda':
    'Tus fábricas cobran en dólares y yuanes. Cambia la moneda aquí arriba para ver importaciones y proveedores en US$ o CN¥.',
  'pagos.flujo':
    'Aquí ves si te alcanza la plata: lo que vas a recibir menos lo que tienes que pagar, semana a semana.',
  'pagos.datafono':
    'Lo que vendiste con tarjeta contra lo que te consignaron: comisión y retenciones, mes a mes.',
  'gastos.resultados':
    '¿Qué local te deja más plata? El estado de resultados lo responde, local por local, en palabras sencillas.',
  'personal.costo':
    'Un salario no es lo que te cuesta un empleado. Aquí ves el costo real, con prestaciones y aportes.',
  'turnos.recargos':
    'Cerrar después de las 7 p. m. y abrir el domingo cuesta más. Aquí ves cuánto, con valores que validas con tu contador.',
  'clientes.segmentos':
    'KippiCore agrupa a tus clientes solo: VIP, frecuentes, en riesgo. Escríbeles por WhatsApp con un clic.',
  'calendario.leyenda':
    'Turnos, contenedores, pagos y campañas en un solo calendario. Arrastra un evento para moverlo de día.',
  'analisis.hallazgos':
    'Estas frases las escribe el sistema leyendo tus ventas. Cambian cuando cambian tus datos.',
  'facturacion.marca':
    'Cada venta puede salir como factura electrónica o documento POS. En la demo es una simulación y no se envía a la DIAN.',
  'canales.escenarios':
    'Elige una conversación o escribe tú, como si fueras un cliente. El bot responde lo repetitivo y te pasa con un vendedor para cerrar.',
  'reportes.contador':
    'Un solo Excel con ventas, compras, gastos, nómina e IVA del periodo. Es lo que te pide tu contador.',
  'configuracion.restaurar':
    'Aquí se ajusta todo: tu marca, locales, tasas, nómina. Y si quieres empezar de cero, restaura la demo.',
  'app.hoy':
    'Agrégala a tu pantalla de inicio: en iPhone, Compartir → Agregar a inicio; en Android, menú ⋮ → Instalar app.',
  'app.hoy.navegadorInterno': 'Ábrela en Safari o Chrome para instalarla en tu celular.',
  'tienda.franja':
    'Esta tienda se arma sola con tu inventario. Compra algo y mira la venta llegar a KippiCore.',
  'portal.formulario':
    'Esto es lo que ve tu agente de aduanas con el enlace. Si actualiza el estado, a ti te llega la alerta.',
};
export const PISTA_BOTON = 'Entendido';

/** Franja del rol (2.5). */
export const FRANJA_ROL = {
  texto: 'Estás viendo KippiCore como: {{rol}} · {{local}} ({{persona}})',
  volver: 'VOLVER A LA VISTA DEL DUEÑO',
} as const;

/** Menú "?" (2.6): única definición. */
export const MENU_AYUDA = {
  verEntrada: 'Ver la entrada otra vez',
  mostrarPruebaEsto: 'Mostrar Prueba esto ({{hechos}} de 8)',
  verApp: 'Ver la app en el celular',
  comoArrancariamos: 'Cómo arrancaríamos',
  ocultarPistas: 'Ocultar pistas',
  mostrarPistas: 'Mostrar pistas',
  restaurar: 'Restaurar datos de la demo',
  hablar: 'Hablar con KippiCore',
  modoMemoria: 'Tus cambios se conservan mientras esta pestaña esté abierta.',
  sugerirRenovar: 'Tu demo conserva tus cambios de hace {{dias}} días. ¿Empezar de nuevo con datos frescos?',
  omitidosUsuario:
    '{{cantidad}} cambios de tu sesión anterior no se pudieron conservar tras una actualización de la demo.',
} as const;

/** Página "Cómo arrancaríamos" (2.8). */
export const COMO_ARRANCARIAMOS = {
  titulo: 'Cómo arrancaríamos',
  etapas: {
    titulo: 'Por etapas, con lo que más te duele primero',
    items: [
      {
        etapa: 'Etapa 1',
        titulo: 'Punto de venta, inventario por local y cierre de caja',
        semanas: 'Semanas 1 a 4',
      },
      { etapa: 'Etapa 2', titulo: 'Importaciones, proveedores y pagos', semanas: 'Semanas 5 a 8' },
      { etapa: 'Etapa 3', titulo: 'Nómina, turnos y reportes para tu contador', semanas: 'Semanas 9 a 12' },
    ],
    nota: 'Semanas aproximadas; las fijamos contigo según tu operación.',
  },
  excel: {
    titulo: 'Cargamos tus Excel nosotros',
    texto:
      'Referencias, existencias, clientes y proveedores: tú nos pasas tus archivos y nosotros los dejamos listos.',
    enlace: 'Trae tu Excel',
  },
  dispositivos: {
    titulo: 'Funciona en el computador del local, en una tablet y en el celular',
    texto: 'Tus vendedores consultan existencias desde el piso de venta.',
  },
  internet: {
    titulo: 'Si se cae el internet en el local',
    texto:
      'En la implementación diseñamos contigo cómo seguir registrando ventas y sincronizar cuando vuelva la conexión.',
  },
  datos: { titulo: 'Tus datos son tuyos', texto: 'Puedes descargarlos cuando quieras, en Excel.' },
  contador: {
    titulo: 'Convive con tu facturador y tu contador',
    texto: 'KippiCore se acomoda a cómo trabajas hoy con tu contador y tu proveedor de facturación.',
  },
  cta: {
    hablar: 'HABLAR CON KIPPICORE',
    subtitulo: 'Agenda 20 minutos con Miguel',
    seguir: 'Seguir explorando',
  },
} as const;

/** Importar desde Excel (simulado, 4.6). */
export const TRAE_TU_EXCEL = {
  boton: 'Importar desde Excel',
  texto: 'En la implementación, KippiCore carga tus archivos actuales de Excel.',
} as const;

/** App del dueño (2.1, 5.6.8). */
export const APP = {
  chipDatos: 'Datos de ejemplo de este celular',
  explicacionChip:
    'Cada navegador guarda sus propios datos de ejemplo. Lo que hiciste en el computador llega aquí cuando escaneas el código.',
  explicacionPwaIos: 'Esta app instalada guarda sus propios datos de ejemplo.',
  abrirEnComputador: {
    titulo: 'Abre el sistema completo en tu computador',
    compartir: 'Compartir enlace',
    copiar: 'Copiar enlace',
  },
  actualizarHora: 'Actualizar a la hora actual',
} as const;
