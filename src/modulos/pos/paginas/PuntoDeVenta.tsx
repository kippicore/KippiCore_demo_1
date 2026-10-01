import { Gift, MapPin, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Id } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useAcciones, useAhora, useDinero, useEstadoDominio, useFiltroLocal, useRolActivo, useSel, useUsuarioActivo } from '@/estado';
import {
  existencia,
  selCierresDelDia,
  selDisponibilidadOtrosLocales,
  selLocalesQueVenden,
  selMetricasClientes,
  selNarrativa,
  selResumenSesion,
} from '@/selectores';
import { hora } from '@/lib/formato';
import { Button, Dinero, PuntoEstado, Segmentado, avisar } from '@/ui';
import {
  abonoMinimo,
  abonoSugerido,
  cuentaEfectivo,
  fraccionDescuento,
  motivoBloqueo,
  superaMaximo,
  totalesCarrito,
  valoresPagos,
} from '../calculos';
import { efectosPos, type EfectoPos } from '../efectos';
import { ESTADO_INICIAL, enCarrito, reducirPos, type AccionPos } from '../estadoPos';
import { selBonoPorCodigo, selSolicitudesDescuento, selVendedoresPos, type SolicitudDescuento } from '../selectores';
import { AvisoDescuento, DialogoAprobacion } from '../componentes/Aprobacion';
import { Carrito } from '../componentes/Carrito';
import { ClienteVendedor } from '../componentes/ClienteVendedor';
import { DialogoAbrirCaja } from '../componentes/DialogoAbrirCaja';
import { DialogoBono } from '../componentes/DialogoBono';
import { DialogoDevoluciones } from '../componentes/DialogoDevoluciones';
import { PanelExito } from '../componentes/PanelExito';
import { Pago } from '../componentes/Pago';
import { PanelProducto } from '../componentes/PanelProducto';
import { Totales } from '../componentes/Totales';

/**
 * Punto de venta (PRD 7.2, W1): más rápido que el cuaderno. Todo cabe sin desplazar la página a 1366 × 657:
 * búsqueda y grilla talla × color a la izquierda; cliente, vendedor, carrito, totales, pago y "Confirmar venta" a la
 * derecha (el carrito es lo único que se desplaza por dentro). Al confirmar, el panel "Lo que acaba de pasar".
 */
