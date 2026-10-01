# Crítica técnica del PLAN — KippiCore CRM · Demo HALDEN

> Revisor técnico independiente (no participó en el plan). Alcance: `docs/PRD.md`, `docs/PROMPT.md`, `docs/PLAN.md` completo (secciones 1–10), con foco en 5, 6, 7, 9 y 10.
> Pregunta: ¿es técnicamente sólido, construible sin contradicciones por agentes en paralelo, y producirá una demo estática rápida, coherente y sin errores?

---

## 0. Veredicto

El núcleo del plan es bueno, y en varios puntos es mejor de lo habitual: un solo camino de escritura, hechos almacenados y todo lo demás derivado, dinero en enteros, fechas como cadenas de Bogotá, PRNG por intención y una fase 2 que entrega todos los comandos y selectores. Si se ejecuta tal como está escrito, falla por cuatro motivos concretos y no por la arquitectura:

1. **La forma de trabajo en paralelo no es construible tal como está escrita.** Hay 8 o 9 constructores en el mismo árbol de trabajo, y la "definición de terminado" exige `typecheck`, `lint`, `test` y e2e **globales**. Basta que un compañero deje código a medias para que todos queden bloqueados. Además, varios e2e de paquete dependen de pantallas que otros paquetes construyen al mismo tiempo o después.
2. **Faltan contratos transversales que nadie tiene asignados.** Son los parámetros de enlace profundo ("panel de traslado abierto y prellenado", "esa semana marcada", "fila resaltada en camel"), las emisiones de `EventoUI` que alimentan "Prueba esto" y las anclas de las pistas. Los paquetes que dependen de ellos (E2, D1) llegan en oleadas posteriores y tienen prohibido tocar los módulos donde viven esos contratos.
3. **La persistencia por registro y marca de agua tiene dos defectos de corrección,** además de varios casos borde sin regla:
   - la marca de agua no es monótona entre pestañas y marcos;
   - los manejadores no son atómicos en el modo de construcción.
4. **Hay contradicciones numéricas en la narrativa,** fáciles de corregir pero que el `auditor-datos` y el cliente detectarían: el punto bajo del flujo de caja, la vendedora estrella, W6 frente a las comisiones y el divisor de horas de la nómina.

Ninguno de estos problemas obliga a rehacer el diseño. La sección 9 tiene 25 cambios concretos.

---

## 1. Contradicciones internas

### 1.1 Entre secciones (estrategia, arquitectura y diseño)

| # | Dónde | Contradicción |
|---|---|---|
| C1 | 2.2.1 frente a 8.4.7 | La entrada tiene **dos puertas** (computador / celular con QR) más un enlace de vendedor, y el wordmark mide ~72 px. El diseño, en cambio, especifica **tres puertas en tres columnas** ("Explorar como dueño" en negro y la tercera con QR de 96 px) y un wordmark de 64 px. E2 recibirá dos especificaciones incompatibles. |
| C2 | 2.6 frente a 8.4.3 | El menú "?" tiene seis opciones en la estrategia (ver entrada, Prueba esto, app, ocultar pistas, restaurar, Hablar con KippiCore) y tres en el diseño ("Ver bienvenida", "Prueba esto (3 de 8)", "Atajos de teclado"). "Atajos de teclado" no tiene pantalla definida, así que sería un botón muerto. |
| C3 | 2.2.1 frente a 5.5 | "o mira lo que ve un vendedor → (entra a `/inicio` con rol Vendedor)". El inicio del vendedor es `/panel/mi-dia`, y la tabla de traducción de rutas de 5.5 no cubre este caso. |
| C4 | W7 (§3) frente a D7 y 6.20.11 | W7 dice "las operaciones pasadas usan la tasa de su fecha" en el contexto de **mostrar** cifras. D7 y 6.20.11 convierten **todo con la tasa vigente** y solo usan el historial para registrar pagos. Las dos lecturas del PRD §8 son defendibles, pero el plan tiene que elegir una y decirla una sola vez. |
| C5 | W7 / alerta 3 frente a 5.8 / 8.4.3 | La tasa de ejemplo aparece como US$1 = $4.000 en un lado y $4.050 en el otro. La alerta 3 ("US$14.700 ≈ $58,8 millones") supone 4.000. |
| C6 | W5 / 2.3.3 frente a P19 / N5 / 7.10 | El saldo de Hangzhou Lanxin **vence el viernes** (2 a 8 días), pero el punto bajo del flujo cae **entre los días 18 y 28** ("la semana del 19 de octubre") y "coincide con el saldo a Hangzhou, los arriendos y la quincena". Ambas cosas no pueden ser ciertas a la vez. Además, los arriendos (día 1–5) y la quincena (15 y último día) solo coinciden con un desfase fijo respecto del ancla en algunas fechas del mes. |
| C7 | 2.3.3 alerta 4 frente a N6 | La alerta dice "Mateo Herrera no ha marcado entrada" durante el turno. N6 lo hace marcar hoy a las 10:25 a. m., así que el texto principal solo sería válido entre las 10:10 y las 10:25, y después la alerta mentiría. |
| C8 | W6 y 2.1 (6:45) frente a W6 "la comisión del mes se toma de las ventas reales" y 6.20.5 | "$1.950.000 cuesta cerca de $2.990.000" solo cuadra **sin** comisión y **sin** recargos; la prueba exacta de 6.20.5 lo confirma. Sebastián tiene 3 % de comisión (≈ $1,12 M al mes según W1/W8) y hace turnos de cierre hasta las 8 p. m., con recargo nocturno desde las 7 p. m. Su costo real del mes ronda $4,6 M. Si la pestaña "Costo para el negocio" usa los insumos reales, contradice el guion; si no los usa, contradice W6. |
| C9 | 4.7 P2 frente al elenco 1.5 | Parque 93 vende ≈ $135 M al mes (41 % de $330 M) y Valentina vende el 43 % (≈ $58 M). En Parque 93 solo hay **dos** vendedores, porque Laura es cajera y "las cajeras no venden". Camilo Andrés vendería entonces ≈ $77 M, **más que la estrella**. Además, el peso de asignación ×2,2 frente a 1 le daría a Valentina ≈ 69 %, no 43 %. El patrón P2 es aritméticamente imposible con este elenco. |
| C10 | 7.8 frente a 7.6 y 7.5 | Las ventas se asignan "entre los vendedores **con turno** en ese local a esa hora", pero los turnos solo se generan para "las últimas 13 semanas y las próximas 3". Para los otros ~15 meses no hay regla de asignación. Tampoco la hay para las horas sin vendedor de turno: dos vendedores de 42 h no cubren 10 h × 7 días en Parque 93. |
| C11 | 8.8.1 frente a 6.4 | `<Prenda tipo>` admite 11 tipos, pero `TipoPrenda` tiene 15. Faltan `chaleco` (P6 incluye el "Chaleco de lino beige" entre los 5 sin movimiento), `tenis`, `medias` (P2: accesorio) y `billetera` (Wenzhou Ruifeng). Esas referencias se verían en blanco en la grilla, en la tienda y en Inicio. |
| C12 | 6.23 Pivote | Dice "dimensiones (13)" y lista 15; dice "medidas (6)" y lista 7. No hay regla para los totales no aditivos: el número de ventas distintas y el ticket promedio no se suman por filas, y "unidades" por medio de pago sale fraccionaria al prorratear pagos mixtos. |
| C13 | 7.6 (guardas) frente a 6.16 | `demandaInsatisfecha` alimenta el hallazgo de tallas, pero no existe en `EstadoDominio` ni en `meta`, así que ningún selector puede leerla. |
| C14 | 9.4 E3 frente a 5.5 y 6.17 | E3 incluye "aduanas (valores de ejemplo)", pero la ruta `/panel/configuracion/aduanas` no está registrada, y el router es de solo lectura para E3. E3 pide "agregar, **editar**, eliminar" tasas, y no existe `tasa.editar`. |
| C15 | 8.7.31 | Promete un toast con "Deshacer … cuando el modelo de datos lo permita", pero no existe ningún comando ni mecanismo de deshacer. Pone además de ejemplo "¿Eliminar la venta V-000482?", aunque G1 dice que las ventas no se eliminan. |
| C16 | 6.6 / 6.21 | `TipoSolicitud` incluye `'conteo'` y `'nomina'`, pero ningún comando crea solicitudes de nómina, y nada en la estrategia usa aprobaciones de conteo. Es código y tipos muertos. |
| C17 | 7.3 frente a I5 / 7.9 y la prueba `rango.test.ts` | La ventana empieza "el mismo día del mes" de hace 18 meses y la primera importación se recibe "entre los días 2 y 10". Los primeros días no tienen existencias, así que no hay ventas (y la prueba exige 15–60 por día), y el primer mes del gráfico de 18 meses sale parcial: se ve como un desplome. |

