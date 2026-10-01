import type { Cargo, TipoVinculacion } from '@/dominio/tipos';

/**
 * Textos de la interfaz de Personal, nómina y comisiones (C1). Ninguno cita números de leyes, decretos ni artículos:
 * los valores legales salen de los parámetros ilustrativos y se presentan con `<NotaLegal>` (PLAN 8.11.5).
 */

export const ETIQUETA_CARGO: Record<Cargo, string> = {
  vendedor: 'Vendedor',
  cajero: 'Cajero',
  jefe_bodega: 'Jefe de bodega',
  auxiliar_bodega: 'Auxiliar de bodega',
  administracion: 'Administración',
  sastre: 'Sastre',
  contenido_redes: 'Contenido y redes',
};

export const CARGOS: readonly Cargo[] = ['vendedor', 'cajero', 'jefe_bodega', 'auxiliar_bodega', 'administracion', 'sastre', 'contenido_redes'];

export const ETIQUETA_VINCULACION: Record<TipoVinculacion, string> = {
  laboral: 'Contrato laboral',
  prestacion_servicios: 'Prestación de servicios',
};

export const ETIQUETA_MODALIDAD: Record<'indefinido' | 'fijo' | 'obra_labor', string> = {
  indefinido: 'Término indefinido',
  fijo: 'Término fijo',
  obra_labor: 'Obra o labor',
};

export const ETIQUETA_DOCUMENTO: Record<'CC' | 'CE' | 'PPT', string> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  PPT: 'Permiso por protección temporal',
};

export const ETIQUETA_CUENTA: Record<'ahorros' | 'corriente' | 'nequi' | 'daviplata', string> = {
  ahorros: 'Cuenta de ahorros',
  corriente: 'Cuenta corriente',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
};

export const ETIQUETA_RIESGO_ARL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Riesgo I · oficina y comercio',
  2: 'Riesgo II',
  3: 'Riesgo III',
  4: 'Riesgo IV',
  5: 'Riesgo V',
};

export const ETIQUETA_PERIODICIDAD: Record<'quincenal' | 'mensual', string> = {
  quincenal: 'Quincenal',
  mensual: 'Mensual',
};

export const ETIQUETA_TIPO_DETALLE: Record<'venta' | 'devolucion' | 'cancelacion', string> = {
  venta: 'Venta',
  devolucion: 'Devolución',
  cancelacion: 'Separado cancelado',
};

export const MODOS_COSTO = {
  pactado: { etiqueta: 'Salario pactado', ayuda: 'Un mes completo, solo con lo que dice el contrato.' },
  mes_actual: { etiqueta: 'Este mes, con comisiones y recargos', ayuda: 'Lo que va del mes con sus ventas, recargos y horas extra, proyectado a un mes completo.' },
} as const;

