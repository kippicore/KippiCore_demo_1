import { CheckCircle2, Ship } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParamsRuta } from '@/app/useParamsRuta';
import type { EstadoImportacion, FechaISO } from '@/dominio/tipos';
import { ETIQUETAS_ESTADO_IMPORTACION } from '@/config/aduanas';
import { diferenciaDias } from '@/dominio/reglas/fechas';
import { unidadesLinea } from '@/dominio/reglas/costeo';
import { emitirUI, useAcciones, useHoy, useMarca, useSel } from '@/estado';
import { entero, fecha as formatoFecha, plural } from '@/lib/formato';
import {
  InsigniaEstado,
  InsigniaRetraso,
  LineaTiempoImportacion,
  estadosParaPortal,
  posicionRuta,
  RutaChina,
  textoCarga,
} from '@/modulos/importaciones/publico';
import { selImportacionPorNumero, selImportaciones } from '@/selectores';
import { Button, Card, EmptyState, Fecha, Input, Pista, Select, SelectorFecha, Textarea } from '@/ui';
import { selAgenteDelPedido } from '../selectores';
import { TEXTOS_PORTAL } from '../textos';

/**
 * Portal de seguimiento (PRD 7.5, W3) `/seguimiento/:numero`: lo que ve la agente de aduanas con el enlace. Estado,
 * ruta y línea de tiempo en solo lectura, más un formulario simulado para reportar el estado: al enviarlo, el pedido
 * cambia en el sistema del importador (origen "portal"), el dueño recibe la alerta y los avisos de quien sigue quedan
 * listos. Las otras pestañas se enteran al instante (sincronización de F2).
 */
export default function Seguimiento() {
  const { numero } = useParamsRuta('seguimiento');
  const imp = useSel(selImportacionPorNumero, { numero });
  const hoy = useHoy();
  const marca = useMarca().nombre;
  const filas = useSel(selImportaciones, { hoy, incluirRecibidas: true });

  if (!imp)
    return (
      <div className="pt-12" data-testid="portal-no-encontrado">
        <div className="border border-line bg-surface">
          <EmptyState icono={Ship} titulo={TEXTOS_PORTAL.tituloVacio} texto={TEXTOS_PORTAL.textoVacio} />
        </div>
      </div>
    );

  const fila = filas.find((f) => f.importacion.id === imp.id);
  const retraso = fila?.retrasoDias ?? 0;
  const posicion = posicionRuta(imp, hoy);
  const llegada = fila?.llegadaEstimada ?? imp.hitos.recibido_bodega.estimada;
  const dias = diferenciaDias(hoy, llegada);
  const desde = imp.hitos[imp.estado].real ?? imp.hitos[imp.estado].estimada;

  return (
    <div className="pb-8 pt-10" data-testid="portal-seguimiento">
      <p className="t-eyebrow text-ink-2">Pedido de {marca}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="t-h1 text-ink" data-testid="portal-numero">
          {imp.numero}
        </h1>
        <InsigniaEstado estado={imp.estado} />
        <InsigniaRetraso dias={retraso} />
      </div>
      <p className="mt-2 t-body text-muted">
        {fila?.proveedorNombre} · {entero(imp.lineas.reduce((a, l) => a + unidadesLinea(l), 0))} prendas ·{' '}
        {textoCarga(imp.carga)}
      </p>
      <p className="mt-4 max-w-[60ch] t-body text-ink" data-testid="portal-estado-actual">
        {imp.estado === 'recibido_bodega' ? (
          <>Recibido en la bodega el {formatoFecha(imp.recepcion?.fecha ?? llegada)}.</>
        ) : (
          <>
            {ETIQUETAS_ESTADO_IMPORTACION[imp.estado]} desde el {formatoFecha(desde)}. Se espera en la bodega
            el {formatoFecha(llegada)}
            {dias > 0 ? ` (en ${plural(dias, 'día', 'días')})` : ''}.
          </>
        )}
      </p>
      <p className="mt-1 t-small text-muted">{TEXTOS_PORTAL.soloLectura}</p>

      <div className="mt-8 space-y-6">
        <Card titulo="Por dónde va" padding="compacta">
          <RutaChina
            className="px-12"
            barcos={[
              {
                id: imp.numero,
                numero: imp.numero,
                progreso: posicion.progreso,
                tramo: posicion.tramo,
                etiqueta: ETIQUETAS_ESTADO_IMPORTACION[imp.estado],
              },
            ]}
            origen={imp.puertoOrigen}
            puertoDestino={imp.puertoDestino}
            fechas={{
              origen: imp.hitos.embarcado.real ? (
                <>
                  Zarpe <Fecha valor={imp.hitos.embarcado.real} />
                </>
              ) : undefined,
              puerto: imp.hitos.en_puerto.real ? (
                <>
                  Llegó <Fecha valor={imp.hitos.en_puerto.real} />
                </>
              ) : (
                <>
                  Est. <Fecha valor={imp.hitos.en_puerto.estimada} />
                </>
              ),
              bodega: (
                <>
                  Est. <Fecha valor={imp.hitos.recibido_bodega.estimada} />
                </>
              ),
            }}
          />
        </Card>

        <Pista id="portal.formulario" alinear="inicio">
          <FormularioPortal numero={imp.numero} importacionId={imp.id} estado={imp.estado} hoy={hoy} />
        </Pista>

        <Card titulo="Línea de tiempo">
          <LineaTiempoImportacion imp={imp} hoy={hoy} retraso={retraso} />
        </Card>
      </div>
    </div>
  );
}

