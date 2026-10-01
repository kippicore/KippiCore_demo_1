# Decisiones del líder sobre la revisión crítica del plan (01/10/2026)

Fuentes: `critica_cliente.md` (C1–C20) y `critica_tecnica.md` (T1–T25). Cada ítem: ACEPTADO, PARCIAL (con lo que entra) o DESCARTADO (con el porqué).

## Crítica del cliente escéptico

- **C1 Notificaciones de importación al revés** — ACEPTADO. Cada estado notifica a quien debe actuar (fábrica al pagar saldo; transportador y bodega cuando el agente reporta nacionalizado, etc.). Mensajes de negocio en "usted". Matriz estado → destinatarios en el plan.
- **C2 El cliente escribe su marca** — PARCIAL. En la entrada, un enlace secundario discreto "Personalizar con el nombre de mi negocio" (campo opcional, no bloquea). Si lo escribe, reemplaza el wordmark, la tienda, facturas y PDF (vía config de marca en `sesion`/registro). Línea pequeña "HALDEN es una marca de ejemplo" en la entrada y en Configuración. El saludo del inicio no depende del nombre ficticio del dueño ("Buenos días" + nombre solo si el usuario lo escribió; si no, sin nombre). Configuración › Empresa sube a imprescindible.
- **C3 Cierre de caja de los tres locales en el celular** — ACEPTADO como nuevo wow W11. Arqueo ciego, faltante sembrado, descuentos que requieren aprobación del dueño y anulaciones solo por el dueño; visible en `/app` ("Para aprobar" + "Cierres de hoy").
- **C4 Armar el próximo pedido a China** — ACEPTADO como nuevo wow W12. Desde Análisis (tallas y colores que rotan) e Importaciones: "Sugerir pedido" arma una importación en estado Cotizado con cantidades por talla × color según rotación y cobertura objetivo, costo en US$ y COP, y borrador en inglés para la fábrica (canal WeChat simulado, sin logos). Entra a "Prueba esto" en lugar de un ítem de menor peso, decidido por el estratega.
- **C5 Puente celular ↔ computador** — ACEPTADO con límite. El QR de "Ver app del dueño" lleva en el hash de la URL las últimas 1–3 acciones del usuario (comandos comprimidos; si no caben en un QR legible, solo la última venta). Chip "Datos de ejemplo de este celular" en `/app`. Se ELIMINA el "pulso en vivo" (también lo pide T10).
- **C6 Primer contacto desde WhatsApp** — ACEPTADO. Etiquetas Open Graph (og:title, og:description, og:image propia en SVG→PNG), detección del navegador interno de WhatsApp/Instagram con aviso discreto "Para la mejor experiencia, ábrelo en Safari/Chrome", y contenido útil en la entrada antes de que terminen de generarse los datos.
- **C7 Costo de empleado y comisiones** — ACEPTADO. Comisión sobre el precio sin IVA. Dos modos de costo (salario pactado / este mes con comisiones y recargos), igual que T14.
- **C8 Flujo de caja coherente** — ACEPTADO. El saldo a la fábrica se paga en "Listo para despacho". Se agregan prima (junio y diciembre), IVA bimestral, retención en la fuente mensual e ICA de Bogotá (bimestral), con valores ilustrativos. El punto bajo y su explicación los calcula un selector (T17).
- **C9 El momento del contador** — ACEPTADO. Reporte "Exportar para tu contador" (un .xlsx con hojas: ventas, compras/importaciones, gastos, nómina, IVA generado/descontable). Estado simulado "Nómina electrónica: transmitida (simulación)". "Recibo POS" se reemplaza por "Documento equivalente electrónico POS (simulado)". La coexistencia con su software de facturación va en `GUIA_DEMO.md`.
- **C10 Página "Cómo arrancaríamos"** — ACEPTADO. Página dentro del escritorio, accesible desde el menú de ayuda y la tarjeta de cierre: etapas con semanas aproximadas, "cargamos tus Excel nosotros", funciona en tablet, qué pasa si se cae el internet (descrito como capacidad de la implementación, sin prometer cifras). "Hablar con KippiCore" visible desde el ítem 3 de "Prueba esto". "Trae tu Excel" sube a muy importante.
- **C11 Detalles de importador real** — ACEPTADO con prudencia. Carga consolidada (LCL, m³) para la mayoría y un contenedor completo solo para el pedido grande de temporada; estados con "aforo" y "levante"; inspección de etiquetado; campo "Otros tributos aduaneros" para el arancel mixto; contactos chinos con nombre inglés (p. ej. "Lily Chen"); WeChat como canal simulado. Todo con la etiqueta "valores de ejemplo, se validan con tu agente de aduanas". Nada de normas citadas de memoria en pantalla.
- **C12 Precio sugerido para mantener el margen y una sola tasa de ejemplo** — ACEPTADO. Una sola tasa de ejemplo COP/USD en todo el plan y en `config` (el arquitecto la elige y la usa en todas partes); la COP/CNY coherente con ella.
- **C13 Escala del cliente** — PARCIAL. Se mantienen los volúmenes del PRD, pero ~60 % de las ventas son "consumidor final" sin cliente identificado, de modo que 350–500 clientes son verosímiles. Parámetro `escala` en config (0,5–1,5) que ajusta ventas diarias, sin cambiar la narrativa.
- **C14 Reforma laboral y contrato realidad** — PARCIAL. Alerta de riesgo cuando un contratista de prestación de servicios tiene turnos fijos y marcaciones ("posible contrato realidad"). El costo del cierre después de las 7 p. m. y del domingo se muestra en Turnos como recargo estimado con parámetros editables marcados "verificar". La liquidación final de un empleado queda como complemento si sobra tiempo en la oleada C.
- **C15 Inicio más ligero y QA en 1366** — PARCIAL. Se mantienen los KPI del PRD 7.1. Se agrega 1366 × 657 a las resoluciones de QA visual.
- **C16 Medios de pago y conciliación de datáfono** — PARCIAL. Se agregan "Bono de regalo", "QR Bre-B" y "Crédito con financiera aliada" (genérico, sin marcas). Conciliación de datáfono "vendiste $X con tarjeta, te consignaron $Y" con comisión y retenciones ilustrativas: sube a muy importante.
- **C17 Legibilidad para un dueño de más de 45 años** — ACEPTADO. Cuerpo 15 px, nada por debajo de 12 px, etiquetas directas de local en gráficos (no depender solo de tres grises).
- **C18 El bot pasa a una persona y el tono** — ACEPTADO. "Te paso con Valentina", "usted" para VIP, y los textos `wa.me` prellenados incluyen al final "(mensaje de prueba desde la demo de KippiCore)".
- **C19 W7 baja de wow a utilidad** — ACEPTADO. Franja visible "Estás viendo todo en US$" y la moneda vuelve a COP en la siguiente visita. El ítem de "Prueba esto" de dólares no existe; queda en "Para ir más lejos".
- **C20 Inconsistencias** — ACEPTADO (ver T25).

