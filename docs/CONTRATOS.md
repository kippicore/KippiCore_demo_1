# CONTRATOS — cómo construir un paquete de la demo KippiCore · HALDEN

Este documento es para los constructores (Sonnet) de las oleadas A–E. Dice **cómo leer, escribir, mostrar, enlazar, exportar y probar** sin conocer el resto del código, y **qué le toca a cada paquete** (tabla de la sección 10). Fuente de verdad del producto: `docs/PRD.md` y `docs/PLAN.md` (secciones 5–9). Dueño de este archivo: F2-B y, entre oleadas, el líder (registro de cambios al final).

Regla de oro: **todo lo que no está en tu carpeta es de solo lectura** (sección 11). Si te falta algo compartido, lo pides (sección 12) y mientras tanto resuelves con lo que existe sin romper ninguna regla.

> **Sistema de diseño (F2-C).** La fase siguiente a F2-B crea `src/ui/**` (Button, Input, Table, Modal, Drawer, Toast, Badge, KPI, `<Dinero>`, `<Fecha>`, `<Cifra>`, `<GraficoBase>`, `<GraficoDinero>`, `<Prenda>`, `<Pista>`, `<ResaltarFila>`, `<NotaLegal>`, `<Termino>`, `<MatrizExistencias>`, `<BuscadorProducto>`, `<BuscadorCliente>`, `<ImportarExcelSimulado>`, `<RequiereRol>`, `<SoloRol>`, `<CodigoBarras>`, `<CodigoQR>`…) y `src/layouts/**` definitivos (PLAN 8.7 y 9.2 F2-C). **Los constructores usan esos componentes**: no crean botones, tablas, modales, toasts ni gráficos propios, no escriben colores fuera de los tokens y no formatean cifras a mano. Si cuando empieces F2-C ya cerró, lee su página `/panel/_sistema` (solo en desarrollo) y su sección en este documento. Lo que este documento describe de `src/estado`, `src/selectores`, `src/reportes`, `src/lib` y `src/app` no cambia con F2-C.

---

## 1. Mapa rápido

| Necesito… | Uso | Importo de |
|---|---|---|
| Leer datos | `useSel(selector, params)` | `@/estado` + `@/selectores` |
| Saber local, moneda, rol, usuario | `useFiltroLocal()`, `useMoneda()`, `useRolActivo()`, `useUsuarioActivo()`, `usePuede()` | `@/estado` |
| Hora y fecha | `useAhora()`, `useHoy()` (Bogotá, cuantizadas al minuto) | `@/estado` |
| Escribir | `useAcciones().registrarVenta({...})` → `ResultadoComando` | `@/estado` |
| Reaccionar a algo que pasó | `useEvento('VentaRegistrada', fn)` | `@/estado` |
| Avisar a la guía | `emitirUI('flujo_caja_visto')` | `@/estado` |
| Mostrar dinero | `<Dinero cop>` (F2-C) o `useDinero()(cop)` | `@/ui` · `@/estado` |
| Mostrar fechas, horas, números | `<Fecha>` (F2-C) o `fecha()`, `hora()`, `numero()`… | `@/ui` · `@/lib/formato` |
| Armar un enlace | `rutas.producto('HL-CAM-0142', { trasladar })` | `@/app/rutas` |
| Leer los parámetros de mi ruta | `useParamsRuta('producto')` | `@/app/useParamsRuta` |
| Exportar un reporte | `<BotonExportar reporte="ventas" filtros={…} />` | `@/ui/conectados/BotonExportar` |
| Descargar un documento PDF | `<BotonDocumentoPdf documento={{ tipo: 'desprendible', … }} />` | `@/ui/conectados/BotonDocumentoPdf` |
| Probar en e2e | `irA`, `esperarDatos`, `conKc`, `window.__kc` | `e2e/fixtures.ts`, `e2e/kc.ts` |

Capas (ESLint las hace cumplir, 5.3): un paquete (`src/modulos/<m>`, `src/movil`, `src/tienda`, `src/seguimiento`) **no** importa `@/generador`, ni layouts, ni el router (salvo `@/app/rutas` y `@/app/useParamsRuta`), ni archivos internos de otro módulo (solo su `publico.ts`). Los selectores no leen el contexto global: reciben `localId`, rango, `hoy`… como parámetros; los hooks inyectan el contexto.

---

## 2. Cómo leer

### 2.1 `useSel(selector, params)`

Todos los selectores son funciones puras `(estado, params) => resultado` creadas con `crearSelector` (src/selectores/memo.ts). Están memoizados por la **referencia de las tablas** que leen y por la **clave serializada** de los parámetros: puedes pasar un objeto nuevo en cada render sin perder el caché, y dos lecturas seguidas devuelven **la misma referencia** (prueba en `src/estado/hooks.test.tsx`). Tras una venta solo se recalculan los selectores que leen las tablas que la venta tocó.

Ejemplo real (esqueleto de Inicio, `src/modulos/inicio/paginas/Inicio.tsx`):

```tsx
import { useAhora, useDinero, useFiltroLocal, useSel } from '@/estado';
import { selKpisInicio } from '@/selectores';

export default function Inicio() {
  const localId = useFiltroLocal();          // 'todos' o el id del local (el vendedor: siempre el suyo)
  const ahora = useAhora();                  // '2026-09-30T15:30:00' (cuantizado al minuto)
  const kpis = useSel(selKpisInicio, { localId, ahora });
  const dinero = useDinero();                // en la moneda activa
  return kpis.tarjetas.map((k) => <p key={k.id}>{k.etiqueta}: {k.formato === 'dinero' ? dinero(k.valor) : k.valor}</p>);
}
```

Ejemplo real (esqueleto de Hoy de `/app`, `src/movil/paginas/Hoy.tsx`):

```tsx
const hoy = useAhora().slice(0, 10);
const { filas, totales } = useSel(selVentas, { desde: hoy, hasta: hoy });         // filas + totales del filtro
const cierres = useSel(selCierresDelDia, { fecha: sumarDias(hoy, -1) });         // los 3 locales (W11)
```

Más ejemplos de uso correcto:

```tsx
const { filas, totales } = useSel(selVentas, { desde, hasta, localId, vendedorId, medio, canal, estado });  // A3
const matriz = useSel(selMatrizExistencias, { productoId });                     // A2: talla × color × local + "En camino"
const ficha = useSel(selCliente, { clienteId, hoy });                            // A4
const flujo = useSel(selFlujoProyectado, { dias: 90, hoy, hora: ahora.slice(11, 16) });  // B3 (W5)
const costo = useSel(selCostoEmpleado, { empleadoId, modo: 'pactado', exoneracion: false, simularPrestacion: false }); // C1 (W6)
const sugerencia = useSel(selSugerenciaPedido, { proveedorId, coberturaDias: 90, hoy });  // B1 (W12)
const alertas = useSel(selAlertas, { localId, ahora, descartadas });             // D1
const narrativa = useSel(selNarrativa, { hoy });                                  // entidades del guion, dinámicas
```

Reglas:
- **Nunca** recalcules una regla de negocio (IVA, comisiones, costo aterrizado, saldos, flujo, nómina, segmentos…). Si el selector existe, úsalo; si no, compón selectores existentes en tu `modulos/<m>/selectores.ts` (con `crearSelector` y declarando **todas** las tablas que lees: la prueba `activarVerificacionDeTablas(true)` falla si lees una tabla no declarada) o pide uno nuevo.
- Los totales que muestras son los del selector (`totales` de `selVentas`, `total` de `selSaldosCuentas`…): nunca sumes filas formateadas.
- `ahora`/`hoy` siempre de `useAhora()`/`useHoy()`: nunca `new Date()` ni `Date.now()` (ESLint lo prohíbe fuera de `estado/reloj.ts`).
- El estado de dominio crudo (`useEstadoDominio()`) es para `ui/conectados` y `estado/**`. En un módulo, léelo solo para buscar una entidad por id cuando no haya selector (y dilo en tu informe).
- Para el panel "Lo que acaba de pasar" (A1, W1): `selEfectosVenta(r.antes, r.despues, ventaId)` con el `ResultadoComando` de la acción (no es un hook; es una función).

El catálogo completo, con parámetros y resultado, está en el **anexo A**. Los tipos de los resultados están en el archivo de cada selector (`src/selectores/<archivo>.ts`), exportados.

### 2.2 Hooks de contexto (`@/estado`)

