# PRD — KippiCore CRM · Demo para retail de moda masculina

**Versión:** 1.0 · **Fecha:** 30 de septiembre de 2026
**Elaborado por:** KippiCore (Miguel)
**Destinatario:** Claude Code (equipo de agentes que construirá la demo)
**Tipo de entregable:** demo web estática, navegable por link, sin backend

---

## 1. Resumen

KippiCore va a presentarle a un potencial cliente —dueño de un negocio de moda masculina con tres locales en Bogotá que importa su mercancía directamente desde China— una demo de un sistema de gestión integral llamado **KippiCore CRM**. El cliente hoy administra todo con Excel y un cuaderno, y lo que más le duele es el trabajo de "carpintería": registrar a mano, cuadrar cuentas, llevar la contabilidad a la antigua.

La demo debe mostrarle, de forma tangible y con datos que parezcan reales, cómo sería su negocio si todo estuviera en un solo lugar: inventario por talla, color y código de barras; ventas registradas con todo su detalle; pagos, costos y gastos; nómina con asistencia y turnos; importaciones desde China con seguimiento de estado; clientes; calendario; análisis de ventas; facturación; y una muestra de lo que serían sus canales digitales (automatización de WhatsApp e Instagram y su propia página web).

El cliente la va a explorar **solo**, desde un link que Miguel le envía. Por eso la demo tiene que explicarse a sí misma, no puede tener pantallas vacías ni botones muertos, y tiene que verse como un producto terminado de alta gama.

**El criterio de éxito es una reacción:** que el cliente abra el link, empiece a curiosear y piense "esto es exactamente lo que necesito, y se ve increíble".

---

## 2. Contexto del cliente (supuestos de trabajo)

No conocemos todos los detalles del cliente. Estos son los supuestos sobre los que se construye la demo; todos deben quedar parametrizables porque la demo será también una plantilla reutilizable.

| Aspecto | Supuesto |
|---|---|
| Negocio | Moda masculina de gama media-alta, estilo sastrería contemporánea y casual elegante |
| Locales | 3, todos en Bogotá |
| Canales actuales | Venta presencial en locales; Instagram y WhatsApp de forma manual |
| Empleados | Pocos: entre 10 y 14 en total (vendedores, cajeros, bodega, administración) |
| Remuneración | Algunos con salario fijo, algunos con comisión sobre ventas, algunos por prestación de servicios |
| Herramientas actuales | Excel y cuaderno |
| Facturación electrónica | Desconocido; la demo incluye un módulo de facturación simulada |
| Medios de pago | Todos: efectivo, datáfono (débito/crédito), Nequi, Daviplata, transferencia/Bre-B, separado (abonos), crédito a clientes |
| Abastecimiento | Compra directa a fábricas en China; terceros lo apoyan con la logística y nacionalización (agente de carga / agente de aduanas) |

---

## 3. Objetivos de la demo

### 3.1 Objetivo de negocio
Que el cliente entienda, sin que nadie se lo explique, que KippiCore puede construirle un sistema a su medida que elimina el trabajo manual y le da control total de sus tres locales. La demo es una herramienta comercial: abre la conversación de venta.

### 3.2 Objetivos de experiencia
1. **Reconocimiento inmediato.** En los primeros 10 segundos el cliente ve su propio negocio: ropa masculina, tres locales en Bogotá, pesos colombianos, nombres y referencias que le resultan familiares.
2. **Control total.** Cada módulo responde a una pregunta que el cliente se hace hoy: ¿cuánto vendí?, ¿qué tengo en bodega?, ¿cuánto le debo al proveedor?, ¿cuánto me cuesta la nómina?, ¿dónde viene mi contenedor?
3. **Todo conectado.** Registrar una venta descuenta el inventario, suma al dashboard, aparece en el historial del cliente y en la comisión del vendedor. Esta conexión es el corazón de la demo y debe ser visible.
4. **Dos mundos.** El dueño ve todo y lo revisa desde el celular; el empleado solo ve lo que necesita para vender y mover inventario.
5. **Sofisticación.** El acabado visual, las transiciones, los estados vacíos, la tipografía y el detalle deben estar a la altura de una marca de lujo masculino.

### 3.3 Métricas de éxito (cualitativas)
- El cliente navega más de 10 minutos sin ayuda.
- El cliente prueba registrar al menos una venta o editar un producto.
- El cliente abre la versión móvil en su celular.
- El cliente pregunta "¿cuánto cuesta esto?" o "¿cuándo lo tendría?".

---

## 4. Principios de producto

1. **Nada muerto.** Todo botón visible hace algo. Si una función no se construye completa, se simula de forma creíble (con un modal, un resultado o un estado) y nunca con un "próximamente" genérico.
2. **Datos densos y verosímiles.** Ninguna tabla vacía, ningún gráfico plano. 18 meses de historia con estacionalidad real.
3. **El negocio primero, el software después.** Lenguaje del comerciante colombiano, no de ingeniero. "Plata que me deben", no "cuentas por cobrar" a secas (se pueden usar ambas: término técnico con explicación sencilla).
4. **Autoexplicativo.** Tooltips breves, textos de ayuda en estados vacíos, un recorrido inicial corto y descartable.
5. **Lujo silencioso.** Minimalismo, contraste alto, mucho espacio en blanco, cero colores chillones.
6. **Plantilla, no proyecto único.** Marca, locales, productos y parámetros salen de archivos de configuración y datos semilla, de modo que la misma demo pueda adaptarse a otro cliente de retail cambiando la configuración.

---

