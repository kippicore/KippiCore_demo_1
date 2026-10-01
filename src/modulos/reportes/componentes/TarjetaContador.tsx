import { BookOpenCheck, Eye, FileSpreadsheet } from 'lucide-react';
import { BotonExportar, Button, Card, Icono, NotaLegal, Pista } from '@/ui';
import type { FiltrosReporte } from '@/reportes';
import { HOJAS_CONTADOR, TEXTOS, TEXTOS_REPORTE } from '../textos';

interface Props {
  /** "Este mes · Todos los locales · Cifras en COP". */
  resumenFiltros: string;
  filtros: FiltrosReporte;
  /** ¿Su vista previa es la que está abierta abajo? */
  abierta: boolean;
  alVerQueTrae: () => void;
}

/**
 * La tarjeta destacada del centro de reportes: "Exportar para tu contador" (pista `reportes.contador`). Un clic
 * descarga el Excel con ventas, compras e importaciones, gastos, nómina e IVA del periodo y local elegidos.
 */
export function TarjetaContador({ resumenFiltros, filtros, abierta, alVerQueTrae }: Props) {
  return (
    <Pista id="reportes.contador" alinear="fin">
      {/* Cuando su vista previa está abierta, el atributo `data-reporte` lo lleva el panel (uno solo por reporte). */}
      <div data-reporte={abierta ? undefined : 'contador'} data-testid="reportes-contador">
        <Card destacada padding="ninguno" className="p-6 desk:p-8">
          <div className="flex flex-col gap-6 desk:flex-row desk:items-center desk:justify-between desk:gap-10">
            <div className="min-w-0 max-w-[62ch]">
              <p className="flex items-center gap-2 t-eyebrow text-inverse">
                <Icono icono={BookOpenCheck} tamano={16} />
                {TEXTOS.contador.eyebrow}
              </p>
              <h2 className="mt-3 t-h2">{TEXTOS.contador.titulo}</h2>
              <p className="mt-2 t-body text-inverse/80">{TEXTOS_REPORTE.contador.sencillo} Es lo que tu contador te pide al cerrar el mes.</p>
              <p className="mt-4 t-small text-inverse/80">{TEXTOS.contador.hojas}</p>
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Hojas del Excel del contador">
                {HOJAS_CONTADOR.map((h) => (
                  <li key={h} className="border border-inverse/30 px-2.5 py-1 t-label text-inverse">
                    {h}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 flex-col gap-3 desk:w-[340px]">
              <p className="t-small text-inverse/80" data-testid="reportes-contador-periodo">
                {resumenFiltros}
              </p>
              <BotonExportar reporte="contador" filtros={filtros} formatos={['excel']} variante="inverse" tamano="md" etiqueta={() => TEXTOS.contador.boton} />
              <Button variante="ghost" tamano="sm" icono={abierta ? FileSpreadsheet : Eye} onClick={alVerQueTrae} className="self-start text-inverse hover:bg-white/12 hover:text-inverse" data-testid="reportes-contador-ver">
                {TEXTOS.contador.verQueTrae}
              </Button>
            </div>
          </div>
          <NotaLegal tipo="tributario" className="mt-6 text-inverse/80" />
        </Card>
      </div>
    </Pista>
  );
}
