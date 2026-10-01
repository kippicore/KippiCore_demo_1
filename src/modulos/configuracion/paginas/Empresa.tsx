import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Badge, Button, Input, avisar } from '@/ui';
import type { Empresa as EmpresaDominio } from '@/dominio/tipos';
import { EMPRESA } from '@/config/marca';
import { emitirUI, useAcciones, useMarca, useSel, useSesion } from '@/estado';
import {
  derivarTonos,
  diferencia,
  normalizarHex,
  normalizarNit,
} from '../calculos';
import { CampoPct, CampoNumero, BarraGuardar, SeccionAjustes } from '../componentes/Campos';
import { MarcoConfiguracion } from '../componentes/Marco';
import { CampoColor, VistaPreviaMarca, WordmarkVista, type ColoresMarca } from '../componentes/PiezasMarca';
import { useBorrador, useGuardarParametros } from '../hooks';
import { selEmpresa, selParametros } from '../selectores';
import { TEXTOS } from '../textos';

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CampoEmpresa = 'nit' | 'razonSocial' | 'correo' | 'colores';

export default function Empresa() {
  const empresa = useSel(selEmpresa);
  const marca = useMarca();
  return (
    <MarcoConfiguracion
      seccion="empresa"
      titulo="Empresa"
      subtitulo={TEXTOS.empresa.subtitulo}
      insignia={
        marca.esEjemplo ? (
          <span data-testid="config-insignia-ejemplo">
            <Badge tono="accent">Marca de ejemplo</Badge>
          </span>
        ) : (
          <span data-testid="config-insignia-propia">
            <Badge tono="success">Tu marca</Badge>
          </span>
        )
      }
    >
      <div className="flex flex-col gap-6">
        <FormularioMarca empresa={empresa} />
        <ReglasDelNegocio />
      </div>
    </MarcoConfiguracion>
  );
}

