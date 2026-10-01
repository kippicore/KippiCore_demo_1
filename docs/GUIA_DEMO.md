# Guía de la demo · KippiCore CRM para HALDEN

**Para Miguel. No se le envía al cliente.** Sirve para presentar la demo en vivo, para enviarla y para responder lo que pregunte. Las rutas son relativas al dominio del despliegue (por ejemplo `/panel/pos`). Las cifras citadas son las de la historia al 30/09/2026; con otra fecha cambian un poco, así que señala siempre la cifra que veas en pantalla.

## Antes de enviar el enlace (10 minutos)

1. **Tasa de ejemplo al día.** En `src/config/monedas.ts`, `TASA_EJEMPLO.valores` (hoy US$ 1 = $ 3.950 y CN¥ 1 = $ 548): pon la TRM del día y vuelve a desplegar. Es la única tasa de toda la demo.
2. **Tu WhatsApp.** En `src/config/marca.ts`, `hablarConKippicore.whatsapp = '57XXXXXXXXXX'` (solo dígitos, con 57). Mientras sea `null`, "Hablar con KippiCore" abre WhatsApp sin destinatario y a ti no te escribe nadie.
3. **Imagen de la tarjeta del enlace.** En `index.html`, `og:image` y `twitter:image` deben ser URL absolutas (`https://<dominio>/og/halden-og.png`). Con la ruta relativa que trae hoy, WhatsApp puede mostrar el enlace sin imagen. Pega el enlace en un chat contigo mismo para verlo.
4. **Pruébala limpia.** Ábrela en una ventana de incógnito (o en otro navegador), en el computador y en tu celular. Tu propio navegador guarda lo que hayas hecho: usa Configuración › Datos › "Restaurar" o el menú "?" › "Restaurar datos de la demo" (te pide escribir RESTAURAR).
5. **Revisa el día del mes.** Si el enlace va a abrirse el 1, 2 o 3 del mes, el Inicio sale con "mes contra mes" y la meta en rojo (el 1/10 se veía −47 % y "2 % de la meta"). Es matemático, pero se lee como un negocio en caída. Lo mejor es enviarla a mitad de mes; si no se puede, avísale al cliente en el mensaje.
6. **No cambies la historia después de enviarla.** Si tocas `config/` o `seed/` con el enlace ya enviado, sube `versionGenerador` en `src/config/demo.ts` (hoy 4) y actualiza la huella de determinismo (ver README).

## Guion de 10 minutos

Funciona igual en vivo o como recorrido sugerido. El panel flotante "Prueba esto" lleva a casi todos estos pasos con un clic; si te tapa algo, minimízalo (se despliega solo la primera vez, en Inicio).

