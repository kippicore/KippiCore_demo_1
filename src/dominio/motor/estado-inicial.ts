import type {
  Cliente,
  Color,
  Contacto,
  Contrato,
  CuentaDinero,
  Empleado,
  EsquemaComision,
  EstadoDominio,
  EventoCalendario,
  FechaHoraISO,
  FechaISO,
  GastoRecurrente,
  Id,
  Local,
  MetaEstado,
  Producto,
  Proveedor,
  ResolucionFacturacion,
  Tabla,
  TasaCambio,
  TipoConsecutivo,
  Trazabilidad,
  UsuarioDemo,
  Variante,
} from '../tipos';
import { CONFIG, type Config } from '@/config';
import { SEED, type Seed } from '@/seed';
import type { ReglaFecha } from '@/seed/calendario';
import { generarEan13 } from '../reglas/ean13';
import {
  diaSemana,
  inicioVentana,
  mesDe,
  sumarDias,
  sumarMeses,
  sumarMinutosTs,
  componerTs,
  mesDia,
} from '../reglas/fechas';
import { slug } from '../reglas/texto';

/**
 * Estado inicial (PLAN 7.4): entidades maestras SIN hechos, a partir de config y seed. Es determinista y no
 * usa PRNG: los clientes generados y el historial de tasas los agrega el generador (F2-A2) antes de recorrer
 * los días. No hay saldos iniciales de inventario (I5): la carga inicial entra como una importación.
 */
export interface EntradaEstadoInicial {
  semilla: string;
  ancla: FechaISO;
  escala?: number;
  versionGenerador?: number;
  config?: Config;
  seed?: Seed;
  /** Tasas iniciales; por defecto, la tasa de ejemplo el día anterior a la ventana. */
  tasasIniciales?: TasaCambio[];
}

const CONSECUTIVOS_EN_CERO: Record<TipoConsecutivo, number> = {
  venta: 0,
  devolucion: 0,
  traslado: 0,
  conteo: 0,
  factura: 0,
  documento_pos: 0,
  nota_credito: 0,
  cuenta_por_pagar: 0,
  liquidacion: 0,
  producto: 0,
  variante: 0,
  bono: 0,
};

function tabla<T extends { id: Id }>(lista: readonly T[]): Tabla<T> {
  const t: Tabla<T> = {};
  for (const x of lista) t[x.id] = x;
  return t;
}

/** Fechas de una regla de campaña en un año. */
function rangoCampana(regla: ReglaFecha, anio: number): [FechaISO, FechaISO] {
  if (regla.tipo === 'mes_dia') return [`${anio}-${regla.desde}`, `${anio}-${regla.hasta}`];
  let base: FechaISO;
  if (regla.base === 'tercer_domingo_junio') {
    let f = `${anio}-06-01`;
    while (diaSemana(f) !== 0) f = sumarDias(f, 1);
    base = sumarDias(f, 14);
  } else if (regla.base === 'tercer_sabado_septiembre') {
    let f = `${anio}-09-01`;
    while (diaSemana(f) !== 6) f = sumarDias(f, 1);
    base = sumarDias(f, 14);
  } else {
    let f = `${anio}-11-30`;
    while (diaSemana(f) !== 5) f = sumarDias(f, -1);
    base = f;
  }
  return [sumarDias(base, regla.desdeDias), sumarDias(base, regla.hastaDias)];
}

