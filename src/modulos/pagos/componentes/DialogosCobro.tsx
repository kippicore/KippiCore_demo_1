import { Copy, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import type { MedioPago } from '@/dominio/tipos';
import { rellenarPlantilla } from '@/dominio/reglas/texto';
import { PLANTILLAS_CLIENTE, SALUDOS } from '@/config/textos/mensajes';
import { MEDIOS_PAGO } from '@/config/negocio';
import { useAcciones, useAhora, useDinero, useMarca } from '@/estado';
import { conSufijo, enlaceWhatsapp } from '@/lib/enlaces';
import { celular, dinero as formatoDinero, fecha as formatoFecha } from '@/lib/formato';
import { avisar, Button, clasesBoton, Dialog, Input, InputNumero, Select, Segmentado, Icono, Textarea } from '@/ui';
import { saludoDeLaHora } from '../calculos';
import type { FilaCobro } from '../selectores';

/** Diálogos de "Plata que me deben": recordatorio de cobro por WhatsApp (prellenado) y registro de un abono. */

type Tratamiento = 'tu' | 'usted';

const COBRO_CREDITO: Record<Tratamiento, string> = {
  tu: 'Hola, {{Nombre}}. Te recordamos que tu cuenta {{numero}} en {{marca}} tiene un saldo de {{saldo}}{{vence}}. Puedes pagar en {{local}} o por transferencia.',
  usted: '{{Nombre}}, {{saludo}}. Le recordamos que su cuenta {{numero}} en {{marca}} tiene un saldo de {{saldo}}{{vence}}. Puede pagar en {{local}} o por transferencia.',
};

export function DialogoCobro({ fila, alCerrar }: { fila: FilaCobro | null; alCerrar: () => void }) {
  return fila ? <CuerpoCobro key={fila.ventaId} fila={fila} alCerrar={alCerrar} /> : null;
}

function CuerpoCobro({ fila, alCerrar }: { fila: FilaCobro; alCerrar: () => void }) {
  const acciones = useAcciones();
  const marca = useMarca();
  const hora = Number(useAhora().slice(11, 13));
  const [trato, setTrato] = useState<Tratamiento>(fila.cliente?.tratamiento ?? 'tu');
  const armar = (t: Tratamiento) => {
    const datos = {
      Nombre: fila.cliente?.nombre.split(' ')[0] ?? 'Hola',
      saludo: SALUDOS[saludoDeLaHora(hora)],
      numero: fila.numeroVenta,
      marca: marca.nombre,
      saldo: formatoDinero(fila.saldo, 'COP'),
      fechaLimite: fila.fechaLimite ? formatoFecha(fila.fechaLimite) : '',
      vence: fila.fechaLimite ? ` y vence el ${formatoFecha(fila.fechaLimite)}` : '',
      local: fila.localNombre,
    };
    return rellenarPlantilla(fila.tipo === 'separado' ? PLANTILLAS_CLIENTE.cobro[t] : COBRO_CREDITO[t], datos);
  };
  const [texto, setTexto] = useState(() => armar(trato));
  const [copiado, setCopiado] = useState(false);

  const cambiarTrato = (t: Tratamiento) => {
    setTrato(t);
    setTexto(armar(t));
  };

  const registrar = () => {
    const r = acciones.registrarMensajes({
      mensajes: [
        {
          canal: 'whatsapp',
          destinatario: { tipo: 'cliente', refId: fila.cliente?.id ?? null, nombre: fila.cliente?.nombre ?? 'Cliente', telefono: fila.cliente?.celular ?? null, correo: fila.cliente?.correo ?? null },
          idioma: 'es',
          tratamiento: trato,
          asunto: null,
          cuerpo: conSufijo(texto),
          origen: { tipo: 'cobro', id: fila.ventaId },
        },
      ],
    });
    if (r.ok) avisar({ tipo: 'exito', texto: 'Recordatorio listo en WhatsApp', detalle: 'Elige el contacto del cliente y envíalo desde allá.' });
    return r.ok;
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow={`${fila.tipo === 'separado' ? 'Separado' : 'Crédito'} ${fila.numeroVenta}`}
      titulo="Recordatorio de cobro"
      descripcion={fila.cliente ? `${fila.cliente.nombre} · ${celular(fila.cliente.celular)}` : 'Cliente sin registrar'}
      ancho="md"
      data-testid="dialogo-cobro"
      pie={
        <>
          <Button
            variante="secondary"
            icono={Copy}
            onClick={() => {
              void navigator.clipboard?.writeText(conSufijo(texto)).then(() => setCopiado(true));
            }}
          >
            {copiado ? 'Copiado' : 'Copiar mensaje'}
          </Button>
          <a
            href={enlaceWhatsapp(texto)}
            target="_blank"
            rel="noreferrer"
            className={clasesBoton({ variante: 'primary' })}
            onClick={() => {
              registrar();
              alCerrar();
            }}
            data-testid="cobro-whatsapp"
          >
            <Icono icono={MessageCircle} tamano={16} />
            Abrir en WhatsApp
          </a>
        </>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="t-label text-ink">Tratamiento</span>
        <Segmentado
          etiqueta="Tratamiento del mensaje"
          tamano="sm"
          valor={trato}
          alCambiar={cambiarTrato}
          opciones={[
            { valor: 'tu', etiqueta: 'Tú' },
            { valor: 'usted', etiqueta: 'Usted' },
          ]}
        />
      </div>
      <Textarea className="mt-4" etiqueta="Mensaje" value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} data-testid="cobro-texto" ayuda="Puedes editarlo. Se abre en WhatsApp sin destinatario: tú eliges a quién enviarlo." />
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Abono
// ---------------------------------------------------------------------------------------------------------
const MEDIOS_ABONO: MedioPago[] = ['efectivo', 'transferencia', 'nequi', 'daviplata', 'qr_bre_b'];

export function DialogoAbono({ fila, alCerrar }: { fila: FilaCobro | null; alCerrar: () => void }) {
  return fila ? <CuerpoAbono key={fila.ventaId} fila={fila} alCerrar={alCerrar} /> : null;
}

function CuerpoAbono({ fila, alCerrar }: { fila: FilaCobro; alCerrar: () => void }) {
  const acciones = useAcciones();
  const dinero = useDinero();
  const [valor, setValor] = useState<number | null>(fila.saldo);
  const [medio, setMedio] = useState<MedioPago>('transferencia');
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState<{ campo: string; texto: string } | null>(null);

  const enviar = () => {
    if (!valor || valor <= 0) return setError({ campo: 'valor', texto: 'Escribe cuánto abonó.' });
    if (valor > fila.saldo) return setError({ campo: 'valor', texto: `El saldo es de ${dinero(fila.saldo)}.` });
    const r = acciones.abonarVenta({
      ventaId: fila.ventaId,
      pago: { medio, valor, recibido: medio === 'efectivo' ? valor : null, referencia: referencia.trim() || null, sesionCajaId: null, bonoId: null },
    });
    if (!r.ok) return setError({ campo: r.error.campo ?? 'general', texto: r.error.mensaje });
    avisar({
      tipo: 'exito',
      texto: valor === fila.saldo ? `${fila.numeroVenta} quedó pagada` : `Abono registrado en ${fila.numeroVenta}`,
      detalle: valor === fila.saldo ? undefined : `Quedan ${dinero(fila.saldo - valor)} por cobrar.`,
    });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow={`${fila.tipo === 'separado' ? 'Separado' : 'Crédito'} ${fila.numeroVenta}`}
      titulo="Registrar un abono"
      descripcion={fila.cliente ? `${fila.cliente.nombre} · saldo ${dinero(fila.saldo)}` : `Saldo ${dinero(fila.saldo)}`}
      ancho="sm"
      data-testid="dialogo-abono"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={enviar} data-testid="abono-confirmar">
            Registrar abono
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <InputNumero etiqueta="Valor del abono" prefijo="$" valor={valor} alCambiar={setValor} error={error?.campo === 'valor' || error?.campo === 'pago' ? error.texto : undefined} data-testid="abono-valor" />
        <Select etiqueta="Medio" valor={medio} alCambiar={(v) => setMedio(v as MedioPago)} enModal opciones={MEDIOS_ABONO.map((m) => ({ valor: m, etiqueta: MEDIOS_PAGO[m].etiqueta }))} />
        <Input etiqueta="Referencia" opcional value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Número de aprobación o de transferencia" />
        {error && error.campo !== 'valor' && error.campo !== 'pago' && <p className="t-small text-danger">{error.texto}</p>}
      </div>
    </Dialog>
  );
}