## Crítica técnica

- **T1 Un árbol, muchos constructores** — ACEPTADO. Cada constructor Sonnet trabaja en su propio git worktree (aislamiento del Agent tool) a partir del commit de la oleada; corre typecheck/lint/test sobre todo el proyecto pero solo debe dejar en verde lo suyo; su e2e con puerto propio (`PORT` por paquete). El líder fusiona al cierre de cada oleada y resuelve.
- **T2 Dueño de enlaces profundos, EventoUI y pistas** — ACEPTADO. F2-B crea `src/app/rutas.ts` con TODAS las rutas y sus parámetros de consulta tipados, el catálogo de `EventoUI` y de anclas de `<Pista>`; cada paquete recibe en sus criterios qué parámetros honrar, qué eventos emitir y qué pistas colocar.
- **T3 Marca de agua y pestañas** — ACEPTADO tal cual.
- **T4 Manejadores atómicos** — ACEPTADO (validar → planear → escribir, sin throw después de escribir; prueba antes/después).
- **T5 Divisor de la hora** — ACEPTADO: 210 horas con jornada de 42 h, editable.
- **T6 Partir F2-A** — ACEPTADO: F2-A1 (proyecto, config, seed, tipos, reglas, comandos, motor) y F2-A2 (generador + calibración). La calibración fina de P1–P20 puede seguir en paralelo con las oleadas A y B en una pista Opus que solo toca `src/generador/**` y `src/seed/**`.
- **T7 Ancla y narrativa** — ACEPTADO con simplificación: ancla en la primera visita; sin registro, renovación automática del ancla cuando pasan 7 días; la narrativa (alertas, importaciones en curso, cumpleaños) se calcula con selectores relativos al ancla; `controlManual` expira.
- **T8 e2e cruzados** — ACEPTADO.
- **T9 Definiciones únicas de reportes** — ACEPTADO (`src/reportes/definiciones.ts` en F2-B).
- **T10 Marcos y pulso** — ACEPTADO: los marcos (`/app` en el teléfono de escritorio, `/tienda` en marco) adoptan el store de `window.parent` cuando son del mismo origen; sin pulso en vivo; sincronización entre pestañas con BroadcastChannel (portal `/seguimiento`).
- **T11 Guardas del generador** — ACEPTADO.
- **T12 PRNG con aritmética exacta** — ACEPTADO: sin `Math.log/cos/exp/pow` en el generador (tablas de estacionalidad y aproximaciones racionales); prueba de hash.
- **T13 Selectores estables** — ACEPTADO.
- **T14** — ACEPTADO (ver C7).
- **T15 Nómina en el flujo de caja** — ACEPTADO.
- **T16 Vendedora estrella** — ACEPTADO: tercer vendedor en Parque 93 o ajuste de objetivo; plantilla semanal de turnos para toda la ventana.
- **T17** — ACEPTADO.
- **T18 Excel con valores en caché** — ACEPTADO.
- **T19 Ilustraciones** — PARCIAL: el catálogo se limita a tipos de prenda con ilustración. Se agregan solo las que valgan la pena (tenis y billetera) o se quitan esas referencias; el arquitecto decide y lo deja coherente, con prueba que recorra el catálogo.
- **T20 Presupuesto móvil** — ACEPTADO (CPU×4 como criterio, perilla `escala`, índices, worker terminado tras construir).
- **T21 Método de costo** — ACEPTADO: nombrar el método ("costo de la última importación") en interfaz y reportes.
- **T22 Primer mes** — ACEPTADO.
- **T23 Estado de interfaz y `?hoy=`** — ACEPTADO.
- **T24 Separados y saldo a favor** — ACEPTADO.
- **T25 Contradicciones menores** — ACEPTADO: pasada de consolidación (entrada con DOS puertas principales + enlace secundario al vendedor dentro de la bienvenida; un solo menú "?"; sin "Atajos" si no hay pantalla; una sola tasa; rutas del vendedor fijadas; pivote ≥ 12 dimensiones y 5 medidas como mínimo; `configuracion/aduanas` y `tasa.editar` definidos; "Deshacer" solo donde exista modelo; sin tipos sin uso; contador de 900 ms en todo; nombres de producto en español).