| Hook | Devuelve | Notas |
|---|---|---|
| `useFiltroLocal()` | `Id \| 'todos'` | Para el vendedor, siempre su local. Pásalo a los selectores |
| `useMoneda()` | `{ moneda, tasa, cambiar }` | `tasa` = COP por unidad de la moneda activa con la tasa vigente hoy |
| `useDinero()` | `f(cop)`, `f.corta(cop)`, `f.convertir(cop)`, `f.moneda` | Convierte desde COP y formatea (sección 4) |
| `useRolActivo()` | `'dueno' \| 'vendedor' \| 'bodega'` | En `/app` siempre `'dueno'` (`ContextoRolForzado`) |
| `useUsuarioActivo()` | `{ rol, usuario, empleado, localFijoId }` | `empleado` es la persona del vendedor o la bodega; el dueño no es empleado |
| `usePuede()` | `puede(permiso)` | Permisos = tipos de comando (`'venta.anular'`) y vistas (`'ver.costos'`, `'ver.margenes'`, `'ver.salarios'`, `'ver.pagos'`, `'ver.gastos'`, `'ver.nomina'`, `'ver.esperadoCajaAntesDeContar'`, `'descuento.sinAprobacion'`, `'configuracion'`, `'restaurar'`…), `config/permisos.ts` |
| `useMarca()` | `{ nombre, persona, esEjemplo, descriptor, avisoEjemplo }` | Nombre del negocio activo (personalizado o HALDEN). Nunca escribas "HALDEN" a mano |
| `useAhora()` / `useHoy()` | `FechaHoraISO` / `FechaISO` | Bogotá, cuantizada al minuto; con `?hoy=` fija |
| `useSesion(s => …)` | store de interfaz | rol, local, tema, marca personalizada, alertas descartadas, notificaciones leídas, cierres vistos; acciones `cambiarRol`, `cambiarLocal`, `cambiarMoneda`, `personalizarMarca`, `descartarAlerta`, `marcarNotificacionLeida`, `marcarCierreVisto` |
| `useGuia(s => …)` | store de la guía | Solo E2 (y el menú "?") |
| `useDatos(s => …)` | `{ fase, progreso, reconstruyendo, modo, registro, ancla, avisos, qr, restaurar }` | Solo para pantallas de datos (E3 Configuración › Datos, chip del QR de E1). Nunca para leer el estado de dominio |

### 2.3 Estados de carga

Todas las rutas del escritorio y de `/app` están envueltas en `<RequiereDatos>`: tu página **solo se monta cuando el estado existe**, así que `useSel` nunca ve `null`. Una reconstrucción (entrada de otra pestaña, restaurar) deja visible el estado anterior y cambia `useDatos(s => s.reconstruyendo)`. Diseña los estados vacío, carga (esqueleto de F2-C para cálculos que tarden) y error de tu pantalla (DoD 9.1.9).

---

## 3. Cómo escribir

### 3.1 `useAcciones()`

```tsx
const acciones = useAcciones();                    // actor = rol activo; en /app, el dueño
const r = acciones.registrarVenta({
  localId: 'usq', vendedorId: 'em_scardenas', canal: 'local', tipo: 'contado',
  clienteId: null, clienteNuevo: null,
  lineas: [{ varianteId, cantidad: 1, precioLista: null, descuento: null }],
  descuentoGlobal: null, aprobacionDescuentoId: null,
  pagos: [{ medio: 'efectivo', valor: 189_900, recibido: 200_000, referencia: null, sesionCajaId, bonoId: null }],
  fechaLimiteSeparado: null, ventaOrigenCambioId: null, facturaInmediata: null, nota: null,
});
if (!r.ok) {
  mostrarError(r.error.mensaje, r.error.campo);   // mensaje en español, listo para el usuario; nada cambió
  return;
}
const efectos = selEfectosVenta(r.antes, r.despues, ventaIdDeLaVenta);   // W1
```

- **Una función por comando** del catálogo 6.21 (107). Nombre: `objeto.verbo` → `verboObjeto` (tabla completa en el **anexo B**). Datos: los de `MapaComandos` (`src/dominio/tipos/comandos.ts`).
- La acción **genera** los IDs de lo que crea (si no vienen), el `ts`, la marca de agua y el usuario/rol del sobre: tú solo pasas datos de negocio. Si necesitas el id antes (para navegar a lo creado), genéralo con `acciones.nuevoId(PREFIJO)` y pásalo, o léelo del registro (`useDatos(s => s.registro.at(-1))`).
- Resultado: `{ ok: true, eventos, antes, despues }` o `{ ok: false, error: { codigo, mensaje, campo? } }`. Un comando inválido **no cambia nada** (atomicidad probada en F2-A1).
- Actores especiales: `useAcciones({ actor: 'portal' })` en `/seguimiento/:numero` (B1) y `useAcciones({ actor: 'tienda' })` en `/tienda` (D6).
- Permisos: el motor rechaza lo que el rol no puede hacer (`SIN_PERMISO`), pero **tu interfaz no debe ofrecerlo**: oculta o deshabilita con `usePuede()` (o `<SoloRol>` de F2-C). Ej.: el vendedor ve "Pedir anulación" (`solicitarAprobacion`) y nunca "Anular".
- Persistencia, sincronización entre pestañas, QR, marcos: **automáticos**. No escribas en `localStorage` ni en `BroadcastChannel`.
- **No hay deshacer**: los documentos se revierten con su comando (anular, cancelar, eliminar suave). Confirmación antes de eliminar (DoD).

### 3.2 Errores de dominio

`error.codigo` es estable (`SALDO_INSUFICIENTE`, `SIN_EXISTENCIAS`, `CELULAR_DUPLICADO`, `SIN_PERMISO`, `VENTA_ANULADA`, `SIN_DATOS`…) y `error.mensaje` ya está redactado para el usuario (8.11.1). `error.campo` (cuando existe) es el nombre del campo de los datos del comando: úsalo para marcar el campo del formulario. No reescribas el mensaje salvo para acortarlo en un espacio pequeño; no inventes validaciones que el dominio ya hace (si quieres validar antes de enviar, usa las mismas reglas puras de `src/dominio/reglas/**`).

### 3.3 Eventos

```tsx
useEvento('VentaRegistrada', (e) => { if (e.contexto.origen === 'usuario') … });   // dominio (6.18), con contexto
useEvento('*', (e) => …);                                                            // todos
emitirUI('flujo_caja_visto');                                                        // interfaz (6.18), para la guía
emitirUI('pedido_sugerido_visto', { proveedorId });
useEntradaRemota((r) => toast(r.texto));                                             // solo el layout (F2-C)
```

- Los eventos de dominio salen **solos** al ejecutar comandos en vivo (no existen en una reconstrucción). Cada uno trae `contexto: { origen, usuarioId, rol, entradaId }`.
- Los **`EventoUI`** los emite el paquete indicado en `EVENTOS_UI` (`src/app/rutas.ts`) y en la tabla de la sección 10: son **criterio de aceptación**. `pdf_generado`/`excel_generado` los emiten `<BotonExportar>` y `<BotonDocumentoPdf>` por ti.
- E2 escucha todo; ningún otro paquete emite eventos por otro.

---

## 4. Cifras y fechas

**Ninguna cifra se formatea a mano** (ni `toLocaleString`, ni `toFixed`, ni `'$ ' + …`).

| Qué | Con F2-C | Hasta F2-C / fuera de JSX |
|---|---|---|
| Dinero en la moneda activa (desde COP) | `<Dinero cop={v} />`, `<Dinero cop={v} corta />` | `const d = useDinero(); d(v)`, `d.corta(v)` |
| Gráficos con dinero | `<GraficoDinero series={…} />` (convierte series, ejes y tooltips) | `d.convertir(v)` + `cifraCorta` |
| Monto de origen en USD/CNY (FOB, pagos a fábricas) | el componente de cifra de origen de F2-C | `dineroOrigen(centavos, 'USD')` (`@/lib/moneda`) |
| Fecha `30/09/2026`, corta, larga | `<Fecha valor={f} formato="larga" />` | `fecha(f)`, `fechaCorta(f)`, `fechaLarga(f)`, `mesAnio('2026-09')` (`@/lib/formato`) |
| Hora `3:45 p. m.`, fecha y hora | `<Fecha valor={ts} formato="hora" />` | `hora(ts)`, `fechaHora(ts)`, `relativa(ts, ahora)`, `relativaDias(f, hoy)` |
| Números, enteros, unidades, % y variación | `<Cifra>` | `numero(v, dec)`, `entero(v)`, `unidades(n)`, `porcentaje(fraccion)`, `variacion(fraccion)` |
| Celular, cédula, NIT, consecutivo | — | `celular('3001234567')`, `cedula(…)`, `nit(…)`, `consecutivo('V', 482)` |
| Plurales | — | `plural(n, 'venta')` |
| Aritmética de fechas | — | `@/lib/fechas` (`ultimosDias`, `mesALaFecha`, `rangoMes`, `diasDeSemana`, `semanaIso`…) y `@/dominio/reglas/fechas` (`sumarDias`, `diferenciaDias`) |

