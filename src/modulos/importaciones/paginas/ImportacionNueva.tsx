import { useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { avisar, EncabezadoPagina } from '@/ui';
import { FormularioPedido } from '../componentes/FormularioPedido';

/** Nuevo pedido a China: fábrica y carga, prendas por talla y color, y la cadena que lo sigue. */
export default function ImportacionNueva() {
  const navegar = useNavigate();
  return (
    <div className="pb-16">
      <EncabezadoPagina
        migas={[
          { texto: 'Inicio', a: rutas.inicio() },
          { texto: 'Importaciones', a: rutas.importaciones() },
          { texto: 'Nuevo pedido' },
        ]}
        titulo="Nuevo pedido"
        subtitulo="Arma el pedido a la fábrica: queda en Cotizado y desde ahí lo sigues hasta la bodega."
      />
      <div className="mt-8 max-w-[960px] border border-line bg-surface p-6">
        <FormularioPedido
          alCancelar={() => navegar(rutas.importaciones())}
          alTerminar={(numero) => {
            avisar({ tipo: 'exito', texto: `Pedido ${numero} creado en Cotizado` });
            navegar(rutas.importacion(numero, { resaltar: 'cambiar-estado' }));
          }}
        />
      </div>
    </div>
  );
}
