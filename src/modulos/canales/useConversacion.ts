import { useCallback, useEffect, useRef, useState } from 'react';
import type { FechaHoraISO } from '@/dominio/tipos';
import { emitirUI } from '@/estado';
import { sumarMinutos } from './escenarios';
import { responder } from './reglas';
import { TEXTOS } from './textos';
import type {
  AccionCrearCliente,
  ComentarioChat,
  ConsultaInventario,
  DatosBot,
  EntradaRegistro,
  Entrega,
  Guion,
  IdEscenario,
  Memoria,
  MensajeChat,
  PasoSistema,
  Traza,
} from './tipos';

/**
 * El reproductor de la conversación (W9): reproduce un guion paso a paso (mensaje del cliente, "escribiendo…" de
 * ~1,2 s mientras el cerebro enciende sus nodos, respuesta) y atiende el texto libre con el mismo motor de
 * reglas. Toda la sincronía vive aquí para que el teléfono y el cerebro lean el mismo estado.
 */
export type Fase = 'espera' | 'jugando' | 'completo';

export interface OpcionesConversacion {
  datos: DatosBot | null;
  ahora: FechaHoraISO;
  /** 1 = normal; 4 = rápida. */
  velocidad: number;
  /** Persona a quien el bot pasa la conversación. */
  persona: string;
  /** Ejecuta un efecto real (crear el cliente en el CRM) y devuelve el aviso que se muestra en el chat. */
  alEfecto?: (accion: AccionCrearCliente) => PasoSistema | null;
  alCompletar?: (id: IdEscenario) => void;
  /** El bot respondió a un mensaje escrito por la persona que prueba. */
  alResponderLibre?: () => void;
}

export interface Conversacion {
  guion: Guion | null;
  mensajes: MensajeChat[];
  comentarios: ComentarioChat[];
  vista: 'comentarios' | 'mensajes';
  escribiendo: boolean;
  fase: Fase;
  ocupado: boolean;
  traspasado: boolean;
  traza: Traza | null;
  nodoActivo: number;
  /** La última consulta al inventario: se queda en el cerebro hasta que llega otra. */
  consultas: ConsultaInventario[] | null;
  registro: EntradaRegistro[];
  reproducir: (guion: Guion) => void;
  enviar: (texto: string) => void;
  /** Cambio manual de vista (Instagram). */
  cambiarVista: (v: 'comentarios' | 'mensajes') => void;
}

const TIEMPO_ESCRIBIENDO = 1200;

