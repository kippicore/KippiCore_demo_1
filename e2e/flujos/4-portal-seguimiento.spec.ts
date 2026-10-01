import { abrir, abrirCelular, AHORA, evaluar, expect, sel, soloEscritorio1440, test } from './comun';

/**
 * Flujo 4 (PROMPT fase 4, W3): la agente de aduanas actualiza el pedido desde `/seguimiento/:numero` en OTRA pestaña
 * (el enlace que recibe) y al dueño le llega la alerta en Inicio sin recargar; la app del dueño también la trae.
 */
test('portal de seguimiento en otra pestaña → alerta nueva en el Inicio del dueño sin recargar (y en la app)', async ({ page, context }, info) => {
  soloEscritorio1440(info);
  await abrir(page, '/panel/inicio');
  await expect(page.getByTestId('inicio-alertas')).toBeVisible();
  const numero = await evaluar(page, (kc) => {
    const e = kc.estado();
    return e.importaciones[e.meta.narrativa.importacionRetrasada ?? '']?.numero ?? '';
  }, null);
  expect(numero).toMatch(/^IMP-/);
  await expect(page.getByTestId('inicio-alertas')).not.toContainText('reportó el levante');
  const recargas: string[] = [];
  page.on('framenavigated', (f) => f === page.mainFrame() && recargas.push(f.url()));

  // La agente abre su enlace y reporta el levante.
  const portal = await context.newPage();
  await abrir(portal, `/seguimiento/${numero}`);
  await expect(portal.getByTestId('portal-numero')).toHaveText(numero);
  await expect(portal.getByTestId('portal-estado')).toContainText('Nacionalizado (levante)');
  await portal.getByTestId('portal-nota').fill('Levante autorizado, recogen mañana');
  await portal.getByTestId('portal-enviar').click();
  await expect(portal.getByTestId('portal-confirmacion')).toBeVisible();

  // Inicio del dueño (sin recargar): la alerta llega arriba, marcada "Nuevo", y enlaza a la importación.
  await page.bringToFront();
  const alertas = page.getByTestId('inicio-alertas');
  await expect(alertas).toContainText('Carolina Mejía reportó el levante', { timeout: 15_000 });
  const alerta = alertas.locator('li', { hasText: 'Carolina Mejía reportó el levante' }).first();
  await expect(alerta).toContainText('Nuevo');
  await expect(alerta.getByRole('link').first()).toHaveAttribute('href', new RegExp(`/panel/importaciones/${numero}`));
  expect(recargas, 'Inicio no se recargó').toEqual([]);
  const r = await sel<{ titulo: string; nueva: boolean }[]>(page, 'selAlertas', { localId: 'todos', ahora: AHORA });
  expect(r.some((a) => a.titulo.includes('Carolina Mejía reportó el levante') && a.nueva)).toBe(true);
  const estado = await evaluar(page, (kc, n: string) => Object.values(kc.estado().importaciones as unknown as Record<string, { numero: string; estado: string }>).find((i) => i.numero === n)?.estado, numero);
  expect(estado).toBe('nacionalizado');

  // App del dueño: Alertas la trae y lleva a la importación de la app.
  const cel = await abrirCelular(context, '/app/mas/alertas');
  const enApp = cel.getByTestId('app-alerta').filter({ hasText: 'Carolina Mejía reportó el levante' }).first();
  await expect(enApp).toBeVisible();
  await enApp.getByRole('link').first().click();
  await expect(cel).toHaveURL(new RegExp(`/app/mas/importaciones/${numero}`));
});
