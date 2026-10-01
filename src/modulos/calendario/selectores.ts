import { rutas } from '@/app/rutas';
import { ETIQUETAS_ESTADO_IMPORTACION } from '@/config/aduanas';
import { ESTADOS_POR_PAGAR, TONO_ESTADO_IMPORTACION } from '@/config/estados';
import type { CategoriaCxP, CuentaPorPagar, EventoCalendario, FechaISO, Id, TipoEvento } from '@/dominio/tipos';
import { estadoCxP, saldoCxP } from '@/dominio/reglas/cuentas';
import { unidadesLinea } from '@/dominio/reglas/costeo';
import { conjuntoFestivos } from '@/dominio/reglas/festivos';
import { unidades } from '@/lib/formato';
import { dineroOrigen } from '@/lib/moneda';
import { capital, crearSelector, nombreCliente, nombreEmpleado, selEventosCalendario } from '@/selectores';
import { obligacionesIlustrativas } from './calculos';
import type { EventoAgenda } from './tipos';

/** Selectores locales del Calendario (C3): componen `selEventosCalendario` y agregan lo que la pantalla necesita. */

const TABLAS = ['eventos', 'turnos', 'empleados', 'importaciones', 'proveedores', 'productos', 'cuentasPorPagar', 'parametros', 'clientes'] as const;

/** Cuentas por pagar que se ven en el calendario aunque ya estén pagadas (las obligaciones y los pagos grandes). */
const CATEGORIAS_VISIBLES: readonly CategoriaCxP[] = [
  'impuestos',
  'seguridad_social',
  'prestaciones',
  'arriendo',
  'servicios',
  'proveedor_importacion',
  'tributos_aduaneros',
  'agente_aduanas',
  'agente_carga',
];
const CATEGORIAS_OBLIGACION: readonly CategoriaCxP[] = ['impuestos', 'seguridad_social', 'prestaciones'];

const base = (e: Pick<EventoAgenda, 'id' | 'tipo' | 'titulo' | 'inicio' | 'fin' | 'todoElDia' | 'localId' | 'fuente' | 'movible' | 'enlace'>): Omit<EventoAgenda, 'origen' | 'fechaOrigen'> => ({
  ...e,
  subtipo: null,
  ilustrativo: false,
  estadoTexto: null,
  estadoTono: null,
  descripcion: null,
  clienteId: null,
  clienteNombre: null,
  empleadoId: null,
  empleadoNombre: null,
  recordatorioMin: null,
  monto: null,
  montoOrigen: null,
  detalle: null,
  importacionNumero: null,
  contenido: null,
  turno: null,
});

function montoDeCuenta(c: Pick<CuentaPorPagar, 'moneda' | 'valor' | 'abonos'>, pagada: boolean): Pick<EventoAgenda, 'monto' | 'montoOrigen'> {
  const valor = pagada ? c.valor : saldoCxP(c);
  return c.moneda === 'COP' ? { monto: valor, montoOrigen: null } : { monto: null, montoOrigen: dineroOrigen(valor, c.moneda) };
}

/**
 * Agenda del rango: los eventos de `selEventosCalendario` (guardados, turnos, llegadas de importaciones y cuentas por
 * pagar pendientes) con su detalle, más lo que el calendario compartido no trae: las cuentas pagadas de las
 * obligaciones y los pagos grandes (para ver también lo que ya se cumplió) y las obligaciones del calendario
 * ilustrativo que todavía no tienen cuenta por pagar (PILA, prima, IVA, ICA… con fecha ilustrativa).
 */
