import { ExternalLink, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { rutas } from '@/app/rutas';
import { useDinero, useHoy, useMarca, useSel } from '@/estado';
import { entero } from '@/lib/formato';
import { BotonEnlace, Card, cn, Icono, Kpi, MarcoNavegador, MarcoTelefono, Segmentado } from '@/ui';
import { EncabezadoCanales, EtiquetaVitrina } from '../componentes/Piezas';
import { LimiteError } from '../componentes/LimiteError';
import { selIndicadoresCanales } from '../selectores';
import { TEXTOS } from '../textos';

type Dispositivo = 'ambos' | 'escritorio' | 'celular';
const SRC = '/tienda?marco=1';

export default function Web() {
  return (
    <div className="pb-24">
      <LimiteError>
        <Vista />
      </LimiteError>
    </div>
  );
}

function Vista() {
  const [dispositivo, setDispositivo] = useState<Dispositivo>('ambos');
  const marca = useMarca();
  const hoy = useHoy();
  const dinero = useDinero();
  const web = useSel(selIndicadoresCanales, { hoy }).web;
  const dominio = `tienda.${marca.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '')}.demo`;

  return (
    <>
      <EncabezadoCanales
        actual="web"
        titulo={TEXTOS.web.titulo}
        subtitulo={TEXTOS.web.subtitulo}
        acciones={
          <BotonEnlace
            to={rutas.tienda()}
            variante="secondary"
            icono={ExternalLink}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="canales-abrir-tienda"
          >
            {TEXTOS.web.abrir}
          </BotonEnlace>
        }
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <Segmentado
          etiqueta="Dispositivo"
          valor={dispositivo}
          alCambiar={setDispositivo}
          opciones={[
            { valor: 'ambos', etiqueta: TEXTOS.web.ambos, 'data-testid': 'canales-web-ambos' },
            { valor: 'escritorio', etiqueta: TEXTOS.web.escritorio, 'data-testid': 'canales-web-escritorio' },
            { valor: 'celular', etiqueta: TEXTOS.web.celular, 'data-testid': 'canales-web-celular' },
          ]}
        />
        <p className="max-w-[70ch] t-body text-ink-2">{TEXTOS.web.avisoMarco}</p>
      </div>

      <div
        className={cn(
          'mt-6 grid items-start gap-8',
          dispositivo === 'ambos' ? 'desk:grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-1',
        )}
      >
        {dispositivo !== 'celular' && (
          <div className="min-w-0" data-testid="canales-marco-escritorio">
            <EtiquetaVitrina className="mb-3" />
            <MarcoNavegador
              src={SRC}
              direccion={dominio}
              titulo="Tienda en línea en escritorio"
              alto={dispositivo === 'ambos' ? 600 : 720}
            />
          </div>
        )}
        {dispositivo !== 'escritorio' && (
          <div
            className={cn('flex flex-col', dispositivo === 'celular' && 'items-center')}
            data-testid="canales-marco-celular"
          >
            <EtiquetaVitrina className="mb-3 self-start" />
            <MarcoTelefono
              src={SRC}
              escala={dispositivo === 'celular' ? 0.85 : 0.72}
              titulo="Tienda en línea en celular"
            />
          </div>
        )}
      </div>

      <Card
        padding="compacta"
        className="mt-8"
        titulo="Lo que aporta la tienda web"
        data-testid="canales-web-indicadores"
      >
        <div className="grid grid-cols-1 gap-3 desk:grid-cols-3">
          <Kpi
            etiqueta="Ventas por la web"
            valor={web.valor}
            formatear={dinero.corta}
            completo={dinero(web.valor)}
            nota={`${entero(web.ventas)} ${web.ventas === 1 ? 'pedido' : 'pedidos'} en los últimos 30 días`}
          />
          <Kpi
            etiqueta="Pedidos web"
            valor={web.ventas}
            formatear={entero}
            nota="Cada compra descuenta inventario"
          />
          <div className="flex min-h-[132px] flex-col justify-between border border-line bg-surface p-5">
            <p className="flex items-center gap-2 t-eyebrow text-ink-2">
              <Icono icono={ShoppingBag} tamano={16} />
              Ventas por canal
            </p>
            <p className="t-body text-ink-2">
              Prueba comprar en la tienda de arriba: la venta aparece en Ventas con canal Web y descuenta el
              inventario.
            </p>
            <BotonEnlace
              to={rutas.ventas({ canal: 'web' })}
              variante="link"
              data-testid="canales-ver-ventas-web"
            >
              Ver las ventas del canal Web
            </BotonEnlace>
          </div>
        </div>
      </Card>
    </>
  );
}