## 5. Identidad visual

### 5.1 Marca ficticia del cliente
El cliente no tiene nombre de marca definido para la demo. Se usará una **marca ficticia**: **HALDEN** (descriptor: *Menswear · Bogotá*). El nombre, el logotipo tipográfico y los colores deben vivir en un archivo de configuración de marca para poder cambiarlos.

### 5.2 Dirección estética
La estética toma como referencia el lenguaje visual de las grandes casas de moda masculina alemanas y europeas del segmento premium (la referencia que dio el cliente es Hugo Boss), **sin copiar su marca**:

- **Sí:** paleta dominante negro y blanco, grises cálidos, un acento muy discreto (por ejemplo, un camel o un gris piedra); tipografía sans-serif geométrica y limpia, con títulos en mayúsculas espaciadas (tracking amplio); fotografía o ilustración de producto sobre fondos neutros; retícula rigurosa; bordes finos de 1 px; esquinas rectas o con radio mínimo; iconografía lineal delgada.
- **No:** usar el nombre, logotipo, wordmark, tipografía propietaria, eslóganes ni ningún elemento registrado de Hugo Boss o de cualquier otra marca real. Nada en la demo debe poder confundirse con material de esa marca.

Tipografías sugeridas (libres, de Google Fonts): *Inter* o *Manrope* para interfaz, *Jost* o *Montserrat* en mayúsculas espaciadas para títulos y el wordmark de HALDEN. Claude Code puede elegir otras libres si dan mejor resultado.

Modo claro por defecto. Modo oscuro opcional (negro profundo, no gris azulado), deseable para la app móvil del dueño.

### 5.3 Firma de KippiCore
El producto se llama **KippiCore CRM**. Debe aparecer:
- En la pantalla de entrada ("KippiCore CRM · Demo para HALDEN").
- En el pie de la barra lateral, discreto ("Desarrollado por KippiCore").
- En el encabezado o pie de todos los PDF exportados.

La marca del cliente (HALDEN) domina la interfaz; KippiCore firma con discreción.

### 5.4 Imágenes de producto
No se descargan fotos de terceros. Las imágenes de producto deben resolverse con una de estas opciones, en este orden de preferencia: (a) ilustraciones vectoriales minimalistas generadas en SVG por tipo de prenda (camisa, blazer, pantalón, polo, abrigo, zapato, cinturón, corbata) coloreadas según la variante; (b) bloques de color con el ícono de la prenda. Deben verse elegantes y coherentes, no infantiles.

---

## 6. Arquitectura de la experiencia

### 6.1 Dos superficies distintas
La demo tiene **dos versiones diferentes**, no una sola versión responsive:

| | **Versión de escritorio** | **App móvil del dueño** |
|---|---|---|
| Para quién | Dueño (administrador) y empleados | Solo el dueño |
| Propósito | Operar el negocio: registrar, editar, administrar | Supervisar: ver cómo va el negocio y aprobar cosas |
| Ruta | `/` (raíz) | `/app` |
| Navegación | Barra lateral con módulos | Barra inferior de pestañas (estilo app nativa) |
| Densidad | Alta: tablas, filtros, formularios | Baja: tarjetas, cifras grandes, gráficos simples |
| Instalable | No | Sí, como PWA (ícono en la pantalla de inicio, pantalla completa) |

La pantalla de entrada de la demo debe ofrecer las dos puertas de forma clara, y la versión de escritorio debe tener un acceso visible a "Ver app del dueño" que muestre un código QR para abrirla en el celular y, en pantallas grandes, una vista previa enmarcada en un teléfono.

### 6.2 Roles
Se simulan con un selector de rol siempre visible en la versión de escritorio (sin contraseñas):

| Rol | Persona ficticia | Qué ve |
|---|---|---|
| **Dueño / Administrador** | El dueño (nombre configurable) | Todo, en los tres locales |
| **Vendedor** | Un vendedor de un local específico | Punto de venta, consulta de inventario de su local y de los otros (solo lectura), sus clientes, su asistencia y sus comisiones |
| **Bodega / Inventario** | Encargado de bodega | Inventario, recepción de mercancía, traslados entre locales, conteos físicos |

Al cambiar de rol, la interfaz cambia en vivo: la barra lateral muestra solo los módulos permitidos, aparece una franja superior discreta que indica "Estás viendo KippiCore como: Vendedor · Local Usaquén", y un botón para volver a la vista del dueño. El objetivo es que el dueño entienda qué verán sus empleados en la computadora del local.

### 6.3 Selector de local
Todo el sistema se puede filtrar por punto de venta. En la barra superior hay un selector: **Todos los locales · Parque 93 · Usaquén · Zona Rosa** (nombres configurables). Dashboards, inventario, ventas, gastos, nómina y reportes respetan el filtro. Para el rol de vendedor el local queda fijo.

### 6.4 Mapa de navegación (escritorio)
1. Inicio
2. Punto de venta
3. Ventas
4. Inventario
5. Importaciones
6. Proveedores
7. Pagos (por pagar y por cobrar, caja)
8. Costos y gastos
9. Personal y nómina
10. Clientes
11. Calendario
12. Análisis
13. Facturación
14. Canales digitales (WhatsApp, Instagram, Página web)
15. Reportes
16. Configuración

### 6.5 Mapa de navegación (app móvil)
Pestañas inferiores: **Hoy · Ventas · Inventario · Agenda · Más**. "Más" contiene importaciones, nómina, pagos pendientes, alertas y configuración de moneda.

---

## 7. Módulos funcionales

