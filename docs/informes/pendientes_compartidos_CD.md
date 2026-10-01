# Cambios compartidos pedidos (oleadas C y D)

Estado al 01/10/2026 (integrador, informe `docs/informes/compartidos_CD.md`): **HECHO** / **DESCARTADO** con su porqué.

## D1 (worktree-agent-accc14e687f25ed67, 3892b8f)
1. `GraficoBase`: con US$/CN¥ la etiqueta del eje Y se corta ("US$ 8 mil"); calcular ancho según formato o subir `YAxis width` 56→64. — **HECHO**: `anchoEjeY` mide la etiqueta más larga (prueba en `compartidos.test.tsx`).
2. `GraficoBase`: cambio casi simultáneo de local y moneda deja barras sin pintar (D1 lo mitiga con `key`). — **HECHO**: las series se montan de nuevo cuando cambia la escala; se retiró el `key` de D1.
3. `selAlertas`: aprobaciones enlazan a `/app/mas/aprobar` (sacan al dueño del escritorio) y ocupan las 3 primeras posiciones; en escritorio deben ir a una ruta de escritorio (p. ej. POS/caja o ventas con la solicitud) y limitar cuántas "Nuevo" van arriba, para que el stock bajo (W2) y la importación (W3) estén visibles. — **HECHO**: anulación → detalle de la venta; descuento → se aprueba en la misma alerta (`Alerta.aprobacion`) con enlace a la prenda (no existe pantalla de escritorio para aprobar descuentos); 2 "Nuevo" como máximo arriba; W2, W11 y W3 entre las cinco (prueba unitaria y e2e).
4. `selSinMovimiento` sin `localId` (D1 usa `selDormidosInicio` local); mover a selectores/inventario.ts. — **HECHO**: `selSinMovimiento({ localId })`; D1 lo compone.

## D6 (worktree-agent-a125cb96a81f25694, ae9e86c)
1. `src/layouts/tienda/LayoutTienda.tsx`: contador de bolsa fijo en 0 → usar `useCantidadBolsa()` de `@/tienda/publico`; luego retirar el parche `useContadorEnEncabezado()` de `src/tienda/enlaces.ts`. — **HECHO** (parche retirado de las seis páginas).
2. Mismo layout: íconos buscar/tiendas/cuenta/favoritos sin acción (botones muertos) y enlaces del header que no conservan `?marco=1`. — **HECHO**: buscador del catálogo, "Tiendas" baja al pie con direcciones, paneles de cuenta y favoritos; logo, categorías y bolsa con `conMarco` (e2e nuevo).
3. Exportar `FilaCambio` desde `@/ui/ligero`. — **HECHO** (Pedido de la tienda lo importa de ahí).

## D3 (worktree-agent-a226bf46d4a0beaf6, a318480)
1. Comando `notaCredito.avanzarEstado` (acción `avanzarEstadoNotaCredito` { notaId, estado: 'enviada'|'aceptada' }, evento `NotaCreditoEstado`); retirar el avance en memoria de D3. — **HECHO** (catálogo de 108 comandos; avance en memoria y reloj de la pestaña retirados; e2e verifica el estado del dominio y los dos eventos).
2. `src/reportes/plantillas-pdf.ts` `emisor()`: con marca personalizada usar el nombre de la marca activa como razón social (hoy "Halden Moda Masculina S.A.S. (<negocio>)"). — **HECHO** ("<negocio> · razón social de ejemplo", como la vista previa; prueba).
3. Opcional: `rutas.facturacion({ tipo })` con valor para notas crédito. — **HECHO** (`?tipo=notas`; D3 lo refleja en la URL).

## D2 (worktree-agent-a2b20e48cdd9aa6fc, c51fa2f)
1. Hallazgos con dinero en palabras (no convierte moneda): `Hallazgo` debe traer `cifras` en COP para armar la frase con `<Dinero>`. — **HECHO**: `cifras` y `partes` + `<FraseConDinero>` en D1 y D2 (e2e con US$). Se extendió a las alertas (`tituloPartes`, `contextoPartes`).
2. CONTRATOS §10: documentar `?vista=` de analisis (hallazgos|proyeccion|meses|calor|semanas), `?resaltar=` de analisisProductos, `?vista=<ejemplo>` de tablaDinamica. — **HECHO**.
3. **Datos (calibración)**: Valentina como estrella indiscutible y calzado como la categoría dormida evidente. — **HECHO** en el generador (`versionGenerador` 4; patrones `P2.lider30/90` y `P5.primera` en verde en las 4 fechas). Además, los hallazgos ponderan el guion para que ambos queden entre los cinco que se muestran.

