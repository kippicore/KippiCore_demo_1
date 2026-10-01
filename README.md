# KippiCore CRM · Demo para HALDEN

Demo comercial de **KippiCore CRM** para un negocio de moda masculina con tres locales en Bogotá que importa desde China. La marca del cliente (**HALDEN**) es ficticia y configurable; KippiCore firma con discreción.

Es una SPA estática, sin backend: todos los datos (18 meses de historia, coherentes entre módulos) los genera el navegador de forma determinista y lo que la persona registra se guarda solo en su navegador. Sirve también como **plantilla** para otro cliente de retail (ver más abajo).

- Escritorio: `/` (entrada) → `/panel/inicio` (dueño, vendedor y bodega con selector de rol).
- App móvil del dueño, instalable (PWA): `/app`.
- Tienda web de ejemplo: `/tienda`. Portal de seguimiento para la agente de aduanas: `/seguimiento/:numero`.
- Guía para presentar la demo (uso interno): [`docs/GUIA_DEMO.md`](docs/GUIA_DEMO.md).

## Stack

React 19 · TypeScript 5.9 · Vite 8 · React Router 7 · Tailwind 4 · Zustand + Immer · Radix UI · Recharts · TanStack Table/Virtual · dnd-kit · jsPDF y ExcelJS (exportes reales) · qrcode y EAN-13 propios · vite-plugin-pwa (Workbox) · Vitest 5 y Playwright. Tipografía Figtree.

Requiere Node `>=22.12` (`.nvmrc` indica 24).

## Correrla localmente

```bash
npm install
npm run dev                      # desarrollo en http://localhost:5173
npm run build && npm run preview # build de producción (typecheck + vite build) servido en http://localhost:4173
```

Para ver la app del dueño o el QR desde el celular, usa `npm run preview -- --host` y abre la IP de la red local. Un parámetro útil de QA: `?hoy=2026-09-30T15:30` fija el reloj (el registro se guarda aparte, con claves `kc:halden:v1:qa:*`).

## Pruebas

```bash
npm run typecheck      # tsc (app y scripts)
npm run lint           # eslint
npm test               # vitest: dominio, generador, selectores, componentes (≈ 1.100 pruebas)
npm run test:tz        # la huella de determinismo debe salir igual en UTC, Asia/Tokyo y America/Los_Angeles
npm run test:e2e       # playwright (levanta build + preview solo; PORT=4400 para otro puerto)
npm run test:e2e:rendimiento
npm run informe        # informe de coherencia del generador (ver abajo)
```

- Playwright necesita sus navegadores: `npx playwright install` (Chromium, WebKit y Firefox; los dos últimos solo para la prueba `@hash`).
- `npm run informe` imprime los invariantes de dominio contra los hechos generados, la narrativa N1–N16 y los patrones P1–P22. Sale con código 1 si algo falla. Opciones: `--ancla AAAA-MM-DD`, `--hora HH:mm`, `--escala 1.5`.
- `npm run medir` (generador) y `npm run medir:arranque` (primer render con CPU ×4) miden rendimiento. El criterio es `/app` por debajo de 2,5 s.

## Desplegar en Vercel

La primera vez, desde la raíz del repo:

```bash
npx vercel@latest login
npx vercel@latest deploy --prod --yes
```

`vercel.json` ya trae lo necesario: build `npm run build`, salida `dist`, reescritura de rutas a `index.html` (recargar `/panel/ventas` o `/app` funciona), caché inmutable para `/assets`, `sw.js` sin caché y `X-Robots-Tag: noindex`. Con el repositorio conectado al proyecto de Vercel, cada push a `main` publica solo.

Después del primer despliegue:

1. **Imagen de la vista previa del enlace.** En `index.html`, `og:image` y `twitter:image` son rutas relativas (`/og/halden-og.png`), pero WhatsApp necesita una URL absoluta. Cámbialas por `https://<tu-dominio>/og/halden-og.png` y vuelve a desplegar.
2. Abre el enlace en un celular y en el computador, y revisa la tarjeta de vista previa pegándolo en un chat contigo mismo.

Antes de enviar el enlace al cliente: configura el WhatsApp de KippiCore y pon la tasa de ejemplo al día (siguientes secciones).

## Configuración que se toca antes de enviar el enlace

