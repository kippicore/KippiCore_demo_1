# PLAN — Parte 2: Arquitectura, modelo de datos, generador, paquetes y riesgos (secciones 5, 6, 7, 9 y 10)

> Autor: agente `arquitecto` (Opus). Fuente de verdad: `docs/PRD.md`. Se integra como secciones 5, 6, 7, 9 y 10 de `docs/PLAN.md`.
> Lee también: `docs/plan/01_estrategia.md` (secciones 1–4: elenco, narrativa, alertas, "Prueba esto", patrones P1–P20) y `docs/plan/03_diseno.md` (sección 8: sistema de diseño). Este documento respeta sus nombres, rutas lógicas y patrones; donde fija algo distinto, lo dice.
> Todo lo que aquí se llama "regla" es obligatorio para los constructores. Lo que se llama "recomendación" es criterio del integrador.

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

## Decisiones para registrar en `docs/DECISIONES.md`

(El líder las copia al consolidar `PLAN.md`; el arquitecto no edita `DECISIONES.md` en paralelo con otros agentes para no pisar escrituras.)

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
