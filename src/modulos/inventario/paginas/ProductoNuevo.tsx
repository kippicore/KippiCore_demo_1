import { useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { EncabezadoPagina } from '@/ui';
import { FormularioProducto } from '../componentes/FormularioProducto';
import { SUBTITULOS } from '../textos';

export default function ProductoNuevo() {
  const navegar = useNavigate();
  return (
    <div className="pb-16">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: 'Nuevo producto' }]}
        titulo="Nuevo producto"
        subtitulo={SUBTITULOS.nuevo}
      />
      <div className="mt-8">
        <FormularioProducto alGuardar={(referencia) => navegar(rutas.producto(referencia))} alCancelar={() => navegar(rutas.inventario())} />
      </div>
    </div>
  );
}