### WhatsApp de "Hablar con KippiCore"

En `src/config/marca.ts`:

```ts
hablarConKippicore: {
  whatsapp: '573001234567', // solo dígitos, con indicativo 57, sin + ni espacios
  texto: 'Hola, vi la demo de KippiCore CRM y quiero saber cómo sería con mis datos.',
},
```

Con `null` (valor actual), el botón abre WhatsApp sin destinatario (`https://wa.me/?text=…`) y la opción del menú "?" no aparece. Con el número, todos los botones (menú "?", "Prueba esto", "Cómo arrancaríamos", tarjeta de cierre, app) usan `wa.me/<número>`. No inventes un número: los mensajes que ve el cliente nunca llevan un destinatario real que no sea el tuyo.

### Tasa de ejemplo

En `src/config/monedas.ts`, `TASA_EJEMPLO.valores` (`USD: 3950`, `CNY: 548` hoy) y `fechaReferencia`. Pon la TRM del día. Es la única tasa de toda la demo y el historial generado de tasas termina en ese valor. El cliente la puede editar en Configuración › Monedas y tasas; todas las cifras convertidas se recalculan.

## Adaptarla a otro cliente

La separación es: `src/config/` y `src/seed/` son **lo que cambia por cliente**; `src/dominio`, `src/generador`, `src/estado`, `src/selectores`, `src/ui` y `src/modulos` son el producto y **no se tocan** salvo para agregar funcionalidad.

### Qué cambiar

| Qué | Dónde |
|---|---|
| Marca, razón social, NIT, colores, prefijos de referencia, EAN y documentos, WhatsApp de KippiCore | `src/config/marca.ts` |
| Locales (nombres, direcciones, horarios, arriendos, perfil de demanda y meta mensual) y la bodega | `src/config/locales.ts` y las cajas en `src/seed/cuentas.ts` |
| Semilla del generador, clave de almacenamiento, `versionGenerador`, `escala` (0,5 a 1,5: tamaño del negocio) | `src/config/demo.ts` |
| Tasa de ejemplo y monedas | `src/config/monedas.ts` |
| Parámetros de nómina (SMMLV, auxilio, recargos, aportes, provisiones, jornada) | `src/config/nomina.ts` |
| IVA, retenciones, resoluciones de facturación, comisiones del datáfono, parámetros de ventas e inventario | `src/config/negocio.ts` |
| Aranceles y costos de importación (valores de ejemplo) | `src/config/aduanas.ts` |
| Calendario de obligaciones (PILA, prima, IVA, ICA) | `src/config/obligaciones.ts` |
| Umbrales de segmentación de clientes | `src/config/segmentacion.ts` |
| Plantilla semanal de turnos y franjas | `src/config/turnos.ts` |
| Textos de la guía, mensajes, hallazgos, glosario y notas legales | `src/config/textos/` |
| Catálogo (referencias, líneas, precios, curvas de talla) y colores | `src/seed/catalogo.ts`, `src/seed/tallas.ts`, `src/seed/colores.ts` |
| Elenco: dueño, empleados, contratos, comisiones y clientes con guion | `src/seed/elenco.ts`, `src/seed/nombres.ts` |
| Fábricas, proveedores locales y contactos de la cadena (carga, aduanas, transporte) | `src/seed/proveedores.ts` |
| Importaciones en curso y su plan narrativo | `src/seed/importaciones.ts` |
| Cuentas, gastos recurrentes, calendario de campañas | `src/seed/cuentas.ts`, `src/seed/gastos.ts`, `src/seed/calendario.ts` |
| Estacionalidad (índice por mes, día y franja) y tendencia | `src/seed/estacionalidad.ts` |
| Escenarios guionados de WhatsApp e Instagram | `src/seed/escenarios-canales.ts` |
| Ícono, favicon, imagen de vista previa y manifiesto | `public/`, `index.html`, `vite.config.ts` (nombre del manifiesto), `npm run iconos` (necesita Python 3 con fontTools y `sharp`) |

Todos los nombres de personas, empresas, correos (dominio `.example`) y teléfonos son ficticios, y los enlaces `wa.me` y `mailto:` salen sin destinatario. Mantén esa regla con los datos nuevos.

