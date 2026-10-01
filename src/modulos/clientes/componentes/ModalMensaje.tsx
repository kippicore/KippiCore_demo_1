import { Copy, Mail, MessageCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Id } from '@/dominio/tipos';
import { SUFIJO_PRUEBA } from '@/config/textos/mensajes';
import { useAcciones, useAhora, useHoy, useMarca, useSel } from '@/estado';
import { conSufijo, enlaceCorreo, enlaceWhatsapp } from '@/lib/enlaces';
import { celular } from '@/lib/formato';
import { avisar, Avatar, Button, Dialog, GrupoRadio, Segmentado, Textarea } from '@/ui';
import { armarMensaje, primerNombre, TIPOS_MENSAJE_CLIENTE, type TipoMensajeCliente } from '../reglas';
import { selPerfilCliente } from '../selectores';
import { TEXTOS } from '../textos';
import { abrirEnlace, copiarTexto } from '../util';

/**
 * Mensaje prellenado para un cliente (PRD 7.10, PLAN 9.4 A4): se elige el motivo, el texto sale de la plantilla en
 * el trato del cliente (tú o usted) y se puede ajustar. "Abrir en WhatsApp" REGISTRA el mensaje en el libro
 * (`registrarMensajes`, queda en la ficha) y abre `wa.me/?text=…` SIN destinatario y con el sufijo de prueba: el
 * dueño elige a quién enviarlo, nada se manda solo (R14).
 */
const ASUNTOS: Record<TipoMensajeCliente, (marca: string) => string> = {
  nueva_coleccion: (m) => `Llegó la nueva colección a ${m}`,
  cumpleanos: (m) => `Feliz cumpleaños de parte de ${m}`,
  seguimiento: (m) => `¿Cómo le fue con su compra en ${m}?`,
  cobro: (m) => `Recordatorio de su saldo en ${m}`,
};

interface Props {
  clienteId: Id;
  tipoInicial?: TipoMensajeCliente | null;
  alCerrar: () => void;
}

