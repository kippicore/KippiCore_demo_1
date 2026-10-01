import { useMemo, useState } from 'react';
import type { Contacto, DatosContacto, Proveedor, RolContacto } from '@/dominio/tipos';
import { PREFIJOS } from '@/dominio/motor/ids';
import { useAcciones } from '@/estado';
import { Button, Dialog, GrupoRadio, Input, Select, avisar } from '@/ui';
import { validarContacto, type ErroresContacto } from '../calculos';
import { CANALES, ROLES_CONTACTO } from '../textos';

/** Crear o editar un contacto de un proveedor (WeChat simulado, idioma y tratamiento para los mensajes). */

type Borrador = Omit<DatosContacto, 'proveedorId'>;

function borradorDe(c: Contacto | null, p: Proveedor): Borrador {
  if (c)
    return {
      nombre: c.nombre,
      empresa: c.empresa,
      rol: c.rol,
      correo: c.correo,
      whatsapp: c.whatsapp,
      pais: c.pais,
      idioma: c.idioma,
      tratamiento: c.tratamiento,
      canalPreferido: c.canalPreferido,
      wechat: c.wechat,
    };
  const fabrica = p.tipo === 'fabrica';
  return {
    nombre: '',
    empresa: p.nombre,
    rol: fabrica ? 'proveedor' : 'otro',
    correo: '',
    whatsapp: '',
    pais: p.pais,
    idioma: fabrica ? 'en' : 'es',
    tratamiento: 'usted',
    canalPreferido: fabrica ? 'wechat' : 'whatsapp',
    wechat: null,
  };
}

export interface PropsFormularioContacto {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  proveedor: Proveedor;
  /** null = contacto nuevo. */
  contacto: Contacto | null;
}

export function FormularioContacto({ abierto, alCambiar, proveedor, contacto }: PropsFormularioContacto) {
  if (!abierto) return null;
  return <Cuerpo key={contacto?.id ?? 'nuevo'} alCambiar={alCambiar} proveedor={proveedor} contacto={contacto} />;
}

function Cuerpo({ alCambiar, proveedor, contacto }: Omit<PropsFormularioContacto, 'abierto'>) {
  const acciones = useAcciones();
  const inicial = useMemo(() => borradorDe(contacto, proveedor), [contacto, proveedor]);
  const [b, setB] = useState<Borrador>(inicial);
  const [errores, setErrores] = useState<ErroresContacto & { general?: string }>({});
  const editando = contacto !== null;
  const sucio = JSON.stringify(b) !== JSON.stringify(inicial);
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => {
    setB((x) => ({ ...x, [k]: v }));
    setErrores((e) => ({ ...e, [k]: undefined, general: undefined }));
  };

  const guardar = () => {
    const e = validarContacto(b);
    if (Object.keys(e).length) return setErrores(e);
    const datos: DatosContacto = { ...b, nombre: b.nombre.trim(), empresa: b.empresa.trim(), correo: b.correo.trim(), whatsapp: b.whatsapp.trim(), wechat: b.wechat?.trim() || null, proveedorId: proveedor.id };
    const r = editando ? acciones.editarContacto({ contactoId: contacto.id, cambios: datos }) : acciones.crearContacto({ contactoId: acciones.nuevoId(PREFIJOS.contacto), datos });
    if (!r.ok) {
      const campo = r.error.campo;
      return setErrores(campo === 'nombre' || campo === 'correo' || campo === 'whatsapp' ? { [campo]: r.error.mensaje } : { general: r.error.mensaje });
    }
    avisar({ tipo: 'exito', texto: editando ? `Cambios guardados en ${datos.nombre}` : `${datos.nombre} quedó como contacto de ${proveedor.nombreCorto}` });
    alCambiar(false);
  };

  return (
    <Dialog
      abierto
      alCambiar={alCambiar}
      confirmarAlCerrar={sucio}
      ancho="md"
      data-testid="formulario-contacto"
      eyebrow={proveedor.nombreCorto}
      titulo={editando ? `Editar a ${contacto.nombre}` : 'Nuevo contacto'}
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="guardar-contacto">
            {editando ? 'Guardar cambios' : 'Agregar contacto'}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-2 gap-x-6 gap-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
        noValidate
      >
        {errores.general && (
          <p role="alert" className="col-span-2 border border-danger bg-danger-soft px-3 py-2 t-small text-ink">
            {errores.general}
          </p>
        )}
        <Input etiqueta="Nombre" value={b.nombre} onChange={(e) => set('nombre', e.target.value)} error={errores.nombre} placeholder="Lily Chen" data-testid="campo-contacto-nombre" />
        <Input etiqueta="Empresa" value={b.empresa} onChange={(e) => set('empresa', e.target.value)} />
        <Select
          etiqueta="Rol"
          enModal
          valor={b.rol}
          alCambiar={(v) => set('rol', v as RolContacto)}
          opciones={(Object.keys(ROLES_CONTACTO) as RolContacto[]).map((r) => ({ valor: r, etiqueta: ROLES_CONTACTO[r] }))}
        />
        <Input etiqueta="País" value={b.pais} onChange={(e) => set('pais', e.target.value)} />
        <Input etiqueta="Correo" type="email" value={b.correo} onChange={(e) => set('correo', e.target.value)} error={errores.correo} placeholder="nombre@empresa.com" data-testid="campo-contacto-correo" />
        <Input etiqueta="WhatsApp" value={b.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} error={errores.whatsapp} placeholder="+86 138 2716 4405" inputMode="tel" data-testid="campo-contacto-whatsapp" />
        <Input etiqueta="WeChat" opcional value={b.wechat ?? ''} onChange={(e) => set('wechat', e.target.value)} ayuda="Es un ID de ejemplo: en la demo, WeChat es simulado." />
        <Select
          etiqueta="Canal preferido"
          enModal
          valor={b.canalPreferido}
          alCambiar={(v) => set('canalPreferido', v as Borrador['canalPreferido'])}
          opciones={(Object.keys(CANALES) as (keyof typeof CANALES)[]).map((c) => ({ valor: c, etiqueta: CANALES[c] }))}
        />
        <GrupoRadio<Borrador['idioma']>
          orientacion="horizontal"
          etiqueta="Idioma de los mensajes"
          valor={b.idioma}
          alCambiar={(v) => set('idioma', v)}
          opciones={[
            { valor: 'es', etiqueta: 'Español' },
            { valor: 'en', etiqueta: 'Inglés' },
          ]}
        />
        <GrupoRadio<Borrador['tratamiento']>
          orientacion="horizontal"
          etiqueta="Tratamiento"
          valor={b.tratamiento}
          alCambiar={(v) => set('tratamiento', v)}
          opciones={[
            { valor: 'usted', etiqueta: 'Usted' },
            { valor: 'tu', etiqueta: 'Tú' },
          ]}
        />
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}
