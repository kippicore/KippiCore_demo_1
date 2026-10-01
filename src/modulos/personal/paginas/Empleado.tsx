import { useState } from 'react';
import { Navigate } from 'react-router';
import { Pencil, ScrollText, UserMinus, Users } from 'lucide-react';
import { BotonAccionesFila, BotonEnlace, Button, Card, Dinero, EmptyState, EncabezadoPagina, FranjaResumen, ItemMenu, Menu, PestanasEnlace, SeparadorMenu } from '@/ui';
import { PESTANAS_EMPLEADO, rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useAhora, useHoy, useSel } from '@/estado';
import { nombreEmpleado, selComisiones } from '@/selectores';
import { antiguedad } from '../calculos';
import { AvisoRiesgoFicha } from '../componentes/AlertasRiesgo';
import { DialogoContrato, DialogoEditarEmpleado, DialogoRetiro } from '../componentes/DialogosEmpleado';
import { InsigniasPersona, LimiteError } from '../componentes/Piezas';
import { PanelCosto } from '../componentes/PanelCosto';
import { PestanaComisiones, PestanaContrato, PestanaDatos, PestanaDesprendibles } from '../componentes/PestanasFicha';
import { selCostoFicha, selExposicionContratistas, selFichaEmpleado, selParametrosNomina, type FichaEmpleado } from '../selectores';
import { ETIQUETA_CARGO, TEXTOS } from '../textos';

type Pestana = (typeof PESTANAS_EMPLEADO)[number];

/** Ficha de una persona (PRD 7.9): datos, contrato, costo para el negocio (W6), comisiones y desprendibles. */
export default function Empleado() {
  const { slug, pestana } = useParamsRuta('empleadoPestana');
  const hoy = useHoy();
  const ficha = useSel(selFichaEmpleado, { slug, hoy });

  if (!ficha) {
    return (
      <div className="pb-16" data-testid="personal-ficha-no-encontrada">
        <EncabezadoPagina migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Personal y nómina', a: rutas.personal() }, { texto: 'Persona' }]} titulo="Persona" />
        <Card className="mt-8" padding="ninguno">
          <EmptyState
            icono={Users}
            titulo={TEXTOS.ficha.noEncontradoTitulo}
            texto={TEXTOS.ficha.noEncontradoTexto}
            accion={<BotonEnlace to={rutas.personal()}>Ir al equipo</BotonEnlace>}
          />
        </Card>
      </div>
    );
  }
  if (pestana !== '' && !(PESTANAS_EMPLEADO as readonly string[]).includes(pestana)) return <Navigate to={rutas.empleado(slug)} replace />;
  return <Ficha ficha={ficha} pestana={(pestana || 'datos') as Pestana} />;
}