- Dinero: COP enteros en todo el dominio; la conversión a USD/CNY es **solo para mostrar** (tasa vigente, `selTasaVigente`). Con moneda distinta de COP, F2-C muestra `<FranjaMoneda>`. Los montos que nacieron en USD/CNY muestran además su cifra original.
- Formatos según PLAN 8.11.3: espacio duro entre símbolo y cifra (U+00A0), signo menos tipográfico (U+2212), `a. m.`/`p. m.`.
- Términos dobles con `<Termino>` (glosario en `config/textos/glosario.ts`) y valores legales con `<NotaLegal tipo="nomina|tributario|aduanero|contrato_realidad">` (textos en `config/textos/notas.ts`).
- Ningún texto por debajo de 12 px; colores solo de los tokens (F2-C).

---

## 5. Enlaces (`src/app/rutas.ts`)

Ningún paquete arma una URL a mano ni lee `location.search`.

```tsx
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';

navigate(rutas.flujo({ semana: '2026-10-05' }));                              // /panel/pagos/flujo?semana=2026-10-05
<Link to={rutas.producto('HL-CAM-0142', { trasladar: { origen: 'zr', destino: 'usq', varianteId, cantidad: 3 } })} />
<Link to={rutas.importacionPestana('IMP-2026-07', 'costo-aterrizado')} />
<Link to={rutas.ventas({ desde, hasta, local: 'usq', resaltar: ventaId })} />

// En la página destino:
const { referencia, trasladar, resaltar } = useParamsRuta('producto');      // tipados; inválidos → null
```

- `RUTAS` tiene **las 106 rutas** de 5.5 (con su paquete, roles, título y query tipada). Constructores: `rutas.<nombre>(...paramsDeRuta, query?)`. Parser: `useParamsRuta('<nombre>')` (o `leerParamsRuta` puro).
- Pestañas de ficha como subrutas: `PESTANAS_PRODUCTO`, `PESTANAS_IMPORTACION`, `PESTANAS_EMPLEADO`.
- Claves legibles: referencia del producto (`HL-CAM-0142`), número de importación (`IMP-2026-07`), slug del empleado (`sebastian-cardenas`); el resto, el `id`. Resuelve con `selProductoPorReferencia`, `selImportacionPorNumero`, `selEmpleadoPorSlug`, `selProductoPorSlug` (tienda).
- **Nunca escribas un número de importación, un id o un nombre del guion a mano**: resuélvelos con `selNarrativa({ hoy })` (las entidades del guion son dinámicas: la importación que hoy está en puerto depende del año).
- Parámetros desconocidos se ignoran; un parámetro con una entidad inexistente muestra la pantalla sin el efecto y un toast discreto ("Esa venta ya no está en la lista").
- `?resaltar=<id>`: la fila/tarjeta destino se resalta 1,5 s y se desplaza a la vista con `<ResaltarFila>` (F2-C). `?resaltar=<control>` (`cambiar-estado`, `rol`, `moneda`): pulso de pista sobre ese control, una vez.
- Globales: `?hoy=` (QA: reloj fijo, claves de almacenamiento aparte) y `?marco=1` (marcos que adoptan el store del padre). Para abrir un contexto NUEVO (portal en otra pestaña, QR) usa `propagarHoy(url, overrideHoy())`.
- Guardas: si el rol activo no ve una ruta, `GuardaRol` redirige a su inicio con el aviso "Esta sección es solo para el dueño." No repitas la guarda en tu página; sí oculta controles por permiso.
- Un parámetro, evento o pista **nuevo** se agrega primero en `rutas.ts` (líder) y luego lo usas (sección 12).

---

## 6. Exportar

### 6.1 Reportes: `<BotonExportar reporte filtros>`

```tsx
import { BotonExportar } from '@/ui/conectados/BotonExportar';

<BotonExportar reporte="ventas" filtros={{ desde, hasta, localId }} />            // PDF y Excel
<BotonExportar reporte="kardex" filtros={{ productoId }} formatos={['excel']} />
<BotonExportar reporte="nomina" filtros={{ liquidacionId }} />
```

- Usa la **definición única** de `src/reportes/definiciones.ts` (`REPORTES`, 13 ids): `ventas`, `cierre-caja`, `inventario`, `kardex`, `importaciones`, `cuentas`, `gastos`, `resultados`, `nomina`, `asistencia`, `comisiones`, `clientes`, `contador` ("Exportar para tu contador": un .xlsx con hojas Ventas, Compras e importaciones, Gastos, Nómina, IVA). Un módulo **nunca arma filas de un reporte**.
- Lo que no pases en `filtros` sale del contexto: mes en curso, local activo, rol (el vendedor solo exporta lo suyo y nunca costos), moneda activa (el encabezado lo dice).
- PDF con Figtree embebida (tildes, `−` y espacio duro correctos), encabezado con la marca activa, filtros, fecha y pie "Generado con KippiCore CRM". Excel con encabezados congelados, formatos de moneda y fecha reales y **fila de totales `SUM(…)` con su resultado en caché** (`fullCalcOnLoad`): las vistas previas de WhatsApp, Gmail y Quick Look muestran los totales.
- Emite `pdf_generado`/`excel_generado` con `{ reporte }`. jsPDF y ExcelJS se cargan solo al hacer clic ("Preparando el archivo…").
- Fuera de React (D4 con su propio botón, pruebas): `exportarReporte(id, estado, filtros, 'pdf' | 'excel', contexto)` y `hojasParaExportar(...)` de `@/reportes`.
- Tabla dinámica (D2): no es una definición; exporta su resultado con `crearLibroExcel` de `@/lib/exportar/excel` (mismas reglas de totales: los no aditivos van como número ya calculado, no como `SUM`) y emite `excel_generado` con `{ reporte: 'pivote' }`.

### 6.2 Documentos: `<BotonDocumentoPdf documento>`

```tsx
import { BotonDocumentoPdf } from '@/ui/conectados/BotonDocumentoPdf';

<BotonDocumentoPdf documento={{ tipo: 'desprendible', liquidacionId, empleadoId }} />   // C1
<BotonDocumentoPdf documento={{ tipo: 'factura', facturaId }} />                         // D3
<BotonDocumentoPdf documento={{ tipo: 'pos', facturaId }} />                             // A1, D3 (80 mm)
<BotonDocumentoPdf documento={{ tipo: 'nota-credito', notaId }} />                       // D3
<BotonDocumentoPdf documento={{ tipo: 'etiquetas', varianteIds, copias: 2 }} />          // A2 (EAN-13 vectorial)
```

Plantillas únicas de `src/reportes/plantillas-pdf.ts` con la marca activa; las de facturación llevan la marca de agua "DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL"; el desprendible dice "Nómina electrónica: transmitida (simulación)". Emite `pdf_generado` con `{ reporte: <tipo> }`. F2-C les da el diseño a los dos botones (la API no cambia).

---

## 7. Contexto global: local, moneda y rol

| Contexto | Dónde vive | Qué haces tú |
|---|---|---|
| Local | `useSesion.localId` (`'todos'` o id) | Lee `useFiltroLocal()` y pásalo a los selectores. El vendedor está fijo en su local (selector bloqueado). La bodega solo aparece como opción en vistas de inventario (`selLocales({ incluirBodega: true })`). Gastos generales: en "Todos" siempre; con un local, solo con "Incluir gastos generales prorrateados" |
| Moneda | `useSesion.moneda` (`sessionStorage`: vuelve a COP en la siguiente visita) | Todas las cifras pasan por `<Dinero>`/`useDinero()`/`<GraficoDinero>`. Nunca conviertas a mano. Exportes en la moneda activa |
| Rol | `useSesion.rol` + persona en `config/permisos.ts` | Oculta controles con `usePuede()`/`<SoloRol>`. El vendedor nunca ve costos, márgenes, salarios de otros, pagos, gastos ni nómina (ni en tooltips ni exportes). `/app` es siempre del dueño |

Los selectores del layout (local, moneda, rol), la franja de rol, la franja de moneda y el toast remoto son de F2-C; tu pantalla solo reacciona.

---

## 8. Datos de la demo que conviene saber

