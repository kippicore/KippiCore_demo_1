import { beforeAll, describe, expect, it } from 'vitest';
import type { EstadoDominio } from '@/dominio/tipos';
import { activarVerificacionDeTablas } from '@/selectores';
import { AHORA, HOY, estadoDe } from '@/selectores/pruebas/construir';
import { construirGuion, sumarMinutos } from './escenarios';
import {
  reconocerColores,
  reconocerContacto,
  reconocerProducto,
  reconocerTalla,
  responder,
  singular,
  textoLocales,
} from './reglas';
import { selContextoEscenarios, selDatosBot, selIndicadoresCanales, textoHorario } from './selectores';
import { MEMORIA_INICIAL, type ContextoBot, type DatosBot, type Memoria, type Respuesta } from './tipos';

/**
 * Pruebas de los cálculos propios de D5: el motor de reglas (producto, color con sinónimos, talla, tratamiento,
 * traspaso y no negociar), los selectores que leen el inventario real y los guiones de cada escenario.
 */
let estado: EstadoDominio;
let datos: DatosBot;
let ctxEscenarios: ReturnType<typeof selContextoEscenarios>;

const dinero = (n: number) => `$${n.toLocaleString('es-CO')}`;
const cliente = (nombre = 'Andrés', trato: 'tu' | 'usted' = 'tu'): ContextoBot => ({
  nombre,
  tratamiento: trato,
  hora: 15,
  rol: 'cliente',
  canal: 'whatsapp',
});

function hablar(texto: string, mem: Memoria = MEMORIA_INICIAL, ctx: ContextoBot = cliente()): Respuesta {
  const r = responder(texto, mem, datos, ctx);
  if (!r) throw new Error('El bot no respondió');
  return r;
}
const textoDe = (r: Respuesta) => r.partes.flatMap((p) => (p.tipo === 'texto' ? [p.texto] : [])).join(' ');

beforeAll(() => {
  activarVerificacionDeTablas(true);
  estado = estadoDe();
  const base = selDatosBot(estado, { hoy: HOY });
  ctxEscenarios = selContextoEscenarios(estado, { hoy: HOY, ahora: AHORA });
  datos = { ...base, marca: 'HALDEN', dinero, resumen: ctxEscenarios.resumen };
});

describe('reconocimiento de texto', () => {
  it('pasa a singular palabras de prenda', () => {
    expect(singular('camisas')).toBe('camisa');
    expect(singular('pantalones')).toBe('pantalon');
    expect(singular('blazeres')).toBe('blazer');
    expect(singular('jeans')).toBe('jeans');
  });

  it('reconoce la talla en letra, número y palabra, y no confunde "Sí" ni "Parque 93"', () => {
    expect(reconocerTalla('¿tienen la oxford en talla M?')).toBe('M');
    expect(reconocerTalla('en XL tienen?')).toBe('XL');
    expect(reconocerTalla('el pantalón en talla 34')).toBe('34');
    expect(reconocerTalla('en la L')).toBe('L');
    expect(reconocerTalla('talla mediana')).toBe('M');
    expect(reconocerTalla('Sí, en Zona Rosa')).toBeNull();
    expect(reconocerTalla('Sí, en Parque 93')).toBeNull();
    expect(reconocerTalla('M')).toBe('M');
  });

  it('reconoce los sinónimos de color: clarita, celeste y azul cielo son el mismo color', () => {
    const p = datos.productos.find((x) => x.id === datos.criticoId)!;
    for (const frase of ['la azul clarita', 'en celeste', 'azul cielo', 'clarito']) {
      expect(
        reconocerColores(frase, p.colores).map((c) => c.nombre),
        frase,
      ).toEqual(['Azul cielo']);
    }
    // "azul" a secas devuelve todos los azules de la prenda.
    expect(reconocerColores('azul', p.colores).map((c) => c.nombre)).toEqual(['Azul cielo', 'Azul medio']);
    expect(reconocerColores('la quiero verde', p.colores)).toEqual([]);
  });

  it('reconoce el producto aunque venga en plural, con sinónimo o con color', () => {
    expect(reconocerProducto('la Oxford azul clarita', datos).producto?.id).toBe(datos.criticoId);
    expect(reconocerProducto('tienen pantalón de pana?', datos).producto?.nombre).toBe('Pantalón de pana');
    expect(reconocerProducto('un saco de lana fría', datos).producto?.nombre).toBe('Blazer de lana fría');
    expect(
      reconocerProducto('blazeres', datos).ambiguos.length +
        (reconocerProducto('blazeres', datos).producto ? 1 : 0),
    ).toBeGreaterThan(0);
    expect(reconocerProducto('hola buenas tardes', datos).producto).toBeNull();
  });

  it('reconoce nombre y celular de un mensaje de contacto', () => {
    expect(reconocerContacto('Camilo Rojas 311 740 0123')).toEqual({
      nombres: 'Camilo',
      apellidos: 'Rojas',
      celular: '3117400123',
    });
    expect(reconocerContacto('me llamo ana maría pérez, mi cel es 3001234567')).toEqual({
      nombres: 'Ana',
      apellidos: 'María Pérez',
      celular: '3001234567',
    });
    expect(reconocerContacto('Camilo').apellidos).toBeNull();
  });
});

