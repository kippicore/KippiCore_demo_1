import { describe, expect, it } from 'vitest';
import type { Importacion, ParametrosAduanas, Proveedor } from '@/dominio/tipos';
import { PARAMETROS } from '@/config';
import {
  UMBRALES,
  diasEnFrase,
  entregaDe,
  etiquetaRetraso,
  saludoContacto,
  filtrarDirectorio,
  hallazgosComparativo,
  nivelDefectos,
  nivelRetraso,
  nombreEje,
  resumenEntregas,
  SIN_FILTROS,
  validarContacto,
  validarProveedor,
  valoresUnicos,
  vecesEnFrase,
  veredictoFabrica,
  type FabricaComparable,
} from './calculos';

const DIAS: ParametrosAduanas['diasEstimadosEntreEstados'] = PARAMETROS.aduanas.diasEstimadosEntreEstados;

const fabrica = (nombre: string, retraso: number | null, defectos: number | null, pedidos = 5): FabricaComparable => ({
  proveedorId: `pr_${nombre}`,
  nombre,
  retrasoPromedio: retraso,
  defectos,
  pedidosRecibidos: pedidos,
});

describe('niveles y veredicto', () => {
  it('clasifica el retraso por los umbrales de la pantalla', () => {
    expect(nivelRetraso(null)).toBeNull();
    expect(nivelRetraso(-3)).toBe('bien');
    expect(nivelRetraso(UMBRALES.retrasoAtencion)).toBe('bien');
    expect(nivelRetraso(UMBRALES.retrasoAtencion + 0.1)).toBe('atencion');
    expect(nivelRetraso(UMBRALES.retrasoCritico)).toBe('atencion');
    expect(nivelRetraso(12)).toBe('critico');
  });

  it('clasifica los defectos por los umbrales de la pantalla', () => {
    expect(nivelDefectos(null)).toBeNull();
    expect(nivelDefectos(0.011)).toBe('bien');
    expect(nivelDefectos(0.03)).toBe('atencion');
    expect(nivelDefectos(0.048)).toBe('critico');
  });

  it('el veredicto es el peor de los dos niveles y explica por qué', () => {
    const incumple = veredictoFabrica({ retrasoPromedio: 12, defectos: 0.048, pedidosRecibidos: 4 });
    expect(incumple.veredicto).toBe('incumple');
    expect(incumple.motivos).toEqual(['llega 12 días tarde en promedio', 'tasa de defectos alta']);
    expect(veredictoFabrica({ retrasoPromedio: 7, defectos: 0.01, pedidosRecibidos: 3 }).veredicto).toBe('reservas');
    expect(veredictoFabrica({ retrasoPromedio: 0, defectos: 0.011, pedidosRecibidos: 6 }).veredicto).toBe('confiable');
    expect(veredictoFabrica({ retrasoPromedio: null, defectos: null, pedidosRecibidos: 0 }).veredicto).toBe('sin_datos');
  });
});

describe('redacción de frases', () => {
  it('días y veces se leen bien', () => {
    expect(diasEnFrase(14.25)).toBe('14 días');
    expect(diasEnFrase(0.2)).toBe('1 día');
    expect(vecesEnFrase(4.36)).toBe('4,4 veces');
    expect(vecesEnFrase(2)).toBe('2 veces');
  });

  it('nombreEje usa la última palabra del nombre corto', () => {
    expect(nombreEje('Ningbo Weiye')).toBe('Weiye');
    expect(nombreEje('Huameng')).toBe('Huameng');
  });
});

describe('etiquetas y saludos', () => {
  it('etiquetaRetraso', () => {
    expect(etiquetaRetraso(null)).toBe('—');
    expect(etiquetaRetraso(0)).toBe('A tiempo');
    expect(etiquetaRetraso(0.4)).toBe('A tiempo');
    expect(etiquetaRetraso(14.25)).toBe('+14 días');
    expect(etiquetaRetraso(1)).toBe('+1 día');
    expect(etiquetaRetraso(-3)).toBe('3 días antes');
  });
  it('saludoContacto: inglés para las fábricas, usted en Colombia', () => {
    expect(saludoContacto({ nombre: 'Kevin Wang', idioma: 'en', tratamiento: 'tu' }, 'HALDEN')).toBe('Hello Kevin, this is HALDEN. I would like to follow up on our orders.');
    expect(saludoContacto({ nombre: 'Carolina Mejía', idioma: 'es', tratamiento: 'usted' }, 'HALDEN')).toContain('le escribo de HALDEN');
    expect(saludoContacto({ nombre: 'Carolina Mejía', idioma: 'es', tratamiento: 'tu' }, 'HALDEN')).toContain('te escribo de HALDEN');
  });
});