function Ficha({ ficha, pestana }: { ficha: FichaEmpleado; pestana: Pestana }) {
  const hoy = useHoy();
  const ahora = useAhora();
  const parametros = useSel(selParametrosNomina);
  const exposicion = useSel(selExposicionContratistas, { hoy, exoneracion: true });
  const costo = useSel(selCostoFicha, { empleadoId: ficha.empleado.id, modo: 'pactado', exoneracion: true, hoy, ahora }).costo;
  const comision = useSel(selComisiones, { mes: hoy.slice(0, 7), hoy, empleadoId: ficha.empleado.id })[0];
  const [editando, setEditando] = useState(false);
  const [contratando, setContratando] = useState(false);
  const [retirando, setRetirando] = useState(false);

  const e = ficha.empleado;
  const nombre = nombreEmpleado(e);
  const miRiesgo = exposicion.filas.find((f) => f.riesgo.empleadoId === e.id) ?? null;

  return (
    <div className="pb-16" data-testid="personal-ficha" data-empleado={e.id} data-slug={e.slug}>
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Personal y nómina', a: rutas.personal() }, { texto: nombre }]}
        titulo={nombre}
        insignia={<InsigniasPersona tipo={ficha.contrato?.tipo ?? null} riesgo={!!ficha.riesgo} retirado={ficha.retirado} tamano="md" />}
        subtitulo={`${ETIQUETA_CARGO[e.cargo]} · ${ficha.localNombre} · ${antiguedad(e.fechaIngreso, ficha.retirado && e.fechaRetiro ? e.fechaRetiro : hoy)} en el equipo`}
        acciones={
          ficha.retirado ? undefined : (
            <>
              <Menu disparador={<BotonAccionesFila aria-label={`Más acciones de ${nombre}`} />} alinear="end">
                <ItemMenu icono={ScrollText} onSelect={() => setContratando(true)}>
                  Nuevo contrato
                </ItemMenu>
                <SeparadorMenu />
                <ItemMenu icono={UserMinus} peligro onSelect={() => setRetirando(true)} data-testid="personal-retirar">
                  Retirar del equipo
                </ItemMenu>
              </Menu>
              <Button variante="secondary" icono={Pencil} onClick={() => setEditando(true)} data-testid="personal-editar">
                Editar datos
              </Button>
            </>
          )
        }
        pestanas={
          <PestanasEnlace
            etiqueta={`Secciones de la ficha de ${nombre}`}
            pestanas={[
              { a: rutas.empleado(e.slug), etiqueta: 'Datos', fin: true },
              { a: rutas.empleadoPestana(e.slug, 'contrato'), etiqueta: 'Contrato' },
              { a: rutas.empleadoPestana(e.slug, 'costo'), etiqueta: 'Costo para el negocio' },
              { a: rutas.empleadoPestana(e.slug, 'comisiones'), etiqueta: 'Comisiones' },
              { a: rutas.empleadoPestana(e.slug, 'desprendibles'), etiqueta: 'Desprendibles' },
            ]}
          />
        }
      />

      {ficha.retirado && (
        <p className="mt-6 border border-line bg-surface-2 px-4 py-3 t-body text-ink-2" data-testid="personal-ficha-retirada">
          {TEXTOS.ficha.retiradoAviso}
        </p>
      )}

      {!ficha.retirado && costo && pestana !== 'costo' && (
        <FranjaResumen
          className="mt-8"
          cifras={[
            { etiqueta: 'Le cuesta al negocio', valor: <Dinero valor={costo.costo} /> },
            { etiqueta: 'Recibe en su pago', valor: <Dinero valor={costo.neto} /> },
            ...(comision?.esquema ? [{ etiqueta: 'Comisión de este mes', valor: <Dinero valor={comision.comision.total} /> }] : []),
            { etiqueta: 'Lo que dice el contrato', valor: <Dinero valor={ficha.contrato?.tipo === 'laboral' ? (ficha.contrato.salarioBase ?? 0) : (ficha.contrato?.honorarios ?? 0)} /> },
          ]}
        />
      )}

      {miRiesgo && !ficha.retirado && (
        <div className="mt-8">
          <AvisoRiesgoFicha
            fila={miRiesgo}
            parametros={parametros}
            enlace={pestana === 'costo' ? { a: rutas.comparativoModalidades(), texto: 'Abrir el comparativo de modalidades' } : { a: rutas.empleadoPestana(e.slug, 'costo'), texto: 'Ver su costo como contrato laboral' }}
          />
        </div>
      )}

      <LimiteError>
        {pestana === 'datos' && <PestanaDatos ficha={ficha} />}
        {pestana === 'contrato' && <PestanaContrato ficha={ficha} alReemplazar={() => setContratando(true)} />}
        {pestana === 'costo' && <PanelCosto empleado={e} contrato={ficha.contrato} esquema={ficha.esquema} retirado={ficha.retirado} />}
        {pestana === 'comisiones' && <PestanaComisiones ficha={ficha} />}
        {pestana === 'desprendibles' && <PestanaDesprendibles ficha={ficha} />}
      </LimiteError>

      {editando && <DialogoEditarEmpleado empleado={e} alCerrar={() => setEditando(false)} />}
      {contratando && ficha.contrato && <DialogoContrato empleado={e} vigente={ficha.contrato} alCerrar={() => setContratando(false)} />}
      {retirando && <DialogoRetiro empleado={e} alCerrar={() => setRetirando(false)} />}
    </div>
  );
}
