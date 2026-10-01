import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Pencil, Plus, Store, Trash2 } from 'lucide-react';
import {
  Badge,
  BotonAccionesFila,
  Button,
  ConfirmarEliminacion,
  Dialog,
  Dinero,
  EmptyState,
  FranjaResumen,
  ItemMenu,
  Menu,
  SeparadorMenu,
  Table,
  avisar,
  type ColumnaTabla,
} from '@/ui';
import { rutas } from '@/app/rutas';
import { useAcciones, useSel } from '@/estado';
import { entero, plural } from '@/lib/formato';
import { textoHorarioCorto } from '../calculos';
import { FormularioLocal } from '../componentes/FormularioLocal';
import { MarcoConfiguracion } from '../componentes/Marco';
import { selLocalesConfig, type FilaLocalConfig } from '../selectores';
import { ETIQUETA_TIPO_LOCAL, TEXTOS } from '../textos';

export default function Locales() {
  const filas = useSel(selLocalesConfig);
  const acciones = useAcciones();
  const navegar = useNavigate();
  const [formulario, setFormulario] = useState<{ local: FilaLocalConfig | null } | null>(null);
  const [aEliminar, setAEliminar] = useState<FilaLocalConfig | null>(null);
  const [bloqueado, setBloqueado] = useState<FilaLocalConfig | null>(null);

  const quienVende = filas.filter((f) => f.local.vende);
  const arriendoTotal = filas.reduce((s, f) => s + f.local.arriendoMensual, 0);
  const siguienteOrden = filas.reduce((m, f) => Math.max(m, f.local.orden), 0) + 1;

  const pedirEliminar = (f: FilaLocalConfig) => (f.impedimentos.length > 0 ? setBloqueado(f) : setAEliminar(f));

  const eliminar = () => {
    if (!aEliminar) return;
    const r = acciones.eliminarLocal({ localId: aEliminar.local.id, motivo: null });
    if (!r.ok) avisar({ tipo: 'error', texto: r.error.mensaje });
    else avisar({ tipo: 'exito', texto: 'Local eliminado', detalle: `${aEliminar.local.nombre} ya no aparece en las listas. Su historial se conserva.` });
    setAEliminar(null);
  };

  const columnas: ColumnaTabla<FilaLocalConfig>[] = [
    {
      id: 'local',
      encabezado: 'Local',
      truncar: true,
      ancho: '27%',
      ordenar: (f) => f.local.orden,
      celda: (f) => (
        <span className="block min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{f.local.nombre}</span>
            <Badge tono="outline" tamano="sm">
              {f.local.codigo}
            </Badge>
          </span>
          <span className="block truncate t-small text-muted">
            {ETIQUETA_TIPO_LOCAL[f.local.tipo]}
            {!f.local.vende && ' · no vende'}
          </span>
        </span>
      ),
    },
    {
      id: 'direccion',
      encabezado: 'Dirección',
      truncar: true,
      ancho: '22%',
      celda: (f) => (
        <span className="block min-w-0">
          <span className="block truncate">{f.local.direccion}</span>
          <span className="block truncate t-small text-muted">{f.local.zona}</span>
        </span>
      ),
    },
    { id: 'horario', encabezado: 'Horario', truncar: true, ancho: '22%', celda: (f) => <span className="t-small">{textoHorarioCorto(f.local.horario)}</span> },
    { id: 'arriendo', encabezado: 'Arriendo', numerica: true, alinear: 'der', ordenar: (f) => f.local.arriendoMensual, celda: (f) => <Dinero valor={f.local.arriendoMensual} corta /> },
    { id: 'unidades', encabezado: 'Unidades', numerica: true, alinear: 'der', ordenar: (f) => f.unidades, celda: (f) => entero(f.unidades) },
  ];

  return (
    <MarcoConfiguracion
      seccion="locales"
      titulo="Locales"
      subtitulo={TEXTOS.locales.subtitulo}
      acciones={
        <Button icono={Plus} onClick={() => setFormulario({ local: null })} data-testid="locales-nuevo">
          {TEXTOS.locales.nuevo}
        </Button>
      }
    >
      <FranjaResumen
        cifras={[
          { etiqueta: 'Locales que venden', valor: entero(quienVende.length) },
          { etiqueta: 'En total (con bodega)', valor: entero(filas.length) },
          { etiqueta: 'Arriendo mensual', valor: <Dinero valor={arriendoTotal} corta /> },
          { etiqueta: 'Unidades en existencia', valor: entero(filas.reduce((s, f) => s + f.unidades, 0)) },
        ]}
      />
      <div data-testid="locales-tabla" className="mt-4">
        <Table
          columnas={columnas}
          filas={filas}
          clave={(f) => f.local.id}
          sustantivo={['local', 'locales']}
          alAbrir={(f) => setFormulario({ local: f })}
          accionesFila={(f) => (
            <Menu etiqueta={`Acciones de ${f.local.nombre}`} disparador={<BotonAccionesFila aria-label={`Acciones de ${f.local.nombre}`} data-testid={`local-acciones-${f.local.codigo}`} />}>
              <ItemMenu icono={Pencil} onSelect={() => setFormulario({ local: f })}>
                Editar
              </ItemMenu>
              <SeparadorMenu />
              <ItemMenu icono={Trash2} peligro onSelect={() => pedirEliminar(f)}>
                Eliminar
              </ItemMenu>
            </Menu>
          )}
          vacio={
            <EmptyState
              tamano="tabla"
              icono={Store}
              titulo={TEXTOS.locales.vacioTitulo}
              texto={TEXTOS.locales.vacioTexto}
              accion={
                <Button icono={Plus} onClick={() => setFormulario({ local: null })}>
                  {TEXTOS.locales.nuevo}
                </Button>
              }
            />
          }
        />
      </div>
      <p className="mt-4 max-w-[72ch] t-small text-muted">
        Para mover mercancía entre locales usa{' '}
        <Link to={rutas.traslados()} className="font-semibold text-ink underline underline-offset-4">
          Traslados
        </Link>
        . Un local eliminado conserva su historial de ventas.
      </p>

      {formulario && (
        <FormularioLocal
          key={formulario.local?.local.id ?? 'nuevo'}
          local={formulario.local?.local ?? null}
          codigosOcupados={filas.map((f) => f.local.codigo.toUpperCase())}
          siguienteOrden={siguienteOrden}
          alCerrar={() => setFormulario(null)}
        />
      )}

      <ConfirmarEliminacion
        abierto={aEliminar !== null}
        alCambiar={(a) => !a && setAEliminar(null)}
        pregunta={aEliminar ? `¿Eliminar ${aEliminar.local.nombre}?` : ''}
        consecuencias={
          aEliminar ? (
            <>
              Dejará de aparecer en el selector de local, el inventario y los reportes nuevos. Se conservan sus {plural(aEliminar.ventas, 'venta')} en el historial
              {aEliminar.empleados > 0 && ` y ${plural(aEliminar.empleados, 'persona')} del equipo quedará sin local hasta que la reasignes en Personal`}. Su arriendo de{' '}
              <Dinero valor={aEliminar.local.arriendoMensual} /> al mes deja de contarse.
            </>
          ) : (
            ''
          )
        }
        accion="Eliminar local"
        alConfirmar={eliminar}
      />

      <Dialog
        abierto={bloqueado !== null}
        alCambiar={(a) => !a && setBloqueado(null)}
        titulo={bloqueado ? TEXTOS.locales.noSePuedeTitulo(bloqueado.local.nombre) : ''}
        descripcion={TEXTOS.locales.noSePuedeTexto}
        ancho="sm"
        pie={
          <>
            <Button variante="secondary" onClick={() => setBloqueado(null)}>
              Entendido
            </Button>
            <Button
              onClick={() => {
                setBloqueado(null);
                navegar(rutas.traslados());
              }}
            >
              Ir a Traslados
            </Button>
          </>
        }
        data-testid="local-bloqueado"
      >
        <ul className="list-disc space-y-2 pl-5 t-body text-ink">
          {bloqueado?.impedimentos.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </Dialog>
    </MarcoConfiguracion>
  );
}
