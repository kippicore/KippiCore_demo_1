import type { CategoriaCxP, EventoVista, FechaISO, Id, TipoEvento } from '@/dominio/tipos';
import { llegadaABodega } from '@/dominio/reglas/importaciones';
import { estadoCxP, saldoCxP } from '@/dominio/reglas/cuentas';
import { lunesDe, sumarDias } from '@/dominio/reglas/fechas';
import { unidadesLinea } from '@/dominio/reglas/costeo';
import { conjuntoFestivos } from '@/dominio/reglas/festivos';
import { obligacionesIlustrativas } from '@/dominio/reglas/obligaciones';
import { NOMBRES_CATEGORIA } from '@/seed/catalogo';
import { rutas } from '@/app/rutas';
import { crearSelector } from './memo';
import { nombreEmpleado } from './base';
import { miles, montoExtranjero } from './texto';

/**
 * Calendario unificado (PLAN 6.23 `calendario.ts`, 6.13): almacenados + turnos + llegadas + vencimientos + las
 * obligaciones del calendario ilustrativo que aún no tienen cuenta por pagar (N11). Compartidos C-D: el título es
 * solo el concepto; el saldo viaja aparte (`monto` en COP para `<Dinero>`, `montoOrigen` en US$ o CN¥) y la llegada
 * se titula "IMP-2026-07 · Llega a bodega" con su contenido en `detalle`.
 */

/** Categorías de cuentas por pagar que cuentan como la obligación del calendario ilustrativo de ese mes. */
const CATEGORIAS_OBLIGACION: readonly CategoriaCxP[] = ['impuestos', 'seguridad_social', 'prestaciones'];
const VACIO = { monto: null, montoOrigen: null, detalle: null, ilustrativo: false, recordatorioMin: null } as const;

const NOMBRE_TURNO = { apertura: 'Apertura', intermedio: 'Intermedio', cierre: 'Cierre', completo: 'Completo' } as const;

export const selEventosCalendario = crearSelector<
  { desde: FechaISO; hasta: FechaISO; tipos?: TipoEvento[]; localId?: Id | 'todos' },
  EventoVista[]
