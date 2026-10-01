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
