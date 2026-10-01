import { useState } from 'react';
import { Info, Moon, Pencil, Sun } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  Dinero,
  EmptyState,
  Icono,
  InputNumero,
  NotaLegal,
  Select,
  Table,
  Tooltip,
  avisar,
  type ColumnaTabla,
} from '@/ui';
import { useAcciones } from '@/estado';
import { hora, numero, porcentaje } from '@/lib/formato';
import { textoHoras } from '../calculos';
import type { ParametrosTurnos, RecargoDetallado, RecargosVista } from '../selectores';
import { TEXTOS } from '../textos';

/**
 * Recargos estimados de la semana (6.20.14): cuánto cuesta cerrar después de las 7 p. m. y abrir el domingo, por
 * persona, y los parámetros con los que se calcula, marcados "Verificar" y editables.
 */
export function PanelRecargos({
  recargos,
  parametros,
  localNombre,
}: {
  recargos: RecargosVista;
  parametros: ParametrosTurnos;
  localNombre: string;
}) {
  const [editando, setEditando] = useState(false);
  const verificar = (clave: string) => parametros.porVerificar.includes(clave);
  const columnas: ColumnaTabla<RecargoDetallado>[] = [
    {
      id: 'persona',
      encabezado: 'Persona',
      celda: (r) => (
        <span className="flex flex-col">
          <span className="font-bold text-ink" title={r.nombre}>
            {r.corto}
          </span>
          {r.vinculacion === 'prestacion_servicios' && (
            <span className="t-small text-muted">{TEXTOS.recargos.prestacion}</span>
          )}
        </span>
      ),
    },
    {
      id: 'nocturnas',
      encabezado: 'Horas nocturnas',
      numerica: true,
      celda: (r) => <span className="num">{textoHoras(r.horasNocturnas)}</span>,
    },
    {
      id: 'dominicales',
      encabezado: 'Horas de domingo y festivo',
      numerica: true,
      celda: (r) => <span className="num">{textoHoras(r.horasDominicalFestivo)}</span>,
    },
    {
      id: 'valorNocturno',
      encabezado: 'Cerrar tarde',
      numerica: true,
      celda: (r) => <Dinero valor={r.valorNocturno} />,
    },
    {
      id: 'valorDominical',
      encabezado: 'Abrir domingo y festivo',
      numerica: true,
      celda: (r) => <Dinero valor={r.valorDominical} />,
    },
    {
      id: 'total',
      encabezado: 'Recargo estimado',
      numerica: true,
      celda: (r) => <Dinero valor={r.valor} className="font-bold text-ink" />,
    },
  ];
  return (
    <section className="mt-10" data-testid="turnos-recargos">
      <h2 className="t-h3 text-ink">{TEXTOS.recargos.titulo}</h2>
      <p className="mt-1 max-w-[70ch] t-small text-ink-2">{TEXTOS.recargos.explicacion}</p>
      <Table
        className="mt-4"
        etiqueta={`Recargos estimados de la semana en ${localNombre}`}
        columnas={columnas}
        filas={recargos.empleados}
        clave={(r) => r.empleadoId}
        sustantivo={['persona', 'personas']}
        porPagina={0}
        totales={{
          persona: <span className="font-bold text-ink">Total de la semana</span>,
          nocturnas: <span className="num">{textoHoras(recargos.horasNocturnas)}</span>,
          dominicales: <span className="num">{textoHoras(recargos.horasDominicalFestivo)}</span>,
          valorNocturno: <Dinero valor={recargos.valorNocturno} />,
          valorDominical: <Dinero valor={recargos.valorDominical} />,
          total: <Dinero valor={recargos.total} className="font-bold text-ink" />,
        }}
        vacio={
          <EmptyState
            tamano="tabla"
            icono={Moon}
            titulo="Sin turnos esta semana"
            texto="Programa turnos en la cuadrícula y aquí verás cuánto cuestan los cierres y los domingos."
          />
        }
        data-testid="turnos-recargos-tabla"
      />

      <div
        className="mt-4 border border-line bg-surface p-5"
        aria-label="Parámetros del recargo"
        data-testid="turnos-parametros"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="t-label text-ink">{TEXTOS.recargos.parametros}</h3>
          <Button
            variante="secondary"
            tamano="sm"
            icono={Pencil}
            onClick={() => setEditando(true)}
            data-testid="turnos-editar-parametros"
          >
            Editar parámetros
          </Button>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-3">
          <Parametro
            icono={Moon}
            etiqueta="Recargo nocturno"
            valor={porcentaje(parametros.recargos.nocturno, 0)}
            detalle={`Horas desde las ${hora(parametros.jornadaNocturna.inicio)}`}
            verificar={verificar('recargos')}
          />
          <Parametro
            icono={Sun}
            etiqueta="Domingo y festivo"
            valor={porcentaje(parametros.recargos.dominicalFestivo, 0)}
            detalle="Por cada hora trabajada ese día"
            verificar={verificar('recargos')}
          />
          <Parametro
            icono={Info}
            etiqueta="Jornada máxima semanal"
            valor={`${numero(parametros.jornadaMaximaHoras)} h`}
            detalle="Horas netas, sin el descanso"
            verificar={verificar('jornadaMaximaSemanal')}
          />
        </dl>
        <p className="mt-4 border-t border-line-soft pt-3 t-small text-muted">
          {TEXTOS.recargos.verificarAyuda}
        </p>
      </div>
      <div className="mt-3">
        <NotaLegal tipo="nomina" />
      </div>

      {editando && <DialogoParametros parametros={parametros} alCerrar={() => setEditando(false)} />}
    </section>
  );
}

