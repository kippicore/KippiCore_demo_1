# Prompt para Claude Code — Construcción de la demo KippiCore CRM (HALDEN)

> **Instrucciones de uso para Miguel:** crea el repositorio vacío, copia el archivo `PRD_KippiCore_CRM_Demo_Retail_Moda.md` dentro de una carpeta `docs/` con el nombre `docs/PRD.md`, abre Claude Code en la raíz del repositorio y pega todo lo que está debajo de la línea.

---

## Rol

Eres el líder técnico y director de producto de un equipo de agentes que va a construir, de principio a fin, una demo comercial de altísima calidad para KippiCore, un estudio colombiano de software a la medida. Piensas como un estratega de producto antes de pensar como programador: cada decisión técnica debe servir al propósito de la demo, que es **vender**.

## Contexto

KippiCore le va a enviar a un potencial cliente —dueño de un negocio de moda masculina con tres locales en Bogotá que importa directamente desde China y hoy lleva todo en Excel y cuaderno— un link a una demo de **KippiCore CRM**: un sistema que integra inventario, punto de venta, importaciones, proveedores, pagos, costos y gastos, nómina con asistencia y turnos, clientes, calendario, análisis, facturación simulada y una vitrina de canales digitales (WhatsApp, Instagram y tienda web). La marca del cliente en la demo es ficticia: **HALDEN**.

El cliente explorará la demo **solo, sin nadie que se la explique**. Si algo está vacío, roto, en inglés o feo, la venta se pierde. La reacción que buscamos es: "esto es exactamente lo que necesito y se ve increíble".

**La especificación completa está en `docs/PRD.md`. Léela entera antes de hacer cualquier otra cosa. Es la fuente de verdad.** Si este prompt y el PRD dicen algo distinto, manda el PRD, salvo en lo referente a la forma de trabajar, donde manda este prompt.

## Modo de trabajo: autonomía total

- **No te detengas a pedir permiso ni aprobación en ningún momento.** Planea, decide, construye, prueba, corrige y entrega.
- Cuando algo sea ambiguo, toma la decisión que mejor sirva al propósito comercial de la demo, regístrala en `docs/DECISIONES.md` con una línea de justificación y sigue.
- Solo te detienes si una acción requiere credenciales que no tienes (por ejemplo, autenticarte en Vercel o en GitHub para publicar). En ese caso dejas todo listo, documentas el paso exacto que falta y terminas el resto del trabajo.
- No reduzcas el alcance para terminar antes. Si algo es difícil, encuentra la forma de que funcione o de simularlo de manera creíble, según el principio "nada muerto" del PRD.

## Equipo y asignación de modelos

Trabajarás con subagentes. La regla de asignación es:

| Trabajo | Modelo | Por qué |
|---|---|---|
| Plan estratégico, arquitectura, modelo de datos, sistema de diseño | **Opus 5.5** | Decisiones que condicionan todo lo demás |
| Construcción de módulos (paquetes de trabajo) | **Sonnet 5.5** | Ejecución rápida y en paralelo sobre contratos ya definidos |
| Integración entre módulos | **Opus 5.5** | Requiere visión de todo el sistema |
| Revisión crítica, QA de diseño, auditoría de datos, agente "cliente" | **Opus 5.5** | Juicio y exigencia |
| Corrección de defectos puntuales encontrados en QA | **Sonnet 5.5** | Tareas acotadas |

Al empezar, crea las definiciones de agentes en `.claude/agents/` con su `model` en el frontmatter (`opus` o `sonnet`), una descripción clara y las herramientas que necesitan. Como mínimo:

- `estratega` (opus): plan de producto y narrativa de la demo.
- `arquitecto` (opus): arquitectura, contratos, modelo de datos, generador de datos.
- `disenador` (opus): sistema de diseño y revisión visual.
- `constructor` (sonnet): implementa un paquete de trabajo con un dueño claro de archivos.
- `integrador` (opus): conecta flujos entre módulos.
- `auditor-datos` (opus): verifica coherencia numérica.
- `qa-visual` (opus): revisa capturas de todas las pantallas.
- `cliente-esceptico` (opus): explora la demo como el dueño del negocio y la critica.

Si tu entorno no reconoce el campo de modelo en las definiciones, pásalo explícitamente al invocar cada subagente.

---

## Fase 1 — Plan estratégico (Opus 5.5)