## C3 (worktree-agent-a5008f498bd27ea2d, 249147a)
1. `selEventosCalendario`/`selProximosEventos`: título de vencimientos con monto formateado en pesos → `EventoVista` con `monto: COP | null`, `montoOrigen`, título solo concepto. — **HECHO** (Inicio lo pinta con `<Dinero>`).
2. Mover `obligacionesIlustrativas` a `src/dominio/reglas/` y usarla en el selector compartido. — **HECHO** (`dominio/reglas/obligaciones.ts`; la agenda de C3 consume las del selector compartido).
3. Título corto de llegadas: "IMP-2026-07 · Llega a bodega". — **HECHO** (contenido en `detalle`).
4. Recordatorios (`recordatorioMin`) visibles en Inicio y /app (D1/E1). — **HECHO** en el selector (`EventoVista.recordatorioMin`) y en Inicio ("Aviso 1 hora antes"); en `/app` es de E1 (anotado en CONTRATOS §14.3.2).

## C1 (worktree-agent-ac2170c76f19d8363, 29dabdf)
1. `Badge` no acepta `data-testid`; `SelectorFecha` no permite borrar fecha opcional. — **HECHO** (`Badge`/`BadgeEstado` con `data-testid`; `SelectorFecha alBorrar`; C1 deja su `span` y su botón propio).
2. Datos: Sebastián "este mes" ≈ $4,66 M (guion "cerca de $4,2 M") — aceptable; actualizar el guion/GUIA_DEMO con la cifra real. — **HECHO** en PLAN (2.1 y W6: "cerca de $ 4,6 millones", comisión ≈ $ 843.000). `config/textos/guia.ts` es de E2 (anotado en CONTRATOS §14.3.2).
3. Sembrar algún contratista con PILA verificada. — **HECHO** (Hernando y Alejandro, el día 12 de cada mes; Daniela y Juliana siguen sin soporte por P22).
4. Unificar barra de pestañas de Personal (C1) y Turnos (C2) al fusionar. — **HECHO** (`PESTANAS_PERSONAL`).
5. Vista previa de nómina ≈ 1 s (recalcula ventas del mes): optimizar si molesta. — **DESCARTADO** en esta sesión: no está entre las prioridades y el e2e de C1 pasa; queda para la revisión de rendimiento.
6. Liquidación final (`selLiquidacionFinal`) sin pantalla (complemento). — **DESCARTADO**: es una pantalla de C1, no un cambio compartido; el selector existe para quien la haga.

## D5 (worktree-agent-a78270023939d8f26, 5ea88e3)
1. `rutas.ts` `canalInstagram`: query `{ escenario: texto }`; luego conectar la selección de Instagram a la URL. — **HECHO** (e2e nuevo).
2. Instagram: no hay campo para escribir comentarios (solo guion). — **DESCARTADO**: mejora dentro del módulo de D5, no compartida; el guion cubre el comentario "precio?".

## C2 (worktree-agent-a4514dfe7eeebc61f, c0892c2)
1. `src/config/turnos.ts`: exportar `franjaDeTurno(tipo, localId)`. — **HECHO** (sale de la plantilla, sin ids escritos a mano; C2 la usa).
2. `selRecargosTurnos`: devolver `valorNocturno` y `valorDominical` por persona. — **HECHO** (C2 deja `repartirRecargo`).
3. `Checkbox` y `Dinero` no reenvían `data-testid`. — **HECHO** para `Checkbox` (va al control con `role="checkbox"`); `Dinero` ya lo reenviaba (verificado, sin cambio).
4. Datos: las 3 novedades sembradas son pasadas → sembrar al menos una vigente/próxima. — **HECHO** (incapacidad de Julián Torres de ayer a mañana; vacaciones de Santiago Rojas la semana siguiente).
