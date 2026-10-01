# PLAN — KippiCore CRM · Demo HALDEN

> Consolidado por el líder a partir de `plan/01_estrategia.md` (estratega, secciones 1–4), `plan/02_arquitectura.md` (arquitecto, secciones 5–7, 9–10) y `plan/03_diseno.md` (diseñador, sección 8). Fuente de verdad del producto: `PRD.md`. Referencia estética: `REFERENCIA_VISUAL.md`. Revisión crítica y cambios incorporados: sección 11 al final.
>
> **Reconciliación de rutas:** el escritorio vive bajo `/panel` (Inicio en `/panel/inicio`). Donde la sección 2 diga `/inicio` u otra ruta de escritorio sin prefijo, léase `/panel/...`.

## 1. Propósito y audiencia

### 1.1 El cliente

**Quién es.** Dueño de un negocio de moda masculina de gama media-alta con tres locales en Bogotá (Parque 93, Usaquén y Zona Rosa) y una bodega. Importa directamente de fábricas en China y se apoya en un agente de carga y un agente de aduanas. Tiene entre 10 y 14 empleados con vinculaciones mezcladas: contrato laboral, comisiones y prestación de servicios. Es comerciante antes que administrador: sabe vender, conoce su producto y a sus clientes, cuida la imagen de su marca. La tecnología la tolera mientras le ahorre tiempo; si algo lo hace pensar, la abandona.

**Cómo trabaja hoy.** Excel, un cuaderno y WhatsApp. Las ventas se anotan a mano; el inventario se cuadra contando; para saber si hay una talla en otro local llama o escribe al vendedor; el estado de cada contenedor vive en un chat con el agente de aduanas; la nómina y las comisiones se calculan en una hoja que solo él (o su contador) entiende; el costo real de una prenda importada lo estima "más o menos".

**Lo que le duele (en sus palabras).**

| Dolor | Cómo lo diría él | Qué módulo lo responde |
|---|---|---|
| Carpintería diaria | "Me paso la noche pasando el cuaderno al Excel." | Punto de venta, Ventas |
| No sabe qué tiene ni dónde | "Me piden una M y tengo que llamar a los otros locales." | Inventario por local, traslados |
| No sabe dónde viene la mercancía | "Le pregunto al agente cada tres días por el contenedor." | Importaciones, portal de seguimiento |
| No sabe cuánto le cuesta de verdad una camisa | "Con el dólar como está, ya no sé cuánto me estoy ganando." | Costo aterrizado, márgenes, multimoneda |
| No sabe cuánta plata va a tener | "El viernes hay que pagarle a la fábrica y no sé si me alcanza." | Pagos, flujo de caja |
| La nómina es una caja negra | "Uno cree que paga el mínimo y termina pagando el doble." | Nómina en dos modalidades |
| No controla a distancia | "Si no estoy en el local, no sé cómo va el día." | App del dueño, rol vendedor |

**Lo que teme (objeciones que la demo debe desactivar sin decirlo).** "Mis empleados no van a saber usar esto" (el POS debe ser más fácil que el cuaderno). "Esto es para empresas grandes" (todo habla de tres locales, no de corporativos). "Pasar mis Excel va a ser un infierno" (ver propuesta 4.6). "¿Y la DIAN?" (facturación simulada con marca de agua y lenguaje prudente). "Mis empleados van a ver cuánto gano" (el rol vendedor esconde costos y márgenes).

### 1.2 Lo que debe sentir, en orden

| Momento | Emoción buscada | Qué la produce |
|---|---|---|
| Primeros 10 segundos | **Reconocimiento**: "este es mi negocio" | HALDEN, sus tres locales con nombre, pesos colombianos, ropa de hombre ilustrada con elegancia, un saludo con cifras del día |
| Minutos 1 a 3 | **Alivio**: "esto me quita trabajo" | Registrar una venta en segundos y ver que el inventario, la caja y la comisión se actualizan solos |
| Minutos 3 a 7 | **Control**: "por fin sé" | Dónde viene el contenedor, cuánto cuesta de verdad cada prenda, cuánta plata habrá en 90 días, cuánto cuesta cada empleado, todo por local |
| Minutos 7 a 9 | **Poder**: "lo manejo desde donde esté" | Ver lo que ve su vendedor (y lo que no ve), abrir la app en su celular |
| Minuto 10 | **Deseo y orgullo**: "lo quiero, y se ve a la altura de mi marca" | La sensación de producto terminado de lujo, sin un solo botón muerto |

### 1.3 Lo que debe querer hacer después

1. **Escribirle a Miguel** preguntando "¿cuánto cuesta?" o "¿cuándo lo tendría?" (métrica principal del PRD, 3.3). La demo facilita ese paso con un acceso discreto "Hablar con KippiCore" (ver 2.6).
2. **Mostrársela a alguien**: su socio, su administradora o su contador. Por eso los enlaces profundos y los PDF deben verse impecables fuera de la demo.
3. **Volver a abrirla en el celular**, idealmente instalada como app.

### 1.4 El "por qué" en tres frases

El dueño de HALDEN lleva tres locales y sus importaciones desde China entre Excel, un cuaderno y chats de WhatsApp, y pierde horas cuadrando lo que debería saberse solo. Esta demo le muestra su propio negocio —sus locales, sus tallas, sus contenedores, su nómina— funcionando en un solo sistema que se ve tan bien como la ropa que vende. Existe para que, sin que nadie se la explique, termine escribiéndole a Miguel para preguntar cuánto cuesta y cuándo lo puede tener.

### 1.5 Elenco de la demo

Nombres ficticios y configurables (decisión de Miguel registrada en `DECISIONES.md`: el dueño no lleva el nombre real del cliente, para evitar incomodidades si el enlace se reenvía).

| Personaje | Rol en la demo | Detalle |
|---|---|---|
| **Juan Camilo Ospina** | Dueño / Administrador (rol por defecto) | Saludo: "Buenas tardes, Juan Camilo". Firma los mensajes de importación |
| **Sebastián Cárdenas** | Persona del rol **Vendedor** | Local Usaquén. Contrato laboral, salario $1.950.000 + 3% de comisión sobre ventas propias. Desempeño normal (no es el estrella: el dueño debe ver a un vendedor típico) |
| **Wilson Díaz** | Persona del rol **Bodega / Inventario** | Jefe de bodega, Bodega central (Puente Aranda). Contrato laboral |
| **Valentina Gómez** | Vendedora estrella (patrón descubrible) | Parque 93. Contrato laboral + comisión escalonada por meta |
| Luz Marina Pardo | Administradora y apoyo contable | Contrato laboral, sin comisión |
| Camilo Andrés Suárez | Vendedor, Parque 93 | Laboral + comisión |
| Laura Sofía Méndez | Cajera, Parque 93 | Laboral |
| Daniela Moreno | Vendedora, Usaquén | Prestación de servicios + comisión |
| Mateo Herrera | Vendedor, Zona Rosa | Laboral + comisión. Patrón: llegadas tarde |
| Natalia Ríos | Vendedora, Zona Rosa | Laboral + comisión |
| Juliana Vargas | Vendedora de fines de semana, Zona Rosa | Prestación de servicios + comisión |
| Brayan Torres | Auxiliar de bodega | Laboral (salario mínimo, recibe auxilio de transporte) |
| Hernando Beltrán | Sastre de arreglos (taller en Usaquén; atiende los tres locales) | Prestación de servicios, sin comisión |
| Alejandro Pinzón | Contenido y redes sociales | Prestación de servicios |

Cadena de importación (contactos con nombre, empresa, correo y WhatsApp ficticios; el arquitecto debe verificar que ningún nombre coincida con una empresa real conocida):

| Contacto | Empresa ficticia | Rol | Idioma del aviso |
|---|---|---|---|
| Ms. Chen Li | Guangzhou Huameng Garment Co., Ltd. | Fábrica: camisas | Inglés |
| Mr. Wang Jun | Ningbo Weiye Garments Co., Ltd. | Fábrica: blazers y trajes | Inglés |
| Ms. Zhou Min | Hangzhou Lanxin Knitwear Co., Ltd. | Fábrica: punto y sweaters | Inglés |
| Mr. Liu Yang | Shaoxing Yuefeng Apparel Co., Ltd. | Fábrica: pantalones y chinos | Inglés |
| Mr. Huang Tao | Wenzhou Ruifeng Footwear Co., Ltd. | Fábrica: calzado | Inglés |
| Felipe Navarro | Cordillera Carga Internacional S.A.S. | Agente de carga | Español |
| Carolina Mejía | Agencia de Aduanas Litoral S.A.S. Nivel 2 | Agente de aduanas | Español |
| Óscar Rincón | Transportes Sabana Carga S.A.S. | Transporte Buenaventura → Bogotá | Español |

Clientes que aparecen en guiones: **Andrés Gutiérrez** (cliente frecuente de Usaquén, usado en el ejemplo del POS y del WhatsApp) y **Ricardo Peñuela** (VIP de Parque 93, cita de toma de medidas y cumpleaños).

**Tratamiento:** la interfaz tutea en todo ("Registra", "Mira", "Tus locales"). Los mensajes a clientes de HALDEN también tutean. Los mensajes al agente de aduanas y al transportador tutean con cortesía profesional; los del proveedor chino van en inglés.

**Precios:** terminación en ,900 como en el retail colombiano real (ej. $219.900, $789.900, $1.490.000 en trajes). Ningún precio redondo "de software".

---

## 2. Narrativa de la demo

### 2.1 El recorrido ideal (primeros 10 minutos, sin guía, en computador)

| Minuto | Qué hace | Qué lo engancha | A dónde lo empuja la demo |
|---|---|---|---|
| 0:00 | Abre el enlace. Ve la pantalla de entrada con HALDEN, la firma de KippiCore y dos puertas | Se reconoce: "Menswear · Bogotá", tres locales, la fecha de hoy | Botón "Entrar como dueño" |
| 0:15 | Llega a Inicio. Lee el saludo con las ventas del día y ve el comparativo de sus tres locales | Cifras vivas, de hoy, en pesos, por local | Se despliega "Prueba esto" (sin bloquear) |
| 0:45 | Hace clic en la primera alerta: "Se está acabando la Oxford azul talla M en Usaquén" | La matriz talla × color × local le dice en un vistazo dónde está cada unidad | Traslada 3 camisas de Zona Rosa a Usaquén (ítem 2 ✓) |
| 2:00 | Abre el Punto de venta desde "Prueba esto". Escanea (simulado), elige talla, asocia cliente, paga mitad efectivo y mitad Nequi | En menos de un minuto registra una venta completa | El panel "Lo que acaba de pasar" le muestra cinco módulos moviéndose (ítem 1 ✓) |
| 3:30 | Vuelve a Inicio: las ventas de hoy subieron exactamente lo que vendió | Coherencia: "esto es de verdad" | Alerta de importación: "Tu pedido IMP-2026-07 llegó a Buenaventura" |
| 4:00 | Ve el mapa China → Buenaventura → Bogotá y la línea de tiempo. Mueve el estado a "En proceso de nacionalización" | El sistema redacta los avisos al agente (en español) y a la fábrica (en inglés) | Abre "Abrir en WhatsApp" y ve el mensaje listo (ítem 3 ✓) |
| 5:15 | Desde la misma importación entra a "Costo aterrizado": la camisa que costó US$11,40 en fábrica le cuesta $71.850 puesta en bodega | Por fin sabe su margen real | Mueve la tasa de cambio y ve el margen caer |
| 6:00 | Desde la alerta de pago entra al flujo de caja de 90 días | Ve la semana en la que la plata se le aprieta, y por qué | (ítem 4 ✓) |
| 6:45 | "Descubre cuánto te cuesta de verdad un vendedor": abre la nómina de Sebastián | Un salario de $1.950.000 cuesta cerca de $3 millones; el interruptor de exoneración cambia la cifra | Compara con prestación de servicios (ítem 5 ✓) |
| 7:45 | Cambia el rol a Vendedor | La barra lateral se reduce; desaparecen costos y márgenes; Sebastián ve su comisión y su botón de marcar entrada | Vuelve a la vista del dueño (ítem 6 ✓) |
| 8:30 | Abre Canales digitales → WhatsApp y le pregunta al bot por la Oxford en M | El bot responde con el inventario real, que ya refleja su traslado y su venta | (ítem 7 ✓) |
| 9:30 | Abre "Ver app del dueño": escanea el QR con su celular | En el celular ve "Hoy" en modo oscuro, con cifras grandes; en el marco del computador ve también la venta que acaba de hacer | (ítem 8 ✓) → tarjeta final con "Hablar con KippiCore" |

**Recorrido alterno (lo más probable): abre el enlace primero en el celular.** Miguel enviará el enlace por WhatsApp, así que el primer toque será casi seguro desde el teléfono. La pantalla de entrada en celular (2.2.2) lo lleva directo a la app del dueño, que debe ser impecable por sí sola. Tras su primer recorrido por "Hoy", una tarjeta en la app lo invita a abrir el sistema completo en el computador ("Compartir enlace" o "Copiar enlace"). El recorrido de escritorio arranca después, cuando se siente frente al computador.

**Advertencia de diseño que no se puede ignorar:** sin backend, el celular y el computador tienen datos separados. Si registra una venta en el computador y la busca en su celular, no estará. Mitigación: (a) el marco de teléfono dentro del escritorio comparte el almacenamiento y sí muestra la venta (ese es el momento "aparece en el celular"); (b) el modal del QR lo dice con una línea: "En tu celular verás los datos de la demo. Lo que registres en este computador aparece en la vista previa de la derecha; en la versión real todo se sincroniza al instante."

### 2.2 Pantalla de entrada (ruta `/`)

`/` es la pantalla de entrada y cumple el papel de la "pantalla de bienvenida" del PRD (sección 10). El escritorio vive en `/inicio` y demás rutas de módulo (desviación de la sección 6.1 del PRD, que ubica el escritorio en la raíz; justificación: el enlace que se envía debe abrir siempre en las dos puertas).

#### 2.2.1 Versión de computador (≥ 1024 px)

Composición: fondo `#F9F9F9`, retícula estricta, mucho aire, nada se mueve salvo un fundido de entrada de 400 ms.

- **Arriba a la izquierda**, 12 px, gris `#666`, mayúsculas: `KIPPICORE CRM · DEMO PARA HALDEN`
- **Arriba a la derecha**, 12 px: `Datos al miércoles 30 de septiembre de 2026` (fecha dinámica del sistema; demuestra que la demo está al día).
- **Centro superior:** wordmark `HALDEN` (Figtree 900, tracking 0.18em, ~72 px) y debajo `MENSWEAR · BOGOTÁ` (12 px, tracking amplio).
- **Frase:** "Así se vería tu negocio con todo en un solo lugar: tres locales, inventario, importaciones, pagos y nómina, al día y sin cuaderno."
- **Dos puertas** lado a lado, mismo alto, radio 0, borde 1 px:

| Puerta 1 (panel negro, texto blanco) | Puerta 2 (panel blanco, borde `#DDD`) |
|---|---|
| Ceja: `EN EL COMPUTADOR` | Ceja: `EN TU CELULAR` |
| Título: `EL SISTEMA COMPLETO` | Título: `LA APP DEL DUEÑO` |
| Texto: "Ventas, inventario por local, importaciones desde China, pagos y nómina. Lo que usarían tú y tu equipo cada día." | Texto: "Cómo va el día en los tres locales, desde donde estés. Apunta la cámara de tu celular al código." |
| Botón blanco: `ENTRAR COMO DUEÑO` | Código QR (160 px) hacia `origen/app`, generado con la URL real del despliegue (nunca `localhost`) |
| Enlace debajo: "o mira lo que ve un vendedor →" (entra a `/inicio` con rol Vendedor activo) | Enlace debajo: "o ábrela aquí en un marco de celular →" |

- **Pie**, 12 px, `#666`: "Demostración con datos ficticios: nombres, cifras y documentos son de ejemplo. Lo que registres se guarda solo en este navegador." A la derecha: "Desarrollado por KippiCore".
- **Visita repetida:** el botón principal dice `CONTINUAR COMO DUEÑO` y aparece debajo, en 12 px, "Ibas en: Importaciones" (último módulo visitado). La entrada nunca se salta: es el vestíbulo del enlace.

#### 2.2.2 Versión de celular (< 768 px)

- Firma arriba: `KIPPICORE CRM · DEMO PARA HALDEN`.
- Wordmark `HALDEN` y `MENSWEAR · BOGOTÁ`.
- Frase corta: "Tu negocio, con todo en un solo lugar."
- Botón negro de ancho completo: `ABRIR LA APP DEL DUEÑO` → `/app`.
- Bloque secundario: título "El sistema completo" + "Está pensado para computador. Mándate el enlace y ábrelo allá." Botones: `COMPARTIR ENLACE` (menú nativo de compartir) y "Copiar enlace" (con confirmación "Enlace copiado").
- Mismo pie de datos ficticios.

En tableta (768–1023 px) se usa la versión de computador apilando las puertas.

### 2.3 Pantalla de Inicio (`/inicio`, rol Dueño)

#### 2.3.1 Lo primero que ve (arriba a la izquierda)

Un saludo y **una sola frase en lenguaje de comerciante** que resume el día. Es el gancho de reconocimiento: no es un indicador, es una persona hablándole de su negocio.

| Hora local del navegador | Saludo y frase (ejemplo con cifras del generador) |
|---|---|
| Antes de 11:00 a. m. | **Buenos días, Juan Camilo.** Ayer cerraste en $11.840.000 con 31 ventas; Parque 93 fue el mejor local. Los locales abren a las 10:00 a. m. |
| 11:00 a. m. – 8:00 p. m. | **Buenas tardes, Juan Camilo.** Hoy llevas $7.260.000 en 19 ventas, 14% más que el miércoles pasado a esta hora. Zona Rosa va adelante. |
| Después de 8:00 p. m. | **Buenas noches, Juan Camilo.** Hoy cerraste en $12.130.000 con 33 ventas, 9% más que el miércoles pasado. Parque 93 fue el mejor local. |

Regla: la tarjeta "Ventas de hoy" nunca muestra $0 como protagonista. Antes de que abran los locales, muestra "Ayer" como cifra principal y "Hoy: los locales abren a las 10:00 a. m." como subtítulo. El generador simula las ventas de hoy hasta la hora actual del navegador.

Con el selector de local en un local específico, la frase se adapta: "Hoy Usaquén lleva $1.920.000 en 6 ventas…". En moneda USD/CNY, las cifras de la frase también se convierten.

#### 2.3.2 Orden de la pantalla

1. **Saludo y frase** (izquierda). A la derecha, en la misma línea: "Ver app del dueño" (ícono de celular) — acceso permanente al QR.
2. **Seis tarjetas de indicadores** (una fila): Ventas de hoy · Ventas del mes ("+9,4% vs. agosto a la misma fecha") · Ticket promedio · Unidades vendidas · Margen bruto del mes · Efectivo en caja (estimado, "suma de las tres cajas"). Cada una con micrográfico y clicable.
3. **Fila dos columnas:** izquierda (2/3) "Ventas de los últimos 30 días por local" (barras apiladas, negro / gris oscuro / gris claro; camel solo para resaltar el local seleccionado). Derecha (1/3) **"Requiere tu atención"** (alertas, ver 2.3.3).
4. **Tus tres locales:** tres columnas iguales con nombre del local, ventas del mes, margen, ticket promedio, unidades y una barra de cumplimiento de meta. Esta franja hace visible el "dividido por punto de venta".
5. **Tres columnas:** Top 5 productos del mes · 5 productos sin movimiento en 60 días · Próximos eventos (3–5).
6. **Hallazgo de la semana:** una tarjeta ancha, tipografía grande, una frase de los hallazgos automáticos (rota en cada visita) con enlace "Ver más en Análisis".

#### 2.3.3 Alertas precargadas ("Requiere tu atención")

Cinco visibles, ordenadas para tocar los cuatro módulos prioritarios y el cobro; "Ver todas (8)" despliega el resto. Cada alerta tiene ícono lineal, título en negrita, una línea de contexto y un botón de acción que lleva **directo al lugar donde se resuelve** (no a la portada del módulo). Las fechas se escriben relativas ("ayer", "el viernes") y el generador las siembra relativas a hoy.

| # | Módulo | Título | Contexto | Botón → destino |
|---|---|---|---|---|
| 1 | Inventario | Se está acabando la Oxford azul talla M en Usaquén | Queda 1. En Zona Rosa hay 6 y vienen 48 en la importación IMP-2026-07. | `Trasladar desde Zona Rosa` → ficha de la referencia con el panel de traslado abierto y prellenado (3 unidades, Zona Rosa → Usaquén) |
| 2 | Importaciones | Tu pedido IMP-2026-07 llegó a Buenaventura | Carolina Mejía (Agencia de Aduanas Litoral) lo actualizó ayer. Sigue la nacionalización. | `Ver dónde viene` → detalle de la importación, con el botón de cambio de estado resaltado |
| 3 | Pagos | El viernes vence el saldo a Hangzhou Lanxin | US$14.700, unos $58,8 millones con la tasa de ejemplo. Es el pago más grande del mes. | `Ver la plata de los próximos 90 días` → flujo de caja con esa semana marcada |
| 4 | Personal | Mateo Herrera no ha marcado entrada | Turno de apertura en Zona Rosa desde las 10:00 a. m. Es su cuarta llegada tarde este mes. | `Ver asistencia` → asistencia filtrada por Zona Rosa y Mateo |
| 5 | Por cobrar | 3 separados vencen esta semana | Saldo pendiente: $1.870.000. Puedes recordarles por WhatsApp con un clic. | `Cobrar` → por cobrar filtrado por separados que vencen |
| 6 | Importaciones | IMP-2026-06 va 6 días tarde | La DIAN pidió inspección física en Buenaventura. Nueva llegada estimada a bodega: en 9 días. | `Ver detalle` |
| 7 | Clientes | Hoy cumple años Ricardo Peñuela | Cliente VIP de Parque 93: $6,4 millones en compras. Tienes un mensaje listo. | `Enviar saludo` → ficha del cliente con el mensaje prellenado |
| 8 | Inventario | Tienes $40,2 millones quietos en calzado | 160 días de inventario, contra 55 del promedio de la tienda. | `Ver mercancía dormida` → Análisis, rotación |

Si la alerta 4 no aplica por la hora (antes de 10:15 a. m. o después del turno), se reemplaza por: "Mateo Herrera llegó 25 minutos tarde ayer · Es su cuarta llegada tarde este mes."

Las alertas generadas por acciones del usuario (por ejemplo, la actualización desde el portal de seguimiento) entran arriba de la lista con una marca "Nuevo" y un fundido.

#### 2.3.4 Próximos eventos (ejemplo de contenido)

- Vie · Vence saldo Hangzhou Lanxin (US$14.700)
- Sáb · Toma de medidas — Ricardo Peñuela · Parque 93 · 11:00 a. m.
- Lun · Arriendo Zona Rosa
- En 12 días · Llega a bodega IMP-2026-07 (camisas Guangzhou Huameng)
- En 6 semanas · Preventa Black Friday para clientes VIP

### 2.4 Lista "Prueba esto"

**Comportamiento.** Panel flotante abajo a la derecha (320 px de ancho), que aparece desplegado 1,2 s después de la primera llegada a Inicio, sin oscurecer la pantalla ni bloquear nada. Encabezado: `PRUEBA ESTO` · "8 cosas que puedes hacer en 10 minutos" · contador "0 de 8". Se minimiza a una píldora "Prueba esto · 3/8". Se minimiza solo en el POS, en modales y en la vista de rol vendedor para no tapar botones. Cada ítem es un enlace: lleva al lugar exacto, ya preparado. Al completarse un ítem, el círculo se rellena con una marca camel animada (250 ms) y aparece un aviso breve "Hecho: registraste una venta". El estado se guarda en el navegador y se reabre desde el botón "?".

**Los 8 ítems (redacción final).**

| # | Texto | Lleva a | Se marca completo cuando |
|---|---|---|---|
| 1 | Registra una venta y mira todo lo que se mueve | `/pos` | Se confirma en el POS una venta creada por el usuario (no de los datos semilla) |
| 2 | Pasa camisas de un local a otro | `/inventario/HL-CAM-0142` (Camisa Oxford Slim Fit) con el panel de traslado abierto | El usuario crea un traslado entre locales (cualquier referencia) |
| 3 | Mueve tu importación y avísale al agente de aduanas | `/importaciones/IMP-2026-07` | El usuario guarda un cambio de estado en cualquier importación |
| 4 | Mira cuánta plata vas a tener en 90 días | `/pagos/flujo` | Se abre la vista de flujo de caja proyectado |
| 5 | Descubre cuánto te cuesta de verdad un vendedor | `/personal/sebastian-cardenas` en la pestaña "Costo para el negocio" | Se muestra el desglose del costo total para el empleador de cualquier empleado (o el comparativo de modalidades) |
| 6 | Mira el sistema como lo vería tu vendedor | Abre el selector de rol, con "Vendedor · Usaquén" resaltado | Se activa el rol Vendedor (o Bodega) |
| 7 | Pregúntale al WhatsApp si hay una camisa en tu talla | `/canales/whatsapp` con el escenario "Consulta de talla" seleccionado | Termina de reproducirse ese escenario, o el usuario escribe un mensaje propio y el bot responde |
| 8 | Abre la app del dueño en tu celular | Abre el modal del QR con la vista previa enmarcada | Se abre el modal del QR o se carga `/app` en este navegador |

Los cuatro módulos que el cliente marcó como prioritarios ocupan los ítems 2 a 5; el corazón "todo conectado" es el 1; los "dos mundos" son el 6 y el 8; la vitrina es el 7.

**"Para ir más lejos"** (sección plegada al final del panel; se despliega sola al completar 5 de 8). No cuentan para el 8/8, pero se marcan igual:

| Texto | Lleva a | Se marca cuando |
|---|---|---|
| Cambia todo a dólares o yuanes | Selector de moneda (resaltado) | La moneda de visualización deja de ser COP |
| Arma tu propia tabla dinámica | `/analisis/tabla-dinamica` | El usuario cambia filas, columnas o valor |
| Descarga un reporte en PDF | `/reportes` | Se genera cualquier PDF |
| Compra en tu tienda web y mira la venta llegar | `/tienda` | Se crea una venta con canal Web |
| Actualiza una importación como si fueras el agente | `/seguimiento/IMP-2026-06` | Se envía el formulario del portal |

**Al completar 8 de 8**, el panel se transforma en una tarjeta de cierre:

> **ESO ES KIPPICORE CRM.**
> Lo que acabas de ver funciona con datos de ejemplo de HALDEN. Imagínalo con tus referencias, tus tres locales y tu equipo.
> `HABLAR CON KIPPICORE` (enlace `wa.me` al número de Miguel, configurable) · "Seguir explorando"

### 2.5 Pistas contextuales

Una por pantalla, solo en la primera visita del módulo: un punto camel pulsante (8 px, pulso de 1,6 s) sobre el elemento ancla. Al pasar el cursor o hacer clic se abre un globo de máximo 25 palabras con el botón "Entendido". Nunca aparecen dos a la vez, nunca tapan un botón principal y no aparecen en el rol vendedor (salvo la del POS). Se desactivan todas desde el menú "?" ("Ocultar pistas").

| Pantalla | Ancla | Texto final |
|---|---|---|
| Inicio | Lista "Requiere tu atención" | Estas alertas salen solas de tus datos. Haz clic en cualquiera y te lleva directo a resolverla. |
| Punto de venta | Botón "Simular escaneo" | ¿No tienes lector a mano? Este botón hace lo mismo que pasar una etiqueta por el lector de código de barras. |
| Ventas | Barra de totales del filtro | Filtra por local, vendedor o medio de pago y estos totales se recalculan solos. Se acabó sumar en Excel. |
| Inventario | Filtro "Local" del catálogo | Cada talla y cada color, en cada local. Abre una referencia para ver dónde está cada unidad y moverla. |
| Importaciones | Botón de cambio de estado | Cambia el estado y KippiCore redacta el aviso para la fábrica, el agente de carga y el de aduanas. Tú solo confirmas. |
| Proveedores | Selector de moneda de la barra superior | Tus fábricas cobran en dólares y yuanes. Cambia la moneda aquí arriba y mira todo el sistema en US$ o CN¥. |
| Pagos | Pestaña "Flujo de caja" | Aquí ves si te alcanza la plata: lo que vas a recibir menos lo que tienes que pagar, semana a semana. |
| Costos y gastos | Pestaña "Estado de resultados" | ¿Qué local te deja más plata? El estado de resultados lo responde, local por local, en palabras sencillas. |
| Personal y nómina | Columna "Costo para el negocio" | Un salario no es lo que te cuesta un empleado. Aquí ves el costo real, con prestaciones y aportes. |
| Clientes | Filtros de segmento | KippiCore agrupa a tus clientes solo: VIP, frecuentes, en riesgo. Escríbeles por WhatsApp con un clic. |
| Calendario | Leyenda de tipos de evento | Turnos, contenedores, pagos y campañas en un solo calendario. Arrastra un evento para moverlo de día. |
| Análisis | Bloque de hallazgos | Estas frases las escribe el sistema leyendo tus ventas. Cambian cuando cambian tus datos. |
| Facturación | Marca de agua de la vista previa | Cada venta puede salir como factura electrónica. En la demo es una simulación y no se envía a la DIAN. |
| Canales digitales | Selector de escenarios | Elige una conversación o escribe tú, como si fueras un cliente. El bot responde con el inventario real. |
| Reportes | Botones PDF / Excel | Cada reporte sale en PDF o en Excel, con el local y las fechas que elijas. Listo para tu contador. |
| Configuración | Botón "Restaurar datos de demostración" | Aquí se ajusta todo: locales, tasas, nómina. Y si quieres empezar de cero, restaura la demo. |
| App del dueño (`/app`, Hoy) | Cifra principal | Agrégala a tu pantalla de inicio: en iPhone, Compartir → Agregar a inicio; en Android, menú ⋮ → Instalar app. |
| Tienda (`/tienda`) | Franja superior | Esta tienda se arma sola con tu inventario. Compra algo y mira la venta llegar a KippiCore. |
| Portal de seguimiento | Formulario de actualización | Esto es lo que ve tu agente de aduanas con el enlace. Si actualiza el estado, a ti te llega la alerta. |

Franja del rol (siempre visible cuando el rol no es Dueño): "Estás viendo KippiCore como: **Vendedor · Usaquén** (Sebastián Cárdenas)" · botón `VOLVER A LA VISTA DEL DUEÑO`.

### 2.6 Botón "?" y acceso a KippiCore

Botón "?" fijo en la barra superior. Menú: "Ver la entrada otra vez" · "Mostrar Prueba esto" · "Ver la app en el celular" · "Ocultar pistas" / "Mostrar pistas" · "Restaurar datos de la demo" · separador · "Hablar con KippiCore" (enlace `wa.me` configurable; si no hay número configurado, la opción no aparece). En la app móvil, "Más" incluye las mismas opciones al final.

### 2.7 Lo que haría cerrar la pestaña (prohibido)

Una cifra en $0 o una tabla vacía al llegar; cualquier palabra en inglés en la interfaz (salvo los mensajes al proveedor chino, que deben verse a propósito); un tour que bloquee; jerga contable sin traducción ("CxP" sin "plata que debes"); cifras absurdas (ventas de miles de millones al día, tallas inexistentes, precios sin ,900); nombres que no suenen colombianos; un botón que no haga nada; carga de más de 3 segundos sin nada que ver.

---

## 3. Momentos wow

Diez momentos. Cada uno se asigna a un paquete de trabajo y se verifica en la revisión del `cliente-esceptico`. Las cifras son de ejemplo; las reales salen del generador.

### W1. Una venta mueve todo el negocio
- **Dónde:** `/pos` → panel de confirmación.
- **Qué hace:** registra una venta: escanea (o busca), elige talla en la grilla, asocia a Andrés Gutiérrez (un Chino stretch de $219.900), paga $100.000 en efectivo y el resto por Nequi, confirma.
- **Qué ve:** el panel "Lo que acaba de pasar", con cada efecto como antes → después y un enlace "Ver":
  - Inventario Usaquén · Chino stretch arena, talla 32: 5 → 4
  - Ventas de hoy: $7.260.000 → $7.479.900
  - Comisión de Sebastián este mes: $1.120.400 → $1.126.997
  - Andrés Gutiérrez: 7 compras · última compra: hoy
  - Caja Usaquén: efectivo +$100.000 · Nequi +$119.900
  - Botones: `EMITIR FACTURA ELECTRÓNICA` · `RECIBO POS`
- **Por qué es memorable:** es el corazón de la demo (PRD 3.2.3). El cuaderno no hace esto, y el Excel tampoco.
- **Detalle que no se puede descuidar:** las cifras ruedan (conteo de 600 ms) y son exactas; cada "Ver" lleva al módulo con la fila cambiada resaltada en camel durante 1,5 s; la venta aparece también en la vista previa del celular. Si un solo número no cuadra, el momento se convierte en desconfianza.

### W2. Qué hay en cada local, sin llamar a nadie
- **Dónde:** `/inventario/HL-CAM-0142` (ficha de la Camisa Oxford Slim Fit).
- **Qué hace:** abre la ficha desde la alerta y mira la matriz talla × color × local; toca la celda vacía de Usaquén.
- **Qué ve:** la matriz con números por local (pestañas Todos / Parque 93 / Usaquén / Zona Rosa / Bodega), las celdas en cero en gris tramado, las bajas con borde camel; al tocar la celda, la sugerencia "Traer de Zona Rosa (6 disponibles)". Crea el traslado; cambia su estado de "Solicitado" a "En tránsito" a "Recibido" y ve moverse las existencias. Debajo: código EAN-13 con su gráfico de barras por variante, y el kardex.
- **Por qué es memorable:** resuelve la llamada diaria "¿tienes una M allá?" y es el módulo que el cliente marcó como más importante.
- **Detalle que no se puede descuidar:** los totales por local y el total general cuadran siempre; al marcar "Recibido" las dos celdas cambian a la vez con transición; la grilla del POS refleja el traslado de inmediato. Los códigos de barras deben ser EAN-13 válidos y verse nítidos.

### W3. Dónde viene mi contenedor, y todos quedan avisados
- **Dónde:** `/importaciones/IMP-2026-07` y `/seguimiento/IMP-2026-06`.
- **Qué hace:** mira la ruta y la línea de tiempo; cambia el estado a "En proceso de nacionalización"; revisa el panel "Notificar a"; abre "Ver como el agente de aduanas" (portal en otra pestaña) y actualiza otra importación desde allá.
- **Qué ve:**
  - Un diagrama sobrio de la ruta Ningbo → Océano Pacífico → Buenaventura → Bogotá, con el barco ubicado en el punto proporcional a las fechas, y la línea de tiempo de 13 estados con fechas estimadas y reales.
  - El panel "Notificar a" con tres contactos preseleccionados y los mensajes ya redactados. Ejemplos:
    - A Carolina Mejía (WhatsApp, español): "Hola, Carolina. El pedido IMP-2026-07 de HALDEN (Guangzhou Huameng, contenedor de 20 pies) pasó hoy, 30/09/2026, a «En proceso de nacionalización». Siguiente paso: declaración de importación y pago de tributos. ¿Me confirmas la fecha estimada de levante? Gracias. Juan Camilo Ospina · HALDEN"
    - A Ms. Chen Li (correo, inglés): "Dear Ms. Chen, a quick update on order IMP-2026-07: the container arrived at the port of Buenaventura and customs clearance started today, 30 Sep 2026. We will confirm receipt at our Bogotá warehouse. Best regards, Juan Camilo Ospina · HALDEN"
  - La bandeja de salida con "Enviado (simulación)" y los botones reales "Abrir en WhatsApp" y "Abrir en correo".
  - Al volver a la pestaña principal tras actualizar en el portal: un aviso inmediato, sin recargar: "Carolina Mejía actualizó IMP-2026-06: Nacionalizado", y la alerta nueva arriba en Inicio.
- **Por qué es memorable:** convierte el chat caótico con el agente en un sistema, y el agente de aduanas "entra" a su sistema.
- **Detalle que no se puede descuidar:** el inglés del mensaje al proveedor debe ser correcto y natural; el barco se desplaza con animación al cambiar de estado; el evento de llegada se mueve en el calendario; la actualización desde el portal llega a la otra pestaña en vivo (sincronización entre pestañas del mismo navegador). Los números de BL y documentos son ficticios y no imitan prefijos de navieras reales.

### W4. Lo que de verdad te cuesta una camisa
- **Dónde:** `/importaciones/IMP-2026-07`, pestaña "Costo aterrizado".
- **Qué hace:** abre la calculadora y mueve el control "¿Y si el dólar sube?" (±10% sobre la tasa de ejemplo); luego pulsa "Aplicar al inventario".
- **Qué ve:** una cascada de barras de FOB a costo final: precio de fábrica US$11,40 → + flete → + seguro → + arancel → + agente de aduanas → + puerto y bodegaje → + transporte a Bogotá = **$71.850 por camisa puesta en bodega**. Al lado: precio de venta $219.900 (IVA incluido; $184.790 sin IVA) y margen 61%. Al mover la tasa, el costo y el margen cambian en vivo. Al aplicar: "Se actualizaron 18 variantes. Margen promedio de camisas: 62% → 61%."
- **Por qué es memorable:** responde la pregunta que hoy contesta "más o menos". Es el puente entre importaciones, multimoneda e inventario.
- **Detalle que no se puede descuidar:** los parámetros (arancel, IVA, honorarios) son editables y llevan la etiqueta "valor de ejemplo"; el prorrateo por valor o por cantidad se puede elegir y la suma de los costos prorrateados cuadra con el total. El IVA de importación debe tener un interruptor visible "IVA descontable (no suma al costo)" para no perder credibilidad frente al contador.

### W5. La plata de los próximos 90 días
- **Dónde:** `/pagos/flujo`.
- **Qué hace:** llega desde la alerta del saldo a Hangzhou Lanxin; alterna 30 / 60 / 90 días; toca el punto más bajo.
- **Qué ve:** una línea de saldo proyectado (continua para lo real, punteada para lo proyectado) con una anotación en lenguaje sencillo: "Tu punto más bajo: $18,4 millones la semana del 19 de octubre. Coinciden el saldo a Hangzhou Lanxin, los arriendos y la quincena." Al tocar el punto, la lista de pagos de esa semana con su botón "Reprogramar".
- **Por qué es memorable:** convierte el miedo de "¿me alcanza?" en una fecha y una cifra. Es la cara visible del módulo de pagos, prioritario para el cliente.
- **Detalle que no se puede descuidar:** la proyección sale de los pagos programados reales y del promedio de ventas; el punto bajo existe y se ve, pero el saldo nunca llega a negativo (asustaría en vez de ayudar); reprogramar un pago mueve la línea en vivo.

### W6. Lo que de verdad te cuesta un empleado
- **Dónde:** `/personal/sebastian-cardenas`, pestaña "Costo para el negocio", y el comparativo de modalidades.
- **Qué hace:** mira el desglose; activa y desactiva la exoneración del art. 114-1; abre "¿Y si fuera por prestación de servicios?".
- **Qué ve:** una barra apilada: salario $1.950.000 + auxilio de transporte + aportes + prestaciones = **cerca de $2.990.000 al mes** con exoneración; sin ella, cerca de $3.254.000 (la barra crece con animación y muestra salud 8,5%, ICBF 3% y SENA 2% apareciendo). Comparativo lado a lado con prestación de servicios y la nota prudente sobre el contrato realidad. Debajo, en todos los casos: "Cálculo ilustrativo para la demo. Los valores se parametrizan y validan con el contador en la implementación."
- **Por qué es memorable:** casi ningún comerciante sabe esta cifra con precisión, y verla desglosada genera confianza en quien la construyó.
- **Detalle que no se puede descuidar:** las cifras salen de los parámetros 2026 del PRD y cuadran con las pruebas automáticas; la comisión del mes se toma de las ventas reales del POS; la nota legal está siempre visible.

### W7. Todo el negocio en dólares (o en yuanes)
- **Dónde:** selector de moneda de la barra superior, desde cualquier pantalla (idealmente Importaciones o Proveedores).
- **Qué hace:** cambia COP → USD → CNY.
- **Qué ve:** todas las cifras de la pantalla, los gráficos, sus ejes y sus tooltips se convierten con un fundido de 200 ms; junto al selector aparece "Tasa de ejemplo: US$1 = $4.000 · Editar". En importaciones, la cifra original en moneda de origen se conserva junto a la convertida.
- **Por qué es memorable:** un importador piensa en dos monedas; ver su negocio entero en dólares en un clic es inmediato y visible.
- **Detalle que no se puede descuidar:** ni una sola cifra queda sin convertir (incluidas las de la frase del saludo, las alertas y los PDF, que indican la moneda en el encabezado); formatos `US$` y `CN¥` con separadores colombianos; las operaciones pasadas usan la tasa de su fecha.

### W8. Lo que ve tu vendedor (y lo que no ve)
- **Dónde:** selector de rol → Vendedor · Usaquén.
- **Qué hace:** cambia de rol; navega; marca entrada; vuelve al dueño.
- **Qué ve:** la barra lateral se reduce con una transición (los módulos ocultos se desvanecen en 180 ms); aparece la franja del rol; Inicio del vendedor: "Hola, Sebastián. Hoy llevas $1.380.000 en 4 ventas. Tu comisión del mes: $1.126.997. Meta del local: 72%." Botón grande `MARCAR ENTRADA`. El inventario de los otros locales aparece con la etiqueta "Solo consulta". Costos, márgenes, salarios de otros y pagos no existen en esta vista.
- **Por qué es memorable:** el dueño entiende qué tendría su equipo en la computadora del local y, sobre todo, que su información sensible queda protegida.
- **Detalle que no se puede descuidar:** ningún dato del dueño se filtra (tampoco en la ficha de producto, ni en tooltips, ni en exportaciones); el local queda fijo; la marcación de entrada aparece luego en la asistencia del dueño con la hora y el local.

### W9. Un WhatsApp que conoce tu inventario
- **Dónde:** `/canales/whatsapp` (y como extensión, `/tienda`).
- **Qué hace:** elige "Consulta de talla" o escribe: "Hola, ¿tienen la Oxford azul clarita en talla M?".
- **Qué ve:** a la izquierda, un teléfono con la conversación: indicador "escribiendo…" de ~1,2 s y la respuesta: "Hola, Andrés. Sí: la Camisa Oxford Slim Fit azul cielo en talla M está disponible en Zona Rosa (6), Parque 93 (2) y Usaquén (1). Cuesta $219.900. ¿Te la separo en alguno?" (si el usuario ya hizo el traslado o vendió esa camisa, las cifras lo reflejan). A la derecha, el "cerebro": la regla que se activó se ilumina y muestra la consulta al inventario con las cifras por local. Indicadores simulados: mensajes enviados, tasa de respuesta, ventas atribuidas. Etiqueta: "Vista previa de lo que KippiCore puede construir para HALDEN".
- **Por qué es memorable:** el cliente hoy contesta esos mensajes a mano; ver que el bot responde con su inventario real (que ya refleja su traslado y su venta) cierra el círculo.
- **Detalle que no se puede descuidar:** cifras reales y actuales; reconocimiento razonable de texto libre (producto, color, talla, con sinónimos como "clarita", "azul cielo", "celeste"); respuesta amable cuando no entiende ("¿Me dices la talla y el color que buscas?"). Extensión: una compra en `/tienda` aparece en Ventas con canal "Web" y descuenta inventario.

### W10. Tu negocio en el bolsillo
- **Dónde:** "Ver app del dueño" (modal QR con vista previa enmarcada) y `/app` en el celular.
- **Qué hace:** escanea el QR; recorre Hoy, Ventas, Inventario; aprueba un descuento; la instala.
- **Qué ve:** en el celular, modo oscuro (negro profundo `#0A0A0A`), "Hoy" con una cifra enorme que cuenta hasta su valor, un punto "en vivo", ventas por hora, la barra de los tres locales y una sección **"Para aprobar"** con dos solicitudes precargadas: "Sebastián Cárdenas pide 20% de descuento · Blazer de lana fría · $789.900 → $631.920" y "Wilson Díaz pide trasladar 8 unidades de Parque 93 a Zona Rosa". Al aprobar, la tarjeta se va con un deslizamiento y queda registrada. En el computador, el marco de teléfono muestra la misma app con la venta que acaba de registrar.
- **Por qué es memorable:** es la promesa de control a distancia hecha tangible, en su propio teléfono. Es una de las métricas de éxito del PRD.
- **Detalle que no se puede descuidar:** el QR apunta a la URL real del despliegue; la app no tiene desplazamiento horizontal en 360–430 px; ícono de HALDEN al instalar; transiciones nativas entre pestañas. Si se activa el "pulso en vivo" (complemento, ver 4.5), solo ocurre dentro de `/app`, con la pestaña visible, máximo una venta simulada cada 5 minutos, y usando la misma acción de dominio que una venta normal (coherencia intacta).

**Mapa de momentos por paquete (para los briefs):** W1 → POS + integración · W2 → Inventario · W3 → Importaciones + portal · W4 → Importaciones (costo aterrizado) + Inventario · W5 → Pagos · W6 → Nómina · W7 → Fundaciones (formato y moneda) + todos · W8 → Fundaciones (roles) + Personal · W9 → Canales digitales + Tienda · W10 → App móvil.

---

## 4. Prioridad

### 4.1 Niveles

| Nivel | Qué significa | Profundidad y pulido |
|---|---|---|
| **Imprescindible (I)** | Si falla o se ve tosco, se pierde la venta. Incluye los módulos que el cliente marcó y todo lo que sostiene un momento wow | Flujo completo de punta a punta; todos los estados diseñados (vacío, carga, error, éxito); microinteracciones y animaciones a medida; prueba de extremo a extremo; primera prioridad en QA visual y en la revisión del `cliente-esceptico`; cero asperezas |
| **Muy importante (MI)** | El cliente lo va a visitar y debe sentirse completo | Funcionalidad completa con crear/editar/eliminar; datos densos; diseño consistente con componentes del sistema; animación estándar del sistema de diseño; pruebas de cálculo cuando aplique |
| **Complemento (C)** | Suma credibilidad; el cliente puede pasar por ahí | Funciona y es verosímil, sin botones muertos; patrones genéricos del sistema de diseño; la simulación es aceptable si es creíble; sin animaciones a medida |

Regla para los cuatro módulos prioritarios (**inventario, pagos, nómina, proveedores con importaciones**): todo lo que muestran se puede ver **por local** y respeta el selector de local de la barra superior. En cada uno debe existir al menos una vista que compare los tres locales lado a lado.

### 4.2 Transversales (secciones 6 y 8 del PRD)

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Pantalla de entrada con dos puertas (`/`) | I | Versión de computador y de celular según 2.2; QR real; fundido de entrada |
| Barra lateral, barra superior y layout de escritorio | I | Sistema de diseño completo; firma "Desarrollado por KippiCore" en el pie de la barra lateral |
| Selector de local (filtra todo el sistema) | I | Afecta dashboards, inventario, ventas, gastos, nómina, pagos y reportes; fijo en rol vendedor |
| Selector de rol con cambio en vivo y franja superior | I | W8; permisos reales en navegación, fichas y exportaciones |
| Multimoneda: selector global COP/USD/CNY | I | W7; cubre cifras, gráficos, tooltips, frases y PDF |
| Multimoneda: tabla de tasas editable con historial | MI | En Configuración; "tasa de ejemplo" visible; operaciones pasadas con la tasa de su fecha |
| Importaciones registradas en moneda de origen | I | Cifra original + convertida, con la tasa del día del pago |
| Formato colombiano (miles con punto, decimales con coma, `dd/mm/aaaa`, a. m./p. m.) | I | Sin excepción, incluidos PDF y Excel |
| Acceso "Ver app del dueño" con QR y vista previa enmarcada | I | W10; aviso de datos separados entre dispositivos |
| Enlaces profundos y recarga en rutas | I | Cada módulo y cada detalle con ruta propia |
| Persistencia local con modo memoria | I | Invisible para el cliente; nunca un error si falla |

### 4.3 Módulos de escritorio (sección 7 del PRD)

**7.1 Inicio**

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Saludo con frase resumen del día (propuesta de 2.3.1) | I | Tres variantes por hora; respeta local y moneda |
| Seis tarjetas de indicadores | I | Micrográfico, variación, clicables al detalle |
| Gráfico de 30 días por local | I | Barras apiladas en grises, tooltip con los tres locales |
| Alertas accionables | I | Las 8 de 2.3.3, acción directa al punto de resolución |
| Comparativo de los tres locales | I | Franja propia; es la cara del "dividido por local" |
| Top 5 y sin movimiento en 60 días | MI | Con miniatura SVG de la prenda |
| Próximos eventos | MI | Conectados al calendario |
| Hallazgo de la semana | MI | Rota entre los hallazgos de Análisis |

**7.2 Punto de venta**

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Búsqueda por nombre, referencia o código + "Simular escaneo" | I | Respuesta instantánea; el escaneo agrega un producto disponible con un destello |
| Grilla talla × color con disponibilidad (otros locales en gris) | I | Visual, táctil, legible a distancia |
| Carrito con descuento por línea o global (% o valor) | I | Totales en vivo; IVA incluido y desglosado |
| Asociar cliente o crearlo rápido (con autorización de datos) | I | Formulario de 4 campos; validación de celular 3XX |
| Pago mixto y cálculo de cambio | I | Teclado de billetes frecuentes ($50.000, $100.000) |
| Confirmación con efectos en cascada + factura o recibo | I | W1 |
| Separado (plan de abonos) | MI | Reserva la mercancía; aparece en por cobrar y en alertas |
| Cambios y devoluciones | MI | Reingresa inventario; nota crédito o saldo a favor |
| Apertura y cierre de caja por local y turno | MI | Esperado vs. contado con diferencia resaltada; alimenta Caja y bancos (pagos) |

**7.3 Ventas**

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Tabla con filtros (fechas, local, vendedor, cliente, medio de pago, canal, estado, producto) | MI | Paginada o virtualizada; filtros en la URL |
| Totales del filtro siempre visibles | MI | Barra fija |
| Detalle tipo recibo, edición o anulación con motivo | MI | Anulación revierte inventario y comisión |
| Exportar a Excel y PDF | MI | Mismo motor de Reportes |

**7.4 Inventario** (prioritario)

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Catálogo en tabla y tarjetas con filtros (categoría, talla, color, local, proveedor, estado de stock) | I | Tarjetas con ilustración SVG 3:4 sobre `#EFEFEF`, como una tienda de lujo |
| Ficha de producto con matriz talla × color × local | I | W2 |
| Ilustraciones SVG por tipo de prenda coloreadas por variante | I | Elegantes, coherentes, nunca infantiles; 8 tipos mínimo |
| SKU y EAN-13 válido visible con su gráfico | I | Nítido, dígito de control correcto |
| Traslado entre locales con estados (solicitado, en tránsito, recibido) | I | W2; también solicitable desde la app (aprobación) |
| Valorización a costo y a precio de venta, por local | I | Tabla de tres locales + bodega, con totales |
| Alertas de stock mínimo | I | Alimentan Inicio; mínimo configurable por referencia (MI) |
| Entrada por importación con costo aterrizado | I | Al recibir una importación; ver distribución por local en 7.5 |
| Crear, editar y eliminar productos y variantes | MI | Generación automática de SKU y EAN-13 |
| Kardex (historial de movimientos) | MI | Cuadra con existencias actuales |
| Ventas y rentabilidad de la referencia | MI | Gráfico pequeño y margen por variante |
| Ajuste por conteo con motivo (daño, pérdida, error) | MI | Requiere motivo |
| Conteo físico por local | MI | Escanear o digitar, diferencias en color, aplicar ajustes |
| Etiquetas en PDF con código de barras | MI | Hoja imprimible; tildes y símbolo $ correctos |

**7.5 Importaciones** (prioritario)

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Pedido de importación con líneas, moneda y tasa | I | Crear y editar completo |
| Línea de tiempo de 13 estados con fechas estimadas, reales e indicador de retraso | I | W3 |
| Diagrama de la ruta China → puerto colombiano → Bogotá | I | W3; barco animado |
| Notificaciones de estado: panel "Notificar a", mensajes bilingües, bandeja de salida, `wa.me` y `mailto:` | I | W3 |
| Portal de seguimiento `/seguimiento/:id` con actualización y alerta al dueño | I | W3; sincronización entre pestañas |
| Calculadora de costo aterrizado con prorrateo y aplicación a inventario | I | W4 |
| Pagos al proveedor (anticipo y saldo) con tasa del día y diferencia en cambio | MI | Alimenta Pagos y el flujo de caja |
| Distribución por local al recibir (propuesta) | MI | Al pasar a "Recibido en bodega", propone repartir según lo que vende cada local ("Parque 93 40% · Zona Rosa 38% · Usaquén 22%"), editable; genera los traslados. Hace visible el "dividido por local" en importaciones |
| Documentos asociados simulados | MI | Nombre, estado y vista previa sobria |
| Contactos de la cadena de importación | MI | Ficha con rol, empresa, correo, WhatsApp, país |
| Tablero kanban por estado | MI | Arrastrar cambia el estado y dispara la notificación |
| Lista de contenedores con llegada estimada conectada al calendario | MI | Mover la fecha mueve el evento |

**7.6 Proveedores** (prioritario)

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Directorio (fábricas en China y proveedores locales) | I | Filtros por tipo, país y moneda; proveedores locales asociados a su local (arriendo, vigilancia) |
| Ficha: contacto, moneda, condiciones, historial de pedidos, total comprado, saldo pendiente, tiempo de entrega, calificación | I | Saldo enlazado a Pagos; historial enlazado a Importaciones |
| Comparativo de fábricas chinas (costo por unidad, cumplimiento, defectos) | MI | Tabla y gráfico; debe revelar el patrón de Ningbo Weiye (4.7) |

**7.7 Pagos** (prioritario)

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Por pagar (proveedores en COP/USD/CNY, arriendos de cada local, servicios, nómina, seguridad social, impuestos, agente, publicidad) con estados y pagos parciales | I | Vista por semana y por local; registrar pago en dos clics |
| Por cobrar (separados, crédito, saldos) con recordatorio de WhatsApp | I | Mensaje prellenado con nombre, saldo y fecha |
| Caja y bancos: saldos por cuenta (caja de cada local, banco, Nequi, Daviplata) y movimientos | I | Caja de cada local alimentada por el POS |
| Flujo de caja proyectado a 30/60/90 días | I | W5 |
| Conciliación simple (marcar como conciliado) | C | Casilla por movimiento con contador de pendientes |
| Soporte del pago (simulado) | C | Nombre de archivo y miniatura genérica |

**7.8 Costos y gastos**

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Estado de resultados simplificado por mes y por local, con explicación sencilla | MI | Pulido alto: es la respuesta a "¿qué local me deja plata?" |
| Registro de gastos con categoría, local, IVA, proveedor y medio de pago | MI | Formulario completo |
| Gastos recurrentes (plantillas mensuales) | MI | Arriendo, internet, vigilancia por local |
| Resumen por categoría y por local vs. mes anterior | MI | Barras horizontales |
| Punto de equilibrio mensual por local | C | Una cifra y una frase por local |

**7.9 Personal y nómina** (prioritario)

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Liquidación con contrato laboral (devengados, deducciones, aportes, provisiones) | I | Desglose completo y pruebas de cálculo |
| Costo total para el empleador con desglose visual | I | W6 |
| Interruptor de exoneración del art. 114-1 | I | W6; cambia aportes en vivo |
| Prestación de servicios (honorarios, retención, verificación de PILA) | I | Casilla y soporte simulado |
| Comparativo lado a lado de modalidades con nota de contrato realidad | I | W6 |
| Nota "Cálculo ilustrativo para la demo…" | I | En todo cálculo de nómina, sin excepción |
| Comisiones calculadas desde las ventas del POS | I | W1 y W8; esquemas por porcentaje, escalonado y bono de meta |
| Costo de nómina por local y como % de las ventas del local | I | Vista comparativa de los tres locales (patrón en 4.7) |
| Ficha del empleado | MI | Todos los campos del PRD |
| Turnos semanales por local con arrastrar y soltar y validación de 42 horas | MI | Advertencia clara al exceder la jornada |
| Marcación de entrada y salida (rol vendedor) | MI | W8; aparece en la asistencia del dueño |
| Reporte de asistencia que alimenta la liquidación | MI | Llegadas tarde, ausencias, horas extra |
| Desprendible de pago en PDF | MI | Diseño impecable: el empleado lo vería |
| Parámetros 2026 editables | MI | En Configuración, con la nota de verificación de recargos |
| Novedades (incapacidades, vacaciones, licencias, permisos) | C | Registro simple que afecta días liquidados |
| Resumen de nómina del periodo en Excel | C | Mismo motor de Reportes |

**7.10 Clientes**

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Ficha con tallas preferidas, estilos, local y vendedor habitual | MI | Las tallas preferidas se deducen de las compras |
| Historial de compras y métricas (ticket, frecuencia, última compra, valor histórico) | MI | La venta del W1 aparece aquí |
| Segmentación automática (VIP, frecuente, ocasional, en riesgo, nuevo) | MI | Chips con conteo |
| Acciones: WhatsApp prellenado, nota, seguimiento en calendario | MI | `wa.me` real |
| Cumpleaños del mes con mensaje sugerido | C | Lista simple |
| Fidelización | C | Sin programa de puntos (complicaría la demo); solo "saldo a favor" y "beneficio de cumpleaños" en la ficha |

**7.11 Calendario**

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Eventos conectados: llegadas de importaciones y vencimientos de pagos | MI | Cambian cuando cambia el origen |
| Vistas mes, semana y día con filtros por tipo y local | MI | Colores por tipo en escala sobria |
| Crear, editar, arrastrar y eliminar | MI | Arrastre fluido |
| Turnos, campañas y citas con clientes | MI | Turnos desde el módulo de turnos |
| Recordatorios en Inicio y en la app | MI | Próximos eventos |

**7.12 Análisis**

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Hallazgos automáticos (3–5 frases) | I | Calculados de los datos (nunca texto fijo); alimentan Inicio; ver 4.7 |
| Tallas y colores que más rotan | MI | Pulido alto: es la decisión del próximo pedido a China |
| Ventas por mes con comparación año contra año | MI | 18 meses, estacionalidad visible |
| Mapa de calor día × hora | MI | Escala de grises, celda más fuerte en negro |
| Más y menos vendidos (unidades, valor, margen) | MI | Filtros por categoría, talla, color |
| Rotación, días de inventario y mercancía dormida | MI | Calzado debe saltar a la vista |
| Desempeño por local y por vendedor | MI | Valentina debe destacarse sola |
| Tabla dinámica (10+ dimensiones, 5 medidas, totales, gráfico, Excel) | MI | Criterio de aceptación del PRD; respuesta instantánea |
| Proyección "A este ritmo cerrarías el mes en $X" | MI | Visible en Análisis y en la app |
| Ventas por semana del año | C | Un gráfico |
| Comportamiento de clientes (nuevos vs. recurrentes, frecuencia, segmentos, canal, medio de pago) | C | Gráficos simples |

**7.13 Facturación electrónica (simulada)**

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Marca de agua "DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL" | I | En vista previa y PDF, siempre |
| Generación desde una venta (emisor, resolución ficticia, adquirente, IVA 19%, CUFE simulado, QR) | MI | Vista previa elegante |
| Descarga en PDF | MI | Encabezado HALDEN y firma KippiCore |
| Estados simulados (generada, enviada a la DIAN, aceptada) | C | Transición automática con tiempos cortos |
| Notas crédito por devoluciones | C | Desde la devolución del POS |

**7.14 Canales digitales**

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| WhatsApp: escenario "Consulta de talla" con inventario real y texto libre | I | W9 |
| Etiqueta "Vista previa de lo que KippiCore puede construir para HALDEN" | I | En cada vista |
| WhatsApp: separado y saldo, nueva colección, cumpleaños, resumen al dueño | MI | Guiones reproducibles con el panel de reglas |
| Indicadores simulados (mensajes, respuesta, ventas atribuidas) | C | Cifras verosímiles |
| Tienda web `/tienda` (portada, catálogo, ficha, carrito, checkout simulado) | MI | Misma calidad estética que el resto; la compra aparece con canal Web |
| Marcos de escritorio y celular para la tienda | C | Alternador simple |
| Instagram: "precio?" en comentarios, catálogo por DM, creación del cliente en el CRM | C | Mismo formato que WhatsApp, menos escenarios |

**7.15 Reportes**

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Motor común de PDF (tildes, ñ, encabezado HALDEN, filtro, fecha, pie "Generado con KippiCore CRM") | I | Cualquier PDF descargado sale perfecto; se mostrará a terceros |
| Motor común de Excel (encabezados con formato, anchos, moneda, fila de totales) | I | Abre sin advertencias en Excel y Numbers |
| Inventario valorizado y existencias por local · Kardex | MI | Prioritario |
| Importaciones y costo aterrizado | MI | Prioritario |
| Cuentas por pagar y por cobrar | MI | Prioritario |
| Nómina del periodo, desprendibles y comisiones por vendedor | MI | Prioritario |
| Ventas detalladas y resumidas · Cierre de caja | MI | — |
| Gastos por categoría · Estado de resultados | C | — |
| Asistencia · Clientes y segmentos | C | — |

**7.16 Configuración**

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Restaurar datos de demostración (con confirmación) | I | Red de seguridad del cliente; también en el menú "?" |
| Monedas y tasas de cambio | MI | Ver transversales |
| Parámetros de nómina | MI | Cambiar SMMLV recalcula en vivo |
| Empresa (nombre, NIT, logotipo tipográfico, colores) | C | Es la base de la plantilla reutilizable; cambiar el nombre cambia el wordmark |
| Locales (crear, editar, eliminar) | C | Con confirmación y advertencia si tiene existencias |
| Impuestos (IVA, retenciones) | C | Parámetros editables |
| Usuarios y roles (simulado) | C | Lista con los roles de 1.5 |

### 4.4 App móvil del dueño (sección 6.5 del PRD)

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Pestaña Hoy (cifra grande, por hora, tres locales, alertas) | I | W10; modo oscuro |
| Instalable como PWA con ícono HALDEN | I | Probado en iPhone y Android |
| Para aprobar (descuentos y traslados) | MI | Responde al "aprobar cosas" del PRD 6.1; dos solicitudes precargadas |
| Ventas (día, semana, mes, por local) | MI | Gráficos simples, cifras grandes |
| Inventario (consulta por referencia y local, stock bajo) | MI | Búsqueda rápida |
| Más: importaciones, nómina, pagos pendientes, alertas, moneda | MI | Importaciones con mini línea de tiempo |
| Agenda | C | Lista de próximos eventos |
| Tarjeta "Abre el sistema completo en tu computador" | MI | Compartir o copiar enlace (recorrido alterno de 2.1) |

### 4.5 Recorrido guiado (sección 10 del PRD)

| Funcionalidad | Nivel | Profundidad y pulido esperado |
|---|---|---|
| Pantalla de bienvenida (= entrada `/`) | I | 2.2 |
| Lista "Prueba esto" con detección de completado | I | 2.4; animación de marca, contador, tarjeta de cierre |
| Pistas contextuales (una por pantalla, primera visita) | MI | 2.5 |
| Botón "?" siempre disponible | MI | 2.6 |
| "Pulso en vivo" en la app (ventas simuladas ocasionales) — propuesta | C | Solo en `/app`, con la pestaña visible, máximo una cada 5 minutos y 6 por día, mediante la misma acción de dominio que una venta real; se puede desactivar en Configuración |

### 4.6 Propuestas del estratega fuera del texto literal del PRD

Registrar en `DECISIONES.md`:

1. **`/` es la entrada y el escritorio vive en `/inicio`** (2.2). El enlace siempre abre en las dos puertas.
2. **"Prueba esto" prioriza los módulos del cliente**: los ítems del PRD que no caben en 8 (moneda, tabla dinámica, PDF, tienda) pasan a "Para ir más lejos" (2.4). Nada se pierde.
3. **Acceso "Hablar con KippiCore"** configurable, en el menú "?", en "Más" de la app y en la tarjeta de cierre (1.3, 2.6). Sin número configurado, no aparece.
4. **Puente celular ↔ computador**: entrada de celular orientada a la app, tarjeta para abrir el sistema completo en el computador, y aviso de datos separados en el modal del QR (2.1).
5. **"Para aprobar" en la app** y **distribución por local al recibir una importación** (4.3, 4.4).
6. **"Trae tu Excel"** (C): en Inventario, Clientes y Proveedores, un botón "Importar desde Excel" que abre un modal con una vista previa simulada de columnas mapeadas y el texto "En la implementación, KippiCore carga tus archivos actuales de Excel." Desactiva la objeción de migración sin construir un importador real.

### 4.7 Patrones descubribles que el generador debe sembrar

Los hallazgos automáticos se **calculan** de los datos; estos son los patrones que el generador debe producir para que tengan algo que decir. Las cifras son objetivos aproximados (tolerancia ±15%) para un mes típico; el auditor de datos verifica que emerjan.

**Escala base del negocio.**

| Variable | Objetivo |
|---|---|
| Ventas de un mes típico (septiembre, octubre) | ~$330 millones en total |
| Índice estacional mensual (1,00 = mes típico) | Ene 0,70 · Feb 0,72 · Mar 0,85 · Abr 0,88 · May 0,95 · Jun 1,35 · Jul 0,95 · Ago 0,92 · Sep 1,15 · Oct 0,95 · Nov 1,30 · Dic 1,85 |
| Crecimiento año contra año | +9% a +12% |
| Ventas por día | 15 (martes de febrero) a 60 (sábado de diciembre); ~30 en promedio |
| Índice por día de la semana | Lun 0,75 · Mar 0,70 · Mié 0,80 · Jue 0,90 · Vie 1,15 · Sáb 1,60 · Dom 1,10 |
| Horario | Lun–Sáb 10:00 a. m.–8:00 p. m.; Dom 11:00 a. m.–7:00 p. m. Franja fuerte 3:00–7:00 p. m. |
| Margen bruto promedio (sobre precio sin IVA; los precios de etiqueta incluyen IVA 19%) | ~58% (polos 66%, camisas 62%, pantalones 60%, sweaters 58%, blazers 54%, trajes 52%, calzado 48%) |
| Unidades por venta | ~1,4 |

**Patrones con el hallazgo que deben producir.**

| # | Patrón | Cifra objetivo | Dónde se descubre | Hallazgo esperado (redacción tipo) |
|---|---|---|---|---|
| P1 | **Local de ticket alto vs. local de volumen** | Parque 93: ~9 ventas/día, ticket ~$520.000, 1,6 unidades, 41% de las ventas en $. Zona Rosa: ~14 ventas/día, ticket ~$315.000, 1,3 unidades, 39%. Usaquén: ~6 ventas/día, ticket ~$365.000, 20% | Inicio (comparativo), Análisis por local | "Parque 93 hace menos ventas que Zona Rosa, pero cada una vale 1,7 veces más." |
| P2 | **Vendedora estrella** | Valentina Gómez: ~$58 millones/mes (~43% de las ventas de Parque 93), ~45% sobre el promedio de los siete vendedores (~$40 millones); ticket ~$640.000; 46% de sus ventas incluye un accesorio (cinturón, corbata, medias) frente a ~17% del resto | Análisis por vendedor, tabla dinámica, comisiones | "Valentina Gómez vende 45% más que el promedio del equipo. Casi la mitad de sus ventas incluye un accesorio." |
| P3 | **Talla que se agota** | Camisas: M 38% de las unidades, L 29%, XL 15%, S 13%, XXL 5%, con compras casi parejas por talla. La Oxford azul cielo M se agotó 3 veces en 6 meses, ~9 días cada vez. Hoy: Usaquén 1, Parque 93 2, Zona Rosa 6, Bodega 0; vienen 48 en IMP-2026-07 | Inicio (alerta 1), Análisis de tallas, ficha de producto | "Las camisas talla M en azul se agotan antes que el resto: considera pedir 30% más en el próximo pedido." |
| P4 | **Tallas de pantalón** | 32 y 34 suman ~54% de las unidades de pantalón | Análisis de tallas | "Dos de cada tres pantalones que vendes son talla 32 o 34." (ajustar la frase a la cifra real) |
| P5 | **Categoría dormida: calzado** | Un pedido grande de Wenzhou Ruifeng, recibido hace ~7 meses, sobrecargó la categoría. ~160 días de inventario (existencias ÷ venta diaria de los últimos 90 días) contra ~55 de la tienda; ~$40 millones a costo inmovilizados. Dos referencias de calzado entre los 5 sin movimiento en 60 días | Inicio (alerta 8, sin movimiento), Análisis de rotación | "Tienes $40 millones quietos en calzado: a este ritmo tardarías más de 5 meses en venderlo." |
| P6 | **Sin movimiento en 60 días** | Exactamente 5 referencias, ejemplo: Mocasín de gamuza café, Oxford de cuero vinotinto, Blazer cruzado mostaza, Chaleco de lino beige, Corbata de seda estampada paisley | Inicio, Análisis | (lista en Inicio) |
| P7 | **Sábado por la tarde** | Sábado ≈ 23% de las ventas semanales; sábado 3–7 p. m. ≈ 11% de la semana | Mapa de calor | "Entre 3 y 7 p. m. de los sábados —menos del 6% de las horas que abres— haces el 11% de tus ventas." |
| P8 | **Domingo distinto por local** | Domingo: Zona Rosa (centro comercial) índice 1,45; Usaquén 1,35 con pico 11:00 a. m.–2:00 p. m. (mercado de las pulgas); Parque 93 0,80 | Mapa de calor filtrado por local | "Los domingos, Zona Rosa vende 80% más que Parque 93. Vale la pena reforzar el turno." |
| P9 | **Pagos digitales en ascenso** | Mes actual: datáfono 46%, efectivo 18%, Nequi 14%, Bre-B/transferencia 11%, separado 5%, Daviplata 4%, crédito 2%. Hace 12 meses: Nequi 8%, Daviplata 3%, Bre-B/transferencia 2% | Análisis de medios de pago | "Los pagos por Nequi, Daviplata y Bre-B pasaron del 13% al 29% de tus ventas en un año, y no te cobran comisión de datáfono." |
| P10 | **Comisión de datáfono** | ~2,6% sobre las ventas con datáfono ≈ $4 millones al mes, registrado como gasto | Costos y gastos, Análisis | "El mes pasado pagaste $4 millones en comisiones de datáfono." |
| P11 | **Clientes VIP en riesgo** | ~420 clientes: VIP 8%, frecuente 22%, ocasional 35%, en riesgo 25%, nuevo 10%. ~30 clientes VIP sin compra en más de 90 días. ~70% de las ventas con cliente asociado; ~58% de las ventas a clientes recurrentes | Clientes, Análisis de clientes | "31 clientes que te han comprado más de $3 millones no vuelven hace más de 90 días. Escríbeles." |
| P12 | **Colores** | Azul (navy + azul cielo) ~34% de las camisas; beige y camel subiendo en sweaters en los últimos 3 meses | Análisis de colores | "El azul es una de cada tres camisas que vendes." |
| P13 | **El dólar se come el margen** | Blazers de lana fría: margen ~57% en el pedido anterior (IMP-2026-03) y ~51% en IMP-2026-06, por una tasa ~8% más alta con el mismo precio de venta | Costo aterrizado, rentabilidad por referencia | "Por la tasa de cambio, los blazers del último pedido te dejan 6 puntos menos de margen." |
| P14 | **Fábrica incumplida** | Ningbo Weiye: retraso promedio ~12 días, defectos ~4,8%. Guangzhou Huameng: 96% a tiempo, defectos ~1,1%. Las otras, intermedias | Comparativo de proveedores | "Ningbo Weiye llega en promedio 12 días tarde y tiene 4 veces más defectos que Guangzhou Huameng." |
| P15 | **Nómina pesa distinto por local** | Costo de nómina (con prestaciones, aportes y comisiones) como % de las ventas del local: Usaquén ~14% (incluye el taller del sastre), Parque 93 ~9%, Zona Rosa ~8%. Costo total mensual de la nómina, con bodega y administración, ~$45 millones | Nómina por local, Estado de resultados por local | "La nómina de Usaquén equivale al 14% de lo que vende; en Zona Rosa, al 8%." |
| P16 | **Llegadas tarde y horas extra** | Mateo Herrera: 4 llegadas tarde en el mes. Horas extra concentradas en Zona Rosa los domingos y en diciembre | Asistencia, liquidación | (alerta 4 de Inicio) |
| P17 | **Separados** | ~14 separados activos con ~$6,2 millones de saldo; 3 vencen esta semana por ~$1.870.000 | Pagos por cobrar, Inicio | (alerta 5 de Inicio) |
| P18 | **Proyección del mes** | Ritmo del mes en curso ~8% sobre el mismo mes del año anterior | Análisis, app | "A este ritmo, cerrarías septiembre en $378 millones, 8% más que septiembre del año pasado." |
| P19 | **Flujo de caja con un punto bajo** | Saldo proyectado con un mínimo entre los días 18 y 28 (~$18 millones), sin llegar a negativo, causado por saldo de importación + arriendos + quincena | Pagos (W5) | (anotación del gráfico) |
| P20 | **Top 5 del mes** | Camisa Oxford Slim Fit, Chino stretch, Polo piqué, Blazer de lana fría, Sweater de merino cuello redondo | Inicio | (lista en Inicio) |

**Importaciones sembradas** (numeración relativa al año en curso; ejemplo con 2026):

| Pedido | Fábrica | Contenido | Estado hoy | Para qué sirve |
|---|---|---|---|---|
| IMP-2026-10 | Hangzhou Lanxin | Sweaters de merino para diciembre | En producción · anticipo 30% pagado · saldo de US$14.700 vence el viernes | Alerta 3, punto bajo del flujo de caja (W5) |
| IMP-2026-08 | Shaoxing Yuefeng | Pantalones y chinos | En tránsito marítimo · llega a Buenaventura en ~8 días | Barco en mitad del océano en el mapa |
| IMP-2026-07 | Guangzhou Huameng | Camisas (incluye 48 Oxford azul cielo M) | En puerto colombiano (Buenaventura), actualizado ayer por el agente | Alerta 2, W3 (mover a nacionalización), conexión con alerta 1 |
| IMP-2026-06 | Ningbo Weiye | Blazers de lana fría y trajes | En proceso de nacionalización · 6 días de retraso (inspección física) | Alerta 6, retraso, P13, portal de seguimiento |
| IMP-2026-03, IMP-2025-xx (4 o 5 más) | Varias, incluida Wenzhou Ruifeng (calzado) | Recibidas | Recibido en bodega | Historia, costo aterrizado, P5, P13, P14 |

Todo lo relativo ("el viernes", "ayer", "en 8 días") se calcula desde la fecha del navegador; el generador ajusta las fechas para que estas situaciones existan siempre, sin importar el día en que se abra la demo.

---

## Decisiones clave de un vistazo

| # | Decisión | Por qué, en una línea |
|---|---|---|
| D1 | **Un solo camino de escritura.** Todo cambio de datos —del usuario o del generador— es un **comando de dominio** procesado por el mismo manejador puro | La coherencia numérica sale por construcción: el generador no puede "inventar" datos que el POS no podría producir |
| D2 | **Persistencia = base determinista regenerada + registro de comandos del usuario con marca de agua** (en `localStorage`). No se guarda el estado completo | El registro pesa kilobytes, sobrevive a nuevas versiones del generador, "Restaurar" es borrar el registro y el día siguiente la demo sigue viva |
| D3 | **Ancla de fecha**: sin registro, la historia termina "ahora" (siempre fresca); con registro, la ventana de 18 meses queda anclada al día del primer cambio y los días posteriores se simulan encima | Los IDs, consecutivos y existencias que el usuario vio no se mueven bajo sus pies |
| D4 | **Generador por intenciones**: cada día se planifica sin leer el estado (semilla + fecha) y cada intención se materializa contra el estado con su propio PRNG | Determinismo robusto, reanudable en vivo ("pulso" de la app) y sin efecto mariposa cuando el usuario cambia algo |
| D5 | Construcción del estado en un **Web Worker** (respaldo: hilo principal por tramos). Presupuesto: < 1 s en un portátil de 2020, < 2,5 s en un celular medio | La interfaz nunca se congela; la pantalla de entrada se anima mientras tanto |
| D6 | **Almacenar hechos, derivar todo lo demás**: existencias, comisiones, segmentos, estados de pago, alertas, saldos y métricas son selectores memoizados. Solo dos agregados materializados (existencias y consecutivos), verificados por prueba | Nada puede descuadrar porque casi nada se guarda dos veces |
| D7 | Dinero en **COP enteros**; montos de origen USD/CNY en **centavos enteros** con su tasa y fecha. La conversión de moneda es **solo de visualización**, con la tasa vigente | Cero errores de coma flotante; editar la tasa cambia todas las cifras visibles |
| D8 | Fechas como **cadenas en hora de Bogotá sin zona** (`AAAA-MM-DD`, `AAAA-MM-DDTHH:mm:ss`) y un único reloj inyectable (`?hoy=` para QA) | La demo da el mismo resultado en Bogotá, Madrid o un servidor de CI en UTC |
| D9 | Escritorio bajo **`/panel`** (Inicio en `/panel/inicio`); `/` es la entrada; `/app`, `/tienda`, `/seguimiento/:numero` aparte. Rutas con claves legibles (referencia, número de importación, slug de empleado) | Enlaces profundos que se entienden y se pueden enviar; separación limpia de las cuatro superficies |
| D10 | PDF con **Figtree estática embebida** (TTF subconjunto, carga diferida) y normalizador de texto como red de seguridad | Tildes, ñ, ¿¡, `−` y espacio duro perfectos, con la tipografía de la marca |
| D11 | **Immer** solo en la ruta en vivo (copia estructural de las tablas tocadas) y mutación directa en la construcción masiva; el mismo código de manejador sirve a las dos | Velocidad en la generación y referencias nuevas para memoizar en la interfaz |
| D12 | Fase 2 entrega **todos** los comandos, selectores, reglas y el generador; los paquetes Sonnet solo construyen interfaz y selectores locales de su módulo | Los constructores no pueden romper la coherencia aunque quieran |

---

## 5. Arquitectura

### 5.1 Principios

1. **Un solo camino de escritura (D1).** La interfaz nunca modifica el estado directamente: llama a una acción (`acciones.registrarVenta(...)`) que arma un comando, lo valida, lo aplica con el manejador del dominio y lo anota en el registro. El generador produce los mismos comandos.
2. **Almacenar hechos, derivar lo demás (D6).** Una venta, un movimiento de inventario, una marcación o un abono son hechos. El stock, la comisión del mes, el segmento de un cliente, el estado "vencido" de una cuenta por pagar o el saldo de una caja se calculan.
3. **Capas con dependencias en una sola dirección** (5.3), verificadas por ESLint.
4. **Plantilla, no proyecto único.** Marca, locales, catálogo, elenco, parámetros y textos de negocio viven en `src/config/` y `src/seed/`. Cambiar de cliente = cambiar esas carpetas.
5. **Determinismo.** Misma semilla + mismo registro + misma fecha/hora ⇒ mismo estado, byte a byte. Lo verifica una prueba.
6. **Datos planos y serializables.** Sin clases, sin `Date`, sin funciones, sin `undefined` significativo dentro del estado. Solo objetos, arreglos, cadenas, números y booleanos (y `null`).

### 5.2 Stack definitivo

Lo decidido por el líder se mantiene. Añadidos (todos ligeros, justificados y a registrar en `DECISIONES.md`):

| Paquete | Uso | Justificación |
|---|---|---|
| `react@19`, `react-dom@19`, `typescript@5` (estricto) | Base | Decidido |
| `vite` (versión compatible con `vite-plugin-pwa` al instalar), `@vitejs/plugin-react` | Build | Decidido |
| `tailwindcss@4`, `@tailwindcss/vite` | Estilos con tokens en CSS (`src/styles/tokens.css`, sección 8.14) | Decidido |
| `react-router@7` (modo librería, `createBrowserRouter`, rutas `lazy`) | Rutas | Decidido |
| `zustand@5` | Stores (`datos`, `sesion`, `guia`) | Decidido |
| **`immer`** | Aplicar comandos en vivo con copia estructural | D11; evita escribir actualizaciones inmutables a mano en ~106 manejadores |
| `@tanstack/react-table`, **`@tanstack/react-virtual`** | Tablas; virtualización de listas largas (kardex, ventas) | 20.000 ventas |
| `recharts` | Gráficos, siempre vía `<GraficoBase>` (8.9.2) | Decidido |
| Radix primitives (`Dialog`, `AlertDialog`, `Popover`, `Tooltip`, `Select`, `Tabs`, `Checkbox`, `RadioGroup`, `Switch`, `Accordion`, `DropdownMenu`, `ToggleGroup`, `Toast`, `ScrollArea`) | Componentes accesibles | Decidido + lista de 8.7 |
| `cmdk`, `react-day-picker` (locale `es`), `@dnd-kit/core`, `@dnd-kit/utilities` | Combobox, fechas, arrastrar (kanban, turnos, calendario) | Pedidos por el sistema de diseño (8.7) |
| `lucide-react` | Íconos lineales vía `<Icono>` | 8.13 |
| `@fontsource-variable/figtree` | Tipografía autohospedada (sin depender de Google en ejecución; funciona sin conexión en la PWA) | Rendimiento y PWA |
| `jspdf`, `jspdf-autotable` | PDF (carga diferida) | Decidido |
| `exceljs` | .xlsx (carga diferida, ~250 KB gz) | Decidido |
| `jsbarcode`, `qrcode` | Códigos en pantalla; en PDF se dibujan como vectores (5.13) | Decidido |
| `date-fns@4` + `locale/es` | Nombres de mes/día, semana ISO | Decidido (con la regla de 5.9) |
| `vite-plugin-pwa`, `@vite-pwa/assets-generator` (dev) | PWA e íconos | Decidido |
| `clsx` | Composición de clases | Mínimo |
| `vitest`, `@testing-library/react`, `jsdom`, `@playwright/test` | Pruebas | Decidido |
| `eslint` (flat), `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `prettier` | Calidad | Decidido |

Prohibido añadir dependencias en los paquetes Sonnet. Si un constructor necesita una, la pide en su informe.

### 5.3 Capas y reglas de dependencia

```
            ┌──────────────────────────────────────────────────────────────┐
            │  src/config  (marca, locales, parámetros, permisos, textos)  │
            │  src/seed    (catálogo, elenco, proveedores, guiones)        │
            └───────────────┬──────────────────────────────────────────────┘
                            ▼
            ┌───────────────────────────────┐
            │ src/dominio  (puro, sin React)│  tipos · reglas · comandos · motor
            └───────┬───────────────┬───────┘
                    ▼               ▼
     ┌──────────────────────┐  ┌──────────────────────┐
     │ src/generador (puro) │  │ src/selectores (puro)│
     └──────────┬───────────┘  └──────────┬───────────┘
                ▼                         │
     ┌──────────────────────────────┐     │      ┌─────────────────────────┐
     │ src/estado (zustand, worker, │◄────┘      │ src/lib (formato, fechas│
     │ persistencia, acciones)      │            │ exportar, códigos)      │
     └──────────┬───────────────────┘            └───────────┬─────────────┘
                ▼                                            ▼
     ┌───────────────────────────────────────────────────────────────────┐
     │ src/ui (sistema de diseño) · src/ui/conectados (leen sesión/datos) │
     └──────────┬────────────────────────────────────────────────────────┘
                ▼
     ┌───────────────────────────────────────────────────────────────────┐
     │ src/layouts · src/modulos/* · src/movil · src/tienda ·            │
     │ src/seguimiento · src/app (router)                                 │
     └───────────────────────────────────────────────────────────────────┘
```

| Capa | Puede importar | No puede importar |
|---|---|---|
| `config`, `seed` | `dominio/tipos` (solo tipos) | Todo lo demás |
| `dominio` | `config`, `seed`, `date-fns`, `immer` (solo en `motor/vivo.ts`) | React, `estado`, `ui`, `lib/exportar`, cualquier API del navegador (`window`, `localStorage`, `Date.now`) |
| `generador` | `dominio`, `config`, `seed` | React, `estado`, `ui`, `selectores` |
| `selectores` | `dominio`, `config` | React, `estado`, `ui` |
| `lib` | `dominio/tipos`, `config`, librerías de exportación | React (salvo `lib/descargar.ts` que usa DOM), `estado` |
| `estado` | `dominio`, `generador`, `selectores`, `config`, `lib` | `ui`, `modulos` |
| `ui` (presentacional) | `lib`, `config`, `dominio/tipos` | `estado`, `selectores`, `modulos` |
| `ui/conectados` | `ui`, `estado`, `selectores`, `lib`, `config` | `modulos` |
| `layouts`, `app` | todo lo anterior + `modulos/*/publico.ts` | internos de un módulo |
| `modulos/X`, `movil`, `tienda`, `seguimiento` | todo lo anterior + `modulos/Y/publico.ts` **solo si Y es de una oleada anterior** | archivos internos de otro módulo |

Se hace cumplir con `no-restricted-imports` por carpeta en `eslint.config.js` (fase 2). `Date.now()` y `new Date()` sin argumentos están prohibidos fuera de `src/estado/reloj.ts` (regla `no-restricted-syntax`).

### 5.4 Árbol de carpetas

```
/
├─ index.html                      lang="es-CO", <meta viewport ... viewport-fit=cover>, noindex
├─ vercel.json                     reescrituras SPA + cabeceras (5.14)
├─ vite.config.ts                  alias @/, PWA, worker ES, manualChunks
├─ tsconfig.json · tsconfig.node.json
├─ eslint.config.js · .prettierrc · .editorconfig · .nvmrc (20)
├─ vitest.config.ts · playwright.config.ts
├─ package.json                    scripts: dev, build, preview, typecheck, lint, format, test, test:tz, test:e2e, medir
├─ public/
│  ├─ favicon.svg
│  ├─ robots.txt                   Disallow: /
│  └─ iconos/                      pwa-192.png, pwa-512.png, maskable-512.png, apple-touch-icon-180.png (generados)
├─ scripts/
│  ├─ generar-iconos.mjs           @vite-pwa/assets-generator a partir de public/iconos/fuente.svg
│  ├─ medir-generador.ts           tiempos por etapa y conteos de entidades
│  └─ informe-coherencia.ts        imprime los invariantes y los patrones P1–P20 con sus cifras
├─ e2e/
│  ├─ fixtures.ts                  página con ?hoy= fijo y almacenamiento limpio
│  ├─ paquetes/<paquete>.spec.ts   uno por paquete (dueño: el paquete)
│  ├─ flujos/                      los 8 flujos de integración (dueño: integrador, fase 4)
│  └─ capturas/                    recorrido de QA visual (dueño: qa-visual, fase 5)
├─ docs/
└─ src/
   ├─ main.tsx                     monta <Proveedores><RouterProvider/></Proveedores>, registra SW
   ├─ vite-env.d.ts
   ├─ styles/
   │  ├─ tokens.css                bloque 8.14 (Tailwind v4 @theme + variables)
   │  └─ global.css                @import "tailwindcss"; fuentes; base
   ├─ config/                      ── PLANTILLA: lo que cambia por cliente ──
   │  ├─ marca.ts                  nombre HALDEN, descriptor, NIT ficticio, colores, wordmark, firma KippiCore, contacto "Hablar con KippiCore"
   │  ├─ demo.ts                   semilla, clave de almacenamiento ("halden"), versión de generador, meses de historia (18)
   │  ├─ locales.ts                3 locales + bodega: tipo, horario, perfil de demanda, arriendo, metas base
   │  ├─ negocio.ts                IVA, abono mínimo de separado, días de separado, descuento máximo del vendedor, local de despacho web, comisión de datáfono
   │  ├─ nomina.ts                 parámetros 2026 (SMMLV, auxilio, jornada, recargos, porcentajes, exoneración) con marcas "por verificar"
   │  ├─ aduanas.ts                arancel, IVA de importación, seguro, días por estado (valores de ejemplo)
   │  ├─ monedas.ts                símbolos, decimales, tasas de ejemplo iniciales
   │  ├─ segmentacion.ts           umbrales VIP/frecuente/en riesgo/nuevo
   │  ├─ permisos.ts               matriz rol → módulos → acciones (5.8)
   │  ├─ navegacion.ts             menú lateral (orden, íconos, rutas, rol), pestañas de la app
   │  ├─ obligaciones.ts           calendario tributario y laboral (IVA bimestral, retención, PILA, matrícula mercantil)
   │  ├─ turnos.ts                 plantillas de turno por tipo de local (apertura, intermedio, cierre)
   │  ├─ estados.ts                mapa canónico estado → tono (8.7.10)
   │  └─ textos/
   │     ├─ mensajes.ts            plantillas de negocio: avisos de importación ES/EN, cobro, cumpleaños, nueva colección, separado
   │     ├─ guia.ts                bienvenida, "Prueba esto", pistas (textos de 01_estrategia 2.4–2.6)
   │     ├─ hallazgos.ts           redacción de los hallazgos automáticos (plantillas con huecos)
   │     ├─ glosario.ts            términos dobles (8.11.4)
   │     └─ notas.ts               notas legales fijas (nómina ilustrativa, contrato realidad, sin validez fiscal)
   ├─ seed/                        ── PLANTILLA: datos semilla ──
   │  ├─ catalogo.ts               ~85 referencias: nombre, categoría, línea, tipo de prenda, curva de tallas, colores, precio, costo FOB, fábrica, pesos de demanda
   │  ├─ colores.ts                paleta de producto (8.1.4)
   │  ├─ tallas.ts                 curvas y su distribución de demanda (P3, P4)
   │  ├─ nombres.ts                nombres y apellidos colombianos, barrios, dominios de correo genéricos
   │  ├─ elenco.ts                 dueño, 14 empleados, personas de rol, clientes con guion (Andrés Gutiérrez, Ricardo Peñuela)
   │  ├─ proveedores.ts            5 fábricas chinas + 9 proveedores locales; contactos de la cadena
   │  ├─ importaciones.ts          plan narrativo de pedidos (recibidos y en curso) relativo al ancla
   │  ├─ gastos.ts                 gastos fijos y recurrentes por local; publicidad estacional
   │  ├─ calendario.ts             campañas de temporada y citas guionadas
   │  ├─ estacionalidad.ts         índices por mes, día, hora, eventos y local (7.5)
   │  └─ escenarios-canales.ts     guiones WhatsApp/Instagram (dueño: paquete D5)
   ├─ dominio/                     ── PURO ──
   │  ├─ tipos/                    comunes, empresa, catalogo, inventario, ventas, caja, clientes, personal, nomina,
   │  │                            compras, finanzas, calendario, facturacion, mensajeria, sistema, estado,
   │  │                            comandos, eventos, index  (contenido: sección 6)
   │  ├─ reglas/                   funciones puras con pruebas al lado (*.test.ts)
   │  │  ├─ dinero.ts              redondeo, prorrateo por mayor residuo, conversión con tasa
   │  │  ├─ ventas.ts              totales de línea y venta, IVA incluido, descuentos, estado derivado, saldo
   │  │  ├─ costeo.ts              costo aterrizado y prorrateo por valor/cantidad
   │  │  ├─ comisiones.ts          porcentaje, escalonado, bono por meta del local
   │  │  ├─ nomina.ts              liquidación laboral y de prestación de servicios
   │  │  ├─ asistencia.ts          tardanzas, ausencias, horas ordinarias, extra, nocturnas, dominicales/festivas
   │  │  ├─ jornada.ts             horas semanales por turno, validación contra la jornada máxima
   │  │  ├─ festivos.ts            festivos de Colombia (Ley Emiliani + Pascua) por año
   │  │  ├─ segmentacion.ts        segmento de un cliente a partir de sus métricas
   │  │  ├─ importaciones.ts       máquina de 13 estados, avance de hitos, retraso
   │  │  ├─ cuentas.ts             estado derivado de cuentas por pagar y por cobrar
   │  │  ├─ ean13.ts               dígito de control, generación, codificación en 95 módulos
   │  │  ├─ cufe.ts                hash determinista de 96 hex (simulado)
   │  │  └─ texto.ts               slug, normalización para búsqueda (sin tildes), iniciales
   │  ├─ comandos/                 un archivo por agregado + registro
   │  │  ├─ tx.ts                  primitivas: insertar, actualizar, agregarALibro, moverInventario, siguienteConsecutivo
   │  │  ├─ catalogo.ts · inventario.ts · ventas.ts · caja.ts · clientes.ts · personal.ts · nomina.ts
   │  │  ├─ compras.ts (proveedores, contactos, importaciones) · finanzas.ts · gastos.ts · calendario.ts
   │  │  ├─ facturacion.ts · mensajeria.ts · configuracion.ts · aprobaciones.ts
   │  │  └─ registro.ts            mapa tipo de comando → manejador (exhaustivo, verificado por TS)
   │  ├─ motor/
   │  │  ├─ construir.ts           construcción por días con fusión de intenciones y comandos (5.6.4)
   │  │  ├─ aplicar.ts             aplicarComando(estado, sobre, modo) → eventos | ErrorDominio
   │  │  ├─ vivo.ts                aplicación con Immer (produce) para la ruta en vivo
   │  │  ├─ estado-inicial.ts      estado vacío + config + seed → EstadoDominio inicial
   │  │  └─ ids.ts                 nuevoId(prefijo) y derivación de IDs hijos
   │  └─ errores.ts                ErrorDominio { codigo, mensaje (español, para el usuario), campo? }
   ├─ generador/                   ── PURO ──
   │  ├─ prng.ts                   cyrb128 + sfc32; entero, decimal, normal, poisson, elegirPonderado, barajar
   │  ├─ calendario-comercial.ts   índice de demanda por (local, día, hora); festivos; quincenas; eventos
   │  ├─ plan.ts                   plan global: ventana, importaciones, contratos, metas, cambios de tasa, narrativa
   │  ├─ planificar-dia.ts         intenciones del día (sin leer el estado)
   │  ├─ materializar/             una función por tipo de intención → comandos
   │  │  ├─ ventas.ts · devoluciones.ts · separados.ts · caja.ts · inventario.ts · importaciones.ts
   │  │  ├─ personal.ts (turnos, marcaciones, novedades) · nomina.ts · finanzas.ts (consignaciones, datáfono, CxP, retiros)
   │  │  ├─ gastos.ts · facturacion.ts · clientes.ts · narrativa.ts (cierres narrativos 7.11)
   │  ├─ catalogo.ts               variantes, SKU y EAN-13 a partir de seed/catalogo
   │  ├─ personas.ts               clientes generados (nombres, celulares 3XX, tallas latentes, frecuencia)
   │  ├─ tasas.ts                  historial de tasas de ejemplo
   │  └─ index.ts                  exporta construirEstado y planGlobal
   ├─ selectores/                  ── PURO, memoizado ──  (catálogo en 6.23)
   │  ├─ memo.ts                   crearSelector(deps, fn) con caché por referencia + parámetros
   │  ├─ base.ts                   listas activas, mapas por id, índices (ventas por cliente, por vendedor, por día)
   │  ├─ catalogo.ts · inventario.ts · ventas.ts · caja.ts · clientes.ts · personal.ts · nomina.ts
   │  ├─ importaciones.ts · proveedores.ts · finanzas.ts · gastos.ts · calendario.ts · alertas.ts
   │  ├─ inicio.ts · analisis.ts (hechos, pivote, mapa de calor) · hallazgos.ts · efectos.ts (W1)
   │  ├─ narrativa.ts              IDs de entidades narrativas (variante Oxford M, importación en puerto, Sebastián…)
   │  └─ index.ts
   ├─ estado/
   │  ├─ reloj.ts                  ahoraBogota(), hoyBogota(), override ?hoy= (único lugar con Date.now)
   │  ├─ datos.ts                  store `useDatos`: estado, fase, progreso, ejecutar(), avanzarReloj(), restaurar()
   │  ├─ sesion.ts                 store `useSesion`: rol, local, moneda, tema, última ruta (persistido)
   │  ├─ guia.ts                   store `useGuia`: bienvenida, "Prueba esto", pistas vistas (persistido)
   │  ├─ acciones.ts               useAcciones(): una función tipada por comando (arma el sobre, IDs, marca de agua)
   │  ├─ hooks.ts                  useSel, useFiltroLocal, useMoneda, useDinero, usePuede, useUsuarioActivo
   │  ├─ eventos.ts                bus de eventos de dominio y de interfaz (suscribir/emitir)
   │  ├─ persistencia.ts           registro en localStorage, modo memoria, cuota, versiones
   │  ├─ sincronizacion.ts         evento `storage` entre pestañas y marcos
   │  └─ worker/
   │     ├─ motor.worker.ts        recibe {semilla, ancla, ahora, registro} → devuelve estado y progreso
   │     └─ cliente.ts             crea el worker; respaldo en hilo principal por tramos
   ├─ lib/
   │  ├─ formato.ts                dinero, cifraCorta, número, porcentaje, variación, fechas, horas, celular, cédula, NIT (8.11.3)
   │  ├─ fechas.ts                 aritmética sobre FechaISO (díaN), semanas ISO, rangos, nombres
   │  ├─ moneda.ts                 convertirParaMostrar(cop, moneda, tasa)
   │  ├─ enlaces.ts                wa.me y mailto: con texto codificado
   │  ├─ descargar.ts              descargarBlob(blob, nombre)
   │  ├─ codigos/barras.ts         EAN-13 a SVG (pantalla) y a rectángulos (PDF)
   │  ├─ codigos/qr.ts             QR a SVG (pantalla) y a módulos (PDF)
   │  └─ exportar/
   │     ├─ pdf.ts                 crearDocumentoPdf(): encabezado HALDEN, filtros, pie KippiCore, tablas, marca de agua
   │     ├─ excel.ts               crearLibroExcel(): encabezados, anchos, formatos, totales
   │     ├─ fuentes.ts             carga diferida de Figtree TTF (Regular, Bold, Black) al VFS de jsPDF
   │     ├─ texto-pdf.ts           normalizador de caracteres
   │     └─ fuentes/               Figtree-Regular.ttf, Figtree-Bold.ttf, Figtree-Black.ttf, OFL.txt
   ├─ ui/                          sistema de diseño (8.7); nombres de componente según la sección 8
   │  ├─ primitivos/               Button, Input, Select, Combobox, Checkbox, Switch, Radio, DatePicker, Tabs, Badge,
   │  │                            Card, Kpi, Table, Toolbar, Dialog, Drawer, Toast, Tooltip, Popover, EmptyState,
   │  │                            Skeleton, Timeline, Kanban, Stepper, Avatar, Chip, ConfirmarEliminacion, Icono
   │  ├─ graficos/                 GraficoBase y variantes (barras, líneas, apiladas, cascada, mapa de calor, sparkline)
   │  ├─ prenda/                   <Prenda> e ilustraciones SVG por tipo (8.8)
   │  ├─ codigos/                  <CodigoBarras>, <CodigoQR>
   │  ├─ marcos/                   <MarcoTelefono>, <MarcoNavegador>
   │  ├─ texto/                    <Termino>, <NotaLegal>, <Cifra> (AnimatedNumber)
   │  └─ conectados/               <Dinero>, <Fecha>, <SelectorLocal>, <SelectorMoneda>, <SelectorRol>, <Pista>,
   │                               <RequiereRol>, <SoloRol>, <MatrizExistencias>, <BuscadorProducto>, <BuscadorCliente>
   ├─ layouts/
   │  ├─ escritorio/               LayoutEscritorio, BarraLateral, BarraSuperior, FranjaRol, EncabezadoPagina, AvisoPantallaPequena
   │  ├─ movil/                    LayoutMovil, BarraPestanas, EncabezadoMovil
   │  ├─ tienda/                   LayoutTienda
   │  └─ portal/                   LayoutPortal
   ├─ app/
   │  ├─ router.tsx                createBrowserRouter con todas las rutas (5.5), lazy con reintento
   │  ├─ rutas.ts                  constructores de URL tipados: rutas.producto(ref), rutas.importacion(num)…
   │  ├─ Proveedores.tsx           Tooltip/Toast providers, tema, marca → variables CSS
   │  ├─ CargaDatos.tsx            pantalla de progreso mientras el worker construye
   │  ├─ ErrorRuta.tsx · NoEncontrada.tsx
   │  └─ lazy.ts                   lazyConReintento() (recarga una vez si falla un chunk tras un despliegue)
   ├─ modulos/                     una carpeta = un paquete dueño (sección 9)
   │  ├─ entrada/ · guia/ · inicio/ · pos/ · ventas/ · inventario/ · importaciones/ · proveedores/ · pagos/
   │  ├─ gastos/ · personal/ · turnos/ · clientes/ · calendario/ · analisis/ · facturacion/ · canales/
   │  ├─ reportes/ · configuracion/
   │  └─ <modulo>/
   │     ├─ paginas/               componentes de ruta (export default para lazy)
   │     ├─ componentes/           internos del módulo
   │     ├─ selectores.ts          selectores locales que componen los compartidos (opcional)
   │     ├─ textos.ts              copy de interfaz propio del módulo (opcional)
   │     └─ publico.ts             lo único que otros módulos pueden importar
   ├─ movil/                       app del dueño (/app): paginas/, componentes/, compartir/ (modal QR), publico.ts
   ├─ tienda/                      tienda web (/tienda): paginas/, componentes/, carrito.ts (estado local de la tienda)
   └─ seguimiento/                 portal del agente de aduanas (/seguimiento/:numero)
```

### 5.5 Rutas

Todas las rutas se registran en fase 2 en `src/app/router.tsx` con `lazy` hacia `paginas/` del módulo dueño (en fase 2 cada página es un esqueleto que el paquete reemplaza). Los parámetros usan **claves legibles e inmutables**: referencia del producto (`HL-CAM-0142`), número de importación (`IMP-2026-07`), slug del empleado (`sebastian-cardenas`); el resto usa el `id`. Las pestañas de una ficha son subrutas (enlace profundo a "Costo aterrizado" o "Costo para el negocio"). Los filtros de listas viajan en la query (`?desde=&hasta=&local=`) cuando el paquete lo indica.

Roles: **D** = dueño, **V** = vendedor, **B** = bodega. "—" = no la ve (redirige a su inicio con un aviso "Esta sección es solo para el dueño").

| Ruta | Pantalla | Paquete | Roles |
|---|---|---|---|
| `/` | Entrada: dos puertas, QR, progreso de carga de datos | E2 | todos |
| `/panel` | Redirige al inicio del rol (D → `/panel/inicio`, V → `/panel/mi-dia`, B → `/panel/inventario`) | F2 | D V B |
| `/panel/inicio` | Inicio del dueño (7.1) | D1 | D |
| `/panel/mi-dia` | Inicio del vendedor: ventas de hoy, comisión, meta del local, marcar entrada | C2 | V |
| `/panel/pos` | Punto de venta | A1 | D V |
| `/panel/pos/caja` | Apertura, egresos y cierre de caja | A1 | D V |
| `/panel/ventas` | Lista con filtros y totales | A3 | D V (V: solo las suyas, sin editar ni anular) |
| `/panel/ventas/:ventaId` | Detalle tipo recibo, edición, anulación, abonos | A3 | D V |
| `/panel/ventas/:ventaId/devolucion` | Cambio o devolución | A3 | D V |
| `/panel/inventario` | Catálogo (tabla / tarjetas) | A2 | D V(lectura) B |
| `/panel/inventario/nuevo` | Crear producto | A2 | D B |
| `/panel/inventario/:referencia` | Ficha: resumen y matriz talla × color × local | A2 | D V(lectura, sin costos) B |
| `/panel/inventario/:referencia/:pestana` | `variantes` · `kardex` · `ventas` · `rentabilidad` (D) · `editar` | A2 | según pestaña |
| `/panel/inventario/movimientos` | Kardex general y ajustes | A2 | D B |
| `/panel/inventario/traslados` · `/:trasladoId` | Traslados con estados | A2 | D B (V: solicitar desde la ficha) |
| `/panel/inventario/conteos` · `/:conteoId` | Conteo físico | A2 | D B |
| `/panel/inventario/recepcion` · `?importacion=IMP-…` | Recepción de importación y distribución por local | A2 | D B |
| `/panel/inventario/etiquetas` | Hoja de etiquetas PDF | A2 | D B |
| `/panel/inventario/valorizacion` | Valorización por local | A2 | D |
| `/panel/importaciones` | Tablero kanban · lista · ruta (`?vista=`) | B1 | D B(lectura) |
| `/panel/importaciones/nueva` | Crear pedido | B1 | D |
| `/panel/importaciones/contactos` | Contactos de la cadena | B1 | D |
| `/panel/importaciones/:numero` | Resumen y línea de tiempo | B1 | D B(lectura) |
| `/panel/importaciones/:numero/:pestana` | `lineas` · `costo-aterrizado` · `pagos` · `documentos` · `contactos` · `mensajes` | B1 | D |
| `/panel/proveedores` · `/comparativo` · `/:proveedorId` | Directorio, comparativo de fábricas, ficha | B2 | D |
| `/panel/pagos` | Resumen "Lo que debo y me deben" | B3 | D |
| `/panel/pagos/por-pagar` · `/por-cobrar` · `/cuentas` · `/cuentas/:cuentaId` · `/conciliacion` · `/flujo` | Subvistas de pagos | B3 | D |
| `/panel/gastos` · `/recurrentes` · `/resultados` · `/equilibrio` | Gastos, plantillas, estado de resultados, punto de equilibrio | B4 | D |
| `/panel/personal` | Empleados (con costo por local) | C1 | D |
| `/panel/personal/nuevo` · `/panel/personal/:slug` · `/:slug/:pestana` | Ficha: `datos` · `contrato` · `costo` · `comisiones` · `desprendibles` | C1 | D |
| `/panel/personal/nomina` · `/nomina/:liquidacionId` | Periodo en curso (vista previa, aprobar) e historial | C1 | D |
| `/panel/personal/comparativo` | ¿Cuánto me cuesta en cada modalidad? | C1 | D |
| `/panel/personal/comisiones` | Comisiones por vendedor y periodo | C1 | D |
| `/panel/mis-comisiones` | Comisiones del vendedor activo | C1 | V |
| `/panel/personal/turnos` | Cuadrícula semanal por local (arrastrar y soltar) | C2 | D |
| `/panel/personal/asistencia` | Reporte de asistencia | C2 | D |
| `/panel/personal/novedades` | Incapacidades, vacaciones, licencias, permisos | C2 | D |
| `/panel/mi-turno` | Marcación, mi horario, mi asistencia | C2 | V B |
| `/panel/clientes` · `/cumpleanos` · `/:clienteId` | Lista con segmentos, cumpleaños, ficha | A4 | D V (V: sus clientes) |
| `/panel/calendario` | Mes · semana · día (`?vista=&fecha=`) | C3 | D |
| `/panel/analisis` · `/tabla-dinamica` · `/productos` · `/clientes` · `/locales` | Tablero, pivote, productos/tallas/colores, clientes, locales y vendedores | D2 | D |
| `/panel/facturacion` · `/:facturaId` · `/notas-credito/:notaId` | Facturas simuladas | D3 | D (V: ver la de su venta) |
| `/panel/canales` · `/whatsapp` · `/instagram` · `/web` | Vitrina de canales | D5 | D |
| `/panel/reportes` | Centro de reportes | D4 | D (B: inventario, kardex) |
| `/panel/configuracion` · `/empresa` · `/locales` · `/monedas` · `/nomina` · `/impuestos` · `/usuarios` · `/datos` | Configuración | E3 | D |
| `/app` | Hoy | E1 | dueño siempre (no depende del selector de rol) |
| `/app/ventas` · `/app/inventario` · `/app/inventario/:referencia` · `/app/agenda` · `/app/mas` | Pestañas | E1 | — |
| `/app/mas/aprobar` · `/importaciones` · `/importaciones/:numero` · `/nomina` · `/pagos` · `/alertas` · `/moneda` | "Más" | E1 | — |
| `/tienda` · `/tienda/:categoria` · `/tienda/producto/:slug` · `/tienda/bolsa` · `/tienda/pago` · `/tienda/pedido/:ventaId` | Tienda web HALDEN | D6 | sin rol |
| `/seguimiento/:numero` | Portal del agente de aduanas (solo lectura + formulario simulado) | B1 | sin rol |
| `*` | Página no encontrada, diseñada, con enlaces a `/` y `/panel/inicio` | F2 | — |

Las subrutas estáticas (`nuevo`, `movimientos`, `nomina`, `turnos`…) tienen prioridad sobre las dinámicas en React Router; además las referencias tienen formato `HL-XXX-NNNN` y los slugs de empleado evitan las palabras reservadas de esas subrutas (si chocan, se les agrega `-2`).

Las rutas indicativas de `01_estrategia.md` se traducen así: `/inicio` → `/panel/inicio`; `/pos` → `/panel/pos`; `/inventario/HL-CAM-0142` → `/panel/inventario/HL-CAM-0142`; `/importaciones/IMP-2026-07` → `/panel/importaciones/IMP-2026-07`; `/pagos/flujo` → `/panel/pagos/flujo`; `/personal/sebastian-cardenas` → `/panel/personal/sebastian-cardenas/costo`; `/canales/whatsapp` → `/panel/canales/whatsapp`; `/analisis/tabla-dinamica` → `/panel/analisis/tabla-dinamica`; `/reportes` → `/panel/reportes`. Los enlaces de la guía y de las alertas **nunca** escriben números a mano: resuelven la entidad con `selNarrativa()` (6.23) y construyen la URL con `rutas.ts`, porque el número de la importación "en puerto" depende del año en curso.

### 5.6 Estado, persistencia y modo memoria

#### 5.6.1 La decisión

Se evaluaron las dos opciones que planteó el líder:

| Criterio | A. Base regenerada + registro de comandos (elegida) | B. IndexedDB con el estado completo |
|---|---|---|
| Tamaño persistido | 1–50 KB típicos (un cliente hace 20–200 acciones) | 15–25 MB (≈ 150.000 objetos) |
| Escritura por acción | Agregar una entrada (< 1 ms) | Escribir tablas tocadas; con 20.000 ventas, 20–200 ms o un esquema incremental complejo |
| Cliente vuelve al día siguiente | La base se regenera hasta "ahora"; sus comandos se reaplican en su lugar; el negocio "siguió vivo" | Hay que simular los días faltantes sobre el estado guardado (se necesita el mismo motor de todas formas) |
| Corregimos el generador y redesplegamos | El cliente recibe la base corregida y conserva sus cambios | El cliente se queda con los datos viejos y defectuosos para siempre |
| "Restaurar datos" | Borrar el registro y reconstruir | Borrar la base y regenerar (mismo costo) |
| Modo memoria (sin almacenamiento) | Igual, el registro vive en memoria | Igual |
| Sincronizar pestañas y el marco de teléfono | Pasar entradas nuevas del registro (pequeñas) | Recargar o difundir estados enormes |
| Riesgo principal | Que un comando no se pueda reaplicar sobre una base distinta | Corrupción, cuota, migraciones de esquema |
| Costo en cada carga | Generar 18 meses (< 1 s en worker) | Leer 20 MB de IndexedDB (300–800 ms) + deserializar |

**Se elige A.** Su riesgo principal se elimina con dos mecanismos que se describen a continuación: el **ancla de fecha** (5.6.3) y la **marca de agua** de cada comando (5.6.4). Lo que se persiste es pequeño, a prueba de versiones y trivial de restaurar.

#### 5.6.2 Modelo

```
estado = construir(semilla, ancla, ahora, registro)
       = estadoInicial(config, seed)
         ⊕ por cada día d de la ventana:
             intenciones generadas del día d (hasta "ahora")
             intercaladas con los comandos del usuario según su marca de agua
```

- **Base determinista**: lo que produce el generador para la semilla y la ventana.
- **Registro**: lista ordenada de comandos del usuario (`EntradaRegistro`, 6.17), cada uno con su sello de tiempo real, su marca de agua y los IDs que creó.
- El **mismo manejador** aplica un comando del usuario y uno del generador (D1).

#### 5.6.3 Ancla de fecha

- **Sin registro** (cliente que solo mira): `ancla = hoy`. La ventana es `[hoy − 18 meses, ahora]`. Cada visita ve el negocio al día; las importaciones en curso, los pagos "del viernes" y los separados "que vencen esta semana" se recalculan relativos a hoy.
- **Con registro**: `ancla` = el día en que se emitió el **primer** comando. Se guarda junto al registro. La ventana es `[ancla − 18 meses, ahora]`: la historia que el usuario ya vio no cambia; los días posteriores al ancla se **simulan encima** (las ventas siguen, la importación en tránsito llega en su fecha, se paga la quincena). Si el usuario cambió algo a mano, el generador lo respeta (por ejemplo, una importación con `controlManual: true` deja de avanzar sola).
- Si `hoy − ancla > 120 días`, Configuración → Datos muestra una sugerencia discreta: "Tu demo conserva cambios de hace más de 4 meses. ¿Empezar de nuevo con datos frescos?". Nunca se fuerza.
- El ancla es un día (`FechaISO`), no un instante: un computador y un celular abiertos el mismo día parten de la misma base.

#### 5.6.4 Algoritmo de construcción (marca de agua)

Cada comando del usuario guarda `marcaAgua` = el instante hasta el cual estaba generada la base cuando lo emitió (`meta.generadoHasta` de esa sesión). Al reconstruir, un comando se aplica **después** de todas las intenciones generadas con `ts ≤ marcaAgua` y **antes** de las que tienen `ts > marcaAgua`. Así el estado que ve el comando al reaplicarse es idéntico al que vio cuando el usuario lo emitió (mismas intenciones previas, mismos comandos previos): **todo comando del usuario se reaplica exactamente**. Las intenciones posteriores pasan por las guardas del generador (nunca venden lo que no hay).

```ts
function* construir(e: EntradaConstruccion): Generator<Progreso, EstadoDominio> {
  const estado = estadoInicial(e.config, e.seed, e.semilla, e.ancla);
  const plan = planGlobal(e.semilla, e.ancla, e.config, e.seed);           // puro y barato
  const cola = ordenarRegistro(e.registro);                                 // por (marcaAgua, ts, seq)
  for (const dia of diasDeVentana(plan.inicio, fechaDe(e.ahora))) {
    for (const intencion of planificarDia(plan, dia)) {                    // ordenadas por ts
      if (intencion.ts > e.ahora) break;
      while (cola.length && cola[0].marcaAgua < intencion.ts) aplicarUsuario(estado, cola.shift()!);
      for (const sobre of materializar(intencion, estado, plan)) aplicarGenerado(estado, sobre);
    }
    yield { dia, porcentaje: ... };                                         // el cliente del worker reporta progreso
  }
  while (cola.length) aplicarUsuario(estado, cola.shift()!);
  estado.meta.generadoHasta = e.ahora;
  return estado;
}
```

- `aplicarGenerado`: si el manejador lanza `ErrorDominio`, se omite y se cuenta en `meta.omitidosGenerador` (la prueba exige 0 con el registro vacío).
- `aplicarUsuario`: si lanza (solo puede ocurrir tras un cambio incompatible del generador), se omite, se anota en `meta.omitidosUsuario` y la interfaz muestra un aviso discreto en Configuración → Datos ("2 cambios de tu sesión anterior no se pudieron conservar tras una actualización de la demo").
- Los IDs de lo que crea un comando del usuario viajan **dentro** del comando (generados al emitirlo), de modo que la reaplicación produce los mismos IDs. Los IDs hijos se derivan del padre (`${ventaId}-l1`, `${ventaId}-p1`, `${ventaId}-m1`).
- Los **consecutivos** (número de venta `V-000482`, factura `HAL-FE-1043`) se asignan al aplicar desde `meta.consecutivos`. Con la marca de agua, una venta del usuario puede quedar con un número menor que una venta generada unos minutos anterior en el reloj; es aceptable y no rompe ninguna suma.

#### 5.6.5 Almacenamiento

| Clave (`kc:<clave-demo>:v1:*`, clave-demo = `halden`) | Contenido | Tamaño |
|---|---|---|
| `kc:halden:v1:registro` | `{ version: 1, versionGenerador, semilla, ancla, entradas: EntradaRegistro[] }` | 1–500 KB |
| `kc:halden:v1:sesion` | rol, local, moneda, tema, última ruta visitada | < 1 KB |
| `kc:halden:v1:guia` | bienvenida vista, ítems de "Prueba esto", pistas vistas, pistas ocultas | < 2 KB |

- Se escribe el registro completo tras cada comando (es pequeño). Antes de escribir se relee y se **fusiona por `id` de entrada** (otra pestaña pudo agregar entradas).
- Si el registro supera 3 MB, se avisa en Configuración → Datos; si `setItem` lanza por cuota, se pasa a modo memoria (5.6.7) con un aviso.
- `sessionStorage` guarda solo el override de QA `?hoy=` para que sobreviva a la navegación interna.

#### 5.6.6 Ciclo de vida de un comando en vivo

```
UI → acciones.registrarVenta(datos)
   → arma SobreComando { id, ts: ahora(), marcaAgua: meta.generadoHasta, usuarioId, rol, comando }
   → useDatos.ejecutar(sobre)
        1. validar + aplicar con Immer: produce(estado, borrador => aplicarComando(borrador, sobre, 'vivo'))
           (si lanza ErrorDominio → { ok: false, error } y nada cambia)
        2. set({ estado: nuevo, anterior: estadoAntes })
        3. registro.push(entrada) → persistencia.guardar() → sincronizacion.difundir()
        4. bus.emitir(eventos)          (toasts, "Prueba esto", panel de efectos)
   ← { ok: true, eventos, antes, despues }
```

- El resultado incluye `antes` y `despues` para que el POS calcule el panel "Lo que acaba de pasar" (W1) con `selEfectosVenta(antes, despues, ventaId)`: inventario 5 → 4, ventas de hoy, comisión del vendedor, compras del cliente, caja. Todos son selectores evaluados sobre los dos estados: exactos por construcción.
- Con Immer, solo las tablas tocadas cambian de referencia; los selectores memoizados de las demás no se recalculan.

#### 5.6.7 Modo memoria

- Al arrancar, `persistencia.disponible()` intenta `setItem/removeItem` de una clave de prueba dentro de `try/catch`. Si falla (Safari con bloqueo total, iframes de terceros, cuota), `modo = 'memoria'`.
- En modo memoria todo funciona igual; el registro vive en el store. Un indicador discreto en Configuración → Datos y en el menú "?" dice: "Tus cambios se conservan mientras esta pestaña esté abierta." Nunca un error ni un modal.
- Los stores `sesion` y `guia` usan el mismo adaptador (con respaldo en memoria).

#### 5.6.8 Sincronización entre pestañas y marcos

- El portal `/seguimiento/:numero` en otra pestaña, la vista previa del teléfono (`<iframe src="/app?marco=1">`) y la vista web de la tienda (`<iframe src="/tienda">`) son el mismo origen: comparten `localStorage`.
- `sincronizacion.ts` escucha `window.addEventListener('storage')` sobre la clave del registro. Al recibir un cambio: se calculan las entradas nuevas (por `id`). Si todas van **después** de la última aplicada (caso normal), se aplican en vivo con `ejecutar` sin volver a escribir. Si alguna se intercala antes (dos pestañas escribieron a la vez) o el registro quedó vacío (restauración en otra pestaña), se **reconstruye** en el worker (≈ 1 s, con el estado anterior visible mientras tanto).
- Así se cumple W3 ("la actualización desde el portal llega a la otra pestaña en vivo") y W10 ("el marco de teléfono muestra la venta que acabas de registrar").
- Cada marco o pestaña construye su propio estado (≈ 1 s y ~60 MB). Aceptable; si el QA mide problemas de memoria, la mejora es que el marco reciba el estado del padre por `postMessage`.

#### 5.6.9 Restaurar datos

`useDatos.restaurar()`: borra `kc:halden:v1:registro` (y el ancla), reconstruye con `ancla = hoy`, devuelve la sesión a dueño · todos los locales · COP y difunde el cambio a las demás pestañas. **No** borra el progreso de la guía (el cliente no tiene por qué repetir la bienvenida). La prueba de restauración compara el estado resultante con una construcción limpia: deben ser idénticos.

#### 5.6.10 Versionado

- `VERSION_REGISTRO` (formato de las entradas): si cambia, se intenta una migración registrada; si no existe, se descarta el registro con un aviso.
- `VERSION_GENERADOR` (en `config/demo.ts`): se sube en cada cambio del generador que altere IDs o la historia. Si el registro fue creado con otra versión, la reaplicación es **tolerante** (se omiten los comandos que ya no validan, con el aviso de 5.6.4). Los comandos que crean entidades nuevas casi siempre sobreviven.

#### 5.6.11 Pulso en vivo (app del dueño)

`useDatos.avanzarReloj(nuevoAhora)` materializa en la ruta en vivo las intenciones del plan con `ts ∈ (generadoHasta, nuevoAhora]` y actualiza `generadoHasta`. Es exactamente lo que haría una reconstrucción, de modo que la coherencia se conserva y los comandos posteriores llevan la nueva marca de agua. La app lo llama cada 5 minutos con la pestaña visible (y al volver a ella); si entraron ventas, muestra un aviso sutil ("Nueva venta en Zona Rosa · $ 289.900"), máximo uno cada 5 minutos. En el escritorio no se usa (cambiar existencias bajo el POS confunde). Se desactiva desde Configuración → Datos.

#### 5.6.12 Presupuesto de rendimiento

| Etapa | Objetivo (portátil 2020) | Celular medio | Cómo |
|---|---|---|---|
| Primer pintado de `/` | < 1,0 s | < 1,8 s | Entrada sin datos; chunk inicial < 180 KB gz |
| Construcción del estado (worker) | < 1,0 s | < 2,5 s | Mutación directa, sin Immer, sin copias; PRNG sfc32; ~150.000 objetos |
| Transferencia worker → hilo principal | < 200 ms | < 400 ms | `postMessage` con clonación estructurada de objetos planos |
| Interactivo en `/panel/inicio` | < 3,0 s total | < 4,5 s | La entrada ya construyó mientras el cliente leía |
| Aplicar un comando en vivo | < 30 ms | < 60 ms | Immer sobre tablas tocadas |
| Recalcular selectores tras una venta | < 50 ms | < 120 ms | Memo por referencia de tabla; hechos de venta en una pasada |

El worker se lanza **en cuanto carga la entrada** (`/`), así el cliente lee la portada mientras se generan los 18 meses. `CargaDatos` muestra "Preparando 18 meses de historia de HALDEN… 64 %" solo si alguien entra directo por un enlace profundo.

### 5.7 API de estado para los constructores

Los constructores **solo** usan estas puertas (detalle en `docs/CONTRATOS.md`, fase 2):

```ts
// Lectura
const ventasMes = useSel(selResumenVentas, { rango, localId });   // selector memoizado + parámetros
const local = useFiltroLocal();          // Id del local o 'todos' (fijo para el vendedor)
const { moneda, tasa } = useMoneda();    // moneda de visualización y tasa vigente
const puede = usePuede();                // puede('venta.anular') → boolean
const usuario = useUsuarioActivo();      // persona del rol activo

// Escritura
const acciones = useAcciones();
const r = acciones.registrarVenta({ localId, vendedorId, ... });  // → ResultadoComando
if (!r.ok) mostrarError(r.error.mensaje, r.error.campo);

// Eventos
useEvento('VentaRegistrada', (e) => ...);
emitirUI('pdf_generado');                 // eventos de interfaz para la guía (6.18)

// Presentación de cifras (nunca formatear a mano)
<Dinero cop={valor} />  <Dinero cop={valor} corta />  <Fecha valor={f} formato="larga" />
```

- Nombres de las acciones: cada comando `objeto.verbo` se expone como `verboObjeto` en camelCase (`venta.registrar` → `registrarVenta`, `importacion.cambiarEstado` → `cambiarEstadoImportacion`, `aprobacion.resolver` → `resolverAprobacion`, `cxp.editar` → `editarCuentaPorPagar`, `evento.crear` → `crearEvento`). La tabla exacta vive en `docs/CONTRATOS.md`. Las acciones generan los IDs, el `ts`, la marca de agua y el usuario: el componente solo pasa los datos de negocio.
- Ningún componente lee `useDatos.getState().estado` directamente salvo `ui/conectados` y `estado/hooks.ts`.
- Los selectores **no** leen el contexto global: reciben `localId`, rango y moneda como parámetros. Los hooks inyectan el contexto.

### 5.8 Contexto global: local, moneda y rol

| Contexto | Dónde vive | Cómo se aplica |
|---|---|---|
| **Local** | `useSesion.localId: Id \| 'todos'` | `useFiltroLocal()` lo entrega a los selectores. Para el vendedor devuelve siempre su local (el selector se muestra bloqueado con candado y tooltip). La bodega aparece como opción solo en vistas de inventario. Los gastos "generales" (sin local) se muestran en "Todos" y, con un local elegido, solo si se activa "Incluir gastos generales prorrateados" |
| **Moneda** | `useSesion.moneda: 'COP' \| 'USD' \| 'CNY'` | Todas las cifras pasan por `<Dinero>` o `useDinero()`; los ejes por `cifraCorta`. Convierte **COP → moneda** con la tasa vigente (`selTasaVigente(moneda, hoy)`). Junto al selector: "Tasa de ejemplo: US$ 1 = $ 4.050 · Editar". Los montos que nacieron en USD/CNY (FOB, pagos a fábricas) muestran además su cifra original. PDF y Excel usan la moneda activa y lo dicen en el encabezado |
| **Rol** | `useSesion.rol` + persona en `config/permisos.ts` | Cambia la barra lateral (`navegacion.ts` filtrado por rol), escribe `data-rol` en `<html>` (8.14), muestra la franja de rol, guarda rutas con `<RequiereRol>`, oculta controles con `<SoloRol>` / `usePuede()`. Al cambiar a un rol que no ve la ruta actual, navega a su inicio |

Matriz de permisos (resumen; la completa vive en `config/permisos.ts`, una clave por acción de 6.17 y 6.21):

| Acción / dato | Dueño | Vendedor | Bodega |
|---|---|---|---|
| Ver costos, márgenes, salarios de otros, pagos, gastos, nómina | Sí | **Nunca** (ni en tooltips ni exportes) | No |
| Registrar venta, separado, abono, devolución | Sí | Sí (su local) | No |
| Descuento por encima del máximo del vendedor (15 %) | Sí | Solicita aprobación | — |
| Editar o anular venta | Sí | No | No |
| Crear/editar producto, precios | Sí | No | Crea y edita datos y stock mínimo; no precios |
| Traslados, conteos, recepción, ajustes | Sí | Solicitar traslado | Sí |
| Clientes | Todos | Los suyos (crear/editar) | No |
| Marcación | — | Sí | Sí |
| Configuración, restaurar datos | Sí | No ("?" → restaurar sí, por ser la red de seguridad) | No |

La app `/app` es siempre del dueño, sin importar el rol activo en el escritorio.

### 5.9 Fechas, zona horaria y reloj

- Zona única: **America/Bogota (UTC−5, sin horario de verano)**. Tipos: `FechaISO` (`2026-09-30`), `FechaHoraISO` (`2026-09-30T15:42:10`), `HoraHHmm` (`15:42`), `MesISO` (`2026-09`). Se comparan como cadenas (orden lexicográfico = orden temporal).
- `estado/reloj.ts` es el **único** lugar que lee la hora del sistema: `ahoraBogota()` usa `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', hourCycle: 'h23', ... })` y arma la cadena. Override para QA y para Miguel: `?hoy=2026-12-19` o `?hoy=2026-12-19T16:30` (se guarda en `sessionStorage`).
- El dominio, el generador y los selectores reciben `ahora`/`hoy` como parámetro. Nunca llaman al reloj.
- `lib/fechas.ts` hace aritmética con el **número de día** (`diaN = Date.UTC(a, m−1, d) / 86 400 000`) y, cuando usa `date-fns`, construye fechas a **mediodía UTC** (`new Date(Date.UTC(a, m−1, d, 12))`), lo que evita corrimientos de día en cualquier zona entre UTC−11 y UTC+11.
- Semana: empieza en **lunes** (ISO). Festivos de Colombia en `dominio/reglas/festivos.ts` (Ley Emiliani + Semana Santa por el cómputo de Pascua), con pruebas para 2025–2027.
- `npm run test:tz` corre la suite de dominio con `TZ=UTC`, `TZ=Asia/Tokyo` y `TZ=America/Los_Angeles`: los resultados deben ser idénticos.

### 5.10 Formatos colombianos

Todo en `lib/formato.ts` según la tabla 8.11.3 (dinero con espacio duro U+00A0, negativos con `−` U+2212, `cifraCorta`, porcentajes, fechas `dd/mm/aaaa`, horas `3:45 p. m.`, celular `300 123 4567`, cédula y NIT con puntos, consecutivos). Implementación manual sobre `Intl.NumberFormat('es-CO')` para números; las horas con `a. m.`/`p. m.` se arman a mano (no dependen de la implementación de `Intl` del navegador). Pruebas unitarias con los ejemplos de 8.11.3.

### 5.11 PWA (app del dueño)

- `vite-plugin-pwa` con `registerType: 'autoUpdate'`, `workbox.navigateFallback: '/index.html'`, `navigateFallbackDenylist: [/^\/assets\//]`, precaché del shell y de todos los chunks (`globPatterns: ['**/*.{js,css,html,woff2,svg,png}']`, excluyendo las TTF de PDF y ExcelJS de la precaché inicial para no inflarla; se cachean en tiempo de ejecución con `CacheFirst`).
- Manifiesto: `name: "HALDEN · App del dueño"`, `short_name: "HALDEN"`, `id: "/app"`, `start_url: "/app?fuente=pwa"`, `scope: "/app"`, `display: "standalone"`, `orientation: "portrait"`, `background_color` y `theme_color` `#0A0A0A`, íconos 192/512/maskable (monograma H blanco sobre negro, generado desde SVG propio).
- iOS: `apple-touch-icon` 180 px, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-mobile-web-app-title: HALDEN`. Áreas seguras con `env(safe-area-inset-*)` (8.5.1).
- El service worker se registra en todas las rutas (la entrada también precarga), pero el manifiesto apunta a `/app`. Sin conexión, la app abre y genera sus datos (todo es local).
- Pista de instalación en `/app` (texto de 2.5 de la estrategia); en Android se ofrece el botón con `beforeinstallprompt` cuando exista.

### 5.12 Exportes PDF y Excel

**PDF (jsPDF + autotable), con tildes resueltas:**
- Se **embebe Figtree estática** (Regular 400, Bold 700, Black 900) en formato TTF, con licencia OFL incluida en el repositorio. jsPDF codifica fuentes TTF como Identity-H (Unicode), por lo que á é í ó ú ñ ü ¿ ¡ `−` y el espacio duro salen bien y con la tipografía de la marca. La fuente estándar Helvetica (WinAnsi) se descarta como principal: soporta las tildes, pero no `−`, el espacio angosto ni la identidad visual.
- Obtención en fase 2: TTF estáticas desde el repositorio oficial de Figtree o, si solo hay variable, instanciadas con `fonttools varLib.instancer`. jsPDF no acepta fuentes variables. Se cargan con `import()` diferido (≈ 60–90 KB cada una en base64) solo al exportar.
- `texto-pdf.ts` normaliza por seguridad: U+202F → U+00A0, comillas raras → tipográficas soportadas, elimina caracteres de control. Si la carga de la fuente fallara, se usa Helvetica y el normalizador además reemplaza `−` por `-`.
- `crearDocumentoPdf({ titulo, subtitulo, filtros, orientacion, moneda, marcaAgua? })` dibuja: encabezado con el wordmark HALDEN (Figtree Black, tracking 0,18 em simulado con `charSpace`), título del reporte en mayúsculas, línea de filtros ("Local: Usaquén · Del 01/09/2026 al 30/09/2026 · Cifras en COP"), fecha y hora de generación; pie "Generado con KippiCore CRM · Página 2 de 5"; marca de agua diagonal opcional "DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL" (gris 10 % con `GState`). Expone `tabla(columnas, filas, totales)`, `resumen(kpis)`, `parrafo()`, `codigoBarras()`, `qr()`, `guardar(nombreArchivo)`.
- Prueba unitaria: generar un PDF con "Ñandú, cigüeña, ¿sí? ¡Año! −$ 1.250.000" y verificar que no lanza, que la fuente registrada es Figtree y que el ancho del texto con tildes es > 0; el QA visual abre los PDF.

**Excel (ExcelJS):**
- `crearLibroExcel({ titulo, filtros, hojas: [{ nombre, columnas: [{ clave, titulo, tipo: 'texto'|'moneda'|'numero'|'fecha'|'porcentaje'|'entero', ancho? }], filas, totales: boolean }] })`.
- Fila 1: "HALDEN · <título>"; fila 2: filtros y moneda; fila 4: encabezados en negrita, fondo negro, texto blanco, congelados, autofiltro. Formatos: COP `"$" #,##0`; USD `"US$" #,##0.00`; CNY `"CN¥" #,##0.00` (Excel muestra los separadores según la configuración regional del equipo del cliente, que será colombiana); fechas como fecha real con `dd/mm/yyyy`; porcentajes `0.0%`. Ancho de columna = máx(título, contenido) con tope. Fila de totales con `SUM` reales (fórmulas, no valores pegados) en negrita.
- Ambos motores se cargan con `import()` y muestran un estado "Preparando el archivo…" en el botón.

### 5.13 Códigos de barras y QR

- EAN-13 en pantalla: `<CodigoBarras ean>` con JsBarcode a SVG (formato EAN13, nítido a cualquier escala).
- EAN-13 en PDF (etiquetas): `dominio/reglas/ean13.ts → codificar(ean): string` de 95 módulos; `pdf.codigoBarras()` dibuja rectángulos vectoriales. Sin canvas, nitidez perfecta al imprimir.
- QR: `qrcode` → SVG en pantalla; en PDF se dibujan los módulos de `QRCode.create(texto).modules` como rectángulos.
- QR de la app: siempre `window.location.origin + '/app'` (nunca `localhost` en producción; en desarrollo se muestra la IP local si está disponible y una nota).
- QR de la factura simulada: texto con NumFac, FecFac, ValTotal, CUFE y la leyenda "Documento de demostración". **No** se codifica ninguna URL de la DIAN.

### 5.14 Vercel y rutas al recargar

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/((?!assets/|iconos/|fuentes/|sw\\.js|workbox-.*|manifest\\.webmanifest|favicon\\.svg|robots\\.txt).*)", "destination": "/index.html" }
  ],
  "headers": [
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    { "source": "/(.*)", "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }] }
  ]
}
```

- Vercel sirve primero los archivos estáticos; la reescritura cubre todo lo demás. Se excluyen `/assets/` y archivos del PWA para que un chunk viejo inexistente responda **404** (y no `index.html` con 200, que provocaría "Failed to fetch dynamically imported module").
- `app/lazy.ts`: si falla la carga de un chunk, recarga la página una sola vez (bandera en `sessionStorage`), lo que resuelve el caso "el cliente tenía la pestaña abierta durante un redespliegue".
- Pruebas: `e2e/paquetes/fundaciones.spec.ts` recarga en 12 rutas profundas sobre `vite preview` (que también hace fallback); una prueba unitaria verifica la expresión de reescritura con una lista de rutas; en fase 6 Playwright recarga las mismas rutas en la URL pública.
- Despliegue: `npx vercel --prod` (o conectar el repositorio). Sin variables de entorno.

### 5.15 Code splitting y presupuesto del bundle

- Cada página de ruta es un `lazy()` propio; cada módulo es un chunk.
- `manualChunks`: `react` (react, react-dom, react-router, zustand, immer), `radix`, `tabla` (@tanstack/*), `graficos` (recharts y d3), `pdf` (jspdf, autotable, fuentes), `excel` (exceljs), `codigos` (jsbarcode, qrcode), `dnd` (@dnd-kit/*), `fechas` (date-fns + es).
- Presupuesto (gzip): entrada `/` < 180 KB; layout de escritorio + Inicio < 350 KB (incluye `graficos`); cualquier otro chunk de módulo < 120 KB; worker < 200 KB. `pdf` y `excel` nunca en la carga inicial. `scripts/presupuesto.mjs` falla el build si se exceden (se ejecuta en `npm run build`).
- El worker importa `dominio` + `generador` + `config` + `seed`; el hilo principal importa `dominio` (para la ruta en vivo) en un chunk compartido.

### 5.16 Estructura de pruebas

| Tipo | Dónde | Dueño | Qué |
|---|---|---|---|
| Reglas | `src/dominio/reglas/*.test.ts` | F2 | IVA, descuentos, prorrateo, costo aterrizado, comisiones, nómina (ambas modalidades, con y sin exoneración, auxilio, solidaridad), asistencia, festivos, EAN-13, segmentación |
| Comandos | `src/dominio/comandos/*.test.ts` | F2 | Cada comando núcleo: validaciones y efectos |
| Generador | `src/generador/*.test.ts` | F2 | Coherencia, determinismo, reaplicación, patrones, rendimiento (7.14) |
| Selectores | `src/selectores/*.test.ts` | F2 | Selector vs. recálculo ingenuo; hallazgos; pivote |
| Formatos y exportes | `src/lib/**/*.test.ts` | F2 | Formatos 8.11.3; PDF con tildes; Excel con totales |
| Componentes de módulo | `src/modulos/<m>/**/*.test.tsx` | cada paquete | Cálculos y estados de su interfaz |
| E2E por paquete | `e2e/paquetes/<paquete>.spec.ts` | cada paquete | Flujo principal del paquete en 1440 × 900 |
| E2E de integración | `e2e/flujos/*.spec.ts` | integrador (fase 4) | Los 8 flujos, en 1440 × 900 y 390 × 844 |

Playwright usa siempre `?hoy=` fijo (por defecto `2026-09-30T15:30`) y almacenamiento limpio, para que las cifras sean reproducibles.

---

## 6. Modelo de datos

### 6.1 Convenciones

| Tema | Regla |
|---|---|
| IDs | Cadenas opacas con prefijo por entidad: `vt_` venta, `cl_` cliente, `mv_` movimiento, etc. (tabla en `motor/ids.ts`). Las entidades generadas tienen IDs **estables** derivados del plan (`vt_g_20260930_usq_014`); las del usuario usan `nuevoId('vt')` (prefijo + base36 del instante + contador + 4 caracteres aleatorios) y el ID viaja dentro del comando. Los hijos se derivan del padre: `${ventaId}-l1` (línea), `-p1` (pago), `-m1` (movimiento). Excepciones legibles: `Producto.referencia`, `Importacion.numero`, `Empleado.slug` son únicas e **inmutables** y se usan en las URL |
| Fechas | `FechaISO`, `FechaHoraISO`, `HoraHHmm`, `MesISO` en hora de Bogotá, sin zona (5.9) |
| Dinero | `COP` = pesos enteros. `Centavos` = USD/CNY × 100, enteros. Tasas = COP por 1 unidad de moneda extranjera (número con hasta 2 decimales). Redondeo único: `redondear(x) = Math.sign(x) * Math.round(Math.abs(x))` (mitad lejos de cero) |
| Porcentajes | `Fraccion`: 0,19 = 19 % |
| Precios | **IVA incluido** (precio al público, terminación ,900). La base y el IVA se derivan por línea |
| Eliminar | Las entidades maestras se eliminan de forma **suave** (`eliminadoEn`): desaparecen de listas y selectores, pero los documentos históricos las siguen mostrando ("Cliente eliminado"). Los documentos (ventas, movimientos, facturas, liquidaciones pagadas) **no se eliminan**: se anulan o se revierten con otro documento |
| Tablas y libros | `Tabla<T> = Record<Id, T>` para entidades que cambian. Arreglos solo-agregar (`T[]`) para libros inmutables: movimientos de inventario y mensajes de la bandeja |
| Almacenado vs. derivado | Cada tipo dice en un comentario `// derivado: ...` qué NO se guarda. Tabla completa en 6.22 |
| Textos | Todo texto de dato está en español de Colombia, salvo los mensajes al proveedor chino (inglés, a propósito) |

### 6.2 Tipos comunes (`dominio/tipos/comunes.ts`)

```ts
export type Id = string;
export type FechaISO = string;        // 'AAAA-MM-DD' (Bogotá)
export type FechaHoraISO = string;    // 'AAAA-MM-DDTHH:mm:ss' (Bogotá, sin zona)
export type HoraHHmm = string;        // 'HH:mm' 24 h
export type MesISO = string;          // 'AAAA-MM'
export type COP = number;             // pesos colombianos enteros
export type Centavos = number;        // USD o CNY × 100, enteros
export type Fraccion = number;        // 0.19 = 19 %
export type Tabla<T> = Record<Id, T>;
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 0 = domingo (convención JS); la interfaz muestra lunes primero

export type Moneda = 'COP' | 'USD' | 'CNY';
export type MonedaExtranjera = Exclude<Moneda, 'COP'>;

export interface MontoExtranjero { moneda: MonedaExtranjera; centavos: Centavos }
/** Monto que nació en moneda extranjera y se convirtió a COP con la tasa de su fecha. */
export interface MontoConvertido extends MontoExtranjero { tasa: number; fechaTasa: FechaISO; cop: COP }
/** Monto que puede estar en cualquier moneda (fletes, honorarios). */
export interface MontoMoneda { moneda: Moneda; valor: number }   // COP: pesos; USD/CNY: centavos

export type Origen = 'generado' | 'usuario';
export interface Trazabilidad {
  creadoEn: FechaHoraISO;
  creadoPor: Id;                  // usuarioId, o USUARIOS_SISTEMA.*
  actualizadoEn?: FechaHoraISO;
  actualizadoPor?: Id;
  origen: Origen;
}
export interface Eliminable { eliminadoEn?: FechaHoraISO; eliminadoPor?: Id; motivoEliminacion?: string }

export type TipoDocumento =
  | 'venta' | 'devolucion' | 'importacion' | 'traslado' | 'conteo' | 'ajuste' | 'gasto'
  | 'cuenta_por_pagar' | 'liquidacion' | 'sesion_caja' | 'factura' | 'nota_credito' | 'transferencia' | 'movimiento_cuenta';
export interface RefDocumento { tipo: TipoDocumento; id: Id }

/** Soporte simulado (no se sube ningún archivo). */
export interface Soporte { nombreArchivo: string; estado: 'adjunto' | 'pendiente'; fecha?: FechaISO }

export interface Descuento { tipo: 'porcentaje' | 'valor'; valor: number }   // porcentaje: Fraccion; valor: COP

export const USUARIOS_SISTEMA = {
  sistema: 'sistema', portalAduanas: 'portal-aduanas', tiendaWeb: 'tienda-web',
  botWhatsapp: 'bot-whatsapp', botInstagram: 'bot-instagram',
} as const;
```

### 6.3 Empresa, locales, usuarios y parámetros

```ts
// dominio/tipos/empresa.ts
export interface Empresa {
  nombre: string;                 // 'HALDEN'
  descriptor: string;             // 'Menswear · Bogotá'
  razonSocial: string;            // ficticia, p. ej. 'Halden Moda Masculina S.A.S.'
  nit: string;                    // ficticio con dígito de verificación: '901.234.567-8'
  direccion: string; ciudad: string; telefono: string; correo: string;
  colores: { acento: string; acentoTexto: string; acentoSuave: string; tiendaHero: string };
  duenoNombre: string;            // 'Juan Camilo Ospina'
  responsableIva: boolean;
}

export type TipoLocal = 'tienda_calle' | 'centro_comercial' | 'bodega';
export interface FranjaHorario { abre: HoraHHmm; cierra: HoraHHmm }
export type HorarioSemanal = Record<DiaSemana, FranjaHorario | null>;

export interface Local extends Trazabilidad, Eliminable {
  id: Id;                         // 'p93' | 'usq' | 'zr' | 'bod' en la semilla
  codigo: string;                 // 'P93'
  nombre: string;                 // 'Parque 93'
  tipo: TipoLocal;
  vende: boolean;                 // false para la bodega
  direccion: string;
  zona: string;                   // 'Chicó' · 'Usaquén' · 'Zona Rosa' · 'Puente Aranda'
  horario: HorarioSemanal;
  horarioFestivo: FranjaHorario | null;
  cuentaCajaId: Id | null;        // caja del local
  arriendoMensual: COP;
  areaM2: number;
  orden: number;
}

export type Rol = 'dueno' | 'vendedor' | 'bodega';
export interface UsuarioDemo extends Trazabilidad, Eliminable {
  id: Id; nombre: string; correo: string; iniciales: string;
  rol: Rol;
  empleadoId: Id | null;          // vendedor y bodega son empleados
  localFijoId: Id | null;         // vendedor: su local
  activo: boolean;
}

// dominio/tipos/sistema.ts (parámetros; valores iniciales en src/config/*)
export interface ParametrosNomina {
  vigencia: number;                                   // 2026
  smmlv: COP;                                         // 1.750.905 (Decreto 1469 de 2025)
  auxilioTransporte: COP;                             // 249.095 (Decreto 1470 de 2025)
  topeAuxilioSMMLV: number;                           // 2
  jornadaMaximaSemanal: { horas: number; desde: FechaISO; horasAnterior: number };  // 42 desde 2026-07-15; antes 44
  jornadaNocturna: { inicio: HoraHHmm; fin: HoraHHmm };                             // '19:00'–'06:00' (por verificar)
  recargos: {
    nocturno: Fraccion;             // 0.35
    dominicalFestivo: Fraccion;     // 0.90 desde 2026-07-01 (Ley 2466 de 2025; por verificar)
    extraDiurna: Fraccion;          // 0.25
    extraNocturna: Fraccion;        // 0.75
  };
  trabajador: { salud: Fraccion; pension: Fraccion }; // 0.04 · 0.04
  fondoSolidaridad: { desdeSMMLV: number; hastaSMMLV: number | null; porcentaje: Fraccion }[];  // 4–16: 1 %; tramos superiores
  empleador: { salud: Fraccion; pension: Fraccion; caja: Fraccion; icbf: Fraccion; sena: Fraccion;
               arl: Record<1 | 2 | 3 | 4 | 5, Fraccion> };   // 0.085 · 0.12 · 0.04 · 0.03 · 0.02 · I = 0.00522
  provisiones: { cesantias: Fraccion; interesesCesantiasAnual: Fraccion; prima: Fraccion; vacaciones: Fraccion }; // 0.0833 · 0.12 · 0.0833 · 0.0417
  exoneracion114: { activa: boolean; topeSMMLV: number };     // true · 10
  prestacionServicios: { retencionFuente: Fraccion; ibcPorcentaje: Fraccion };  // 0.10 · 0.40
  incapacidad: { porcentajePago: Fraccion; diasACargoEmpleador: number };       // 0.6667 · 2
  toleranciaLlegadaTardeMin: number;                                            // 10
  porVerificar: string[];        // claves con marca "Verificar antes de presentar como cálculo real"
}
export interface ParametrosImpuestos {
  ivaGeneral: Fraccion;                  // 0.19
  ivaGastosDescontable: boolean;         // true: el estado de resultados usa gastos sin IVA
  retencionHonorarios: Fraccion;         // 0.10
  retencionCompras: Fraccion;            // 0.025
}
export interface ParametrosAduanas {
  arancelPct: Fraccion;                  // 0.15 (valor de ejemplo)
  ivaImportacionPct: Fraccion;           // 0.19
  ivaImportacionSumaAlCosto: boolean;    // interruptor "IVA descontable (no suma al costo)" (W4)
  seguroPctSobreFOB: Fraccion;           // 0.005
  diasEstimadosEntreEstados: Record<EstadoImportacion, number>;
  sonEjemplo: true;
}
export interface ParametrosVentas {
  abonoMinimoSeparado: Fraccion;         // 0.20
  diasMaximoSeparado: number;            // 30
  descuentoMaximoVendedor: Fraccion;     // 0.15
  diasMaximoDevolucion: number;          // 30
  localDespachoWebId: Id;                // 'p93'
  cuentaPorMedio: Record<MedioPago, Id | 'caja_del_local' | null>;
}
export interface ParametrosDatafono { comisionDebito: Fraccion; comisionCredito: Fraccion }   // ≈ 0.022 · 0.029
export interface ParametrosSegmentacion {
  diasNuevo: number;                     // 60
  diasEnRiesgo: number;                  // 90
  vipValor12m: COP;                      // 3.000.000
  frecuenteCompras12m: number;           // 3
}
export interface ParametrosInventario { stockMinimoPorDefecto: number; diasSinMovimiento: number }  // 2 · 60
export interface Parametros {
  nomina: ParametrosNomina; impuestos: ParametrosImpuestos; aduanas: ParametrosAduanas;
  ventas: ParametrosVentas; datafono: ParametrosDatafono; segmentacion: ParametrosSegmentacion;
  inventario: ParametrosInventario;
}

export interface TasaCambio {
  id: Id; moneda: MonedaExtranjera; fecha: FechaISO;
  valor: number;                          // COP por 1 USD o 1 CNY
  fuente: 'ejemplo' | 'usuario';
}
```

### 6.4 Catálogo (`dominio/tipos/catalogo.ts`)

```ts
export type Categoria =
  | 'camisas' | 'blazers' | 'pantalones' | 'polos' | 'abrigos_chaquetas'
  | 'punto' | 'trajes' | 'calzado' | 'accesorios';
export type LineaProducto = 'sastreria' | 'casual' | 'sport';
export type TipoPrenda =                       // define la ilustración <Prenda> (8.8)
  | 'camisa' | 'blazer' | 'pantalon' | 'polo' | 'abrigo' | 'chaqueta' | 'sweater'
  | 'traje' | 'chaleco' | 'zapato' | 'tenis' | 'cinturon' | 'corbata' | 'medias' | 'billetera';
export type CurvaTallas = 'superior' | 'pantalon' | 'calzado' | 'sastreria' | 'unica';
// superior: S M L XL XXL · pantalon: 28 30 32 34 36 38 40 · calzado: 38–44 · sastreria: 46 48 50 52 54 56 · unica: 'Única'

export interface Color { id: Id; nombre: string; codigo: string; hex: string; patron: 'liso' | 'rayas' | 'cuadros' }

export interface Producto extends Trazabilidad, Eliminable {
  id: Id;
  referencia: string;               // 'HL-CAM-0142' — única e inmutable (URL)
  nombre: string;                   // 'Camisa Oxford Slim Fit'
  slug: string;                     // 'camisa-oxford-slim-fit' (tienda)
  categoria: Categoria;
  linea: LineaProducto;
  tipoPrenda: TipoPrenda;
  curvaTallas: CurvaTallas;
  temporada: string;                // 'Colección permanente' · 'Temporada 2026-II'
  proveedorId: Id;
  material: string;                 // '100 % algodón Oxford'
  descripcion: string;
  precioVenta: COP;                 // IVA incluido
  tarifaIva: Fraccion;              // 0.19
  costoVigente: COP;                // costo unitario aterrizado vigente (heredado de la última importación aplicada)
  historialCosto: { fecha: FechaISO; costo: COP; importacionId: Id | null; motivo: 'importacion' | 'manual' }[];
  stockMinimo: number;              // por variante y por local
  publicadoEnTienda: boolean;
  destacado: boolean;
  etiquetas: string[];
  // derivado: margen, existencias, ventas, rotación, días sin movimiento
}

export interface Variante extends Trazabilidad, Eliminable {
  id: Id;
  productoId: Id;
  talla: string;
  colorId: Id;
  sku: string;                      // 'HL-CAM-0142-AZC-M'
  ean13: string;                    // 13 dígitos, prefijo de circulación interna 20–29, dígito de control válido
}
```

### 6.5 Inventario (`dominio/tipos/inventario.ts`)

```ts
export type TipoMovimiento =
  | 'entrada_importacion'         // + en bodega al recibir
  | 'entrada_compra'              // + compra local (plantilla; el generador no la usa)
  | 'salida_venta'                // −
  | 'salida_separado'             // − al crear el separado (la prenda sale del disponible)
  | 'reingreso_separado'          // + al cancelar un separado
  | 'reingreso_anulacion'         // + al anular una venta
  | 'devolucion_cliente'          // + devolución que reingresa
  | 'traslado_salida'             // − en origen al despachar
  | 'traslado_entrada'            // + en destino al recibir
  | 'ajuste_conteo'               // ± al aplicar un conteo
  | 'ajuste_manual';              // ± con motivo

export type MotivoAjuste = 'dano' | 'perdida' | 'error' | 'hallazgo' | 'otro';

export interface MovimientoInventario {   // libro inmutable (arreglo)
  id: Id;
  ts: FechaHoraISO;
  varianteId: Id;
  productoId: Id;                         // desnormalizado para el kardex
  localId: Id;
  cantidad: number;                       // con signo: + entra, − sale
  tipo: TipoMovimiento;
  costoUnitario: COP;                     // costo vigente del producto en ese instante (entradas de importación: su costo aterrizado)
  documento: RefDocumento;
  motivo?: MotivoAjuste;
  usuarioId: Id;
  nota?: string;
  // derivado: saldo acumulado del kardex
}

/** Clave del agregado materializado de existencias. */
export type ClaveExistencia = `${Id}@${Id}`;   // `${varianteId}@${localId}`

export type EstadoTraslado = 'solicitado' | 'en_transito' | 'recibido' | 'cancelado';
export interface Traslado extends Trazabilidad {
  id: Id;
  numero: string;                          // 'TR-000123'
  origenId: Id;
  destinoId: Id;
  lineas: { varianteId: Id; cantidad: number; recibida: number | null }[];
  estado: EstadoTraslado;
  aprobacion: 'no_requerida' | 'pendiente' | 'aprobada' | 'rechazada';
  solicitadoPor: Id;
  fechas: { solicitado: FechaHoraISO; aprobado?: FechaHoraISO; despachado?: FechaHoraISO; recibido?: FechaHoraISO; cancelado?: FechaHoraISO };
  motivo?: string;                         // 'Reposición' · 'Distribución IMP-2026-03' · …
  importacionId?: Id;                      // si nace de la distribución de una importación
  nota?: string;
}

export type EstadoConteo = 'en_curso' | 'pendiente_aprobacion' | 'aplicado' | 'cancelado';
export interface ConteoFisico extends Trazabilidad {
  id: Id;
  numero: string;                          // 'CF-000031'
  localId: Id;
  categorias: Categoria[] | null;          // null = todo el local
  estado: EstadoConteo;
  responsableId: Id;
  iniciado: FechaHoraISO;
  lineas: Record<Id, { sistemaAlIniciar: number; contado: number | null }>;   // por varianteId
  aplicado?: { ts: FechaHoraISO; por: Id; motivos: Record<Id, MotivoAjuste> };
  // derivado: diferencias contra la existencia actual, valor de las diferencias
}
```

### 6.6 Ventas, pagos, separados y devoluciones (`dominio/tipos/ventas.ts`)

```ts
export type Canal = 'local' | 'whatsapp' | 'instagram' | 'web';
export type TipoVenta = 'contado' | 'separado' | 'credito';
export type MedioPago =
  | 'efectivo' | 'datafono_debito' | 'datafono_credito' | 'nequi' | 'daviplata'
  | 'transferencia' | 'bre_b' | 'pasarela_web' | 'saldo_a_favor';

export interface LineaVenta {
  id: Id;                                  // `${ventaId}-l1`
  productoId: Id;
  varianteId: Id;
  sku: string;
  descripcion: string;                     // instantánea: 'Camisa Oxford Slim Fit · Azul cielo · M'
  cantidad: number;
  precioLista: COP;                        // unitario, IVA incluido
  descuentoLinea: Descuento | null;
  descuentoAsignado: COP;                  // descuento de línea + parte prorrateada del global
  totalFinal: COP;                         // IVA incluido = precioLista × cantidad − descuentoAsignado
  base: COP;                               // sin IVA
  iva: COP;
  costoUnitario: COP;                      // instantánea de Producto.costoVigente al vender
}

export interface PagoVenta {
  id: Id;                                  // `${ventaId}-p1`
  ts: FechaHoraISO;
  tipo: 'pago' | 'abono' | 'reembolso';    // reembolso: valor negativo
  medio: MedioPago;
  valor: COP;                              // aplicado a la venta (efectivo: neto de cambio)
  recibido: COP | null;                    // efectivo entregado por el cliente
  cambio: COP | null;
  referencia: string | null;               // aprobación del datáfono, número Nequi…
  cuentaId: Id | null;                     // cuenta que recibe la plata (null para saldo a favor)
  sesionCajaId: Id | null;                 // efectivo en el local
  conciliado: boolean;                     // conciliación bancaria simple
}

export interface Venta extends Trazabilidad {
  id: Id;
  numero: string;                          // 'V-000482' (consecutivo global)
  ts: FechaHoraISO;
  localId: Id;
  vendedorId: Id;                          // empleado
  clienteId: Id | null;                    // null = consumidor final
  canal: Canal;
  tipo: TipoVenta;
  lineas: LineaVenta[];
  descuentoGlobal: Descuento | null;
  aprobacionDescuentoId: Id | null;
  subtotal: COP;                           // Σ precioLista × cantidad
  descuentos: COP;                         // Σ descuentoAsignado
  total: COP;                              // Σ totalFinal (IVA incluido)
  base: COP;                               // Σ base
  iva: COP;                                // Σ iva
  pagos: PagoVenta[];
  separado: { fechaLimite: FechaISO; cerrado: { ts: FechaHoraISO; resultado: 'completado' | 'cancelado' } | null } | null;
  anulacion: { ts: FechaHoraISO; motivo: string; usuarioId: Id } | null;
  facturaId: Id | null;
  ventaOrigenCambioId: Id | null;          // si es la venta nueva de un cambio
  nota: string | null;
  // derivado: estado (pagada | separado | credito | devuelta | devuelta_parcial | anulada),
  //           saldo pendiente, unidades, margen, comisión, fecha de reconocimiento
}

export type CompensacionDevolucion = 'reembolso' | 'saldo_favor' | 'cambio';
export interface Devolucion extends Trazabilidad {
  id: Id;
  numero: string;                          // 'DV-000045'
  ventaId: Id;
  ts: FechaHoraISO;
  localId: Id;
  lineas: { lineaId: Id; varianteId: Id; cantidad: number; valor: COP; base: COP; iva: COP; costo: COP; reingresa: boolean }[];
  motivo: string;
  compensacion: CompensacionDevolucion;
  valorTotal: COP;
  reembolso: { medio: MedioPago; cuentaId: Id | null; sesionCajaId: Id | null } | null;
  notaCreditoId: Id | null;
  ventaCambioId: Id | null;
  usuarioId: Id;
}

/** Solicitud de aprobación (app del dueño: "Para aprobar"). */
export type TipoSolicitud = 'descuento' | 'traslado' | 'conteo' | 'nomina';
export interface SolicitudAprobacion extends Trazabilidad {
  id: Id;
  tipo: TipoSolicitud;
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'vencida';
  solicitadoPor: Id;                       // usuarioId
  ts: FechaHoraISO;
  resumen: string;                         // 'Sebastián Cárdenas pide 20 % de descuento · Blazer de lana fría · $ 789.900 → $ 631.920'
  datos:
    | { tipo: 'descuento'; localId: Id; vendedorId: Id; varianteIds: Id[]; valorLista: COP; porcentaje: Fraccion; valorFinal: COP; motivo: string }
    | { tipo: 'traslado'; trasladoId: Id }
    | { tipo: 'conteo'; conteoId: Id }
    | { tipo: 'nomina'; liquidacionId: Id };
  resolucion: { ts: FechaHoraISO; por: Id; nota: string | null } | null;
  usadaEnVentaId: Id | null;               // una aprobación de descuento se usa una sola vez
}
```

### 6.7 Caja (`dominio/tipos/caja.ts`)

```ts
export interface EgresoCaja { id: Id; ts: FechaHoraISO; concepto: string; valor: COP; categoria: CategoriaGasto; gastoId: Id }
export interface SesionCaja extends Trazabilidad {
  id: Id;
  localId: Id;
  cuentaId: Id;                            // caja del local
  turno: 'dia' | 'manana' | 'tarde';
  abierta: { ts: FechaHoraISO; por: Id; baseInicial: COP };
  egresos: EgresoCaja[];
  cierre: {
    ts: FechaHoraISO; por: Id;
    efectivoContado: COP;
    efectivoEsperado: COP;                 // instantánea al cerrar (auditoría)
    diferencia: COP;                       // contado − esperado
    observacion: string | null;
  } | null;
  // derivado (mientras está abierta): ventas por medio de pago, efectivo esperado
}
```

### 6.8 Clientes (`dominio/tipos/clientes.ts`)

```ts
export type CanalPreferido = 'whatsapp' | 'instagram' | 'correo' | 'llamada';
export type OrigenCliente = 'pos' | 'whatsapp' | 'instagram' | 'web' | 'importado';
export interface NotaCliente { id: Id; ts: FechaHoraISO; autorId: Id; texto: string }

export interface Cliente extends Trazabilidad, Eliminable {
  id: Id;
  nombres: string;
  apellidos: string;
  documento: { tipo: 'CC' | 'CE' | 'PA' | 'NIT'; numero: string } | null;
  celular: string;                         // '3001234567' (se muestra '300 123 4567')
  correo: string | null;
  cumpleanos: string | null;               // 'MM-DD'
  anioNacimiento: number | null;
  barrio: string | null;
  canalPreferido: CanalPreferido;
  autorizacionDatos: { aceptada: boolean; fecha: FechaHoraISO; canal: OrigenCliente };
  tallasDeclaradas: Partial<Record<'camisa' | 'pantalon' | 'calzado' | 'blazer', string>>;
  origen: OrigenCliente;
  localRegistroId: Id | null;
  registradoPorId: Id | null;              // empleado
  notas: NotaCliente[];
  // derivado: compras, valor histórico, ticket promedio, frecuencia, última compra, segmento,
  //           tallas preferidas (moda de sus compras), colores y líneas que más compra,
  //           local habitual, vendedor que más lo atiende, saldo a favor, saldo por cobrar
}
```

### 6.9 Personal, contratos, comisiones, turnos, asistencia y novedades (`dominio/tipos/personal.ts`)

```ts
export type Cargo =
  | 'vendedor' | 'cajero' | 'jefe_bodega' | 'auxiliar_bodega'
  | 'administracion' | 'sastre' | 'contenido_redes';

export interface Empleado extends Trazabilidad, Eliminable {
  id: Id;
  slug: string;                            // 'sebastian-cardenas' — único e inmutable (URL)
  nombres: string;
  apellidos: string;
  documento: { tipo: 'CC' | 'CE' | 'PPT'; numero: string };
  fechaNacimiento: FechaISO | null;
  cargo: Cargo;
  localId: Id | null;                      // null = administración / atiende varios locales
  fechaIngreso: FechaISO;
  fechaRetiro: FechaISO | null;
  celular: string;
  correo: string;
  contactoEmergencia: { nombre: string; parentesco: string; celular: string };
  afiliaciones: { eps: string; pension: string; cesantias: string; arl: string; caja: string };   // nombres ficticios (seed)
  cuentaPago: { entidad: string; tipo: 'ahorros' | 'corriente' | 'nequi' | 'daviplata'; numeroEnmascarado: string };
  contratoVigenteId: Id;
  // derivado: antigüedad, costo para el negocio, comisiones, asistencia, horas de la semana
}

export type TipoVinculacion = 'laboral' | 'prestacion_servicios';
export interface Contrato extends Trazabilidad {
  id: Id;
  empleadoId: Id;
  tipo: TipoVinculacion;
  modalidadLaboral: 'indefinido' | 'fijo' | 'obra_labor' | null;   // solo laboral
  inicio: FechaISO;
  fin: FechaISO | null;
  salarioBase: COP | null;                 // laboral (mensual)
  honorarios: COP | null;                  // prestación (mensual)
  jornadaSemanalHoras: number;             // ≤ jornada máxima vigente
  riesgoArl: 1 | 2 | 3 | 4 | 5;
  esquemaComisionId: Id | null;
  periodicidadPago: 'quincenal' | 'mensual';
  retencionFuente: Fraccion | null;        // prestación: por defecto el parámetro
  verificacionesPila: { periodo: MesISO; verificada: boolean; soporte: Soporte | null }[];  // prestación
}

export type ComponenteComision =
  | { tipo: 'porcentaje'; porcentaje: Fraccion }
  | { tipo: 'escalonado'; modo: 'total' | 'marginal'; tramos: { desde: COP; porcentaje: Fraccion }[] }   // sobre la venta del mes
  | { tipo: 'bono_meta_local'; valor: COP; cumplimientoMinimo: Fraccion };                               // si el local cumple su meta
export interface EsquemaComision extends Trazabilidad, Eliminable {
  id: Id;
  nombre: string;                          // '3 % sobre ventas propias'
  base: 'total_con_iva' | 'base_sin_iva';  // la semilla usa total_con_iva ("3 % de lo que vendes")
  componentes: ComponenteComision[];
}

export interface MetaVentas { id: Id; localId: Id; mes: MesISO; valor: COP }   // valor con IVA

export type TipoTurno = 'apertura' | 'intermedio' | 'cierre' | 'completo';
export interface Turno extends Trazabilidad {
  id: Id;
  empleadoId: Id;
  localId: Id;
  fecha: FechaISO;
  tipo: TipoTurno;
  inicio: HoraHHmm;
  fin: HoraHHmm;
  descansoMin: number;
  excedeJornadaAceptado: boolean;          // el dueño confirmó que genera horas extra
  // derivado: horas programadas, horas nocturnas, si es dominical/festivo
}

export interface Marcacion extends Trazabilidad {
  id: Id;
  empleadoId: Id;
  localId: Id;
  ts: FechaHoraISO;
  tipo: 'entrada' | 'salida';
  medio: 'boton' | 'generada' | 'corregida';
  nota: string | null;
}

export type TipoNovedad =
  | 'incapacidad' | 'vacaciones' | 'licencia_remunerada' | 'licencia_no_remunerada'
  | 'permiso' | 'calamidad' | 'licencia_paternidad';
export interface Novedad extends Trazabilidad, Eliminable {
  id: Id;
  empleadoId: Id;
  tipo: TipoNovedad;
  desde: FechaISO;
  hasta: FechaISO;
  remunerada: boolean;
  soporte: Soporte | null;
  nota: string | null;
  // derivado: días hábiles afectados, efecto en la liquidación
}

/** Resultado DERIVADO de asistencia por empleado y día (no se almacena). */
export interface AsistenciaDia {
  empleadoId: Id; fecha: FechaISO; localId: Id | null; turnoId: Id | null;
  entrada: FechaHoraISO | null; salida: FechaHoraISO | null;
  estado: 'a_tiempo' | 'tarde' | 'ausente' | 'novedad' | 'sin_turno' | 'en_curso' | 'pendiente';
  minutosTarde: number;
  horasTrabajadas: number;
  horasOrdinarias: number;
  horasExtraDiurnas: number;
  horasExtraNocturnas: number;
  horasRecargoNocturno: number;            // ordinarias en franja nocturna
  horasDominicalFestivo: number;
}
```

### 6.10 Nómina (`dominio/tipos/nomina.ts`)

```ts
export interface PeriodoNomina {
  inicio: FechaISO; fin: FechaISO;
  tipo: 'quincenal' | 'mensual';
  etiqueta: string;                         // '2.ª quincena de septiembre de 2026'
}

/** Insumos de una liquidación por empleado (derivados de asistencia, novedades y ventas). */
export interface InsumosLiquidacion {
  diasPeriodo: number;                      // 15 o 30 (mes comercial)
  diasLaborados: number;
  diasIncapacidad: number;
  diasVacaciones: number;
  diasNoRemunerados: number;
  horasExtraDiurnas: number;
  horasExtraNocturnas: number;
  horasRecargoNocturno: number;
  horasDominicalFestivo: number;
  ventasComisionables: COP;                 // del mes (se liquida en la 2.ª quincena o en el mes)
  ventasLocalMes: COP;
  metaLocalMes: COP;
}

export interface DesgloseLaboral {
  devengados: {
    salario: COP; incapacidad: COP; vacaciones: COP; auxilioTransporte: COP;
    horasExtraDiurnas: COP; horasExtraNocturnas: COP; recargoNocturno: COP; recargoDominicalFestivo: COP;
    comisiones: COP; bonos: COP;
  };
  totalDevengado: COP;
  ibc: COP;                                 // base de seguridad social (sin auxilio)
  deducciones: { salud: COP; pension: COP; fondoSolidaridad: COP };
  totalDeducciones: COP;
  aportesEmpleador: { salud: COP; pension: COP; arl: COP; caja: COP; icbf: COP; sena: COP };
  totalAportes: COP;
  provisiones: { cesantias: COP; interesesCesantias: COP; prima: COP; vacaciones: COP };
  totalProvisiones: COP;
  exonerado114: boolean;
}
export interface DesglosePrestacion {
  honorarios: COP; comisiones: COP; totalBruto: COP;
  retencionFuente: COP;
  pilaVerificada: boolean;
  ibcContratista: COP;                      // informativo: 40 % de lo pactado
}
export interface LiquidacionEmpleado {
  empleadoId: Id; contratoId: Id; tipo: TipoVinculacion; localId: Id | null;
  insumos: InsumosLiquidacion;
  laboral: DesgloseLaboral | null;
  prestacion: DesglosePrestacion | null;
  netoAPagar: COP;
  costoEmpleador: COP;                      // devengado + aportes + provisiones (laboral) · bruto (prestación)
}
export interface LiquidacionNomina extends Trazabilidad {
  id: Id;
  numero: string;                           // 'NOM-2026-18'
  periodo: PeriodoNomina;
  estado: 'aprobada' | 'pagada';            // el borrador es DERIVADO (vista previa), no se guarda
  parametros: ParametrosNomina;             // instantánea de los parámetros usados
  exoneracion114: boolean;
  lineas: LiquidacionEmpleado[];
  totales: { devengado: COP; deducciones: COP; aportes: COP; provisiones: COP; neto: COP; costo: COP };
  aprobada: { ts: FechaHoraISO; por: Id };
  pagada: { ts: FechaHoraISO; por: Id; cuentaId: Id } | null;
  cuentasPorPagarIds: Id[];                 // neto empleados, seguridad social (PILA), honorarios
  gastoIds: Id[];                           // gasto de nómina del periodo por local
}
```

### 6.11 Proveedores, contactos e importaciones (`dominio/tipos/compras.ts`)

```ts
export type TipoProveedor = 'fabrica' | 'local';
export type CategoriaProveedorLocal =
  | 'arriendo' | 'servicios' | 'empaques' | 'publicidad' | 'sastreria' | 'vigilancia'
  | 'transporte' | 'mantenimiento' | 'tecnologia' | 'contabilidad' | 'aduanas' | 'carga';
export interface Proveedor extends Trazabilidad, Eliminable {
  id: Id;
  tipo: TipoProveedor;
  nombre: string;                           // 'Guangzhou Huameng Garment Co., Ltd.' (ficticio, verificado)
  nombreCorto: string;                      // 'Guangzhou Huameng'
  nit: string | null;                       // locales
  ciudad: string; pais: string;
  moneda: Moneda;
  condicionesPago: string;                  // '30 % anticipo, 70 % contra copia del BL'
  diasEntregaPactados: number | null;
  categoriaLocal: CategoriaProveedorLocal | null;
  localId: Id | null;                       // arrendador de un local
  categoriasProducto: Categoria[];          // fábricas
  calificacion: 1 | 2 | 3 | 4 | 5;
  contactoIds: Id[];
  nota: string | null;
  // derivado: total comprado, saldo pendiente, pedidos, tiempo promedio de entrega,
  //           cumplimiento de fechas, tasa de defectos (de las recepciones), costo promedio por unidad
}

export type RolContacto = 'proveedor' | 'agente_carga' | 'agente_aduanas' | 'transportador' | 'otro';
export interface Contacto extends Trazabilidad, Eliminable {
  id: Id;
  nombre: string;                           // 'Carolina Mejía'
  empresa: string;                          // 'Agencia de Aduanas Litoral S.A.S. Nivel 2'
  rol: RolContacto;
  proveedorId: Id | null;
  correo: string;
  whatsapp: string;                         // con indicativo: '+57 310 …', '+86 …'
  pais: string;
  idioma: 'es' | 'en';
  canalPreferido: 'whatsapp' | 'correo';
}

export const ESTADOS_IMPORTACION = [
  'cotizado', 'pedido_confirmado', 'anticipo_pagado', 'en_produccion', 'listo_despacho',
  'saldo_pagado', 'embarcado', 'en_transito', 'en_puerto', 'en_nacionalizacion',
  'nacionalizado', 'en_transporte_bogota', 'recibido_bodega',
] as const;
export type EstadoImportacion = typeof ESTADOS_IMPORTACION[number];

export interface HitoImportacion {
  estimada: FechaISO;
  real: FechaISO | null;
  nota: string | null;
  actualizadoPor: Id | null;                // usuario o 'portal-aduanas'
}
export type TipoDocumentoImportacion =
  | 'proforma' | 'factura_comercial' | 'lista_empaque' | 'bl' | 'guia_aerea' | 'declaracion_importacion';
export interface DocumentoImportacion {
  tipo: TipoDocumentoImportacion;
  numero: string;                           // ficticio, sin prefijos de navieras reales
  nombreArchivo: string;                    // 'Proforma_IMP-2026-07.pdf' (simulado)
  estado: 'pendiente' | 'recibido' | 'aprobado';
  fecha: FechaISO | null;
}
export interface LineaImportacion {
  id: Id;
  productoId: Id;
  cantidades: Record<Id, number>;           // varianteId → unidades pedidas
  costoUnitarioOrigen: Centavos;            // FOB por unidad en la moneda del pedido
}
export interface CostosImportacion {
  flete: MontoMoneda;
  seguro: MontoMoneda;                      // por defecto: parámetro × FOB
  honorariosAgente: COP;
  bodegajePuerto: COP;
  transporteInterno: COP;
  otros: COP;
  arancelPct: Fraccion;                     // copia editable del parámetro
  ivaImportacionPct: Fraccion;
  ivaSumaAlCosto: boolean;
}
export interface Importacion extends Trazabilidad, Eliminable {
  id: Id;
  numero: string;                           // 'IMP-2026-07' — único e inmutable (URL)
  proveedorId: Id;
  moneda: MonedaExtranjera;
  tasaPedido: number;                       // tasa usada al cotizar/confirmar
  fechaPedido: FechaISO;
  modalidad: 'maritimo' | 'aereo';
  contenedor: string;                       // 'Contenedor de 20 pies' · 'Carga suelta' · 'Aéreo'
  puertoOrigen: string;                     // 'Ningbo' · 'Shenzhen (Yantian)' · 'Guangzhou (Nansha)' · 'Shanghái'
  puertoDestino: 'Buenaventura' | 'Cartagena';
  lineas: LineaImportacion[];
  estado: EstadoImportacion;
  hitos: Record<EstadoImportacion, HitoImportacion>;
  controlManual: boolean;                   // true cuando el usuario cambió el estado: el generador ya no lo avanza
  documentos: DocumentoImportacion[];
  costos: CostosImportacion;
  metodoProrrateo: 'valor' | 'cantidad';
  costosAplicados: { ts: FechaHoraISO; tasaCosteo: number } | null;
  contactoIds: Id[];                        // cadena de esta importación (preseleccionados al notificar)
  recepcion: {
    fecha: FechaISO; recibidoPor: Id;
    lineas: Record<Id, { esperadas: number; recibidas: number; defectuosas: number }>;
    nota: string | null;
  } | null;
  cuentaPorPagarIds: Id[];                  // anticipo y saldo FOB (USD/CNY) y servicios de la cadena
  nota: string | null;
  // derivado: FOB total, pagado, saldo, tasa de costeo, costo aterrizado y por prenda,
  //           retraso, posición en la ruta, evento de llegada en el calendario, margen proyectado
}
```

### 6.12 Plata: cuentas, movimientos, por pagar, por cobrar y gastos (`dominio/tipos/finanzas.ts`)

```ts
export type TipoCuenta = 'caja' | 'banco' | 'billetera';
export interface CuentaDinero extends Trazabilidad, Eliminable {
  id: Id;
  nombre: string;                           // 'Caja Usaquén' · 'Cuenta corriente' · 'Nequi' · 'Daviplata'
  tipo: TipoCuenta;
  localId: Id | null;
  entidad: string | null;                   // banco ficticio genérico
  numeroEnmascarado: string | null;
  saldoInicial: COP;
  fechaSaldoInicial: FechaISO;              // inicio de la ventana
  orden: number;
  // derivado: saldo, libro (pagos de ventas + movimientos), pendientes de conciliar
}

export type TipoMovimientoCuenta =
  | 'gasto' | 'pago_cuenta_por_pagar' | 'nomina' | 'transferencia_salida' | 'transferencia_entrada'
  | 'consignacion' | 'aporte_socio' | 'retiro_socio' | 'otro_ingreso' | 'otro_egreso' | 'ajuste';
export interface MovimientoCuenta extends Trazabilidad {
  id: Id;
  cuentaId: Id;
  ts: FechaHoraISO;
  valor: COP;                               // con signo
  tipo: TipoMovimientoCuenta;
  descripcion: string;
  documento: RefDocumento | null;
  contraparte: string | null;
  montoOrigen: MontoConvertido | null;      // pagos en USD/CNY
  transferenciaId: Id | null;               // enlaza las dos patas de una transferencia
  conciliado: boolean;
}

export type CategoriaCxP =
  | 'proveedor_importacion' | 'proveedor_local' | 'arriendo' | 'servicios' | 'nomina'
  | 'seguridad_social' | 'impuestos' | 'agente_aduanas' | 'agente_carga' | 'transporte'
  | 'publicidad' | 'otro';
export interface AbonoCxP {
  id: Id;
  ts: FechaHoraISO;
  valorCOP: COP;
  montoOrigen: MontoConvertido | null;      // si la deuda está en USD/CNY: centavos pagados, tasa del día
  diferenciaCambio: COP | null;             // COP pagados − COP a la tasa del pedido
  cuentaId: Id;
  medio: 'transferencia' | 'efectivo' | 'pse' | 'giro_internacional' | 'debito_automatico';
  movimientoCuentaId: Id;
  soporte: Soporte | null;
}
export interface CuentaPorPagar extends Trazabilidad, Eliminable {
  id: Id;
  numero: string;                           // 'CP-000214'
  categoria: CategoriaCxP;
  terceroNombre: string;
  proveedorId: Id | null;
  empleadoId: Id | null;
  concepto: string;                         // 'Saldo 70 % IMP-2026-10 · Hangzhou Lanxin'
  localId: Id | null;
  moneda: Moneda;
  valor: number;                            // COP: pesos; USD/CNY: centavos
  fechaEmision: FechaISO;
  fechaVencimiento: FechaISO;
  programadaPara: FechaISO | null;
  abonos: AbonoCxP[];
  documento: RefDocumento | null;           // importación, gasto, liquidación…
  soporte: Soporte | null;
  nota: string | null;
  // derivado: saldo (en su moneda y en COP a la tasa vigente), estado (pendiente | programado |
  //           pago_parcial | pagado | vencido), días para vencer
}

/** Por cobrar es 100 % DERIVADO de ventas (separados y crédito). Este tipo es la forma del selector. */
export interface CuentaPorCobrar {
  ventaId: Id; numeroVenta: string; clienteId: Id | null; localId: Id;
  tipo: 'separado' | 'credito';
  total: COP; abonado: COP; saldo: COP;
  fechaVenta: FechaISO; fechaLimite: FechaISO | null;
  estado: 'al_dia' | 'por_vencer' | 'vencido' | 'cobrado';
  diasParaVencer: number | null;
}

export type CategoriaGasto =
  | 'arriendo' | 'servicios' | 'nomina' | 'seguridad_social' | 'publicidad' | 'transporte'
  | 'mantenimiento' | 'empaques' | 'comisiones_datafono' | 'impuestos' | 'otros';
export interface Gasto extends Trazabilidad, Eliminable {
  id: Id;
  fecha: FechaISO;
  localId: Id | null;                       // null = general
  categoria: CategoriaGasto;
  concepto: string;
  valor: COP;                               // total con IVA
  iva: COP;
  proveedorId: Id | null;
  estadoPago: 'pagado' | 'por_pagar';
  medio: string | null;
  cuentaId: Id | null;
  movimientoCuentaId: Id | null;
  cuentaPorPagarId: Id | null;
  recurrenteId: Id | null;
  documento: RefDocumento | null;           // liquidación, sesión de caja
  soporte: Soporte | null;
}
export interface GastoRecurrente extends Trazabilidad, Eliminable {
  id: Id;
  nombre: string;                           // 'Arriendo Zona Rosa'
  categoria: CategoriaGasto;
  localId: Id | null;
  valor: COP; iva: COP;
  diaDelMes: number;                        // 1–28
  proveedorId: Id | null;
  formaPago: 'cuenta_por_pagar' | 'debito_automatico';
  diasPlazo: number;
  cuentaId: Id | null;                      // débito automático
  desde: MesISO;
  hasta: MesISO | null;
  activo: boolean;
}
```

### 6.13 Calendario (`dominio/tipos/calendario.ts`)

```ts
export type TipoEvento = 'turno' | 'importacion' | 'vencimiento' | 'campana' | 'cita' | 'otro';
/** Solo campañas, citas, obligaciones y eventos libres se ALMACENAN. */
export interface EventoCalendario extends Trazabilidad, Eliminable {
  id: Id;
  tipo: Exclude<TipoEvento, 'turno' | 'importacion'>;
  subtipo: 'obligacion_tributaria' | 'obligacion_laboral' | 'campana_temporada' | 'asesoria' | 'toma_medidas' | 'seguimiento' | 'otro';
  titulo: string;
  inicio: FechaHoraISO;
  fin: FechaHoraISO | null;
  todoElDia: boolean;
  localId: Id | null;
  clienteId: Id | null;
  empleadoId: Id | null;
  descripcion: string | null;
  recordatorioMin: number | null;
}
/** Forma unificada que entrega el selector (almacenados + derivados de turnos, importaciones y cuentas por pagar). */
export interface EventoVista {
  id: string;                               // 'ev:<id>' · 'turno:<id>' · 'imp:<id>' · 'cxp:<id>'
  tipo: TipoEvento;
  titulo: string; inicio: FechaHoraISO; fin: FechaHoraISO | null; todoElDia: boolean;
  localId: Id | null;
  fuente: { tipo: 'evento' | 'turno' | 'importacion' | 'cuenta_por_pagar'; id: Id };
  movible: boolean;                         // arrastrar → comando de su fuente
  enlace: string;                           // ruta al detalle
}
```

### 6.14 Facturación simulada (`dominio/tipos/facturacion.ts`)

```ts
export interface ResolucionFacturacion {
  id: Id;
  numero: string;                           // ficticio: '18764000000000'
  prefijo: string;                          // 'HAL-FE'
  desde: number; hasta: number;
  vigenteDesde: FechaISO; vigenteHasta: FechaISO;
}
export type EstadoFactura = 'generada' | 'enviada' | 'aceptada';
export interface Adquirente {
  tipo: 'consumidor_final' | 'identificado';
  clienteId: Id | null;
  nombre: string;                           // 'Consumidor final' o nombre del cliente
  documento: string | null;
  correo: string | null;
}
export interface Factura extends Trazabilidad {
  id: Id;
  numero: string;                           // 'HAL-FE-1043'
  resolucionId: Id;
  ventaId: Id;
  ts: FechaHoraISO;
  adquirente: Adquirente;
  subtotal: COP; descuentos: COP; base: COP; iva: COP; total: COP;   // instantánea de la venta
  cufe: string;                             // 96 hex simulados
  qrTexto: string;                          // texto del QR (sin URL de la DIAN)
  estado: EstadoFactura;
  historial: { estado: EstadoFactura; ts: FechaHoraISO }[];
}
export interface NotaCredito extends Trazabilidad {
  id: Id;
  numero: string;                           // 'HAL-NC-0012'
  facturaId: Id;
  devolucionId: Id | null;                  // null si nace de una anulación
  ts: FechaHoraISO;
  motivo: string;
  base: COP; iva: COP; valor: COP;
  cude: string;
  estado: EstadoFactura;
}
```

### 6.15 Mensajería, notificaciones y alertas (`dominio/tipos/mensajeria.ts`)

```ts
export interface MensajeSaliente {          // libro (arreglo)
  id: Id;
  ts: FechaHoraISO;
  canal: 'whatsapp' | 'correo';
  destinatario: { tipo: 'contacto' | 'cliente' | 'empleado' | 'libre'; refId: Id | null; nombre: string; telefono: string | null; correo: string | null };
  idioma: 'es' | 'en';
  asunto: string | null;
  cuerpo: string;
  estado: 'enviado_simulado';
  origen: { tipo: 'importacion' | 'cobro' | 'cliente' | 'cumpleanos' | 'campana' | 'separado' | 'resumen_dueno'; id: Id | null };
  // derivado: enlaces wa.me y mailto: (lib/enlaces.ts)
}

export type TipoNotificacion =
  | 'importacion_estado' | 'portal_actualizacion' | 'venta_web' | 'cliente_instagram'
  | 'aprobacion_solicitada' | 'aprobacion_resuelta' | 'sistema';
export interface Notificacion {
  id: Id;
  ts: FechaHoraISO;
  tipo: TipoNotificacion;
  titulo: string;                           // 'Carolina Mejía actualizó IMP-2026-06: Nacionalizado'
  detalle: string;
  severidad: 'info' | 'atencion' | 'urgente';
  enlace: string;                           // ruta interna
  leida: boolean;
  origen: RefDocumento | null;
}

/** Alertas DERIVADAS (selector). Su id es estable para poder descartarlas. */
export type TipoAlerta =
  | 'stock_bajo' | 'agotado' | 'importacion_estado' | 'importacion_retrasada' | 'pago_por_vencer'
  | 'pago_vencido' | 'inasistencia' | 'llegada_tarde' | 'separado_por_vencer' | 'cumpleanos_vip'
  | 'mercancia_dormida' | 'aprobacion_pendiente' | 'conteo_con_diferencias' | 'caja_sin_cerrar';
export interface Alerta {
  id: string;                               // 'stock_bajo:<varianteId>@<localId>' · 'cxp:<id>:por_vencer' …
  tipo: TipoAlerta;
  modulo: 'inventario' | 'importaciones' | 'pagos' | 'personal' | 'clientes' | 'ventas';
  severidad: 'info' | 'atencion' | 'urgente';
  titulo: string;
  contexto: string;
  accion: { texto: string; ruta: string };
  ts: FechaHoraISO;
  localId: Id | null;
  nueva: boolean;                           // nacida de una notificación no leída
  prioridad: number;                        // orden en "Requiere tu atención" (01_estrategia 2.3.3)
}
```

### 6.16 Estado raíz (`dominio/tipos/estado.ts`)

```ts
export type TipoConsecutivo =
  | 'venta' | 'devolucion' | 'traslado' | 'conteo' | 'factura' | 'nota_credito'
  | 'cuenta_por_pagar' | 'liquidacion' | 'producto';
export interface MetaEstado {
  semilla: string;
  ancla: FechaISO;
  inicioVentana: FechaISO;
  generadoHasta: FechaHoraISO;
  versionGenerador: number;
  consecutivos: Record<TipoConsecutivo, number>;
  consecutivosImportacion: Record<string, number>;   // por año: { '2026': 10 }
  omitidosGenerador: number;                         // debe ser 0 sin registro (prueba)
  omitidosUsuario: { entradaId: Id; motivo: string }[];
  narrativa: NarrativaIds;                           // entidades guionadas (7.11)
}
export interface NarrativaIds {
  varianteOxfordM: Id; productoOxford: Id;
  importacionEnProduccion: Id; importacionEnTransito: Id; importacionEnPuerto: Id; importacionRetrasada: Id;
  cxpSaldoViernes: Id;
  vendedorPersona: Id; bodegaPersona: Id; vendedoraEstrella: Id; empleadoLlegadasTarde: Id;
  clienteFrecuente: Id; clienteVip: Id;
  solicitudDescuento: Id; solicitudTraslado: Id;
}

export interface EstadoDominio {
  meta: MetaEstado;
  empresa: Empresa;
  parametros: Parametros;
  usuarios: Tabla<UsuarioDemo>;
  locales: Tabla<Local>;
  tasas: Tabla<TasaCambio>;
  resoluciones: Tabla<ResolucionFacturacion>;
  // catálogo e inventario
  colores: Tabla<Color>;
  productos: Tabla<Producto>;
  variantes: Tabla<Variante>;
  movimientos: MovimientoInventario[];          // libro
  traslados: Tabla<Traslado>;
  conteos: Tabla<ConteoFisico>;
  // ventas
  ventas: Tabla<Venta>;
  devoluciones: Tabla<Devolucion>;
  sesionesCaja: Tabla<SesionCaja>;
  solicitudes: Tabla<SolicitudAprobacion>;
  clientes: Tabla<Cliente>;
  // personas
  empleados: Tabla<Empleado>;
  contratos: Tabla<Contrato>;
  esquemasComision: Tabla<EsquemaComision>;
  metas: Tabla<MetaVentas>;
  turnos: Tabla<Turno>;
  marcaciones: Tabla<Marcacion>;
  novedades: Tabla<Novedad>;
  liquidaciones: Tabla<LiquidacionNomina>;
  // compras
  proveedores: Tabla<Proveedor>;
  contactos: Tabla<Contacto>;
  importaciones: Tabla<Importacion>;
  // plata
  cuentas: Tabla<CuentaDinero>;
  movimientosCuenta: Tabla<MovimientoCuenta>;
  cuentasPorPagar: Tabla<CuentaPorPagar>;
  gastos: Tabla<Gasto>;
  gastosRecurrentes: Tabla<GastoRecurrente>;
  // agenda, documentos y comunicación
  eventos: Tabla<EventoCalendario>;
  facturas: Tabla<Factura>;
  notasCredito: Tabla<NotaCredito>;
  mensajes: MensajeSaliente[];                  // libro
  notificaciones: Tabla<Notificacion>;
  alertasDescartadas: Record<string, FechaHoraISO>;
  // agregados materializados (solo los escribe tx.ts; verificados por prueba)
  agregados: {
    existencias: Record<ClaveExistencia, number>;
  };
}
```

### 6.17 Registro, sobres y resultados (`dominio/tipos/comandos.ts`)

```ts
export interface SobreComando<C extends Comando = Comando> {
  id: Id;                       // id de la entrada (único)
  ts: FechaHoraISO;             // instante real (Bogotá) en que se emitió
  marcaAgua: FechaHoraISO;      // meta.generadoHasta de la sesión que lo emitió (generador: = ts)
  usuarioId: Id;
  rol: Rol | 'sistema' | 'portal' | 'tienda';
  origen: Origen;
  comando: C;
}
export type EntradaRegistro = SobreComando & { seq: number };   // seq: orden de emisión en la pestaña

export interface ErrorDominio { codigo: string; mensaje: string; campo?: string }   // mensaje en español, para el usuario
export type ResultadoComando =
  | { ok: true; eventos: EventoDominio[]; antes: EstadoDominio; despues: EstadoDominio }
  | { ok: false; error: ErrorDominio };

/** Catálogo cerrado: la clave es también la clave de permiso (config/permisos.ts). */
export interface MapaComandos {
  // Catálogo e inventario
  'producto.crear': DatosProducto & { productoId: Id; varianteIds: Record<string, Id> };   // clave `${talla}|${colorId}`
  'producto.editar': { productoId: Id; cambios: Partial<Omit<DatosProducto, 'referencia' | 'tallas' | 'colorIds'>> };
  'producto.eliminar': { productoId: Id; motivo: string | null };
  'variante.agregar': { productoId: Id; varianteId: Id; talla: string; colorId: Id };
  'variante.eliminar': { varianteId: Id };
  'color.crear': { colorId: Id; nombre: string; hex: string; codigo: string };
  'inventario.ajustar': { movimientoId: Id; varianteId: Id; localId: Id; nuevaCantidad: number; motivo: MotivoAjuste; nota: string | null };
  'traslado.solicitar': { trasladoId: Id; origenId: Id; destinoId: Id; lineas: { varianteId: Id; cantidad: number }[]; motivo: string | null; requiereAprobacion: boolean; solicitudId: Id | null };
  'traslado.despachar': { trasladoId: Id };
  'traslado.recibir': { trasladoId: Id; recibidas: Record<Id, number> | null; nota: string | null };
  'traslado.cancelar': { trasladoId: Id; motivo: string };
  'conteo.iniciar': { conteoId: Id; localId: Id; categorias: Categoria[] | null };
  'conteo.guardar': { conteoId: Id; cantidades: Record<Id, number> };
  'conteo.enviarAprobacion': { conteoId: Id; solicitudId: Id };
  'conteo.aplicar': { conteoId: Id; motivos: Record<Id, MotivoAjuste> };
  'conteo.cancelar': { conteoId: Id };
  // Ventas y caja
  'caja.abrir': { sesionId: Id; localId: Id; baseInicial: COP; turno: SesionCaja['turno'] };
  'caja.egreso': { egresoId: Id; sesionId: Id; concepto: string; valor: COP; categoria: CategoriaGasto };
  'caja.cerrar': { sesionId: Id; efectivoContado: COP; observacion: string | null };
  'venta.registrar': DatosRegistrarVenta;
  'venta.editar': { ventaId: Id; cambios: { clienteId?: Id | null; vendedorId?: Id; canal?: Canal; nota?: string | null; mediosPago?: { pagoId: Id; medio: MedioPago }[] } };
  'venta.anular': { ventaId: Id; motivo: string; reembolso: { medio: MedioPago; sesionCajaId: Id | null } | null; notaCreditoId: Id | null };
  'venta.abonar': { ventaId: Id; pago: DatosPago };
  'separado.cancelar': { ventaId: Id; destinoAbonos: 'reembolso' | 'saldo_favor'; reembolso: { medio: MedioPago; sesionCajaId: Id | null } | null };
  'devolucion.registrar': DatosDevolucion;
  'pago.conciliar': { refs: ({ tipo: 'pago_venta'; ventaId: Id; pagoId: Id } | { tipo: 'movimiento'; movimientoId: Id })[]; conciliado: boolean };
  'aprobacion.solicitar': { solicitudId: Id; datos: Extract<SolicitudAprobacion['datos'], { tipo: 'descuento' }> };
  'aprobacion.resolver': { solicitudId: Id; decision: 'aprobada' | 'rechazada'; nota: string | null };
  // Clientes y mensajes
  'cliente.crear': { clienteId: Id; datos: DatosCliente };
  'cliente.editar': { clienteId: Id; cambios: Partial<DatosCliente> };
  'cliente.eliminar': { clienteId: Id; motivo: string | null };
  'cliente.nota': { notaId: Id; clienteId: Id; texto: string };
  'mensaje.registrar': { mensajes: Omit<MensajeSaliente, 'estado'>[] };
  // Compras
  'proveedor.crear': { proveedorId: Id; datos: DatosProveedor };
  'proveedor.editar': { proveedorId: Id; cambios: Partial<DatosProveedor> };
  'proveedor.eliminar': { proveedorId: Id; motivo: string | null };
  'contacto.crear': { contactoId: Id; datos: DatosContacto };
  'contacto.editar': { contactoId: Id; cambios: Partial<DatosContacto> };
  'contacto.eliminar': { contactoId: Id };
  'importacion.crear': DatosImportacion & { importacionId: Id };
  'importacion.editar': { importacionId: Id; cambios: Partial<DatosImportacion> };
  'importacion.eliminar': { importacionId: Id; motivo: string | null };
  'importacion.cambiarEstado': { importacionId: Id; estado: EstadoImportacion; fecha: FechaISO; nota: string | null; origen: 'panel' | 'portal' | 'sistema'; autor: string | null };
  'importacion.actualizarHitos': { importacionId: Id; estimadas: Partial<Record<EstadoImportacion, FechaISO>> };
  'importacion.actualizarCostos': { importacionId: Id; costos: CostosImportacion; metodoProrrateo: 'valor' | 'cantidad' };
  'importacion.aplicarCostos': { importacionId: Id; tasaCosteo: number | null };   // null = la calculada
  'importacion.registrarPago': { importacionId: Id; cxpId: Id; abonoId: Id; centavos: Centavos; tasa: number; fecha: FechaISO; cuentaId: Id };
  'importacion.documento': { importacionId: Id; documento: DocumentoImportacion };
  'importacion.recibir': { importacionId: Id; fecha: FechaISO; lineas: Record<Id, { recibidas: number; defectuosas: number }>; nota: string | null;
                           distribucion: { trasladoId: Id; destinoId: Id; lineas: { varianteId: Id; cantidad: number }[] }[] };
  // Plata
  'cxp.crear': { cxpId: Id; datos: DatosCxP };
  'cxp.editar': { cxpId: Id; cambios: Partial<DatosCxP> };
  'cxp.eliminar': { cxpId: Id; motivo: string | null };
  'cxp.programar': { cxpId: Id; fecha: FechaISO | null };
  'cxp.pagar': { cxpId: Id; abonoId: Id; fecha: FechaISO; valorCOP: COP | null; centavos: Centavos | null; tasa: number | null; cuentaId: Id; medio: AbonoCxP['medio']; soporte: Soporte | null };
  'cuenta.crear': { cuentaId: Id; datos: DatosCuenta };
  'cuenta.editar': { cuentaId: Id; cambios: Partial<DatosCuenta> };
  'cuenta.transferir': { transferenciaId: Id; origenId: Id; destinoId: Id; valor: COP; fecha: FechaISO; descripcion: string };
  'cuenta.movimiento': { movimientoId: Id; cuentaId: Id; valor: COP; tipo: 'aporte_socio' | 'retiro_socio' | 'otro_ingreso' | 'otro_egreso' | 'ajuste'; fecha: FechaISO; descripcion: string };
  // Gastos
  'gasto.registrar': { gastoId: Id; datos: DatosGasto; pago: { tipo: 'inmediato'; cuentaId: Id; medio: string } | { tipo: 'por_pagar'; vence: FechaISO; cxpId: Id } };
  'gasto.editar': { gastoId: Id; cambios: Partial<DatosGasto> };
  'gasto.eliminar': { gastoId: Id; motivo: string | null };
  'gastoRecurrente.crear': { recurrenteId: Id; datos: DatosGastoRecurrente };
  'gastoRecurrente.editar': { recurrenteId: Id; cambios: Partial<DatosGastoRecurrente> };
  'gastoRecurrente.eliminar': { recurrenteId: Id };
  'gastoRecurrente.generarMes': { mes: MesISO };
  // Personal y nómina
  'empleado.crear': { empleadoId: Id; contratoId: Id; datos: DatosEmpleado; contrato: DatosContrato };
  'empleado.editar': { empleadoId: Id; cambios: Partial<DatosEmpleado> };
  'empleado.retirar': { empleadoId: Id; fecha: FechaISO; motivo: string };
  'contrato.reemplazar': { empleadoId: Id; contratoId: Id; desde: FechaISO; contrato: DatosContrato };
  'esquemaComision.crear': { esquemaId: Id; datos: Omit<EsquemaComision, 'id' | keyof Trazabilidad | keyof Eliminable> };
  'esquemaComision.editar': { esquemaId: Id; cambios: Partial<Omit<EsquemaComision, 'id' | keyof Trazabilidad | keyof Eliminable>> };
  'esquemaComision.eliminar': { esquemaId: Id };
  'meta.fijar': { metaId: Id; localId: Id; mes: MesISO; valor: COP };
  'turno.asignar': { turnoId: Id; empleadoId: Id; localId: Id; fecha: FechaISO; tipo: TipoTurno; inicio: HoraHHmm; fin: HoraHHmm; descansoMin: number; aceptarExceso: boolean };
  'turno.mover': { turnoId: Id; fecha: FechaISO; empleadoId: Id; localId: Id; tipo: TipoTurno; inicio: HoraHHmm; fin: HoraHHmm; aceptarExceso: boolean };
  'turno.eliminar': { turnoId: Id };
  'turno.copiarSemana': { localId: Id; lunesOrigen: FechaISO; lunesDestino: FechaISO; aceptarExceso: boolean };   // IDs derivados: `${turnoOrigenId}>${lunesDestino}`
  'marcacion.registrar': { marcacionId: Id; empleadoId: Id; localId: Id; tipo: 'entrada' | 'salida'; ts: FechaHoraISO };
  'marcacion.corregir': { marcacionId: Id; ts: FechaHoraISO; nota: string };
  'marcacion.eliminar': { marcacionId: Id; nota: string };
  'novedad.registrar': { novedadId: Id; datos: DatosNovedad };
  'novedad.editar': { novedadId: Id; cambios: Partial<DatosNovedad> };
  'novedad.eliminar': { novedadId: Id };
  'pila.verificar': { contratoId: Id; periodo: MesISO; verificada: boolean; soporte: Soporte | null };
  'nomina.aprobar': { liquidacionId: Id; periodo: PeriodoNomina; exoneracion114: boolean; insumos: Record<Id, InsumosLiquidacion> | null };  // null = calcular de asistencia/ventas
  'nomina.pagar': { liquidacionId: Id; fecha: FechaISO; cuentaId: Id };
  'nomina.anularAprobacion': { liquidacionId: Id };
  // Calendario
  'evento.crear': { eventoId: Id; datos: DatosEvento };
  'evento.editar': { eventoId: Id; cambios: Partial<DatosEvento> };
  'evento.eliminar': { eventoId: Id };
  // Facturación
  'factura.emitir': { facturaId: Id; ventaId: Id; adquirente: Adquirente };
  'factura.avanzarEstado': { facturaId: Id; estado: 'enviada' | 'aceptada' };
  'notaCredito.emitir': { notaId: Id; facturaId: Id; devolucionId: Id | null; motivo: string };
  // Notificaciones y alertas
  'notificacion.marcarLeida': { ids: Id[] | 'todas' };
  'alerta.descartar': { alertaId: string };
  // Configuración
  'empresa.editar': { cambios: Partial<Empresa> };
  'local.crear': { localId: Id; datos: DatosLocal };
  'local.editar': { localId: Id; cambios: Partial<DatosLocal> };
  'local.eliminar': { localId: Id; motivo: string | null };
  'tasa.registrar': { tasaId: Id; moneda: MonedaExtranjera; fecha: FechaISO; valor: number };
  'tasa.eliminar': { tasaId: Id };
  'parametros.editar': { seccion: keyof Parametros; cambios: Record<string, unknown> };   // validado por sección
  'resolucion.editar': { resolucionId: Id; cambios: Partial<ResolucionFacturacion> };
  'usuario.crear': { usuarioId: Id; datos: DatosUsuario };
  'usuario.editar': { usuarioId: Id; cambios: Partial<DatosUsuario> };
  'usuario.eliminar': { usuarioId: Id };
}
export type TipoComando = keyof MapaComandos;
export type Comando = { [K in TipoComando]: { tipo: K; datos: MapaComandos[K] } }[TipoComando];

// --- Datos de entrada principales ---
export interface DatosPago { medio: MedioPago; valor: COP; recibido: COP | null; referencia: string | null; sesionCajaId: Id | null }   // id derivado
export interface DatosRegistrarVenta {
  ventaId: Id;
  ts: FechaHoraISO | null;                 // null = ts del sobre; el generador lo fija
  localId: Id;
  vendedorId: Id;
  canal: Canal;
  tipo: TipoVenta;
  clienteId: Id | null;
  clienteNuevo: (DatosCliente & { clienteId: Id }) | null;   // creación rápida en el mismo paso
  lineas: { varianteId: Id; cantidad: number; precioLista: COP | null; descuento: Descuento | null }[];  // precioLista null = el del producto
  descuentoGlobal: Descuento | null;
  aprobacionDescuentoId: Id | null;
  pagos: DatosPago[];                      // separado: abono inicial; crédito: puede ir vacío
  fechaLimiteSeparado: FechaISO | null;
  ventaOrigenCambioId: Id | null;
  facturaInmediata: { facturaId: Id; adquirente: Adquirente } | null;
  nota: string | null;
}
export interface DatosDevolucion {
  devolucionId: Id;
  ventaId: Id;
  lineas: { lineaId: Id; cantidad: number; reingresa: boolean }[];
  motivo: string;
  compensacion: CompensacionDevolucion;
  reembolso: { medio: MedioPago; sesionCajaId: Id | null } | null;
  notaCreditoId: Id | null;                // obligatorio si la venta tiene factura
}
export type DatosProducto = Pick<Producto,
  'referencia' | 'nombre' | 'categoria' | 'linea' | 'tipoPrenda' | 'curvaTallas' | 'temporada' | 'proveedorId' |
  'material' | 'descripcion' | 'precioVenta' | 'tarifaIva' | 'stockMinimo' | 'publicadoEnTienda' | 'destacado' | 'etiquetas'>
  & { tallas: string[]; colorIds: Id[]; costoManual: COP | null };
export type DatosCliente = Omit<Cliente, 'id' | 'notas' | keyof Trazabilidad | keyof Eliminable>;
export type DatosProveedor = Omit<Proveedor, 'id' | keyof Trazabilidad | keyof Eliminable>;
export type DatosContacto = Omit<Contacto, 'id' | keyof Trazabilidad | keyof Eliminable>;
export type DatosImportacion = Pick<Importacion,
  'proveedorId' | 'moneda' | 'tasaPedido' | 'fechaPedido' | 'modalidad' | 'contenedor' | 'puertoOrigen' |
  'puertoDestino' | 'lineas' | 'contactoIds' | 'costos' | 'metodoProrrateo' | 'nota'> & { numero: string | null };
export type DatosCxP = Pick<CuentaPorPagar,
  'categoria' | 'terceroNombre' | 'proveedorId' | 'empleadoId' | 'concepto' | 'localId' | 'moneda' | 'valor' |
  'fechaEmision' | 'fechaVencimiento' | 'documento' | 'soporte' | 'nota'>;
export type DatosCuenta = Pick<CuentaDinero, 'nombre' | 'tipo' | 'localId' | 'entidad' | 'numeroEnmascarado' | 'saldoInicial' | 'fechaSaldoInicial' | 'orden'>;
export type DatosGasto = Pick<Gasto, 'fecha' | 'localId' | 'categoria' | 'concepto' | 'valor' | 'iva' | 'proveedorId' | 'soporte' | 'documento'>;
export type DatosGastoRecurrente = Omit<GastoRecurrente, 'id' | keyof Trazabilidad | keyof Eliminable>;
export type DatosEmpleado = Omit<Empleado, 'id' | 'contratoVigenteId' | keyof Trazabilidad | keyof Eliminable>;
export type DatosContrato = Omit<Contrato, 'id' | 'empleadoId' | keyof Trazabilidad>;
export type DatosNovedad = Omit<Novedad, 'id' | keyof Trazabilidad | keyof Eliminable>;
export type DatosEvento = Omit<EventoCalendario, 'id' | keyof Trazabilidad | keyof Eliminable>;
export type DatosLocal = Omit<Local, 'id' | keyof Trazabilidad | keyof Eliminable>;
export type DatosUsuario = Omit<UsuarioDemo, 'id' | keyof Trazabilidad | keyof Eliminable>;
```

### 6.18 Eventos de dominio y de interfaz (`dominio/tipos/eventos.ts`)

```ts
export type EventoDominio =
  | { tipo: 'VentaRegistrada'; ventaId: Id; localId: Id; vendedorId: Id; clienteId: Id | null; canal: Canal; total: COP; origen: Origen }
  | { tipo: 'VentaEditada'; ventaId: Id; campos: string[] }
  | { tipo: 'VentaAnulada'; ventaId: Id }
  | { tipo: 'AbonoRegistrado'; ventaId: Id; valor: COP; saldo: COP }
  | { tipo: 'SeparadoCerrado'; ventaId: Id; resultado: 'completado' | 'cancelado' }
  | { tipo: 'DevolucionRegistrada'; devolucionId: Id; ventaId: Id; valor: COP }
  | { tipo: 'InventarioMovido'; cambios: { varianteId: Id; localId: Id; antes: number; despues: number }[] }
  | { tipo: 'StockBajo'; varianteId: Id; localId: Id; existencia: number; minimo: number }
  | { tipo: 'TrasladoCambiado'; trasladoId: Id; estado: EstadoTraslado }
  | { tipo: 'ConteoAplicado'; conteoId: Id; diferencias: number }
  | { tipo: 'ImportacionEstadoCambiado'; importacionId: Id; de: EstadoImportacion; a: EstadoImportacion; origen: 'panel' | 'portal' | 'sistema' }
  | { tipo: 'ImportacionRecibida'; importacionId: Id; unidades: number }
  | { tipo: 'CostosAplicados'; importacionId: Id; productos: { productoId: Id; antes: COP; despues: COP }[] }
  | { tipo: 'CajaAbierta' | 'CajaCerrada'; sesionId: Id; localId: Id; diferencia?: COP }
  | { tipo: 'PagoRegistrado'; cxpId: Id; valorCOP: COP }
  | { tipo: 'GastoRegistrado'; gastoId: Id }
  | { tipo: 'NominaAprobada' | 'NominaPagada'; liquidacionId: Id }
  | { tipo: 'MarcacionRegistrada'; empleadoId: Id; tipoMarcacion: 'entrada' | 'salida'; ts: FechaHoraISO }
  | { tipo: 'TurnoCambiado'; turnoId: Id }
  | { tipo: 'ClienteCreado'; clienteId: Id; origen: OrigenCliente }
  | { tipo: 'MensajesRegistrados'; ids: Id[] }
  | { tipo: 'FacturaEmitida'; facturaId: Id; ventaId: Id }
  | { tipo: 'FacturaEstado'; facturaId: Id; estado: EstadoFactura }
  | { tipo: 'NotaCreditoEmitida'; notaId: Id }
  | { tipo: 'NotificacionCreada'; notificacionId: Id }
  | { tipo: 'AprobacionSolicitada' | 'AprobacionResuelta'; solicitudId: Id }
  | { tipo: 'TasaRegistrada'; moneda: MonedaExtranjera; valor: number }
  | { tipo: 'ParametrosEditados'; seccion: keyof Parametros }
  | { tipo: 'EntidadCambiada'; coleccion: keyof EstadoDominio; id: Id; accion: 'creada' | 'editada' | 'eliminada' };

/** Eventos de interfaz para la guía (no cambian datos). */
export type EventoUI =
  | 'moneda_cambiada' | 'rol_cambiado' | 'local_cambiado' | 'flujo_caja_visto' | 'costo_empleador_visto'
  | 'whatsapp_escenario_completado' | 'whatsapp_respondido' | 'qr_abierto' | 'app_abierta'
  | 'tabla_dinamica_modificada' | 'pdf_generado' | 'excel_generado' | 'tienda_abierta' | 'portal_enviado';
```

El bus entrega cada evento junto con el `origen`, el `usuarioId` y el `rol` del sobre que lo produjo, para distinguir acciones del usuario de las del generador. "Prueba esto" (01_estrategia 2.4) se marca con: ítem 1 `VentaRegistrada` con `origen: 'usuario'` y `canal: 'local'`; 2 `TrasladoCambiado` (solicitado, usuario); 3 `ImportacionEstadoCambiado` (`origen: 'panel'`); 4 `flujo_caja_visto`; 5 `costo_empleador_visto`; 6 `rol_cambiado` a vendedor o bodega; 7 `whatsapp_escenario_completado` o `whatsapp_respondido`; 8 `qr_abierto` o `app_abierta`. "Para ir más lejos": `moneda_cambiada`, `tabla_dinamica_modificada`, `pdf_generado`, `VentaRegistrada` con `canal: 'web'`, `portal_enviado`.

### 6.19 Reglas de dominio (invariantes)

Cada regla tiene una prueba en `generador/coherencia.test.ts` o en la prueba del comando.

**Inventario**
- I1. `existencias[v@l] = Σ movimientos(v, l).cantidad` en todo momento; el agregado solo lo escribe `tx.moverInventario`.
- I2. Ninguna existencia es negativa, ni al final ni en ningún punto del kardex recorrido en orden de `ts`.
- I3. Toda línea de venta no anulada tiene exactamente un movimiento `salida_venta` o `salida_separado` por su cantidad, en el local de la venta. Toda devolución con `reingresa` tiene su `devolucion_cliente`. Toda anulación, su `reingreso_anulacion`.
- I4. Un traslado `en_transito` tiene su `traslado_salida` en origen y ninguna entrada; uno `recibido`, su salida y su entrada (`recibida` puede ser menor: la diferencia queda como ajuste `perdida` en destino con nota).
- I5. Toda unidad que existe entró por una importación recibida (o por un ajuste/compra con documento). El generador no usa saldos iniciales: las primeras importaciones se reciben en los primeros días de la ventana.
- I6. La bodega no vende; las ventas web salen del local de despacho (`parametros.ventas.localDespachoWebId`).

**Ventas y plata**
- V1. Por línea: `totalFinal = precioLista × cantidad − descuentoAsignado`; `base = redondear(totalFinal / (1 + tarifaIva))`; `iva = totalFinal − base`. Por venta: `total = Σ totalFinal`, `base = Σ base`, `iva = Σ iva`, `descuentos = Σ descuentoAsignado`. Nunca se redondea a nivel de venta.
- V2. Venta de contado: `Σ pagos.valor = total`. Efectivo: `recibido ≥ valor`, `cambio = recibido − valor`. Separado: abono inicial `≥ abonoMinimo × total`. Crédito: requiere cliente.
- V3. `saldo(venta) = max(0, total − Σ devoluciones.valorTotal − Σ pagos.valor)` (los reembolsos entran como pagos negativos). Si la cuenta da negativa, el excedente no es saldo de la venta: es **saldo a favor del cliente**, que se deriva como Σ devoluciones y separados cancelados con compensación `saldo_favor` − Σ pagos con medio `saldo_a_favor`.
- V4. **Venta reconocida** (la que suma en Inicio, Ventas, Análisis, comisiones, clientes y reportes): toda venta no anulada y no separado cancelado, en la fecha de su `ts`, por su `total` con IVA. Las devoluciones restan en **su** fecha. Un separado activo es venta reconocida (la prenda ya salió) y su saldo es plata por cobrar. Una sola función, `hechosDeVenta()`, aplica esta regla para todo el sistema.
- V5. Las cifras de ventas se muestran **con IVA** (lo que vendió el comerciante); el estado de resultados, los márgenes y la comisión con base `base_sin_iva` usan la base sin IVA. Cada vista lo dice.
- V6. `costoUnitario` de una línea es la instantánea de `Producto.costoVigente` al vender. Margen de la línea = `base − costoUnitario × cantidad`.
- V7. `saldo(cuenta) = saldoInicial + Σ pagos de venta con cuentaId = cuenta + Σ movimientosCuenta(cuenta)`. Las cajas y el banco nunca quedan negativos en ningún punto (el generador hace consignaciones y retiros del socio para mantener las bandas; la prueba lo verifica).
- V8. `efectivoEsperado(sesión) = base + Σ pagos efectivo de la sesión − Σ egresos − Σ reembolsos en efectivo`. Al cerrar se guarda la instantánea y la diferencia.
- V9. Estado de una cuenta por pagar: `pagado` si saldo ≤ 0; `vencido` si `fechaVencimiento < hoy`; `programado` si `programadaPara`; `pago_parcial` si hay abonos; si no, `pendiente`. Derivado, nunca almacenado.
- V10. Pagos en USD/CNY: `cop = redondear(centavos / 100 × tasa)`; `diferenciaCambio = cop − redondear(centavos / 100 × tasaPedido)`.

**Importaciones**
- M1. Los estados solo avanzan en el orden de `ESTADOS_IMPORTACION`; se puede saltar hacia adelante (los hitos intermedios quedan con la misma fecha real) y retroceder **un** paso como corrección (solo el dueño). Al avanzar se recalculan las fechas estimadas de los hitos siguientes desplazándolas por el adelanto o retraso.
- M2. `recibido_bodega` solo se alcanza con `importacion.recibir` (que crea las entradas). `importacion.cambiarEstado` a ese estado se rechaza con el mensaje "Registra la recepción en Inventario → Recepción".
- M3. Retraso = días entre hoy (o la fecha real) y la fecha estimada del **siguiente** hito, si es positiva.
- M4. Costo aterrizado (6.20.3): la suma de los costos prorrateados por línea es exactamente el total (mayor residuo).
- M5. `importacion.aplicarCostos` fija `costoVigente` de cada producto de la importación (y anota el historial). `importacion.recibir` lo hace automáticamente si aún no se aplicó.
- M6. Pedido confirmado ⇒ existen dos cuentas por pagar en la moneda del pedido: anticipo (30 %) y saldo (70 %), con vencimientos en los hitos `anticipo_pagado` y `saldo_pagado`.

**Personas**
- P1. La comisión de un empleado en un periodo se **deriva** de sus ventas reconocidas menos devoluciones del periodo con su esquema vigente. Cambiar el vendedor de una venta mueve la comisión.
- P2. Horas programadas de la semana ≤ `jornadaMaximaSemanal` vigente para esa semana, salvo `excedeJornadaAceptado` (la diferencia son horas extra previstas).
- P3. Marcaciones alternan entrada/salida por empleado y día; no hay salida sin entrada.
- P4. Una liquidación aprobada es una **instantánea** (con los parámetros usados) y no cambia si luego se editan ventas, marcaciones o parámetros. El periodo abierto siempre es vista previa derivada.
- P5. Nota "Cálculo ilustrativo para la demo. Los valores se parametrizan y validan con el contador en la implementación." en todo cálculo de nómina (componente `<NotaLegal tipo="nomina">`).

**Generales**
- G1. Las ventas no se eliminan: se anulan (con motivo, solo dueño). Los movimientos no se eliminan: se compensan.
- G2. Ningún registro generado tiene `ts` posterior a `ahora`, salvo lo planeado (turnos futuros, eventos, fechas estimadas, vencimientos).
- G3. Una entidad eliminada no se puede usar en un comando nuevo (el generador tampoco la elige).
- G4. Un local con existencias o con caja abierta no se puede eliminar; un producto con existencias tampoco ("Tiene 14 unidades en existencia; trasládalas o ajústalas antes de eliminarlo").

### 6.20 Fórmulas

**6.20.1 Descuentos y prorrateo.** `descLinea` = `redondear(bruto × pct)` o `min(valor, bruto)`. El descuento global (% sobre `Σ(bruto − descLinea)` o valor) se reparte entre líneas en proporción a `bruto − descLinea` con el método del **mayor residuo** (las partes suman exactamente el global). `descuentoAsignado = descLinea + parteGlobal`. Si el descuento efectivo de la venta supera `descuentoMaximoVendedor` y el rol es vendedor, se exige `aprobacionDescuentoId` aprobada, del mismo vendedor, con porcentaje ≥ al aplicado y sin usar.

**6.20.2 Devoluciones.** Valor devuelto de una línea = `redondear(totalFinal × cantidadDevuelta / cantidadVendida)`; la última devolución de la línea toma el remanente exacto. Base, IVA y costo se prorratean igual.

**6.20.3 Costo aterrizado** (`reglas/costeo.ts`, función pura `calcularCostoAterrizado(importacion, parametros, tasaCosteo)` usada por la calculadora, el "¿Y si el dólar sube?" y `aplicarCostos`):
```
FOB_origen      = Σ_líneas Σ_variantes cantidad × costoUnitarioOrigen               (centavos)
tasaCosteo      = promedio ponderado de las tasas de los abonos ya pagados al proveedor,
                  y la tasa vigente para lo no pagado (override: simulación ±10 %)
FOB_COP         = redondear(FOB_origen / 100 × tasaCosteo)
flete, seguro   = a COP con tasaCosteo si vienen en USD/CNY
CIF             = FOB_COP + flete + seguro
arancel         = redondear(CIF × arancelPct)
ivaImportacion  = redondear((CIF + arancel) × ivaImportacionPct)     → suma al costo solo si ivaSumaAlCosto
total           = CIF + arancel + (ivaImportacion?) + honorariosAgente + bodegajePuerto + transporteInterno + otros
peso(línea)     = valor: FOB de la línea / FOB total · cantidad: unidades de la línea / unidades totales
costoLínea      = reparto de `total` por peso con mayor residuo
costoUnitario   = redondear(costoLínea / unidades de la línea)     (costo por prenda en COP)
```
El resultado incluye la cascada (FOB → +flete → +seguro → +arancel → +IVA → +agente → +puerto → +transporte) para el gráfico de W4, y el margen por producto con `precioVenta / (1 + iva)`.

**6.20.4 Comisiones** (`reglas/comisiones.ts`): base del periodo = Σ de las ventas reconocidas del vendedor (`total_con_iva` o `base_sin_iva` según el esquema) − devoluciones del periodo. `porcentaje`: base × %. `escalonado` (sobre la venta del **mes**): `total` aplica el % del tramo alcanzado a toda la base; `marginal` aplica cada % a la porción dentro de su tramo. `bono_meta_local`: si ventas del local en el mes ≥ meta × `cumplimientoMinimo`, suma el valor. Las comisiones se liquidan mensualmente (en la 2.ª quincena para los quincenales). La "comisión del mes" que ven Inicio, el POS (W1) y el vendedor (W8) es la del mes en curso hasta hoy.

**6.20.5 Nómina laboral** (`reglas/nomina.ts`, función pura `liquidarLaboral(contrato, insumos, parametros, exoneracion)`):
```
valorDia        = salarioBase / 30
horasMes        = jornadaSemanalVigente × 30 / 7                       (42 h → 180 h)
valorHora       = salarioBase / horasMes
salario         = valorDia × diasLaborados
incapacidad     = valorDia × diasIncapacidad × porcentajePago (mín. SMMLV/30 por día)
vacaciones      = valorDia × diasVacaciones
auxilio         = salarioBase ≤ topeAuxilioSMMLV × SMMLV ? auxilioTransporte / 30 × diasLaborados : 0
extras          = horasExtraDiurnas × valorHora × (1 + extraDiurna) + horasExtraNocturnas × valorHora × (1 + extraNocturna)
recargos        = horasRecargoNocturno × valorHora × nocturno + horasDominicalFestivo × valorHora × dominicalFestivo
comisiones      = 6.20.4 (solo en el periodo que liquida el mes)
totalDevengado  = salario + incapacidad + vacaciones + auxilio + extras + recargos + comisiones + bonos
IBC             = max(totalDevengado − auxilio, SMMLV × diasPeriodo / 30)
salud, pensión trabajador = IBC × 4 % c/u;  fondoSolidaridad = IBC × % del tramo (IBC mensualizado ≥ 4 SMMLV)
exonerado       = exoneracion114.activa && IBC mensualizado < 10 SMMLV
aportes         = salud 8,5 % (0 si exonerado) + pensión 12 % + ARL(riesgo) + caja 4 % + ICBF 3 % (0 si exonerado) + SENA 2 % (0 si exonerado), sobre IBC
basePrestaciones= salario + incapacidad + vacaciones + extras + recargos + comisiones + auxilio
cesantías       = basePrestaciones × 8,33 %;  intereses = cesantías × 12 %;  prima = basePrestaciones × 8,33 %
vacacionesProv  = (salario + comisiones) × 4,17 %
neto            = totalDevengado − (salud + pensión + fondoSolidaridad)
costoEmpleador  = totalDevengado + aportes + provisiones
```
Cada valor se redondea a peso. Verificación con el caso de 01_estrategia W6: salario $1.950.000 mensual sin comisiones ⇒ costo ≈ $2.990.939 con exoneración y ≈ $3.254.189 sin ella (prueba unitaria exacta).

**6.20.6 Prestación de servicios.** `bruto = honorarios × días/30 + comisiones`; `retención = bruto × retencionFuente`; `neto = bruto − retención`; `costo = bruto`. `ibcContratista = 40 % de honorarios` (informativo). Si `pilaVerificada` es falso para el mes, la liquidación muestra advertencia y la cuenta por pagar queda "pendiente de soporte PILA".

**6.20.7 Asistencia** (`reglas/asistencia.ts`): por empleado y día, se cruza el turno con la primera entrada y la última salida. `minutosTarde = max(0, entrada − inicio − tolerancia)`. Ausente: turno pasado sin entrada y sin novedad. Horas trabajadas = salida − entrada − descanso. Ordinarias = min(trabajadas, programadas). Extra = excedente sobre lo programado (diurna o nocturna según la franja). Recargo nocturno = horas ordinarias entre `jornadaNocturna.inicio` y `fin`. Dominical/festivo = horas en domingo o festivo (`reglas/festivos.ts`). Los insumos de una liquidación son la suma del periodo (cuando no hay marcaciones —meses antiguos— el generador entrega `insumos` explícitos).

**6.20.8 Segmentación** (`reglas/segmentacion.ts`), en este orden: **nuevo** si la primera compra (o el registro, si no ha comprado) fue hace ≤ 60 días; **en riesgo** si la última compra fue hace > 90 días; **VIP** si compró ≥ $3.000.000 en los últimos 12 meses; **frecuente** si tiene ≥ 3 compras en 12 meses; **ocasional** el resto.

**6.20.9 Flujo de caja proyectado** (`selFlujoProyectado(dias, hoy)`): saldo inicial = Σ saldos de cajas, banco y billeteras hoy. Ingresos por día = promedio de cobros de ventas de contado de las últimas 8 semanas para ese día de la semana × (índice estacional del mes / índice del mes actual) + abonos esperados de separados (saldo repartido hasta su fecha límite) . Egresos = cuentas por pagar pendientes en `programadaPara ?? fechaVencimiento` (USD/CNY a la tasa vigente) + ocurrencias futuras de gastos recurrentes + quincenas futuras (costo de la última liquidación) + PILA del mes. Resultado: serie diaria (real hasta hoy, proyectada después), punto más bajo y los pagos que lo explican.

**6.20.10 Estado de resultados** (`selEstadoResultados(rango, localId, prorratearGenerales)`): ventas netas sin IVA (base de ventas reconocidas − base devuelta) − costo de la mercancía vendida (Σ costoUnitario × cantidad − costo devuelto que reingresó) = utilidad bruta − gastos operativos (Σ gastos del periodo, sin IVA si `ivaGastosDescontable`; generales prorrateados por participación en ventas si se pide) = utilidad operativa. Las compras de mercancía no son gasto: son inventario. Punto de equilibrio del local = gastos fijos del local / margen bruto %.

**6.20.11 Conversión para mostrar.** `mostrar(cop, moneda) = moneda === 'COP' ? cop : cop / tasaVigente(moneda, hoy)`; decimales: 0 para COP, 2 para USD/CNY. Las cifras de origen extranjero (FOB, abonos a fábricas) muestran además su monto original.

### 6.21 Catálogo de acciones de dominio

Convenciones de la tabla: **Valida** = validaciones principales (mensajes en español); **Modifica** = colecciones que escribe; **Emite** = eventos; **Roles** = quién puede (D/V/B; G = generador). Toda acción emite además `EntidadCambiada` cuando corresponde. Las acciones de crear/editar/eliminar simples comparten una fábrica (`crud(coleccion, validar)`) en `comandos/tx.ts`.

| Comando | Valida | Modifica | Emite | Roles |
|---|---|---|---|---|
| `venta.registrar` | Local que vende; vendedor activo; ≥ 1 línea; existencias del local ≥ cantidades; descuento ≤ máximo o aprobación válida; pagos según V2; efectivo en local ⇒ sesión de caja abierta del local; saldo a favor suficiente; separado: fecha límite ≤ hoy + 30 | `ventas` (consecutivo, totales V1, costo instantáneo), `movimientos` + `agregados.existencias`, `clientes` (si `clienteNuevo`), `solicitudes` (marca aprobación usada), `facturas` (si `facturaInmediata`), `notificaciones` (canal web) | `VentaRegistrada`, `InventarioMovido`, `StockBajo`, `ClienteCreado`, `FacturaEmitida`, `NotificacionCreada` | D V G (tienda: `tienda-web`) |
| `venta.editar` | Venta no anulada; solo campos permitidos; cambio de medios conserva valores | `ventas` | `VentaEditada` | D |
| `venta.anular` | No anulada; motivo obligatorio; si tiene factura ⇒ nota crédito | `ventas.anulacion`, `movimientos` (reingreso), reembolsos en `pagos`, `notasCredito` | `VentaAnulada`, `InventarioMovido`, `NotaCreditoEmitida` | D |
| `venta.abonar` | Venta separado o crédito con saldo; valor ≤ saldo | `ventas.pagos`; si saldo 0 y separado ⇒ `separado.cerrado = completado` | `AbonoRegistrado`, `SeparadoCerrado` | D V G |
| `separado.cancelar` | Separado activo | `ventas.separado.cerrado`, `movimientos` (reingreso), reembolso o saldo a favor | `SeparadoCerrado`, `InventarioMovido` | D V G |
| `devolucion.registrar` | Venta no anulada; cantidad ≤ vendida − devuelta; dentro de 30 días (usuario); con factura ⇒ nota crédito | `devoluciones`, `movimientos` (si reingresa), `ventas.pagos` (reembolso), `notasCredito` | `DevolucionRegistrada`, `InventarioMovido`, `NotaCreditoEmitida` | D V G |
| `pago.conciliar` | Refs existentes | `ventas.pagos.conciliado`, `movimientosCuenta.conciliado` | `EntidadCambiada` | D G |
| `caja.abrir` | No hay otra sesión abierta en el local; base ≥ 0 | `sesionesCaja` | `CajaAbierta` | D V G |
| `caja.egreso` | Sesión abierta; valor ≤ efectivo esperado | `sesionesCaja.egresos`, `gastos` (pagado desde la caja), `movimientosCuenta` | `GastoRegistrado` | D V |
| `caja.cerrar` | Sesión abierta | `sesionesCaja.cierre` (instantánea, diferencia) | `CajaCerrada` | D V G |
| `aprobacion.solicitar` | Descuento > máximo del vendedor | `solicitudes` | `AprobacionSolicitada` | V |
| `aprobacion.resolver` | Pendiente | `solicitudes`; traslado ⇒ `traslados.aprobacion` (rechazo ⇒ cancelado); conteo ⇒ aplica; nómina ⇒ aprueba | `AprobacionResuelta` + los del efecto | D |
| `producto.crear` | Referencia única con formato; ≥ 1 talla y 1 color; precio > 0 | `productos`, `variantes` (SKU y EAN-13 con consecutivo), `meta.consecutivos` | `EntidadCambiada` | D B |
| `producto.editar` | Precio > 0; vendedor no; bodega no cambia precio | `productos` (historial de costo si cambia el costo manual) | `EntidadCambiada` | D B |
| `producto.eliminar` | Sin existencias ni separados activos (G4) | `productos.eliminadoEn`, `variantes.eliminadoEn` | `EntidadCambiada` | D |
| `variante.agregar` / `variante.eliminar` | Talla de la curva; combinación única / sin existencias | `variantes` | `EntidadCambiada` | D B |
| `color.crear` | Nombre y código únicos | `colores` | `EntidadCambiada` | D B |
| `inventario.ajustar` | Motivo; nueva cantidad ≥ 0 | `movimientos`, `existencias` | `InventarioMovido`, `StockBajo` | D B |
| `traslado.solicitar` | Origen ≠ destino; existencias en origen; cantidades > 0 | `traslados` (+ `solicitudes` si requiere aprobación) | `TrasladoCambiado`, `AprobacionSolicitada` | D V B G |
| `traslado.despachar` | Solicitado; aprobado o no requerido; existencias suficientes | `traslados`, `movimientos` (salida en origen) | `TrasladoCambiado`, `InventarioMovido` | D B G |
| `traslado.recibir` | En tránsito; recibidas ≤ despachadas | `traslados`, `movimientos` (entrada + ajuste de faltante) | `TrasladoCambiado`, `InventarioMovido` | D B G |
| `traslado.cancelar` | No recibido; si estaba en tránsito reingresa en origen | `traslados`, `movimientos` | `TrasladoCambiado` | D B |
| `conteo.iniciar` · `guardar` · `enviarAprobacion` · `aplicar` · `cancelar` | Un conteo en curso por local; cantidades ≥ 0; aplicar: motivo por diferencia | `conteos`, `solicitudes`, `movimientos` (ajuste_conteo) | `ConteoAplicado`, `InventarioMovido` | D B |
| `cliente.crear` / `editar` / `eliminar` / `nota` | Celular 3XX de 10 dígitos único; autorización de datos marcada; documento único si existe | `clientes` (+ `notificaciones` si origen Instagram/WhatsApp) | `ClienteCreado`, `NotificacionCreada` | D V G |
| `mensaje.registrar` | Destinatario con teléfono o correo según canal | `mensajes` | `MensajesRegistrados` | D V G |
| `proveedor.*`, `contacto.*` | Nombre; moneda; correo/WhatsApp con formato | `proveedores`, `contactos` | `EntidadCambiada` | D |
| `importacion.crear` | Proveedor fábrica; ≥ 1 línea; tasa > 0; número único (se asigna `IMP-AAAA-NN` si falta) | `importaciones` (hitos estimados con `diasEstimadosEntreEstados`), `meta.consecutivosImportacion` | `EntidadCambiada` | D G |
| `importacion.editar` | Líneas editables hasta `saldo_pagado` | `importaciones` | `EntidadCambiada` | D |
| `importacion.eliminar` | Estado ≤ `pedido_confirmado` y sin abonos | `importaciones`, `cuentasPorPagar` | `EntidadCambiada` | D |
| `importacion.cambiarEstado` | M1, M2; nota obligatoria si retrocede | `importaciones` (estado, hito real, re-estimación de siguientes, `controlManual` si no es `sistema`), `cuentasPorPagar` (al confirmar: anticipo y saldo, M6), `notificaciones` (si origen portal o sistema-portal) | `ImportacionEstadoCambiado`, `NotificacionCreada` | D G, portal |
| `importacion.actualizarHitos` | Fechas en orden | `importaciones.hitos` (la llegada se mueve en el calendario: derivado) | `EntidadCambiada` | D |
| `importacion.actualizarCostos` | Valores ≥ 0 | `importaciones.costos` | `EntidadCambiada` | D G |
| `importacion.aplicarCostos` | Líneas con unidades | `productos.costoVigente` + historial, `importaciones.costosAplicados` | `CostosAplicados` | D G |
| `importacion.registrarPago` | Delegado a `cxp.pagar` sobre la CxP de la importación | `cuentasPorPagar.abonos`, `movimientosCuenta` | `PagoRegistrado` | D G |
| `importacion.documento` | Tipo válido | `importaciones.documentos` | `EntidadCambiada` | D G, portal |
| `importacion.recibir` | Estado `en_transporte_bogota` (o anterior con confirmación); recibidas ≥ 0 | `importaciones` (recepción, estado final, hito), `movimientos` (entradas en bodega con costo aterrizado), aplica costos si faltan, `traslados` (distribución, solicitados y despachados) | `ImportacionRecibida`, `InventarioMovido`, `CostosAplicados`, `TrasladoCambiado` | D B G |
| `cxp.crear` / `editar` / `eliminar` | Valor > 0; eliminar sin abonos | `cuentasPorPagar` | `EntidadCambiada` | D G |
| `cxp.programar` | No pagada | `cuentasPorPagar.programadaPara` | `EntidadCambiada` | D |
| `cxp.pagar` | Valor ≤ saldo; cuenta con saldo suficiente (aviso, no bloqueo, para el usuario; el generador sí respeta) | `cuentasPorPagar.abonos`, `movimientosCuenta` | `PagoRegistrado` | D G |
| `cuenta.crear` / `editar` / `transferir` / `movimiento` | Origen ≠ destino; valor > 0 | `cuentas`, `movimientosCuenta` | `EntidadCambiada` | D G |
| `gasto.registrar` | Valor > 0; IVA ≤ valor | `gastos` + (`movimientosCuenta` o `cuentasPorPagar`) | `GastoRegistrado` | D G |
| `gasto.editar` / `eliminar` | Si tiene CxP con abonos, no se elimina | `gastos`, revierte movimiento/CxP | `EntidadCambiada` | D |
| `gastoRecurrente.*` | Día 1–28 | `gastosRecurrentes` | `EntidadCambiada` | D |
| `gastoRecurrente.generarMes` | Idempotente por (recurrente, mes) | `gastos`, `cuentasPorPagar`/`movimientosCuenta` | `GastoRegistrado` | D G |
| `empleado.crear` / `editar` / `retirar` | Documento único; salario ≥ SMMLV (laboral); slug único | `empleados`, `contratos`, `usuarios` (si es persona de rol) | `EntidadCambiada` | D G |
| `contrato.reemplazar` | Fecha ≥ inicio vigente | `contratos` (cierra el anterior), `empleados.contratoVigenteId` | `EntidadCambiada` | D |
| `esquemaComision.*`, `meta.fijar` | Tramos crecientes; % entre 0 y 0,2 | `esquemasComision`, `metas` | `EntidadCambiada` | D |
| `turno.asignar` / `mover` / `eliminar` / `copiarSemana` | Empleado activo; sin solapes; P2 (si excede y no se acepta ⇒ error con el detalle de horas) | `turnos` | `TurnoCambiado` | D G |
| `marcacion.registrar` | P3; empleado con turno o confirmación; local del empleado | `marcaciones` | `MarcacionRegistrada` | V B G (D corrige) |
| `marcacion.corregir` / `eliminar` | Nota obligatoria | `marcaciones` | `EntidadCambiada` | D |
| `novedad.*` | Rango válido; sin solape del mismo tipo | `novedades` | `EntidadCambiada` | D G |
| `pila.verificar` | Contrato de prestación | `contratos.verificacionesPila` | `EntidadCambiada` | D G |
| `nomina.aprobar` | Periodo sin liquidación previa; empleados activos en el periodo | `liquidaciones` (instantánea con 6.20.5–6), `gastos` (nómina por local, seguridad social), `cuentasPorPagar` (neto por empleado, PILA, honorarios) | `NominaAprobada` | D G |
| `nomina.pagar` | Aprobada y no pagada | `cuentasPorPagar.abonos` (neto), `movimientosCuenta`, `liquidaciones.pagada` | `NominaPagada`, `PagoRegistrado` | D G |
| `nomina.anularAprobacion` | No pagada | elimina liquidación, gastos y CxP asociados | `EntidadCambiada` | D |
| `evento.*` | Fin ≥ inicio | `eventos` | `EntidadCambiada` | D G |
| `factura.emitir` | Venta reconocida sin factura; resolución vigente con rango | `facturas` (CUFE, QR), `ventas.facturaId`, `meta.consecutivos` | `FacturaEmitida` | D V G |
| `factura.avanzarEstado` | Orden generada → enviada → aceptada | `facturas` | `FacturaEstado` | D V G |
| `notaCredito.emitir` | Factura existente; valor ≤ facturado − notas previas | `notasCredito` | `NotaCreditoEmitida` | D G |
| `notificacion.marcarLeida`, `alerta.descartar` | — | `notificaciones`, `alertasDescartadas` | — | D |
| `empresa.editar`, `local.*`, `tasa.*`, `parametros.editar`, `resolucion.editar`, `usuario.*` | Formatos; tasa > 0; local G4; parámetros por sección (SMMLV > 0, % entre 0 y 1) | `empresa`, `locales`, `tasas`, `parametros`, `resoluciones`, `usuarios` | `TasaRegistrada`, `ParametrosEditados`, `EntidadCambiada` | D |

Ejemplo completo — `venta.registrar` (W1): el manejador valida, calcula totales con `reglas/ventas.ts`, asigna `V-000483`, inserta la venta con sus líneas y pagos, mueve el inventario del local (`salida_venta`), crea el cliente si venía `clienteNuevo`, marca la aprobación usada, emite factura si se pidió y devuelve los eventos. **No** toca comisiones, métricas del cliente, caja, Inicio ni Análisis: todo eso es derivado y se actualiza solo porque cambió la tabla `ventas`. El panel "Lo que acaba de pasar" se arma con `selEfectosVenta(antes, despues, ventaId)`.

### 6.22 Almacenado vs. derivado

| Dato | Almacenado | Derivado (selector) |
|---|---|---|
| Existencias por variante y local | Agregado materializado (`agregados.existencias`), verificado contra movimientos | Matrices, totales por local, valorización, en tránsito, días sin movimiento |
| Costo de un producto | `Producto.costoVigente` + historial | Margen, rentabilidad, valorización a costo |
| Costo de una venta | `LineaVenta.costoUnitario` (instantánea) | Margen bruto del periodo |
| Estado de una venta | `tipo`, `separado.cerrado`, `anulacion` | `pagada / separado / credito / devuelta / devuelta_parcial / anulada`, saldo |
| Por cobrar | — | Todo (separados y crédito) |
| Estado de una cuenta por pagar | `programadaPara`, abonos | `pendiente / programado / pago_parcial / pagado / vencido` |
| Saldos de cuentas | `saldoInicial`, movimientos, pagos de ventas | Saldo y libro |
| Comisiones | Esquema y metas | Comisión por empleado y periodo (y la congelada dentro de una liquidación aprobada) |
| Asistencia | Turnos, marcaciones, novedades | Tardanzas, ausencias, horas, extras, recargos |
| Liquidación | Solo periodos aprobados/pagados (instantánea) | Vista previa del periodo abierto |
| Métricas y segmento del cliente | — | Todo |
| Alertas | Descartadas | Todas (más las notificaciones almacenadas) |
| Eventos de calendario | Campañas, citas, obligaciones, libres | Turnos, llegadas de importación, vencimientos de pago |
| Retraso de importación, posición en la ruta | Hitos | Días de retraso, porcentaje del trayecto |
| Indicadores, gráficos, hallazgos, proyecciones | — | Todo |

### 6.23 Catálogo de selectores (fase 2, `src/selectores/`)

Todos son funciones puras `(estado, parámetros) => resultado`, memoizadas por referencia de las tablas que leen y por parámetros. `localId: Id | 'todos'`, `rango: { desde: FechaISO; hasta: FechaISO }`, `hoy: FechaISO`.

| Archivo | Selectores |
|---|---|
| `base.ts` | `selLocales({ incluirBodega })`, `selLocalesQueVenden`, `selProductosActivos`, `selVariantesPorProducto`, `selEmpleadosActivos(fecha)`, `selClientesActivos`, `selIndiceVentasPorCliente`, `selIndiceVentasPorVendedor`, `selIndiceVentasPorDia`, `selTasaVigente(moneda, fecha)`, `selUsuario(rol)` |
| `catalogo.ts` | `selCatalogo(filtros)` (categoría, talla, color, local, proveedor, estado de stock, texto), `selProductoPorReferencia(ref)`, `selMargenProducto(id)`, `selBuscarProducto(texto)` (nombre, referencia, SKU, EAN), `selVariantePorEan(ean)` |
| `inventario.ts` | `selExistencia(varianteId, localId)`, `selMatrizExistencias(productoId)` (talla × color × local + totales), `selKardex({ productoId?, varianteId?, localId?, rango })` (con saldo acumulado), `selStockBajo(localId)`, `selValorizacion(localId)` (unidades, a costo, a precio), `selEnTransito`, `selSinMovimiento(dias, hoy)`, `selDiasInventario(categoria?)`, `selDisponibilidadOtrosLocales(varianteId)` |
| `ventas.ts` | `hechosDeVenta(estado)` (líneas + devoluciones con la regla V4, una pasada), `selVentas(filtro)` → filas + totales (ventas, devoluciones, netas, unidades, ticket, descuentos), `selVentaDetalle(id)` (estado y saldo derivados), `selResumenVentas(rango, localId)`, `selVentasPorDia(rango, localId, porLocal)`, `selVentasHoyHastaHora(hoy, ahora, localId)` y comparación con el mismo día de la semana anterior a la misma hora, `selTopProductos(rango, localId, n, medida)` |
| `caja.ts` | `selSesionAbierta(localId)`, `selResumenSesion(sesionId)` (ventas por medio, esperado), `selEfectivoEnCajas(localId)` |
| `clientes.ts` | `selMetricasClientes` (una pasada: compras, valor, ticket, frecuencia, última compra, tallas, colores, local y vendedor habituales, saldo a favor, por cobrar), `selClientes(filtro)` (incl. segmento y "sus clientes" del vendedor), `selCliente(id)`, `selSegmentos`, `selCumpleanosMes(mes)` |
| `personal.ts` | `selEmpleadoPorSlug(slug)`, `selContratoVigente(empleadoId, fecha)`, `selComisiones(periodo, empleadoId?)` (detalle por venta), `selAsistencia(rango, { empleadoId?, localId? })`, `selHorasSemana(empleadoId, lunes)`, `selTurnosSemana(localId, lunes)`, `selMiDia(empleadoId, hoy)` |
| `nomina.ts` | `selPeriodoAbierto(hoy)`, `selVistaPreviaNomina(periodo, { exoneracion })`, `selCostoEmpleado(empleadoId, { exoneracion, simularPrestacion })` (W6), `selComparativoModalidades(salarioOHonorarios, opciones)`, `selCostoNominaPorLocal(mes)` (y % sobre ventas, P15), `selLiquidacion(id)` |
| `importaciones.ts` | `selImportaciones(filtro)` (estado, retraso, posición en ruta, saldo), `selImportacionPorNumero(num)`, `selCostoAterrizado(id, { tasaSimulada? })` (cascada, por línea y por prenda, margen proyectado), `selLlegadasProximas` |
| `proveedores.ts` | `selProveedores(filtro)`, `selFichaProveedor(id)` (total comprado, saldo, pedidos, entrega promedio, cumplimiento), `selComparativoFabricas` (costo promedio por unidad, % a tiempo, retraso promedio, % defectos — P14) |
| `finanzas.ts` | `selCuentasPorPagar(filtro)` (estado derivado, saldo en COP y en origen), `selCuentasPorCobrar(filtro)`, `selSaldosCuentas(hoy)`, `selLibroCuenta(cuentaId, rango)`, `selPendientesConciliar`, `selFlujoProyectado(dias, hoy)` (6.20.9, con punto más bajo y su explicación) |
| `gastos.ts` | `selGastos(filtro)`, `selResumenGastos(mes, localId)` (vs. mes anterior), `selEstadoResultados(rango, localId, prorratear)`, `selPuntoEquilibrio(localId, mes)` |
| `calendario.ts` | `selEventosCalendario(rango, { tipos, localId })` → `EventoVista[]`, `selProximosEventos(hoy, n)` |
| `alertas.ts` | `selAlertas(localId, ahora)` → `Alerta[]` ordenadas por prioridad (las 8 de 01_estrategia 2.3.3 + notificaciones nuevas), `selNotificaciones`, `selSolicitudesPendientes` |
| `inicio.ts` | `selKpisInicio(localId, ahora)` (las 6 tarjetas con micrográfico y variación), `selSaludo(localId, ahora)` (datos para la frase, 3 variantes por hora), `selComparativoLocales(mes)` (ventas, margen, ticket, unidades, cumplimiento de meta) |
| `analisis.ts` | `hechosAnalisis(estado)` (filas con todas las dimensiones), `pivotear(hechos, { filas, columnas, medida, filtros })` con totales, `selVentasPorMes(18, yoy)`, `selMapaCalor(rango, localId)`, `selVentasPorSemana`, `selMasYMenosVendidos(filtros)`, `selTallasYColores(categoria)`, `selRotacion`, `selDesempenoLocales`, `selDesempenoVendedores`, `selComportamientoClientes`, `selMediosDePago(rango)`, `selProyeccionMes(hoy)` |
| `hallazgos.ts` | `selHallazgos(hoy, localId)` → 3–5 frases con su cifra, su enlace y su relevancia (plantillas en `config/textos/hallazgos.ts`) |
| `efectos.ts` | `selEfectosVenta(antes, despues, ventaId)` → lista "antes → después" de W1 (inventario, ventas de hoy, comisión, cliente, caja) |
| `narrativa.ts` | `selNarrativa()` → entidades guionadas (desde `meta.narrativa`) para alertas, guía y enlaces |

**Pivote** — dimensiones (13): mes, semana del año, fecha, día de la semana, hora, local, vendedor, categoría, línea, producto, talla, color, medio de pago, canal, segmento del cliente. Medidas (6): ventas $ (con IVA), ventas sin IVA, unidades, número de ventas (distintas), ticket promedio, margen $ y margen %. Para "medio de pago", las ventas de contado con pago mixto se reparten por la proporción de cada medio; separado y crédito aparecen como "Separado" y "Crédito" (coherente con P9). El segmento del cliente es el actual.

---

## 7. Generador de datos

### 7.1 Objetivos y presupuesto

1. **Determinista**: misma semilla (`config/demo.ts`: `'HALDEN-2026'`), mismo ancla, mismo `ahora` y mismo registro ⇒ mismo estado. Lo verifica una prueba con un hash del estado serializado.
2. **Relativo a la fecha real**: la historia termina "ahora" (en hora de Bogotá); las ventas de hoy llegan hasta la hora actual del navegador.
3. **Coherente por construcción**: el generador **no escribe el estado**; emite comandos del catálogo 6.21 y los aplica el mismo manejador que usa el POS (D1). Si un comando generado no valida, se omite y se cuenta (debe ser 0).
4. **Verosímil**: estacionalidad colombiana, diferencias entre locales y los patrones P1–P20 de `01_estrategia.md` 4.7, con las tolerancias allí indicadas (±15 %).
5. **Rápido**: < 1 s en un portátil de 2020 dentro del worker (≈ 16.000 ventas, ≈ 21.000 líneas, ≈ 45.000 movimientos de inventario, ≈ 6.000 marcaciones, ≈ 150.000 objetos en total). `scripts/medir-generador.ts` reporta el tiempo por etapa; la prueba de rendimiento falla por encima de 3 s en CI.

### 7.2 PRNG y flujos aleatorios

- `prng.ts`: `cyrb128(texto) → 4 × uint32` como siembra de `sfc32` (rápido, buena calidad, 128 bits de estado). Utilidades: `decimal()`, `entero(a, b)`, `normal(μ, σ)` (Box–Muller), `poisson(λ)` (Knuth para λ < 30; normal aproximada por encima), `elegirPonderado(pesos)` (tabla acumulada + búsqueda binaria), `barajar`, `muestra(k)`, `chance(p)`.
- **Un flujo por propósito, nunca uno global.** `rngPlan(nombre)` para el plan global (`'plan:importaciones'`, `'plan:clientes'`…) y `rngIntencion(clave)` para cada intención (`'venta:2026-09-30:zr:014'`). Así, que el usuario venda una camisa no cambia los números aleatorios de ninguna otra venta: solo cambia el estado sobre el que se materializan (sin efecto mariposa).
- Prohibido `Math.random()` en `dominio`, `generador` y `selectores` (regla de ESLint).

### 7.3 Ventana y ancla

- `inicioVentana = ancla − 18 meses` (mismo día del mes; ≈ 548 días). La historia corre de `inicioVentana` a `ahora`.
- El plan narrativo (importaciones en curso, cumpleaños de hoy, pago "del viernes") se calcula **relativo al ancla** (5.6.3). Sin registro, `ancla = hoy`: la narrativa siempre está "al día". Con registro, los días posteriores al ancla siguen la vida del plan: la importación en puerto avanza a nacionalización en su fecha estimada, se recibe, se distribuye; se crean pedidos nuevos con la cadencia del plan.
- Días cerrados: 25 de diciembre y 1 de enero (sin ventas). Todos los demás abren con el horario de `config/locales.ts` (festivos: horario festivo).

### 7.4 Etapas

```
estadoInicial(config, seed, semilla, ancla)          entidades maestras (sin hechos)
  empresa · parámetros · usuarios · locales · cuentas (saldos iniciales en inicioVentana)
  colores · productos y variantes (SKU, EAN-13) · proveedores · contactos
  empleados (fechas de ingreso; uno contratado hace ~5 meses) · contratos · esquemas de comisión
  clientes (≈ 420, con fecha de alta; los "nuevos" con alta en los últimos 60 días)
  tasas de cambio (semanales, ruta suave) · resolución de facturación
  gastos recurrentes · eventos guardados (campañas 2 meses atrás → 3 adelante, obligaciones, citas)

planGlobal(semilla, ancla)                             puro, sin leer el estado, ~10 ms
  λ(local, día) esperado · perfiles latentes de clientes · plan de importaciones con fechas,
  productos y cantidades por variante · calendario de nómina · metas · plan narrativo

por cada día d de la ventana:
  planificarDia(plan, d) → Intencion[] ordenadas por ts            (no lee el estado)
  materializar(intencion, estado, plan) → SobreComando[]           (lee el estado; guardas)
  (intercaladas con el registro del usuario por marca de agua, 5.6.4)
```

```ts
interface Intencion {
  clave: string;                 // estable: 'venta:2026-09-30:zr:014' (siembra su PRNG y su ID)
  ts: FechaHoraISO;
  tipo:
    | 'dia.apertura'             // 06:00: consignaciones, recurrentes, vencimientos, hitos de importación, separados y devoluciones del día
    | 'caja.abrir' | 'caja.cerrar'
    | 'turnos.semana'            // lunes 07:00: turnos de la semana +3 (ventana móvil)
    | 'marcacion'                // entrada/salida de cada turno, con su ruido
    | 'venta'                    // una venta planeada (local, hora); cliente, vendedor y productos se eligen al materializar
    | 'reposicion'               // miércoles 08:00: bodega → locales bajo mínimo
    | 'importacion.hito' | 'importacion.pago' | 'importacion.recepcion'
    | 'nomina.periodo'           // días 15 y último, 18:00
    | 'mes.cierre'               // último día 21:00: comisiones de datáfono, PILA, impuestos, metas del mes siguiente, retiro del socio
    | 'dia.cierre'               // 21:30: facturas → aceptada, conciliación de pagos con más de 3 días
    | 'narrativa';               // cierres narrativos (7.11)
  datos: Record<string, string | number>;    // p. ej. { localId: 'zr', indice: 14 }
}
```

Las tareas que dependen del estado (abonar o cancelar separados, devolver una venta reciente, reponer bodega) son intenciones **diarias de revisión**: la intención existe siempre, y al materializarse recorre el estado y decide con su PRNG (sembrado con la clave + el ID de la entidad). Determinista y sin planificar sobre el estado.

### 7.5 Modelo de demanda (estacionalidad colombiana)

**Número de ventas** por local y día: `N ~ Poisson(λ)` con

```
λ(local, d) = base(local) × índiceMes(d) × índiceDía(local, d) × eventos(d) × tendencia(d) × ruido(semana)
```

| Factor | Valores (fuente: 01_estrategia 4.7, ajustables en `seed/estacionalidad.ts`) |
|---|---|
| `base` (ventas/día en un mes típico, índice 1,00) | Parque 93: 9 · Zona Rosa: 14 · Usaquén: 6 (≈ 29 en total) |
| `índiceMes` | Ene 0,70 · Feb 0,72 · Mar 0,85 · Abr 0,88 · May 0,95 · Jun 1,35 · Jul 0,95 · Ago 0,92 · Sep 1,15 · Oct 0,95 · Nov 1,30 · Dic 1,85 |
| `índiceDía` (general) | Lun 0,75 · Mar 0,70 · Mié 0,80 · Jue 0,90 · Vie 1,15 · Sáb 1,60 · Dom 1,10 |
| Domingo por local (P8) | Zona Rosa (centro comercial) 1,45 · Usaquén 1,35 (pico 11:00–2:00 p. m., mercado de las pulgas) · Parque 93 (calle) 0,80 |
| Eventos | **Día del Padre** (3.er domingo de junio): jueves a domingo previos × 1,6, resto de esa semana × 1,25 · **Prima de junio** (20–30 jun) × 1,15 · **Amor y Amistad** (3.er sábado de septiembre): viernes a domingo × 1,3 · **Black Friday** (último viernes de noviembre): viernes a domingo × 2,0, semana × 1,3, con descuentos de 20–30 % · **Prima de diciembre y Navidad**: 15–24 dic × 1,5; 24 dic cierra a las 6:00 p. m.; 31 dic × 0,6 · **Quincenas** (15 y último día): ese día y los dos siguientes × 1,10 · **Festivos**: calle × 0,85, centro comercial × 1,15 · **Grados** (junio y diciembre): trajes y blazers × 1,5 en la mezcla |
| `tendencia` | Crecimiento anual +10 % (`1,10 ^ (días desde inicio / 365)`), para que la comparación año contra año muestre +9 % a +12 % |
| `ruido` | Normal por semana (σ = 6 %) para que ninguna serie se vea sintética |

Regla de rango: en días abiertos completos, el total de los tres locales se acota a **[15, 60]** (si `Poisson` da menos, se suma al local más fuerte; si da más, se recorta). La prueba verifica el rango y el orden: diciembre es el mes más alto; enero y febrero, los dos más bajos; el sábado, el mejor día.

**Hora de cada venta**: horario Lun–Sáb 10:00 a. m.–8:00 p. m., Dom 11:00 a. m.–7:00 p. m. (Zona Rosa hasta las 9:00 p. m. de lunes a sábado). Pesos por franja: 10–12 h: 0,6 · 12–15 h: 0,9 · **15–19 h: 1,8** · 19–21 h: 0,9; Usaquén en domingo: 11–14 h: 1,8. Objetivo P7: sábado ≈ 23 % de la semana; sábado 3–7 p. m. ≈ 11 % de la semana.

### 7.6 Qué se vende y cómo se paga

| Aspecto | Regla del generador |
|---|---|
| Unidades por venta | Distribución por local: Parque 93 media 1,6 · Zona Rosa 1,3 · Usaquén 1,4 (líneas 1–4; cantidad por línea casi siempre 1; medias y corbatas a veces 2) |
| Ticket (P1) | Se logra con la mezcla de categorías por local: Parque 93 pesa sastrería (trajes $1.490.000, blazers $789.900); Zona Rosa pesa casual (chinos, polos, camisas); Usaquén intermedio. Objetivo: P93 ≈ $520.000 · ZR ≈ $315.000 · USQ ≈ $365.000 |
| Mezcla por mes | Junio: camisas, polos, corbatas (Día del Padre) y trajes (grados); septiembre: camisas y sweaters; noviembre: todo con descuento; diciembre: trajes, blazers, sweaters, calzado; enero: liquidación de temporada (descuentos 15 %) |
| Tallas (P3, P4) | Camisas y prendas superiores: S 13 % · M 38 % · L 29 % · XL 15 % · XXL 5 %. Pantalones: 30: 12 % · 32: 28 % · 34: 26 % · 36: 16 % · 28: 6 % · 38: 8 % · 40: 4 %. Calzado: 40–42 dominan. Sastrería: 48–52 dominan. Los pedidos a China se hacen casi parejos por talla (de ahí que la M se agote) |
| Colores (P12) | Azul (navy + azul cielo) ≈ 34 % de las camisas; beige y camel suben en sweaters en los últimos 3 meses |
| Descuentos | ≈ 12 % de las ventas con 5–15 % (por línea o global); Black Friday ≈ 60 % de las ventas con 20–30 % (aprobadas por el dueño); enero 15 % en liquidación |
| Medios de pago (P9) | Se interpolan linealmente de "hace 12 meses" a "mes actual": datáfono 46 % (débito 60 / crédito 40), efectivo 25 % → 18 %, Nequi 8 % → 14 %, Bre-B + transferencia 2 % → 11 % (Bre-B desde octubre de 2025), Daviplata 3 % → 4 %, separado ≈ 3–5 % (por valor), crédito ≈ 2 % (solo VIP). Pagos mixtos en ≈ 8 % de las ventas (efectivo + Nequi típico) |
| Canales | Local ≈ 90 %, WhatsApp ≈ 5 %, Instagram ≈ 3 %, web ≈ 2 % (web solo los últimos 6 meses) |
| Separados (P17) | ≈ 1,5 % de las ventas (más en noviembre–diciembre), abono inicial 20–50 %, plazo 15–30 días; 85 % se completan con 1–3 abonos, 15 % se cancelan (abonos a saldo a favor) |
| Devoluciones | ≈ 3 % de las ventas, 1–15 días después; 70 % cambio (devolución + venta nueva pagada con saldo a favor), 20 % saldo a favor, 10 % reembolso; 10 % por defecto (no reingresa) |
| Facturas | En los últimos 90 días, ≈ 55 % de las ventas tienen factura electrónica simulada (consumidor final o cliente identificado); las anteriores solo recibo POS. Estados: generada → enviada (+2 min) → aceptada (+5 min) |
| Costo de la línea | `costoVigente` del producto en ese instante (margen bruto objetivo ≈ 58 %; por categoría según 4.7) |

**Guardas de existencias** (al materializar una línea): si la variante deseada no tiene existencias en el local, se intenta (1) otro color de la misma talla, (2) la talla vecina si el cliente es "flexible" (60 %), (3) otra referencia de la misma categoría; si nada, la línea se pierde y se anota en `demandaInsatisfecha` (dato interno del plan para el hallazgo de tallas). Si una venta queda sin líneas, se reintenta con otra categoría hasta 3 veces. **Nunca hay existencias negativas.**

### 7.7 Clientes

- ≈ 420 clientes generados en `generador/personas.ts` con nombres y apellidos colombianos de `seed/nombres.ts`, celular 3XX de 10 dígitos (prefijos móviles válidos), correo plausible, cumpleaños, barrio, tallas latentes (camisa, pantalón, calzado, blazer), colores preferidos, local habitual, vendedor preferido, fecha de alta y **tipo latente** con su frecuencia media de compra y su factor de ticket.
- Mezcla objetivo de segmentos (P11): VIP 8 % · frecuente 22 % · ocasional 35 % · en riesgo 25 % · nuevo 10 %. Los "en riesgo" tienen una fecha de abandono (> 90 días antes del ancla); ≈ 31 de ellos compraron más de $3 millones.
- Elección del cliente al materializar una venta: ≈ 70 % de las ventas con cliente; peso = frecuencia latente × (activo en la fecha: alta ≤ d < abandono) × (1,8 si es su local habitual); ≈ 58 % de las ventas van a clientes recurrentes. Al elegir cliente, las tallas de las líneas salen de sus tallas latentes (las "tallas preferidas" derivadas cuadran).
- Clientes guionados en `seed/elenco.ts`: **Andrés Gutiérrez** (frecuente, Usaquén, 6 compras previas, chino talla 32) y **Ricardo Peñuela** (VIP de Parque 93, ≈ $6,4 millones históricos, cumpleaños = día del ancla, cita "Toma de medidas" el próximo sábado a las 11:00 a. m.).
- La interfaz nunca enlaza a números o correos de terceros reales: ver 10, riesgo R14.

### 7.8 Vendedores, turnos y asistencia

- Elenco de 14 empleados de `01_estrategia.md` 1.5 en `seed/elenco.ts`. Las ventas se asignan entre los **vendedores con turno** en ese local a esa hora (las cajeras no venden). Pesos por habilidad: **Valentina Gómez** (P93) × 2,2 en asignación, ticket × 1,25, accesorio en el 46 % de sus ventas frente a ≈ 17 % del resto (P2); Juliana Vargas solo fines de semana en Zona Rosa.
- Turnos (`config/turnos.ts`): apertura 10:00–5:00 p. m., cierre 1:00–8:00 p. m. (Zona Rosa hasta 9:00 p. m.), domingo 11:00 a. m.–7:00 p. m.; seis días de 7 h = 42 h. Se generan para las últimas 13 semanas y las próximas 3 (ventana móvil con `turnos.semana`). Diciembre y los domingos de Zona Rosa llevan turnos con exceso aceptado (horas extra, P16).
- Marcaciones: entrada = inicio + Normal(−4 min, 5 min); salida = fin + Normal(6 min, 8 min). **Mateo Herrera** llega tarde (+15 a +35 min) ≈ 4 veces al mes; una ausencia sin novedad cada ≈ 2 meses en otro empleado; novedades sembradas: unas vacaciones, una incapacidad de 3 días, un permiso.
- Nómina: cada día 15 y último de mes, `nomina.aprobar` + `nomina.pagar` con insumos calculados de la asistencia (últimos 90 días) o explícitos (meses anteriores: días completos, horas extra de diciembre y domingos de Zona Rosa). La quincena en curso queda abierta (vista previa). PILA: cuenta por pagar mensual que vence el día hábil 10 y se paga a tiempo. Costo total mensual ≈ $45 millones (P15).

### 7.9 Abastecimiento: importaciones y garantía de existencias

**Fábricas** (`seed/proveedores.ts`, nombres de 01_estrategia 1.5 verificados como ficticios): Guangzhou Huameng (camisas, polos), Ningbo Weiye (blazers, trajes, chalecos), Hangzhou Lanxin (punto, abrigos, corbatas, medias), Shaoxing Yuefeng (pantalones y chinos), Wenzhou Ruifeng (calzado, cinturones, billeteras).

**Plan** (`plan:importaciones`): cada fábrica tiene una cadencia (Huameng ≈ 90 días, Yuefeng ≈ 120, Weiye ≈ 150, Lanxin semestral antes de junio y diciembre, Ruifeng ≈ 240) y una primera importación **recibida entre los días 2 y 10 de la ventana** (carga inicial: sin saldos iniciales, I5). En 18 meses resultan ≈ 14 pedidos (≈ 10 recibidos + 4 en curso). El PRD sugiere 8–10; se acepta ≈ 14 porque cinco fábricas con reposición real lo exigen y porque la numeración que usa la estrategia (`IMP-2026-10` en septiembre) ya implica ese ritmo (decisión a registrar).

**Fechas**: cada pedido recorre los 13 estados con `diasEstimadosEntreEstados` (`config/aduanas.ts`): cotizado → confirmado 5 · → anticipo 3 · → producción 2 · producción → listo 35 · → saldo pagado 4 · → embarcado 6 · → en tránsito 1 · tránsito → puerto 32 (marítimo Ningbo/Shenzhen → Buenaventura) · → nacionalización 3 · → nacionalizado 7 · → transporte 2 · → recibido 2 (≈ 102 días de pedido a bodega). Las fechas reales tienen ruido; Ningbo Weiye se retrasa en promedio 12 días (P14).

**Cantidades**: `cantidad(variante) = redondear(demanda esperada de la variante entre esta llegada y la siguiente de la misma fábrica + 30 días × 1,15)`, con la demanda esperada calculada por el mismo modelo λ × mezcla (valor esperado, sin simular). La curva de tallas del pedido es **casi pareja** (el patrón P3 sale solo). Ajustes deliberados: Oxford azul cielo M × 0,75 (se agota ≈ 3 veces en 6 meses, ≈ 9 días cada vez); el pedido de Ruifeng de hace ≈ 7 meses × 2,6 (calzado dormido, P5: ≈ 160 días de inventario y ≈ $40 millones a costo); 5 referencias con demanda 0 en los últimos 75 días y existencias (P6).

**Montos**: FOB por referencia desde `seed/catalogo.ts` (p. ej. Oxford US$ 11,40); flete marítimo US$ 2.800–3.600 por contenedor de 20 pies; agente $ 1,8–2,6 M; bodegaje $ 0,9–1,6 M; transporte Buenaventura → Bogotá $ 3,2–4,5 M; arancel e IVA según parámetros. Resultado W4: Oxford ≈ $71.850 puesta en bodega, margen ≈ 61 %. La tasa sube ≈ 8 % entre el penúltimo y el último pedido de blazers (P13).

**Pagos**: anticipo 30 % al confirmar y saldo 70 % antes de embarcar, con la tasa de su fecha (diferencia en cambio visible). Las cuentas por pagar de agente, bodegaje y transporte nacen en sus hitos.

**Recepción y distribución**: `importacion.recibir` en bodega con 0,5–5 % de defectuosas según la fábrica (P14: Huameng ≈ 1,1 %, Weiye ≈ 4,8 %); la distribución crea traslados bodega → locales en proporción P93 40 % · ZR 38 % · USQ 22 % ajustada por la afinidad de categoría de cada local, dejando ≈ 20 % de reserva en bodega; se despachan el mismo día y se reciben al siguiente. Los miércoles, `reposicion` lleva de bodega a los locales lo que esté bajo el mínimo.

**Garantía de coherencia**: las únicas entradas son recepciones de importación (y ajustes con documento); las únicas salidas, ventas, separados, traslados y ajustes; las guardas impiden negativos; la prueba recorre el kardex de cada variante y local en orden de `ts` y exige saldo ≥ 0 en todo punto y saldo final = agregado materializado.

### 7.10 Plata generada

- Cuentas (`seed`): Caja Parque 93, Caja Usaquén, Caja Zona Rosa (base $ 300.000), Cuenta corriente (recibe datáfono, transferencias, Bre-B, pasarela web), Nequi, Daviplata. Entidades con nombres genéricos ficticios.
- Diario: abrir caja 9:40 a. m.; cerrar 8:10 p. m. con diferencia 0 en ≈ 85 % de los días y ± $ 1.000–20.000 en el resto; consignación del efectivo (menos la base) a la cuenta corriente al día siguiente; Nequi y Daviplata se trasladan a la cuenta corriente los lunes.
- Mensual: arriendos (CxP el día 1, vence el 5), servicios, internet, vigilancia, aseo, publicidad (más alta antes del Día del Padre, Black Friday y diciembre), empaques trimestrales, mantenimiento ocasional, honorarios de contador, comisiones de datáfono por local (≈ 2,6 % de lo cobrado con datáfono, ≈ $ 4 millones al mes, P10), retención en la fuente mensual, IVA bimestral, ICA. Se pagan casi siempre a tiempo; hoy quedan 1–2 vencidas pequeñas para que exista la alerta.
- **Retiros del socio**: el primer día de cada mes, si la cuenta corriente supera $ 160 millones, se retira el excedente sobre $ 90 millones (mantiene saldos verosímiles sin importar la fecha en que se abra la demo). V7 (sin saldos negativos) se verifica.
- **Calibración del flujo (P19)**: el día ancla − 3 a las 8:00 a. m., la intención `narrativa` evalúa la proyección de 90 días con `reglas/flujo.ts` (la misma función que usa el selector) y ajusta un retiro (o aporte) del socio para que el punto más bajo quede en ≈ $ 18 millones (tolerancia de la prueba: $ 10–30 millones, nunca negativo), coincidiendo con el saldo a Hangzhou Lanxin, los arriendos y la quincena.

### 7.11 Narrativa al día del ancla (cierres narrativos)

Intenciones `narrativa` con fechas relativas al ancla garantizan las situaciones de `01_estrategia.md` 2.3.3, 2.3.4 y W1–W10. Cada una se verifica en `generador/narrativa.test.ts` (con `?hoy=` a distintas horas y días de la semana).

| # | Situación al ancla | Mecanismo | Verificación |
|---|---|---|---|
| N1 | Oxford azul cielo M: Usaquén 1, Parque 93 2, Zona Rosa 6, bodega 0 | Ancla − 1, 8:00 p. m.: ventas o traslados mínimos para llegar a esas cifras desde lo que haya (la reposición del miércoles excluye esa variante los últimos 10 días) | USQ ≤ 1 < mínimo (2); ZR ≥ 4; bodega 0 |
| N2 | Importación "en puerto" (Huameng, camisas, incluye 48 Oxford azul cielo M), actualizada **ayer** por Carolina Mejía desde el portal | Hito `en_puerto` real = ancla − 1 con `origen: 'portal'` ⇒ notificación sin leer; nacionalización estimada ancla + 2; bodega ancla + 12 | Alerta 2 y evento "Llega a bodega en 12 días" |
| N3 | Importación en nacionalización con 6 días de retraso (Ningbo Weiye, blazers y trajes; nota "La DIAN pidió inspección física") | Hito estimado `nacionalizado` = ancla − 6, sin fecha real; nueva estimación a bodega ancla + 9 | Alerta 6; portal `/seguimiento/<número>` |
| N4 | Importación en tránsito (Shaoxing Yuefeng) llega a Buenaventura en ≈ 8 días | Embarcado ancla − 24; puerto estimado ancla + 8 | Barco a mitad del océano en la ruta |
| N5 | Importación en producción (Hangzhou Lanxin, merino para diciembre); saldo US$ 14.700 vence **el viernes** | CxP saldo con vencimiento = próximo viernes (≥ 2 días; si no, el siguiente) | Alerta 3 y punto bajo del flujo |
| N6 | Mateo Herrera: turno de apertura hoy en Zona Rosa; 3 llegadas tarde este mes; hoy marca a las 10:25 a. m. | Turno forzado hoy; marcaciones tardías sembradas en el mes | Alerta 4 en sus dos variantes según la hora |
| N7 | 14 separados activos (≈ $ 6,2 M de saldo); 3 vencen esta semana (≈ $ 1,87 M) | Fechas límite sembradas sobre separados reales generados en las últimas 3 semanas | Alerta 5 |
| N8 | Ricardo Peñuela cumple años hoy | `cumpleanos` = MM-DD del ancla | Alerta 7 |
| N9 | Calzado dormido (≈ $ 40 M a costo, ≈ 160 días) y 5 referencias sin movimiento en 60 días | Plan de cantidades (7.9) + demanda 0 | Alerta 8; Inicio "sin movimiento" muestra exactamente esas 5 |
| N10 | Dos solicitudes pendientes en "Para aprobar": descuento 20 % de Sebastián (Blazer de lana fría $ 789.900 → $ 631.920) y traslado de 8 unidades P93 → ZR pedido por Wilson Díaz | Ancla − 1, 7:00 p. m.: `aprobacion.solicitar` y `traslado.solicitar` con aprobación | App → "Para aprobar" |
| N11 | Próximos eventos: arriendo de Zona Rosa el lunes, toma de medidas el sábado, preventa Black Friday en ≈ 6 semanas | Fechas relativas en `seed/calendario.ts` y CxP | Inicio → Próximos eventos |
| N12 | Andrés Gutiérrez con 6 compras; chino stretch arena talla 32 con 5 unidades en Usaquén | Ventas guionadas en los últimos 6 meses; stock dirigido como N1 | W1 (5 → 4) |
| N13 | Flujo de caja con punto bajo ≈ $ 18 M en 18–28 días | 7.10 calibración | W5 |

Los textos de las alertas **no** se escriben en la narrativa: los arma `selAlertas` con las cifras reales (si el usuario ya trasladó la Oxford, la alerta 1 desaparece sola).

### 7.12 Patrones descubribles (P1–P20)

| Patrón | Cómo lo produce el generador | Selector que lo descubre |
|---|---|---|
| P1 ticket alto vs. volumen | `base` por local + mezcla de categorías + unidades por venta | `selDesempenoLocales`, `selHallazgos` |
| P2 vendedora estrella | Peso de asignación, ticket y accesorio de Valentina | `selDesempenoVendedores` |
| P3, P4 tallas | Curvas de demanda vs. pedidos parejos; Oxford M × 0,75 | `selTallasYColores`, días agotados por variante |
| P5, P6 calzado dormido y 5 sin movimiento | Pedido Ruifeng × 2,6; 5 referencias sin demanda | `selRotacion`, `selSinMovimiento` |
| P7, P8 sábado y domingos por local | Índices de día, hora y domingo por local | `selMapaCalor` |
| P9, P10 medios de pago y datáfono | Interpolación de medios; gasto mensual de comisiones | `selMediosDePago`, `selResumenGastos` |
| P11 clientes VIP en riesgo | Tipos latentes y fechas de abandono | `selSegmentos`, `selComportamientoClientes` |
| P12 colores | Pesos de color por categoría y tendencia | `selTallasYColores` |
| P13 el dólar se come el margen | Ruta de tasas + mismo precio de venta | `selCostoAterrizado` comparado entre pedidos |
| P14 fábrica incumplida | Ruido de fechas y defectos por fábrica | `selComparativoFabricas` |
| P15 nómina por local | Elenco por local (sastre en Usaquén) | `selCostoNominaPorLocal` |
| P16 tardanzas y extras | Marcaciones de Mateo; turnos con exceso | `selAsistencia` |
| P17 separados | 7.6 + N7 | `selCuentasPorCobrar` |
| P18 proyección del mes | Tendencia +10 % y estacionalidad | `selProyeccionMes` |
| P19 punto bajo del flujo | 7.10 | `selFlujoProyectado` |
| P20 top 5 del mes | Pesos de demanda de esas 5 referencias | `selTopProductos` |

`generador/patrones.test.ts` evalúa cada patrón con la semilla por defecto en 4 fechas (`2026-09-30`, `2026-12-19`, `2027-01-20`, `2027-06-14`) y exige la cifra dentro de ±15 % del objetivo (o el orden relativo, cuando el patrón es comparativo). `selHallazgos` debe producir al menos 4 frases en cada fecha.

### 7.13 EAN-13, SKU y referencias

- **Referencia**: `HL-<CAT>-<NNNN>` con `CAM`, `BLZ`, `PAN`, `POL`, `ABR`, `PUN`, `TRJ`, `CAL`, `ACC` (prefijo `HL` desde `config/marca.ts`).
- **SKU**: `<referencia>-<código de color>-<talla>` → `HL-CAM-0142-AZC-M`.
- **EAN-13**: `'20'` (rango GS1 de circulación restringida, para uso interno de la tienda: nunca choca con un producto real) + código de empresa de 3 dígitos (`config/marca.ts`, `'481'`) + consecutivo de variante de 7 dígitos + dígito de control. Dígito de control: con los 12 primeros dígitos, suma de posiciones impares × 1 + pares × 3 (contando desde la izquierda, posición 1 impar); control = `(10 − suma mod 10) mod 10`. Pruebas: valores conocidos, unicidad en todo el catálogo, y que JsBarcode los acepte.
- Productos creados por el usuario reciben referencia, SKU y EAN-13 con el siguiente consecutivo (`meta.consecutivos.producto`).

### 7.14 Pruebas automáticas del generador

| Prueba | Qué exige |
|---|---|
| `coherencia.test.ts` | I1–I6, V1–V10, M1–M6, P1–P4 y G1–G4 de 6.19 sobre el estado de la semilla por defecto en 4 fechas y 3 horas del día; 0 comandos generados omitidos; existencias = Σ movimientos; kardex ≥ 0 en todo punto; cajas y banco ≥ 0; Σ costos prorrateados = total; comisiones del selector = recálculo ingenuo; KPI de Inicio = suma directa de ventas |
| `determinismo.test.ts` | Dos construcciones con las mismas entradas producen el mismo hash; cambiar la semilla cambia el hash |
| `reaplicacion.test.ts` | Construir → aplicar 30 comandos variados en vivo (Immer) → reconstruir desde el registro ⇒ estado idéntico. Repetir con `ahora` = mismo día más tarde y día siguiente: todos los comandos del usuario siguen aplicados y los invariantes se mantienen |
| `restaurar.test.ts` | Restaurar = construcción limpia |
| `narrativa.test.ts` | N1–N13 en distintos días de la semana y horas (antes de abrir, mediodía, de noche) |
| `patrones.test.ts` | P1–P20 con tolerancia y ≥ 4 hallazgos |
| `rango.test.ts` | 15–60 ventas por día abierto; diciembre el más alto; ene–feb los más bajos; sábado el mejor día; ninguna venta fuera de horario ni en el futuro |
| `rendimiento.test.ts` | Construcción < 3 s en CI (objetivo real < 1 s, medido por `scripts/medir-generador.ts`) |
| `tz` (script) | La suite completa con `TZ=UTC`, `Asia/Tokyo` y `America/Los_Angeles` da los mismos hashes |

`scripts/informe-coherencia.ts` imprime una tabla legible con todos los invariantes y patrones y sus cifras: es lo primero que corre el `auditor-datos` en fase 5.

---


---

## 8. Sistema de diseño

> Fuente de verdad visual para todos los paquetes. Si una pantalla necesita algo que no está aquí, se resuelve **combinando** piezas de esta sección, no inventando estilos nuevos. Si de verdad falta algo, se agrega aquí primero (paquete de sistema de diseño) y luego se usa.
>
> Referencias: PRD §4, §5, §6, §7.14c, §10, §11 y `docs/REFERENCIA_VISUAL.md` (lenguaje observado en el sitio de una casa de moda europea; tomamos proporciones, jerarquía y comportamiento, **nunca** nombre, logotipo, tipografía propietaria, eslóganes ni fotos).

### 8.0 Principios y decisiones de base

1. **Blanco, negro y aire.** La jerarquía la dan el contraste, el tamaño, el peso y el espacio. No hay color decorativo. El único acento (camel) se usa para *señalar*, nunca para *decorar*.
2. **Esquinas rectas.** Radio 0 en botones, campos, tarjetas, tablas, modales, cajones, insignias y tooltips. Excepciones cerradas: barra superior flotante y grupo de filtros (8 px / 6 px), elementos circulares por naturaleza (avatar, muestra de color, punto de estado, interruptor), hoja inferior de la app móvil (12 px arriba) y marco de teléfono.
3. **Líneas de 1 px, casi cero sombras.** Solo los elementos que flotan sobre otros (menús, popovers, tarjeta arrastrada) llevan `--shadow-float`. Nada más.
4. **Títulos en MAYÚSCULAS, peso 800–900, tracking normal.** Resolución de conflicto: el PRD §5.2 sugiere "mayúsculas espaciadas", pero la referencia que pidió el dueño muestra títulos con tracking normal y peso muy alto. Se sigue la referencia. El tracking amplio queda **solo** para el wordmark HALDEN (0,18 em) y los *eyebrows* (0,12 em). Las mayúsculas se aplican con CSS (`uppercase`); en el código los textos se escriben en tipo oración ("Inventario"), para que lectores de pantalla y exportaciones los lean bien.
5. **Una sola familia tipográfica: Figtree.** Sans geométrica libre (Google Fonts, licencia OFL), pesos variables 300–900, con la misma sensación de círculos llenos y terminaciones rectas de una geométrica tipo Averta, y con 900 real (Inter y Manrope no llegan a ese negro). Se autoaloja con `@fontsource-variable/figtree` (sin pedir a Google en tiempo de ejecución: más rápido, funciona sin conexión en la PWA y no hay terceros).
   - **Verificación obligatoria en el paquete de sistema de diseño:** comprobar que `font-variant-numeric: tabular-nums` cambia el ancho de las cifras en Figtree (renderizar `111.111` sobre `000.000` y comparar anchos). Si no lo soporta, se cambia **toda** la familia a `Plus Jakarta Sans Variable` (que sí trae `tnum`) modificando solo `--font-sans`. Nunca se mezclan dos familias.
6. **Densidad por superficie.** Escritorio: densa (cuerpo 14 px). App móvil: aireada, cifras grandes. Tienda: editorial (cuerpo 16 px).
7. **La marca del cliente manda; KippiCore firma.** HALDEN aparece en la barra lateral, la tienda y los documentos. KippiCore solo en la pantalla de entrada, el pie de la barra lateral y el pie de los PDF.
8. **Todo sale de tokens.** Prohibido escribir hex, `px` sueltos de color, `rounded-md`, `shadow-lg` o colores por defecto de Tailwind en componentes. El bloque de §8.14 **reinicia** los espacios de nombres por defecto de Tailwind (`--color-*: initial`, `--radius-*: initial`, `--shadow-*: initial`, `--text-*: initial`) para que `bg-blue-500` o `rounded-xl` ni siquiera existan.

---

### 8.1 Tokens de color

Los colores viven como variables crudas `--c-*` en `:root` (claro) y `[data-theme="dark"]` (oscuro), y se exponen a Tailwind con `@theme inline` como `--color-*`. Así `bg-surface`, `text-muted`, `border-line` cambian solos con el tema.

#### 8.1.1 Neutros y superficies

| Token (utilidad) | Claro | Oscuro (app `/app`) | Uso |
|---|---|---|---|
| `canvas` | `#F9F9F9` | `#0A0A0A` | Fondo de página |
| `surface` | `#FFFFFF` | `#141414` | Tarjetas, tablas, modales, cajones, barra lateral |
| `surface-2` | `#F4F4F4` | `#1C1C1C` | Hover de fila e ítem, celdas sutiles, campos de solo lectura |
| `selected` | `#EFEFEF` | `#222222` | Fila o ítem seleccionado, tramo medio de rango de fechas |
| `product` | `#EFEFEF` | `#DCDCDC` | Fondo de las ilustraciones de prenda (en oscuro se atenúa, pero sigue claro, como una foto de producto) |
| `glass` | `rgba(237,237,237,.8)` | `rgba(20,20,20,.75)` | Barra superior flotante, barra de pestañas móvil |
| `overlay` | `rgba(0,0,0,.4)` | `rgba(0,0,0,.6)` | Fondo de modal y cajón |
| `ink` | `#000000` | `#F2F2F2` | Texto principal, botón primario, línea fuerte, foco |
| `ink-2` | `#333333` | `#D4D4D4` | Texto de celdas secundarias, íconos activos no primarios |
| `muted` | `#666666` | `#A3A3A3` | Texto secundario, ayudas, etiquetas de eje, cabeceras de tabla |
| `subtle` | `#707070` | `#858585` | Metadatos (horas, "hace 5 min"), títulos de grupo de la barra lateral |
| `placeholder` | `#767676` | `#858585` | Placeholder de campos |
| `disabled` | `#A3A3A3` | `#5C5C5C` | Texto e íconos deshabilitados (exentos de contraste) |
| `inverse` | `#FFFFFF` | `#0A0A0A` | Texto sobre `ink` (botón primario, tooltip, toast) |
| `line` | `#DDDDDD` | `#262626` | Bordes por defecto (tarjetas, separadores) |
| `line-soft` | `#E4E4E4` | `#1F1F1F` | Separadores de filas, rejilla de gráficos |
| `line-strong` | `#CCCCCC` | `#333333` | Bordes de campos, cajas de talla, botón deshabilitado |
| `control` | `#8C8C8C` | `#6B6B6B` | Borde de checkbox, radio y pista de interruptor apagado (≥ 3:1) |

#### 8.1.2 Acento y semánticos (desaturados)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `accent` | `#A67C52` (camel) | `#C49A6C` | Puntos de pista, subrayado de cifra que cambió, serie destacada en gráficos, "hoy" en calendarios, separado, campañas. **Nunca texto pequeño en claro** (3,7:1). |
| `accent-ink` | `#7A5634` | `#D9B48A` | Texto en tono acento (6,5:1 sobre blanco) |
| `accent-soft` | `#F3ECE4` | `#2A221A` | Fondo de insignia acento, destello de cifra |
| `success` / `success-soft` | `#2F6B4F` / `#EAF1ED` | `#6FB08F` / `#14231B` | Pagada, recibido, aceptada, variación favorable |
| `warning` / `warning-soft` | `#8A5E0F` / `#F6EFE2` | `#D2A54A` / `#2A2112` | Pendiente, stock bajo, por vencer, llegada tarde |
| `danger` / `danger-soft` | `#A3302A` / `#F6E9E8` | `#E07A72` / `#2B1514` | Vencido, retrasado, agotado, error de campo, destructivo |
| `focus` | `#000000` | `#F2F2F2` | Anillo de foco |

`REFERENCIA_VISUAL.md` proponía alerta `#9A6B12`; se oscurece a `#8A5E0F` porque el original queda en 4,45:1 sobre `#F9F9F9`.

**El acento vive en la configuración de marca** (`brand.config`: `acento`, `acentoTexto`, `acentoSuave`). Al arrancar, la app escribe esos tres valores en `--c-accent`, `--c-accent-ink` y `--c-accent-soft` del elemento raíz. Cambiar de cliente = cambiar el archivo.

#### 8.1.3 Colores por tipo de evento (calendario, PRD §7.11)

Barra izquierda de 3 px + fondo suave + texto `ink`. Nunca bloques de color saturado.

| Tipo | Barra | Fondo |
|---|---|---|
| Turnos de empleados | `chart-2` | `surface-2` |
| Llegadas de importaciones | `ink` | `selected` |
| Vencimientos de obligaciones | `danger` | `danger-soft` |
| Campañas de temporada | `accent` | `accent-soft` |
| Citas con clientes | `success` | `success-soft` |

#### 8.1.4 Colores de producto (solo prendas y muestras)

Estos colores **no son de interfaz**: solo se usan en ilustraciones de prenda (§8.8), muestras circulares y chips de color. Viven en los datos semilla (`colores.ts`), no en los tokens.

| Nombre | Hex | Nombre | Hex |
|---|---|---|---|
| Blanco | `#F4F2EE` | Carbón | `#3B3B3B` |
| Marfil | `#E9E2D3` | Arena | `#D6C7AE` |
| Azul cielo | `#B9CBE0` | Camel | `#A67C52` |
| Azul medio | `#5A7499` | Café | `#5A4033` |
| Azul marino | `#1F2A44` | Verde oliva | `#5B5E3F` |
| Negro | `#161616` | Verde botella | `#23392F` |
| Gris claro | `#C9C9C7` | Vinotinto | `#5E1F2A` |
| Gris medio | `#8A8A88` | Rosa palo | `#E3C6C0` |

---

### 8.2 Tipografía

Familia única: `--font-sans: "Figtree Variable"`. Utilidades compuestas `t-*` (definidas en §8.14) aplican tamaño, interlineado, peso, tracking y caso en una sola clase. Toda cifra usa además `num` (`tabular-nums lining-nums`).

| Estilo (clase) | Tamaño / interlineado | Peso | Tracking | Caso | Uso |
|---|---|---|---|---|---|
| `t-display` | 56 / 60 | 800 | −0,01 em | MAYÚSCULAS | Pantalla de entrada, titular de portada de la tienda |
| `t-display-sm` | 36 / 40 | 800 | −0,005 em | MAYÚSCULAS | Display en móvil (tienda y app) |
| `t-h1` | 32 / 36 | 900 | 0 | MAYÚSCULAS | Título de página (uno por pantalla) |
| `t-h2` | 20 / 24 | 800 | 0,005 em | MAYÚSCULAS | Título de sección dentro de la página, título de modal |
| `t-h3` | 16 / 22 | 700 | 0 | Oración | Título de tarjeta, de bloque de formulario, de acordeón en escritorio |
| `t-h3-tienda` | 18 / 24 | 700 | 0 | Oración | Acordeones de ficha de producto |
| `t-eyebrow` | 11 / 16 | 700 | 0,12 em | MAYÚSCULAS | Sobretítulo, etiqueta de KPI, títulos de grupo de la barra lateral, encabezados de columna de kanban. La clase no fija color: se acompaña de `text-muted` (o `text-subtle`, `text-inverse` según el fondo) |
| `t-body-lg` | 16 / 24 | 400 | 0 | Oración | Cuerpo de la tienda, textos de bienvenida |
| `t-body` | 14 / 22 | 400 | 0 | Oración | **Cuerpo por defecto del escritorio**, celdas de tabla |
| `t-small` | 12 / 18 | 400 | 0 | Oración | Ayudas, segunda línea de celdas, migas de pan |
| `t-label` | 12 / 16 | 600 | 0 | Oración | Etiquetas de campo, chips de filtro |
| `t-micro` | 11 / 14 | 500 | 0 | Oración | Leyendas de gráfico, pies de tarjeta, etiquetas de pestaña móvil (10 px en la barra inferior) |
| `t-button` | 13 / 16 | 700 | 0,04 em | MAYÚSCULAS | Botones primario, secundario y destructivo |
| `t-nav` | 13 / 20 | 600 | 0 | Oración | Ítems de barra lateral y barra superior |
| `t-nav-tienda` | 14 / 20 | 700 | 0 | Oración | Navegación de la tienda |
| `t-kpi-sm` | 24 / 28 | 800 | −0,015 em | — | Cifras en tarjetas pequeñas, totales de cajón |
| `t-kpi` | 32 / 36 | 800 | −0,02 em | — | Cifra de tarjeta KPI en escritorio |
| `t-kpi-xl` | 44 / 48 | 800 | −0,025 em | — | Cifra protagonista de la app móvil y del éxito de venta en POS |
| `t-wordmark` | 18 / 18 (lateral), 20 (tienda), 64 (entrada) | 900 | 0,18 em | MAYÚSCULAS | Solo el nombre de la marca del cliente |
| `num` | — | — | — | — | Cifras tabulares; obligatorio en tablas, KPI, ejes, totales, relojes |

Reglas:
- Texto corrido nunca en MAYÚSCULAS. Máximo de línea: 72 caracteres (`max-w-[72ch]`) en ayudas y descripciones.
- En la tienda el nombre de producto va en tipo oración 14/700 y el precio 16/400 debajo (patrón de la referencia).
- Referencias, SKU y EAN: `t-small num` con tracking `0.02em`; nunca monoespaciada salvo el CUFE de la factura (`font-mono`, 11 px).
- Pesos permitidos: 400, 500, 600, 700, 800, 900. No usar 300 en interfaz (se ve débil sobre `#F9F9F9`).

---

### 8.3 Espaciado, radios, bordes, sombras, capas y movimiento

#### 8.3.1 Espaciado
Base 4 px (la de Tailwind v4: `--spacing: 0.25rem`). Escala usada: 0 · 1 (4) · 2 (8) · 3 (12) · 4 (16) · 5 (20) · 6 (24) · 8 (32) · 10 (40) · 12 (48) · 16 (64) · 20 (80) · 24 (96). Ningún otro valor sin justificación.

| Regla | Valor |
|---|---|
| Padding horizontal de contenido (escritorio) | 32 px (`px-8`); 24 px por debajo de 1440 px |
| Separación entre secciones de una página | 40 px (`gap-10`) |
| Separación entre tarjetas | 16 px (`gap-4`) en filas de KPI; 24 px (`gap-6`) entre bloques |
| Padding de tarjeta | 20 px (`p-5`) compacta, 24 px (`p-6`) normal |
| Padding de modal/cajón | 24 px |
| Campos en formulario | 16 px vertical entre campos, 24 px entre columnas |
| App móvil: margen de pantalla | 16 px; entre tarjetas 12 px |
| Tienda: gutter de grilla | 8 px horizontal, 32 px vertical (incluye nombre y precio) |

Variables de layout (en `:root`, ver §8.14): `--sidebar-w: 248px`, `--sidebar-w-rail: 72px`, `--topbar-h: 56px`, `--topbar-gap: 12px`, `--rolestrip-h: 0px | 36px`, `--sticky-top` (calculada), `--drawer-w: 520px`, `--drawer-w-lg: 720px`, `--tabbar-h: 56px`.

#### 8.3.2 Radios
| Token | Valor | Dónde |
|---|---|---|
| `rounded-none` | 0 | **Todo por defecto** |
| `rounded-xs` | 2 px | Barras de progreso y marcas internas de 4 px de alto (evita bordes serrados). Nada más |
| `rounded-pill` | 6 px | Botones internos del grupo de filtros |
| `rounded-chrome` | 8 px | Barra superior flotante (escritorio y tienda), grupo de filtros negro |
| `rounded-sheet` | 12 px | Solo esquinas superiores de la hoja inferior en `/app` |
| `rounded-device` | 52 px | Marco de teléfono |
| `rounded-full` | 9999 px | Avatar, muestra de color, puntos, interruptor, insignia de conteo |

#### 8.3.3 Bordes
- Grosor único: **1 px**. Dos píxeles solo para: foco (anillo de 2 px), pestaña activa (subrayado de 2 px), indicador de selección (barra interior de 2 px) y campo enfocado (1 px de borde + 1 px interior = 2 px visuales).
- Color por defecto `line`; separadores de fila `line-soft`; campos `line-strong`; borde de cabecera de tabla, totales y elementos activos `ink`.

#### 8.3.4 Sombras (casi ninguna)
| Token | Valor | Uso exclusivo |
|---|---|---|
| `shadow-float` | `0 8px 24px -8px rgb(0 0 0 / .12)` | Popover, menú, select abierto, combobox, selector de fechas |
| `shadow-drag` | `0 12px 32px -8px rgb(0 0 0 / .18)` | Tarjeta de kanban o turno mientras se arrastra |

Modales y cajones **no** llevan sombra: los separa el `overlay`. Tarjetas nunca llevan sombra, ni en hover.

#### 8.3.5 Capas (z-index)
Variables en `:root`, usadas como `z-(--z-modal)`:

| Variable | Valor | Elemento |
|---|---|---|
| `--z-base` | 0 | Contenido |
| `--z-sticky` | 10 | Cabecera y totales fijos de tabla, barra de acciones en lote |
| `--z-hint` | 15 | Puntos pulsantes de pista |
| `--z-sidebar` | 20 | Barra lateral |
| `--z-topbar` | 30 | Barra superior flotante, barra de pestañas móvil |
| `--z-rolestrip` | 35 | Franja de rol |
| `--z-tryit` | 38 | Panel flotante "Prueba esto" |
| `--z-popover` | 40 | Select, menú, popover, combobox, selector de fechas |
| `--z-drawer` | 50 | Cajón lateral y su overlay |
| `--z-modal` | 60 | Modal, confirmación, hoja inferior móvil |
| `--z-toast` | 70 | Toasts |
| `--z-tooltip` | 80 | Tooltips (siempre encima) |

Un popover abierto **dentro** de un modal usa el portal de Radix y hereda `--z-modal + 1` mediante `z-[61]`; es la única excepción permitida.

#### 8.3.6 Duraciones y curvas
| Variable | Valor | Uso |
|---|---|---|
| `--dur-instant` | 80 ms | Cambio de color en hover, check de checkbox |
| `--dur-fast` | 140 ms | Menús, popovers, tooltips (entrada), salida de casi todo |
| `--dur-base` | 200 ms | Transición de página, modal, pestañas, franja de rol |
| `--dur-slow` | 240–320 ms | Cajón, hoja inferior, acordeón, colapso de barra lateral |
| `--dur-count` | 900 ms | Contador de cifras |
| `--ease-standard` | `cubic-bezier(.2, 0, 0, 1)` | Por defecto |
| `--ease-enter` | `cubic-bezier(.16, 1, .3, 1)` | Entradas (desacelera largo, se siente "caro") |
| `--ease-exit` | `cubic-bezier(.4, 0, 1, 1)` | Salidas |

Sin rebotes, sin resortes, sin parallax. Todo respeta `prefers-reduced-motion` (§8.10.6).

---

### 8.4 Layout de escritorio (`/`)

#### 8.4.1 Esqueleto

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FRANJA DE ROL (36 px, solo si rol ≠ dueño)                              │
├──────────────┬──────────────────────────────────────────────────────────┤
│ BARRA        │  ╭ barra superior flotante (56 px, a 12 px de bordes) ╮  │
│ LATERAL      │  ╰─────────────────────────────────────────────────────╯  │
│ 248 px       │  Migas  Inicio | Inventario                              │
│ fija         │  TÍTULO DE PÁGINA                    [Secund.] [PRIMARIO] │
│              │  Subtítulo en lenguaje sencillo                           │
│              │  Pestañas ───────────────────────────────────────────    │
│              │  [buscar]  ▌Filtros · Local · Fechas ▐        [Exportar] │
│              │  Contenido (retícula de 12 columnas)                      │
│ Desarrollado │                                                          │
│ por KippiCore│                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

- Contenedor raíz: `grid grid-cols-[var(--sidebar-w)_1fr] min-h-dvh bg-canvas`.
- La página hace scroll en el documento (no en un contenedor interno), para que las cabeceras de tabla fijas y el scroll del navegador funcionen naturalmente.
- Anchos: objetivo 1440 px, mínimo cómodo 1280 px. Entre 1024 y 1279 px la barra lateral pasa a **riel** de 72 px (solo íconos, tooltip con el nombre). Por debajo de 1024 px se muestra un aviso elegante: "KippiCore está pensado para la computadora del local. Para el celular, abre la app del dueño" + QR y botón a `/app`.

#### 8.4.2 Barra lateral

- Ancho 248 px, `bg-surface`, `border-r border-line`, `position: sticky; top: var(--rolestrip-h); height: calc(100dvh - var(--rolestrip-h))`, scroll interno propio con barra de 4 px.
- **Cabecera (64 px de alto, alineada con la barra superior):** wordmark `HALDEN` (`t-wordmark` 18 px, `ink`) y debajo el descriptor `MENSWEAR · BOGOTÁ` en `t-eyebrow` 10 px `subtle`. Padding izquierdo 20 px. Clic → Inicio. Ambos textos salen de `brand.config`.
- **Grupos** (título `t-eyebrow` 10 px `subtle`, `mt-6 mb-2 px-5`; el primer ítem no lleva título):

| Grupo | Módulos (orden PRD §6.4) | Ícono lucide |
|---|---|---|
| — | Inicio | `House` |
| Vender | Punto de venta · Ventas · Clientes | `ScanBarcode` · `ReceiptText` · `Contact` |
| Mercancía | Inventario · Importaciones · Proveedores | `Shirt` · `Ship` · `Factory` |
| Plata | Pagos · Costos y gastos · Facturación | `Wallet` · `HandCoins` · `FileText` |
| Equipo y agenda | Personal y nómina · Calendario | `Users` · `CalendarDays` |
| Entender el negocio | Análisis · Reportes | `ChartColumn` · `FileDown` |
| Crecer | Canales digitales | `MessagesSquare` |
| Sistema | Configuración | `Settings2` |

  (16 módulos. Los nombres de íconos se verifican contra la versión instalada de `lucide-react`; si alguno cambió de nombre se usa su alias, nunca otro ícono "parecido" de otra librería.)

- **Ítem:** alto 36 px, `mx-3 px-3`, `flex items-center gap-3`, ícono 18 px `ink-2`, texto `t-nav ink-2`.
  - Hover: `bg-surface-2 text-ink`.
  - **Activo: bloque negro** `bg-ink text-inverse`, ícono `inverse`, peso 700. Es el ancla visual de la pantalla (eco de los botones negros de la referencia).
  - Foco: anillo de foco estándar, `outline-offset: -2px` (dentro del ítem).
  - Contador opcional a la derecha (alertas, separados por vencer): `t-micro num`, sin fondo, `muted`; en el ítem activo `inverse`.
  - Pista nueva: punto camel de 6 px a la derecha (ver §8.10.4).
- Por rol, los módulos no permitidos **se ocultan** (no se deshabilitan). Un grupo sin ítems visibles desaparece con su título.
- **Pie** (`border-t border-line`, padding 16 px 20 px): fila con avatar de 32 px de la persona del rol actual + nombre (`t-label ink`) + rol y local (`t-small muted`). Debajo, separado 12 px: `Desarrollado por KippiCore` en `t-micro subtle`, enlace sin subrayado a la pantalla de entrada; hover subrayado. Botón de colapsar a riel (`ChevronsLeft`, fantasma 28 px) a la derecha del pie.

#### 8.4.3 Barra superior flotante

- `position: sticky; top: calc(var(--rolestrip-h) + var(--topbar-gap))`, `mx-6 mt-3`, alto 56 px, `rounded-chrome`, `glass` (fondo `glass` + `backdrop-filter: blur(9px) saturate(1.1)`), **sin borde y sin sombra**, `z-(--z-topbar)`, padding `0 8px 0 12px`.
- **Izquierda:** buscador global (Combobox, ancho 320 px, alto 36, fondo `surface` al 70 %, placeholder "Buscar referencia, cliente o venta", atajo visible `⌘K` / `Ctrl K` en `t-micro subtle`). Resultados agrupados: Productos, Clientes, Ventas, Importaciones.
- **Derecha** (de izquierda a derecha, `gap-1`, todos alto 36 px, estilo fantasma con hover `bg-surface/70`):
  1. **Selector de local:** ícono `MapPin` 16 + "Todos los locales" (`t-nav`) + `ChevronDown` 14. Opciones del archivo de configuración. Con rol vendedor se muestra fijo, con ícono `Lock` 14 y tooltip "Tu local está fijo en este rol".
  2. **Moneda:** control segmentado compacto `COP · US$ · CN¥` (alto 28, borde `line-strong`, activo `bg-ink text-inverse`, `t-label num`). Tooltip: "Tasa de ejemplo: US$ 1 = $ 4.050 · cambiar en Configuración".
  3. **Rol:** avatar 24 + "Dueño" + `ChevronDown`. Menú con las tres personas (avatar, nombre, rol, local) y una línea de ayuda: "Mira lo que vería cada persona en la computadora del local".
  4. Separador vertical 1 px × 24 px `line-strong`.
  5. **Ver app del dueño:** botón secundario `sm` con ícono `Smartphone`. Abre un popover grande (ancho 360) o, en ≥ 1440 px, un modal `lg` con dos columnas: QR de 160 px + URL + texto "Escanéalo con la cámara de tu celular", y a la derecha la vista previa de `/app` en el **marco de teléfono** (§8.7.30) a escala 0,72.
  6. **Ayuda "?":** botón solo ícono `CircleHelp`. Abre un menú: "Ver bienvenida", "Prueba esto (3 de 8)", "Atajos de teclado".
  7. **Notificaciones:** botón solo ícono `Bell`; con pendientes, punto `accent` de 8 px arriba a la derecha con anillo de 2 px `surface`. Abre un popover de 400 px con lista agrupada por día; cada ítem: ícono del módulo 16, título `t-body` 600, detalle `t-small muted`, hora `t-micro subtle`, no leído con punto camel de 6 px.

#### 8.4.4 Franja de rol

- Solo cuando el rol ≠ dueño. Ocupa todo el ancho, arriba de todo, alto 36 px, `bg-ink text-inverse`, `t-small`, padding 0 20 px, `position: sticky; top: 0; z-(--z-rolestrip)`. Al activarse, `--rolestrip-h` pasa a 36 px y todo baja con transición de 200 ms.
- Izquierda: ícono `Eye` 14 + "Estás viendo KippiCore como: **Vendedor · Local Usaquén**" (la parte en negrita a 700).
- Derecha: enlace "Volver a la vista del dueño" `t-label` 700 subrayado (offset 3 px) + `ArrowRight` 14. Foco visible en `inverse`.
- No es un banner de alerta: sin íconos de advertencia ni color.

#### 8.4.5 Encabezado de página

- Padding superior 24 px desde la barra superior, padding horizontal igual al contenido.
- **Migas:** `t-small muted`, separadas por ` | ` (barra vertical con un espacio a cada lado, color `line-strong`). La última miga en `ink`, sin enlace. Máximo 4 niveles; los niveles intermedios se truncan con `…` y tooltip.
- **Título:** `t-h1`, `mt-2`. Si es un detalle (una venta, una importación), el título es el identificador o nombre (`V-000482`, `IMP-2026-07`, `CAMISA OXFORD SLIM FIT`) y a su derecha, alineada a la línea base, la insignia de estado.
- **Subtítulo opcional:** `t-body muted`, `mt-2 max-w-[72ch]`, una frase que explica el módulo en lenguaje del comerciante ("Todo lo que han vendido los tres locales, con su detalle").
- **Acciones:** a la derecha, alineadas con la base del título. Orden: menú "Más" (fantasma, `MoreHorizontal`) · secundarios · un único primario a la derecha. Máximo 3 botones visibles.
- **Pestañas del módulo** (si las hay): `mt-6`, ancho completo, borde inferior `line-soft`.
- El encabezado **no** es fijo; lo fijo es la barra superior.

#### 8.4.6 Retícula de contenido

- `max-w-[1600px]`, retícula de 12 columnas, `gap-6`. A 1440 px el área útil es ≈ 1128 px.
- Filas de KPI: `grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4` (6 en 1440+, 3 + 3 en 1280).
- Patrones de composición: (a) 8 + 4 (gráfico + lista lateral); (b) 6 + 6 (comparativos); (c) 12 (tablas). Una tabla siempre ocupa 12 columnas.
- Encabezado de sección: `t-h2` a la izquierda, enlace "Ver todo" (`t-label` 700 subrayado al hover, `ArrowRight` 14) a la derecha, `mb-4`.

#### 8.4.7 Pantalla de entrada (antes del escritorio)

Fondo `canvas`, columna centrada de 960 px. Arriba `t-eyebrow` "KippiCore CRM · Demo para HALDEN"; debajo el wordmark `HALDEN` a 64 px; una frase `t-body-lg muted` (máx. 56 ch). Tres "puertas" en 3 columnas, cada una tarjeta de borde 1 px `line`, padding 24, ícono 24, `t-h3`, una línea `t-small muted` y flecha `ArrowUpRight` abajo a la derecha. Hover: borde `ink` y fondo `surface`. La primera ("Explorar como dueño") es la única con fondo `ink` y texto `inverse`. La tercera muestra el QR (96 px) en lugar del ícono.

---

### 8.5 Layout de la app móvil (`/app`)

**Tema:** oscuro por defecto (`data-theme="dark"` en el raíz de `/app`), con interruptor "Modo claro" en *Más → Apariencia* (guardado en almacenamiento local). Respeta el mismo sistema de tokens; solo cambian los valores.

#### 8.5.1 Marco y áreas seguras
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; `theme-color` `#0A0A0A` (oscuro) / `#F9F9F9` (claro); `apple-mobile-web-app-status-bar-style: black-translucent`.
- Contenedor: `min-h-dvh bg-canvas`, `padding-top: env(safe-area-inset-top)`, `padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 16px)`.
- Diseñada para 360–430 px. Por encima de 480 px (si alguien la abre en escritorio sin marco), el contenido se centra en una columna de 430 px sobre `canvas`.

#### 8.5.2 Encabezado de pantalla
- **Grande (al cargar):** fila superior de 44 px con, a la derecha, selector de local (`MapPin` + nombre corto, fantasma) y moneda (chip `COP`). Debajo, el título `t-h1` a 28/32 (`text-[1.75rem]` vía la variante móvil `t-h1-app`) y la fecha en `t-small muted`: "Martes 30 de septiembre · Todos los locales".
- **Compacto (al desplazar > 56 px):** barra fija de 44 px con `glass` y desenfoque de 16 px, título centrado `t-h3` 700 MAYÚSCULAS, borde inferior `line`. Transición 200 ms.

#### 8.5.3 Barra de pestañas inferior
- Fija abajo, alto `56px + env(safe-area-inset-bottom)`, `glass` con desenfoque 16 px, `border-t border-line`, `z-(--z-topbar)`.
- 5 pestañas iguales: **Hoy** (`Sun`) · **Ventas** (`ReceiptText`) · **Inventario** (`Shirt`) · **Agenda** (`CalendarDays`) · **Más** (`Ellipsis`).
- Cada una: ícono 22 px trazo 1,5 + etiqueta 10/12 600 debajo, área táctil completa (≥ 64 × 56). Inactiva `subtle`; activa `ink` con una barra de 16 × 2 px `ink` sobre el ícono (pegada al borde superior de la barra). En *Más*, punto `accent` de 6 px si hay alertas.
- Cambio de pestaña: sin animación de deslizamiento; fundido del contenido 140 ms y se conserva el scroll de cada pestaña.

#### 8.5.4 Contenido
- Tarjetas: `bg-surface border border-line`, radio 0, padding 16, separación 12. Tarjeta clicable: toda el área es enlace; `ChevronRight` 16 `subtle` a la derecha; presionado `bg-surface-2`.
- **Cifra protagonista (Hoy):** `t-eyebrow` "Vendido hoy" + `t-kpi-xl num` (con contador animado §8.10.2) + variación "▲ 12,4 % vs. el martes pasado" + barra de meta del día de 2 px (`accent` sobre `line`) con "68 % de la meta".
- Cifras secundarias en rejilla 2 × 2 de tarjetas con `t-kpi-sm`.
- Listas: filas de 56 px (64 con dos líneas), separadores `line-soft`, sin tarjeta envolvente cuando la lista es la pantalla.
- Gráficos: sin eje Y, solo etiquetas del eje X, alto 160 px; tocar una barra muestra su valor arriba del gráfico (no tooltip flotante).
- Acciones de aprobación ("Aprobar traslado", "Marcar pagado"): botón primario de ancho completo, alto 48 (en oscuro el primario es `bg-ink` = `#F2F2F2` con texto `inverse` = `#0A0A0A`).
- Detalles: navegación tipo pila (la pantalla entra desde la derecha, 240 ms `ease-enter`; flecha "Atrás" `ChevronLeft` + nombre de la pantalla anterior).
- Modales → **hojas inferiores** (`rounded-t-sheet`, asa de 36 × 4 px `line-strong` centrada, máx. 88 dvh, entrada 280 ms desde abajo). Nunca modales centrados en `/app`.
- Áreas táctiles ≥ 44 × 44 px siempre.

---

### 8.6 Tienda `/tienda` (HALDEN)

Superficie editorial, siempre en modo claro. Misma familia y tokens; cuerpo a 16 px. Estructura casi idéntica a la referencia; identidad 100 % HALDEN.

#### 8.6.1 Etiqueta de vitrina (PRD §7.14)
Chip fijo abajo a la izquierda (`fixed bottom-4 left-4`, `z-(--z-tryit)`): alto 32, `bg-ink text-inverse`, `t-micro` 600, padding 0 12, ícono `Eye` 14: "Vista previa de lo que KippiCore puede construir para HALDEN" + separador + enlace "Volver a KippiCore". En el marco de navegador (dentro del módulo Canales digitales) el chip se reemplaza por la misma frase sobre el marco.

#### 8.6.2 Encabezado flotante
- `fixed top-3 inset-x-3`, alto 64, `rounded-chrome`, `glass` (`rgba(237,237,237,.8)` + `blur(9px)`), sin borde ni sombra, padding 0 24. Visible también sobre la portada oscura.
- Izquierda: wordmark `HALDEN` (`t-wordmark` 20 px).
- Centro: navegación `t-nav-tienda` con `gap-8`: Novedades · Sastrería · Camisas · Pantalones · Abrigos · Zapatos y accesorios. Hover y activo: subrayado de 1 px a 4 px de la línea base.
- Derecha (`gap-5`, íconos 20 px trazo 1,5): `Search`, `MapPin` (tiendas), `User`, `Heart`, `ShoppingBag` con contador `t-micro num` en círculo negro de 16 px.
- Móvil (< 768 px): `inset-x-2`, alto 56, `Menu` a la izquierda, wordmark centrado, bolsa a la derecha; la navegación abre un panel a pantalla completa con los enlaces en `t-h2`.

#### 8.6.3 Portada
- **Hero a sangre:** `h-[100svh] min-h-[560px]`, fondo carbón cálido `#1E1C1A` (variable `--tienda-hero` en `brand.config`). Composición *flat lay* de tres prendas ilustradas (§8.8) a escala grande, centradas en el 60 % superior y ligeramente superpuestas: abrigo camel al centro, sweater marfil a la izquierda, pantalón carbón a la derecha, trazo 1,5.
- Texto centrado en el tercio inferior, blanco: `t-eyebrow` "Otoño · Invierno 2026" (blanco al 70 %), `t-display` "Sastrería de temporada" (blanco), y dos enlaces `t-body-lg` 700 blancos subrayados (offset 4 px): "Comprar ahora" y "Ver la colección", separados 32 px.
- **Categorías:** 4 columnas, gap 8, tiles 3:4 con fondo `product` y prenda; debajo `t-h3` en MAYÚSCULAS 800 + "Ver todo" subrayado.
- **Novedades:** encabezado `t-h1` + "Ver todo"; carrusel de tarjetas de producto (mismas de la grilla) con flechas cuadradas de 40 px borde `line-strong`.
- **Banner editorial dividido** 50/50: izquierda tile `product` con traje marino; derecha texto sobre `canvas` (`t-eyebrow`, `t-h1`, párrafo `t-body-lg muted`, botón secundario).
- **Pie:** `bg-canvas`, `border-t border-line`, 4 columnas de enlaces (`t-label` 700 títulos, `t-small` enlaces), boletín con campo de línea inferior y flecha; abajo `t-micro subtle`: "© 2026 HALDEN · Marca ficticia creada para esta demostración".

#### 8.6.4 Listado (PLP)
- Migas `t-small` con ` | `; título `t-h1` ("CAMISAS") + conteo `t-body muted num` ("48 artículos").
- Barra de filtros fija bajo el encabezado (`top: 88px`): **grupo píldora negro** (§8.7.13) con "Filtrar" (`SlidersHorizontal`) · "Ordenar" · "Talla" · "Color"; a la derecha conmutador de columnas 2/4 (íconos `Grid2x2`, `LayoutGrid`).
- **Grilla:** 4 columnas en ≥ 1024, 2 en móvil; gap 8 px horizontal, 32 px vertical.
- **Tarjeta de producto:** imagen 3:4 (`aspect-[3/4] bg-product`), ícono `Heart` 20 px arriba a la derecha (inset 12 px; activo relleno `ink`); en hover la imagen cambia a la vista "detalle" (§8.8.5) con fundido 200 ms y aparece una franja blanca inferior de 40 px con las tallas disponibles (`t-label`, agotadas tachadas). Debajo, `mt-3`: nombre 14/700 tipo oración, precio 16/400 `num`, muestras de color de 12 px con `gap-1.5` y "+2" `t-micro muted` si hay más de 4. Insignia opcional "Nuevo" `t-eyebrow` sobre la imagen arriba a la izquierda, sin fondo.

#### 8.6.5 Ficha de producto (PDP)
- Retícula de 12 columnas: **galería en 1–8**, **columna de información en 9–12** (sticky, `top: 96px`).
- Galería: dos imágenes 3:4 lado a lado (frente y detalle), debajo dos más (tejido y la prenda en otro color si existe). Gap 8. Clic → visor a pantalla completa sobre `canvas`.
- Columna derecha, en orden y con `space-y-6`:
  1. Migas `t-small`.
  2. Título `t-h1` a 24/28 900 MAYÚSCULAS.
  3. Precio `t-body-lg num`.
  4. "Color: **Azul marino**" `t-label` + muestras de 24 px (seleccionada con anillo 1 px `ink` y separación 2 px).
  5. "Talla" `t-label` + a la derecha "Guía de tallas" `t-small` subrayado; rejilla de cajas de talla (§8.7.25) de 5 columnas, alto 48.
  6. Nota de existencias `t-small`: "Quedan 2 en tu talla" (`warning`) o "Disponible en Parque 93 y Usaquén" (`muted`), calculada con el inventario real de la demo.
  7. **CTA negro ancho completo:** "Agregar a la bolsa", alto 52, `t-button` a 16 px. Deshabilitado (`bg-line-strong`) con texto "Elige una talla" hasta elegir.
  8. Enlace secundario `t-label` subrayado: "Ver disponibilidad en tienda" (abre lista de locales con unidades).
  9. **Acordeones** (borde superior `line` en cada uno, último con borde inferior): "Detalles", "Composición y cuidado", "Envíos, cambios y devoluciones", "Disponibilidad por tienda". Disparador 56 px, `t-h3-tienda`, `ChevronDown` 18 que gira 180° en 240 ms. Contenido `t-body muted`, `pb-6`.
- Móvil: galería como carrusel horizontal con indicador de líneas (segmentos de 24 × 2 px), CTA fijo abajo en una barra blanca con `border-t`.

#### 8.6.6 Bolsa y pago
- Bolsa: cajón derecho de 440 px, `bg-surface`. Líneas con miniatura 3:4 de 72 px, nombre, color · talla, cantidad (− 1 +, cajas de 32), precio; total `t-kpi-sm`; CTA negro "Ir a pagar".
- Pago (una página, 7 + 5 columnas): datos de contacto y envío con campos estándar (§8.7.2), métodos como **tarjetas de radio** (borde 1 px, seleccionada borde `ink` + interior 1 px): Tarjeta · PSE · Nequi (solo texto, sin logotipos). Resumen a la derecha. CTA "Pagar $ 389.800". Nota `t-small muted`: "Pago simulado: no se cobra nada".
- Confirmación: `t-eyebrow` "Pedido HAL-W-000127", `t-h1` "Gracias, Andrés", y una tarjeta con borde `ink`: "Esta compra ya aparece en KippiCore con canal Web y descontó el inventario de la bodega" + botón primario "Verla en KippiCore".

---

### 8.7 Componentes base

Implementación sobre **Radix primitives** (`Dialog`, `AlertDialog`, `Popover`, `Tooltip`, `Select`, `Tabs`, `Checkbox`, `RadioGroup`, `Switch`, `Accordion`, `DropdownMenu`, `ToggleGroup`, `Toast`, `ScrollArea`), `cmdk` para el Combobox, `react-day-picker` (locale `es`) para fechas, `@dnd-kit/core` para kanban y turnos, `@tanstack/react-table` para tablas, `jsbarcode` y `qrcode` para códigos. Los componentes viven en una carpeta única de UI (nombre según la sección de arquitectura) y **ningún módulo estiliza un primitivo de Radix directamente**.

Estados comunes a todo control interactivo:
- **Hover:** cambio de fondo o borde en `--dur-instant`.
- **Foco (`:focus-visible`):** `outline: 2px solid var(--c-focus); outline-offset: 2px`. Nunca se quita.
- **Deshabilitado:** `cursor-not-allowed`, colores de la tabla de cada componente, sin hover. Siempre con tooltip que diga **por qué** ("Disponible solo para el dueño").
- **Error:** borde `danger` + mensaje debajo con ícono `CircleAlert` 14 `danger` y texto `t-small danger`.
- **Cargando:** `aria-busy`, spinner `LoaderCircle` 16 con `animate-spin` (solo si la espera supera 300 ms).

#### 8.7.1 Button

| Variante | Reposo | Hover | Activo (presionado) | Deshabilitado |
|---|---|---|---|---|
| `primary` | `bg-ink text-inverse` | `bg-ink/85` | `bg-ink` + `translate-y-px` | `bg-line-strong text-inverse` (como la referencia: gris `#CCC` con texto blanco) |
| `secondary` | `bg-transparent border border-ink text-ink` | `bg-ink text-inverse` | ídem + `translate-y-px` | `border-line-strong text-disabled` |
| `ghost` | `text-ink` sin borde | `bg-surface-2` | `bg-selected` | `text-disabled` |
| `destructive` | `bg-danger text-inverse` | `bg-danger/90` | `translate-y-px` | `bg-line-strong text-inverse` |
| `link` | `text-ink underline-offset-4` 700 | `underline` | — | `text-disabled` |
| `inverse` | `bg-inverse text-ink` (sobre fondos negros) | `bg-inverse/90` | — | — |

| Tamaño | Alto | Padding X | Texto | Ícono |
|---|---|---|---|---|
| `sm` | 32 | 12 | `t-button` 12 px | 14 |
| `md` (por defecto en escritorio) | 40 | 20 | `t-button` 13 px | 16 |
| `lg` (tienda, app móvil, POS) | 48 | 30 | `t-button` 14 px; en tienda 16 px | 18 |

- `primary`, `secondary` y `destructive` van en MAYÚSCULAS (`t-button`). `ghost` y `link` en tipo oración `t-label` 14/600 (se usan dentro de tablas y barras).
- Ícono a la izquierda con `gap-2`; flecha de avance a la derecha solo en CTA de navegación.
- **Solo ícono:** cuadrado (32/40/48), variante `ghost` por defecto, ícono centrado; `aria-label` obligatorio y tooltip con el mismo texto.
- **Cargando:** el ícono se reemplaza por el spinner, el texto se mantiene, el ancho no cambia (`min-width` fijado al montar).
- `fullWidth` para CTA de ficha de producto, pagos y hojas móviles.
- Un solo `primary` por zona visual. Destructivo solo dentro de confirmaciones; en tablas y menús la acción "Eliminar" es un ítem `ghost` con texto `danger`.

#### 8.7.2 Input (texto, número, moneda)
- Alto 40 (`sm` 32, `lg` 48), `bg-surface border border-line-strong`, radio 0, padding 0 12, `t-body ink`, placeholder `placeholder`.
- Etiqueta arriba: `t-label ink`, `mb-1.5`. Campo opcional: "(opcional)" en `muted` junto a la etiqueta; **no** se usan asteriscos.
- Ayuda debajo: `t-small muted`, `mt-1.5`.
- Hover: borde `control`. Foco: borde `ink` + `box-shadow: inset 0 0 0 1px var(--c-ink)` (2 px visuales; en campos no se usa el anillo con offset). Error: borde `danger` + sombra interior `danger` al enfocar + mensaje. Deshabilitado: `bg-surface-2 text-disabled border-line`. Solo lectura: `bg-surface-2`, sin borde visible al hover.
- Adornos: prefijo/sufijo dentro del campo en `muted` (`$`, `COP`, `%`, `uds.`), separados por 8 px; ícono de búsqueda 16 a la izquierda.
- **Moneda y números:** alineados a la derecha, `num`, se formatean al perder el foco (`1.250.000`) y se muestran crudos al enfocar. Teclado móvil `inputmode="numeric"` / `decimal`.
- Textarea: mismas reglas, alto mínimo 96, redimensionable solo en vertical.
- Validación al perder foco y al enviar; nunca mientras se escribe la primera vez.

#### 8.7.3 Select
- Disparador idéntico al Input con `ChevronDown` 16 `muted` a la derecha; valor en `ink`, vacío en `placeholder` ("Elige un local").
- Contenido: `bg-surface border border-line shadow-float`, radio 0, ancho = disparador (mín. 180), padding 4, `max-h-80` con scroll.
- Ítem: alto 36, padding 0 12, `t-body`; hover/teclado `bg-surface-2`; seleccionado 600 + `Check` 16 a la derecha. Grupos con `t-eyebrow` 10 px.
- Variante `ghost` (barra superior): sin borde, fondo transparente.

#### 8.7.4 Combobox de búsqueda
- `cmdk` dentro de un Popover. Campo con `Search` 16; resultados agrupados con títulos `t-eyebrow`; coincidencia resaltada en 700 (no en color).
- Ítem de producto (POS, buscador global): miniatura 3:4 de 32 × 43 (`bg-product` + prenda), nombre `t-body` 600, segunda línea `t-small muted num` "HL-CAM-0142 · $ 189.900 · 14 en este local". Ítem de cliente: avatar 24 + nombre + celular.
- Teclado: ↑ ↓ mueven, Enter elige, Esc cierra. Sin resultados: "No encontramos «oxfrod». Revisa la referencia o escanea el código" + botón `ghost` "Crear cliente" cuando aplica.
- En POS el campo acepta el pegado/escaneo de un EAN-13 completo y elige automáticamente la variante.

#### 8.7.5 Checkbox
16 × 16, radio 0, borde 1 px `control`, fondo `surface`. Marcado: `bg-ink border-ink` + `Check` 12 en `inverse` trazo 2,5. Indeterminado: guion 8 × 1,5. Hover: borde `ink`. Deshabilitado: `bg-surface-2 border-line`. Etiqueta `t-body` a 8 px; toda la fila es clicable (área mínima 32 de alto).

#### 8.7.6 Switch
Pista 36 × 20 `rounded-full`, apagado `bg-control`, encendido `bg-ink`; pulgar 16: encendido `bg-inverse`; apagado `bg-surface` en claro y `dark:bg-ink` en oscuro. Transición 140 ms. Etiqueta a la izquierda y valor textual opcional a la derecha ("Exonerado" / "No exonerado") para el interruptor del art. 114-1.

#### 8.7.7 Radio
16 × 16 `rounded-full`, borde 1 px `control`; seleccionado borde `ink` + punto interior de 8 `ink`. **Tarjeta de radio** (medios de pago, modalidad de contrato): caja con borde `line`, padding 16, título `t-h3` + descripción `t-small muted`; seleccionada borde `ink` + `inset 0 0 0 1px ink`.

#### 8.7.8 DatePicker y rango
- Disparador como Input con `CalendarDays` 16: "30/09/2026" o "01/09/2026 – 30/09/2026".
- Popover: columna izquierda de atajos (ancho 160, ítems de 32): Hoy · Ayer · Últimos 7 días · Este mes · Mes anterior · Últimos 90 días · Este año · Personalizado. A la derecha dos meses (rango) o uno (fecha).
- Mes: título "Septiembre 2026" `t-label` 700 + flechas `ChevronLeft/Right` cuadradas de 28. Días de la semana L M M J V S D (`t-micro subtle`), semana inicia en lunes.
- Día: celda 36 × 36, radio 0, `t-small num`. Hover `bg-surface-2`. Hoy: punto `accent` de 4 px bajo el número. Seleccionado / extremos del rango: `bg-ink text-inverse`. Tramo medio: `bg-selected`. Fuera de mes: `disabled`. Deshabilitado: tachado no, solo `disabled`.
- Pie: "Cancelar" (`ghost`) y "Aplicar" (`primary sm`).

#### 8.7.9 Tabs
- **Subrayadas (por defecto):** contenedor `border-b border-line-soft`, alto 44, `gap-6`. Pestaña `t-nav` (13/600) `muted`; hover `ink`; activa `ink` 700 con subrayado de 2 px `ink` pegado al borde inferior (se desliza entre pestañas en 200 ms). Contador opcional `t-micro num muted`.
- **Segmentadas:** para conmutar vistas (Tabla / Tarjetas, Mes / Semana / Día): grupo con borde 1 px `line-strong`, alto 32, ítems `t-label`, activo `bg-ink text-inverse`, separadores internos 1 px.

#### 8.7.10 Badge / Estado
Forma: alto 22 (`sm` 18), padding 0 8, radio 0, `t-eyebrow` a 11 px (10 en `sm`), tracking 0,06 em, color de texto `ink` salvo indicación. Los tonos "suaves" llevan un punto `rounded-full` de 6 px del color semántico a la izquierda (el color nunca es la única señal: siempre hay texto).

| Tono | Estilo |
|---|---|
| `ink` | `bg-ink text-inverse` |
| `outline` | `border border-line-strong text-ink` |
| `neutral` | `bg-selected text-ink-2` |
| `muted` | `text-subtle line-through` sin fondo |
| `success` | `bg-success-soft` + punto `success` |
| `warning` | `bg-warning-soft` + punto `warning` |
| `danger` | `bg-danger-soft` + punto `danger` |
| `accent` | `bg-accent-soft text-accent-ink` + punto `accent` |

Mapa canónico de estados (un único archivo `estados.ts`; ningún módulo decide colores por su cuenta):

| Dominio | Estado → tono |
|---|---|
| Ventas | Pagada → success · Separado → accent · Devuelta → neutral (ícono `Undo2`) · Anulada → muted |
| Por pagar | Pendiente → warning · Programado → outline · Pago parcial → accent · Pagado → success · Vencido → danger |
| Por cobrar | Al día → outline · Por vencer → warning · Vencido → danger · Cobrado → success |
| Traslados | Solicitado → warning · En tránsito → ink · Recibido → success |
| Importaciones (por fase) | Fábrica (Cotizado … Saldo pagado) → outline · Viaje (Embarcado … En puerto colombiano) → ink · Aduana (En proceso de nacionalización, Nacionalizado) → accent · Entrega: En transporte a Bogotá → neutral, Recibido en bodega → success · Indicador aparte "Retraso de 6 días" → danger |
| Facturación | Generada → neutral · Enviada a la DIAN (simulación) → outline · Aceptada → success · Nota crédito → accent |
| Inventario | Agotado → danger · Stock bajo → warning (sin insignia cuando está normal) |
| Conteo físico | En curso → warning · Con diferencias → danger · Aplicado → success |
| Personal | Laboral → outline · Prestación de servicios → neutral · Vacaciones → accent · Incapacidad → warning · Retirado → muted |
| Asistencia | A tiempo → success · Tarde → warning · Ausente → danger |
| Clientes | VIP → ink · Frecuente → outline · Ocasional → neutral · En riesgo → warning · Nuevo → accent |
| Bandeja de salida | Enviado (simulación) → success |

#### 8.7.11 Card y KPI
- **Card base:** `bg-surface border border-line`, radio 0, sin sombra. Cabecera opcional: `t-h3` + acción `ghost sm` a la derecha, `mb-4`. Clicable: hover `border-ink` y aparece `ArrowUpRight` 16 arriba a la derecha (fundido 140 ms); toda la tarjeta es el enlace.
- **KPI:** padding 20, alto mínimo 132.
  - Etiqueta `t-eyebrow muted` ("Ventas del mes"), con ícono `Info` 12 + tooltip si el término lo requiere.
  - Cifra `t-kpi num` (`AnimatedNumber`, §8.10.2), `mt-3`. Moneda abreviada solo si supera 9 caracteres (`$ 412,6 M`); la cifra completa va en el tooltip.
  - Variación `mt-2 t-small num`: ícono `ArrowUpRight`/`ArrowDownRight` 14 + "12,4 %" en `success` o `danger`, seguido de "vs. agosto" en `muted`. Prop `buenoCuando: 'sube' | 'baja'` (en gastos, bajar es bueno y se pinta `success`). Sin cambio: `Minus` 14 + "Sin cambio" en `muted`.
  - Sparkline opcional en el pie (alto 32, línea 1,5 px `chart-3`, último punto 3 px `ink`), sin ejes.
  - Variante destacada (solo una por pantalla, p. ej. "Ventas de hoy"): `bg-ink text-inverse`, variación en `inverse` al 80 %.
- **Comparativo de locales:** tarjeta con 3 columnas separadas por líneas verticales `line-soft`; cada columna: nombre `t-label`, cifra `t-kpi-sm`, barra horizontal de 4 px proporcional en el color del local (§8.9.1).

#### 8.7.12 Table
- Contenedor `bg-surface border border-line`, radio 0, `overflow-x-auto`. Sin cebra.
- **Cabecera:** alto 40, `t-eyebrow` 11 px `muted`, borde inferior **1 px `ink`**, fondo `surface`, `position: sticky; top: var(--sticky-top)` (= franja de rol + 12 + 56 + 8 px). Ordenable: al hover aparece `ArrowUpDown` 12; ordenada: `ArrowUp`/`ArrowDown` 12 y el texto pasa a `ink`. `aria-sort` correcto.
- **Densidad** (control en la barra de herramientas, recordada por tabla): compacta 36 · normal 44 (por defecto) · cómoda 52.
- **Celdas:** padding 0 12 (primera 16), `t-body ink`. Texto a la izquierda; números, cantidades y dinero **a la derecha** con `num`; fechas a la izquierda con `num`; estado con Badge; celda de producto con miniatura 30 × 40 + nombre + referencia `t-small muted`. Truncar con `…` y tooltip.
- **Fila:** separador `border-b border-line-soft`. Hover `bg-surface-2`. Clicable → abre el cajón de detalle; `cursor-pointer`; Enter abre cuando la fila tiene foco.
- **Seleccionada:** `bg-selected` + `box-shadow: inset 2px 0 0 var(--c-ink)`. Columna de checkbox de 40 px. Con selección, la barra de herramientas se reemplaza por una **barra de lote** negra de 48 px (`bg-ink text-inverse`): "3 ventas seleccionadas" + acciones `ghost` en `inverse` + "Cancelar".
- **Acciones de fila:** última columna de 48 px con `MoreHorizontal` (`ghost` 28), visible siempre al 40 % de opacidad y al 100 % en hover/foco.
- **Totales fijos:** `tfoot` con `position: sticky; bottom: 0`, `bg-surface`, borde superior 1 px `ink`, alto 44, `t-body` 700 `num`; primera celda `t-eyebrow` "Totales del filtro". Además, encima de la tabla, una **franja de resumen** de 4 cifras `t-kpi-sm` (ventas, unidades, ticket promedio, descuentos) que se recalcula con cada filtro (PRD §7.3).
- **Paginación:** barra de 48 px bajo la tabla, `border-t border-line-soft`: izquierda "Mostrando 1–50 de 4.312 ventas" `t-small muted num`; derecha selector "Filas: 25 · 50 · 100" (Select `sm`) y botones solo ícono `ChevronLeft`/`ChevronRight` + "Página 1 de 87".
- **Vacío:** una fila con `colSpan` completo y el Empty state compacto (§8.7.19): sin datos ("Aún no hay gastos en septiembre") o sin resultados ("Ningún resultado con estos filtros" + "Limpiar filtros").
- **Cargando:** 8 filas Skeleton con anchos variados (60 %, 40 %, 80 %…), nunca un spinner central.

#### 8.7.13 Toolbar de filtros (grupo píldora negra)
Fila de 48 px entre las pestañas y la tabla, `flex items-center gap-3`:
1. Buscador local (Input `sm` con `Search`, ancho 280, placeholder concreto: "Buscar por número, cliente o referencia"). Atajo `/` lo enfoca.
2. **Grupo píldora:** `bg-ink rounded-chrome p-1 h-10 inline-flex gap-0`. Botones internos alto 32, `rounded-pill`, padding 0 12, `t-label` 600 **blanco**, ícono 14 a la izquierda. Separadores verticales de 1 px × 16 `rgba(255,255,255,.18)`. Hover interno `bg-white/12`. Abierto: `bg-white text-ink`. El primero es "Filtros" con `SlidersHorizontal` y, si hay filtros activos, contador en círculo blanco de 16 px con `t-micro num ink`. Le siguen los 2–3 filtros más usados del módulo como atajos ("Local", "Fechas: Este mes", "Estado"); cada uno abre un Popover con su control. Un filtro con valor muestra el valor ("Local: Usaquén").
3. Espaciador.
4. Derecha: densidad (solo ícono `Rows3`), conmutador de vista segmentado si aplica, "Exportar" (`secondary sm` con `Download`, menú Excel / PDF).

Debajo, si hay filtros activos, fila de **chips** (alto 28, `bg-selected`, `t-label`, `X` 12 para quitar) + enlace "Limpiar filtros". En dark (app) no se usa esta barra.

#### 8.7.14 Modal / Dialog
- Overlay `bg-overlay` (sin desenfoque). Contenido `bg-surface`, radio 0, sin sombra, centrado, `max-h-[88dvh]` con scroll en el cuerpo.
- Anchos: `sm` 440 (confirmaciones) · `md` 600 (formularios cortos) · `lg` 800 · `xl` 1040 (vista de factura, costo aterrizado).
- Cabecera: padding 24, `t-eyebrow` opcional + título `t-h2`, botón cerrar `X` (`ghost` 32) arriba a la derecha. Cuerpo padding 0 24 24. Pie: `border-t border-line`, padding 16 24, botones a la derecha: secundario y luego primario.
- Entrada: overlay fundido 200 ms; contenido fundido + `scale(.98 → 1)` 200 ms `ease-enter`. Salida 140 ms.
- Foco: primer campo o, en confirmaciones, el botón "Cancelar". Esc cierra salvo cambios sin guardar (entonces pregunta "¿Descartar los cambios?").
- Nunca modales anidados: un segundo nivel se resuelve con un cajón o reemplazando el contenido del modal con un paso.

#### 8.7.15 Drawer lateral de detalle
- Desde la derecha, ancho `--drawer-w` (520) o `--drawer-w-lg` (720), alto completo, `bg-surface border-l border-line`, overlay `bg-overlay` al 50 % de su opacidad normal (la tabla sigue visible).
- Cabecera fija (padding 24, `border-b`): `t-eyebrow` del tipo ("Venta"), título `t-h2` con el identificador, insignia de estado, y acciones (`ghost` solo ícono: `Pencil`, `Printer`, `MoreHorizontal`, `X`). Debajo, Tabs subrayadas si hay subvistas (Resumen · Líneas · Pagos · Historial).
- Cuerpo con scroll, padding 24, `space-y-8`. Pares etiqueta/valor en rejilla de 2 columnas: etiqueta `t-small muted`, valor `t-body ink`.
- Pie fijo opcional con acciones primarias.
- Entrada `translateX(24px) → 0` + fundido 240 ms `ease-enter`; salida 160 ms. La URL cambia (`/ventas/V-000482`) para permitir enlaces profundos; cerrar vuelve a la lista sin perder filtros ni scroll.
- Flechas ↑ ↓ (o `ChevronUp/Down` en la cabecera) navegan al registro anterior/siguiente de la tabla.

#### 8.7.16 Toast
- Radix Toast, **abajo al centro** (`bottom-6`), ancho 400 máx., hasta 3 apilados con `gap-2`. (Abajo a la derecha vive "Prueba esto".)
- `bg-ink text-inverse`, radio 0, padding 12 16, `t-body`. Ícono 16 a la izquierda en `inverse`; el tipo se distingue por la forma del ícono (`CircleCheck` éxito, `TriangleAlert` alerta, `CircleAlert` error, `Info` neutro), no por color. Acción opcional a la derecha: enlace `t-label` 700 subrayado ("Ver venta", "Deshacer").
- Duración 5 s (8 s si tiene acción); pausa al hover y al foco; se descarta deslizando o con `X`.
- **Toast de venta (momento wow):** variante extendida de 2 líneas: "Venta V-000482 registrada · $ 389.800" y debajo `t-small` en `inverse/70`: "Inventario −2 · Comisión de Laura +$ 11.694 · Caja Usaquén actualizada".
- `role="status"`, nunca roba el foco.

#### 8.7.17 Tooltip
`bg-ink text-inverse`, `t-small` 500, padding 6 8, radio 0, `max-w-60`, flecha de 6 px. Retardo 300 ms (0 ms si otro tooltip acaba de cerrarse), entrada 100 ms. Se usa para: nombres de íconos, cifras completas detrás de abreviadas, definiciones de términos y motivos de deshabilitado. Nunca contiene acciones ni información imprescindible.

#### 8.7.18 Popover
`bg-surface border border-line shadow-float`, radio 0, padding 16 (o 4 para menús), separación 8 del disparador, entrada fundido + `translateY(-4px → 0)` 140 ms. Título opcional `t-label` 700. Menús (DropdownMenu): ítems de 36, `t-body`, ícono 16 `ink-2` a la izquierda, atajo `t-micro subtle` a la derecha, separadores `line-soft`, ítem destructivo en `danger`.

#### 8.7.19 Empty state
- Composición vertical centrada: ícono lucide 28 trazo 1,25 `subtle` → título `t-h3` → texto `t-body muted` (máx. 44 ch, 1–2 frases que explican qué va aquí y por qué sirve) → acción (`primary` o `secondary md`) → enlace opcional `t-small` "¿Qué es esto?" que abre un popover con la explicación del término.
- Tamaños: **página** (padding 64, dentro de una Card), **en tabla** (padding 40), **compacto** (padding 24, en tarjetas del inicio).
- Ejemplos de texto: "Aún no hay conteos físicos en Zona Rosa. Un conteo compara lo que hay en el estante con lo que dice el sistema y te muestra las diferencias." → "Iniciar conteo".
- Nunca ilustraciones, nunca "No hay datos" a secas, nunca "Próximamente".

#### 8.7.20 Skeleton
`bg-selected`, radio 0, con brillo `linear-gradient(90deg, transparent, var(--c-surface-2), transparent)` desplazándose en 1,4 s lineal infinito. La forma imita el contenido real (barra de 12 px para texto, bloque 3:4 para prendas, rectángulo para gráfico). Se muestra solo si la carga supera 300 ms; con movimiento reducido, sin brillo.

#### 8.7.21 Timeline (estados de importación)
13 estados del PRD §7.5 agrupados en 5 fases: **Fábrica** (Cotizado → Saldo pagado), **Viaje** (Embarcado → En puerto colombiano), **Aduana** (En proceso de nacionalización → Nacionalizado), **Entrega** (En transporte a Bogotá → Recibido en bodega).

- **Vertical (detalle de importación):** columna de nodos a la izquierda (ancho 24) y contenido a la derecha.
  - Nodo completado: círculo de 10 px `bg-ink`. Actual: anillo de 2 px `ink` de 14 px con punto interior `accent` de 6 px que pulsa (§8.10.4). Pendiente: círculo de 10 px con borde 1 px `line-strong`. Retrasado: anillo `danger`.
  - Conector: línea de 1 px; tramo completado `ink`, pendiente punteado `line-strong` (`stroke-dasharray 2 3`).
  - Contenido: nombre del estado `t-body` 700 (pendientes en `muted` 600), fechas `t-small num`: "Estimada 12/10/2026 · Real 14/10/2026", insignia "Retraso de 2 días" (`danger sm`) cuando aplica, quién actualizó (`t-micro subtle`: "Actualizado por Agencia de Aduanas · portal de seguimiento").
  - Títulos de fase `t-eyebrow` intercalados.
  - Cambio de estado: el nuevo nodo pasa a `ink` con `scale(.6 → 1)` en 300 ms y el conector se dibuja (`scaleY 0 → 1`, 480 ms).
- **Horizontal compacta (tarjetas, kanban, portal):** barra segmentada de 13 segmentos de 4 px de alto con `gap-0.5`, completados `ink`, actual `accent`, pendientes `line`; debajo, nombre del estado actual `t-label` y la fase `t-micro muted`.

#### 8.7.22 Kanban
- Columnas de 280 px con scroll horizontal del tablero; separadas por líneas verticales `line-soft` (sin fondo de columna). Cabecera de columna: `t-eyebrow` + conteo `num` + suma `t-small muted num` ("3 · US$ 48,2 mil").
- Tarjeta: `bg-surface border border-line` padding 12, `t-label` 700 título (`IMP-2026-07`), proveedor `t-small muted`, timeline horizontal compacta, fecha estimada de llegada `t-small num`, insignia de retraso si aplica. Hover `border-ink`.
- Arrastrar (`@dnd-kit`): la tarjeta toma `shadow-drag` y `cursor-grabbing`, sin rotación; hueco de destino con borde punteado 1 px `ink` del alto de la tarjeta. Soltar en otra columna dispara el panel "Notificar a" (PRD §7.5). Accesible con teclado (Espacio para tomar, flechas, Espacio para soltar) y anuncio en `aria-live`.

#### 8.7.23 Stepper
Horizontal, para flujos de varios pasos (crear importación, conteo físico, POS en pantallas estrechas). Cada paso: número `t-label num` ("01") + nombre `t-eyebrow`; conectores de 1 px `line` de ancho flexible. Activo: `ink` con subrayado de 2 px bajo el nombre. Completado: número reemplazado por `Check` 14 `ink`, clicable para volver. Pendiente: `subtle`. Nunca círculos de colores.

#### 8.7.24 Avatar con iniciales
Círculo, tamaños 24 / 32 / 40 / 56, `bg-selected text-ink`, iniciales (2 letras: primer nombre + primer apellido) en 600 al 40 % del tamaño. Sin colores por persona. Indicador opcional de 8 px abajo a la derecha con borde 2 px `surface`: `success` = marcó entrada hoy, `subtle` = no ha marcado. Grupo apilado con solape de −8 px y borde 2 px `surface`; "+3" en el último.

#### 8.7.25 Chip de color y de talla
- **Muestra de color:** círculo 16 (tienda 12 en tarjeta, 24 en ficha; POS 20) con el hex del producto y anillo interior `inset 0 0 0 1px rgb(0 0 0 / .12)` para que el blanco se vea sobre blanco. Seleccionada: anillo exterior 1 px `ink` a 2 px de distancia. Agotada: diagonal de 1 px `muted` encima. Tooltip con el nombre del color.
- **Caja de talla:** mín. 44 × 44 (tienda 48 de alto, ancho de celda de rejilla), borde 1 px `line-strong`, `t-label` 600 `num`. Hover `border-ink`. Seleccionada `bg-ink text-inverse border-ink`. Agotada en este local: texto `disabled` + diagonal de 1 px `line-strong` de esquina a esquina, sin deshabilitar el foco (tooltip: "Agotada aquí · 2 en Usaquén"). En POS, debajo de la talla, `t-micro num` con unidades del local ("3").

#### 8.7.26 Matriz talla × color (× local)
- Tabla compacta: filas = colores (muestra 16 + nombre `t-small`), columnas = tallas en el orden del tipo de prenda (S–XXL, 28–40, 38–44, 46–56), última columna "Total" 700.
- Celda 48 × 40, centrada, `t-body num`. 0 → "—" en `disabled`. Stock en o por debajo del mínimo → `bg-warning-soft text-warning` 600. Celda clicable en POS → `bg-ink text-inverse` (elige esa variante).
- Selector de local encima (segmentado: "Este local · Todos · Parque 93 · Usaquén · Zona Rosa · Bodega"). En "Este local", cada celda muestra el número del local grande y, si hay en otros, "+5" en `t-micro subtle` debajo (PRD §7.2: otros locales en gris).
- Fila y columna de totales con borde 1 px `ink`.

#### 8.7.27 Código de barras (EAN-13)
`JsBarcode` en SVG: `format: "EAN13"`, `lineColor: "#000"`, `background: "transparent"`, `height: 48`, `width: 1.6`, `displayValue: true`, `font: "Figtree Variable"`, `fontSize: 12`, `textMargin: 2`, `margin: 0`. Contenedor blanco con 10 px de zona de silencio a los lados (también en tema oscuro). Siempre negro sobre blanco. Botón `ghost sm` "Copiar código" al lado.

#### 8.7.28 Código QR
Librería `qrcode` → SVG, corrección `M`, zona de silencio 4 módulos, negro sobre blanco, sin logotipo incrustado ni colores. Tamaños: 160 (acceso a la app), 96 (factura, puerta de entrada), 72 (pie de PDF). Debajo, la URL en `t-small muted` truncada al centro.

#### 8.7.29 Marco de navegador
Para mostrar la tienda dentro de Canales digitales. Barra de 40 px `bg-selected` con 3 círculos de 10 px `line-strong` (grises, no semáforo), campo de dirección centrado (alto 24, `bg-surface`, `t-small muted`, `Lock` 12) con `tienda.halden.demo` (**nunca un dominio real**). Borde 1 px `line`, radio 0. Contenido en `iframe` de `/tienda` escalado con `transform: scale()` para caber.

#### 8.7.30 Marco de teléfono
Solo CSS, genérico (sin logotipos ni formas que imiten un modelo concreto): pantalla 390 × 844, bisel de 12 px `#0A0A0A`, `rounded-device` exterior (40 px la pantalla interior), isla superior de 110 × 30 `rounded-full` negra a 11 px del borde, dos botones laterales de 3 px a la izquierda y uno a la derecha en `#1A1A1A` (constantes propias del marco, no de la interfaz). Contenido en `iframe` de `/app` o de la conversación simulada. Escalas 0,6 / 0,72 / 0,85. En fondo claro, contorno de 1 px `line-strong` alrededor del bisel.

#### 8.7.31 Confirmación de eliminar
- `AlertDialog` `sm`. Título `t-h2` como pregunta concreta: "¿Eliminar la venta V-000482?".
- Cuerpo `t-body muted`: consecuencias en lenguaje sencillo y con cifras ("Se devolverán 2 unidades al inventario de Usaquén y se restará $ 389.800 de las ventas de hoy."). Segunda línea `t-small subtle`: "Si te equivocas, puedes restaurar los datos de demostración en Configuración."
- Pie: "Cancelar" (`secondary`, recibe el foco) y "Eliminar" (`destructive`). El verbo del botón repite la acción ("Anular venta", "Eliminar gasto"), nunca "Aceptar" ni "Sí".
- Para "Restaurar datos de demostración": además, campo donde se escribe `RESTAURAR` para habilitar el botón.
- Tras eliminar: toast "Venta V-000482 eliminada" con acción "Deshacer" (8 s) cuando el modelo de datos lo permita.

#### 8.7.32 Piezas adicionales recurrentes
- **Barra de progreso:** 4 px, `rounded-xs`, pista `line-soft`, relleno `ink` (o `accent` si es una meta). Etiqueta y porcentaje `t-small num` arriba.
- **Lista "Qué cambió"** (efectos de una acción): filas con ícono del módulo 16, texto `t-body` ("Inventario de Usaquén · Camisa Oxford M azul cielo"), valor a la derecha `num` con antes → después ("3 → 2") y enlace `ArrowUpRight` 14. Aparecen escalonadas 80 ms. Se usa en el éxito del POS, en recepciones de importación y en cambios de estado.
- **Marca de agua de documento:** "DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL", 900 MAYÚSCULAS, 40 px, `ink` al 6 %, rotada −30°, repetida en diagonal sobre facturas y notas crédito (vista y PDF).
- **Nota de cálculo ilustrativo:** `t-small subtle` con ícono `Info` 12, sin caja: "Cálculo ilustrativo para la demo. Los valores se parametrizan y validan con el contador en la implementación."
- **Término con explicación:** componente `<Termino comun="Plata que me deben" tecnico="Cuentas por cobrar" />` → "Plata que me deben" en el estilo del contexto + " · Cuentas por cobrar" en `muted` 400, y tooltip opcional con la definición.

---

### 8.8 Ilustraciones de prenda (SVG)

Estilo: **dibujo técnico de moda (*flat*)** de frente, simétrico, de línea fina, relleno plano del color de la variante. Es el lenguaje con que los diseñadores de moda documentan una prenda: preciso, adulto, nada caricaturesco. Sin maniquí, sin cuerpo, sin cara, sin sombra proyectada, sin brillos.

#### 8.8.1 Componente
`<Prenda tipo="camisa" color="#1F2A44" patron="liso" vista="frente" tamano="tarjeta" />`
- `tipo`: `camisa | polo | sweater | blazer | abrigo | chaqueta | traje | pantalon | zapato | cinturon | corbata`.
- Mapeo desde categoría (PRD §7.4): Camisas → camisa · Polos → polo · Punto/sweaters → sweater · Blazers → blazer · Abrigos y chaquetas → abrigo o chaqueta (según subtipo) · Trajes → traje · Pantalones → pantalon · Calzado → zapato · Accesorios → cinturon o corbata (según subtipo).
- `patron`: `liso | rayas | cuadros` (rayas: líneas verticales de 1,2 u cada 6 u en `mezcla(color, blanco, .45)`; cuadros: rayas verticales + horizontales a 10 u al 35 % de opacidad). Se aplican con `<pattern>` recortado por la silueta (`clipPath`).
- `vista`: `frente | detalle | tejido` (ver §8.8.5).
- `tamano`: `miniatura` (< 80 px de ancho, trazo 1) · `tarjeta` (trazo 1,25) · `hero` (trazo 1,5).
- Rol `img` + `aria-label` con nombre y color ("Camisa Oxford Slim Fit, azul cielo").

#### 8.8.2 Lienzo y construcción
- `viewBox="0 0 300 400"` (3:4). Primer elemento: `<rect width="300" height="400" fill="var(--c-product)"/>`.
- Eje de simetría `x = 150`. Zona segura: la prenda cabe en `x 48–252`, `y 48–376`. Prendas superiores: escote ≈ y 78, hombros ≈ y 94, bajo ≈ y 340–350. Pantalón: pretina y 52, bajo y 370. Así todas las miniaturas se ven del mismo "tamaño" en la grilla.
- Todas las piezas con `stroke-linejoin="round" stroke-linecap="round"`, y en CSS: `.prenda * { vector-effect: non-scaling-stroke; }` (el grosor no cambia con el tamaño).
- Capas, en este orden: (1) fondo; (2) silueta con `fill = F`, `stroke = S`, ancho de trazo base; (3) volumen: una banda lateral izquierda de 14–18 u con `fill="#000" fill-opacity=".06"` (si F es oscuro: `#FFF` al .06); (4) costuras y piezas internas con `stroke = S`, ancho 0,9, `stroke-opacity .65`, `fill="none"`; (5) pespuntes con `stroke-dasharray="2 2.5"`, ancho .75; (6) botones `r 2.2–3` con `fill = mezcla(F, blanco, .2)` y trazo de detalle.

#### 8.8.3 Coloreado según la variante
Función `coloresPrenda(hex)` (en JS, no `color-mix`, para que funcione también en PDF y canvas):
- `F` (relleno) = hex de la variante.
- Luminancia relativa `L(F)`. Si `L ≥ 0.18`: `S = mezcla(F, #000000, .55)`. Si `L < 0.18` (marino, negro, carbón, vinotinto…): `S = mezcla(F, #FFFFFF, .38)`.
- Detalle `D = S` con opacidad .65. Botones `B = mezcla(F, #FFFFFF, .2)`; en prendas blancas o marfil, botones `mezcla(F, #000, .12)`.
- Suela de zapato y hebilla: suela `mezcla(F, #000, .6)`; hebilla metal neutro `#9A9A9A` (trazo 2,5, sin relleno).
- Nunca degradados.

#### 8.8.4 Construcción por prenda (coordenadas orientativas; mantener simetría y zona segura)

**Camisa (referencia completa):**
```svg
<svg class="prenda" viewBox="0 0 300 400" role="img" aria-label="Camisa Oxford Slim Fit, azul cielo">
  <rect width="300" height="400" fill="var(--c-product)"/>
  <!-- silueta: hombros, mangas largas con puño, cuerpo con faldón curvo -->
  <path d="M128 80 L88 96 L56 232 L54 262 L78 266 L82 238 L98 150 L100 336 Q124 354 150 350 Q176 354 200 336 L202 150 L218 238 L222 266 L246 262 L244 232 L212 96 L172 80 Z" fill="F" stroke="S" stroke-width="1.25"/>
  <!-- volumen -->
  <path d="M98 150 L100 336 Q107 341 114 344 L113 150 Z" fill="#000" fill-opacity=".06"/>
  <!-- puños -->
  <path d="M56 236 L81 240 M219 240 L244 236" fill="none" stroke="S" stroke-width=".9" stroke-opacity=".65"/>
  <!-- tapeta -->
  <path d="M144 98 L144 349 M156 98 L156 349" fill="none" stroke="S" stroke-width=".9" stroke-opacity=".65"/>
  <!-- pie de cuello (visible atrás) y hojas del cuello -->
  <path d="M128 80 L132 69 Q150 63 168 69 L172 80 Q150 74 128 80 Z" fill="F" stroke="S" stroke-width="1.25"/>
  <path d="M150 98 L126 81 L132 69 Q141 75 150 77 Z" fill="F" stroke="S" stroke-width="1.25"/>
  <path d="M150 98 L174 81 L168 69 Q159 75 150 77 Z" fill="F" stroke="S" stroke-width="1.25"/>
  <!-- bolsillo de pecho (lado izquierdo de quien la viste) -->
  <path d="M164 128 L188 128 L188 152 L176 156 L164 152 Z" fill="none" stroke="S" stroke-width=".9" stroke-opacity=".65"/>
  <!-- botones: cy = 112, 146, 180, 214, 248, 282, 316 -->
  <circle cx="150" cy="112" r="2.2" fill="B" stroke="S" stroke-width=".75"/>  <!-- …repetir -->
  <!-- pespunte del faldón -->
  <path d="M100 330 Q124 348 150 344 Q176 348 200 330" fill="none" stroke="S" stroke-width=".75" stroke-dasharray="2 2.5" stroke-opacity=".65"/>
</svg>
```

**Polo:** silueta `M130 80 L90 94 L62 168 L86 180 L100 146 L100 338 Q150 346 200 338 L200 146 L214 180 L238 168 L210 94 L170 80 Z` (manga corta). Puño de punto: línea paralela al borde de la manga a 8 u (`M66 160 L89 171` y su espejo). Cuello de punto como la camisa pero más corto (puntas en y 102). Tapeta corta: rectángulo `x 144–156, y 98–156`, 3 botones en y 112, 128, 144. Línea de bajo a y 330.

**Sweater:** silueta con costados levemente curvos y escote redondo: `M126 82 L90 96 L58 236 Q56 252 60 262 L82 266 Q84 254 84 244 L100 152 Q96 250 102 334 L198 334 Q204 250 200 152 L216 244 Q216 254 218 266 L240 262 Q244 252 242 236 L210 96 L174 82 Q150 98 126 82 Z`. Escote trasero `M126 82 Q150 74 174 82`. Rib de escote: segunda curva `M132 80 Q150 92 168 80`. Puños (y 248–264) y bajo (`y 318–334`) rellenos con `<pattern>` de líneas verticales cada 4 u (ancho .6, color S al 50 %) = textura de punto.

**Blazer:** hombros rectos con hombrera. Silueta `M132 74 L84 90 Q78 96 76 108 L56 296 L80 302 L96 170 L98 344 Q118 350 136 346 L150 264 L164 346 Q182 350 202 344 L204 170 L220 302 L244 296 L224 108 Q222 96 216 90 L168 74 Z` (la apertura inferior central es el corte delantero redondeado). Abertura del cuello en V desde (138,76) y (162,76) hasta el punto de quiebre (150,206), rellena con `mezcla(F, #000, .35)` (forro). Solapa izquierda `M150 206 L106 126 L116 114 L124 120 L138 76 Z` (con la muesca en 116,114–124,120) y su espejo. Botones en (150,222) y (150,256), r 3. Bolsillos con tapa: `M100 268 L136 266 L136 278 L100 280 Z` y espejo; bolsillo de pecho de vivo `M168 150 L192 146 L192 151 L168 155 Z`. Pinzas `M118 160 L120 262` y espejo (opacidad .4). Tres botones de 1,6 en el puño exterior.

**Abrigo:** como el blazer, más largo y amplio: silueta `M132 72 L82 88 Q76 94 74 108 L52 312 L78 318 L96 170 L96 372 L204 372 L204 170 L222 318 L248 312 L226 108 Q224 94 218 88 L168 72 Z`. Quiebre en y 196, solapas más anchas (punta en 100,130). Cierre central `M150 196 L150 372`, tres botones en y 210, 250, 290. Bolsillos de vivo inclinados `M102 282 L124 300` y espejo.

**Chaqueta** (subtipo de abrigos y chaquetas): silueta del abrigo con bajo en y 330 y puños rectos; cuello alto `M130 66 L170 66 L172 84 L128 84 Z`; cremallera central (línea + pespunte a 3 u a cada lado) con tirador `rect 146,88 8×12`.

**Traje:** composición de dos piezas reutilizando las anteriores: primero el pantalón con `transform="translate(60 138) scale(0.6)"`, encima el blazer con `transform="translate(30 4) scale(0.8)"`. Ambos quedan centrados en x 150; el pantalón asoma desde y ≈ 282 hasta 361.

**Pantalón:** silueta `M104 52 L196 52 L198 66 L206 370 L160 370 L152 156 Q150 150 148 156 L140 370 L94 370 L102 66 Z`. Pretina: línea `M102 66 L198 66`; trabillas: rectángulos de 4 × 20 en x 112, 132, 164, 184 desde y 50. Botón (150,59) r 2. Bragueta con pespunte en J: `M156 66 L156 128 Q156 140 150 146`. Bolsillos sesgados `M108 66 L122 104` y espejo. Raya de planchado `M122 104 L118 370` y espejo (opacidad .35).

**Zapato** (perfil lateral, punta a la derecha, centrado en y ≈ 228): empeine `M60 252 L60 214 Q60 196 74 192 L118 186 Q132 186 140 196 L200 210 Q236 220 250 238 Q256 246 252 252 Z`; suela `M60 252 L252 252 Q258 252 258 258 L258 262 L94 262 L94 268 L60 268 Z` con relleno `mezcla(F, #000, .6)`; pespunte de vira `M96 256 L250 256` punteado; ojales r 1,4 en (128,192), (136,197), (144,202), (152,206) con dos cruces de cordón; costura de puntera `M214 214 Q206 232 214 250`; contrafuerte `M60 214 Q84 220 92 252`. Escalar todo ×1,1 alrededor de (150, 228) para que llene el lienzo.

**Cinturón** (enrollado, vista superior): correa como anillo con `fill-rule="evenodd"`: elipse exterior `cx 150 cy 214 rx 96 ry 64`, interior `rx 84 ry 52` (correa de 12 u). Hebilla centrada abajo: marco `rect x 134 y 258 w 32 h 28` en metal neutro, pasador `M134 272 L158 272`; punta de la correa saliendo de la hebilla hacia la izquierda sobre el anillo, con 4 agujeros r 1,6 espaciados 10 u.

**Corbata:** nudo `M138 72 L162 72 L157 100 L143 100 Z`; pala `M143 100 L126 300 L150 328 L174 300 L157 100 Z`; pliegue bajo el nudo `M143 100 Q150 108 157 100` (detalle). Patrón `rayas` en corbata = rayas diagonales a 45° (ancho 3 u cada 14 u).

#### 8.8.5 Vistas
- `frente`: dibujo completo (tarjetas, tablas, ficha).
- `detalle`: el mismo SVG con `viewBox` recortado en 3:4: camisa `96 40 108 144` (cuello y botones) · polo `102 50 96 128` · sweater `96 56 108 144` · blazer `90 60 120 160` (solapas) · abrigo `84 60 132 176` · traje `90 40 120 160` · pantalón `96 40 108 144` (pretina) · zapato `130 170 105 140` (puntera) · cinturón `110 230 84 112` (hebilla) · corbata `120 60 60 80` (nudo). Con `tamano="hero"` el trazo se mantiene fino gracias a `non-scaling-stroke`.
- `tejido`: lienzo 3:4 completo relleno con F y una textura por material: algodón oxford (retícula de puntos 1 u cada 4 u al 8 %), lana (sarga: diagonales a 45° cada 3 u al 5 %), punto (verticales cada 4 u al 8 %), cuero (sin textura, solo una curva de luz al 4 %).

#### 8.8.6 Uso
- Siempre sobre `product`, siempre 3:4, siempre la misma escala por categoría. En la grilla se ven como fotos de catálogo.
- Miniaturas en tablas: 30 × 40; en combobox 32 × 43; en bolsa 72 × 96.
- **Nunca** como decoración de estados vacíos ni en la interfaz de gestión fuera de donde se muestra un producto.

---

### 8.9 Gráficos (Recharts)

#### 8.9.1 Paleta de series
| Rol | Claro | Oscuro |
|---|---|---|
| Serie 1 (principal) | `chart-1` `#000000` | `#F2F2F2` |
| Serie 2 | `chart-2` `#6E6E6E` | `#A3A3A3` |
| Serie 3 | `chart-3` `#A6A6A6` | `#6B6B6B` |
| Serie 4 | `chart-4` `#D4D4D4` | `#3D3D3D` |
| Destacado (una sola cosa) | `accent` `#A67C52` | `#C49A6C` |
| Año anterior / referencia | `chart-3` punteado `4 4` | ídem |

- Asignación **fija** por local en toda la app (sale de la configuración): Parque 93 → serie 1, Usaquén → serie 2, Zona Rosa → serie 3, Bodega → serie 4. El mismo local tiene el mismo gris en todos los gráficos.
- Más de 4 series → no se apilan colores: se usan *small multiples* o se agrupa el resto en "Otros" (`chart-4`).
- El camel solo marca **el hallazgo**: la barra del mejor día, el mes en curso, la categoría dormida, la proyección. Nunca una serie entera por estética.
- Sin tortas de más de 4 porciones; sin donas decorativas; sin 3D; sin doble eje Y.

#### 8.9.2 Estilo base (componente `<GraficoBase>` que envuelve a Recharts; nadie usa Recharts "desnudo")
- `CartesianGrid`: solo horizontales (`vertical={false}`), `stroke="var(--c-chart-grid)"`, sin punteado.
- `XAxis`: `axisLine={{ stroke: 'var(--c-chart-axis)' }}`, `tickLine={false}`, `tick={{ fill: 'var(--c-muted)', fontSize: 11, fontFamily: 'var(--font-sans)' }}` con `num`, `tickMargin={8}`, `interval="preserveStartEnd"`.
- `YAxis`: `axisLine={false}`, `tickLine={false}`, mismo `tick`, `width={56}`, `tickFormatter={cifraCorta}`, 4–5 marcas (`tickCount={5}`), empezando en 0 para barras.
- `Line`: `type="monotone"`, `strokeWidth={2}` la principal y `1.5` las demás, `dot={false}`, `activeDot={{ r: 4, fill: 'var(--c-ink)', stroke: 'var(--c-surface)', strokeWidth: 2 }}`.
- `Bar`: sin radio (`radius={0}`), `maxBarSize={28}`, `barCategoryGap="24%"`, apiladas con 1 px de separación (`stroke="var(--c-surface)" strokeWidth={1}`).
- `Area`: solo para flujo de caja proyectado: línea `ink` 2 px + relleno `ink` al 6 %; zona bajo cero en `danger` al 8 %.
- Línea de referencia (meta, punto de equilibrio, "hoy"): `ReferenceLine` 1 px `ink` punteada `3 3` con etiqueta `t-micro` arriba a la derecha.
- `Tooltip` personalizado: `bg-ink text-inverse`, radio 0, padding 8 10, `t-small num`; título (fecha o categoría) 700; filas con cuadro de 8 × 8 del color de la serie, nombre y valor alineado a la derecha; cursor de línea vertical 1 px `ink` al 20 % (líneas) o rectángulo `ink` al 4 % (barras). Sin animación del tooltip.
- `Legend` personalizada **arriba a la izquierda** del gráfico, en línea, `t-micro muted`, marcador de 8 × 8 (barras) o 12 × 2 (líneas); clic en un ítem atenúa las demás series al 25 %.
- Animación de entrada: `animationDuration={600}`, `animationEasing="ease-out"`, solo en la primera carga; desactivada con movimiento reducido.
- Alto por defecto 280 (escritorio), 160 (móvil). Siempre con título `t-h3` y, si aplica, una frase de lectura en `t-small muted` ("Los sábados venden 1,8 veces más que los martes").

#### 8.9.3 Formato de cifras en gráficos y tarjetas
`cifraCorta(valor, moneda)` en `lib/formato.ts` (espacio duro ` ` entre símbolo y número; signo menos tipográfico `−`):

| Rango | COP | USD | CNY |
|---|---|---|---|
| < 1.000 | `$ 850` | `US$ 850` | `CN¥ 850` |
| < 1.000.000 | `$ 850 mil` | `US$ 12,4 mil` | `CN¥ 8,2 mil` |
| < 1.000 millones | `$ 12,4 M` | `US$ 1,2 M` | `CN¥ 1,2 M` |
| ≥ 1.000 millones | `$ 1,2 mil M` | — | — |

```ts
const n0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const n1 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const SIMBOLO = { COP: '$', USD: 'US$', CNY: 'CN¥' } as const;

export function cifraCorta(v: number, moneda: keyof typeof SIMBOLO = 'COP'): string {
  const s = SIMBOLO[moneda], a = Math.abs(v), signo = v < 0 ? '−' : '';
  const r = (x: number) => Math.round(x * 10) / 10;
  if (a >= 1e9 || r(a / 1e6) >= 1000) return `${signo}${s} ${n1.format(r(a / 1e9))} mil M`;
  if (a >= 1e6 || Math.round(a / 1e3) >= 1000) return `${signo}${s} ${n1.format(r(a / 1e6))} M`;
  if (a >= 1e3) return `${signo}${s} ${(moneda === 'COP' ? n0 : n1).format(moneda === 'COP' ? Math.round(a / 1e3) : r(a / 1e3))} mil`;
  return `${signo}${s} ${n0.format(a)}`;
}
```
Los ejes usan `cifraCorta`; los tooltips muestran la cifra completa (`$ 12.438.900`).

#### 8.9.4 Mapa de calor día × hora (Análisis, PRD §7.12)
- Rejilla de 7 filas (Lun … Dom) × 12 columnas (10 a. m. … 9 p. m.). Celdas cuadradas de 28 px (32 en ≥ 1440) con `gap-0.5`, radio 0. Implementado en SVG o CSS grid, no con Recharts.
- Escala secuencial de 6 pasos por cuantiles: `heat-0 #F2F2F2` · `heat-1 #D9D9D9` · `heat-2 #B3B3B3` · `heat-3 #808080` · `heat-4 #4D4D4D` · `heat-5 #1A1A1A` (en oscuro, invertida).
- Etiquetas de fila `t-micro muted` a la izquierda (ancho 32); cabecera de columnas con la hora sola ("10", "11", "12", "1" … "9") y dos rótulos de grupo encima: "a. m." sobre 10–11 y "p. m." sobre 12–9.
- Hover/foco de celda: borde 1 px `ink` (en celdas oscuras, `surface`) + tooltip "Sábado, 3 p. m. – 4 p. m. · $ 4,8 M · 9 % de la semana".
- El hallazgo principal (franja más fuerte) lleva contorno de 2 px `accent` y una nota al lado: "Sábados de 3 a 6 p. m.: 22 % de tus ventas".
- Leyenda: 6 cuadros de 12 px en fila con "Menos" y "Más" (`t-micro muted`) a los lados.

---

### 8.10 Movimiento y microinteracciones

#### 8.10.1 Transiciones de página
- Escritorio: el contenedor de contenido se reanima con `key={pathname}` y `animate-page-in` (opacidad 0 → 1, `translateY(4px) → 0`, 200 ms `ease-enter`). Sin animación de salida (la navegación se siente inmediata). Barra lateral y superior no se mueven.
- App móvil: pila con desplazamiento horizontal (entrada desde la derecha 240 ms; volver, a la inversa). Pestañas: fundido 140 ms.
- Cambiar de rol: la franja baja (200 ms), la barra lateral reordena sus ítems con fundido de 140 ms y aparece un toast "Ahora ves KippiCore como Vendedor · Usaquén".

#### 8.10.2 Contador de cifras (`AnimatedNumber`)
- Cuando un valor visible cambia (venta registrada, moneda cambiada, filtro de local), la cifra **no salta**: interpola del valor anterior al nuevo en 900 ms (`ease-enter`, vía `requestAnimationFrame`), formateando cada cuadro con el mismo formateador (los dígitos no bailan gracias a `num`).
- Simultáneamente: subrayado de 1 px `accent` bajo la cifra que crece `scaleX(0 → 1)` desde la izquierda en 480 ms y se desvanece a los 1,6 s; y, si es un incremento por una acción del usuario, una etiqueta flotante `t-small num accent-ink` ("+$ 389.800") que sube 8 px y se desvanece en 1,6 s.
- En la primera carga de una pantalla **no** se anima (solo cambios posteriores), salvo la cifra protagonista de *Hoy* en `/app`, que cuenta desde 0 una vez por sesión.
- Movimiento reducido: el valor cambia de golpe y el fondo de la cifra destella `accent-soft` 600 ms.

#### 8.10.3 Momento wow de la venta (POS → todo conectado)
1. "Confirmar venta" pasa a estado de carga 400 ms (simulado, para que se perciba el proceso).
2. El carrito se reemplaza por el panel de éxito: `CircleCheck` 40 px trazo 1,25 que se dibuja (`stroke-dashoffset`, 420 ms), `t-eyebrow` "Venta registrada", `t-h1` "V-000482", total `t-kpi-xl` con contador desde 0.
3. Debajo, la lista **"Qué cambió"** (§8.7.32) con 5 filas escalonadas 80 ms: inventario del local (antes → después), ventas de hoy, comisión del vendedor, historial del cliente, caja del local. Cada fila enlaza a su módulo.
4. Acciones: "Emitir factura electrónica" (`primary`), "Recibo POS" (`secondary`), "Nueva venta" (`ghost`, atajo `N`).
5. Toast de venta (§8.7.16). Al volver al Inicio, las tarjetas afectadas reproducen el contador (8.10.2): el cliente *ve* la conexión.

#### 8.10.4 Pistas pulsantes (PRD §10)
- Punto `accent` de 8 px con un anillo `::after` del mismo color que escala `1 → 2.4` y se desvanece `.5 → 0` en 1,8 s, infinito (`animate-hint`). Posición: esquina superior derecha del elemento objetivo, desplazado (−4, −4).
- Máximo **una por pantalla**, solo en la primera visita del módulo (registro en almacenamiento local). Clic o foco → Popover de 280 px con `t-eyebrow` "Pista", texto `t-body` de 1–2 frases y botón `ghost sm` "Entendido". Al cerrarla no vuelve.
- Con movimiento reducido: punto fijo sin anillo.

#### 8.10.5 Panel "Prueba esto"
Flotante abajo a la derecha (`bottom-6 right-6`). Minimizado: píldora `bg-ink text-inverse` alto 40, radio 0, `t-label` 700: "Prueba esto · 3/8" + barra de progreso de 2 px `accent` en su base. Abierto: tarjeta de 320 px `bg-surface border border-ink`, `t-eyebrow` + lista de 8 ítems con checkbox (no interactivo; se marca solo al completar la acción) y enlace "Llévame" en cada uno. Al completar un ítem: el check se dibuja (200 ms) y la píldora destella `accent` una vez.

#### 8.10.6 Reglas generales
- Duraciones y curvas solo de §8.3.6. Hover: 80 ms. Nada dura más de 480 ms salvo el contador (900 ms) y los pulsos.
- Solo se animan `opacity` y `transform` (y `stroke-dashoffset` en trazos). Nunca `width/height/top/left` salvo acordeones de Radix (`--radix-accordion-content-height`) y el colapso de la barra lateral.
- `@media (prefers-reduced-motion: reduce)`: todas las animaciones y transiciones a ~0 ms (regla global en §8.14) y los componentes que usan JS (`AnimatedNumber`, gráficos) consultan `matchMedia` y no animan.
- Spinners solo si la espera supera 300 ms; Skeleton para cargas de contenido.

---

### 8.11 Escritura de interfaz

#### 8.11.1 Tono
- Español de Colombia, trato de **tú**, cálido y directo, como un buen gerente de tienda. Frases cortas. Verbos concretos.
- Lenguaje del comerciante primero, término técnico al lado (PRD §4.3). Nunca anglicismos de software: "Inicio" (no "Dashboard"), "Exportar" (no "Export"), "Tablero por estado" (no "Kanban" en la interfaz), "Bandeja de salida" (no "Outbox").
- Botones: verbo en infinitivo + objeto ("Registrar venta", "Guardar cambios", "Iniciar conteo", "Notificar a 3 contactos"). Nunca "Aceptar", "OK", "Enviar" a secas.
- Errores: qué pasó + cómo arreglarlo, sin culpar: "Escribe un celular de 10 dígitos que empiece por 3." / "La cantidad supera lo que hay en Usaquén (3). Pide un traslado o baja la cantidad."
- Vacíos: qué va aquí, por qué sirve y qué hacer (§8.7.19).
- Confirmaciones: pregunta concreta + consecuencias con cifras (§8.7.31).
- Sin emoji, sin signos de exclamación salvo en mensajes simulados de WhatsApp/Instagram, sin "¡Ups!".

#### 8.11.2 Mayúsculas
- MAYÚSCULAS solo vía CSS en: títulos `t-display/t-h1/t-h2`, `t-eyebrow`, botones `primary/secondary/destructive`, insignias, wordmark.
- Todo lo demás en tipo oración. Nombres propios de locales y productos con su ortografía: "Parque 93", "Camisa Oxford Slim Fit".
- Siglas en mayúscula siempre: IVA, NIT, DIAN, CUFE, SMMLV, PILA, EAN, SKU, FOB, BL, ARL, EPS, ICBF, SENA.

#### 8.11.3 Formatos (todo en `lib/formato.ts`, `Intl` con `es-CO`; ningún módulo formatea a mano)
| Dato | Formato | Ejemplo |
|---|---|---|
| Dinero COP | `$` + espacio duro, miles con punto, sin decimales | `$ 1.250.000` |
| Dinero USD / CNY | código-símbolo + 2 decimales con coma | `US$ 12.400,50` · `CN¥ 8.200,00` |
| Dinero abreviado | `cifraCorta` (§8.9.3) | `$ 12,4 M` · `$ 850 mil` · `$ 1,2 mil M` |
| Negativos | signo menos tipográfico antes del símbolo | `−$ 45.000` |
| Porcentaje | coma decimal, espacio duro antes de `%`, 1 decimal máx. | `12,4 %` |
| Variación | signo explícito | `+12,4 %` · `−3,1 %` · "Sin cambio" |
| Unidades | miles con punto + unidad | `1.248 uds.` |
| Fecha | `dd/mm/aaaa` | `30/09/2026` |
| Fecha corta (tablas, ejes) | día + mes abreviado sin punto | `30 sep` |
| Fecha larga (encabezados) | día de la semana + fecha | `Martes 30 de septiembre de 2026` |
| Hora | 12 h con `a. m.` / `p. m.` | `3:45 p. m.` |
| Relativa (notificaciones) | — | `hace 5 min` · `ayer, 3:45 p. m.` |
| Meses en ejes | `ene feb mar abr may jun jul ago sep oct nov dic` | — |
| Días | `Lun Mar Mié Jue Vie Sáb Dom` (semana empieza en lunes) | — |
| Celular | 3 + 3 + 4 | `300 123 4567` |
| Cédula | miles con punto | `1.020.456.789` |
| NIT | miles con punto + guion y dígito | `901.234.567-8` |
| Consecutivos | prefijo + ceros | `V-000482` · `IMP-2026-07` · `HAL-FE-1043` |
| Moneda activa | cuando no es COP, siempre visible junto a la cifra: chip `t-micro` "USD" en encabezados de tabla y KPI | — |

#### 8.11.4 Glosario de términos dobles (`<Termino>`)
| Lenguaje del comerciante | Término técnico |
|---|---|
| Plata que me deben | Cuentas por cobrar |
| Lo que debo | Cuentas por pagar |
| Plata disponible | Caja y bancos |
| Lo que me queda después de vender | Utilidad bruta |
| Lo que me queda al final del mes | Utilidad operativa |
| Costo real por prenda | Costo aterrizado |
| Ropa que no se mueve | Mercancía sin rotación |
| Días que dura la mercancía | Días de inventario |
| Historial de movimientos | Kárdex |
| Plan de abonos | Separado |
| Lo que cuesta un empleado de verdad | Costo total para el empleador |
| Lo que vendo para no perder | Punto de equilibrio |
| Valor de la mercancía en fábrica | FOB |
| Trámite de aduana | Nacionalización |
| Cuadre de caja | Arqueo / cierre de caja |
| Ventas por hora y día | Mapa de calor |

Regla: en títulos y menús va el término del comerciante; el técnico acompaña en `muted` o en el tooltip. En tablas y reportes exportados se usa el técnico (es lo que verá el contador).

#### 8.11.5 Textos fijos
- Pie de la barra lateral: "Desarrollado por KippiCore".
- Vitrina: "Vista previa de lo que KippiCore puede construir para HALDEN".
- Nómina: "Cálculo ilustrativo para la demo. Los valores se parametrizan y validan con el contador en la implementación."
- Facturas: "DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL".
- Tasas: "Tasa de ejemplo".
- Mensajería: "Enviado (simulación)".

---

### 8.12 Accesibilidad

- **Contraste verificado (WCAG 2.1 AA):** `ink` sobre `canvas` ≈ 20:1 · `muted #666` 5,4:1 sobre `canvas` · `subtle #707070` 4,7:1 · `placeholder #767676` 4,5:1 sobre blanco · `accent-ink` 6,5:1 · `success` 6,2:1 · `warning #8A5E0F` 5,7:1 · `danger` 7,0:1 · blanco sobre `danger` 7,0:1. Oscuro: `#F2F2F2` sobre `#0A0A0A` 17,7:1 · `muted #A3A3A3` sobre `#141414` 7,3:1 · `subtle #858585` 5,0:1 · `accent #C49A6C` 7,2:1. Bordes de controles (`control`) ≥ 3:1. **El camel `#A67C52` (3,7:1) nunca se usa para texto menor de 18 px 700.**
- **Foco visible** en todo elemento interactivo: anillo de 2 px `focus` con 2 px de separación (campos: borde + sombra interior). Nunca `outline: none` sin reemplazo. En fondos `ink` (franja de rol, toasts, grupo píldora) el anillo es `inverse`.
- **Teclado:** orden lógico; enlaces "Saltar al contenido" al inicio; Radix gestiona foco atrapado en modales y cajones, y su devolución al cerrar; Esc cierra capas; `⌘K/Ctrl K` buscador global; `/` buscador de la tabla; en POS: `Enter` agrega el producto buscado, `F2` simula escaneo, `N` nueva venta tras confirmar. Tablas navegables con Tab entre filas clicables. Kanban y turnos accesibles con teclado vía `@dnd-kit` (sensores de teclado + anuncios en español).
- **Semántica:** `<nav aria-label="Módulos">`, `<main>`, un `<h1>` por página, tablas reales (`<table>`, `<th scope>`), `aria-sort`, `aria-live="polite"` para toasts y cambios de cifras importantes, `aria-current="page"` en el ítem activo.
- **Color nunca es la única señal:** estados con texto, variaciones con ícono de flecha y signo, celdas de calor con tooltip y valor en la tabla alternativa ("Ver como tabla" debajo de cada gráfico, que muestra los datos en una tabla accesible).
- Etiquetas en todos los campos (nunca solo placeholder); errores ligados con `aria-describedby`; `aria-invalid`.
- Objetivos táctiles ≥ 44 px en `/app` y `/tienda` móvil; ≥ 32 px en escritorio.
- Textos ampliables al 200 % sin cortar contenido (no usar alturas fijas en contenedores de texto).
- Iconos decorativos con `aria-hidden`; botones solo ícono con `aria-label`.

---

### 8.13 Iconografía

- Librería única: **`lucide-react`**. Wrapper `<Icono>` que fija `strokeWidth={1.5}` y `absoluteStrokeWidth` (el trazo mide 1,5 px a cualquier tamaño); en tamaños ≥ 24 px se usa 1,25. Prohibido importar otra librería o SVG sueltos de íconos.
- Tamaños: 12 (indicadores en texto pequeño), 14 (botones `sm`, chips), 16 (por defecto en controles), 18 (barra lateral, botones `lg`), 20 (tienda, barra superior móvil), 22 (pestañas de `/app`), 24–28 (estados vacíos), 40 (éxito de venta).
- Color: hereda `currentColor`; por defecto `ink-2` en controles, `muted` en ayudas, `subtle` en estados vacíos. Nunca íconos de colores salvo el ícono semántico de un toast o un error de campo.
- Siempre lineales, nunca rellenos (excepción: `Heart` de favorito activo en la tienda y la estrella de calificación de proveedor).
- Un ícono acompaña, no reemplaza, al texto, salvo en botones solo ícono con tooltip. En tablas, máximo un ícono por celda.
- Íconos de acciones comunes (no inventar otros): crear `Plus` · editar `Pencil` · eliminar `Trash2` · duplicar `Copy` · exportar `Download` · imprimir `Printer` · filtrar `SlidersHorizontal` · buscar `Search` · más `MoreHorizontal` · cerrar `X` · volver `ArrowLeft` · abrir detalle `ArrowUpRight` · info `Info` · ayuda `CircleHelp` · alerta `TriangleAlert` · error `CircleAlert` · éxito `CircleCheck` · escanear `ScanBarcode` · traslado `ArrowLeftRight` · WhatsApp/Instagram: `MessageCircle` / `Camera` + nombre en texto (no logotipos de marcas).

---

### 8.14 Bloque de tokens (Tailwind CSS v4) — listo para copiar

Archivo `src/styles/tokens.css`, importado una sola vez desde el punto de entrada. Requiere `tailwindcss@^4` y `@fontsource-variable/figtree`.

```css
/* ==========================================================================
   KippiCore CRM · Sistema de diseño HALDEN · tokens.css
   Única fuente de colores, tipografía, radios, sombras, capas y movimiento.
   ========================================================================== */
@import "tailwindcss";
@import "@fontsource-variable/figtree";

/* Modo oscuro por atributo (la app /app pone data-theme="dark" en su raíz) */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* --------------------------------------------------------------------------
   1. Valores crudos por tema
   -------------------------------------------------------------------------- */
:root {
  color-scheme: light;

  /* Superficies */
  --c-canvas: #F9F9F9;
  --c-surface: #FFFFFF;
  --c-surface-2: #F4F4F4;
  --c-selected: #EFEFEF;
  --c-product: #EFEFEF;
  --c-glass: rgba(237, 237, 237, 0.8);
  --c-overlay: rgba(0, 0, 0, 0.4);

  /* Texto */
  --c-ink: #000000;
  --c-ink-2: #333333;
  --c-muted: #666666;
  --c-subtle: #707070;
  --c-placeholder: #767676;
  --c-disabled: #A3A3A3;
  --c-inverse: #FFFFFF;

  /* Líneas */
  --c-line: #DDDDDD;
  --c-line-soft: #E4E4E4;
  --c-line-strong: #CCCCCC;
  --c-control: #8C8C8C;

  /* Acento (lo sobrescribe brand.config al arrancar) y semánticos */
  --c-accent: #A67C52;
  --c-accent-ink: #7A5634;
  --c-accent-soft: #F3ECE4;
  --c-success: #2F6B4F;
  --c-success-soft: #EAF1ED;
  --c-warning: #8A5E0F;
  --c-warning-soft: #F6EFE2;
  --c-danger: #A3302A;
  --c-danger-soft: #F6E9E8;
  --c-focus: #000000;

  /* Gráficos */
  --c-chart-1: #000000;
  --c-chart-2: #6E6E6E;
  --c-chart-3: #A6A6A6;
  --c-chart-4: #D4D4D4;
  --c-chart-grid: #E4E4E4;
  --c-chart-axis: #CCCCCC;
  --c-heat-0: #F2F2F2;
  --c-heat-1: #D9D9D9;
  --c-heat-2: #B3B3B3;
  --c-heat-3: #808080;
  --c-heat-4: #4D4D4D;
  --c-heat-5: #1A1A1A;

  /* Tienda (lo sobrescribe brand.config) */
  --tienda-hero: #1E1C1A;

  /* Layout */
  --sidebar-w: 248px;
  --sidebar-w-rail: 72px;
  --topbar-h: 56px;
  --topbar-gap: 12px;
  --rolestrip-h: 0px;            /* 36px cuando el rol ≠ dueño */
  --sticky-top: calc(var(--rolestrip-h) + var(--topbar-gap) + var(--topbar-h) + 8px);
  --drawer-w: 520px;
  --drawer-w-lg: 720px;
  --tabbar-h: 56px;

  /* Capas */
  --z-base: 0;
  --z-sticky: 10;
  --z-hint: 15;
  --z-sidebar: 20;
  --z-topbar: 30;
  --z-rolestrip: 35;
  --z-tryit: 38;
  --z-popover: 40;
  --z-drawer: 50;
  --z-modal: 60;
  --z-toast: 70;
  --z-tooltip: 80;

  /* Duraciones */
  --dur-instant: 80ms;
  --dur-fast: 140ms;
  --dur-base: 200ms;
  --dur-slow: 240ms;
  --dur-slower: 320ms;
  --dur-count: 900ms;
}

:root[data-rol]:not([data-rol="dueno"]) { --rolestrip-h: 36px; }

[data-theme="dark"] {
  color-scheme: dark;

  --c-canvas: #0A0A0A;
  --c-surface: #141414;
  --c-surface-2: #1C1C1C;
  --c-selected: #222222;
  --c-product: #DCDCDC;
  --c-glass: rgba(20, 20, 20, 0.75);
  --c-overlay: rgba(0, 0, 0, 0.6);

  --c-ink: #F2F2F2;
  --c-ink-2: #D4D4D4;
  --c-muted: #A3A3A3;
  --c-subtle: #858585;
  --c-placeholder: #858585;
  --c-disabled: #5C5C5C;
  --c-inverse: #0A0A0A;

  --c-line: #262626;
  --c-line-soft: #1F1F1F;
  --c-line-strong: #333333;
  --c-control: #6B6B6B;

  --c-accent: #C49A6C;
  --c-accent-ink: #D9B48A;
  --c-accent-soft: #2A221A;
  --c-success: #6FB08F;
  --c-success-soft: #14231B;
  --c-warning: #D2A54A;
  --c-warning-soft: #2A2112;
  --c-danger: #E07A72;
  --c-danger-soft: #2B1514;
  --c-focus: #F2F2F2;

  --c-chart-1: #F2F2F2;
  --c-chart-2: #A3A3A3;
  --c-chart-3: #6B6B6B;
  --c-chart-4: #3D3D3D;
  --c-chart-grid: #1F1F1F;
  --c-chart-axis: #333333;
  --c-heat-0: #1A1A1A;
  --c-heat-1: #333333;
  --c-heat-2: #595959;
  --c-heat-3: #8C8C8C;
  --c-heat-4: #BFBFBF;
  --c-heat-5: #F2F2F2;
}

/* --------------------------------------------------------------------------
   2. Colores expuestos a Tailwind (bg-*, text-*, border-*, fill-*, stroke-*)
   Se reinicia la paleta por defecto: bg-blue-500 y similares NO existen.
   -------------------------------------------------------------------------- */
@theme inline {
  --color-*: initial;
  --color-white: #FFFFFF;
  --color-black: #000000;

  --color-canvas: var(--c-canvas);
  --color-surface: var(--c-surface);
  --color-surface-2: var(--c-surface-2);
  --color-selected: var(--c-selected);
  --color-product: var(--c-product);
  --color-glass: var(--c-glass);
  --color-overlay: var(--c-overlay);

  --color-ink: var(--c-ink);
  --color-ink-2: var(--c-ink-2);
  --color-muted: var(--c-muted);
  --color-subtle: var(--c-subtle);
  --color-placeholder: var(--c-placeholder);
  --color-disabled: var(--c-disabled);
  --color-inverse: var(--c-inverse);

  --color-line: var(--c-line);
  --color-line-soft: var(--c-line-soft);
  --color-line-strong: var(--c-line-strong);
  --color-control: var(--c-control);

  --color-accent: var(--c-accent);
  --color-accent-ink: var(--c-accent-ink);
  --color-accent-soft: var(--c-accent-soft);
  --color-success: var(--c-success);
  --color-success-soft: var(--c-success-soft);
  --color-warning: var(--c-warning);
  --color-warning-soft: var(--c-warning-soft);
  --color-danger: var(--c-danger);
  --color-danger-soft: var(--c-danger-soft);
  --color-focus: var(--c-focus);

  --color-chart-1: var(--c-chart-1);
  --color-chart-2: var(--c-chart-2);
  --color-chart-3: var(--c-chart-3);
  --color-chart-4: var(--c-chart-4);
  --color-chart-grid: var(--c-chart-grid);
  --color-chart-axis: var(--c-chart-axis);
  --color-heat-0: var(--c-heat-0);
  --color-heat-1: var(--c-heat-1);
  --color-heat-2: var(--c-heat-2);
  --color-heat-3: var(--c-heat-3);
  --color-heat-4: var(--c-heat-4);
  --color-heat-5: var(--c-heat-5);
  --color-tienda-hero: var(--tienda-hero);
}

/* --------------------------------------------------------------------------
   3. Tipografía, radios, sombras, curvas, animaciones, puntos de quiebre
   -------------------------------------------------------------------------- */
@theme {
  --font-*: initial;
  --font-sans: "Figtree Variable", "Figtree", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;

  --text-*: initial;
  --text-display: 3.5rem;      --text-display--line-height: 3.75rem;  --text-display--letter-spacing: -0.01em;  --text-display--font-weight: 800;
  --text-display-sm: 2.25rem;  --text-display-sm--line-height: 2.5rem; --text-display-sm--letter-spacing: -0.005em; --text-display-sm--font-weight: 800;
  --text-h1: 2rem;             --text-h1--line-height: 2.25rem;       --text-h1--letter-spacing: 0em;            --text-h1--font-weight: 900;
  --text-h1-app: 1.75rem;      --text-h1-app--line-height: 2rem;      --text-h1-app--letter-spacing: 0em;        --text-h1-app--font-weight: 900;
  --text-h2: 1.25rem;          --text-h2--line-height: 1.5rem;        --text-h2--letter-spacing: 0.005em;        --text-h2--font-weight: 800;
  --text-h3: 1rem;             --text-h3--line-height: 1.375rem;      --text-h3--letter-spacing: 0em;            --text-h3--font-weight: 700;
  --text-h3-tienda: 1.125rem;  --text-h3-tienda--line-height: 1.5rem; --text-h3-tienda--font-weight: 700;
  --text-body-lg: 1rem;        --text-body-lg--line-height: 1.5rem;   --text-body-lg--font-weight: 400;
  --text-body: 0.875rem;       --text-body--line-height: 1.375rem;    --text-body--font-weight: 400;
  --text-small: 0.75rem;       --text-small--line-height: 1.125rem;   --text-small--font-weight: 400;
  --text-label: 0.75rem;       --text-label--line-height: 1rem;       --text-label--font-weight: 600;
  --text-eyebrow: 0.6875rem;   --text-eyebrow--line-height: 1rem;     --text-eyebrow--letter-spacing: 0.12em;    --text-eyebrow--font-weight: 700;
  --text-micro: 0.6875rem;     --text-micro--line-height: 0.875rem;   --text-micro--font-weight: 500;
  --text-button: 0.8125rem;    --text-button--line-height: 1rem;      --text-button--letter-spacing: 0.04em;     --text-button--font-weight: 700;
  --text-nav: 0.8125rem;       --text-nav--line-height: 1.25rem;      --text-nav--font-weight: 600;
  --text-nav-tienda: 0.875rem; --text-nav-tienda--line-height: 1.25rem; --text-nav-tienda--font-weight: 700;
  --text-kpi-sm: 1.5rem;       --text-kpi-sm--line-height: 1.75rem;   --text-kpi-sm--letter-spacing: -0.015em;   --text-kpi-sm--font-weight: 800;
  --text-kpi: 2rem;            --text-kpi--line-height: 2.25rem;      --text-kpi--letter-spacing: -0.02em;       --text-kpi--font-weight: 800;
  --text-kpi-xl: 2.75rem;      --text-kpi-xl--line-height: 3rem;      --text-kpi-xl--letter-spacing: -0.025em;   --text-kpi-xl--font-weight: 800;
  --text-wordmark: 1.125rem;   --text-wordmark--line-height: 1;       --text-wordmark--letter-spacing: 0.18em;   --text-wordmark--font-weight: 900;

  --radius-*: initial;
  --radius-none: 0px;
  --radius-xs: 2px;
  --radius-pill: 6px;
  --radius-chrome: 8px;
  --radius-sheet: 12px;
  --radius-device: 52px;
  --radius-full: 9999px;

  --shadow-*: initial;
  --shadow-float: 0 8px 24px -8px rgb(0 0 0 / 0.12);
  --shadow-drag: 0 12px 32px -8px rgb(0 0 0 / 0.18);

  --ease-*: initial;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);

  --breakpoint-desk: 80rem;   /* 1280 */
  --breakpoint-wide: 90rem;   /* 1440 */

  --animate-page-in: kc-page-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-fade-in: kc-fade-in 140ms cubic-bezier(0.2, 0, 0, 1) both;
  --animate-pop-in: kc-pop-in 140ms cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-dialog-in: kc-dialog-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-drawer-in: kc-drawer-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-sheet-up: kc-sheet-up 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-toast-in: kc-toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-shimmer: kc-shimmer 1.4s linear infinite;
  --animate-hint: kc-hint 1.8s cubic-bezier(0.2, 0, 0, 1) infinite;
  --animate-flash: kc-flash 600ms cubic-bezier(0.2, 0, 0, 1) both;
  --animate-underline: kc-underline 1.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-float-up: kc-float-up 1.6s cubic-bezier(0.16, 1, 0.3, 1) both;

  @keyframes kc-page-in   { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  @keyframes kc-fade-in   { from { opacity: 0; } to { opacity: 1; } }
  @keyframes kc-pop-in    { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  @keyframes kc-dialog-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: none; } }
  @keyframes kc-drawer-in { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
  @keyframes kc-sheet-up  { from { transform: translateY(100%); } to { transform: none; } }
  @keyframes kc-toast-in  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
  @keyframes kc-shimmer   { from { background-position: -200% 0; } to { background-position: 200% 0; } }
  @keyframes kc-hint      { 0% { transform: scale(1); opacity: 0.5; } 70%, 100% { transform: scale(2.4); opacity: 0; } }
  @keyframes kc-flash     { 0% { background-color: var(--c-accent-soft); } 100% { background-color: transparent; } }
  @keyframes kc-underline { 0% { transform: scaleX(0); opacity: 1; } 30% { transform: scaleX(1); opacity: 1; } 100% { transform: scaleX(1); opacity: 0; } }
  @keyframes kc-float-up  { 0% { opacity: 0; transform: translateY(0); } 15% { opacity: 1; } 100% { opacity: 0; transform: translateY(-8px); } }
}

/* --------------------------------------------------------------------------
   4. Utilidades compuestas (una clase = un estilo tipográfico completo)
   -------------------------------------------------------------------------- */
@utility num { font-variant-numeric: tabular-nums lining-nums; }

@utility t-display    { @apply text-display uppercase; }
@utility t-display-sm { @apply text-display-sm uppercase; }
@utility t-h1         { @apply text-h1 uppercase; }
@utility t-h1-app     { @apply text-h1-app uppercase; }
@utility t-h2         { @apply text-h2 uppercase; }
@utility t-h3         { @apply text-h3; }
@utility t-h3-tienda  { @apply text-h3-tienda; }
@utility t-eyebrow    { @apply text-eyebrow uppercase; }
@utility t-body-lg    { @apply text-body-lg; }
@utility t-body       { @apply text-body; }
@utility t-small      { @apply text-small; }
@utility t-label      { @apply text-label; }
@utility t-micro      { @apply text-micro; }
@utility t-button     { @apply text-button uppercase; }
@utility t-nav        { @apply text-nav; }
@utility t-nav-tienda { @apply text-nav-tienda; }
@utility t-kpi-sm     { @apply text-kpi-sm num; }
@utility t-kpi        { @apply text-kpi num; }
@utility t-kpi-xl     { @apply text-kpi-xl num; }
@utility t-wordmark   { @apply text-wordmark uppercase; }

@utility glass {
  background-color: var(--c-glass);
  -webkit-backdrop-filter: blur(9px) saturate(1.1);
  backdrop-filter: blur(9px) saturate(1.1);
}

@utility skeleton {
  background-color: var(--c-selected);
  background-image: linear-gradient(90deg, transparent 0%, var(--c-surface-2) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: var(--animate-shimmer);
}

/* --------------------------------------------------------------------------
   5. Base
   -------------------------------------------------------------------------- */
@layer base {
  html { background-color: var(--c-canvas); }
  body {
    @apply bg-canvas text-ink font-sans t-body antialiased;
    font-optical-sizing: auto;
    text-rendering: optimizeLegibility;
  }
  :focus-visible { outline: 2px solid var(--c-focus); outline-offset: 2px; }
  ::selection { background-color: var(--c-ink); color: var(--c-inverse); }
  ::placeholder { color: var(--c-placeholder); opacity: 1; }
  table, input, output, time, data { font-variant-numeric: tabular-nums lining-nums; }
  hr { border-color: var(--c-line); }
  .prenda * { vector-effect: non-scaling-stroke; }

  * { scrollbar-width: thin; scrollbar-color: var(--c-line-strong) transparent; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

Notas de implementación del bloque:
- `bg-white/12`, `bg-danger/90`, `bg-surface/70` funcionan porque v4 aplica opacidad con `color-mix` sobre las variables.
- El atributo `data-rol` en `<html>` lo escribe el store de sesión; con él cambian `--rolestrip-h` y `--sticky-top` sin JS adicional.
- `brand.config` al arrancar: `root.style.setProperty('--c-accent', marca.acento)` (+ `acentoTexto`, `acentoSuave`), y lo mismo para `--tienda-hero`.
- Si la verificación de §8.0 (punto 5) falla, cambiar solo la línea `--font-sans` y el `@import` de la fuente.

---

### 8.15 Lista de "no hacer"

**Identidad y marcas reales**
1. Nada de la marca de referencia ni de otra marca real: ni nombre, ni wordmark, ni tipografía AvertaPE, ni eslóganes, ni naranja/rojo de sus submarcas, ni nombres de líneas de producto, ni el formato de su logotipo. Tampoco mencionarla en textos, comentarios de código, `alt` ni nombres de archivo de la app.
2. Ningún dominio real en marcos, correos o enlaces de ejemplo: usar `tienda.halden.demo`, `@halden.demo`.
3. Sin logotipos de WhatsApp, Instagram, Nequi, Daviplata, DIAN, bancos o tarjetas: se nombran en texto. Nada del verde de WhatsApp ni del degradado de Instagram en las simulaciones: los chats usan la paleta HALDEN (burbuja entrante `surface`, saliente `ink` con texto `inverse`, fondo `product`).
4. No imitar un teléfono de una marca concreta en el marco de teléfono.
5. No inventar un "Est. 19XX", escudos, monogramas ni sellos de lujo para HALDEN: el wordmark es solo tipografía.

**Lo que hace que se vea genérico o de plantilla**
6. Colores por defecto de Tailwind, shadcn o Recharts (el morado `#8884d8`, `zinc`, `slate`, azul de enlace, verde neón de éxito). La paleta está reiniciada: si algo necesita un color que no existe, no se crea en el componente.
7. `rounded-md/lg/xl`, tarjetas con sombra, sombras en hover, botones "pastilla" redondeados.
8. Degradados, glassmorphism fuera de la barra superior y la barra de pestañas, texturas de ruido, brillos, bordes de 2 px decorativos.
9. Íconos de otra librería, íconos rellenos o bicolores, íconos dentro de círculos de color, emoji en la interfaz.
10. Ilustraciones de estados vacíos tipo "persona con lupa", personajes, mascotas, confeti.
11. Tracking amplio en títulos (solo wordmark y eyebrow); títulos en peso 400–600; texto corrido en MAYÚSCULAS o centrado en el escritorio.
12. Tarjetas KPI con ícono grande de color a la izquierda (el cliché de plantilla de *admin*).
13. Gráficos de torta con muchas porciones, donas decorativas, 3D, doble eje, leyendas abajo con cuadros redondeados, rejillas verticales.
14. Gris `#999` o más claro para información que hay que leer.
15. Spinners para todo, saltos de diseño al cargar, tablas que cambian de ancho al paginar.
16. Copias genéricas: "Lorem ipsum", "TODO", "Próximamente", "No data", "Dashboard", "Submit", "¡Ups! Algo salió mal", "Bienvenido de nuevo 👋".
17. Modales anidados, modales para lo que cabe en un cajón, toasts para errores de formulario (los errores van junto al campo).
18. Mezclar formatos: `$1,250,000.00`, `09/30/2026`, `15:45` (en la interfaz va `3:45 p. m.`), `12.4%`.

**Prendas**
19. Prendas con cara, manos, maniquí, perchas caricaturescas, contornos gruesos (> 1,5 px), sombras proyectadas, brillos o colores saturados fuera de la paleta de producto; prendas de distinto tamaño en la misma grilla; prendas sin el fondo `product` 3:4.

**Disciplina del sistema**
20. Hex, `px` de color, `z-index` numéricos o `cubic-bezier` escritos dentro de componentes de módulo. Todo sale de los tokens de §8.14 y de los componentes de §8.7. Si un paquete necesita una variante nueva, se agrega aquí primero.

---

## 9. Plan de trabajo por paquetes

### 9.1 Reglas comunes a todos los paquetes

1. **Dueño exclusivo de archivos.** Cada paquete es dueño de las carpetas listadas y de su prueba `e2e/paquetes/<paquete>.spec.ts`. No hay dos paquetes con la misma ruta de archivo. Todo lo demás es compartido y **de solo lectura** para los constructores: `src/dominio/**`, `src/generador/**`, `src/selectores/**`, `src/estado/**`, `src/lib/**`, `src/ui/**`, `src/layouts/**`, `src/app/**`, `src/config/**`, `src/seed/**` (salvo excepciones explícitas), `src/styles/**`, `package.json`, configuración de herramientas y `docs/`.
2. **Qué puede crear un constructor dentro de su carpeta**: páginas, componentes internos, hooks de interfaz, `selectores.ts` locales (componiendo selectores compartidos; nunca reimplementando una regla de 6.19–6.20), `textos.ts` con el copy de su interfaz, pruebas, y `publico.ts` con lo que otros módulos de oleadas posteriores podrán importar.
3. **Escritura solo con `useAcciones()`.** Ningún paquete escribe el estado de otra forma. Si falta un comando o un selector, el constructor lo pide en su informe (nombre, firma, por qué) y, mientras tanto, resuelve con lo que existe sin romper la regla.
4. **Puntos de extensión** que fase 2 deja creados como archivos con una implementación mínima y que el paquete dueño reemplaza: `src/modulos/guia/publico.ts` (`GuiaFlotante`, `MenuAyuda`), `src/movil/publico.ts` (`ModalAppDueno`), `src/modulos/entrada/paginas/Entrada.tsx`, y una página esqueleto por ruta en cada `paginas/`. El layout los importa: el paquete solo cambia su archivo.
5. **Datos y textos**: todo texto de negocio que no sea de un solo módulo ya está en `src/config/textos/` (fase 2). Los textos propios de una pantalla van en `modulos/<m>/textos.ts`. Nada de "lorem ipsum", "TODO", "Próximamente", ni inglés (salvo los mensajes a fábricas chinas).
6. **Brief**: cada constructor recibe el brief de `docs/PROMPT.md` (fase 3) con PAQUETE, OBJETIVO, LEE PRIMERO (PRD §, PLAN §5–8, CONTRATOS), ARCHIVOS QUE TE PERTENECEN, NO TOQUES, CRITERIOS, MOMENTOS WOW, DEFINICIÓN DE TERMINADO e INFORME FINAL.
7. **Definición de terminado** (igual para todos): `npm run typecheck`, `npm run lint` y `npm test` sin errores; su e2e pasa en 1440 × 900 (y 1280 × 800); sin errores en consola; crear/editar/eliminar con confirmación donde aplique; estados vacío, carga y error diseñados; todo en español de Colombia con `lib/formato.ts`; respeta local, moneda y rol; ninguna cifra formateada a mano; ningún color fuera de los tokens; pruebas de los cálculos propios del paquete.
8. **Commits**: los hace el líder al aceptar cada paquete (`feat(<paquete>): …`), salvo que el brief diga otra cosa.

### 9.2 Fase 2 — Fundaciones (Opus, secuencial, sin paralelismo)

Por tamaño, la fase 2 se ejecuta como **tres sesiones Opus consecutivas** (cada una termina con todo en verde y un commit; la siguiente arranca leyendo el commit anterior). Nunca dos a la vez.

**F2-A · Esqueleto, dominio y generador** (agente `arquitecto`)
1. Proyecto: Vite + React 19 + TS estricto (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `useUnknownInCatchVariables`), alias `@/`, ESLint (flat) con las reglas de capas de 5.3, la prohibición de `Math.random`/`Date.now`/`new Date()` sin argumentos en las capas puras, Prettier, Vitest (entornos `node` para dominio y `jsdom` para componentes), Playwright (1440 × 900, 1280 × 800, 390 × 844, `?hoy=` por defecto), scripts de `package.json` (5.4), `vercel.json` (5.14), `index.html`, `.nvmrc`.
2. `src/config/**` completo y `src/seed/**` completo (≈ 85 referencias con nombres verosímiles y precios terminados en ,900; elenco de 01_estrategia 1.5; proveedores y contactos; estacionalidad; gastos; calendario). Verificación de que ningún nombre de empresa coincide con una real conocida.
3. `src/dominio/tipos/**` exactamente como la sección 6 (los ajustes que aparezcan se registran en `DECISIONES.md` y en este documento).
4. `src/dominio/reglas/**` con sus pruebas (5.16), incluido el caso W6 exacto de nómina y el W4 de costo aterrizado.
5. `src/dominio/comandos/**`: **los 106 comandos** del catálogo 6.21 (los CRUD con la fábrica `crud()`), con pruebas de los núcleo: venta (contado, mixto, separado, crédito, descuento con aprobación), abono, devolución, anulación, traslado completo, conteo, recepción con distribución, cambio de estado de importación (incluido portal), aplicar costos, pago de CxP en USD, gasto inmediato y por pagar, turno con exceso, marcación, nómina aprobar/pagar, factura y nota crédito.
6. `src/dominio/motor/**`: estado inicial, aplicar (modo construcción y modo vivo con Immer), construir con marca de agua, IDs.
7. `src/generador/**` completo (sección 7) y sus pruebas (7.14). `scripts/medir-generador.ts` e `informe-coherencia.ts`.
- **Sale cuando**: `npm run typecheck && npm run lint && npm test` en verde; construcción < 1 s medida; informe de coherencia sin fallas; P1–P20 dentro de tolerancia; 0 omitidos.

**F2-B · Estado, selectores, utilidades, rutas y contratos** (agente `arquitecto`)
1. `src/estado/**`: reloj, stores `datos`/`sesion`/`guia`, persistencia con modo memoria, worker con respaldo en hilo principal, sincronización entre pestañas, `useAcciones` (una función tipada por comando, que genera IDs y arma el sobre), hooks (`useSel`, `useFiltroLocal`, `useMoneda`, `useDinero`, `usePuede`, `useUsuarioActivo`, `useEvento`, `emitirUI`), `avanzarReloj`, `restaurar`.
2. `src/selectores/**`: todo el catálogo 6.23 con pruebas "selector vs. recálculo ingenuo" para ventas, existencias, comisiones, saldos, estado de resultados, pivote y hallazgos.
3. `src/lib/**`: formatos (pruebas con la tabla 8.11.3), fechas, moneda, enlaces, descargar, códigos, exportar PDF (con Figtree embebida y la prueba de tildes) y Excel (con la prueba de totales).
4. `src/app/**`: router con **todas** las rutas de 5.5 (lazy con reintento), guardas de rol, `CargaDatos`, `NoEncontrada`, `ErrorRuta`; una página esqueleto por ruta en la carpeta del paquete dueño (título de la sección + datos crudos mínimos, solo para desarrollo).
5. `docs/CONTRATOS.md`: cómo leer (selectores y hooks, con ejemplos), cómo escribir (acciones, errores, eventos), cómo mostrar cifras y fechas, cómo exportar, cómo usar el contexto global, qué archivos puede tocar cada paquete (copia de 9.4), cómo pedir cambios compartidos, cómo probar (fixtures de Playwright).
- **Sale cuando**: en la consola de desarrollo `window.__kc` expone estado y selectores; las 60+ rutas cargan y recargan sin error; exportar un PDF y un Excel de prueba funciona; registro y reconstrucción probados en navegador (registrar venta, recargar, sigue ahí; modo memoria simulado bloqueando `localStorage`).

**F2-C · Sistema de diseño, layouts y piezas transversales** (agente `disenador`, Opus)
1. `src/styles/tokens.css` y `global.css` (8.14), fuentes autohospedadas.
2. `src/ui/**`: todos los componentes de 8.7, `<GraficoBase>` y variantes (8.9), `<Prenda>` con todas las ilustraciones (8.8), `<CodigoBarras>`, `<CodigoQR>`, marcos, `<Termino>`, `<NotaLegal>`, `<Cifra>`; conectados: `<Dinero>`, `<Fecha>`, selectores de local, moneda y rol, `<Pista>`, `<RequiereRol>`, `<SoloRol>`, `<MatrizExistencias>`, `<BuscadorProducto>`, `<BuscadorCliente>`. Página interna `/panel/_sistema` (solo en desarrollo) con todos los componentes para QA.
3. `src/layouts/**`: escritorio (barra lateral filtrada por rol, barra superior flotante con selectores, "?", "Ver app del dueño"; franja de rol; aviso de pantalla pequeña), móvil (pestañas, modo oscuro), tienda y portal.
4. PWA: manifiesto, íconos generados, registro del service worker, metas iOS.
- **Sale cuando**: el esqueleto se ve con el diseño final en 1440, 1280 y 390 px; el cambio de rol, local y moneda funciona en vivo en el esqueleto; `/app` es instalable en Chrome (Lighthouse PWA sin errores).

### 9.3 Oleadas y paralelismo

```
F2-A ──► F2-B ──► F2-C ──┬──► Oleada A: A1 POS · A2 Inventario · A3 Ventas · A4 Clientes ──┐
                         └──► Oleada B: B1 Importaciones+portal · B2 Proveedores ·          ├─► revisión del líder
                                        B3 Pagos · B4 Gastos                            ──┘   (cambios compartidos,
                                                                                               CONTRATOS.md)
                         ┌──► Oleada C: C1 Personal y nómina · C2 Turnos y asistencia · C3 Calendario ──┐
               revisión ─┤                                                                               ├─► revisión
                         └──► Oleada D: D1 Inicio · D2 Análisis · D3 Facturación · D4 Reportes ·       ──┘
                                        D5 Canales · D6 Tienda
                                                                   revisión ──► Oleada E: E1 App móvil · E2 Entrada y guía ·
                                                                                         E3 Configuración ──► Fase 4 (integración)
```

- **Dependencias duras**: todos los paquetes dependen solo de fase 2 (contratos, comandos, selectores y diseño ya existen). Por eso A y B corren **a la vez** (8 constructores), y C y D también (9). E va al final porque la app, la guía y la configuración recorren y enlazan todo lo demás y conviene que lo encuentren terminado.
- **Dependencias blandas** (solo para verificar a ojo, no para compilar): D1 enlaza a pantallas de A, B y C; E2 enlaza a todas; E1 replica cifras de D1.
- Si el entorno limita la concurrencia, el orden es A → B → C → D → E, y dentro de cada oleada todos en paralelo.
- Entre oleadas el líder aplica los cambios compartidos pedidos en los informes (en una sola sesión, para evitar conflictos), actualiza `CONTRATOS.md` y hace commit.

### 9.4 Paquetes

Formato: **Archivos** (rutas exactas que le pertenecen) · **Rutas** (5.5) · **Depende de** · **Criterios de aceptación** (del PRD; ✔ = criterio de la sección 14) · **Wow** (01_estrategia 3).

---

#### Oleada A — Núcleo operativo

**A1 · Punto de venta y caja**
- **Objetivo**: que registrar una venta sea más rápido que anotarla en el cuaderno, y que se vea todo lo que mueve.
- **Archivos**: `src/modulos/pos/**`, `e2e/paquetes/pos.spec.ts`.
- **Rutas**: `/panel/pos`, `/panel/pos/caja`.
- **Depende de**: fase 2.
- **Criterios** (PRD 7.2):
  - Buscar por nombre, referencia, SKU o EAN (`selBuscarProducto`, `selVariantePorEan`); Enter en el campo de código agrega; botón "Simular escaneo" agrega una variante con existencias en el local, con destello.
  - Grilla talla × color con existencias del local y, en gris, las de los otros locales (`<MatrizExistencias modo="pos">`).
  - Carrito con cantidades, precio de lista, descuento por línea o global (% o valor), IVA incluido y desglosado; los totales en pantalla usan `reglas/ventas.ts` (idénticos a los del manejador).
  - Cliente: buscar o crear rápido en el mismo paso (nombre, celular 3XX, cédula y correo opcionales, autorización de datos obligatoria) vía `clienteNuevo`.
  - Pago mixto con cálculo de cambio y billetes frecuentes ($ 20.000, $ 50.000, $ 100.000).
  - Confirmar → `registrarVenta`; panel "Lo que acaba de pasar" con `selEfectosVenta` (inventario del local, ventas de hoy, comisión del vendedor, compras del cliente, caja) con cifras que ruedan y enlace "Ver" que resalta la fila destino; ofrece "Emitir factura electrónica" (`emitirFactura` → `/panel/facturacion/:id`) y "Recibo POS" (PDF 80 mm).
  - Separado: abono inicial ≥ 20 % y fecha límite ≤ 30 días; queda reservado (sale del disponible) y aparece en por cobrar.
  - Descuento > 15 % en rol vendedor → "Pedir aprobación" (`solicitarAprobacion`); estado visible; al aprobarse desde la app o el escritorio se habilita confirmar.
  - Entrada a "Cambios y devoluciones": buscar una venta y abrir `/panel/ventas/:id/devolucion`.
  - Caja por local y turno: apertura con base, egresos, cierre con ventas por medio de pago, efectivo esperado vs. contado y diferencia resaltada; si se cobra en efectivo sin caja abierta, se ofrece abrirla en el mismo flujo.
  - Rol vendedor: local y vendedor fijos. Teclado: foco inicial en el buscador, Enter, Esc y tabulación lógica en el pago.
  - ✔ Una venta del POS se refleja de inmediato en inventario (local correcto), ventas, inicio, cliente, comisión, caja y análisis (e2e: registra y verifica existencias, `/panel/ventas`, ficha del cliente y caja).
- **Wow**: W1.

**A2 · Inventario**
- **Objetivo**: saber exactamente qué hay, dónde está, cuánto costó y cuánto vale, y moverlo sin llamar a nadie.
- **Archivos**: `src/modulos/inventario/**`, `e2e/paquetes/inventario.spec.ts`.
- **Rutas**: `/panel/inventario/**`.
- **Depende de**: fase 2.
- **Criterios** (PRD 7.4):
  - Catálogo en tabla y en tarjetas (`<Prenda>` 3:4 sobre gris producto), filtros por categoría, talla, color, local, proveedor y estado de stock; virtualizado.
  - Ficha: datos, matriz talla × color × local con pestañas por local (celdas en cero tramadas, bajas con borde camel, sugerencia "Traer de Zona Rosa (6 disponibles)"), SKU y EAN-13 con su gráfico por variante, kardex que cuadra con existencias, ventas de la referencia, rentabilidad (solo dueño).
  - Crear, editar y eliminar productos y variantes (SKU y EAN automáticos); stock mínimo por referencia.
  - Ajuste con motivo (daño, pérdida, error, hallazgo).
  - ✔ Traslados: solicitar (desde la matriz o la lista), aprobar si aplica, despachar, recibir (con faltantes); las existencias se mueven al recibir, con transición en las dos celdas.
  - Conteo físico por local: iniciar, escanear o digitar, diferencias en color, enviar a aprobación o aplicar con motivos.
  - Recepción de importación (`?importacion=`): recibidas y defectuosas por variante, distribución propuesta por local editable que genera traslados.
  - Etiquetas en PDF (código vectorial, referencia, talla, color, precio; tildes y `$` correctos).
  - Valorización por local y bodega (unidades, a costo, a precio de venta) con totales.
  - ✔ Los márgenes muestran el `costoVigente` actualizado por "Aplicar al inventario" de importaciones.
  - "Importar desde Excel" simulado (01_estrategia 4.6.6). Rol vendedor: solo lectura, sin costos ni márgenes en ninguna parte.
- **Wow**: W2 (y parte de W4).

**A3 · Ventas**
- **Objetivo**: consultar y auditar todo lo vendido, y resolver cambios y devoluciones.
- **Archivos**: `src/modulos/ventas/**`, `e2e/paquetes/ventas.spec.ts`.
- **Rutas**: `/panel/ventas`, `/panel/ventas/:ventaId`, `/panel/ventas/:ventaId/devolucion`.
- **Depende de**: fase 2.
- **Criterios** (PRD 7.3 y 7.2):
  - Tabla con filtros (fechas, local, vendedor, cliente, medio de pago, canal, estado, producto) reflejados en la URL; paginada o virtualizada, fluida con 16.000+ ventas.
  - Totales del filtro siempre visibles (ventas, devoluciones, netas, unidades, ticket promedio, descuentos) = totales de `selVentas`.
  - Detalle tipo recibo; editar (cliente, vendedor, canal, nota, medios) y anular con motivo, solo dueño; abonos a separados y créditos; cancelar separado.
  - Cambio o devolución: líneas y cantidades, reingreso o no, compensación (reembolso, saldo a favor, cambio → abre el POS con el saldo a favor cargado), nota crédito automática si hay factura.
  - Exportar a Excel y PDF el filtro aplicado.
  - Rol vendedor: solo sus ventas, sin editar ni anular.

**A4 · Clientes**
- **Objetivo**: conocer a cada cliente y escribirle en el momento justo.
- **Archivos**: `src/modulos/clientes/**`, `e2e/paquetes/clientes.spec.ts`.
- **Rutas**: `/panel/clientes`, `/panel/clientes/cumpleanos`, `/panel/clientes/:clienteId`.
- **Depende de**: fase 2.
- **Criterios** (PRD 7.10):
  - Lista con búsqueda, filtros (local, segmento, vendedor) y chips de segmento con conteo.
  - Ficha: contacto, cumpleaños, tallas preferidas (derivadas, con las declaradas editables), colores y estilos, local y vendedor habituales, autorización y canal; historial completo con ticket, frecuencia, última compra y valor histórico; saldo a favor y por cobrar.
  - Acciones: WhatsApp prellenado (plantilla + `registrarMensajes` + enlace), nota, seguimiento en el calendario (`crearEvento` tipo cita).
  - Cumpleaños del mes con mensaje sugerido.
  - Crear, editar y eliminar con confirmación. "Importar desde Excel" simulado. Rol vendedor: sus clientes.

#### Oleada B — Gestión

**B1 · Importaciones y portal de seguimiento**
- **Objetivo**: saber en todo momento dónde está cada pedido, cuánto se ha pagado y cuánto cuesta de verdad cada prenda; y avisarle a todos sin escribir.
- **Archivos**: `src/modulos/importaciones/**`, `src/seguimiento/**`, `e2e/paquetes/importaciones.spec.ts`.
- **Rutas**: `/panel/importaciones/**`, `/seguimiento/:numero`.
- **Depende de**: fase 2.
- **Criterios** (PRD 7.5):
  - Tablero kanban por estado (arrastrar = cambiar estado y abrir "Notificar a"), lista de contenedores con llegada estimada, vista de ruta China → puerto colombiano → Bogotá con el barco en la posición proporcional a las fechas (animado al cambiar).
  - Crear y editar pedido: proveedor, moneda, tasa, líneas por referencia y variantes, costo unitario de origen, contactos.
  - Línea de tiempo de 13 estados con fechas estimadas y reales e indicador de retraso.
  - ✔ Cambiar estado → panel "Notificar a" con los contactos preseleccionados y mensajes redactados (español; inglés para la fábrica) desde `config/textos/mensajes.ts`; bandeja de salida "Enviado (simulación)"; botones "Abrir en WhatsApp" y "Abrir en correo" que funcionan; el evento de llegada se mueve en el calendario.
  - ✔ Costo aterrizado: calculadora con cascada, prorrateo por valor o cantidad (la suma cuadra), simulador "¿Y si el dólar sube?" ±10 %, interruptor "IVA descontable (no suma al costo)", "Aplicar al inventario" con el resumen de márgenes antes → después.
  - Pagos al proveedor: anticipo y saldo con moneda, tasa del día y diferencia en cambio.
  - Documentos simulados (nombre, número, estado). Contactos de la cadena con CRUD.
  - ✔ Portal `/seguimiento/:numero`: solo lectura + formulario simulado (estado, fecha, nota, nombre) → `cambiarEstadoImportacion` con origen portal → alerta en Inicio y aviso inmediato en las otras pestañas abiertas.
  - Rol bodega: lectura de importaciones y acceso a recepción.
- **Wow**: W3, W4.

**B2 · Proveedores**
- **Objetivo**: tener a cada proveedor con su historia, su saldo y su cumplimiento.
- **Archivos**: `src/modulos/proveedores/**`, `e2e/paquetes/proveedores.spec.ts`.
- **Rutas**: `/panel/proveedores`, `/panel/proveedores/comparativo`, `/panel/proveedores/:proveedorId`.
- **Depende de**: fase 2.
- **Criterios** (PRD 7.6): directorio de fábricas y locales con filtros (tipo, país, moneda, local); ficha con contacto, moneda, condiciones, historial de pedidos (enlaza a importaciones), total comprado, saldo pendiente (enlaza a pagos), tiempo promedio de entrega, calificación; comparativo de fábricas (costo promedio por unidad, cumplimiento, retraso, defectos: debe revelar P14); CRUD; "Importar desde Excel" simulado; vista por local (arrendadores y servicios de cada local).

**B3 · Pagos y flujo de caja**
- **Objetivo**: saber cuánto debo, cuánto me deben y cuánta plata voy a tener, sin cuadrar a mano.
- **Archivos**: `src/modulos/pagos/**`, `e2e/paquetes/pagos.spec.ts`.
- **Rutas**: `/panel/pagos/**`.
- **Depende de**: fase 2.
- **Criterios** (PRD 7.7):
  - Resumen por local y comparativo de los tres locales.
  - Por pagar: proveedores (COP, USD, CNY con cifra de origen), arriendos, servicios, nómina, seguridad social, impuestos, agentes, publicidad; estados derivados; vistas por semana y por local; pagos parciales en dos clics; programar; soporte simulado; CRUD.
  - Por cobrar: separados, crédito y saldos, con recordatorio de WhatsApp prellenado.
  - Caja y bancos: saldos por cuenta (cajas de cada local, cuenta corriente, Nequi, Daviplata), libro con movimientos y pagos de ventas, transferencias.
  - Conciliación: marcar como conciliado con contador de pendientes.
  - Flujo de caja proyectado 30/60/90 días (real continuo, proyectado punteado), punto más bajo anotado en lenguaje sencillo, lista de pagos de esa semana con "Reprogramar" que mueve la línea en vivo.
- **Wow**: W5.

**B4 · Costos, gastos y estado de resultados**
- **Objetivo**: responder "¿qué local me deja plata?" en palabras sencillas.
- **Archivos**: `src/modulos/gastos/**`, `e2e/paquetes/gastos.spec.ts`.
- **Rutas**: `/panel/gastos/**`.
- **Depende de**: fase 2.
- **Criterios** (PRD 7.8): registro de gastos con fecha, local o general, categoría, valor, IVA, proveedor, medio de pago y soporte (pagado ya o por pagar); gastos recurrentes (CRUD + "Generar este mes"); resumen por categoría y por local vs. mes anterior; estado de resultados por mes y local (ventas − costo de la mercancía vendida = utilidad bruta − gastos operativos = utilidad operativa) con `<Termino>` y explicación; prorrateo opcional de gastos generales; punto de equilibrio mensual por local.

#### Oleada C — Personas y tiempo

**C1 · Personal, nómina y comisiones**
- **Objetivo**: que el dueño sepa cuánto le cuesta de verdad cada empleado y liquide sin hoja de cálculo.
- **Archivos**: `src/modulos/personal/**`, `e2e/paquetes/personal.spec.ts`.
- **Rutas**: `/panel/personal` (lista, nuevo, ficha y pestañas), `/panel/personal/nomina/**`, `/panel/personal/comparativo`, `/panel/personal/comisiones`, `/panel/mis-comisiones`.
- **Depende de**: fase 2.
- **Criterios** (PRD 7.9):
  - Lista de empleados con costo para el negocio y vista comparativa por local (costo de nómina como % de ventas, P15).
  - Ficha con todos los campos del PRD; contrato (reemplazar), esquema de comisión, afiliaciones, cuenta de pago, contacto de emergencia; crear, editar, retirar.
  - ✔ Pestaña "Costo para el negocio": barra apilada (salario, auxilio, aportes, prestaciones) e interruptor de exoneración del art. 114-1 que cambia los aportes en vivo; comparativo lado a lado con prestación de servicios y la nota de contrato realidad.
  - ✔ Nómina del periodo: vista previa con ambas modalidades (`selVistaPreviaNomina`), aprobar, pagar, historial; la marcación y las novedades alimentan la vista previa (e2e: marcar salida tarde en C2 cambia las horas extra del periodo).
  - Desprendible de pago en PDF por empleado y periodo; resumen del periodo en Excel.
  - Comisiones por vendedor y periodo con detalle por venta; "Mis comisiones" para el rol vendedor.
  - Verificación de PILA de contratistas con soporte simulado.
  - `<NotaLegal tipo="nomina">` visible en todo cálculo.
- **Wow**: W6 (y la parte de comisiones de W8).

**C2 · Turnos, asistencia y novedades**
- **Objetivo**: programar la semana sin pasarse de la jornada y saber quién llegó y cuántas horas trabajó.
- **Archivos**: `src/modulos/turnos/**`, `e2e/paquetes/turnos.spec.ts`.
- **Rutas**: `/panel/personal/turnos`, `/panel/personal/asistencia`, `/panel/personal/novedades`, `/panel/mi-turno`, `/panel/mi-dia`.
- **Depende de**: fase 2.
- **Criterios** (PRD 7.9):
  - ✔ Cuadrícula semanal empleados × días por local con arrastrar y soltar (asignar apertura, intermedio, cierre; mover; copiar semana); contador de horas por empleado contra 42 h con aviso y confirmación explícita del exceso.
  - ✔ "Marcar entrada / salida" (vendedor y bodega) con hora y local; aparece en la asistencia del dueño.
  - Reporte de asistencia: llegadas tarde, ausencias, horas trabajadas y extra, filtrable por local y empleado (destino de la alerta 4).
  - Novedades: incapacidades, vacaciones, licencias, permisos (CRUD).
  - "Mi día" del vendedor: saludo, ventas de hoy, comisión del mes, meta del local, botón grande de marcación (W8).
- **Wow**: W8 (parte de marcación).

**C3 · Calendario**
- **Objetivo**: ver en un solo lugar turnos, contenedores, pagos, campañas y citas.
- **Archivos**: `src/modulos/calendario/**`, `e2e/paquetes/calendario.spec.ts`.
- **Rutas**: `/panel/calendario`.
- **Depende de**: fase 2.
- **Criterios** (PRD 7.11): vistas mes, semana y día; filtros por tipo y local; colores por tipo (8.1.3); crear, editar y eliminar eventos guardados; arrastrar para mover: eventos guardados (`editarEvento`), turnos (`moverTurno`), llegadas (`actualizarHitosImportacion`), vencimientos (`editarCuentaPorPagar`); cada evento enlaza a su origen; ✔ la llegada de una importación cambia cuando cambia su estado o su fecha.

#### Oleada D — Inteligencia y vitrina

**D1 · Inicio**
- **Archivos**: `src/modulos/inicio/**`, `e2e/paquetes/inicio.spec.ts`. **Rutas**: `/panel/inicio`. **Depende de**: fase 2.
- **Objetivo**: el estado del negocio hoy, esta semana y este mes, en una pantalla.
- **Criterios** (PRD 7.1 y 01_estrategia 2.3): saludo con frase en tres variantes por hora (`selSaludo`); seis tarjetas con micrográfico y variación (`selKpisInicio`), "Ventas de hoy" nunca en $0 protagonista; ventas de 30 días por local; "Requiere tu atención" (`selAlertas`, acción directa al punto de resolución, nuevas arriba); comparativo de los tres locales con cumplimiento de meta; top 5 y 5 sin movimiento en 60 días con `<Prenda>`; próximos eventos; hallazgo de la semana; todo clicable; ✔ cuadra con la suma de las ventas; respeta local y moneda.

**D2 · Análisis y tabla dinámica**
- **Archivos**: `src/modulos/analisis/**`, `e2e/paquetes/analisis.spec.ts`. **Rutas**: `/panel/analisis/**`. **Depende de**: fase 2.
- **Objetivo**: entender el negocio sin fórmulas.
- **Criterios** (PRD 7.12): ventas por mes con año contra año; mapa de calor día × hora; ventas por semana; más y menos vendidos por unidades, valor y margen con filtros; tallas y colores que más rotan; rotación, días de inventario y mercancía dormida; desempeño por local y vendedor; comportamiento de clientes y medios de pago; proyección "A este ritmo cerrarías el mes en $ X"; hallazgos automáticos (`selHallazgos`); ✔ tabla dinámica con ≥ 10 dimensiones y ≥ 5 medidas, totales, gráfico asociado y exportación a Excel, con respuesta inmediata.

**D3 · Facturación simulada**
- **Archivos**: `src/modulos/facturacion/**`, `e2e/paquetes/facturacion.spec.ts`. **Rutas**: `/panel/facturacion/**`. **Depende de**: fase 2.
- **Criterios** (PRD 7.13): lista con estados; emitir desde una venta sin factura; vista previa elegante (emisor HALDEN con NIT ficticio, resolución ficticia, adquirente o consumidor final, detalle, IVA 19 %, total, CUFE, QR); estados generada → enviada a la DIAN (simulación) → aceptada con transición automática corta; notas crédito; PDF; marca de agua "DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL" en pantalla y PDF.

**D4 · Reportes**
- **Archivos**: `src/modulos/reportes/**`, `e2e/paquetes/reportes.spec.ts`. **Rutas**: `/panel/reportes`. **Depende de**: fase 2.
- **Criterios** (PRD 7.15): los 12 reportes (ventas detalladas y resumidas, cierre de caja, inventario valorizado y existencias, kardex, importaciones y costo aterrizado, por pagar y por cobrar, gastos por categoría, estado de resultados, nómina y desprendibles, asistencia, comisiones, clientes y segmentos) con filtros de fechas y local; ✔ todos se descargan en PDF y Excel y se abren sin errores (e2e: 24 descargas no vacías; los .xlsx se vuelven a leer con ExcelJS y tienen fila de totales); encabezado HALDEN, filtro, fecha y pie KippiCore; moneda activa indicada; rol bodega solo ve inventario y kardex.

**D5 · Canales digitales (WhatsApp, Instagram, vista web)**
- **Archivos**: `src/modulos/canales/**`, `src/seed/escenarios-canales.ts`, `e2e/paquetes/canales.spec.ts`. **Rutas**: `/panel/canales/**`. **Depende de**: fase 2.
- **Criterios** (PRD 7.14 a y b): teléfono con conversación animada ("escribiendo…") y panel del "cerebro" con la regla activa; 5 escenarios de WhatsApp (consulta de talla con inventario real, separado y saldo, nueva colección a segmento, cumpleaños, resumen al dueño "Ventas de hoy: $ X" con cifra real); texto libre con reconocimiento de producto, color (sinónimos: "clarita", "celeste", "azul cielo") y talla, y respuesta amable si no entiende; Instagram: "precio?" en comentarios, catálogo por DM, captura de contacto → `crearCliente` con origen Instagram; indicadores simulados; vista web con `/tienda` en marcos de escritorio y celular; etiqueta "Vista previa de lo que KippiCore puede construir para HALDEN" en cada vista.
- **Wow**: W9.

**D6 · Tienda web `/tienda`**
- **Archivos**: `src/tienda/**`, `e2e/paquetes/tienda.spec.ts`. **Rutas**: `/tienda/**`. **Depende de**: fase 2.
- **Criterios** (PRD 7.14 c y 8.6): portada, catálogo con filtros, ficha con selector de talla y color y disponibilidad real (local de despacho), bolsa, pago simulado (datos del comprador, "pasarela" simulada sin pedir tarjeta real: solo botón "Pagar (simulación)"); confirmación de pedido; ✔ la compra aparece en Ventas con canal Web y descuenta inventario; misma calidad estética; etiqueta de vitrina.

#### Oleada E — Móvil y experiencia

**E1 · App móvil del dueño `/app`**
- **Archivos**: `src/movil/**`, `e2e/paquetes/movil.spec.ts`. **Rutas**: `/app/**`. **Depende de**: fase 2 (y visualmente de D1).
- **Criterios** (PRD 6.1, 6.5 y 01_estrategia 4.4): experiencia distinta, no una versión encogida; pestañas Hoy · Ventas · Inventario · Agenda · Más; modo oscuro por defecto; "Para aprobar" (descuento y traslado precargados; aprobar o rechazar con deslizamiento → `resolverAprobacion`); importaciones con mini línea de tiempo; nómina, pagos pendientes, alertas, moneda; pulso en vivo (`avanzarReloj`) desactivable; tarjeta "Abre el sistema completo en tu computador"; `ModalAppDueno` (QR + vista previa enmarcada en `<iframe src="/app?marco=1">`) usado por la barra superior; ✔ navegable, instalable (pista de instalación), datos coherentes con el escritorio; sin scroll horizontal en 360–430 px.
- **Wow**: W10.

**E2 · Entrada, guía y ayuda**
- **Archivos**: `src/modulos/entrada/**`, `src/modulos/guia/**`, `e2e/paquetes/guia.spec.ts`. **Rutas**: `/`. **Depende de**: fase 2.
- **Criterios** (PRD 10 y 01_estrategia 2.2, 2.4–2.6): entrada de computador y de celular con dos puertas, QR real y progreso discreto de la carga; visita repetida "Continuar como dueño · Ibas en: …"; "Prueba esto" (8 ítems + "Para ir más lejos") con detección por eventos (6.18), minimizable, tarjeta de cierre; pistas contextuales (una por pantalla, primera visita; textos de 2.5); menú "?" (ver la entrada, mostrar Prueba esto, ver la app, ocultar pistas, restaurar datos, "Hablar con KippiCore" si está configurado). Los enlaces de la guía resuelven entidades con `selNarrativa()`.

**E3 · Configuración**
- **Archivos**: `src/modulos/configuracion/**`, `e2e/paquetes/configuracion.spec.ts`. **Rutas**: `/panel/configuracion/**`. **Depende de**: fase 2.
- **Criterios** (PRD 7.16 y 8): empresa (nombre, NIT, wordmark, colores aplicados en vivo a las variables CSS); locales (CRUD con G4); ✔ monedas y tasas (historial, "tasa de ejemplo", agregar, editar, eliminar; editar la tasa cambia las cifras visibles); parámetros de nómina (con marcas "Verificar", recalculan la vista previa en vivo); impuestos; aduanas (valores de ejemplo); usuarios y roles (simulado); ✔ datos de la demo: "Restaurar datos de demostración" con confirmación (estado inicial exacto), modo de almacenamiento, tamaño del registro, cambios no conservados, pulso en vivo y sugerencia de datos frescos.

### 9.5 Archivos compartidos entre oleadas

- Los pedidos de cambio de los informes se agrupan por archivo y los aplica **una sola** sesión Opus del líder entre oleadas, con pruebas de fase 2 en verde antes del commit.
- Si un pedido toca `dominio/tipos` o comandos, se sube `VERSION_GENERADOR` solo si cambian IDs o la historia generada.
- `docs/CONTRATOS.md` registra cada cambio con fecha y paquete solicitante.

---

## 10. Riesgos y mitigaciones

| # | Riesgo | Probabilidad / impacto | Mitigación |
|---|---|---|---|
| R1 | **Rendimiento con 18 meses** (generar ≈ 150.000 objetos, selectores pesados, tablas de 16.000 filas) | Media / alto | Worker + construcción por mutación directa; PRNG sfc32; selectores memoizados por referencia de tabla (Immer conserva las no tocadas); `hechosDeVenta` en una pasada; tablas virtualizadas; filtros aplicados en el selector, no en el componente; presupuesto medido en `scripts/medir-generador.ts` y prueba que falla > 3 s; el worker arranca en la entrada mientras el cliente lee |
| R2 | **PDF con tildes y símbolos** (á, ñ, ¿, `−`, espacio duro) | Alta si se usa Helvetica / alto | Figtree TTF estática embebida (Identity-H); normalizador `texto-pdf.ts`; prueba unitaria con la frase de control; QA visual abre los PDF; respaldo Helvetica + normalizador ampliado |
| R3 | **Rutas al recargar en Vercel** y chunks viejos tras redespliegue | Media / alto | `vercel.json` con reescritura que excluye `/assets/` (404 real para chunks inexistentes); `lazyConReintento` recarga una vez; e2e de recarga en 12 rutas profundas en local y en la URL pública (fase 6); service worker `autoUpdate` |
| R4 | **Conflictos entre agentes** | Alta sin reglas / alto | Dueño exclusivo de carpetas (9.4); todo lo compartido es de solo lectura; puntos de extensión creados por fase 2; ESLint de capas y de importaciones entre módulos (`publico.ts`); cambios compartidos aplicados por una sola sesión entre oleadas |
| R5 | **Inconsistencias numéricas** entre módulos | Media / crítico | Un solo camino de escritura (D1); casi todo derivado (D6); una sola definición de "venta reconocida" (V4) en `hechosDeVenta`; reglas puras compartidas por UI, manejador y generador; pruebas "selector vs. recálculo ingenuo"; `informe-coherencia.ts` para el auditor |
| R6 | **Cálculos de nómina** discutibles (recargos post-reforma, bases) | Media / alto (credibilidad ante el contador) | Parámetros editables con `porVerificar`; nota legal obligatoria; fórmulas explícitas en 6.20.5 con caso de prueba exacto (W6); interruptor de exoneración; nada se presenta como asesoría |
| R7 | **Tamaño del bundle** (Recharts, ExcelJS, jsPDF, Radix) | Media / medio | Code splitting por ruta; `manualChunks`; PDF y Excel con `import()` diferido; fuentes TTF solo al exportar; presupuesto por chunk que falla el build |
| R8 | **Fechas y zonas horarias** (cliente en Bogotá, QA en otra zona, CI en UTC) | Alta sin regla / alto | Fechas como cadenas de Bogotá; único reloj (`estado/reloj.ts`); `date-fns` a mediodía UTC; prohibición por ESLint de `Date.now`/`new Date()` en capas puras; `npm run test:tz` en tres zonas |
| R9 | **El cliente vuelve otro día** y la base cambió bajo sus cambios | Media / alto | Ancla de fecha + marca de agua (5.6.3–5.6.4): sus comandos se reaplican exactos; el generador respeta `controlManual` y las guardas; prueba de reaplicación al día siguiente |
| R10 | **Redespliegue con un generador distinto** rompe comandos guardados | Baja / medio | `VERSION_GENERADOR`; reaplicación tolerante con aviso discreto; IDs de entidades del usuario dentro del comando |
| R11 | **Sin almacenamiento** (navegación privada estricta, iframes, cuota) | Baja / medio | Modo memoria transparente con aviso discreto; adaptador único para los tres stores; fusión de registros entre pestañas |
| R12 | **Celular y computador con datos distintos** (sin backend) | Segura / medio | Vista previa enmarcada que comparte almacenamiento (W10); aviso en el modal del QR; misma base el mismo día (ancla por día) |
| R13 | **Fechas narrativas que caen raro** (abrir un domingo, el 25 de diciembre, a las 6:00 a. m.) | Media / medio | `narrativa.test.ts` recorre días de la semana, fechas especiales y horas; textos de alertas con variantes por hora (01_estrategia 2.3.1); "Ventas de hoy" muestra "Ayer" antes de abrir |
| R14 | **Escribirle a un tercero real** desde los enlaces `wa.me`/`mailto:` (celulares y correos ficticios pueden existir) | Baja / alto (reputacional) | Los enlaces de clientes, empleados y contactos **no incluyen destinatario**: `https://wa.me/?text=…` y `mailto:?subject=…&body=…` (el usuario elige a quién, nada se envía solo); nota "En la versión real se abre el chat de esa persona". Solo "Hablar con KippiCore" lleva número (el de Miguel, configurable) |
| R15 | **Marcas reales** en datos (fábricas, EPS, bancos, navieras) | Media / alto | Nombres ficticios en `seed/` con verificación en F2-A; EAN en rango interno 20–29; BL sin prefijos de navieras; QR de factura sin URL de la DIAN; entidades financieras genéricas; Nequi, Daviplata y Bre-B solo como medios de pago (los nombra el PRD) |
| R16 | **Generador lento o incoherente en celulares** (la app se abre primero en el teléfono) | Media / alto | Objetivo < 2,5 s en celular medio; progreso visible en la entrada; QA en 390 × 844 con CPU limitada ×4 en Playwright |
| R17 | **Fase 2 demasiado grande** para una sola sesión | Alta / medio | Tres sesiones consecutivas F2-A, F2-B, F2-C con criterios de salida y commits |
| R18 | **Patrones que no emergen** con ciertas fechas (p. ej. en enero no hay "punto bajo") | Media / medio | Calibraciones explícitas (retiros del socio, cierres narrativos); `patrones.test.ts` en 4 fechas del año; hallazgos con umbral de relevancia (si un patrón no aplica, se elige otro, siempre ≥ 3) |
| R19 | **Memoria** con varios marcos (`/app` y `/tienda` en iframes) | Baja / medio | Un solo marco visible a la vez; los marcos se montan al abrir el modal o la vista; mejora prevista: pasar el estado del padre por `postMessage` |
| R20 | **Arrastrar y soltar** en turnos, kanban y calendario inaccesible o frágil | Media / medio | `@dnd-kit` con sensores de teclado y puntero; alternativa con menú contextual "Mover a…" en cada tarjeta |

---

