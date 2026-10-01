import type {
  DatosPago,
  EstadoDominio,
  FechaHoraISO,
  Id,
  MapaComandos,
  SobreComando,
  TipoComando,
} from '../tipos';
import type { Actor } from '@/config/permisos';
import { estadoInicial } from '../motor/estado-inicial';
import { aplicarConEventos } from '../motor/aplicar';
import { existencia } from '../comandos/tx';

/** Utilidades de prueba del dominio (no se usan en la app). */
export const ANCLA = '2026-09-30';
export const TS = '2026-09-30T15:30:00';

export function nuevoEstado(): EstadoDominio {
  return estadoInicial({ semilla: 'PRUEBA', ancla: ANCLA });
}

let contador = 0;

export function sobre<K extends TipoComando>(
  tipo: K,
  datos: MapaComandos[K],
  o: { rol?: Actor; ts?: FechaHoraISO; usuarioId?: Id; generado?: boolean } = {},
): SobreComando {
  const rol = o.rol ?? 'dueno';
  const usuarioId =
    o.usuarioId ??
    (rol === 'vendedor'
      ? 'u_vendedor'
      : rol === 'bodega'
        ? 'u_bodega'
        : rol === 'sistema'
          ? 'sistema'
          : rol === 'portal'
            ? 'portal-aduanas'
            : 'u_dueno');
  const ts = o.ts ?? TS;
  contador += 1;
  return {
    id: `en_prueba_${contador}`,
    ts,
    marcaAgua: ts,
    usuarioId,
    rol,
    origen: o.generado || rol === 'sistema' ? 'generado' : 'usuario',
    comando: { tipo, datos } as SobreComando['comando'],
  };
}

/** Aplica en modo construcción con eventos; lanza si falla (para preparar escenarios). */
export function hacer<K extends TipoComando>(
  estado: EstadoDominio,
  tipo: K,
  datos: MapaComandos[K],
  o: Parameters<typeof sobre>[2] = {},
) {
  const r = aplicarConEventos(estado, sobre(tipo, datos, o));
  if (!r.ok) throw new Error(`${tipo}: ${r.error.codigo} · ${r.error.mensaje}`);
  return r.eventos;
}

/** Intenta aplicar y devuelve el resultado (para probar errores). */
export function intentar<K extends TipoComando>(
  estado: EstadoDominio,
  tipo: K,
  datos: MapaComandos[K],
  o: Parameters<typeof sobre>[2] = {},
) {
  return aplicarConEventos(estado, sobre(tipo, datos, o));
}

let ajustes = 0;
/** Deja `cantidad` unidades de una variante en un local con un ajuste documentado. */
export function abastecer(estado: EstadoDominio, varianteId: Id, localId: Id, cantidad: number): void {
  ajustes += 1;
  hacer(estado, 'inventario.ajustar', {
    movimientoId: `mv_prueba_${ajustes}`,
    varianteId,
    localId,
    nuevaCantidad: existencia(estado, varianteId, localId) + cantidad,
    motivo: 'hallazgo',
    nota: 'Prueba',
  });
}

export function abrirCaja(
  estado: EstadoDominio,
  localId: Id,
  sesionId = `sc_${localId}`,
  ts = '2026-09-30T09:40:00',
): Id {
  hacer(estado, 'caja.abrir', { sesionId, localId, baseInicial: 300_000, por: null }, { ts });
  return sesionId;
}

export function pago(medio: DatosPago['medio'], valor: number, extra: Partial<DatosPago> = {}): DatosPago {
  return { medio, valor, recibido: null, referencia: null, sesionCajaId: null, bonoId: null, ...extra };
}

export const OXFORD_M_AZC = 'va_cam_0142_azc_m';
export const CHINO_ARENA_32 = 'va_pan_0305_are_32';
export const BLAZER_AZN_50 = 'va_blz_0401_azn_50';

/** Datos base de una venta de contado en Usaquén (vendida por el dueño a nombre de Sebastián). */
export function datosVenta(
  ventaId: Id,
  o: Partial<MapaComandos['venta.registrar']> = {},
): MapaComandos['venta.registrar'] {
  return {
    ventaId,
    ts: null,
    localId: 'usq',
    vendedorId: 'em_scardenas',
    canal: 'local',
    tipo: 'contado',
    clienteId: null,
    clienteNuevo: null,
    lineas: [{ varianteId: CHINO_ARENA_32, cantidad: 1, precioLista: null, descuento: null }],
    descuentoGlobal: null,
    aprobacionDescuentoId: null,
    pagos: [pago('datafono_debito', 199_900)],
    fechaLimiteSeparado: null,
    ventaOrigenCambioId: null,
    facturaInmediata: null,
    nota: null,
    ...o,
  };
}

/** Serialización estable para comparar estados en profundidad. */
export function huella(estado: EstadoDominio): string {
  return JSON.stringify(estado);
}