### 1.2 Tipos (sección 6) frente a comandos y selectores

- **`CuentaPorCobrar` y saldo a favor (V3):** el saldo a favor se deriva **por cliente**. Sin embargo, `devolucion.registrar` con compensación `saldo_favor` o `cambio` no exige cliente, y ≈ 30 % de las ventas son de consumidor final. El generador hace "70 % cambio": el saldo a favor de esas ventas queda huérfano. Hace falta una regla: crear un cliente rápido, o permitir solo el reembolso.
- **Venta reconocida (V4) y separados cancelados:** un separado cancelado deja de contar **en su fecha original**. Si uno de agosto se cancela en septiembre, **agosto cambia**: los reportes ya descargados y la comparación año contra año se mueven hacia atrás. Es inconsistente con la regla de devoluciones ("restan en su fecha").
- **`alerta.descartar` y `notificacion.marcarLeida` son comandos de dominio.** Van al registro y **fijan el ancla**. Basta con abrir la campana o descartar una alerta para que el cliente "congele" su historia sin haber cambiado ningún dato de negocio.
- **`importacion.cambiarEstado` con `controlManual: true`:** después de un cambio manual, el generador **nunca más** avanza esa importación. Si el cliente la movió a "nacionalización" y vuelve en dos semanas, la ve atascada y "con 12 días de retraso".

---

## 2. Huecos de cobertura y puntos de conflicto entre paquetes

### 2.1 Contratos transversales sin dueño (los más graves)

| Contrato | Quién lo produce | Quién lo consume | Problema |
|---|---|---|---|
| Enlaces profundos con estado: `?trasladar=origen,destino,variante,cantidad`, `?semana=` en el flujo, filtros de asistencia o por cobrar, `?mensaje=` en la ficha de cliente, "botón de cambio de estado resaltado", escenario de WhatsApp preseleccionado, selector de rol o moneda "resaltado" | `selAlertas` (F2-B), D1, E2 | A2, B3, C2, A4, B1, D5 y el layout | Nada lo define. Los productores llegan en oleadas posteriores y tienen prohibido tocar los módulos consumidores. Las alertas y la guía llegarían "a la portada del módulo", justo lo que 2.3.3 prohíbe. |
| Resaltado de la fila destino (W1: "cada 'Ver' lleva al módulo con la fila cambiada resaltada en camel 1,5 s") | A1 | A2, A3, A4, B3, C1 | No está en los criterios de los consumidores. |
| Emisión de `EventoUI` (`flujo_caja_visto`, `costo_empleador_visto`, `tabla_dinamica_modificada`, `whatsapp_*`, `qr_abierto`, `tienda_abierta`, `portal_enviado`, `pdf_generado`) | B3, C1, D2, D5, E1, D6, B1, lib | E2 ("Prueba esto") | No aparece en los criterios de 9.4. Si no se emiten, cinco de los ocho ítems nunca se marcan, y E2 no puede añadirlos. |
| Anclas de las pistas de 2.5 (`<Pista id>` en "Barra de totales del filtro", "Pestaña Flujo de caja", etc.) | E2 (textos) | Cada módulo | Lo mismo: E2 no es dueño de las pantallas donde van las anclas. |
| Toast inmediato en la otra pestaña ("Carolina Mejía actualizó IMP-2026-06") | B1 (criterio) | Layout / estado (F2) | B1 solo es dueño de `modulos/importaciones` y `seguimiento`. El escuchador global no tiene dueño. |

### 2.2 Funcionalidades que reclaman dos o más paquetes (duplicación)

- **Exportes:**
  - desprendible PDF y resumen de nómina en Excel: C1 **y** D4;
  - ventas en PDF y Excel: A3 **y** D4;
  - kardex: A2 **y** D4;
  - importaciones y costo aterrizado: B1 **y** D4.

  Como C y D corren en paralelo, D4 no puede importar `publico.ts` de C1, ni A3 el de D4. Resultado: dos desprendibles con diseños distintos y dos cálculos de filas que pueden descuadrar.
- **"Importar desde Excel" simulado:** se implementa tres veces (A2, A4, B2) con tres modales distintos.

### 2.3 Dependencias de oleada mal ordenadas (en las pruebas, no en el código)

- **A1:** su e2e verifica `/panel/ventas` (A3), la ficha del cliente (A4) y la caja (B3), que corren **en paralelo** y en la oleada A están en esqueleto.
- **B1:** su criterio ✔ "→ alerta en Inicio" depende de D1, que pertenece a **una oleada posterior**.
- **C1:** su e2e "marcar salida tarde en C2 cambia las horas extra" depende de la interfaz de C2, que se construye en paralelo.
- **D5:** la vista web con `/tienda` en marcos depende de D6, también en paralelo.
- **PROMPT y 5.16:** piden los ocho flujos "en 1440 × 900 y 390 × 844". A 390 px, el escritorio muestra el aviso de pantalla pequeña, y no está definido qué significa "el flujo 1 en móvil".

### 2.4 Infraestructura de paralelismo

