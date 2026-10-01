# Informe · Cambios compartidos de las oleadas C y D

Integrador, 01/10/2026, rama `main` (sin push). Una sesión sobre `docs/informes/pendientes_compartidos_CD.md` (cada ítem queda marcado HECHO / DESCARTADO con su porqué). Decisiones en `docs/DECISIONES.md` (14 entradas "Compartidos C-D"); contratos en `docs/CONTRATOS.md` (§5, §10, §14.2, §14.3.2 nueva para la oleada E, anexos A y B y registro). No se tocó nada de la oleada E (`src/movil/**`, `src/modulos/entrada|guia|configuracion/**`, `config/textos/guia.ts`, sus e2e ni `.claude/worktrees/`).

## 1. La misma historia en todas las pantallas (generador, `versionGenerador` 4)

**Valentina, la que más vende.** Natalia la superaba porque atendía sola los jueves de Zona Rosa (≈ 30 % de sus ventas) y Zona Rosa vendía más que el plan (42 % del valor frente a 39 %). Cambios: Juliana trabaja de jueves a domingo, Mateo cierra el sábado (Natalia abre), volumen base Parque 93 9,65 y Zona Rosa 13,3 ventas al día (P1 queda más cerca del plan), domingo de Zona Rosa 1,5 (P8) y accesorio de Valentina 0,48 (P2 en enero). La definición de `selDesempenoVendedores` no cambió: las barras de Análisis, la tabla dinámica y Comisiones muestran ventas absolutas y una métrica "por día" habría contado otra historia.

| Valentina / la segunda (ventas) | 30/09 | 19/12 | 20/01 | 14/06 |
|---|---|---|---|---|
| Antes, 30 días | 1,03 (casi empate con Mateo y Natalia) | 0,80 (Natalia) | 1,00 | 1,01 |
| Antes, 90 días | 0,98 (Natalia) | 0,87 (Natalia) | 0,95 | 1,13 |
| **Ahora, 30 días** (`P2.lider30`) | **1,12** | **1,12** | **1,10** | **1,27** |
| **Ahora, 90 días** (`P2.lider90`) | **1,12** | **1,08** | **1,06** | **1,40** |

Valentina vende 51 % más que el promedio del equipo al 30/09 (P2.sobrePromedio 1,51; antes 1,42).

**Calzado, la categoría dormida.** Abrigos se pedían con la demanda de la temporada fría y vendían ≈ 75 % de lo que llegaba (388 días al 30/09); suéteres y trajes llegaban a ≈ 190 días en temporada. Cambios: factor de pedido por categoría (`HISTORIA_IMPORTACIONES.factorCategoria`: abrigos 0,4, trajes 0,9, suéteres 0,85), margen de seguridad 1,15 (compensa la tienda) y el pedido grande de Ruifeng con 160 días de ritmo (antes 135). La definición de P5 no cambió.

| Calzado / la siguiente (días de inventario) | 30/09 | 19/12 | 20/01 | 14/06 |
|---|---|---|---|---|
| Antes | 0,47 (abrigos 388) | 0,79 (abrigos) | 0,88 (abrigos) | 0,73 (abrigos) |
| **Ahora** (`P5.primera`) | **1,26** (suéteres 158) | **1,10** (trajes 149) | **1,49** (trajes 115) | **1,31** (trajes 174) |
| Calzado: días · a costo | 198 d · $ 53,2 M | 164 d · $ 58,1 M | 171 d · $ 59,1 M | 228 d · $ 57,7 M |

**Novedades y PILA.** Incapacidad de Julián Torres (bodega, no vende) de ayer a mañana y vacaciones de Santiago Rojas la semana siguiente (lunes a domingo, registradas dos semanas antes: `registro` nuevo en el plan); "Fuera hoy" y "Próximos 30 días" ya no arrancan en 0 y Santiago deja 6 turnos por cubrir. Hernando y Alejandro entregan la PILA del mes el día 12 (`pila.verificar`); Daniela y Juliana no (P22).

**Verificación del generador.** `npm run informe -- --ancla` en 30/09/2026, 19/12/2026, 20/01/2027 y 14/06/2027: 0 patrones FUERA (los 3 nuevos incluidos), 0 invariantes rotos, 0 comandos omitidos, narrativa en verde; P19 = 16,4 · 14,0 · 16,7 · 18,1 M. Huella del determinismo actualizada (`2aea9b9c…`), `@hash` en verde en 1440. Sebastián "este mes" queda en ≈ $ 4,61 M (comisión $ 843.526, recargos $ 335.847): PLAN 2.1 y W6 dicen "cerca de $ 4,6 millones".

## 2. Alertas del Inicio

- Aprobaciones sin salir del escritorio: la anulación enlaza al detalle de la venta (que ya aprueba con confirmación); el descuento, que no tiene pantalla de escritorio, se aprueba o rechaza en la misma alerta (`Alerta.aprobacion`, botones en Inicio) y su enlace lleva a la prenda. Ninguna alerta enlaza a `/app` (prueba).
- Solo las 2 notificaciones nuevas más recientes van arriba (`MAX_NUEVAS_ARRIBA`). Las cinco visibles al 30/09: descuento (Nuevo), anulación (Nuevo), Oxford M en Usaquén (W2), faltante de Zona Rosa (W11), IMP-2026-07 en Buenaventura (W3).

## 3. Moneda en todas partes