| Min | Qué mostrar | Ruta | Qué decir o señalar |
|---|---|---|---|
| 0:00 | Entrada. Que se reconozca: moda masculina, Bogotá, tres locales, datos al día de hoy. Si quieres, "Personalizar con el nombre de mi negocio" y escribe el suyo | `/` | "Esto es una marca de ejemplo; mira cómo queda con el nombre de ustedes." Cambia el wordmark, la tienda, las facturas y los PDF |
| 0:30 | Entrar como dueño. Saludo con las ventas de hoy y los tres locales comparados | `/panel/inicio` | Las cifras son de hoy y por local. La lista "Requiere tu atención" sale sola de los datos |
| 1:15 | Registrar una venta: elegir talla en la grilla, asociar a Andrés Gutiérrez, pagar parte en efectivo y parte por Nequi | `/panel/pos` | "En menos de un minuto." La grilla de tallas muestra lo que hay en este local y el "+N" de los otros |
| 2:15 | Mirar "Lo que acaba de pasar" | `/panel/pos` (panel tras vender) | Inventario −1, ventas de hoy, comisión del vendedor (sobre la venta sin IVA), cliente +1 compra y la caja. Pulsa un "Ver" |
| 3:00 | Alerta de talla agotada y traslado de camisas entre locales | `/panel/inventario/HL-CAM-0142` | La matriz talla × color × local y la columna "En camino". El traslado sale armado desde donde sobran |
| 4:00 | Mover una importación y avisar a quien le toca | `/panel/importaciones/IMP-2026-07` | Pasa el estado a "En proceso de nacionalización". Salen los avisos al transportador, a bodega y a la agente de aduanas, en usted. A la fábrica no se le avisa |
| 5:15 | Costo aterrizado de la camisa | `/panel/importaciones/IMP-2026-07/costo-aterrizado` | De US$ 11,40 en fábrica a cerca de $ 71.850 puesta en bodega, con margen cercano al 61 %. Mueve el control del dólar y mira el precio sugerido |
| 6:00 | Flujo de caja a 90 días | `/panel/pagos/flujo` | La frase que escribe el sistema sobre el punto más bajo y los pagos de esa semana |
| 6:45 | Costo real de un vendedor | `/panel/personal/sebastian-cardenas/costo` | $ 1.950.000 de salario cuestan cerca de $ 3 millones; con comisiones y recargos de este mes, cerca de $ 4,6 millones. Prueba la exoneración y el comparativo por prestación de servicios |
| 7:30 | Ver el sistema como vendedor | Selector de rol, arriba (`/panel/mi-dia`) | Menú reducido, sin costos ni márgenes, local fijo, "Solo consulta" en otros locales. Vuelve a dueño con el botón de la franja |
| 8:15 | Armar el próximo pedido a China | `/panel/importaciones/sugerir` | Cantidades por talla y color según lo que rota, lo que hay y lo que viene en camino; costo en dólares y pesos; borrador en inglés para la fábrica |
| 9:00 | Ver app del dueño: escanear el QR con el celular | Botón "Ver app del dueño" (arriba) y `/app` | "Cierres de anoche" (Zona Rosa con un faltante) y "Para aprobar". Aprueba una anulación desde el celular |
| 9:45 | Cierre | `/panel/como-arrancariamos` | Etapas de unas 4 semanas, empezando por lo que más duele. "Cargamos tus Excel nosotros." Botón "Hablar con KippiCore" |

Si sobra tiempo o el cliente se engancha: `/panel/canales/whatsapp` (bot que conoce el inventario), `/tienda` (compra en la tienda y mira la venta llegar a Ventas con canal Web), `/panel/reportes?reporte=contador` (Excel para el contador), `/panel/analisis/tabla-dinamica`.

## Momentos wow

| # | Qué es | Ruta | Cómo provocarlo | Qué señalar |
|---|---|---|---|---|
| W1 | Una venta mueve todo el negocio | `/panel/pos` | Vender una prenda con cliente y pago mixto (efectivo + Nequi) | En "Lo que acaba de pasar": inventario −1, ventas de hoy sube lo vendido, comisión del vendedor, cliente +1 compra, caja. Cada "Ver" lleva a la fila resaltada |
| W2 | Qué hay en cada local, sin llamar | `/panel/inventario/HL-CAM-0142` | Tocar la celda en cero de Usaquén y crear el traslado; pasarlo a "En tránsito" y "Recibido" | Las dos celdas cambian a la vez; el total por local cuadra; hay 48 camisas "En camino" |
| W3 | Dónde viene la mercancía y quién recibe el aviso | `/panel/importaciones/IMP-2026-07` y `/seguimiento/IMP-2026-06` | Cambiar el estado a nacionalización; abrir "Ver como la agente de aduanas" y reportar el levante desde el portal | Mensajes ya redactados en usted, sin aviso a la fábrica; la bandeja "Enviado (simulación)"; en la otra pestaña llega la alerta sin recargar |
| W4 | Lo que de verdad te cuesta una camisa | `/panel/importaciones/IMP-2026-07/costo-aterrizado` | Mover "¿Y si el dólar sube?"; "Aplicar al inventario" | Cascada de US$ 11,40 a cerca de $ 71.850; margen que cae y precio sugerido (terminado en ,900) |
| W5 | La plata de los próximos 90 días | `/panel/pagos/flujo` | Alternar 30, 60 y 90 días y tocar el punto más bajo | La frase con la semana apretada y los pagos que la causan; reprogramar un pago mueve la línea |
| W6 | Lo que de verdad te cuesta un empleado | `/panel/personal/sebastian-cardenas/costo` | Cambiar entre "Salario pactado" y "Este mes"; activar y quitar la exoneración | $ 2.990.941 con exoneración y $ 3.254.191 sin ella (modo pactado); cerca de $ 4,6 millones el mes con comisión y recargos |
| W7 | Todo en dólares o yuanes (utilidad) | Selector de moneda, arriba | Cambiar a US$ desde Importaciones | Franja "Estás viendo todo en US$" con la tasa usada; la cifra original sigue junto a la convertida. Vuelve a pesos en la siguiente visita |
| W8 | Lo que ve tu vendedor | Selector de rol → Vendedor · Usaquén (`/panel/mi-dia`) | Cambiar de rol, intentar un descuento grande | Menú reducido, sin costos; descuento de más del 15 % y anulaciones requieren al dueño |
| W9 | WhatsApp que conoce tu inventario | `/panel/canales/whatsapp` | Elegir "Consulta de talla" y luego escribir tú: "¿tienen la Oxford azul clarita en talla M?" | Responde con las existencias por local y el precio, y pasa con una persona para cerrar. Es una vista previa simulada |
| W10 | Tu negocio en el bolsillo | `/app` (QR desde "Ver app del dueño") | Escanear el QR; aprobar un descuento y una anulación; instalarla | Modo oscuro, cifra del día, ventas por hora, "Para aprobar". La venta hecha en el computador llega por el QR |
| W11 | Cierre de caja de los tres locales, cada noche | `/app` › Hoy › "Cierres de anoche" (escritorio: `/panel/pos/caja`) | Tocar la caja de Zona Rosa; marcar "Revisado" con una nota | "Zona Rosa: faltan $ 40.000"; arqueo ciego: quien cierra cuenta sin ver cuánto debería haber |
| W12 | Arma el próximo pedido a China | `/panel/importaciones/sugerir` | Elegir la fábrica de camisas, ajustar cantidades, "Crear pedido en Cotizado" | Matriz talla × color con lo que rota, lo que hay y lo que viene; costo en US$ y pesos; corrige la talla M que se agota en lugar de repetir el error |

