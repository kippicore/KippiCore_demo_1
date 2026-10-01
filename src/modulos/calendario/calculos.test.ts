import { PARAMETROS_OBLIGACIONES } from '@/config/obligaciones';
import { conjuntoFestivos } from '@/dominio/reglas/festivos';
import {
  agruparPorDia,
  borradorDeEvento,
  borradorNuevo,
  construirSemana,
  contarPorTipo,
  datosDeBorrador,
  diasQueCubre,
  moverPeriodo,
  obligacionesIlustrativas,
  rangoVisible,
  semanasDelMes,
  tituloPeriodo,
  trasladarEvento,
  validarBorradorEvento,
  vistaValida,
} from './calculos';
import type { EventoAgenda } from './tipos';

function ev(p: Partial<EventoAgenda> & Pick<EventoAgenda, 'id' | 'tipo' | 'inicio'>): EventoAgenda {
  return {
    titulo: p.id,
    fin: null,
    todoElDia: true,
    localId: null,
    fuente: { tipo: 'evento', id: p.id },
    movible: true,
    enlace: '/panel/calendario',
    origen: 'guardado',
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
    fechaOrigen: p.inicio.slice(0, 10),
    ...p,
  };
}

describe('rango y período', () => {
  it('el mes se pinta en semanas de lunes a domingo (octubre de 2026 empieza en jueves)', () => {
    expect(rangoVisible('mes', '2026-10-15')).toEqual({ desde: '2026-09-28', hasta: '2026-11-01' });
    expect(semanasDelMes('2026-10-15')).toHaveLength(5);
    expect(semanasDelMes('2026-08-10')).toHaveLength(6);
    for (const s of semanasDelMes('2026-10-15')) expect(s).toHaveLength(7);
  });

  it('la semana y el día', () => {
    expect(rangoVisible('semana', '2026-10-08')).toEqual({ desde: '2026-10-05', hasta: '2026-10-11' });
    expect(rangoVisible('semana', '2026-10-11')).toEqual({ desde: '2026-10-05', hasta: '2026-10-11' });
    expect(rangoVisible('dia', '2026-10-08')).toEqual({ desde: '2026-10-08', hasta: '2026-10-08' });
  });

  it('avanza y retrocede por vista; el mes acota el día al último del mes destino', () => {
    expect(moverPeriodo('mes', '2026-01-31', 1)).toBe('2026-02-28');
    expect(moverPeriodo('mes', '2026-10-15', -1)).toBe('2026-09-15');
    expect(moverPeriodo('semana', '2026-10-05', 1)).toBe('2026-10-12');
    expect(moverPeriodo('dia', '2026-10-01', -1)).toBe('2026-09-30');
  });

  it('el título del período', () => {
    expect(tituloPeriodo('mes', '2026-10-15')).toBe('Octubre de 2026');
    expect(tituloPeriodo('semana', '2026-10-08')).toBe('5 – 11 oct de 2026');
    expect(tituloPeriodo('semana', '2026-09-30')).toBe('28 sep – 4 oct de 2026');
    expect(tituloPeriodo('dia', '2026-10-01')).toBe('Jueves 1 de octubre de 2026');
  });

  it('una vista desconocida cae en el mes', () => {
    expect(vistaValida('semana')).toBe('semana');
    expect(vistaValida('dia')).toBe('dia');
    expect(vistaValida('año')).toBe('mes');
    expect(vistaValida(null)).toBe('mes');
  });
});

