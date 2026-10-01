import { Pencil, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Id } from '@/dominio/tipos';
import { useEstadoDominio, useHoy, useSel } from '@/estado';
import { selClientes } from '@/selectores';
import { celular as formatoCelular, hora } from '@/lib/formato';
import { Avatar, BotonIcono, BuscadorCliente, Button, Checkbox, Dialog, Icono, Input, Select } from '@/ui';
import type { VendedoresPos } from '../selectores';
import type { ClienteSeleccionado, DatosClienteRapido } from '../estadoPos';
import { TEXTOS } from '../textos';

/**
 * Fila superior del carrito: cliente (Consumidor final por defecto; buscar o crear en el mismo paso) y vendedor
 * (el dueño elige a quién se le asigna la venta —de eso depende la comisión—; el vendedor va fijo).
 */
export interface PropsClienteVendedor {
  cliente: ClienteSeleccionado;
  alCliente: (c: ClienteSeleccionado) => void;
  errorCliente: string | null;
  vendedorId: Id | null;
  alVendedor: (id: Id) => void;
  vendedores: VendedoresPos;
  /** El vendedor no elige: la venta queda a su nombre. */
  vendedorFijo: boolean;
}

export function ClienteVendedor({ cliente, alCliente, errorCliente, vendedorId, alVendedor, vendedores, vendedorFijo }: PropsClienteVendedor) {
  const e = useEstadoDominio();
  const [buscando, setBuscando] = useState(false);
  const [creando, setCreando] = useState<string | null>(null);
  const contenedor = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (buscando) contenedor.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [buscando]);

  const nombre =
    cliente.tipo === 'consumidor'
      ? 'Consumidor final'
      : cliente.tipo === 'existente'
        ? `${e.clientes[cliente.id]?.nombres ?? ''} ${e.clientes[cliente.id]?.apellidos ?? ''}`.trim()
        : `${cliente.datos.nombres} ${cliente.datos.apellidos}`.trim();
  const detalle =
    cliente.tipo === 'existente'
      ? formatoCelular(e.clientes[cliente.id]?.celular ?? '')
      : cliente.tipo === 'nuevo'
        ? `${formatoCelular(cliente.datos.celular)} · cliente nuevo`
        : 'sin datos del cliente';
  const nombreVendedor = vendedores.vendedores.find((v) => v.empleadoId === vendedorId)?.nombre ?? '';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3" data-testid="pos-cliente-vendedor">
      <div className="min-w-0">
        <p className="mb-0.5 t-eyebrow text-ink-2">Cliente</p>
        {buscando ? (
          <div ref={contenedor} className="flex items-center gap-1">
            <BuscadorCliente
              className="min-w-0 flex-1"
              alElegir={(c) => {
                alCliente(c ? { tipo: 'existente', id: c.id } : { tipo: 'consumidor' });
                setBuscando(false);
              }}
              alCrear={(t) => {
                setCreando(t);
                setBuscando(false);
              }}
            />
            <Button variante="ghost" tamano="sm" onClick={() => setBuscando(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex h-10 items-center gap-2 border border-line-strong bg-surface px-2" data-testid="pos-cliente-actual">
            <Avatar nombre={cliente.tipo === 'consumidor' ? 'Consumidor final' : nombre || 'Cliente'} tamano={24} />
            <span className="min-w-0 flex-1 truncate t-label text-ink" title={`${nombre} · ${detalle}`} data-testid="pos-cliente-nombre">
              {nombre}
            </span>
            <BotonIcono icono={Pencil} etiqueta="Cambiar de cliente" variante="ghost" tamano="sm" onClick={() => setBuscando(true)} data-testid="pos-cambiar-cliente" />
            <BotonIcono icono={UserPlus} etiqueta="Crear cliente nuevo" variante="ghost" tamano="sm" onClick={() => setCreando('')} data-testid="pos-crear-cliente" />
          </div>
        )}
        {errorCliente && (
          <p role="alert" className="mt-1 t-small text-danger" data-testid="pos-error-cliente">
            {errorCliente}
          </p>
        )}
      </div>
      <div className="w-[188px]">
        <p className="mb-0.5 t-eyebrow text-ink-2">Vendedor</p>
        {vendedorFijo ? (
          <p className="flex h-10 items-center truncate border border-line bg-surface-2 px-3 t-label text-ink" title="La venta queda a tu nombre" data-testid="pos-vendedor-fijo">
            {nombreVendedor || '—'}
          </p>
        ) : (
          <Select
            valor={vendedorId}
            alCambiar={alVendedor}
            placeholder="Elige el vendedor"
            etiqueta="Vendedor de la venta"
            etiquetaOculta
            data-testid="pos-vendedor"
            opciones={vendedores.vendedores.map((v) => ({
              valor: v.empleadoId,
              etiqueta: v.nombre,
              grupo: v.enTurno ? 'En turno ahora' : v.turno ? `Turno de hoy · ${hora(v.turno.inicio)}–${hora(v.turno.fin)}` : 'Sin turno hoy',
            }))}
          />
        )}
      </div>
      <DialogoClienteRapido
        abierto={creando !== null}
        textoInicial={creando ?? ''}
        inicial={cliente.tipo === 'nuevo' ? cliente.datos : null}
        alCerrar={() => setCreando(null)}
        alGuardar={(datos) => {
          alCliente({ tipo: 'nuevo', datos });
          setCreando(null);
        }}
        alUsarExistente={(id) => {
          alCliente({ tipo: 'existente', id });
          setCreando(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Crear cliente rápido
// ---------------------------------------------------------------------------------------------------------
const RE_CELULAR = /^3\d{9}$/;
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PropsDialogoCliente {
  abierto: boolean;
  textoInicial: string;
  inicial: DatosClienteRapido | null;
  alCerrar: () => void;
  alGuardar: (d: DatosClienteRapido) => void;
  alUsarExistente: (id: Id) => void;
}

function separarTexto(t: string): { nombres: string; celular: string } {
  const solo = t.replace(/\D/g, '');
  return /^3\d{0,9}$/.test(solo) && solo.length >= 3 ? { nombres: '', celular: solo } : { nombres: t, celular: '' };
}

function DialogoClienteRapido(p: PropsDialogoCliente) {
  // El formulario se monta solo con el diálogo abierto: cada apertura empieza con sus datos.
  return (
    <Dialog
      abierto={p.abierto}
      alCambiar={(a) => !a && p.alCerrar()}
      eyebrow="Cliente nuevo"
      titulo="Crear cliente en la venta"
      descripcion="Nombre, celular y la autorización de datos. La cédula y el correo son opcionales."
      ancho="md"
      data-testid="pos-dialogo-cliente"
    >
      {p.abierto && <FormularioCliente {...p} />}
    </Dialog>
  );
}

function FormularioCliente({ textoInicial, inicial, alCerrar, alGuardar, alUsarExistente }: PropsDialogoCliente) {
  const hoy = useHoy();
  const arranque = inicial ?? { ...separarTexto(textoInicial), apellidos: '', documento: '', correo: '' };
  const [nombres, setNombres] = useState(arranque.nombres);
  const [apellidos, setApellidos] = useState(arranque.apellidos);
  const [celular, setCelular] = useState(arranque.celular);
  const [documento, setDocumento] = useState(arranque.documento);
  const [correo, setCorreo] = useState(arranque.correo);
  const [autoriza, setAutoriza] = useState(false);
  const [intento, setIntento] = useState(false);
  const repetidos = useSel(selClientes, { hoy, texto: RE_CELULAR.test(celular) ? celular : '__ninguno__' });
  const repetido = repetidos.find((f) => f.cliente.celular === celular)?.cliente ?? null;

  const errores = {
    nombres: nombres.trim() ? null : 'Escribe el nombre del cliente.',
    apellidos: apellidos.trim() ? null : 'Escribe el apellido del cliente.',
    celular: !RE_CELULAR.test(celular) ? 'Escribe un celular de 10 dígitos que empiece por 3.' : repetido ? `Ese celular ya es de ${repetido.nombres} ${repetido.apellidos}.` : null,
    correo: correo.trim() && !RE_CORREO.test(correo.trim()) ? 'Escribe un correo válido.' : null,
    autoriza: autoriza ? null : 'Marca la autorización de tratamiento de datos.',
  };
  const hayErrores = Object.values(errores).some(Boolean);
  const ver = <K extends keyof typeof errores>(k: K, tocado: boolean) => (intento || tocado ? errores[k] : null);
  const [tocados, setTocados] = useState<Partial<Record<keyof typeof errores, boolean>>>({});
  const tocar = (k: keyof typeof errores) => setTocados((t) => ({ ...t, [k]: true }));

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        setIntento(true);
        if (hayErrores) return;
        alGuardar({ nombres: nombres.trim(), apellidos: apellidos.trim(), celular, documento: documento.replace(/\D/g, ''), correo: correo.trim() });
      }}
      noValidate
      data-testid="pos-form-cliente"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Input etiqueta="Nombres" value={nombres} onChange={(ev) => setNombres(ev.target.value)} onBlur={() => tocar('nombres')} error={ver('nombres', !!tocados.nombres)} autoComplete="off" data-testid="pos-cliente-nombres" />
        <Input etiqueta="Apellidos" value={apellidos} onChange={(ev) => setApellidos(ev.target.value)} onBlur={() => tocar('apellidos')} error={ver('apellidos', !!tocados.apellidos)} autoComplete="off" data-testid="pos-cliente-apellidos" />
        <Input
          etiqueta="Celular"
          ayuda="10 dígitos, empieza por 3"
          inputMode="numeric"
          maxLength={10}
          value={celular}
          onChange={(ev) => setCelular(ev.target.value.replace(/\D/g, ''))}
          onBlur={() => tocar('celular')}
          error={ver('celular', !!tocados.celular || !!repetido)}
          autoComplete="off"
          data-testid="pos-cliente-celular"
        />
        <Input etiqueta="Cédula" opcional inputMode="numeric" value={documento} onChange={(ev) => setDocumento(ev.target.value.replace(/[^\d.]/g, ''))} autoComplete="off" data-testid="pos-cliente-cedula" />
        <Input etiqueta="Correo" opcional type="email" value={correo} onChange={(ev) => setCorreo(ev.target.value)} onBlur={() => tocar('correo')} error={ver('correo', !!tocados.correo)} className="col-span-2" autoComplete="off" data-testid="pos-cliente-correo" />
      </div>
      {repetido && (
        <p className="mt-3 flex items-center gap-3 t-small text-ink-2">
          <Icono icono={UserPlus} tamano={14} />
          <Button variante="link" onClick={() => alUsarExistente(repetido.id)}>
            Usar a {repetido.nombres} {repetido.apellidos} en esta venta
          </Button>
        </p>
      )}
      <div className="mt-5">
        <Checkbox marcado={autoriza} alCambiar={setAutoriza} etiqueta={TEXTOS.autorizacionDatos} />
        {(intento || tocados.autoriza) && errores.autoriza && (
          <p role="alert" className="mt-1 t-small text-danger">
            {errores.autoriza}
          </p>
        )}
      </div>
      <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
        <Button variante="secondary" onClick={alCerrar}>
          Cancelar
        </Button>
        <Button type="submit" data-testid="pos-cliente-guardar">
          Usar en esta venta
        </Button>
      </div>
    </form>
  );
}
