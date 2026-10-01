import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PISTAS_TEXTOS } from '@/config/textos/guia';
import { MENU_ESCRITORIO, PESTANAS_APP, MAS_APP, INICIO_POR_ROL } from '@/config/navegacion';
import { rutasDominio } from '@/dominio/reglas/rutas-dominio';
import { EVENTOS_UI, leerParamsRuta, PISTAS, propagarHoy, RUTAS, rutaDeUrl, rutas, type NombreRuta } from './rutas';

/** Contrato de rutas (5.5, 5.5.1, 6.18, 2.5, 5.14). */
describe('rutas.ts', () => {
  it('constructores con parámetros de ruta codificados y query tipada (sin nulos)', () => {
    expect(rutas.producto('HL-CAM-0142', { trasladar: { origen: 'zr', destino: 'usq', varianteId: 'va_x', cantidad: 3 } })).toBe(
      '/panel/inventario/HL-CAM-0142?trasladar=zr%2Cusq%2Cva_x%2C3',
    );
    expect(rutas.flujo({ semana: '2026-10-12' })).toBe('/panel/pagos/flujo?semana=2026-10-12');
    expect(rutas.importacion('IMP-2026-07', { resaltar: 'cambiar-estado' })).toBe('/panel/importaciones/IMP-2026-07?resaltar=cambiar-estado');
    expect(rutas.caja({ sesion: 'sc_1', resaltar: null })).toBe('/panel/pos/caja?sesion=sc_1');
    expect(rutas.inicio()).toBe('/panel/inicio');
    expect(rutas.empleadoPestana('sebastian-cardenas', 'costo')).toBe('/panel/personal/sebastian-cardenas/costo');
  });

  it('parser: valores válidos tipados; inválidos y desconocidos se ignoran', () => {
    const p = leerParamsRuta('producto', { referencia: 'HL-CAM-0142' }, '?trasladar=zr,usq,va_x,3&otro=1');
    expect(p).toEqual({ referencia: 'HL-CAM-0142', trasladar: { origen: 'zr', destino: 'usq', varianteId: 'va_x', cantidad: 3 }, resaltar: null });
    expect(leerParamsRuta('producto', { referencia: 'X' }, '?trasladar=zr,usq').trasladar).toBeNull();
    expect(leerParamsRuta('sugerirPedido', {}, '?proveedor=pr_huameng&cobertura=90&desde=analisis')).toEqual({ proveedor: 'pr_huameng', cobertura: 90, desde: 'analisis' });
    expect(leerParamsRuta('flujo', {}, '?semana=12-10-2026').semana).toBeNull();
    expect(leerParamsRuta('cliente', { clienteId: 'cl_1' }, '?mensaje=cumpleanos').mensaje).toBe('cumpleanos');
  });

  it('rutaDeUrl prioriza las subrutas estáticas sobre las dinámicas', () => {
    expect(rutaDeUrl('/panel/inventario/movimientos')).toBe('movimientos');
    expect(rutaDeUrl('/panel/inventario/HL-CAM-0142')).toBe('producto');
    expect(rutaDeUrl('/panel/personal/nomina')).toBe('nomina');
    expect(rutaDeUrl('/panel/personal/sebastian-cardenas')).toBe('empleado');
    expect(rutaDeUrl('/tienda/producto/camisa')).toBe('tiendaProducto');
    expect(rutaDeUrl('/tienda/camisas')).toBe('tiendaCategoria');
  });

  it('?hoy= se propaga a los contextos nuevos (portal, QR) y respeta el hash', () => {
    expect(propagarHoy('/seguimiento/IMP-2026-06', '2026-09-30T15:30')).toBe('/seguimiento/IMP-2026-06?hoy=2026-09-30T15%3A30');
    expect(propagarHoy('/app#r=abc', '2026-09-30')).toBe('/app?hoy=2026-09-30#r=abc');
    expect(propagarHoy('/app', null)).toBe('/app');
  });

  it('el menú, las pestañas de la app, los inicios por rol y los enlaces del dominio existen en RUTAS', () => {
    const patrones = new Set(Object.values(RUTAS).map((r) => r.patron));
    for (const i of MENU_ESCRITORIO) expect(patrones, i.ruta).toContain(i.ruta);
    for (const p of [...PESTANAS_APP, ...MAS_APP]) expect(patrones, p.ruta).toContain(p.ruta);
    for (const r of Object.values(INICIO_POR_ROL)) expect(patrones).toContain(r);
    expect(rutaDeUrl(rutasDominio.importacion('IMP-2026-07'))).toBe('importacion');
    expect(rutaDeUrl(rutasDominio.venta('vt_1'))).toBe('venta');
    expect(rutaDeUrl(rutasDominio.cliente('cl_1'))).toBe('cliente');
    expect(rutaDeUrl(rutasDominio.aprobaciones())).toBe('appAprobar');
    expect(rutaDeUrl(rutasDominio.traslado('tr_1'))).toBe('traslado');
  });

  it('cada pista tiene su texto en config/textos/guia.ts y su ruta existe; 15 eventos de interfaz con emisor', () => {
    for (const [id, p] of Object.entries(PISTAS)) {
      expect(PISTAS_TEXTOS[id], id).toBeTruthy();
      expect(RUTAS[p.ruta as NombreRuta]).toBeDefined();
    }
    expect(Object.keys(EVENTOS_UI).length).toBe(15);
  });

  it('la reescritura de vercel.json manda a index.html todas las rutas y respeta los archivos estáticos (5.14)', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { rewrites: { source: string }[] };
    const re = new RegExp(`^${vercel.rewrites[0]?.source ?? ''}$`);
    for (const r of Object.values(RUTAS)) {
      const url = r.patron.replace(/:[a-zA-Z]+/g, 'x');
      expect(re.test(url), url).toBe(true);
    }
    for (const estatico of ['/assets/index-abc.js', '/sw.js', '/workbox-123.js', '/manifest.webmanifest', '/favicon.svg', '/robots.txt', '/iconos/pwa-192.png', '/og/halden-og.png'])
      expect(re.test(estatico), estatico).toBe(false);
  });
});