describe('eventos por día', () => {
  it('un evento cubre de su inicio a su fin, ambos incluidos', () => {
    const campana = { inicio: '2026-12-01T00:00:00', fin: '2026-12-15T23:59:00' };
    const dias = diasQueCubre(campana);
    expect(dias).toHaveLength(15);
    expect(dias[0]).toBe('2026-12-01');
    expect(dias[14]).toBe('2026-12-15');
    expect(diasQueCubre({ inicio: '2026-10-03T11:00:00', fin: '2026-10-03T12:00:00' })).toEqual(['2026-10-03']);
    expect(diasQueCubre({ inicio: '2026-10-03T11:00:00', fin: null })).toEqual(['2026-10-03']);
  });

  it('agrupa por cada día que cubre y ordena: todo el día primero, luego por hora', () => {
    const a = ev({ id: 'a', tipo: 'cita', inicio: '2026-10-03T15:00:00', todoElDia: false });
    const b = ev({ id: 'b', tipo: 'cita', inicio: '2026-10-03T11:00:00', todoElDia: false });
    const c = ev({ id: 'c', tipo: 'campana', inicio: '2026-10-02T00:00:00', fin: '2026-10-03T23:59:00' });
    const m = agruparPorDia([a, b, c], ['2026-10-02', '2026-10-03', '2026-10-04']);
    expect(m.get('2026-10-02')?.map((x) => x.id)).toEqual(['c']);
    expect(m.get('2026-10-03')?.map((x) => x.id)).toEqual(['c', 'b', 'a']);
    expect(m.get('2026-10-04')).toEqual([]);
  });

  it('cuenta por tipo', () => {
    const r = contarPorTipo([ev({ id: '1', tipo: 'turno', inicio: '2026-10-01T10:00:00' }), ev({ id: '2', tipo: 'turno', inicio: '2026-10-01T10:00:00' }), ev({ id: '3', tipo: 'cita', inicio: '2026-10-01T10:00:00' })]);
    expect(r).toEqual({ turno: 2, importacion: 0, vencimiento: 0, campana: 0, cita: 1, otro: 0 });
  });
});

describe('semana del mes: carriles y turnos', () => {
  const semana = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
  const larga = ev({ id: 'larga', tipo: 'campana', inicio: '2026-09-29T00:00:00', fin: '2026-10-01T23:59:00' });
  const llegada = ev({ id: 'llegada', tipo: 'importacion', inicio: '2026-09-30T00:00:00' });
  const turnos = [1, 2, 3].map((n) => ev({ id: `t${n}`, tipo: 'turno', inicio: '2026-09-30T10:00:00', todoElDia: false }));

  it('el evento largo ocupa el mismo carril todos sus días y los de un día van debajo', () => {
    const dias = construirSemana(semana, [larga, llegada, ...turnos], 4);
    const claseEn = (i: number, k: number) => dias[i]?.visibles[k]?.clase;
    expect(claseEn(1, 0)).toBe('evento'); // martes 29: la campaña
    expect(claseEn(2, 0)).toBe('evento'); // miércoles 30: la campaña, mismo carril
    expect(claseEn(3, 0)).toBe('evento'); // jueves 1
    expect(claseEn(0, 0)).toBeUndefined(); // lunes 28: nada (los huecos del final se descartan)
    const miercoles = dias[2];
    expect(miercoles?.visibles.map((c) => c.clase)).toEqual(['evento', 'evento', 'turnos']);
    const primero = miercoles?.visibles[0];
    expect(primero?.clase === 'evento' && primero.evento.id).toBe('larga');
    // La barra muestra su texto solo el primer día (martes), no en los siguientes.
    const marcas = [1, 2, 3].map((i) => {
      const c = dias[i]?.visibles[0];
      return c?.clase === 'evento' ? c.inicioSegmento : null;
    });
    expect(marcas).toEqual([true, false, false]);
    const turnosDelDia = miercoles?.visibles.at(-1);
    expect(turnosDelDia?.clase === 'turnos' && turnosDelDia.turnos).toHaveLength(3);
    expect(miercoles?.total).toBe(5);
  });

  it('un hueco de carril se conserva si hay un evento largo debajo, para alinear la barra', () => {
    const otra = ev({ id: 'otra', tipo: 'campana', inicio: '2026-09-28T00:00:00', fin: '2026-09-30T23:59:00' });
    const dias = construirSemana(semana, [larga, otra], 4);
    // jueves 1: solo `larga`, que quedó en el carril 1 → el carril 0 es un hueco que alinea la barra
    expect(dias[3]?.visibles.map((c) => c.clase)).toEqual(['hueco', 'evento']);
    // lunes 28: solo `otra` (carril 0)
    expect(dias[0]?.visibles.map((c) => c.clase)).toEqual(['evento']);
  });

  it('lo que no cabe se cuenta en "más" y la ficha de turnos siempre se muestra', () => {
    const muchos = Array.from({ length: 6 }, (_, n) => ev({ id: `x${n}`, tipo: 'cita', inicio: '2026-10-02T10:00:00', todoElDia: false }));
    const dia = construirSemana(semana, [...muchos, ...turnos.map((t) => ({ ...t, inicio: '2026-10-02T10:00:00' }))], 4)[4];
    expect(dia?.visibles).toHaveLength(4);
    expect(dia?.visibles.at(-1)?.clase).toBe('turnos');
    expect(dia?.ocultos).toBe(3);
    expect(dia?.total).toBe(9);
  });
});