function FormularioPortal({
  numero,
  importacionId,
  estado,
  hoy,
}: {
  numero: string;
  importacionId: string;
  estado: EstadoImportacion;
  hoy: FechaISO;
}) {
  const acciones = useAcciones({ actor: 'portal' });
  const marca = useMarca().nombre;
  const agente = useSel(selAgenteDelPedido, { importacionId });
  const opciones = useMemo(() => estadosParaPortal(estado), [estado]);
  const [elegido, setNuevo] = useState<EstadoImportacion | null>(null);
  const [fecha, setFecha] = useState<FechaISO>(hoy);
  const [nota, setNota] = useState('');
  const [nombreEscrito, setNombre] = useState<string | null>(null);
  // Tras reportar (aquí o desde otra pestaña) el siguiente estado disponible cambia: se parte de él si lo elegido ya no aplica.
  const nuevo: EstadoImportacion | null =
    elegido && opciones.includes(elegido) ? elegido : (opciones[0] ?? null);
  const nombre = nombreEscrito ?? agente?.nombre ?? '';
  const [errores, setErrores] = useState<{ estado?: string; fecha?: string; nota?: string; nombre?: string }>(
    {},
  );
  const [enviado, setEnviado] = useState<{
    estado: EstadoImportacion;
    fecha: FechaISO;
    nombre: string;
  } | null>(null);

  if (opciones.length === 0 && !enviado) {
    const enFabrica = [
      'cotizado',
      'pedido_confirmado',
      'anticipo_pagado',
      'en_produccion',
      'listo_despacho',
      'saldo_pagado',
    ].includes(estado);
    return (
      <Card titulo={TEXTOS_PORTAL.formularioTitulo}>
        <EmptyState
          tamano="compacto"
          icono={Ship}
          titulo={enFabrica ? TEXTOS_PORTAL.enFabricaTitulo : TEXTOS_PORTAL.sinMasTitulo}
          texto={enFabrica ? TEXTOS_PORTAL.enFabricaTexto : TEXTOS_PORTAL.sinMasTexto}
        />
      </Card>
    );
  }

  const enviar = () => {
    if (!nuevo) return setErrores({ estado: 'Elige el estado que va a reportar.' });
    if (!nombre.trim()) return setErrores({ nombre: 'Escriba su nombre para que sepamos quién reporta.' });
    const r = acciones.cambiarEstadoImportacion({
      importacionId,
      estado: nuevo,
      fecha,
      nota: nota.trim() || null,
      origen: 'portal',
      autor: nombre.trim(),
    });
    if (!r.ok) {
      const campo =
        r.error.campo === 'estado' || r.error.campo === 'fecha' || r.error.campo === 'nota'
          ? r.error.campo
          : 'estado';
      return setErrores({ [campo]: r.error.mensaje });
    }
    emitirUI('portal_enviado', { numero });
    setErrores({});
    setNota('');
    setEnviado({ estado: nuevo, fecha, nombre: nombre.trim() });
  };

  return (
    <Card titulo={TEXTOS_PORTAL.formularioTitulo} data-testid="portal-formulario">
      {enviado && (
        <div
          className="mb-6 border border-ink bg-surface-2 p-4"
          role="status"
          data-testid="portal-confirmacion"
        >
          <p className="inline-flex items-center gap-2 t-label font-bold text-ink">
            <CheckCircle2 size={18} className="text-success" aria-hidden />
            {TEXTOS_PORTAL.enviado}
          </p>
          <p className="mt-2 t-body text-ink">
            {marca} ya sabe que {numero} está en{' '}
            <strong className="font-bold">{ETIQUETAS_ESTADO_IMPORTACION[enviado.estado]}</strong> desde el{' '}
            {formatoFecha(enviado.fecha)}. Gracias, {enviado.nombre.split(' ')[0]}.
          </p>
        </div>
      )}
      {opciones.length > 0 ? (
        <>
          <p className="mb-5 max-w-[60ch] t-body text-muted">{TEXTOS_PORTAL.formularioAyuda}</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Select
              etiqueta="Estado que va a reportar"
              valor={nuevo}
              alCambiar={(v) => {
                setNuevo(v as EstadoImportacion);
                setErrores({});
              }}
              opciones={opciones.map((e) => ({ valor: e, etiqueta: ETIQUETAS_ESTADO_IMPORTACION[e] }))}
              error={errores.estado}
              data-testid="portal-estado"
            />
            <SelectorFecha
              etiqueta="Fecha en que ocurrió"
              hoy={hoy}
              valor={fecha}
              alCambiar={setFecha}
              hasta={hoy}
              error={errores.fecha}
            />
            <Input
              etiqueta="Su nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              error={errores.nombre}
              data-testid="portal-nombre"
              autoComplete="name"
            />
            <div className="sm:col-span-2">
              <Textarea
                etiqueta="Nota"
                opcional
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Por ejemplo: levante autorizado, recogen mañana"
                error={errores.nota}
                data-testid="portal-nota"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={enviar} data-testid="portal-enviar">
              Enviar actualización
            </Button>
          </div>
        </>
      ) : (
        <p className="t-body text-muted">{TEXTOS_PORTAL.sinMasTexto}</p>
      )}
    </Card>
  );
}
