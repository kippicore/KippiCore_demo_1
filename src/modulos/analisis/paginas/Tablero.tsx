import { useEffect } from 'react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useFiltroLocal, useHoy } from '@/estado';
import { Card, useNombreLocal } from '@/ui';
import { BloqueHallazgos, BloqueProyeccion, GraficoMeses, GraficoSemanas, MapaDiaHora } from '../componentes/BloquesResumen';
import { EncabezadoAnalisis } from '../componentes/EncabezadoAnalisis';
import { LimiteErrores } from '../componentes/Piezas';
import { TXT } from '../textos';

/** Secciones a las que puede llevar `?vista=` (se desplaza hasta ella). */
const SECCIONES = ['hallazgos', 'proyeccion', 'meses', 'calor', 'semanas'] as const;

/**
 * Análisis · Resumen (PRD 7.12): los hallazgos en frases, la proyección del mes, las ventas por mes con el año
 * anterior, el mapa de calor día × hora y las ventas por semana del año. Respeta el local de la barra superior.
 */
export default function Tablero() {
  const { vista, resaltar } = useParamsRuta('analisis');
  const hoy = useHoy();
  const localId = useFiltroLocal();
  const nombreLocal = useNombreLocal(localId);

  // `?vista=calor` lleva directo a esa sección.
  useEffect(() => {
    if (!vista || !(SECCIONES as readonly string[]).includes(vista)) return;
    const el = document.querySelector(`[data-seccion="${vista}"]`);
    if (el instanceof HTMLElement) el.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [vista]);

  const mesResaltado = resaltar && /^\d{4}-\d{2}$/.test(resaltar) ? resaltar : null;
  return (
    <>
      <EncabezadoAnalisis titulo={TXT.titulo} subtitulo={TXT.subtitulo} />

      <div className="mt-8 flex flex-col gap-10">
        <div data-seccion="hallazgos" className="scroll-mt-24">
          <LimiteErrores titulo="No pudimos sacar los hallazgos">
            <BloqueHallazgos resaltar={resaltar} />
          </LimiteErrores>
        </div>

        <div data-seccion="proyeccion" className="scroll-mt-24">
          <LimiteErrores titulo="No pudimos proyectar el mes">
            <BloqueProyeccion />
          </LimiteErrores>
        </div>

        <div data-seccion="meses" className="scroll-mt-24">
          <LimiteErrores titulo="No pudimos armar las ventas por mes">
            <GraficoMeses localId={localId} nombreLocal={nombreLocal} resaltarMes={mesResaltado} />
          </LimiteErrores>
        </div>

        <div data-seccion="calor" className="scroll-mt-24">
          <LimiteErrores titulo="No pudimos armar el mapa de calor">
            <MapaDiaHora localId={localId} nombreLocal={nombreLocal} desde={sumarDias(hoy, -83)} hasta={hoy} />
          </LimiteErrores>
        </div>

        <div data-seccion="semanas" className="scroll-mt-24">
          <LimiteErrores titulo="No pudimos armar las ventas por semana">
            <GraficoSemanas localId={localId} nombreLocal={nombreLocal} />
          </LimiteErrores>
        </div>

        <section aria-labelledby="titulo-explorar" data-testid="explorar">
          <h2 id="titulo-explorar" className="mb-4 t-h2 text-ink">
            {TXT.explorar.titulo}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 desk:grid-cols-4">
            {(
              [
                [TXT.explorar.productos, rutas.analisisProductos(), 'explorar-productos'],
                [TXT.explorar.clientes, rutas.analisisClientes(), 'explorar-clientes'],
                [TXT.explorar.locales, rutas.analisisLocales(), 'explorar-locales'],
                [TXT.explorar.tabla, rutas.tablaDinamica(), 'explorar-tabla'],
              ] as const
            ).map(([t, a, id]) => (
              <Card key={id} a={a} padding="compacta" data-testid={id}>
                <h3 className="t-h3 text-ink">{t.titulo}</h3>
                <p className="mt-2 t-small text-muted">{t.texto}</p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
