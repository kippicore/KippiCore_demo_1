import type {
  Categoria,
  Cliente,
  COP,
  CuentaPorCobrar,
  EstadoDominio,
  EventoCalendario,
  FechaISO,
  Id,
  LineaProducto,
  MensajeSaliente,
  NotaCliente,
  ParametrosSegmentacion,
  Venta,
} from '@/dominio/tipos';
import type { Segmento } from '@/dominio/reglas/segmentacion';
import { estadoVenta, saldoVenta, type EstadoVenta } from '@/dominio/reglas/ventas';
import {
  crearSelector,
  nombreEmpleado,
  selCliente,
  selClientes,
  selCuentasPorCobrar,
  selCumpleanosMes,
  selDevolucionesPorVenta,
  selIndiceVentasPorCliente,
  selMetricasClientes,
  type FichaCliente,
  type FilaCliente,
} from '@/selectores';
import {
  edadQueCumple,
  estadoCumple,
  explicarSegmento,
  fechaCumple,
  tallasPreferidas,
  textoNovedad,
  type EstadoCumple,
  type Explicacion,
  type FilaTalla,
} from './reglas';

/**
 * Selectores propios de A4: componen los compartidos (`selClientes`, `selCliente`, `selMetricasClientes`,
 * `selCuentasPorCobrar`…) y agregan lo que solo esta pantalla necesita. No reimplementan ninguna regla de
 * 6.19–6.20: el segmento, las métricas y los saldos siguen saliendo del dominio.
 */

const TABLAS_CLIENTES = ['clientes', 'ventas', 'devoluciones', 'productos', 'variantes', 'parametros'] as const;

/** Los umbrales vigentes de la segmentación (los mismos que usa el dominio). */
export const selUmbralesSegmentacion = crearSelector<void, ParametrosSegmentacion>(
  'selUmbralesSegmentacion',
  ['parametros'],
  (e) => e.parametros.segmentacion,
);

const reconocida = (v: Venta) => !v.anulacion && v.separado?.cerrado?.resultado !== 'cancelado';

// ---------------------------------------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------------------------------------
export interface ParamsListaClientes {
  hoy: FechaISO;
  texto?: string;
  segmento?: Segmento;
  localId?: Id | 'todos';
  /** "Sus clientes" (vendedor) o el filtro de vendedor del dueño. */
  vendedorId?: Id;
}

export interface FilaListaCliente extends FilaCliente {
  explicacion: Explicacion;
}

export interface ListaClientes {
  filas: FilaListaCliente[];
  /** Conteo por segmento con los OTROS filtros aplicados (los chips). */
  conteos: Record<Segmento, number>;
  /** Cuántos hay sin filtrar por segmento. */
  total: number;
  totales: { clientes: number; valor: COP; compras: number; ticket: COP };
}

/** La última compra reconocida de un cliente ANTES de hoy (la que usa el segmento "en riesgo"). */
function ultimaAntesDeHoy(e: EstadoDominio, clienteId: Id, hoy: FechaISO): FechaISO | null {
  let ultima: FechaISO | null = null;
  for (const id of selIndiceVentasPorCliente(e, undefined)[clienteId] ?? []) {
    const v = e.ventas[id];
    if (!v || !reconocida(v)) continue;
    const f = v.ts.slice(0, 10);
    if (f < hoy && (!ultima || f > ultima)) ultima = f;
  }
  return ultima;
}

