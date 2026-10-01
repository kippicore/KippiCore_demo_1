import { MessageCircle } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { MARCA } from '@/config/marca';
import { COMO_ARRANCARIAMOS as T, TRAE_TU_EXCEL } from '@/config/textos/guia';
import { BotonEnlace, clasesBoton, Icono } from '@/ui/ligero';
import { Pantalla } from '../componentes/Pantalla';
import { Tarjeta } from '../componentes/Tarjeta';

/**
 * "Cómo arrancaríamos" en el celular (PLAN 2.8): la misma página del escritorio, con el MISMO texto (`config/textos/guia`,
 * de E2), en tarjetas de lectura corta: por etapas, tus Excel los cargamos nosotros, funciona en computador, tablet y
 * celular, si se cae el internet, tus datos son tuyos y convive con tu contador. Sin cifras de tiempo de respuesta ni
 * promesas técnicas. "Hablar con KippiCore" solo aparece si hay un WhatsApp configurado en `config/marca`.
 */
export default function ComoArrancariamos() {
  const wa = MARCA.hablarConKippicore.whatsapp;
  return (
    <Pantalla testid="app-como-arrancariamos" titulo={T.titulo} volver={{ a: rutas.appMas(), texto: 'Más' }}>
      <Tarjeta className="p-4">
        <h2 className="t-h3 text-ink">{T.etapas.titulo}</h2>
        <ol className="mt-3 flex flex-col">
          {T.etapas.items.map((e, i) => (
            <li key={e.etapa} className="flex gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
              <span className="w-7 shrink-0 t-kpi-sm text-ink-2">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block t-eyebrow text-ink-2">{e.etapa}</span>
                <span className="mt-0.5 block t-body font-semibold text-ink">{e.titulo}</span>
                <span className="mt-0.5 block t-small text-muted">{e.semanas}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 t-small text-muted">{T.etapas.nota}</p>
      </Tarjeta>
      {[T.excel, T.dispositivos, T.internet, T.datos, T.contador].map((b) => (
        <Tarjeta key={b.titulo} className="p-4">
          <h2 className="t-h3 text-ink">{b.titulo}</h2>
          <p className="mt-1 t-body text-muted">{b.texto}</p>
        </Tarjeta>
      ))}
      <p className="px-1 t-small text-muted">{TRAE_TU_EXCEL.texto}</p>
      <div className="flex flex-col gap-3 pt-1">
        {wa && (
          <>
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent(MARCA.hablarConKippicore.texto)}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="app-hablar"
              className={clasesBoton({ variante: 'primary', tamano: 'lg', anchoCompleto: true })}
            >
              <Icono icono={MessageCircle} tamano={18} />
              {T.cta.hablar}
            </a>
            <p className="text-center t-small text-muted">{T.cta.subtitulo}</p>
          </>
        )}
        <BotonEnlace to={rutas.app()} variante={wa ? 'secondary' : 'primary'} tamano="lg" anchoCompleto>
          {T.cta.seguir}
        </BotonEnlace>
      </div>
    </Pantalla>
  );
}
