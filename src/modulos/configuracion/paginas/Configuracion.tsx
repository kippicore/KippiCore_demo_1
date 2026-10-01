import type { ReactNode } from 'react';
import { Badge, Card, EncabezadoPagina, Icono } from '@/ui';
import { rutas } from '@/app/rutas';
import { useDatos, useHoy, useMarca, useSel } from '@/estado';
import { MONEDAS } from '@/config/monedas';
import { plural, porcentaje } from '@/lib/formato';
import { LimiteError } from '../componentes/Marco';
import { pesos, resumirRegistro, tasaVigenteDe } from '../calculos';
import { selLocalesConfig, selParametros, selTasas, selUsuarios } from '../selectores';
import { SECCIONES, TEXTOS, type SeccionId } from '../textos';

export default function Configuracion() {
  return (
    <>
      <EncabezadoPagina migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Configuración' }]} titulo={TEXTOS.hub.titulo} subtitulo={TEXTOS.hub.subtitulo} />
      <LimiteError>
        <Cuerpo />
      </LimiteError>
    </>
  );
}

function Cuerpo() {
  const marca = useMarca();
  const hoy = useHoy();
  const tasas = useSel(selTasas);
  const params = useSel(selParametros);
  const locales = useSel(selLocalesConfig);
  const usuarios = useSel(selUsuarios);
  const registro = useDatos((s) => s.registro);
  const cambios = resumirRegistro(registro).total;
  const usd = tasaVigenteDe(tasas, 'USD', hoy);
  const vendedores = locales.filter((l) => l.local.vende).length;
  const bodegas = locales.length - vendedores;

  const estado: Record<SeccionId, ReactNode> = {
    empresa: marca.esEjemplo ? (
      <Badge tono="accent" tamano="sm">
        Marca de ejemplo · {marca.nombre}
      </Badge>
    ) : (
      <Badge tono="success" tamano="sm">
        Tu marca · {marca.nombre}
      </Badge>
    ),
    locales: `${plural(vendedores, 'local', 'locales')} para vender${bodegas > 0 ? ` y ${bodegas === 1 ? 'la bodega' : plural(bodegas, 'bodega')}` : ''}`,
    monedas: usd ? `${MONEDAS.USD.simbolo} 1 = ${pesos(usd.valor)}${usd.fuente === 'ejemplo' ? ' · tasa de ejemplo' : ''}` : 'Sin tasa registrada',
    nomina: `Salario mínimo ${pesos(params.nomina.smmlv)}`,
    impuestos: `IVA del ${porcentaje(params.impuestos.ivaGeneral, 0)}`,
    aduanas: `Arancel del ${porcentaje(params.aduanas.arancelPct, 0)} · IVA del ${porcentaje(params.aduanas.ivaImportacionPct, 0)}`,
    usuarios: `${plural(usuarios.length, 'usuario')} · 3 roles`,
    datos: cambios === 0 ? 'Demo original, sin cambios' : `${cambios === 1 ? '1 cambio tuyo' : `${plural(cambios, 'cambio')} tuyos`}`,
  };

  return (
    <div className="mt-8 flex flex-col gap-8" data-testid="config-hub">
      <section className="border border-line border-l-2 border-l-accent bg-surface px-6 py-5" aria-label={TEXTOS.hub.plantillaTitulo}>
        <h2 className="t-h3 text-ink">{TEXTOS.hub.plantillaTitulo}</h2>
        <p className="mt-1.5 max-w-[72ch] t-body text-ink-2">{TEXTOS.hub.plantillaTexto}</p>
      </section>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 wide:grid-cols-4">
        {SECCIONES.map((s) => (
          <li key={s.id}>
            <Card a={s.a} className="h-full" data-testid={`config-tarjeta-${s.id}`}>
              <Icono icono={s.icono} tamano={24} className="text-ink" />
              <h3 className="mt-4 t-h3 text-ink">{s.titulo}</h3>
              <p className="mt-1.5 t-small text-muted">{s.descripcion}</p>
              <div className="mt-4 border-t border-line-soft pt-3 t-small font-semibold text-ink-2">{estado[s.id]}</div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