export const selListaClientes = crearSelector<ParamsListaClientes, ListaClientes>(
  'selListaClientes',
  [...TABLAS_CLIENTES],
  (e, p) => {
    const umbrales = e.parametros.segmentacion;
    const base = selClientes(e, { hoy: p.hoy, texto: p.texto, localId: p.localId, vendedorId: p.vendedorId });
    const conteos: Record<Segmento, number> = { vip: 0, frecuente: 0, ocasional: 0, en_riesgo: 0, nuevo: 0 };
    for (const f of base) conteos[f.metricas.segmento] += 1;
    const visibles = p.segmento ? base.filter((f) => f.metricas.segmento === p.segmento) : base;
    let valor = 0;
    let compras = 0;
    const filas = visibles.map((f): FilaListaCliente => {
      valor += f.metricas.valor;
      compras += f.metricas.compras;
      const m = f.metricas;
      const antes =
        m.ultimaCompra === p.hoy && m.segmento === 'en_riesgo' ? ultimaAntesDeHoy(e, f.cliente.id, p.hoy) : m.ultimaCompra && m.ultimaCompra < p.hoy ? m.ultimaCompra : null;
      return {
        ...f,
        explicacion: explicarSegmento(
          {
            segmento: m.segmento,
            registro: f.cliente.creadoEn.slice(0, 10),
            compras: m.compras,
            primeraCompra: m.primeraCompra,
            ultimaCompra: m.ultimaCompra,
            ultimaAntesDeHoy: antes,
            valor12m: m.valor12m,
            compras12m: m.compras12m,
          },
          umbrales,
          p.hoy,
        ),
      };
    });
    return {
      filas,
      conteos,
      total: base.length,
      totales: { clientes: filas.length, valor, compras, ticket: compras ? Math.round(valor / compras) : 0 },
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Ficha
// ---------------------------------------------------------------------------------------------------------
export interface FilaHistorial {
  id: Id;
  numero: string;
  ts: string;
  localId: Id;
  localNombre: string;
  estado: EstadoVenta;
  total: COP;
  unidades: number;
  saldo: COP;
  /** "Camisa Oxford entallada, Chino slim (+1)". */
  resumen: string;
}

export interface PerfilCliente {
  ficha: FichaCliente;
  explicacion: Explicacion;
  historial: FilaHistorial[];
  unidades: number;
  categorias: { categoria: Categoria; unidades: number; proporcion: number }[];
  lineas: { linea: LineaProducto; unidades: number; proporcion: number }[];
  colores: { id: Id; nombre: string; hex: string; patron: 'liso' | 'rayas' | 'cuadros'; unidades: number }[];
  productos: { nombre: string; unidades: number }[];
  tallas: FilaTalla[];
  localHabitual: { id: Id; nombre: string } | null;
  vendedorHabitual: string | null;
  porCobrar: CuentaPorCobrar[];
  mensajes: MensajeSaliente[];
  seguimientos: EventoCalendario[];
  notas: { nota: NotaCliente; autor: string }[];
  /** Lo que necesita el armado de los mensajes. */
  contexto: {
    local: string;
    producto: string | null;
    novedad: string;
    cobro: { numero: string; saldo: COP; abonado: COP; fechaLimite: FechaISO | null; ventaId: Id } | null;
  };
}

const NOMBRE_PRODUCTO = (descripcion: string) => descripcion.split(' · ')[0] ?? descripcion;

export const selPerfilCliente = crearSelector<{ clienteId: Id; hoy: FechaISO }, PerfilCliente | null>(
  'selPerfilCliente',
  [...TABLAS_CLIENTES, 'colores', 'mensajes', 'eventos', 'empleados', 'usuarios', 'locales'],
  (e, { clienteId, hoy }) => {
    const ficha = selCliente(e, { clienteId, hoy });
    if (!ficha) return null;
    const { cliente, metricas, ventas } = ficha;
    const devs = selDevolucionesPorVenta(e);

    // Historial (más reciente primero: `selCliente` ya lo ordena) y lo que compra.
    const porCategoria = new Map<Categoria, number>();
    const porLinea = new Map<LineaProducto, number>();
    const porColor = new Map<Id, number>();
    const porProducto = new Map<string, number>();
    let unidades = 0;
    let ultimaAntes: FechaISO | null = null;
    const historial: FilaHistorial[] = ventas.map((v) => {
      const ds = devs[v.id] ?? [];
      const unidadesVenta = v.lineas.reduce((a, l) => a + l.cantidad, 0);
      if (reconocida(v)) {
        const f = v.ts.slice(0, 10);
        if (f < hoy && (!ultimaAntes || f > ultimaAntes)) ultimaAntes = f;
        for (const l of v.lineas) {
          unidades += l.cantidad;
          const p = e.productos[l.productoId];
          const va = e.variantes[l.varianteId];
          if (p) {
            porCategoria.set(p.categoria, (porCategoria.get(p.categoria) ?? 0) + l.cantidad);
            porLinea.set(p.linea, (porLinea.get(p.linea) ?? 0) + l.cantidad);
            porProducto.set(p.nombre, (porProducto.get(p.nombre) ?? 0) + l.cantidad);
          }
          if (va) porColor.set(va.colorId, (porColor.get(va.colorId) ?? 0) + l.cantidad);
        }
      }
      const nombres = [...new Set(v.lineas.map((l) => NOMBRE_PRODUCTO(l.descripcion)))];
      return {
        id: v.id,
        numero: v.numero,
        ts: v.ts,
        localId: v.localId,
        localNombre: e.locales[v.localId]?.nombre ?? v.localId,
        estado: estadoVenta(v, ds),
        total: v.total,
        unidades: unidadesVenta,
        saldo: saldoVenta(v, ds),
        resumen: nombres.length > 2 ? `${nombres.slice(0, 2).join(', ')} (+${nombres.length - 2})` : nombres.join(', '),
      };
    });
    const totalUnidades = unidades || 1;
    const categorias = [...porCategoria.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .map(([categoria, u]) => ({ categoria, unidades: u, proporcion: u / totalUnidades }));
    const lineas = [...porLinea.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .map(([linea, u]) => ({ linea, unidades: u, proporcion: u / totalUnidades }));
    const colores = [...porColor.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .flatMap(([id, u]) => {
        const c = e.colores[id];
        return c ? [{ id, nombre: c.nombre, hex: c.hex, patron: c.patron, unidades: u }] : [];
      });
    const productos = [...porProducto.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, 3)
      .map(([nombre, u]) => ({ nombre, unidades: u }));

    const porCobrar = selCuentasPorCobrar(e, { hoy }).filas.filter((f) => f.clienteId === clienteId);
    const urgente = porCobrar[0] ?? null;
    const localHabitualId = metricas.localHabitualId ?? cliente.localRegistroId;
    const localHabitual = localHabitualId && e.locales[localHabitualId] ? { id: localHabitualId, nombre: e.locales[localHabitualId]?.nombre ?? localHabitualId } : null;
    const ultimaVenta = ventas.find(reconocida);
    const producto = ultimaVenta?.lineas[0] ? NOMBRE_PRODUCTO(ultimaVenta.lineas[0].descripcion) : null;

    return {
      ficha,
      explicacion: explicarSegmento(
        {
          segmento: metricas.segmento,
          registro: cliente.creadoEn.slice(0, 10),
          compras: metricas.compras,
          primeraCompra: metricas.primeraCompra,
          ultimaCompra: metricas.ultimaCompra,
          ultimaAntesDeHoy: ultimaAntes,
          valor12m: metricas.valor12m,
          compras12m: metricas.compras12m,
        },
        e.parametros.segmentacion,
        hoy,
      ),
      historial,
      unidades,
      categorias,
      lineas,
      colores,
      productos,
      tallas: tallasPreferidas(metricas.tallas, cliente.tallasDeclaradas),
      localHabitual,
      vendedorHabitual: metricas.vendedorHabitualId ? nombreEmpleado(e.empleados[metricas.vendedorHabitualId]) : null,
      porCobrar,
      mensajes: e.mensajes
        .filter((m) => m.destinatario.tipo === 'cliente' && m.destinatario.refId === clienteId)
        .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0)),
      seguimientos: Object.values(e.eventos)
        .filter((x) => x.clienteId === clienteId && !x.eliminadoEn)
        .sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0)),
      notas: [...cliente.notas]
        .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
        .map((nota) => ({ nota, autor: e.usuarios[nota.autorId]?.nombre ?? 'Equipo' })),
      contexto: {
        local: localHabitual?.nombre ?? 'nuestro local',
        producto,
        novedad: textoNovedad(categorias.slice(0, 2).map((c) => c.categoria)),
        cobro: urgente
          ? { numero: urgente.numeroVenta, saldo: urgente.saldo, abonado: urgente.abonado, fechaLimite: urgente.fechaLimite, ventaId: urgente.ventaId }
          : null,
      },
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Cumpleaños
// ---------------------------------------------------------------------------------------------------------
export interface FilaCumple {
  cliente: Cliente;
  /** Fecha del cumpleaños dentro del mes pedido. */
  fecha: FechaISO;
  dia: number;
  estado: EstadoCumple;
  segmento: Segmento;
  valor: COP;
  ultimaCompra: FechaISO | null;
  /** Edad que cumple (si se conoce el año de nacimiento). */
  edad: number | null;
  /** Ya se le registró un saludo de cumpleaños este año. */
  felicitado: boolean;
  localHabitualId: Id | null;
}

export interface ResumenCumpleanos {
  filas: FilaCumple[];
  total: number;
  hoy: number;
  vip: number;
  felicitados: number;
}

export const selCumpleanosPagina = crearSelector<
  { mes: string; hoy: FechaISO; localId?: Id | 'todos'; vendedorId?: Id },
  ResumenCumpleanos
>('selCumpleanosPagina', [...TABLAS_CLIENTES, 'mensajes'], (e, { mes, hoy, localId, vendedorId }) => {
  const anio = Number(mes.slice(0, 4));
  const metricas = selMetricasClientes(e, { hoy });
  const felicitados = new Set<string>();
  for (const m of e.mensajes)
    if (m.origen.tipo === 'cumpleanos' && m.destinatario.refId) felicitados.add(`${m.destinatario.refId}|${m.ts.slice(0, 4)}`);
  const filas: FilaCumple[] = [];
  for (const c of selCumpleanosMes(e, { mes, hoy })) {
    const m = metricas[c.cliente.id];
    const habitual = m?.localHabitualId ?? c.cliente.localRegistroId;
    if (localId && localId !== 'todos' && habitual !== localId) continue;
    if (vendedorId && m?.vendedorHabitualId !== vendedorId && c.cliente.registradoPorId !== vendedorId) continue;
    const fecha = fechaCumple(c.cliente.cumpleanos ?? '01-01', anio);
    filas.push({
      cliente: c.cliente,
      fecha,
      dia: c.dia,
      estado: estadoCumple(fecha, hoy),
      segmento: c.segmento,
      valor: c.valor,
      ultimaCompra: m?.ultimaCompra ?? null,
      edad: edadQueCumple(c.cliente.anioNacimiento, anio),
      felicitado: felicitados.has(`${c.cliente.id}|${anio}`),
      localHabitualId: habitual,
    });
  }
  filas.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : b.valor - a.valor));
  return {
    filas,
    total: filas.length,
    hoy: filas.filter((f) => f.estado === 'hoy').length,
    vip: filas.filter((f) => f.segmento === 'vip').length,
    felicitados: filas.filter((f) => f.felicitado).length,
  };
});