Antes de escribir una sola línea de código de la aplicación, produce `docs/PLAN.md`. Piensa con calma y en profundidad. El plan debe responder:

1. **Propósito y audiencia.** Quién es el cliente, qué le duele, qué tiene que sentir al usar la demo y qué debe querer hacer después. Resume en tres frases el "por qué" de esta demo.
2. **Narrativa de la demo.** El recorrido ideal que haría el cliente en sus primeros 10 minutos si nadie lo guía: qué ve primero, qué lo engancha, qué prueba después. Diseña la pantalla de entrada, el inicio y la lista "Prueba esto" para provocar ese recorrido.
3. **Momentos "wow".** Identifica entre 6 y 10 momentos concretos que deben producir asombro (por ejemplo: registrar una venta y ver moverse cinco módulos a la vez; cambiar a dólares y ver todo convertirse; ver la conversación de WhatsApp consultando el inventario real; abrir la app en el celular con un QR). Para cada uno, define qué lo hace memorable y qué detalle de ejecución no se puede descuidar.
4. **Prioridad.** Clasifica cada funcionalidad del PRD en: imprescindible para la venta, muy importante, complemento. Todo se construye, pero la profundidad y el pulido se reparten según esta clasificación. Los módulos que el cliente marcó como más importantes son **inventario, pagos, nómina y proveedores (con importaciones), todos divididos por punto de venta**.
5. **Arquitectura.** Estructura de carpetas, rutas, capas (datos, dominio, estado, interfaz), cómo se separan configuración de marca y datos semilla del código (requisito de plantilla reutilizable), cómo se resuelve la persistencia local con modo memoria de respaldo.
6. **Modelo de datos.** Todas las entidades con sus campos y relaciones (tipos de TypeScript). Las reglas de dominio que mantienen la coherencia: el inventario se deriva de movimientos, las ventas generan movimientos, las comisiones se derivan de ventas, etc. Define el **bus de eventos o las acciones de dominio** que hacen que una venta actualice todo lo conectado.
7. **Generador de datos.** Estrategia determinista con semilla, relativa a la fecha actual, con la estacionalidad y los patrones descubribles del PRD. Debe generar historia coherente (las existencias actuales cuadran con entradas menos salidas).
8. **Sistema de diseño.** Tokens, tipografía, componentes base, patrones de tabla, formularios, estados vacíos, modales, notificaciones, gráficos. Estética de lujo masculino minimalista, en blanco y negro, **sin ningún elemento de Hugo Boss ni de otra marca real**.
9. **Plan de trabajo por paquetes.** Divide la construcción en paquetes con dueño exclusivo de archivos, dependencias explícitas y criterios de aceptación tomados del PRD. Organízalos en oleadas paralelas.
10. **Riesgos y mitigaciones.** Qué puede salir mal (rendimiento con 18 meses de datos, PDF con tildes, rutas al recargar en sitio estático, conflictos entre agentes, inconsistencias numéricas) y cómo lo evitas.

**Revisión crítica del plan:** cuando termines el borrador, lanza al agente `cliente-esceptico` y a un segundo revisor Opus independiente para que lo critiquen sin piedad desde dos ángulos: "¿esto le venderá al cliente?" y "¿esto es técnicamente sólido y construible sin contradicciones?". Incorpora lo que mejore el plan y deja registro de lo que descartaste y por qué. No pidas aprobación: sigue a la fase 2.

## Fase 2 — Fundaciones (Opus 5.5, secuencial)

Esta fase la hace un solo agente para que no haya conflictos. Nada se paraleliza hasta que esté terminada.

1. Inicializa el proyecto con el stack del PRD (o el que justificaste en el plan), linters, formateo, TypeScript estricto, Vitest y Playwright.
2. Implementa el **sistema de diseño** completo: tokens, tipografía, layout de escritorio (barra lateral, barra superior con selectores de local, moneda y rol), layout de la app móvil (pestañas inferiores) y la biblioteca de componentes base.
3. Implementa los **tipos del dominio**, el **almacén de estado** con persistencia, las **acciones de dominio** (registrar venta, mover inventario, cambiar estado de importación, liquidar nómina, etc.) y las utilidades compartidas: formato de moneda, número y fecha colombianos; conversión de moneda con historial de tasas; generación de EAN-13 válidos; exportación a PDF y Excel con encabezado de marca.
4. Implementa el **generador de datos** completo y una prueba automática que verifique su coherencia.
5. Deja el enrutamiento con todas las rutas registradas y una página base para cada módulo.
6. Escribe `docs/CONTRATOS.md`: cómo debe un constructor consumir el estado, las acciones, los componentes y las utilidades, qué archivos puede tocar y cuáles no. Este documento es lo que leerán los subagentes Sonnet.

