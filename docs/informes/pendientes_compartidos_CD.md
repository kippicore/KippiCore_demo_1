# Cambios compartidos pedidos (oleadas C y D)

## D1 (worktree-agent-accc14e687f25ed67, 3892b8f)
1. `GraficoBase`: con US$/CN¥ la etiqueta del eje Y se corta ("US$ 8 mil"); calcular ancho según formato o subir `YAxis width` 56→64.
2. `GraficoBase`: cambio casi simultáneo de local y moneda deja barras sin pintar (D1 lo mitiga con `key`).
3. `selAlertas`: aprobaciones enlazan a `/app/mas/aprobar` (sacan al dueño del escritorio) y ocupan las 3 primeras posiciones; en escritorio deben ir a una ruta de escritorio (p. ej. POS/caja o ventas con la solicitud) y limitar cuántas "Nuevo" van arriba, para que el stock bajo (W2) y la importación (W3) estén visibles.
4. `selSinMovimiento` sin `localId` (D1 usa `selDormidosInicio` local); mover a selectores/inventario.ts.
