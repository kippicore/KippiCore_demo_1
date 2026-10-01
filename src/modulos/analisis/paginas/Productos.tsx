import { useState } from 'react';
import { useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import type { Categoria } from '@/dominio/tipos';
import { Segmentado } from '@/ui';
import { EncabezadoAnalisis } from '../componentes/EncabezadoAnalisis';
import { LimiteErrores } from '../componentes/Piezas';
import { VistaRotacion } from '../componentes/VistaRotacion';
import { VistaColores, VistaTallas } from '../componentes/VistaTallasColores';
import { VistaVendidos } from '../componentes/VistaVendidos';
import type { IdPeriodo } from '../textos';

type VistaProductos = 'vendidos' | 'tallas' | 'colores' | 'rotacion';

/**
 * Análisis · Productos, tallas y colores (PRD 7.12): más y menos vendidos, tallas y colores que rotan (con
 * "Sugerir pedido" hacia la fábrica), rotación de inventario y mercancía dormida. `?vista=` elige la sección y
 * `?resaltar=` marca una prenda (referencia o id) o una categoría.
 */
export default function Productos() {
  const { vista, resaltar } = useParamsRuta('analisisProductos');
  const navegar = useNavigate();
  const actual: VistaProductos = vista ?? 'vendidos';
  // La categoría y el período de tallas y colores se conservan al pasar de una a otra.
  const [categoria, setCategoria] = useState<Categoria>('camisas');
  const [periodo, setPeriodo] = useState<IdPeriodo>('6m');
  const ir = (v: VistaProductos) => navegar(rutas.analisisProductos({ vista: v }), { replace: true });
  const tc = { categoria, periodo, alCambiarCategoria: setCategoria, alCambiarPeriodo: setPeriodo, resaltar };
  return (
    <>
      <EncabezadoAnalisis
        titulo="Productos, tallas y colores"
        subtitulo="Qué se vende y qué no, qué talla se agota y qué mercancía se quedó dormida."
        migaActual="Productos"
        acciones={
          <Segmentado
            etiqueta="Qué quieres revisar"
            valor={actual}
            alCambiar={ir}
            data-testid="productos-vista"
            opciones={[
              { valor: 'vendidos', etiqueta: 'Más y menos vendidos', 'data-testid': 'vista-vendidos-boton' },
              { valor: 'tallas', etiqueta: 'Tallas', 'data-testid': 'vista-tallas-boton' },
              { valor: 'colores', etiqueta: 'Colores', 'data-testid': 'vista-colores-boton' },
              { valor: 'rotacion', etiqueta: 'Rotación e inventario', 'data-testid': 'vista-rotacion-boton' },
            ]}
          />
        }
      />
      <div className="mt-8">
        <LimiteErrores titulo="No pudimos armar esta sección">
          {actual === 'vendidos' && <VistaVendidos resaltar={resaltar} />}
          {actual === 'tallas' && <VistaTallas {...tc} />}
          {actual === 'colores' && <VistaColores {...tc} />}
          {actual === 'rotacion' && <VistaRotacion resaltar={resaltar} />}
        </LimiteErrores>
      </div>
    </>
  );
}
