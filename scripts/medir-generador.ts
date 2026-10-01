/**
 * Medición del generador (PLAN 7.1, 7.14): tiempo de construcción de 18 meses por etapa y por tipo de intención,
 * volúmenes generados, comandos omitidos y huella del estado.
 *
 *   npm run medir                         (ancla de QA, escala de config/demo.ts)
 *   npm run medir -- --ancla 2026-12-19 --hora 20:30 --escala 1.5 --repeticiones 5
 *
 * La primera repetición es la que importa (en el navegador el worker arranca en frío); las siguientes muestran
 * el tiempo con el JIT caliente.
 */
import { performance } from 'node:perf_hooks';
import { CONFIG } from '@/config';
import { generarEstado, hashEstado, type Medidor } from '@/generador';

function arg(nombre: string, porDefecto: string): string {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 && process.argv[i + 1] ? (process.argv[i + 1] as string) : porDefecto;
}

const ancla = arg('ancla', CONFIG.demo.hoyQa.slice(0, 10));
const hora = arg('hora', CONFIG.demo.hoyQa.slice(11, 16));
const escala = Number(arg('escala', String(CONFIG.demo.escala)));
const repeticiones = Number(arg('repeticiones', '3'));
const ahora = `${ancla}T${hora}:00`;

const tiempos: number[] = [];
let porTipo = new Map<string, number>();
let estado: ReturnType<typeof generarEstado> | null = null;
for (let i = 0; i < repeticiones; i++) {
  const m = new Map<string, number>();
  const medidor: Medidor = {
    reloj: () => performance.now(),
    registrar: (tipo, ms) => m.set(tipo, (m.get(tipo) ?? 0) + ms),
  };
  const t0 = performance.now();
  estado = generarEstado({ ancla, ahora, escala }, i === 0 ? medidor : undefined);
  tiempos.push(performance.now() - t0);
  if (i === 0) porTipo = m;
}
if (!estado) throw new Error('Sin estado');
const e = estado;

const ms = (x: number) => `${Math.round(x)} ms`;
console.log(`Generador KippiCore · ancla ${ancla} · ahora ${ahora} · escala ${escala}`);
console.log(`Construcción (en frío): ${ms(tiempos[0] ?? 0)}${tiempos.length > 1 ? ` · siguientes: ${tiempos.slice(1).map(ms).join(', ')}` : ''}`);
console.log('');
console.log('Tiempo por etapa (primera construcción, incluye aplicar los comandos de cada intención):');
const filas = [...porTipo.entries()].sort((a, b) => b[1] - a[1]);
const suma = filas.reduce((a, [, x]) => a + x, 0);
for (const [tipo, x] of filas) console.log(`  ${tipo.padEnd(20)} ${ms(x).padStart(8)}`);
console.log(`  ${'motor y resto'.padEnd(20)} ${ms((tiempos[0] ?? 0) - suma).padStart(8)}`);

const lineas = Object.values(e.ventas).reduce((a, v) => a + v.lineas.length, 0);
const conCliente = Object.values(e.ventas).filter((v) => v.clienteId).length;
let objetos = e.movimientos.length + e.mensajes.length;
for (const [k, v] of Object.entries(e)) if (k !== 'meta' && k !== 'agregados' && v && typeof v === 'object' && !Array.isArray(v)) objetos += Object.keys(v).length;
console.log('');
console.log('Volúmenes:');
const vol: [string, number | string][] = [
  ['ventas', Object.keys(e.ventas).length],
  ['líneas de venta', lineas],
  ['ventas con cliente', `${conCliente} (${Math.round((conCliente / Math.max(1, Object.keys(e.ventas).length)) * 100)} %)`],
  ['clientes', Object.keys(e.clientes).length],
  ['devoluciones', Object.keys(e.devoluciones).length],
  ['bonos de regalo', Object.keys(e.bonos).length],
  ['movimientos de inventario', e.movimientos.length],
  ['traslados', Object.keys(e.traslados).length],
  ['importaciones', Object.keys(e.importaciones).length],
  ['sesiones de caja', Object.keys(e.sesionesCaja).length],
  ['abonos del datáfono', Object.keys(e.abonosDatafono).length],
  ['movimientos de cuenta', Object.keys(e.movimientosCuenta).length],
  ['cuentas por pagar', Object.keys(e.cuentasPorPagar).length],
  ['gastos', Object.keys(e.gastos).length],
  ['liquidaciones de nómina', Object.keys(e.liquidaciones).length],
  ['turnos', Object.keys(e.turnos).length],
  ['marcaciones', Object.keys(e.marcaciones).length],
  ['facturas y documentos POS', Object.keys(e.facturas).length],
  ['objetos en total', objetos],
];
for (const [k, v] of vol) console.log(`  ${k.padEnd(28)} ${String(v).padStart(10)}`);
console.log('');
console.log(`Comandos generados omitidos: ${e.meta.omitidosGenerador}`);
const t0 = performance.now();
const json = JSON.stringify(e);
console.log(`Estado serializado: ${(json.length / 1_048_576).toFixed(1)} MB (JSON.stringify en ${ms(performance.now() - t0)})`);
console.log(`Huella: ${hashEstado(e)}`);
if (e.meta.omitidosGenerador > 0) process.exitCode = 1;