- **9.1.7:** "`npm run typecheck`, `npm run lint` y `npm test` sin errores; su e2e pasa" en **un solo árbol de trabajo** con 8 o 9 agentes escribiendo a la vez. `tsc --noEmit` es global: un error a medio escribir en `modulos/pagos` hace fallar al constructor de `modulos/pos`.
- **Playwright:** cada constructor levantará su `webServer` en el mismo puerto, y `npm test` ejecutará la suite completa del generador (cuatro fechas con construcciones de 1 a 3 s cada una) nueve veces en paralelo.
- **Commits:** 9.1.8 dice que "los hace el líder al aceptar cada paquete" mientras los demás siguen escribiendo en el mismo árbol, lo que provoca commits con archivos ajenos a medias.

### 2.5 Cobertura del PRD §14 (lo que sí está bien)

Cruzados los 16 criterios funcionales y los 6 de calidad con 9.4: todos tienen dueño. Las fallas no están en la cobertura, sino en (a) los contratos de 2.1, (b) las pruebas de 2.3 y (c) la definición del flujo móvil.

---

## 3. Persistencia: registro de comandos + marca de agua + ancla

### 3.1 Lo que está bien

- Elegir el registro en lugar del estado completo en IndexedDB es correcto. La tabla de 5.6.1 es honesta.
- Guardar dentro del comando los IDs de lo que crea el usuario y derivar los IDs hijos es la decisión clave. Está bien resuelta.
- La marca de agua garantiza la reaplicación exacta **dentro de una sola pestaña**.

### 3.2 Defectos de corrección

**D-1. La marca de agua no es monótona entre pestañas y marcos.**

1. La pestaña A carga a las 10:00, así que su `generadoHasta` (G) es 10:00.
2. El portal se abre a las 15:00 (G = 15:00) y envía una actualización con marca de agua 15:00.
3. A recibe la entrada por el evento `storage`. Como "va después de la última aplicada", la aplica **en vivo** sobre un estado que no tiene las intenciones generadas entre las 10:00 y las 15:00. **El estado de A ya no es igual a `construir(registro)`.**
4. El usuario registra un comando en A con marca de agua 10:00. En el orden `(marcaAgua, ts, seq)`, ese comando queda **antes** que el del portal, al revés de como se aplicó en vivo.
5. Si los dos tocan la misma entidad (por ejemplo, retroceder un estado de importación), la reconstrucción produce otro resultado o rechaza el comando.

El desempate `seq` es por pestaña, de modo que dos pestañas pueden empatar en `(marcaAgua, ts, seq)`.

**D-2. Los manejadores no son atómicos en el modo de construcción.**

- En vivo, Immer descarta el borrador si se lanza un `ErrorDominio`.
- En construcción (mutación directa, D11), un manejador que valida **después** de escribir algo deja el estado a medias.

Con el registro vacío no ocurre, porque la prueba exige 0 omitidos. Pero 5.6.4 y 5.6.10 **cuentan** con que haya omitidos de usuario tras un cambio del generador, y es precisamente en el camino del cliente donde el estado quedaría corrupto sin que nadie lo note. Es un error clásico, y con 106 manejadores escritos en una sola sesión es casi seguro que alguno lo tenga.

**D-3. El orden temporal se rompe en el kardex (I2).**

Un comando del usuario con `ts` 17:30 y marca de agua 15:00 se aplica **antes** que una venta generada a las 16:00. Si el comando es una entrada (por ejemplo, `traslado.recibir` de +3), la venta generada de las 16:00 puede consumir esas unidades. Al recorrer el kardex por `ts`, el saldo a las 16:00 queda **negativo**: I2 falla y la columna de saldo acumulado muestra un número negativo.

Ocurre siempre que el cliente deja la pestaña abierta un rato, hace algo y vuelve a cargar más tarde. Es el caso normal.

### 3.3 Casos borde pedidos

| Caso | Qué pasa con el plan actual | Qué falta |
|---|---|---|
| Vuelve 3 días después **con** cambios | La base se regenera hasta "ahora". La narrativa avanza: la importación en puerto se nacionaliza y el viernes pasa. Funciona. Pero: (a) la importación que el cliente movió a mano queda **congelada para siempre** por `controlManual`; (b) a los ~12 días la narrativa caducó (la importación se recibió, pasó el punto bajo) y los enlaces de "Prueba esto" llevan a entidades ya resueltas; (c) la sugerencia de "datos frescos" llega recién a los **120 días**. | `controlManual` debe bloquear solo hasta el siguiente hito estimado. `selNarrativa()` debe ser dinámico (la importación que **hoy** está en puerto o nacionalización, el pago grande más próximo…), con alternativa de respaldo. La sugerencia de renovar debe aparecer a los 7 días. |
| Vuelve 3 días después **sin** cambios | Con `ancla = hoy`, todo es igual cada día: "Hoy cumple años Ricardo Peñuela", "IMP-2026-07 llegó ayer", "Mateo no ha marcado". Es un **día de la marmota**, y un cliente que vuelve lo nota, sobre todo con el cumpleaños. | Fijar el ancla en la **primera visita** (guardarla aunque no haya registro) y renovarla sola si no hay registro y han pasado más de 7 días. Con eso desaparece la repetición sin perder frescura. |
| Borra un producto, cliente, empleado o local que el generador usaría | G3 dice "el generador tampoco la elige", pero el plan de importaciones se calcula **sin leer el estado**. Las importaciones futuras incluirían el producto borrado (existencias invisibles), los turnos y las nóminas incluirían al empleado retirado, etc. | Una **matriz de guardas** por tipo de intención frente a cada comando del usuario que la afecte (ver 9, cambio 11). |
| Cierra la caja a mano, paga o reprograma una CxP, aprueba la nómina a mano | El generador falla y cuenta un omitido, lo que está bien siempre que haya atomicidad (D-2). Pero si `cxp.programar` mueve la fecha y el generador paga en la fecha original, el pago se adelanta o se duplica. | Las mismas guardas: el generador lee `programadaPara`, la sesión abierta y las liquidaciones existentes. |
| Edita una tasa histórica | Los pagos guardan su tasa (instantánea), así que el pasado no cambia y está bien. Pero no hay validación de fechas futuras ni de duplicados por fecha, y no existe `tasa.editar`. | Validar `fecha ≤ hoy`; registrar la tasa con la misma `(moneda, fecha)` debe reemplazar la existente. |
| Restaurar con el portal abierto en otra pestaña | Cubierto: el registro vacío dispara la reconstrucción. | Nada. |
| Dos pestañas, incluido el portal | Ver D-1. Además, en una reconstrucción el bus **no** emite eventos, así que el toast de W3 no saldría si el camino fue "reconstruir". | Toda entrada remota cuya marca de agua sea mayor que el `generadoHasta` local dispara **reconstrucción** en el worker. El toast se arma **directamente con la entrada** leída del almacenamiento, no con eventos de dominio. Además, `BroadcastChannel` sirve como canal principal. |
| `localStorage` lleno o no disponible | El modo memoria está bien. Pero el portal en otra pestaña no se sincroniza (no hay evento `storage`) y W3 falla en silencio. | `BroadcastChannel` funciona aunque `localStorage` falle o esté lleno. |
| Nueva versión del generador desplegada | La reaplicación es tolerante. Pero un `venta.anular` sobre `vt_g_20260930_usq_014` se aplica **a otra venta** si la nueva versión cambió qué venta lleva ese índice: no falla, cambia de significado. | Regla de proceso: **congelar `VERSION_GENERADOR` desde que Miguel envía el enlace**. Si cambia, reaplicar solo los comandos que crean entidades y descartar los que referencian entidades generadas, con aviso. |
| `?hoy=` de QA en un navegador con registro | El registro de `localStorage` se comparte. Con `?hoy=` anterior a alguna marca de agua, los comandos se aplican al final y fallan. Las pestañas nuevas abiertas con `noopener` no heredan `sessionStorage`, así que el portal se construye con otro "ahora" y otra base. | `?hoy=` fuerza el modo memoria con una clave separada, y se propaga en la URL a los enlaces que abren contextos nuevos (portal, marcos). |

