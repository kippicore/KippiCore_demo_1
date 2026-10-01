import { TASA_EJEMPLO } from '@/config/monedas';
import type { Alerta, Categoria, COP, EstadoDominio, FechaHoraISO, FechaISO, Id, Notificacion, ParteFrase, SolicitudAprobacion } from '@/dominio/tipos';
import { asistenciaDia } from '@/dominio/reglas/asistencia';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import { diferenciaDias, lunesDe, minutosDeHora, sumarDias } from '@/dominio/reglas/fechas';
import { esDominicalOFestivo } from '@/dominio/reglas/festivos';
import { retrasoDias, llegadaABodega } from '@/dominio/reglas/importaciones';
import { NOMBRES_CATEGORIA } from '@/seed/catalogo';
import { rutas } from '@/app/rutas';
import { idHijo } from '@/dominio/motor/ids';
import { crearSelector } from './memo';
import { nombreCliente, nombreEmpleado, selTasaVigente } from './base';
import { existencia, selDiasInventario, selEnCaminoPorVariante } from './inventario';
import { selNarrativa } from './narrativa';
import { selMetricasClientes } from './clientes';
import { selCuentasPorCobrar } from './finanzas';
import { selRiesgosContratacion } from './personal';
import { capital, enumerar, montoExtranjero, partesConPesos, pesos, pesosEnPalabras, relativaDias } from './texto';

/**
 * "Requiere tu atención" (PLAN 2.3.3, 6.23 `alertas.ts`): las 10 alertas del guion resueltas con `selNarrativa`
 * (dinámicas: cambian con los datos y la hora) más las notificaciones no leídas arriba, marcadas "Nuevo". Cada
 * alerta lleva su acción construida con `rutas.ts` y sus parámetros de enlace profundo (5.5.1). Descartar una
 * alerta es estado de interfaz (store `sesion`): llega como `descartadas`.
 */

