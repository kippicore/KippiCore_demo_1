import { describe, expect, it } from 'vitest';
import type { DesgloseLaboral } from '@/dominio/tipos';
import { PARAMETROS_NOMINA } from '@/config/nomina';
import { insumosPactado, liquidarLaboral, liquidarPrestacion } from '@/dominio/reglas/nomina';
import {
  ahorroExoneracion,
  antiguedad,
  composicionLaboral,
  composicionPrestacion,
  costoOculto,
  enmascararCuenta,
  frasesEsquema,
  mesEfectivo,
  mesesRecientes,
  repartirProporcional,
  segmentosCosto,
  slugDe,
  ultimoDiaDelMes,
  validarContrato,
  validarEmpleado,
  validarEsquema,
  validarPagoNomina,
  validarRetiro,
  vecesDelContrato,
  type BorradorContrato,
  type BorradorEmpleado,
} from './calculos';

const P = PARAMETROS_NOMINA;
const FECHA = '2026-09-30';

function laboral(salario: number, exoneracion: boolean, comisiones = 0) {
  return liquidarLaboral({
    contrato: { salarioBase: salario, riesgoArl: 1 },
    insumos: insumosPactado(30),
    parametros: P,
    exoneracion,
    comisiones,
    bonos: 0,
    fecha: FECHA,
  });
}

describe('segmentosCosto (barra apilada de W6)', () => {
  it('las partes suman 1 y respetan el orden salario, comisiones, recargos, auxilio, aportes, prestaciones', () => {
    const r = laboral(1_950_000, true);
    const d = r.desglose;
    const s = segmentosCosto({ salario: d.devengados.salario, comisiones: 0, recargos: 0, auxilio: d.devengados.auxilioTransporte, aportes: d.totalAportes, prestaciones: d.totalProvisiones });
    expect(s.map((x) => x.id)).toEqual(['salario', 'comisiones', 'recargos', 'auxilio', 'aportes', 'prestaciones']);
    expect(s.reduce((a, x) => a + x.fraccion, 0)).toBeCloseTo(1, 10);
    expect(s.reduce((a, x) => a + x.valor, 0)).toBe(r.costoEmpleador);
  });

  it('el caso de W6 en modo "Salario pactado": $ 2.990.941 con exoneración y $ 3.254.191 sin ella', () => {
    expect(laboral(1_950_000, true).costoEmpleador).toBe(2_990_941);
    expect(laboral(1_950_000, false).costoEmpleador).toBe(3_254_191);
  });

  it('apagar la exoneración agranda los aportes y encoge la parte de los demás segmentos', () => {
    const arma = (exo: boolean) => {
      const d = laboral(1_950_000, exo).desglose;
      return segmentosCosto({ salario: d.devengados.salario, comisiones: 0, recargos: 0, auxilio: d.devengados.auxilioTransporte, aportes: d.totalAportes, prestaciones: d.totalProvisiones });
    };
    const con = arma(true);
    const sin = arma(false);
    expect((sin.find((x) => x.id === 'aportes') as { valor: number }).valor).toBeGreaterThan((con.find((x) => x.id === 'aportes') as { valor: number }).valor);
    expect((sin.find((x) => x.id === 'salario') as { fraccion: number }).fraccion).toBeLessThan((con.find((x) => x.id === 'salario') as { fraccion: number }).fraccion);
  });

  it('con valores negativos o ceros no produce fracciones inválidas', () => {
    const s = segmentosCosto({ salario: 0, comisiones: 0, recargos: 0, auxilio: 0, aportes: 0, prestaciones: 0 });
    expect(s.every((x) => x.fraccion === 0 && x.valor === 0)).toBe(true);
  });

  it('en prestación de servicios el primer segmento se llama "Honorarios"', () => {
    const s = segmentosCosto({ salario: 2_400_000, comisiones: 0, recargos: 0, auxilio: 0, aportes: 0, prestaciones: 0 }, 'prestacion_servicios');
    expect(s[0]?.etiqueta).toBe('Honorarios');
    expect(s[0]?.fraccion).toBe(1);
  });

  it('costo oculto = aportes + prestaciones; veces del contrato = costo / valor', () => {
    const b = { salario: 1_950_000, comisiones: 0, recargos: 0, auxilio: 249_095, aportes: 322_179, prestaciones: 469_667 };
    expect(costoOculto(b)).toBe(791_846);
    expect(vecesDelContrato(2_990_941, 1_950_000)).toBeCloseTo(1.534, 3);
    expect(vecesDelContrato(100, 0)).toBeNull();
  });
});