- Ancla de QA: `?hoy=2026-09-30T15:30` (`HOY_QA`). Con esa fecha: ≈ 17.088 ventas, 450 clientes, 85 referencias (883 variantes), 29 importaciones (4 en curso: Weiye IMP-2026-06, Huameng IMP-2026-07, Yuefeng IMP-2026-08, Lanxin IMP-2026-09), 3 locales que venden (`usq` Usaquén, `p93` Parque 93, `zr` Zona Rosa) y la bodega (`bod`).
- Personas de los roles: dueño `u_dueno` (Juan Camilo Ospina, ficticio: nunca se nombra en el saludo); vendedor `u_vendedor` = Sebastián Cárdenas (`em_scardenas`, Usaquén); bodega `u_bodega` = Wilson Díaz (`em_wdiaz`). Locales: `usq`, `p93`, `zr` y la bodega `bod`. Slugs de empleado en la URL (`sebastian-cardenas`).
- IDs generados contienen `_g_` (`vt_g_20260930_usq_012`, `cl_g_0001`…); los del usuario los crea `nuevoId` (prefijo + instante + contador + aleatorio, sin `_g_`). No dependas de un id generado concreto en tus pruebas: búscalo por selector o por `selNarrativa`.
- Las cifras exactas pueden moverse un poco mientras la pista de calibración ajusta el generador: tus pruebas deben comparar contra **selectores** (o recalcular desde los hechos), no contra números escritos.

---

## 9. Cómo probar

### 9.1 Pruebas unitarias (Vitest)

- `npx vitest run src/modulos/<m>` (proyecto `dominio` para `*.test.ts`, entorno node; `componentes` para `*.test.tsx`, jsdom).
- Estado de 18 meses para tus pruebas: `estadoDe()` de `@/selectores/pruebas/construir` (memoizado por archivo; `HOY`, `AHORA`). Tu módulo no puede importar `@/generador` directamente.
- Para un componente con datos: `almacenDatos.setState({ estado: estadoDe(), fase: 'listo' })` y `render(...)` (ver `src/estado/hooks.test.tsx`). Para el rol o la moneda: `almacenSesion.getState().cambiarRol('vendedor', 'usq')`, `cambiarMoneda('USD')` (y restáuralos al final).
- Tus selectores locales: con `activarVerificacionDeTablas(true)` en la prueba, fallan si leen una tabla no declarada.
- Prueba los cálculos **propios** de tu pantalla (DoD); los de dominio ya están probados.

### 9.2 E2E (Playwright)

Tu prueba vive en `e2e/paquetes/<paquete>.spec.ts` (tabla de la sección 10). Playwright **levanta y cierra solo** el servidor (`npx vite build && npx vite preview --port $PORT --strictPort`) con la config `webServer`; `reuseExistingServer` reutiliza un servidor que ya escuche en ese puerto, por eso **cada paquete usa su `PORT`** (sección 10): así no le pruebas el build a otro worktree.

```bash
PORT=4301 npx playwright test e2e/paquetes/pos.spec.ts --project=escritorio-1440 --project=escritorio-1366 --project=escritorio-1280
```

Proyectos: `escritorio-1440` (1440 × 900), `escritorio-1366` (1366 × 657), `escritorio-1280` (1280 × 800), `celular-390` (390 × 844, táctil), `webkit-hash` y `firefox-hash` (solo `@hash`), `rendimiento` (solo `@rendimiento`, corre al final). Siempre con `?hoy=` y almacenamiento limpio (un contexto nuevo por prueba).

```ts
import { conHoy, expect, test } from '../fixtures';
import { conKc, esperarDatos, registrarVentaDePrueba } from '../kc';

test('registrar una venta desde el POS mueve inventario, ventas y caja', async ({ page, irA }) => {
  await irA('/panel/pos');                      // agrega ?hoy=2026-09-30T15:30
  await esperarDatos(page);                     // espera window.__kc y el estado construido
  // … interactúa con TU pantalla por data-testid propios …
  const r = await conKc(page, (kc) => ({
    ventasHoy: (kc.sel('selVentas', { desde: '2026-09-30', hasta: '2026-09-30' }) as { totales: { numVentas: number } }).totales.numVentas,
    eventos: kc.eventosDominio().map((e) => e.tipo),
  }));
  expect(r.eventos).toContain('VentaRegistrada');
});
```

`window.__kc` (instalado con `?hoy=`, en desarrollo o con `?kc`; `src/estado/kc.ts`):

| | |
|---|---|
| `__kc.estado()` | estado de dominio actual |
| `__kc.sel('selVentas', params)` / `__kc.selectores` | cualquier selector del catálogo |
| `__kc.acciones.registrarVenta({...})` / `__kc.accionesDe('vendedor')` | acciones (preparar datos o verificar efectos) |
| `__kc.eventosUI()` | `EventoUI` emitidos en la pestaña (verifica los que te tocan) |
| `__kc.eventosDominio()` | eventos de dominio de los comandos en vivo, con su contexto |
| `__kc.datos.getState()` | `{ registro, modo, ancla, fase, reconstruyendo, medicion, qr }` |
| `__kc.listo()` | promesa con el estado construido |
| `__kc.hashEstado()` | huella del estado (determinismo) |
| `__kc.urlQr()` | URL de `/app#r=…` con las últimas acciones |

Reglas del e2e de paquete (9.1.9): verifica **solo tu pantalla**; los efectos en otros módulos, por selectores con `__kc` o por `data-testid` propios, **nunca navegando a pantallas de paquetes paralelos** (eso va en `e2e/flujos`, fase 4); sin errores en consola (escucha `pageerror` y `console` como `e2e/paquetes/fundaciones.spec.ts`); prueba también tus parámetros de la tabla 10, tus `EventoUI` (con `eventosUI()`) y que tus anclas `<Pista id>` existen.

`?hoy=` también sirve a mano: `http://localhost:5173/panel/inicio?hoy=2026-12-19T16:30` (`npm run dev`). Con `?hoy=` la pestaña usa claves de almacenamiento aparte (`kc:halden:v1:qa:*`): no mezcla tu registro de QA con el de un visitante.

---

## 10. Tabla por paquete

Todo lo de las columnas **Honra**, **Emite** y **Pistas** es criterio de aceptación (9.1.5). "Reportes" = lo que exporta con `<BotonExportar reporte>` o `<BotonDocumentoPdf documento>`. Ids de pista en `PISTAS` (`src/app/rutas.ts`); sus textos los pone E2 en `config/textos/guia.ts`; tú colocas `<Pista id="…">` (F2-C) sobre el ancla indicada.

