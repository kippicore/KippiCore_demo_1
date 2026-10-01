# PLAN — Parte 1: Estrategia (secciones 1 a 4)

> Autor: agente `estratega` (Opus). Fuente de verdad: `docs/PRD.md`. Este archivo se integra como secciones 1–4 de `docs/PLAN.md`.
> Las rutas que aparecen aquí son **indicativas**: el arquitecto fija las definitivas en la sección 5, pero debe conservar el mapeo (cada ítem de "Prueba esto", cada alerta y cada pista apunta a la pantalla descrita).
> Todas las cifras de ejemplo son aproximadas: las calcula el generador de datos y las verifican las pruebas, nunca se escriben a mano en la interfaz.

---

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
