# Recorrido del cliente escéptico

**Quién habla:** un dueño de tres locales de ropa masculina en Bogotá. Importo de Guangzhou y llevo todo en Excel y en un cuaderno.
**Cómo lo miré:** build de producción servido en `localhost:4502`, recorrido con Playwright. Solo usé lo que se ve en pantalla, sin leer código. Fueron unos 20 minutos de clics en escritorio (1440×900) y unos 5 en celular (390×844), con la fecha de la demo: jueves 1 de octubre de 2026.

---

## Lo que hice, en orden

1. Entré por `/` y le di a **Entrar como dueño**. Llegué al Inicio con la lista "Prueba esto" abierta.
2. **Punto de venta (Usaquén):** vendí una Camisa Oxford azul cielo talla L y pagué con Nequi. Me salió la venta V-016602 y el cuadro "Lo que acaba de pasar".
3. Me cambié a **vendedor** (Sebastián Cárdenas, Usaquén). Revisé "Mi día" y el inventario, y volví a dueño.
4. **Importaciones:** abrí el tablero y el detalle de IMP-2026-07. La pasé a "En proceso de nacionalización" y miré los tres avisos que deja redactados.
5. **Pagos:** miré el resumen ("lo que debo") y el **flujo de caja** a 30, 60 y 90 días.
6. **Nómina:** abrí "cuánto me cuesta de verdad un vendedor" (Sebastián, $1.950.000).
7. **Inventario por local:** revisé la Camisa Oxford y **pedí un traslado** de 3 unidades talla M de Zona Rosa a Usaquén.
8. **WhatsApp:** vi un escenario armado y después le escribí yo mismo.
9. **Tienda web:** compré una Oxford azul cielo talla M con pago simulado y vi cómo entró a KippiCore.
10. Cambié a **dólares** y recorrí Inicio, Importaciones y Nómina.
11. **Reportes:** descargué el PDF del **Estado de resultados simplificado**.
12. Le puse **mi propio nombre** al negocio.
13. **Celular:** entré por `/` como si abriera el link de WhatsApp. Abrí la app del dueño, **aprobé una anulación** y recorrí Ventas, Inventario, Agenda, Más, "Cómo arrancaríamos" e Importaciones.

En ningún momento se me rompió nada, y todos los botones que toqué hicieron algo.

---

## Lo que me pareció increíble

- **"Lo que acaba de pasar" después de vender:** inventario 3 → 2, ventas del día, comisión de la vendedora y caja, cada cosa con su botón "Ver". Eso es lo que yo hago a mano en el cuaderno al cerrar el día. Aquí se ve al segundo.
- **La grilla de tallas en el POS:** el número grande es lo que hay en este local y el "+N" lo que hay en los otros. Mi vendedor deja de llamar a Zona Rosa a preguntar.
- **Avisos de la importación:** cambio el estado y me deja escrito el WhatsApp para el transportador, para Wilson en la bodega y para la agente de aduanas, cada uno en su tono. Me ahorra media hora de mensajes por pedido.
- **El traslado sale casi solo:** la alerta "se está acabando la talla M en Usaquén" abre el traslado ya armado desde Zona Rosa, con 3 unidades y avisando que en el origen quedan 4 sin bajar del mínimo.
- **El costo real de un empleado:** a Sebastián le pago $1.950.000 y al negocio le cuesta $2.990.941, desglosado en aportes, prestaciones y exoneración. Hice la cuenta y el auxilio, la hora y las provisiones me cuadran. Eso nunca lo he tenido claro.
- **La compra web entra sola a KippiCore:** descuenta de Parque 93 (2 → 1), crea al cliente nuevo y suma a las ventas del día.
- **El flujo de caja me habla claro:** "La plata baja a $15,9 millones en 2 semanas porque la semana del 12/10 pagas…", y nombra cada pago. Eso me sirve más que cualquier gráfico.
- **La app del celular:** oscura y clara, con los cierres de anoche ("Zona Rosa: faltan $40.000"). Aprobar una anulación desde el teléfono, con confirmación, me tomó 3 toques.
- **Personalizar el nombre:** escribí "Caballero Andino" y la tienda y el panel se cambiaron. Ahí se siente mío.

## Dónde me perdí o no entendí

