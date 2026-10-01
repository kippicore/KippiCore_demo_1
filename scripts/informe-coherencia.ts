/**
 * Informe de coherencia del generador (PLAN 7.14): tabla legible de los invariantes de 6.19 contra los hechos,
 * de la narrativa N1–N16 y de los patrones P1–P22 con sus cifras. Es lo primero que corre el `auditor-datos`.
 *
 *   npx tsx scripts/informe-coherencia.ts
 *   npx tsx scripts/informe-coherencia.ts --ancla 2026-12-19 --hora 21:30 --escala 1.5
 *
 * Sale con código 1 si algún invariante falla o hay comandos generados omitidos.
 */
import { CONFIG } from '@/config';
import { crearPlan, generarEstado } from '@/generador';
import { auditarCoherencia } from '@/generador/auditoria/coherencia';
import { auditarNarrativa } from '@/generador/auditoria/narrativa';
import { medirPatrones } from '@/generador/auditoria/patrones';
import { PENDIENTES_CALIBRACION } from '@/generador/auditoria/calibracion';

function arg(nombre: string, porDefecto: string): string {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 && process.argv[i + 1] ? (process.argv[i + 1] as string) : porDefecto;
}

const ancla = arg('ancla', CONFIG.demo.hoyQa.slice(0, 10));
const hora = arg('hora', CONFIG.demo.hoyQa.slice(11, 16));
const escala = Number(arg('escala', String(CONFIG.demo.escala)));
const ahora = `${ancla}T${hora}:00`;

const estado = generarEstado({ ancla, ahora, escala });
const { plan } = crearPlan({ ancla, escala });

console.log(`Informe de coherencia · ancla ${ancla} · ahora ${ahora} · escala ${escala}`);
console.log('');
console.log('Invariantes (6.19) contra los hechos');
console.log(`  ${'Regla'.padEnd(7)} ${'Revisados'.padStart(9)} ${'Fallas'.padStart(7)}  Descripción`);
const filas = auditarCoherencia(estado, ahora);
for (const f of filas) {
  console.log(`  ${f.regla.padEnd(7)} ${String(f.revisados).padStart(9)} ${String(f.violaciones).padStart(7)}  ${f.descripcion}${f.ejemplo ? ` · ej.: ${f.ejemplo}` : ''}`);
}
const fallas = filas.reduce((a, f) => a + f.violaciones, 0);
console.log('');
console.log('Narrativa N1–N16 al ancla');
const narrativa = auditarNarrativa(estado, ancla, ahora, plan);
console.log(narrativa.length ? narrativa.map((x) => `  ✗ ${x}`).join('\n') : '  Todo en verde.');
console.log('');
console.log('Patrones P1–P22 (ok · pend. = pendiente de la pista de calibración · FUERA)');
for (const x of medirPatrones(estado, ancla, plan, hora)) {
  const e = x.ok ? 'ok   ' : PENDIENTES_CALIBRACION[x.id] ? 'pend.' : 'FUERA';
  const objetivo = x.criterio === 'rango' ? `${x.rango?.[0]}–${x.rango?.[1]}` : `${x.objetivo}${x.criterio === 'relativa' ? ` ± ${Math.round(x.tolerancia * 100)} %` : ''}`;
  console.log(`  ${e} ${x.id.padEnd(20)} ${String(x.valor).padStart(12)}  objetivo ${objetivo.padEnd(22)} ${x.nombre}${x.detalle ? ` · ${x.detalle}` : ''}`);
}
console.log('');
console.log(`Comandos generados omitidos: ${estado.meta.omitidosGenerador} · fallas de invariantes: ${fallas} · narrativa: ${narrativa.length}`);
if (fallas > 0 || estado.meta.omitidosGenerador > 0) process.exitCode = 1;
