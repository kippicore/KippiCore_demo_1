import { useMemo, useState } from 'react';
import { CircleCheck, Info, RotateCcw, TriangleAlert } from 'lucide-react';
import { BarraProgreso, Button, ConfirmarEliminacion, EmptyState, Fecha, FranjaResumen, Icono, Pista, Table, avisar, type ColumnaTabla } from '@/ui';
import { DEMO } from '@/config/demo';
import { useDatos, useHoy } from '@/estado';
import { entero, plural } from '@/lib/formato';
import { diasDeAntiguedad, resumirRegistro, sugerirDatosFrescos, tamanoLegible } from '../calculos';
import { MarcoConfiguracion } from '../componentes/Marco';
import { TEXTOS } from '../textos';

interface FilaCambio {
  categoria: string;
  cantidad: number;
}

export default function Datos() {
  const hoy = useHoy();
  const registro = useDatos((s) => s.registro);
  const modo = useDatos((s) => s.modo);
  const ancla = useDatos((s) => s.ancla);
  const fijadaEn = useDatos((s) => s.fijadaEn);
  const avisos = useDatos((s) => s.avisos);
  const reconstruyendo = useDatos((s) => s.reconstruyendo);
  const restaurar = useDatos((s) => s.restaurar);
  const [confirmando, setConfirmando] = useState(false);

  const resumen = useMemo(() => resumirRegistro(registro), [registro]);
  const bytes = useMemo(() => (registro.length === 0 ? 0 : JSON.stringify(registro).length), [registro]);
  const antiguedad = diasDeAntiguedad(ancla, hoy);
  const frescos = sugerirDatosFrescos(resumen.total, antiguedad);
  const intactos = resumen.total === 0;
  const uso = Math.min(1, bytes / DEMO.limiteRegistroBytes);

  const alRestaurar = () => {
    void restaurar().then(() => avisar({ tipo: 'exito', texto: TEXTOS.datos.restaurarListo, detalle: 'Estás de nuevo en el punto de partida.' }));
  };

  const columnas: ColumnaTabla<FilaCambio>[] = [
    { id: 'area', encabezado: 'Área', ordenar: (f) => f.categoria, celda: (f) => <span className="font-semibold">{f.categoria}</span> },
    { id: 'cantidad', encabezado: 'Cambios', numerica: true, alinear: 'der', ordenar: (f) => f.cantidad, celda: (f) => entero(f.cantidad) },
  ];

  return (
    <MarcoConfiguracion seccion="datos" titulo="Datos de la demo" subtitulo={TEXTOS.datos.subtitulo}>
      <div className="flex flex-col gap-6">
        {frescos && (
          <section className="flex flex-wrap items-center justify-between gap-4 border border-line border-l-2 border-l-accent bg-surface px-6 py-4" data-testid="datos-datos-frescos">
            <p className="max-w-[64ch] t-body text-ink">
              <strong className="font-bold">Estos datos tienen {plural(antiguedad, 'día')}.</strong> Si restauras la demo, las cifras vuelven a estar al día con la fecha de hoy. Perderías los cambios que hiciste.
            </p>
            <Button variante="secondary" icono={RotateCcw} onClick={() => setConfirmando(true)}>
              Traer datos de hoy
            </Button>
          </section>
        )}

        {avisos.length > 0 && (
          <section className="border border-line border-l-2 border-l-warning bg-surface px-6 py-4" data-testid="datos-avisos">
            <p className="flex items-center gap-2 t-label text-ink">
              <Icono icono={TriangleAlert} tamano={16} className="text-warning" />
              Algunos cambios no se pudieron conservar
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 t-small text-ink-2">
              {avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        )}

        <FranjaResumen
          cifras={[
            { etiqueta: 'Cambios que hiciste', valor: <span data-testid="datos-cambios">{entero(resumen.total)}</span> },
            { etiqueta: 'Espacio que ocupan', valor: tamanoLegible(bytes) },
            { etiqueta: 'Datos de ejemplo hasta', valor: ancla ? <Fecha valor={ancla} /> : '—' },
            { etiqueta: 'Tu primera visita', valor: fijadaEn ? <Fecha valor={fijadaEn} /> : '—' },
          ]}
        />

        <section className="border border-line bg-surface p-6" aria-label="Dónde se guardan tus cambios" data-testid="datos-almacenamiento">
          <h2 className="t-h3 text-ink">Dónde se guardan tus cambios</h2>
          <p className="mt-1.5 flex items-start gap-1.5 max-w-[72ch] t-small text-muted">
            <Icono icono={Info} tamano={14} className="mt-0.5" />
            <span data-testid="datos-modo">
              {modo === 'local'
                ? 'En este navegador. Siguen aquí cuando vuelvas, pero no pasan a otros computadores ni al celular, salvo que escanees el código de la app.'
                : 'Tu navegador no deja guardar datos: tus cambios se conservan solo mientras esta pestaña esté abierta.'}
            </span>
          </p>
          <div className="mt-4 max-w-md">
            <div className="flex items-baseline justify-between t-small text-ink-2">
              <span>
                {tamanoLegible(bytes)} de {tamanoLegible(DEMO.limiteRegistroBytes)}
              </span>
              <span className="num">{Math.round(uso * 100)} %</span>
            </div>
            <BarraProgreso valor={uso} className="mt-1.5" aria-label="Espacio usado por tus cambios" />
          </div>
        </section>

        <section aria-label="Lo que has cambiado" data-testid="datos-resumen">
          <h2 className="mb-3 t-h3 text-ink">Lo que has cambiado</h2>
          {intactos ? (
            <div data-testid="datos-estado-inicial">
              <EmptyState
                tamano="pagina"
                icono={CircleCheck}
                titulo="Estás viendo la demo tal como la dejamos"
                texto="Todavía no has registrado ni cambiado nada. Cuando lo hagas, aquí verás el resumen y podrás volver a este punto."
              />
            </div>
          ) : (
            <Table columnas={columnas} filas={resumen.porCategoria} clave={(f) => f.categoria} sustantivo={['área', 'áreas']} data-testid="datos-tabla-cambios" />
          )}
        </section>

        <section className="border border-ink bg-surface p-6" aria-label="Volver al punto de partida" data-testid="datos-restaurar">
          <h2 className="t-h3 text-ink">{TEXTOS.hub.restaurarTitulo}</h2>
          <p className="mt-1.5 max-w-[72ch] t-body text-muted">{TEXTOS.hub.restaurarTexto}</p>
          <p className="mt-2 max-w-[72ch] t-small text-muted">{TEXTOS.datos.restaurarNota}</p>
          <div className="mt-5">
            <Pista id="configuracion.restaurar" alinear="inicio" className="inline-block">
              <Button variante="destructive" icono={RotateCcw} onClick={() => setConfirmando(true)} cargando={reconstruyendo} data-testid="datos-restaurar-boton">
                {TEXTOS.datos.restaurar}
              </Button>
            </Pista>
          </div>
        </section>
      </div>

      <ConfirmarEliminacion
        abierto={confirmando}
        alCambiar={setConfirmando}
        pregunta={TEXTOS.datos.restaurarPregunta}
        consecuencias={
          intactos
            ? 'Todavía no has cambiado nada, así que no se borra nada. La demo se vuelve a armar con la fecha de hoy.'
            : `${TEXTOS.datos.restaurarConsecuencias} Hoy hay ${plural(resumen.total, 'cambio')} tuyos.`
        }
        nota={TEXTOS.datos.restaurarNota}
        palabraClave="RESTAURAR"
        accion={TEXTOS.datos.restaurar}
        alConfirmar={alRestaurar}
      />
    </MarcoConfiguracion>
  );
}
