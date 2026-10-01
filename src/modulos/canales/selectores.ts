import type { COP, EstadoDominio, FechaHoraISO, FechaISO, HorarioSemanal, Id } from '@/dominio/tipos';
import { diaSemana, sumarDias } from '@/dominio/reglas/fechas';
import { MESES, hora } from '@/lib/formato';
import {
  crearSelector,
  selCuentasPorCobrar,
  selEnCaminoPorVariante,
  selMetricasClientes,
  selNarrativa,
  selResumenVentas,
  selVentas,
  selVentasHoyHastaHora,
} from '@/selectores';
import type { ClaveEstado } from '@/selectores/memo';
import type { ColorBot, DatosBot, EnCaminoBot, LocalBot, ProductoBot, ResumenDueno } from './tipos';

/**
 * Selectores propios de D5 (Canales digitales): componen los compartidos y arman lo que el bot de la vitrina lee
 * del negocio REAL: existencias por talla, color y local; el cliente de cada escenario; la cifra de ventas del día.
 * No reimplementan ninguna regla de dominio: el inventario sale del agregado de existencias, las ventas de
 * `selVentasHoyHastaHora` (la misma cifra del Inicio) y los saldos de `selCuentasPorCobrar`.
 */
const unir = (...listas: (readonly ClaveEstado[])[]): ClaveEstado[] => [...new Set(listas.flat())];

// ---------------------------------------------------------------------------------------------------------
// Datos del bot
// ---------------------------------------------------------------------------------------------------------
const ORDEN_LETRAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Única'];
function ordenTalla(a: string, b: string): number {
  const ia = ORDEN_LETRAS.indexOf(a);
  const ib = ORDEN_LETRAS.indexOf(b);
  if (ia >= 0 && ib >= 0) return ia - ib;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, 'es');
}

const DIAS_ORDEN = [1, 2, 3, 4, 5, 6, 0] as const;
const NOMBRE_DIA: Record<number, string> = {
  0: 'domingos',
  1: 'lunes',
  2: 'martes',
  3: 'miércoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sábado',
};

/** "lunes a sábado de 10:00 a. m. a 9:00 p. m. y domingos de 11:00 a. m. a 7:00 p. m." */
export function textoHorario(h: HorarioSemanal): string {
  const franja = (d: number) => {
    const f = h[d as keyof HorarioSemanal];
    return f ? `de ${hora(f.abre)} a ${hora(f.cierra)}` : null;
  };
  const grupos: { dias: number[]; franja: string | null }[] = [];
  for (const d of DIAS_ORDEN) {
    const f = franja(d);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.franja === f) ultimo.dias.push(d);
    else grupos.push({ dias: [d], franja: f });
  }
  const partes = grupos
    .filter((g) => g.franja)
    .map((g) => {
      const primero = g.dias[0]!;
      const ultimo = g.dias[g.dias.length - 1]!;
      const dias =
        g.dias.length === 1
          ? primero === 0
            ? 'domingos'
            : `los ${NOMBRE_DIA[primero]}`
          : `${NOMBRE_DIA[primero]} a ${NOMBRE_DIA[ultimo]}`;
      return `${dias} ${g.franja}`;
    });
  if (partes.length === 0) return 'según el horario de cada local';
  return partes.length === 1
    ? partes[0]!
    : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

export type DatosBotBase = Omit<DatosBot, 'dinero' | 'resumen' | 'marca'>;

/** Hasta cuándo cierra un local en una fecha ("9:00 p. m."), o null si ese día no abre. */
export function cierreDelDia(e: EstadoDominio, localId: Id, fecha: FechaISO): string | null {
  const f = e.locales[localId]?.horario[diaSemana(fecha)];
  return f ? hora(f.cierra) : null;
}