describe('hallazgosComparativo (P14)', () => {
  const huameng = fabrica('Guangzhou Huameng', 0, 0.011, 8);
  const weiye = fabrica('Ningbo Weiye', 12, 0.048, 6);
  const lanxin = fabrica('Hangzhou Lanxin', 4, 0.02, 3);

  it('revela a la fábrica que llega tarde y con más defectos, contra la mejor', () => {
    const h = hallazgosComparativo([huameng, weiye, lanxin]);
    expect(h.masTarde?.nombre).toBe('Ningbo Weiye');
    expect(h.masDefectos?.nombre).toBe('Ningbo Weiye');
    expect(h.menosDefectos?.nombre).toBe('Guangzhou Huameng');
    expect(h.razonDefectos).toBeCloseTo(0.048 / 0.011, 6);
    expect(h.titular).toBe('Ningbo Weiye llega en promedio 12 días tarde y tiene 4,4 veces más defectos que Guangzhou Huameng.');
  });

  it('si la que llega tarde no es la de más defectos, redacta dos frases', () => {
    const tarde = fabrica('Hangzhou Lanxin', 15, 0.02, 3);
    const h = hallazgosComparativo([huameng, weiye, tarde]);
    expect(h.titular).toBe('Hangzhou Lanxin es la que más tarde llega: 15 días de retraso en promedio.');
    expect(h.apoyo[0]).toContain('Ningbo Weiye tiene la mayor tasa de defectos');
    expect(h.apoyo.some((x) => x.includes('Guangzhou Huameng es la más puntual'))).toBe(true);
  });

  it('si nadie se sale de los márgenes, lo dice', () => {
    const h = hallazgosComparativo([fabrica('A', 0, 0.01), fabrica('B', 3, 0.015)]);
    expect(h.masTarde).toBeNull();
    expect(h.masDefectos).toBeNull();
    expect(h.titular).toBe('Por ahora ninguna fábrica se sale de los márgenes de puntualidad y de defectos.');
  });

  it('con pocos pedidos recibidos no concluye', () => {
    const h = hallazgosComparativo([fabrica('A', 20, 0.09, 1), fabrica('B', 0, 0.01, 1)]);
    expect(h.masTarde).toBeNull();
    expect(h.titular).toBe('Todavía no hay pedidos recibidos suficientes para comparar a las fábricas.');
  });

  it('con una sola fábrica problemática no compara contra sí misma', () => {
    const h = hallazgosComparativo([fabrica('Sola', 12, 0.05, 4), fabrica('Otra', 0, null, 4)]);
    expect(h.razonDefectos).toBeNull();
    expect(h.titular).toBe('Sola llega en promedio 12 días tarde y además tiene una tasa de defectos alta.');
  });
});

describe('entregas por pedido', () => {
  const base = {
    id: 'im_1',
    numero: 'IMP-2026-02',
    proveedorId: 'pr_weiye',
    fechaPedido: '2026-01-22',
    nota: null,
    eliminadoEn: null,
    recepcion: {
      fecha: '2026-05-14',
      recibidoPor: 'em_wdiaz',
      lineas: { l1: { esperadas: 100, recibidas: 98, defectuosas: 4 }, l2: { esperadas: 50, recibidas: 50, defectuosas: 1 } },
      nota: null,
    },
  } as unknown as Importacion;

  it('mide el retraso contra la estimada original (pedido + días de config)', () => {
    const e = entregaDe(base, DIAS);
    expect(e).not.toBeNull();
    // La estimada original suma los días entre estados de la configuración (≈ 102 días).
    expect(e?.estimadaOriginal).toBe('2026-05-04');
    expect(e?.retraso).toBe(10);
    expect(e?.aTiempo).toBe(false);
    expect(e?.diasEntrega).toBe(112);
    expect(e?.unidadesRecibidas).toBe(148);
    expect(e?.unidadesDefectuosas).toBe(5);
    expect(e?.tasaDefectos).toBeCloseTo(5 / 148, 10);
  });

  it('ignora lo no recibido, lo eliminado y la carga inicial', () => {
    expect(entregaDe({ ...base, recepcion: null }, DIAS)).toBeNull();
    expect(entregaDe({ ...base, eliminadoEn: '2026-06-01T10:00:00' } as Importacion, DIAS)).toBeNull();
    expect(entregaDe({ ...base, nota: 'Carga inicial de existencias' }, DIAS)).toBeNull();
  });

  it('un pedido que llega antes de lo estimado cuenta a tiempo con retraso negativo', () => {
    const e = entregaDe({ ...base, recepcion: { ...base.recepcion!, fecha: '2026-05-01' } }, DIAS);
    expect(e?.retraso).toBe(-3);
    expect(e?.aTiempo).toBe(true);
  });

  it('resume: promedio de retraso, % a tiempo y defectos ponderados por unidades', () => {
    const a = entregaDe(base, DIAS)!;
    const b = entregaDe({ ...base, id: 'im_2', numero: 'IMP-2026-03', recepcion: { ...base.recepcion!, fecha: '2026-05-01', lineas: { l1: { esperadas: 52, recibidas: 52, defectuosas: 0 } } } }, DIAS)!;
    const r = resumenEntregas([a, b]);
    expect(r.pedidos).toBe(2);
    expect(r.retrasoPromedio).toBeCloseTo((10 + -3) / 2, 10);
    expect(r.aTiempo).toBe(0.5);
    expect(r.defectos).toBeCloseTo(5 / 200, 10);
    expect(resumenEntregas([])).toEqual({ pedidos: 0, retrasoPromedio: null, aTiempo: null, defectos: null, diasEntregaPromedio: null });
  });
});