Para cada módulo se describe el objetivo, las pantallas, las acciones que el usuario puede hacer y cómo se conecta con el resto. **Todas las entidades deben permitir crear, editar y eliminar** (con confirmación), y los cambios deben reflejarse de inmediato en los módulos conectados.

### 7.1 Inicio (dashboard del dueño)

**Objetivo:** en una pantalla, el estado del negocio hoy, esta semana y este mes.

Contenido:
- Tarjetas de indicadores: ventas de hoy, ventas del mes vs. mes anterior (variación %), ticket promedio, unidades vendidas, margen bruto del mes, efectivo en caja estimado.
- Gráfico de ventas de los últimos 30 días por local (líneas o barras apiladas).
- Top 5 productos del mes y 5 productos sin movimiento en 60 días.
- Alertas accionables: referencias con stock bajo, pagos que vencen esta semana, importación con cambio de estado, empleados con inasistencia, separados por vencer.
- Próximos eventos del calendario (3–5).
- Comparativo rápido de los tres locales (ventas, margen, ticket promedio).

Cada tarjeta y alerta es clicable y lleva al detalle en su módulo.

### 7.2 Punto de venta (POS)

**Objetivo:** que registrar una venta sea más rápido que anotarla en el cuaderno. Es la pantalla que usará el vendedor.

Flujo:
1. Buscar producto por nombre, referencia o **código de barras** (campo que acepta escritura y simula un lector; incluir un botón "Simular escaneo" que agrega un producto aleatorio disponible).
2. Elegir talla y color en una grilla visual que muestra la disponibilidad en el local (y en los otros locales, en gris).
3. Carrito con cantidades, precio de lista, descuento por línea o global (porcentaje o valor), y total.
4. Asociar cliente: buscar existente o crear rápido (nombre, celular, cédula opcional, correo opcional, autorización de tratamiento de datos).
5. Medio de pago, con posibilidad de **pago mixto** (por ejemplo, parte efectivo y parte Nequi) y cálculo de cambio en efectivo.
6. Confirmar: genera la venta, descuenta inventario del local, asigna la venta al vendedor, y ofrece "Emitir factura electrónica" (simulada, ver 7.13) o "Recibo POS".

Cada venta registra como mínimo: número consecutivo, fecha y hora, local, vendedor, cliente, líneas (producto, variante, SKU, cantidad, precio de lista, descuento, precio final), subtotal, IVA, total, medios de pago y valores, estado (pagada, separado, devuelta, anulada), canal (local, WhatsApp, Instagram, web).

Funciones adicionales:
- **Separado (plan de abonos):** venta con abono inicial, saldo pendiente y fecha límite; la mercancía queda reservada.
- **Cambios y devoluciones:** desde una venta existente, devolver una o varias líneas, reingresar el inventario y generar nota crédito o saldo a favor.
- **Apertura y cierre de caja** por local y turno: base inicial, ventas por medio de pago, egresos de caja, efectivo esperado vs. contado, diferencia.

### 7.3 Ventas

**Objetivo:** consultar y auditar todo lo vendido.

- Tabla de ventas con filtros: rango de fechas, local, vendedor, cliente, medio de pago, canal, estado, producto.
- Detalle de cada venta (vista de recibo/factura), editable o anulable por el dueño con motivo.
- Totales del filtro aplicado siempre visibles (ventas, unidades, ticket promedio, descuentos otorgados).
- Exportar a Excel y PDF.

### 7.4 Inventario

**Objetivo:** saber exactamente qué hay, dónde está, cuánto costó y cuánto vale.

**Modelo de producto:**
- **Producto (referencia):** nombre, referencia interna (ej. `HL-CAM-0142`), categoría (camisas, blazers, pantalones, polos, abrigos y chaquetas, punto/sweaters, trajes, calzado, accesorios), línea (sastrería, casual, sport), temporada, proveedor, material/composición, precio de venta, costo unitario aterrizado (heredado de la importación), margen calculado, imagen.
- **Variante:** talla (S–XXL para prendas superiores; 28–40 para pantalones; 38–44 para calzado; 46–56 para trajes y blazers), color, **SKU** y **código de barras EAN-13** generado y visible (con su gráfico de barras).
- **Existencias:** por variante y por local, más una bodega central si se considera útil.

Pantallas y acciones:
- Catálogo con vista de tabla y vista de tarjetas, filtros por categoría, talla, color, local, proveedor, estado de stock.
- Ficha de producto: datos, variantes con matriz talla × color × local, historial de movimientos (kardex), ventas de la referencia, rentabilidad.
- **Movimientos:** entrada por importación, salida por venta, devolución, **traslado entre locales** (con estado: solicitado, en tránsito, recibido), ajuste por conteo físico (con motivo: daño, pérdida, error).
- **Conteo físico:** iniciar un conteo por local, escanear o digitar cantidades, ver diferencias contra el sistema y aplicar ajustes.
- **Alertas de stock mínimo** configurables por referencia.
- **Etiquetas:** imprimir/descargar en PDF una hoja de etiquetas con código de barras, referencia, talla, color y precio.
- Valorización del inventario: unidades y valor a costo y a precio de venta, por local.

### 7.5 Importaciones (desde China)

**Objetivo:** que el dueño sepa en todo momento dónde está cada pedido, cuánto ha pagado y cuánto le termina costando realmente cada prenda.