### 3.4 ¿Hay una versión más simple que dé lo mismo?

Evalué tres alternativas:

| Alternativa | Lo que simplifica | Lo que pierde |
|---|---|---|
| **(a) Base congelada en el instante del ancla**, con los comandos aplicados al final sin intercalar | Elimina la marca de agua, las guardas generador-usuario y D-1/D-3 | Al volver otro día, "Ventas de hoy" = $0 y "Datos al 30/09". **Viola el PRD §9** ("nunca desactualizada"). Se descarta. |
| **(b) Base siempre fresca** (`ancla = hoy`) con los comandos reaplicados al final | Elimina la marca de agua | No es exacta: la venta de ayer puede quedar sin existencias y las anulaciones apuntan a otras ventas. Rompe la promesa "la venta sigue ahí". Se descarta. |
| **(c) El diseño del plan con cuatro recortes** | Ver abajo | Nada que el cliente vea |

Los cuatro recortes de la alternativa (c) son:
1. Quitar el **pulso en vivo** (es complemento C y es lo único que obliga a llevar el generador al hilo principal y a avanzar la marca de agua en vivo).
2. Hacer que los **marcos** (`/app?marco=1` y `/tienda`) usen el store del padre, ya que son del mismo origen. Desaparece la sincronización de marcos y la segunda construcción.
3. Aplicar las entradas remotas **siempre con reconstrucción**. Desaparece la rama "aplicar en vivo o reconstruir".
4. Sacar del registro el estado de interfaz (alertas descartadas, notificaciones leídas).

Con esos recortes, la sincronización queda limitada al portal en otra pestaña, que es un caso raro donde un segundo de reconstrucción no importa. **Recomiendo la (c).**

---

## 4. Rendimiento realista

| Punto | Plan | Estimación del revisor | Riesgo y mitigación |
|---|---|---|---|
| Construcción: ~16.000 ventas, ~150.000 objetos, 106 manejadores, en el worker | < 1 s en un portátil de 2020 | Plausible **solo si**: (1) en modo construcción no se crean eventos ni sobres por comando; (2) las intenciones de "revisión diaria" (separados, devoluciones, reposición, conciliación de pagos con más de 3 días, vencimientos) usan **índices incrementales** y no recorren tablas completas. Un recorrido ingenuo de 16.000 ventas en 548 días son ~9 M iteraciones por tipo de revisión, entre 50 y 100 ms cada uno: con cuatro o cinco tipos se va el presupuesto. | Escribir esto como regla en 7.4. Derivar la conciliación de los pagos generados con más de 3 días y crear las facturas generadas directamente en estado "aceptada" con su historial: se eliminan ~8.000 comandos. |
| Celular medio | < 2,5 s | Un móvil medio es de 3 a 5 veces más lento: **3 a 5 s** si el portátil marca 1 s. Es la primera impresión probable (el enlace llega por WhatsApp). | Medir en F2-A con CPU ×4 por CDP como **criterio de salida**, con una perilla de volumen en `config/demo.ts`. Mostrar en `/app` el armazón y el esqueleto al instante. |
| Transferencia worker → hilo principal (clonación estructurada de ~150.000 objetos, 25–40 MB) | < 200 ms / < 400 ms | La **deserialización ocurre en el hilo principal** y lo bloquea: ~150–300 ms en escritorio y 0,5–1 s en móvil. Además, la memoria se duplica hasta que el worker suelta su copia. | Terminar el worker tras enviar el estado (o soltar la referencia). Si en móvil la clonación pasa de 400 ms, usar allí el respaldo "hilo principal por tramos" (ya existe) en lugar del worker. |
| Immer en vivo sobre un estado grande | < 30 ms | El costo por comando está bien (copia superficial de las tablas tocadas). Pero el **primer** `produce` con congelación automática puede congelar en profundidad el árbol resultante, una sola vez y por decenas de milisegundos. | `setAutoFreeze(false)` en producción (con congelación en desarrollo para atrapar mutaciones). |
| Selectores tras una venta | < 50 ms | Plausible: `hechosDeVenta` sobre ~21.000 líneas cuesta entre 5 y 15 ms. **El riesgo está en el contrato de `useSel`**, no en el cálculo: (1) con `useSyncExternalStore`, si el selector devuelve un objeto nuevo en cada lectura, React 19 entra en bucle o lanza "getSnapshot should be cached"; (2) los parámetros llegan como objetos nuevos en cada render, y un caché de tamaño 1 se invalida con cada celda de una matriz; (3) si `ahora` lleva segundos, todos los selectores con fecha fallan el caché en cada render. | Ver el cambio 13: caché por clave de parámetros serializada y por referencia de tablas (WeakMap, para que `selEfectosVenta(antes, despues)` no vacíe el caché), y `ahora` cuantizado a minuto. |
| Tres construcciones simultáneas (pestaña, marco `/app`, marco `/tienda`) | "≈ 1 s y ~60 MB cada una; aceptable" | Al abrir el modal de QR, la vista previa del teléfono muestra 1 a 2 s de carga en medio del momento W10, y la memoria se triplica. | Marcos con el store del padre (cambio 10). |
| Bundle | Entrada < 180 KB gz | Viable: react-dom, el router y qrcode caben. Recharts con React 19 requiere recharts@3 o forzar `react-is@19`. ExcelJS (~250 KB gz) y jsPDF con fuentes van en carga diferida. | El **precaché del service worker** descarga todos los chunks (~1–1,5 MB) en la primera visita, en el celular y en paralelo con la generación. Diferir el registro del SW hasta que el estado esté construido. |

---

## 5. Complejidad que se puede quitar sin que el cliente lo note