export function ModalMensaje({ clienteId, tipoInicial, alCerrar }: Props) {
  const hoy = useHoy();
  const ahora = useAhora();
  const marca = useMarca();
  const acciones = useAcciones();
  const perfil = useSel(selPerfilCliente, { clienteId, hoy });
  const cliente = perfil?.ficha.cliente ?? null;
  const cobro = perfil?.contexto.cobro ?? null;

  const [tipo, setTipo] = useState<TipoMensajeCliente>(tipoInicial === 'cobro' && !cobro ? 'seguimiento' : (tipoInicial ?? 'nueva_coleccion'));
  const [tratamiento, setTratamiento] = useState<'tu' | 'usted'>(cliente?.tratamiento ?? 'tu');
  const [editado, setEditado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generado = useMemo(
    () =>
      cliente && perfil
        ? armarMensaje(tipo, cliente, tratamiento, {
            marca: marca.nombre,
            local: perfil.contexto.local,
            ahora,
            producto: perfil.contexto.producto,
            novedad: perfil.contexto.novedad,
            cobro: perfil.contexto.cobro,
          })
        : '',
    [cliente, perfil, tipo, tratamiento, marca.nombre, ahora],
  );
  if (!cliente || !perfil) return null;
  const texto = editado ?? generado;
  const nombre = `${cliente.nombres} ${cliente.apellidos}`;
  const nombreCorto = primerNombre(cliente.nombres);
  const prefiere = cliente.tratamiento === 'usted' ? 'usted' : 'tú';

  const registrar = (canal: 'whatsapp' | 'correo'): boolean => {
    const r = acciones.registrarMensajes({
      mensajes: [
        {
          canal,
          destinatario: { tipo: 'cliente', refId: cliente.id, nombre, telefono: cliente.celular, correo: cliente.correo },
          idioma: 'es',
          tratamiento,
          asunto: canal === 'correo' ? ASUNTOS[tipo](marca.nombre) : null,
          cuerpo: conSufijo(texto),
          origen: tipo === 'cumpleanos' ? { tipo: 'cumpleanos', id: cliente.id } : tipo === 'cobro' && cobro ? { tipo: 'cobro', id: cobro.ventaId } : { tipo: 'cliente', id: cliente.id },
        },
      ],
    });
    if (!r.ok) {
      setError(r.error.mensaje);
      return false;
    }
    return true;
  };

  const enviar = (canal: 'whatsapp' | 'correo') => {
    setError(null);
    if (!texto.trim()) {
      setError('El mensaje no puede ir vacío.');
      return;
    }
    if (!registrar(canal)) return;
    abrirEnlace(canal === 'whatsapp' ? enlaceWhatsapp(texto) : enlaceCorreo(ASUNTOS[tipo](marca.nombre), texto));
    avisar({
      tipo: 'exito',
      texto: `Mensaje para ${nombreCorto} preparado (simulación)`,
      detalle: canal === 'whatsapp' ? 'Se abrió WhatsApp con el texto: elige tú a quién enviarlo.' : 'Se abrió tu correo con el texto: elige tú a quién enviarlo.',
    });
    alCerrar();
  };

  const copiar = async () => {
    const ok = await copiarTexto(conSufijo(texto));
    avisar(ok ? { tipo: 'exito', texto: 'Texto copiado' } : { tipo: 'alerta', texto: 'Tu navegador no dejó copiar el texto', detalle: 'Selecciónalo y cópialo con el teclado.' });
  };

  const principalCorreo = cliente.canalPreferido === 'correo' && !!cliente.correo;

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      ancho="lg"
      eyebrow={`Escribir a ${nombre}`}
      titulo="Mensaje prellenado"
      data-testid="modal-mensaje"
      pie={
        <>
          <Button variante="ghost" icono={Copy} onClick={copiar} data-testid="mensaje-copiar">
            Copiar texto
          </Button>
          <span className="flex-1" />
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          {cliente.correo && (
            <Button variante={principalCorreo ? 'primary' : 'secondary'} icono={Mail} onClick={() => enviar('correo')} data-testid="mensaje-correo">
              Abrir en correo
            </Button>
          )}
          <Button variante={principalCorreo ? 'secondary' : 'primary'} icono={MessageCircle} onClick={() => enviar('whatsapp')} data-testid="mensaje-whatsapp">
            Abrir en WhatsApp
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-3 border border-line-soft bg-surface-2 px-4 py-3">
        <Avatar nombre={nombre} tamano={40} fondo="surface" />
        <div className="min-w-0">
          <p className="t-body font-bold text-ink">{nombre}</p>
          <p className="t-small text-muted">
            <span className="num">{celular(cliente.celular)}</span> · prefiere {TEXTOS.canales[cliente.canalPreferido]} · le hablan de {prefiere}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[280px_1fr] gap-6">
        <GrupoRadio<TipoMensajeCliente>
          etiqueta="Motivo"
          tarjetas
          columnas={1}
          valor={tipo}
          alCambiar={(t) => {
            setTipo(t);
            setEditado(null);
          }}
          opciones={TIPOS_MENSAJE_CLIENTE.map((t) => ({
            valor: t.tipo,
            etiqueta: t.etiqueta,
            descripcion: t.tipo === 'cobro' && !cobro ? 'No tiene separados ni créditos con saldo.' : t.descripcion,
            deshabilitado: t.tipo === 'cobro' && !cobro,
          }))}
        />
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="t-label text-ink">Cómo le hablamos</p>
            <Segmentado
              etiqueta="Trato"
              tamano="sm"
              valor={tratamiento}
              alCambiar={(t) => {
                setTratamiento(t);
                setEditado(null);
              }}
              opciones={[
                { valor: 'tu', etiqueta: TEXTOS.trato.tu, 'data-testid': 'trato-tu' },
                { valor: 'usted', etiqueta: TEXTOS.trato.usted, 'data-testid': 'trato-usted' },
              ]}
              data-testid="mensaje-trato"
            />
          </div>
          <Textarea
            etiqueta="Mensaje"
            etiquetaOculta
            rows={8}
            value={texto}
            onChange={(e) => setEditado(e.target.value)}
            data-testid="mensaje-texto"
          />
          <p className="mt-2 t-small text-muted">
            {tratamiento !== cliente.tratamiento ? `${nombreCorto} prefiere que le hablen de ${prefiere}; cambiaste el trato solo para este mensaje. ` : ''}
            WhatsApp se abre sin destinatario: elige tú a quién enviarlo. Al final se agrega «{SUFIJO_PRUEBA}».
          </p>
          {error && (
            <p role="alert" className="mt-3 t-small text-danger" data-testid="mensaje-error">
              {error}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
