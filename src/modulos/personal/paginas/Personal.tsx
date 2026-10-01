import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { FileText, Pencil, Plus, ScrollText, UserMinus, UserPlus, Users } from 'lucide-react';
import {
  BotonAccionesFila,
  BotonEnlace,
  BotonPildora,
  Dinero,
  EmptyState,
  ItemMenu,
  Kpi,
  Menu,
  Pista,
  Segmentado,
  Select,
  SeparadorMenu,
  Switch,
  Table,
  Toolbar,
  type ColumnaTabla,
} from '@/ui';
import type { Empleado, TipoVinculacion } from '@/dominio/tipos';
import { sumarMesesAMes } from '@/dominio/reglas/fechas';
import { useAhora, useDinero, useFiltroLocal, useHoy, useSel } from '@/estado';
import { cifraCorta, mesAnio, numero, plural, porcentaje } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { selCostoNominaPorLocal, selLocales, type ModoCosto } from '@/selectores';
import { AvisoRiesgoLista, PanelRiesgo } from '../componentes/AlertasRiesgo';
import { DialogoContrato, DialogoEditarEmpleado, DialogoRetiro } from '../componentes/DialogosEmpleado';
import { NominaPorLocal } from '../componentes/NominaPorLocal';
import { CeldaPersona, EncabezadoPersonal, InsigniasPersona, LimiteError, NotaNomina } from '../componentes/Piezas';
import { selExposicionContratistas, selFilasPersonal, selParametrosNomina, type FilaPersonal } from '../selectores';
import { ETIQUETA_CARGO, ETIQUETA_VINCULACION, MODOS_COSTO, TEXTOS } from '../textos';

const sinTildes = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Lista del equipo (PRD 7.9, W6): cada persona con lo que de verdad le cuesta al negocio, local por local. */
export default function Personal() {
  return (
    <div className="pb-16" data-testid="personal-lista">
      <EncabezadoPersonal
        titulo={TEXTOS.lista.titulo}
        subtitulo={TEXTOS.lista.subtitulo}
        acciones={
          <BotonEnlace to={rutas.empleadoNuevo()} icono={Plus} data-testid="personal-nuevo">
            Nuevo empleado
          </BotonEnlace>
        }
      />
      <LimiteError>
        <CuerpoLista />
      </LimiteError>
    </div>
  );
}