export function useConversacion(opciones: OpcionesConversacion): Conversacion {
  const [guion, setGuion] = useState<Guion | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [comentarios, setComentarios] = useState<ComentarioChat[]>([]);
  const [vista, setVista] = useState<'comentarios' | 'mensajes'>('mensajes');
  const [escribiendo, setEscribiendo] = useState(false);
  const [fase, setFase] = useState<Fase>('espera');
  const [ocupado, setOcupado] = useState(false);
  const [traspasado, setTraspasado] = useState(false);
  const [traza, setTraza] = useState<Traza | null>(null);
  const [nodoActivo, setNodoActivo] = useState(-1);
  const [consultas, setConsultas] = useState<ConsultaInventario[] | null>(null);
  const [registro, setRegistro] = useState<EntradaRegistro[]>([]);

  const opc = useRef(opciones);
  useEffect(() => {
    opc.current = opciones;
  });
  const corrida = useRef(0);
  const timers = useRef(new Set<number>());
  const contador = useRef(0);
  const memoria = useRef<Memoria | null>(null);
  const guionRef = useRef<Guion | null>(null);
  const ultimaHora = useRef<FechaHoraISO | null>(null);
  const ocupadoRef = useRef(false);

  const idNuevo = (prefijo: string) => `${prefijo}${(contador.current += 1)}`;

  const dormir = useCallback(
    (ms: number) =>
      new Promise<void>((resolver) => {
        const id = window.setTimeout(
          () => {
            timers.current.delete(id);
            resolver();
          },
          ms / Math.max(1, opc.current.velocidad),
        );
        timers.current.add(id);
      }),
    [],
  );

  const cancelar = useCallback(() => {
    corrida.current += 1;
    for (const t of timers.current) window.clearTimeout(t);
    timers.current.clear();
  }, []);

  useEffect(() => cancelar, [cancelar]);

  const marcarEntrega = (id: string, entrega: Entrega) =>
    setMensajes((m) => m.map((x) => (x.id === id ? { ...x, entrega } : x)));
  const leerTodo = () =>
    setMensajes((m) =>
      m.map((x) => (x.autor === 'cliente' && x.entrega !== 'leido' ? { ...x, entrega: 'leido' } : x)),
    );
  const agregar = (m: MensajeChat) => {
    if (m.autor !== 'sistema') ultimaHora.current = m.ts;
    setMensajes((x) => [...x, m]);
  };

  const iluminar = async (t: Traza, ms: number, mi: number): Promise<boolean> => {
    setTraza(t);
    setNodoActivo(-1);
    const indices = t.nodos.map((n, i) => (n !== null ? i : -1)).filter((i) => i >= 0);
    const paso = ms / (indices.length + 1);
    for (const i of indices) {
      await dormir(paso);
      if (corrida.current !== mi) return false;
      setNodoActivo(i);
      if (i === 2 && t.consultas?.length) setConsultas(t.consultas);
    }
    await dormir(paso);
    return corrida.current === mi;
  };

  const registrar = (t: Traza, ts: FechaHoraISO) => {
    const detalle = t.nodos[1] ?? t.nodos[3] ?? t.nodos[2] ?? '';
    setRegistro((r) => [{ id: idNuevo('r'), ts, regla: t.regla, detalle }, ...r].slice(0, 6));
  };

  const sistema = (texto: string, enlace?: { texto: string; a: string }) =>
    agregar({
      id: idNuevo('s'),
      autor: 'sistema',
      partes: [{ tipo: 'texto', texto }],
      ts: ultimaHora.current ?? opc.current.ahora,
      enlace,
    });

  const efecto = async (accion: AccionCrearCliente, t: Traza, mi: number) => {
    const resultado = opc.current.alEfecto?.(accion) ?? null;
    if (!resultado) return;
    await dormir(500);
    if (corrida.current !== mi) return;
    setTraza(t);
    setNodoActivo(t.nodos.reduce((a, n, i) => (n !== null ? i : a), -1));
    sistema(resultado.texto, resultado.enlace);
    await dormir(500);
  };

  const tomaPersona = () => {
    setTraspasado(true);
    sistema(TEXTOS.chat.tomo(opc.current.persona));
  };

  const reproducir = useCallback(
    (g: Guion) => {
      cancelar();
      const mi = corrida.current;
      guionRef.current = g;
      memoria.current = g.memoriaFinal;
      ultimaHora.current = null;
      ocupadoRef.current = true;
      setGuion(g);
      setMensajes([]);
      setComentarios([]);
      setRegistro([]);
      setTraza(null);
      setConsultas(null);
      setNodoActivo(-1);
      setEscribiendo(false);
      setTraspasado(false);
      setVista(g.canal === 'instagram' && g.pasos[0]?.tipo === 'vista' ? g.pasos[0].vista : 'mensajes');
      if (g.pasos.length === 0) {
        setFase('espera');
        ocupadoRef.current = false;
        setOcupado(false);
        return;
      }
      setFase('jugando');
      setOcupado(true);
      void (async () => {
        await dormir(500);
        for (const p of g.pasos) {
          if (corrida.current !== mi) return;
          if (p.tipo === 'vista') {
            setVista(p.vista);
            await dormir(500);
          } else if (p.tipo === 'sistema') {
            await dormir(500);
            if (corrida.current !== mi) return;
            if (p.traza) {
              setTraza(p.traza);
              setNodoActivo(p.traza.nodos.reduce((a, n, i) => (n !== null ? i : a), -1));
            }
            sistema(p.texto, p.enlace);
            await dormir(700);
          } else if (p.tipo === 'cliente') {
            await dormir(1100);
            if (corrida.current !== mi) return;
            const id = idNuevo('c');
            agregar({
              id,
              autor: 'cliente',
              partes: [{ tipo: 'texto', texto: p.texto }],
              ts: p.ts,
              entrega: 'enviado',
            });
            await dormir(350);
            if (corrida.current !== mi) return;
            marcarEntrega(id, 'entregado');
            await dormir(250);
          } else if (p.tipo === 'comentario') {
            await dormir(900);
            if (corrida.current !== mi) return;
            if (p.respuestaDe && p.traza) {
              setEscribiendo(true);
              if (!(await iluminar(p.traza, TIEMPO_ESCRIBIENDO, mi))) return;
              setEscribiendo(false);
              registrar(p.traza, p.ts);
            }
            setComentarios((c) => [
              ...c,
              { id: idNuevo('k'), usuario: p.usuario, texto: p.texto, ts: p.ts, respuestaDe: p.respuestaDe },
            ]);
            await dormir(900);
          } else if (p.tipo === 'bot') {
            leerTodo();
            setEscribiendo(true);
            if (!(await iluminar(p.traza, TIEMPO_ESCRIBIENDO, mi))) return;
            setEscribiendo(false);
            agregar({ id: idNuevo('b'), autor: 'bot', partes: p.partes, ts: p.ts });
            registrar(p.traza, p.ts);
            if (p.traspaso) {
              await dormir(500);
              if (corrida.current !== mi) return;
              tomaPersona();
            }
            await dormir(500);
          } else if (p.tipo === 'efecto') {
            await efecto(p.accion, p.traza, mi);
          }
        }
        if (corrida.current !== mi) return;
        leerTodo();
        ocupadoRef.current = false;
        setOcupado(false);
        setFase('completo');
        opc.current.alCompletar?.(g.id);
      })();
    },
    [cancelar, dormir],
  );

  const enviar = useCallback(
    (texto: string) => {
      const g = guionRef.current;
      const datos = opc.current.datos;
      const limpio = texto.trim();
      if (!g || !datos || !limpio || ocupadoRef.current) return;
      ocupadoRef.current = true;
      setOcupado(true);
      const mi = corrida.current;
      const ts = ultimaHora.current ? sumarMinutos(ultimaHora.current, 1) : opc.current.ahora;
      const id = idNuevo('c');
      agregar({
        id,
        autor: 'cliente',
        partes: [{ tipo: 'texto', texto: limpio }],
        ts,
        entrega: 'enviado',
        libre: true,
      });
      void (async () => {
        await dormir(400);
        if (corrida.current !== mi) return;
        marcarEntrega(id, 'entregado');
        const r = responder(
          limpio,
          memoria.current ?? g.memoriaFinal,
          { ...datos, resumen: datos.resumen },
          g.contexto,
        );
        if (!r) {
          await dormir(300);
          if (corrida.current !== mi) return;
          sistema(TEXTOS.chat.pausa(opc.current.persona));
          ocupadoRef.current = false;
          setOcupado(false);
          return;
        }
        memoria.current = r.memoria;
        leerTodo();
        setEscribiendo(true);
        const traza = { ...r.traza, flujo: g.flujoEntrante };
        if (!(await iluminar(traza, TIEMPO_ESCRIBIENDO, mi))) return;
        setEscribiendo(false);
        const tsBot = sumarMinutos(ts, 1);
        agregar({ id: idNuevo('b'), autor: 'bot', partes: r.partes, ts: tsBot });
        registrar(traza, tsBot);
        if (g.canal === 'whatsapp') emitirUI('whatsapp_respondido');
        opc.current.alResponderLibre?.();
        if (r.accion) await efecto(r.accion, traza, mi);
        if (r.traspaso) {
          await dormir(400);
          if (corrida.current !== mi) return;
          tomaPersona();
        }
        ocupadoRef.current = false;
        setOcupado(false);
      })();
    },
    [dormir],
  );

  return {
    guion,
    mensajes,
    comentarios,
    vista,
    escribiendo,
    fase,
    ocupado,
    traspasado,
    traza,
    nodoActivo,
    consultas,
    registro,
    reproducir,
    enviar,
    cambiarVista: setVista,
  };
}
