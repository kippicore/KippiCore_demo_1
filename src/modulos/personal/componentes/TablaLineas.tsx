import { Users } from 'lucide-react';
import { Badge, Dinero, EmptyState, Table, type ColumnaTabla } from '@/ui';
import { BotonDocumentoPdf } from '@/ui/conectados/BotonDocumentoPdf';
import type { Id, LiquidacionNomina } from '@/dominio/tipos';
import type { LineaConPersona } from '../selectores';
import { TEXTOS } from '../textos';
import { InsigniasPersona, SinPropagar } from './Piezas';

/**
 * Líneas de una liquidación o de su vista previa (PRD 7.9): por persona, lo que gana, lo que se le descuenta, lo que
 * recibe, lo que aporta el negocio, lo que debe provisionar y el costo total. Las cifras son las de la liquidación.
 */
export const devengadoDe = (l: LineaConPersona['linea']) => l.laboral?.totalDevengado ?? l.prestacion?.totalBruto ?? 0;
export const deduccionesDe = (l: LineaConPersona['linea']) => l.laboral?.totalDeducciones ?? l.prestacion?.retencionFuente ?? 0;
export const aportesDe = (l: LineaConPersona['linea']) => l.laboral?.totalAportes ?? 0;
export const provisionesDe = (l: LineaConPersona['linea']) => l.laboral?.totalProvisiones ?? 0;
/** Contratista sin la planilla de seguridad social verificada: su pago queda pendiente de soporte. */
export const pilaPendiente = (l: LineaConPersona['linea']) => !!l.prestacion && !l.prestacion.pilaVerificada;

export function TablaLineas({
  lineas,
  totales,
  alAbrir,
  conPdf,
  etiqueta = 'Personas de la nómina',
  resaltada,
}: {
  lineas: readonly LineaConPersona[];
  totales: LiquidacionNomina['totales'] | null;
  alAbrir: (l: LineaConPersona) => void;
  /** Con el id de la liquidación aprobada se agrega la columna del desprendible en PDF. */
  conPdf?: Id;
  etiqueta?: string;
  resaltada?: (l: LineaConPersona) => boolean;
}) {
  const columnas: ColumnaTabla<LineaConPersona>[] = [
    {
      id: 'persona',
      encabezado: 'Persona',
      ancho: conPdf ? '21%' : '24%',
      celda: (l) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="block truncate t-body font-semibold text-ink">{l.nombre}</span>
          <span className="flex flex-wrap items-center gap-2">
            <InsigniasPersona tipo={l.linea.tipo} />
            <span className="truncate t-small text-muted">{l.localNombre}</span>
            {pilaPendiente(l.linea) && (
              <Badge tono="warning" tamano="sm">
                {TEXTOS.nomina.pilaPendiente}
              </Badge>
            )}
          </span>
        </span>
      ),
      ordenar: (l) => l.nombre,
    },
    { id: 'devengado', encabezado: 'Devengado', numerica: true, alinear: 'der', celda: (l) => <Dinero valor={devengadoDe(l.linea)} />, ordenar: (l) => devengadoDe(l.linea) },
    { id: 'deducciones', encabezado: 'Descuentos', numerica: true, alinear: 'der', celda: (l) => <Dinero valor={deduccionesDe(l.linea)} />, ordenar: (l) => deduccionesDe(l.linea) },
    { id: 'neto', encabezado: 'Neto', numerica: true, alinear: 'der', celda: (l) => <Dinero valor={l.linea.netoAPagar} className="font-semibold" />, ordenar: (l) => l.linea.netoAPagar },
    { id: 'aportes', encabezado: 'Aportes', numerica: true, alinear: 'der', celda: (l) => <Dinero valor={aportesDe(l.linea)} />, ordenar: (l) => aportesDe(l.linea) },
    { id: 'provisiones', encabezado: 'Provisiones', numerica: true, alinear: 'der', celda: (l) => <Dinero valor={provisionesDe(l.linea)} />, ordenar: (l) => provisionesDe(l.linea) },
    { id: 'costo', encabezado: 'Costo total', numerica: true, alinear: 'der', celda: (l) => <Dinero valor={l.linea.costoEmpleador} className="font-bold text-ink" />, ordenar: (l) => l.linea.costoEmpleador },
    ...(conPdf
      ? [
          {
            id: 'pdf',
            encabezado: 'PDF',
            alinear: 'der' as const,
            ancho: 96,
            celda: (l: LineaConPersona) => (
              <SinPropagar>
                <BotonDocumentoPdf documento={{ tipo: 'desprendible', liquidacionId: conPdf, empleadoId: l.linea.empleadoId }} etiqueta="PDF" />
              </SinPropagar>
            ),
          },
        ]
      : []),
  ];
  return (
    <Table
      columnas={columnas}
      filas={lineas}
      clave={(l) => l.linea.empleadoId}
      sustantivo={['persona', 'personas']}
      etiqueta={etiqueta}
      alAbrir={alAbrir}
      resaltada={resaltada}
      porPagina={25}
      data-testid="personal-tabla-lineas"
      totales={
        totales
          ? {
              devengado: <Dinero valor={totales.devengado} />,
              deducciones: <Dinero valor={totales.deducciones} />,
              neto: <Dinero valor={totales.neto} />,
              aportes: <Dinero valor={totales.aportes} />,
              provisiones: <Dinero valor={totales.provisiones} />,
              costo: <Dinero valor={totales.costo} />,
            }
          : undefined
      }
      vacio={<EmptyState tamano="tabla" icono={Users} titulo="Nadie para liquidar en este periodo" texto="No hay personas con contrato en este periodo y con esa forma de pago." />}
    />
  );
}