describe('mover un evento guardado', () => {
  it('desplaza inicio y fin los mismos días y conserva la hora', () => {
    expect(trasladarEvento({ inicio: '2026-10-03T11:00:00', fin: '2026-10-03T12:00:00' }, 5)).toEqual({ inicio: '2026-10-08T11:00:00', fin: '2026-10-08T12:00:00' });
    expect(trasladarEvento({ inicio: '2026-11-27T00:00:00', fin: '2026-11-29T23:59:00' }, -7)).toEqual({ inicio: '2026-11-20T00:00:00', fin: '2026-11-22T23:59:00' });
    expect(trasladarEvento({ inicio: '2026-10-03T11:00:00', fin: null }, 1)).toEqual({ inicio: '2026-10-04T11:00:00', fin: null });
  });
});

describe('obligaciones ilustrativas', () => {
  const festivos = conjuntoFestivos([2026, 2027]);
  const o = obligacionesIlustrativas('2026-10-01', '2026-12-31', PARAMETROS_OBLIGACIONES, festivos);
  const de = (clave: string) => o.filter((x) => x.clave === clave).map((x) => x.fecha);

  it('PILA el décimo día hábil de cada mes (festivos: 12 de octubre, 2 y 16 de noviembre)', () => {
    expect(de('pila')).toEqual(['2026-10-15', '2026-11-17', '2026-12-15']);
  });

  it('retención mensual el día fijo; IVA e ICA el mes siguiente al cierre del bimestre', () => {
    expect(de('retencion')).toEqual(['2026-10-14', '2026-11-14', '2026-12-14']);
    expect(de('iva')).toEqual(['2026-11-14']);
    expect(de('ica')).toEqual(['2026-11-20']);
  });

  it('la prima en sus fechas del año; cesantías e intereses solo en el suyo', () => {
    expect(de('prima')).toEqual(['2026-12-20']);
    expect(de('cesantias')).toEqual([]);
    const enero = obligacionesIlustrativas('2027-01-01', '2027-02-28', PARAMETROS_OBLIGACIONES, festivos);
    expect(enero.filter((x) => x.clave === 'intereses').map((x) => x.fecha)).toEqual(['2027-01-31']);
    expect(enero.filter((x) => x.clave === 'cesantias').map((x) => x.fecha)).toEqual(['2027-02-14']);
    expect(enero.filter((x) => x.clave === 'iva').map((x) => x.fecha)).toEqual(['2027-01-14']);
  });

  it('solo entrega lo que cae dentro del rango y ordenado por fecha', () => {
    const corto = obligacionesIlustrativas('2026-10-14', '2026-10-15', PARAMETROS_OBLIGACIONES, festivos);
    expect(corto.map((x) => x.fecha)).toEqual(['2026-10-14', '2026-10-15']);
    expect(corto.map((x) => x.clave)).toEqual(['retencion', 'pila']);
  });
});

