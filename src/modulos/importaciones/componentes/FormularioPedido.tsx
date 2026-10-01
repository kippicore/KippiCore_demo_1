import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FechaISO, Id, Importacion, MonedaExtranjera } from '@/dominio/tipos';
import { PREFIJOS } from '@/dominio/motor/ids';
import { indiceEstado } from '@/dominio/reglas/importaciones';
import { copDeCentavos } from '@/dominio/reglas/dinero';
import { nuevoId, useAcciones, useHoy, useSel } from '@/estado';
import { entero, numero, unidades as textoUnidades } from '@/lib/formato';
import { dineroOrigen } from '@/lib/moneda';
import { selProveedores, selTasaVigente } from '@/selectores';
import {
  Button,
  Checkbox,
  Dinero,
  GrupoRadio,
  InputNumero,
  Segmentado,
  Select,
  SelectorFecha,
  Stepper,
  Textarea,
} from '@/ui';
import { selCatalogoPedido, selContactosCadena, selDefectosPedido } from '../selectores';
import { ETIQUETAS_CARGA, ETIQUETAS_ROL_CONTACTO } from '../textos';
import {
  claveLinea,
  EditorLineas,
  fobBorradorCentavos,
  unidadesBorrador,
  type LineaBorrador,
} from './EditorLineas';

/**
 * Crear y editar un pedido a China (PRD 7.5): fábrica, moneda, tasa, tipo de carga (consolidada en m³ por defecto,
 * contenedor o aérea), puertos, líneas por referencia y variante con precio de fábrica en la moneda de origen, y los
 * contactos de la cadena. Tres pasos con validación del dominio junto a cada campo.
 *
 * Los valores parten del pedido (al editar) o del último pedido a la fábrica (al crear); lo que la persona toca
 * queda guardado como "ajuste" y se impone sobre lo de partida.
 */
const PUERTOS_ORIGEN = ['Shenzhen (Yantian)', 'Guangzhou (Nansha)', 'Ningbo', 'Shanghái'];
const PASOS = [{ nombre: 'Fábrica y carga' }, { nombre: 'Prendas' }, { nombre: 'Cadena y revisión' }];

type TipoCarga = Importacion['carga']['tipo'];

interface Ajustes {
  moneda?: MonedaExtranjera;
  tasa?: number | null;
  fechaPedido?: FechaISO;
  tipoCarga?: TipoCarga;
  m3?: number | null;
  pies?: 20 | 40;
  kg?: number | null;
  puertoOrigen?: string;
  puertoDestino?: Importacion['puertoDestino'];
  contactoIds?: Id[];
  nota?: string;
}

function lineasDeImportacion(imp: Importacion): LineaBorrador[] {
  return imp.lineas.map((l) => ({
    clave: claveLinea(),
    productoId: l.productoId,
    fob: l.costoUnitarioOrigen / 100,
    cantidades: { ...l.cantidades },
  }));
}