Si los números de pedido de la tabla no coinciden (por ejemplo `IMP-2026-07`), es porque abrieron la demo otro día: llega por las alertas de Inicio o por el tablero en `/panel/importaciones`.

## Preguntas probables

**"¿Esto ya funciona con mis datos?"**
No: todo lo que ve es ficticio (nombres, cifras, productos). Lo que sí funciona con datos reales es la lógica: una venta mueve inventario, caja, comisión y cliente. En la implementación cargamos sus Excel (referencias, existencias, clientes, proveedores); el botón "Importar desde Excel" de la demo es una simulación de ese paso. Ofrece una sesión de 20 minutos con su Excel real para mostrarlo con sus propias referencias.

**"¿Puedo facturar de verdad?"**
No con la demo: la factura electrónica y el documento POS son simulados, llevan marca de agua y no se envían a la DIAN. Para la implementación, el sistema tiene que convivir con su facturador y con su contador. [COMPLETAR: define qué ofreces, por ejemplo integración con su proveedor tecnológico actual o definirlo con su contador, y no prometas nada que no vayas a construir.]

**"¿Funciona en el celular?"**
La app del dueño (`/app`) está hecha para el celular y se instala como app (en iPhone, Compartir › Agregar a inicio; en Android, menú ⋮ › Instalar app; mejor desde Safari o Chrome, no desde el navegador interno de WhatsApp). El sistema completo está pensado para computador o tablet; por debajo de 1024 px de ancho muestra un aviso. La tienda web sí se ve bien en celular.

**"¿Y si se cae el internet?"**
En la demo, después de la primera visita con conexión, la app queda guardada en el dispositivo y puede abrirse sin internet; no lo vendas como garantía, no está probado a fondo. En la implementación, seguir vendiendo sin conexión y sincronizar al volver es una capacidad que se diseña con ellos, y así lo dice la página "Cómo arrancaríamos" sin cifras ni garantías. Sugerencia: pregúntale cuánto se cae hoy su internet en cada local antes de comprometerte.

**"¿La tienda web y el WhatsApp vienen incluidos?"**
La demo los muestra como "vista previa de lo que KippiCore puede construir": la tienda ya está conectada al inventario (una compra descuenta y entra a Ventas con canal Web) y el bot de WhatsApp es una simulación. [COMPLETAR: define si van en el precio base, como etapa posterior o como opcionales.] Ten presente que un WhatsApp real exige una cuenta de WhatsApp Business con un proveedor autorizado, que puede tener un costo aparte.