| Paquete | Carpetas propias | Rutas (`RUTAS`) | Honra (query) | Emite (`EventoUI`) | Pistas (ancla) | Reportes / documentos | PORT |
|---|---|---|---|---|---|---|---|
| **A1** POS y caja | `src/modulos/pos/**`, `e2e/paquetes/pos.spec.ts` | `pos`, `caja` | caja: `?sesion=`, `?resaltar=<sesionId>`. **Produce** `?resaltar=` hacia ventas, inventario, clientes y caja ("Lo que acaba de pasar") | — (los de dominio salen solos) | `pos.escaneo` (botón "Simular escaneo"), `caja.arqueo` (campo "Efectivo contado") | `cierre-caja`; documento `pos` | 4301 |
| **A2** Inventario | `src/modulos/inventario/**`, `e2e/paquetes/inventario.spec.ts` | `inventario`, `productoNuevo`, `movimientos`, `traslados`, `traslado`, `conteos`, `conteo`, `recepcion`, `etiquetas`, `valorizacion`, `producto`, `productoPestana` | `?trasladar=` (ficha), `?resaltar=` (catálogo, kardex, traslados), `?importacion=` (recepción); filtros del catálogo | `pdf_generado`/`excel_generado` (vía los botones) | `inventario.local` (filtro "Local" del catálogo) | `inventario`, `kardex`; documento `etiquetas` | 4302 |
| **A3** Ventas | `src/modulos/ventas/**`, `e2e/paquetes/ventas.spec.ts` | `ventas`, `venta`, `devolucion` | `?resaltar=<ventaId>`, `?desde=&hasta=&local=&vendedor=&cliente=&medio=&canal=&estado=&producto=` (reflejados en la URL) | vía `<BotonExportar reporte="ventas">` | `ventas.totales` (barra de totales del filtro) | `ventas` | 4303 |
| **A4** Clientes | `src/modulos/clientes/**`, `e2e/paquetes/clientes.spec.ts` | `clientes`, `cumpleanos`, `cliente` | `?mensaje=cumpleanos\|cobro\|seguimiento` (ficha), `?resaltar=`, `?segmento=` (lista) | — | `clientes.segmentos` (filtros de segmento) | `clientes` | 4304 |
| **B1** Importaciones, portal y sugerir | `src/modulos/importaciones/**`, `src/seguimiento/**`, `e2e/paquetes/importaciones.spec.ts` | `importaciones`, `importacionNueva`, `sugerirPedido`, `contactosCadena`, `importacion`, `importacionPestana`, `seguimiento` | `?resaltar=cambiar-estado\|<numero>`, `?vista=tablero\|lista\|ruta`, sugerir: `?proveedor=&cobertura=&desde=` | `pedido_sugerido_visto` (`{ proveedorId }`), `portal_enviado` (`{ numero }`) | `importaciones.estado` (botón de cambio de estado), `importaciones.sugerir` (tabla de cantidades), `portal.formulario` (formulario del portal) | `importaciones` | 4311 |
| **B2** Proveedores | `src/modulos/proveedores/**`, `e2e/paquetes/proveedores.spec.ts` | `proveedores`, `comparativoFabricas`, `proveedor` | `?resaltar=`, `?tipo=&local=`. **Produce** `rutas.sugerirPedido({ proveedor, desde: 'proveedor' })` | — | `proveedores.moneda` (selector de moneda de la barra superior) | — | 4312 |
| **B3** Pagos, datáfono y flujo | `src/modulos/pagos/**`, `e2e/paquetes/pagos.spec.ts` | `pagos`, `porPagar`, `porCobrar`, `cuentas`, `cuenta`, `conciliacion`, `datafono`, `flujo` | `?semana=` (flujo y por pagar), `?filtro=separados-por-vencer` (por cobrar), `?resaltar=` (cuentas por pagar y movimientos), `?mes=&local=` (datáfono) | `flujo_caja_visto` (al montar `/panel/pagos/flujo`) | `pagos.flujo` (pestaña "Flujo de caja"), `pagos.datafono` (pestaña "Datáfono") | `cuentas` | 4313 |
| **B4** Gastos y resultados | `src/modulos/gastos/**`, `e2e/paquetes/gastos.spec.ts` | `gastos`, `gastosRecurrentes`, `estadoResultados`, `puntoEquilibrio` | `?resaltar=`, `?local=&mes=` | — | `gastos.resultados` (pestaña "Estado de resultados") | `gastos`, `resultados` | 4314 |
| **C1** Personal, nómina y comisiones | `src/modulos/personal/**`, `e2e/paquetes/personal.spec.ts` | `personal`, `empleadoNuevo`, `nomina`, `liquidacion`, `comparativoModalidades`, `comisiones`, `misComisiones`, `empleado`, `empleadoPestana` | `?riesgo=contrato-realidad`, `?resaltar=`, `?local=` (lista), `?mes=&empleado=` (comisiones) | `costo_empleador_visto` (al montar la pestaña `costo` o `/panel/personal/comparativo`; `{ empleadoId? }`) | `personal.costo` (columna "Costo para el negocio") | `nomina`, `comisiones`; documento `desprendible` | 4321 |
| **C2** Turnos y asistencia | `src/modulos/turnos/**`, `e2e/paquetes/turnos.spec.ts` | `turnos`, `asistencia`, `novedades`, `miTurno`, `miDia` | `?local=&empleado=&desde=&hasta=` (asistencia), `?semana=&local=` (turnos) | — | `turnos.recargos` (total "Recargos estimados de la semana") | `asistencia` | 4322 |
| **C3** Calendario | `src/modulos/calendario/**`, `e2e/paquetes/calendario.spec.ts` | `calendario` | `?vista=mes\|semana\|dia&fecha=&resaltar=` | — | `calendario.leyenda` (leyenda de tipos) | — | 4323 |
| **D1** Inicio | `src/modulos/inicio/**`, `e2e/paquetes/inicio.spec.ts` | `inicio` | —. **Produce** los enlaces de las alertas (`selAlertas` ya los trae armados con `rutas.ts`) | — | `inicio.alertas` (lista "Requiere tu atención") | — | 4331 |
| **D2** Análisis | `src/modulos/analisis/**`, `e2e/paquetes/analisis.spec.ts` | `analisis`, `tablaDinamica`, `analisisProductos`, `analisisClientes`, `analisisLocales` | `?vista=&resaltar=`. **Produce** `rutas.sugerirPedido({ proveedor, desde: 'analisis' })` | `tabla_dinamica_modificada` (cambio de filas, columnas o medida); `excel_generado` `{ reporte: 'pivote' }` al exportar | `analisis.hallazgos` (bloque de hallazgos) | pivote con `crearLibroExcel` (6.1) | 4332 |
| **D3** Facturación | `src/modulos/facturacion/**`, `e2e/paquetes/facturacion.spec.ts` | `facturacion`, `factura`, `notaCredito` | `?resaltar=`, `?tipo=` | `pdf_generado` (vía el botón) | `facturacion.marca` (marca de agua de la vista previa) | documentos `factura`, `pos`, `nota-credito` | 4333 |
| **D4** Reportes | `src/modulos/reportes/**`, `e2e/paquetes/reportes.spec.ts` | `reportes` | `?reporte=<id>` (abre la tarjeta; valida contra `IDS_REPORTES`) | `pdf_generado`, `excel_generado` (vía `<BotonExportar>`; `contador` para la tarjeta destacada) | `reportes.contador` (tarjeta "Exportar para tu contador") | los 13 (`REPORTES`); rol bodega: `inventario` y `kardex` | 4334 |
| **D5** Canales | `src/modulos/canales/**`, `src/seed/escenarios-canales.ts`, `e2e/paquetes/canales.spec.ts` | `canales`, `canalWhatsapp`, `canalInstagram`, `canalWeb` | `?escenario=<id>` | `whatsapp_escenario_completado` (`{ escenario }`), `whatsapp_respondido` | `canales.escenarios` (selector de escenarios) | — | 4335 |
| **D6** Tienda web | `src/tienda/**`, `e2e/paquetes/tienda.spec.ts` | `tienda`, `tiendaCategoria`, `tiendaProducto`, `tiendaBolsa`, `tiendaPago`, `tiendaPedido` | `?marco=1` (el store del padre lo resuelve F2-B), `?talla=&color=` | — | `tienda.franja` (franja superior) | — | 4336 |
| **E1** App del dueño | `src/movil/**`, `e2e/paquetes/movil.spec.ts` | `app`, `appVentas`, `appInventario`, `appProducto`, `appAgenda`, `appCierres`, `appCierre`, `appMas`, `appAprobar`, `appImportaciones`, `appImportacion`, `appNomina`, `appPagos`, `appAlertas`, `appMoneda`, `appComoArrancariamos` | `#r=` (ya decodificado: `useDatos(s => s.qr)` = `{ resultado: 'adoptado'\|'fusionado'\|'otra_ancla'\|'invalido', entradas, ancla }`), `?marco=1`, `?sesion=` (cierres) | `qr_abierto` (al abrir `ModalAppDueno`), `app_abierta` (al montar `/app` sin `?marco=1`) | `app.hoy` (cifra principal) | — | 4341 |
| **E2** Entrada, guía y "Cómo arrancaríamos" | `src/modulos/entrada/**`, `src/modulos/guia/**`, `e2e/paquetes/guia.spec.ts` | `entrada`, `comoArrancariamos` | — (escucha todos los `EventoUI` y de dominio) | `como_arrancariamos_visto`, `marca_personalizada` | textos de todas las pistas (`config/textos/guia.ts`, `PISTAS_TEXTOS`) | — | 4342 |
| **E3** Configuración | `src/modulos/configuracion/**`, `e2e/paquetes/configuracion.spec.ts` | `configuracion`, `configEmpresa`, `configLocales`, `configMonedas`, `configNomina`, `configImpuestos`, `configAduanas`, `configUsuarios`, `configDatos` | — | `marca_personalizada` | `configuracion.restaurar` (botón "Restaurar datos de demostración") | — | 4343 |

Otros puertos: `4173` servidor compartido (fundaciones, flujos de fase 4, rendimiento; `npm run test:e2e`), `4180` `npm run medir:arranque`, `5173` `npm run dev`.

Puntos de extensión que reemplaza su dueño sin tocar el layout (9.1.6): `src/modulos/guia/publico.ts` (`GuiaFlotante`, `MenuAyuda`, E2), `src/movil/publico.ts` (`ModalAppDueno`, `BotonAppDueno`, E1), `src/modulos/entrada/paginas/Entrada.tsx` (E2) y **una página esqueleto por ruta** en `src/<carpeta>/paginas/*.tsx`: reemplázala conservando el nombre del archivo y el `export default` (el router la importa por ese nombre; ver `PAGINAS` en `src/app/router.tsx`). Las páginas esqueleto usan `<EsqueletoPagina>` (`data-testid="pagina-esqueleto"`): tu página ya no.

Lo que un paquete puede crear dentro de su carpeta (9.1.3): páginas, componentes internos, hooks de interfaz, `selectores.ts` locales (componiendo selectores compartidos), `textos.ts` con el copy de su interfaz, pruebas y `publico.ts` (lo que otros módulos de oleadas posteriores podrán importar).

