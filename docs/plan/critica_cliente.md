# Crítica del plan desde el cliente: "¿esto me venderá?"

**Revisor:** agente `cliente-esceptico`, en dos papeles: (A) el dueño de los tres locales y (B) un consultor comercial que le ha vendido software a comerciantes colombianos.
**Material leído:** `docs/PRD.md` completo; `docs/PLAN.md` §1–4 y §8 con atención; §5–7 y §9–10 hojeadas para entender qué se construye; `docs/DECISIONES.md`.
**Fecha:** 30/09/2026.

> Las cifras legales y tributarias que menciono (reforma laboral, documento POS electrónico, retenciones del datáfono, etiquetado de confecciones, aranceles) las cito de memoria de comerciante y consultor. Antes de ponerlas en pantalla, **verificarlas con el contador o el agente de aduanas**, igual que el PRD ya pide con los recargos.

---

## Parte A — La voz del dueño

### A.0 Veredicto en una frase

Mire, el plan está muy bien pensado y se va a ver muy bonito. Pero hoy me vende **"un software elegante para un negocio que se parece al mío"**, no **"mi negocio funcionando sin cuaderno"**. Hay tres o cuatro detalles de importación, nómina y caja que, si los ve mi contador o los veo yo, me hacen pensar que quien lo hizo nunca ha importado una camisa ni ha cuadrado una caja. Eso se arregla, y lo que falta son dos o tres momentos que me resuelvan los problemas que de verdad me quitan el sueño: **que no me roben en la caja, qué le pido a la fábrica, y cuánto me queda a fin de mes.**

### A.1 Los primeros 30 segundos

**Lo más probable: me llega el link por WhatsApp y lo abro en el celular.** El plan lo sabe (2.1, "recorrido alterno") y eso me gusta. Pero:

1. **Lo primero que veo no es la demo, es la tarjetica del link en WhatsApp.** El plan no dice qué título, qué texto ni qué imagen sale ahí. Si sale "Vite + React" o un cuadro gris, ni lo abro hasta la noche. Tiene que salir algo como "HALDEN · Tu negocio en un solo lugar" con una imagen negra elegante.
2. **WhatsApp abre el link en su navegador interno.** Ahí no puedo "agregar a la pantalla de inicio", y lo que haga queda guardado en ese navegador raro, no en Safari ni en Chrome. La pista "Compartir → Agregar a inicio" (2.5) no me va a funcionar y voy a pensar que está dañado.
3. **"KIPPICORE CRM · DEMO PARA HALDEN".** ¿Quién es HALDEN? Mi tienda no se llama así. Y adentro me dicen "Buenas tardes, Juan Camilo". **Yo no soy Juan Camilo.** Entiendo la razón (si reenvío el link, que no salga mi nombre), pero el efecto en los primeros 10 segundos es "esto es una plantilla que le mandan a todo el mundo". El plan promete "reconocimiento inmediato: este es mi negocio" y abre mostrándome el negocio de otro señor.
4. En el computador, la entrada (2.2.1) está bien: limpia y con dos puertas. Lo que me engancha de verdad es la frase "tres locales, inventario, importaciones, pagos y nómina, al día y sin cuaderno". Eso sí es mío.

**Qué me engancharía en 30 segundos:** que me pregunte "¿Cómo se llama tu marca?" y, al escribirla, que todo diga MI marca: el logo de arriba, la tienda web, las facturas y los PDF. Eso sí es "este es mi negocio". Lo demás es decoración.

### A.2 Los primeros 10 minutos

**Lo que me engancha**
- El saludo que me habla de plata ("Hoy llevas $7.260.000 en 19 ventas, 14% más que el miércoles pasado"). Así pienso yo. Muy bien.
- La alerta "Se está acabando la Oxford azul talla M en Usaquén… en Zona Rosa hay 6". Esa llamada la hago todos los días.
- La venta que mueve todo (W1). Ver el inventario bajar de 5 a 4 y la caja de Usaquén subir es lo que me convence de que el sistema "piensa".
- El costo real de la camisa (W4). Eso nadie me lo ha mostrado nunca así.
- Lo que ve el vendedor y lo que no ve (W8). Que mis vendedores no vean costos ni márgenes es condición para comprar.

**Dónde me pierdo**
- **Inicio tiene demasiado.** Seis tarjetas, gráfico, cinco alertas, tres locales, top 5, cinco sin movimiento, eventos, hallazgo, el panel "Prueba esto", un punto que titila y una campanita. Todo al tiempo. En mi portátil (que no es de 1440, es de 1366 y con la barra del navegador me quedan como 650 de alto) voy a ver el saludo, las tarjetas y de pronto media alerta. El resto, si no bajo, no existe.
- **La barra lateral de 16 módulos.** Para mí está bien porque soy el dueño; pero si la veo pienso "mis vendedores se van a enredar". Lo arregla el rol vendedor, pero solo si lo pruebo.
- **Las 13 etapas de la importación.** Yo pienso en seis cosas: pagué anticipo, ya está lista, ya zarpó, llegó a puerto, ya tiene levante, llegó a la bodega. Trece puntos en una línea me cansan.
- **La letra.** Etiquetas de 10 y 11 px en gris, en mayúsculas espaciadas. Yo ya uso gafas para leer. Si tengo que acercarme a la pantalla, me aburro.

