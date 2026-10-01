import { CircleCheck, FileSpreadsheet, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { TRAE_TU_EXCEL } from '@/config/textos/guia';
import { Button } from '../primitivos/Button';
import { Dialog } from '../primitivos/Dialog';
import { Icono } from '../primitivos/Icono';

/**
 * "Importar desde Excel" simulado (PLAN 4.6, 2.8): ÚNICO para toda la demo (inventario, clientes, proveedores,
 * gastos). Abre un modal con una zona para soltar o elegir el archivo; no lee ni sube nada: muestra el nombre y
 * explica que en la implementación KippiCore carga los archivos actuales. Nada se escribe en los datos.
 *
 *   <ImportarExcelSimulado que="tus referencias y existencias" />
 */
export function ImportarExcelSimulado({ que = 'tus datos', variante = 'secondary' }: { que?: string; variante?: 'secondary' | 'ghost' }) {
  const [abierto, setAbierto] = useState(false);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [sobre, setSobre] = useState(false);
  const entrada = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <Button variante={variante} tamano="sm" icono={Upload} onClick={() => setAbierto(true)} data-testid="importar-excel">
        {TRAE_TU_EXCEL.boton}
      </Button>
      <Dialog
        abierto={abierto}
        alCambiar={(v) => {
          setAbierto(v);
          if (!v) setArchivo(null);
        }}
        eyebrow="Importar desde Excel"
        titulo="Trae tu Excel"
        pie={
          <Button variante="primary" onClick={() => setAbierto(false)}>
            Entendido
          </Button>
        }
      >
        <p className="max-w-[60ch] t-body text-muted">
          En la implementación, KippiCore carga tus archivos actuales de Excel con {que}: tú nos los pasas y nosotros los dejamos listos.
        </p>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setSobre(true);
          }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSobre(false);
            setArchivo(e.dataTransfer.files[0]?.name ?? null);
          }}
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed p-8 text-center transition-colors ${sobre ? 'border-ink bg-surface-2' : 'border-line-strong'}`}
        >
          <Icono icono={archivo ? CircleCheck : FileSpreadsheet} tamano={28} className={archivo ? 'text-success' : 'text-subtle'} />
          {archivo ? (
            <>
              <span className="t-h3 text-ink">{archivo}</span>
              <span className="max-w-[44ch] t-small text-muted">En la demo no se lee el archivo. Con tus datos reales, lo revisamos contigo antes de cargarlo.</span>
            </>
          ) : (
            <>
              <span className="t-h3 text-ink">Suelta aquí tu archivo .xlsx o .csv</span>
              <span className="t-small text-muted">o haz clic para elegirlo</span>
            </>
          )}
          <input ref={entrada} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => setArchivo(e.target.files?.[0]?.name ?? null)} />
        </label>
      </Dialog>
    </>
  );
}
