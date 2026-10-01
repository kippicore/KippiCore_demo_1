# Cambios compartidos pedidos (oleadas A y B)

Aplicados en una sola sesión el 01/10/2026 (integrador). Detalle en `docs/informes/compartidos_AB.md`; decisiones en `docs/DECISIONES.md`; contratos en `docs/CONTRATOS.md` (§5, §6.1, §10, §14.2, §14.3, §14.3.1, Anexo A y registro).

## B4 (rama worktree-agent-af7912586ec5485d9, 39538d7)
1. `src/ui/primitivos/Table.tsx` `BotonAccionesFila`: hacerlo `forwardRef` y esparcir props (no sirve como disparador de `<Menu>`); `PaginaSistema` usa el mismo patrón. — **HECHO** (`forwardRef` + `...resto`; `/panel/_sistema` abre el menú; prueba en `src/ui/primitivos/compartidos.test.tsx`; los botones locales de B1, B2, B3, A4 y B4 se cambiaron por el compartido).
2. `src/ui/primitivos/Input.tsx` `InputNumero`: al enfocar pierde la selección y concatena lo escrito (80000+95000 → 8000095000). Conservar selección / seleccionar todo al enfocar. — **HECHO** (selecciona todo tras el cambio de formato; prueba de componente).
3. `Table.tsx`: `scrollIntoView` de la fila resaltada se repite en cada render; pasarlo a `useEffect` por cambio de fila. — **HECHO** (efecto por clave de la fila resaltada; prueba).
4. `src/reportes/definiciones.ts` reporte `gastos`: mostrar etiqueta de categoría, no el slug. — **HECHO** (`config/textos/categorias.ts`; también el reporte `cuentas`).
5. Hallazgo de dominio: nómina y seguridad social de bodega (`localId: 'bod'`) no entran en `selEstadoResultados` por local; B4 lo compensa con fila "Bodega y gastos generales". — **HECHO** (con `prorratear`, la bodega se reparte como gasto compartido y entrega los suyos; la fila "Bodega" de B4 desaparece al repartir).

## B2 (rama worktree-agent-a2e21dcd16853093f, ffad3ed)
1. (= B4.1) `BotonAccionesFila` sin forwardRef: el menú no abre. — **HECHO**.
2. `Table`: si la tabla no cabe a lo ancho, la cabecera fija deja de pegarse bajo la barra superior. — **HECHO** (con desborde, cabecera en `top: 0`: queda en su sitio, sin pegarse; documentado en CONTRATOS §14.2).
3. `selectores/proveedores.ts` `desempeno()`: excluir importaciones eliminadas y exponer `entregas` (detalle por pedido) en `FichaProveedor`. — **HECHO** (`FichaProveedor.entregas: EntregaProveedor[]`; `pedidosRecibidos` del comparativo sale de ahí; prueba). El `selEntregas` local de B2 se deja: tiene campos propios y su prueba ya lo compara con el compartido.
4. Calibración: Huameng puntual, Weiye la más tardía (enviado a la pista de calibración). — **HECHO** por la calibración (P14).

## A4 (rama worktree-agent-a2a22d45e84df69c9, dc1bb38)
1. `Table.tsx`: `desborda` queda en true por medición vieja; observar también la `<table>`. — **HECHO** (el `ResizeObserver` observa el contenedor y la tabla).
2. (= B4.1) `BotonAccionesFila` sin forwardRef. — **HECHO** (`BotonFila` de A4 retirado).
3. CONTRATOS §14.3: advertirlo o corregirlo. — **HECHO** (corregido; la receta de §14.3 usa `BotonAccionesFila` en `accionesFila`).

## A2 (rama worktree-agent-a1959e6d95b7c4d53, 2fd42f5)
1. (= A4.1) cabecera fija de `Table` montada sobre filas cuando hay overflow-x. — **HECHO**.
2. `src/ui/primitivos/Select.tsx` (Radix) puede llamar `onValueChange('')`: filtrar en el componente compartido. — **HECHO**.

## B1 (rama worktree-agent-a52b22a451b97a0d0, ff39d46)
1. (= B4.1) `BotonAccionesFila`. — **HECHO** (contactos de la cadena usan el compartido).
2. `src/styles/tokens.css` `--animate-page-in` con fill-mode `both` crea bloque contenedor para `position: fixed`. Cambiar a `backwards`/`none` y quitar el `<style>` local con `:has()` de B1. — **HECHO** (`backwards`; `<style>` retirado; e2e "arrastrar un pedido a otra fase" en verde).
3. `Dialog confirmarAlCerrar` pregunta siempre; debería detectar cambios (o documentar que se pase solo con cambios). — **HECHO** (documentado: booleano calculado; CONTRATOS §14.2). La detección automática se DESCARTÓ: chocaría con los formularios que ya calculan sus cambios con estado que no son campos.
4. Selector compartido de mensajes por origen (evita duplicar `selMensajesImportacion` en A4 y D5). — **HECHO** (`selMensajes({ origenId?, tipos?, destinatarioId? })`; B1 ya lo compone).
5. Cifras W4/W12 fuera de guion → enviado a calibración. — **HECHO** (W4 por la calibración; W12 por el arreglo de `selSugerenciaPedido`, ver calibración 1).
6. Cobertura "hasta la siguiente llegada + 30 días" no existe como parámetro de `selSugerenciaPedido`. — **DESCARTADO** como cambio compartido: el selector recibe `coberturaDias`; si B1 quiere ese atajo, lo calcula en su pantalla con `selLlegadasProximas`.

