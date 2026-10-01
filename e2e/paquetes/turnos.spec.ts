import type { Locator, Page } from '@playwright/test';
import { conHoy, expect, test } from '../fixtures';
import { conKc, esperarDatos } from '../kc';

/**
 * C2 · Turnos, asistencia y novedades (PLAN 9.4). Verifica solo las pantallas de `/panel/personal/{turnos,asistencia,
 * novedades}`, `/panel/mi-dia` y `/panel/mi-turno`; los efectos en otros módulos se leen por `window.__kc`.
 * Sin errores de consola en ningún recorrido.
 */
const HOY = '2026-09-30';
const LUNES = '2026-09-28';
const miles = (n: number) => new Intl.NumberFormat('es-CO').format(Math.round(n));
const horas = (h: number) =>
  `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(Math.round(h * 10) / 10)} h`;

let errores: string[] = [];
test.beforeEach(({ page }) => {
  errores = [];
  page.on('pageerror', (e) => errores.push(`${page.url()}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`${page.url()}: ${m.text()}`);
  });
});
test.afterEach(() => {
  expect(errores, 'errores de consola').toEqual([]);
});

async function abrir(page: Page, irA: (ruta: string) => Promise<void>, ruta: string) {
  await irA(ruta);
  await esperarDatos(page);
  await expect(page.getByTestId('pagina')).toBeVisible();
}

async function elegir(page: Page, etiqueta: string, opcion: string | RegExp) {
  await page.getByLabel(etiqueta, { exact: true }).click();
  await page.getByRole('option', { name: opcion }).click();
}

/** Arrastra con el mouse como un usuario: mueve unos píxeles (activa el sensor) y recorre hasta el destino. */
async function arrastrar(page: Page, origen: Locator, destino: Locator, soltar = true) {
  await destino.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(150);
  const o = (await origen.boundingBox())!;
  const d = (await destino.boundingBox())!;
  await page.mouse.move(o.x + 14, o.y + o.height / 2);
  await page.mouse.down();
  await page.mouse.move(o.x + 34, o.y + o.height / 2 + 10, { steps: 4 });
  await page.mouse.move(d.x + d.width / 2, d.y + d.height / 2, { steps: 16 });
  await page.waitForTimeout(150);
  if (soltar) await page.mouse.up();
}

const nTurnos = (page: Page) =>
  page.evaluate(
    () =>
      Object.keys(
        (globalThis as unknown as { __kc: { estado: () => { turnos: object } } }).__kc.estado().turnos,
      ).length,
  );

interface SemanaK {
  empleados: {
    empleadoId: string;
    nombre: string;
    horas: number;
    maximo: number;
    porDia: Record<string, { id: string; tipo: string; fecha: string }[]>;
  }[];
}

/** Una persona de la semana con lo que se necesita para un arrastre (horas, máximo y días libres). */
async function semanaDe(page: Page, localId: string, lunes = LUNES) {
  return page.evaluate(
    (p) =>
      (globalThis as unknown as { __kc: { sel: (n: string, a: unknown) => unknown } }).__kc.sel(
        'selTurnosSemana',
        p,
      ) as unknown as SemanaK,
    { localId, lunes },
  );
}

test.describe('turnos', () => {
  test('la URL manda (?semana=&local=) y las horas, el exceso y los recargos salen de los selectores', async ({
    page,
    irA,
  }) => {
    await abrir(page, irA, '/panel/personal/turnos?semana=2026-09-30&local=zr');
    // Cualquier día de la semana lleva a su lunes.
    await expect(page.getByTestId('turnos-semana-etiqueta')).toContainText(
      'Semana 40 · 28 sep – 4 oct de 2026',
    );
    await expect(
      page.getByTestId('turnos-selector-local').getByRole('radio', { name: 'Zona Rosa' }),
    ).toBeChecked();
    const r = await conKc(page, (kc) => ({
      semana: kc.sel('selTurnosSemana', { localId: 'zr', lunes: '2026-09-28' }) as unknown as SemanaK,
      recargos: kc.sel('selRecargosTurnos', { localId: 'zr', lunes: '2026-09-28' }) as { total: number },
      horasPorEmpleado: Object.fromEntries(
        (
          kc.sel('selTurnosSemana', { localId: 'zr', lunes: '2026-09-28' }) as unknown as SemanaK
        ).empleados.map((e) => [
          e.empleadoId,
          kc.sel('selHorasSemana', { empleadoId: e.empleadoId, lunes: '2026-09-28' }) as {
            horas: number;
            exceso: number;
          },
        ]),
      ),
    }));
    expect(r.semana.empleados.length).toBeGreaterThanOrEqual(3);
    for (const e of r.semana.empleados) {
      const h = r.horasPorEmpleado[e.empleadoId]!;
      await expect(page.getByTestId(`turnos-horas-${e.empleadoId}`)).toContainText(horas(h.horas));
      if (h.exceso > 0)
        await expect(page.getByTestId(`turnos-extra-${e.empleadoId}`)).toContainText(
          `+${horas(h.exceso)} extra`,
        );
    }
    const conExceso = Object.values(r.horasPorEmpleado).filter((h) => h.exceso > 1e-9).length;
    await expect(page.getByTestId('turnos-kpi-exceso')).toContainText(
      `${conExceso} ${conExceso === 1 ? 'persona' : 'personas'}`,
    );
    await expect(page.getByTestId('turnos-kpi-recargos')).toContainText(`$ ${miles(r.recargos.total)}`);
    await expect(page.getByTestId('turnos-recargos-tabla')).toContainText(`$ ${miles(r.recargos.total)}`);
    // La pista del módulo está sobre "Recargos estimados de la semana".
    await page.getByTestId('pista-turnos.recargos').click();
    await expect(page.getByRole('dialog', { name: 'Pista' })).toContainText('Cerrar después de las 7 p. m.');
    await expect(page).toHaveURL(/\/panel\/personal\/turnos/);
  });

  test('con otra moneda los recargos se muestran convertidos', async ({ page, irA }) => {
    await abrir(page, irA, `/panel/personal/turnos?semana=${LUNES}&local=p93`);
    await expect(page.getByTestId('turnos-kpi-recargos')).toContainText('$');
    await page.getByTestId('selector-moneda').getByTestId('moneda-USD').click();
    await expect(page.getByTestId('turnos-kpi-recargos')).toContainText('US$');
    await expect(page.getByTestId('turnos-recargos-tabla')).toContainText('US$');
    await expect(page.getByTestId('turnos-kpi-recargos')).not.toContainText('171.748');
  });

  test('cambiar de local y de semana actualiza la URL y la cuadrícula', async ({ page, irA }) => {
    await abrir(page, irA, '/panel/personal/turnos');
    // Sin local en la URL se usa el primero (Parque 93).
    await expect(
      page.getByTestId('turnos-selector-local').getByRole('radio', { name: 'Parque 93' }),
    ).toBeChecked();
    await page.getByTestId('turnos-selector-local').getByRole('radio', { name: 'Usaquén' }).click();
    await expect(page).toHaveURL(/local=usq/);
    await page.getByTestId('turnos-semana-siguiente').click();
    await expect(page).toHaveURL(/semana=2026-10-05/);
    await expect(page.getByTestId('turnos-semana-etiqueta')).toContainText('5 oct – 11 oct de 2026');
    const s = await semanaDe(page, 'usq', '2026-10-05');
    for (const e of s.empleados) await expect(page.getByTestId(`turnos-horas-${e.empleadoId}`)).toBeVisible();
    await page.getByRole('button', { name: 'Esta semana' }).click();
    await expect(page.getByTestId('turnos-semana-etiqueta')).toContainText('28 sep – 4 oct de 2026');
  });

  test('arrastrar un turno de la barra a un día libre lo programa', async ({ page, irA }) => {
    await abrir(page, irA, `/panel/personal/turnos?semana=${LUNES}&local=zr`);
    const s = await semanaDe(page, 'zr');
    const juliana = s.empleados.find((e) => e.empleadoId === 'em_jvargas')!;
    const libre = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'].find(
      (d) => !juliana.porDia[d]?.length,
    )!;
    const antes = await nTurnos(page);
    await arrastrar(
      page,
      page.getByTestId('turnos-plantilla-cierre'),
      page.getByTestId(`turnos-celda-em_jvargas-${libre}`),
    );
    await expect.poll(() => nTurnos(page)).toBe(antes + 1);
    const nuevo = await conKc(page, (kc) => {
      const t = Object.values(
        (kc.estado() as unknown as { turnos: unknown }).turnos as Record<
          string,
          {
            id: string;
            empleadoId: string;
            fecha: string;
            tipo: string;
            inicio: string;
            fin: string;
            localId: string;
            origen: string;
          }
        >,
      ).find((x) => x.empleadoId === 'em_jvargas' && x.fecha === '2026-09-28' && x.origen !== 'generado');
      return t ?? null;
    });
    expect(nuevo).toMatchObject({ tipo: 'cierre', inicio: '13:00', fin: '21:00', localId: 'zr' });
    // Cierre de Zona Rosa: de 1:00 p. m. a 9:00 p. m. (8 h brutas, 7 netas): Juliana (de jueves a domingo)
    // pasa de 29 h a 36 h.
    await expect(page.getByTestId(`turnos-horas-em_jvargas`)).toContainText('36 h');
    await expect(page.getByTestId(`turnos-turno-${nuevo!.id}`)).toContainText('Cierre');
    const eventos = await conKc(page, (kc) => kc.eventosDominio().map((e) => e.tipo));
    expect(eventos).toContain('TurnoCambiado');
  });

  test('al arrastrar, la jornada se recalcula en vivo y un exceso pide confirmación explícita', async ({
    page,
    irA,
  }) => {
    await abrir(page, irA, `/panel/personal/turnos?semana=${LUNES}&local=zr`);
    const s = await semanaDe(page, 'zr');
    // Natalia cierra casi toda la semana: 42 h exactas y el domingo libre.
    const natalia = s.empleados.find((e) => e.empleadoId === 'em_nrios')!;
    expect(natalia.horas).toBe(natalia.maximo);
    expect(natalia.porDia['2026-10-04'] ?? []).toHaveLength(0);
    const antes = await nTurnos(page);
    const celda = page.getByTestId('turnos-celda-em_nrios-2026-10-04');

    // En vivo, antes de soltar: la celda se marca y las horas de Natalia pasan de 42 a 49.
    await arrastrar(page, page.getByTestId('turnos-plantilla-apertura'), celda, false);
    await expect(celda).toHaveAttribute('data-resultado', 'exceso');
    await expect(page.getByTestId('turnos-horas-em_nrios')).toContainText('49 h');
    await page.mouse.up();

    // Cancelar no cambia nada.
    const dialogo = page.getByTestId('turnos-confirmar-exceso');
    await expect(dialogo).toBeVisible();
    await expect(page.getByTestId('turnos-exceso-frase')).toContainText(
      'quedaría con 49 h esta semana (máximo 42 h): 7 h serían horas extra',
    );
    await dialogo.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialogo).toHaveCount(0);
    expect(await nTurnos(page)).toBe(antes);
    await expect(page.getByTestId('turnos-horas-em_nrios')).toContainText('42 h');

    // Confirmar programa el turno marcado como horas extra.
    await arrastrar(page, page.getByTestId('turnos-plantilla-apertura'), celda);
    await page.getByTestId('turnos-confirmar-exceso-si').click();
    await expect.poll(() => nTurnos(page)).toBe(antes + 1);
    const nuevo = await conKc(page, (kc) =>
      Object.values(
        (kc.estado() as unknown as { turnos: unknown }).turnos as Record<
          string,
          { empleadoId: string; fecha: string; excedeJornadaAceptado: boolean }
        >,
      ).find((x) => x.empleadoId === 'em_nrios' && x.fecha === '2026-10-04'),
    );
    expect(nuevo?.excedeJornadaAceptado).toBe(true);
    await expect(page.getByTestId('turnos-extra-em_nrios')).toContainText('+7 h extra');
  });

  test('mover un turno a otro día lo cambia en el dominio y no se programa en días de novedad', async ({
    page,
    irA,
  }) => {
    await abrir(page, irA, `/panel/personal/turnos?semana=${LUNES}&local=zr`);
    const s = await semanaDe(page, 'zr');
    const natalia = s.empleados.find((e) => e.empleadoId === 'em_nrios')!;
    const jueves = natalia.porDia['2026-10-01']![0]!;
    await arrastrar(
      page,
      page.getByTestId(`turnos-turno-${jueves.id}`),
      page.getByTestId('turnos-celda-em_nrios-2026-10-04'),
    );
    await expect
      .poll(() =>
        page.evaluate(
          (id) =>
            (
              globalThis as unknown as {
                __kc: { estado: () => { turnos: Record<string, { fecha: string; empleadoId: string }> } };
              }
            ).__kc.estado().turnos[id]?.fecha,
          jueves.id,
        ),
      )
      .toBe('2026-10-04');
    await expect(page.getByTestId('turnos-celda-em_nrios-2026-10-04')).toContainText('Intermedio');
    await expect(page.getByTestId('turnos-celda-em_nrios-2026-10-01')).not.toContainText('Intermedio');
    // El mismo turno, el mismo horario: Natalia sigue en 42 h.
    await expect(page.getByTestId('turnos-horas-em_nrios')).toContainText('42 h');
    const eventos = await conKc(page, (kc) => kc.eventosDominio().map((e) => e.tipo));
    expect(eventos).toContain('TurnoCambiado');
  });
});

test.describe('turnos: formulario, copiar semana y parámetros', () => {
  test('programar con el formulario valida, avisa del exceso, edita y elimina con confirmación', async ({
    page,
    irA,
  }) => {
    await abrir(page, irA, `/panel/personal/turnos?semana=${LUNES}&local=zr`);
    const antes = await nTurnos(page);
    await page.getByTestId('turnos-programar').click();
    const form = page.getByTestId('turnos-dialogo');
    await expect(form).toBeVisible();
    await page.getByTestId('turnos-guardar').click();
    await expect(form).toContainText('Elige a quién le asignas el turno.');
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Desde la celda libre de Natalia el domingo: ya llega con persona y día, y avisa del exceso en vivo.
    await page.getByTestId('turnos-celda-em_nrios-2026-10-04').hover();
    await page.getByTestId('turnos-agregar-em_nrios-2026-10-04').click();
    await expect(form).toBeVisible();
    await expect(page.getByTestId('turnos-aviso-exceso')).toContainText(
      'quedaría con 49 h esta semana (máximo 42 h)',
    );
    await page.getByTestId('turnos-guardar').click();
    await expect(page.getByTestId('turnos-error-general')).toContainText('Confirma que son horas extra');
    await page.getByRole('checkbox', { name: /Confirmo que son horas extra/ }).click();
    await page.getByTestId('turnos-guardar').click();
    await expect(form).toHaveCount(0);
    await expect.poll(() => nTurnos(page)).toBe(antes + 1);
    const id = await conKc(
      page,
      (kc) =>
        Object.values(
          (kc.estado() as unknown as { turnos: unknown }).turnos as Record<
            string,
            { id: string; empleadoId: string; fecha: string; excedeJornadaAceptado: boolean }
          >,
        ).find((x) => x.empleadoId === 'em_nrios' && x.fecha === '2026-10-04')?.id ?? '',
    );
    expect(id).not.toBe('');

    // Editar: cambia el tipo y las horas vuelven al horario habitual de ese tipo.
    await page.getByTestId(`turnos-turno-${id}`).click();
    await expect(form).toContainText('Editar turno');
    await page.getByTestId('turnos-fin').fill('19:00');
    await page.getByRole('checkbox', { name: /Confirmo que son horas extra/ }).click();
    await page.getByTestId('turnos-guardar').click();
    await expect(form).toHaveCount(0);
    await expect(page.getByTestId(`turnos-turno-${id}`)).toContainText('10:00–19:00');

    // Eliminar pide confirmación y dice qué cambia.
    await page.getByTestId(`turnos-turno-${id}`).click();
    await page.getByTestId('turnos-eliminar').click();
    const confirmar = page.getByRole('alertdialog');
    await expect(confirmar).toContainText('¿Eliminar el turno de Natalia Ríos Echeverry?');
    await expect(confirmar).toContainText(
      'Se quita el turno de apertura del domingo 4 de octubre de 2026 (10 a. m. – 7 p. m.). Sus horas de la semana bajan de 50 h a 42 h.',
    );
    await confirmar.getByRole('button', { name: 'Eliminar turno' }).click();
    await expect.poll(() => nTurnos(page)).toBe(antes);
    await expect(page.getByTestId(`turnos-turno-${id}`)).toHaveCount(0);
  });

  test('copiar la semana anterior trae sus turnos y una segunda vez avisa que ya se copió', async ({
    page,
    irA,
  }) => {
    await abrir(page, irA, '/panel/personal/turnos?semana=2026-10-26&local=usq');
    const origen = await semanaDe(page, 'usq', '2026-10-19');
    const esperados = origen.empleados.reduce((a, e) => a + Object.values(e.porDia).flat().length, 0);
    expect(esperados).toBeGreaterThan(0);
    const antes = await nTurnos(page);
    await page.getByTestId('turnos-copiar').click();
    await page.getByRole('menuitem', { name: 'Traer la semana anterior' }).click();
    await expect(page.getByText(`Se copiaron ${esperados} turnos`)).toBeVisible();
    expect(await nTurnos(page)).toBe(antes + esperados);
    const destino = await semanaDe(page, 'usq', '2026-10-26');
    expect(destino.empleados.map((e) => [e.empleadoId, e.horas])).toEqual(
      origen.empleados.map((e) => [e.empleadoId, e.horas]),
    );
    await expect(page.getByRole('menuitem', { name: 'Traer la semana anterior' })).toHaveCount(0);
    await page.getByTestId('turnos-copiar').click();
    await page.getByRole('menuitem', { name: 'Traer la semana anterior' }).click();
    await expect(page.getByText('Esa semana ya se copió.')).toBeVisible();
    expect(await nTurnos(page)).toBe(antes + esperados);
  });

  test('los parámetros del recargo se editan, están marcados "Verificar" y recalculan el total', async ({
    page,
    irA,
  }) => {
    await abrir(page, irA, `/panel/personal/turnos?semana=${LUNES}&local=p93`);
    const panel = page.getByTestId('turnos-parametros');
    await expect(panel).toContainText('Recargo nocturno');
    await expect(panel).toContainText('35 %');
    await expect(panel.getByText('Verificar').first()).toBeVisible();
    await expect(page.getByTestId('turnos-recargos')).toContainText('Cálculo ilustrativo para la demo');
    const antes = await conKc(
      page,
      (kc) =>
        (kc.sel('selRecargosTurnos', { localId: 'p93', lunes: '2026-09-28' }) as { total: number }).total,
    );
    await page.getByTestId('turnos-editar-parametros').click();
    await page.getByTestId('turnos-param-nocturno').fill('150');
    await page.getByTestId('turnos-guardar-parametros').click();
    await expect(page.getByTestId('turnos-dialogo-parametros')).toContainText(
      'Escribe un porcentaje entre 0 y 100.',
    );
    await page.getByTestId('turnos-param-nocturno').fill('50');
    await page.getByTestId('turnos-guardar-parametros').click();
    await expect(page.getByTestId('turnos-dialogo-parametros')).toHaveCount(0);
    const despues = await conKc(page, (kc) => ({
      nocturno:
        kc.estado() &&
        (kc.estado() as unknown as { parametros: { nomina: { recargos: { nocturno: number } } } }).parametros
          .nomina.recargos.nocturno,
      total: (kc.sel('selRecargosTurnos', { localId: 'p93', lunes: '2026-09-28' }) as { total: number })
        .total,
    }));
    expect(despues.nocturno).toBe(0.5);
    expect(despues.total).toBeGreaterThan(antes);
    await expect(page.getByTestId('turnos-kpi-recargos')).toContainText(`$ ${miles(despues.total)}`);
    await expect(panel).toContainText('50 %');
  });

  test('quien está de vacaciones no se programa ese día', async ({ page, irA }) => {
    await abrir(page, irA, '/panel/personal/turnos?semana=2026-08-03&local=p93');
    const novedad = page.getByTestId('turnos-novedad-nv_g_vacaciones_em_casuarez').first();
    await expect(novedad).toContainText('Vacaciones');
    const antes = await nTurnos(page);
    await arrastrar(
      page,
      page.getByTestId('turnos-plantilla-apertura'),
      page.getByTestId('turnos-celda-em_casuarez-2026-08-04'),
      false,
    );
    await expect(page.getByTestId('turnos-celda-em_casuarez-2026-08-04')).toHaveAttribute(
      'data-resultado',
      'novedad',
    );
    await page.mouse.up();
    await expect(page.getByText('está en vacaciones ese día')).toBeVisible();
    expect(await nTurnos(page)).toBe(antes);
  });
});

test.describe('asistencia', () => {
  test('?local=&empleado=&desde=&hasta= muestran la llegada tarde de hoy y los filtros salen de la URL', async ({
    page,
    irA,
  }) => {
    await abrir(
      page,
      irA,
      `/panel/personal/asistencia?local=zr&empleado=em_mherrera&desde=${HOY}&hasta=${HOY}`,
    );
    await expect(page.getByTestId('asistencia-vista')).toBeVisible();
    const fila = page.getByTestId('asistencia-tabla-dias').locator('tbody tr').first();
    await expect(fila).toContainText('Mateo Herrera');
    await expect(fila).toContainText('Zona Rosa');
    await expect(fila).toContainText('10:25 a. m.');
    await expect(fila).toContainText('Tarde');
    await expect(fila).toContainText('25 min');
    await expect(page.getByTestId('asistencia-kpi-tardes')).toContainText('1');
    // Chips con los filtros activos.
    await expect(page.getByText('Persona: Mateo Herrera Salazar')).toBeVisible();
    await expect(page.getByTestId('asistencia-filtro-local')).toContainText('Zona Rosa');
    const r = await conKc(
      page,
      (kc) =>
        kc.sel('selAsistencia', {
          desde: '2026-09-30',
          hasta: '2026-09-30',
          ahora: '2026-09-30T15:30:00',
          empleadoId: 'em_mherrera',
        }) as { dias: { estado: string; minutosTarde: number }[] },
    );
    expect(r.dias[0]).toMatchObject({ estado: 'tarde', minutosTarde: 25 });
  });

  test('el resumen del mes cuadra con selAsistencia y las horas extra pasan a la nómina', async ({
    page,
    irA,
  }) => {
    await abrir(page, irA, '/panel/personal/asistencia?desde=2026-09-01&hasta=2026-09-30');
    const r = await conKc(
      page,
      (kc) =>
        kc.sel('selAsistencia', {
          desde: '2026-09-01',
          hasta: '2026-09-30',
          ahora: '2026-09-30T15:30:00',
        }) as {
          dias: { estado: string }[];
          resumen: { horasTrabajadas: number; horasExtra: number; tardes: number; ausencias: number }[];
        },
    );
    const suma = (k: 'horasTrabajadas' | 'horasExtra' | 'tardes' | 'ausencias') =>
      r.resumen.reduce((a, x) => a + x[k], 0);
    await expect(page.getByTestId('asistencia-kpi-horas')).toContainText(horas(suma('horasTrabajadas')));
    await expect(page.getByTestId('asistencia-kpi-extra')).toContainText(horas(suma('horasExtra')));
    await expect(page.getByTestId('asistencia-kpi-tardes')).toContainText(String(suma('tardes')));
    await expect(page.getByTestId('asistencia-kpi-ausencias')).toHaveText(String(suma('ausencias')));
    await expect(page.getByTestId('asistencia-nomina')).toContainText('Lo que pasa a la nómina del periodo');
    // Una fila por persona; tocar una lleva a sus días.
    const filas = page.getByTestId('asistencia-tabla-personas').locator('tbody tr');
    await expect(filas).toHaveCount(r.resumen.length);
    await filas.filter({ hasText: 'Mateo Herrera' }).click();
    await expect(page).toHaveURL(/empleado=em_mherrera/);
    await expect(page.getByTestId('asistencia-tabla-dias')).toBeVisible();
  });

  test('corregir una marcación pide el motivo, recalcula la asistencia y queda anotada', async ({
    page,
    irA,
  }) => {
    await abrir(
      page,
      irA,
      `/panel/personal/asistencia?local=zr&empleado=em_mherrera&desde=${HOY}&hasta=${HOY}`,
    );
    const fila = page.getByTestId('asistencia-tabla-dias').locator('tbody tr').first();
    await fila.getByRole('button', { name: /Acciones de/ }).click();
    await page.getByRole('menuitem', { name: 'Corregir marcaciones' }).click();
    const dialogo = page.getByTestId('asistencia-dialogo-marcaciones');
    await expect(dialogo).toContainText('Mateo Herrera Salazar');
    await page.getByTestId('asistencia-marcacion-entrada').fill('10:05');
    await page.getByTestId('asistencia-guardar-marcaciones').click();
    await expect(dialogo).toContainText('Escribe por qué se corrige');
    await page.getByTestId('asistencia-motivo').fill('Marcó en el celular al llegar, el sistema se demoró');
    await page.getByTestId('asistencia-guardar-marcaciones').click();
    await expect(dialogo).toHaveCount(0);
    const m = await conKc(page, (kc) =>
      Object.values(
        (
          kc.estado() as unknown as {
            marcaciones: Record<
              string,
              { empleadoId: string; ts: string; medio: string; nota: string | null }
            >;
          }
        ).marcaciones,
      ).find((x) => x.empleadoId === 'em_mherrera' && x.ts.startsWith('2026-09-30')),
    );
    expect(m).toMatchObject({ ts: '2026-09-30T10:05:00', medio: 'corregida' });
    expect(m?.nota).toContain('Marcó en el celular');
    // 5 minutos tarde no pasan de la tolerancia: ya no es llegada tarde.
    await expect(fila).toContainText('10:05 a. m.');
    await expect(fila).not.toContainText('Tarde');
    await expect(page.getByTestId('asistencia-kpi-tardes')).toHaveText('0');
  });

  test('exportar la asistencia genera Excel y emite el evento', async ({ page, irA }) => {
    await abrir(page, irA, '/panel/personal/asistencia');
    await page.getByRole('button', { name: 'Exportar' }).click();
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('exportar-asistencia-excel').click(),
    ]);
    expect(descarga.suggestedFilename()).toMatch(/\.xlsx$/);
    const eventos = await conKc(page, (kc) =>
      kc.eventosUI().map((e) => `${e.tipo}:${String(e.datos.reporte ?? '')}`),
    );
    expect(eventos).toContain('excel_generado:asistencia');
  });

  test('sin turnos en el rango muestra el estado vacío con salida', async ({ page, irA }) => {
    await abrir(page, irA, '/panel/personal/asistencia?desde=2027-03-01&hasta=2027-03-07');
    await expect(page.getByTestId('asistencia-tabla-personas')).toContainText('Sin turnos en estas fechas');
    await expect(page.getByRole('link', { name: 'Ir a los turnos' })).toBeVisible();
  });
});

test.describe('novedades', () => {
  test('registrar valida, avisa de los turnos por cubrir, resalta la fila y alimenta la asistencia', async ({
    page,
    irA,
  }) => {
    await abrir(page, irA, '/panel/personal/novedades');
    const antes = await conKc(
      page,
      (kc) => Object.keys((kc.estado() as unknown as { novedades: object }).novedades).length,
    );
    await page.getByTestId('novedades-registrar').click();
    const form = page.getByTestId('novedades-dialogo');
    await page.getByTestId('novedades-guardar').click();
    await expect(form).toContainText('Elige a quién le pasa.');
    await expect(form).toContainText('Elige el tipo de novedad.');
    await elegir(page, 'Persona', 'Sebastián Cárdenas Ruiz');
    await elegir(page, 'Tipo de novedad', 'Licencia remunerada');
    // Hoy (por defecto): Sebastián tiene un turno de cierre que habrá que cubrir.
    await expect(page.getByTestId('novedades-resumen')).toContainText('1 día de calendario');
    await expect(page.getByTestId('novedades-resumen')).toContainText('1 turno programado');
    await page.getByTestId('novedades-guardar').click();
    await expect(form).toHaveCount(0);
    const nuevaId = await conKc(
      page,
      (kc) =>
        Object.values(
          (
            kc.estado() as unknown as {
              novedades: Record<string, { id: string; tipo: string; empleadoId: string }>;
            }
          ).novedades,
        ).find((n) => n.tipo === 'licencia_remunerada')?.id ?? '',
    );
    expect(nuevaId).not.toBe('');
    expect(
      await conKc(
        page,
        (kc) => Object.keys((kc.estado() as unknown as { novedades: object }).novedades).length,
      ),
    ).toBe(antes + 1);
    await expect(page).toHaveURL(new RegExp(`resaltar=${nuevaId}`));
    await expect(page.locator('[data-resaltada]')).toContainText('Sebastián');
    await expect(page.getByTestId('novedades-kpi-hoy')).toContainText('1 persona');
    await expect(page.getByTestId('novedades-kpi-cubrir')).toHaveText('1');
    // La asistencia de hoy de Sebastián pasa a "Novedad".
    const dia = await conKc(
      page,
      (kc) =>
        (
          kc.sel('selAsistencia', {
            desde: '2026-09-30',
            hasta: '2026-09-30',
            ahora: '2026-09-30T15:30:00',
            empleadoId: 'em_scardenas',
          }) as { dias: { estado: string }[] }
        ).dias[0],
    );
    expect(dia?.estado).toBe('novedad');
    // Repetir las mismas fechas y tipo lo rechaza el dominio, junto al campo.
    await page.getByTestId('novedades-registrar').click();
    await elegir(page, 'Persona', 'Sebastián Cárdenas Ruiz');
    await elegir(page, 'Tipo de novedad', 'Licencia remunerada');
    await page.getByTestId('novedades-guardar').click();
    await expect(page.getByTestId('novedades-dialogo')).toContainText(
      'Ya hay una novedad del mismo tipo en esas fechas.',
    );
  });

  test('?empleado= filtra, editar cambia la nota y eliminar pide confirmación', async ({ page, irA }) => {
    await abrir(page, irA, '/panel/personal/novedades?empleado=em_nrios');
    const filas = page.getByTestId('novedades-tabla').locator('tbody tr');
    await expect(filas).toHaveCount(1);
    await expect(filas.first()).toContainText('Natalia');
    await expect(filas.first()).toContainText('Incapacidad');
    await expect(filas.first()).toContainText('3');
    await expect(filas.first()).toContainText('Los 2 primeros días los paga el negocio');
    await expect(page.getByText('Persona: Natalia Ríos Echeverry')).toBeVisible();
    // Editar.
    await filas
      .first()
      .getByRole('button', { name: /Acciones de/ })
      .click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    await page.getByLabel('Nota').fill('Reposo por gripa, con incapacidad de la EPS');
    await page.getByTestId('novedades-guardar').click();
    const n = await conKc(
      page,
      (kc) =>
        Object.values(
          (
            kc.estado() as unknown as {
              novedades: Record<string, { empleadoId: string; nota: string | null }>;
            }
          ).novedades,
        ).find((x) => x.empleadoId === 'em_nrios')?.nota ?? null,
    );
    expect(n).toBe('Reposo por gripa, con incapacidad de la EPS');
    // Eliminar con confirmación.
    await page
      .getByTestId('novedades-tabla')
      .locator('tbody tr')
      .first()
      .getByRole('button', { name: /Acciones de/ })
      .click();
    await page.getByRole('menuitem', { name: 'Eliminar' }).click();
    const confirmar = page.getByRole('alertdialog');
    await expect(confirmar).toContainText('¿Eliminar la incapacidad de Natalia Ríos Echeverry?');
    await expect(confirmar).toContainText('3 días');
    await confirmar.getByRole('button', { name: 'Eliminar novedad' }).click();
    await expect(page.getByTestId('novedades-tabla')).toContainText('Ninguna novedad con estos filtros');
    const eliminado = await conKc(
      page,
      (kc) =>
        Object.values(
          (
            kc.estado() as unknown as {
              novedades: Record<string, { empleadoId: string; eliminadoEn?: string | null }>;
            }
          ).novedades,
        ).find((x) => x.empleadoId === 'em_nrios')?.eliminadoEn ?? null,
    );
    expect(eliminado).not.toBeNull();
  });

  test('los filtros por estado y tipo se pueden quitar con sus chips', async ({ page, irA }) => {
    await abrir(page, irA, '/panel/personal/novedades');
    const todas = await page.getByTestId('novedades-tabla').locator('tbody tr').count();
    expect(todas).toBeGreaterThanOrEqual(3);
    await page.getByTestId('novedades-estado').getByRole('radio', { name: 'Próximas' }).click();
    await expect(page.getByTestId('novedades-tabla')).toContainText('Ninguna novedad con estos filtros');
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page.getByTestId('novedades-tabla').locator('tbody tr')).toHaveCount(todas);
  });
});

test.describe('Mi día y Mi turno (W8)', () => {
  async function comoVendedor(page: Page, irA: (ruta: string) => Promise<void>) {
    await irA('/panel/inicio');
    await esperarDatos(page);
    await page.getByTestId('selector-rol').click();
    await page.getByTestId('rol-vendedor').click();
    await expect(page).toHaveURL(/\/panel\/mi-dia/);
    await esperarDatos(page);
  }

  test('Mi día: saludo, cifras propias, meta del local y lo que no puede hacer sin el dueño', async ({
    page,
    irA,
  }) => {
    await comoVendedor(page, irA);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola, Sebastián');
    const mi = await conKc(
      page,
      (kc) =>
        kc.sel('selMiDia', { empleadoId: 'em_scardenas', ahora: '2026-09-30T15:30:00' }) as {
          ventasHoy: { netas: number; numVentas: number };
          comisionMes: number;
          meta: { avance: number } | null;
        },
    );
    await expect(page.getByTestId('mi-dia-resumen')).toContainText(`$ ${miles(mi.ventasHoy.netas)}`);
    await expect(page.getByTestId('mi-dia-resumen')).toContainText(`$ ${miles(mi.comisionMes)}`);
    await expect(page.getByTestId('mi-dia-kpi-comision')).toContainText(`$ ${miles(mi.comisionMes)}`);
    expect(mi.meta).not.toBeNull();
    await expect(page.getByTestId('mi-dia-meta')).toContainText(`${Math.round(mi.meta!.avance * 100)} %`);
    const limites = page.getByTestId('mi-dia-limites');
    await expect(limites).toContainText('Lo que no puedes hacer sin el dueño');
    await expect(limites).toContainText('Anular una venta');
    await expect(limites).toContainText('Dar más del 15 % de descuento');
    await expect(limites).toContainText('Ajustar el inventario');
    await expect(limites).toContainText('arqueo ciego');
    // Nada del dueño: ni costos, ni márgenes, ni salarios.
    await expect(page.getByTestId('pagina')).not.toContainText(/margen|salario|costo/i);
  });

  test('marcar salida y entrada registra la hora y el local, alterna y aparece en la asistencia del dueño', async ({
    page,
    irA,
  }) => {
    await comoVendedor(page, irA);
    // Sebastián ya marcó entrada hoy a las 11:52 a. m.: toca marcar salida.
    await expect(page.getByTestId('marcacion-boton')).toContainText('Marcar salida');
    await expect(page.getByTestId('marcacion-hoy')).toContainText('Entrada');
    await expect(page.getByTestId('marcacion-hora')).toContainText('3:30 p. m.');
    await expect(page.getByTestId('marcacion-local')).toContainText('Usaquén');
    await page.getByTestId('marcacion-boton').click();
    await expect(page.getByText('Salida registrada')).toBeVisible();
    await expect(page.getByTestId('marcacion-hoy')).toContainText('Salida');
    await expect(page.getByTestId('marcacion-hoy')).toContainText('3:30 p. m.');
    await expect(page.getByTestId('marcacion-boton')).toContainText('Marcar entrada');
    const m = await conKc(page, (kc) =>
      Object.values(
        (
          kc.estado() as unknown as {
            marcaciones: Record<
              string,
              { empleadoId: string; tipo: string; ts: string; localId: string; medio: string }
            >;
          }
        ).marcaciones,
      )
        .filter((x) => x.empleadoId === 'em_scardenas' && x.ts.startsWith('2026-09-30'))
        .map((x) => ({ tipo: x.tipo, ts: x.ts, localId: x.localId, medio: x.medio })),
    );
    expect(m).toEqual([
      { tipo: 'entrada', ts: '2026-09-30T11:52:00', localId: 'usq', medio: 'generada' },
      { tipo: 'salida', ts: '2026-09-30T15:30:00', localId: 'usq', medio: 'boton' },
    ]);
    const eventos = await conKc(page, (kc) => kc.eventosDominio().map((e) => `${e.tipo}:${e.contexto.rol}`));
    expect(eventos).toContain('MarcacionRegistrada:vendedor');
    // El dueño lo ve en la asistencia, con la hora y el local.
    await page.getByTestId('selector-rol').click();
    await page.getByTestId('rol-dueno').click();
    await page.goto(conHoy(`/panel/personal/asistencia?empleado=em_scardenas&desde=${HOY}&hasta=${HOY}`));
    await esperarDatos(page);
    const fila = page.getByTestId('asistencia-tabla-dias').locator('tbody tr').first();
    await expect(fila).toContainText('Sebastián Cárdenas');
    await expect(fila).toContainText('Usaquén');
    await expect(fila).toContainText('11:52 a. m.');
    await expect(fila).toContainText('3:30 p. m.');
  });

  test('sin turno hoy no se puede marcar y se explica por qué', async ({ page, irA }) => {
    await comoVendedor(page, irA);
    await conKc(page, (kc) => {
      const turno = Object.values(
        (
          kc.estado() as unknown as {
            turnos: Record<string, { id: string; empleadoId: string; fecha: string }>;
          }
        ).turnos,
      ).find((t) => t.empleadoId === 'em_scardenas' && t.fecha === '2026-09-30');
      const r = (
        kc as unknown as { accionesDe: (rol: string) => Record<string, (d: unknown) => { ok: boolean }> }
      ).accionesDe('dueno').eliminarTurno!({ turnoId: turno!.id });
      if (!r.ok) throw new Error('no se eliminó el turno');
    });
    await expect(page.getByTestId('marcacion-boton')).toBeDisabled();
    await expect(page.getByTestId('marcacion')).toContainText('Hoy no tienes turno programado');
  });

  test('Mi turno: horario de dos semanas, asistencia del mes y marcación', async ({ page, irA }) => {
    await comoVendedor(page, irA);
    await page.getByRole('link', { name: 'Mi turno' }).first().click();
    await expect(page).toHaveURL(/\/panel\/mi-turno/);
    await esperarDatos(page);
    const h = await conKc(
      page,
      (kc) =>
        kc.sel('selHorasSemana', { empleadoId: 'em_scardenas', lunes: '2026-09-28' }) as {
          horas: number;
          maximo: number;
          turnos: { fecha: string }[];
        },
    );
    const horario = page.getByTestId('mi-turno-horario');
    await expect(horario).toContainText('Semana 40 · 28 sep – 4 oct de 2026');
    await expect(horario).toContainText(`${horas(h.horas)} de ${horas(h.maximo)}`);
    await expect(page.getByTestId(`mi-turno-dia-${HOY}`)).toContainText('Cierre');
    await expect(page.getByTestId('mi-turno-dia-2026-09-28')).toContainText('Libre');
    const r = await conKc(
      page,
      (kc) =>
        kc.sel('selAsistencia', {
          desde: '2026-09-01',
          hasta: '2026-09-30',
          ahora: '2026-09-30T15:30:00',
          empleadoId: 'em_scardenas',
        }) as { resumen: { turnos: number; horasTrabajadas: number }[] },
    );
    const asistencia = page.getByTestId('mi-turno-asistencia');
    await expect(asistencia).toContainText('Mi asistencia de septiembre de 2026');
    await expect(asistencia).toContainText(horas(r.resumen[0]!.horasTrabajadas));
    await expect(page.getByTestId('marcacion-boton')).toContainText('Marcar salida');
    // Solo ve lo suyo: ninguna otra persona en la tabla.
    await expect(asistencia).not.toContainText('Mateo');
  });

  test('la bodega también marca desde Mi turno', async ({ page, irA }) => {
    await irA('/panel/inicio');
    await esperarDatos(page);
    await page.getByTestId('selector-rol').click();
    await page.getByTestId('rol-bodega').click();
    await page.getByRole('link', { name: 'Mi turno' }).first().click();
    await expect(page).toHaveURL(/\/panel\/mi-turno/);
    await esperarDatos(page);
    await expect(page.getByTestId('marcacion-local')).toContainText('Bodega central');
    await expect(page.getByTestId('marcacion-boton')).toContainText('Marcar salida');
    await page.getByTestId('marcacion-boton').click();
    await expect(page.getByTestId('marcacion-hoy')).toContainText('Salida');
    const m = await conKc(page, (kc) =>
      Object.values(
        (
          kc.estado() as unknown as {
            marcaciones: Record<string, { empleadoId: string; tipo: string; localId: string; ts: string }>;
          }
        ).marcaciones,
      )
        .filter((x) => x.empleadoId === 'em_wdiaz' && x.ts.startsWith('2026-09-30'))
        .map((x) => `${x.tipo}@${x.localId}`),
    );
    expect(m).toEqual(['entrada@bod', 'salida@bod']);
  });
});