- **Al entrar, la lista "Prueba esto" me tapó** las tarjetas de margen y de efectivo y la mitad de "Requiere tu atención". Mi primer impulso fue cerrarla.
- **"Caja de Usaquén · Nequi +$219.900 · $619.900 → $619.900":** dice que entró plata y la cifra quedó igual. Pensé que estaba dañado. Tuve que ir a Pagos para entender que la caja es solo el efectivo y Nequi va a otra parte.
- En el cambio de estado salía **"WhatsApp · en usted"**. ¿En usted qué? Lo entendí cuando vi "ESPAÑOL · USTED" en la ventana siguiente.
- **"Se genera en Por pagar la cuenta de…"**: así, con mayúscula en la mitad, no se entiende que "Por pagar" es una sección.
- En nómina, **"Se paga a quienes ganan hasta el tope parametrizado"**: esa palabra no es de comerciante.
- En la misma pantalla de nómina sale **"Costo mensual del equipo US$10 mil · 14 personas"** y justo abajo **"En total US$13.924 de nómina"**. ¿Cuál es? Además, la tarjeta "Nómina sobre ventas 13,5 %" tiene de subtítulo "4 contratistas · $41,5 M en los locales", que no tiene nada que ver con el título.
- **La tienda dice "Quedan 2 en tu talla"** en la Oxford M, pero en Zona Rosa hay 6. El cliente piensa que se agota y yo pierdo la venta, o él se afana sin razón.

## Lo que me pareció inútil o de relleno

- **Notificaciones: 94 sin leer**, **"Por conciliar: 26.394 pagos y movimientos"**, y en el celular **"82 productos tienen tallas por debajo del mínimo"**… de 85. Si todo es alerta, ninguna es alerta. Con esto pienso que el sistema me va a llenar de ruido.
- **"Otoño · Invierno 2026"** en la tienda. En Bogotá no hay otoño, eso suena a marca gringa.
- La tienda usa **dibujos y no fotos** de la ropa. Está bonita, pero yo quiero ver cómo se vería con mis fotos.
- Cuando paso a **US$**, el faltante de caja sale como "US$10,13". Nadie cuenta un faltante de caja en dólares.

## Cifras o detalles que me sonaron a mentira

1. **El PDF del Estado de resultados (lo primero que descargué) dice que hoy perdí $46.034.166.** Sale así porque el periodo por defecto es "Hoy" y le carga el arriendo del mes entero a un solo día. Encima, la fila Total no cuadra: "Gastos generales prorrateados" suma $0 en el total, cuando los locales tienen $2,4 M + $2,7 M + $1,3 M. Y los "Gastos operativos" del total dan $49,1 M, mientras que sumando los tres locales dan $42,6 M. Si mi contador ve eso, me dice que el sistema no sirve.
2. **El Inicio me recibe con todo en rojo:** −47 % hoy, −34 % el mes y "Meta del mes: 2 % de $128 M". Es 1 de octubre y claro que voy en 2 %. Pero la primera impresión es que el sistema me muestra un negocio que se cae.
3. **La llegada del IMP-2026-07 tiene cuatro fechas distintas:** la ficha dice "12 días · martes 13 de octubre", el inventario y la alerta "llegan en 10 días", el mensaje a Wilson "hacia el 11/10" y el mensaje al transportador "recogida el 08/10", mientras que la línea de tiempo pone el levante el 10/10. ¿Cuál le creo?
4. **Dos tasas de cambio:** el aviso del modo dólar dice "US$1 = $3.950" y la importación dice "tasa de hoy $3.897,62".
5. **La línea de tiempo de la importación es demasiado perfecta:** en cada paso la fecha estimada es igual a la real. Con China eso nunca pasa, y el mismo sistema dice que Ningbo llega 13 días tarde en promedio.
6. **Los tres locales tienen margen de 65 %** clavado. En la vida real cada local tiene su mezcla.
7. **En octubre, en Bogotá, Usaquén tiene agotados los 7 abrigos y chaquetas.** Es justo lo que más se vende con la lluvia.
8. **El bot de WhatsApp:** le pregunté por un "pantalón chino talla 32 en Usaquén y cuánto vale" y me preguntó cuál de los dos chinos. Le contesté "el elástico" y me ofreció un pantalón, una camisa y un polo elásticos: se le olvidó de qué estábamos hablando. Si un cliente mío ve eso, no vuelve a escribir.
9. Las ventas del día **se mueven solas** mientras uno mira: pasaron de $4,28 M a $5,68 M en 10 minutos, y "Parque 93 va adelante" cambió a "Usaquén va adelante". Si no me lo explican, parece que las cifras se inventan.
10. Le puse "Don Álvaro" y el saludo dice **"Buenas tardes, Don Álvaro"**, pero abajo a la izquierda sigo siendo **Juan Camilo Ospina (JC)**.