Al terminar, la aplicación compila, se ve el esqueleto con el diseño final, y los datos existen y cuadran.

## Fase 3 — Construcción en paralelo (subagentes Sonnet 5.5)

Lanza los paquetes de trabajo en oleadas. Cada constructor recibe un brief con esta estructura:

```
PAQUETE: <nombre>
OBJETIVO: <qué debe lograr para el cliente, en una frase>
LEE PRIMERO: docs/PRD.md (sección X), docs/PLAN.md (sección Y), docs/CONTRATOS.md
ARCHIVOS QUE TE PERTENECEN: <rutas exactas>
NO TOQUES: <rutas compartidas; si necesitas un cambio en ellas, descríbelo en tu informe final>
CRITERIOS DE ACEPTACIÓN: <lista copiada del PRD>
MOMENTOS WOW DE ESTE PAQUETE: <del plan>
DEFINICIÓN DE TERMINADO: compila sin errores, sin errores en consola, crear/editar/eliminar funcionan, estados vacíos y de error diseñados, todo en español, pruebas de los cálculos del paquete escritas y pasando.
INFORME FINAL: qué hiciste, qué quedó pendiente, qué cambios necesitas en archivos compartidos.
```

Paquetes sugeridos (ajústalos según el plan):

- **Oleada A (núcleo operativo):** Punto de venta y caja · Inventario (catálogo, variantes, movimientos, traslados, conteo, etiquetas) · Ventas · Clientes.
- **Oleada B (gestión):** Importaciones y portal de seguimiento · Proveedores · Pagos y flujo de caja · Costos, gastos y estado de resultados.
- **Oleada C (personas y tiempo):** Personal, nómina en dos modalidades, comisiones · Turnos y asistencia · Calendario.
- **Oleada D (inteligencia y vitrina):** Inicio · Análisis y tabla dinámica · Facturación simulada · Reportes · Canales digitales (WhatsApp, Instagram) · Tienda web `/tienda`.
- **Oleada E (móvil y experiencia):** App móvil del dueño `/app` (experiencia distinta, no una versión encogida del escritorio) · Bienvenida, lista "Prueba esto" y pistas · Configuración y restaurar datos.

Las oleadas pueden solaparse cuando no haya dependencias. Entre oleadas, el agente líder (tú) revisa los informes, aplica los cambios a archivos compartidos y actualiza `docs/CONTRATOS.md`.

## Fase 4 — Integración (Opus 5.5)

El agente `integrador` recorre y hace funcionar de punta a punta los flujos que cruzan módulos:

1. Venta en POS → inventario del local → ventas → inicio → ficha del cliente → comisión → caja → análisis → app móvil.
2. Venta en `/tienda` → aparece con canal "Web" en el sistema.
3. Cambio de estado de importación → notificación simulada → enlaces `wa.me`/`mailto:` → calendario → al recibirse, entrada de inventario con costo aterrizado → márgenes actualizados.
4. Actualización desde `/seguimiento/:id` → alerta en el inicio del dueño.
5. Marcación de asistencia → reporte de asistencia → liquidación de nómina → pagos por pagar → flujo de caja.
6. Cambio de moneda y de tasa → todas las cifras del sistema.
7. Selector de local y cambio de rol → todo el sistema.
8. Restaurar datos → estado inicial exacto.

## Fase 5 — Control de calidad exhaustivo (Opus 5.5 revisa, Sonnet 5.5 corrige)

El cliente debe ver una demo sofisticada. El control de calidad es relativamente exhaustivo y se repite en ciclos hasta que no queden defectos relevantes.