function FormularioMarca({ empresa }: { empresa: EmpresaDominio }) {
  const acciones = useAcciones();
  const marca = useMarca();
  const personalizada = useSesion((s) => s.marcaPersonalizada);
  const personalizarMarca = useSesion((s) => s.personalizarMarca);

  const [negocio, setNegocio] = useState(personalizada.nombreNegocio ?? '');
  const [persona, setPersona] = useState(personalizada.nombrePersona ?? '');
  const [razonSocial, setRazonSocial] = useState(empresa.razonSocial);
  const [nit, setNit] = useState(empresa.nit);
  const [descriptor, setDescriptor] = useState(empresa.descriptor);
  const [direccion, setDireccion] = useState(empresa.direccion);
  const [ciudad, setCiudad] = useState(empresa.ciudad);
  const [telefono, setTelefono] = useState(empresa.telefono);
  const [correo, setCorreo] = useState(empresa.correo);
  const [colores, setColores] = useState<ColoresMarca>({ ...empresa.colores });
  const [errores, setErrores] = useState<Partial<Record<CampoEmpresa, string>>>({});
  const [general, setGeneral] = useState<string | null>(null);

  const nombreMostrado = negocio.trim() || empresa.nombre;
  const cambiosEmpresa = diferencia(
    { razonSocial: empresa.razonSocial, nit: empresa.nit, descriptor: empresa.descriptor, direccion: empresa.direccion, ciudad: empresa.ciudad, telefono: empresa.telefono, correo: empresa.correo, colores: empresa.colores },
    { razonSocial: razonSocial.trim(), nit, descriptor: descriptor.trim(), direccion: direccion.trim(), ciudad: ciudad.trim(), telefono: telefono.trim(), correo: correo.trim(), colores },
  );
  const marcaCambio = (negocio.trim() || null) !== personalizada.nombreNegocio || (persona.trim() || null) !== personalizada.nombrePersona;
  const hayCambios = cambiosEmpresa !== null || marcaCambio;

  const poner = (campo: CampoEmpresa, f: () => void) => {
    f();
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const guardar = () => {
    const e: Partial<Record<CampoEmpresa, string>> = {};
    let nitFinal = nit;
    const rn = normalizarNit(nit);
    if (!rn.ok) e.nit = rn.error;
    else nitFinal = rn.nit;
    if (!razonSocial.trim()) e.razonSocial = 'Escribe la razón social.';
    if (!RE_CORREO.test(correo.trim())) e.correo = 'Escribe un correo válido, por ejemplo hola@minegocio.com.';
    if (Object.values(colores).some((c) => normalizarHex(c) === null)) e.colores = 'Revisa que los cuatro colores tengan un código válido.';
    setErrores(e);
    setGeneral(null);
    if (Object.keys(e).length > 0) return;
    setNit(nitFinal);

    const cambios = diferencia(
      { razonSocial: empresa.razonSocial, nit: empresa.nit, descriptor: empresa.descriptor, direccion: empresa.direccion, ciudad: empresa.ciudad, telefono: empresa.telefono, correo: empresa.correo, colores: empresa.colores },
      { razonSocial: razonSocial.trim(), nit: nitFinal, descriptor: descriptor.trim(), direccion: direccion.trim(), ciudad: ciudad.trim(), telefono: telefono.trim(), correo: correo.trim(), colores },
    ) as Partial<EmpresaDominio> | null;
    if (cambios) {
      const r = acciones.editarEmpresa({ cambios });
      if (!r.ok) {
        const campo = (['nit', 'razonSocial', 'correo', 'colores'] as const).find((k) => k === r.error.campo);
        if (campo) setErrores({ [campo]: r.error.mensaje });
        else setGeneral(r.error.mensaje);
        return;
      }
    }
    const nuevoNegocio = negocio.trim() || null;
    const nuevaPersona = persona.trim() || null;
    if (marcaCambio) personalizarMarca({ nombreNegocio: nuevoNegocio, nombrePersona: nuevaPersona });
    const coloresCambiaron = cambios !== null && 'colores' in cambios;
    const marcaNueva =
      (nuevoNegocio !== null && nuevoNegocio !== personalizada.nombreNegocio) ||
      (nuevaPersona !== null && nuevaPersona !== personalizada.nombrePersona) ||
      coloresCambiaron;
    if (marcaNueva) emitirUI('marca_personalizada');
    avisar({ tipo: 'exito', texto: TEXTOS.empresa.exito, detalle: nuevoNegocio ? `Ahora el sistema se llama ${nuevoNegocio}` : undefined });
  };

  const descartar = () => {
    setNegocio(personalizada.nombreNegocio ?? '');
    setPersona(personalizada.nombrePersona ?? '');
    setRazonSocial(empresa.razonSocial);
    setNit(empresa.nit);
    setDescriptor(empresa.descriptor);
    setDireccion(empresa.direccion);
    setCiudad(empresa.ciudad);
    setTelefono(empresa.telefono);
    setCorreo(empresa.correo);
    setColores({ ...empresa.colores });
    setErrores({});
    setGeneral(null);
  };

  const volverAEjemplo = () => {
    personalizarMarca({ nombreNegocio: null, nombrePersona: null });
    if (diferencia(empresa.colores, EMPRESA.colores) !== null) acciones.editarEmpresa({ cambios: { colores: { ...EMPRESA.colores } } });
    setNegocio('');
    setPersona('');
    setColores({ ...EMPRESA.colores });
    avisar({ tipo: 'info', texto: `Volviste a ${EMPRESA.nombre}`, detalle: 'La marca de ejemplo y sus colores.' });
  };

  const derivar = () => {
    const h = normalizarHex(colores.acento);
    if (!h) return;
    setColores({ ...colores, acento: h, ...derivarTonos(h) });
  };

  return (
    <>
      <SeccionAjustes
        titulo="Tu marca"
        descripcion={marca.esEjemplo ? TEXTOS.empresa.avisoEjemplo.replace('{{marca}}', EMPRESA.nombre) : TEXTOS.empresa.avisoPropia}
        columnas={2}
        data-testid="config-marca"
      >
        <div className="sm:col-span-2">
          <div className="border border-line-soft bg-canvas px-6 py-8">
            <WordmarkVista nombre={nombreMostrado} descriptor={descriptor.trim() || undefined} />
          </div>
        </div>
        <Input
          etiqueta="Nombre de tu negocio"
          opcional
          placeholder={EMPRESA.nombre}
          maxLength={28}
          autoComplete="off"
          value={negocio}
          ayuda={TEXTOS.empresa.nombreAyuda}
          onChange={(ev) => setNegocio(ev.target.value)}
          data-testid="config-nombre-negocio"
        />
        <Input
          etiqueta="Tu nombre"
          opcional
          maxLength={28}
          autoComplete="off"
          value={persona}
          ayuda={TEXTOS.empresa.personaAyuda}
          onChange={(ev) => setPersona(ev.target.value)}
          data-testid="config-nombre-persona"
        />
        <Input
          className="sm:col-span-2"
          etiqueta="Frase bajo el nombre"
          maxLength={48}
          autoComplete="off"
          value={descriptor}
          onChange={(ev) => setDescriptor(ev.target.value)}
          data-testid="config-descriptor"
        />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          {!marca.esEjemplo && (
            <Button variante="secondary" tamano="sm" onClick={volverAEjemplo} data-testid="config-volver-halden">
              {TEXTOS.empresa.volver.replace('{{marca}}', EMPRESA.nombre)}
            </Button>
          )}
          <p className="t-small text-muted">Los nombres de personas y las cifras de las pantallas siguen siendo de ejemplo.</p>
        </div>
      </SeccionAjustes>

      <SeccionAjustes titulo={TEXTOS.empresa.coloresTitulo} descripcion={TEXTOS.empresa.coloresTexto} columnas={2} data-testid="config-colores">
        <div className="flex flex-col gap-4">
          <CampoColor
            etiqueta="Color principal"
            valor={colores.acento}
            alCambiar={(h) => poner('colores', () => setColores({ ...colores, acento: h }))}
            data-testid="config-color-acento"
          />
          <CampoColor
            etiqueta="Texto sobre el color"
            valor={colores.acentoTexto}
            alCambiar={(h) => poner('colores', () => setColores({ ...colores, acentoTexto: h }))}
            data-testid="config-color-texto"
          />
          <CampoColor
            etiqueta="Fondo suave"
            valor={colores.acentoSuave}
            alCambiar={(h) => poner('colores', () => setColores({ ...colores, acentoSuave: h }))}
            data-testid="config-color-suave"
          />
          <CampoColor
            etiqueta="Portada de la tienda"
            valor={colores.tiendaHero}
            alCambiar={(h) => poner('colores', () => setColores({ ...colores, tiendaHero: h }))}
            data-testid="config-color-tienda"
          />
          <div>
            <Button variante="ghost" tamano="sm" icono={Wand2} onClick={derivar} data-testid="config-derivar-tonos">
              {TEXTOS.empresa.derivar}
            </Button>
            <p className="mt-1 t-small text-muted">{TEXTOS.empresa.derivarAyuda}</p>
          </div>
          {errores.colores && <p className="t-small text-danger">{errores.colores}</p>}
        </div>
        <div className="min-w-0">
          <p className="mb-2 t-label text-ink">{TEXTOS.empresa.vistaPrevia}</p>
          <VistaPreviaMarca nombre={nombreMostrado} colores={colores} />
          <p className="mt-2 t-small text-muted">{TEXTOS.empresa.vistaPreviaTexto}</p>
        </div>
      </SeccionAjustes>

      <SeccionAjustes titulo={TEXTOS.empresa.legalTitulo} descripcion={TEXTOS.empresa.legalTexto} columnas={2} data-testid="config-datos-negocio">
        <Input
          className="sm:col-span-2"
          etiqueta="Razón social"
          autoComplete="off"
          value={razonSocial}
          error={errores.razonSocial}
          onChange={(ev) => poner('razonSocial', () => setRazonSocial(ev.target.value))}
          data-testid="config-razon-social"
        />
        <Input
          etiqueta="NIT"
          autoComplete="off"
          inputMode="numeric"
          value={nit}
          placeholder="901.234.567-7"
          error={errores.nit}
          ayuda="Escribe las 9 cifras y calculamos el dígito de verificación."
          onChange={(ev) => poner('nit', () => setNit(ev.target.value))}
          onBlur={() => {
            const r = normalizarNit(nit);
            if (r.ok) setNit(r.nit);
          }}
          data-testid="config-nit"
        />
        <Input
          etiqueta="Correo del negocio"
          type="email"
          autoComplete="off"
          value={correo}
          error={errores.correo}
          onChange={(ev) => poner('correo', () => setCorreo(ev.target.value))}
          data-testid="config-correo"
        />
        <Input etiqueta="Dirección" autoComplete="off" value={direccion} onChange={(ev) => setDireccion(ev.target.value)} />
        <div className="grid grid-cols-2 gap-x-4">
          <Input etiqueta="Ciudad" autoComplete="off" value={ciudad} onChange={(ev) => setCiudad(ev.target.value)} />
          <Input etiqueta="Teléfono" autoComplete="off" inputMode="tel" value={telefono} onChange={(ev) => setTelefono(ev.target.value)} />
        </div>
      </SeccionAjustes>

      <BarraGuardar nCambios={hayCambios ? 1 : 0} alGuardar={guardar} alDescartar={descartar} etiquetaGuardar={TEXTOS.empresa.guardar} resumen="Hay cambios en tu marca y los datos del negocio sin guardar" error={general} fija={false} data-testid="config-barra-marca" />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Reglas de venta e inventario
// ---------------------------------------------------------------------------------------------------------
function ReglasDelNegocio() {
  const p = useSel(selParametros);
  const base = { ventas: pick(p.ventas), inventario: p.inventario };
  const { borrador, cambios, nCambios, poner, descartar } = useBorrador(base);
  const ventas = useGuardarParametros('ventas');
  const inventario = useGuardarParametros('inventario');
  const c = cambios as { ventas?: unknown; inventario?: unknown } | null;

  const guardar = () => {
    const a = ventas.guardar(c?.ventas ?? null, 'Reglas de venta guardadas');
    const b = inventario.guardar(c?.inventario ?? null, 'Reglas de inventario guardadas');
    if (a && b) descartar();
  };
  return (
    <>
      <SeccionAjustes titulo={TEXTOS.empresa.reglasTitulo} descripcion={TEXTOS.empresa.reglasTexto} columnas={3} data-testid="config-reglas">
        <CampoPct
          etiqueta="Abono mínimo de un separado"
          valor={borrador.ventas.abonoMinimoSeparado}
          alCambiar={(v) => poner('ventas.abonoMinimoSeparado', v)}
          error={ventas.errores['ventas.abonoMinimoSeparado']}
          ayuda="Lo mínimo que se debe pagar para apartar una prenda."
        />
        <CampoNumero
          etiqueta="Días máximos de un separado"
          sufijo="días"
          valor={borrador.ventas.diasMaximoSeparado}
          alCambiar={(v) => poner('ventas.diasMaximoSeparado', v)}
          error={ventas.errores['ventas.diasMaximoSeparado']}
        />
        <CampoPct
          etiqueta="Descuento máximo del vendedor"
          valor={borrador.ventas.descuentoMaximoVendedor}
          alCambiar={(v) => poner('ventas.descuentoMaximoVendedor', v)}
          error={ventas.errores['ventas.descuentoMaximoVendedor']}
          ayuda="Más que esto necesita tu aprobación."
        />
        <CampoNumero
          etiqueta="Días para devolver una compra"
          sufijo="días"
          valor={borrador.ventas.diasMaximoDevolucion}
          alCambiar={(v) => poner('ventas.diasMaximoDevolucion', v)}
          error={ventas.errores['ventas.diasMaximoDevolucion']}
        />
        <CampoNumero
          etiqueta="Existencia mínima por defecto"
          sufijo="unid."
          valor={borrador.inventario.stockMinimoPorDefecto}
          alCambiar={(v) => poner('inventario.stockMinimoPorDefecto', v)}
          error={inventario.errores['inventario.stockMinimoPorDefecto']}
          ayuda="Debajo de esto, la prenda aparece como stock bajo."
        />
        <CampoNumero
          etiqueta="Días sin movimiento"
          sufijo="días"
          valor={borrador.inventario.diasSinMovimiento}
          alCambiar={(v) => poner('inventario.diasSinMovimiento', v)}
          error={inventario.errores['inventario.diasSinMovimiento']}
          ayuda="Pasado este tiempo sin venderse, una prenda se marca como dormida."
        />
      </SeccionAjustes>
      <BarraGuardar nCambios={nCambios} alGuardar={guardar} alDescartar={descartar} error={ventas.general ?? inventario.general} fija={false} data-testid="config-barra-reglas" />
    </>
  );
}

function pick<T extends object>(o: T): T {
  const { cuentaPorMedio: _omitido, ...resto } = o as T & { cuentaPorMedio?: unknown };
  return resto as T;
}
