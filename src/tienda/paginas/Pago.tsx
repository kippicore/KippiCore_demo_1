import { CircleAlert, ShoppingBag } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { rutas } from '@/app/rutas';
import { useAcciones, useAhora, useHoy, useSel } from '@/estado';
import { plural } from '@/lib/formato';
import { Checkbox, GrupoRadio, Select } from '@/ui';
import { BotonEnlace, Button, Dinero, EmptyState, Icono, Input, Migas } from '@/ui/ligero';
import { recordarPedido, useBolsa } from '../bolsa';
import { armarVentaWeb, COMPRADOR_VACIO, normalizarCelular, validarComprador } from '../calculos';
import { LineasBolsa } from '../componentes/LineasBolsa';
import { useEnlaces } from '../enlaces';
import { useAjustarBolsaAExistencias, useBolsaDetalle } from '../hooks';
import { selClientePorCelular, selVendedorWeb } from '../selectores';
import { CIUDADES_ENVIO, COMPRADOR_EJEMPLO, METODOS_PAGO, TEXTOS } from '../textos';
import type { DatosComprador, MetodoPago } from '../tipos';

/**
 * Pago simulado (PLAN 8.6.6): contacto y entrega a la izquierda, resumen a la derecha. Los métodos son tarjetas de
 * radio SIN ningún campo de tarjeta ni de clave: solo "Pagar (simulación)". Al pagar se registra una venta real
 * (`venta.registrar`, canal Web, un pago `pasarela_web`) a nombre del actor `tienda`; el dominio valida existencias.
 */
const ESPERA_PASARELA_MS = 900;