describe('composicionLaboral', () => {
  const d = laboral(1_950_000, true).desglose;
  const grupos = composicionLaboral(d, P);
  const grupo = (id: string) => grupos.find((g) => g.id === id);

  it('los cuatro grupos traen su total del dominio y sus filas suman el total', () => {
    expect(grupos.map((g) => g.id)).toEqual(['devengados', 'deducciones', 'aportes', 'provisiones']);
    expect(grupo('devengados')?.total).toBe(d.totalDevengado);
    expect(grupo('deducciones')?.total).toBe(d.totalDeducciones);
    expect(grupo('aportes')?.total).toBe(d.totalAportes);
    expect(grupo('provisiones')?.total).toBe(d.totalProvisiones);
    for (const g of grupos) expect(g.filas.reduce((a, f) => a + f.valor, 0)).toBe(g.total);
  });

  it('con exoneración, salud del empleador, ICBF y SENA salen en cero y marcados como exonerados', () => {
    const aportes = grupo('aportes')?.filas ?? [];
    for (const id of ['salud-e', 'icbf', 'sena']) {
      const f = aportes.find((x) => x.id === id);
      expect(f?.valor).toBe(0);
      expect(f?.exonerado).toBe(true);
    }
    expect(aportes.find((x) => x.id === 'pension-e')?.exonerado).toBeFalsy();
  });

  it('sin exoneración vuelven salud 8,5 %, ICBF 3 % y SENA 2 % con sus porcentajes de los parámetros', () => {
    const sin = composicionLaboral(laboral(1_950_000, false).desglose, P);
    const aportes = sin.find((g) => g.id === 'aportes')?.filas ?? [];
    expect(aportes.find((x) => x.id === 'salud-e')?.nota).toBe('8,5 %');
    expect(aportes.find((x) => x.id === 'icbf')?.nota).toBe('3 %');
    expect(aportes.find((x) => x.id === 'sena')?.nota).toBe('2 %');
    expect(aportes.find((x) => x.id === 'salud-e')?.valor).toBeGreaterThan(0);
    expect(aportes.every((x) => !x.exonerado)).toBe(true);
  });

  it('el porcentaje de la ARL sale de lo cobrado, con tres decimales (0,522 %)', () => {
    const arl = grupo('aportes')?.filas.find((x) => x.id === 'arl');
    expect(arl?.nota).toBe('0,522 %');
  });

  it('las comisiones y los recargos aparecen solo cuando existen', () => {
    expect(grupo('devengados')?.filas.some((f) => f.id === 'comisiones')).toBe(false);
    const con = composicionLaboral(laboral(1_950_000, true, 800_000).desglose, P);
    expect(con.find((g) => g.id === 'devengados')?.filas.find((f) => f.id === 'comisiones')?.valor).toBe(800_000);
  });

  it('el auxilio de transporte se muestra con una explicación cuando no aplica', () => {
    const alto = composicionLaboral(laboral(6_000_000, true).desglose as DesgloseLaboral, P);
    const aux = alto.find((g) => g.id === 'devengados')?.filas.find((f) => f.id === 'auxilio');
    expect(aux?.valor).toBe(0);
    expect(aux?.nota).toBe('No aplica con este devengado');
  });
});

describe('composicionPrestacion', () => {
  it('honorarios, bruto y retención; el neto sale del dominio', () => {
    const r = liquidarPrestacion({ contrato: { honorarios: 1_900_000, retencionFuente: null }, insumos: insumosPactado(30), parametros: P, comisiones: 0, pilaVerificada: true });
    const filas = composicionPrestacion(r.desglose);
    expect(filas.map((f) => f.id)).toEqual(['honorarios', 'bruto', 'retencion']);
    expect(filas.find((f) => f.id === 'retencion')?.valor).toBe(190_000);
    expect(filas.find((f) => f.id === 'retencion')?.nota).toBe('10 %');
    expect(r.neto).toBe(1_710_000);
    expect(r.costoEmpleador).toBe(1_900_000);
  });
});

