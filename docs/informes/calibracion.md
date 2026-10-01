# Informe · Pista de calibración P1–P22

Dueña solo de `src/generador/**` y `src/seed/**` (más, por instrucción del paquete: `versionGenerador` en `src/config/demo.ts`, `docs/DECISIONES.md`, PLAN §4.7 y este informe). Sin cambios de tipos del dominio ni de IDs de entidades narrativas.

## Resultado

- **P1–P22 dentro de tolerancia en las 4 fechas** (2026-09-30, 2026-12-19, 2027-01-20, 2027-06-14): 81 mediciones por fecha, 0 fuera, 0 pendientes. `PENDIENTES_CALIBRACION` queda vacío.
- Los `it.todo` de calibración se convirtieron en pruebas reales: `src/generador/pruebas/patrones.test.ts` tiene una prueba por patrón y fecha (22 grupos × 4) más la tabla completa por fecha y "no queda nada pendiente".
- `npm run typecheck`, `npm run lint` y `npx vitest run src/generador src/selectores src/reportes --maxWorkers=2` en verde (15 archivos, 204 pruebas). Huella del determinismo actualizada (la misma con TZ Asia/Tokyo y America/Los_Angeles).
- `npm run informe -- --ancla <fecha>` en las 4 fechas: 0 invariantes rotos, 0 comandos omitidos, narrativa N1–N16 en verde, ningún patrón FUERA.
- `versionGenerador` 1 → 2 (la historia cambió; el enlace aún no se ha enviado).

## Antes → después (desviaciones de F2-A2 → valor en las 4 fechas: sep · dic · ene · jun)

| Patrón | Antes (F2-A2) | Después | Cómo |
|---|---|---|---|
| ESC mes típico | 371 · 339 · 359 · 377 M (ok, al borde) | 349 · 345 · 349 · 350 M | Promedio de 3 meses normalizados (menos ruido); sorteos acoplados por ciclo anual |
| P1.zr.ventas | 10,8 en dic. (tope 60) | 15,2 · 14,3 · 13,8 · 13,6 | Tope diario repartido en proporción entre locales y normalización con `lambdaAcotado` |
| P2 Valentina | ok con 1,5 | 44 · 41 · 47 · 44 % de P93; accesorio 49 · 50 · 40 · 44 % | Asignación estratificada (Weyl) con peso 1,25; accesorio estratificado |
| P3.agotada | 1 en dic., 7 en jun. | 4 · 4 · 4 · 3 | **Redefinido**: racha ≥ 5 días sin la Oxford M en algún local; Oxford azul cielo 1,6; pedido previo al ancla 60 % + 6; sin reposición las 3 semanas previas |
| P5 | calzado 205–225 d, tienda 110–170 d, 50–60 M | calzado 181 · 152 · 149 · 220 d; tienda 110 · 94 · 84 · 120 d; relación ≥ 1,6; 47–54 M | **Redefinido** (tienda ≈ 105 d, calzado ≈ 190 d ±30 % y ≥ 1,5× la tienda, ≈ 50 M); cobertura + 20 d × 1,10; Ruifeng con ritmo anual |
| P7.sabado / tarde | 19 % en dic./ene.; 13,7 % en jun. | 21–21 % (objetivo corregido por el tope); 9,3–12,4 % | Objetivo × participación del sábado con el tope; franja 3–7 p. m. 1,4 |
| P8.usq | 1,8 en jun. | 1,35 · 1,08 · 1,32 · 1,47 | Sin las 16 ventas de golpe de la Oxford en la víspera (N1 a Zona Rosa) |
| P9.qr_bre_b | 2,7 % en sep. | 3,2 · 4,4 · 3,9 · 3,6 % | Medio de pago estratificado; QR 4,5 % |
| P11 recurrentes | ≈ 97 % (inalcanzable) | 64 · 65 · 66 · 61 % | **Redefinido**: valor de VIP + frecuentes / valor con cliente (12 meses) ≈ 70 % |
| P11 segmentos | ocasional 17 %, en riesgo 34–43 %, nuevo 14–16 %, VIP 11 % | VIP 8,4–10,2 · frecuente 20–22 · ocasional 35 · en riesgo 24,7 · nuevo 9,8 % | Compras garantizadas por cliente (plan → venta concreta) |
| P11.vipRiesgo | 41 en sep. | 31 · 25 · 31 · 35 | Idem |
| P13.ultimo | 57 % | 53,3 · 51,9 · 52,8 · 53,2 % (penúltimo 57,4–57,7 %) | FOB del blazer US$ 55,00; otros tributos 20 % |
| P14.retraso Weiye | 22–25 d en dic./jun. | 10 · 14,3 · 11,3 · 14,3 | Ruido de etapas compensado; aforo por fábrica, la mitad dentro del retraso |
| P14 comparativo (nuevo, pedido de Proveedores) | Huameng 17 % a tiempo, +4 d; Lanxin > Weiye | Huameng 100 % a tiempo, 0 d; Weiye ≥ 3,7 d más tarde que la siguiente | Fábrica puntual sin ruido; Lanxin 3 d, Ruifeng 4 d |
| P15 | total 55–66 M; P93 14 %; USQ 8,6 % en ene. | total 52,8 · 52,9 · 51,9 · 55,2 M; USQ 14–16 %; P93 12,6–13,7 %; ZR 8,5–8,8 % | **Redefinido**: mes típico (índice 0,85–1,15), P93 ≈ 12 %, total ≈ 52 M |
| P17.saldo | 10,6 M en dic. | 5,5 · 6,0 · 5,8 · 5,2 M; 14 activos en las 4 | Saldo dirigido de los 14 narrativos; sin separados el día del ancla; los que se cancelarían tras el ancla se completan |
| P18 | +22 % en sep. y ene. | +6,5 · +10,8 · +4,4 · +19,1 % | Número de ventas y ruido semanal sembrados por día del ciclo de 364 días |
| P19 | ok; 41 M en jun. tras cambios | 17,9 · 18,4 · 20,4 · 19,2 M | Tres pasos (A−3, víspera, ancla 7:40 contando el saldo de ese momento); retiro también de Nequi/Daviplata |
| N7 | 17 activos en dic. | 14 en las 4 | Ver P17 |
| N16 | — (se rompía con los cambios) | en verde en las 4 | Pedido previo de la Oxford corto y sin reposición 3 semanas |