1. **Pulso en vivo** (`avanzarReloj`, 5.6.11): es complemento C, solo existe en `/app` y produce como máximo una venta cada 5 minutos que nadie verá en una sesión de 10 minutos. Obliga a cargar el generador y la semilla en el hilo principal y a mover la marca de agua en vivo. **Se quita.**
2. **Sincronización y construcción de los marcos:** el marco de `/app` y el de `/tienda` usan el store de `window.parent` (mismo origen) y no reconstruyen. La sincronización entre pestañas queda solo para el portal, y por reconstrucción.
3. **Rama "aplicar en vivo" para entradas remotas:** siempre se reconstruye.
4. **Comandos generados de bajo valor:** las facturas generadas nacen en "aceptada" con historial; la conciliación de los pagos generados con más de 3 días es derivada. Menos comandos y menos construcción.
5. **`TipoSolicitud` `'conteo'` y `'nomina'`** y `conteo.enviarAprobacion`: nada de la narrativa los usa. Quedan los descuentos y los traslados (los dos precargados de "Para aprobar").
6. **Sesiones de caja `manana` / `tarde`:** con `dia` basta.
7. **Estado de interfaz en el dominio** (`alertasDescartadas`, `leida`): se mueve al store `sesion`.
8. **Exportes por módulo:** se reemplazan por **definiciones de reporte únicas** en F2-B (columnas, filas desde selectores, totales). Los botones "Exportar" de A3, C1, B1 y A2 y el centro de reportes D4 llaman a la misma definición. Sale un solo desprendible en vez de dos.
9. **"Importar desde Excel":** un solo componente simulado en `ui/conectados` (F2-C) en vez de tres.
10. **"Atajos de teclado" en el menú "?" y "Deshacer" en el toast de eliminar:** se quitan. Si se quiere deshacer, el registro lo da casi gratis: quitar la última entrada y reconstruir.
11. **Calibración de P1–P20 fuera de la ruta crítica:** F2-A sale con coherencia, determinismo, rendimiento y narrativa N1–N13. Los patrones los calibra una sesión Opus dueña de `src/generador/**` **en paralelo** con las oleadas A y B (los constructores no dependen de cifras exactas). Deben pasar antes de la fase 4.

---

## 6. Corrección de cálculos

### 6.1 Nómina colombiana 2026

| Punto | Plan | Juicio |
|---|---|---|
| **Divisor de horas** (`horasMes = jornada × 30 / 7` → 42 h = 180) | **Incorrecto frente a la práctica colombiana.** El divisor usual es `jornada / 6 × 30` (48 → 240, 44 → 220, 42 → **210**), porque el descanso dominical ya está remunerado dentro del salario mensual. Con 180, el valor de la hora sale **16,7 % más alto** y se inflan las horas extra, los recargos nocturnos y los dominicales (ahora al 90 %). Un contador lo detecta de inmediato. | Corregir. |
| Exoneración del art. 114-1 | Elimina salud 8,5 %, ICBF y SENA si el IBC mensualizado es < 10 SMMLV. Correcto. Conviene una línea en la nota: solo aplica a personas jurídicas declarantes de renta y a personas naturales con 2 o más empleados, y nunca a contratistas. | Bien. |
| Auxilio de transporte hasta 2 SMMLV | Prueba sobre `salarioBase`. **Discutible:** la lectura más común entre contadores toma el total devengado salarial (incluye comisiones y recargos habituales). Valentina, con comisión escalonada, probablemente supera 2 SMMLV y no debería recibirlo. | Parametrizar `baseTopeAuxilio: 'basico' \| 'devengado'`, con `'devengado'` por defecto, y anotarlo en `porVerificar`. |
| Base de prestaciones | Cesantías y prima incluyen el auxilio; vacaciones no, y tampoco incluyen extras. Correcto. Verifiqué W6 a mano: $2.990.941 con exoneración y $3.254.191 sin ella, iguales a los de 6.20.5 con redondeo. | Bien. |
| Intereses de cesantías | `cesantías × 12 %` como provisión mensual, equivalente a ≈ 1 % del salario. Correcto según el PRD. | Bien. |
| Recargos según la Ley 2466 (dominical 90 % desde el 1/07/2026, nocturno desde las 7 p. m.) | Correcto y marcado "por verificar". | Bien. |
| Prestación de servicios: comparación "cuánto me cuesta" | Muestra el costo bruto. Para no parecer una invitación al "contrato realidad", conviene mostrar también **lo que le queda a la persona** después de la retención y de su propia seguridad social (IBC 40 % × 28,5 % + ARL ≈ 11,6 % de los honorarios). | Mejora barata de credibilidad. |
| Turnos: "seis días de 7 h = 42 h" con `descansoMin` | Si 10:00–17:00 tiene 60 minutos de almuerzo, se trabajan 6 h al día y 36 h a la semana: el validador nunca mostraría excesos salvo los forzados. | Definir si el turno de 7 h es neto o bruto. |

### 6.2 Costo aterrizado, IVA y monedas

| Punto | Plan | Juicio |
|---|---|---|
| Cascada FOB → CIF → arancel sobre CIF → IVA de importación sobre (CIF + arancel), descontable por defecto; prorrateo por mayor residuo | Correcto. La comprobación W4 cuadra: 219.900 / 1,19 = 184.790; margen = (184.790 − 71.850) / 184.790 = 61 %. | Bien. |
| Tasa de costeo = promedio de los abonos pagados + tasa vigente para el saldo | Razonable como costo real en COP. La DIAN liquida tributos con la TRM de la semana de la declaración; vale una línea de ayuda. | Bien, con nota. |
| Arancel de 15 % fijo | El régimen de confecciones (capítulos 61–62) en Colombia ha sido **mixto**: ad valorem más un componente específico por kilo, o tasas más altas según el precio por kilo. El 15 % puede quedar bajo frente a un importador real. | Mantener "valor de ejemplo" y añadir un campo "Otros tributos aduaneros" con texto de ayuda. No hace falta modelar el arancel específico. |
| `costoVigente` = último costo aterrizado aplicado | Al "Aplicar al inventario" (incluso **antes de recibir**, como en W4, con la importación en puerto) se revalorizan todas las unidades existentes de importaciones anteriores. Las pymes bajo NIIF suelen usar promedio ponderado. Para la demo sirve, pero la valorización a costo y el reporte "Inventario valorizado" deben nombrar el método. | Etiqueta "Costo de reposición (última importación)" y nota del método en el reporte. |
| IVA en precios | Base por línea = round(total / 1,19); IVA = total − base; nunca se redondea a nivel de venta. Correcto y coherente con la factura. | Bien. |
| Comisiones sobre el total con IVA | Decisión registrada. Un contador objetará que se paga comisión sobre impuesto. | Al menos mostrarlo explícitamente en el esquema ("sobre el total con IVA"). |
| Multimoneda | Pagos con tasa de su fecha, diferencia en cambio y saldos en USD/CNY a la tasa vigente: correcto. Pendiente C4: decidir la conversión de las cifras **históricas** al mostrarlas. | Corregir C4. |

