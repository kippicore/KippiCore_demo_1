import type {
  DatosLocal,
  DatosUsuario,
  Empresa,
  EstadoDominio,
  Id,
  Local,
  Parametros,
  ResolucionFacturacion,
  TasaCambio,
  UsuarioDemo,
} from '../tipos';
import { exigir, fallar } from '../errores';
import { fechaValida, idNuevo, RE_CORREO, requerir, requerirExiste, textoObligatorio } from './comunes';
import { crudEliminar, sinIndefinidos } from './crud';
import { manejador, marcarEditado, traza } from './tx';

/** Configuración (PLAN 6.21): empresa, locales, tasas, parámetros, resoluciones y usuarios. */

const RE_NIT = /^\d{3}\.\d{3}\.\d{3}-\d$/;
const RE_HEX = /^#[0-9A-Fa-f]{6}$/;

export const empresaEditar = manejador<'empresa.editar', Partial<Empresa>>({
  validar(_estado, d) {
    const c = d.cambios;
    if (c.nombre !== undefined) textoObligatorio(c.nombre, 'nombre', 'Escribe el nombre del negocio.');
    if (c.razonSocial !== undefined)
      textoObligatorio(c.razonSocial, 'razonSocial', 'Escribe la razón social.');
    if (c.nit !== undefined)
      exigir(RE_NIT.test(c.nit), 'NIT_INVALIDO', 'El NIT va como 901.234.567-7.', 'nit');
    if (c.correo !== undefined)
      exigir(RE_CORREO.test(c.correo), 'CORREO_INVALIDO', 'Escribe un correo válido.', 'correo');
    if (c.colores !== undefined)
      for (const v of Object.values(c.colores))
        exigir(RE_HEX.test(v), 'COLOR_INVALIDO', 'Los colores van en formato #RRGGBB.', 'colores');
    exigir(
      Object.keys(sinIndefinidos(c)).length > 0,
      'SIN_CAMBIOS',
      'No hay cambios para guardar.',
      'cambios',
    );
    return structuredClone(sinIndefinidos(c));
  },
  escribir(estado, cambios, ctx) {
    Object.assign(estado.empresa, cambios);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'empresa', id: 'empresa', accion: 'editada' });
  },
});

function validarLocal(
  estado: EstadoDominio,
  d: Partial<DatosLocal>,
  completo: boolean,
  excluirId: Id | null,
): void {
  if (completo || d.nombre !== undefined)
    textoObligatorio(d.nombre, 'nombre', 'Escribe el nombre del local.');
  if (completo || d.codigo !== undefined) {
    textoObligatorio(d.codigo, 'codigo', 'Escribe el código del local.');
    exigir(
      !Object.values(estado.locales).some(
        (l) => l.id !== excluirId && !l.eliminadoEn && l.codigo === d.codigo,
      ),
      'CODIGO_DUPLICADO',
      'Ya hay un local con ese código.',
      'codigo',
    );
  }
  if (completo || d.tipo !== undefined)
    exigir(
      ['tienda_calle', 'centro_comercial', 'bodega'].includes(d.tipo ?? ''),
      'TIPO_INVALIDO',
      'Elige el tipo de local.',
      'tipo',
    );
  if (completo || d.arriendoMensual !== undefined)
    exigir(
      Number.isInteger(d.arriendoMensual) && (d.arriendoMensual ?? 0) >= 0,
      'VALOR_INVALIDO',
      'El arriendo no puede ser negativo.',
      'arriendoMensual',
    );
  if (d.cuentaCajaId) requerir(estado.cuentas, d.cuentaCajaId, 'la caja', 'cuentaCajaId');
}

export const localCrear = manejador<'local.crear', Local>({
  validar(estado, d, ctx) {
    idNuevo(estado.locales, d.localId, 'localId');
    validarLocal(estado, d.datos, true, null);
    return { ...traza(ctx), ...structuredClone(d.datos), id: d.localId };
  },
  escribir(estado, l, ctx) {
    estado.locales[l.id] = l;
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'locales', id: l.id, accion: 'creada' });
  },
});

export const localEditar = manejador<'local.editar', { id: Id; cambios: Partial<Local> }>({
  validar(estado, d) {
    const l = requerir(estado.locales, d.localId, 'el local', 'localId');
    validarLocal(estado, d.cambios, false, l.id);
    return { id: l.id, cambios: structuredClone(sinIndefinidos(d.cambios)) };
  },
  escribir(estado, plan, ctx) {
    const l = estado.locales[plan.id];
    if (!l) return;
    Object.assign(l, plan.cambios);
    marcarEditado(l, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'locales', id: l.id, accion: 'editada' });
  },
});

