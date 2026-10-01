# Informe F2-B · Estado, selectores, reportes, utilidades, rutas y contratos

Todo en verde en esta máquina (Apple M3, Node 26, Chromium/WebKit/Firefox de Playwright 1.63): `npm run typecheck`, `npm run lint`, `npm test` (44 archivos, 373 pruebas, 22 `todo` explícitos de la pista de calibración, 0 omitidos) y `npm run test:e2e` (21 pasan, 39 omitidos a propósito: las fundaciones solo corren en 1440 × 900). Sin push. Commits `F2-B: …` sobre `main` (3 del agente anterior + 6 de esta sesión).

## Qué se entregó (completo contra 9.2 F2-B)

- **`src/estado/**`**: reloj cuantizado con `?hoy=`; stores `datos`/`sesion`/`guia` (marca personalizada, alertas descartadas, notificaciones leídas; moneda en `sessionStorage`); persistencia con ancla en la primera visita, renovación a los 7 días sin registro, fusión por id y modo memoria; construcción por tramos en el hilo principal (por defecto) o en worker (`?motor=`); sincronización por `BroadcastChannel` (entradas remotas siempre por reconstrucción, toast armado con la entrada); marcos que adoptan el store y el bus del padre; QR compacto (`qr.ts`); `useAcciones` (107 acciones tipadas que generan IDs, `ts`, marca de agua y sobre); hooks `useSel` (instantáneas estables, probado), `useFiltroLocal`, `useMoneda`, `useDinero`, `useMarca`, `usePuede`, `useUsuarioActivo`, `useEvento`, `emitirUI`, `useEntradaRemota`; `reconstruir`, `restaurar`; sin `avanzarReloj`.
- **`src/selectores/**`**: todo el catálogo 6.23 (110 selectores y funciones, con 6 extras: `selProductoPorSlug`, `selTraslados`, `selLiquidaciones`, `selDevolucionesPorVenta`, `selPivote`, `hechosEnFechas`), memoizados por tablas + clave de parámetros; pruebas "selector vs. recálculo ingenuo" (ventas, existencias, comisiones, saldos, resultados, flujo con `proyeccionFlujoEstado`, datáfono, cierres, sugerencia, pivote con no aditivos, hallazgos), verificación de tablas declaradas por Proxy, `selNarrativa` dinámico.
- **`src/reportes/**`**: 13 definiciones únicas (las 12 de 7.15 + "Exportar para tu contador") y 5 plantillas PDF (factura, POS 80 mm, nota crédito, desprendible con nómina electrónica simulada, etiquetas con EAN-13 vectorial); pruebas de filas, totales y valor en caché.
- **`src/lib/**`**: formatos 8.11.3, fechas, moneda, enlaces sin destinatario con sufijo de prueba, descargas, EAN-13 y QR, PDF con Figtree estática embebida (prueba de tildes) y Excel con `{ formula, result }` y `fullCalcOnLoad`.
- **`src/app/**`**: router con las **106 rutas** de 5.5 (lazy con reintento, `HydrateFallback`), guardas de rol, `CargaDatos`, `RequiereDatos`, `NoEncontrada`, `ErrorRuta`; `rutas.ts` con constructores y parsers tipados, **15 `EVENTOS_UI`** con emisor y **23 `PISTAS`** con paquete, ruta y ancla; una página esqueleto por ruta en la carpeta de su paquete.
- **`ui/conectados`**: `<BotonExportar reporte>` y, nuevo, `<BotonDocumentoPdf documento>` (funcionales; F2-C los diseña).
- **`window.__kc`**: estado, `sel`, selectores, acciones (y `accionesDe`), `hashEstado`, `listo`, `urlQr` y, nuevo, `eventosUI()` y `eventosDominio()`.
- **`docs/CONTRATOS.md`**: cómo leer (ejemplos reales), escribir, errores, eventos, cifras y fechas, enlaces, exportar, contexto global, datos de la demo, cómo probar (Vitest, Playwright, `window.__kc`, `?hoy=`), tabla por paquete de 9.4 (carpetas, rutas, parámetros, eventos, pistas, reportes y **PORT**), solo lectura, cómo pedir cambios, DoD, anexos con los 110 selectores (parámetros y resultado) y las 107 acciones.

## Criterio de salida (e2e sobre `vite build` + `vite preview`, servidor gestionado por `webServer`)

