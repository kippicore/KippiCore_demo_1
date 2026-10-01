import { useState, type ReactNode } from 'react';
import type { CanalPreferido, Cliente, DatosCliente, Id } from '@/dominio/tipos';
import { PREFIJOS } from '@/dominio/motor/ids';
import { useAcciones, useAhora, useSel, useUsuarioActivo } from '@/estado';
import { fechaHora, MESES } from '@/lib/formato';
import { selLocalesQueVenden } from '@/selectores';
import { avisar, Button, Checkbox, Dialog, GrupoRadio, Input, Select } from '@/ui';
import { TIPOS_TALLA, type ClaveTalla } from '../reglas';
import { TEXTOS } from '../textos';

/**
 * Crear o editar un cliente (`crearCliente` / `editarCliente`). Las validaciones las hace el dominio (celular de
 * 10 dígitos, duplicados, autorización…): el error de cada campo se muestra junto a él, nunca en un aviso.
 */
type Campo = 'nombres' | 'apellidos' | 'documento' | 'celular' | 'correo' | 'cumpleanos' | 'autorizacionDatos';

const DOCUMENTOS = [
  { valor: 'CC', etiqueta: 'Cédula de ciudadanía' },
  { valor: 'CE', etiqueta: 'Cédula de extranjería' },
  { valor: 'PA', etiqueta: 'Pasaporte' },
  { valor: 'NIT', etiqueta: 'NIT' },
];
const MESES_OPCIONES = MESES.map((m, i) => ({ valor: String(i + 1).padStart(2, '0'), etiqueta: m.charAt(0).toUpperCase() + m.slice(1) }));
const DIAS_OPCIONES = Array.from({ length: 31 }, (_, i) => ({ valor: String(i + 1).padStart(2, '0'), etiqueta: String(i + 1) }));
const CANALES: { valor: CanalPreferido; etiqueta: string }[] = [
  { valor: 'whatsapp', etiqueta: TEXTOS.canales.whatsapp },
  { valor: 'instagram', etiqueta: TEXTOS.canales.instagram },
  { valor: 'correo', etiqueta: TEXTOS.canales.correo },
  { valor: 'llamada', etiqueta: TEXTOS.canales.llamada },
];

interface Estado {
  nombres: string;
  apellidos: string;
  tipoDoc: 'CC' | 'CE' | 'PA' | 'NIT';
  numeroDoc: string;
  celular: string;
  correo: string;
  mes: string;
  dia: string;
  anio: string;
  barrio: string;
  localId: string;
  canal: CanalPreferido;
  tratamiento: 'tu' | 'usted';
  tallas: Record<ClaveTalla, string>;
  autoriza: boolean;
}

function inicial(c: Cliente | null, localId: Id | null): Estado {
  return {
    nombres: c?.nombres ?? '',
    apellidos: c?.apellidos ?? '',
    tipoDoc: c?.documento?.tipo ?? 'CC',
    numeroDoc: c?.documento?.numero ?? '',
    celular: c?.celular ?? '',
    correo: c?.correo ?? '',
    mes: c?.cumpleanos?.slice(0, 2) ?? '',
    dia: c?.cumpleanos?.slice(3, 5) ?? '',
    anio: c?.anioNacimiento ? String(c.anioNacimiento) : '',
    barrio: c?.barrio ?? '',
    localId: c?.localRegistroId ?? localId ?? '',
    canal: c?.canalPreferido ?? 'whatsapp',
    tratamiento: c?.tratamiento ?? 'tu',
    tallas: { camisa: c?.tallasDeclaradas.camisa ?? '', pantalon: c?.tallasDeclaradas.pantalon ?? '', blazer: c?.tallasDeclaradas.blazer ?? '', calzado: c?.tallasDeclaradas.calzado ?? '' },
    autoriza: c?.autorizacionDatos.aceptada ?? false,
  };
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-line-soft pt-5 first:border-t-0 first:pt-0">
      <h3 className="mb-4 t-eyebrow text-ink-2">{titulo}</h3>
      {children}
    </section>
  );
}

interface Props {
  /** null = cliente nuevo. */
  cliente: Cliente | null;
  /** Local que se propone al registrar (el activo o el del vendedor). */
  localInicialId: Id | null;
  alCerrar: () => void;
  alGuardado?: (clienteId: Id) => void;
}

