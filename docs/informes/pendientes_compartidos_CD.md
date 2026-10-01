# Cambios compartidos pedidos (oleadas C y D)

## D1 (worktree-agent-accc14e687f25ed67, 3892b8f)
1. `GraficoBase`: con US$/CN¥ la etiqueta del eje Y se corta ("US$ 8 mil"); calcular ancho según formato o subir `YAxis width` 56→64.
2. `GraficoBase`: cambio casi simultáneo de local y moneda deja barras sin pintar (D1 lo mitiga con `key`).
3. `selAlertas`: aprobaciones enlazan a `/app/mas/aprobar` (sacan al dueño del escritorio) y ocupan las 3 primeras posiciones; en escritorio deben ir a una ruta de escritorio (p. ej. POS/caja o ventas con la solicitud) y limitar cuántas "Nuevo" van arriba, para que el stock bajo (W2) y la importación (W3) estén visibles.
4. `selSinMovimiento` sin `localId` (D1 usa `selDormidosInicio` local); mover a selectores/inventario.ts.

## D6 (worktree-agent-a125cb96a81f25694, ae9e86c)
1. `src/layouts/tienda/LayoutTienda.tsx`: contador de bolsa fijo en 0 → usar `useCantidadBolsa()` de `@/tienda/publico`; luego retirar el parche `useContadorEnEncabezado()` de `src/tienda/enlaces.ts`.
2. Mismo layout: íconos buscar/tiendas/cuenta/favoritos sin acción (botones muertos) y enlaces del header que no conservan `?marco=1`.
3. Exportar `FilaCambio` desde `@/ui/ligero`.

## D3 (worktree-agent-a226bf46d4a0beaf6, a318480)
1. Comando `notaCredito.avanzarEstado` (acción `avanzarEstadoNotaCredito` { notaId, estado: 'enviada'|'aceptada' }, evento `NotaCreditoEstado`); retirar el avance en memoria de D3.
2. `src/reportes/plantillas-pdf.ts` `emisor()`: con marca personalizada usar el nombre de la marca activa como razón social (hoy "Halden Moda Masculina S.A.S. (<negocio>)").
3. Opcional: `rutas.facturacion({ tipo })` con valor para notas crédito.
