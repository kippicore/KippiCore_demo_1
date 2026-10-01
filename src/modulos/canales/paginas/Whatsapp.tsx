import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { emitirUI, useAhora } from '@/estado';
import { ESCENARIOS_WHATSAPP } from '@/seed/escenarios-canales';
import { cn, MarcoTelefono, Segmentado } from '@/ui';
import { Cerebro } from '../componentes/Cerebro';
import { PantallaChat } from '../componentes/Chat';
import {
  ControlesReproduccion,
  EncabezadoCanales,
  IndicadoresCanal,
  opcionDe,
  SelectorEscenarios,
} from '../componentes/Piezas';
import { LimiteError } from '../componentes/LimiteError';
import { construirGuion } from '../escenarios';
import { reglasDelCanal, TEXTOS } from '../textos';
import type { IdEscenario } from '../tipos';
import { useConversacion } from '../useConversacion';
import { useDatosBot, useEscalaTelefono } from '../useDatosBot';

const IDS = new Set<string>([...ESCENARIOS_WHATSAPP.map((e) => e.id), 'libre']);
const OPCIONES = [
  ...ESCENARIOS_WHATSAPP.map(opcionDe),
  { valor: 'libre', titulo: TEXTOS.whatsapp.escribeTu, icono: Send },
];

export default function Whatsapp() {
  return (
    <div className="pb-24">
      <LimiteError>
        <Vista />
      </LimiteError>
    </div>
  );
}

function Vista() {
  const navegar = useNavigate();
  const { escenario } = useParamsRuta('canalWhatsapp');
  const id: IdEscenario = escenario && IDS.has(escenario) ? (escenario as IdEscenario) : 'consulta-talla';
  const ahora = useAhora();
  const { datos, entrada } = useDatosBot();
  const { escala, fijo } = useEscalaTelefono();
  const [velocidad, setVelocidad] = useState<1 | 4>(1);
  const [trato, setTrato] = useState<'tu' | 'usted'>('tu');
  const [repeticion, setRepeticion] = useState(0);
  const entradaRef = useRef(entrada);
  useEffect(() => {
    entradaRef.current = entrada;
  });

  const conv = useConversacion({
    datos,
    ahora,
    velocidad,
    persona: datos.persona?.completo ?? 'Una asesora',
    alCompletar: (esc) => emitirUI('whatsapp_escenario_completado', { escenario: esc }),
  });

  // Cada vez que cambia el escenario, el trato (chat libre) o se pide repetir, se arma el guion con los datos de ahora.
  const reproducir = conv.reproducir;
  useEffect(() => {
    reproducir(construirGuion(id, entradaRef.current, trato));
  }, [id, trato, repeticion, reproducir]);

  const elegir = (v: string) => navegar(rutas.canalWhatsapp({ escenario: v }), { replace: true });
  const def = ESCENARIOS_WHATSAPP.find((e) => e.id === id);
  const descripcion = id === 'libre' ? TEXTOS.whatsapp.escribeTuDescripcion : (def?.descripcion ?? '');
  const guion = conv.guion;

  const extras = (
    <>
      {id === 'libre' && (
        <Segmentado
          etiqueta={TEXTOS.whatsapp.cliente}
          tamano="sm"
          valor={trato}
          alCambiar={setTrato}
          opciones={[
            {
              valor: 'tu',
              etiqueta: `${entrada.contexto.clienteTu?.primerNombre ?? 'Andrés'} (tú)`,
              'data-testid': 'canales-trato-tu',
            },
            {
              valor: 'usted',
              etiqueta: `${entrada.contexto.clienteUsted?.primerNombre ?? 'Ricardo'} (usted)`,
              'data-testid': 'canales-trato-usted',
            },
          ]}
        />
      )}
      <ControlesReproduccion
        velocidad={velocidad}
        alVelocidad={setVelocidad}
        alRepetir={() => setRepeticion((n) => n + 1)}
      />
    </>
  );

  return (
    <>
      <EncabezadoCanales
        actual="whatsapp"
        titulo={TEXTOS.whatsapp.titulo}
        subtitulo={TEXTOS.whatsapp.subtitulo}
      />

      <div className="mt-6 grid items-start gap-8 desk:grid-cols-[auto_minmax(0,1fr)]">
        <div className={cn('flex flex-col gap-3', fijo && 'sticky top-(--sticky-top)')}>
          <MarcoTelefono escala={escala} titulo="Conversación de WhatsApp simulada">
            <PantallaChat
              variante="whatsapp"
              contacto={guion?.contacto ?? { nombre: `${datos.marca} · Asistente`, detalle: '' }}
              inicial={datos.marca.charAt(0).toUpperCase()}
              mensajes={conv.mensajes}
              escribiendo={conv.escribiendo}
              ahora={ahora}
              alEnviar={conv.enviar}
              bloqueado={conv.ocupado || !guion}
              traspasado={conv.traspasado}
            />
          </MarcoTelefono>
          <p
            className="t-small text-muted"
            style={{ width: 414 * escala }}
            data-testid="canales-fase"
            data-fase={conv.fase}
          >
            {conv.fase === 'jugando'
              ? 'Reproduciendo el escenario…'
              : conv.fase === 'completo'
                ? TEXTOS.chat.cerrar
                : 'Escribe un mensaje para empezar.'}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SelectorEscenarios
            opciones={OPCIONES}
            valor={id}
            alElegir={elegir}
            descripcion={descripcion}
            acciones={extras}
          />
          <Cerebro
            guion={guion}
            traza={conv.traza}
            nodoActivo={conv.nodoActivo}
            consultas={conv.consultas}
            escribiendo={conv.escribiendo}
            registro={conv.registro}
            reglas={reglasDelCanal('whatsapp')}
          />
          <IndicadoresCanal canal="whatsapp" />
        </div>
      </div>
    </>
  );
}
