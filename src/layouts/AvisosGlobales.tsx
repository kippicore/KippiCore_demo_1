import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useEntradaRemota } from '@/estado';

/**
 * Avisos globales mínimos (F2-B): el toast de una entrada remota (W3, 5.6.8) y el aviso de una guarda de rol.
 * F2-C los reemplaza por el Toast del sistema de diseño.
 */
let secuencia = 0;

export function AvisosGlobales() {
  const [avisos, setAvisos] = useState<{ id: number; texto: string }[]>([]);
  const location = useLocation();
  const agregar = (texto: string) => {
    const id = ++secuencia;
    setAvisos((a) => [...a, { id, texto }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 6000);
  };
  useEntradaRemota((r) => agregar(r.texto));
  const aviso = (location.state as { aviso?: string } | null)?.aviso;
  useEffect(() => {
    if (!aviso) return;
    // Diferido: el aviso llega con la navegación (estado de la ruta), no del render.
    const t = setTimeout(() => agregar(aviso), 0);
    return () => clearTimeout(t);
  }, [aviso, location.key]);
  return (
    <div aria-live="polite" data-testid="avisos" style={{ position: 'fixed', right: 16, bottom: 16, display: 'grid', gap: 8, zIndex: 50 }}>
      {avisos.map((a) => (
        <div key={a.id} role="status" style={{ background: '#0a0a0a', color: '#fff', padding: '10px 14px', fontSize: 14 }}>
          {a.texto}
        </div>
      ))}
    </div>
  );
}