**Dónde me aburro**
- La tabla dinámica. Bonita para el contador; a mí no me dice nada. Bien que esté en "Para ir más lejos".
- Calendario, facturación, reportes: los voy a abrir un segundo para ver que existen y me salgo. Está bien que sean "muy importante" y no "imprescindible".
- El cambio de moneda a yuanes. ¿Para qué quiero ver las ventas de Usaquén en yuanes? En dólares, solo lo de importaciones.

**Qué me sobra**
- El "pulso en vivo" de la app (ventas inventadas que aparecen solas). Si estoy mirando el celular y aparece una venta que no hice, voy a pensar que hay algo raro o que me están "metiendo" números.
- Instagram, si va a quedar a medias (está como complemento). Prefiero WhatsApp bien hecho que dos cosas regulares.
- El mensaje a la fábrica china avisándole que "empezó la nacionalización" (ver W3). A la china no le importa eso.

### A.3 Los momentos wow, uno por uno

| # | Momento | ¿Me sorprende? | Lo que le falta o le sobra |
|---|---|---|---|
| W1 | Una venta mueve todo | **Sí, mucho.** Es el corazón | Que el dueño pueda escoger a qué vendedor se le asigna la venta (si la registro yo, ¿a quién le cae la comisión?). La comisión sobre el total **con IVA** (decisión registrada) me suena mal: el IVA no es mío. Que el chino no cueste igual que la camisa ($219.900 los dos). "Recibo POS" puede sonar viejo para mi contador (ver Parte B) |
| W2 | Qué hay en cada local | **Sí.** Es el que más uso | Perfecto. Añadiría "vienen 48 en la importación, llegan en 12 días" dentro de la misma matriz, y que el vendedor pueda anotar "un cliente pidió M y no había" (venta perdida) |
| W3 | Dónde viene mi contenedor | **A medias, y con un error de fondo** | **Los avisos van al revés.** Yo no le aviso a la agente de aduanas que "pasó a nacionalización": ella es la que nacionaliza y me avisa a mí. Y a la fábrica no le escribo para eso. Lo que de verdad me ahorraría trabajo es: cuando la agente actualiza (portal), el sistema me avisa a mí, le avisa al transportador para que recoja y a Wilson para que haga espacio en bodega. Y cuando yo pago el saldo, le avisa a la fábrica que mande el BL. Además: con las chinas hablo por **WeChat** (y algunas por WhatsApp), y se hacen llamar "Lily", "Cherry", "Vivian"; nadie es "Ms. Chen Li" a secas |
| W4 | Lo que de verdad cuesta una camisa | **Sí, muchísimo** | Me falta la pregunta siguiente: **"¿a cuánto la tengo que vender ahora para no perder margen?"**. Al mover el dólar, que me diga "Precio sugerido para mantener tu 61%: $239.900". Y la tasa de ejemplo tiene que parecerse al dólar del día; yo sé a cómo está el dólar hoy, y si me ponen uno que no es, desconfío de todo lo demás |
| W5 | La plata de 90 días | **Sí, si cuadra** | Hoy no cuadra: la alerta dice que el saldo a la fábrica vence **el viernes**, y el punto más bajo es "la semana del 19 de octubre… coinciden el saldo a Hangzhou Lanxin, los arriendos y la quincena". O es el viernes o es el 19. Los arriendos los pago los primeros días del mes, no el 19. Y en 90 días desde hoy cae **la prima de diciembre**: si no aparece, el contador se ríe |
| W6 | Lo que cuesta un empleado | **Sí, pero me la están contando incompleta** | Los $2.990.000 de Sebastián salen **sin la comisión**. La comisión también es salario y paga prestaciones y seguridad social. Sebastián, con su comisión del mes, me cuesta más de $4,5 millones, no $3. Si el contador hace la cuenta, se cae la credibilidad de todo el módulo. Y lo que más me está doliendo este año no aparece: **la reforma**. Si el recargo nocturno arranca a las 7 p. m., mis turnos de cierre hasta las 8 (y Zona Rosa hasta las 9) pagan recargo todos los días, y el domingo cada vez me sale más caro |
| W7 | Todo en dólares o yuanes | **Me da igual** para las ventas; **me sirve** para importaciones y proveedores | Si lo dejo en dólares y vuelvo mañana, voy a ver "US$ 1.815" en ventas del día y me voy a asustar. Debe verse clarísimo que estoy en otra moneda, y volver a pesos solo |
| W8 | Lo que ve el vendedor | **Sí.** Me da tranquilidad | Añadir lo que el vendedor **no puede hacer**: anular ventas, dar más de X% de descuento sin permiso, ajustar inventario. Eso es lo que me preocupa, más que lo que ve |
| W9 | WhatsApp que conoce el inventario | **Sí**, la respuesta con el stock por local es muy buena | Mis clientes de Parque 93 no quieren hablar con un robot. Mostrar que el bot contesta lo repetitivo ("¿precio?", "¿hay en M?", "¿hacen envíos?") y **pasa a Valentina** para cerrar. Y a mis clientes VIP de 50 años yo les hablo de **usted** |
| W10 | El negocio en el bolsillo | **Sí**, la app con "Para aprobar" es lo que más me gusta del plan | Pero si registro una venta en el computador y luego la busco en el celular **y no está**, se me cae todo: "esto es de mentiras". El aviso de una línea en el modal del QR no alcanza; nadie lo lee |