- `EventoVista`: título solo concepto, `monto` (COP, con `<Dinero>`), `montoOrigen` (US$/CN¥ ya formateado), `detalle` ("Camisas Guangzhou Huameng · 1.213 uds."), `ilustrativo` y `recordatorioMin`; llegadas "IMP-2026-07 · Llega a bodega". Inicio pinta el monto, la marca "Ilustrativa" y el aviso del recordatorio.
- `obligacionesIlustrativas` en `src/dominio/reglas/obligaciones.ts`; `selEventosCalendario` las trae (`fuente.tipo: 'obligacion'`, sin valor, no movibles) y la agenda de C3 las consume (N11: la PILA del 15/10 sale en los próximos eventos).
- `Hallazgo.cifras` y `partes`, `Alerta.tituloPartes`/`contextoPartes` (`ParteFrase` en los tipos comunes) y `<FraseConDinero>` en `@/ui`: D1 y D2 arman las frases con `<Dinero>` (e2e: con US$ la frase del calzado dice "US$").
- `GraficoBase`: eje Y a la medida de su etiqueta más larga y series que se montan de nuevo al cambiar la escala; D1 ya no necesita su `key`.

## 4. Dominio, selectores y rutas

- Comando `notaCredito.avanzarEstado` (acción `avanzarEstadoNotaCredito`, evento `NotaCreditoEstado`, permisos D V G T; 108 comandos). D3 avanza las notas con él (se retiraron el avance en memoria y el reloj de la pestaña).
- `emisor()` de los PDF: razón social de ejemplo o "<negocio> · razón social de ejemplo" con marca personalizada.
- `selSinMovimiento({ localId })` (D1 lo compone); `selRecargosTurnos` con `valorNocturno` y `valorDominical` (C2 deja `repartirRecargo`); `franjaDeTurno(tipo, localId)` sale de la plantilla (C2 la usa).
- Rutas: `canalInstagram?escenario=` (D5 lo honra y lo refleja al elegir) y `facturacion?tipo=notas` (D3).
- Hallazgos: la relevancia se pondera por patrón (P2 ×2, P3 y P5 ×1,2, P8 ×0,6) para que Valentina, la talla que se agota y el calzado estén entre los cinco que muestran Análisis e Inicio.

## 5. Interfaz compartida

- `LayoutTienda`: contador con `useCantidadBolsa()` (se retiró `useContadorEnEncabezado`), buscador del catálogo, "Tiendas" baja al pie (nuevo, con direcciones), paneles de cuenta (último pedido de la pestaña y la bolsa) y favoritos; logo, categorías y bolsa conservan `?marco=1`.
- `FilaCambio` desde `@/ui/ligero`; `Badge`, `BadgeEstado` y `Checkbox` con `data-testid` (`Dinero` ya lo tenía); `SelectorFecha alBorrar` ("Quitar la fecha", C1 lo usa).
- Una sola barra para Personal y Turnos: Empleados · Turnos · Asistencia · Novedades · Nómina · Comisiones · Comparativo.

## Verificación

- `npm run typecheck` y `npm run lint`: en verde.
- `npx vitest run`: 80 archivos, **1.047 pruebas** en verde (antes 1.044; pruebas nuevas de historia, alertas, calendario, hallazgos, recargos, nota crédito, emisor, rutas y componentes; se retiraron las de `estadoMostradoNota` y `repartirRecargo`).
- `npm run informe` en las 4 fechas: 0 FUERA (sección 1).
- e2e en 1440 con `vite preview` propio en 4390 (detenido al terminar), `--workers=2`: fundaciones, determinismo y los 17 paquetes fusionados (pos, inventario, ventas, clientes, importaciones, proveedores, pagos, gastos, personal, turnos, calendario, inicio, análisis, facturación, reportes, canales y tienda): **285 en verde, 1 omitida a propósito** (prueba de celular de la tienda). Ajustes de e2e por los cambios: horas de Juliana (29 → 36 h), "Fuera hoy" y turnos por cubrir contados desde lo sembrado, próximas = las vacaciones de Santiago, URL de notas crédito, hallazgos con `<Dinero>`, Inicio con 2 "Nuevo".

## Commits

`5c7af0f` historia de datos · `3e3922a` alertas · `f746ef5` calendario · `91fadd1` dinero de hallazgos y alertas · `6a54d08` GraficoBase · `dbad642` Badge, Checkbox, SelectorFecha, FilaCambio · `a6ddd4e` tienda · `4220386` tipo en e2e de Inicio · `a3e8608` nota crédito y emisor · `695f31f` selSinMovimiento · `8c9d467` recargos y franjaDeTurno · `20f28b1` rutas · `55ea05d` pestañas · `40e1267` peso del guion en hallazgos · y el de documentación.

## Para la oleada E y QA

- **E1**: pintar `Alerta.tituloPartes`/`contextoPartes` y `EventoVista.monto`/`montoOrigen`/`detalle`/`recordatorioMin` con `<FraseConDinero>`/`<Dinero>` (el título de los vencimientos ya no trae el monto); solo 2 "Nuevo" arriba.
- **E2**: `config/textos/guia.ts` debe decir "cerca de $ 4,6 millones" para Sebastián; el ancla de la pista `tienda.franja` es la franja negra bajo la portada.
- **Pendientes opcionales**: vista previa de la nómina (≈ 1 s en el navegador, C1.5), pantalla de liquidación final (C1.6), campo de comentarios en Instagram (D5.2).
- La relación P2 en enero (`P2.lider90` 1,06) y P5.costo en enero ($ 59,1 M, tope $ 60 M) quedan cerca del borde: cualquier cambio del generador debe volver a correr `npm run informe` en las 4 fechas.