describe('borrador de un evento', () => {
  const base = borradorNuevo('2026-10-08', 'usq');

  it('un borrador nuevo arranca en la fecha y el local de la pantalla', () => {
    expect(base.fecha).toBe('2026-10-08');
    expect(base.localId).toBe('usq');
    expect(borradorNuevo('2026-10-08', 'todos').localId).toBe('ninguno');
  });

  it('pide título, tipo y fecha; las horas bien escritas y el fin después del inicio', () => {
    expect(Object.keys(validarBorradorEvento(base)).sort()).toEqual(['clase', 'titulo']);
    const ok = { ...base, titulo: 'Toma de medidas', clase: 'toma_medidas' as const };
    expect(validarBorradorEvento(ok)).toEqual({});
    expect(validarBorradorEvento({ ...ok, horaInicio: '9:5' }).horaInicio).toBeDefined();
    expect(validarBorradorEvento({ ...ok, horaInicio: '10:00', horaFin: '09:30' }).horaFin).toBe('La hora de fin debe ser después de la de inicio.');
    expect(validarBorradorEvento({ ...ok, fechaFin: '2026-10-07' }).fechaFin).toBe('El evento no puede terminar antes de empezar.');
    expect(validarBorradorEvento({ ...ok, todoElDia: true, horaInicio: 'xx' })).toEqual({});
  });

  it('arma los datos del comando: tipo y subtipo, horas, todo el día y solo las citas llevan cliente', () => {
    const cita = datosDeBorrador({ ...base, titulo: ' Toma de medidas ', clase: 'toma_medidas', clienteId: 'cl_1', recordatorio: '60' });
    expect(cita).toMatchObject({ tipo: 'cita', subtipo: 'toma_medidas', titulo: 'Toma de medidas', inicio: '2026-10-08T10:00:00', fin: '2026-10-08T11:00:00', todoElDia: false, localId: 'usq', clienteId: 'cl_1', recordatorioMin: 60 });
    const campana = datosDeBorrador({ ...base, titulo: 'Black Friday', clase: 'campana', todoElDia: true, fecha: '2026-11-27', fechaFin: '2026-11-29', clienteId: 'cl_1', localId: 'ninguno' });
    expect(campana).toMatchObject({ tipo: 'campana', subtipo: 'campana_temporada', inicio: '2026-11-27T00:00:00', fin: '2026-11-29T23:59:00', todoElDia: true, localId: null, clienteId: null, recordatorioMin: null });
    const unDia = datosDeBorrador({ ...base, titulo: 'IVA', clase: 'obligacion_tributaria', todoElDia: true });
    expect(unDia.fin).toBeNull();
    expect(unDia.tipo).toBe('vencimiento');
  });

  it('editar y volver a guardar no cambia nada', () => {
    const evento = {
      id: 'ev_x',
      tipo: 'cita' as const,
      subtipo: 'asesoria' as const,
      titulo: 'Asesoría de vestuario',
      inicio: '2026-10-09T17:30:00',
      fin: '2026-10-09T18:15:00',
      todoElDia: false,
      localId: 'usq',
      clienteId: 'cl_1',
      empleadoId: 'em_1',
      descripcion: 'Trae la invitación',
      recordatorioMin: 1440,
      creadoEn: '2026-09-01T10:00:00',
      creadoPor: 'u',
      origen: 'usuario',
    };
    const { id: _id, creadoEn: _a, creadoPor: _b, origen: _o, ...datos } = evento;
    expect(datosDeBorrador(borradorDeEvento(evento as never))).toEqual(datos);
    const campana = { ...evento, tipo: 'campana' as const, subtipo: 'campana_temporada' as const, todoElDia: true, inicio: '2026-12-01T00:00:00', fin: '2026-12-15T23:59:00', clienteId: null, empleadoId: null, localId: null, descripcion: null, recordatorioMin: null };
    const { id: _i2, creadoEn: _a2, creadoPor: _b2, origen: _o2, ...datosCampana } = campana;
    expect(datosDeBorrador(borradorDeEvento(campana as never))).toEqual(datosCampana);
  });
});
