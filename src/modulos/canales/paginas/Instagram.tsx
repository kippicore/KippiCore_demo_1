import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { rutas } from '@/app/rutas';
import { PREFIJOS } from '@/dominio/motor/ids';
import { estadoActual, useAcciones, useAhora, useHoy } from '@/estado';
import { ESCENARIOS_INSTAGRAM } from '@/seed/escenarios-canales';
import { selClientes } from '@/selectores';
import { cn, MarcoTelefono } from '@/ui';
import { Cerebro } from '../componentes/Cerebro';
import { PantallaChat } from '../componentes/Chat';
import { LimiteError } from '../componentes/LimiteError';
import {
  ControlesReproduccion,
  EncabezadoCanales,
  IndicadoresCanal,
  opcionDe,
  SelectorEscenarios,
} from '../componentes/Piezas';
import { construirGuion } from '../escenarios';
import { tarjetaDe } from '../reglas';
import { reglasDelCanal, TEXTOS } from '../textos';
import type { AccionCrearCliente, IdEscenario, PasoSistema } from '../tipos';
import { useConversacion } from '../useConversacion';
import { useDatosBot, useEscalaTelefono } from '../useDatosBot';

const OPCIONES = ESCENARIOS_INSTAGRAM.map(opcionDe);

export default function Instagram() {
  return (
    <div className="pb-24">
      <LimiteError>
        <Vista />
      </LimiteError>
    </div>
  );
}

function Vista() {
  const ahora = useAhora();
  const hoy = useHoy();
  const acciones = useAcciones();
  const { datos, entrada } = useDatosBot();
  const { escala, fijo } = useEscalaTelefono();
  const [id, setId] = useState<IdEscenario>('precio-comentario');
  const [velocidad, setVelocidad] = useState<1 | 4>(1);
  const [repeticion, setRepeticion] = useState(0);
  const entradaRef = useRef(entrada);
  useEffect(() => {
    entradaRef.current = entrada;
  });

  /** El efecto REAL del escenario: el contacto que dejó la persona queda como cliente nuevo, con origen Instagram. */
  const crearCliente = useCallback(
    (a: AccionCrearCliente): PasoSistema | null => {
      const nombre = `${a.nombres} ${a.apellidos}`;
      const clienteId = acciones.nuevoId(PREFIJOS.cliente);
      const r = acciones.crearCliente({
        clienteId,
        datos: {
          nombres: a.nombres,
          apellidos: a.apellidos,
          documento: null,
          celular: a.celular,
          correo: null,
          cumpleanos: null,
          anioNacimiento: null,
          barrio: null,
          canalPreferido: 'instagram',
          tratamiento: 'tu',
          autorizacionDatos: { aceptada: true, fecha: ahora, canal: 'instagram' },
          tallasDeclaradas: {},
          canalAlta: 'instagram',
          localRegistroId: null,
          registradoPorId: null,
        },
      });
      if (r.ok)
        return {
          tipo: 'sistema',
          texto: TEXTOS.efectos.clienteCreado(nombre),
          enlace: { texto: TEXTOS.efectos.verFicha, a: rutas.cliente(clienteId) },
        };
      if (r.error.codigo === 'CELULAR_DUPLICADO') {
        const estado = estadoActual();
        const existente = estado
          ? selClientes(estado, { hoy, texto: a.celular }).find((f) => f.cliente.celular === a.celular)
          : null;
        const nombreExistente = existente
          ? `${existente.cliente.nombres} ${existente.cliente.apellidos}`
          : nombre;
        return {
          tipo: 'sistema',
          texto: TEXTOS.efectos.clienteExistente(nombreExistente),
          enlace: existente
            ? { texto: TEXTOS.efectos.verFicha, a: rutas.cliente(existente.cliente.id) }
            : undefined,
        };
      }
      return { tipo: 'sistema', texto: TEXTOS.efectos.errorCliente(r.error.mensaje) };
    },
    [acciones, ahora, hoy],
  );

  const conv = useConversacion({
    datos,
    ahora,
    velocidad,
    persona: datos.persona?.completo ?? 'Una asesora',
    alEfecto: crearCliente,
  });
  const reproducir = conv.reproducir;
  useEffect(() => {
    reproducir(construirGuion(id, entradaRef.current));
  }, [id, repeticion, reproducir, datos.dinero]);

  const def = ESCENARIOS_INSTAGRAM.find((e) => e.id === id);
  const guion = conv.guion;
  const usuario = guion?.contacto.nombre ?? `${datos.marca.toLowerCase()}.demo`;
  const critico = datos.productos.find((p) => p.id === datos.criticoId) ?? datos.productos[0];
  const publicacion = useMemo(() => {
    if (!critico) return { tarjeta: null, usuario, pie: '' };
    const t = tarjetaDe(critico);
    const azul = critico.colores.find((c) => c.nombre === 'Azul cielo');
    return {
      tarjeta: azul ? { ...t, color: azul.hex, patron: azul.patron } : t,
      usuario,
      pie: `${critico.nombre}. Nueva temporada, disponible en nuestros locales.`,
    };
  }, [critico, usuario]);

  return (
    <>
      <EncabezadoCanales
        actual="instagram"
        titulo={TEXTOS.instagram.titulo}
        subtitulo={TEXTOS.instagram.subtitulo}
      />

      <div className="mt-6 grid items-start gap-8 desk:grid-cols-[auto_minmax(0,1fr)]">
        <div className={cn('flex flex-col gap-3', fijo && 'sticky top-(--sticky-top)')}>
          <MarcoTelefono escala={escala} titulo="Conversación de Instagram simulada">
            <PantallaChat
              variante="instagram"
              contacto={{ nombre: usuario, detalle: '' }}
              inicial={datos.marca.charAt(0).toUpperCase()}
              mensajes={conv.mensajes}
              escribiendo={conv.escribiendo}
              ahora={ahora}
              alEnviar={conv.enviar}
              bloqueado={conv.ocupado || !guion}
              vista={conv.vista}
              alCambiarVista={conv.cambiarVista}
              comentarios={conv.comentarios}
              publicacion={publicacion}
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
                : ''}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SelectorEscenarios
            opciones={OPCIONES}
            valor={id}
            alElegir={(v) => setId(v as IdEscenario)}
            descripcion={def?.descripcion ?? ''}
            acciones={
              <ControlesReproduccion
                velocidad={velocidad}
                alVelocidad={setVelocidad}
                alRepetir={() => setRepeticion((n) => n + 1)}
              />
            }
          />
          <Cerebro
            guion={guion}
            traza={conv.traza}
            nodoActivo={conv.nodoActivo}
            consultas={conv.consultas}
            escribiendo={conv.escribiendo}
            registro={conv.registro}
            reglas={reglasDelCanal('instagram')}
          />
          <IndicadoresCanal canal="instagram" />
        </div>
      </div>
    </>
  );
}
