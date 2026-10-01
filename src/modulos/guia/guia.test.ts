import { describe, expect, it } from 'vitest';
import { PISTAS, EVENTOS_UI } from '@/app/rutas';
import { COMO_ARRANCARIAMOS, PISTAS_TEXTOS, PRUEBA_ESTO } from '@/config/textos/guia';
import type { EntradaRegistro } from '@/dominio/tipos';
import type { EventoDominioConContexto } from '@/estado';
import { enlaceHablar } from './enlaces';
import {
  contarExtras,
  contarPrincipales,
  IDS_EXTRA,
  IDS_PRINCIPALES,
  itemPorEntradaRegistro,
  itemPorEventoDominio,
  itemPorEventoUI,
  textoHecho,
} from './progreso';

const contexto = (origen: 'usuario' | 'generado') => ({ origen, usuarioId: 'u_dueno', rol: 'dueno' as const, entradaId: 'x' });
const dominio = (e: Record<string, unknown>, origen: 'usuario' | 'generado' = 'usuario') => ({ ...e, contexto: contexto(origen) }) as unknown as EventoDominioConContexto;
const registro = (comando: unknown, origen: 'usuario' | 'generado' = 'usuario') => ({ origen, comando }) as unknown as Pick<EntradaRegistro, 'origen' | 'comando'>;

describe('Prueba esto · catálogo', () => {
  it('tiene 8 ítems principales y 6 de "Para ir más lejos", con ids distintos y su texto "Hecho:"', () => {
    expect(IDS_PRINCIPALES).toHaveLength(8);
    expect(IDS_EXTRA).toHaveLength(6);
    expect(new Set([...IDS_PRINCIPALES, ...IDS_EXTRA]).size).toBe(14);
    for (const id of [...IDS_PRINCIPALES, ...IDS_EXTRA]) expect(textoHecho(id)).toMatch(/^Hecho: /);
    expect(PRUEBA_ESTO.items.every((i) => i.texto.length > 10)).toBe(true);
  });

  it('los ítems de "Para ir más lejos" no cuentan para el 8/8', () => {
    const todos = [...IDS_PRINCIPALES, ...IDS_EXTRA];
    expect(contarPrincipales(todos)).toBe(8);
    expect(contarPrincipales(IDS_EXTRA)).toBe(0);
    expect(contarExtras(['moneda', 'venta', 'tienda'])).toBe(2);
  });
});

describe('detección por EventoUI', () => {
  it('marca los ítems de interfaz', () => {
    expect(itemPorEventoUI({ tipo: 'flujo_caja_visto', datos: {} })).toBe('flujo');
    expect(itemPorEventoUI({ tipo: 'costo_empleador_visto', datos: { empleadoId: 'em_1' } })).toBe('costo-empleado');
    expect(itemPorEventoUI({ tipo: 'pedido_sugerido_visto', datos: { proveedorId: 'pr_1' } })).toBe('pedido');
    expect(itemPorEventoUI({ tipo: 'qr_abierto', datos: {} })).toBe('celular');
    expect(itemPorEventoUI({ tipo: 'app_abierta', datos: {} })).toBe('celular');
    expect(itemPorEventoUI({ tipo: 'whatsapp_escenario_completado', datos: { escenario: 'consulta-talla' } })).toBe('whatsapp');
    expect(itemPorEventoUI({ tipo: 'whatsapp_respondido', datos: {} })).toBe('whatsapp');
    expect(itemPorEventoUI({ tipo: 'tabla_dinamica_modificada', datos: {} })).toBe('tabla-dinamica');
    expect(itemPorEventoUI({ tipo: 'portal_enviado', datos: { numero: 'IMP-2026-06' } })).toBe('portal');
  });

  it('el rol cuenta solo si cambia a vendedor o bodega', () => {
    expect(itemPorEventoUI({ tipo: 'rol_cambiado', datos: { a: 'vendedor' } })).toBe('rol');
    expect(itemPorEventoUI({ tipo: 'rol_cambiado', datos: { a: 'bodega' } })).toBe('rol');
    expect(itemPorEventoUI({ tipo: 'rol_cambiado', datos: { a: 'dueno' } })).toBeNull();
  });

  it('la moneda cuenta solo a USD o CNY, y el Excel solo si es el del contador', () => {
    expect(itemPorEventoUI({ tipo: 'moneda_cambiada', datos: { a: 'USD' } })).toBe('moneda');
    expect(itemPorEventoUI({ tipo: 'moneda_cambiada', datos: { a: 'CNY' } })).toBe('moneda');
    expect(itemPorEventoUI({ tipo: 'moneda_cambiada', datos: { a: 'COP' } })).toBeNull();
    expect(itemPorEventoUI({ tipo: 'excel_generado', datos: { reporte: 'contador' } })).toBe('contador');
    expect(itemPorEventoUI({ tipo: 'excel_generado', datos: { reporte: 'ventas' } })).toBeNull();
    expect(itemPorEventoUI({ tipo: 'pdf_generado', datos: { reporte: 'contador' } })).toBeNull();
    expect(itemPorEventoUI({ tipo: 'marca_personalizada', datos: {} })).toBeNull();
    expect(itemPorEventoUI({ tipo: 'como_arrancariamos_visto', datos: {} })).toBeNull();
  });
});

