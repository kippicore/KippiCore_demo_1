import { useCallback, useEffect, useRef } from 'react';
import { almacenGuia, useDatos, useEvento, useEventoUI } from '@/estado';
import { bus } from '@/estado/eventos';
import { avisarComplemento } from '@/ui/primitivos/Toast';
import { contarPrincipales, itemPorEntradaRegistro, itemPorEventoDominio, itemPorEventoUI, textoHecho, TOTAL_PRINCIPALES } from './progreso';

/**
 * Marca "Prueba esto" solo (PLAN 2.4, 6.18). Escucha los eventos de dominio y los `EventoUI` en vivo y, además, lee
 * el registro de comandos del usuario: así también cuenta lo que se hizo en otra pestaña (la tienda y el portal se
 * abren aparte) o antes de montarse la guía (la tienda y la app no llevan el panel). Al completarse un ítem avisa
 * "Hecho: …" y, al completar el octavo, abre la tarjeta de cierre. Es idempotente: completar dos veces no repite el aviso.
 */
export function useDeteccion(): void {
  const marcar = useCallback((id: string | null, avisarHecho: boolean) => {
    if (!id) return;
    const g = almacenGuia.getState();
    if (g.completados.includes(id)) return;
    g.completar(id);
    if (!avisarHecho) return;
    const texto = textoHecho(id);
    // Si la acción ya mostró su propio aviso ("Venta registrada"), el "Hecho: …" se suma a ese aviso en lugar de apilar otro.
    if (texto) setTimeout(() => avisarComplemento(texto), 60);
    // El octavo: el panel se transforma en la tarjeta de cierre (aunque estuviera minimizado).
    if (contarPrincipales(almacenGuia.getState().completados) === TOTAL_PRINCIPALES) g.minimizarPanel(false);
  }, []);

  useEvento('*', (e) => marcar(itemPorEventoDominio(e), true));
  useEventoUI((e) => marcar(itemPorEventoUI(e), true));

  // Lo que ya había pasado en esta pestaña antes de montarse (p. ej. abrir la app o cambiar de rol desde la entrada).
  useEffect(() => {
    for (const e of bus.historialUI) marcar(itemPorEventoUI(e), false);
  }, [marcar]);

  // El registro del usuario: la primera lectura es silenciosa; los cambios posteriores (otra pestaña) avisan.
  const registro = useDatos((s) => s.registro);
  const primera = useRef(true);
  useEffect(() => {
    for (const r of registro) marcar(itemPorEntradaRegistro(r), !primera.current);
    primera.current = false;
  }, [registro, marcar]);
}
