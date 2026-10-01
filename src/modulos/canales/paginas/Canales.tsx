import { Globe, MessageCircle, MessagesSquare } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { rutas } from '@/app/rutas';
import { useDinero, useHoy, useSel } from '@/estado';
import { entero } from '@/lib/formato';
import { Badge, BotonEnlace, Card, cn, Dinero, Icono, Kpi, Prenda } from '@/ui';
import { EncabezadoCanales } from '../componentes/Piezas';
import { LimiteError } from '../componentes/LimiteError';
import { construirGuion } from '../escenarios';
import { selIndicadoresCanales } from '../selectores';
import { TEXTOS } from '../textos';
import { useDatosBot } from '../useDatosBot';

export default function Canales() {
  return (
    <div className="pb-24">
      <LimiteError>
        <Vista />
      </LimiteError>
    </div>
  );
}

function Burbuja({ propio, children }: { propio?: boolean; children: ReactNode }) {
  return (
    <p
      className={cn(
        'max-w-[88%] px-3 py-2 t-body',
        propio ? 'ml-auto bg-ink text-inverse' : 'border border-line bg-surface text-ink',
      )}
    >
      {children}
    </p>
  );
}

function Vista() {
  const hoy = useHoy();
  const dinero = useDinero();
  const { entrada, datos } = useDatosBot();
  const ind = useSel(selIndicadoresCanales, { hoy });

  // Las vistas previas usan el mismo motor que las demostraciones: lo que se lee aquí es la respuesta real del bot.
  const consulta = useMemo(() => {
    const g = construirGuion('consulta-talla', entrada);
    const textos = g.pasos.flatMap((p) =>
      p.tipo === 'cliente'
        ? [{ propio: true, t: p.texto }]
        : p.tipo === 'bot'
          ? p.partes.flatMap((x) => (x.tipo === 'texto' ? [{ propio: false, t: x.texto }] : []))
          : [],
    );
    return textos.slice(0, 2);
  }, [entrada]);
  const novedades = useMemo(
    () =>
      datos.novedadesIds
        .map((id) => datos.productos.find((p) => p.id === id))
        .filter((p) => !!p)
        .slice(0, 3),
    [datos],
  );
  const comentario = useMemo(() => {
    const g = construirGuion('precio-comentario', entrada);
    const bot = g.pasos.find((p) => p.tipo === 'comentario' && p.respuestaDe);
    return bot && bot.tipo === 'comentario' ? bot.texto : '';
  }, [entrada]);

  const tarjetas: {
    id: string;
    titulo: string;
    icono: typeof MessageCircle;
    texto: string;
    a: string;
    vista: ReactNode;
    cifra: {
      etiqueta: string;
      valor: number;
      formatear: (n: number) => string;
      completo?: string;
      nota: string;
    };
    testid: string;
  }[] = [
    {
      id: 'whatsapp',
      titulo: TEXTOS.resumen.whatsappTitulo,
      icono: MessageCircle,
      texto: TEXTOS.resumen.whatsappTexto,
      a: rutas.canalWhatsapp({ escenario: 'consulta-talla' }),
      testid: 'canales-tarjeta-whatsapp',
      vista: (
        <div className="flex flex-col gap-2">
          {consulta.map((c, i) => (
            <Burbuja key={i} propio={c.propio}>
              {c.t}
            </Burbuja>
          ))}
        </div>
      ),
      cifra: {
        etiqueta: TEXTOS.indicadores.ventas,
        valor: ind.whatsapp.valor,
        formatear: dinero.corta,
        completo: dinero(ind.whatsapp.valor),
        nota: TEXTOS.indicadores.ventasNota(ind.whatsapp.ventas),
      },
    },
    {
      id: 'instagram',
      titulo: TEXTOS.resumen.instagramTitulo,
      icono: MessagesSquare,
      texto: TEXTOS.resumen.instagramTexto,
      a: rutas.canalInstagram(),
      testid: 'canales-tarjeta-instagram',
      vista: (
        <div className="flex flex-col gap-2">
          <p className="t-body text-ink">
            <span className="font-semibold">camilo.rojas_</span> precio?
          </p>
          <p className="ml-6 border-l-2 border-ink pl-3 t-body text-ink-2">
            <span className="font-semibold">{datos.marca.toLowerCase()}.demo</span> {comentario}
          </p>
        </div>
      ),
      cifra: {
        etiqueta: TEXTOS.indicadores.ventas,
        valor: ind.instagram.valor,
        formatear: dinero.corta,
        completo: dinero(ind.instagram.valor),
        nota: TEXTOS.indicadores.ventasNota(ind.instagram.ventas),
      },
    },
    {
      id: 'web',
      titulo: TEXTOS.resumen.webTitulo,
      icono: Globe,
      texto: TEXTOS.resumen.webTexto,
      a: rutas.canalWeb(),
      testid: 'canales-tarjeta-web',
      vista: (
        <div className="grid grid-cols-3 gap-2">
          {novedades.map((p) => (
            <div key={p!.id}>
              <div className="bg-product">
                <Prenda
                  tipo={p!.tipo}
                  color={p!.colores[0]?.hex ?? '#999999'}
                  patron={p!.colores[0]?.patron}
                  nombre={p!.nombre}
                />
              </div>
              <p className="mt-1.5 truncate t-small text-ink">{p!.nombre}</p>
              <p className="t-small font-semibold num text-ink">
                <Dinero valor={p!.precio} corta />
              </p>
            </div>
          ))}
        </div>
      ),
      cifra: {
        etiqueta: 'Ventas por la web',
        valor: ind.web.valor,
        formatear: dinero.corta,
        completo: dinero(ind.web.valor),
        nota: TEXTOS.indicadores.ventasNota(ind.web.ventas),
      },
    },
  ];

  return (
    <>
      <EncabezadoCanales
        actual="resumen"
        titulo={TEXTOS.encabezado.titulo}
        subtitulo={TEXTOS.encabezado.subtitulo}
      />

      <div className="mt-8 grid grid-cols-1 gap-4 desk:grid-cols-3" data-testid="canales-tarjetas">
        {tarjetas.map((t) => (
          <Card key={t.id} padding="compacta" className="flex flex-col" data-testid={t.testid}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2.5 t-h2 text-ink">
                <Icono icono={t.icono} tamano={22} />
                {t.titulo}
              </h2>
              <Badge tono="neutral" tamano="sm">
                Vista previa
              </Badge>
            </div>
            <div className="mt-4 min-h-[188px] bg-surface-2 p-4">{t.vista}</div>
            <p className="mt-4 flex-1 t-body text-ink-2">{t.texto}</p>
            <div className="mt-4">
              <Kpi
                etiqueta={t.cifra.etiqueta}
                valor={t.cifra.valor}
                formatear={t.cifra.formatear}
                completo={t.cifra.completo}
                nota={t.cifra.nota}
              />
            </div>
            <BotonEnlace
              to={t.a}
              variante="secondary"
              className="mt-4 self-start"
              data-testid={`canales-ver-${t.id}`}
            >
              {TEXTOS.resumen.ver}
            </BotonEnlace>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 desk:grid-cols-3">
        <Kpi
          etiqueta={TEXTOS.indicadores.mensajes}
          valor={ind.totalMensajes}
          formatear={entero}
          nota="WhatsApp e Instagram, últimos 30 días (simulado)"
          data-testid="canales-total-mensajes"
        />
        <Kpi
          etiqueta="Ventas atribuidas a los canales"
          valor={ind.totalValor}
          formatear={dinero.corta}
          completo={dinero(ind.totalValor)}
          nota={`${entero(ind.totalVentas)} ventas por WhatsApp, Instagram y la web`}
          data-testid="canales-total-ventas"
        />
        <Card padding="compacta" className="flex items-center">
          <p className="t-body text-ink-2">{TEXTOS.resumen.queNoEs}</p>
        </Card>
      </div>
    </>
  );
}