describe('ahorroExoneracion', () => {
  it('es la diferencia entre sin y con exoneración, nunca negativa', () => {
    expect(ahorroExoneracion(laboral(1_950_000, true).costoEmpleador, laboral(1_950_000, false).costoEmpleador)).toBe(263_250);
    expect(ahorroExoneracion(100, 50)).toBe(0);
  });
});

describe('repartirProporcional', () => {
  it('la suma de las partes es exactamente el total', () => {
    const partes = repartirProporcional([1_234_567, 98_765, 4_321_000, 222_222, 3], 817_639);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(817_639);
    expect(partes.every((x) => Number.isInteger(x))).toBe(true);
  });

  it('con devoluciones (bases negativas) también cuadra', () => {
    const partes = repartirProporcional([500_000, -120_000, 300_000, -40_000], 25_000);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(25_000);
  });

  it('sin base no reparte nada', () => {
    expect(repartirProporcional([0, 0], 100)).toEqual([0, 0]);
    expect(repartirProporcional([], 100)).toEqual([]);
  });

  it('un solo elemento recibe todo', () => {
    expect(repartirProporcional([42], 999)).toEqual([999]);
  });
});

describe('frasesEsquema', () => {
  it('porcentaje: "3 % de tus ventas sin IVA"', () => {
    const f = frasesEsquema({ base: 'base_sin_iva', componentes: [{ tipo: 'porcentaje', porcentaje: 0.03 }] });
    expect(f).toHaveLength(1);
    expect(JSON.stringify(f[0])).toContain('3 %');
    expect(JSON.stringify(f[0])).toContain('sin IVA');
  });

  it('escalonado total + bono: una frase por componente, con los tramos en orden', () => {
    const f = frasesEsquema({
      base: 'base_sin_iva',
      componentes: [
        { tipo: 'escalonado', modo: 'total', tramos: [{ desde: 45_000_000, porcentaje: 0.035 }, { desde: 0, porcentaje: 0.025 }] },
        { tipo: 'bono_meta_local', valor: 300_000, cumplimientoMinimo: 1 },
      ],
    });
    expect(f).toHaveLength(2);
    const t = JSON.stringify(f[0]);
    expect(t.indexOf('2,5')).toBeLessThan(t.indexOf('3,5'));
    expect(JSON.stringify(f[1])).toContain('300000');
  });
});

describe('validarEsquema', () => {
  it('usa la regla del dominio: nombre, al menos un componente, porcentajes y tramos', () => {
    expect(validarEsquema({ nombre: '', componentes: [] })).toEqual({ nombre: 'Escribe el nombre del esquema.', componentes: 'El esquema necesita al menos un componente.' });
    expect(validarEsquema({ nombre: 'X', componentes: [{ tipo: 'porcentaje', porcentaje: 0.5 }] }).componentes).toBe('El porcentaje debe estar entre 0 % y 20 %.');
    expect(
      validarEsquema({ nombre: 'X', componentes: [{ tipo: 'escalonado', modo: 'total', tramos: [{ desde: 100, porcentaje: 0.02 }, { desde: 50, porcentaje: 0.03 }] }] }).componentes,
    ).toBe('Los tramos deben ir de menor a mayor.');
    expect(validarEsquema({ nombre: 'Bueno', componentes: [{ tipo: 'porcentaje', porcentaje: 0.03 }] })).toEqual({});
  });
});

