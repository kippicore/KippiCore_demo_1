/**
 * Patrones aún fuera de tolerancia en alguna de las 4 fechas de prueba, con la desviación medida. La pista de
 * calibración (docs/informes/calibracion.md) los sacó todos: la lista queda vacía y patrones.test.ts exige todo.
 * Se conserva para el informe de coherencia (scripts/informe-coherencia.ts) y por si una calibración futura
 * necesita marcar algo pendiente de forma explícita (nunca en silencio).
 *
 * Redefiniciones de la pista (DECISIONES, PLAN 4.7): P3 (agotado = racha ≥ 5 días sin la Oxford M en algún local),
 * P5 (tienda ≈ 105 días; calzado ≈ 190 días, ≥ 1,5 veces la tienda y ≈ $ 50 M), P7 (objetivo corregido por el tope
 * de 60 ventas al día), P11 (VIP + frecuentes ≈ 70 % del valor con cliente de 12 meses), P15 (mes típico; Parque 93
 * ≈ 12 %; total ≈ $ 52 M), ESC (promedio de 3 meses) y P14 (más el comparativo: Huameng puntual, Weiye la peor).
 */
export const PENDIENTES_CALIBRACION: Record<string, string> = {};