export const localEliminar = crudEliminar<'local.eliminar', Local>({
  coleccion: 'locales',
  id: (d) => d.localId,
  nombre: 'el local',
  motivo: (d) => d.motivo,
  validar(estado, l) {
    let unidades = 0;
    const sufijo = `@${l.id}`;
    for (const [clave, n] of Object.entries(estado.agregados.existencias))
      if (clave.endsWith(sufijo)) unidades += n;
    exigir(
      unidades === 0,
      'CON_EXISTENCIAS',
      `${l.nombre} tiene ${unidades} unidades en existencia; trasládalas antes de eliminarlo.`,
      'localId',
    );
    const abierta = Object.values(estado.sesionesCaja).some((s) => s.localId === l.id && s.cierre === null);
    exigir(!abierta, 'CAJA_ABIERTA', `La caja de ${l.nombre} está abierta.`, 'localId');
  },
});

// ---------- Tasas ----------

export const tasaRegistrar = manejador<'tasa.registrar', { tasa: TasaCambio; reemplaza: Id | null }>({
  validar(estado, d, ctx) {
    exigir(
      d.moneda === 'USD' || d.moneda === 'CNY',
      'MONEDA_INVALIDA',
      'La tasa es para dólares o yuanes.',
      'moneda',
    );
    exigir(
      typeof d.valor === 'number' && d.valor > 0,
      'TASA_INVALIDA',
      'La tasa debe ser mayor que cero.',
      'valor',
    );
    fechaValida(d.fecha, 'fecha');
    exigir(d.fecha <= ctx.hoy, 'FECHA_FUTURA', 'La tasa no puede ser de una fecha futura.', 'fecha');
    const existente = Object.values(estado.tasas).find((t) => t.moneda === d.moneda && t.fecha === d.fecha);
    if (!existente || existente.id !== d.tasaId) idNuevo(estado.tasas, d.tasaId, 'tasaId');
    return {
      tasa: {
        id: d.tasaId,
        moneda: d.moneda,
        fecha: d.fecha,
        valor: Math.round(d.valor * 100) / 100,
        fuente: ctx.origen === 'usuario' ? 'usuario' : 'ejemplo',
      },
      reemplaza: existente && existente.id !== d.tasaId ? existente.id : null,
    };
  },
  escribir(estado, plan, ctx) {
    if (plan.reemplaza) delete estado.tasas[plan.reemplaza];
    estado.tasas[plan.tasa.id] = plan.tasa;
    ctx.emitir({ tipo: 'TasaRegistrada', moneda: plan.tasa.moneda, valor: plan.tasa.valor });
  },
});

export const tasaEditar = manejador<'tasa.editar', TasaCambio>({
  validar(estado, d, ctx) {
    const t = requerirExiste(estado.tasas, d.tasaId, 'la tasa', 'tasaId');
    exigir(
      typeof d.valor === 'number' && d.valor > 0,
      'TASA_INVALIDA',
      'La tasa debe ser mayor que cero.',
      'valor',
    );
    fechaValida(d.fecha, 'fecha');
    exigir(d.fecha <= ctx.hoy, 'FECHA_FUTURA', 'La tasa no puede ser de una fecha futura.', 'fecha');
    const choque = Object.values(estado.tasas).some(
      (x) => x.id !== t.id && x.moneda === t.moneda && x.fecha === d.fecha,
    );
    exigir(!choque, 'TASA_DUPLICADA', 'Ya hay una tasa para esa moneda y esa fecha.', 'fecha');
    return {
      ...t,
      valor: Math.round(d.valor * 100) / 100,
      fecha: d.fecha,
      fuente: ctx.origen === 'usuario' ? 'usuario' : t.fuente,
    };
  },
  escribir(estado, t, ctx) {
    estado.tasas[t.id] = t;
    ctx.emitir({ tipo: 'TasaRegistrada', moneda: t.moneda, valor: t.valor });
  },
});