### 6.3 Flujo de caja (6.20.9)

Las "quincenas futuras (costo de la última liquidación)" usan `costoEmpleador`, que incluye **aportes** y **provisiones**. Ninguno de los dos se paga en la quincena: los aportes salen en la PILA, que ya se suma aparte, así que se cuentan **dos veces**; las provisiones se pagan en fechas propias:
- prima: en junio y diciembre;
- cesantías: el 14 de febrero;
- intereses de cesantías: el 31 de enero;
- vacaciones: cuando se disfrutan.

El flujo exagera los egresos cada quincena y **no muestra** el golpe real de la prima de diciembre. Ese golpe es el mejor ejemplo de W5 si la demo se abre en noviembre o diciembre.

Además, los "gastos recurrentes futuros" pueden duplicar los del mes en curso que ya tienen CxP generada.

---

## 7. PDF, PWA, Vercel y Playwright

| Tema | Viabilidad | Ajustes |
|---|---|---|
| PDF con tildes (jsPDF + Figtree TTF en Identity-H) | **Viable.** Google Fonts publica Figtree estática, así que no hace falta el instanciador. | (1) Registrar la familia con los estilos `normal` y `bold` bajo el mismo nombre (autotable usa `fontStyle: 'bold'` en los encabezados); Black aparte para el wordmark. (2) El subconjunto debe conservar U+2212, U+00A0 y U+202F. (3) jsPDF no aplica *kerning*: el wordmark con `charSpace` queda bien, pero los títulos largos pueden verse algo abiertos. Revisarlo en QA visual. |
| Excel (ExcelJS) | Viable. | Escribir los totales como `{ formula: 'SUM(…)', result: <valor calculado> }` y activar `fullCalcOnLoad`. Sin el valor en caché, las vistas previas de WhatsApp, Gmail, Quick Look o Drive muestran los **totales vacíos**, y el cliente abrirá el archivo que le reenvíe a su contador desde el celular. |
| PWA (`scope: /app`, `start_url: /app?fuente=pwa`) | Viable. Chrome no ofrece instalar desde `/panel` (fuera del alcance), y está bien que así sea. | (1) En iOS, la PWA instalada tiene **almacenamiento separado** de Safari: sus cambios no se ven en Safari. Es aceptable, pero el aviso de "datos separados" debe mencionarlo. (2) Diferir el registro del SW (ver §4). (3) En iOS, los enlaces fuera del alcance (`/panel`) abren Safari: la tarjeta "Abre el sistema completo en tu computador" debe usar compartir o copiar, no navegar. |
| Vercel | `vercel.json` correcto: la búsqueda negativa es compatible y los chunks inexistentes devuelven 404. | La exclusión `fuentes/` sobra, porque las TTF importadas salen en `/assets/`. Inofensiva. |
| Playwright | Viable. | (1) Propagar `?hoy=` en la URL a los enlaces que abren pestaña (portal); los marcos ya comparten `sessionStorage`. (2) La limitación de CPU ×4 solo existe en Chromium (CDP). (3) Añadir un proyecto **WebKit** y otro **Firefox** que comparen el hash del estado con el de Node (ver determinismo). (4) Definir qué significa cada flujo "en 390 × 844": verificar el efecto en `/app`. (5) Un servidor compartido con `reuseExistingServer`, o un puerto por paquete. |

**Determinismo entre motores (no está en el plan).** `normal()` usa Box–Muller (`Math.log`, `Math.cos`), `poisson()` usa `Math.exp(-λ)` y la tendencia usa `Math.pow`. ECMAScript **no** obliga a que estas funciones den el mismo último bit en V8 (Chrome y la CI en Node), JavaScriptCore (Safari e iPhone) y SpiderMonkey. Un ulp de diferencia en un umbral cambia una extracción de Poisson. Por las guardas de existencias, eso se propaga a otras ventas. Consecuencias:
- el celular y el computador no parten "de la misma base" (R12);
- el `informe-coherencia` de la CI no garantiza lo que verá el cliente en Safari;
- el guion de Miguel, basado en cifras de Chrome, no coincide con lo que ve el cliente.

La aritmética básica (`+ − × ÷`) y `Math.sqrt` sí son exactas por IEEE.

---

## 8. Riesgos que faltan en la sección 10

- **R21. Paralelismo en un solo árbol de trabajo** (§2.4): probabilidad alta, impacto alto.
- **R22. Contratos transversales sin dueño** (§2.1): alta y alto.
- **R23. Determinismo entre motores de JavaScript** (§7): media y medio.
- **R24. Narrativa que caduca o se repite** (§3.3): alta y medio, porque es visible en la segunda visita.
- **R25. Cálculos discutibles ante el contador** (divisor de horas, auxilio, flujo de nómina): media y alto en credibilidad.

---

## 9. Cambios concretos priorizados (25)

