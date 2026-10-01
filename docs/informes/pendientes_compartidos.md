# Cambios compartidos pedidos (oleadas A y B)

Ramas a fusionar: ver cada informe.

## B4 (rama worktree-agent-af7912586ec5485d9, 39538d7)
1. `src/ui/primitivos/Table.tsx` `BotonAccionesFila`: hacerlo `forwardRef` y esparcir props (no sirve como disparador de `<Menu>`); `PaginaSistema` usa el mismo patrón.
2. `src/ui/primitivos/Input.tsx` `InputNumero`: al enfocar pierde la selección y concatena lo escrito (80000+95000 → 8000095000). Conservar selección / seleccionar todo al enfocar.
3. `Table.tsx`: `scrollIntoView` de la fila resaltada se repite en cada render; pasarlo a `useEffect` por cambio de fila.
4. `src/reportes/definiciones.ts` reporte `gastos`: mostrar etiqueta de categoría, no el slug.
5. Hallazgo de dominio: nómina y seguridad social de bodega (`localId: 'bod'`) no entran en `selEstadoResultados` por local; B4 lo compensa con fila "Bodega y gastos generales".

## B2 (rama worktree-agent-a2e21dcd16853093f, ffad3ed)
1. (= B4.1) `BotonAccionesFila` sin forwardRef: el menú no abre.
2. `Table`: si la tabla no cabe a lo ancho, la cabecera fija deja de pegarse bajo la barra superior.
3. `selectores/proveedores.ts` `desempeno()`: excluir importaciones eliminadas y exponer `entregas` (detalle por pedido) en `FichaProveedor` (B2 usa `selEntregas` local con prueba de igualdad).
4. Calibración: Huameng puntual, Weiye la más tardía (enviado a la pista de calibración).

## A4 (rama worktree-agent-a2a22d45e84df69c9, dc1bb38)
1. `Table.tsx`: `desborda` queda en true por medición vieja; observar también la `<table>` (`ro.observe(el.firstElementChild)`), si no la cabecera fija baja 76 px sobre las filas.
2. (= B4.1) `BotonAccionesFila` sin forwardRef.
3. CONTRATOS §14.3: advertirlo o corregirlo.

## A2 (rama worktree-agent-a1959e6d95b7c4d53, 2fd42f5)
1. (= A4.1) cabecera fija de `Table` montada sobre filas cuando hay overflow-x.
2. `src/ui/primitivos/Select.tsx` (Radix) puede llamar `onValueChange('')`: filtrar en el componente compartido.

## B1 (rama worktree-agent-a52b22a451b97a0d0, ff39d46)
1. (= B4.1) `BotonAccionesFila`.
2. `src/styles/tokens.css` `--animate-page-in` con fill-mode `both` crea bloque contenedor para `position: fixed` → DragOverlay del Kanban corrido. Cambiar a `backwards`/`none` y quitar el `<style>` local con `:has()` de B1.
3. `Dialog confirmarAlCerrar` pregunta siempre; debería detectar cambios (o documentar que se pase solo con cambios).
4. Selector compartido de mensajes por origen (evita duplicar `selMensajesImportacion` en A4 y D5).
5. Cifras W4/W12 fuera de guion → enviado a calibración (Oxford: costo $78.647, margen 57 %, sugerido $255.900; W12 sugiere 5 unidades con cobertura 90 días).
6. Cobertura "hasta la siguiente llegada + 30 días" no existe como parámetro de `selSugerenciaPedido`.

## A3 (rama worktree-agent-a3bcdd0f3ea03510c, 88e37d6)
1. `src/reportes/tipos.ts` + `definiciones.ts` (`ventas`) + `BotonExportar`: `FiltrosReporte` con `clienteId | 'consumidor_final'`, `vendedorId` (también dueño), `medio`, `canal`, `estado`, `productoId`; pasarlos a `selVentas`. Prueba: exportar con `?medio=nequi` y comparar total.
2. `rutas.ts` `pos`: parámetro `cliente` (+ resaltar) para abrir el POS con el saldo a favor cargado; A3 pasará `rutas.pos({ cliente })`, A1 debe precargarlo.
3. `rutas.ts` `ventas`: agregar `texto` al query.
4. (= B4.2) `InputNumero`: seleccionar todo al enfocar.
5. `npm run dev` con node_modules enlazado da 403 en la fuente por `@fs` (solo dev con worktree).

## A1 (rama worktree-agent-ac4876801fee9a5d3, 3107223)
1. `GuiaFlotante` (E2): la píldora "Prueba esto" (bottom-6 right-6) tapa "Confirmar venta" en /panel/pos → ocultarla/moverla ahí.
2. `src/ui/texto/Cifra.tsx` `contarDesdeCero` queda en $0 en dev por StrictMode (en build funciona).
3. PLAN 9.4: `<MatrizExistencias modo="pos">` no existe; A1 usa grilla compacta propia. Corregir texto.
4. A3.2: A1 debe precargar `?cliente=` en POS cuando se agregue el parámetro.