describe('detección por eventos de dominio', () => {
  it('una venta del usuario en el local completa el ítem 1; la web, la de la tienda; las del generador, nada', () => {
    expect(itemPorEventoDominio(dominio({ tipo: 'VentaRegistrada', canal: 'local', origen: 'usuario' }))).toBe('venta');
    expect(itemPorEventoDominio(dominio({ tipo: 'VentaRegistrada', canal: 'web', origen: 'usuario' }))).toBe('tienda');
    expect(itemPorEventoDominio(dominio({ tipo: 'VentaRegistrada', canal: 'whatsapp', origen: 'usuario' }))).toBeNull();
    expect(itemPorEventoDominio(dominio({ tipo: 'VentaRegistrada', canal: 'local', origen: 'generado' }, 'generado'))).toBeNull();
  });

  it('el traslado cuenta al solicitarse, no al despacharse ni recibirse', () => {
    expect(itemPorEventoDominio(dominio({ tipo: 'TrasladoCambiado', estado: 'solicitado' }))).toBe('traslado');
    expect(itemPorEventoDominio(dominio({ tipo: 'TrasladoCambiado', estado: 'en_transito' }))).toBeNull();
    expect(itemPorEventoDominio(dominio({ tipo: 'TrasladoCambiado', estado: 'recibido' }))).toBeNull();
  });

  it('el estado de una importación cuenta desde el panel (ítem 3) y desde el portal ("para ir más lejos")', () => {
    expect(itemPorEventoDominio(dominio({ tipo: 'ImportacionEstadoCambiado', origen: 'panel' }))).toBe('importacion');
    expect(itemPorEventoDominio(dominio({ tipo: 'ImportacionEstadoCambiado', origen: 'portal' }))).toBe('portal');
    expect(itemPorEventoDominio(dominio({ tipo: 'ImportacionEstadoCambiado', origen: 'sistema' }))).toBeNull();
    expect(itemPorEventoDominio(dominio({ tipo: 'ImportacionEstadoCambiado', origen: 'panel' }, 'generado'))).toBeNull();
  });
});

describe('detección por el registro de comandos', () => {
  it('lee lo que pasó en otra pestaña o antes de montarse la guía', () => {
    expect(itemPorEntradaRegistro(registro({ tipo: 'venta.registrar', datos: { canal: 'local' } }))).toBe('venta');
    expect(itemPorEntradaRegistro(registro({ tipo: 'venta.registrar', datos: { canal: 'web' } }))).toBe('tienda');
    expect(itemPorEntradaRegistro(registro({ tipo: 'traslado.solicitar', datos: {} }))).toBe('traslado');
    expect(itemPorEntradaRegistro(registro({ tipo: 'importacion.cambiarEstado', datos: { origen: 'panel' } }))).toBe('importacion');
    expect(itemPorEntradaRegistro(registro({ tipo: 'importacion.cambiarEstado', datos: { origen: 'portal' } }))).toBe('portal');
    expect(itemPorEntradaRegistro(registro({ tipo: 'gasto.registrar', datos: {} }))).toBeNull();
    expect(itemPorEntradaRegistro(registro({ tipo: 'venta.registrar', datos: { canal: 'local' } }, 'generado'))).toBeNull();
  });
});

describe('pistas contextuales', () => {
  it('cada ancla del catálogo PISTAS tiene su texto final, de máximo 25 palabras', () => {
    for (const id of Object.keys(PISTAS)) {
      const t = PISTAS_TEXTOS[id];
      expect(t, `falta el texto de ${id}`).toBeTruthy();
      expect(t!.split(/\s+/).length, `${id} pasa de 25 palabras`).toBeLessThanOrEqual(25);
    }
  });

  it('no hay textos de pistas que no existan en el catálogo (salvo la variante de navegador interno)', () => {
    const extra = Object.keys(PISTAS_TEXTOS).filter((k) => !(k in PISTAS));
    expect(extra).toEqual(['app.hoy.navegadorInterno']);
  });
});

describe('textos y enlaces', () => {
  it('"Hablar con KippiCore" sin número configurado no lleva destinatario', () => {
    expect(enlaceHablar()).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it('"Cómo arrancaríamos" tiene tres etapas de cuatro semanas y no promete cifras de rendimiento', () => {
    expect(COMO_ARRANCARIAMOS.etapas.items).toHaveLength(3);
    expect(COMO_ARRANCARIAMOS.etapas.items.map((e) => e.semanas)).toEqual(['Semanas 1 a 4', 'Semanas 5 a 8', 'Semanas 9 a 12']);
    const todo = JSON.stringify(COMO_ARRANCARIAMOS);
    expect(todo).not.toMatch(/99[,.]?\d*\s?%|segundos|milisegundos|garantiz/i);
  });

  it('E2 es el único emisor de `como_arrancariamos_visto` y comparte `marca_personalizada` con E3', () => {
    expect(EVENTOS_UI.como_arrancariamos_visto.emisor).toBe('E2');
    expect(EVENTOS_UI.marca_personalizada.emisor).toEqual(['E2', 'E3']);
  });
});