export default function PuntoDeVenta() {
  const rol = useRolActivo();
  const { empleado } = useUsuarioActivo();
  const contexto = useFiltroLocal();
  const e = useEstadoDominio();
  const d = useDinero();
  const ahora = useAhora();
  const hoy = ahora.slice(0, 10);
  const hhmm = ahora.slice(11, 16);
  const acciones = useAcciones();
  const locales = useSel(selLocalesQueVenden);
  const narrativa = useSel(selNarrativa, { hoy });

  // Local de la venta: el del vendedor; el del filtro del dueño o, con "Todos", el que elija en la cabecera.
  const [localElegido, setLocalElegido] = useState<Id | null>(null);
  const elegido = localElegido && locales.some((l) => l.id === localElegido) ? localElegido : null;
  const deLaNarrativa = narrativa.localEscasez && locales.some((l) => l.id === narrativa.localEscasez) ? narrativa.localEscasez : null;
  const localId: Id = contexto !== 'todos' ? contexto : (elegido ?? deLaNarrativa ?? locales[0]?.id ?? '');
  const local = e.locales[localId];
  const selectorLocal = contexto === 'todos';

  // `?cliente=<id>` (el cambio de Ventas): la venta abre con ese cliente y, si tiene saldo a favor, con el saldo como
  // primer medio de pago mientras no se toque el pago. El parámetro se quita de la URL al leerlo.
  const params = useParamsRuta('pos');
  const navegar = useNavigate();
  const [clienteUrl] = useState(() => {
    const id = params.cliente;
    return id && e.clientes[id] && !e.clientes[id]?.eliminadoEn ? id : null;
  });
  const [s, despachar] = useReducer(reducirPos, ESTADO_INICIAL, (ini) =>
    clienteUrl ? { ...ini, cliente: { tipo: 'existente' as const, id: clienteUrl } } : ini,
  );
  const [saldoPrecargado, setSaldoPrecargado] = useState(clienteUrl !== null);
  useEffect(() => {
    if (!params.cliente) return;
    if (!clienteUrl) avisar({ tipo: 'info', texto: 'Ese cliente ya no está: la venta abre con Consumidor final.' });
    navegar(rutas.pos(), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al llegar
  }, []);
  const [productoId, setProductoId] = useState<Id | null>(null);
  const [ultimoEscaneo, setUltimoEscaneo] = useState<string | null>(null);
  const [exito, setExito] = useState<{ ventaId: Id; efectos: EfectoPos[] } | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);
  const [errorCliente, setErrorCliente] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<'caja' | 'bono' | 'devoluciones' | 'aprobacion' | null>(null);
  const temporizador = useRef<number | null>(null);

  // Cambiar de local (filtro global o selector de la cabecera) vacía la venta: las existencias son otras.
  const localAnterior = useRef(localId);
  useEffect(() => {
    if (localAnterior.current === localId) return;
    localAnterior.current = localId;
    despachar({ t: 'vaciar' });
    despachar({ t: 'vendedor', id: null });
    setProductoId(null);
    setUltimoEscaneo(null);
    setErrorVenta(null);
  }, [localId]);
  useEffect(() => () => void (temporizador.current && window.clearTimeout(temporizador.current)), []);

  // ---------------- Derivados ----------------
  const parametros = e.parametros.ventas;
  const vendedores = useSel(selVendedoresPos, { localId, fecha: hoy, hhmm });
  const vendedorId = rol === 'vendedor' ? (empleado?.id ?? null) : (s.vendedorId ?? vendedores.porDefecto);
  const totales = useMemo(() => totalesCarrito(s.lineas, s.descuentoGlobal), [s.lineas, s.descuentoGlobal]);
  const objetivo = s.tipo === 'contado' ? totales.total : (s.abono ?? 0);
  const valores = valoresPagos(objetivo, s.pagos);
  const minimoAbono = abonoMinimo(totales.total, parametros.abonoMinimoSeparado);
  const maxFecha = sumarDias(hoy, parametros.diasMaximoSeparado);

  const cierres = useSel(selCierresDelDia, { fecha: hoy });
  const cajaLocal = cierres.find((c) => c.localId === localId) ?? null;
  const cajaAbierta = cajaLocal?.estado === 'abierta';
  const resumenCaja = useSel(selResumenSesion, { sesionId: cajaLocal?.sesionId ?? '' });

  const clienteExistente = s.cliente.tipo === 'existente' ? e.clientes[s.cliente.id] : null;
  const saldoAFavor = s.cliente.tipo === 'existente' ? (selMetricasClientes(e, { hoy })[s.cliente.id]?.saldoAFavor ?? 0) : 0;
  // Cliente que llegó por `?cliente=` con saldo a favor: el saldo cubre lo que alcance y el resto va en efectivo,
  // hasta que se toque el pago o se cambie el cliente.
  const conSaldoPrecargado =
    saldoPrecargado && s.tipo === 'contado' && saldoAFavor > 0 && s.cliente.tipo === 'existente' && s.cliente.id === clienteUrl;
  useEffect(() => {
    if (conSaldoPrecargado) despachar({ t: 'pagosSaldoFavor', saldo: saldoAFavor, total: totales.total });
  }, [conSaldoPrecargado, saldoAFavor, totales.total]);
  const despacharPago = (a: AccionPos) => {
    setSaldoPrecargado(false);
    despachar(a);
  };
  const identificado = s.cliente.tipo !== 'consumidor';

  // Aprobación de descuento (solo el vendedor la necesita).
  const esVendedor = rol === 'vendedor';
  const fraccion = fraccionDescuento(totales);
  const maximo = parametros.descuentoMaximoVendedor;
  const solicitudActual = s.aprobacionId ? (e.solicitudes[s.aprobacionId] ?? null) : null;
  const vivas = useSel(selSolicitudesDescuento, { vendedorId: vendedorId ?? '' });
  const aprobacionVigente =
    !!solicitudActual &&
    solicitudActual.estado === 'aprobada' &&
    solicitudActual.usadaEnVentaId === null &&
    solicitudActual.datos.tipo === 'descuento' &&
    solicitudActual.datos.vendedorId === vendedorId &&
    solicitudActual.datos.porcentaje + 1e-9 >= fraccion;
  const descuentoSinAprobar = esVendedor && superaMaximo(totales, maximo) && !aprobacionVigente;

  const cuentasEfectivo = s.pagos.map((p, i) => (p.medio === 'efectivo' ? cuentaEfectivo(valores[i] ?? 0, p.recibido) : null));
  const cambio = cuentasEfectivo.reduce((a, c) => a + (c?.cambio ?? 0), 0);
  const sinStock = s.lineas.find((l) => l.cantidad > existencia(e, l.varianteId, localId));
  const usaSaldoFavor = s.pagos.some((p) => p.medio === 'saldo_a_favor');
  let motivo = motivoBloqueo({
    numLineas: s.lineas.length,
    vendedorId,
    tipo: s.tipo,
    total: totales.total,
    objetivo,
    abonoMinimo: minimoAbono,
    pagos: s.pagos.map((p, i) => {
      const bono = p.medio === 'bono_regalo' ? selBonoPorCodigo(e, { codigo: p.bonoCodigo, hoy }) : null;
      return { medio: p.medio, valor: valores[i] ?? 0, recibido: p.medio === 'efectivo' ? (cuentasEfectivo[i]?.recibido ?? null) : null, bonoSaldo: bono?.estado === 'activo' ? bono.saldo : null, bonoValido: bono?.estado === 'activo' };
    }),
    clienteIdentificado: identificado,
    fechaLimite: s.fechaLimite,
    hoy,
    maximoFecha: maxFecha,
    efectivoSinCaja: !cajaAbierta,
    descuentoSinAprobar,
  });
  if (!motivo && sinStock) motivo = 'Una prenda supera lo que hay en este local.';
  if (!motivo && usaSaldoFavor && (!identificado || saldoAFavor < (valores[s.pagos.findIndex((p) => p.medio === 'saldo_a_favor')] ?? 0))) motivo = 'El cliente no tiene saldo a favor suficiente.';

  // ---------------- Acciones ----------------
  const descripcionDe = useCallback(
    (varianteId: Id): string => {
      const v = e.variantes[varianteId];
      const p = v ? e.productos[v.productoId] : undefined;
      return v && p ? `${p.nombre} · ${e.colores[v.colorId]?.nombre ?? ''} · ${v.talla}` : '';
    },
    [e],
  );

  const agregar = (varianteId: Id, origen: 'toque' | 'escaneo' = 'toque') => {
    const v = e.variantes[varianteId];
    const p = v ? e.productos[v.productoId] : undefined;
    if (!v || !p) return;
    const hay = existencia(e, varianteId, localId);
    if (enCarrito(s, varianteId) >= hay) {
      const otros = selDisponibilidadOtrosLocales(e, { varianteId });
      const donde = Object.entries(otros)
        .filter(([id, n]) => id !== localId && n > 0)
        .map(([id, n]) => `${n} en ${e.locales[id]?.nombre ?? id}`);
      avisar({
        tipo: 'alerta',
        texto: hay === 0 ? `No hay existencias en ${local?.nombre ?? 'este local'}` : 'Ya agregaste todas las unidades disponibles',
        detalle: hay === 0 && donde.length ? `Hay ${donde.join(' y ')}: pide un traslado.` : descripcionDe(varianteId),
      });
      return;
    }
    despachar({ t: 'agregar', varianteId, precioLista: p.precioVenta, tarifaIva: p.tarifaIva });
    setUltimoEscaneo(`${origen === 'escaneo' ? 'Escaneado' : 'Agregado'}: ${descripcionDe(varianteId)}`);
    setErrorVenta(null);
  };

  const escanear = () => {
    const candidatas = Object.values(e.variantes).filter((v) => !v.eliminadoEn && existencia(e, v.id, localId) - enCarrito(s, v.id) > 0);
    if (!candidatas.length) {
      avisar({ tipo: 'alerta', texto: 'No hay prendas con existencias para escanear en este local' });
      return;
    }
    const v = candidatas[Math.floor(Math.random() * candidatas.length)];
    if (!v) return;
    setProductoId(v.productoId);
    agregar(v.id, 'escaneo');
  };

  const cambiarTipo = (t: 'contado' | 'separado') => {
    if (t === 'separado')
      despachar({
        t: 'tipo',
        tipo: 'separado',
        abonoSugerido: totales.total > 0 ? abonoSugerido(totales.total, parametros.abonoMinimoSeparado) : null,
        fechaSugerida: sumarDias(hoy, Math.min(15, parametros.diasMaximoSeparado)),
      });
    else despachar({ t: 'tipo', tipo: 'contado', abonoSugerido: null, fechaSugerida: null });
  };

  const usarAprobacion = (sol: SolicitudDescuento) => {
    for (const id of sol.datos.varianteIds) if (enCarrito(s, id) === 0) agregar(id);
    despachar({ t: 'descuentoGlobal', descuento: { tipo: 'porcentaje', valor: sol.datos.porcentaje } });
    despachar({ t: 'aprobacion', id: sol.id });
  };

  const nuevaVenta = () => {
    despachar({ t: 'vaciar' });
    setExito(null);
    setProductoId(null);
    setUltimoEscaneo(null);
    setErrorVenta(null);
    setErrorCliente(null);
  };

  const confirmar = () => {
    if (motivo || confirmando || !vendedorId) return;
    const lineas = s.lineas.map((l) => ({ varianteId: l.varianteId, cantidad: l.cantidad, precioLista: l.precioLista, descuento: l.descuento }));
    const clienteNuevo =
      s.cliente.tipo === 'nuevo'
        ? {
            nombres: s.cliente.datos.nombres,
            apellidos: s.cliente.datos.apellidos,
            documento: s.cliente.datos.documento ? { tipo: 'CC' as const, numero: s.cliente.datos.documento } : null,
            celular: s.cliente.datos.celular,
            correo: s.cliente.datos.correo || null,
            cumpleanos: null,
            anioNacimiento: null,
            barrio: null,
            canalPreferido: 'whatsapp' as const,
            tratamiento: 'tu' as const,
            autorizacionDatos: { aceptada: true, fecha: ahora, canal: 'pos' as const },
            tallasDeclaradas: {},
            canalAlta: 'pos' as const,
            localRegistroId: localId,
            registradoPorId: vendedorId,
          }
        : null;
    const pagos = s.pagos.map((p, i) => {
      const bono = p.medio === 'bono_regalo' ? selBonoPorCodigo(e, { codigo: p.bonoCodigo, hoy }) : null;
      return {
        medio: p.medio,
        valor: valores[i] ?? 0,
        recibido: p.medio === 'efectivo' ? (cuentasEfectivo[i]?.recibido ?? null) : null,
        referencia: p.referencia.trim() || null,
        sesionCajaId: null,
        bonoId: bono?.id ?? null,
      };
    });
    const datos = {
      localId,
      vendedorId,
      canal: 'local' as const,
      tipo: s.tipo,
      clienteId: s.cliente.tipo === 'existente' ? s.cliente.id : null,
      clienteNuevo,
      lineas,
      descuentoGlobal: s.descuentoGlobal,
      aprobacionDescuentoId: esVendedor && superaMaximo(totales, maximo) && aprobacionVigente ? s.aprobacionId : null,
      pagos,
      fechaLimiteSeparado: s.tipo === 'separado' ? s.fechaLimite : null,
      ventaOrigenCambioId: null,
      facturaInmediata: null,
      nota: null,
    };
    setConfirmando(true);
    setErrorVenta(null);
    setErrorCliente(null);
    // "Confirmar" pasa a estado de carga 400 ms (PLAN 8.10.3): se percibe el proceso.
    temporizador.current = window.setTimeout(() => {
      const r = acciones.registrarVenta(datos);
      setConfirmando(false);
      if (!r.ok) {
        const deCliente = ['celular', 'documento', 'correo', 'nombres', 'apellidos', 'autorizacionDatos', 'clienteNuevo', 'clienteId'].includes(r.error.campo ?? '');
        if (deCliente) setErrorCliente(r.error.mensaje);
        else setErrorVenta(r.error.mensaje);
        return;
      }
      const evento = r.eventos.find((x) => x.tipo === 'VentaRegistrada');
      const ventaId = evento && 'ventaId' in evento ? evento.ventaId : null;
      if (!ventaId) return;
      const venta = r.despues.ventas[ventaId];
      setExito({ ventaId, efectos: efectosPos(r.antes, r.despues, ventaId, { soloLocal: esVendedor }) });
      avisar({ tipo: 'exito', texto: `Venta ${venta?.numero ?? ''} registrada`, detalle: venta ? `${d(venta.total)} · ${e.locales[venta.localId]?.nombre ?? ''}` : undefined });
    }, 400);
  };

  // Ctrl/⌘ + Enter confirma desde cualquier campo.
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
        ev.preventDefault();
        confirmar();
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  const tarifas = new Set(s.lineas.map((l) => l.tarifaIva));
  const tarifaIva = tarifas.size === 1 ? ([...tarifas][0] ?? null) : null;
  const dialogoCajaAbierta = dialogo === 'caja';

  return (
    <div data-testid="pos" className="-mb-20 flex h-[calc(100dvh-var(--sticky-top)+8px)] min-h-[500px] flex-col gap-2.5 pt-2.5 pb-1">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="t-h1 text-ink">Punto de venta</h1>
          {selectorLocal ? (
            <Segmentado
              etiqueta="Local de la venta"
              valor={localId}
              alCambiar={(id) => {
                if (s.lineas.length) avisar({ tipo: 'info', texto: `Cambiaste a ${e.locales[id]?.nombre ?? 'otro local'}`, detalle: 'El carrito se vació: las existencias son otras.' });
                setLocalElegido(id);
              }}
              opciones={locales.map((l) => ({ valor: l.id, etiqueta: l.nombre, 'data-testid': `pos-local-${l.id}` }))}
              data-testid="pos-selector-local"
            />
          ) : (
            <p className="inline-flex items-center gap-1.5 t-label text-ink-2" data-testid="pos-local">
              <MapPin size={14} aria-hidden />
              {local?.nombre}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button variante="ghost" tamano="sm" icono={Undo2} onClick={() => setDialogo('devoluciones')} data-testid="pos-abrir-devoluciones">
            Devoluciones y cambios
          </Button>
          <Button variante="ghost" tamano="sm" icono={Gift} onClick={() => setDialogo('bono')} data-testid="pos-abrir-bono">
            Vender bono
          </Button>
        </div>
      </header>

      {exito ? (
        <PanelExito ventaId={exito.ventaId} efectos={exito.efectos} alNueva={nuevaVenta} />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(400px,460px)] gap-4">
          <PanelProducto
            localId={localId}
            enCarrito={(id) => enCarrito(s, id)}
            alAgregar={(id) => agregar(id)}
            alEscanear={escanear}
            ultimoEscaneo={ultimoEscaneo}
            productoId={productoId}
            alElegirProducto={setProductoId}
            extra={<EstadoCaja estado={cajaLocal?.estado ?? 'sin_abrir'} abrio={resumenCaja?.abrio ?? ''} desde={resumenCaja?.sesion.abierta.ts ?? null} alAbrir={() => setDialogo('caja')} />}
          />
          <section aria-label="Venta en curso" className="flex min-h-0 flex-col overflow-y-auto border border-line bg-surface" data-testid="pos-venta">
            <div className="border-b border-line-soft px-3 pb-2.5 pt-2">
              <ClienteVendedor
                cliente={s.cliente}
                alCliente={(c) => {
                  setErrorCliente(null);
                  setSaldoPrecargado(false);
                  despachar({ t: 'cliente', cliente: c });
                }}
                errorCliente={errorCliente}
                vendedorId={vendedorId}
                alVendedor={(id) => despachar({ t: 'vendedor', id })}
                vendedores={vendedores}
                vendedorFijo={esVendedor}
              />
            </div>
            <div className="min-h-[64px] flex-1 overflow-y-auto" data-testid="pos-carrito">
              <Carrito
                lineas={s.lineas}
                totales={totales}
                localId={localId}
                ultima={s.ultima}
                alCantidad={(clave, n) => {
                  const l = s.lineas.find((x) => x.clave === clave);
                  despachar({ t: 'cantidad', clave, cantidad: l ? Math.min(n, existencia(e, l.varianteId, localId)) : n });
                }}
                alQuitar={(clave) => despachar({ t: 'quitar', clave })}
                alDescuento={(clave, descuento) => despachar({ t: 'descuentoLinea', clave, descuento })}
              />
            </div>
            <div className="flex flex-col gap-1.5 border-t border-line px-3 py-2">
              <AvisoDescuento
                esVendedor={esVendedor}
                fraccion={fraccion}
                maximo={maximo}
                actual={solicitudActual}
                vivas={vivas}
                alPedir={() => setDialogo('aprobacion')}
                alUsar={usarAprobacion}
                alQuitarDescuento={() => {
                  despachar({ t: 'descuentoGlobal', descuento: null });
                  for (const l of s.lineas) if (l.descuento) despachar({ t: 'descuentoLinea', clave: l.clave, descuento: null });
                  despachar({ t: 'aprobacion', id: null });
                }}
              />
              <Totales
                totales={totales}
                tarifaIva={tarifaIva}
                descuentoGlobal={s.descuentoGlobal}
                alDescuentoGlobal={(x) => despachar({ t: 'descuentoGlobal', descuento: x })}
                separado={s.tipo === 'separado' ? { abono: objetivo, saldo: Math.max(0, totales.total - objetivo) } : null}
                cambio={cambio}
                hayLineas={s.lineas.length > 0}
              />
              <Pago
                tipo={s.tipo}
                abono={s.abono}
                fechaLimite={s.fechaLimite}
                pagos={s.pagos}
                valores={valores}
                objetivo={objetivo}
                total={totales.total}
                puedeSeparado={identificado}
                abonoMinimo={minimoAbono}
                maxFecha={maxFecha}
                saldoAFavor={clienteExistente ? saldoAFavor : 0}
                alTipo={cambiarTipo}
                despachar={despacharPago}
              />
              {s.pagos.some((p) => p.medio === 'efectivo') && !cajaAbierta && (
                <p role="status" className="flex flex-wrap items-center gap-2 t-small text-ink-2" data-testid="pos-aviso-caja">
                  {cajaLocal && (cajaLocal.estado === 'cerrada' || cajaLocal.estado === 'revisada')
                    ? `La caja de ${local?.nombre ?? ''} ya cerró hoy: recibe este pago por otro medio.`
                    : `La caja de ${local?.nombre ?? ''} no está abierta.`}
                  {(!cajaLocal || cajaLocal.estado === 'sin_abrir') && (
                    <Button variante="link" onClick={() => setDialogo('caja')} data-testid="pos-abrir-caja-aviso">
                      Abrir caja ahora
                    </Button>
                  )}
                </p>
              )}
              {errorVenta && (
                <p role="alert" className="t-small text-danger" data-testid="pos-error-venta">
                  {errorVenta}
                </p>
              )}
              <div>
                <Button
                  tamano="lg"
                  anchoCompleto
                  cargando={confirmando}
                  disabled={!!motivo}
                  motivo={motivo ?? undefined}
                  aria-describedby={motivo ? 'pos-motivo' : undefined}
                  onClick={confirmar}
                  data-testid="pos-confirmar"
                >
                  {s.tipo === 'separado' ? 'Confirmar separado' : 'Confirmar venta'}
                  {totales.total > 0 && (
                    <>
                      <span aria-hidden> · </span>
                      <Dinero valor={s.tipo === 'separado' ? objetivo : totales.total} />
                    </>
                  )}
                </Button>
                {motivo && (
                  <p id="pos-motivo" className="mt-1.5 t-small text-muted" data-testid="pos-motivo">
                    {motivo}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      <DialogoAbrirCaja abierto={dialogoCajaAbierta} alCambiar={(a) => setDialogo(a ? 'caja' : null)} localId={localId} />
      <DialogoBono abierto={dialogo === 'bono'} alCambiar={(a) => setDialogo(a ? 'bono' : null)} localId={localId} cajaAbierta={cajaAbierta} />
      <DialogoDevoluciones abierto={dialogo === 'devoluciones'} alCambiar={(a) => setDialogo(a ? 'devoluciones' : null)} localId={localId} />
      {vendedorId && (
        <DialogoAprobacion
          abierto={dialogo === 'aprobacion'}
          alCambiar={(a) => setDialogo(a ? 'aprobacion' : null)}
          localId={localId}
          vendedorId={vendedorId}
          varianteIds={s.lineas.map((l) => l.varianteId)}
          valorLista={totales.subtotal}
          fraccion={fraccion}
          alEnviada={(id) => despachar({ t: 'aprobacion', id })}
        />
      )}
    </div>
  );
}

function EstadoCaja({ estado, abrio, desde, alAbrir }: { estado: 'sin_abrir' | 'abierta' | 'cerrada' | 'revisada'; abrio: string; desde: string | null; alAbrir: () => void }) {
  if (estado === 'abierta')
    return (
      <p className="inline-flex shrink-0 items-center gap-2 t-small text-ink-2" data-testid="pos-estado-caja" data-estado="abierta">
        <PuntoEstado tono="success">Caja abierta{desde ? ` · ${abrio.split(' ')[0] ?? ''} ${hora(desde)}` : ''}</PuntoEstado>
        <Link to={rutas.caja()} className="t-nav text-ink underline-offset-4 hover:underline">
          Ver caja
        </Link>
      </p>
    );
  if (estado === 'sin_abrir')
    return (
      <p className="inline-flex shrink-0 items-center gap-2 t-small text-ink-2" data-testid="pos-estado-caja" data-estado="sin_abrir">
        <PuntoEstado tono="warning">Caja sin abrir</PuntoEstado>
        <button type="button" onClick={alAbrir} className="t-nav text-ink underline underline-offset-4 hover:no-underline" data-testid="pos-abrir-caja">
          Abrir caja
        </button>
      </p>
    );
  return (
    <p className="inline-flex shrink-0 items-center gap-2 t-small text-ink-2" data-testid="pos-estado-caja" data-estado="cerrada">
      <PuntoEstado tono="neutral">Caja de hoy cerrada</PuntoEstado>
      <Link to={rutas.caja()} className="t-nav text-ink underline-offset-4 hover:underline">
        Ver caja
      </Link>
    </p>
  );
}