| Prueba | Resultado |
|---|---|
| `window.__kc` expone estado, selectores, acciones y la huella | ✓ |
| Las 104 rutas navegables cargan **y recargan** sin errores de consola (4 grupos en paralelo) + ruta inexistente → "no encontrada" | ✓ |
| La carga inicial (`/`, `/panel/inicio`, `/app`) no trae jsPDF ni ExcelJS | ✓ |
| Guarda de rol: el vendedor va a su inicio con el aviso | ✓ |
| Exportar PDF (`%PDF-`…`%%EOF`, Figtree embebida) y Excel releído con ExcelJS (totales `SUM` con resultado en caché, `fullCalcOnLoad` en el XML) + "Exportar para tu contador" (≥ 5 hojas) + eventos `pdf_generado`/`excel_generado` | ✓ |
| Las 5 plantillas PDF se descargan | ✓ |
| Registrar venta → evento con contexto → recargar → sigue ahí | ✓ |
| Dos pestañas: la venta llega a la otra (reconstrucción) con su toast | ✓ |
| Modo memoria con `localStorage` bloqueado | ✓ |
| QR con una venta (≤ 300 caracteres) abre `/app` con la venta en un celular sin datos y limpia el hash | ✓ |
| Determinismo (huella navegador = Node) en Chromium (4 proyectos), **WebKit y Firefox** | ✓ |
| Rendimiento con CPU ×4 (proyecto `rendimiento`) | ✓ (abajo) |

Comandos: `npm run test:e2e` (todo; el proyecto `rendimiento` corre al final), `npm run test:e2e:fundaciones`, `npm run test:e2e:rendimiento`, `npm run medir:arranque -- 5`.

## Mediciones de arranque (Chromium, CPU ×4 con `Emulation.setCPUThrottlingRate`, en frío, 390 × 844)

e2e `rendimiento` (mediana de 5 tras un calentamiento), tres corridas completas:

| Ruta | Primer render útil | Construcción | Presupuesto |
|---|---|---|---|
| `/app` (Hoy con cifras) | **2.211 – 2.259 ms** (rango 2.208–2.298) | ≈ 2.040–2.080 ms | < 2.500 ms ✓ |
| `/panel/inicio` (6 tarjetas) | **2.323 – 2.336 ms** (rango 2.293–2.361) | ≈ 2.065–2.072 ms | < 4.500 ms ✓ |

Desglose por estrategia (`scripts/medir-arranque.mjs`, mediana de 5; el worker simula ×4 con `?lentitudWorker=4` porque CDP no estrangula workers):

| Ruta | Estrategia | Render útil | Inicio construcción | Construcción | Serialización | Transferencia | Render tras estado | Tarea más larga |
|---|---|---|---|---|---|---|---|---|
| `/app` | worker (clonación) | 2.918 | 89 | 2.001 | 0 | 763 | 66 | 681 |
| `/app` | json | 3.380 | 90 | 2.000 | 737 | 441 | 65 | 474 |
| `/app` | **hilo (por defecto)** | **2.277** | 89 | 2.086 | 0 | 0 | 102 | **174** |
| `/panel/inicio` | worker | 2.946 | 89 | 1.992 | 0 | 763 | 94 | 697 |
| `/panel/inicio` | json | 3.408 | 89 | 1.993 | 740 | 447 | 90 | 496 |
| `/panel/inicio` | **hilo** | **2.361** | 89 | 2.080 | 0 | 0 | 193 | **174** |

Node (sin estrangular): construcción de 18 meses 628–712 ms (escala 1); escala 0,9 → 474–592 ms; 0,85 → 460–575 ms.

**Decisión de arranque**: construcción por tramos en el hilo principal (≈ 30 ms por tramo, `scheduler.yield`, progreso cada 150 ms) por defecto; worker como alternativa y respaldo. **`escala` se queda en 1** (el criterio se cumple; bajarla cambia la historia y la calibración). El margen es estrecho (≈ 250 ms en `/app`): antes de sacar jsPDF de la carga inicial las medianas iban de 2,26 a 2,48 s; una corrida con trazas de Playwright dio 2,70 s.

Palancas si F2-C o E1 lo pasan (de menor a mayor impacto en la historia):
1. Índices de construcción en el dominio, sin cambiar la historia (perfil de Node por construcción, ≈ 547 ms): `saldoAFavorCliente` 32 ms (44 llamadas que recorren las 17.000 ventas), `ventasDelMes` 21 ms (20 llamadas), `validarDatosCliente` 12 ms (búsqueda de celular duplicado O(n²)), `devolucionesDe` 6 ms, `idNuevo` 8 ms ⇒ ≈ 14 % (≈ 290 ms con ×4). Requiere agregados mantenidos por `tx.ts` (cambia la huella del snapshot, no la historia) o índices con invalidación explícita; lo debe hacer el dueño del dominio con la prueba de coherencia.
2. Mantener ligera la primera pantalla de `/app` (E1): el render tras el estado ya cuesta 100–190 ms con ×4; no calcular análisis de 18 meses en Hoy.
3. `escala` 0,9 (≈ −13 % de construcción): cambia volúmenes (≈ 15.400 ventas, por debajo de las "16.000+" de A3) y los patrones P1–P22; decisión de la pista de calibración y del líder.

Bundle: JS inicial (index + modulepreload) ≈ 130 KB gzip (< 180 KB). jsPDF (139 KB gz) y ExcelJS (256 KB gz) solo al exportar.

## Conteos