1. **Calidad técnica:** compilación de producción, verificación de tipos y linter sin errores ni advertencias relevantes.
2. **Pruebas de cálculo (Vitest):** nómina en ambas modalidades con y sin exoneración, costo aterrizado y prorrateo, conversión de moneda con historial, comisiones, estado de resultados, EAN-13, coherencia del inventario, totales de la tabla dinámica.
3. **Pruebas de extremo a extremo (Playwright):** los ocho flujos de la fase 4, en escritorio (1440 × 900) y en móvil (390 × 844), más la descarga de al menos tres reportes en PDF y Excel verificando que los archivos se generan y abren.
4. **Auditoría de datos (`auditor-datos`):** toma 20 cifras visibles al azar en distintos módulos y verifica que cuadran entre sí y con los datos de origen. Cualquier descuadre es un defecto crítico.
5. **QA visual (`qa-visual`):** genera capturas de **todas** las pantallas y estados principales (incluidos modales, estados vacíos, errores de validación y la app móvil) y revísalas una por una buscando: desbordes, textos cortados, alineaciones, inconsistencias tipográficas, contrastes, elementos que se vean genéricos o de plantilla, cualquier texto en inglés, cualquier rastro de marca real. Compara contra la dirección estética del PRD.
6. **Recorrido del cliente (`cliente-esceptico`):** adopta la persona del dueño del negocio (comerciante colombiano, práctico, poco paciente con la tecnología, acostumbrado a Excel). Explora la demo sin leer el código, siguiendo solo lo que ve en pantalla, durante el equivalente a 15 minutos de uso. Reporta: dónde se perdió, qué no entendió, qué le pareció inútil, qué le pareció increíble, y qué le haría decir "no" a la compra. Esta revisión pesa tanto como las pruebas automáticas.
7. **Corrección:** consolida los hallazgos en `docs/QA.md` clasificados por severidad (crítico, alto, medio, bajo). Reparte las correcciones a constructores Sonnet con briefs acotados. Repite los pasos 1 a 6 sobre lo corregido.

**Criterio de salida:** cero defectos críticos y altos, todos los criterios de aceptación del PRD (sección 14) marcados, y una última pasada del `cliente-esceptico` cuyo veredicto sea que la demo está lista para enviarse.

## Fase 6 — Preparación para entrega

1. Configuración para despliegue estático en Vercel con las rutas funcionando al recargar (reescrituras a `index.html`).
2. Si tienes acceso autenticado a Vercel, despliega y verifica la URL pública con Playwright (escritorio y móvil). Si no, deja el proyecto listo y documenta los dos comandos exactos para hacerlo.
3. `README.md`: qué es la demo, cómo correrla localmente, cómo desplegarla, y **cómo adaptarla a otro cliente** (qué archivos de configuración y semilla cambiar). Esta demo es una plantilla reutilizable de KippiCore.
4. `docs/GUIA_DEMO.md`, para Miguel (no para el cliente): un guion breve de lo que conviene que el cliente vea, los momentos wow y dónde están, respuestas a preguntas probables ("¿esto ya funciona con mis datos?", "¿puedo facturar de verdad?", "¿funciona en el celular?") y qué partes son simuladas.
5. Mensaje corto sugerido para que Miguel envíe el link al cliente por WhatsApp.

## Reglas permanentes

- Todo en español de Colombia: interfaz, datos, mensajes, reportes, comentarios de cara al usuario. Pesos colombianos y formatos colombianos por defecto.
- Sin backend, sin servicios pagos, sin llamadas a APIs externas en tiempo de ejecución (salvo fuentes tipográficas).
- Sin imágenes de terceros. Ilustraciones propias en SVG según el PRD.
- Ningún elemento de Hugo Boss ni de otra marca real: ni nombre, ni logotipo, ni tipografía propietaria, ni eslóganes.
- Nada de "lorem ipsum", "TODO", "Próximamente" ni botones sin acción visibles en la interfaz.
- Las cifras laborales y tributarias son ilustrativas y parametrizables, con la nota del PRD; no las presentes como asesoría legal.
- Haz commits frecuentes y descriptivos por paquete y por fase, para que el historial cuente cómo se construyó.
- Mantén actualizados `docs/PLAN.md`, `docs/DECISIONES.md`, `docs/CONTRATOS.md` y `docs/QA.md`.

## Entrega final

Cuando termines, responde con un informe breve:

1. URL del despliegue (o los comandos exactos para desplegar).
2. Estado de los criterios de aceptación del PRD.
3. Los momentos wow y la ruta exacta de cada uno.
4. Lo que es simulado y lo que funciona de verdad.
5. Defectos medios y bajos conocidos que quedaron, si los hay.
6. Las decisiones más importantes que tomaste sin consultar.

Empieza ahora por la fase 1.
