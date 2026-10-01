import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { FechaISO, Id } from '@/dominio/tipos';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useEstadoDominio, useFiltroLocal, useHoy, useRolActivo, useSel, useUsuarioActivo } from '@/estado';
import { selLocalesQueVenden, selNarrativa } from '@/selectores';
import { EncabezadoPagina, PanelTab, Segmentado, Tabs } from '@/ui';
import { CajaDelLocal } from '../componentes/CajaDelLocal';
import { CierresDueno } from '../componentes/CierresDueno';
import { DetalleCierre } from '../componentes/DetalleCierre';
import { selCierresRecientes } from '../selectores';
import { TEXTOS } from '../textos';

/**
 * Caja (PRD 7.2, W11). El vendedor opera la de su local: abre con la base, registra egresos y cierra con ARQUEO CIEGO
 * (cuenta sin ver el esperado). El dueño además ve los cierres de los tres locales —quién cerró, cuánto contó, si
 * cuadró— y los marca como revisados con una nota. Honra `?sesion=<id>` (abre el detalle de ese cierre) y
 * `?resaltar=<sesionId>` (destella la tarjeta o la fila).
 */
export default function Caja() {
  const rol = useRolActivo();
  const esDueno = rol === 'dueno';
  const { sesion, resaltar } = useParamsRuta('caja');
  const navegar = useNavigate();
  const e = useEstadoDominio();
  const hoy = useHoy();
  const contexto = useFiltroLocal();
  const { localFijoId } = useUsuarioActivo();
  const locales = useSel(selLocalesQueVenden);
  const narrativa = useSel(selNarrativa, { hoy });
  const recientes = useSel(selCierresRecientes, { hoy, dias: 7 });

  const [pestana, setPestana] = useState<'cierres' | 'caja'>('cierres');
  const [localElegido, setLocalElegido] = useState<Id | null>(null);
  // Día de los cierres: el de la caja pedida por enlace o, por defecto, el último con cierres (la "anoche" de W11).
  const [diaElegido, setDiaElegido] = useState<FechaISO | null>(null);
  const diaDeLaSesion = sesion ? (e.sesionesCaja[sesion]?.abierta.ts.slice(0, 10) ?? null) : null;
  const diaPorDefecto = recientes.find((d) => d.filas.some((f) => f.estado === 'cerrada' || f.estado === 'revisada'))?.fecha ?? hoy;
  const dia = diaElegido ?? diaDeLaSesion ?? diaPorDefecto;

  const elegido = localElegido && locales.some((l) => l.id === localElegido) ? localElegido : null;
  const deLaNarrativa = narrativa.localEscasez && locales.some((l) => l.id === narrativa.localEscasez) ? narrativa.localEscasez : null;
  const localId: Id = esDueno ? (contexto !== 'todos' ? contexto : (elegido ?? deLaNarrativa ?? locales[0]?.id ?? '')) : (localFijoId ?? locales[0]?.id ?? '');
  const nombreLocal = e.locales[localId]?.nombre ?? '';

  const encabezado = (
    <EncabezadoPagina
      migas={[{ texto: 'Punto de venta', a: rutas.pos() }, { texto: 'Caja' }]}
      titulo={TEXTOS.caja.titulo}
      subtitulo={esDueno ? 'Cierres de los tres locales y la caja del día, con arqueo ciego' : `Caja de ${nombreLocal}: apertura, egresos y cierre con arqueo ciego`}
    />
  );

  const detalle = <DetalleCierre sesionId={esDueno ? sesion : null} alCerrar={() => navegar(rutas.caja(), { replace: true })} />;

  if (!esDueno)
    return (
      <div data-testid="caja">
        {encabezado}
        <div className="mt-8">
          <CajaDelLocal localId={localId} />
        </div>
      </div>
    );

  return (
    <div data-testid="caja">
      {encabezado}
      <Tabs
        className="mt-6"
        etiqueta="Vistas de la caja"
        valor={pestana}
        alCambiar={setPestana}
        pestanas={[
          { valor: 'cierres', etiqueta: 'Cierres de los locales', 'data-testid': 'caja-pestana-cierres' },
          { valor: 'caja', etiqueta: 'Caja del día', 'data-testid': 'caja-pestana-caja' },
        ]}
      >
        <PanelTab valor="cierres" className="mt-8">
          <CierresDueno dia={dia} alDia={setDiaElegido} alAbrir={(id) => navegar(rutas.caja({ sesion: id }))} resaltar={resaltar} />
        </PanelTab>
        <PanelTab valor="caja" className="mt-8">
          {contexto === 'todos' && (
            <Segmentado
              className="mb-6"
              etiqueta="Local de la caja"
              valor={localId}
              alCambiar={setLocalElegido}
              opciones={locales.map((l) => ({ valor: l.id, etiqueta: l.nombre, 'data-testid': `caja-local-${l.id}` }))}
            />
          )}
          <CajaDelLocal localId={localId} />
        </PanelTab>
      </Tabs>
      {detalle}
    </div>
  );
}