function Parametro({
  icono,
  etiqueta,
  valor,
  detalle,
  verificar,
}: {
  icono: typeof Moon;
  etiqueta: string;
  valor: string;
  detalle: string;
  verificar: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icono icono={icono} tamano={16} className="mt-1 text-ink-2" />
      <div className="min-w-0 flex-1">
        <dt className="t-small text-ink-2">{etiqueta}</dt>
        <dd className="flex items-baseline gap-2">
          <span className="t-h3 num text-ink">{valor}</span>
          {verificar && (
            <Tooltip texto={TEXTOS.recargos.verificarAyuda}>
              <span>
                <Badge tono="warning" tamano="sm">
                  {TEXTOS.recargos.verificar}
                </Badge>
              </span>
            </Tooltip>
          )}
        </dd>
        <dd className="t-small text-muted">{detalle}</dd>
      </div>
    </div>
  );
}

const HORAS_NOCTURNAS = ['18:00', '19:00', '20:00', '21:00', '22:00'];

function DialogoParametros({ parametros, alCerrar }: { parametros: ParametrosTurnos; alCerrar: () => void }) {
  const acciones = useAcciones();
  const [nocturno, setNocturno] = useState<number | null>(Math.round(parametros.recargos.nocturno * 100));
  const [dominical, setDominical] = useState<number | null>(
    Math.round(parametros.recargos.dominicalFestivo * 100),
  );
  const [desde, setDesde] = useState<string>(parametros.jornadaNocturna.inicio);
  const [errores, setErrores] = useState<{ nocturno?: string; dominical?: string }>({});
  const hayCambios =
    nocturno !== Math.round(parametros.recargos.nocturno * 100) ||
    dominical !== Math.round(parametros.recargos.dominicalFestivo * 100) ||
    desde !== parametros.jornadaNocturna.inicio;

  const guardar = () => {
    const e: { nocturno?: string; dominical?: string } = {};
    if (nocturno === null || nocturno < 0 || nocturno > 100)
      e.nocturno = 'Escribe un porcentaje entre 0 y 100.';
    if (dominical === null || dominical < 0 || dominical > 100)
      e.dominical = 'Escribe un porcentaje entre 0 y 100.';
    setErrores(e);
    if (e.nocturno || e.dominical) return;
    const r = acciones.editarParametros({
      seccion: 'nomina',
      cambios: {
        recargos: { nocturno: (nocturno as number) / 100, dominicalFestivo: (dominical as number) / 100 },
        jornadaNocturna: { inicio: desde },
      },
    });
    if (!r.ok) {
      setErrores({ nocturno: r.error.mensaje });
      return;
    }
    avisar({
      tipo: 'exito',
      texto: 'Parámetros de recargo actualizados',
      detalle: 'Los recargos de todas las semanas se recalculan con estos valores.',
    });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Recargos"
      titulo="Parámetros del recargo"
      descripcion="Son los valores con los que se estima el recargo. Confírmalos con tu contador antes de usarlos como cálculo real."
      ancho="sm"
      confirmarAlCerrar={hayCambios}
      data-testid="turnos-dialogo-parametros"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="turnos-guardar-parametros">
            Guardar parámetros
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar();
        }}
      >
        <InputNumero
          etiqueta="Recargo nocturno"
          sufijo="%"
          valor={nocturno}
          alCambiar={setNocturno}
          error={errores.nocturno}
          ayuda="Se suma al valor de la hora trabajada en la franja nocturna."
          data-testid="turnos-param-nocturno"
        />
        <InputNumero
          etiqueta="Recargo de domingo y festivo"
          sufijo="%"
          valor={dominical}
          alCambiar={setDominical}
          error={errores.dominical}
          ayuda="Se suma al valor de cada hora trabajada ese día."
          data-testid="turnos-param-dominical"
        />
        <Select
          etiqueta="La franja nocturna empieza a las"
          valor={desde}
          alCambiar={setDesde}
          enModal
          opciones={HORAS_NOCTURNAS.map((h) => ({ valor: h, etiqueta: hora(h) }))}
          ayuda={`Termina a las ${hora(parametros.jornadaNocturna.fin)}.`}
          data-testid="turnos-param-desde"
        />
      </form>
    </Dialog>
  );
}
