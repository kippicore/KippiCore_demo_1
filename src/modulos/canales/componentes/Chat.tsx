import {
  Battery,
  Check,
  CheckCheck,
  ChevronLeft,
  Heart,
  MessageCircle,
  Phone,
  Send as Enviar,
  Signal,
  Video,
  Wifi,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { cn, Dinero, Icono, Input, Button, Prenda, Segmentado, Badge, Avatar } from '@/ui';
import { hora } from '@/lib/formato';
import { TEXTOS } from '../textos';
import type { ComentarioChat, MensajeChat, Parte, TarjetaProducto } from '../tipos';

/**
 * Lo que se pinta DENTRO del marco de teléfono (390 × 844): un chat con estética propia (sin logos ni marca de
 * WhatsApp ni de Instagram), con "escribiendo…", horas y doble check genérico. Los tamaños son de pantalla de
 * teléfono: el marco los reduce con `escala`, así que ningún texto baja de 15 px aquí dentro.
 */
const ESTILO_PUNTOS = `
@keyframes canales-punto { 0%, 60%, 100% { opacity: .25; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
@media (prefers-reduced-motion: reduce) { .canales-punto { animation: none !important; opacity: .6 !important; } }
`;

function Puntos() {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-1 py-1.5"
      role="status"
      aria-label={TEXTOS.chat.escribiendo}
      data-testid="canales-escribiendo"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="canales-punto size-2 rounded-full bg-muted"
          style={{ animation: `canales-punto 1s ${i * 160}ms infinite` }}
        />
      ))}
    </span>
  );
}

function Entrega({ entrega }: { entrega: MensajeChat['entrega'] }) {
  if (!entrega) return null;
  return (
    <span
      className={cn('inline-flex', entrega === 'leido' ? 'text-accent' : 'text-inverse/70')}
      aria-label={entrega === 'enviado' ? 'Enviado' : entrega === 'entregado' ? 'Entregado' : 'Leído'}
    >
      <Icono icono={entrega === 'enviado' ? Check : CheckCheck} tamano={14} />
    </span>
  );
}

export function TarjetaDeProducto({ t, ancha }: { t: TarjetaProducto; ancha?: boolean }) {
  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden border border-line bg-surface',
        ancha ? 'w-[200px]' : 'flex w-full',
      )}
      data-testid="canales-tarjeta-producto"
    >
      <div className={cn('bg-product', ancha ? 'w-full' : 'w-[88px] shrink-0')}>
        <Prenda tipo={t.tipo} color={t.color} patron={t.patron} nombre={t.nombre} />
      </div>
      <div className="min-w-0 p-3">
        <p className="t-body-lg font-semibold text-ink">{t.nombre}</p>
        <p className="mt-0.5 t-body text-ink-2">{t.detalle}</p>
        <p className="mt-1 t-body-lg font-bold num text-ink">
          <Dinero valor={t.precio} />
        </p>
      </div>
    </div>
  );
}

function Partes({ partes, propio, carrusel }: { partes: Parte[]; propio: boolean; carrusel: boolean }) {
  return (
    <>
      {partes.map((p, i) =>
        p.tipo === 'texto' ? (
          <Burbuja key={i} propio={propio}>
            {p.texto}
          </Burbuja>
        ) : carrusel ? (
          <div key={i} className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
            {p.tarjetas.map((t) => (
              <TarjetaDeProducto key={t.productoId} t={t} ancha />
            ))}
          </div>
        ) : (
          <div key={i} className="flex max-w-[86%] flex-col gap-2">
            {p.tarjetas.map((t) => (
              <TarjetaDeProducto key={t.productoId} t={t} />
            ))}
          </div>
        ),
      )}
    </>
  );
}

function Burbuja({ propio, children }: { propio: boolean; children: string }) {
  const [primera, ...resto] = children.split('\n');
  return (
    <p
      className={cn(
        'max-w-[82%] whitespace-pre-line px-3.5 py-2.5 t-body-lg',
        propio
          ? 'rounded-sheet rounded-br-xs bg-ink text-inverse'
          : 'rounded-sheet rounded-bl-xs border border-line bg-surface text-ink',
      )}
    >
      {resto.length > 0 ? (
        <>
          <span className="block t-h2 normal-case num">{primera}</span>
          {resto.join('\n')}
        </>
      ) : (
        children
      )}
    </p>
  );
}