### A.4 Los momentos wow que faltan

1. **"Cada noche, el cuadre de los tres locales en mi celular."** Este es el que me vende. Hoy no sé si la caja de Zona Rosa cuadró hasta que voy. Quiero ver: Usaquén cuadró, Parque 93 cuadró, **Zona Rosa: faltan $40.000 en efectivo, cerró Natalia**. Con el cierre "a ciegas" (el cajero cuenta sin ver cuánto debería haber), los descuentos grandes que me piden aprobación y las anulaciones que solo hago yo. En el plan el cierre de caja es "muy importante" y no tiene momento wow. Para un dueño con tres locales que no puede estar en todos, **el control es lo primero**, antes que el contenedor.
2. **"Arma el próximo pedido a China."** Hoy decido qué le pido a la fábrica a ojo y con el Excel. Si el sistema me dice: "Para diciembre pide 420 Oxford: M 160, L 120, XL 60, S 55, XXL 25; en azul el 35%. Ya vienen 48 en el IMP-07. Costo estimado US$4.788, unos $19 millones; margen esperado 61%", y me deja el pedido redactado en inglés para mandárselo a Lily por WeChat… eso me ahorra una semana. Es el puente entre Análisis, Inventario e Importaciones, y responde la pregunta que me hago cada vez que pido.
3. **"Lo que me queda este mes."** No el margen bruto: lo que me queda después de arriendos, nómina, datáfono y todo. En el Inicio y en la app. Esa es la pregunta del dueño, la que hace a fin de mes.
4. **"Lo que vendí con tarjeta contra lo que me consignaron."** Vendo $100 millones con datáfono y me llegan bastante menos: comisión y retenciones. Si el sistema me muestra la diferencia y me dice cuáles retenciones puedo descontar, mi contador lo ama.
5. **(Opcional, pero me haría reír de reconocimiento) "El riesgo que no veía":** que el sistema me avise "Daniela y Juliana están por prestación de servicios pero tienen turno fijo y marcan entrada: riesgo de contrato realidad". El plan hoy **modela justamente eso como normal** (contratistas con turnos y asistencia); un contador lo ve y piensa que el sistema me mete en problemas. Si en cambio me lo advierte, siento que me cuida.

### A.5 ¿Se ve mi negocio real?

**Lo que sí suena a mí**
- Parque 93, Usaquén y Zona Rosa, la bodega en Puente Aranda, el sastre de arreglos en Usaquén, el mercado de las pulgas el domingo. Muy bien.
- Precios terminados en ,900. Camisa a $219.900, blazer a $789.900, traje a $1.490.000: creíble para gama media-alta.
- Nequi, Daviplata, separados, datáfono. Prima de junio, Día del Padre, Amor y Amistad, Black Friday, diciembre. Bien.
- Agencia de Aduanas "Nivel 2", Buenaventura, levante, el agente de carga aparte del de aduanas. Bien.
- Nombres de empleados y clientes colombianos. Bien. (Un detalle: que el único "Brayan" sea el auxiliar de bodega de salario mínimo es un cliché que en Bogotá se lee con malicia. Cámbienlo.)

**Lo que me sonaría falso o me daría desconfianza**

| Detalle | Por qué suena falso | Dónde está |
|---|---|---|
| **420 clientes** | Con ~900 ventas al mes y 70% con cliente, cada cliente me estaría comprando cada tres semanas. Yo tengo más clientes que eso en un solo local. Al abrir Clientes y ver "420", pienso "esto es de juguete" | PLAN 4.7 P11, 7.7 |
| **$330 millones al mes** para un negocio que "lleva todo en cuaderno" | Puede ser, pero si mi negocio vende la mitad (o el doble), cada cifra me suena ajena. Nadie con $4.000 millones al año factura a mano: ya tiene facturador electrónico y contador | PLAN 4.7, PRD 2 |
| **"Contenedor de 20 pies" de camisas** | Dos mil camisas son unos 5 o 6 metros cúbicos: eso va **consolidado**, no en contenedor propio. Un importador lo nota de una | W3 (mensaje a Carolina), 4.7 |
| **Saldo a la fábrica estando "En producción"** | El saldo se paga cuando la mercancía está lista para despacho (o contra copia del BL), no mientras la cosen | 4.7 IMP-2026-10, alerta 3 |
| **"La DIAN pidió inspección física"** | Así no habla nadie. Se dice "le salió **aforo físico**" o "canal rojo". Y con confecciones, la inspección muchas veces es por **etiquetas** (reglamento de etiquetado de confecciones; creo que es la Resolución 1950 de 2009, verificar) | Alerta 6 |
| **Aviso a la fábrica de que "empezó la nacionalización"** | A la fábrica no le importa. Le escribo para producción, fotos de calidad, lista de empaque, BL | W3 |
| **Correo y WhatsApp como únicos canales con China** | Con China es **WeChat** | W3, 1.5 |
| **Costo del empleado sin comisión** | La comisión es salario; genera prestaciones y aportes | W6 |
| **Comisión sobre el total con IVA** | El IVA es de la DIAN, no mío; casi nadie paga comisión sobre el IVA | DECISIONES, W1 |
| **Tasa de ejemplo $4.000 en un lado y $4.050 en otro** | Dos cifras para lo mismo. Y si ninguna se parece al dólar de hoy, me salta | W7 vs 8.4.3 |
| **Prestación de servicios con turnos y marcación** | Eso es justo lo que no se puede hacer (contrato realidad) | 1.5, 7.8 |
| **"Recibo POS"** | Mi contador me dice que la tirilla vieja ya no sirve como soporte y que ahora es documento equivalente electrónico POS (verificar) | W1, PRD 7.2 |
| **Medios de pago sin Addi ni Sistecrédito ni bonos de regalo** | En moda en centros comerciales, "compre ya y pague después" y los bonos de regalo (Día del Padre, Navidad) son pan de cada día | PRD 2, 4.7 P9 |
| **Obligaciones sin ICA ni IVA bimestral** | En Bogotá pago ICA; el IVA va cada dos meses; la retención, cada mes. Si el calendario de pagos no los tiene, se ve incompleto | PRD 7.11, W5 |
| **"Ventas por Bre-B hace 12 meses"** | Bre-B arrancó hace poco; mejor ponerlo como "Transferencia / Bre-B" y que el crecimiento sea de este año (verificar la fecha de arranque) | 4.7 P9 |

