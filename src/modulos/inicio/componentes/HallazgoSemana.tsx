import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useAhora, useFiltroLocal, useSel } from '@/estado';
import { selHallazgos } from '@/selectores';
import { Card, FraseConDinero, Icono } from '@/ui';
import { elegirPorVisita } from '../calculos';
import { TXT } from '../textos';

/**
 * "Hallazgo de la semana" (PLAN 2.3.2): una tarjeta ancha, con tipografía grande, que dice una cosa del negocio
 * que el dueño no habría visto solo (`selHallazgos`). Rota en cada visita a Inicio: la primera vez, el más relevante.
 */
let visitas = 0;

export function HallazgoSemana() {
  const hoy = useAhora().slice(0, 10);
  const localId = useFiltroLocal();
  const hallazgos = useSel(selHallazgos, { hoy, localId, maximo: 5 });
  // Una visita = un montaje de la pantalla (el contador vive en el módulo, no se guarda en ningún lado).
  const [visita] = useState(() => visitas++);
  const h = elegirPorVisita(hallazgos, visita);
  if (!h) return null;
  const enAnalisis = h.enlace.startsWith('/panel/analisis');
  return (
    <Card destacada padding="ninguno" className="px-8 py-7" data-testid="inicio-hallazgo">
      <p className="t-eyebrow text-inverse/80">{TXT.hallazgo.eyebrow}</p>
      <p className="mt-3 max-w-[60ch] t-kpi text-inverse" data-testid="inicio-hallazgo-frase">
        <FraseConDinero partes={h.partes} />
      </p>
      <Link to={h.enlace} className="mt-5 inline-flex items-center gap-1.5 t-label font-bold text-inverse underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-inverse" data-testid="inicio-hallazgo-enlace">
        {enAnalisis ? TXT.hallazgo.verAnalisis : TXT.hallazgo.verDetalle}
        <Icono icono={ArrowRight} tamano={14} />
      </Link>
    </Card>
  );
}
