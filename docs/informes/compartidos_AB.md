# Informe · Cambios compartidos de las oleadas A y B

Integrador, 01/10/2026, rama `main` (sin push). Una sola sesión sobre `docs/informes/pendientes_compartidos.md` (cada ítem queda marcado HECHO / DESCARTADO / PARA E2 / PENDIENTE con su porqué). Decisiones en `docs/DECISIONES.md` (10 entradas "Compartidos A-B"); contratos en `docs/CONTRATOS.md` (§5, §6.1, §10, §14.2, §14.3, §14.3.1 nueva para C, D y E, Anexo A y registro).

## 1. Componentes compartidos (`src/ui`, `src/styles`)

| Defecto | Arreglo | Parche local retirado |
|---|---|---|
| `BotonAccionesFila` no servía de disparador de `<Menu>` (también en `/panel/_sistema`) | `forwardRef` y `...resto` sobre el `<button>` | `BotonMas` (B3), `BotonFila` (A4), `BotonMasAcciones` (B2), botón `soloIcono` de contactos (B1), `BotonIcono` de filas (B4). A2 y A3 ya lo usaban (y su menú no abría) |
| Cabecera fija de `Table` montada 76 px sobre las filas con desborde horizontal | Con desborde la cabecera usa `top: 0` (queda en su sitio; no se pega al hacer scroll vertical). El `ResizeObserver` observa también la `<table>` | — (los módulos que dimensionaron para 1280 conservan la cabecera fija) |
| `scrollIntoView` de la fila resaltada en cada render | `useEffect` por clave de la fila resaltada | — |
| `InputNumero` concatenaba (80.000 + "95000") | Selecciona todo al enfocar, también tras el cambio de formato; acepta `ref` | Los `escribirNumero` de los e2e siguen funcionando; ya no hacen falta |
| `Select` entregaba `''` | Se filtra en el componente | — |
| `--animate-page-in` con `both` (DragOverlay corrido) | `backwards` | `<style>` con `:has()` del tablero de importaciones |
| `Cifra contarDesdeCero` en $ 0 con StrictMode | La limpieza deja el valor visible y el segundo efecto se reconoce como la misma primera vez | — |
| `Dialog confirmarAlCerrar` preguntaba siempre | Documentado como booleano calculado ("hay cambios") | — |

Pruebas nuevas: `src/ui/primitivos/compartidos.test.tsx` (forwardRef, selección de `InputNumero`, desplazamiento único de la fila, `Cifra` en StrictMode). Fallaban con el código anterior (verificado).

## 2. Dominio, selectores y reportes

- **Separados cancelados**: uno creado y cancelado en el mismo mes calendario no genera hechos de venta (ni venta ni cancelación); si se cancela en un mes posterior rige V4. La regla no depende del rango consultado (la primera versión, "si ambos caen en el rango", descuadraba Inicio, que arma el mes desde un rango más ancho). "Ventas detalladas" muestra 0 y "Separado cancelado" y suma lo mismo que `selVentas.totales.ventas`.
- **Reporte `ventas` con todos los filtros**: `FiltrosReporte` suma `clienteId`, `medio`, `canal`, `estado`, `texto`; `vendedorId` aplica también al dueño. Una sola regla (`coincideFiltroVentas`, `hechosFiltrados`) para la lista y el reporte; `BotonExportar` los acepta y Ventas le pasa su filtro. Prueba con `medio: 'nequi'` y combinaciones.
- **Etiquetas de categoría** en los reportes `gastos` y `cuentas` (`config/textos/categorias.ts`, que también usan B3 y B4).
- **Proveedores**: `desempeno()` sin importaciones eliminadas y con `FichaProveedor.entregas` (detalle por pedido); prueba que borra una importación.
- **Estado de resultados**: con `prorratear`, la nómina, la seguridad social y el arriendo de la bodega se reparten como gasto compartido y la bodega entrega los suyos (utilidad 0); los tres locales suman el negocio. B4 ya no muestra "Bodega" sin asignar al repartir (textos de ayuda actualizados).
- **`selSugerenciaPedido`** descuenta lo que se vende durante la espera: demanda = rotación × (espera + cobertura) × estacionalidad de [hoy, llegada + cobertura] − existencias − en camino (`semanasEspera` nuevo en el resultado). Huameng con 90 días al 30/09: **antes 620 prendas (Oxford 30) → ahora 2.380 (Oxford 290: S 55 · M 95 · L 80 · XL 50 · XXL 10), US$ 21.003, ≈ $ 83 M, margen 67 %**; con 120 días 2.800. Prueba de credibilidad (entre 1 y 6 meses de rotación) y relevancia (Oxford en el top 5, M > S).
- **`selMensajes`** (bandeja de salida por origen o destinatario) para A4, B1 y D5; B1 ya lo compone.

## 3. Flujo de caja creíble (W5)

Faltaban tres egresos que un comerciante real tiene, y la base de ventas no estaba desestacionalizada:

1. **Reposición de mercancía** (`egresosPedidosFuturos`): los pedidos a fábricas que aún no se han hecho, al ritmo de cada una (intervalo promedio de sus últimos pedidos) y con su tamaño (FOB promedio de los tres últimos), o el que está en "Cotizado". Se proyectan anticipo, saldo, flete, tributos, agente y transporte en sus fechas estimadas, con "(estimado)" en el concepto; no se reprograman (B3 dice por qué).
2. **Otros gastos** no recurrentes: promedio de los tres meses cerrados, cada lunes.
3. **Retiros del socio**, días 1 y 16: lo que pase del techo ($ 160 M) hasta el colchón ($ 90 M), **prudentes**: nunca dejan que lo de los próximos 120 días baje del piso ($ 40 M, por encima del punto bajo de P19). La regla (`RETIRO_SOCIO`, `config/negocio.ts`) la aplica también el generador a la historia, así la línea real y la proyectada se comportan igual; la calibración de P19 ajusta contra la serie sin retiros.
4. **Cobros desestacionalizados**: cada cobro de las últimas 8 semanas se divide por el índice de su mes (en enero se proyectaban las ventas de diciembre como si fueran de enero).

Los movimientos se arman a 120 días y se recortan a la vista: 30, 60 y 90 días son la misma proyección. **Vista por defecto**: la más corta que contiene el punto bajo de los 90 días (30/09 y 14/06 → 30 días; 20/01 → 60; 19/12 → 90).

Cifras (saldo hoy → punto bajo → saldo a 90 días; máximo de la línea), en millones:

| Fecha | Antes | Ahora |
|---|---|---|
| 30/09/2026 | 96 → 18 (15/10) → **693**; máx. 693 (≈ 800 en W5) | 122 → **17** (15/10) → 285; máx. 314 |
| 19/12/2026 | 90 → 18 (15/03) → 41; máx. 203 | 167 → **14** (15/03) → 43; máx. 307 |
| 20/01/2027 | 20 → 20 (hoy) → **888**; máx. 888 | 320 → **17** (21/03) → 112; máx. 348 |
| 14/06/2027 | 50 → 19 (16/06) → 252; máx. 252 | 44 → **18** (16/06) → 151; máx. 219 |

Explicación del punto bajo al 30/09 (la escribe el selector): "La plata baja a $ 17 millones en 2 semanas porque la semana del 12/10 pagas el Saldo 70 % IMP-2026-09 · Hangzhou Lanxin (US$ 14.700,77), Tributos aduaneros IMP-2026-08 ($ 27,5 millones) y Anticipo 30 % del próximo pedido a Wenzhou Ruifeng (estimado) ($ 23,3 millones)."

Lo cobrado proyectado de oct.–dic. 2026 (≈ $ 1.330 M netos) coincide con lo que el generador realmente cobra ese trimestre ($ 1.344 M brutos); el pico de fin de diciembre es el de la historia del propio negocio (el 31/12/2025 tenía ≈ $ 427 M antes del retiro del 1.º de enero). `versionGenerador` 3; huella del determinismo actualizada (la misma en UTC, Tokio, Los Ángeles y en Chromium, WebKit y Firefox). El generador cuesta ≈ 50 ms más en frío (706 → 763 ms).

## 4. Rutas

- `rutas.pos({ cliente })`: A1 abre la venta con ese cliente; con saldo a favor, el saldo paga lo que alcance y el resto queda en efectivo hasta que se toque el pago. El parámetro se consume; un id inexistente avisa y abre con Consumidor final. A3 lo usa en "Abrir el punto de venta" al terminar un cambio. `resaltar` no se agregó (nada lo usaría en el POS).
- `rutas.ventas({ texto })`: la búsqueda de la lista viaja a la URL; "Limpiar filtros" la borra.

## 5. Otros

- PLAN 9.4 describe la grilla compacta propia del POS; PLAN 6.20.9, 6.20.10 y 6.20.13 al día.
- `eslint.config.js` ignora `.claude` (los worktrees de los agentes rompían `npm run lint`).
- Dos e2e tenían cifras del generador fijas a mano y fallaban desde la calibración (no por esta sesión; comprobado en `cf3fd46`): W11 (esperado y contado de Zona Rosa) y el total de VIP de Clientes. Ahora salen de los selectores.

## Verificación

- `npm run typecheck` y `npm run lint`: en verde.
- `npx vitest run`: 63 archivos, **750 pruebas** en verde; `npm run test:tz`: 738 × 3 en verde.
- `npm run informe -- --ancla` 30/09/2026, 19/12/2026, 20/01/2027 y 14/06/2027: 0 patrones FUERA, 0 invariantes rotos, 0 comandos omitidos, narrativa en verde; P19 = 17,0 · 14,3 · 16,8 · 18,4 M.
- e2e con un `vite preview` compartido en 4173 (detenido al terminar), `--workers=2`: fundaciones y los 8 paquetes (pos, inventario, ventas, clientes, importaciones, proveedores, pagos, gastos) en **1440 y 1366**, todos en verde (1440: 39 + 46 + 32 + 35 pruebas, con los dos e2e corregidos repetidos y pos + clientes completos otra vez, 36 en verde; 1366: 67 + 70); determinismo `@hash` en 1440, WebKit y Firefox.

## Para E2 y otras oleadas

- **E2**: la píldora de `GuiaFlotante` tapa "Confirmar venta" en `/panel/pos` (anotado en CONTRATOS §10 y §14.3.1).
- **E3 / dominio**: no existe `cuenta.eliminar` (B3.6).
- **Pulido**: marcar el punto bajo como punto y reaccionar al clic en `GraficoBase` (B3.4, opcional).
- **Escala 1,5** sin calibrar: el punto bajo de diciembre baja de ≈ $ 54 M a ≈ $ 37 M pero sigue fuera de rango (con P2, P5 y P11).
- C, D y E: leer CONTRATOS §14.3.1 (menús de fila con `BotonAccionesFila`, separados cancelados, nuevos tipos de movimiento del flujo, bodega en resultados, `selMensajes`, rutas nuevas).