## A3 (rama worktree-agent-a3bcdd0f3ea03510c, 88e37d6)
1. `FiltrosReporte` con `clienteId | 'consumidor_final'`, `vendedorId` (también dueño), `medio`, `canal`, `estado`, `productoId`; pasarlos a `selVentas`; `BotonExportar`. Prueba: exportar con `?medio=nequi` y comparar total. — **HECHO** (también `texto`; una sola regla `coincideFiltroVentas`/`hechosFiltrados`; la pantalla de Ventas pasa su filtro; prueba en `reportes.test.ts`).
2. `rutas.ts` `pos`: parámetro `cliente` para abrir el POS con el saldo a favor cargado. — **HECHO** (`rutas.pos({ cliente })`; `resaltar` no se agregó: nada en el POS lo usaría).
3. `rutas.ts` `ventas`: agregar `texto` al query. — **HECHO** (la búsqueda viaja a la URL; e2e).
4. (= B4.2) `InputNumero`: seleccionar todo al enfocar. — **HECHO**.
5. `npm run dev` con node_modules enlazado da 403 en la fuente por `@fs` (solo dev con worktree). — **DESCARTADO**: es del entorno de los worktrees (`server.fs.allow` de Vite); no ocurre en el repo principal ni con `vite preview`.

## A1 (rama worktree-agent-ac4876801fee9a5d3, 3107223)
1. `GuiaFlotante` (E2): la píldora "Prueba esto" (bottom-6 right-6) tapa "Confirmar venta" en /panel/pos → ocultarla/moverla ahí. — **PARA E2** (anotado en CONTRATOS §10, fila E2, y §14.3.1).
2. `src/ui/texto/Cifra.tsx` `contarDesdeCero` queda en $0 en dev por StrictMode. — **HECHO** (prueba con `StrictMode`).
3. PLAN 9.4: `<MatrizExistencias modo="pos">` no existe. Corregir texto. — **HECHO**.
4. A3.2: A1 debe precargar `?cliente=` en POS cuando se agregue el parámetro. — **HECHO** (cliente y saldo a favor: el saldo paga lo que alcance y el resto en efectivo hasta que se toque el pago; e2e y prueba del reductor).

## Calibración (rama worktree-agent-a141b589a87802ec9, 79a15cb)
1. `selSugerenciaPedido`: no descuenta lo que se vende durante la espera. — **HECHO** (fórmula propuesta; Huameng 90 días: 2.380 prendas, Oxford 290; prueba de credibilidad y relevancia; PLAN 6.20.13).
2. Separado creado y cancelado en el mismo periodo: excluir en `hechosDeVenta`/`resumirHechos`. — **HECHO** (mismo mes calendario; regla independiente del rango consultado; prueba).
3. Escala 1,5: punto bajo de diciembre alto (≈$54 M). — **PARCIAL**: con el flujo nuevo baja a ≈ $ 37 M; sigue fuera de rango porque la escala 1,5 no está calibrada (también P2, P5 y P11 salen FUERA con 1,5). No es de las 4 fechas.
4. Patrones cerca del borde: correr `npm run informe` tras cualquier cambio del generador. — **HECHO** (4 fechas, 0 FUERA, 0 invariantes rotos, narrativa en verde).

## B3 (rama worktree-agent-a80a1fb01076e2511, d9f95fe)
1. (= B4.1) `BotonAccionesFila`. — **HECHO** (`BotonMas` retirado).
2. (= A4.1) cabecera fija de `Table` con overflow-x. — **HECHO** (se eligió `top: 0` con desborde, no `overflow-x: clip` siempre: `clip` escondería columnas sin forma de verlas).
3. (= B4.2) `InputNumero` concatena. — **HECHO** (el `escribirNumero` del e2e de B3 sigue funcionando; ya no hace falta).
4. Opcional `GraficoBase`: marcar punto bajo y clic. — **PENDIENTE (opcional)**: no se tocó; con la vista por defecto nueva el punto bajo ya se distingue. Queda para una pasada de pulido.
5. Flujo: la proyección sube a ≈$800 M; revisar credibilidad; decidir vista por defecto. — **HECHO** (pedidos futuros, otros gastos, retiros prudentes del socio y cobros desestacionalizados; 30/09: $ 122 M → $ 17 M → $ 285 M; vista por defecto = la más corta que contiene el punto bajo).
6. No hay comando para eliminar cuentas de caja/banco. — **PENDIENTE (dominio)**: hace falta un comando nuevo `cuenta.eliminar` (con la regla de no eliminar una cuenta con movimientos o saldo); no se pidió en esta sesión. Candidato para E3 (Configuración).