function CuerpoLista() {
  const { riesgo, local, resaltar } = useParamsRuta('personal');
  const navegar = useNavigate();
  const hoy = useHoy();
  const ahora = useAhora();
  const dinero = useDinero();
  const localGlobal = useFiltroLocal();
  const parametros = useSel(selParametrosNomina);
  const locales = useSel(selLocales, { incluirBodega: true });

  const [modo, setModo] = useState<ModoCosto>('pactado');
  const [exoneracion, setExoneracion] = useState(true);
  const [q, setQ] = useState('');
  const [vinculacion, setVinculacion] = useState<'todas' | TipoVinculacion>('todas');
  const [conRetirados, setConRetirados] = useState(false);
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [retirando, setRetirando] = useState<Empleado | null>(null);
  const [contratando, setContratando] = useState<FilaPersonal | null>(null);

  const filasTodas = useSel(selFilasPersonal, { hoy, ahora, modo, exoneracion, incluirRetirados: conRetirados });
  const exposicion = useSel(selExposicionContratistas, { hoy, exoneracion });
  const mesCompleto = sumarMesesAMes(hoy.slice(0, 7), -1);
  const porLocal = useSel(selCostoNominaPorLocal, { mes: mesCompleto });

  const soloRiesgo = riesgo === 'contrato-realidad';
  const idsLocales = useMemo(() => new Set(locales.map((l) => l.id)), [locales]);
  const localEfectivo = local && (local === 'todos' || idsLocales.has(local)) ? local : localGlobal;
  const nombreLocal = (id: string) => locales.find((l) => l.id === id)?.nombre ?? id;

  const filas = useMemo(() => {
    const t = sinTildes(q.trim());
    return filasTodas.filter((f) => {
      if (soloRiesgo && !f.riesgo) return false;
      if (localEfectivo !== 'todos' && f.localId !== localEfectivo) return false;
      if (vinculacion !== 'todas' && f.tipo !== vinculacion) return false;
      if (!t) return true;
      return sinTildes(`${f.nombre} ${ETIQUETA_CARGO[f.empleado.cargo]} ${f.localNombre} ${f.empleado.documento.numero}`).includes(t);
    });
  }, [filasTodas, soloRiesgo, localEfectivo, vinculacion, q]);

  const activas = filas.filter((f) => !f.retirado);
  const costoTotal = activas.reduce((a, f) => a + (f.costo ?? 0), 0);
  const valorTotal = activas.reduce((a, f) => a + f.valorBase, 0);
  const laborales = activas.filter((f) => f.tipo === 'laboral').length;
  const ventasMes = porLocal.locales.reduce((a, l) => a + (l.porcentaje !== null ? l.ventas : 0), 0);
  const sobreVentas = ventasMes > 0 ? porLocal.total / ventasMes : 0;

  const limpiar = () => {
    setQ('');
    setVinculacion('todas');
    setConRetirados(false);
  };
  const cambiarLocal = (valor: string) => navegar(rutas.personal({ riesgo: soloRiesgo ? 'contrato-realidad' : null, local: valor }), { replace: true });
  const quitarRiesgo = () => navegar(rutas.personal({ local: local ?? null }), { replace: true });

  const columnas: ColumnaTabla<FilaPersonal>[] = [
    {
      id: 'persona',
      encabezado: 'Persona',
      ancho: '25%',
      celda: (f) => <CeldaPersona empleado={f.empleado} nombre={f.nombre} />,
      ordenar: (f) => f.nombre,
    },
    { id: 'local', encabezado: 'Local', truncar: true, ancho: '15%', celda: (f) => f.localNombre, ordenar: (f) => f.localNombre },
    {
      id: 'vinculacion',
      encabezado: 'Vinculación',
      ancho: '24%',
      celda: (f) => <InsigniasPersona tipo={f.tipo} riesgo={!!f.riesgo} retirado={f.retirado} />,
      ordenar: (f) => f.tipo ?? '',
    },
    { id: 'valor', encabezado: 'Salario u honorarios', numerica: true, alinear: 'der', celda: (f) => <Dinero valor={f.valorBase} />, ordenar: (f) => f.valorBase },
    {
      id: 'costo',
      encabezado: (
        <Pista id="personal.costo" alinear="inicio" className="inline-block">
          Costo para el negocio
        </Pista>
      ),
      numerica: true,
      alinear: 'der',
      celda: (f) =>
        f.costo === null ? (
          <span className="text-muted">—</span>
        ) : (
          <span className="inline-flex flex-col items-end leading-tight" data-testid={`personal-costo-${f.empleado.id}`} data-costo={f.costo}>
            <Dinero valor={f.costo} className="font-bold text-ink" />
            {f.veces !== null && f.tipo === 'laboral' && <span className="t-small text-muted num">{numero(f.veces, 2)} veces el salario</span>}
          </span>
        ),
    },
  ];

  const sinEquipo = filasTodas.length === 0;

  return (
    <div className="mt-8 flex flex-col gap-10">
      {soloRiesgo ? (
        <PanelRiesgo exposicion={exposicion} parametros={parametros} alQuitar={quitarRiesgo} />
      ) : (
        <AvisoRiesgoLista exposicion={exposicion} />
      )}

      {!soloRiesgo && (
        <section aria-label="Cifras del equipo" className="grid grid-cols-2 gap-4 wide:grid-cols-4">
          <Kpi
            etiqueta="Costo mensual del equipo"
            valor={costoTotal}
            formatear={dinero.corta}
            completo={dinero(costoTotal)}
            destacada
            nota={`${plural(activas.length, 'persona')} · ${modo === 'pactado' ? 'lo pactado en los contratos, sin comisiones ni recargos' : 'con comisiones y recargos, proyectado a un mes'}`}
            data-testid="personal-kpi-costo"
          />
          <Kpi
            etiqueta="Lo que no está en los contratos"
            valor={Math.max(0, costoTotal - valorTotal)}
            formatear={dinero.corta}
            completo={dinero(Math.max(0, costoTotal - valorTotal))}
            nota={`Aportes, prestaciones y auxilios de ${plural(laborales, 'persona')}`}
          />
          <Kpi
            etiqueta="Nómina sobre ventas"
            valor={sobreVentas}
            formatear={(n) => porcentaje(n, 1)}
            completo={porcentaje(sobreVentas, 2)}
            nota={`${mesAnio(mesCompleto)}, liquidado: ${cifraCorta(porLocal.total)} de nómina sobre ${cifraCorta(ventasMes)} de ventas`}
            data-testid="personal-kpi-ventas"
          />
          <Kpi
            etiqueta="Riesgo de contrato realidad"
            valor={exposicion.filas.length}
            formatear={(n) => numero(Math.round(n))}
            nota={exposicion.filas.length > 0 ? 'Revisa quiénes son' : 'Sin señales hoy'}
            a={exposicion.filas.length > 0 ? rutas.personal({ riesgo: 'contrato-realidad' }) : undefined}
          />
        </section>
      )}

      {!soloRiesgo && !sinEquipo && <NominaPorLocal mes={mesCompleto} locales={porLocal.locales} total={porLocal.total} ventas={ventasMes} />}

      <section aria-label="Costo para el negocio" className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <p className="mb-1.5 t-label text-ink">Costo que ves en la tabla</p>
          <Segmentado
            etiqueta="Modo de cálculo del costo"
            valor={modo}
            alCambiar={setModo}
            opciones={[
              { valor: 'pactado', etiqueta: MODOS_COSTO.pactado.etiqueta, 'data-testid': 'personal-lista-modo-pactado' },
              { valor: 'mes_actual', etiqueta: MODOS_COSTO.mes_actual.etiqueta, 'data-testid': 'personal-lista-modo-mes' },
            ]}
          />
        </div>
        {parametros.exoneracion114.activa && (
          <Switch
            etiqueta="Exoneración de aportes (salud, ICBF y SENA)"
            activo={exoneracion}
            alCambiar={setExoneracion}
            valorTexto={exoneracion ? 'Exonerado' : 'No exonerado'}
          />
        )}
        <p className="max-w-[56ch] pb-1.5 t-small text-muted">{exoneracion ? TEXTOS.lista.conExoneracion : TEXTOS.lista.sinExoneracion} Valor ilustrativo · verificar.</p>
      </section>

      <section aria-label="Equipo" data-testid="personal-tabla">
        <Table
          columnas={columnas}
          filas={filas}
          clave={(f) => f.empleado.id}
          sustantivo={['persona', 'personas']}
          etiqueta="Equipo"
          alAbrir={(f) => navegar(rutas.empleado(f.empleado.slug))}
          resaltada={(f) => !!resaltar && (f.empleado.id === resaltar || f.empleado.slug === resaltar)}
          porPagina={25}
          totales={{ valor: <Dinero valor={valorTotal} />, costo: <Dinero valor={costoTotal} /> }}
          vacio={
            sinEquipo ? (
              <EmptyState
                tamano="tabla"
                icono={Users}
                titulo={TEXTOS.lista.sinEquipoTitulo}
                texto={TEXTOS.lista.sinEquipoTexto}
                accion={
                  <BotonEnlace to={rutas.empleadoNuevo()} icono={UserPlus}>
                    Nuevo empleado
                  </BotonEnlace>
                }
              />
            ) : (
              <EmptyState
                tamano="tabla"
                icono={Users}
                titulo={TEXTOS.lista.vacioTitulo}
                texto={TEXTOS.lista.vacioTexto}
                accion={
                  <BotonEnlace to={rutas.personal()} variante="secondary">
                    Ver a todo el equipo
                  </BotonEnlace>
                }
              />
            )
          }
          accionesFila={(f) => (
            <Menu etiqueta={`Acciones de ${f.nombre}`} disparador={<BotonAccionesFila aria-label={`Acciones de ${f.nombre}`} />}>
              <ItemMenu icono={FileText} onSelect={() => navegar(rutas.empleado(f.empleado.slug))}>
                Ver ficha
              </ItemMenu>
              <ItemMenu icono={ScrollText} onSelect={() => navegar(rutas.empleadoPestana(f.empleado.slug, 'costo'))}>
                Ver costo para el negocio
              </ItemMenu>
              {!f.retirado && (
                <>
                  <SeparadorMenu />
                  <ItemMenu icono={Pencil} onSelect={() => setEditando(f.empleado)}>
                    Editar datos
                  </ItemMenu>
                  {f.contrato && (
                    <ItemMenu icono={ScrollText} onSelect={() => setContratando(f)}>
                      Nuevo contrato
                    </ItemMenu>
                  )}
                  <ItemMenu icono={UserMinus} peligro onSelect={() => setRetirando(f.empleado)}>
                    Retirar
                  </ItemMenu>
                </>
              )}
            </Menu>
          )}
          barra={
            <Toolbar
              buscar={{ valor: q, alCambiar: setQ, placeholder: 'Buscar por nombre, cargo o documento' }}
              filtros={
                <>
                  <BotonPildora etiqueta="Local" valor={localEfectivo === 'todos' ? undefined : nombreLocal(localEfectivo)}>
                    <Select
                      etiqueta="Local"
                      etiquetaOculta
                      valor={localEfectivo}
                      alCambiar={cambiarLocal}
                      opciones={[{ valor: 'todos', etiqueta: 'Todos los locales' }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
                      data-testid="personal-filtro-local"
                    />
                  </BotonPildora>
                  <BotonPildora etiqueta="Vinculación" valor={vinculacion === 'todas' ? undefined : ETIQUETA_VINCULACION[vinculacion]}>
                    <Select
                      etiqueta="Vinculación"
                      etiquetaOculta
                      valor={vinculacion}
                      alCambiar={(v) => setVinculacion(v as 'todas' | TipoVinculacion)}
                      opciones={[
                        { valor: 'todas', etiqueta: 'Todas las vinculaciones' },
                        { valor: 'laboral', etiqueta: ETIQUETA_VINCULACION.laboral },
                        { valor: 'prestacion_servicios', etiqueta: ETIQUETA_VINCULACION.prestacion_servicios },
                      ]}
                    />
                  </BotonPildora>
                </>
              }
              derecha={<Switch etiqueta="Mostrar retirados" activo={conRetirados} alCambiar={setConRetirados} />}
              chips={[
                ...(vinculacion !== 'todas' ? [{ id: 'vinc', texto: ETIQUETA_VINCULACION[vinculacion], alQuitar: () => setVinculacion('todas') }] : []),
                ...(localEfectivo !== 'todos' ? [{ id: 'local', texto: `Local: ${nombreLocal(localEfectivo)}`, alQuitar: () => cambiarLocal('todos') }] : []),
              ]}
              alLimpiar={() => {
                limpiar();
                cambiarLocal('todos');
              }}
            />
          }
        />
      </section>

      <NotaNomina />

      {editando && <DialogoEditarEmpleado empleado={editando} alCerrar={() => setEditando(null)} />}
      {retirando && <DialogoRetiro empleado={retirando} alCerrar={() => setRetirando(null)} />}
      {contratando?.contrato && <DialogoContrato empleado={contratando.empleado} vigente={contratando.contrato} alCerrar={() => setContratando(null)} />}
    </div>
  );
}
