import type { CanalPreferido, DatosCliente, FechaISO, Id, OrigenCliente } from '@/dominio/tipos';
import {
  APELLIDOS,
  BARRIOS_BOGOTA,
  DOMINIOS_CORREO,
  NOMBRES_HOMBRE,
  NOMBRES_MUJER,
  PREFIJOS_CELULAR,
} from '@/seed/nombres';
import { TIPOS_LATENTES_CLIENTES } from '@/seed/clientes';
import { CLIENTES_GUION } from '@/seed/elenco';
import { DEMANDA_TALLAS } from '@/seed/tallas';
import { COLORES } from '@/seed/colores';
import { CLIENTES } from '@/config/demo';
import type { TurnoPlantilla } from '@/config/turnos';
import { diferenciaDias } from '@/dominio/reglas/fechas';
import { normalizar } from '@/dominio/reglas/texto';
import { masDias } from './calendario';
import { rngPlan, type Rng } from './prng';
import type { ClientePlan, TipoLatente } from './tipos';

/**
 * Clientes generados (PLAN 7.7, P11): ≈ 450 × escala, con nombres colombianos, celular 3XX válido y único,
 * correo en dominios .example (R14), tallas latentes, local habitual, alta y tipo latente con su frecuencia.
 * Puro: sale del plan, no del estado.
 */

const DIAS_VENTANA_REF = 578;

function elegirTalla(rng: Rng, curva: keyof typeof DEMANDA_TALLAS): string {
  const d = DEMANDA_TALLAS[curva];
  const tallas = Object.keys(d);
  return tallas[rng.elegirPonderado(tallas.map((t) => d[t] ?? 0))] ?? tallas[0] ?? 'M';
}