106 rutas (104 navegables probadas con carga y recarga, más `/panel` que redirige y `/panel/_sistema` solo en desarrollo) · 15 `EventoUI` · 23 pistas · 107 acciones (todas las de 6.21) · 110 selectores y funciones · 13 reportes · 5 plantillas PDF · 21 pruebas e2e de F2 (13 de fundaciones, 6 de huella, 2 de rendimiento) · 22 puertos asignados (A1 4301 … E3 4343; compartido 4173; medición 4180).

## Desviaciones (todas en DECISIONES.md y PLAN 11.7)

- Construcción por tramos en el hilo principal por defecto (no en worker): medido, llega antes y no congela.
- `escala` = 1 con margen estrecho; palancas registradas.
- `?hoy=` usa `localStorage` con claves `kc:halden:v1:qa:*` en vez de forzar el modo memoria (no mezcla registros y permite probar la recarga).
- `vite.config.ts` con `codeSplitting.groups` y un grupo `precarga`: con `manualChunks`, rolldown metía el ayudante de precarga de Vite en el chunk de jsPDF y **toda** ruta descargaba y evaluaba jsPDF al arrancar (contra 5.15). Un e2e lo vigila.
- `<BotonDocumentoPdf>` para las plantillas (el desprendible de C1 no es una definición de reporte).
- `window.__kc.eventosUI()` y `eventosDominio()`.
- Playwright: `npx vite build && npx vite preview --port $PORT --strictPort` (sin `tsc`, que es un paso propio); proyecto `rendimiento` sin trazas, al final por dependencias; `esperarDatos` sondea por intervalo.
- QR compacto; selectores extra; optimizaciones del generador sin cambiar la huella (del agente anterior).

## Riesgos y pendientes

- **Intermitencia observada** (3 veces en ≈ 10 corridas de las fundaciones, solo con mucha carga en paralelo): tras una carga o recarga, la página quedó completa, visible y con datos, pero `window.__kc` no apareció en 30 s. Se agregó el estado de la instalación (`window.__kcInstalacion`: importando / instalado / error) y los recursos al mensaje de error de `esperarDatos`; desde entonces, 3 corridas completas de `npm run test:e2e` y 2 de las fundaciones en verde. Si reaparece, el mensaje dice si la importación diferida de `estado/kc` quedó colgada o falló.
- `scripts/presupuesto.mjs` (5.15: fallar el build si un chunk pasa del presupuesto) no existe; hoy el único guardián es el e2e de la carga inicial.
- Los 22 `it.todo` son de la pista de calibración (P5, P11, P13, P14, P15, P18 y puntuales).

## Lo que F2-C debe saber

- **API estable**: F2-C diseña sin cambiar firmas. Reemplaza el diseño de `BotonExportar` y `BotonDocumentoPdf` (mantener `data-testid="exportar-<id>"`/`"documento-<tipo>"` y `data-formato`), `CargaDatos` (mantener `data-testid="carga-datos"`), `NoEncontrada` (`no-encontrada`), `ErrorRuta` (`error-ruta`), `AvisosGlobales` → Toast (mantener `data-testid="avisos"` y que el aviso de la guarda y el toast remoto lleguen ahí), y los layouts (mantener `selector-rol`, `selector-local`, `selector-moneda`, `franja-rol`, `layout-movil`; las pruebas de fundaciones los usan). `EsqueletoPagina` (`pagina-esqueleto`) desaparece cuando cada paquete reemplaza su página; la prueba de rutas espera `pagina-esqueleto`, `entrada` y `app-hoy`: al cerrar F2-C y en cada oleada, el líder debe ajustar esa prueba a un marcador común de página (sugerencia: que el layout ponga `data-testid="pagina"` en `<main>`).
- El layout honra `?resaltar=rol|moneda` y emite `moneda_cambiada` y `rol_cambiado` (con `{ a }`); el escuchador del toast remoto usa `useEntradaRemota`.
- `<Dinero>`, `<Fecha>`, `<Cifra>`, `<GraficoDinero>` deben usar `useDinero()` y `lib/formato` (no reimplementar formatos). `<Pista id>` debe tipar `id` con `IdPista` de `rutas.ts` y leer el texto de `PISTAS_TEXTOS`. `<ResaltarFila>` lee `resaltar` con `useParamsRuta`.
- **Rendimiento**: el primer render de `/app` está a ≈ 250 ms del presupuesto. Las fuentes autohospedadas, el CSS de tokens y el layout móvil no deben bloquear la construcción: nada pesado en el chunk inicial (hoy ≈ 130 KB gz), registro del service worker después de construir (ya está), y correr `npm run test:e2e:rendimiento` al cerrar.
- `/panel/_sistema` existe solo en desarrollo (`src/ui/sistema/PaginaSistema.tsx`, F2-C la llena).
- El `HydrateFallback` de las rutas raíz es `null` (sin parpadeo ni aviso en consola); si F2-C quiere un armazón durante la primera carga de un chunk, va ahí.