export const TEXTOS = {
  lista: {
    titulo: 'Personal y nómina',
    subtitulo: 'Cuánto te cuesta de verdad cada persona, con prestaciones y aportes, local por local',
    vacioTitulo: 'Ninguna persona con estos filtros',
    vacioTexto: 'Cambia el local, la vinculación o la búsqueda para ver más personas del equipo.',
    sinEquipoTitulo: 'Todavía no hay personas en tu equipo',
    sinEquipoTexto: 'Crea la primera ficha: con su contrato verás enseguida cuánto le cuesta al negocio.',
    notaCosto: 'El costo para el negocio suma salario, auxilio, aportes del empleador y lo que debes provisionar cada mes (prima, cesantías, intereses y vacaciones).',
    sinExoneracion: 'Sin exoneración: el negocio paga también la salud del empleador, el ICBF y el SENA.',
    conExoneracion: 'Con exoneración: no se pagan la salud del empleador, el ICBF ni el SENA.',
    porLocalTitulo: 'Cuánto pesa la nómina en cada local',
    porLocalNota: 'Costo de la nómina sobre las ventas del último mes completo. La bodega y la administración no venden: su costo se reparte entre los locales en el estado de resultados.',
  },
  riesgo: {
    titulo: 'Riesgo de contrato realidad',
    resumen: (n: number) =>
      n === 1
        ? 'Una persona por prestación de servicios trabaja como si fuera empleada'
        : `${n} personas por prestación de servicios trabajan como si fueran empleadas`,
    explicacion:
      'Tienen turnos fijos, tres o más días por semana durante las últimas semanas, y marcan entrada y salida. Eso se parece a una relación laboral. Mientras los honorarios se paguen como prestación de servicios, el negocio no paga prestaciones ni aportes: si la relación se considerara laboral, esa diferencia podría reclamarse.',
    exposicion: 'Si estas personas fueran empleadas, tu nómina costaría más cada mes',
    cta: 'Comparar las dos modalidades',
    verCosto: 'Ver su costo como contrato laboral',
    quitarFiltro: 'Ver a todo el equipo',
  },
  ficha: {
    noEncontradoTitulo: 'No encontramos a esa persona',
    noEncontradoTexto: 'Puede que la ficha ya no exista o que el enlace esté incompleto. Vuelve a la lista del equipo.',
    retiradoAviso: 'Esta persona ya está retirada. Su ficha se conserva para sus desprendibles y su historial.',
  },
  costo: {
    titulo: 'Lo que de verdad te cuesta',
    pregunta: 'Un salario de {valor} le cuesta al negocio {costo} al mes',
    preguntaPrestacion: 'Honorarios de {valor} le cuestan al negocio {costo} al mes',
    exoneracion: 'Exoneración de aportes (salud, ICBF y SENA)',
    exoneracionAyuda: 'Valor ilustrativo · verificar. Aplica a quienes ganan menos de diez salarios mínimos: el negocio no paga la salud del empleador, el ICBF ni el SENA.',
    mesActualNota: 'Mensualizado: las ventas, los recargos y las horas extra de los días que van del mes se proyectan a un mes completo. La comisión también genera prestaciones y aportes.',
    pactadoNota: 'Un mes completo sin comisiones, recargos ni horas extra: lo que dice el contrato.',
    sinContrato: 'Esta persona no tiene un contrato vigente, así que todavía no se puede calcular su costo.',
    ahorroExoneracion: 'La exoneración le ahorra al negocio {valor} al mes con esta persona',
    sinAhorro: 'Con esta persona la exoneración no cambia el costo.',
    prestacionResumen: 'Por prestación de servicios el negocio paga solo los honorarios y las comisiones: no hay auxilio, aportes ni prestaciones a cargo del negocio.',
  },
  comparativo: {
    titulo: '¿Cuánto me cuesta en cada modalidad?',
    subtitulo: 'El mismo cargo, por contrato laboral o por prestación de servicios, lado a lado',
    leccion:
      'Lo que cuesta menos en el papel no siempre sale más barato. La prestación de servicios no sirve para una relación con horario y órdenes: si la persona trabaja como empleada, podría reclamarse lo que no se pagó. Revísalo con tu contador.',
    siEmpleados: 'Si estas personas fueran empleadas, el negocio pagaría más cada mes',
    sinRiesgo: 'Hoy ninguno de tus contratistas muestra señales de relación laboral.',
  },
  nomina: {
    titulo: 'Nómina',
    subtitulo: 'Liquida el periodo sin hoja de cálculo: vista previa, aprobar, pagar y desprendibles',
    sinPeriodoTitulo: 'La nómina está al día',
    sinPeriodoTexto: 'No hay periodos pendientes por liquidar. Cuando termine el siguiente, lo verás aquí con su vista previa.',
    aprobarConsecuencias: 'Al aprobar queda registrada la liquidación, se crea la cuenta por pagar de cada persona y la de seguridad social, y el gasto de nómina entra al estado de resultados.',
    periodoNoTermina: 'El periodo termina el {fecha}: si apruebas hoy, los valores pueden cambiar con lo que falte del periodo.',
    electronica: 'Nómina electrónica: transmitida (simulación)',
    historialVacioTitulo: 'Todavía no hay nóminas aprobadas',
    historialVacioTexto: 'Cuando apruebes el primer periodo aparecerá aquí con su desprendible por persona.',
    pilaPendiente: 'Pendiente de soporte PILA',
  },
  comisiones: {
    titulo: 'Comisiones',
    subtitulo: 'Lo que ganó cada vendedor este mes, con el detalle de cada venta',
    baseNota: 'La comisión se calcula sobre la venta sin IVA, menos devoluciones y separados cancelados del mes.',
    mesEnCurso: 'Mes en curso: las cifras llegan hasta hoy. La comisión se liquida con la nómina que cierra el mes.',
    vacioTitulo: 'Sin comisiones en este mes',
    vacioTexto: 'Ningún vendedor con esquema de comisión registró ventas en este mes.',
    repartoNota: 'El esquema se calcula sobre el total del mes; aquí cada venta aporta de forma proporcional a su base para que el detalle sume la comisión.',
    esquemasTitulo: 'Esquemas de comisión',
    esquemasTexto: 'Cada persona tiene un esquema en su contrato. Cambia el porcentaje o los tramos y la comisión del mes se recalcula en todas las pantallas.',
    metasTitulo: 'Metas de ventas por local',
    metasTexto: 'Si el local alcanza su meta, los esquemas con bono por meta pagan el bono a todo su equipo.',
  },
  misComisiones: {
    titulo: 'Mis comisiones',
    subtitulo: 'Lo que llevas ganado este mes y cada venta que lo suma',
    sinEmpleadoTitulo: 'No encontramos tu ficha de vendedor',
    sinEmpleadoTexto: 'Esta pantalla muestra las comisiones de quien tiene un esquema de comisión. Pídele al dueño que revise tu contrato.',
    sinEsquemaTitulo: 'Tu contrato no tiene comisión',
    sinEsquemaTexto: 'Cuando el dueño te asigne un esquema de comisión, aquí verás cuánto llevas ganado en cada mes.',
  },
  error: {
    titulo: 'No pudimos armar esta sección',
    texto: 'Algo falló al calcular estas cifras. Tus datos están intactos: intenta de nuevo.',
  },
} as const;
