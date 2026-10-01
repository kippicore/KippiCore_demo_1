import { PLANTILLAS_CLIENTE, SALUDOS } from '@/config/textos/mensajes';
import { rellenarPlantilla } from '@/dominio/reglas/texto';
import type { FechaHoraISO } from '@/dominio/tipos';
import { slug } from '@/dominio/reglas/texto';
import { articulo, diaYMes, responder, tarjetaDe, tallasConStock } from './reglas';
import type { ContextoEscenarios } from './selectores';
import {
  MEMORIA_INICIAL,
  type CanalChat,
  type ContextoBot,
  type DatosBot,
  type Guion,
  type IdEscenario,
  type Memoria,
  type NodoFlujo,
  type PasoGuion,
  type ProductoBot,
  type Respuesta,
  type Traza,
} from './tipos';

/**
 * Guiones de la vitrina (PRD 7.14, W9). Cada escenario es una lista de pasos que el reproductor muestra en el
 * teléfono. Las líneas del cliente son de guion, pero las respuestas del bot salen del MISMO motor de reglas que
 * contesta el texto libre (`responder`) con el inventario real: si cambia una existencia, cambia la respuesta.
 * Los avisos que el negocio envía por su cuenta (separado, colección, cumpleaños, resumen) usan las plantillas
 * de `config/textos/mensajes.ts`, en el trato de cada cliente.
 */

// ---------------------------------------------------------------------------------------------------------
// Flujos del cerebro
// ---------------------------------------------------------------------------------------------------------
export const FLUJO_ENTRANTE: NodoFlujo[] = [
  { titulo: 'Mensaje recibido', descripcion: 'Llega el mensaje de un cliente' },
  { titulo: 'Entender', descripcion: 'Reconoce prenda, color y talla' },
  { titulo: 'Consultar datos', descripcion: 'Lee el inventario real por local' },
  { titulo: 'Responder', descripcion: 'Contesta con la regla que aplica' },
  { titulo: 'Pasar a una persona', descripcion: 'Entrega el cliente a quien cierra' },
];

const FLUJO_SEPARADO: NodoFlujo[] = [
  { titulo: 'Disparador', descripcion: 'Se registra un separado en el POS' },
  { titulo: 'Buscar el separado', descripcion: 'Lee el saldo y la fecha límite' },
  { titulo: 'Armar el mensaje', descripcion: 'Plantilla en el trato del cliente' },
  { titulo: 'Enviar', descripcion: 'Sale por WhatsApp' },
  { titulo: 'Esperar respuesta', descripcion: 'Atiende lo que responda' },
];

const FLUJO_COLECCION: NodoFlujo[] = [
  { titulo: 'Disparador', descripcion: 'Llega la nueva colección' },
  { titulo: 'Elegir audiencia', descripcion: 'Segmentos del CRM' },
  { titulo: 'Armar el mensaje', descripcion: 'Tú o usted según cada cliente' },
  { titulo: 'Enviar', descripcion: 'Sale por WhatsApp' },
  { titulo: 'Atender respuestas', descripcion: 'El bot y luego una persona' },
];

const FLUJO_CUMPLEANOS: NodoFlujo[] = [
  { titulo: 'Disparador', descripcion: 'Cada mañana, a las 8:00' },
  { titulo: 'Buscar cumpleaños', descripcion: 'Clientes que cumplen hoy' },
  { titulo: 'Armar el mensaje', descripcion: 'Con beneficio, tú o usted' },
  { titulo: 'Enviar', descripcion: 'Sale por WhatsApp' },
  { titulo: 'Atender respuesta', descripcion: 'Horario y local habitual' },
];

const FLUJO_RESUMEN: NodoFlujo[] = [
  { titulo: 'Disparador', descripcion: 'Todos los días, 9:30 p. m.' },
  { titulo: 'Calcular el día', descripcion: 'Ventas reales de los locales' },
  { titulo: 'Armar el resumen', descripcion: 'Cifra, ticket y mejor local' },
  { titulo: 'Enviar al dueño', descripcion: 'Sale por WhatsApp' },
  { titulo: 'Responder preguntas', descripcion: 'El mes y cada local' },
];