---

## 11. Solo lectura

Para todos los constructores (9.1.1): `src/dominio/**`, `src/generador/**`, `src/selectores/**`, `src/reportes/**`, `src/estado/**`, `src/lib/**`, `src/ui/**`, `src/layouts/**`, `src/app/**` (incluido `rutas.ts` y `router.tsx`), `src/config/**`, `src/seed/**` (salvo `src/seed/escenarios-canales.ts`, de D5), `src/styles/**`, `package.json` (y el lockfile), `vite.config.ts`, `playwright.config.ts`, `vitest.config.ts`, `eslint.config.js`, `tsconfig*.json`, `e2e/fixtures.ts`, `e2e/kc.ts`, `e2e/flujos/**`, `e2e/rendimiento/**`, `e2e/paquetes/fundaciones.spec.ts`, `scripts/**`, `public/**`, `index.html`, `vercel.json` y `docs/**`.

Nada de dependencias nuevas sin pedirlas. Ningún constructor hace commit en la rama principal: trabaja en su worktree; el líder fusiona (9.1.2, 9.1.10).

## 12. Cómo pedir cambios compartidos

Si te falta un selector, un comando, un campo, un parámetro de ruta, un `EventoUI`, una pista, una definición de reporte, un texto compartido o un componente de `src/ui`:

1. **No lo hagas fuera de tu carpeta** ni lo dupliques con otra lógica. Resuelve mientras tanto con lo que existe (un selector local que compone, un texto en tu `textos.ts`), sin reimplementar una regla de 6.19–6.20.
2. Pídelo en tu **informe final**, en una sección "Pedidos de cambio compartido", con: archivo, nombre, firma exacta (tipos de parámetros y resultado), por qué lo necesitas, qué hiciste mientras tanto y cómo se prueba.
3. El líder agrupa los pedidos por archivo y los aplica en **una sola** sesión entre oleadas, con las pruebas de fase 2 en verde; actualiza `rutas.ts` primero cuando es un parámetro, evento o pista, y registra el cambio abajo con fecha y paquete solicitante.

## 13. Verde antes de entregar (DoD, 9.1.9)

En tu worktree: `npx tsc -p tsconfig.json --noEmit` sin errores en tus archivos; `npx eslint src/modulos/<m>` (o tu carpeta); `npx vitest run src/modulos/<m>`; tu e2e en 1440 × 900, 1366 × 657 y 1280 × 800 con tu `PORT`; sin errores en consola; crear/editar/eliminar con confirmación; estados vacío, carga y error; español de Colombia; local, moneda y rol respetados; ninguna cifra formateada a mano; ningún color fuera de los tokens; ningún texto por debajo de 12 px; parámetros, eventos y pistas de tu fila cumplidos.

---

## Anexo A. Catálogo de selectores (`@/selectores`)

Generado de `src/selectores/*.ts`. `Id | 'todos'` = un local o todos. Fechas `FechaISO` (`'2026-09-30'`), instantes `FechaHoraISO` (`'2026-09-30T15:30:00'`), meses `MesISO` (`'2026-09'`). Los resultados son tipos exportados del mismo archivo.

