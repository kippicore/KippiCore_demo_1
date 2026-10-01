import { useState } from 'react';
import { Check, Eye, Minus, Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import {
  Avatar,
  Badge,
  BotonAccionesFila,
  Button,
  ConfirmarEliminacion,
  EmptyState,
  Icono,
  ItemMenu,
  Menu,
  SeparadorMenu,
  Table,
  avisar,
  useCambiarRol,
  type ColumnaTabla,
} from '@/ui';
import type { Rol, UsuarioDemo } from '@/dominio/tipos';
import { PERSONAS_ROL, puede } from '@/config/permisos';
import { useAcciones, useRolActivo, useSel } from '@/estado';
import { selLocales } from '@/selectores';
import { FormularioUsuario } from '../componentes/FormularioUsuario';
import { MarcoConfiguracion } from '../componentes/Marco';
import { selUsuarios } from '../selectores';
import { GRUPOS_PERMISOS, ROLES, TEXTOS } from '../textos';

const ETIQUETA_ROL: Record<Rol, string> = { dueno: 'Dueño', vendedor: 'Vendedor', bodega: 'Bodega' };

export default function Usuarios() {
  const usuarios = useSel(selUsuarios);
  const locales = useSel(selLocales, { incluirBodega: true });
  const acciones = useAcciones();
  const cambiarRol = useCambiarRol();
  const rolActivo = useRolActivo();
  const [formulario, setFormulario] = useState<{ usuario: UsuarioDemo | null } | null>(null);
  const [aEliminar, setAEliminar] = useState<UsuarioDemo | null>(null);

  const esPersonaDeRol = (u: UsuarioDemo) => Object.values(PERSONAS_ROL).some((p) => p.usuarioId === u.id);
  const nombreLocal = (id: string | null) => (id ? (locales.find((l) => l.id === id)?.nombre ?? '—') : '—');

  const eliminar = () => {
    if (!aEliminar) return;
    const r = acciones.eliminarUsuario({ usuarioId: aEliminar.id });
    if (!r.ok) avisar({ tipo: 'error', texto: r.error.mensaje });
    else avisar({ tipo: 'exito', texto: 'Usuario eliminado', detalle: aEliminar.nombre });
    setAEliminar(null);
  };

  const columnas: ColumnaTabla<UsuarioDemo>[] = [
    {
      id: 'usuario',
      encabezado: 'Usuario',
      truncar: true,
      ancho: '34%',
      ordenar: (u) => u.nombre,
      celda: (u) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar nombre={u.nombre} />
          <span className="block min-w-0">
            <span className="block truncate font-semibold">{u.nombre}</span>
            <span className="block truncate t-small text-muted">{u.correo}</span>
          </span>
        </span>
      ),
    },
    {
      id: 'rol',
      encabezado: 'Rol',
      ordenar: (u) => u.rol,
      celda: (u) => (
        <Badge tono={u.rol === 'dueno' ? 'ink' : 'neutral'} tamano="sm">
          {ETIQUETA_ROL[u.rol]}
        </Badge>
      ),
    },
    { id: 'local', encabezado: 'Local', ordenar: (u) => nombreLocal(u.localFijoId), celda: (u) => nombreLocal(u.localFijoId) },
    {
      id: 'estado',
      encabezado: 'Estado',
      ordenar: (u) => (u.activo ? 0 : 1),
      celda: (u) => (
        <Badge tono={u.activo ? 'success' : 'muted'} tamano="sm">
          {u.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  return (
    <MarcoConfiguracion
      seccion="usuarios"
      titulo="Usuarios y roles"
      subtitulo={TEXTOS.usuarios.subtitulo}
      insignia={<Badge tono="outline">{TEXTOS.usuarios.simulado}</Badge>}
      acciones={
        <Button icono={Plus} onClick={() => setFormulario({ usuario: null })} data-testid="usuarios-nuevo">
          {TEXTOS.usuarios.nuevo}
        </Button>
      }
    >
      <div className="flex flex-col gap-8">
        <div data-testid="usuarios-tabla">
          <Table
            columnas={columnas}
            filas={usuarios}
            clave={(u) => u.id}
            sustantivo={['usuario', 'usuarios']}
            alAbrir={(u) => setFormulario({ usuario: u })}
            accionesFila={(u) => (
              <Menu etiqueta={`Acciones de ${u.nombre}`} disparador={<BotonAccionesFila aria-label={`Acciones de ${u.nombre}`} />}>
                <ItemMenu icono={Pencil} onSelect={() => setFormulario({ usuario: u })}>
                  Editar
                </ItemMenu>
                <ItemMenu icono={Eye} onSelect={() => cambiarRol(u.rol)}>
                  Ver el sistema como {ETIQUETA_ROL[u.rol].toLowerCase()}
                </ItemMenu>
                {!esPersonaDeRol(u) && (
                  <>
                    <SeparadorMenu />
                    <ItemMenu icono={Trash2} peligro onSelect={() => setAEliminar(u)}>
                      Eliminar
                    </ItemMenu>
                  </>
                )}
              </Menu>
            )}
            vacio={<EmptyState tamano="tabla" icono={UserCog} titulo="Todavía no hay usuarios" texto="Crea el primero para ver cómo cambia el sistema según el rol." />}
          />
          <p className="mt-3 max-w-[72ch] t-small text-muted">
            Las tres personas de la demo (dueño, vendedor y bodega) no se pueden eliminar: son las que usa el selector de rol de la barra superior.
          </p>
        </div>

        <section aria-label="Qué ve cada rol" data-testid="usuarios-matriz">
          <h2 className="t-h3 text-ink">Qué puede hacer cada rol</h2>
          <p className="mt-1 max-w-[72ch] t-small text-muted">
            Esta tabla se lee de las reglas reales del sistema: la raya significa que ese rol no lo ve ni lo puede hacer. Prueba cualquiera con «Ver como».
          </p>
          <div className="mt-4 overflow-x-auto border border-line bg-surface">
            <table className="w-full min-w-[560px] t-body">
              <thead>
                <tr className="border-b border-ink">
                  <th scope="col" className="px-5 py-3 text-left t-eyebrow text-ink-2">
                    Acción
                  </th>
                  {ROLES.map((r) => (
                    <th key={r.id} scope="col" className="w-[150px] px-3 py-3 text-center">
                      <span className="block t-eyebrow text-ink">{r.etiqueta}</span>
                      <Button
                        variante="link"
                        tamano="sm"
                        onClick={() => cambiarRol(r.id)}
                        disabled={rolActivo === r.id}
                        data-testid={`usuarios-ver-como-${r.id}`}
                        className="mt-1 t-small"
                      >
                        {rolActivo === r.id ? 'Lo estás viendo' : 'Ver como'}
                      </Button>
                    </th>
                  ))}
                </tr>
              </thead>
              {GRUPOS_PERMISOS.map((g) => (
                <tbody key={g.titulo}>
                  <tr>
                    <th colSpan={4} scope="colgroup" className="bg-surface-2 px-5 py-2 text-left t-eyebrow text-ink-2">
                      {g.titulo}
                    </th>
                  </tr>
                  {g.filas.map((f) => (
                    <tr key={f.permiso} className="border-t border-line-soft" data-testid={`permiso-${f.permiso}`}>
                      <th scope="row" className="px-5 py-3 text-left font-normal">
                        <span className="block font-semibold text-ink">{f.etiqueta}</span>
                        <span className="block t-small text-muted">{f.detalle}</span>
                      </th>
                      {ROLES.map((r) => {
                        const si = puede(r.id, f.permiso);
                        return (
                          <td key={r.id} className="px-3 py-3 text-center" data-testid={`permiso-${f.permiso}-${r.id}`} data-permitido={si}>
                            {si ? (
                              <>
                                <Icono icono={Check} tamano={18} className="mx-auto text-success" />
                                <span className="sr-only">Sí</span>
                              </>
                            ) : (
                              <>
                                <Icono icono={Minus} tamano={18} className="mx-auto text-subtle" />
                                <span className="sr-only">No</span>
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </section>
      </div>

      {formulario && <FormularioUsuario key={formulario.usuario?.id ?? 'nuevo'} usuario={formulario.usuario} alCerrar={() => setFormulario(null)} />}
      <ConfirmarEliminacion
        abierto={aEliminar !== null}
        alCambiar={(a) => !a && setAEliminar(null)}
        pregunta={aEliminar ? `¿Eliminar a ${aEliminar.nombre}?` : ''}
        consecuencias={aEliminar ? `Deja de poder entrar al sistema como ${ETIQUETA_ROL[aEliminar.rol].toLowerCase()}. Lo que hizo antes se conserva en el historial.` : ''}
        accion="Eliminar usuario"
        alConfirmar={eliminar}
      />
    </MarcoConfiguracion>
  );
}