const FLUJO_COMENTARIO: NodoFlujo[] = [
  { titulo: 'Mensaje recibido', descripcion: 'Comentario o mensaje directo' },
  { titulo: 'Entender', descripcion: 'Detecta "precio", prenda y talla' },
  { titulo: 'Consultar datos', descripcion: 'Precio e inventario reales' },
  { titulo: 'Responder', descripcion: 'En público o por mensaje directo' },
  { titulo: 'Captura de contacto', descripcion: 'Crea el cliente en el CRM' },
];

// ---------------------------------------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------------------------------------
function sumarMinutos(ts: FechaHoraISO, min: number): FechaHoraISO {
  const total = Number(ts.slice(11, 13)) * 60 + Number(ts.slice(14, 16)) + min;
  const dia = Math.floor(total / 1440);
  const m = ((total % 1440) + 1440) % 1440;
  const f = ts.slice(0, 10);
  const d = new Date(`${f}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dia);
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${d.toISOString().slice(0, 10)}T${hh}:${mm}:00`;
}
export { sumarMinutos };

const horaDe = (ahora: FechaHoraISO) => Number(ahora.slice(11, 13));
const saludoPlantilla = (hora: number) =>
  hora < 12 ? SALUDOS.manana : hora < 19 ? SALUDOS.tarde : SALUDOS.noche;

type Linea = string | null | ((previa: Respuesta | null) => string | null);

/** Corre las líneas del cliente por el motor y devuelve los pasos (cliente y bot) y la memoria final. */
function conversar(
  lineas: Linea[],
  memoria: Memoria,
  d: DatosBot,
  ctx: ContextoBot,
  flujo: NodoFlujo[] = FLUJO_ENTRANTE,
): { pasos: PasoGuion[]; memoria: Memoria } {
  const pasos: PasoGuion[] = [];
  let mem = memoria;
  let previa: Respuesta | null = null;
  for (const l of lineas) {
    if (mem.traspasado) break;
    const texto = typeof l === 'function' ? l(previa) : l;
    if (!texto) continue;
    pasos.push({ tipo: 'cliente', texto, ts: '' });
    const r = responder(texto, mem, d, ctx);
    if (!r) continue;
    mem = r.memoria;
    previa = r;
    const traza = { ...r.traza, flujo };
    pasos.push({ tipo: 'bot', partes: r.partes, traza, ts: '', traspaso: r.traspaso });
    if (r.accion) pasos.push({ tipo: 'efecto', accion: r.accion, traza });
  }
  return { pasos, memoria: mem };
}

/** Pone una hora a cada mensaje: el último queda en `ahora` y los anteriores, un minuto antes cada uno. */
function conHoras(pasos: PasoGuion[], ahora: FechaHoraISO): PasoGuion[] {
  const conTs = pasos.filter((p) => p.tipo === 'cliente' || p.tipo === 'bot' || p.tipo === 'comentario');
  let i = 0;
  return pasos.map((p) => {
    if (p.tipo !== 'cliente' && p.tipo !== 'bot' && p.tipo !== 'comentario') return p;
    const atras = conTs.length - 1 - i;
    i += 1;
    return { ...p, ts: sumarMinutos(ahora, -atras) };
  });
}

const trazaFija = (regla: Traza['regla'], nodos: (string | null)[], extra: Partial<Traza> = {}): Traza => ({
  regla,
  nodos,
  ...extra,
});

/** Una talla con unidades (la del medio) y el local que más tiene, para que el ejemplo siempre tenga respuesta. */
export function ejemploDisponible(
  p: ProductoBot,
  d: DatosBot,
): { talla: string; localNombre: string } | null {
  for (const c of p.colores) {
    const tallas = tallasConStock(p, c.id, d);
    const t = tallas[Math.floor(tallas.length / 2)] ?? tallas[0];
    if (!t) continue;
    const celda = p.stock[`${t.talla}|${c.id}`] ?? {};
    const mejor = [...d.locales].sort((x, y) => (celda[y.id] ?? 0) - (celda[x.id] ?? 0))[0];
    if (mejor && (celda[mejor.id] ?? 0) > 0) return { talla: t.talla, localNombre: mejor.nombre };
  }
  return null;
}

const minusculaInicial = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
/** `el blazer de lana fría`, `la camisa Oxford entallada`. */
const conArticulo = (p: ProductoBot) => `${articulo(p.tipo)} ${minusculaInicial(p.nombre)}`;

// ---------------------------------------------------------------------------------------------------------
// Catálogo de escenarios
// ---------------------------------------------------------------------------------------------------------
type GuionBase = Omit<Guion, 'flujoEntrante'>;

export interface EntradaGuion {
  datos: DatosBot;
  contexto: ContextoEscenarios;
  ahora: FechaHoraISO;
}

function base(
  canal: CanalChat,
  nombre: string,
  nombres: string,
  ctx: ContextoBot,
): Pick<Guion, 'canal' | 'contacto' | 'contexto'> {
  return { canal, contacto: { nombre, detalle: nombres }, contexto: ctx };
}

function clienteTu(e: EntradaGuion): { nombre: string; id: string | null } {
  return { nombre: e.contexto.clienteTu?.primerNombre ?? 'Andrés', id: e.contexto.clienteTu?.id ?? null };
}
function clienteUsted(e: EntradaGuion): {
  nombre: string;
  id: string | null;
  local: string;
  localId: string | null;
} {
  const c = e.contexto.clienteUsted;
  return {
    nombre: c?.primerNombre ?? 'Ricardo',
    id: c?.id ?? null,
    local: c?.localHabitual ?? e.datos.locales[0]?.nombre ?? 'el local',
    localId: c?.localHabitualId ?? null,
  };
}

const botDe = (e: EntradaGuion, nombre: string, trato: 'tu' | 'usted'): ContextoBot => ({
  nombre,
  tratamiento: trato,
  hora: horaDe(e.ahora),
  rol: 'cliente',
  canal: 'whatsapp',
});

function consultaTalla(e: EntradaGuion): GuionBase {
  const c = clienteTu(e);
  const ctx = botDe(e, c.nombre, 'tu');
  const critico = e.datos.productos.find((p) => p.id === e.datos.criticoId) ?? e.datos.productos[0];
  const pregunta = critico?.nombre.toLowerCase().includes('oxford')
    ? 'Hola, ¿tienen la Oxford azul clarita en talla M?'
    : `Hola, ¿tienen ${critico?.nombre ?? 'esa prenda'} en talla M?`;
  const { pasos, memoria } = conversar(
    [
      pregunta,
      (r) =>
        r?.memoria.ofrecioSeparar
          ? `Sí, en ${r.traza.consultas?.find((x) => x.total > 0)?.filas[0]?.local ?? 'el que tenga más'}`
          : '¿Y en talla L?',
      (r) => (r?.memoria.ofrecioSeparar ? 'Sí, por favor' : null),
    ],
    MEMORIA_INICIAL,
    e.datos,
    ctx,
  );
  return {
    id: 'consulta-talla',
    ...base('whatsapp', `${e.datos.marca} · Asistente`, 'Responde con tu inventario real', ctx),
    flujo: FLUJO_ENTRANTE,
    reglas: ['inventario', 'precio', 'separar', 'sin_negociar', 'no_entiende'],
    disparador: 'Un cliente escribe por WhatsApp',
    pasos: conHoras(pasos, e.ahora),
    memoriaFinal: memoria,
  };
}

function pasoPersona(e: EntradaGuion): GuionBase {
  const u = clienteUsted(e);
  const ctx = botDe(e, u.nombre, 'usted');
  const blazer =
    e.datos.productos.find((p) => p.nombre === 'Blazer de lana fría') ??
    e.datos.productos.find((p) => p.tipo === 'blazer');
  const declarada = e.contexto.clienteUsted?.tallas.blazer;
  const conExistencias = (t: string) =>
    !!blazer && blazer.colores.some((c) => tallasConStock(blazer, c.id, e.datos).some((x) => x.talla === t));
  const talla =
    declarada && conExistencias(declarada) ? declarada : (blazer?.tallas.find(conExistencias) ?? '52');
  const { pasos, memoria } = conversar(
    [
      `Buenas tardes. ¿Tienen ${blazer ? conArticulo(blazer) : 'el blazer de lana fría'} en talla ${talla}?`,
      '¿Me pueden hacer un descuento si me llevo dos?',
    ],
    MEMORIA_INICIAL,
    e.datos,
    ctx,
  );
  return {
    id: 'paso-persona',
    ...base('whatsapp', `${e.datos.marca} · Asistente`, 'Cliente VIP: el bot le habla de usted', ctx),
    flujo: FLUJO_ENTRANTE,
    reglas: ['inventario', 'sin_negociar', 'persona'],
    disparador: 'Un cliente VIP escribe por WhatsApp',
    pasos: conHoras(pasos, e.ahora),
    memoriaFinal: memoria,
  };
}

function separadoSaldo(e: EntradaGuion): GuionBase {
  const s = e.contexto.separado;
  const fallback = clienteTu(e);
  const trato = s?.cliente.tratamiento ?? 'tu';
  const nombre = s?.cliente.primerNombre ?? fallback.nombre;
  const ctx = botDe(e, nombre, trato);
  const prenda = e.datos.productos[0];
  const total = s?.total ?? prenda?.precio ?? 0;
  const abonado = s?.abonado ?? Math.round(total * 0.2);
  const saldo = s?.saldo ?? total - abonado;
  const numero = s?.numero ?? 'V-000000';
  const limiteISO = s?.fechaLimite ?? e.ahora.slice(0, 10);
  const local = s?.local ?? e.datos.locales[0]?.nombre ?? 'el local';
  const datos = {
    Nombre: nombre,
    saludo: saludoPlantilla(horaDe(e.ahora)),
    numero,
    marca: e.datos.marca,
    abonado: e.datos.dinero(abonado),
    saldo: e.datos.dinero(saldo),
    fechaLimite: diaYMes(limiteISO),
    local,
  };
  const producto = s?.producto ?? prenda?.nombre ?? 'tu pedido';
  const dias = s?.diasParaVencer;
  const confirmacion = rellenarPlantilla(PLANTILLAS_CLIENTE.separado[trato], datos);
  const recordatorio = rellenarPlantilla(PLANTILLAS_CLIENTE.cobro[trato], datos);
  const respuestaCliente = 'Gracias por avisarme. Mañana paso a abonar.';
  const cierre =
    trato === 'usted'
      ? `Perfecto, ${nombre}. Lo esperamos en ${local}; el saldo es de ${e.datos.dinero(saldo)}.`
      : `Perfecto, ${nombre}. Te esperamos en ${local}; el saldo es de ${e.datos.dinero(saldo)}.`;
  const pasos: PasoGuion[] = [
    {
      tipo: 'sistema',
      texto: `Se registró el separado ${numero} (${producto})`,
      traza: trazaFija('confirmar_separado', [
        `Separado ${numero} registrado en ${local}`,
        `Saldo ${e.datos.dinero(saldo)} · vence el ${diaYMes(limiteISO)}`,
        'Plantilla «separado» en el trato del cliente',
        null,
        null,
      ]),
    },
    {
      tipo: 'bot',
      partes: [{ tipo: 'texto', texto: confirmacion }],
      ts: '',
      traza: trazaFija('confirmar_separado', [
        `Separado ${numero}`,
        `Abonó ${e.datos.dinero(abonado)} · saldo ${e.datos.dinero(saldo)}`,
        `Plantilla en ${trato === 'usted' ? 'usted' : 'tú'}`,
        'Confirmar el separado por WhatsApp',
        null,
      ]),
    },
    {
      tipo: 'sistema',
      texto:
        dias != null
          ? `Pasan los días: faltan ${dias} para el vencimiento`
          : 'Pasan los días: se acerca el vencimiento',
      traza: trazaFija('recordar_saldo', [
        'Faltan pocos días para el vencimiento',
        `Saldo pendiente: ${e.datos.dinero(saldo)}`,
        'Plantilla «cobro»',
        null,
        null,
      ]),
    },
    {
      tipo: 'bot',
      partes: [{ tipo: 'texto', texto: recordatorio }],
      ts: '',
      traza: trazaFija('recordar_saldo', [
        'Se acerca la fecha límite',
        `Saldo ${e.datos.dinero(saldo)} · vence el ${diaYMes(limiteISO)}`,
        'Recordatorio de saldo en el trato del cliente',
        'Enviar el recordatorio',
        null,
      ]),
    },
    { tipo: 'cliente', texto: respuestaCliente, ts: '' },
    {
      tipo: 'bot',
      partes: [{ tipo: 'texto', texto: cierre }],
      ts: '',
      traza: trazaFija('recordar_saldo', [
        `“${respuestaCliente}”`,
        'Intención: va a abonar',
        `Saldo ${e.datos.dinero(saldo)} en ${local}`,
        'Confirmar y esperar al cliente',
        null,
      ]),
    },
  ];
  return {
    id: 'separado-saldo',
    ...base('whatsapp', `${e.datos.marca} · Asistente`, 'Confirma separados y recuerda saldos', ctx),
    flujo: FLUJO_SEPARADO,
    datos: {
      titulo: 'Datos del separado',
      filas: [
        { etiqueta: 'Cliente', valor: nombre },
        { etiqueta: 'Separado', valor: numero },
        { etiqueta: 'Abonado', valor: e.datos.dinero(abonado) },
        { etiqueta: 'Saldo', valor: e.datos.dinero(saldo) },
        { etiqueta: 'Vence', valor: diaYMes(limiteISO) },
      ],
    },
    reglas: ['confirmar_separado', 'recordar_saldo', 'precio'],
    disparador: 'Se registra un separado en el POS',
    pasos: conHoras(pasos, e.ahora),
    memoriaFinal: { ...MEMORIA_INICIAL, saludado: true },
  };
}

function nuevaColeccion(e: EntradaGuion): GuionBase {
  const c = clienteTu(e);
  const ctx = botDe(e, c.nombre, 'tu');
  const novedades = e.datos.novedadesIds
    .map((id) => e.datos.productos.find((p) => p.id === id))
    .filter((p): p is ProductoBot => !!p);
  const lista = novedades.map((p) => minusculaInicial(p.nombre));
  const novedad =
    lista.length > 1
      ? `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`
      : (lista[0] ?? 'prendas de temporada');
  const aviso = rellenarPlantilla(PLANTILLAS_CLIENTE.nueva_coleccion.tu, {
    Nombre: c.nombre,
    marca: e.datos.marca,
    novedad: novedad,
  });
  const a = e.contexto.audiencia;
  const elegido = novedades.find((p) => p.tipo === 'pantalon') ?? novedades[0];
  const ej = elegido ? ejemploDisponible(elegido, e.datos) : null;
  const memoria0: Memoria = { ...MEMORIA_INICIAL, saludado: true };
  const { pasos: conv, memoria } = conversar(
    [
      elegido && ej
        ? `Me interesa ${conArticulo(elegido)}, ¿hay en talla ${ej.talla}?`
        : '¿Qué más tienen de la colección?',
      (r) => (r?.memoria.ofrecioSeparar ? `Sí, en ${ej?.localNombre ?? 'el que tenga más'}` : null),
    ],
    memoria0,
    e.datos,
    ctx,
  );
  const pasos: PasoGuion[] = [
    {
      tipo: 'sistema',
      texto: `Campaña «Nueva colección»: ${a.total} clientes (${a.vip} VIP y ${a.frecuentes} frecuentes)`,
      traza: trazaFija('nueva_coleccion', [
        'Llegó la nueva colección a las tiendas',
        `${a.vip} VIP y ${a.frecuentes} frecuentes · ${a.usted} en usted y ${a.tu} en tú`,
        `${novedades.length} novedades de la temporada`,
        null,
        null,
      ]),
    },
    {
      tipo: 'bot',
      partes: [
        { tipo: 'texto', texto: aviso },
        { tipo: 'tarjetas', tarjetas: novedades.map(tarjetaDe) },
      ],
      ts: '',
      traza: trazaFija('nueva_coleccion', [
        `Segmentos: VIP y frecuentes (${a.total})`,
        `${c.nombre}: trato de tú · ${a.usted} clientes reciben el texto en usted`,
        `Novedades: ${novedades.map((p) => p.nombre).join(', ')}`,
        'Enviar el aviso a cada cliente de la audiencia',
        null,
      ]),
    },
    ...conv,
  ];
  return {
    id: 'nueva-coleccion',
    ...base('whatsapp', `${e.datos.marca} · Asistente`, 'Avisa a clientes por segmento', ctx),
    flujo: FLUJO_COLECCION,
    reglas: ['nueva_coleccion', 'inventario', 'separar'],
    disparador: 'Llega la nueva colección',
    pasos: conHoras(pasos, e.ahora),
    memoriaFinal: memoria,
    audiencia: { total: a.total, usted: a.usted, tu: a.tu, segmentos: 'VIP y frecuentes' },
  };
}

function cumpleanos(e: EntradaGuion): GuionBase {
  const u = clienteUsted(e);
  const ctx = botDe(e, u.nombre, 'usted');
  const trato = e.contexto.clienteUsted?.tratamiento ?? 'usted';
  const aviso = rellenarPlantilla(PLANTILLAS_CLIENTE.cumpleanos[trato], {
    Nombre: u.nombre,
    marca: e.datos.marca,
    local: u.local,
  });
  const cliente = 'Muchas gracias. ¿Puedo pasar hoy?';
  const hasta = e.contexto.cierreHoy ? `hasta las ${e.contexto.cierreHoy}` : 'durante el día';
  const respuesta =
    trato === 'usted'
      ? `Con gusto, ${u.nombre}. Hoy atendemos ${hasta} en ${u.local}. Le dejé el beneficio registrado a su nombre: solo menciónelo en caja.`
      : `Claro, ${u.nombre}. Hoy atendemos ${hasta} en ${u.local}. Te dejé el beneficio registrado a tu nombre: solo menciónalo en caja.`;
  const pasos: PasoGuion[] = [
    {
      tipo: 'sistema',
      texto: `Hoy cumple años ${u.nombre}: cliente VIP de ${u.local}`,
      traza: trazaFija('cumpleanos', [
        'Cada mañana el CRM busca los cumpleaños',
        'Cliente VIP: se habla de usted',
        'Plantilla «cumpleaños» con beneficio',
        null,
        null,
      ]),
    },
    {
      tipo: 'bot',
      partes: [{ tipo: 'texto', texto: aviso }],
      ts: '',
      traza: trazaFija('cumpleanos', [
        'Cumpleaños de hoy',
        `${u.nombre} · VIP · local habitual ${u.local}`,
        `Plantilla en ${trato === 'usted' ? 'usted' : 'tú'}: 15 % en su próxima compra`,
        'Enviar el saludo con el beneficio',
        null,
      ]),
    },
    { tipo: 'cliente', texto: cliente, ts: '' },
    {
      tipo: 'bot',
      partes: [{ tipo: 'texto', texto: respuesta }],
      ts: '',
      traza: trazaFija('cumpleanos', [
        `“${cliente}”`,
        'Pregunta si puede pasar hoy',
        `Horario de ${u.local}: ${hasta}`,
        'Responder con el horario y el beneficio',
        null,
      ]),
    },
    {
      tipo: 'sistema',
      texto: `Beneficio de cumpleaños registrado a nombre de ${u.nombre}`,
      traza: trazaFija('cumpleanos', [
        'Beneficio vigente este mes',
        null,
        null,
        'Queda registrado para la caja',
        null,
      ]),
    },
  ];
  return {
    id: 'cumpleanos',
    ...base(
      'whatsapp',
      `${e.datos.marca} · Asistente`,
      'Saluda con beneficio, en el trato de cada cliente',
      ctx,
    ),
    flujo: FLUJO_CUMPLEANOS,
    datos: {
      titulo: 'Datos del cliente',
      filas: [
        { etiqueta: 'Cliente', valor: u.nombre },
        { etiqueta: 'Segmento', valor: 'VIP' },
        { etiqueta: 'Local habitual', valor: u.local },
        { etiqueta: 'Trato', valor: trato === 'usted' ? 'Usted' : 'Tú' },
        { etiqueta: 'Beneficio', valor: '15 % este mes' },
      ],
    },
    reglas: ['cumpleanos', 'horarios'],
    disparador: 'Cada mañana, a las 8:00',
    pasos: conHoras(pasos, e.ahora),
    memoriaFinal: { ...MEMORIA_INICIAL, saludado: true },
  };
}

function resumenDueno(e: EntradaGuion): GuionBase {
  const r = e.contexto.resumen;
  const ctx: ContextoBot = {
    nombre: 'dueño',
    tratamiento: 'tu',
    hora: horaDe(e.ahora),
    rol: 'dueno',
    canal: 'whatsapp',
  };
  const datos: DatosBot = { ...e.datos, resumen: r };
  const mejor = r.mejorLocal
    ? `Mejor local: ${r.mejorLocal.nombre} (${e.datos.dinero(r.mejorLocal.valor)}).`
    : '';
  const resumen =
    `Ventas de hoy: ${e.datos.dinero(r.hoy)}\n${r.numVentasHoy} ventas · ticket promedio ${e.datos.dinero(r.ticket)}. ${mejor}`.trim();
  const { pasos: conv, memoria } = conversar(
    ['¿Y cómo va el mes?', '¿Cómo le fue a cada local?'],
    MEMORIA_INICIAL,
    datos,
    ctx,
  );
  const pasos: PasoGuion[] = [
    {
      tipo: 'sistema',
      texto: 'Todos los días a las 9:30 p. m. · resumen automático al dueño',
      traza: trazaFija('resumen_dueno', [
        'Se cumple la hora programada',
        'Ventas reales de los tres locales',
        'Plantilla del resumen diario',
        null,
        null,
      ]),
    },
    {
      tipo: 'bot',
      partes: [{ tipo: 'texto', texto: resumen }],
      ts: '',
      traza: trazaFija('resumen_dueno', [
        'Hora programada: 9:30 p. m.',
        `${r.numVentasHoy} ventas hoy · ${r.porLocal.length} locales`,
        `Ventas de hoy: ${e.datos.dinero(r.hoy)} (la misma cifra del Inicio)`,
        'Enviar el resumen al dueño',
        null,
      ]),
    },
    ...conv,
  ];
  return {
    id: 'resumen-dueno',
    ...base('whatsapp', `${e.datos.marca} · Asistente`, 'Te cuenta cómo cerró el día', ctx),
    flujo: FLUJO_RESUMEN,
    datos: {
      titulo: 'Cifras del día',
      filas: [
        { etiqueta: 'Ventas de hoy', valor: e.datos.dinero(r.hoy) },
        { etiqueta: 'Ventas', valor: String(r.numVentasHoy) },
        { etiqueta: 'Ticket promedio', valor: e.datos.dinero(r.ticket) },
        { etiqueta: 'Mejor local', valor: r.mejorLocal ? r.mejorLocal.nombre : '—' },
        { etiqueta: `Lo que va de ${r.nombreMes}`, valor: e.datos.dinero(r.mes) },
      ],
    },
    reglas: ['resumen_dueno'],
    disparador: 'Todos los días, 9:30 p. m.',
    pasos: conHoras(pasos, e.ahora),
    memoriaFinal: memoria,
  };
}

function libre(e: EntradaGuion, trato: 'tu' | 'usted'): GuionBase {
  const nombre = trato === 'usted' ? clienteUsted(e).nombre : clienteTu(e).nombre;
  const ctx = botDe(e, nombre, trato);
  return {
    id: 'libre',
    ...base('whatsapp', `${e.datos.marca} · Asistente`, 'Escribe tú: el bot responde con reglas', ctx),
    flujo: FLUJO_ENTRANTE,
    reglas: ['inventario', 'precio', 'horarios', 'envios', 'separar', 'sin_negociar', 'no_entiende'],
    disparador: 'Escribes un mensaje',
    pasos: [
      {
        tipo: 'sistema',
        texto: `Escribes como ${nombre} (${trato === 'usted' ? 'usted' : 'tú'}): pregunta por una prenda, un precio, un horario o un descuento`,
      },
    ],
    memoriaFinal: MEMORIA_INICIAL,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Instagram
// ---------------------------------------------------------------------------------------------------------
export const CONTACTOS_INSTAGRAM: Record<
  'precio-comentario' | 'catalogo-dm',
  { usuario: string; nombre: string; celular: string }
> = {
  'precio-comentario': { usuario: 'camilo.rojas_', nombre: 'Camilo Rojas', celular: '3117400123' },
  'catalogo-dm': { usuario: 'mariana.torres.b', nombre: 'Mariana Torres', celular: '3105551420' },
};

function instagramBot(e: EntradaGuion, nombre: string): ContextoBot {
  return { nombre, tratamiento: 'tu', hora: horaDe(e.ahora), rol: 'cliente', canal: 'instagram' };
}

function precioComentario(e: EntradaGuion): GuionBase {
  const c = CONTACTOS_INSTAGRAM['precio-comentario'];
  const primer = c.nombre.split(' ')[0]!;
  const ctx = instagramBot(e, primer);
  const critico = e.datos.productos.find((p) => p.id === e.datos.criticoId) ?? e.datos.productos[0];
  const memoria0: Memoria = { ...MEMORIA_INICIAL, productoId: critico?.id ?? null };
  const { pasos: conv, memoria } = conversar(
    [
      'precio?',
      'Sí, muéstrame',
      (r) => (r ? '¿Hay la Oxford azul clarita en talla M?' : null),
      (r) => (r?.memoria.ofrecioSeparar ? 'Sí, por favor' : null),
      (r) => (r?.memoria.pidioContacto ? `${c.nombre} ${c.celular}` : null),
    ],
    memoria0,
    e.datos,
    ctx,
    FLUJO_COMENTARIO,
  );
  // El primer mensaje del cliente ("precio?") en realidad es el comentario público: se saca de la conversación.
  const [, primeraRespuesta, ...resto] = conv;
  const pasos: PasoGuion[] = [
    { tipo: 'vista', vista: 'comentarios' },
    { tipo: 'comentario', usuario: c.usuario, texto: 'precio?', ts: '' },
    {
      tipo: 'comentario',
      usuario: `${slug(e.datos.marca)}.demo`,
      texto: `Hola, ${primer}. Te escribimos por mensaje directo con el precio y las tallas disponibles.`,
      respuestaDe: c.usuario,
      ts: '',
      traza: trazaFija('comentario_precio', [
        'Comentario nuevo: «precio?»',
        'Detecta la palabra «precio» en la publicación',
        `Precio de lista: ${critico ? e.datos.dinero(critico.precio) : '—'}`,
        'Responder en público y escribir por mensaje directo',
        null,
      ]),
    },
    { tipo: 'vista', vista: 'mensajes' },
    ...(primeraRespuesta ? [primeraRespuesta] : []),
    ...resto,
  ];
  return {
    id: 'precio-comentario',
    ...base('instagram', `${slug(e.datos.marca)}.demo`, 'Responde comentarios y mensajes directos', ctx),
    flujo: FLUJO_COMENTARIO,
    reglas: ['comentario_precio', 'precio', 'catalogo', 'inventario', 'captura_contacto'],
    disparador: 'Alguien comenta «precio?» en una publicación',
    pasos: conHoras(pasos, e.ahora),
    memoriaFinal: memoria,
  };
}

function catalogoDm(e: EntradaGuion): GuionBase {
  const c = CONTACTOS_INSTAGRAM['catalogo-dm'];
  const primer = c.nombre.split(' ')[0]!;
  const ctx = instagramBot(e, primer);
  const novedades = e.datos.novedadesIds
    .map((id) => e.datos.productos.find((p) => p.id === id))
    .filter((p): p is ProductoBot => !!p);
  const elegido = novedades.find((p) => p.tipo === 'pantalon') ?? novedades[0];
  const ej = elegido ? ejemploDisponible(elegido, e.datos) : null;
  const { pasos, memoria } = conversar(
    [
      'Hola, ¿qué novedades tienen?',
      elegido && ej ? `Me gusta ${conArticulo(elegido)}, ¿hay en talla ${ej.talla}?` : null,
      (r) => (r?.memoria.ofrecioSeparar ? `Sí, en ${ej?.localNombre ?? 'el que tenga más'}` : null),
      (r) => (r?.memoria.pidioContacto ? `${c.nombre}, ${c.celular}` : null),
    ],
    MEMORIA_INICIAL,
    e.datos,
    ctx,
    FLUJO_COMENTARIO,
  );
  return {
    id: 'catalogo-dm',
    ...base('instagram', `${slug(e.datos.marca)}.demo`, 'Envía el catálogo por mensaje directo', ctx),
    flujo: FLUJO_COMENTARIO,
    reglas: ['catalogo', 'inventario', 'captura_contacto'],
    disparador: 'Alguien escribe por mensaje directo',
    pasos: conHoras([{ tipo: 'vista', vista: 'mensajes' }, ...pasos], e.ahora),
    memoriaFinal: memoria,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------------------------------------
function armar(id: IdEscenario, e: EntradaGuion, trato: 'tu' | 'usted'): GuionBase {
  switch (id) {
    case 'consulta-talla':
      return consultaTalla(e);
    case 'paso-persona':
      return pasoPersona(e);
    case 'separado-saldo':
      return separadoSaldo(e);
    case 'nueva-coleccion':
      return nuevaColeccion(e);
    case 'cumpleanos':
      return cumpleanos(e);
    case 'resumen-dueno':
      return resumenDueno(e);
    case 'libre':
      return libre(e, trato);
    case 'precio-comentario':
      return precioComentario(e);
    case 'catalogo-dm':
      return catalogoDm(e);
  }
}

/** El guion de un escenario con los datos de ahora: inventario, clientes y ventas reales. */
export function construirGuion(id: IdEscenario, e: EntradaGuion, trato: 'tu' | 'usted' = 'tu'): Guion {
  const g = armar(id, e, trato);
  return { ...g, flujoEntrante: g.canal === 'instagram' ? FLUJO_COMENTARIO : FLUJO_ENTRANTE };
}