interface PropsChat {
  variante: 'whatsapp' | 'instagram';
  contacto: { nombre: string; detalle: string };
  mensajes: MensajeChat[];
  escribiendo: boolean;
  ahora: string;
  alEnviar: (t: string) => void;
  bloqueado: boolean;
  traspasado: boolean;
  inicial: string;
  /** Instagram: vista actual y cambio manual. */
  vista?: 'comentarios' | 'mensajes';
  alCambiarVista?: (v: 'comentarios' | 'mensajes') => void;
  comentarios?: ComentarioChat[];
  publicacion?: { tarjeta: TarjetaProducto | null; usuario: string; pie: string };
  ocultarEntrada?: boolean;
}

function BarraEstado({ ahora }: { ahora: string }) {
  return (
    <div className="flex h-[46px] shrink-0 items-end justify-between px-8 pb-1.5 text-ink" aria-hidden>
      <span className="t-body-lg font-semibold num">{hora(ahora)}</span>
      <span className="flex items-center gap-1.5">
        <Icono icono={Signal} tamano={16} />
        <Icono icono={Wifi} tamano={16} />
        <Icono icono={Battery} tamano={20} />
      </span>
    </div>
  );
}

export function PantallaChat({
  variante,
  contacto,
  mensajes,
  escribiendo,
  ahora,
  alEnviar,
  bloqueado,
  traspasado,
  inicial,
  vista = 'mensajes',
  alCambiarVista,
  comentarios = [],
  publicacion,
  ocultarEntrada,
}: PropsChat) {
  const cuerpo = useRef<HTMLDivElement | null>(null);
  const [texto, setTexto] = useState('');
  const instagram = variante === 'instagram';

  useEffect(() => {
    const el = cuerpo.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [mensajes.length, escribiendo, comentarios.length, vista]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || bloqueado) return;
    alEnviar(texto);
    setTexto('');
  };

  return (
    <div
      className="flex h-[844px] w-[390px] flex-col bg-canvas"
      data-testid="canales-telefono"
      data-canal={variante}
    >
      <style>{ESTILO_PUNTOS}</style>
      <BarraEstado ahora={ahora} />
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-3 py-2.5">
        <Icono icono={ChevronLeft} tamano={24} className="text-ink-2" />
        <span
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink t-body-lg font-black text-inverse"
          aria-hidden
        >
          {inicial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate t-h3 text-ink" data-testid="canales-contacto">
            {contacto.nombre}
          </p>
          <p className="truncate t-body text-muted" data-testid="canales-estado-chat" aria-live="polite">
            {escribiendo ? TEXTOS.chat.escribiendo : TEXTOS.chat.enLinea}
          </p>
        </div>
        {instagram && alCambiarVista ? (
          <Segmentado
            etiqueta="Vista del teléfono"
            tamano="sm"
            valor={vista}
            alCambiar={alCambiarVista}
            opciones={[
              {
                valor: 'comentarios',
                etiqueta: <Icono icono={Heart} tamano={16} etiqueta={TEXTOS.instagram.comentarios} />,
                aria: TEXTOS.instagram.comentarios,
                'data-testid': 'canales-vista-comentarios',
              },
              {
                valor: 'mensajes',
                etiqueta: <Icono icono={MessageCircle} tamano={16} etiqueta={TEXTOS.instagram.mensajes} />,
                aria: TEXTOS.instagram.mensajes,
                'data-testid': 'canales-vista-mensajes',
              },
            ]}
          />
        ) : (
          <span className="flex items-center gap-4 text-ink-2" aria-hidden>
            <Icono icono={Video} tamano={22} />
            <Icono icono={Phone} tamano={20} />
          </span>
        )}
      </header>

      <div
        ref={cuerpo}
        className={cn('min-h-0 flex-1 overflow-y-auto px-3 py-3', instagram ? 'bg-surface' : 'bg-surface-2')}
        data-testid="canales-cuerpo-chat"
      >
        {instagram && vista === 'comentarios' ? (
          <Comentarios comentarios={comentarios} publicacion={publicacion} />
        ) : (
          <div className="flex flex-col gap-1.5" data-testid="canales-mensajes">
            <p className="mx-auto mb-1 bg-surface px-3 py-1 t-body text-ink-2">{TEXTOS.chat.hoy}</p>
            {mensajes.map((m) => {
              if (m.autor === 'sistema')
                return (
                  <div
                    key={m.id}
                    className="my-1.5 flex animate-fade-in justify-center"
                    data-testid="canales-mensaje-sistema"
                  >
                    <p className="max-w-[88%] border border-line bg-surface px-3 py-2 text-center t-body text-ink-2">
                      {m.partes.map((p) => (p.tipo === 'texto' ? p.texto : '')).join(' ')}
                      {m.enlace && (
                        <Link
                          to={m.enlace.a}
                          className="ml-1.5 font-semibold text-ink underline underline-offset-2"
                          data-testid="canales-enlace-ficha"
                        >
                          {m.enlace.texto}
                        </Link>
                      )}
                    </p>
                  </div>
                );
              const propio = m.autor === 'cliente';
              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex animate-fade-in flex-col gap-1.5',
                    propio ? 'items-end' : 'items-start',
                  )}
                  data-testid={propio ? 'canales-mensaje-cliente' : 'canales-mensaje-bot'}
                  data-regla=""
                >
                  <Partes partes={m.partes} propio={propio} carrusel={instagram} />
                  <span className="inline-flex items-center gap-1 px-1 t-body text-muted num">
                    {hora(m.ts)}
                    {propio && (
                      <span className="text-ink">
                        <Entrega entrega={m.entrega} />
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
            {escribiendo && (
              <div className="flex items-start">
                <span className="rounded-sheet rounded-bl-xs border border-line bg-surface px-3 py-1.5">
                  <Puntos />
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {!(ocultarEntrada || (instagram && vista === 'comentarios')) && (
        <form
          onSubmit={enviar}
          className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-3 pb-8 pt-3"
          data-testid="canales-formulario-chat"
        >
          <Input
            etiqueta="Mensaje"
            etiquetaOculta
            tamano="lg"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              bloqueado
                ? TEXTOS.chat.bloqueado
                : traspasado
                  ? TEXTOS.chat.pausa('Una persona')
                  : TEXTOS.chat.escribir
            }
            disabled={bloqueado}
            className="flex-1"
            data-testid="canales-entrada"
            autoComplete="off"
          />
          <Button
            type="submit"
            tamano="lg"
            soloIcono
            icono={Enviar}
            aria-label={TEXTOS.chat.enviar}
            disabled={bloqueado || !texto.trim()}
            data-testid="canales-enviar"
          />
        </form>
      )}
    </div>
  );
}

function Comentarios({
  comentarios,
  publicacion,
}: {
  comentarios: ComentarioChat[];
  publicacion?: PropsChat['publicacion'];
}) {
  return (
    <div data-testid="canales-comentarios">
      {publicacion && (
        <>
          <div className="mb-3 flex items-center gap-2.5">
            <span
              className="inline-flex size-9 items-center justify-center rounded-full bg-ink t-body font-black text-inverse"
              aria-hidden
            >
              {publicacion.usuario.charAt(0).toUpperCase()}
            </span>
            <p className="t-body-lg font-semibold text-ink">{publicacion.usuario}</p>
          </div>
          <div className="bg-product px-16 py-4">
            {publicacion.tarjeta && (
              <Prenda
                tipo={publicacion.tarjeta.tipo}
                color={publicacion.tarjeta.color}
                patron={publicacion.tarjeta.patron}
                nombre={publicacion.tarjeta.nombre}
                tamano="hero"
              />
            )}
          </div>
          <p className="mt-3 t-body-lg text-ink">
            <span className="font-semibold">{publicacion.usuario}</span> {publicacion.pie}
          </p>
          <p className="mb-3 mt-4 t-eyebrow text-ink-2">{TEXTOS.instagram.comentarios}</p>
        </>
      )}
      <ul className="flex flex-col gap-3">
        {comentarios.map((c) => (
          <li
            key={c.id}
            className={cn('flex animate-fade-in gap-2.5', c.respuestaDe && 'ml-9')}
            data-testid={c.respuestaDe ? 'canales-comentario-bot' : 'canales-comentario'}
          >
            <Avatar nombre={c.usuario} tamano={32} />
            <div className="min-w-0">
              <p className="t-body-lg text-ink">
                <span className="font-semibold">{c.usuario}</span> {c.texto}
              </p>
              <p className="mt-0.5 flex items-center gap-2 t-body text-muted num">
                {hora(c.ts)}
                {c.respuestaDe && (
                  <Badge tono="neutral" tamano="sm">
                    Respuesta automática
                  </Badge>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