export const selAgenda = crearSelector<{ desde: FechaISO; hasta: FechaISO; hoy: FechaISO; tipos?: TipoEvento[]; localId?: Id | 'todos' }, EventoAgenda[]>(
  'selAgenda',
  TABLAS,
  (e, f) => {
    const quiere = (t: TipoEvento) => !f.tipos || f.tipos.includes(t);
    const local = (l: Id | null) => !f.localId || f.localId === 'todos' || l === null || l === f.localId;
    const r: EventoAgenda[] = [];
    for (const v of selEventosCalendario(e, { desde: f.desde, hasta: f.hasta, tipos: f.tipos, localId: f.localId })) {
      if (v.fuente.tipo === 'evento') {
        const x = e.eventos[v.fuente.id];
        if (!x) continue;
        r.push({
          ...base(v),
          origen: 'guardado',
          fechaOrigen: x.inicio.slice(0, 10),
          subtipo: x.subtipo,
          descripcion: x.descripcion,
          clienteId: x.clienteId,
          clienteNombre: x.clienteId ? nombreCliente(e.clientes[x.clienteId]) : null,
          empleadoId: x.empleadoId,
          empleadoNombre: x.empleadoId ? nombreEmpleado(e.empleados[x.empleadoId]) : null,
          recordatorioMin: x.recordatorioMin,
        });
      } else if (v.fuente.tipo === 'turno') {
        const t = e.turnos[v.fuente.id];
        if (!t) continue;
        const emp = e.empleados[t.empleadoId];
        const nombre = nombreEmpleado(emp);
        const corto = emp ? `${emp.nombres.split(' ')[0] ?? ''} ${emp.apellidos.split(' ')[0] ?? ''}`.trim() : nombre;
        r.push({
          ...base(v),
          origen: 'turno',
          fechaOrigen: t.fecha,
          empleadoId: t.empleadoId,
          empleadoNombre: nombre,
          turno: { turnoId: t.id, empleadoId: t.empleadoId, empleadoNombre: nombre, empleadoCorto: corto, localId: t.localId, tipo: t.tipo, inicio: t.inicio, fin: t.fin },
        });
      } else if (v.fuente.tipo === 'importacion') {
        const i = e.importaciones[v.fuente.id];
        if (!i) continue;
        const proveedor = e.proveedores[i.proveedorId]?.nombreCorto ?? '';
        const categoria = e.productos[i.lineas[0]?.productoId ?? '']?.categoria ?? '';
        const uds = i.lineas.reduce((a, l) => a + unidadesLinea(l), 0);
        r.push({
          ...base(v),
          // El título del selector compartido es una frase larga; aquí el número va primero para que se lea en una ficha angosta.
          titulo: `${i.numero} · Llega a bodega`,
          origen: 'importacion',
          fechaOrigen: i.hitos.recibido_bodega.estimada,
          importacionNumero: i.numero,
          contenido: `${capital(categoria)} ${proveedor} · ${unidades(uds)}`.trim(),
          estadoTexto: ETIQUETAS_ESTADO_IMPORTACION[i.estado],
          estadoTono: TONO_ESTADO_IMPORTACION[i.estado],
          detalle: proveedor || null,
        });
      } else {
        const c = e.cuentasPorPagar[v.fuente.id];
        if (!c) continue;
        const estado = estadoCxP(c, f.hoy);
        r.push({
          ...base(v),
          // El título que arma el selector compartido lleva el monto en pesos: aquí va aparte, para convertirlo.
          titulo: c.concepto,
          origen: 'cuenta',
          fechaOrigen: c.programadaPara ?? c.fechaVencimiento,
          estadoTexto: ESTADOS_POR_PAGAR[estado].etiqueta,
          estadoTono: ESTADOS_POR_PAGAR[estado].tono,
          descripcion: c.nota,
          detalle: c.terceroNombre,
          ...montoDeCuenta(c, false),
        });
      }
    }

    if (quiere('vencimiento')) {
      // Cuentas ya pagadas de las categorías que importan, agrupadas por concepto y fecha (la PILA se paga en dos planillas).
      const pagadas = new Map<string, CuentaPorPagar[]>();
      const cuentasObligacion: CuentaPorPagar[] = [];
      for (const c of Object.values(e.cuentasPorPagar)) {
        if (c.eliminadoEn) continue;
        if (CATEGORIAS_OBLIGACION.includes(c.categoria)) cuentasObligacion.push(c);
        if (saldoCxP(c) > 0 || !CATEGORIAS_VISIBLES.includes(c.categoria) || !local(c.localId)) continue;
        if (c.fechaVencimiento < f.desde || c.fechaVencimiento > f.hasta) continue;
        const clave = `${c.concepto}|${c.fechaVencimiento}|${c.localId ?? ''}`;
        pagadas.set(clave, [...(pagadas.get(clave) ?? []), c]);
      }
      for (const grupo of pagadas.values()) {
        const c = grupo[0];
        if (!c) continue;
        const valores = grupo.reduce((a, x) => a + x.valor, 0);
        r.push({
          ...base({
            id: `cxp:${c.id}`,
            tipo: 'vencimiento',
            titulo: c.concepto,
            inicio: `${c.fechaVencimiento}T00:00:00`,
            fin: null,
            todoElDia: true,
            localId: c.localId,
            fuente: { tipo: 'cuenta_por_pagar', id: c.id },
            movible: false,
            enlace: rutas.porPagar({ resaltar: c.id }),
          }),
          origen: 'cuenta',
          fechaOrigen: c.fechaVencimiento,
          estadoTexto: ESTADOS_POR_PAGAR.pagado.etiqueta,
          estadoTono: ESTADOS_POR_PAGAR.pagado.tono,
          descripcion: c.nota,
          detalle: c.terceroNombre,
          ...(c.moneda === 'COP' ? { monto: valores, montoOrigen: null } : { monto: null, montoOrigen: dineroOrigen(valores, c.moneda) }),
        });
      }

      // Calendario ilustrativo de obligaciones: solo las que aún no tienen su cuenta por pagar.
      const anios = new Set<number>();
      for (let a = Number(f.desde.slice(0, 4)) - 1; a <= Number(f.hasta.slice(0, 4)) + 1; a++) anios.add(a);
      const festivos = conjuntoFestivos([...anios]);
      for (const o of obligacionesIlustrativas(f.desde, f.hasta, e.parametros.obligaciones, festivos)) {
        const existe = cuentasObligacion.some((c) => c.concepto.startsWith(o.nombre) && c.fechaVencimiento.slice(0, 7) === o.fecha.slice(0, 7));
        if (existe) continue;
        r.push({
          ...base({
            id: `obl:${o.clave}:${o.fecha}`,
            tipo: 'vencimiento',
            titulo: o.nombre,
            inicio: `${o.fecha}T00:00:00`,
            fin: null,
            todoElDia: true,
            localId: null,
            fuente: { tipo: 'cuenta_por_pagar', id: `obl-${o.clave}-${o.fecha}` },
            movible: false,
            enlace: rutas.flujo({ semana: o.fecha }),
          }),
          origen: 'obligacion',
          fechaOrigen: o.fecha,
          ilustrativo: true,
          estadoTexto: 'Ilustrativa',
          estadoTono: 'outline',
        });
      }
    }
    return r.sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : a.id < b.id ? -1 : 1));
  },
);

