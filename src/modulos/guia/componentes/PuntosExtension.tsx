/**
 * Puntos de extensión de la guía (PLAN 9.1.6) con implementación mínima. E2 los reemplaza (panel "Prueba esto"
 * flotante y menú "?" de 2.6). El layout los importa desde publico.ts: E2 solo cambia este archivo.
 */
export function GuiaFlotante() {
  return null;
}

export function MenuAyuda() {
  return (
    <button type="button" aria-label="Ayuda" title="Ayuda">
      ?
    </button>
  );
}