export default function Pago() {
  useAjustarBolsaAExistencias();
  const { con, ir } = useEnlaces();
  const acciones = useAcciones({ actor: 'tienda' });
  const ahora = useAhora();
  const hoy = useHoy();
  const { catalogo, detalle, totales } = useBolsaDetalle();
  const lineas = useBolsa((s) => s.lineas);
  const vaciar = useBolsa((s) => s.vaciar);
  const vendedor = useSel(selVendedorWeb, { fecha: hoy });

  const [datos, setDatos] = useState<DatosComprador>(COMPRADOR_VACIO);
  const [tocados, setTocados] = useState<Set<keyof DatosComprador>>(new Set());
  const [intento, setIntento] = useState(false);
  const [metodo, setMetodo] = useState<MetodoPago>('simulado');
  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [errorDominio, setErrorDominio] = useState<{ campo: keyof DatosComprador; mensaje: string } | null>(null);
  const temporizador = useRef<number | null>(null);
  const formulario = useRef<HTMLFormElement>(null);
  useEffect(() => () => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
  }, []);

  const celular = normalizarCelular(datos.celular);
  const conocido = useSel(selClientePorCelular, { celular: /^3\d{9}$/.test(celular) ? celular : '' });
  const errores = validarComprador(datos);
  const ver = (k: keyof DatosComprador) => (intento || tocados.has(k) ? (errores[k] ?? (errorDominio?.campo === k ? errorDominio.mensaje : undefined)) : errorDominio?.campo === k ? errorDominio.mensaje : undefined);
  const campo = (k: keyof DatosComprador) => ({
    name: k,
    value: datos[k] as string,
    error: ver(k),
    'data-testid': `tienda-campo-${k}`,
    onChange: (e: { target: { value: string } }) => {
      setDatos((d) => ({ ...d, [k]: e.target.value }));
      if (errorDominio?.campo === k) setErrorDominio(null);
    },
    onBlur: () => setTocados((t) => new Set(t).add(k)),
  });

  if (detalle.length === 0 && !pagando) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-28 md:px-6" data-testid="tienda-pago-vacio">
        <EmptyState
          icono={ShoppingBag}
          titulo={TEXTOS.bolsa.vacioTitulo}
          texto="Agrega algo a tu bolsa para poder pagar."
          accion={
            <BotonEnlace to={con(rutas.tiendaCategoria('novedades'))} tienda tamano="lg">
              {TEXTOS.bolsa.seguir}
            </BotonEnlace>
          }
        />
      </div>
    );
  }

  const pagar = (ev: FormEvent) => {
    ev.preventDefault();
    if (pagando) return;
    setIntento(true);
    setErrorPago(null);
    if (Object.keys(errores).length > 0) {
      window.setTimeout(() => formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalido="true"]')?.focus(), 0);
      return;
    }
    if (!vendedor) {
      setErrorPago('No hay un vendedor disponible para acreditar la venta. Intenta de nuevo en un momento.');
      return;
    }
    const entrada = armarVentaWeb({
      lineas,
      comprador: datos,
      metodo,
      total: totales.total,
      localId: catalogo.local.id,
      vendedorId: vendedor.id,
      clienteExistenteId: conocido?.id ?? null,
      ahora,
    });
    setPagando(true);
    // La pasarela simulada tarda un instante (se percibe el proceso, PLAN 8.10.3).
    temporizador.current = window.setTimeout(() => {
      const r = acciones.registrarVenta(entrada);
      if (!r.ok) {
        setPagando(false);
        const deCampo = (['celular', 'correo', 'nombres', 'apellidos', 'autorizacionDatos'] as const).find((c) => c === r.error.campo);
        if (deCampo) setErrorDominio({ campo: deCampo === 'autorizacionDatos' ? 'autorizacion' : deCampo, mensaje: r.error.mensaje });
        setErrorPago(r.error.mensaje);
        return;
      }
      const evento = r.eventos.find((x) => x.tipo === 'VentaRegistrada');
      const ventaId = evento && 'ventaId' in evento ? evento.ventaId : null;
      if (!ventaId) {
        setPagando(false);
        setErrorPago('La venta se registró, pero no pudimos abrir la confirmación. Revísala en Ventas.');
        return;
      }
      recordarPedido({ ventaId, antes: r.antes, despues: r.despues });
      vaciar();
      ir(rutas.tiendaPedido(ventaId), { replace: true });
    }, ESPERA_PASARELA_MS);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-24 md:px-6 md:pt-28" data-testid="tienda-pago">
      <Migas migas={[{ texto: 'Inicio', a: con(rutas.tienda()) }, { texto: TEXTOS.bolsa.titulo, a: con(rutas.tiendaBolsa()) }, { texto: TEXTOS.pago.titulo }]} />
      <h1 className="mt-6 t-h1 uppercase text-ink">{TEXTOS.pago.titulo}</h1>

      <form ref={formulario} onSubmit={pagar} noValidate className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-x-16">
        <div className="space-y-10 lg:col-span-7">
          <section aria-labelledby="pago-contacto">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="pago-contacto" className="t-h3-tienda text-ink">
                Tus datos
              </h2>
              <Button variante="link" tamano="sm" onClick={() => setDatos((d) => ({ ...d, ...COMPRADOR_EJEMPLO }))} data-testid="tienda-datos-ejemplo">
                Usar datos de ejemplo
              </Button>
            </div>
            <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <Input etiqueta="Nombre(s)" autoComplete="given-name" {...campo('nombres')} />
              <Input etiqueta="Apellidos" autoComplete="family-name" {...campo('apellidos')} />
              <Input etiqueta="Correo" type="email" autoComplete="email" {...campo('correo')} />
              <div>
                <Input etiqueta="Celular" inputMode="numeric" autoComplete="tel-national" ayuda="10 dígitos, empieza por 3" {...campo('celular')} />
                {conocido && !ver('celular') && (
                  <p className="mt-1.5 t-small text-ink" data-testid="tienda-cliente-conocido">
                    Ya eres cliente: esta compra se suma a tu historial.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="pago-entrega">
            <h2 id="pago-entrega" className="t-h3-tienda text-ink">
              Entrega
            </h2>
            <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <Input className="sm:col-span-2" etiqueta="Dirección" autoComplete="street-address" {...campo('direccion')} />
              <Input etiqueta="Complemento" opcional autoComplete="address-line2" {...campo('complemento')} />
              <Input etiqueta="Barrio" {...campo('barrio')} />
              <Select
                etiqueta="Ciudad"
                valor={datos.ciudad}
                alCambiar={(v) => setDatos((d) => ({ ...d, ciudad: v }))}
                opciones={CIUDADES_ENVIO.map((c) => ({ valor: c, etiqueta: c }))}
                error={ver('ciudad')}
              />
            </div>
            <p className="mt-3 t-small text-muted">Los datos de entrega son de ejemplo: no se envía nada a ninguna dirección.</p>
          </section>

          <section aria-labelledby="pago-metodo">
            <h2 id="pago-metodo" className="t-h3-tienda text-ink">
              Método de pago
            </h2>
            <GrupoRadio valor={metodo} alCambiar={setMetodo} tarjetas columnas={2} className="mt-4" opciones={METODOS_PAGO.map((m) => ({ valor: m.valor, etiqueta: m.etiqueta, descripcion: m.descripcion }))} />
            <p className="mt-3 t-small text-muted" data-testid="tienda-pasarela">
              {metodo === 'simulado' ? TEXTOS.pago.nota : TEXTOS.pago.pasarela}
            </p>
          </section>

          <div data-testid="tienda-autorizacion" data-invalido={ver('autorizacion') ? 'true' : undefined} tabIndex={-1} className="outline-none">
            <Checkbox
              etiqueta="Autorizo el tratamiento de mis datos para gestionar este pedido (Ley 1581 de 2012)."
              marcado={datos.autorizacion}
              alCambiar={(v) => setDatos((d) => ({ ...d, autorizacion: v }))}
            />
            {ver('autorizacion') && (
              <p className="mt-1.5 flex items-start gap-1.5 t-small text-danger">
                <Icono icono={CircleAlert} tamano={14} className="mt-0.5" />
                <span>{ver('autorizacion')}</span>
              </p>
            )}
          </div>
        </div>

        <aside aria-label="Resumen del pedido" className="lg:col-span-5">
          <div className="border border-line bg-surface p-6 lg:sticky lg:top-28" data-testid="tienda-resumen">
            <h2 className="t-h3-tienda text-ink">Tu pedido · {plural(totales.unidades, 'artículo')}</h2>
            <LineasBolsa className="mt-5" lineas={detalle} editable={false} />
            <dl className="mt-5 space-y-3 border-t border-line pt-5 t-body">
              <div className="flex justify-between">
                <dt className="text-muted">Envío desde {catalogo.local.nombre}</dt>
                <dd>Gratis</dd>
              </div>
              <div className="flex justify-between t-small">
                <dt className="text-muted">IVA incluido</dt>
                <dd className="num text-muted">
                  <Dinero valor={totales.iva} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <dt className="t-label text-ink">Total</dt>
                <dd className="t-kpi-sm text-ink" data-testid="tienda-total">
                  <Dinero valor={totales.total} />
                </dd>
              </div>
            </dl>
            {errorPago && (
              <p role="alert" className="mt-5 flex items-start gap-2 border border-danger bg-danger-soft p-3 t-small text-ink" data-testid="tienda-error-pago">
                <Icono icono={CircleAlert} tamano={16} className="mt-0.5 text-danger" />
                <span>{errorPago}</span>
              </p>
            )}
            <Button type="submit" tienda tamano="lg" anchoCompleto className="mt-6 h-[52px]" cargando={pagando} data-testid="tienda-pagar">
              {TEXTOS.pago.pagar} <Dinero valor={totales.total} />
            </Button>
            <p className="mt-3 text-center t-small text-muted">{TEXTOS.pago.nota}</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