Redefiniciones registradas en DECISIONES (01/10/2026, "Pista de calibración") y en PLAN §4.7 (P3, P5, P7, P11, P14, P15) y §7.8 (peso de Valentina).

## Pedidos de constructores atendidos

- **Proveedores (P14)**: Huameng puntual (100 % a tiempo, 0 días en las 4 fechas), Weiye la que más se demora (≥ 3,7 días sobre la siguiente), Lanxin por debajo de Weiye. Pruebas: `P14.aTiempoHuameng`, `P14.retrasoHuameng`, `P14.weiyeLaPeor`.
- **Importaciones (W4)**: Oxford de IMP-2026-07 a **$ 71.546** puesta en bodega (guion $ 71.850), margen ≈ 61,3 % a $ 219.900 (antes $ 78.647 y 57 %). El pedido en puerto es de temporada (≈ 1.190 camisas en los 6,2 m³, con poca Oxford: siguen las 48 Oxford azul cielo M) y "otros tributos" = 20 % del FOB.
- **Importaciones (W12)**: el problema está en el **selector** `selSugerenciaPedido` (no lo toqué): cubre `coberturaDias` desde la llegada estimada (≈ 102 días) pero resta las existencias y lo que viene en camino de hoy, sin la venta de la espera. Corrección propuesta: `demanda = rotación semanal × (espera + cobertura) / 7 × factor estacional de [hoy, llegada + cobertura] − existencias − en camino`. Con el generador actual (ancla 2026-09-30) da ≈ 1.600 prendas a Huameng con 90 días (Oxford ≈ 155) y ≈ 2.060 con 120 (Oxford ≈ 240); hoy da 620 (Oxford 30). Para que la Oxford M sea protagonista ayuda además sumar `meta.demandaInsatisfecha` (el selector ya la lee) y no dejar que el factor estacional de ene.–mar. (0,77) castigue un pedido que llega para la temporada.

## Tiempos (`npm run medir`, escala 1; máquina con ~9 agentes, carga 4–40)

| Medición | Base (HEAD) | Calibrado |
|---|---|---|
| Mismas condiciones, intercalado (frío) | 1.095 · 1.204 · 1.079 ms | 1.202 · 1.183 · 1.293 ms |
| Mejor de 8 construcciones seguidas (carga baja) | ≈ 500 ms | ≈ 620 ms |
| Construcción en el script de patrones (carga baja) | — | 556–742 ms por fecha |

Con la máquina ocupada no se puede certificar el < 1 s en frío; en las mismas condiciones el calibrado cuesta ≈ 5–10 % más en frío y ≈ 20 % en caliente (más ventas con cliente y reposiciones con menos holgura; la calibración de P19 calcula una proyección más). Con la máquina libre, F2-A2 midió 728 ms: la estimación es ≈ 800 ms. La prueba `rendimiento.test.ts` (< 3 s) falló solo durante picos de carga (21–30 s también en la base) y pasa en la corrida final.

## Desviaciones y avisos

- **Selectores/reportes (no tocados)**: un separado creado y cancelado dentro del mismo periodo aparece con total 0 en "Ventas detalladas" (estado "anulada") pero `selVentas.totales.ventas` lo cuenta (los hechos de venta no excluyen los separados cancelados). Con una versión intermedia del generador eso rompía `reportes.test.ts`; el generador final ya no cancela separados en el último mes antes del ancla, pero el desfase sigue posible con comandos del usuario. Corrección propuesta: que `hechosDeVenta` (o `resumirHechos`) excluya los separados con `cerrado.resultado === 'cancelado'`, como ya hacen `analisis`, `clientes` y `hallazgos`.
- **`escala` 1,5**: el punto bajo del flujo sigue alto (≈ $ 54 M en diciembre; antes ≈ $ 121 M) porque la caja acumulada no escala con los retiros mensuales del socio. No es parte de las 4 fechas con escala 1; queda anotado en DECISIONES.
- Archivos fuera de `generador/seed` tocados por instrucción del paquete: `src/config/demo.ts` (`versionGenerador: 2`), `docs/DECISIONES.md`, `docs/PLAN.md`, este informe. `config/demo.ts` conserva `proporcionRecurrentes: 0.7` (el generador no lo usa).
- Margen estrecho (pasa, pero cerca del borde) en: P2.participación ene. 0,472 (máx. 0,48), P11.recurrentes jun. 0,61 (mín. 0,595), P18 jun. 0,191 (máx. 0,20), P3.XL jun. 0,170 (máx. 0,1725), P9.transferencia ene. 0,050 (mín. 0,049), P15.total jun. 55,2 M (máx. 59,8). Un cambio futuro que altere los flujos aleatorios debería volver a correr `npm run informe` en las 4 fechas.
