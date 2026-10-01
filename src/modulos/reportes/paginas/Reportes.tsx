import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { avisar, EncabezadoPagina, prefiereMenosMovimiento, textoRango } from '@/ui';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useMoneda, useRolActivo } from '@/estado';
import type { IdReporte } from '@/reportes';
import { gruposPermitidos, resolverReporte } from '../calculos';
import { BarraFiltros } from '../componentes/BarraFiltros';
import { Documentos } from '../componentes/Documentos';
import { ListaReportes } from '../componentes/ListaReportes';
import { PanelReporte } from '../componentes/PanelReporte';
import { TarjetaContador } from '../componentes/TarjetaContador';
import { useFiltrosPantalla, useVistaPrevia } from '../hooks';
import { TEXTOS } from '../textos';

/**
 * Centro de reportes (PRD 7.15, D4): cualquier reporte del negocio en PDF o Excel, filtrado por fechas y local.
 * La pantalla solo elige, filtra, muestra una vista previa y descarga: las filas salen de las definiciones únicas
 * de `src/reportes` (la misma regla que usan los botones "Exportar" de los demás módulos).
 * `?reporte=<id>` abre el reporte; el rol bodega solo ve inventario y kárdex.
 */
export default function Reportes() {
  const rol = useRolActivo();
  const navegar = useNavigate();
  const { moneda } = useMoneda();
  const { reporte: param } = useParamsRuta('reportes');
  const { id, motivo } = resolverReporte(param, rol);
  const f = useFiltrosPantalla(id);
  const vista = useVistaPrevia(id, f.filtros);
  const panel = useRef<HTMLElement>(null);
  const primera = useRef(true);
  const grupos = gruposPermitidos(rol);
  const conContador = rol === 'dueno';

  // Un `?reporte=` que no existe o que el rol no ve: se abre el primero y se avisa sin alboroto.
  useEffect(() => {
    if (motivo) avisar({ tipo: 'info', texto: motivo === 'desconocido' ? TEXTOS.avisos.desconocido : TEXTOS.avisos.sinPermiso });
  }, [motivo, param]);

  // Al abrir un reporte (desde la lista, la tarjeta del contador o la URL) el panel se lleva a la vista.
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      if (!param) return;
    }
    const el = panel.current;
    if (!el) return;
    const { top } = el.getBoundingClientRect();
    if (top < 80 || top > window.innerHeight * 0.55) el.scrollIntoView({ block: 'start', behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth' });
    // Solo cuando cambia el reporte abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const abrir = (nuevo: IdReporte) => navegar(rutas.reportes({ reporte: nuevo }), { replace: true });
  const filtrosContador = f.filtrosDe('contador');
  const localContador = filtrosContador.localId === 'todos' ? 'Todos los locales' : (f.opcionesLocal.find((o) => o.valor === filtrosContador.localId)?.etiqueta ?? 'Un local');

  return (
    <>
      <EncabezadoPagina migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Reportes' }]} titulo={TEXTOS.titulo} subtitulo={TEXTOS.subtitulo} />
      <div className="mt-8 flex flex-col gap-10">
        <BarraFiltros f={f} />
        {conContador && (
          <TarjetaContador
            resumenFiltros={`${textoRango(f.rango, f.hoy)} · ${localContador} · Cifras en ${moneda}`}
            filtros={filtrosContador}
            abierta={id === 'contador'}
            alVerQueTrae={() => abrir('contador')}
          />
        )}
        <div className="grid grid-cols-1 gap-8 desk:grid-cols-12" data-testid="reportes-centro">
          <div className="desk:col-span-5 wide:col-span-4">
            <ListaReportes grupos={grupos} abierto={id} alElegir={abrir} />
          </div>
          <div className="min-w-0 desk:col-span-7 wide:col-span-8">
            <PanelReporte ref={panel} id={id} f={f} vista={vista} />
          </div>
        </div>
        {rol === 'dueno' && <Documentos />}
      </div>
    </>
  );
}