**Pedido de importación:**
- Número, proveedor (fábrica), fecha del pedido, moneda (USD o CNY), tasa de cambio usada, valor de la mercancía (FOB), líneas del pedido (referencia, variantes, cantidades, costo unitario en moneda de origen).
- **Estados (línea de tiempo):** Cotizado → Pedido confirmado → Anticipo pagado → En producción → Listo para despacho → Saldo pagado → Embarcado (zarpe) → En tránsito marítimo/aéreo → En puerto colombiano → En proceso de nacionalización → Nacionalizado → En transporte a Bogotá → Recibido en bodega.
- Fechas estimadas y reales de cada estado; indicador de retraso.
- Documentos asociados (simulados con nombres y estado): proforma, factura comercial, lista de empaque, conocimiento de embarque (BL) o guía aérea, declaración de importación.
- **Costo aterrizado:** calculadora que suma FOB + flete internacional + seguro + aranceles + IVA de importación + honorarios del agente de aduanas + bodegaje y gastos portuarios + transporte interno + otros. Distribuye el total entre las unidades (por valor o por cantidad) y muestra el **costo real por prenda en COP**, que alimenta el inventario y los márgenes. Las tasas de arancel y demás valores son parámetros editables, con valores de ejemplo identificados como tales.
- **Pagos al proveedor:** anticipo y saldo, con moneda, tasa del día del pago y diferencia en cambio.

**Contactos de la cadena de importación:** proveedor en China, agente de carga, agente de aduanas, transportador local. Cada uno con nombre, empresa, rol, correo, WhatsApp y país.

**Notificaciones de estado (función destacada):** cuando el dueño cambia el estado de una importación (o lo hace alguien de su equipo), el sistema:
1. Muestra un panel "Notificar a" con los contactos de esa importación preseleccionados.
2. Genera un mensaje redactado automáticamente (en español y, para el proveedor chino, en inglés) con el estado, la fecha y los siguientes pasos.
3. Lo deja en una **bandeja de salida simulada** con el canal (correo / WhatsApp), la hora y el estado "Enviado (simulación)".
4. Ofrece además dos botones reales: "Abrir en WhatsApp" (enlace `wa.me` con el texto prellenado) y "Abrir en correo" (enlace `mailto:` con asunto y cuerpo), para que se vea que el envío real es trivial.

También debe existir la vista inversa: un enlace de **portal de seguimiento** de solo lectura por importación (ruta `/seguimiento/:id`), que es lo que vería el agente de aduanas para consultar o "actualizar" el estado, con un formulario simulado de actualización que, al enviarse, cambia el estado en la demo y genera una alerta para el dueño.

Vista general: tablero tipo kanban por estado, mapa o diagrama simple de la ruta China → puerto colombiano → Bogotá, y lista de contenedores con fecha estimada de llegada, conectada al calendario.

### 7.6 Proveedores

- Directorio de proveedores (fábricas en China y proveedores locales: arriendo, servicios, empaques, publicidad, sastre de arreglos).
- Ficha: datos de contacto, moneda, condiciones de pago, historial de pedidos, total comprado, saldo pendiente, tiempo promedio de entrega, calificación interna.
- Comparativo simple de proveedores chinos: costo promedio por unidad, cumplimiento de fechas, tasa de defectos (dato ficticio).

### 7.7 Pagos

**Objetivo:** que el dueño sepa cuánto debe, cuánto le deben y cuánta plata tiene, sin cuadrar a mano.

- **Por pagar:** proveedores (en COP, USD o CNY), arriendos de los tres locales, servicios públicos, nómina, seguridad social, impuestos, agente de aduanas, publicidad. Estados: pendiente, programado, pagado, vencido. Pagos parciales. Registro del medio de pago y soporte (simulado).
- **Por cobrar:** separados, ventas a crédito, saldos de clientes. Recordatorio de cobro con mensaje de WhatsApp prellenado.
- **Caja y bancos:** saldos por cuenta (caja de cada local, cuenta bancaria, Nequi, Daviplata) y movimientos. Conciliación simple de ventas con datáfono y transferencias (marcar como conciliado).
- **Flujo de caja proyectado** a 30/60/90 días: ingresos esperados (promedio de ventas, separados) menos egresos programados (nómina, arriendos, saldos de importación). Gráfico sencillo con la línea de saldo.

### 7.8 Costos y gastos

- Registro de gastos con fecha, local (o "general"), categoría (arriendo, servicios, nómina, publicidad, transporte, mantenimiento, empaques, comisiones de datáfono, impuestos, otros), valor, IVA, proveedor, medio de pago y soporte.
- **Gastos recurrentes:** plantillas que se generan cada mes (arriendo, internet, vigilancia).
- Resumen por categoría y por local, con comparación contra el mes anterior.
- **Estado de resultados simplificado** por mes y por local: ventas − costo de mercancía vendida = utilidad bruta − gastos operativos = utilidad operativa. Con explicación en lenguaje sencillo.
- Punto de equilibrio mensual estimado por local.

### 7.9 Personal y nómina

**Empleados:** ficha con nombre, documento, cargo, local, fecha de ingreso, tipo de vinculación, salario u honorarios, esquema de comisión, EPS, fondo de pensión, ARL, caja de compensación, cuenta para pago, contacto de emergencia.

**Dos modalidades de vinculación (función destacada):**