**"¿Cuánto cuesta / cuándo lo tendría?"**
[COMPLETAR: precio y plazo.] Sugerencia de enfoque: no empieces por una cifra total, empieza por las etapas que muestra "Cómo arrancaríamos": Etapa 1 punto de venta, inventario por local y cierre de caja (semanas 1 a 4); Etapa 2 importaciones, proveedores y pagos (5 a 8); Etapa 3 nómina, turnos y reportes para el contador (9 a 12). Presenta el precio por etapa, empezando por lo que más le duele, y compáralo con el costo de las horas que hoy se van en cuaderno y Excel. Aclara que los plazos son aproximados y se fijan con su operación. Cierra pidiendo los 20 minutos con su información real para cotizar con precisión.

**"¿Mis vendedores pueden ver costos?"**
No. El rol vendedor no ve costos, márgenes, salarios ni pagos; queda fijo en su local, ve el inventario de los otros locales solo para consultar, no puede anular ventas (las pide y las aprueba el dueño), necesita aprobación para descuentos de más del 15 % y cierra la caja con arqueo ciego. Se lo puedes mostrar en vivo con el selector de rol. (Ver advertencia sobre lo que aún puede quedar a la vista en el rol vendedor.)

**"¿Quién ve los datos?"**
En la demo, nadie más que esa persona: lo que registra se guarda en su navegador y KippiCore no lo ve; no hay cuentas ni contraseñas. En la implementación los datos son del cliente, con usuarios y roles. [COMPLETAR: dónde se alojan, quién tiene acceso del lado de KippiCore y cómo se respalda.]

## Qué es simulado y qué funciona de verdad

| Simulado | Funciona de verdad |
|---|---|
| Factura electrónica, documento equivalente POS, notas crédito y nómina electrónica: con marca de agua, sin validez fiscal, no van a la DIAN | Los cálculos entre módulos: una venta mueve inventario, caja, comisión, cliente, Inicio, Análisis y la app |
| Mensajes: se muestran en la bandeja "Enviado (simulación)". Los botones abren WhatsApp o el correo con el texto listo, pero **sin destinatario**: nunca le llega nada a nadie | Los enlaces `wa.me` y `mailto:` (abren de verdad, con el mensaje prellenado) |
| Bot de WhatsApp e Instagram, pagos de la tienda web, WeChat | La tienda web conectada al inventario y a Ventas |
| Cálculos laborales, tributarios y aduaneros: ilustrativos, con valores de ejemplo que se validan con el contador y el agente de aduanas | La estructura del cálculo: salario, aportes, prestaciones, costo aterrizado, flujo de caja, con parámetros editables en Configuración |
| Tasas de cambio: de ejemplo, editables | La conversión: al editar la tasa cambia toda cifra visible |
| "Importar desde Excel": simulación | PDF y Excel exportados: reales, se descargan y se abren |
| Los datos: ficticios, generados en el navegador | La app del dueño como PWA instalable, los códigos EAN-13 y el QR |
| Compartir celular y computador: no hay servidor | El QR lleva las últimas acciones al celular |

## Advertencias

- **Los datos son por navegador.** Celular y computador no comparten nada, salvo lo que viaja en el QR de "Ver app del dueño" (las últimas 1 a 3 acciones). Si el cliente hace una venta en el computador y abre `/app` directo en el celular, no la verá. En `/app` hay un chip "Datos de ejemplo de este celular" que lo explica.
- **"Restaurar datos".** Está en Configuración › Datos (`/panel/configuracion/datos`) y en el menú "?". Pide escribir RESTAURAR y deja todo como al inicio. Úsalo antes de presentar o si el cliente te presta su pantalla. No es lo mismo que borrar los datos del navegador.
- **La fecha es la real.** Los 18 meses de historia se generan hacia atrás desde el día que se abre; la fecha de la primera visita queda fija y, sin cambios del usuario, se renueva sola a los 7 días. Las cifras exactas de este guion son del 30/09/2026.
- **La moneda es de cada pestaña.** Si cambias a dólares, en la siguiente visita vuelve a pesos. En `/app` en otra pestaña hay que cambiarla en Más › Moneda. La tasa editada sí se comparte.
- **Navegador interno de WhatsApp.** Si el cliente abre el enlace desde el chat, lo verá en el navegador interno: la entrada se lo avisa. Para instalar la app y que se guarden bien los datos, que lo abra en Safari o Chrome.
- **Pantalla pequeña.** El escritorio no se pinta por debajo de 1024 px; muestra un aviso y lleva a la app.
- **Tasa y WhatsApp.** Revisa los dos puntos de "Antes de enviar" (la tasa de ejemplo y tu número); son lo único que debes ajustar a mano.
- **El enlace se puede reenviar.** Por eso el dueño de la demo tiene un nombre ficticio y los mensajes no llevan destinatarios reales.