/** Un evento guardado, completo, para editarlo. */
export const selEventoGuardado = crearSelector<{ eventoId: string }, EventoCalendario | null>('selEventoGuardado', ['eventos'], (e, { eventoId }) => {
  const x = e.eventos[eventoId];
  return x && !x.eliminadoEn ? x : null;
});

/**
 * Para `?resaltar=`: dónde cae el elemento (fecha) y qué id de la agenda lo representa. Acepta el id de un evento
 * guardado, el id de la agenda (`ev:`, `turno:`, `imp:`, `cxp:`) o el número de una importación (`IMP-2026-07`).
 */
export const selUbicarEvento = crearSelector<{ clave: string }, { id: string; fecha: FechaISO } | null>(
  'selUbicarEvento',
  ['eventos', 'turnos', 'importaciones', 'cuentasPorPagar'],
  (e, { clave }) => {
    const guardado = e.eventos[clave.startsWith('ev:') ? clave.slice(3) : clave];
    if (guardado && !guardado.eliminadoEn) return { id: `ev:${guardado.id}`, fecha: guardado.inicio.slice(0, 10) };
    const turno = e.turnos[clave.startsWith('turno:') ? clave.slice(6) : clave];
    if (turno) return { id: `turno:${turno.id}`, fecha: turno.fecha };
    const imp = Object.values(e.importaciones).find((i) => !i.eliminadoEn && (i.numero === clave || i.id === clave || `imp:${i.id}` === clave));
    if (imp) return { id: `imp:${imp.id}`, fecha: imp.hitos.recibido_bodega.estimada };
    const cxp = e.cuentasPorPagar[clave.startsWith('cxp:') ? clave.slice(4) : clave];
    if (cxp && !cxp.eliminadoEn) return { id: `cxp:${cxp.id}`, fecha: cxp.programadaPara ?? cxp.fechaVencimiento };
    return null;
  },
);
