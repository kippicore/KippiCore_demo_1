import type { EventoVista, HitoImportacion, EstadoImportacion } from '@/dominio/tipos';
import { ESTADOS_IMPORTACION } from '@/dominio/tipos';
import { agruparPorDia, alturasRelativas, etiquetaHora, etiquetasVisibles, filasArqueo, indiceBajoPunto, pasosHito, textoCarga, tituloDia } from './calculos';

describe('filasArqueo', () => {
  it('ordena de mayor a menor denominación, omite las que están en cero y suma lo contado', () => {
    const filas = filasArqueo({ '1000': 1, '5000': 1, '10000': 1, '50000': 1, '100000': 12, monedas: 510, '20000': 0 });
    expect(filas.map((f) => f.clave)).toEqual(['100000', '50000', '10000', '5000', '1000', 'monedas']);
    expect(filas[0]).toMatchObject({ cantidad: 12, subtotal: 1_200_000 });
    expect(filas.at(-1)).toMatchObject({ etiqueta: 'Monedas', cantidad: null, subtotal: 510 });
    // El caso de Zona Rosa del guion: $ 1.266.510 contados.
    expect(filas.reduce((a, f) => a + f.subtotal, 0)).toBe(1_266_510);
  });
  it('sin conteo no hay filas', () => {
    expect(filasArqueo({})).toEqual([]);
  });
});

describe('barras táctiles', () => {
  it('la barra mayor llena el alto y las nulas o negativas quedan en cero', () => {
    expect(alturasRelativas([0, 50, 100, -20])).toEqual([0, 0.5, 1, 0]);
    expect(alturasRelativas([0, 0])).toEqual([0, 0]);
  });
  it('el índice bajo el dedo queda dentro del rango', () => {
    expect(indiceBajoPunto(0, 300, 10)).toBe(0);
    expect(indiceBajoPunto(150, 300, 10)).toBe(5);
    expect(indiceBajoPunto(999, 300, 10)).toBe(9);
    expect(indiceBajoPunto(-5, 300, 10)).toBe(0);
    expect(indiceBajoPunto(10, 0, 10)).toBe(0);
  });
  it('las etiquetas del eje no se encimen: máximo 6, siempre la primera y la última', () => {
    const v = etiquetasVisibles(30);
    expect(v.size).toBeLessThanOrEqual(6);
    expect(v.has(0)).toBe(true);
    expect(v.has(29)).toBe(true);
    expect(etiquetasVisibles(5).size).toBe(5);
  });
  it('la hora del eje es de 12 horas', () => {
    expect(etiquetaHora(10)).toBe('10 a. m.');
    expect(etiquetaHora(12)).toBe('12 p. m.');
    expect(etiquetaHora(15)).toBe('3 p. m.');
    expect(etiquetaHora(0)).toBe('12 a. m.');
  });
});

describe('agenda', () => {
  const ev = (id: string, inicio: string, todoElDia = false): EventoVista => ({ id, tipo: 'cita', titulo: id, inicio, fin: null, todoElDia, localId: null, fuente: { tipo: 'evento', id }, movible: true, enlace: '', monto: null, montoOrigen: null, detalle: null, ilustrativo: false, recordatorioMin: null });
  it('agrupa por día en orden y pone el título en palabras', () => {
    const dias = agruparPorDia([ev('c', '2026-10-03T15:00:00'), ev('a', '2026-09-30T09:00:00'), ev('b', '2026-10-03T11:00:00'), ev('d', '2026-10-01T00:00:00', true)], '2026-09-30');
    expect(dias.map((d) => d.fecha)).toEqual(['2026-09-30', '2026-10-01', '2026-10-03']);
    expect(dias.map((d) => d.titulo)).toEqual(['Hoy', 'Mañana', 'Sábado 3 de octubre']);
    expect(dias[2]?.eventos.map((x) => x.id)).toEqual(['b', 'c']);
  });
  it('un evento que empezó antes de hoy y sigue vigente va en hoy', () => {
    expect(agruparPorDia([ev('x', '2026-09-28T00:00:00')], '2026-09-30')[0]?.fecha).toBe('2026-09-30');
  });
  it('tituloDia usa el día de la semana colombiano', () => {
    expect(tituloDia('2026-10-05', '2026-09-30')).toBe('Lunes 5 de octubre');
  });
});

describe('hitos de importación', () => {
  const hitos = Object.fromEntries(ESTADOS_IMPORTACION.map((e, i) => [e, { estimada: `2026-09-${String(10 + i).padStart(2, '0')}`, real: i < 9 ? `2026-09-${String(11 + i).padStart(2, '0')}` : null, nota: null, actualizadoPor: e === 'en_puerto' ? 'portal-aduanas' : null } satisfies HitoImportacion])) as Record<EstadoImportacion, HitoImportacion>;
  const pasos = pasosHito('en_puerto', hitos, '2026-09-30');
  it('hechos antes del estado actual, uno actual y el resto pendientes', () => {
    expect(pasos).toHaveLength(13);
    expect(pasos.filter((p) => p.situacion === 'actual').map((p) => p.estado)).toEqual(['en_puerto']);
    expect(pasos.slice(0, 8).every((p) => p.situacion === 'hecho')).toBe(true);
    expect(pasos.slice(9).every((p) => p.situacion === 'pendiente')).toBe(true);
  });
  it('desviación de lo alcanzado y retraso de lo que ya debió pasar', () => {
    expect(pasos[0]?.desviacion).toBe(1);
    expect(pasos[0]?.real).toBe('2026-09-11');
    const pendiente = pasos[10];
    expect(pendiente?.real).toBeNull();
    expect(pendiente?.vencidoDias).toBe(10);
  });
  it('marca lo que reportó la agente desde el portal', () => {
    expect(pasos.find((p) => p.estado === 'en_puerto')?.porPortal).toBe(true);
  });
});

describe('textoCarga', () => {
  it('dice la carga como la dice el importador', () => {
    expect(textoCarga({ tipo: 'consolidada', m3: 5.4 })).toBe('Carga consolidada · 5,4 m³');
    expect(textoCarga({ tipo: 'contenedor', pies: 20 })).toBe('Contenedor de 20 pies');
    expect(textoCarga({ tipo: 'aerea', kg: 180 })).toBe('Carga aérea · 180 kg');
  });
});