export function estadoInicial(e: EntradaEstadoInicial): EstadoDominio {
  const config = e.config ?? CONFIG;
  const seed = e.seed ?? SEED;
  const inicio = inicioVentana(e.ancla, config.demo.mesesHistoria);
  const vispera = sumarDias(inicio, -1);
  const tsBase: FechaHoraISO = `${vispera}T00:00:00`;
  const t = (creadoEn: FechaHoraISO = tsBase): Trazabilidad => ({
    creadoEn,
    creadoPor: 'sistema',
    origen: 'generado',
  });

  const locales: Local[] = config.locales.map((l) => ({ ...t(), ...structuredClone(l.datos), id: l.id }));
  const usuarios: UsuarioDemo[] = seed.usuarios.map((u) => ({ ...t(), ...u }));
  const colores: Color[] = seed.colores.map((c) => ({ ...c }));
  const codigoColor = new Map(colores.map((c) => [c.id, c.codigo]));

  let consecutivoVariante = 0;
  const productos: Producto[] = [];
  const variantes: Variante[] = [];
  for (const r of seed.catalogo) {
    productos.push({
      ...t(),
      id: r.id,
      referencia: r.referencia,
      nombre: r.nombre,
      slug: slug(r.nombre),
      categoria: r.categoria,
      linea: r.linea,
      tipoPrenda: r.tipoPrenda,
      curvaTallas: r.curvaTallas,
      temporada: r.temporada,
      proveedorId: r.proveedorId,
      material: r.material,
      descripcion: r.descripcion,
      precioVenta: r.precioVenta,
      tarifaIva: config.parametros.impuestos.ivaGeneral,
      costoVigente: 0,
      historialCosto: [],
      stockMinimo: r.stockMinimo,
      publicadoEnTienda: r.publicadoEnTienda,
      destacado: r.destacado,
      etiquetas: [...r.etiquetas],
    });
    for (const colorId of r.colorIds) {
      const codigo = codigoColor.get(colorId) ?? 'XXX';
      for (const talla of seed.curvasTallas[r.curvaTallas]) {
        consecutivoVariante += 1;
        const tallaCodigo = talla === 'Única' ? 'U' : talla;
        variantes.push({
          ...t(),
          id: `va_${r.id.slice(3)}_${codigo.toLowerCase()}_${tallaCodigo.toLowerCase()}`,
          productoId: r.id,
          talla,
          colorId,
          sku: `${r.referencia}-${codigo}-${tallaCodigo}`,
          ean13: generarEan13(config.marca.prefijoEan, config.marca.codigoEmpresaEan, consecutivoVariante),
        });
      }
    }
  }

  const contactos: Contacto[] = seed.contactos.map((c) => ({ ...t(), ...c }));
  const proveedores: Proveedor[] = seed.proveedores.map((p) => ({
    ...t(),
    ...structuredClone(p.datos),
    id: p.id,
    contactoIds: contactos.filter((c) => c.proveedorId === p.id).map((c) => c.id),
  }));

  const empleados: Empleado[] = [];
  const contratos: Contrato[] = [];
  for (const s of seed.empleados) {
    const mes = sumarMeses(e.ancla, -s.ingreso.mesesAtras).slice(0, 7);
    const fechaIngreso = `${mes}-${String(s.ingreso.dia).padStart(2, '0')}`;
    empleados.push({
      ...t(componerTs(fechaIngreso, '08:00')),
      ...structuredClone(s.datos),
      fechaIngreso,
      id: s.id,
      contratoVigenteId: s.contratoId,
    });
    contratos.push({
      ...t(componerTs(fechaIngreso, '08:00')),
      ...structuredClone(s.contrato),
      inicio: fechaIngreso,
      id: s.contratoId,
      empleadoId: s.id,
    });
  }
  const esquemas: EsquemaComision[] = seed.esquemasComision.map((x) => ({ ...t(), ...structuredClone(x) }));

  const cuentas: CuentaDinero[] = seed.cuentas.map((c) => ({ ...t(), ...c, fechaSaldoInicial: inicio }));
  const saldosCuentas: Record<Id, number> = {};
  for (const c of cuentas) saldosCuentas[c.id] = c.saldoInicial;

  const recurrentes: GastoRecurrente[] = seed.gastosRecurrentes.map((g) => ({
    ...t(),
    ...g,
    desde: mesDe(inicio),
    hasta: null,
    activo: true,
  }));

  // Eventos guardados: campañas de 2 meses atrás a 3 adelante y citas guionadas (N11).
  const desdeEventos = sumarMeses(e.ancla, -2);
  const hastaEventos = sumarMeses(e.ancla, 3);
  const eventos: EventoCalendario[] = [];
  const anio = Number(e.ancla.slice(0, 4));
  for (const a of [anio - 1, anio, anio + 1]) {
    for (const c of seed.campanas) {
      const [d, h] = rangoCampana(c.regla, a);
      if (h < desdeEventos || d > hastaEventos) continue;
      eventos.push({
        ...t(),
        id: `ev_campana_${c.id}_${a}`,
        tipo: 'campana',
        subtipo: 'campana_temporada',
        titulo: c.titulo,
        inicio: `${d}T00:00:00`,
        fin: `${h}T23:59:00`,
        todoElDia: true,
        localId: null,
        clienteId: null,
        empleadoId: null,
        descripcion: c.descripcion,
        recordatorioMin: null,
      });
    }
  }
  for (const c of seed.citas) {
    let fecha: FechaISO;
    if (c.dia === 'proximo_sabado') {
      fecha = sumarDias(e.ancla, 1);
      while (diaSemana(fecha) !== 6) fecha = sumarDias(fecha, 1);
    } else fecha = sumarDias(e.ancla, c.dia);
    const inicioCita = componerTs(fecha, c.hora);
    eventos.push({
      ...t(),
      id: c.id,
      tipo: 'cita',
      subtipo: c.subtipo,
      titulo: c.titulo,
      inicio: inicioCita,
      fin: sumarMinutosTs(inicioCita, c.duracionMin),
      todoElDia: false,
      localId: c.localId,
      clienteId: c.clienteId,
      empleadoId: c.empleadoId,
      descripcion: c.descripcion,
      recordatorioMin: 60,
    });
  }

  const clientes: Cliente[] = seed.clientesGuion.map((c) => {
    const alta = componerTs(sumarMeses(e.ancla, -c.altaMesesAtras), '12:00');
    return {
      ...t(alta),
      ...structuredClone(c.datos),
      id: c.id,
      cumpleanos: c.cumpleanos === 'ancla' ? mesDia(e.ancla) : c.cumpleanos,
      autorizacionDatos: { aceptada: true, fecha: alta, canal: c.datos.canalAlta },
      notas: [],
    };
  });

  const tasas: TasaCambio[] = e.tasasIniciales ?? [
    {
      id: 'tasa_usd_inicial',
      moneda: 'USD',
      fecha: vispera,
      valor: config.tasaEjemplo.valores.USD,
      fuente: 'ejemplo',
    },
    {
      id: 'tasa_cny_inicial',
      moneda: 'CNY',
      fecha: vispera,
      valor: config.tasaEjemplo.valores.CNY,
      fuente: 'ejemplo',
    },
  ];
  const resoluciones: ResolucionFacturacion[] = config.resoluciones.map((r) => ({ ...r }));

  const meta: MetaEstado = {
    semilla: e.semilla,
    ancla: e.ancla,
    inicioVentana: inicio,
    generadoHasta: tsBase,
    versionGenerador: e.versionGenerador ?? config.demo.versionGenerador,
    escala: e.escala ?? config.demo.escala,
    consecutivos: {
      ...CONSECUTIVOS_EN_CERO,
      producto: seed.consecutivoProductoInicial,
      variante: consecutivoVariante,
    },
    consecutivosImportacion: {},
    omitidosGenerador: 0,
    omitidosUsuario: [],
    demandaInsatisfecha: {},
    narrativa: {
      varianteOxfordM: '',
      productoOxford: '',
      varianteChinoArena32: '',
      importacionEnProduccion: '',
      importacionEnTransito: '',
      importacionEnPuerto: '',
      importacionRetrasada: '',
      cxpSaldoGrande: '',
      vendedorPersona: '',
      bodegaPersona: '',
      vendedoraEstrella: '',
      empleadoLlegadasTarde: '',
      contratistasRiesgo: [],
      clienteFrecuente: '',
      clienteVip: '',
      solicitudDescuento: '',
      solicitudTraslado: '',
      solicitudAnulacion: '',
      sesionCajaFaltante: '',
      proveedorSugerencia: '',
    },
  };

  return {
    meta,
    empresa: structuredClone(config.empresa),
    parametros: structuredClone(config.parametros),
    usuarios: tabla(usuarios),
    locales: tabla(locales),
    tasas: tabla(tasas),
    resoluciones: tabla(resoluciones),
    colores: tabla(colores),
    productos: tabla(productos),
    variantes: tabla(variantes),
    movimientos: [],
    traslados: {},
    conteos: {},
    ventas: {},
    devoluciones: {},
    sesionesCaja: {},
    solicitudes: {},
    bonos: {},
    clientes: tabla(clientes),
    empleados: tabla(empleados),
    contratos: tabla(contratos),
    esquemasComision: tabla(esquemas),
    metas: {},
    turnos: {},
    marcaciones: {},
    novedades: {},
    liquidaciones: {},
    proveedores: tabla(proveedores),
    contactos: tabla(contactos),
    importaciones: {},
    cuentas: tabla(cuentas),
    movimientosCuenta: {},
    cuentasPorPagar: {},
    abonosDatafono: {},
    gastos: {},
    gastosRecurrentes: tabla(recurrentes),
    eventos: tabla(eventos),
    facturas: {},
    notasCredito: {},
    mensajes: [],
    notificaciones: {},
    agregados: {
      existencias: {},
      saldosCuentas,
      efectivoSesion: {},
      datafonoDia: {},
      marcacionesDia: {},
      turnosDia: {},
      bonosRedimidos: {},
      cajaAbierta: {},
      cajaDia: {},
    },
  };
}