## Lo que me haría decir "no" a la compra

- **Que un número salga mal en un reporte que yo le paso al contador.** Con el PDF de −$46 M y una fila total que no suma, se me cae la confianza en todo lo demás.
- **Que el bot de WhatsApp le conteste mal a un cliente mío.** Prefiero no tener bot.
- **Que me llene de alertas** (94 notificaciones, 26 mil por conciliar). Ya tengo suficiente estrés.
- **Que no sé cuánto cuesta.** "Cómo arrancaríamos" me dice etapas de 4 semanas y que me cargan los Excel, cosa que me gustó mucho, pero ni un rango de precio. Tampoco sé si la tienda web y WhatsApp vienen incluidos o se cobran aparte, porque todo dice "vista previa de lo que KippiCore puede construir".
- **El vendedor ve el botón "VER APP DEL DUEÑO"** y el contador de notificaciones del negocio. Si mis vendedores ven lo mío, no lo pongo.

---

## VEREDICTO: **lista con cambios menores**

Lo que importa funciona y engancha: POS, traslados, importaciones con avisos, costo del empleado, tienda conectada y app del celular. No encontré nada roto. Pero **el #1 y el #2 se arreglan antes de mandarla**: es lo primero que ve el cliente (Inicio) y lo primero que le muestra a su contador (el PDF). Hoy esas dos cosas le dicen "este negocio pierde plata" y "las cuentas no cuadran".

## Estado de las correcciones (rama `qa-cliente`)