1. **Contrato laboral (nómina colombiana con prestaciones).** Liquidación mensual o quincenal que calcula, con parámetros editables:
   - Devengados: salario básico, auxilio de transporte (si devenga hasta 2 SMMLV), horas extra y recargos (nocturno, dominical y festivo), comisiones.
   - Deducciones del trabajador: salud 4%, pensión 4%, fondo de solidaridad pensional cuando aplique.
   - Aportes del empleador: salud 8,5%, pensión 12%, ARL (riesgo I, 0,522%), caja de compensación 4%, ICBF 3% y SENA 2% (con interruptor de **exoneración del art. 114-1 del Estatuto Tributario** para trabajadores que devenguen menos de 10 SMMLV, que elimina salud del empleador, ICBF y SENA).
   - Provisiones de prestaciones sociales: cesantías 8,33%, intereses a las cesantías 1% mensual (12% anual), prima de servicios 8,33%, vacaciones 4,17%.
   - Resultado: neto a pagar al empleado y **costo total para el empleador**, con un desglose visual que muestre que un salario de X le cuesta al negocio Y.

2. **Contrato de prestación de servicios.** Honorarios pactados, retención en la fuente sobre honorarios (porcentaje parametrizable), verificación de que el contratista aportó su seguridad social (casilla y soporte simulado de planilla PILA), sin prestaciones ni aportes del contratante. Mostrar una comparación lado a lado "¿cuánto me cuesta este mismo cargo en cada modalidad?", con una nota prudente de que la prestación de servicios no puede usarse para relaciones con subordinación (riesgo de contrato realidad).

**Parámetros 2026 (precargados y editables en Configuración):**

| Parámetro | Valor 2026 | Fuente |
|---|---|---|
| Salario mínimo (SMMLV) | $1.750.905 | Decreto 1469 de 2025 |
| Auxilio de transporte | $249.095 | Decreto 1470 de 2025 |
| Jornada máxima semanal | 42 horas (desde el 15 de julio de 2026) | Ley 2101 de 2021 |
| Recargos nocturno, dominical y festivo | Porcentajes vigentes tras la reforma laboral (Ley 2466 de 2025) | **Verificar antes de presentar como cálculo real** |

Todos los cálculos de nómina deben mostrar una nota discreta: *"Cálculo ilustrativo para la demo. Los valores se parametrizan y validan con el contador en la implementación."*

**Comisiones:** esquema configurable por empleado (porcentaje sobre ventas propias, escalonado por metas, o bono por cumplimiento de meta del local). La comisión se calcula automáticamente a partir de las ventas registradas en el POS.

**Asistencia y turnos:**
- Programación de turnos por local en una vista semanal (tipo cuadrícula: empleados × días), con arrastrar y soltar para asignar turnos (apertura, intermedio, cierre) y validación de horas semanales contra la jornada máxima.
- **Marcación de entrada y salida** (simulada desde el rol de vendedor con un botón "Marcar entrada / salida", que registra hora y local).
- Reporte de asistencia: llegadas tarde, ausencias, horas trabajadas, horas extra, que alimentan la liquidación.
- Novedades: incapacidades, vacaciones, licencias, permisos.

**Documentos:** desprendible de pago descargable en PDF por empleado y periodo; resumen de nómina del periodo en Excel.

### 7.10 Clientes (CRM)

- Ficha de cliente: datos de contacto, cumpleaños, tallas preferidas (camisa, pantalón, calzado, blazer), colores y estilos que más compra, local habitual, vendedor que más lo atiende, autorización de tratamiento de datos y canal preferido.
- Historial completo de compras, ticket promedio, frecuencia, última compra, valor total histórico.
- **Segmentación automática simple:** VIP (alto valor), frecuente, ocasional, en riesgo (no compra hace más de 90 días), nuevo.
- Acciones: enviar mensaje de WhatsApp prellenado (por ejemplo, "Llegó nueva colección en tu talla"), agregar nota, programar seguimiento en el calendario.
- Lista de cumpleaños del mes con mensaje sugerido.
- Puntos o beneficio de fidelización simple (opcional, si suma a la demo sin complicarla).

### 7.11 Calendario y agenda

Vista de mes, semana y día, filtrable por tipo de evento y por local, con colores por tipo:

| Tipo | Ejemplos | Conexión |
|---|---|---|
| Turnos de empleados | Apertura Usaquén, cierre Zona Rosa | Módulo de turnos |
| Llegadas de importaciones | "Llega contenedor pedido IMP-2026-07 a bodega" | Fecha estimada de la importación |
| Vencimiento de obligaciones | Pago saldo proveedor, arriendo, PILA, IVA, retención en la fuente, renovación de matrícula mercantil | Módulo de pagos |
| Campañas de temporada | Prima de junio, Día del Padre, Amor y Amistad, Black Friday, Navidad, temporada de grados | Análisis y canales digitales |
| Citas con clientes | Asesoría de imagen, toma de medidas para sastrería | Ficha de cliente |

Crear, editar, mover (arrastrar) y eliminar eventos. Recordatorios visibles en el inicio y en la app móvil.

### 7.12 Análisis

**Objetivo:** que el dueño entienda su negocio sin fórmulas. Nada estadísticamente complejo; claridad sobre sofisticación matemática.