export const tasaEliminar = manejador<'tasa.eliminar', { id: Id }>({
  validar(estado, d) {
    const t = requerirExiste(estado.tasas, d.tasaId, 'la tasa', 'tasaId');
    const otras = Object.values(estado.tasas).filter((x) => x.moneda === t.moneda && x.id !== t.id).length;
    exigir(
      otras > 0,
      'ULTIMA_TASA',
      'Es la única tasa de esa moneda; edítala en lugar de eliminarla.',
      'tasaId',
    );
    return { id: t.id };
  },
  escribir(estado, plan, ctx) {
    delete estado.tasas[plan.id];
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'tasas', id: plan.id, accion: 'eliminada' });
  },
});

// ---------- Parámetros ----------

/**
 * Valida cambios contra la forma actual de la sección: solo claves existentes, mismo tipo, números ≥ 0;
 * los valores que hoy son fracciones (entre 0 y 1, sin ser enteros) deben seguir entre 0 y 1.
 */
/** Parámetros `number | null` cuyo `null` significa "calcular automáticamente": un valor manual puede volver a `null`. */
const RUTAS_ANULABLES = new Set(['nomina.divisorHorasMes']);

function validarForma(actual: unknown, nuevo: unknown, ruta: string): void {
  if (typeof actual === 'number') {
    if (nuevo === null && RUTAS_ANULABLES.has(ruta)) return;
    exigir(
      typeof nuevo === 'number' && Number.isFinite(nuevo) && nuevo >= 0,
      'VALOR_INVALIDO',
      `El valor de ${ruta} debe ser un número positivo.`,
      ruta,
    );
    if (actual > 0 && actual < 1)
      exigir(nuevo <= 1, 'VALOR_INVALIDO', `El porcentaje de ${ruta} va entre 0 % y 100 %.`, ruta);
    return;
  }
  if (actual === null) {
    exigir(
      nuevo === null || (typeof nuevo === 'number' && nuevo > 0),
      'VALOR_INVALIDO',
      `Revisa el valor de ${ruta}.`,
      ruta,
    );
    return;
  }
  if (Array.isArray(actual)) {
    exigir(Array.isArray(nuevo), 'VALOR_INVALIDO', `${ruta} debe ser una lista.`, ruta);
    return;
  }
  if (typeof actual === 'object') {
    exigir(
      typeof nuevo === 'object' && nuevo !== null && !Array.isArray(nuevo),
      'VALOR_INVALIDO',
      `Revisa ${ruta}.`,
      ruta,
    );
    for (const [k, v] of Object.entries(nuevo as Record<string, unknown>)) {
      exigir(
        k in (actual as Record<string, unknown>),
        'CLAVE_DESCONOCIDA',
        `El parámetro ${ruta}.${k} no existe.`,
        ruta,
      );
      validarForma((actual as Record<string, unknown>)[k], v, `${ruta}.${k}`);
    }
    return;
  }
  exigir(typeof nuevo === typeof actual, 'VALOR_INVALIDO', `Revisa el valor de ${ruta}.`, ruta);
}

function fusionar(base: unknown, cambios: unknown): unknown {
  if (
    typeof base !== 'object' ||
    base === null ||
    Array.isArray(base) ||
    typeof cambios !== 'object' ||
    cambios === null ||
    Array.isArray(cambios)
  ) {
    return structuredClone(cambios);
  }
  const r: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(cambios as Record<string, unknown>)) r[k] = fusionar(r[k], v);
  return r;
}

export const parametrosEditar = manejador<'parametros.editar', { seccion: keyof Parametros; valor: unknown }>(
  {
    validar(estado, d) {
      exigir(
        d.seccion in estado.parametros,
        'SECCION_INVALIDA',
        'Esa sección de parámetros no existe.',
        'seccion',
      );
      exigir(Object.keys(d.cambios).length > 0, 'SIN_CAMBIOS', 'No hay cambios para guardar.', 'cambios');
      validarForma(estado.parametros[d.seccion], d.cambios, d.seccion);
      if (d.seccion === 'nomina' && 'smmlv' in d.cambios)
        exigir(
          (d.cambios.smmlv as number) > 0,
          'VALOR_INVALIDO',
          'El salario mínimo debe ser mayor que cero.',
          'smmlv',
        );
      return { seccion: d.seccion, valor: fusionar(estado.parametros[d.seccion], d.cambios) };
    },
    escribir(estado, plan, ctx) {
      (estado.parametros as unknown as Record<string, unknown>)[plan.seccion] = plan.valor;
      ctx.emitir({ tipo: 'ParametrosEditados', seccion: plan.seccion });
    },
  },
);

