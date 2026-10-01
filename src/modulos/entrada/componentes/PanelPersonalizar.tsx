import { useEffect, useRef, useState } from 'react';
import { ENTRADA } from '@/config/textos/guia';
import { emitirUI, useMarca, useSesion } from '@/estado';
import { Button } from '@/ui/primitivos/Button';
import { Input } from '@/ui/primitivos/Input';
import { avisar } from '@/ui/primitivos/Toast';
import { TEXTOS_ENTRADA } from '../textos';

/**
 * "Personalizar con el nombre de mi negocio" (PLAN 2.2.1): dos campos opcionales. Mientras escribe, el wordmark de
 * la entrada muestra el nombre (vista previa); al guardar, el nombre reemplaza a la marca de ejemplo en la barra
 * lateral, la tienda, las facturas, el documento POS, los PDF y la firma de los mensajes (`useMarca`). Se guarda en
 * el store `sesion` (no en el registro de comandos: no fija el ancla) y emite `marca_personalizada`.
 */
export function PanelPersonalizar({ alVistaPrevia, alCerrar }: { alVistaPrevia: (nombre: string | null) => void; alCerrar: () => void }) {
  const marca = useMarca();
  const actual = useSesion((s) => s.marcaPersonalizada);
  const personalizar = useSesion((s) => s.personalizarMarca);
  const [negocio, setNegocio] = useState(actual.nombreNegocio ?? '');
  const [persona, setPersona] = useState(actual.nombrePersona ?? '');
  const primero = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    primero.current?.focus();
  }, []);
  useEffect(() => () => alVistaPrevia(null), [alVistaPrevia]);

  const guardar = () => {
    const nombreNegocio = negocio.trim() || null;
    const nombrePersona = persona.trim() || null;
    personalizar({ nombreNegocio, nombrePersona });
    if (nombreNegocio) {
      emitirUI('marca_personalizada');
      avisar({ tipo: 'exito', texto: TEXTOS_ENTRADA.guardado.replace('{{nombre}}', nombreNegocio) });
    }
    alCerrar();
  };
  const volver = () => {
    personalizar({ nombreNegocio: null, nombrePersona: null });
    avisar({ texto: TEXTOS_ENTRADA.restablecido });
    alCerrar();
  };

  return (
    <form
      data-testid="entrada-personalizar"
      className="mt-5 grid w-full max-w-[560px] grid-cols-1 gap-4 border border-line bg-surface p-5 animate-fade-in sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <Input
        ref={primero}
        etiqueta={ENTRADA.campoNegocio}
        opcional
        value={negocio}
        maxLength={28}
        data-testid="entrada-campo-negocio"
        onChange={(e) => {
          setNegocio(e.target.value);
          alVistaPrevia(e.target.value.trim() || null);
        }}
      />
      <Input etiqueta={ENTRADA.campoPersona} opcional value={persona} maxLength={28} data-testid="entrada-campo-persona" onChange={(e) => setPersona(e.target.value)} />
      <p className="t-small text-muted sm:col-span-2">{TEXTOS_ENTRADA.vistaPrevia}.</p>
      <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2">
        {!marca.esEjemplo && (
          <Button variante="ghost" onClick={volver} data-testid="entrada-volver-halden">
            {ENTRADA.volverAHalden.replace('{{marcaOriginal}}', 'HALDEN')}
          </Button>
        )}
        <Button variante="secondary" onClick={alCerrar}>
          Cancelar
        </Button>
        <Button type="submit" data-testid="entrada-guardar-nombre">
          {TEXTOS_ENTRADA.guardar}
        </Button>
      </div>
    </form>
  );
}