Contenido:
- **Ventas por mes** (últimos 18 meses) con comparación año contra año: ¿en qué meses vendo más?
- **Ventas por día de la semana y por franja horaria** (mapa de calor día × hora): ¿qué días y a qué horas vendo más? Útil para programar turnos.
- **Ventas por semana del año.**
- **Productos más vendidos y menos vendidos** (por unidades, por valor y por margen), con filtro por categoría, talla y color.
- **Tallas y colores que más rotan**, para decidir el próximo pedido a China.
- **Rotación de inventario y días de inventario** por categoría; mercancía "dormida".
- **Desempeño por local y por vendedor.**
- **Comportamiento de clientes:** nuevos vs. recurrentes, frecuencia de compra, ticket promedio por segmento, distribución por canal y medio de pago.
- **Tabla dinámica:** el usuario elige filas (mes, semana, día, local, vendedor, categoría, producto, talla, color, medio de pago, canal, segmento de cliente), columnas (cualquiera de las anteriores) y valor (ventas en $, unidades, número de ventas, ticket promedio, margen), y la tabla se arma al instante con totales y un gráfico asociado. Exportable a Excel.
- **Tendencia simple:** una proyección del mes en curso (ventas a la fecha extrapoladas con el promedio diario y la estacionalidad del año anterior), presentada como "A este ritmo, cerrarías el mes en $X".
- **Hallazgos automáticos:** 3 a 5 frases generadas a partir de los datos, en lenguaje sencillo. Ejemplo: "Los sábados entre 3 y 6 p. m. concentran el 22% de tus ventas" o "Las camisas talla M en azul se agotan antes que el resto: considera pedir 30% más".

### 7.13 Facturación electrónica (simulada)

- Generación de factura a partir de una venta: datos del emisor (HALDEN, NIT ficticio), resolución de facturación ficticia con prefijo y rango, datos del adquirente (o "consumidor final"), detalle, IVA 19%, total, **CUFE simulado** y **código QR**.
- Vista previa elegante y descarga en PDF.
- Estados simulados: generada, enviada a la DIAN (simulación), aceptada.
- Notas crédito por devoluciones.
- Marca de agua visible en todos los documentos: **"DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL"**.

### 7.14 Canales digitales

**Objetivo:** mostrar lo que KippiCore puede hacer más allá del sistema interno. Este módulo es vitrina, debe ser muy visual.

**a) Automatización de WhatsApp.** Una vista con dos paneles: a la izquierda, un teléfono con una conversación de WhatsApp simulada y animada; a la derecha, el "cerebro" de la automatización (reglas y flujos). Escenarios jugables (el usuario elige uno y la conversación se reproduce, y también puede escribir mensajes que el bot responde con reglas simples):
- Cliente pregunta si hay una camisa en su talla → el bot consulta el inventario real de la demo y responde con disponibilidad por local.
- Confirmación de separado y recordatorio de saldo.
- Aviso de nueva colección a clientes segmentados.
- Mensaje de cumpleaños con beneficio.
- Notificación interna al dueño: "Ventas de hoy: $X" al cierre.
Indicadores simulados: mensajes enviados, tasa de respuesta, ventas atribuidas.

**b) Automatización de Instagram.** Mismo formato con mensajes directos y comentarios: respuesta automática a "precio?" en comentarios, envío de catálogo por DM, captura del contacto y creación automática del cliente en el CRM.

**c) Página web / tienda en línea.** Una vista previa de la **tienda web de HALDEN** generada a partir del inventario: portada, catálogo con filtros, ficha de producto con selector de talla y color y disponibilidad, carrito y un checkout simulado. Mostrable en marcos de escritorio y de celular. Al "comprar" en la tienda, la venta aparece en el sistema con canal "Web" y descuenta inventario. Esta tienda vive en la ruta `/tienda` y debe tener la misma calidad estética que el resto.

Debe quedar claro con una etiqueta en cada vista: "Vista previa de lo que KippiCore puede construir para HALDEN".

### 7.15 Reportes

Centro de reportes con descarga en **PDF y Excel (.xlsx)**, todos filtrables por rango de fechas y local:
- Ventas detalladas y resumidas.
- Cierre de caja.
- Inventario valorizado y existencias por local.
- Kardex por referencia.
- Importaciones y costo aterrizado.
- Cuentas por pagar y por cobrar.
- Gastos por categoría.
- Estado de resultados simplificado.
- Nómina del periodo y desprendibles.
- Asistencia.
- Comisiones por vendedor.
- Clientes y segmentos.

Los PDF llevan encabezado con la marca HALDEN, el filtro aplicado, la fecha de generación y el pie "Generado con KippiCore CRM". Los Excel tienen encabezados con formato, columnas con ancho correcto, formato de moneda y una fila de totales.

### 7.16 Configuración

- **Empresa:** nombre, NIT, logotipo tipográfico, colores (base de la plantilla reutilizable).
- **Locales:** crear, editar, eliminar.
- **Monedas y tasas de cambio** (ver sección 8).
- **Parámetros de nómina** (SMMLV, auxilio, porcentajes, exoneración).
- **Impuestos:** IVA, retenciones (parámetros).
- **Usuarios y roles** (simulado).
- **Datos de la demo:** botón "Restaurar datos de demostración" con confirmación, que regresa todo al estado inicial.

---

## 8. Multimoneda

- Moneda base: **peso colombiano (COP)**.
- Monedas adicionales: **dólar estadounidense (USD)** y **yuan chino (CNY)**.
- Selector global de moneda de visualización en la barra superior (y en la app móvil): al cambiarlo, todas las cifras del sistema se convierten con la tasa vigente y se indica la moneda con su símbolo y código.
- **Tabla de tasas de cambio** en Configuración: el usuario edita la tasa COP/USD y COP/CNY, con fecha. Se precargan valores de ejemplo claramente marcados como "tasa de ejemplo". Se guarda un historial de tasas para que las operaciones pasadas usen la tasa de su fecha.
- Las importaciones se registran en su moneda de origen y se convierten a COP con la tasa de la fecha del pago.
- Formato colombiano en todo: separador de miles con punto, decimales con coma, símbolo `$` para COP, `US$` para USD, `¥` o `CN¥` para CNY. Fechas en formato `dd/mm/aaaa` y horas en formato de 12 horas con a. m./p. m.