**Cómo hablo yo.** El "tú" de la interfaz está bien (Nequi y Rappi me tutean). Pero a la agente de aduanas, al transportador y a mis clientes VIP **les hablo de usted**: "Carolina, buenas tardes. ¿Me confirma cuándo sale el levante del IMP-07 y cuánto hay que girar de tributos?". Que se pueda escoger, y que los mensajes de negocio vengan en usted por defecto.

### A.6 Los cuatro módulos que más me importan: ¿responden mis preguntas de todos los días?

**Inventario (por local)**

| Mi pregunta de todos los días | ¿El plan la responde? |
|---|---|
| ¿Hay M en otro local? | Sí, muy bien (W2) |
| ¿Qué se me está acabando? | Sí (alertas de stock mínimo) |
| ¿Qué no se vende? | Sí (sin movimiento, calzado dormido) |
| ¿Cuánto vale lo que tengo? | Sí (valorización por local) |
| ¿Qué viene en camino y cuándo llega, por referencia? | A medias: lo dice una alerta, no la ficha. Ponerlo en la matriz |
| ¿Qué se perdió o se robaron? | A medias: el conteo físico es "muy importante" pero no tiene historia. Sembrar un conteo con diferencia en Zona Rosa |
| ¿Qué le pido a la fábrica? | **No.** Falta el pedido sugerido (A.4.2) |
| ¿Cuántas veces me pidieron algo que no tenía? | No. Venta perdida (opcional) |

**Pagos**

| Mi pregunta | ¿Responde? |
|---|---|
| ¿Cuánto entró hoy por cada medio de pago y en cada local? | Sí (caja alimentada por el POS) |
| ¿Cuadró la caja de cada local? | **A medias.** Existe, pero no es protagonista ni llega al celular |
| ¿Qué tengo que pagar esta semana? | Sí |
| ¿Me alcanza? | Sí (W5), si se corrige la fecha |
| ¿Quién me debe? | Sí (separados y crédito) |
| ¿Cuánto me quitó el datáfono? | **No.** La conciliación quedó como "complemento" y sin retenciones |
| ¿Cuánto me queda a fin de mes? | Está en Costos y gastos, escondido. Debe estar en Inicio y en la app |

**Nómina**

| Mi pregunta | ¿Responde? |
|---|---|
| ¿Cuánto pago esta quincena? | Sí |
| ¿Cuánto le toca de comisión a cada uno? | Sí (y el vendedor la ve: eso me ahorra peleas) |
| ¿Quién llegó tarde? | Sí (Mateo) |
| ¿Cuánto me cuesta de verdad un vendedor? | Sí, **pero incompleto** (sin comisión) |
| ¿Cuánto me cuesta abrir el domingo o cerrar a las 8 con la reforma? | **No** |
| ¿Cuánto le tengo que pagar a uno que se va? (liquidación final) | No. En mi negocio los vendedores rotan mucho; es una pregunta de cada mes |
| ¿Cuánto me sale la prima de diciembre? | No explícito. Debe salir en el flujo de caja |

**Proveedores con importaciones**

| Mi pregunta | ¿Responde? |
|---|---|
| ¿Dónde viene mi pedido? | Sí (W3) |
| ¿Cuánto le debo a cada fábrica, en dólares y en pesos? | Sí |
| ¿Cuánto me cuesta de verdad cada prenda? | Sí (W4), excelente |
| ¿Cuál fábrica me incumple? | Sí (Ningbo Weiye) |
| ¿A cuánto tengo que vender si sube el dólar? | **No** (falta precio sugerido) |
| ¿Cómo reparto lo que llegó entre los tres locales? | Sí (distribución por local al recibir): muy bien pensado |
| ¿Qué pido en el próximo pedido? | **No** |

**Todo por local:** la regla de 4.1 ("en cada módulo prioritario, una vista que compare los tres locales") es de lo mejor del plan. Que se cumpla sin excepción.

