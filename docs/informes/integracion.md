# Informe · Fase 4, integración

Integrador, 01/10/2026, rama `main` (sin push). Alcance acotado por el líder a mitad de la sesión (demo comercial
urgente): flujos 1, 2, 3, 6 y 8 obligatorios; los demás se conservan si ya estaban escritos. Se escribieron y
pasan los **ocho** flujos; quedan para QA el QR desde "Ver app del dueño", la guía "Prueba esto" con las 8 acciones,
el traslado entre locales como flujo propio y las matrices de resolución.

## Paso 0 · Verde y pendientes de la oleada E

- **Typecheck**: el único error (`src/movil/calculos.test.ts`, `EventoVista` con `monto`, `montoOrigen`, `detalle`,
  `ilustrativo`, `recordatorioMin`) corregido.
- **E1 respeta la moneda**: la agenda de `/app` pinta `monto` con `<Dinero>`, `montoOrigen`, `detalle`, el aviso del
  recordatorio y la marca "Ilustrativa"; las alertas de `/app` usan `tituloPartes`/`contextoPartes` con
  `<FraseConDinero>`. La app no muestra hallazgos.
- **"$ 4,2 M"**: no existe en `config/textos/guia.ts` (ni en ningún texto de pantalla); el guion ya dice $ 4,6 M y la
  pantalla muestra la cifra del selector (DECISIONES).
- **Pendientes E1, E2, E3**: estado de cada ítem en `docs/informes/pendientes_compartidos_E.md` (12 hechos, 1
  descartado con su porqué, 1 para QA, el número de WhatsApp pendiente de Miguel: `null`, cómo configurarlo en
  DECISIONES).

## Paso 1 · Flujos de punta a punta (`e2e/flujos/`, 1440 × 900, variante móvil 390 × 844 en `/app`)

Utilidades en `e2e/flujos/comun.ts`: cada prueba falla si hay **cualquier error de consola o de página en cualquier
pestaña** del contexto. `PORT=4400 npx playwright test e2e/flujos --project=escritorio-1440 --workers=3`.

| # | Archivo | Estado | Defectos encontrados y arreglo |
|---|---|---|---|
| 1 | `1-venta-pos.spec.ts` | ✓ | Ninguno de producto. POS (dueño, Nequi, Andrés) → enlaces "Ver" de "Lo que acaba de pasar" → ficha con −1 en Usaquén → venta resaltada en Ventas → "Ventas de hoy" + $ 199.900 → ficha del cliente (+1 compra) → comisión de Sebastián (base + venta sin IVA, cajón) → caja de Usaquén (Nequi) → Análisis › Locales (Usaquén + $ 199.900) → `/app` a 390 (cifra = escritorio, la venta en Hoy y en Ventas). Nota: la proyección del mes cuenta solo días completos (la venta de hoy entra mañana): por diseño. |
| 2 | `2-venta-tienda.spec.ts` | ✓ | Ninguno. Compra en `/tienda` en otra pestaña → Inicio sube sin recargar y la guía marca "tienda" → venta resaltada con canal Web y Parque 93 → filtro por canal → −1 en Parque 93 → Canales › Vista web (pedidos de 30 días) → `/app`. |
| 3 | `3-importacion.spec.ts` | ✓ | Ninguno de producto. En puerto → nacionalización: "Notificar a" (transportador, bodega, agente; nunca la fábrica), `wa.me/?text=` y `mailto:?subject=` sin destinatario con el texto → bandeja "Enviado (simulación)" → llegada en su día del calendario → levante → recepción en Inventario → entradas con el costo aterrizado (= costo vigente nuevo) → margen nuevo en Rentabilidad, kárdex cuadrado con la importación → la llegada sale del calendario → `/app` la muestra recibida. |
| 4 | `4-portal-seguimiento.spec.ts` | ✓ | **Defecto**: en `/app` la alerta "Carolina Mejía reportó el levante" llevaba a la lista de importaciones (el id es el de la notificación). **Arreglo** en el contrato: `Alerta.origen` (el documento de la notificación) y `destinoAlerta` lo usa primero. Inicio recibe la alerta "Nuevo" sin recargar. |
| 5 | `5-asistencia-nomina.spec.ts` | ✓ | Ninguno. "Mi día" (vendedor) marca salida 3:30 p. m. → asistencia del dueño → la vista previa de la 2.ª quincena usa las mismas horas que `selAsistencia` → aprobar → "Por pagar" con el neto de Sebastián → flujo de caja de la semana con la nómina aprobada (fecha fija) → `/app` › Nómina. |
| 6 | `6-moneda-tasa.spec.ts` | ✓ | **Defectos** (con US$ y tasa $ 4.100 quedaban cifras en pesos o la tasa vieja): (a) la franja de moneda decía "tasa de ejemplo" tras editarla; (b) tooltips y textos de tasa con `TASA_EJEMPLO` (barra, `/app`, proveedores, sugerir pedido); (c) alerta del descuento por aprobar con "$ 789.900 → $ 631.920" escrito por el dominio; (d) hallazgo "más de $ 3 millones"; (e) alerta del pago en US$ "con la tasa de ejemplo". **Arreglos**: `useTasasVigentes` + `textoTasas` con etiqueta según la tasa; franja con la tasa; `contextoPartes` del descuento y umbral como cifra en los selectores. Inicio, Valorización, Por pagar, Nómina, Análisis y `/app` sin una cifra en pesos. La moneda es de cada pestaña (`/app` en otra pestaña se pasa a US$ en Más › Moneda): por diseño (DECISIONES). |
| 7 | `7-local-y-rol.spec.ts` | ✓ | Ninguno de producto. Local Usaquén → Inicio, Ventas (solo Usaquén), Inventario y `/app` con el local; vendedor: franja, "Mi día", local fijo, sin menú del dueño, `/panel/pagos` lo devuelve con aviso, Ventas sin costos ni márgenes; bodega: franja, Inventario, sin ventas ni costos (ve el precio de venta, para etiquetas); dueño: sin franja, todo el menú. |
| 8 | `8-restaurar.spec.ts` | ✓ | Ninguno. Venta en el POS, traslado, cambio de estado de importación y tasa nueva (y moneda en US$) → Configuración › Datos cuenta los cambios → "Restaurar" con RESTAURAR → **misma huella** que al inicio, también en `/app` en otra pestaña; Inicio vuelve a su cifra. |