| # | Severidad | Sección | Problema | Cambio propuesto |
|---|---|---|---|---|
| 1 | **Bloqueante** | 9.1, 9.3, 9.4 | 8 o 9 constructores en el mismo árbol con `typecheck`, `lint`, `test` y e2e globales y puerto fijo: el trabajo a medias de uno bloquea la "definición de terminado" de todos; los commits del líder mezclan trabajo ajeno. | Cada constructor trabaja en su **git worktree** (`isolation: worktree`) y el líder fusiona al cierre de la oleada (las carpetas son disjuntas). La definición de terminado se limita a `eslint src/modulos/<m>`, `vitest run src/modulos/<m>` y `tsc` sin errores **en su carpeta**. Playwright con `PORT` por paquete o servidor compartido con `reuseExistingServer`. |
| 2 | **Bloqueante** | 2.3.3, 2.4, 2.5, 5.5, 6.18, 9.4 | Los enlaces profundos con estado (traslado prellenado, semana marcada, filtros, mensaje prellenado, botón resaltado), el "resaltar fila", las emisiones de `EventoUI` y las anclas de `<Pista>` no tienen dueño. D1 y E2 llegan después y no pueden tocar los módulos. | F2-B define en `app/rutas.ts` constructores tipados **con todos los parámetros de consulta** (`?trasladar=`, `?semana=`, `?resaltar=`, `?escenario=`…) y una tabla en CONTRATOS. Cada paquete de 9.4 recibe en sus criterios: los parámetros que **debe honrar**, los `EventoUI` que **debe emitir** y las `<Pista id>` que **debe colocar** (lista de 2.5). |
| 3 | Alta | 5.6.4, 5.6.8, 6.19 I2 | Marca de agua no monótona entre pestañas y marcos; entradas remotas aplicadas en vivo sobre una base más vieja; empate de orden entre pestañas; kardex con saldo negativo al ordenar por `ts`; el toast de W3 no sale si se reconstruye. | (a) `marcaAgua = max(generadoHasta, máxima marca de agua del registro)`; (b) toda entrada remota con marca de agua mayor que el `generadoHasta` local dispara **reconstrucción** en el worker, sin aplicar en vivo; (c) orden total `(marcaAgua, ts, seq, id)`; (d) I2 y el saldo del kardex se calculan en **orden de aplicación** (orden del libro), no por `ts`; (e) el toast remoto se arma con la entrada leída, no con eventos de dominio. |
| 4 | Alta | D11, 5.6.4, 6.21, 9.2 F2-A | En modo construcción (mutación directa) un manejador que falla a mitad deja el estado corrupto; justo el camino de los comandos de usuario omitidos tras un cambio de versión. | Patrón obligatorio `validar(estado, datos) → plan sin efectos`, luego `escribir(plan)` sin `throw`. Prueba genérica: para cada comando con datos inválidos, comparar en profundidad el estado antes y después en **modo construcción** (debe ser idéntico). |
| 5 | Alta | 6.20.5 | `horasMes = jornada × 30 / 7` (180 h para 42 h) infla el valor de la hora en 16,7 %: horas extra, recargos nocturnos y dominicales salen mal ante cualquier contador. | `horasMes = jornada / 6 × 30` (42 h → 210, 44 h → 220), con el divisor como parámetro editable en `ParametrosNomina` y prueba unitaria con un valor conocido. |
| 6 | Alta | 9.2, D12, R17 | F2-A (tipos, 106 comandos con pruebas, motor, generador completo y calibración de P1–P20 a ±15 % en 4 fechas) es la ruta crítica de todo el proyecto y no cabe en una sesión con margen. | Partir F2-A en **F2-A1** (tipos, reglas, comandos y motor) y **F2-A2** (generador con coherencia, determinismo, rendimiento y N1–N13). La calibración de P1–P20 y de los hallazgos pasa a una pista Opus **en paralelo con las oleadas A y B** (dueña de `src/generador/**` y `seed/estacionalidad.ts`), con salida obligatoria antes de la fase 4. |
| 7 | Alta | 5.6.3, 7.3, 7.11, 6.11 | Sin registro, la narrativa es un "día de la marmota" (cumpleaños, "llegó ayer", "no ha marcado" todos los días). Con registro, caduca a los ~12 días y la guía apunta a entidades resueltas. `controlManual` congela para siempre. La sugerencia de renovar llega a los 120 días. | El ancla se fija en la **primera visita** (también sin registro). Si no hay registro y han pasado más de 7 días, se renueva sola; con registro, se sugiere a los 7 días. `selNarrativa()` se vuelve dinámico, con respaldo (la importación que **hoy** está en puerto o nacionalización, el pago grande más próximo…). `controlManual` bloquea solo hasta la siguiente fecha estimada. |
| 8 | Alta | 9.4, 5.16, PROMPT fase 5.3 | Los e2e de paquete verifican pantallas de paquetes paralelos o posteriores (A1→A3/A4/B3, B1→D1, C1→C2, D5→D6). Los ocho flujos "en 390 × 844" no están definidos (el escritorio muestra un aviso a esa anchura). | Los e2e de paquete verifican los efectos cruzados por selectores (`window.__kc`) o por `data-testid` de su propia pantalla. Las verificaciones entre módulos pasan a `e2e/flujos` (fase 4). Para cada flujo se define su variante móvil: la acción se hace en el contexto de escritorio y se verifica el efecto en `/app` a 390 × 844. |
| 9 | Media | 5.12, 9.4 (A2, A3, B1, C1, D3, D4) | Los exportes se reclaman dos veces (desprendible y nómina en C1 y D4, ventas en A3 y D4, kardex, importaciones) y las reglas de oleada impiden reutilizarlos: diseños y totales divergentes. | F2-B crea `src/reportes/definiciones.ts`: 12 definiciones (filtros → columnas, filas desde selectores, totales) más recibo POS, desprendible y factura como plantillas PDF. Los módulos y D4 solo **llaman** a las definiciones; D4 hace la pantalla del centro de reportes. |
| 10 | Media | 5.6.8, 5.6.11, 4.5, R19 | Cada marco (`/app?marco=1` y `/tienda`) construye su estado (1–2,5 s, ~60 MB) y necesita sincronización. El pulso en vivo obliga a llevar el generador al hilo principal. | Los marcos del mismo origen **adoptan el store de `window.parent`** (sin construir ni sincronizar). **Quitar el pulso en vivo.** `BroadcastChannel` como canal entre pestañas (funciona sin `localStorage`), y `storage` solo para persistir. |
| 11 | Media | 7.4–7.9, 6.19 G3 | El plan del generador no lee el estado: las importaciones futuras incluirían productos borrados; los turnos y la nómina, empleados retirados; los pagos ignorarían `programadaPara`; las ventas en efectivo podrían caer con la caja cerrada a mano. | Añadir a 7.4 una **matriz de guardas**: cada tipo de intención frente a los comandos del usuario que la afectan (producto, cliente, empleado o local eliminado o retirado; caja cerrada; CxP pagada o reprogramada; nómina aprobada; importación con control manual; tasa editada) y qué hace la materialización (filtrar, cambiar el medio de pago, omitir). Prueba: 30 comandos "hostiles" y luego construcción al día siguiente con todos los invariantes en verde. |
| 12 | Media | 7.2, 7.14, R12 | `Math.log`, `Math.cos`, `Math.exp` y `Math.pow` no son bit a bit iguales entre V8, JavaScriptCore y SpiderMonkey: Safari (iPhone) puede generar otra historia que la CI y que Chrome. | En `prng.ts` y `calendario-comercial.ts` usar solo `+ − × ÷`, `Math.sqrt` y `Math.floor`: Poisson por inversión con producto acumulado, normal por suma de 12 uniformes o tabla, tendencia con tabla precalculada en la semilla. Proyectos Playwright en WebKit y Firefox que comparen el hash del estado con el de Node. |
| 13 | Media | 5.7, 6.23, 8.9.2, 5.3 | El contrato de `useSel` no garantiza instantáneas estables (React 19 con `useSyncExternalStore` entra en bucle). `ahora` con segundos invalida los cachés. `<GraficoBase>` es presentacional y no puede convertir la moneda, así que cada paquete convertiría las series a mano (W7 "ni una cifra sin convertir"). | En F2-B: `useSel` con caché por referencia de tablas (WeakMap) **y** clave de parámetros serializada, más una prueba de igualdad de referencia; `ahora` cuantizado a minuto en `estado/reloj.ts`; `<GraficoDinero>` en `ui/conectados` que recibe COP y convierte series, ejes y tooltips. |
| 14 | Media | §3 W6, 2.1, 6.20.5, 6.23 `selCostoEmpleado` | "$1.950.000 cuesta ~$2.990.000" solo vale sin comisión ni recargos, pero W6 dice que la comisión sale del POS. El tope del auxilio se prueba solo con el salario básico. | `selCostoEmpleado` con dos modos visibles: **"Salario pactado"** (el número del guion) y **"Este mes, con comisiones y recargos"**. El guion y la prueba exacta usan el primero. Parametrizar `baseTopeAuxilio` (`'devengado'` por defecto, en `porVerificar`). |
| 15 | Media | 6.20.9 | La quincena proyectada usa `costoEmpleador`, que cuenta dos veces la PILA y trata las provisiones como pagos quincenales; no aparecen la prima de junio y diciembre ni las cesantías de febrero. Los recurrentes pueden duplicarse con CxP ya generadas. | Egresos de nómina = neto por quincena + PILA el día hábil 10 + prima el 30/06 y el 20/12 + cesantías el 14/02 + intereses el 31/01. Excluir los meses de recurrentes que ya tienen gasto o CxP. Prueba de no duplicación. |
| 16 | Media | 1.5, 4.7 P2, 7.8 | P2 es aritméticamente imposible: con dos vendedores en Parque 93, Valentina al 43 % deja a Camilo en el 57 %, y el peso ×2,2 daría ~69 %. No hay regla de asignación de vendedor en los ~15 meses sin turnos ni en horas sin cobertura. | Añadir un tercer vendedor en Parque 93 (o cambiar el objetivo a "≈ 55 % de Parque 93 y 45 % sobre el promedio") y recalcular P1, P2 y P15. Definir en el plan global una **plantilla de turnos por semana** usada en toda la ventana (los turnos almacenados solo existen en las 16 semanas visibles) y una regla para horas sin vendedor (el de turno más cercano, o la cajera registra a nombre del local). |
| 17 | Media | 2.3.3, W5, 4.7 P19, 7.10, N5 | El saldo de Hangzhou vence "el viernes", pero el punto bajo cae "entre los días 18 y 28" y "coincide con el saldo, los arriendos y la quincena"; según el día del mes, no pueden coincidir. | Elegir una de dos: el saldo vence en ≈ 3 semanas (y la alerta 3 dice "en 3 semanas") o el punto bajo es "la semana próxima". Que la explicación del punto bajo **la escriba el selector** con los pagos reales de esa semana; la calibración de 7.10 solo garantiza el rango ($10–30 M, nunca negativo). |
| 18 | Media | 5.12 Excel | Los totales con `SUM` sin resultado en caché salen vacíos en las vistas previas (WhatsApp, Gmail, Quick Look, Drive), justo donde el contador o el cliente abrirá el archivo. | `{ formula, result }` con el valor calculado en cada total, `workbook.calcProperties.fullCalcOnLoad = true`, y una prueba que relea el .xlsx y compruebe `result`. |
| 19 | Media | 8.8.1 frente a 6.4 | Faltan ilustraciones para `chaleco`, `tenis`, `medias` y `billetera` (presentes en el catálogo, en P2 y en P6): miniaturas en blanco en Inicio, inventario y tienda. | Añadir los 4 tipos a 8.8.4, con un mapeo explícito `TipoPrenda → ilustración` y una prueba que recorra todo `seed/catalogo` y exija ilustración. |
| 20 | Media | 5.6.12, 7.1, 7.4, 5.11, R16 | El presupuesto móvil (< 2,5 s y < 400 ms de transferencia) es optimista; las revisiones diarias sin índice son cuadráticas; el SW precachea todo en la primera visita. | Criterio de salida de F2-A2: medición con CPU ×4 (construcción + clonación + primer render de `/app`) y una perilla de volumen en `config/demo.ts`. Índices incrementales obligatorios para las revisiones diarias; sin eventos ni sobres en modo construcción; facturas generadas en "aceptada" y conciliación derivada; terminar el worker tras enviar; `setAutoFreeze(false)` en producción; registro del SW diferido hasta construir el estado. |
| 21 | Media | 6.20.3, 6.22, W4 | "Aplicar al inventario" revaloriza **todas** las unidades al último costo, incluso antes de recibir la mercancía (W4 en puerto). El método no se nombra; el arancel de 15 % fijo para confecciones puede ser bajo. | Nombrar el método en la interfaz y en los reportes ("Costo de reposición: última importación aplicada"). Añadir el campo "Otros tributos aduaneros" con ayuda; mantener "valor de ejemplo". (El promedio ponderado queda como opción documentada, no implementada.) |
| 22 | Baja | 7.3, 7.9, I5, 7.14 `rango.test` | La ventana empieza a mitad de mes y los primeros días no tienen existencias: primer mes parcial (parece un desplome en el gráfico de 18 meses) y días sin ventas que rompen la prueba de rango. | `inicioVentana` = día 1 del mes de (ancla − 18 meses), y una **importación de carga inicial** recibida en `inicioVentana − 1`, fuera de la ventana visible. |
| 23 | Baja | 6.15, 6.21, 5.9 | `alerta.descartar` y `notificacion.marcarLeida` van al registro y fijan el ancla sin cambios de negocio. `?hoy=` comparte el registro de `localStorage` y no pasa a pestañas abiertas con `noopener`. | Estado de interfaz (descartadas, leídas) en el store `sesion`. Con `?hoy=`: modo memoria con clave aparte y `hoy` propagado en la URL a los enlaces que abren contextos nuevos. |
| 24 | Baja | 6.6, 6.19 V3/V4, 6.21 | Un separado cancelado reescribe las ventas de su mes original. El saldo a favor por devolución o cambio queda huérfano en ventas sin cliente (≈ 30 %). | La cancelación de un separado **resta en su fecha** (como las devoluciones). `devolucion.registrar` con `saldo_favor` o `cambio` exige cliente (o crea uno rápido); si no lo hay, solo reembolso. El generador aplica la misma regla. |
| 25 | Baja | 2.2.1/8.4.7, 2.6/8.4.3, 3 W7/5.8, 6.23, 5.5, 6.17, 8.7.31, 6.6, 2.3.3/N6, 7.6/6.16 | Contradicciones menores sueltas: entrada con 2 o 3 puertas y wordmark de 72 o 64 px; menú "?" distinto (y "Atajos de teclado" muerto); tasa 4.000 o 4.050; vendedor → `/panel/mi-dia`; pivote "13 dimensiones / 6 medidas" (son 15 y 7) sin regla de totales no aditivos; falta la ruta `configuracion/aduanas` y `tasa.editar`; "Deshacer" sin modelo; `TipoSolicitud` `conteo`/`nomina` sin uso; alerta de Mateo frente a N6; `demandaInsatisfecha` fuera del estado; W7 "tasa de su fecha" frente a D7. | Una pasada de consolidación del líder antes de F2: la sección 8 manda en lo visual y la 2 en el contenido. Fijar la tasa de ejemplo en un solo valor; registrar la ruta y el comando que faltan; quitar "Atajos" y "Deshacer" (o definir deshacer = quitar la última entrada y reconstruir); declarar la regla del pivote (las medidas no aditivas se recalculan en los totales y las unidades por medio de pago se reparten por línea); alerta 4 = "llegó 25 min tarde hoy" después de las 10:25; `demandaInsatisfecha` en `meta`; una sola frase sobre la conversión histórica. |