>('selEventosCalendario', ['eventos', 'turnos', 'empleados', 'importaciones', 'proveedores', 'productos', 'cuentasPorPagar', 'parametros'], (e, f) => {
  const quiere = (t: TipoEvento) => !f.tipos || f.tipos.includes(t);
  const local = (l: Id | null) => !f.localId || f.localId === 'todos' || l === null || l === f.localId;
  const r: EventoVista[] = [];
  for (const x of Object.values(e.eventos)) {
    if (x.eliminadoEn || !quiere(x.tipo) || !local(x.localId)) continue;
    const ini = x.inicio.slice(0, 10);
    const fin = (x.fin ?? x.inicio).slice(0, 10);
    if (fin < f.desde || ini > f.hasta) continue;
    r.push({
      id: `ev:${x.id}`,
      tipo: x.tipo,
      titulo: x.titulo,
      inicio: x.inicio,
      fin: x.fin,
      todoElDia: x.todoElDia,
      localId: x.localId,
      fuente: { tipo: 'evento', id: x.id },
      movible: true,
      enlace: x.clienteId ? rutas.cliente(x.clienteId) : rutas.calendario({ fecha: ini, resaltar: x.id }),
      ...VACIO,
      recordatorioMin: x.recordatorioMin,
    });
  }
  if (quiere('turno'))
    for (const t of Object.values(e.turnos)) {
      if (t.fecha < f.desde || t.fecha > f.hasta || !local(t.localId)) continue;
      r.push({
        id: `turno:${t.id}`,
        tipo: 'turno',
        titulo: `${nombreEmpleado(e.empleados[t.empleadoId])} · ${NOMBRE_TURNO[t.tipo]}`,
        inicio: `${t.fecha}T${t.inicio}:00`,
        fin: `${t.fecha}T${t.fin}:00`,
        todoElDia: false,
        localId: t.localId,
        fuente: { tipo: 'turno', id: t.id },
        movible: true,
        enlace: rutas.turnos({ semana: lunesDe(t.fecha), local: t.localId }),
        ...VACIO,
      });
    }
  if (quiere('importacion'))
    for (const i of Object.values(e.importaciones)) {
      if (i.eliminadoEn || i.estado === 'recibido_bodega' || i.estado === 'cotizado') continue;
      const fecha = llegadaABodega(i);
      if (fecha < f.desde || fecha > f.hasta) continue;
      const prov = e.proveedores[i.proveedorId]?.nombreCorto ?? '';
      const cat = e.productos[i.lineas[0]?.productoId ?? '']?.categoria;
      const unidades = i.lineas.reduce((a, l) => a + unidadesLinea(l), 0);
      r.push({
        id: `imp:${i.id}`,
        tipo: 'importacion',
        titulo: `${i.numero} · Llega a bodega`,
        inicio: `${fecha}T00:00:00`,
        fin: null,
        todoElDia: true,
        localId: 'bod',
        fuente: { tipo: 'importacion', id: i.id },
        movible: true,
        enlace: rutas.importacion(i.numero),
        ...VACIO,
        detalle: [cat ? NOMBRES_CATEGORIA[cat] : '', prov].filter(Boolean).join(' ') + ` · ${miles(unidades)} uds.`,
      });
    }
  if (quiere('vencimiento')) {
    for (const c of Object.values(e.cuentasPorPagar)) {
      if (c.eliminadoEn || saldoCxP(c) <= 0 || !local(c.localId)) continue;
      const fecha = c.programadaPara ?? c.fechaVencimiento;
      if (fecha < f.desde || fecha > f.hasta) continue;
      const saldo = saldoCxP(c);
      r.push({
        id: `cxp:${c.id}`,
        tipo: 'vencimiento',
        titulo: c.concepto,
        inicio: `${fecha}T00:00:00`,
        fin: null,
        todoElDia: true,
        localId: c.localId,
        fuente: { tipo: 'cuenta_por_pagar', id: c.id },
        movible: estadoCxP(c, f.desde) !== 'pagado',
        enlace: rutas.porPagar({ resaltar: c.id }),
        monto: c.moneda === 'COP' ? saldo : null,
        montoOrigen: c.moneda === 'COP' ? null : montoExtranjero(saldo, c.moneda),
        detalle: c.terceroNombre && !c.concepto.includes(c.terceroNombre) ? c.terceroNombre : null,
        ilustrativo: false,
        recordatorioMin: null,
      });
    }
    // Obligaciones del calendario ilustrativo que todavía no tienen su cuenta por pagar (N11: la PILA del mes que
    // viene). Una obligación con cuenta (pendiente o pagada) nunca se repite como ilustrativa.
    const cuentas = Object.values(e.cuentasPorPagar).filter((c) => !c.eliminadoEn && CATEGORIAS_OBLIGACION.includes(c.categoria));
    const anios: number[] = [];
    for (let a = Number(f.desde.slice(0, 4)) - 1; a <= Number(f.hasta.slice(0, 4)) + 1; a++) anios.push(a);
    if (local(null))
      for (const o of obligacionesIlustrativas(f.desde, f.hasta, e.parametros.obligaciones, conjuntoFestivos(anios))) {
        if (cuentas.some((c) => c.concepto.startsWith(o.nombre) && c.fechaVencimiento.slice(0, 7) === o.fecha.slice(0, 7))) continue;
        r.push({
          id: `obl:${o.clave}:${o.fecha}`,
          tipo: 'vencimiento',
          titulo: o.nombre,
          inicio: `${o.fecha}T00:00:00`,
          fin: null,
          todoElDia: true,
          localId: null,
          fuente: { tipo: 'obligacion', id: `obl-${o.clave}-${o.fecha}` },
          movible: false,
          enlace: rutas.calendario({ fecha: o.fecha }),
          ...VACIO,
          ilustrativo: true,
        });
      }
  }
  return r.sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : a.id < b.id ? -1 : 1));
});

/** Próximos eventos (Inicio, 2.3.4): sin turnos, desde hoy, los `n` primeros en `dias` días. */
export const selProximosEventos = crearSelector<{ hoy: FechaISO; n: number; dias?: number }, EventoVista[]>(
  'selProximosEventos',
  ['eventos', 'turnos', 'empleados', 'importaciones', 'proveedores', 'productos', 'cuentasPorPagar', 'parametros'],
  (e, { hoy, n, dias }) =>
    selEventosCalendario(e, {
      desde: hoy,
      hasta: sumarDias(hoy, dias ?? 60),
      tipos: ['campana', 'cita', 'vencimiento', 'importacion', 'otro'],
    })
      .filter((x) => x.inicio.slice(0, 10) >= hoy)
      .slice(0, n),
);