| # | Arreglo | Estado | Qué se hizo o por qué sigue pendiente |
|---|---|---|---|
| 1 | Estado de resultados (periodo y fila Total) | **CORREGIDO** | El reporte (y la vista Costos y gastos → Estado de resultados, sin `?mes=`) abre en el último mes completo; el 1 de octubre, septiembre. La columna Total suma los locales: "Gastos operativos del local" es la suma de los tres y "Gastos generales prorrateados" es el resto del gasto del negocio (administración y bodega); la utilidad cuadra fila a fila. Pruebas en `src/reportes/reportes.test.ts` y `e2e/paquetes/gastos.spec.ts`. |
| 2 | Inicio y Hoy a comienzo de mes | **CORREGIDO** | "Hoy" sigue comparándose con el mismo día de la semana anterior hasta la misma hora, pero ya no muestra el porcentaje con muestras diminutas (menos de 5 ventas hoy o en la base). El mes a la fecha se compara con el mes anterior hasta la misma fecha y hora; con menos de 7 días del mes, las tarjetas pasan a "últimos 30 días vs. los 30 anteriores" (etiqueta y enlaces incluidos; la app igual). La meta dice "El mes apenas arranca" (primeros 3 días) y después "Vas al X % de lo esperado a hoy". Verificado con `?hoy=2026-10-01T15:30`, `2026-10-15T15:30` y `2026-09-30T15:30` (`src/movil/comparaciones-mes.test.ts`: escritorio y app dicen lo mismo). Ojo: el 1 de octubre a las 3:30 p. m. la demo vende 10 ventas contra 13 el jueves anterior (−34 %): es el dato, no un error de cálculo. |
| 3 | Bot de WhatsApp "Escribe tú" | **CORREGIDO** | Mantiene el hilo: si pregunta "cuál", la siguiente respuesta ("el elástico", "el segundo", "el regular") elige entre las opciones ofrecidas y recuerda talla, local y que pidió el precio; si venía hablando de pantalones, "el elástico" es el pantalón. Entiende tallas de pantalón en letras ("la treinta y dos"), responde el precio y dice cuántas hay en el local que pidió. Pruebas del motor en `src/modulos/canales/canales.test.ts`. |
| 4 | Fechas de IMP-2026-07 | **CORREGIDO** | Una sola función (`llegadaABodega`) alimenta ficha, tablero, "En camino", alertas, calendario, avisos, portal y app. Lo que veía el cliente eran dos cosas distintas: (a) otro pedido (IMP-2026-06 llega en 9 días; IMP-2026-07 en 12) y (b) las fechas que quedan después de pasar el pedido a otro estado (el comando corre los pasos siguientes si el paso se adelanta). Ahora el diálogo "Cambiar estado" dice la nueva llegada antes de guardar, el aviso a bodega y al transportador trae esa misma fecha y la confirmación dice "antes X, ahora Y". Los textos rotulan "llega a bodega" y "levante hacia el…". |
| 5 | Selector de moneda (US$) | **CORREGIDO** (con una excepción) | Una sola tasa vigente en todo; la del día del pedido va rotulada ("Tasa del día en que se hizo el pedido… la misma de todo KippiCore… tasa del día del pago"). Las notificaciones del dominio (campana y alertas) y los subtítulos de Personal siguen la moneda activa. El faltante de caja sigue en US$ (el flujo 6 exige cero pesos en modo dólares) pero con el valor en pesos en el título ("$ 40.000 en efectivo"). |
| 6 | POS, "Lo que acaba de pasar" | **CORREGIDO** | Con pago que no es en efectivo la fila dice "Nequi +$219.900 · no es efectivo" y "Efectivo sin cambio" en lugar de "$619.900 → $619.900". |
| 7 | Toasts y panel "Prueba esto" | **PENDIENTE aquí** | Lo corrige el otro corrector en `main` (guía, toasts del POS). |
| 8 | Vista de vendedor | **CORREGIDO** | Sin "Ver app del dueño", sin selector de moneda y sin notificaciones del negocio; el aviso de pantalla pequeña no ofrece la app del dueño; al entrar como vendedor o bodega la moneda vuelve a pesos. |
| 9 | Datos de ejemplo | **CORREGIDO a medias** | Notificaciones sin leer: 7 (las de más de 7 días nacen leídas). Conciliación: la historia sale conciliada salvo las últimas dos semanas (≈ 830 pendientes, no 26.394). Abrigos y chaquetas: las 7 referencias tienen existencias en Usaquén en octubre (se subió el factor de pedido de la categoría a 0,6 y los abrigos nunca se quedan en cero en un local; se bajó a 156 los días del pedido grande de calzado para que P5 siga en verde en las 4 fechas). **PENDIENTE**: el conteo "82 de 85 referencias bajo mínimo": /app ya usa el mismo selector del catálogo (`selCatalogo`) que el escritorio; la cifra sale de que casi todas las referencias tienen alguna talla o color con menos del mínimo en algún local (1 o 2 unidades por variante). Bajarla exige recalibrar todo el modelo de existencias (riesgo para P1–P22 y para la huella); además el otro corrector toca el "STOCK BAJO" del catálogo. |
| 10 | Personalizar nombre | **CORREGIDO** | El pie de la barra lateral, el avatar, la franja de rol y el menú de rol usan el nombre escrito. |
| 11 | Personal y nómina (dos totales) | **PENDIENTE aquí** | Lo corrige el otro corrector en `main`. Solo se pasó a la moneda activa el subtítulo "… en los locales". |
| 12 | Textos sueltos | **CORREGIDO** | "Temporada fin de año 2026", "Quedan 2 para envío · disponible en otras tiendas", "WhatsApp · le habla de usted"; la línea de tiempo de los pedidos en curso trae desfases de 1 a 4 días entre la estimada y la real (nunca adelantados). |

Huella del determinismo nueva: `src/generador/pruebas/__snapshots__/determinismo.test.ts.snap`. `npm run informe -- --ancla` en 30/09/2026, 19/12/2026, 20/01/2027 y 14/06/2027: 0 patrones FUERA, 0 invariantes rotos, 0 comandos omitidos, narrativa en verde.

---

## Arreglos priorizados (máximo 12)