Otros defectos de integración encontrados al correr los e2e de paquete con el sistema completo:

- **Inicio (D1) × "Prueba esto" (E2)**: en la primera llegada el panel se despliega a 1,2 s sobre la esquina de
  "Requiere tu atención" y tapa "Descartar" (el e2e de Inicio fallaba). Se mantiene el comportamiento del PLAN 2.4;
  el e2e minimiza el panel como lo haría la persona; la pista `inicio.alertas` ya no queda debajo. **Para QA visual.**
- **`/app` (E1)**: dos e2e con datos viejos (`versionGenerador` 4 cambió la venta de la solicitud de anulación y el
  título de las llegadas a "IMP-… · Llega a bodega"); actualizados.

**Para QA (no se escribieron como flujo)**: QR desde "Ver app del dueño" con una venta reciente (W10; cubierto por el
e2e de E1 con `__kc.urlQr()` y por fundaciones, no con el modal); la guía "Prueba esto" marcándose con las 8 acciones
en un recorrido real; un traslado entre locales como flujo propio (cubierto por W2 en el e2e de Inventario); un local
nuevo de Configuración en los listados (riesgo E3.4); matrices 1366/1280/390 de los flujos.

## Paso 2 · Rendimiento (`npm run test:e2e:rendimiento`, CPU ×4, mediana de 5)

La máquina no estuvo tranquila (load ≈ 3,5–4 por otros procesos del equipo); una medición por cambio, como pidió el
líder.

| Medición | `/app` (límite 2.500) | construcción | `/panel/inicio` (límite 4.500) |
|---|---|---|---|
| Antes | **2.731 ms** ✘ | 2.455 ms | 3.355 ms ✓ |
| Tramos de 45 ms y progreso cada 400 ms (descartado, revertido) | 2.659 ms | 2.403 ms | 3.623 ms |
| Índice `agregados.ventasCliente` (saldo a favor) | **2.683 ms** ✘ | 2.388 ms | 3.385 ms ✓ |

E1 (`@rendimiento` de `movil.spec.ts`): Hoy se pinta **60 ms** después de construir; todo lo demás es construcción.
En Node la construcción en frío baja de 739 a 704 ms. La palanca no cambia la historia (`npm run informe`: 0 FUERA,
0 invariantes rotos, 0 comandos omitidos; la auditoría verifica el índice) y sí la huella del snapshot
(`2aea9b9c…` → `50913256…`, actualizada; `@hash` en WebKit y Firefox en verde).

**Queda para después de la demo**: `ventasDelMes` (≈ 28 ms en Node, ≈ 100 ms con ×4; necesita un índice por mes y
de separados cancelados), validación del celular duplicado (12 ms), `devolucionesDe` (11 ms). Re-medir con la máquina
tranquila antes de concluir: en F2-B, sin carga, `/app` daba 2,21–2,26 s con una construcción equivalente.

## Paso 3 · Suite (acotada por el líder)

- `npm run typecheck`, `npm run lint`: verdes.
- `npx vitest run`: **87 archivos, 1.134 pruebas** en verde.
- `npm run informe` (30/09/2026): 0 FUERA, 0 fallas de invariantes, 0 omitidos, narrativa en verde. Las otras tres
  fechas no se corrieron (la historia no cambió).
- e2e en 1440: los 8 flujos + determinismo + guía + configuración + inicio: **57 en verde** (1 omitida a propósito);
  inicio también en 1366 (28 en total en verde).
- e2e en 390: `movil.spec.ts` 26/26; `fundaciones.spec.ts` y `@hash` en WebKit y Firefox en verde.
- No se corrieron las matrices completas de los 21 paquetes en 1366/1280 (fuera del alcance acotado).

## Commits

`0166a81` typecheck · `4116f3c` dinero de E1, tasas vigentes, divisor · `849ce93` pendientes E · `06cbc49`
`Alerta.origen` · `4b412f0` flujos 1–5 · `adb373d` moneda en Inicio y franja · `6c0ee77` flujos 6–8 · `33a0130` lint ·
`a485cbc` índice de ventas por cliente · `a13d352` e2e de Inicio y de la app · y el de documentación.