### A.7 Lo que me haría decir "no"

- **"Esto es muy complicado para mi gente."** Si lo primero que ve un vendedor es una pantalla con 16 módulos. Si el punto de venta tiene más de tres pasos para una venta normal. Si mis vendedores no pueden consultar el inventario **en el celular o en una tablet** (en mis locales hay un solo computador, en la caja; los vendedores andan por el piso). El plan solo tiene celular para el dueño.
- **"Esto debe costar una fortuna."** Todo el lujo, 16 módulos, bots, tienda web, multimoneda… Todo eso grita "proyecto de cien millones". Si al final no veo algo que me diga "se arranca por partes, con lo que más le duele, y en X semanas", me asusto y no pregunto. El plan no tiene ninguna pantalla que hable de **cómo se empezaría**.
- **"¿Y pasar mis Excel?"** El botón "Trae tu Excel" quedó como complemento escondido. Es mi miedo número uno.
- **"¿Y mi contador?"** Si no veo que lo que sale de aquí le sirve a mi contador para su programa, mi contador me dice que no, y yo le hago caso al contador.
- **"¿Y si se cae el internet en el local?"** En Bogotá pasa. Una línea que lo responda.
- **"Esto ya lo tiene Siigo / Alegra / el POS que me ofrecieron."** Si no veo lo que ellos **no** tienen (importaciones, costo aterrizado, tres locales comparados, el cuadre en el celular), lo comparo por precio y pierden ustedes.
- **Una sola cifra que no cuadre** entre el computador y el celular, o entre la alerta y el gráfico.

### A.8 Riesgos de confusión

1. **Celular y computador con datos distintos.** Es seguro que pase: abro en el celular primero, apruebo el descuento de Sebastián, luego abro en el computador y la solicitud sigue ahí sin aprobar. Registro una venta en el computador y la busco en el celular: no está. El marco de teléfono dentro del computador no me lo explica; yo uso **mi** celular.
2. **El "pulso en vivo"**: ventas que aparecen solas en el celular y no en el computador. Doble confusión.
3. **El navegador interno de WhatsApp**: lo que hice ahí no aparece cuando abro el link en Safari o Chrome. Para mí es "se borró".
4. **La moneda pegada en dólares** de una visita a otra (W7).
5. **"Enviado (simulación)"** en la bandeja de salida está bien marcado. Pero "Abrir en WhatsApp" abre mi WhatsApp de verdad con un mensaje a nombre de HALDEN; si lo mando sin querer a mi agente real, quedo como un bobo. Que el texto del mensaje lleve una línea "(mensaje de prueba de la demo)" al final, o que el botón diga "Ver cómo quedaría en WhatsApp".
6. **El pago de la tienda web.** Que no haya ni un solo campo de número de tarjeta. Si veo campos de tarjeta, aunque diga "simulado", me da desconfianza (o lo pruebo con la mía).
7. **HALDEN y Juan Camilo**: no sé si me están mostrando un cliente real de ustedes. Que la entrada diga claro: "HALDEN es una marca de ejemplo. Escribe la tuya".
8. **Lo simulado que parece fallido:** la factura "enviada a la DIAN" que pasa a "aceptada" sola en segundos está bien; pero si en algún lugar dice "Enviado" sin "(simulación)", pienso que mandé algo de verdad.

---

## Parte B — La voz del consultor comercial

### B.1 Cómo compra este cliente (y qué del plan lo ayuda o lo estorba)

1. **No decide solo.** Decide con el contador y, a veces, con el socio o la esposa. El plan lo intuye (1.3 "mostrársela a alguien") pero no le da al contador nada que buscar: no hay exportación contable, no hay nómina electrónica, no hay documento POS electrónico. El contador es el que dice "no" en este segmento. **Hay que darle al contador su momento.**
2. **Compara con lo conocido.** Ya le ofrecieron Siigo, Alegra, Loggro u otro POS a mensualidad. La demo debe hacer evidente **lo que esos no hacen**: importaciones con costo aterrizado, comparación de tres locales, cuadre de cajas en el celular, pedido sugerido a la fábrica. Esos cuatro deben estar en "Prueba esto" o muy cerca.
3. **Teme el precio antes de preguntarlo.** La estética de lujo es un arma de doble filo: "se ve increíble" se convierte en "esto vale una fortuna". Se neutraliza con una página corta "Cómo arrancaríamos": por etapas, con lo que más duele primero, con tiempos y con "nosotros cargamos sus Excel". **Sin precio**, pero con la idea de que es alcanzable. Esa página es la que provoca "¿y cuánto vale?", que es la métrica de éxito.
4. **Necesita ver que alguien entendió su operación.** Los errores de dominio (avisos de importación al revés, costo de empleado sin comisión, contenedor de 20 pies, tasa que no es la del día) pesan más que cualquier animación. Un solo error de esos y el resto de la demo pierde valor.
5. **Llega por WhatsApp y casi siempre desde el celular**, en un rato muerto. Si los primeros 5 segundos (vista previa del link, carga, navegador interno) fallan, no hay segunda oportunidad hasta que Miguel lo llame.
6. **El cierre lo hace una persona, no la demo.** "Hablar con KippiCore" solo aparece en el menú "?", en "Más" y al completar 8 de 8. Casi nadie completa 8 de 8. Hay que ofrecerlo antes (por ejemplo, después de 3 o 4 ítems, o en la página "Cómo arrancaríamos") y con una invitación concreta: "Agenda 20 minutos con Miguel".