| # | Pantalla | Qué cambiar | Por qué | Severidad |
|---|---|---|---|---|
| 1 | Reportes → Estado de resultados (PDF y vista) | Que el periodo por defecto sea el **último mes completo** (septiembre), o prorratear arriendos y gastos fijos por días. Corregir la fila Total: "Gastos generales prorrateados" debe sumar los $6,5 M y "Gastos operativos del local" debe ser la suma de los tres locales. | Hoy el primer PDF dice "perdiste $46 M hoy" y el total no cuadra. Un contador lo descarta en 10 segundos. | **crítico** |
| 2 | Inicio (escritorio) y Hoy (app) | El día 1 del mes no comparar "mes vs. septiembre a la misma fecha" ni mostrar "2 % de la meta". Mostrar el ritmo contra el promedio de los jueves o "llevas X de lo esperado para hoy", o mover la fecha de la demo a mitad de mes. | Todo en rojo y con −47 % es la primera impresión: parece que el sistema muestra un negocio quebrándose. | **alto** |
| 3 | Canales digitales → WhatsApp ("Escribe tú") | Que el bot recuerde la conversación (si contesto "el elástico" después de que pregunta cuál chino, es el pantalón) y que responda la talla y el precio que le pidieron. | Hoy pierde el hilo al segundo mensaje. Es justo lo que el cliente va a probar escribiendo él mismo. | **alto** |
| 4 | Importaciones IMP-2026-07, Inventario, alertas y avisos | Sacar todas las fechas de una sola fuente: llegada a bodega, días que faltan, fecha en el mensaje a Wilson y recogida del transportador, coherentes con el levante. | Hoy hay 12 días/13 oct, 10 días, 11/10 y 08/10 para el mismo pedido. Ahí se nota el decorado. | **alto** |
| 5 | Selector de moneda (US$) | Una sola tasa en toda la demo (o decir "tasa de ejemplo" en las dos partes). En modo US$ convertir también las alertas ("Nueva venta en la tienda web: $219.900") y los subtítulos ("$41,5 M en los locales"), y dejar los faltantes de caja en pesos. | Hoy hay $3.950 y $3.897,62, y aparecen pesos mezclados con dólares. "US$10,13 de faltante" suena absurdo. | **alto** |
| 6 | POS → "Lo que acaba de pasar" | Cuando el pago no es en efectivo, no mostrar "Caja de Usaquén $619.900 → $619.900". Mostrar "Nequi (billetera) +$219.900" o "no entra a la caja de efectivo". | Antes y después iguales parece un error justo en la pantalla más vistosa. | **medio** |
| 7 | Toasts (POS, Importaciones, toda la app) y panel "Prueba esto" | Mover los toasts para que no tapen "Emitir factura electrónica" ni "Enviar 3 avisos", o que se cierren en 3 s. Que el panel "Prueba esto" no tape las tarjetas de margen y efectivo ni las alertas la primera vez. | El cliente intenta tocar el botón y no puede, o no ve los números del Inicio. | **medio** |
| 8 | Vista de vendedor | Ocultar "VER APP DEL DUEÑO", el enlace "Abrir la app del dueño", la campana con "94 sin leer" del negocio y el selector US$/CN¥. | El dueño se pregunta qué más ve su vendedor. Rompe la promesa de "cuidar la plata del negocio". | **medio** |
| 9 | Datos de ejemplo (campana, Pagos → Conciliación, inventario en la app) | Dejar cifras creíbles: menos de 10 notificaciones sin leer, cientos (no 26.394) por conciliar, unas 10 referencias bajo mínimo (no 82 de 85) y abrigos con existencias en octubre. | Con tanto ruido parece que las alertas no sirven, y los abrigos agotados en la temporada de frío suenan inventados. | **medio** |
| 10 | Personalizar nombre | Si pongo "Don Álvaro", cambiar también el nombre y las iniciales del usuario en la barra lateral, el menú de rol y la app. | El saludo dice Don Álvaro y la barra sigue en Juan Camilo Ospina (JC): se nota el parche. | **medio** |
| 11 | Personal y nómina (resumen) | Igualar "Costo mensual del equipo" con el total de la barra "Cuánto pesa la nómina" (o explicar que uno es lo pactado y el otro lo de septiembre con comisiones). Que la tarjeta "Nómina sobre ventas" tenga un subtítulo que la explique. Cambiar "tope parametrizado" por "hasta 2 salarios mínimos". | Dos totales distintos en la misma pantalla de plata generan desconfianza. | **medio** |
| 12 | Importaciones (línea de tiempo), Tienda y textos sueltos | Meter desfases realistas de 1 a 5 días entre "Estimada" y "Real". Cambiar "Otoño · Invierno 2026" por algo como "Temporada de lluvias" o "Colección fin de año". Cambiar "WhatsApp · en usted" por "WhatsApp · le habla de usted". Que la tienda no diga "Quedan 2" cuando hay 6 en otro local. | Son detalles que delatan el decorado o suenan extranjeros. | **bajo** |