---

## 9. Datos de demostración

Los datos son ficticios, deterministas (mismo resultado en cada carga, a partir de una semilla) y coherentes entre módulos. **La coherencia es un requisito, no un detalle:** el inventario actual debe resultar de las entradas menos las salidas; las ventas del dashboard deben cuadrar con la suma de las ventas; las comisiones deben corresponder a las ventas de cada vendedor.

| Entidad | Volumen sugerido | Notas |
|---|---|---|
| Locales | 3 | Parque 93, Usaquén, Zona Rosa (Bogotá), más bodega |
| Referencias de producto | 70–100 | Repartidas en las categorías de 7.4, nombres verosímiles (ej. "Camisa Oxford Slim Fit", "Blazer de lana fría", "Chino stretch") |
| Variantes (talla × color) | 500–900 | Con códigos EAN-13 válidos (dígito de control correcto) |
| Empleados | 12–14 | Nombres colombianos, mezcla de contrato laboral y prestación de servicios, algunos con comisión |
| Clientes | 350–500 | Nombres colombianos, celulares con formato 3XX, mezcla de segmentos |
| Ventas | 18 meses de historia, hasta la fecha actual | Entre 15 y 60 ventas diarias en total según día y temporada |
| Proveedores | 5–6 fábricas en China (Guangzhou, Hangzhou, Ningbo, Shaoxing…) + 8–10 proveedores locales | |
| Importaciones | 8–10 | Varias recibidas, 3–4 en curso en estados distintos (una en producción, una en tránsito, una en nacionalización, una retrasada) |
| Gastos | 18 meses | Arriendos fijos por local, servicios, nómina, publicidad estacional |
| Eventos de calendario | 2 meses atrás y 3 meses adelante | Turnos, llegadas, vencimientos, campañas |
| Conversaciones de WhatsApp/Instagram | 5–6 escenarios guionados | |

**Estacionalidad que deben reflejar las ventas** (Colombia, moda masculina): picos en la prima de junio y Día del Padre (junio), Amor y Amistad (septiembre), Black Friday (noviembre), prima de diciembre y Navidad (el mes más alto); temporada de grados con algo de pico en junio y diciembre; enero y febrero bajos. Fines de semana más fuertes que entre semana; sábado es el mejor día; franja fuerte entre 3 y 7 p. m.; centros comerciales con más tráfico los domingos.

Diferencias entre locales: uno es el más vendedor con ticket alto, otro tiene más volumen y ticket medio, otro es más pequeño. Debe haber patrones descubribles en el análisis (una talla que se agota, una categoría dormida, un vendedor estrella) para que los hallazgos automáticos tengan algo que decir.

La fecha "actual" de la demo es la fecha real del sistema en el que se abre; los datos históricos se generan hacia atrás desde esa fecha, para que la demo nunca se vea desactualizada.

---

## 10. Recorrido guiado ligero

El cliente va a explorar solo, pero no queremos atraparlo en un tour largo.

- **Pantalla de bienvenida** (una sola vez, descartable): título, una frase de qué es la demo, tres botones: "Explorar como dueño", "Ver lo que ve un vendedor", "Abrir la app en mi celular" (con QR).
- **Lista "Prueba esto"** flotante y minimizable, con 6 a 8 acciones sugeridas que se marcan al completarlas: registrar una venta, cambiar al rol de vendedor, ver dónde viene la importación, cambiar la moneda a dólares, armar una tabla dinámica, descargar un reporte en PDF, ver la automatización de WhatsApp, abrir la tienda web.
- **Pistas contextuales** (pequeños puntos pulsantes o tooltips) solo en la primera visita de cada módulo, máximo una por pantalla.
- Un botón de ayuda "?" siempre disponible para reabrir la bienvenida y la lista.

---

## 11. Requisitos no funcionales

| Área | Requisito |
|---|---|
| Arquitectura | 100% estática, sin backend, sin base de datos, sin servicios de terceros de pago. Desplegable en Vercel como sitio estático. |
| Persistencia | Los cambios del usuario se guardan en el navegador (almacenamiento local), de modo que si el cliente registra una venta y recarga, la venta sigue ahí. Botón para restaurar los datos iniciales. La demo debe funcionar aunque el almacenamiento local no esté disponible (modo memoria). |
| Rendimiento | Carga inicial rápida (objetivo: interactivo en menos de 3 segundos en una conexión normal). Tablas grandes paginadas o virtualizadas. La generación de datos no debe congelar la interfaz. |
| Compatibilidad | Últimas versiones de Chrome, Safari, Edge y Firefox. App móvil probada en tamaños de iPhone y Android comunes. |
| Responsive | La versión de escritorio debe verse bien desde 1280 px y degradar con dignidad en tabletas. La app móvil está diseñada para 360–430 px. |
| Accesibilidad | Contraste suficiente, navegación por teclado en formularios principales, etiquetas en campos. |
| Idioma | Todo en español de Colombia: interfaz, datos, mensajes de error, reportes. |
| Robustez | Ningún error en consola durante el uso normal. Validación de formularios con mensajes claros. Confirmación antes de eliminar. |
| Enlaces profundos | Cada módulo y cada detalle tiene su propia ruta, para poder enviar enlaces directos (por ejemplo, a una importación). Configurar el sitio estático para que las rutas funcionen al recargar. |
| Reutilización | Marca, locales, catálogo, parámetros y textos de negocio en archivos de configuración y semilla, separados del código de la interfaz. |