### B.2 Lo que el plan hace muy bien (no tocar)

- La regla de "todo por local" con una vista comparativa por módulo.
- El saludo en lenguaje de comerciante y la regla de no mostrar $0.
- W1 con el panel "Lo que acaba de pasar" y la exactitud de las cifras.
- Las alertas que llevan **al punto donde se resuelve**, no a la portada del módulo.
- "Para aprobar" en la app (descuentos y traslados).
- La distribución por local al recibir una importación.
- La nota legal prudente en nómina y la marca de agua en facturas.
- Los patrones descubribles (Valentina, la Oxford M, el calzado dormido, Ningbo incumplido): dan de qué hablar.
- Los enlaces `wa.me` sin destinatario para personas ficticias (R14).

### B.3 Inconsistencias internas del plan que vi al pasar

| Inconsistencia | Dónde |
|---|---|
| Entrada con **dos** puertas (2.2.1) vs. **tres** puertas en 3 columnas (8.4.7) | 2.2.1 vs 8.4.7 |
| Tasa de ejemplo **$4.000** (W7) vs **$4.050** (tooltip de la barra superior) | W7 vs 8.4.3 |
| Saldo a Hangzhou vence "el viernes" vs punto bajo "semana del 19 de octubre" por ese mismo saldo | 2.3.3 alerta 3, W5, P19 |
| W6 dice que "la comisión del mes se toma de las ventas reales" pero los $2.990.000 no la incluyen | W6 |
| Rutas `/inicio` en la sección 2 vs `/panel/inicio` en la decisión D9 (la nota de reconciliación lo cubre, pero los briefs deben usar una sola) | 2.2, 2.4, D9 |
| Contador de cifras de 600 ms (W1) vs `--dur-count` 900 ms | W1 vs 8.3.6 |
| "Cualquier palabra en inglés en la interfaz cierra la pestaña" (2.7) vs "Slim Fit", "Menswear", "Black Friday", "Chino stretch" en los datos | 2.7 |
| Chino stretch y Camisa Oxford con el mismo precio ($219.900) en el ejemplo del POS y del WhatsApp | W1, W9 |
| Saldo de importación pagado "En producción" | 4.7 IMP-2026-10 |
| 420 clientes contra ~11.000 ventas con cliente en 18 meses | 4.7 P11, 7.7 |

### B.4 Riesgos técnicos que se vuelven riesgos de venta

- **Portátil de 1366 × 768**: es el computador más común de un comerciante en Colombia. El plan prueba a 1440 y 1280 de ancho, pero no a ~650 px de alto útil. El Inicio y el POS deben verse completos ahí.
- **Celular de gama media** (Redmi, Galaxy A): la meta de 2,5 s de construcción está bien; que la pantalla de entrada muestre algo útil desde el primer segundo.
- **Navegador interno de WhatsApp/Instagram**: detectarlo y sugerir "Ábrela en Safari/Chrome para instalarla".
- **Vista previa del enlace** (`og:title`, `og:description`, `og:image`): no aparece en el plan y es lo primero que se ve.

---

## Parte C — Cambios concretos al plan, priorizados

