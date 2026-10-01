import { Ship } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { INDICADORES_IMPORTACION } from '@/config/estados';
import { ETIQUETAS_ESTADO_IMPORTACION } from '@/config/aduanas';
import { useAhora, useSel } from '@/estado';
import { fecha, plural, relativaDias } from '@/lib/formato';
import { dineroOrigen } from '@/lib/moneda';
import { selImportaciones } from '@/selectores';
import { Badge, BarraProgreso, Dinero, EmptyState, pasosImportacion, Timeline, TimelineCompacta } from '@/ui/ligero';
import { pasosHito, textoCarga } from '../calculos';
import { Pantalla } from '../componentes/Pantalla';
import { ParDato, Tarjeta, TarjetaTitulo } from '../componentes/Tarjeta';
import { TXT } from '../textos';

/**
 * Detalle de una importación (W3 en el celular): el estado, cuándo llega a bodega, lo pagado a la fábrica y la
 * línea de tiempo completa de los 13 estados en 5 fases, con la fecha estimada y la real de cada paso, la
 * desviación y quién lo reportó (la agente de aduanas desde el portal). Los datos son los de `selImportaciones`.
 */
export default function Importacion() {
  const { numero } = useParamsRuta('appImportacion');
  const hoy = useAhora().slice(0, 10);
  const fila = useSel(selImportaciones, { hoy }).find((f) => f.importacion.numero === numero);
  if (!fila)
    return (
      <Pantalla testid="app-importacion-pagina" titulo="Importación" volver={{ a: rutas.appImportaciones(), texto: TXT.importaciones.titulo }}>
        <Tarjeta>
          <EmptyState tamano="compacto" icono={Ship} titulo="No encontramos esa importación" texto="Puede que ya no esté en la lista. Vuelve a Importaciones." />
        </Tarjeta>
      </Pantalla>
    );
  const imp = fila.importacion;
  const pagadoPct = fila.pagadoOrigen + fila.saldoOrigen > 0 ? fila.pagadoOrigen / (fila.pagadoOrigen + fila.saldoOrigen) : 0;
  const hitos = new Map(pasosHito(imp.estado, imp.hitos, hoy).map((h) => [h.estado, h]));
  const pasos = pasosImportacion(imp.estado, { retrasado: fila.retrasoDias > 0 }).map((p) => {
    const h = hitos.get(p.id as keyof typeof ETIQUETAS_ESTADO_IMPORTACION);
    if (!h) return p;
    const alcanzado = h.situacion !== 'pendiente';
    let insignia = null;
    if (alcanzado && h.desviacion !== null && h.desviacion > 0)
      insignia = (
        <Badge tono="warning" tamano="sm">
          {plural(h.desviacion, 'día', 'días')} tarde
        </Badge>
      );
    else if (alcanzado && h.desviacion !== null && h.desviacion < 0)
      insignia = (
        <Badge tono="success" tamano="sm">
          {plural(-h.desviacion, 'día', 'días')} antes
        </Badge>
      );
    else if (!alcanzado && h.vencidoDias > 0)
      insignia = (
        <Badge tono={INDICADORES_IMPORTACION.retraso.tono} tamano="sm">
          Retraso de {plural(h.vencidoDias, 'día', 'días')}
        </Badge>
      );
    return {
      ...p,
      detalle: (
        <>
          {alcanzado ? `Estimada ${fecha(h.estimada)} · Real ${fecha(h.real ?? h.estimada)}` : `Estimada ${fecha(h.estimada)}`}
          {h.nota && <span className="block text-muted">{h.nota}</span>}
        </>
      ),
      insignia,
      autor: h.porPortal ? 'Reportado por la agente de aduanas desde el portal de seguimiento' : undefined,
    };
  });
  const recibida = imp.estado === 'recibido_bodega';

  return (
    <Pantalla
      testid="app-importacion-pagina"
      titulo={imp.numero}
      volver={{ a: rutas.appImportaciones(), texto: TXT.importaciones.titulo }}
      fecha={`${fila.proveedorNombre} · ${imp.puertoOrigen} → ${imp.puertoDestino}`}
    >
      <Tarjeta className="p-4" data-testid="app-imp-estado">
        <div className="flex items-start justify-between gap-3">
          <p className="t-h3 text-ink">{ETIQUETAS_ESTADO_IMPORTACION[imp.estado]}</p>
          {fila.retrasoDias > 0 && (
            <Badge tono="danger" tamano="sm">
              Retraso de {plural(fila.retrasoDias, 'día', 'días')}
            </Badge>
          )}
        </div>
        <TimelineCompacta className="mt-3" estado={imp.estado} conTexto={false} />
        <p className="mt-3 t-body text-ink">
          {recibida ? 'Llegó a bodega el ' : 'Llega a bodega '}
          <span className="num">{recibida ? fecha(fila.llegadaEstimada) : `${relativaDias(fila.llegadaEstimada, hoy)} · ${fecha(fila.llegadaEstimada)}`}</span>
        </p>
        {imp.aforo && imp.aforo.tipo !== 'automatico' && (
          <p className="mt-2 t-small text-muted">
            Aforo {imp.aforo.tipo === 'fisico' ? 'físico' : 'documental'}
            {imp.aforo.motivo ? `: ${imp.aforo.motivo}` : ''}
          </p>
        )}
      </Tarjeta>

      <Tarjeta>
        <TarjetaTitulo titulo="El pedido" />
        <dl className="divide-y divide-line-soft px-4 pb-2">
          <ParDato etiqueta="Prendas">{plural(fila.unidades, 'prenda', 'prendas')}</ParDato>
          <ParDato etiqueta="Carga">{textoCarga(imp.carga)}</ParDato>
          <ParDato etiqueta="Valor en fábrica (FOB)">
            <span className="num">{dineroOrigen(fila.fobOrigen, imp.moneda)}</span>
            <span className="block t-small text-muted">
              <Dinero valor={fila.fobCop} corta />
            </span>
          </ParDato>
        </dl>
        <div className="px-4 pb-4">
          <BarraProgreso
            alto={4}
            valor={pagadoPct}
            etiqueta="Pagado a la fábrica"
            detalle={`${dineroOrigen(fila.pagadoOrigen, imp.moneda)} de ${dineroOrigen(fila.pagadoOrigen + fila.saldoOrigen, imp.moneda)}`}
          />
        </div>
      </Tarjeta>

      <Tarjeta data-testid="app-imp-linea">
        <TarjetaTitulo titulo="Por dónde va" />
        <div className="px-4 pb-1 pt-2">
          <Timeline pasos={pasos} />
        </div>
      </Tarjeta>
    </Pantalla>
  );
}