describe('consulta de talla con el inventario real', () => {
  it('responde la disponibilidad por local con las cifras del dominio', () => {
    const r = hablar('Hola, ¿tienen la Oxford azul clarita en talla M?');
    const p = datos.productos.find((x) => x.id === datos.criticoId)!;
    const azul = p.colores.find((c) => c.nombre === 'Azul cielo')!;
    const esperado = datos.locales
      .map((l) => ({ nombre: l.nombre, n: p.stock[`M|${azul.id}`]?.[l.id] ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, 'es'));
    const frase =
      esperado.length > 1
        ? `${esperado
            .slice(0, -1)
            .map((x) => `${x.nombre} (${x.n})`)
            .join(', ')} y ${esperado[esperado.length - 1]!.nombre} (${esperado[esperado.length - 1]!.n})`
        : `${esperado[0]!.nombre} (${esperado[0]!.n})`;
    expect(textoDe(r)).toContain(`está disponible en ${frase}`);
    expect(textoDe(r)).toContain('Camisa Oxford entallada azul cielo en talla M');
    expect(textoDe(r)).toContain(dinero(p.precio));
    expect(textoDe(r)).toContain('¿Te la separo en alguno?');
    expect(r.regla).toBe('inventario');
    expect(r.traza.consultas?.[0]?.filas.map((f) => f.unidades)).toEqual(esperado.map((x) => x.n));
    expect(r.memoria.ofrecioSeparar).toBe(true);
  });

  it('coincide con selMatrizExistencias (la bodega no cuenta para el cliente)', async () => {
    const { selMatrizExistencias } = await import('@/selectores');
    const m = selMatrizExistencias(estado, { productoId: datos.criticoId! })!;
    const azul = m.colores.find((c) => c.nombre === 'Azul cielo')!;
    const celda = m.celdas[`M|${azul.id}`]!;
    const r = hablar('oxford azul clarita talla M');
    const total = r.traza.consultas![0]!.total;
    expect(total).toBe(datos.locales.reduce((a, l) => a + (celda[l.id] ?? 0), 0));
  });

  it('cuando el cliente dice que sí, pasa a una persona con nombre y respeta el local elegido', () => {
    const r1 = hablar('Hola, ¿tienen la Oxford azul clarita en talla M?');
    const r2 = hablar('Sí, en Zona Rosa', r1.memoria);
    expect(textoDe(r2)).toBe(`Te paso con ${datos.persona!.nombre}, ella te la separa en Zona Rosa.`);
    expect(r2.traspaso).toBe(true);
    expect(r2.regla).toBe('separar');
    // Una persona ya tiene el chat: el bot queda en pausa.
    expect(responder('¿y tienen en L?', r2.memoria, datos, cliente())).toBeNull();
  });

  it('con un cliente VIP habla de usted en todo el flujo', () => {
    const u = cliente('Ricardo', 'usted');
    const r1 = hablar('buenas tardes, ¿tienen la oxford azul clarita talla M?', MEMORIA_INICIAL, u);
    expect(textoDe(r1)).toMatch(/^Buenas tardes, Ricardo\./);
    expect(textoDe(r1)).toContain('¿Se la separo en alguno?');
    const r2 = hablar('sí por favor', r1.memoria, u);
    expect(textoDe(r2)).toContain(`Le paso con ${datos.persona!.nombre}, ella se la separa.`);
  });

  it('no negocia precios: pasa a una persona', () => {
    const r1 = hablar('¿tienen la oxford azul clarita en talla M?');
    const r2 = hablar('¿me hacen un descuento?', r1.memoria);
    expect(r2.regla).toBe('sin_negociar');
    expect(r2.traspaso).toBe(true);
    expect(textoDe(r2)).toContain('no los negocio');
    expect(textoDe(r2)).not.toMatch(/%|\$/);
    const u = hablar('¿me puede hacer un descuento?', MEMORIA_INICIAL, cliente('Ricardo', 'usted'));
    expect(textoDe(u)).toContain('Yo no negocio precios');
  });

  it('recuerda la prenda: "¿y en L?" responde sobre la misma camisa', () => {
    const r1 = hablar('¿tienen la oxford azul clarita en talla M?');
    const r2 = hablar('¿y en talla L?', r1.memoria);
    expect(r2.memoria.productoId).toBe(datos.criticoId);
    expect(r2.traza.consultas?.[0]?.variante).toContain('talla L');
  });

  it('mantiene el hilo: "pantalón chino talla 32 en Usaquén y cuánto vale" → "el elástico" responde sobre ese chino', () => {
    const r1 = hablar('Hola, ¿tienen pantalón chino talla 32 en Usaquén y cuánto vale?');
    expect(textoDe(r1)).toContain('Tengo varias opciones');
    expect(r1.memoria.talla).toBe('32');
    expect(r1.memoria.pidioPrecio).toBe(true);
    const r2 = hablar('el elástico', r1.memoria);
    const chinoElastico = datos.productos.find((x) => x.nombre === 'Pantalón chino elástico')!;
    expect(r2.memoria.productoId).toBe(chinoElastico.id);
    expect(r2.memoria.talla).toBe('32');
    expect(r2.traza.consultas?.every((c) => c.variante.includes('talla 32'))).toBe(true);
    const t = textoDe(r2);
    expect(t).toContain('Pantalón chino elástico');
    expect(t).toContain(`Cuesta ${dinero(chinoElastico.precio)}`);
    expect(t).toContain('Usaquén');
    // No se salta a una camisa o un polo "elásticos".
    expect(t).not.toMatch(/Camisa de algodón|Polo de jersey/);
  });

  it('elige entre las opciones ofrecidas por orden ("el segundo") o por la palabra distintiva ("el regular")', () => {
    const r1 = hablar('busco un pantalón chino talla 34');
    const dos = hablar('el segundo', r1.memoria);
    const tres = hablar('el regular', r1.memoria);
    expect(dos.memoria.productoId).toBeTruthy();
    expect(tres.memoria.productoId).toBe(datos.productos.find((x) => x.nombre === 'Pantalón chino de algodón regular')!.id);
    expect(tres.traza.consultas?.[0]?.variante).toContain('talla 34');
  });

  it('si venía hablando de pantalones, "el elástico" es el pantalón y no la camisa ni el polo', () => {
    const r1 = hablar('¿cuánto vale el pantalón chino regular?');
    const r2 = hablar('¿y el elástico?', r1.memoria);
    expect(r2.memoria.productoId).toBe(datos.productos.find((x) => x.nombre === 'Pantalón chino elástico')!.id);
  });

  it('entiende tallas numéricas de pantalón: "32", "la 34" y "treinta y dos"', () => {
    expect(reconocerTalla('talla 32')).toBe('32');
    expect(reconocerTalla('la 34')).toBe('34');
    expect(reconocerTalla('28')).toBe('28');
    expect(reconocerTalla('en 40 tienen?')).toBe('40');
    expect(reconocerTalla('quiero la treinta y dos')).toBe('32');
    expect(reconocerTalla('talla treinta y seis')).toBe('36');
    expect(reconocerTalla('la tengo hace treinta años')).toBeNull();
  });

  it('responde con amabilidad cuando no entiende, en el trato del cliente', () => {
    expect(textoDe(hablar('asdf qwer'))).toContain('¿Me dices la talla y el color que buscas?');
    expect(textoDe(hablar('asdf qwer', MEMORIA_INICIAL, cliente('Ricardo', 'usted')))).toContain(
      '¿Me dice la talla y el color que busca?',
    );
  });

  it('avisa cuando la prenda no viene en esa talla o ese color', () => {
    const t = hablar('la oxford entallada en talla 34');
    expect(textoDe(t)).toContain('no viene en talla 34');
    const c = hablar('la oxford entallada en verde oliva talla M');
    expect(textoDe(c)).toContain('no la tengo en ese color');
  });

  it('informa cuando está agotado y ofrece lo que sí hay', () => {
    // Una variante agotada: se arma un dato con ceros y se comprueba el texto.
    const p = datos.productos.find((x) => x.id === datos.criticoId)!;
    const sinM = {
      ...datos,
      productos: datos.productos.map((x) =>
        x.id === p.id
          ? {
              ...x,
              stock: Object.fromEntries(
                Object.entries(x.stock).map(([k, v]) => [
                  k,
                  k.startsWith('M|') ? Object.fromEntries(Object.keys(v).map((l) => [l, 0])) : v,
                ]),
              ),
            }
          : x,
      ),
    };
    const r = responder('la oxford azul clarita en talla M', MEMORIA_INICIAL, sinM, cliente())!;
    expect(textoDe(r)).toContain('está agotada en los locales');
    expect(r.memoria.ofrecioSeparar).toBe(false);
  });

  it('responde precio, horarios, ubicación y envíos sin inventar datos', () => {
    const precio = hablar('¿cuánto cuesta la oxford entallada?');
    expect(textoDe(precio)).toContain(dinero(datos.productos.find((x) => x.id === datos.criticoId)!.precio));
    expect(hablar('¿a qué hora abren?').regla).toBe('horarios');
    expect(textoDe(hablar('¿a qué hora abren?'))).toContain(datos.horario);
    expect(textoDe(hablar('¿dónde queda el local?'))).toContain(datos.locales[0]!.direccion);
    expect(hablar('¿hacen envíos?').regla).toBe('envios');
  });

  it('el catálogo trae tarjetas con las novedades', () => {
    const r = hablar('¿qué novedades tienen?');
    expect(r.regla).toBe('catalogo');
    const tarjetas = r.partes.find((p) => p.tipo === 'tarjetas');
    expect(tarjetas && tarjetas.tipo === 'tarjetas' ? tarjetas.tarjetas.length : 0).toBeGreaterThan(0);
  });
});

describe('Instagram: captura del contacto', () => {
  const ig: ContextoBot = { ...cliente('Camilo'), canal: 'instagram' };
  it('al confirmar pide el contacto y, con nombre y celular, pide crear el cliente', () => {
    const r1 = responder('¿tienen la oxford azul clarita en talla M?', MEMORIA_INICIAL, datos, ig)!;
    const r2 = responder('sí por favor', r1.memoria, datos, ig)!;
    expect(r2.regla).toBe('captura_contacto');
    expect(r2.memoria.pidioContacto).toBe(true);
    const r3 = responder('Camilo Rojas 311 740 0123', r2.memoria, datos, ig)!;
    expect(r3.accion).toEqual({
      tipo: 'crearCliente',
      nombres: 'Camilo',
      apellidos: 'Rojas',
      celular: '3117400123',
    });
    expect(r3.memoria.traspasado).toBe(true);
  });

  it('si falta el celular lo pide', () => {
    const r2 = { ...MEMORIA_INICIAL, pidioContacto: true };
    const r = responder('Camilo Rojas', r2, datos, ig)!;
    expect(r.accion).toBeUndefined();
    expect(textoDe(r)).toContain('Me falta tu celular');
  });
});

describe('chat con el dueño', () => {
  it('responde con la cifra real de ventas de hoy', () => {
    const ctx: ContextoBot = {
      nombre: 'dueño',
      tratamiento: 'tu',
      hora: 21,
      rol: 'dueno',
      canal: 'whatsapp',
    };
    const r = hablar('¿cuánto vendimos hoy?', MEMORIA_INICIAL, ctx);
    expect(textoDe(r)).toContain(`Ventas de hoy: ${dinero(ctxEscenarios.resumen.hoy)}`);
    expect(textoDe(hablar('¿y el mes?', MEMORIA_INICIAL, ctx))).toContain(dinero(ctxEscenarios.resumen.mes));
  });
});

describe('selectores de D5', () => {
  it('textoHorario agrupa los días con la misma franja', () => {
    const h = {
      0: { abre: '11:00', cierra: '19:00' },
      1: { abre: '10:00', cierra: '21:00' },
      2: { abre: '10:00', cierra: '21:00' },
      3: { abre: '10:00', cierra: '21:00' },
      4: { abre: '10:00', cierra: '21:00' },
      5: { abre: '10:00', cierra: '21:00' },
      6: { abre: '10:00', cierra: '21:00' },
    } as const;
    expect(textoHorario(h)).toBe(
      'lunes a sábado de 10:00 a. m. a 9:00 p. m. y domingos de 11:00 a. m. a 7:00 p. m.',
    );
  });

  it('las existencias del bot salen del agregado del dominio y la bodega no aparece', () => {
    expect(datos.locales.map((l) => l.id)).not.toContain('bod');
    const p = datos.productos.find((x) => x.id === datos.criticoId)!;
    const [talla, colorId] = Object.keys(p.stock)[0]!.split('|') as [string, string];
    const variante = Object.values(estado.variantes).find(
      (v) => v.productoId === p.id && v.talla === talla && v.colorId === colorId,
    )!;
    for (const l of datos.locales)
      expect(p.stock[`${talla}|${colorId}`]![l.id]).toBe(
        estado.agregados.existencias[`${variante.id}@${l.id}`] ?? 0,
      );
  });

  it('el contexto de escenarios trae clientes, audiencia y la cifra de ventas del día', async () => {
    const { selVentasHoyHastaHora } = await import('@/selectores');
    const vh = selVentasHoyHastaHora(estado, { hoy: HOY, ahora: AHORA, localId: 'todos' });
    expect(ctxEscenarios.resumen.hoy).toBe(vh.hoy.netas);
    expect(ctxEscenarios.resumen.numVentasHoy).toBe(vh.hoy.numVentas);
    expect(ctxEscenarios.clienteUsted?.tratamiento).toBe('usted');
    expect(ctxEscenarios.audiencia.total).toBe(ctxEscenarios.audiencia.usted + ctxEscenarios.audiencia.tu);
    expect(ctxEscenarios.separado?.saldo).toBeGreaterThan(0);
  });

  it('los indicadores de ventas atribuidas son reales y los simulados cuadran con ellas', async () => {
    const { selVentas } = await import('@/selectores');
    const i = selIndicadoresCanales(estado, { hoy: HOY });
    const real = selVentas(estado, { desde: i.desde, hasta: i.hasta, canal: 'whatsapp' }).totales;
    expect(i.whatsapp.ventas).toBe(real.numVentas);
    expect(i.whatsapp.valor).toBe(real.netas);
    expect(i.whatsapp.mensajesEnviados).toBeGreaterThan(i.whatsapp.conversaciones);
    expect(i.totalVentas).toBe(i.whatsapp.ventas + i.instagram.ventas + i.web.ventas);
  });

  it('textoLocales y sumarMinutos', () => {
    expect(
      textoLocales([
        { localId: 'a', local: 'A', unidades: 2 },
        { localId: 'b', local: 'B', unidades: 1 },
      ]),
    ).toBe('A (2) y B (1)');
    expect(sumarMinutos('2026-09-30T15:30:00', -5)).toBe('2026-09-30T15:25:00');
    expect(sumarMinutos('2026-09-30T23:59:00', 2)).toBe('2026-10-01T00:01:00');
  });
});

describe('guiones', () => {
  const entrada = () => ({ datos, contexto: ctxEscenarios, ahora: AHORA });

  it('consulta de talla: pregunta, disponibilidad real, "sí" y paso a Valentina', () => {
    const g = construirGuion('consulta-talla', entrada());
    const bots = g.pasos.filter((p) => p.tipo === 'bot');
    expect(bots.length).toBeGreaterThanOrEqual(2);
    const textos = bots.map((b) =>
      b.tipo === 'bot' ? b.partes.map((x) => (x.tipo === 'texto' ? x.texto : '')).join(' ') : '',
    );
    expect(textos[0]).toMatch(
      /^Hola, Andrés\. Sí: la Camisa Oxford entallada azul cielo en talla M está disponible en /,
    );
    expect(textos.at(-1)).toContain(`Te paso con ${datos.persona!.nombre}`);
    expect(g.memoriaFinal.traspasado).toBe(true);
    // Las horas terminan en "ahora" y suben de a un minuto.
    const horas = g.pasos.flatMap((p) => ('ts' in p && p.ts ? [p.ts] : []));
    expect(horas.at(-1)).toBe(AHORA);
    expect(horas[0]! < horas.at(-1)!).toBe(true);
  });

  it('paso a una persona con un VIP: usted y sin negociar', () => {
    const g = construirGuion('paso-persona', entrada());
    const t = g.pasos
      .flatMap((p) => (p.tipo === 'bot' ? p.partes : []))
      .flatMap((x) => (x.tipo === 'texto' ? [x.texto] : []))
      .join(' | ');
    expect(t).toContain('Buenas tardes, Ricardo');
    expect(t).toContain('Yo no negocio precios');
    expect(g.memoriaFinal.traspasado).toBe(true);
  });

  it('separado y saldo: usa el saldo real del separado', () => {
    const s = ctxEscenarios.separado!;
    const g = construirGuion('separado-saldo', entrada());
    const t = g.pasos
      .flatMap((p) => (p.tipo === 'bot' ? p.partes : []))
      .flatMap((x) => (x.tipo === 'texto' ? [x.texto] : []))
      .join(' | ');
    expect(t).toContain(s.numero);
    expect(t).toContain(dinero(s.saldo));
  });

  it('nueva colección: dice a cuántos clientes llega y trae tarjetas de novedades', () => {
    const g = construirGuion('nueva-coleccion', entrada());
    expect(g.audiencia?.total).toBe(ctxEscenarios.audiencia.total);
    expect(JSON.stringify(g.pasos)).toContain(`${ctxEscenarios.audiencia.total} clientes`);
    expect(g.pasos.some((p) => p.tipo === 'bot' && p.partes.some((x) => x.tipo === 'tarjetas'))).toBe(true);
  });

  it('cumpleaños: el saludo va en usted para el VIP', () => {
    const g = construirGuion('cumpleanos', entrada());
    const primero = g.pasos.find((p) => p.tipo === 'bot');
    expect(primero && primero.tipo === 'bot' ? JSON.stringify(primero.partes) : '').toContain(
      'feliz cumpleaños. En HALDEN le tenemos un detalle',
    );
  });

  it('resumen al dueño: "Ventas de hoy" con la cifra real', () => {
    const g = construirGuion('resumen-dueno', entrada());
    const primero = g.pasos.find((p) => p.tipo === 'bot');
    const texto =
      primero && primero.tipo === 'bot' && primero.partes[0]?.tipo === 'texto' ? primero.partes[0].texto : '';
    expect(texto).toContain(`Ventas de hoy: ${dinero(ctxEscenarios.resumen.hoy)}`);
  });

  it('Instagram: comentario "precio?", mensaje directo, catálogo y creación del cliente', () => {
    const g = construirGuion('precio-comentario', entrada());
    expect(g.pasos[0]).toEqual({ tipo: 'vista', vista: 'comentarios' });
    expect(g.pasos.some((p) => p.tipo === 'comentario' && p.texto === 'precio?')).toBe(true);
    expect(g.pasos.some((p) => p.tipo === 'comentario' && p.respuestaDe)).toBe(true);
    expect(g.pasos.some((p) => p.tipo === 'bot' && p.partes.some((x) => x.tipo === 'tarjetas'))).toBe(true);
    const efecto = g.pasos.find((p) => p.tipo === 'efecto');
    expect(efecto && efecto.tipo === 'efecto' ? efecto.accion.celular : '').toBe('3117400123');
  });

  it('Instagram: catálogo por mensaje directo termina con el contacto capturado', () => {
    const g = construirGuion('catalogo-dm', entrada());
    expect(g.pasos.some((p) => p.tipo === 'efecto')).toBe(true);
  });
});