| # | Qué cambiar | Sección | Por qué | Impacto en la venta |
|---|---|---|---|---|
| 1 | **Rehacer la lógica de avisos de importación: cada estado avisa a quien le toca actuar.** "Saldo pagado" → fábrica (pedir BL o liberación) y agente de carga; "En puerto" y "Nacionalizado" los reporta la agente (portal) → avisos al dueño, al transportador y a Wilson en bodega; "Recibido" → distribución por local. Eliminar el aviso a la fábrica por la nacionalización y el aviso a la agente de que "pasó a nacionalización". Rehacer el recorrido del minuto 4:00 con ese flujo. Mensajes de negocio en "usted" | 2.1 (min 4:00), 2.5 (pista de Importaciones), W3, 4.3 (7.5) | Hoy el flujo va al revés de como funciona la cadena; un importador lo detecta en segundos y descalifica todo el módulo prioritario | **Alto** |
| 2 | **Dejar que el cliente ponga su marca.** En la entrada, un campo opcional "¿Cómo se llama tu marca?" que cambie el wordmark, la tienda, las facturas, los PDF y los mensajes (guardado solo en ese navegador). Saludo sin nombre ajeno ("Buenas tardes.") o con el que él escriba. Texto visible: "HALDEN es una marca de ejemplo". Subir "Empresa (nombre…)" de C a I | 1.5, 2.2.1, 2.2.2, 2.3.1, 4.3 (7.16) | El objetivo número 1 del PRD es "este es mi negocio"; hoy abre con el negocio y el nombre de otro | **Alto** |
| 3 | **Nuevo momento wow "El cuadre de cada noche":** cierre de caja de los tres locales con diferencia sembrada (p. ej. Zona Rosa −$40.000), cierre a ciegas, descuentos sobre X% con aprobación, anulaciones solo del dueño; tarjeta en la app "Cajas de anoche" y alerta en Inicio. Subir apertura y cierre de caja de MI a I | Nueva W11 en §3, 2.3.3, 4.3 (7.2), 4.4, W8 | El control a distancia y el miedo al robo pesan más que el contenedor para un dueño de tres locales; hoy no tiene momento propio | **Alto** |
| 4 | **Nuevo momento wow "Arma el próximo pedido a China":** cantidades sugeridas por talla × color según rotación, existencias y lo que viene en camino; costo en US$ y COP con el costo aterrizado; margen esperado; borrador en inglés listo para copiar (WhatsApp, correo o **WeChat**). Agregarlo a "Prueba esto" | Nueva W12 en §3, 2.4, 4.3 (7.5, 7.6, 7.12) | Es la decisión más cara del negocio, hoy a ojo, y une Análisis, Inventario e Importaciones. Ningún POS de mensualidad lo hace | **Alto** |
| 5 | **Puente real celular ↔ computador:** el QR lleva en la URL los últimos 1 a 3 comandos del usuario (venta, traslado, aprobación, cambio de estado; menos de 300 caracteres) para que la venta hecha en el computador **sí aparezca en su celular**. Chip permanente en `/app`: "Datos de ejemplo de este celular". Eliminar el "pulso en vivo" (o etiquetar cada venta simulada) | 2.1 (advertencia), W10, 4.5, DECISIONES (matizar el descarte) | La confusión "no está en mi celular = es de mentiras" es segura y ataca la métrica "abre la app en su celular" | **Alto** |
| 6 | **Diseñar el primer toque desde WhatsApp:** `og:title`, `og:description` y `og:image` (HALDEN sobre negro); detectar el navegador interno de WhatsApp/Instagram y mostrar "Ábrela en Safari/Chrome para instalarla y guardar lo que hagas"; que `/app` muestre contenido útil antes de terminar de generar | 2.2.2, 4.2, W10, 2.5 (pista de instalación) | El link llega por WhatsApp; los primeros 5 segundos ocurren antes de abrir la demo | **Alto** |
| 7 | **Corregir el costo del empleado y las comisiones:** el costo total debe mostrar "fijo" y "con la comisión de este mes" (la comisión es salario y genera prestaciones y aportes); la comisión de la semilla, sobre la base sin IVA (ajustar cifras de W1 y W8) | W1, W6, W8, 4.3 (7.9), DECISIONES | Un contador hace la cuenta en un minuto; si no cuadra, se cae la credibilidad del módulo prioritario de nómina | **Alto** |
| 8 | **Hacer coherente el flujo de caja y completar las obligaciones:** el punto bajo cae en la semana del pago del viernes (o mover el pago a esa semana); el saldo de la fábrica se paga en "Listo para despacho"; incluir prima de diciembre, IVA bimestral, retención mensual e ICA de Bogotá en la proyección y el calendario; arriendos a inicio de mes | 2.3.3 (alerta 3), 2.3.4, W5, 4.7 (P19 e importaciones sembradas) | Hoy la historia se contradice entre la alerta y el gráfico; la prima de diciembre es lo primero que busca un dueño en octubre | **Alto** |
| 9 | **Darle al contador su momento:** en Reportes, "Exportar para tu contador" (interfaz contable simulada, compatible con los programas más usados); nómina electrónica simulada junto al desprendible; reemplazar "Recibo POS" por "Documento equivalente POS electrónico" (verificar norma vigente); frase que diga si KippiCore reemplaza o convive con el facturador que ya tiene | W1, 4.3 (7.13, 7.15, 7.9), 2.5 (pista de Reportes) | En este segmento el contador tiene veto; hoy no encuentra nada suyo | **Alto** |
| 10 | **Página "Cómo arrancaríamos"** (desde la tarjeta de cierre, el menú "?" y "Más"): implementación por etapas (primero POS e inventario por local, luego importaciones y pagos, luego nómina), semanas aproximadas, "cargamos tus Excel nosotros", "tus datos son tuyos", "si se cae el internet el local sigue vendiendo", "tus vendedores lo aprenden en una hora", consulta desde tablet o celular del vendedor. "Hablar con KippiCore / Agenda 20 minutos con Miguel" ofrecido desde que complete 3 ítems, no solo en 8 de 8. Subir "Trae tu Excel" de C a MI | 1.3, 2.4, 2.6, 4.6 | Desactiva "esto cuesta una fortuna", "pasar mis Excel" y "mi gente no va a poder", y provoca la pregunta "¿cuánto vale?" | **Alto** |
| 11 | **Importaciones con detalle de importador real:** la mayoría como carga consolidada en m³, un contenedor completo (el de calzado) y un envío aéreo urgente; "aforo físico" y "levante" en lugar de "inspección física"; la retención de IMP-06 por **etiquetado** (verificar la resolución); DAV y declaración de cambio entre los documentos; arancel de confecciones editable con componente ad valorem y por kilo (valor de ejemplo, verificar); contactos chinos con nombre comercial ("Lily Chen") y WeChat como canal | 1.5, 2.3.3 (alerta 6), W3, W4, 4.7 (importaciones sembradas) | Son los detalles que hacen decir "esta gente sabe"; hoy hay varios que dicen lo contrario | **Alto** |
| 12 | **W4 con la pregunta siguiente y con una tasa creíble:** junto al control "¿Y si el dólar sube?", "Precio sugerido para mantener tu margen: $239.900" con botón "Aplicar a la referencia". Una sola tasa de ejemplo en todo el plan, actualizada en la configuración a la TRM del día antes de enviar el link y rotulada "TRM de referencia del dd/mm" | W4, W7, 8.4.3, 4.2 | Convierte el wow en una decisión; una tasa que no se parece al dólar del día genera desconfianza inmediata | **Alto** |
| 13 | **Calibrar la escala con el cliente real:** clientes de 420 a varios miles (o bajar el % de ventas con cliente), y antes de enviar, ajustar la escala (ventas del mes, número de referencias, empleados) con tres cifras que Miguel conozca del cliente; dejar un parámetro de escala en la configuración | 4.7 (escala base, P11), 7.7 | Cifras que no se parecen a su tamaño (por arriba o por abajo) hacen que el negocio "no sea el suyo" | **Alto** |
| 14 | **Reforma laboral y contrato realidad en nómina:** vista "Cuánto te cuesta cerrar a las 8 y abrir el domingo" con el recargo nocturno desde las 7 p. m. y el dominical vigente (parámetros "por verificar", como ya pide el PRD); alerta "Daniela y Juliana: prestación de servicios con turno fijo y marcación → riesgo de contrato realidad" en vez de modelarlo como normal; liquidación final de un empleado que se va (simulada) | W6, 4.3 (7.9), 4.7 (P16), 1.5 | Es el dolor laboral de 2026 para un comercio que abre domingos y cierra de noche, y convierte un error del plan en un momento en que el sistema lo cuida | Medio |
| 15 | **Inicio más liviano y probado en el portátil real:** cambiar "Unidades vendidas" por "Lo que te queda este mes (utilidad estimada)" (también en la app "Hoy"); arriba del pliegue solo saludo, KPIs, alertas y los tres locales; top 5, sin movimiento, eventos y hallazgo debajo; QA visual obligatorio a 1366 × 657 de área útil además de 1440 y 1280 | 2.3.2, 4.3 (7.1), 4.4, 8.4.6, PRD 14 (calidad) | El dueño pregunta "¿cuánto me queda?", no "¿cuántas unidades?", y su pantalla es más pequeña que la del diseño | Medio |
| 16 | **Medios de pago completos y conciliación del datáfono:** agregar Addi/Sistecrédito (o "compra ahora, paga después"), bono de regalo y QR; "Transferencia / Bre-B" como una sola etiqueta; conciliación "vendiste $X con tarjeta, te consignaron $Y: comisión $A, retenciones $B (descontables)" de C a MI; ampliar el hallazgo P10 | 4.3 (7.2, 7.7), 4.7 (P9, P10) | Es plata que hoy el dueño no ve, y es un detalle que solo pone quien conoce el comercio colombiano | Medio |
| 17 | **Legibilidad para un dueño de 45 años o más:** cuerpo de escritorio a 15 px, ningún texto por debajo de 12 px (eyebrows, micro y etiquetas de pestaña incluidas), etiquetas de KPI en 12 px, grises secundarios solo en tamaños ≥ 13 px; en gráficos de locales, etiqueta directa con el nombre del local (no depender de tres grises) | 8.2, 8.9.1, 8.4.2 | "La letra es muy pequeña" es la queja más común de este cliente y afecta todas las pantallas | Medio |
| 18 | **WhatsApp con humano y con el tono del cliente:** en W9, mostrar el paso al vendedor ("Te paso con Valentina, ella te la separa") y la regla "el bot no negocia precios"; tono configurable tú/usted para clientes, con "usted" por defecto en mensajes a VIP y a la cadena de importación; los textos prellenados de `wa.me` con una línea final "(mensaje de prueba de la demo)" | W9, 1.5 (tratamiento), 4.3 (7.10, 7.14), R14 | Un dueño de gama media-alta teme que un robot atienda a sus mejores clientes; y evita que mande sin querer un mensaje ficticio a su agente real | Medio |
| 19 | **Bajar W7 de momento wow a utilidad:** la moneda alternativa se ofrece en Importaciones y Proveedores; cuando no es COP, franja visible "Estás viendo todo en US$ · Volver a pesos"; al volver otro día arranca en COP | W7, 2.4 ("Para ir más lejos"), 2.5 (pista de Proveedores), 4.2 | Ver las ventas de Usaquén en yuanes no le dice nada; quedarse "pegado" en dólares asusta | Bajo |
| 20 | **Limpiar inconsistencias y detalles que delatan:** dos puertas (no tres) en 8.4.7; una sola ruta `/panel/...` en los briefs; un solo tiempo de contador; regla de 2.7 reformulada como "cero inglés de software" (los nombres de producto en inglés son normales en moda); precios distintos para el chino y la Oxford; cambiar "Brayan" del auxiliar de bodega; selector de vendedor en el POS cuando vende el dueño; contactos chinos y BL sin parecerse a empresas reales (ya previsto) | 2.2.1, 2.7, 8.4.7, 8.3.6, W1, 1.5 | Cada inconsistencia es una pequeña grieta en la sensación de "producto terminado" que el PRD exige | Bajo |