describe('filtros del directorio', () => {
  const prov = (o: Partial<Proveedor>): Proveedor => ({ id: 'x', tipo: 'local', nombre: 'N', nombreCorto: 'N', ciudad: 'Bogotá', pais: 'Colombia', moneda: 'COP', localId: null, ...o }) as Proveedor;
  const filas = [
    { proveedor: prov({ id: 'a', tipo: 'fabrica', nombreCorto: 'Ningbo Weiye', ciudad: 'Ningbo', pais: 'China', moneda: 'USD' }), categoriaTexto: 'Blazers, Trajes' },
    { proveedor: prov({ id: 'b', nombreCorto: 'Rentas Casona de Usaquén', localId: 'usq' }), categoriaTexto: 'Arriendo' },
    { proveedor: prov({ id: 'c', nombreCorto: 'Paseo Granate', localId: 'zr' }), categoriaTexto: 'Arriendo' },
    { proveedor: prov({ id: 'd', nombreCorto: 'Escudo Sabanero' }), categoriaTexto: 'Vigilancia' },
  ];
  const ids = (f: Partial<typeof SIN_FILTROS>) => filtrarDirectorio(filas, { ...SIN_FILTROS, ...f }).map((x) => x.proveedor.id);

  it('sin filtros devuelve todos', () => expect(ids({})).toEqual(['a', 'b', 'c', 'd']));
  it('por tipo, país y moneda', () => {
    expect(ids({ tipo: 'fabrica' })).toEqual(['a']);
    expect(ids({ pais: 'Colombia' })).toEqual(['b', 'c', 'd']);
    expect(ids({ moneda: 'USD' })).toEqual(['a']);
  });
  it('el local explícito deja solo los de ese local', () => expect(ids({ local: 'usq' })).toEqual(['b']));
  it('el local de la barra deja ese local y los generales', () => expect(ids({ localBarra: 'usq' })).toEqual(['a', 'b', 'd']));
  it('el local explícito manda sobre el de la barra', () => expect(ids({ local: 'zr', localBarra: 'usq' })).toEqual(['c']));
  it('busca sin tildes ni mayúsculas, también por categoría', () => {
    expect(ids({ texto: 'usaquen' })).toEqual(['b']);
    expect(ids({ texto: 'VIGILANCIA' })).toEqual(['d']);
    expect(ids({ texto: 'ningbo' })).toEqual(['a']);
  });
  it('lista valores únicos', () => {
    expect(valoresUnicos(filas.map((x) => x.proveedor), 'pais')).toEqual(['China', 'Colombia']);
  });
});

describe('validación de formularios', () => {
  it('contacto: nombre, correo y WhatsApp con indicativo', () => {
    expect(validarContacto({ nombre: 'Lily', correo: 'lily@huameng.example', whatsapp: '+86 138 2716 4405' })).toEqual({});
    const e = validarContacto({ nombre: ' ', correo: 'sin-arroba', whatsapp: 'abc' });
    expect(Object.keys(e).sort()).toEqual(['correo', 'nombre', 'whatsapp']);
  });
  it('proveedor: nombre, nombre corto, ciudad y condiciones', () => {
    expect(validarProveedor({ nombre: 'A', nombreCorto: 'B', ciudad: 'C', condicionesPago: 'D' })).toEqual({});
    expect(Object.keys(validarProveedor({ nombre: '', nombreCorto: '', ciudad: '', condicionesPago: '' }))).toHaveLength(4);
  });
});