export function FormularioCliente({ cliente, localInicialId, alCerrar, alGuardado }: Props) {
  const acciones = useAcciones();
  const ahora = useAhora();
  const { empleado, localFijoId } = useUsuarioActivo();
  const locales = useSel(selLocalesQueVenden);
  const [f, setF] = useState<Estado>(() => inicial(cliente, localFijoId ?? localInicialId ?? locales[0]?.id ?? null));
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [sucio, setSucio] = useState(false);

  const cambiar = <K extends keyof Estado>(k: K, v: Estado[K], campo?: Campo) => {
    setF((a) => ({ ...a, [k]: v }));
    setSucio(true);
    if (campo) setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const guardar = () => {
    setErrores({});
    setGeneral(null);
    const cumple = f.mes && f.dia ? `${f.mes}-${f.dia}` : null;
    const tallasDeclaradas: DatosCliente['tallasDeclaradas'] = {};
    for (const t of TIPOS_TALLA) if (f.tallas[t.clave].trim()) tallasDeclaradas[t.clave] = f.tallas[t.clave].trim();
    const comunes = {
      nombres: f.nombres.trim(),
      apellidos: f.apellidos.trim(),
      documento: f.numeroDoc.trim() ? { tipo: f.tipoDoc, numero: f.numeroDoc.trim() } : null,
      celular: f.celular,
      correo: f.correo.trim() || null,
      cumpleanos: cumple,
      anioNacimiento: f.anio.trim() ? Number(f.anio) : null,
      barrio: f.barrio.trim() || null,
      canalPreferido: f.canal,
      tratamiento: f.tratamiento,
      tallasDeclaradas,
      localRegistroId: f.localId || null,
    };
    const nombre = `${comunes.nombres} ${comunes.apellidos}`.trim();
    const falla = (campo: string | undefined, mensaje: string) => {
      if (campo && ['nombres', 'apellidos', 'documento', 'celular', 'correo', 'cumpleanos', 'autorizacionDatos'].includes(campo)) setErrores({ [campo as Campo]: mensaje });
      else setGeneral(mensaje);
    };
    if (!cliente) {
      const clienteId = acciones.nuevoId(PREFIJOS.cliente);
      const r = acciones.crearCliente({
        clienteId,
        datos: {
          ...comunes,
          autorizacionDatos: { aceptada: f.autoriza, fecha: ahora, canal: 'pos' },
          canalAlta: 'pos',
          registradoPorId: empleado?.id ?? null,
        },
      });
      if (!r.ok) return falla(r.error.campo, r.error.mensaje);
      avisar({ tipo: 'exito', texto: `${nombre} ya es cliente`, detalle: 'Quedó registrado con su trato y su autorización de datos.' });
      alGuardado?.(clienteId);
      alCerrar();
      return;
    }
    const r = acciones.editarCliente({ clienteId: cliente.id, cambios: comunes });
    if (!r.ok) return falla(r.error.campo, r.error.mensaje);
    avisar({ tipo: 'exito', texto: 'Datos guardados', detalle: `Actualizamos la ficha de ${nombre}.` });
    alGuardado?.(cliente.id);
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      ancho="lg"
      eyebrow={cliente ? 'Editar cliente' : 'Clientes'}
      titulo={cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'Nuevo cliente'}
      confirmarAlCerrar={sucio}
      data-testid="formulario-cliente"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="cliente-guardar">
            {cliente ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Seccion titulo="Quién es">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Input etiqueta="Nombres" value={f.nombres} onChange={(e) => cambiar('nombres', e.target.value, 'nombres')} error={errores.nombres} autoComplete="off" data-testid="cliente-nombres" />
            <Input etiqueta="Apellidos" value={f.apellidos} onChange={(e) => cambiar('apellidos', e.target.value, 'apellidos')} error={errores.apellidos} autoComplete="off" data-testid="cliente-apellidos" />
            <Select etiqueta="Tipo de documento" enModal valor={f.tipoDoc} alCambiar={(v) => cambiar('tipoDoc', v as Estado['tipoDoc'], 'documento')} opciones={DOCUMENTOS} />
            <Input etiqueta="Número de documento" opcional value={f.numeroDoc} onChange={(e) => cambiar('numeroDoc', e.target.value.replace(/[^\dA-Za-z]/g, ''), 'documento')} error={errores.documento} inputMode="numeric" autoComplete="off" data-testid="cliente-documento" />
            <Select
              etiqueta="Mes de cumpleaños"
              enModal
              opcional
              placeholder="Mes"
              valor={f.mes || null}
              alCambiar={(v) => cambiar('mes', v, 'cumpleanos')}
              opciones={MESES_OPCIONES}
              error={errores.cumpleanos}
            />
            <div className="grid grid-cols-2 gap-x-4">
              <Select etiqueta="Día" enModal opcional placeholder="Día" valor={f.dia || null} alCambiar={(v) => cambiar('dia', v, 'cumpleanos')} opciones={DIAS_OPCIONES} />
              <Input etiqueta="Año de nacimiento" opcional inputMode="numeric" placeholder="1985" maxLength={4} value={f.anio} onChange={(e) => cambiar('anio', e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
        </Seccion>

        <Seccion titulo="Cómo contactarlo">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Input
              etiqueta="Celular"
              ayuda="10 dígitos, empieza por 3. Es el que usa para WhatsApp."
              inputMode="numeric"
              value={f.celular}
              onChange={(e) => cambiar('celular', e.target.value.replace(/\D/g, '').slice(0, 10), 'celular')}
              error={errores.celular}
              autoComplete="off"
              data-testid="cliente-celular"
            />
            <Input etiqueta="Correo" opcional type="email" value={f.correo} onChange={(e) => cambiar('correo', e.target.value, 'correo')} error={errores.correo} autoComplete="off" data-testid="cliente-correo" />
            <Input etiqueta="Barrio" opcional value={f.barrio} onChange={(e) => cambiar('barrio', e.target.value)} />
            <Select etiqueta="Canal preferido" enModal valor={f.canal} alCambiar={(v) => cambiar('canal', v as CanalPreferido)} opciones={CANALES} />
            <Select
              etiqueta="Local de registro"
              enModal
              valor={f.localId || null}
              alCambiar={(v) => cambiar('localId', v)}
              deshabilitado={!!localFijoId}
              opciones={locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))}
              ayuda={localFijoId ? 'Como vendedor, registras a los clientes en tu local.' : undefined}
            />
          </div>
        </Seccion>

        <Seccion titulo="Cómo le hablamos">
          <GrupoRadio<'tu' | 'usted'>
            tarjetas
            columnas={2}
            valor={f.tratamiento}
            alCambiar={(v) => cambiar('tratamiento', v)}
            opciones={[
              { valor: 'tu', etiqueta: 'Le hablamos de tú', descripcion: TEXTOS.trato.ejemploTu },
              { valor: 'usted', etiqueta: 'Le hablamos de usted', descripcion: TEXTOS.trato.ejemploUsted },
            ]}
          />
        </Seccion>

        <Seccion titulo="Tallas que declaró">
          <div className="grid grid-cols-4 gap-x-4">
            {TIPOS_TALLA.map((t) => (
              <Input
                key={t.clave}
                etiqueta={t.etiqueta}
                opcional
                placeholder={t.clave === 'pantalon' ? '32' : t.clave === 'calzado' ? '41' : t.clave === 'blazer' ? '50' : 'M'}
                value={f.tallas[t.clave]}
                onChange={(e) => cambiar('tallas', { ...f.tallas, [t.clave]: e.target.value.toUpperCase().slice(0, 4) })}
                autoComplete="off"
              />
            ))}
          </div>
          <p className="mt-2 t-small text-muted">Si no las declara, usamos las que más ha comprado.</p>
        </Seccion>

        <Seccion titulo="Autorización de datos">
          {cliente ? (
            <p className="t-body text-ink">
              {cliente.autorizacionDatos.aceptada ? 'Autorizó' : 'No ha autorizado'} el tratamiento de sus datos
              {cliente.autorizacionDatos.aceptada && (
                <>
                  {' '}
                  el <span className="num">{fechaHora(cliente.autorizacionDatos.fecha)}</span> por {TEXTOS.origenes[cliente.autorizacionDatos.canal].toLowerCase()}
                </>
              )}
              .
            </p>
          ) : (
            <div>
              <Checkbox etiqueta={TEXTOS.autorizacion} marcado={f.autoriza} alCambiar={(v) => cambiar('autoriza', v, 'autorizacionDatos')} />
              {errores.autorizacionDatos && (
                <p role="alert" className="mt-1.5 t-small text-danger" data-testid="cliente-error-autorizacion">
                  {errores.autorizacionDatos}
                </p>
              )}
            </div>
          )}
        </Seccion>

        {general && (
          <p role="alert" className="t-small text-danger" data-testid="cliente-error">
            {general}
          </p>
        )}
      </div>
    </Dialog>
  );
}
