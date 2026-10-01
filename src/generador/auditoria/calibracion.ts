/**
 * Patrones aún fuera de tolerancia en alguna de las 4 fechas de prueba (F2-A2, 01/10/2026), con la desviación
 * medida. La pista de calibración los va sacando de aquí (patrones.test.ts exige todo lo que no está en la lista).
 */
export const PENDIENTES_CALIBRACION: Record<string, string> = {
  'P1.zr.ventas': 'Zona Rosa en diciembre queda recortada por el tope de 60 ventas al día (≈ 11 por día normalizado vs 14)',
  'P3.agotada': 'episodios de agotado de la Oxford azul cielo M en Usaquén: 1 en dic., 7 en jun. (objetivo 2–5)',
  'P5.dias': 'calzado ≈ 205–225 días de inventario en sep. y jun. (objetivo 160 ± 15 %)',
  'P5.tienda': 'la tienda ≈ 110–170 días de inventario (objetivo 55): con cadencias de 90–182 días y mínimos por variante no baja de ≈ 90',
  'P5.costo': 'calzado a costo ≈ $ 50–60 M (objetivo 40 M): el costo por par aterrizado es ≈ $ 170.000',
  'P7.sabado': 'el sábado cae a ≈ 19 % en dic. y ene. (tope de 60 ventas al día en diciembre)',
  'P7.tarde': 'sábado 3–7 p. m. ≈ 13,7 % en jun. (objetivo 11 %)',
  'P8.usq': 'índice del domingo de Usaquén ≈ 1,8 en jun. (objetivo 1,35)',
  'P9.qr_bre_b': 'QR Bre-B ≈ 2,7 % por valor en el último mes (objetivo 4 %, tolerancia 30 %)',
  'P11.recurrentes': 'con 15 % de ventas identificadas y ≈ 450 clientes, ≈ 97 % de las ventas con cliente van a recurrentes; el 70 % del plan es aritméticamente inalcanzable tras la decisión del 01/10',
  'P11.vipRiesgo': '≈ 41 clientes de más de $ 3 M sin comprar en 90 días (objetivo 31 ± 30 %)',
  'P11.vip': 'VIP ≈ 11 % en ene. (objetivo 8 % ± 35 %)',
  'P11.ocasional': 'ocasional ≈ 17 % (objetivo 35 %): con la regla de 90 días casi todo ocasional queda "en riesgo"',
  'P11.en_riesgo': 'en riesgo ≈ 34–43 % (objetivo 25 %)',
  'P11.nuevo': 'nuevo ≈ 14–16 % (objetivo 10 % ± 35 %)',
  'P13.ultimo': 'margen del blazer en el último pedido ≈ 57 % (objetivo 51 %): una tasa 9 % más alta solo quita ≈ 3–4 puntos',
  'P14.retraso': 'retraso promedio de Ningbo Weiye ≈ 22–25 días en dic. y jun. (aforos incluidos; objetivo 12)',
  'P15.p93': 'nómina / ventas de Parque 93 ≈ 14 % (objetivo 10 %)',
  'P15.total': 'costo mensual de la nómina ≈ $ 55–66 M en dic. y ene. (horas extra y comisiones; objetivo 48 M para un mes típico)',
  'P15.usq': 'nómina / ventas de Usaquén ≈ 8,6 % en ene. (objetivo 14 %)',
  'P17.saldo': 'saldo de separados ≈ $ 10,6 M el 19 de diciembre (objetivo 6,2 M ± 25 %)',
  P18: 'mes a la fecha vs el año anterior ≈ +22 % en sep. y ene. (objetivo +8 %, rango 0–20 %)',
};
