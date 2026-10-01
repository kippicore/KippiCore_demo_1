import { Inbox } from 'lucide-react';
import { useState } from 'react';
import { ESTADOS_MENSAJE } from '@/config/estados';
import type { MensajeSaliente } from '@/dominio/tipos';
import { SUFIJO_PRUEBA } from '@/config/textos/mensajes';
import { BadgeEstado, Drawer, EmptyState, Fecha, ParesDatos, Table, type ColumnaTabla } from '@/ui';
import { ETIQUETAS_CANAL } from '../textos';
import { AccionesMensaje } from './AccionesMensaje';

/**
 * Bandeja de salida simulada (W3): cada aviso con su canal, la hora y el estado "Enviado (simulación)" (o "WeChat
 * (simulación)"). Al abrir uno se ve el texto completo y los botones reales sin destinatario.
 */
export function BandejaSalida({
  mensajes,
  vacio,
}: {
  mensajes: readonly MensajeSaliente[];
  vacio?: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const actual = mensajes.find((m) => m.id === abierto) ?? null;
  const columnas: ColumnaTabla<MensajeSaliente>[] = [
    {
      id: 'ts',
      encabezado: 'Hora',
      celda: (m) => <Fecha valor={m.ts} formato="fechaHora" />,
      ordenar: (m) => m.ts,
      ancho: 190,
    },
    {
      id: 'para',
      encabezado: 'Para',
      celda: (m) => (
        <span>
          <span className="font-semibold text-ink">{m.destinatario.nombre}</span>
          <span className="block t-small text-muted">
            {m.idioma === 'en' ? 'Inglés' : m.tratamiento === 'usted' ? 'Español · usted' : 'Español · tú'}
          </span>
        </span>
      ),
      ordenar: (m) => m.destinatario.nombre,
      ancho: 220,
    },
    {
      id: 'canal',
      encabezado: 'Canal',
      celda: (m) => (
        <span className="inline-flex flex-col items-start gap-1">
          <span>{ETIQUETAS_CANAL[m.canal]}</span>
          <BadgeEstado
            tamano="sm"
            estado={m.canal === 'wechat' ? ESTADOS_MENSAJE.wechat_simulado : ESTADOS_MENSAJE.enviado_simulado}
          />
        </span>
      ),
      ordenar: (m) => m.canal,
      ancho: 190,
    },
    {
      id: 'mensaje',
      encabezado: 'Mensaje',
      celda: (m) => <span className="t-body text-ink-2">{m.cuerpo.replace(/\s+/g, ' ')}</span>,
      truncar: true,
    },
  ];
  return (
    <>
      <Table
        data-testid="bandeja-salida"
        columnas={columnas}
        filas={mensajes}
        clave={(m) => m.id}
        sustantivo={['mensaje', 'mensajes']}
        porPagina={25}
        ordenInicial={{ id: 'ts', dir: 'desc' }}
        alAbrir={(m) => setAbierto(m.id)}
        vacio={
          vacio ?? (
            <EmptyState
              tamano="tabla"
              icono={Inbox}
              titulo="Todavía no hay avisos de este pedido"
              texto="Cuando cambies el estado, KippiCore redacta los avisos y los deja aquí."
            />
          )
        }
      />
      <Drawer
        abierto={actual !== null}
        alCambiar={(a) => !a && setAbierto(null)}
        eyebrow="Mensaje de la bandeja de salida"
        titulo={actual?.destinatario.nombre ?? ''}
        insignia={
          actual ? (
            <BadgeEstado
              estado={
                actual.canal === 'wechat' ? ESTADOS_MENSAJE.wechat_simulado : ESTADOS_MENSAJE.enviado_simulado
              }
            />
          ) : undefined
        }
        ancho="lg"
        data-testid="detalle-mensaje"
      >
        {actual && (
          <>
            <ParesDatos
              pares={[
                ['Canal', ETIQUETAS_CANAL[actual.canal]],
                ['Hora', <Fecha key="h" valor={actual.ts} formato="fechaHora" />],
                ['Idioma', actual.idioma === 'en' ? 'Inglés' : 'Español'],
                ['Tratamiento', actual.tratamiento === 'usted' ? 'Usted' : 'Tú'],
                ...(actual.asunto ? ([['Asunto', actual.asunto]] as const) : []),
              ]}
            />
            <div>
              <p className="t-eyebrow text-ink-2">Texto</p>
              <p
                className="mt-2 whitespace-pre-line border border-line bg-surface-2 p-4 t-body text-ink"
                lang={actual.idioma}
              >
                {actual.cuerpo}
              </p>
              <p className="mt-2 t-small text-muted">
                Los botones agregan al final: {SUFIJO_PRUEBA}. No llevan destinatario: eliges a quién se lo
                mandas.
              </p>
            </div>
            <AccionesMensaje
              idBase="bandeja"
              asunto={actual.asunto}
              cuerpo={actual.cuerpo}
              canales={{ whatsapp: true, correo: true, wechat: true }}
            />
          </>
        )}
      </Drawer>
    </>
  );
}
