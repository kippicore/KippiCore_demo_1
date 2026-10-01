import { useState } from 'react';
import { Button, Dialog, Input, Select, Switch, avisar, iniciales } from '@/ui';
import type { Rol, UsuarioDemo } from '@/dominio/tipos';
import { PREFIJOS } from '@/dominio/motor/ids';
import { PERSONAS_ROL } from '@/config/permisos';
import { useAcciones, useHoy, useSel } from '@/estado';
import { selEmpleadosActivos, selLocales } from '@/selectores';
import { ROLES } from '../textos';

const SIN_LOCAL = 'sin-local';
const SIN_EMPLEADO = 'sin-empleado';
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Campo = 'nombre' | 'correo' | 'rol';

/** Crear o editar un usuario de la demo (simulado: no hay contraseñas). */
export function FormularioUsuario({ usuario, alCerrar }: { usuario: UsuarioDemo | null; alCerrar: () => void }) {
  const acciones = useAcciones();
  const hoy = useHoy();
  const locales = useSel(selLocales, { incluirBodega: true });
  const empleados = useSel(selEmpleadosActivos, { fecha: hoy });
  const esPersonaDeRol = !!usuario && Object.values(PERSONAS_ROL).some((p) => p.usuarioId === usuario.id);

  const inicial = {
    nombre: usuario?.nombre ?? '',
    correo: usuario?.correo ?? '',
    rol: usuario?.rol ?? ('vendedor' as Rol),
    localId: usuario?.localFijoId ?? SIN_LOCAL,
    empleadoId: usuario?.empleadoId ?? SIN_EMPLEADO,
    activo: usuario?.activo ?? true,
  };
  const [nombre, setNombre] = useState(inicial.nombre);
  const [correo, setCorreo] = useState(inicial.correo);
  const [rol, setRol] = useState<Rol>(inicial.rol);
  const [localId, setLocalId] = useState(inicial.localId);
  const [empleadoId, setEmpleadoId] = useState(inicial.empleadoId);
  const [activo, setActivo] = useState(inicial.activo);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const sucio = JSON.stringify({ nombre, correo, rol, localId, empleadoId, activo }) !== JSON.stringify(inicial);

  const guardar = () => {
    setGeneral(null);
    const e: Partial<Record<Campo, string>> = {};
    if (!nombre.trim()) e.nombre = 'Escribe el nombre de la persona.';
    if (!RE_CORREO.test(correo.trim())) e.correo = 'Escribe un correo válido, por ejemplo ana@minegocio.com.';
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    const datos = {
      nombre: nombre.trim(),
      correo: correo.trim(),
      iniciales: iniciales(nombre),
      rol,
      empleadoId: empleadoId === SIN_EMPLEADO ? null : empleadoId,
      localFijoId: rol === 'dueno' || localId === SIN_LOCAL ? null : localId,
      activo,
    };
    const r = usuario ? acciones.editarUsuario({ usuarioId: usuario.id, cambios: datos }) : acciones.crearUsuario({ usuarioId: acciones.nuevoId(PREFIJOS.usuario), datos });
    if (!r.ok) {
      if (r.error.campo === 'nombre' || r.error.campo === 'correo' || r.error.campo === 'rol') setErrores({ [r.error.campo]: r.error.mensaje });
      else setGeneral(r.error.mensaje);
      return;
    }
    avisar({ tipo: 'exito', texto: usuario ? 'Usuario actualizado' : 'Usuario creado', detalle: `${datos.nombre} · ${ROLES.find((x) => x.id === rol)?.etiqueta}` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Usuarios y roles"
      titulo={usuario ? `Editar a ${usuario.nombre}` : 'Nuevo usuario'}
      descripcion="Simulado: sirve para ver cómo cambia la pantalla según el rol. No hay contraseñas."
      ancho="md"
      confirmarAlCerrar={sucio}
      data-testid="usuario-formulario"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="usuario-guardar">
            {usuario ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="grid grid-cols-2 gap-x-6 gap-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
      >
        <Input etiqueta="Nombre completo" value={nombre} error={errores.nombre} onChange={(ev) => setNombre(ev.target.value)} autoComplete="off" data-testid="usuario-nombre" />
        <Input etiqueta="Correo" type="email" value={correo} error={errores.correo} onChange={(ev) => setCorreo(ev.target.value)} autoComplete="off" data-testid="usuario-correo" />
        <Select
          etiqueta="Rol"
          valor={rol}
          alCambiar={(v) => setRol(v as Rol)}
          deshabilitado={esPersonaDeRol}
          ayuda={esPersonaDeRol ? 'Es la persona de la demo para este rol: su rol no se cambia.' : ROLES.find((x) => x.id === rol)?.descripcion}
          enModal
          opciones={ROLES.map((r) => ({ valor: r.id, etiqueta: r.etiqueta }))}
        />
        {rol !== 'dueno' ? (
          <Select
            etiqueta="Local donde trabaja"
            valor={localId}
            alCambiar={setLocalId}
            enModal
            opciones={[{ valor: SIN_LOCAL, etiqueta: 'Ninguno en particular' }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
          />
        ) : (
          <span aria-hidden />
        )}
        <Select
          className="col-span-2"
          etiqueta="Persona del equipo"
          opcional
          valor={empleadoId}
          alCambiar={setEmpleadoId}
          enModal
          ayuda="Si la persona está en Personal, ligar el usuario deja que marque su asistencia y vea sus turnos."
          opciones={[{ valor: SIN_EMPLEADO, etiqueta: 'Ninguna' }, ...empleados.map((x) => ({ valor: x.id, etiqueta: `${x.nombres} ${x.apellidos}` }))]}
        />
        <div className="col-span-2">
          <Switch etiqueta="Usuario activo" activo={activo} alCambiar={setActivo} valorTexto={activo ? 'Puede entrar' : 'No puede entrar'} />
        </div>
        {general && <p className="col-span-2 t-small text-danger">{general}</p>}
      </form>
    </Dialog>
  );
}