export function FormularioPedido({
  imp,
  alTerminar,
  alCancelar,
  proveedorInicial,
}: {
  imp?: Importacion;
  alTerminar: (numero: string) => void;
  alCancelar: () => void;
  proveedorInicial?: Id | null;
}) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const editando = !!imp;
  const fabricas = useSel(selProveedores, { hoy, tipo: 'fabrica' });
  const contactos = useSel(selContactosCadena);

  const [paso, setPaso] = useState(0);
  const [proveedorId, setProveedorId] = useState<Id | null>(imp?.proveedorId ?? proveedorInicial ?? null);
  const [ajustes, setAjustes] = useState<Ajustes>({});
  const [lineas, setLineas] = useState<LineaBorrador[]>(() => (imp ? lineasDeImportacion(imp) : []));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const defectos = useSel(selDefectosPedido, { proveedorId: proveedorId ?? '' });
  const catalogo = useSel(selCatalogoPedido, { proveedorId });
  const ajustar = (p: Partial<Ajustes>) => {
    setAjustes((a) => ({ ...a, ...p }));
    setErrores({});
  };

  const moneda: MonedaExtranjera = ajustes.moneda ?? imp?.moneda ?? defectos.moneda;
  const tasaVigente = useSel(selTasaVigente, { moneda, fecha: hoy });
  const tasa =
    ajustes.tasa !== undefined ? ajustes.tasa : (imp?.tasaPedido ?? (tasaVigente > 0 ? tasaVigente : null));
  const fechaPedido = ajustes.fechaPedido ?? imp?.fechaPedido ?? hoy;
  const tipoCarga: TipoCarga = ajustes.tipoCarga ?? imp?.carga.tipo ?? 'consolidada';
  const pies = ajustes.pies ?? (imp?.carga.tipo === 'contenedor' ? imp.carga.pies : 20);
  const kg = ajustes.kg !== undefined ? ajustes.kg : imp?.carga.tipo === 'aerea' ? imp.carga.kg : null;
  const puertoOrigen = ajustes.puertoOrigen ?? imp?.puertoOrigen ?? defectos.puertoOrigen;
  const puertoDestino = ajustes.puertoDestino ?? imp?.puertoDestino ?? defectos.puertoDestino;
  const contactoIds = ajustes.contactoIds ?? imp?.contactoIds ?? defectos.contactoIds;
  const nota = ajustes.nota ?? imp?.nota ?? '';

  const enCotizado = !imp || imp.estado === 'cotizado';
  const lineasEditables = !imp || indiceEstado(imp.estado) < indiceEstado('saldo_pagado');

  const totalUnidades = lineas.reduce((a, l) => a + unidadesBorrador(l), 0);
  const fobCentavos = lineas.reduce((a, l) => a + fobBorradorCentavos(l), 0);
  const m3Estimado =
    defectos.m3PorPrenda && totalUnidades > 0
      ? Math.max(0.1, Math.round(totalUnidades * defectos.m3PorPrenda * 10) / 10)
      : null;
  const m3Guardado = imp?.carga.tipo === 'consolidada' ? imp.carga.m3 : null;
  const m3 = ajustes.m3 !== undefined ? ajustes.m3 : (m3Guardado ?? m3Estimado);
  const m3Efectivo = m3 ?? 5;

  const carga: Importacion['carga'] =
    tipoCarga === 'consolidada'
      ? { tipo: 'consolidada', m3: m3Efectivo }
      : tipoCarga === 'contenedor'
        ? { tipo: 'contenedor', pies }
        : { tipo: 'aerea', kg: kg ?? 100 };

  const puertos = useMemo(
    () => (PUERTOS_ORIGEN.includes(puertoOrigen) ? PUERTOS_ORIGEN : [puertoOrigen, ...PUERTOS_ORIGEN]),
    [puertoOrigen],
  );
  const contactosVisibles = contactos.filter(
    (f) =>
      f.contacto.rol !== 'proveedor' ||
      f.contacto.proveedorId === proveedorId ||
      contactoIds.includes(f.contacto.id),
  );

  const elegirProveedor = (id: Id) => {
    setProveedorId(id);
    setAjustes({});
    setLineas([]);
    setErrores({});
  };

  const validarPaso = (n: number): boolean => {
    const e: Record<string, string> = {};
    if (n === 0) {
      if (!proveedorId) e.proveedorId = 'Elige la fábrica a la que le haces el pedido.';
      if (!tasa || tasa <= 0) e.tasaPedido = 'Escribe la tasa de cambio del pedido.';
      if (tipoCarga === 'consolidada' && m3Efectivo <= 0) e.carga = 'El volumen debe ser mayor que cero.';
      if (tipoCarga === 'aerea' && (kg ?? 1) <= 0) e.carga = 'El peso debe ser mayor que cero.';
    }
    if (n === 1) {
      if (lineas.length === 0) e.lineas = 'Agrega al menos una referencia al pedido.';
      else if (lineas.some((l) => !l.productoId)) e.lineas = 'Elige la prenda de cada línea.';
      else if (lineas.some((l) => !l.fob || l.fob <= 0))
        e.lineas = 'Escribe el precio de fábrica de cada referencia.';
      else if (lineas.some((l) => unidadesBorrador(l) <= 0))
        e.lineas = 'Pide al menos una unidad de cada referencia.';
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const siguiente = () => {
    if (validarPaso(paso)) setPaso(paso + 1);
  };

  const guardar = () => {
    if (!validarPaso(0)) return setPaso(0);
    if (!validarPaso(1)) return setPaso(1);
    if (!proveedorId || !tasa) return;
    setGuardando(true);
    const datosLineas = lineas.map((l) => ({
      productoId: l.productoId as Id,
      cantidades: Object.fromEntries(Object.entries(l.cantidades).filter(([, n]) => n > 0)),
      costoUnitarioOrigen: Math.round((l.fob ?? 0) * 100),
    }));
    let numero: string | null = null;
    let mensaje: string | null = null;
    let campo: string | undefined;
    if (imp) {
      const r = acciones.editarImportacion({
        importacionId: imp.id,
        cambios: {
          ...(enCotizado ? { proveedorId, moneda, fechaPedido } : {}),
          tasaPedido: tasa,
          carga,
          puertoOrigen,
          puertoDestino,
          ...(lineasEditables
            ? {
                lineas: datosLineas.map((l, i) => ({
                  ...l,
                  id: imp.lineas.find((x) => x.productoId === l.productoId)?.id ?? `${imp.id}-l${i + 1}`,
                })),
              }
            : {}),
          contactoIds,
          nota: nota.trim() || null,
        },
      });
      if (r.ok) numero = imp.numero;
      else {
        mensaje = r.error.mensaje;
        campo = r.error.campo;
      }
    } else {
      const id = nuevoId(PREFIJOS.importacion);
      const r = acciones.crearImportacion({
        importacionId: id,
        numero: null,
        proveedorId,
        moneda,
        tasaPedido: tasa,
        fechaPedido,
        carga,
        puertoOrigen,
        puertoDestino,
        lineas: datosLineas,
        contactoIds,
        costos: defectos.costos,
        metodoProrrateo: defectos.metodoProrrateo,
        origenSugerencia: null,
        nota: nota.trim() || null,
      });
      if (r.ok) numero = r.despues.importaciones[id]?.numero ?? null;
      else {
        mensaje = r.error.mensaje;
        campo = r.error.campo;
      }
    }
    setGuardando(false);
    if (numero) {
      alTerminar(numero);
      return;
    }
    setPaso(campo === 'contactoIds' || campo === 'nota' ? 2 : campo === 'lineas' ? 1 : 0);
    setErrores({ [campo ?? 'general']: mensaje ?? 'No pudimos guardar el pedido.' });
  };

  return (
    <div className="space-y-6" data-testid="formulario-pedido">
      <Stepper pasos={PASOS} actual={paso} alElegir={(i) => setPaso(i)} />

      {errores.general && <p className="border-l-2 border-danger pl-3 t-small text-ink">{errores.general}</p>}

      {paso === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Select
              className="col-span-2"
              etiqueta="Fábrica"
              placeholder="Elige la fábrica"
              valor={proveedorId}
              alCambiar={elegirProveedor}
              opciones={fabricas.map((f) => ({
                valor: f.proveedor.id,
                etiqueta: `${f.proveedor.nombreCorto} · ${f.proveedor.moneda}`,
              }))}
              deshabilitado={!enCotizado}
              enModal
              error={errores.proveedorId}
              ayuda={!enCotizado ? 'La fábrica solo se cambia mientras el pedido está cotizado.' : undefined}
              data-testid="select-fabrica"
            />
            <div>
              <p className="mb-1.5 t-label text-ink">Moneda del pedido</p>
              <Segmentado
                etiqueta="Moneda del pedido"
                valor={moneda}
                alCambiar={(v) => ajustar({ moneda: v, tasa: undefined })}
                opciones={[
                  { valor: 'USD', etiqueta: 'US$ · dólares' },
                  { valor: 'CNY', etiqueta: 'CN¥ · yuanes' },
                ]}
              />
            </div>
            <InputNumero
              etiqueta="Tasa de cambio del pedido (pesos por unidad)"
              prefijo="$"
              valor={tasa}
              alCambiar={(v) => ajustar({ tasa: v })}
              decimales={2}
              error={errores.tasaPedido}
              ayuda={tasaVigente > 0 ? `Tasa de hoy: $ ${numero(tasaVigente, 2)}` : undefined}
              data-testid="input-tasa"
            />
            <SelectorFecha
              etiqueta="Fecha del pedido"
              hoy={hoy}
              valor={fechaPedido}
              alCambiar={(f) => ajustar({ fechaPedido: f })}
              enModal
            />
          </div>

          <GrupoRadio
            tarjetas
            columnas={3}
            etiqueta="Tipo de carga"
            valor={tipoCarga}
            alCambiar={(v) => ajustar({ tipoCarga: v })}
            opciones={[
              {
                valor: 'consolidada',
                etiqueta: ETIQUETAS_CARGA.consolidada,
                descripcion: 'Compartes el contenedor y pagas por m³. Lo habitual para pedidos de ropa.',
              },
              {
                valor: 'contenedor',
                etiqueta: ETIQUETAS_CARGA.contenedor,
                descripcion: 'Solo para pedidos muy grandes, como la temporada de calzado.',
              },
              {
                valor: 'aerea',
                etiqueta: ETIQUETAS_CARGA.aerea,
                descripcion: 'Rápida y cara: para muestras o reposición urgente.',
              },
            ]}
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {tipoCarga === 'consolidada' && (
              <InputNumero
                etiqueta="Volumen (m³)"
                sufijo="m³"
                valor={m3}
                alCambiar={(v) => ajustar({ m3: v })}
                decimales={1}
                placeholder="Por ejemplo, 5"
                error={errores.carga}
                ayuda={
                  m3Estimado
                    ? 'Estimado con el volumen por prenda del último pedido.'
                    : 'Lo confirma tu agente de carga.'
                }
              />
            )}
            {tipoCarga === 'contenedor' && (
              <div>
                <p className="mb-1.5 t-label text-ink">Tamaño del contenedor</p>
                <Segmentado
                  etiqueta="Tamaño del contenedor"
                  valor={String(pies) as '20' | '40'}
                  alCambiar={(v) => ajustar({ pies: v === '40' ? 40 : 20 })}
                  opciones={[
                    { valor: '20', etiqueta: '20 pies' },
                    { valor: '40', etiqueta: '40 pies' },
                  ]}
                />
              </div>
            )}
            {tipoCarga === 'aerea' && (
              <InputNumero
                etiqueta="Peso (kg)"
                sufijo="kg"
                valor={kg}
                alCambiar={(v) => ajustar({ kg: v })}
                error={errores.carga}
              />
            )}
            <Select
              etiqueta="Puerto de origen"
              valor={puertoOrigen}
              alCambiar={(v) => ajustar({ puertoOrigen: v })}
              opciones={puertos.map((p) => ({ valor: p, etiqueta: p }))}
              enModal
            />
            <div>
              <p className="mb-1.5 t-label text-ink">Puerto de llegada</p>
              <Segmentado
                etiqueta="Puerto de llegada"
                valor={puertoDestino}
                alCambiar={(v) => ajustar({ puertoDestino: v })}
                opciones={[
                  { valor: 'Buenaventura', etiqueta: 'Buenaventura' },
                  { valor: 'Cartagena', etiqueta: 'Cartagena' },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {paso === 1 && (
        <>
          <EditorLineas
            catalogo={catalogo}
            lineas={lineas}
            alCambiar={(l) => {
              setLineas(l);
              setErrores({});
            }}
            moneda={moneda}
            deshabilitado={!lineasEditables}
            error={errores.lineas}
          />
          {!lineasEditables && (
            <p className="t-small text-muted">Las líneas ya no se pueden cambiar: el saldo está pagado.</p>
          )}
        </>
      )}

      {paso === 2 && (
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-2 t-label text-ink">¿Quiénes siguen este pedido?</legend>
            <p className="mb-3 t-small text-muted">
              Ellos son los destinatarios que aparecen en “Notificar a” cada vez que cambia el estado.
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {contactosVisibles.map((f) => (
                <Checkbox
                  key={f.contacto.id}
                  marcado={contactoIds.includes(f.contacto.id)}
                  alCambiar={(v) =>
                    ajustar({
                      contactoIds: v
                        ? [...contactoIds, f.contacto.id]
                        : contactoIds.filter((x) => x !== f.contacto.id),
                    })
                  }
                  etiqueta={
                    <span>
                      <span className="font-semibold text-ink">{f.contacto.nombre}</span>
                      <span className="ml-2 t-small text-muted">
                        {ETIQUETAS_ROL_CONTACTO[f.contacto.rol]}
                      </span>
                    </span>
                  }
                />
              ))}
            </div>
          </fieldset>
          <Textarea
            etiqueta="Nota del pedido"
            opcional
            value={nota}
            onChange={(e) => ajustar({ nota: e.target.value })}
            placeholder="Algo que quieras recordar de este pedido"
          />
          <div className="border border-line bg-surface-2 p-4" data-testid="resumen-pedido">
            <p className="t-eyebrow text-ink-2">Resumen</p>
            <dl className="mt-3 grid grid-cols-3 gap-4">
              <div>
                <dt className="t-small text-muted">Prendas</dt>
                <dd className="t-h3 num">{entero(totalUnidades)}</dd>
              </div>
              <div>
                <dt className="t-small text-muted">Valor de fábrica</dt>
                <dd className="t-h3 num">{dineroOrigen(fobCentavos, moneda)}</dd>
              </div>
              <div>
                <dt className="t-small text-muted">En la moneda activa</dt>
                <dd className="t-h3">
                  <Dinero valor={copDeCentavos(fobCentavos, tasa ?? tasaVigente)} corta />
                </dd>
              </div>
            </dl>
            {!editando && (
              <p className="mt-3 t-small text-muted">
                {proveedorId && defectos.ultimoNumero
                  ? `Flete, seguro y gastos de aduana parten de los del ${defectos.ultimoNumero}; los ajustas después en Costo aterrizado.`
                  : 'Los costos de flete, seguro y aduana se completan después en Costo aterrizado.'}{' '}
                {textoUnidades(totalUnidades)} entrarán a la bodega cuando el pedido llegue.
              </p>
            )}
            {errores.contactoIds && <p className="mt-2 t-small text-danger">{errores.contactoIds}</p>}
            {errores.nota && <p className="mt-2 t-small text-danger">{errores.nota}</p>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-4">
        <Button variante="ghost" onClick={alCancelar}>
          Cancelar
        </Button>
        <div className="flex gap-3">
          {paso > 0 && (
            <Button variante="secondary" icono={ArrowLeft} onClick={() => setPaso(paso - 1)}>
              Atrás
            </Button>
          )}
          {paso < PASOS.length - 1 ? (
            <Button iconoDerecha={ArrowRight} onClick={siguiente} data-testid="paso-siguiente">
              Siguiente
            </Button>
          ) : (
            <Button onClick={guardar} cargando={guardando} data-testid="guardar-pedido">
              {editando ? 'Guardar cambios' : 'Crear pedido en Cotizado'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