---

## 12. Stack técnico recomendado

No hay preferencia del cliente. Se recomienda, y Claude Code puede ajustar con justificación:

- **Vite + React + TypeScript** (aplicación de una sola página, salida estática).
- **Tailwind CSS** con un sistema de diseño propio (tokens de color, tipografía y espaciado) y componentes accesibles (por ejemplo, Radix o shadcn/ui), personalizados para la estética de la sección 5.
- **React Router** para rutas, incluidas `/app`, `/tienda` y `/seguimiento/:id`.
- **Zustand** (o similar) con persistencia en almacenamiento local para el estado de datos.
- **TanStack Table** para tablas y la tabla dinámica; **Recharts** o **ECharts** para gráficos.
- **jsPDF + jspdf-autotable** (o similar) para PDF; **ExcelJS** (o similar) para .xlsx.
- **JsBarcode** para códigos de barras y una librería de QR para facturas y el acceso a la app.
- **date-fns** con configuración regional `es`.
- **vite-plugin-pwa** (o manifiesto propio) para la app móvil instalable.
- **Vitest** para pruebas de cálculos y **Playwright** para pruebas de extremo a extremo y capturas.

---

## 13. Fuera de alcance

- Backend, base de datos, autenticación real y multiusuario real.
- Envío real de correos, WhatsApp o mensajes de Instagram (se simula; los enlaces `wa.me` y `mailto:` abren la aplicación del usuario sin enviar nada automáticamente).
- Conexión real con la DIAN, con pasarelas de pago o con bancos.
- Tasas de cambio en vivo.
- Cálculos tributarios o laborales con validez legal (son ilustrativos y parametrizables).
- Integración con lectores de código de barras físicos (se simula con el campo de texto, que en la práctica funciona igual con un lector USB).

---

## 14. Criterios de aceptación

La demo está terminada cuando se cumple todo lo siguiente:

**Funcionales**
- [ ] Los 16 módulos de escritorio existen, tienen datos y responden a crear, editar y eliminar donde aplica.
- [ ] Una venta registrada en el POS se refleja de inmediato en inventario (local correcto), ventas, inicio, ficha del cliente, comisión del vendedor, caja y análisis.
- [ ] Un traslado entre locales mueve las existencias correctamente al recibirse.
- [ ] Cambiar el estado de una importación genera la notificación simulada, los enlaces de WhatsApp y correo funcionan, y el evento de llegada se actualiza en el calendario.
- [ ] El portal `/seguimiento/:id` permite "actualizar" el estado y genera una alerta en el inicio del dueño.
- [ ] El costo aterrizado de una importación calcula el costo por prenda y actualiza los márgenes del inventario.
- [ ] La nómina calcula ambas modalidades y muestra el costo total para el empleador; la exoneración del art. 114-1 cambia los aportes.
- [ ] Los turnos validan la jornada máxima y la marcación de asistencia alimenta la liquidación.
- [ ] La tabla dinámica permite combinar al menos 10 dimensiones y 5 medidas, con totales, gráfico y exportación a Excel.
- [ ] Todos los reportes de 7.15 se descargan en PDF y Excel y se abren sin errores.
- [ ] El selector de moneda convierte todas las cifras visibles; editar la tasa cambia los valores.
- [ ] El selector de local filtra todo el sistema.
- [ ] El cambio de rol modifica la navegación y los permisos en vivo.
- [ ] La app móvil en `/app` es una experiencia distinta, navegable, instalable, con datos coherentes con el escritorio.
- [ ] Las vistas de WhatsApp, Instagram y tienda web funcionan, y una compra en `/tienda` aparece en el sistema.
- [ ] Restaurar datos devuelve todo al estado inicial.

**Calidad**
- [ ] Cero errores en consola, cero enlaces o botones sin acción, cero textos de relleno ("lorem ipsum", "TODO", "Próximamente").
- [ ] Coherencia numérica verificada por pruebas automáticas (sumas, inventario, comisiones, nómina).
- [ ] Revisión visual de todas las pantallas en escritorio (1440 px y 1280 px) y móvil (390 px) sin desbordes, solapamientos ni elementos cortados.
- [ ] Ningún elemento de la marca Hugo Boss ni de otra marca real.
- [ ] Todo el texto en español de Colombia, con formatos de moneda, número y fecha colombianos.
- [ ] Desplegable en Vercel con un comando, con las rutas funcionando al recargar.

---

## 15. Supuestos y decisiones tomadas

1. **Marca:** se usa la marca ficticia HALDEN con una estética inspirada en el lujo masculino europeo; no se reproduce ningún elemento de Hugo Boss.
2. **Persistencia por navegador:** como la demo es estática, lo que el cliente registre se guarda solo en su navegador; KippiCore no verá esos cambios y otro dispositivo partirá de los datos iniciales.
3. **Notificaciones y mensajería simuladas:** se muestran en una bandeja de salida simulada, con enlaces reales `wa.me` y `mailto:` como prueba de concepto.
4. **Facturación electrónica simulada:** con marca de agua de demostración y sin validez fiscal.
5. **Tasas de cambio manuales:** editables por el usuario, con valores de ejemplo identificados como tales.
6. **Parámetros de nómina 2026:** SMMLV y auxilio de transporte verificados; recargos de la reforma laboral marcados para verificación antes de usarlos fuera de la demo.
7. **Fecha de la demo dinámica:** los datos se generan relativos a la fecha en que se abre.
8. **Forma de entrega:** el cliente recibe el enlace del despliegue en Vercel, no el repositorio.