Los parámetros laborales, tributarios y aduaneros de `config/` son **ilustrativos**: la interfaz no cita normas y los marca como "valor de ejemplo". Valídalos con el contador o el agente de aduanas del cliente antes de usarlos fuera de una demo.

### Qué regenerar y verificar

La historia no está guardada: se construye en el navegador a partir de la semilla, la configuración y la fecha. Si cambias `config/` o `seed/` cambia la historia, y hay que comprobarla:

1. `npm run informe` (y, si quieres, con `--ancla` en otras fechas y `--escala`): debe dar **0 FUERA, 0 invariantes rotos, 0 comandos omitidos** y la narrativa en verde.
2. `npm test`: la calibración de patrones (P1–P22) y la narrativa (N1–N16) están afinadas para HALDEN. Con otro catálogo, otros locales u otro elenco, algunos patrones quedarán fuera de tolerancia y habrá que recalibrar pesos o ajustar los objetivos en `src/generador/auditoria/`. Los patrones que no se alcanzan quedan registrados como `it.todo` con su desviación.
3. **Huella de determinismo**: es el hash del estado generado y está en `src/generador/pruebas/__snapshots__/determinismo.test.ts.snap`. Si el cambio es intencional, actualízala con `npx vitest run -u src/generador/pruebas/determinismo.test.ts`, confirma que `npm run test:tz` da lo mismo en las tres zonas horarias, y corre `npm run test:e2e:fundaciones` para comprobar que Chrome, Safari y Firefox producen la misma huella que Node.
4. **`versionGenerador`** (`src/config/demo.ts`): súbela cuando la historia cambie después de haber enviado un enlace, para que los registros guardados con una versión anterior no se mezclen con la nueva. Antes del primer envío da igual; hoy vale `4`.
5. Pon una `claveAlmacenamiento` y una `semilla` propias del cliente en `src/config/demo.ts`.
6. Los e2e (`e2e/flujos/`) y varios tests usan los nombres de la semilla de HALDEN (Sebastián Cárdenas, IMP-2026-07, HL-CAM-0142…). Si cambias el elenco o el catálogo hay que actualizarlos; `npm run test:e2e` es la red de seguridad.
7. `npm run build` y `npm run test:e2e:rendimiento`: comprueba que el arranque sigue dentro del presupuesto.

Si solo cambias el WhatsApp, los colores, los textos y la tasa de ejemplo, no toca la historia: alcanzan `npm run typecheck`, `npm test` y un recorrido manual. Cambiar la tasa sí mueve la huella (el historial de tasas termina en ese valor): actualiza el snapshot como en el paso 3.

## Estructura

```
src/config/     lo que cambia por cliente: marca, locales, moneda, nómina, impuestos, textos
src/seed/       datos semilla: catálogo, elenco, proveedores, importaciones, cuentas, estacionalidad
src/dominio/    tipos, reglas, comandos y fórmulas (puro, sin React)
src/generador/  construcción determinista de 18 meses de historia, con su auditoría
src/estado/     store, persistencia en el navegador, reloj
src/selectores/ cifras derivadas (todas las pantallas leen de aquí)
src/modulos/    pantallas de escritorio       src/movil/   app del dueño (/app)
src/tienda/     tienda web                    src/seguimiento/  portal de la agente de aduanas
src/reportes/   definiciones de PDF y Excel   src/ui/       sistema de diseño
src/app/        router y contrato de rutas (rutas.ts)
docs/           PRD, PLAN, decisiones, informes, QA y guía de la demo
```

Documentos de referencia: `docs/PRD.md` (qué y para quién), `docs/PLAN.md` (narrativa, momentos wow, arquitectura), `docs/DECISIONES.md` (registro de decisiones) y `docs/qa/` (revisiones de QA).

## Qué es simulado

Facturación electrónica y documento POS (con marca de agua y sin validez fiscal), nómina electrónica, mensajes (bandeja "Enviado (simulación)" con enlaces reales `wa.me` y `mailto:` sin destinatario), bot de WhatsApp e Instagram, pagos de la tienda web, WeChat, carga de Excel y cálculos laborales, tributarios y aduaneros (ilustrativos). Es real: la PWA instalable, los PDF y Excel exportados, los códigos EAN-13 y el QR, y todos los cálculos entre módulos (una venta mueve inventario, caja, comisión y cliente).
