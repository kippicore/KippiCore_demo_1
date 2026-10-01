# Registro de decisiones

Cada línea: fecha · decisión · justificación.

- 30/09/2026 · Estética basada en el lenguaje visual de hugoboss.com/us (pedido explícito de Miguel), sin nombre, logotipo, tipografía propietaria ni fotos de esa marca · Cumple a la vez la instrucción de Miguel y la sección 5.2 del PRD. Detalle en `docs/REFERENCIA_VISUAL.md`.
- 30/09/2026 · Tipografía Figtree (Google Fonts) como equivalente libre de una sans geométrica tipo Averta · Más cercana al tono de la referencia que Inter/Manrope; pesos 300–900.
- 30/09/2026 · Repositorio `kippicore/KippiCore_demo_1`, clonado en `~/Desktop/KippiCore/KippiCore_demo_1` · Indicado por Miguel.
- 30/09/2026 · Dueño con nombre ficticio configurable · Elección de Miguel; evita incomodidades si el link se reenvía.
- 30/09/2026 · Despliegue en Vercel lo hace Claude al final del QA, avisando antes de publicar · Elección de Miguel.
- 30/09/2026 · Agentes de `.claude/agents/` invocados como subagentes generales con el modelo explícito (opus/sonnet) y la definición como instrucción · El entorno carga las definiciones de agentes al iniciar la sesión; pasar el modelo explícito cumple la regla del prompt.
- 30/09/2026 · Persistencia = base determinista regenerada en cada carga + registro de comandos del usuario con marca de agua en `localStorage`; ancla de fecha al primer cambio · Pesa KB, sobrevive a nuevas versiones del generador, "Restaurar" es borrar el registro y el día siguiente la demo sigue viva sin mover lo que el usuario vio.
- 30/09/2026 · Un solo camino de escritura: el generador emite los mismos comandos de dominio que la interfaz · Coherencia numérica por construcción.
- 30/09/2026 · Generador por intenciones (plan sin estado + materialización con PRNG propio por intención) · Determinismo sin efecto mariposa y "pulso en vivo" de la app sin reconstruir.
- 30/09/2026 · Construcción en Web Worker con respaldo por tramos en el hilo principal · La interfaz no se congela.
- 30/09/2026 · Escritorio bajo `/panel` (Inicio en `/panel/inicio`) y claves legibles en URL (referencia, número de importación, slug) · Separación limpia de superficies y enlaces profundos comprensibles; reemplaza `/inicio` de la estrategia.
- 30/09/2026 · Dinero en COP enteros y origen extranjero en centavos con tasa; conversión de moneda solo para mostrar con la tasa vigente; cifras de origen visibles junto a la convertida · Cero errores de redondeo; editar la tasa cambia todo lo visible.
- 30/09/2026 · Costo de producto = último costo aterrizado aplicado (`costoVigente`), con instantánea en cada línea de venta · Coincide con el PRD ("heredado de la importación") y con W4 ("Aplicar al inventario").
- 30/09/2026 · "Venta reconocida": toda venta no anulada ni separado cancelado, en su fecha y con IVA; separados cuentan al crearse; devoluciones restan en su fecha · Una sola definición para todo el sistema.
- 30/09/2026 · Comisión configurable sobre total con IVA o base sin IVA; la semilla usa total con IVA · Coincide con el ejemplo de W1 ("3 % de lo que vendes").
- 30/09/2026 · ≈ 14 importaciones en 18 meses (≈ 10 recibidas + 4 en curso) en vez de 8–10 · Cinco fábricas con reposición real; coherente con la numeración `IMP-2026-10` de la estrategia.
- 30/09/2026 · EAN-13 con prefijo GS1 20–29 (circulación interna) · Válidos y sin riesgo de coincidir con productos reales.
- 30/09/2026 · Enlaces `wa.me` y `mailto:` sin destinatario para personas ficticias · Nunca escribirle por error a un número o correo real.
- 30/09/2026 · PDF con Figtree estática embebida · Tildes y símbolos correctos con la tipografía de la marca.
- 30/09/2026 · Añadidos al stack: immer, @tanstack/react-virtual, @dnd-kit, cmdk, react-day-picker, lucide-react, @fontsource-variable/figtree, clsx, @vite-pwa/assets-generator · Necesidades concretas de rendimiento, diseño y PWA.
- 30/09/2026 · Fase 2 en tres sesiones Opus consecutivas (F2-A dominio y generador, F2-B estado/selectores/lib/rutas, F2-C sistema de diseño y layouts) · Tamaño; sin paralelismo.
- 30/09/2026 · Nombres ficticios para EPS, fondos, ARL, cajas y bancos · Evitar marcas reales en los datos.
- Descartado · Estado completo en IndexedDB · Pesado, frágil ante cambios del generador y necesita el mismo motor para el día siguiente.
- Descartado · Pasar el registro del computador al celular dentro del QR · QR demasiado denso y poco fiable desde una pantalla; se cubre con la vista previa enmarcada y el aviso.
- 30/09/2026 · Elenco: dueño Juan Camilo Ospina; vendedor Sebastián Cárdenas (Usaquén); bodega Wilson Díaz (Puente Aranda) · Propuesta del estratega; nombres ficticios configurables.
- 30/09/2026 · Títulos en MAYÚSCULAS peso 900 con tracking normal (como la referencia); tracking amplio solo para wordmark y sobretítulos · La referencia pedida por Miguel prevalece sobre la sugerencia de 'tracking amplio' del PRD 5.2.
