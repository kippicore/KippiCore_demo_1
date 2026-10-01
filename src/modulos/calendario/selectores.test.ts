import type { EstadoDominio } from '@/dominio/tipos';
import { activarVerificacionDeTablas, selEventosCalendario } from '@/selectores';
import { estadoDe, HOY } from '@/selectores/pruebas/construir';
import { selAgenda, selEventoGuardado, selUbicarEvento } from './selectores';

const e = estadoDe();

beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

const OCTUBRE = { desde: '2026-10-01', hasta: '2026-10-31', hoy: HOY } as const;

describe('selAgenda', () => {
  const agenda = selAgenda(e, OCTUBRE);

  it('trae todo lo del calendario compartido: guardados, turnos, llegadas y pagos pendientes', () => {
    const compartido = selEventosCalendario(e, { desde: OCTUBRE.desde, hasta: OCTUBRE.hasta });
    const ids = new Set(agenda.map((x) => x.id));
    for (const v of compartido) expect(ids.has(v.id), v.id).toBe(true);
    // Compartidos C-D: las obligaciones ilustrativas ya vienen del selector compartido; la agenda suma las pagadas.
    expect(compartido.some((v) => v.fuente.tipo === 'obligacion' && v.ilustrativo)).toBe(true);
    expect(agenda.length).toBeGreaterThanOrEqual(compartido.length);
  });

  it('cada origen dice de dónde viene y los derivados enlazan a su módulo', () => {
    const porOrigen = (o: string) => agenda.filter((x) => x.origen === o);
    expect(porOrigen('guardado').length).toBeGreaterThan(0);
    expect(porOrigen('turno').length).toBeGreaterThan(100);
    expect(porOrigen('importacion')).toHaveLength(3);
    for (const x of porOrigen('turno')) {
      expect(x.enlace).toContain('/panel/personal/turnos');
      expect(x.turno?.turnoId).toBeTruthy();
      expect(x.turno?.empleadoCorto.length).toBeGreaterThan(3);
    }
    for (const x of porOrigen('importacion')) {
      expect(x.enlace).toMatch(/^\/panel\/importaciones\/IMP-/);
      expect(x.titulo).toBe(`${x.importacionNumero} · Llega a bodega`);
      expect(x.estadoTexto).toBeTruthy();
      expect(x.contenido).toMatch(/uds\.$/);
      expect(x.movible).toBe(true);
    }
    for (const x of porOrigen('cuenta')) expect(x.enlace).toContain('/panel/pagos/');
    for (const x of porOrigen('guardado')) expect(x.fuente.tipo).toBe('evento');
  });

  it('las cuentas por pagar no cargan el monto en pesos dentro del título (se muestra con Dinero)', () => {
    const saldo = agenda.find((x) => x.origen === 'cuenta' && /Saldo 70 %/.test(x.titulo));
    expect(saldo).toBeDefined();
    expect(saldo?.titulo).not.toMatch(/\$|US\$/);
    // La importación en curso se paga en dólares: el monto de origen va aparte y el de pesos no existe.
    expect(saldo?.monto).toBeNull();
    expect(saldo?.montoOrigen).toMatch(/^US\$/);
    expect(saldo?.movible).toBe(true);
  });

  it('las obligaciones sin cuenta por pagar salen con fecha ilustrativa y no se mueven', () => {
    const ilustrativas = agenda.filter((x) => x.ilustrativo);
    expect(ilustrativas.length).toBeGreaterThan(0);
    for (const x of ilustrativas) {
      expect(x.origen).toBe('obligacion');
      expect(x.tipo).toBe('vencimiento');
      expect(x.movible).toBe(false);
      expect(x.estadoTexto).toBe('Ilustrativa');
      expect(x.enlace).toContain('/panel/pagos/flujo');
    }
    expect(ilustrativas.some((x) => /Retención en la fuente/.test(x.titulo) && x.inicio.startsWith('2026-10-14'))).toBe(true);
    expect(ilustrativas.some((x) => /Seguridad social/.test(x.titulo) && x.inicio.startsWith('2026-10-15'))).toBe(true);
  });

  it('lo ya pagado se ve como pagado y una obligación con cuenta no se duplica como ilustrativa', () => {
    const septiembre = selAgenda(e, { desde: '2026-09-01', hasta: '2026-09-30', hoy: HOY });
    const pagadas = septiembre.filter((x) => x.estadoTexto === 'Pagado');
    expect(pagadas.length).toBeGreaterThan(0);
    expect(pagadas.some((x) => /Arriendo/.test(x.titulo))).toBe(true);
    for (const x of pagadas) {
      expect(x.movible).toBe(false);
      expect(x.origen).toBe('cuenta');
    }
    // Septiembre ya tiene su IVA, ICA, retención y PILA como cuentas (pagadas): ninguna ilustrativa los repite.
    expect(septiembre.filter((x) => x.ilustrativo)).toEqual([]);
    expect(septiembre.some((x) => /IVA bimestral/.test(x.titulo))).toBe(true);
    // Las dos planillas de PILA se muestran como una sola línea.
    expect(septiembre.filter((x) => /Seguridad social/.test(x.titulo))).toHaveLength(1);
  });

  it('filtra por tipo y por local (lo de toda la empresa y las llegadas siempre se ven)', () => {
    const soloCitas = selAgenda(e, { ...OCTUBRE, tipos: ['cita'] });
    expect(soloCitas.length).toBeGreaterThan(0);
    expect(soloCitas.every((x) => x.tipo === 'cita')).toBe(true);
    const usq = selAgenda(e, { ...OCTUBRE, localId: 'usq' });
    expect(usq.filter((x) => x.tipo === 'turno').every((x) => x.localId === 'usq')).toBe(true);
    expect(usq.filter((x) => x.tipo === 'turno').length).toBeLessThan(agenda.filter((x) => x.tipo === 'turno').length);
    // Las llegadas son de toda la empresa (van a la bodega que abastece a los locales): el filtro de local no las quita.
    expect(usq.filter((x) => x.origen === 'importacion')).toHaveLength(3);
    expect(usq.some((x) => x.ilustrativo)).toBe(true);
  });

  it('la llegada de una importación cambia cuando cambia su fecha estimada', () => {
    const llegada = agenda.find((x) => x.origen === 'importacion');
    if (!llegada) throw new Error('sin llegadas en octubre');
    const imp = e.importaciones[llegada.fuente.id];
    if (!imp) throw new Error('sin importación');
    const nueva = '2026-10-28';
    const cambiado: EstadoDominio = {
      ...e,
      importaciones: {
        ...e.importaciones,
        [imp.id]: { ...imp, hitos: { ...imp.hitos, recibido_bodega: { ...imp.hitos.recibido_bodega, estimada: nueva } } },
      },
    };
    const despues = selAgenda(cambiado, OCTUBRE).find((x) => x.id === llegada.id);
    expect(despues?.inicio).toBe(`${nueva}T00:00:00`);
    expect(despues?.fechaOrigen).toBe(nueva);
    expect(llegada.fechaOrigen).toBe(imp.hitos.recibido_bodega.estimada);
    // Una llegada que se movió fuera del rango sale del calendario de ese mes.
    const aNoviembre: EstadoDominio = {
      ...e,
      importaciones: { ...e.importaciones, [imp.id]: { ...imp, hitos: { ...imp.hitos, recibido_bodega: { ...imp.hitos.recibido_bodega, estimada: '2026-11-10' } } } },
    };
    expect(selAgenda(aNoviembre, OCTUBRE).some((x) => x.id === llegada.id)).toBe(false);
    expect(selAgenda(aNoviembre, { desde: '2026-11-01', hasta: '2026-11-30', hoy: HOY }).some((x) => x.id === llegada.id)).toBe(true);
  });
});