describe('meses', () => {
  it('mesesRecientes va del mes de hoy hacia atrás', () => {
    const m = mesesRecientes('2026-09-30', 4);
    expect(m).toEqual(['2026-09', '2026-08', '2026-07', '2026-06']);
  });

  it('mesEfectivo ignora meses inválidos y futuros', () => {
    expect(mesEfectivo('2026-08', '2026-09-30')).toBe('2026-08');
    expect(mesEfectivo('2026-10', '2026-09-30')).toBe('2026-09');
    expect(mesEfectivo('septiembre', '2026-09-30')).toBe('2026-09');
    expect(mesEfectivo(null, '2026-09-30')).toBe('2026-09');
  });

  it('ultimoDiaDelMes respeta febrero y los meses de 31', () => {
    expect(ultimoDiaDelMes('2026-02')).toBe('2026-02-28');
    expect(ultimoDiaDelMes('2028-02')).toBe('2028-02-29');
    expect(ultimoDiaDelMes('2026-09')).toBe('2026-09-30');
    expect(ultimoDiaDelMes('2026-12')).toBe('2026-12-31');
  });
});

describe('antiguedad', () => {
  it('años y meses, meses o días', () => {
    expect(antiguedad('2024-06-15', '2026-09-30')).toBe('2 años y 3 meses');
    expect(antiguedad('2025-09-30', '2026-09-30')).toBe('1 año');
    expect(antiguedad('2026-04-01', '2026-09-30')).toBe('5 meses');
    expect(antiguedad('2026-09-18', '2026-09-30')).toBe('12 días');
    expect(antiguedad('2026-10-18', '2026-09-30')).toBe('Aún no ingresa');
  });
});

describe('validarEmpleado', () => {
  const bueno: BorradorEmpleado = {
    nombres: 'Mariana',
    apellidos: 'Peña Ortiz',
    tipoDocumento: 'CC',
    numeroDocumento: '1020304050',
    fechaNacimiento: '1998-05-20',
    cargo: 'vendedor',
    localId: 'usq',
    fechaIngreso: '2026-10-01',
    celular: '3101234567',
    correo: 'mariana@ejemplo.co',
    contactoNombre: 'Rosa Ortiz',
    contactoParentesco: 'Madre',
    contactoCelular: '3159876543',
    eps: 'EPS Ceiba',
    pension: 'Pensiones Altiplano',
    cesantias: 'Cesantías Altiplano',
    arl: 'ARL Resguardo',
    caja: 'Caja Sabana de Compensación',
    cuentaEntidad: 'Banco Meridiano',
    cuentaTipo: 'ahorros',
    cuentaNumero: '1234567890',
  };

  it('un borrador completo no tiene errores', () => {
    expect(validarEmpleado(bueno, FECHA)).toEqual({});
  });

  it('marca cada campo faltante con su mensaje, en español', () => {
    const e = validarEmpleado({ ...bueno, nombres: '', celular: '2001234567', correo: 'sin-arroba', cargo: null, numeroDocumento: ' ', cuentaNumero: '' }, FECHA);
    expect(e.nombres).toBe('Escribe los nombres.');
    expect(e.celular).toBe('Escribe un celular de 10 dígitos que empiece por 3.');
    expect(e.correo).toBe('Escribe un correo válido.');
    expect(e.cargo).toBe('Elige el cargo.');
    expect(e.numeroDocumento).toBe('Escribe el número de documento.');
    expect(e.cuentaNumero).toBe('Escribe los últimos dígitos de la cuenta.');
  });

  it('la fecha de nacimiento no puede ser hoy ni futura', () => {
    expect(validarEmpleado({ ...bueno, fechaNacimiento: FECHA }, FECHA).fechaNacimiento).toBeDefined();
    expect(validarEmpleado({ ...bueno, fechaNacimiento: null }, FECHA).fechaNacimiento).toBeUndefined();
  });
});

describe('slugDe y enmascararCuenta', () => {
  it('genera el slug sin tildes y evita repetidos y reservados', () => {
    expect(slugDe('Sebastián', 'Cárdenas Ruiz', new Set())).toBe('sebastian-cardenas');
    const otro = slugDe('Sebastián', 'Cárdenas Ruiz', new Set(['sebastian-cardenas']));
    expect(otro).not.toBe('sebastian-cardenas');
    expect(otro).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slugDe('Nuevo', '', new Set())).not.toBe('nuevo');
  });

  it('con todos los candidatos ocupados agrega un sufijo numérico', () => {
    const ocupados = new Set(['ana-gomez', 'ana-gomez-ana-gomez', 'ana-gomez-lopez']);
    expect(slugDe('Ana', 'Gómez', ocupados)).toMatch(/^ana-gomez(-\d+)?$/);
    expect(ocupados.has(slugDe('Ana', 'Gómez', ocupados))).toBe(false);
  });

  it('la cuenta se guarda enmascarada con los últimos cuatro dígitos', () => {
    expect(enmascararCuenta('1234567890')).toBe('•••• 7890');
    expect(enmascararCuenta('301 555 0042')).toBe('•••• 0042');
    expect(enmascararCuenta('')).toBe('');
  });
});