export const selDatosBot = crearSelector<{ hoy: FechaISO }, DatosBotBase>(
  'selDatosBot',
  unir(selNarrativa.tablas, [
    'productos',
    'variantes',
    'colores',
    'locales',
    'agregados',
    'importaciones',
    'empleados',
    'meta',
  ]),
  (e, { hoy }) => {
    const locales: LocalBot[] = Object.values(e.locales)
      .filter((l) => l.vende && !l.eliminadoEn)
      .sort((a, b) => a.orden - b.orden)
      .map((l) => ({ id: l.id, nombre: l.nombre, direccion: l.direccion }));
    const enCamino = selEnCaminoPorVariante(e);
    const porProducto = new Map<Id, ProductoBot>();
    for (const p of Object.values(e.productos)) {
      if (p.eliminadoEn) continue;
      porProducto.set(p.id, {
        id: p.id,
        nombre: p.nombre,
        referencia: p.referencia,
        precio: p.precioVenta,
        tipo: p.tipoPrenda,
        temporada: p.temporada,
        destacado: p.destacado,
        tallas: [],
        colores: [],
        stock: {},
        enCamino: {},
      });
    }
    for (const v of Object.values(e.variantes)) {
      if (v.eliminadoEn) continue;
      const p = porProducto.get(v.productoId);
      if (!p) continue;
      if (!p.tallas.includes(v.talla)) p.tallas.push(v.talla);
      if (!p.colores.some((c) => c.id === v.colorId)) {
        const c = e.colores[v.colorId];
        const color: ColorBot = {
          id: v.colorId,
          nombre: c?.nombre ?? v.colorId,
          hex: c?.hex ?? '#999999',
          patron: c?.patron ?? 'liso',
        };
        p.colores.push(color);
      }
      const celda: Record<Id, number> = {};
      for (const l of locales) celda[l.id] = e.agregados.existencias[`${v.id}@${l.id}`] ?? 0;
      p.stock[`${v.talla}|${v.colorId}`] = celda;
      const ec = enCamino[v.id];
      if (ec)
        p.enCamino[`${v.talla}|${v.colorId}`] = {
          unidades: ec.unidades,
          fecha: ec.fechaEstimada,
        } satisfies EnCaminoBot;
    }
    const productos = [...porProducto.values()]
      .filter((p) => p.tallas.length > 0)
      .map((p) => ({ ...p, tallas: [...p.tallas].sort(ordenTalla) }));
    const n = selNarrativa(e, { hoy });
    const persona = n.vendedoraEstrella ? e.empleados[n.vendedoraEstrella] : undefined;
    const vendedor = locales[0] ? e.locales[locales[0].id] : undefined;
    // Novedades: de la temporada, destacadas primero y de tipos distintos.
    const nuevos = Object.values(e.productos)
      .filter((p) => !p.eliminadoEn && p.publicadoEnTienda && p.temporada !== 'Colección permanente')
      .sort((a, b) => Number(b.destacado) - Number(a.destacado) || (a.referencia < b.referencia ? -1 : 1));
    const novedadesIds: Id[] = [];
    const tipos = new Set<string>();
    for (const p of nuevos) {
      if (tipos.has(p.tipoPrenda) || !porProducto.get(p.id)?.tallas.length) continue;
      tipos.add(p.tipoPrenda);
      novedadesIds.push(p.id);
      if (novedadesIds.length === 3) break;
    }
    return {
      productos,
      locales,
      criticoId: n.productoCritico ?? e.meta.narrativa.productoOxford ?? null,
      persona: persona
        ? {
            nombre: persona.nombres.split(' ')[0] ?? persona.nombres,
            completo: `${persona.nombres} ${persona.apellidos.split(' ')[0] ?? ''}`.trim(),
          }
        : null,
      horario: vendedor ? textoHorario(vendedor.horario) : 'según el horario de cada local',
      novedadesIds,
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Contexto de los escenarios
// ---------------------------------------------------------------------------------------------------------
export interface ClienteCanal {
  id: Id;
  nombres: string;
  apellidos: string;
  primerNombre: string;
  celular: string;
  tratamiento: 'tu' | 'usted';
  localHabitual: string | null;
  localHabitualId: Id | null;
  /** Tallas que el cliente declaró (camisa, pantalón, calzado, blazer). */
  tallas: Partial<Record<'camisa' | 'pantalon' | 'calzado' | 'blazer', string>>;
}

export interface SeparadoCanal {
  cliente: ClienteCanal;
  numero: string;
  producto: string;
  total: COP;
  abonado: COP;
  saldo: COP;
  fechaLimite: FechaISO;
  diasParaVencer: number | null;
  local: string;
  localId: Id;
}

export interface AudienciaCanal {
  total: number;
  vip: number;
  frecuentes: number;
  usted: number;
  tu: number;
}

export interface ContextoEscenarios {
  clienteTu: ClienteCanal | null;
  clienteUsted: ClienteCanal | null;
  separado: SeparadoCanal | null;
  audiencia: AudienciaCanal;
  resumen: ResumenDueno;
  /** Hasta qué hora abre hoy el local habitual del cliente en usted. */
  cierreHoy: string | null;
}

const primero = (s: string) => s.split(' ')[0] ?? s;

export const selContextoEscenarios = crearSelector<
  { hoy: FechaISO; ahora: FechaHoraISO },
  ContextoEscenarios
>(
  'selContextoEscenarios',
  unir(
    selNarrativa.tablas,
    selMetricasClientes.tablas,
    selCuentasPorCobrar.tablas,
    selVentasHoyHastaHora.tablas,
    selResumenVentas.tablas,
    ['clientes', 'locales', 'ventas', 'empleados', 'meta'],
  ),
  (e, { hoy, ahora }) => {
    const n = selNarrativa(e, { hoy });
    const metricas = selMetricasClientes(e, { hoy });
    const nombreLocal = (id: Id | null) => (id ? (e.locales[id]?.nombre ?? null) : null);
    const cliente = (id: Id | null | undefined): ClienteCanal | null => {
      const c = id ? e.clientes[id] : undefined;
      if (!c || c.eliminadoEn) return null;
      const lh = metricas[c.id]?.localHabitualId ?? c.localRegistroId ?? null;
      return {
        id: c.id,
        nombres: c.nombres,
        apellidos: c.apellidos,
        primerNombre: primero(c.nombres),
        celular: c.celular,
        tratamiento: c.tratamiento,
        localHabitual: nombreLocal(lh),
        localHabitualId: lh,
        tallas: c.tallasDeclaradas,
      };
    };
    const vivos = Object.values(e.clientes).filter((c) => !c.eliminadoEn);
    const porSegmento = (seg: string, trato: 'tu' | 'usted') =>
      vivos.find((c) => metricas[c.id]?.segmento === seg && c.tratamiento === trato)?.id ?? null;
    const clienteTu = cliente(n.clienteFrecuente) ?? cliente(porSegmento('frecuente', 'tu'));
    const clienteUsted =
      cliente(n.clienteCumpleanos) ??
      cliente(e.meta.narrativa.clienteVip) ??
      cliente(porSegmento('vip', 'usted'));

    const porVencer = selCuentasPorCobrar(e, { hoy, filtro: 'separados-por-vencer' }).filas;
    const pendientes = porVencer.length ? porVencer : selCuentasPorCobrar(e, { hoy }).filas;
    const fila = pendientes.find(
      (f) =>
        f.clienteId &&
        e.clientes[f.clienteId] &&
        !e.clientes[f.clienteId]!.eliminadoEn &&
        f.tipo === 'separado' &&
        f.fechaLimite,
    );
    const cs = fila ? cliente(fila.clienteId) : null;
    const venta = fila ? e.ventas[fila.ventaId] : undefined;
    const separado: SeparadoCanal | null =
      fila && cs && venta
        ? {
            cliente: cs,
            numero: fila.numeroVenta,
            producto: venta.lineas[0]?.descripcion.split(' · ')[0] ?? 'tu pedido',
            total: fila.total,
            abonado: fila.abonado,
            saldo: fila.saldo,
            fechaLimite: fila.fechaLimite!,
            diasParaVencer: fila.diasParaVencer,
            local: nombreLocal(fila.localId) ?? '',
            localId: fila.localId,
          }
        : null;

    let vip = 0;
    let frecuentes = 0;
    let usted = 0;
    for (const c of vivos) {
      const seg = metricas[c.id]?.segmento;
      if (seg !== 'vip' && seg !== 'frecuente') continue;
      if (seg === 'vip') vip += 1;
      else frecuentes += 1;
      if (c.tratamiento === 'usted') usted += 1;
    }
    const audiencia: AudienciaCanal = {
      total: vip + frecuentes,
      vip,
      frecuentes,
      usted,
      tu: vip + frecuentes - usted,
    };

    const locales = Object.values(e.locales)
      .filter((l) => l.vende && !l.eliminadoEn)
      .sort((a, b) => a.orden - b.orden);
    const hoyTotal = selVentasHoyHastaHora(e, { hoy, ahora, localId: 'todos' }).hoy;
    const porLocal = locales
      .map((l) => ({
        nombre: l.nombre,
        valor: selVentasHoyHastaHora(e, { hoy, ahora, localId: l.id }).hoy.netas,
      }))
      .sort((a, b) => b.valor - a.valor);
    const mes = selResumenVentas(e, { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy, localId: 'todos' });
    const resumen: ResumenDueno = {
      hoy: hoyTotal.netas,
      numVentasHoy: hoyTotal.numVentas,
      mejorLocal: porLocal[0] && porLocal[0].valor > 0 ? porLocal[0] : null,
      porLocal,
      mes: mes.netas,
      numVentasMes: mes.numVentas,
      nombreMes: MESES[Number(hoy.slice(5, 7)) - 1] ?? '',
      ticket: hoyTotal.ticket,
    };
    return {
      clienteTu,
      clienteUsted,
      separado,
      audiencia,
      resumen,
      cierreHoy: clienteUsted?.localHabitualId ? cierreDelDia(e, clienteUsted.localHabitualId, hoy) : null,
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------------------------------------
export interface IndicadorCanal {
  canal: 'whatsapp' | 'instagram' | 'web';
  /** Ventas reales de ese canal en los últimos 30 días. */
  ventas: number;
  valor: COP;
  /** Simulados, derivados de las ventas reales para que cuadren entre sí. */
  conversaciones: number;
  mensajesEnviados: number;
  tasaRespuesta: number;
}

export interface IndicadoresCanales {
  desde: FechaISO;
  hasta: FechaISO;
  whatsapp: IndicadorCanal;
  instagram: IndicadorCanal;
  web: IndicadorCanal;
  totalVentas: number;
  totalValor: COP;
  totalMensajes: number;
}

const PARAMETROS_SIMULADOS = {
  whatsapp: { conversion: 0.16, mensajesPorConversacion: 6.4, respuesta: 0.71 },
  instagram: { conversion: 0.11, mensajesPorConversacion: 4.8, respuesta: 0.58 },
  web: { conversion: 0.03, mensajesPorConversacion: 0, respuesta: 0 },
} as const;

export const selIndicadoresCanales = crearSelector<{ hoy: FechaISO }, IndicadoresCanales>(
  'selIndicadoresCanales',
  selVentas.tablas,
  (e, { hoy }) => {
    const desde = sumarDias(hoy, -29);
    const una = (canal: 'whatsapp' | 'instagram' | 'web'): IndicadorCanal => {
      const t = selVentas(e, { desde, hasta: hoy, canal }).totales;
      const p = PARAMETROS_SIMULADOS[canal];
      const conversaciones = Math.round(t.numVentas / p.conversion);
      return {
        canal,
        ventas: t.numVentas,
        valor: t.netas,
        conversaciones,
        mensajesEnviados: Math.round(conversaciones * p.mensajesPorConversacion),
        tasaRespuesta: p.respuesta,
      };
    };
    const whatsapp = una('whatsapp');
    const instagram = una('instagram');
    const web = una('web');
    return {
      desde,
      hasta: hoy,
      whatsapp,
      instagram,
      web,
      totalVentas: whatsapp.ventas + instagram.ventas + web.ventas,
      totalValor: whatsapp.valor + instagram.valor + web.valor,
      totalMensajes: whatsapp.mensajesEnviados + instagram.mensajesEnviados,
    };
  },
);