function dos(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export interface EntradaClientes {
  semilla: string;
  ancla: FechaISO;
  inicio: FechaISO;
  escala: number;
  plantilla: readonly TurnoPlantilla[];
}

export function planClientes(e: EntradaClientes): ClientePlan[] {
  const rngGlobal = rngPlan(e.semilla, 'plan:clientes');
  const total = Math.max(20, Math.round(CLIENTES.clientesObjetivo * e.escala)) - CLIENTES_GUION.length;
  // Cantidad por tipo latente (redondeo con el residuo al tipo más grande).
  const cuotas = TIPOS_LATENTES_CLIENTES.map((t) => Math.floor(total * t.proporcion));
  const resto = total - cuotas.reduce((a, x) => a + x, 0);
  cuotas[2] = (cuotas[2] ?? 0) + resto;
  const tipos: TipoLatente[] = [];
  TIPOS_LATENTES_CLIENTES.forEach((t, i) => {
    for (let k = 0; k < (cuotas[i] ?? 0); k++) tipos.push(t.id);
  });
  const orden = rngGlobal.barajar(tipos);
  const celulares = new Set<string>(CLIENTES_GUION.map((c) => c.datos.celular));
  const documentos = new Set<string>(CLIENTES_GUION.map((c) => c.datos.documento?.numero ?? ''));
  const vendedoresPorLocal = new Map<Id, Id[]>();
  for (const t of e.plantilla) {
    if (t.localId === 'bod') continue;
    const l = vendedoresPorLocal.get(t.localId) ?? [];
    if (!l.includes(t.empleadoId) && t.empleadoId !== 'em_lsmendez') l.push(t.empleadoId);
    vendedoresPorLocal.set(t.localId, l);
  }
  const r: ClientePlan[] = [];
  orden.forEach((tipo, i) => {
    const rng = rngPlan(e.semilla, `cliente:${i}`);
    const latente = TIPOS_LATENTES_CLIENTES.find((t) => t.id === tipo) ?? TIPOS_LATENTES_CLIENTES[2];
    if (!latente) return;
    const mujer = rng.chance(0.12);
    const nombres = rng.elegir(mujer ? NOMBRES_MUJER : NOMBRES_HOMBRE);
    const apellidos = `${rng.elegir(APELLIDOS)} ${rng.elegir(APELLIDOS)}`;
    let celular = '';
    do celular = `${rng.elegir(PREFIJOS_CELULAR)}${String(rng.entero(1_000_000, 9_999_999))}`;
    while (celulares.has(celular));
    celulares.add(celular);
    let documento = '';
    do documento = String(rng.entero(10_000_000, 1_099_999_999));
    while (documentos.has(documento));
    documentos.add(documento);
    const base = normalizar(`${nombres.split(' ')[0] ?? nombres}.${apellidos.split(' ')[0] ?? ''}`).replace(
      /[^a-z.]/g,
      '',
    );
    const correo = rng.chance(0.8) ? `${base}${rng.entero(1, 99)}@${rng.elegir(DOMINIOS_CORREO)}` : null;
    // Local habitual: VIP más en Parque 93 (P1, P11).
    const pesosLocal = tipo === 'vip' || tipo === 'en_riesgo_alto' ? [0.6, 0.15, 0.25] : [0.33, 0.22, 0.45];
    const localHabitual = (['p93', 'usq', 'zr'] as const)[rng.elegirPonderado(pesosLocal)] ?? 'zr';
    // Fechas: alta, actividad y abandono.
    let alta: FechaISO;
    let activoHasta: FechaISO | null = null;
    if (latente.altaUltimosDias) alta = masDias(e.ancla, -rng.entero(2, latente.altaUltimosDias));
    else if (latente.abandonoDias) {
      activoHasta = masDias(e.ancla, -rng.entero(...latente.abandonoDias));
      alta = masDias(activoHasta, -rng.entero(150, 900));
    } else alta = masDias(e.ancla, -rng.entero(75, 1100));
    let activoDesde = alta > e.inicio ? alta : e.inicio;
    // Los ocasionales compran de vez en cuando, pero sus 1–3 compras caen en los últimos meses (P11: si no,
    // casi todos quedarían "en riesgo" con la regla de 90 días).
    if (tipo === 'ocasional') {
      const reciente = masDias(e.ancla, -240);
      if (activoDesde < reciente) activoDesde = reciente;
    }
    const compras = rng.entero(...latente.compras18m);
    // Las compras de los tipos latentes son para la ventana completa; quien llegó después compra en proporción.
    const diasRef = Math.min(DIAS_VENTANA_REF, Math.max(30, diferenciaDias(activoDesde, activoHasta ?? e.ancla)));
    const completa = latente.altaUltimosDias !== null || tipo === 'ocasional';
    const tasa = (compras * (completa ? 1 : diasRef / DIAS_VENTANA_REF)) / Math.max(30, diasRef);
    const mes = rng.entero(1, 12);
    const diaNac = rng.entero(1, mes === 2 ? 28 : 30);
    const canalAlta: OrigenCliente = (['pos', 'whatsapp', 'instagram', 'web'] as const)[
      rng.elegirPonderado([0.85, 0.07, 0.05, 0.03])
    ] as OrigenCliente;
    const canalPreferido: CanalPreferido = (['whatsapp', 'instagram', 'correo', 'llamada'] as const)[
      rng.elegirPonderado([0.7, 0.15, correo ? 0.1 : 0, 0.05])
    ] as CanalPreferido;
    const tallas = {
      superior: elegirTalla(rng, 'superior'),
      pantalon: elegirTalla(rng, 'pantalon'),
      calzado: elegirTalla(rng, 'calzado'),
      sastreria: elegirTalla(rng, 'sastreria'),
    };
    const altaTs = `${alta}T${dos(rng.entero(10, 18))}:${dos(rng.entero(0, 59))}:00`;
    const vendedores = vendedoresPorLocal.get(localHabitual) ?? [];
    const datos: DatosCliente = {
      nombres,
      apellidos,
      documento: rng.chance(0.75) ? { tipo: 'CC', numero: documento } : null,
      celular,
      correo,
      cumpleanos: `${dos(mes)}-${dos(diaNac)}`,
      anioNacimiento: rng.entero(1958, 2003),
      barrio: rng.elegir(BARRIOS_BOGOTA),
      canalPreferido,
      tratamiento: latente.tratamiento,
      autorizacionDatos: { aceptada: true, fecha: altaTs, canal: canalAlta },
      tallasDeclaradas: rng.chance(0.6) ? { camisa: tallas.superior, pantalon: tallas.pantalon } : {},
      canalAlta,
      localRegistroId: localHabitual,
      registradoPorId: vendedores.length ? rng.elegir(vendedores) : null,
    };
    r.push({
      id: `cl_g_${String(i + 1).padStart(4, '0')}`,
      tipo,
      datos,
      alta: altaTs,
      activoDesde,
      activoHasta,
      tasa,
      localHabitual,
      tallas,
      colorFavorito: rng.elegir(COLORES).id,
    });
  });
  return r;
}