describe('validarContrato', () => {
  const buenoLaboral: BorradorContrato = {
    tipo: 'laboral',
    modalidadLaboral: 'indefinido',
    inicio: '2026-10-01',
    fin: null,
    salarioBase: 1_950_000,
    honorarios: null,
    jornadaSemanalHoras: 42,
    riesgoArl: 1,
    esquemaComisionId: null,
    periodicidadPago: 'quincenal',
    retencionFuente: null,
  };

  it('un contrato laboral correcto no tiene errores', () => {
    expect(validarContrato(buenoLaboral, P, '2026-10-01', FECHA)).toEqual({});
  });

  it('el salario no puede ser menor que el mínimo y la jornada no pasa del máximo vigente', () => {
    const e = validarContrato({ ...buenoLaboral, salarioBase: 1_000_000, jornadaSemanalHoras: 48 }, P, null, FECHA);
    expect(e.salarioBase).toBe('El salario no puede ser menor que el salario mínimo.');
    expect(e.jornadaSemanalHoras).toBe('La jornada no puede pasar de 42 horas semanales.');
  });

  it('antes del cambio de jornada el máximo es el anterior', () => {
    expect(validarContrato({ ...buenoLaboral, inicio: '2026-06-01', jornadaSemanalHoras: 44 }, P, null, FECHA).jornadaSemanalHoras).toBeUndefined();
  });

  it('prestación de servicios pide honorarios; la retención va de 0 a 100 %', () => {
    const base = { ...buenoLaboral, tipo: 'prestacion_servicios' as const, salarioBase: null, honorarios: null };
    expect(validarContrato(base, P, null, FECHA).honorarios).toBe('Escribe los honorarios mensuales.');
    expect(validarContrato({ ...base, honorarios: 2_000_000, retencionFuente: 1.5 }, P, null, FECHA).retencionFuente).toBe('La retención va entre 0 % y 100 %.');
    expect(validarContrato({ ...base, honorarios: 2_000_000 }, P, null, FECHA)).toEqual({});
  });

  it('el inicio no puede ser anterior al mínimo ni el fin al inicio', () => {
    expect(validarContrato({ ...buenoLaboral, inicio: '2026-09-01' }, P, '2026-09-15', FECHA).inicio).toBe('El contrato empieza en la fecha de ingreso o después.');
    expect(validarContrato({ ...buenoLaboral, fin: '2026-09-01' }, P, null, FECHA).fin).toBe('La fecha final no puede ser anterior al inicio.');
  });
});

describe('validarRetiro y validarPagoNomina', () => {
  it('el retiro pide fecha posterior al ingreso y motivo', () => {
    expect(validarRetiro({ fecha: null, motivo: '' }, '2025-01-10')).toEqual({ fecha: 'Elige la fecha del retiro.', motivo: 'Escribe el motivo del retiro.' });
    expect(validarRetiro({ fecha: '2024-12-31', motivo: 'Renuncia' }, '2025-01-10').fecha).toBe('El retiro no puede ser antes del ingreso.');
    expect(validarRetiro({ fecha: '2026-09-30', motivo: 'Renuncia' }, '2025-01-10')).toEqual({});
  });

  it('el pago pide fecha y cuenta', () => {
    expect(validarPagoNomina({ fecha: null, cuentaId: null })).toEqual({ fecha: 'Elige la fecha del pago.', cuentaId: 'Elige de qué cuenta sale la plata.' });
    expect(validarPagoNomina({ fecha: FECHA, cuentaId: 'cta1' })).toEqual({});
  });
});