describe('selEventoGuardado y selUbicarEvento', () => {
  const guardado = Object.values(e.eventos)[0];

  it('entrega un evento guardado completo y nada de lo eliminado o inexistente', () => {
    if (!guardado) throw new Error('sin eventos guardados');
    expect(selEventoGuardado(e, { eventoId: guardado.id })?.titulo).toBe(guardado.titulo);
    expect(selEventoGuardado(e, { eventoId: 'no_existe' })).toBeNull();
    const eliminado: EstadoDominio = { ...e, eventos: { ...e.eventos, [guardado.id]: { ...guardado, eliminadoEn: '2026-09-30T10:00:00' } } };
    expect(selEventoGuardado(eliminado, { eventoId: guardado.id })).toBeNull();
  });

  it('ubica un evento por su id, por el id de la agenda o por el número de la importación', () => {
    if (!guardado) throw new Error('sin eventos guardados');
    const fecha = guardado.inicio.slice(0, 10);
    expect(selUbicarEvento(e, { clave: guardado.id })).toEqual({ id: `ev:${guardado.id}`, fecha });
    expect(selUbicarEvento(e, { clave: `ev:${guardado.id}` })).toEqual({ id: `ev:${guardado.id}`, fecha });
    const imp = Object.values(e.importaciones).find((i) => i.estado !== 'recibido_bodega' && i.estado !== 'cotizado');
    if (!imp) throw new Error('sin importación en curso');
    expect(selUbicarEvento(e, { clave: imp.numero })).toEqual({ id: `imp:${imp.id}`, fecha: imp.hitos.recibido_bodega.estimada });
    const turno = Object.values(e.turnos)[0];
    if (!turno) throw new Error('sin turnos');
    expect(selUbicarEvento(e, { clave: turno.id })).toEqual({ id: `turno:${turno.id}`, fecha: turno.fecha });
    expect(selUbicarEvento(e, { clave: 'nada' })).toBeNull();
    expect(selUbicarEvento(e, { clave: '' })).toBeNull();
  });
});