export const resolucionEditar = manejador<'resolucion.editar', ResolucionFacturacion>({
  validar(estado, d) {
    const r = requerirExiste(estado.resoluciones, d.resolucionId, 'la resolución', 'resolucionId');
    exigir(
      d.cambios.tipo === undefined || d.cambios.tipo === r.tipo,
      'TIPO_INMUTABLE',
      'El tipo de documento de la resolución no se cambia.',
      'tipo',
    );
    const nueva = { ...r, ...sinIndefinidos(d.cambios) } as ResolucionFacturacion;
    textoObligatorio(nueva.prefijo, 'prefijo', 'Escribe el prefijo.');
    textoObligatorio(nueva.numero, 'numero', 'Escribe el número de la resolución.');
    exigir(
      Number.isInteger(nueva.desde) &&
        Number.isInteger(nueva.hasta) &&
        nueva.desde > 0 &&
        nueva.hasta >= nueva.desde,
      'RANGO_INVALIDO',
      'Revisa el rango de numeración.',
      'desde',
    );
    fechaValida(nueva.vigenteDesde, 'vigenteDesde');
    fechaValida(nueva.vigenteHasta, 'vigenteHasta');
    exigir(nueva.vigenteHasta >= nueva.vigenteDesde, 'RANGO_INVALIDO', 'Revisa la vigencia.', 'vigenteHasta');
    return nueva;
  },
  escribir(estado, r, ctx) {
    estado.resoluciones[r.id] = r;
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'resoluciones', id: r.id, accion: 'editada' });
  },
});

// ---------- Usuarios ----------

function validarUsuario(estado: EstadoDominio, d: Partial<DatosUsuario>, completo: boolean): void {
  if (completo || d.nombre !== undefined) textoObligatorio(d.nombre, 'nombre', 'Escribe el nombre.');
  if (completo || d.correo !== undefined)
    exigir(RE_CORREO.test(d.correo ?? ''), 'CORREO_INVALIDO', 'Escribe un correo válido.', 'correo');
  if (completo || d.rol !== undefined)
    exigir(['dueno', 'vendedor', 'bodega'].includes(d.rol ?? ''), 'ROL_INVALIDO', 'Elige el rol.', 'rol');
  if (d.empleadoId) requerir(estado.empleados, d.empleadoId, 'el empleado', 'empleadoId');
  if (d.localFijoId) requerir(estado.locales, d.localFijoId, 'el local', 'localFijoId');
}

export const usuarioCrear = manejador<'usuario.crear', UsuarioDemo>({
  validar(estado, d, ctx) {
    idNuevo(estado.usuarios, d.usuarioId, 'usuarioId');
    validarUsuario(estado, d.datos, true);
    return { ...traza(ctx), ...d.datos, id: d.usuarioId };
  },
  escribir(estado, u, ctx) {
    estado.usuarios[u.id] = u;
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'usuarios', id: u.id, accion: 'creada' });
  },
});

export const usuarioEditar = manejador<'usuario.editar', { id: Id; cambios: Partial<UsuarioDemo> }>({
  validar(estado, d) {
    const u = requerir(estado.usuarios, d.usuarioId, 'el usuario', 'usuarioId');
    validarUsuario(estado, d.cambios, false);
    if (u.rol === 'dueno' && d.cambios.rol !== undefined && d.cambios.rol !== 'dueno') {
      const duenos = Object.values(estado.usuarios).filter((x) => x.rol === 'dueno' && !x.eliminadoEn).length;
      exigir(duenos > 1, 'ULTIMO_DUENO', 'Debe quedar al menos un usuario dueño.', 'rol');
    }
    return { id: u.id, cambios: { ...sinIndefinidos(d.cambios) } };
  },
  escribir(estado, plan, ctx) {
    const u = estado.usuarios[plan.id];
    if (!u) return;
    Object.assign(u, plan.cambios);
    marcarEditado(u, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'usuarios', id: u.id, accion: 'editada' });
  },
});

export const usuarioEliminar = crudEliminar<'usuario.eliminar', UsuarioDemo>({
  coleccion: 'usuarios',
  id: (d) => d.usuarioId,
  nombre: 'el usuario',
  validar(estado, u) {
    if (u.rol !== 'dueno') return;
    const duenos = Object.values(estado.usuarios).filter((x) => x.rol === 'dueno' && !x.eliminadoEn).length;
    if (duenos <= 1) fallar('ULTIMO_DUENO', 'Debe quedar al menos un usuario dueño.', 'usuarioId');
  },
});