/** 'HH:mm' → '10:00 a. m.' (para frases armadas por selectores). */
export function hora12(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2));
  return `${h % 12 === 0 ? 12 : h % 12}:${hhmm.slice(3, 5)} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

/** Trozos de una frase con dinero: `texto` en pesos (como siempre) y `partes` para `<Dinero>` (compartidos C-D). */
type Trozo = string | { cop: COP; palabras?: boolean };
function frase(...trozos: Trozo[]): { texto: string; partes: ParteFrase[] } {
  const partes: ParteFrase[] = [];
  let texto = '';
  for (const t of trozos) {
    if (typeof t === 'string') {
      texto += t;
      const ultima = partes[partes.length - 1];
      if (ultima && 'texto' in ultima) ultima.texto += t;
      else if (t) partes.push({ texto: t });
    } else {
      texto += t.palabras ? pesosEnPalabras(t.cop) : pesos(t.cop);
      partes.push({ dinero: t.cop, corta: !!t.palabras });
    }
  }
  return { texto, partes };
}

const ORDINAL = ['', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima'];

const TABLAS = [
  'meta',
  'importaciones',
  'cuentasPorPagar',
  'sesionesCaja',
  'clientes',
  'solicitudes',
  'empleados',
  'contratos',
  'parametros',
  'agregados',
  'variantes',
  'locales',
  'tasas',
  'proveedores',
  'contactos',
  'productos',
  'turnos',
  'marcaciones',
  'novedades',
  'ventas',
  'devoluciones',
  'notificaciones',
  'usuarios',
  'colores',
] as const;

export const selAlertas = crearSelector<{ localId: Id | 'todos'; ahora: FechaHoraISO; descartadas?: readonly string[]; leidas?: readonly string[] }, Alerta[]>(
  'selAlertas',
  TABLAS,
  (e, { localId, ahora, descartadas = [], leidas = [] }) => {
    const hoy = ahora.slice(0, 10);
    const hora = ahora.slice(11, 16);
    const n = selNarrativa(e, { hoy });
    const r: Alerta[] = [];
    const nombreLocal = (id: Id | null) => (id ? (e.locales[id]?.nombre ?? id) : '');
    const enLocal = (id: Id | null) => localId === 'todos' || id === null || id === localId;

    // 1. Inventario: se está acabando la variante crítica en un local.
    if (n.varianteCritica && n.localEscasez && n.localSurtido) {
      const v = e.variantes[n.varianteCritica];
      const p = v ? e.productos[v.productoId] : undefined;
      const color = v ? (e.colores[v.colorId]?.nombre ?? '') : '';
      if (v && p) {
        const queda = existencia(e, v.id, n.localEscasez);
        const hay = existencia(e, v.id, n.localSurtido);
        const camino = selEnCaminoPorVariante(e)[v.id];
        const contexto = `${queda === 0 ? 'No queda ninguna' : queda === 1 ? 'Queda 1' : `Quedan ${queda}`}. En ${nombreLocal(n.localSurtido)} hay ${hay}${
          camino ? ` y vienen ${camino.unidades} en la importación ${camino.numero} (llegan a bodega ${relativaDias(camino.fechaEstimada, hoy)})` : ''
        }.`;
        r.push({
          id: `stock_bajo:${v.id}@${n.localEscasez}`,
          tipo: queda === 0 ? 'agotado' : 'stock_bajo',
          modulo: 'inventario',
          severidad: 'urgente',
          titulo: `Se está acabando la talla ${v.talla} de ${p.nombre} ${color.toLowerCase()} en ${nombreLocal(n.localEscasez)}`,
          contexto,
          accion: {
            texto: `Trasladar desde ${nombreLocal(n.localSurtido)}`,
            ruta: rutas.producto(p.referencia, {
              trasladar: { origen: n.localSurtido, destino: n.localEscasez, varianteId: v.id, cantidad: Math.max(1, Math.min(3, hay - 2)) },
            }),
          },
          ts: ahora,
          localId: n.localEscasez,
          nueva: false,
          prioridad: 1,
        });
      }
    }

    // 2. Caja: cierre de anoche con diferencia sin revisar.
    if (n.sesionCajaFaltante) {
      const s = e.sesionesCaja[n.sesionCajaFaltante];
      if (s?.cierre) {
        const dif = s.cierre.diferencia;
        const otras = Object.values(e.locales)
          .filter((l) => l.vende && !l.eliminadoEn && l.id !== s.localId)
          .filter((l) => {
            const id = e.agregados.cajaDia[`${l.id}@${s.abierta.ts.slice(0, 10)}`];
            return id ? e.sesionesCaja[id]?.cierre?.diferencia === 0 : false;
          })
          .map((l) => l.nombre);
        const quien = e.empleados[s.cierre.por] ? nombreEmpleado(e.empleados[s.cierre.por]) : (e.usuarios[s.cierre.por]?.nombre ?? '');
        const cuando = relativaDias(s.abierta.ts.slice(0, 10), hoy) === 'ayer' ? 'anoche' : `el ${s.abierta.ts.slice(8, 10)}/${s.abierta.ts.slice(5, 7)}`;
        r.push({
          id: `caja:${s.id}`,
          tipo: 'caja_con_diferencia',
          modulo: 'caja',
          severidad: 'atencion',
          titulo: `La caja de ${nombreLocal(s.localId)} cerró ${cuando} con ${dif < 0 ? 'un faltante' : 'un sobrante'}`,
          ...contexto(frase(`${dif < 0 ? 'Faltan' : 'Sobran'} `, { cop: Math.abs(dif) }, ` en efectivo. Cerró ${quien}${s.cierre.ciego ? ' (arqueo ciego)' : ''}.${otras.length ? ` ${enumerar(otras)} cuadraron.` : ''}`)),
          accion: { texto: 'Ver cierre', ruta: rutas.caja({ sesion: s.id }) },
          ts: s.cierre.ts,
          localId: s.localId,
          nueva: false,
          prioridad: 2,
        });
      }
    }

    // 3. Importaciones: la que hoy está en puerto (o en nacionalización).
    if (n.importacionEnPuerto) {
      const i = e.importaciones[n.importacionEnPuerto];
      if (i) {
        const notif = Object.values(e.notificaciones).find((x) => x.tipo === 'portal_actualizacion' && x.origen?.id === i.id);
        const autor = notif?.titulo.split(' reportó')[0];
        const contacto = autor ? Object.values(e.contactos).find((c) => c.nombre === autor) : undefined;
        const cuando = i.hitos.en_puerto.real ? relativaDias(i.hitos.en_puerto.real, hoy) : 'hoy';
        const enPuerto = i.estado === 'en_puerto';
        r.push({
          id: `importacion_estado:${i.id}:${i.estado}`,
          tipo: 'importacion_estado',
          modulo: 'importaciones',
          severidad: 'info',
          titulo: enPuerto ? `Tu pedido ${i.numero} llegó a ${i.puertoDestino}` : `Tu pedido ${i.numero} está en ${i.estado === 'en_nacionalizacion' ? 'nacionalización' : 'camino a Bogotá'}`,
          contexto: enPuerto
            ? `${autor ? `${autor}${contacto ? ` (${contacto.empresa.replace(/ S\.A\.S\..*$/, '')})` : ''} lo reportó ${cuando} desde el portal.` : `Llegó ${cuando}.`} Sigue la nacionalización.`
            : `Llegada estimada a bodega: ${relativaDias(llegadaABodega(i), hoy)}.`,
          accion: { texto: 'Ver dónde viene', ruta: rutas.importacion(i.numero, { resaltar: 'cambiar-estado' }) },
          ts: notif?.ts ?? ahora,
          localId: null,
          nueva: false,
          prioridad: 3,
        });
      }
    }

    // 4. Pagos: el pago grande más próximo.
    if (n.cxpGrande) {
      const c = e.cuentasPorPagar[n.cxpGrande];
      if (c) {
        const fecha = c.programadaPara ?? c.fechaVencimiento;
        const s = saldoCxP(c);
        const tasa = c.moneda === 'COP' ? 1 : selTasaVigente(e, { moneda: c.moneda, fecha: hoy });
        const cop = c.moneda === 'COP' ? s : Math.round((s / 100) * tasa);
        const monto: Trozo[] = c.moneda === 'COP' ? [{ cop: s }] : [`${montoExtranjero(s, c.moneda)}, unos `, { cop, palabras: true }, tasa === TASA_EJEMPLO.valores[c.moneda] ? ' con la tasa de ejemplo' : ' con la tasa vigente'];
        const esSaldoFabrica = c.categoria === 'proveedor_importacion' && c.concepto.toLowerCase().includes('saldo');
        r.push({
          id: `cxp:${c.id}:por_vencer`,
          tipo: fecha < hoy ? 'pago_vencido' : 'pago_por_vencer',
          modulo: 'pagos',
          severidad: fecha < hoy ? 'urgente' : 'atencion',
          titulo: `${capital(relativaDias(fecha, hoy))} vence ${esSaldoFabrica ? `el saldo a ${c.terceroNombre}` : c.concepto}`,
          ...contexto(frase(...monto, `.${esSaldoFabrica ? ' Se paga cuando el pedido quede listo para despacho.' : ''} Es el pago más grande del mes.`)),
          accion: { texto: 'Ver la plata de los próximos 90 días', ruta: rutas.flujo({ semana: lunesDe(fecha) }) },
          ts: ahora,
          localId: c.localId,
          nueva: false,
          prioridad: 4,
        });
      }
    }

    // 5. Personal: marcación del empleado de las llegadas tarde (cambia con la hora, N6).
    if (n.empleadoLlegadasTarde) {
      const em = e.empleados[n.empleadoLlegadasTarde];
      const turno = (e.agregados.turnosDia[`${em?.id}@${hoy}`] ?? []).map((id) => e.turnos[id]).find((t) => !!t);
      if (em && turno) {
        const marcs = (e.agregados.marcacionesDia[`${em.id}@${hoy}`] ?? []).map((id) => e.marcaciones[id]).filter((m) => !!m);
        const a = asistenciaDia({
          empleadoId: em.id,
          fecha: hoy,
          turno,
          marcaciones: marcs,
          novedad: null,
          ahora,
          parametros: e.parametros.nomina,
          dominicalOFestivo: esDominicalOFestivo(hoy),
        });
        let tardes = 0;
        for (let k = 1; k <= 29; k++) {
          const f = sumarDias(hoy, -k);
          const t = (e.agregados.turnosDia[`${em.id}@${f}`] ?? []).map((id) => e.turnos[id])[0];
          const en = (e.agregados.marcacionesDia[`${em.id}@${f}`] ?? []).map((id) => e.marcaciones[id]).find((m) => m?.tipo === 'entrada');
          if (t && en && minutosDeHora(en.ts.slice(11, 16)) - minutosDeHora(t.inicio) > e.parametros.nomina.toleranciaLlegadaTardeMin) tardes += 1;
        }
        const nombre = nombreEmpleado(em);
        const tol = e.parametros.nomina.toleranciaLlegadaTardeMin;
        const min = minutosDeHora(hora) - minutosDeHora(turno.inicio);
        const local = nombreLocal(turno.localId);
        let alerta: Pick<Alerta, 'titulo' | 'contexto' | 'tipo' | 'severidad'> | null = null;
        if (a.entrada && a.estado === 'tarde')
          alerta = {
            tipo: 'llegada_tarde',
            severidad: 'atencion',
            titulo: `${nombre} llegó ${a.minutosTarde} minutos tarde hoy`,
            contexto: `Es su ${ORDINAL[tardes + 1] ?? `${tardes + 1}.ª`} llegada tarde este mes. Turno de ${turno.tipo} en ${local} desde las ${hora12(turno.inicio)}.`,
          };
        else if (!a.entrada && min < tol)
          alerta = {
            tipo: 'llegada_tarde',
            severidad: 'info',
            titulo: `${nombre} ${min < 0 ? 'abre' : 'abrió'} hoy ${local} a las ${hora12(turno.inicio)}`,
            contexto: `Lleva ${tardes} llegadas tarde en el último mes.`,
          };
        else if (!a.entrada && a.estado !== 'novedad')
          alerta = {
            tipo: 'inasistencia',
            severidad: 'atencion',
            titulo: `${nombre} no ha marcado entrada`,
            contexto: `Turno de ${turno.tipo} en ${local} desde las ${hora12(turno.inicio)}. Sería su ${ORDINAL[tardes + 1] ?? `${tardes + 1}.ª`} llegada tarde este mes.`,
          };
        if (alerta && enLocal(turno.localId))
          r.push({
            ...alerta,
            id: `asistencia:${em.id}@${hoy}`,
            modulo: 'personal',
            accion: { texto: 'Ver asistencia', ruta: rutas.asistencia({ local: turno.localId, empleado: em.id }) },
            ts: ahora,
            localId: turno.localId,
            nueva: false,
            prioridad: 5,
          });
      }
    }

    // 6. Por cobrar: separados que vencen esta semana (P17: en los próximos 7 días).
    const porVencer = selCuentasPorCobrar(e, { hoy, filtro: 'separados-por-vencer', localId });
    if (porVencer.filas.length > 0)
      r.push({
        id: `separados:${lunesDe(hoy)}`,
        tipo: 'separado_por_vencer',
        modulo: 'ventas',
        severidad: 'atencion',
        titulo: `${porVencer.filas.length === 1 ? '1 separado vence' : `${porVencer.filas.length} separados vencen`} esta semana`,
        ...contexto(frase('Saldo pendiente: ', { cop: porVencer.saldo }, '. Puedes recordarles por WhatsApp con un clic.')),
        accion: { texto: 'Cobrar', ruta: rutas.porCobrar({ filtro: 'separados-por-vencer' }) },
        ts: ahora,
        localId: null,
        nueva: false,
        prioridad: 6,
      });

    // 7. Importación retrasada.
    if (n.importacionRetrasada) {
      const i = e.importaciones[n.importacionRetrasada];
      if (i) {
        const dias = retrasoDias(i, hoy);
        const aforo = i.aforo?.tipo === 'fisico' ? `Le salió aforo físico en ${i.puertoDestino}${i.aforo.motivo ? ` (${i.aforo.motivo})` : ''}. ` : '';
        r.push({
          id: `importacion_retrasada:${i.id}`,
          tipo: 'importacion_retrasada',
          modulo: 'importaciones',
          severidad: 'atencion',
          titulo: `${i.numero} va ${dias} ${dias === 1 ? 'día' : 'días'} tarde`,
          contexto: `${aforo}Nueva llegada estimada a bodega: ${relativaDias(llegadaABodega(i), hoy)}.`,
          accion: { texto: 'Ver detalle', ruta: rutas.importacion(i.numero) },
          ts: ahora,
          localId: null,
          nueva: false,
          prioridad: 7,
        });
      }
    }

    // 8. Clientes: cumpleaños de hoy.
    if (n.clienteCumpleanos) {
      const c = e.clientes[n.clienteCumpleanos];
      const m = c ? selMetricasClientes(e, { hoy })[c.id] : undefined;
      if (c && m && enLocal(m.localHabitualId)) {
        const seg = m.segmento === 'vip' ? 'Cliente VIP' : 'Cliente';
        r.push({
          id: `cumpleanos:${c.id}:${hoy}`,
          tipo: 'cumpleanos_vip',
          modulo: 'clientes',
          severidad: 'info',
          titulo: `Hoy cumple años ${nombreCliente(c)}`,
          ...contexto(
            frase(
              `${seg}${m.localHabitualId ? ` de ${nombreLocal(m.localHabitualId)}` : ''}: `,
              { cop: m.valor, palabras: true },
              ` en compras. Tienes un mensaje listo (en ${c.tratamiento === 'usted' ? 'usted' : 'tú'}).`,
            ),
          ),
          accion: { texto: 'Enviar saludo', ruta: rutas.cliente(c.id, { mensaje: 'cumpleanos' }) },
          ts: ahora,
          localId: m.localHabitualId,
          nueva: false,
          prioridad: 8,
        });
      }
    }

    // 9. Mercancía dormida: la categoría con más días de inventario (P5), si pasa de 1,3 veces el promedio.
    const tienda = selDiasInventario(e, { hoy });
    let peor: { categoria: Categoria; dias: number; costo: number } | null = null;
    for (const cat of Object.keys(NOMBRES_CATEGORIA) as Categoria[]) {
      const d = selDiasInventario(e, { categoria: cat, hoy });
      if (d.unidades > 0 && d.dias > 1.3 * tienda.dias && (!peor || d.dias > peor.dias)) peor = { categoria: cat, dias: d.dias, costo: d.aCosto };
    }
    if (peor)
      r.push({
        id: `dormida:${peor.categoria}`,
        tipo: 'mercancia_dormida',
        modulo: 'inventario',
        severidad: 'info',
        ...titulo(frase('Tienes ', { cop: peor.costo, palabras: true }, ` quietos en ${NOMBRES_CATEGORIA[peor.categoria].toLowerCase()}`)),
        contexto: `${Math.round(peor.dias)} días de inventario, contra ${Math.round(tienda.dias)} del promedio de la tienda.`,
        accion: { texto: 'Ver mercancía dormida', ruta: rutas.analisisProductos({ vista: 'rotacion', resaltar: peor.categoria }) },
        ts: ahora,
        localId: null,
        nueva: false,
        prioridad: 9,
      });

    // 10. Riesgo de contrato realidad.
    const riesgos = selRiesgosContratacion(e, { hoy });
    if (riesgos.length)
      r.push({
        id: `riesgo:${riesgos.map((x) => x.empleadoId).join(',')}`,
        tipo: 'riesgo_contrato_realidad',
        modulo: 'personal',
        severidad: 'atencion',
        titulo: `Riesgo de contrato realidad: ${enumerar(riesgos.map((x) => x.nombre))}`,
        contexto: `${riesgos.length === 1 ? 'Está' : 'Están'} por prestación de servicios, pero ${riesgos.length === 1 ? 'tiene' : 'tienen'} turno fijo y ${riesgos.length === 1 ? 'marca' : 'marcan'} entrada. Revísalo con tu contador.`,
        accion: { texto: 'Revisar', ruta: rutas.personal({ riesgo: 'contrato-realidad' }) },
        ts: ahora,
        localId: null,
        nueva: false,
        prioridad: 10,
      });

    // Notificaciones nuevas (no leídas), marcadas "Nuevo". Solo las MAX_NUEVAS_ARRIBA más recientes van arriba; el
    // resto entra después de la importación (W3), para que el stock bajo (W2), el faltante de caja (W11) y la
    // importación sigan entre las cinco primeras (compartidos C-D).
    const solicitudPorNotificacion = new Map<string, SolicitudAprobacion>();
    for (const s of Object.values(e.solicitudes)) solicitudPorNotificacion.set(idHijo(s.id, 'n'), s);
    const nuevas = selNotificaciones(e, { leidas, hoy })
      .filter((x) => !x.leida && x.notificacion.tipo !== 'sistema' && diferenciaDias(x.notificacion.ts.slice(0, 10), hoy) <= 2)
      .map(({ notificacion: x }, i): Alerta => {
        const base: Alerta = {
          id: `notificacion:${x.id}`,
          tipo: x.tipo === 'aprobacion_solicitada' ? 'aprobacion_pendiente' : 'importacion_estado',
          modulo: x.tipo === 'venta_web' || x.tipo === 'aprobacion_solicitada' ? 'ventas' : x.tipo === 'cliente_instagram' ? 'clientes' : 'importaciones',
          severidad: x.severidad,
          titulo: x.titulo,
          contexto: x.detalle,
          accion: { texto: 'Ver', ruta: x.enlace },
          ts: x.ts,
          localId: null,
          nueva: true,
          origen: x.origen,
          prioridad: i < MAX_NUEVAS_ARRIBA ? 0 : 3.5,
        };
        const sol = x.tipo === 'aprobacion_solicitada' ? solicitudPorNotificacion.get(x.id) : undefined;
        // Los pesos que traen los textos del dominio ("Nueva venta en la tienda web: $ 219.900") siguen la moneda activa.
        const tituloPartes = partesConPesos(x.titulo);
        const contextoPartes = x.detalle ? partesConPesos(x.detalle) : null;
        const conDinero: Alerta = { ...base, ...(tituloPartes ? { tituloPartes } : {}), ...(contextoPartes ? { contextoPartes } : {}) };
        return sol ? { ...conDinero, ...accionAprobacion(e, sol) } : conDinero;
      });
    const fuera = new Set(descartadas);
    return [...nuevas, ...r]
      .filter((a) => !fuera.has(a.id) && enLocal(a.localId))
      .sort((a, b) => a.prioridad - b.prioridad || (a.ts < b.ts ? 1 : -1));
  },
);

const contexto = (f: { texto: string; partes: ParteFrase[] }) => ({ contexto: f.texto, contextoPartes: f.partes });
const titulo = (f: { texto: string; partes: ParteFrase[] }) => ({ titulo: f.texto, tituloPartes: f.partes });

/** Cuántas notificaciones nuevas van arriba de las alertas del guion. */
export const MAX_NUEVAS_ARRIBA = 2;

/**
 * Acción de escritorio de una solicitud de aprobación (compartidos C-D): la notificación del dominio enlaza a la
 * app del celular (`/app/mas/aprobar`), que desde el panel saca al dueño del escritorio. La anulación se aprueba en
 * el detalle de la venta (con su confirmación); el descuento no tiene pantalla de escritorio (nace en el POS del
 * vendedor), así que se aprueba en la misma alerta (`aprobacion`) y el enlace lleva a la prenda. La app (E1) arma
 * su propia ruta por tipo.
 */
function accionAprobacion(e: EstadoDominio, s: SolicitudAprobacion): Pick<Alerta, 'accion' | 'aprobacion' | 'localId' | 'contextoPartes'> {
  const pendiente = s.estado === 'pendiente';
  if (s.datos.tipo === 'anulacion')
    return {
      accion: { texto: pendiente ? 'Revisar y aprobar' : 'Ver la venta', ruta: rutas.venta(s.datos.ventaId) },
      aprobacion: undefined,
      localId: e.ventas[s.datos.ventaId]?.localId ?? null,
    };
  if (s.datos.tipo === 'descuento') {
    const v = e.variantes[s.datos.varianteIds[0] ?? ''];
    const p = v ? e.productos[v.productoId] : undefined;
    // El resumen del dominio trae los valores en pesos al final ("… · $ 789.900 → $ 631.920"): se separan para que
    // sigan la moneda activa (fase 4, flujo 6).
    const corte = s.resumen.lastIndexOf(' · ');
    const contextoPartes: ParteFrase[] | undefined =
      corte > 0 ? [{ texto: s.resumen.slice(0, corte + 3) }, { dinero: s.datos.valorLista }, { texto: ' → ' }, { dinero: s.datos.valorFinal }] : undefined;
    return {
      accion: p ? { texto: 'Ver la prenda', ruta: rutas.producto(p.referencia) } : { texto: 'Ver ventas', ruta: rutas.ventas() },
      aprobacion: pendiente ? { solicitudId: s.id } : undefined,
      localId: s.datos.localId,
      contextoPartes,
    };
  }
  return {
    accion: { texto: 'Ver el traslado', ruta: rutas.traslado(s.datos.trasladoId) },
    aprobacion: undefined,
    localId: null,
  };
}

export interface NotificacionVista {
  notificacion: Notificacion;
  leida: boolean;
}

/** Notificaciones (de dominio) con su estado de lectura (de interfaz, store `sesion`). */
/** Días que una notificación sigue "sin leer" si nadie la abre: las históricas de la demo nacen leídas. */
export const VENTANA_NOTIFICACIONES_DIAS = 7;

export const selNotificaciones = crearSelector<{ leidas?: readonly string[]; hoy?: FechaISO }, NotificacionVista[]>(
  'selNotificaciones',
  ['notificaciones'],
  (e, { leidas = [], hoy }) => {
    const l = new Set(leidas);
    // Con `hoy`, lo que quedó fuera de la ventana reciente cuenta como leído (los 18 meses de historia no son alertas).
    const vieja = (ts: string) => !!hoy && diferenciaDias(ts.slice(0, 10), hoy) > VENTANA_NOTIFICACIONES_DIAS;
    return Object.values(e.notificaciones)
      .map((x) => ({ notificacion: x, leida: l.has(x.id) || vieja(x.ts) }))
      .sort((a, b) => (a.notificacion.ts < b.notificacion.ts ? 1 : -1));
  },
);

/** Solicitudes pendientes de aprobación (descuentos, traslados, anulaciones): "Para aprobar" (W10, W11). */
export const selSolicitudesPendientes = crearSelector<void, SolicitudAprobacion[]>(
  'selSolicitudesPendientes',
  ['solicitudes'],
  (e) => Object.values(e.solicitudes).filter((s) => s.estado === 'pendiente').sort((a, b) => (a.ts < b.ts ? 1 : -1)),
);