## Defectos conocidos menores

Los dejó marcados como PENDIENTE la revisión visual (`docs/qa/visual.md`). Ninguno rompe nada ni se ve vacío; son detalles que conviene conocer por si el cliente los nota.

- **Inventario:** todos los abrigos tienen exactamente el mismo margen (62 %). Es un dato de ejemplo; si preguntan, es de ejemplo.
- **Tienda en celular:** las tarjetas laterales del collage de la portada quedan recortadas por los bordes de la pantalla.
- **Turnos:** en la leyenda, "Intermedio" y "Cierre" salen con el mismo horario (12 p. m. a 8 p. m.).
- **Punto de venta como vendedor:** con el carrito vacío aparece "Tu solicitud de 20 % espera al dueño", aunque no corresponda a lo que se ve.
- **Punto de venta, después de vender:** si se paga con Nequi, "Caja de Usaquén" muestra el mismo valor antes y después ($ 300.000 → $ 300.000), porque la caja es solo efectivo. Parece que no pasó nada, pero la plata entró a Nequi. Explícalo si lo ven.
- **Puntos de las pistas:** en algunas pestañas el punto camel de ayuda se monta sobre la última letra ("Flujo de caj●").
- **Píldora "Prueba esto":** aunque esté minimizada, tapa un poco la esquina inferior derecha de algunas pantallas.
- **Columnas apretadas:** en Ventas y en el POS, algunos textos se cortan con puntos suspensivos ("Transfere…", "Andrés Gutiérre…").
- **Flujo de caja:** el gráfico se titula "próximos 30 días", pero también muestra las últimas semanas reales.
- **Tienda:** el botón "Elige una talla" (deshabilitado) tiene poco contraste.

Además, el recorrido del cliente escéptico (`docs/qa/cliente.md`) dejó observaciones que ese documento no marca como corregidas. Verifica estas antes de presentar, sobre todo las dos primeras:

- **Estado de resultados (reportes y PDF):** el periodo por defecto llega hasta hoy. Los primeros días del mes (o con "Hoy") carga el arriendo completo contra pocos días de ventas y sale una pérdida enorme, y la fila de totales puede no cuadrar. Descarga el PDF con el mes anterior completo.
- **Inicio el día 1 del mes:** comparativos y meta salen en rojo (ver "Antes de enviar").
- **WhatsApp "Escribe tú":** el bot puede perder el hilo en el segundo mensaje. Pruébalo con las frases guionadas antes de dejar que el cliente escriba libre.
- **Fechas de llegada de una importación:** pueden diferir entre la ficha, el inventario y los mensajes.
- **Ruido de alertas:** muchas notificaciones sin leer y muchos pagos "por conciliar"; si lo notan, es de datos de ejemplo.
- **Rol vendedor:** puede mostrar el botón "Ver app del dueño" y el contador de notificaciones del negocio; confírmalo antes de mostrar W8.
- **Personalizar el nombre:** si el cliente escribe su nombre, el saludo lo usa pero la barra lateral puede seguir con el nombre del dueño ficticio.

## Mensaje para enviar el enlace por WhatsApp

Versión principal:

> Hola {NOMBRE}, buenas. Te dejo la demo de KippiCore CRM con la que hablamos, armada como se vería tu negocio: tus locales, inventario por talla, importaciones desde China, pagos y nómina, todo en un solo lugar.
> {ENLACE}
> Ábrela en el computador y, cuando quieras, mírala también en el celular. Los datos son de ejemplo. Cuéntame qué te llama la atención y lo vemos con calma.

Versión alternativa, más corta:

> {NOMBRE}, te comparto la demo: {ENLACE}
> Pruébala 10 minutos en el computador (registra una venta, mira la importación y el flujo de caja). Es con datos de ejemplo; después me cuentas qué le cambiarías para tu negocio.

Antes de enviarlo: reemplaza {NOMBRE} y {ENLACE}, y comprueba que la tarjeta del enlace muestra la imagen de HALDEN.
