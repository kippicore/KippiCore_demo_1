# Cambios compartidos pedidos (oleadas A y B)

Ramas a fusionar: ver cada informe.

## B4 (rama worktree-agent-af7912586ec5485d9, 39538d7)
1. `src/ui/primitivos/Table.tsx` `BotonAccionesFila`: hacerlo `forwardRef` y esparcir props (no sirve como disparador de `<Menu>`); `PaginaSistema` usa el mismo patrón.
2. `src/ui/primitivos/Input.tsx` `InputNumero`: al enfocar pierde la selección y concatena lo escrito (80000+95000 → 8000095000). Conservar selección / seleccionar todo al enfocar.
3. `Table.tsx`: `scrollIntoView` de la fila resaltada se repite en cada render; pasarlo a `useEffect` por cambio de fila.
4. `src/reportes/definiciones.ts` reporte `gastos`: mostrar etiqueta de categoría, no el slug.
5. Hallazgo de dominio: nómina y seguridad social de bodega (`localId: 'bod'`) no entran en `selEstadoResultados` por local; B4 lo compensa con fila "Bodega y gastos generales".
