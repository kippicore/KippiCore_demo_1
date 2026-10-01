/** Parámetros de la demo (PLAN 5.4, 5.6, 7.1). */
export const DEMO = {
  /** Semilla del generador (7.1). */
  semilla: 'HALDEN-2026',
  /** Clave de almacenamiento: kc:<clave>:v1:* (5.6.5). */
  claveAlmacenamiento: 'halden',
  /** Se congela desde que Miguel envía el enlace al cliente (5.6.10). */
  versionGenerador: 1,
  /** Formato de las entradas del registro (5.6.10). */
  versionRegistro: 1,
  /** Meses de historia hacia atrás desde el ancla (7.3). */
  mesesHistoria: 18,
  /**
   * Multiplicador de ventas diarias (y, en proporción, clientes y cantidades de importación) sin cambiar la
   * narrativa (4.7). Miguel lo ajusta antes de enviar el enlace.
   */
  escala: 1,
  escalaMinima: 0.5,
  escalaMaxima: 1.5,
  /** Sin registro y con más de estos días desde el ancla, el ancla se renueva sola (5.6.3). */
  diasRenovacionAncla: 7,
  /** Reloj fijo por defecto de las pruebas de Playwright (5.16). */
  hoyQa: '2026-09-30T15:30',
  /** Al volver a la pestaña tras este tiempo se ofrece "Actualizar a la hora actual" (5.6.11). */
  minutosOfrecerActualizar: 30,
  /** Límite del registro antes de avisar en Configuración › Datos (5.6.5). */
  limiteRegistroBytes: 3_000_000,
  /** QR de la app: largo máximo del contenido para que sea legible desde una pantalla (5.6.8). */
  largoMaximoQr: 300,
} as const;

/**
 * Clientes identificados (DECISIONES 01/10/2026, última línea; prevalece sobre el 40 % del plan).
 * Con ~16.000 ventas en 18 meses y ~450 clientes, un 15 % de ventas con cliente da una distribución
 * verosímil en moda (2–4 compras al año): VIP con 15 o más compras y la mayoría con 1 a 3.
 */
export const CLIENTES = {
  /** Fracción de las ventas con cliente identificado; el resto es consumidor final. */
  proporcionVentasConCliente: 0.15,
  /** Clientes registrados con escala 1. */
  clientesObjetivo: 450,
  /** Fracción de las ventas con cliente que van a clientes recurrentes (≥ 2 compras). */
  proporcionRecurrentes: 0.7,
} as const;