| Archivo | Selector | Parámetros | Devuelve |
|---|---|---|---|
| alertas | `selAlertas` | `{ localId: Id \| 'todos'; ahora: FechaHoraISO; descartadas?: readonly string[]; leidas?: readonly string[] }` | `Alerta[]` |
| alertas | `selNotificaciones` | `{ leidas?: readonly string[] }` | `NotificacionVista[]` |
| alertas | `selSolicitudesPendientes` | `void` | `SolicitudAprobacion[]` |
| analisis | `selHechosAnalisis` | `{ hoy: FechaISO }` | `HechoAnalisis[]` |
| analisis | `selPivote` | `OpcionesPivote & { hoy: FechaISO }` | `ResultadoPivote` |
| analisis | `selVentasPorMes` | `{ meses: number; hoy: FechaISO; localId?: Id \| 'todos' }` | `VentasMes[]` |
| analisis | `selMapaCalor` | `{ desde: FechaISO; hasta: FechaISO; localId: Id \| 'todos' }` | `MapaCalor` |
| analisis | `selVentasPorSemana` | `{ semanas: number; hoy: FechaISO; localId: Id \| 'todos' }` | `{ lunes: FechaISO; netas: COP; numVentas: number }[]` |
| analisis | `selMasYMenosVendidos` | `{ desde: FechaISO; hasta: FechaISO; localId: Id \| 'todos'; medida: 'unidades' \| 'valor' \| 'margen'; n: number }` | `{ mas: TopProducto[]; menos: TopProducto[] }` |
| analisis | `selTallasYColores` | `{ categoria: Categoria; desde: FechaISO; hasta: FechaISO }` | `TallasYColores` |
| analisis | `selRotacion` | `{ hoy: FechaISO }` | `{ tienda: DiasInventario; categorias: DiasInventario[] }` |
| analisis | `selDesempenoLocales` | `{ desde: FechaISO; hasta: FechaISO }` | `DesempenoLocal[]` |
| analisis | `selDesempenoVendedores` | `{ desde: FechaISO; hasta: FechaISO }` | `DesempenoVendedor[]` |
| analisis | `selComportamientoClientes` | `{ desde: FechaISO; hasta: FechaISO; hoy: FechaISO }` | `ComportamientoClientes` |
| analisis | `selMediosDePago` | `{ desde: FechaISO; hasta: FechaISO }` | `{ medio: string; valor: COP; proporcion: number }[]` |
| analisis | `selProyeccionMes` | `{ hoy: FechaISO }` | `ProyeccionMes` |
| analisis | `pivotear` | `hechos: readonly HechoAnalisis[], o: OpcionesPivote` | `—` |
| base | `selLocales` | `{ incluirBodega?: boolean } \| void` | `Local[]` |
| base | `selLocalesQueVenden` | `void` | `Local[]` |
| base | `selProductosActivos` | `void` | `Producto[]` |
| base | `selVariantesPorProducto` | `void` | `Record<Id, Variante[]>` |
| base | `selEmpleadosActivos` | `{ fecha: FechaISO }` | `Empleado[]` |
| base | `selClientesActivos` | `void` | `Cliente[]` |
| base | `selIndiceVentasPorCliente` | `void` | `Record<Id, Id[]>` |
| base | `selIndiceVentasPorVendedor` | `void` | `Record<Id, Id[]>` |
| base | `selIndiceVentasPorDia` | `void` | `Record<FechaISO, Id[]>` |
| base | `selTasaVigente` | `{ moneda: Moneda; fecha: FechaISO }` | `number` |
| base | `selUsuario` | `{ rol: Rol }` | `UsuarioDemo \| null` |
| caja | `selSesionAbierta` | `{ localId: Id }` | `SesionCaja \| null` |
| caja | `selResumenSesion` | `{ sesionId: Id }` | `ResumenSesion \| null` |
| caja | `selEfectivoEnCajas` | `{ localId: Id \| 'todos' }` | `{ total: COP; porLocal: Record<Id, COP> }` |
| caja | `selCierresDelDia` | `{ fecha: FechaISO }` | `CierreDelDia[]` |
| caja | `selBonos` | `{ hoy: FechaISO; estado?: BonoConSaldo['estado']; localId?: Id \| 'todos' }` | `BonoConSaldo[]` |
| calendario | `selEventosCalendario` | `{ desde: FechaISO; hasta: FechaISO; tipos?: TipoEvento[]; localId?: Id \| 'todos' }` | `EventoVista[]` |
| calendario | `selProximosEventos` | `{ hoy: FechaISO; n: number; dias?: number }` | `EventoVista[]` |
| catalogo | `selCatalogo` | `FiltroCatalogo` | `FilaCatalogo[]` |
| catalogo | `selProductoPorReferencia` | `{ referencia: string }` | `Producto \| null` |
| catalogo | `selProductoPorSlug` | `{ slug: string }` | `Producto \| null` |
| catalogo | `selMargenProducto` | `{ productoId: Id }` | `MargenProducto \| null` |
| catalogo | `selBuscarProducto` | `{ texto: string; limite?: number }` | `ResultadoBusqueda[]` |
| catalogo | `selVariantePorEan` | `{ ean: string }` | `Variante \| null` |
| clientes | `selMetricasClientes` | `{ hoy: FechaISO }` | `Record<Id, MetricasCliente>` |
| clientes | `selClientes` | `{ hoy: FechaISO; texto?: string; segmento?: Segmento; localId?: Id \| 'todos'; vendedorId?: Id }` | `FilaCliente[]` |
| clientes | `selCliente` | `{ clienteId: Id; hoy: FechaISO }` | `FichaCliente \| null` |
| clientes | `selSegmentos` | `{ hoy: FechaISO }` | `Record<Segmento, number>` |
| clientes | `selCumpleanosMes` | `{ mes: string; hoy: FechaISO }` | `Cumpleanos[]` |
| efectos | `selEfectosVenta` | `antes: EstadoDominio, despues: EstadoDominio, ventaId: Id` | `—` |
| finanzas | `selCuentasPorPagar` | `{ hoy: FechaISO; estado?: EstadoCxP \| 'pendientes'; categoria?: CategoriaCxP; localId?: Id \| 'todos'; desde?: FechaISO; hasta?: FechaISO; proveedorId?: Id; }` | `{ filas: FilaCxP[]; totalCop: COP; vencidoCop: COP }` |
| finanzas | `selCuentasPorCobrar` | `{ hoy: FechaISO; filtro?: 'separados-por-vencer' \| 'vencidos' \| 'credito'; localId?: Id \| 'todos' }` | `{ filas: CuentaPorCobrar[]; saldo: COP }` |
| finanzas | `selSaldosCuentas` | `{ localId?: Id \| 'todos' } \| void` | `{ cuentas: SaldoCuenta[]; total: COP }` |
| finanzas | `selLibroCuenta` | `{ cuentaId: Id; desde?: FechaISO; hasta?: FechaISO }` | `{ filas: MovimientoLibro[]; saldoInicial: COP; saldoFinal: COP }` |
| finanzas | `selPendientesConciliar` | `void` | `PendienteConciliar[]` |
| finanzas | `selConciliacionDatafono` | `{ mes: string; localId: Id \| 'todos' }` | `ConciliacionDatafono` |
| finanzas | `selFlujoProyectado` | `{ dias: number; hoy: FechaISO; hora: string }` | `FlujoProyectado` |
| gastos | `selGastos` | `{ desde?: FechaISO; hasta?: FechaISO; localId?: Id \| 'todos' \| 'general'; categoria?: CategoriaGasto }` | `{ filas: Gasto[]; total: COP; iva: COP }` |
| gastos | `selResumenGastos` | `{ mes: MesISO; localId: Id \| 'todos' }` | `{ categorias: { categoria: CategoriaGasto; actual: COP; anterior: COP; variacion: number \| null }[]; total: COP; totalAnterior: COP }` |
| gastos | `selEstadoResultados` | `{ desde: FechaISO; hasta: FechaISO; localId: Id \| 'todos'; prorratear: boolean }` | `EstadoResultados` |
| gastos | `selPuntoEquilibrio` | `{ localId: Id \| 'todos'; mes: MesISO }` | `{ gastosFijos: COP; margenBruto: number; ventasEquilibrio: COP \| null; ventasNetasMes: COP }` |
| hallazgos | `selHallazgos` | `{ hoy: FechaISO; localId?: Id \| 'todos'; maximo?: number }` | `Hallazgo[]` |
| importaciones | `selImportaciones` | `{ hoy: FechaISO; estado?: EstadoImportacion; proveedorId?: Id; incluirRecibidas?: boolean }` | `FilaImportacion[]` |
| importaciones | `selImportacionPorNumero` | `{ numero: string }` | `Importacion \| null` |
| importaciones | `selCostoAterrizado` | `{ importacionId: Id; hoy: FechaISO; tasaSimulada?: number \| null }` | `CostoAterrizadoVista \| null` |
| importaciones | `selLlegadasProximas` | `{ hoy: FechaISO; dias: number }` | `LlegadaProxima[]` |
| importaciones | `selSugerenciaPedido` | `{ proveedorId: Id; coberturaDias: number; hoy: FechaISO }` | `SugerenciaPedido \| null` |
| importaciones | `selAvisosEstado` | `{ importacionId: Id; estado: EstadoImportacion; marca: string; hora?: string; fecha: FechaISO }` | `AvisosEstado \| null` |
| inicio | `selKpisInicio` | `{ localId: Id \| 'todos'; ahora: FechaHoraISO }` | `KpisInicio` |
| inicio | `selSaludo` | `{ localId: Id \| 'todos'; ahora: FechaHoraISO }` | `DatosSaludo` |
| inicio | `selComparativoLocales` | `{ mes: MesISO; hoy: FechaISO }` | `ComparativoLocal[]` |
| inventario | `selExistencia` | `{ varianteId: Id; localId: Id }` | `number` |
| inventario | `selEnCaminoPorVariante` | `void` | `Record<Id, EnCaminoVariante>` |
| inventario | `selMatrizExistencias` | `{ productoId: Id }` | `MatrizExistencias \| null` |
| inventario | `selKardex` | `{ productoId?: Id; varianteId?: Id; localId?: Id \| 'todos'; desde?: FechaISO; hasta?: FechaISO }` | `{ filas: FilaKardex[]; saldoInicial: number; saldoFinal: number; entradas: number; salidas: number }` |
| inventario | `selStockBajo` | `{ localId: Id \| 'todos' }` | `StockBajo[]` |
| inventario | `selValorizacion` | `{ localId: Id \| 'todos' }` | `Valorizacion` |
| inventario | `selEnTransito` | `void` | `EnTransito` |
| inventario | `selSinMovimiento` | `{ dias: number; hoy: FechaISO }` | `SinMovimiento[]` |
| inventario | `selDiasInventario` | `{ categoria?: Categoria \| null; hoy: FechaISO }` | `DiasInventario` |
| inventario | `selDisponibilidadOtrosLocales` | `{ varianteId: Id }` | `Record<Id, number>` |
| inventario | `selTraslados` | `{ estado?: Traslado['estado']; localId?: Id \| 'todos' }` | `Traslado[]` |
| narrativa | `selNarrativa` | `{ hoy: FechaISO }` | `NarrativaDinamica` |
| nomina | `selPeriodoAbierto` | `{ hoy: FechaISO }` | `{ quincenal: PeriodoNomina \| null; mensual: PeriodoNomina \| null }` |
| nomina | `selVistaPreviaNomina` | `{ periodo: PeriodoNomina; exoneracion: boolean; ahora: FechaHoraISO }` | `VistaPreviaNomina` |
| nomina | `selCostoEmpleado` | `{ empleadoId: Id; modo: ModoCosto; exoneracion: boolean; hoy: FechaISO; ahora?: FechaHoraISO; simularPrestacion?: boolean }` | `CostoEmpleado \| null` |
| nomina | `selComparativoModalidades` | `{ valorMensual: COP; exoneracion: boolean; fecha: FechaISO; riesgoArl?: 1 \| 2 \| 3 \| 4 \| 5 }` | `ComparativoModalidades` |
| nomina | `selCostoNominaPorLocal` | `{ mes: MesISO }` | `{ locales: CostoNominaLocal[]; total: COP }` |
| nomina | `selLiquidacion` | `{ liquidacionId: Id }` | `LiquidacionNomina \| null` |
| nomina | `selLiquidaciones` | `void` | `LiquidacionNomina[]` |
| personal | `selEmpleadoPorSlug` | `{ slug: string }` | `Empleado \| null` |
| personal | `selContratoVigente` | `{ empleadoId: Id; fecha: FechaISO }` | `Contrato \| null` |
| personal | `selComisiones` | `{ mes: MesISO; hoy: FechaISO; empleadoId?: Id }` | `ComisionEmpleado[]` |
| personal | `selAsistencia` | `{ desde: FechaISO; hasta: FechaISO; ahora: FechaHoraISO; empleadoId?: Id; localId?: Id \| 'todos' }` | `{ dias: AsistenciaDia[]; resumen: ResumenAsistencia[] }` |
| personal | `selHorasSemana` | `{ empleadoId: Id; lunes: FechaISO }` | `{ horas: number; maximo: number; exceso: number; turnos: Turno[] }` |
| personal | `selTurnosSemana` | `{ localId: Id; lunes: FechaISO }` | `SemanaTurnos` |
| personal | `selMiDia` | `{ empleadoId: Id; ahora: FechaHoraISO }` | `MiDia` |
| personal | `selRiesgosContratacion` | `{ hoy: FechaISO }` | `RiesgoContratacion[]` |
| personal | `selRecargosTurnos` | `{ localId: Id; lunes: FechaISO }` | `{ empleados: RecargoEmpleado[]; total: COP }` |
| personal | `selLiquidacionFinal` | `{ empleadoId: Id; fecha: FechaISO }` | `LiquidacionFinal \| null` |
| proveedores | `selProveedores` | `{ hoy: FechaISO; tipo?: Proveedor['tipo']; localId?: Id \| 'todos'; texto?: string }` | `FilaProveedor[]` |
| proveedores | `selFichaProveedor` | `{ proveedorId: Id; hoy: FechaISO }` | `FichaProveedor \| null` |
| proveedores | `selComparativoFabricas` | `{ hoy: FechaISO }` | `FilaComparativoFabrica[]` |
| ventas | `hechosEnFechas` | `Rango` | `HechoVenta[]` |
| ventas | `hechosDeVenta` | `void` | `HechoVenta[]` |
| ventas | `selResumenVentas` | `Rango & { localId: Id \| 'todos' }` | `ResumenVentas` |
| ventas | `selDevolucionesPorVenta` | `void` | `Record<Id, Devolucion[]>` |
| ventas | `selVentas` | `FiltroVentas` | `{ filas: FilaVenta[]; totales: ResumenVentas }` |
| ventas | `selVentaDetalle` | `{ ventaId: Id }` | `DetalleVenta \| null` |
| ventas | `selVentasPorDia` | `Rango & { localId: Id \| 'todos'; porLocal?: boolean }` | `VentasDia[]` |
| ventas | `selVentasHoyHastaHora` | `{ hoy: FechaISO; ahora: FechaHoraISO; localId: Id \| 'todos' }` | `VentasHastaHora` |
| ventas | `selTopProductos` | `Rango & { localId: Id \| 'todos'; n: number; medida: 'unidades' \| 'valor' \| 'margen'; orden?: 'mas' \| 'menos' }` | `TopProducto[]` |
| ventas | `hechosEnRango` | `hechos: readonly HechoVenta[], desde: FechaISO, hasta: FechaISO, localId: Id \| 'todos' = 'todos',` | `—` |

