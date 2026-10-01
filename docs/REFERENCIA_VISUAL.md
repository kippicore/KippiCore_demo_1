# Referencia visual — lenguaje de hugoboss.com/us (observado el 30/09/2026)

Miguel pidió que la estética siga la del sitio oficial de Hugo Boss en EE. UU. El PRD prohíbe copiar marca: tomamos **el lenguaje visual** (proporciones, jerarquía, ritmo, paleta, comportamiento de componentes), **nunca** nombre, logotipo, wordmark, tipografía propietaria (AvertaPE), eslóganes ni fotografías.

## Medidas extraídas del sitio (computed styles)

| Elemento | Observado |
|---|---|
| Fondo de página | `#F9F9F9` (no blanco puro); tarjetas/superficies `#FFFFFF`; fondos de producto gris muy claro `#EDEDED`–`#F2F2F2` |
| Texto | negro puro `#000`; secundarios `#333`, `#595959`, `#666`, `#999` |
| Líneas | `#CCC`, `#DDD`, `#E4E4E4`, 1 px |
| Tipografía | Una sola familia sans geométrica (AvertaPE, propietaria). Cuerpo 16 px peso 400; enlaces de navegación 14 px peso 700 |
| Títulos | MAYÚSCULAS, **peso 800–900**, tracking normal (no espaciado amplio). H1 de listado 32/32 px peso 900; titulares de campaña 54/71 px peso 800 |
| Nombre de producto | 14 px peso 700, minúscula/sentence case; precio 16 px peso 400 debajo |
| Botón primario | Bloque negro rectangular, radio 0, texto blanco MAYÚSCULAS 16 px peso 700, padding 15×30 px, ancho completo en ficha de producto; deshabilitado gris `#CCC` |
| Barra superior | Flotante, separada de los bordes, fondo `rgba(237,237,237,0.8)` con `backdrop-filter: blur(9px)`, radio 8 px, alto 64 px. Wordmark a la izquierda, navegación central en negrita 14 px, íconos lineales a la derecha |
| Controles de filtro | Grupo tipo píldora negra (radio ~6–8 px) con botones internos; "Filter" en blanco sobre negro |
| Pestañas | Texto pequeño; activa subrayada en negro |
| Migas de pan | 12–13 px separadas por " \| " |
| Grilla de producto | 4 columnas, gutter estrecho (~8 px), imagen alta 3:4 sobre fondo gris claro, ícono de favorito lineal arriba a la derecha, círculos de color debajo del precio |
| Ficha de producto | Galería grande a la izquierda (2 imágenes), columna derecha estrecha: migas, título MAYÚSCULAS 900, precio, color con muestras circulares, selector de talla en caja con borde 1 px, CTA negro ancho completo, acordeones ("Details") con título 18 px peso 700 y chevron |
| Esquinas | 0 en botones, campos y tarjetas; únicas excepciones: barra superior flotante y grupo de filtros (6–8 px) |
| Sombras | Prácticamente ninguna; la jerarquía la dan contraste, espacio y líneas |
| Movimiento | Sobrio: fundidos, desplazamientos cortos; video/imagen a sangre en portada con titular blanco centrado y enlaces subrayados |

## Traducción a HALDEN (decisiones)

- **Tipografía libre equivalente:** `Figtree` (sans geométrica, pesos 300–900) para todo; números tabulares con `font-variant-numeric: tabular-nums`. Alternativa si se ve mejor: `Plus Jakarta Sans`. Wordmark HALDEN en la misma familia, peso 900, MAYÚSCULAS, tracking ligeramente amplio (0.18em) para diferenciarlo de cualquier wordmark real.
- **Paleta:** negro `#000`, fondo `#F9F9F9`, superficie `#FFF`, gris producto `#EFEFEF`, líneas `#DDD`, texto secundario `#666`. Acento único muy discreto: camel `#A67C52` (solo en estados, puntos de pista y detalles de marca). Semánticos desaturados: éxito `#2F6B4F`, alerta `#9A6B12`, error `#A3302A`.
- **Modo oscuro (app móvil):** negro profundo `#0A0A0A`, superficies `#141414`, líneas `#262626`.
- **Gráficos:** escala de grises + negro; el acento camel solo para resaltar una serie.
- **Prendas:** ilustraciones SVG propias sobre fondo `#EFEFEF` en proporción 3:4, como las fotos de producto del sitio de referencia.
