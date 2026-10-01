import { MoreHorizontal, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import type { Contacto, RolContacto } from '@/dominio/tipos';
import { PREFIJOS } from '@/dominio/motor/ids';
import { nuevoId, useAcciones, useHoy, useSel } from '@/estado';
import { selProveedores } from '@/selectores';
import {
  avisar,
  Avatar,
  Badge,
  BotonPildora,
  Button,
  ConfirmarEliminacion,
  Dialog,
  EmptyState,
  EncabezadoPagina,
  Input,
  ItemMenu,
  Menu,
  SeparadorMenu,
  Segmentado,
  Select,
  Table,
  Toolbar,
  useResaltar,
  type ColumnaTabla,
} from '@/ui';
import { PestanasModulo } from '../componentes/PestanasModulo';
import { selContactosCadena, type FilaContacto } from '../selectores';
import { ETIQUETAS_CANAL, ETIQUETAS_ROL_CONTACTO } from '../textos';

type Borrador = Omit<
  Contacto,
  | 'id'
  | 'creadoEn'
  | 'creadoPor'
  | 'actualizadoEn'
  | 'actualizadoPor'
  | 'origen'
  | 'eliminadoEn'
  | 'eliminadoPor'
  | 'motivoEliminacion'
>;

const VACIO: Borrador = {
  nombre: '',
  empresa: '',
  rol: 'agente_carga',
  proveedorId: null,
  correo: '',
  whatsapp: '',
  pais: 'Colombia',
  idioma: 'es',
  tratamiento: 'usted',
  canalPreferido: 'whatsapp',
  wechat: null,
};

/** Contactos de la cadena de importación: fábrica, agente de carga, agente de aduanas y transportador. */
export default function ContactosCadena() {
  const filas = useSel(selContactosCadena);
  const resaltar = useResaltar();
  const [texto, setTexto] = useState('');
  const [rol, setRol] = useState<RolContacto | 'todos'>('todos');
  const [edicion, setEdicion] = useState<{ id: string | null; borrador: Borrador } | null>(null);
  const [eliminando, setEliminando] = useState<FilaContacto | null>(null);
  const acciones = useAcciones();

  const t = texto.trim().toLowerCase();
  const visibles = filas.filter(
    (f) =>
      (rol === 'todos' || f.contacto.rol === rol) &&
      (!t || `${f.contacto.nombre} ${f.contacto.empresa} ${f.contacto.pais}`.toLowerCase().includes(t)),
  );

  const columnas: ColumnaTabla<FilaContacto>[] = [
    {
      id: 'nombre',
      encabezado: 'Contacto',
      celda: (f) => (
        <span className="flex items-center gap-3">
          <Avatar nombre={f.contacto.nombre} tamano={32} />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{f.contacto.nombre}</span>
            <span className="block truncate t-small text-muted">{f.contacto.empresa}</span>
          </span>
        </span>
      ),
      ordenar: (f) => f.contacto.nombre,
      ancho: 280,
    },
    {
      id: 'rol',
      encabezado: 'Rol',
      celda: (f) => (
        <Badge tono="outline" tamano="sm">
          {ETIQUETAS_ROL_CONTACTO[f.contacto.rol]}
        </Badge>
      ),
      ordenar: (f) => f.contacto.rol,
      ancho: 160,
    },
    {
      id: 'pais',
      encabezado: 'País',
      celda: (f) => f.contacto.pais,
      ordenar: (f) => f.contacto.pais,
      ancho: 90,
    },
    {
      id: 'trato',
      encabezado: 'Cómo se le escribe',
      celda: (f) => (
        <span>
          {f.contacto.idioma === 'en' ? 'Inglés' : f.contacto.tratamiento === 'usted' ? 'En usted' : 'En tú'}
          <span className="block t-small text-muted">
            Prefiere {ETIQUETAS_CANAL[f.contacto.canalPreferido]}
          </span>
        </span>
      ),
      ancho: 150,
    },
    {
      id: 'datos',
      encabezado: 'WhatsApp y correo',
      celda: (f) => (
        <span className="t-small">
          <span className="block num text-ink">{f.contacto.whatsapp || '—'}</span>
          <span className="block truncate text-muted">{f.contacto.correo}</span>
        </span>
      ),
      ancho: 250,
    },
    {
      id: 'pedidos',
      encabezado: 'En pedidos',
      celda: (f) => {
        const activos = f.importaciones.filter((i) => i.estado !== 'recibido_bodega');
        if (f.importaciones.length === 0) return <span className="text-muted">Ninguno</span>;
        return (
          <span className="t-small">
            {activos.length > 0 ? (
              <>
                <Link
                  to={rutas.importacion(activos[0]?.numero ?? '')}
                  className="whitespace-nowrap font-semibold text-ink underline underline-offset-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {activos[0]?.numero}
                </Link>
                {activos.length > 1 && (
                  <span className="whitespace-nowrap text-muted"> +{activos.length - 1}</span>
                )}
              </>
            ) : (
              <span className="text-muted">{f.importaciones.length} ya recibidos</span>
            )}
          </span>
        );
      },
      ancho: 150,
    },
  ];

  const abrirNuevo = () => setEdicion({ id: null, borrador: { ...VACIO } });
  const abrirEditar = (f: FilaContacto) => {
    const {
      id: _id,
      creadoEn: _a,
      creadoPor: _b,
      actualizadoEn: _c,
      actualizadoPor: _d,
      origen: _e,
      eliminadoEn: _f,
      eliminadoPor: _g,
      motivoEliminacion: _h,
      ...datos
    } = f.contacto;
    setEdicion({ id: f.contacto.id, borrador: datos });
  };

  const eliminar = () => {
    if (!eliminando) return;
    const r = acciones.eliminarContacto({ contactoId: eliminando.contacto.id });
    const nombre = eliminando.contacto.nombre;
    setEliminando(null);
    if (!r.ok) avisar({ tipo: 'error', texto: r.error.mensaje });
    else avisar({ tipo: 'exito', texto: `${nombre} salió del directorio` });
  };

  return (
    <div className="pb-16">
      <EncabezadoPagina
        migas={[
          { texto: 'Inicio', a: rutas.inicio() },
          { texto: 'Importaciones', a: rutas.importaciones() },
          { texto: 'Contactos de la cadena' },
        ]}
        titulo="Contactos de la cadena"
        subtitulo="La fábrica, el agente de carga, el agente de aduanas y el transportador: a ellos les llegan los avisos de cada pedido."
        acciones={
          <Button icono={Plus} onClick={abrirNuevo} data-testid="nuevo-contacto">
            Nuevo contacto
          </Button>
        }
        pestanas={<PestanasModulo conContactos />}
      />
      <Table
        className="mt-8"
        data-testid="tabla-contactos"
        columnas={columnas}
        filas={visibles}
        clave={(f) => f.contacto.id}
        sustantivo={['contacto', 'contactos']}
        porPagina={25}
        alAbrir={abrirEditar}
        resaltada={(f) => f.contacto.id === resaltar}
        barra={
          <Toolbar
            buscar={{ valor: texto, alCambiar: setTexto, placeholder: 'Buscar por nombre, empresa o país' }}
            filtros={
              <BotonPildora etiqueta="Rol" valor={rol === 'todos' ? 'Todos' : ETIQUETAS_ROL_CONTACTO[rol]}>
                <Select
                  etiqueta="Rol"
                  etiquetaOculta
                  valor={rol}
                  alCambiar={(v) => setRol(v as RolContacto | 'todos')}
                  opciones={[
                    { valor: 'todos', etiqueta: 'Todos los roles' },
                    ...(Object.keys(ETIQUETAS_ROL_CONTACTO) as RolContacto[]).map((r) => ({
                      valor: r,
                      etiqueta: ETIQUETAS_ROL_CONTACTO[r],
                    })),
                  ]}
                />
              </BotonPildora>
            }
            chips={
              rol !== 'todos'
                ? [
                    {
                      id: 'rol',
                      texto: `Rol: ${ETIQUETAS_ROL_CONTACTO[rol]}`,
                      alQuitar: () => setRol('todos'),
                    },
                  ]
                : []
            }
            alLimpiar={() => {
              setRol('todos');
              setTexto('');
            }}
          />
        }
        accionesFila={(f) => (
          <Menu
            disparador={
              <Button
                variante="ghost"
                tamano="sm"
                soloIcono
                icono={MoreHorizontal}
                aria-label={`Acciones de ${f.contacto.nombre}`}
              />
            }
            etiqueta="Acciones del contacto"
          >
            <ItemMenu icono={Pencil} onSelect={() => abrirEditar(f)}>
              Editar
            </ItemMenu>
            <SeparadorMenu />
            <ItemMenu icono={Trash2} peligro onSelect={() => setEliminando(f)}>
              Eliminar
            </ItemMenu>
          </Menu>
        )}
        vacio={
          <EmptyState
            tamano="tabla"
            icono={Users}
            titulo={
              filas.length === 0 ? 'Aún no hay contactos en la cadena' : 'Ningún contacto con este filtro'
            }
            texto="Agrega a la fábrica, al agente de carga, al agente de aduanas y al transportador para que cada aviso llegue a quien le toca."
            accion={<Button onClick={abrirNuevo}>Nuevo contacto</Button>}
          />
        }
      />
      {edicion && (
        <FormularioContacto
          key={edicion.id ?? 'nuevo'}
          inicial={edicion.borrador}
          id={edicion.id}
          alCerrar={() => setEdicion(null)}
        />
      )}
      <ConfirmarEliminacion
        abierto={eliminando !== null}
        alCambiar={(a) => !a && setEliminando(null)}
        pregunta={`¿Eliminar a ${eliminando?.contacto.nombre ?? ''}?`}
        consecuencias={
          eliminando && eliminando.importaciones.length > 0
            ? `Aparece en ${eliminando.importaciones.length} ${eliminando.importaciones.length === 1 ? 'pedido' : 'pedidos'}: dejará de salir como destinatario en “Notificar a”.`
            : 'No aparece en ningún pedido; solo se quita del directorio.'
        }
        accion="Eliminar contacto"
        alConfirmar={eliminar}
      />
    </div>
  );
}

function FormularioContacto({
  inicial,
  id,
  alCerrar,
}: {
  inicial: Borrador;
  id: string | null;
  alCerrar: () => void;
}) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const fabricas = useSel(selProveedores, { hoy, tipo: 'fabrica' });
  const [d, setD] = useState<Borrador>(inicial);
  const [error, setError] = useState<{ campo: string; mensaje: string } | null>(null);
  const cambiar = (p: Partial<Borrador>) => {
    setD((x) => ({ ...x, ...p }));
    setError(null);
  };
  const e = (campo: string) => (error?.campo === campo ? error.mensaje : undefined);

  const guardar = () => {
    const datos: Borrador = {
      ...d,
      nombre: d.nombre.trim(),
      empresa: d.empresa.trim(),
      correo: d.correo.trim(),
      whatsapp: d.whatsapp.trim(),
      proveedorId: d.rol === 'proveedor' ? d.proveedorId : null,
      wechat: d.wechat?.trim() || null,
    };
    if (!datos.nombre) return setError({ campo: 'nombre', mensaje: 'Escribe el nombre del contacto.' });
    if (!datos.empresa) return setError({ campo: 'empresa', mensaje: 'Escribe la empresa.' });
    if (datos.rol === 'proveedor' && !datos.proveedorId)
      return setError({ campo: 'proveedorId', mensaje: 'Elige a qué fábrica pertenece.' });
    const r = id
      ? acciones.editarContacto({ contactoId: id, cambios: datos })
      : acciones.crearContacto({ contactoId: nuevoId(PREFIJOS.contacto), datos });
    if (!r.ok) return setError({ campo: r.error.campo ?? 'general', mensaje: r.error.mensaje });
    avisar({ tipo: 'exito', texto: id ? 'Contacto actualizado' : 'Contacto agregado a la cadena' });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      ancho="lg"
      eyebrow="Contactos de la cadena"
      titulo={id ? 'Editar contacto' : 'Nuevo contacto'}
      confirmarAlCerrar={JSON.stringify(d) !== JSON.stringify(inicial)}
      data-testid="dialogo-contacto"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="guardar-contacto">
            {id ? 'Guardar cambios' : 'Agregar contacto'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Input
          etiqueta="Nombre"
          value={d.nombre}
          onChange={(ev) => cambiar({ nombre: ev.target.value })}
          error={e('nombre')}
          data-testid="contacto-nombre"
        />
        <Input
          etiqueta="Empresa"
          value={d.empresa}
          onChange={(ev) => cambiar({ empresa: ev.target.value })}
          error={e('empresa')}
        />
        <Select
          etiqueta="Rol"
          valor={d.rol}
          alCambiar={(v) => {
            const rol = v as RolContacto;
            cambiar({
              rol,
              idioma: rol === 'proveedor' ? 'en' : 'es',
              tratamiento: rol === 'proveedor' ? 'tu' : 'usted',
              canalPreferido:
                rol === 'proveedor'
                  ? 'wechat'
                  : d.canalPreferido === 'wechat'
                    ? 'whatsapp'
                    : d.canalPreferido,
              pais: rol === 'proveedor' ? 'China' : 'Colombia',
            });
          }}
          opciones={(Object.keys(ETIQUETAS_ROL_CONTACTO) as RolContacto[]).map((r) => ({
            valor: r,
            etiqueta: ETIQUETAS_ROL_CONTACTO[r],
          }))}
          enModal
        />
        {d.rol === 'proveedor' ? (
          <Select
            etiqueta="Fábrica"
            placeholder="Elige la fábrica"
            valor={d.proveedorId}
            alCambiar={(v) => cambiar({ proveedorId: v })}
            opciones={fabricas.map((f) => ({ valor: f.proveedor.id, etiqueta: f.proveedor.nombreCorto }))}
            error={e('proveedorId')}
            enModal
          />
        ) : (
          <Input etiqueta="País" value={d.pais} onChange={(ev) => cambiar({ pais: ev.target.value })} />
        )}
        <Input
          etiqueta="WhatsApp"
          placeholder="+57 310 123 4567"
          value={d.whatsapp}
          onChange={(ev) => cambiar({ whatsapp: ev.target.value })}
          error={e('whatsapp')}
          inputMode="tel"
          ayuda="Con indicativo del país."
        />
        <Input
          etiqueta="Correo"
          type="email"
          value={d.correo}
          onChange={(ev) => cambiar({ correo: ev.target.value })}
          error={e('correo')}
        />
        <div>
          <p className="mb-1.5 t-label text-ink">Idioma de los avisos</p>
          <Segmentado
            etiqueta="Idioma de los avisos"
            valor={d.idioma}
            alCambiar={(v) => cambiar({ idioma: v })}
            opciones={[
              { valor: 'es', etiqueta: 'Español' },
              { valor: 'en', etiqueta: 'Inglés' },
            ]}
          />
        </div>
        <div>
          <p className="mb-1.5 t-label text-ink">Tratamiento</p>
          <Segmentado
            etiqueta="Tratamiento"
            valor={d.tratamiento}
            alCambiar={(v) => cambiar({ tratamiento: v })}
            opciones={[
              { valor: 'usted', etiqueta: 'Usted' },
              { valor: 'tu', etiqueta: 'Tú' },
            ]}
          />
        </div>
        <div>
          <p className="mb-1.5 t-label text-ink">Canal preferido</p>
          <Segmentado
            etiqueta="Canal preferido"
            valor={d.canalPreferido}
            alCambiar={(v) => cambiar({ canalPreferido: v })}
            opciones={[
              { valor: 'whatsapp', etiqueta: 'WhatsApp' },
              { valor: 'correo', etiqueta: 'Correo' },
              { valor: 'wechat', etiqueta: 'WeChat' },
            ]}
          />
        </div>
        <Input
          etiqueta="Usuario de WeChat"
          opcional
          value={d.wechat ?? ''}
          onChange={(ev) => cambiar({ wechat: ev.target.value })}
          ayuda="WeChat es simulado: se copia el mensaje."
        />
      </div>
      {error && !['nombre', 'empresa', 'proveedorId', 'whatsapp', 'correo'].includes(error.campo) && (
        <p className="mt-4 border-l-2 border-danger pl-3 t-small text-ink">{error.mensaje}</p>
      )}
    </Dialog>
  );
}