Funciones auxiliares (no son hooks): `selEfectosVenta(antes, despues, ventaId)` (W1), `pivotear(hechos, opciones)` (D2, totales no aditivos recalculados), `hechosEnRango(...)`, `nombreCliente`, `nombreEmpleado` (`src/selectores/texto.ts`), `crearSelector`, `activarVerificacionDeTablas`, `claveParams` (`memo.ts`).

## Anexo B. Acciones (`useAcciones()`)

Comando del catálogo 6.21 → nombre de la acción. Datos: `MapaComandos['<comando>']` en `src/dominio/tipos/comandos.ts`, con los IDs nuevos opcionales (`EntradaAccion` en `src/estado/acciones.ts`).

| Comando | Acción |
|---|---|
| `producto.crear` | `crearProducto` |
| `producto.editar` | `editarProducto` |
| `producto.eliminar` | `eliminarProducto` |
| `variante.agregar` | `agregarVariante` |
| `variante.eliminar` | `eliminarVariante` |
| `color.crear` | `crearColor` |
| `inventario.ajustar` | `ajustarInventario` |
| `traslado.solicitar` | `solicitarTraslado` |
| `traslado.despachar` | `despacharTraslado` |
| `traslado.recibir` | `recibirTraslado` |
| `traslado.cancelar` | `cancelarTraslado` |
| `conteo.iniciar` | `iniciarConteo` |
| `conteo.guardar` | `guardarConteo` |
| `conteo.aplicar` | `aplicarConteo` |
| `conteo.cancelar` | `cancelarConteo` |
| `caja.abrir` | `abrirCaja` |
| `caja.egreso` | `registrarEgresoCaja` |
| `caja.cerrar` | `cerrarCaja` |
| `caja.revisarCierre` | `revisarCierre` |
| `venta.registrar` | `registrarVenta` |
| `venta.editar` | `editarVenta` |
| `venta.anular` | `anularVenta` |
| `venta.abonar` | `abonarVenta` |
| `separado.cancelar` | `cancelarSeparado` |
| `devolucion.registrar` | `registrarDevolucion` |
| `pago.conciliar` | `conciliarPagos` |
| `aprobacion.solicitar` | `solicitarAprobacion` |
| `bono.vender` | `venderBono` |
| `datafono.registrarAbono` | `registrarAbonoDatafono` |
| `aprobacion.resolver` | `resolverAprobacion` |
| `cliente.crear` | `crearCliente` |
| `cliente.editar` | `editarCliente` |
| `cliente.eliminar` | `eliminarCliente` |
| `cliente.nota` | `agregarNotaCliente` |
| `mensaje.registrar` | `registrarMensajes` |
| `proveedor.crear` | `crearProveedor` |
| `proveedor.editar` | `editarProveedor` |
| `proveedor.eliminar` | `eliminarProveedor` |
| `contacto.crear` | `crearContacto` |
| `contacto.editar` | `editarContacto` |
| `contacto.eliminar` | `eliminarContacto` |
| `importacion.crear` | `crearImportacion` |
| `importacion.editar` | `editarImportacion` |
| `importacion.eliminar` | `eliminarImportacion` |
| `importacion.cambiarEstado` | `cambiarEstadoImportacion` |
| `importacion.actualizarHitos` | `actualizarHitosImportacion` |
| `importacion.actualizarCostos` | `actualizarCostosImportacion` |
| `importacion.aplicarCostos` | `aplicarCostosImportacion` |
| `importacion.registrarPago` | `registrarPagoImportacion` |
| `importacion.documento` | `registrarDocumentoImportacion` |
| `importacion.recibir` | `recibirImportacion` |
| `cxp.crear` | `crearCuentaPorPagar` |
| `cxp.editar` | `editarCuentaPorPagar` |
| `cxp.eliminar` | `eliminarCuentaPorPagar` |
| `cxp.programar` | `programarCuentaPorPagar` |
| `cxp.pagar` | `pagarCuentaPorPagar` |
| `cuenta.crear` | `crearCuenta` |
| `cuenta.editar` | `editarCuenta` |
| `cuenta.transferir` | `transferirEntreCuentas` |
| `cuenta.movimiento` | `registrarMovimientoCuenta` |
| `gasto.registrar` | `registrarGasto` |
| `gasto.editar` | `editarGasto` |
| `gasto.eliminar` | `eliminarGasto` |
| `gastoRecurrente.crear` | `crearGastoRecurrente` |
| `gastoRecurrente.editar` | `editarGastoRecurrente` |
| `gastoRecurrente.eliminar` | `eliminarGastoRecurrente` |
| `gastoRecurrente.generarMes` | `generarGastosRecurrentesMes` |
| `empleado.crear` | `crearEmpleado` |
| `empleado.editar` | `editarEmpleado` |
| `empleado.retirar` | `retirarEmpleado` |
| `contrato.reemplazar` | `reemplazarContrato` |
| `esquemaComision.crear` | `crearEsquemaComision` |
| `esquemaComision.editar` | `editarEsquemaComision` |
| `esquemaComision.eliminar` | `eliminarEsquemaComision` |
| `meta.fijar` | `fijarMeta` |
| `turno.asignar` | `asignarTurno` |
| `turno.mover` | `moverTurno` |
| `turno.eliminar` | `eliminarTurno` |
| `turno.copiarSemana` | `copiarSemanaTurnos` |
| `marcacion.registrar` | `registrarMarcacion` |
| `marcacion.corregir` | `corregirMarcacion` |
| `marcacion.eliminar` | `eliminarMarcacion` |
| `novedad.registrar` | `registrarNovedad` |
| `novedad.editar` | `editarNovedad` |
| `novedad.eliminar` | `eliminarNovedad` |
| `pila.verificar` | `verificarPila` |
| `nomina.aprobar` | `aprobarNomina` |
| `nomina.pagar` | `pagarNomina` |
| `nomina.anularAprobacion` | `anularAprobacionNomina` |
| `evento.crear` | `crearEvento` |
| `evento.editar` | `editarEvento` |
| `evento.eliminar` | `eliminarEvento` |
| `factura.emitir` | `emitirFactura` |
| `factura.avanzarEstado` | `avanzarEstadoFactura` |
| `notaCredito.emitir` | `emitirNotaCredito` |
| `empresa.editar` | `editarEmpresa` |
| `local.crear` | `crearLocal` |
| `local.editar` | `editarLocal` |
| `local.eliminar` | `eliminarLocal` |
| `tasa.registrar` | `registrarTasa` |
| `tasa.editar` | `editarTasa` |
| `tasa.eliminar` | `eliminarTasa` |
| `parametros.editar` | `editarParametros` |
| `resolucion.editar` | `editarResolucion` |
| `usuario.crear` | `crearUsuario` |
| `usuario.editar` | `editarUsuario` |
| `usuario.eliminar` | `eliminarUsuario` |

---

## Registro de cambios

| Fecha | Cambio | Pedido por |
|---|---|---|
| 01/10/2026 | Versión inicial (F2-B): API de estado, 106 rutas, 15 `EventoUI`, 23 pistas, 13 reportes y 5 plantillas PDF, puertos por paquete | F2-B |
