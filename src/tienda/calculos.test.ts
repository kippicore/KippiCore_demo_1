import { describe, expect, it } from 'vitest';
import {
  agregarALinea,
  armarVentaWeb,
  COMPRADOR_VACIO,
  detalleBolsa,
  filtrarProductos,
  fijarCantidadLinea,
  FILTRO_VACIO,
  listaNatural,
  notaExistencias,
  ordenarProductos,
  ordenarTallas,
  productosDeSeccion,
  resolverColor,
  totalesBolsa,
  validarComprador,
  normalizarCelular,
} from './calculos';
import type { CatalogoTienda, ColorTienda, ProductoTienda } from './tipos';

const color = (id: string, nombre: string, unidades = 5): ColorTienda => ({ id, nombre, codigo: id.slice(4).toUpperCase(), hex: '#000000', patron: 'liso', unidades });
const producto = (p: Partial<ProductoTienda> & { id: string }): ProductoTienda => ({
  slug: p.id,
  referencia: p.id.toUpperCase(),
  nombre: p.id,
  categoria: 'camisas',
  linea: 'casual',
  tipoPrenda: 'camisa',
  curvaTallas: 'superior',
  temporada: 'Colección permanente',
  material: '',
  descripcion: '',
  precio: 100_000,
  tarifaIva: 0.19,
  destacado: false,
  nuevo: false,
  colores: [color('col_azn', 'Azul marino')],
  tallas: [{ talla: 'M', unidades: 3 }],
  unidades: 3,
  ...p,
});

describe('tallas', () => {
  it('ordena letras, números y "Única" como una curva real', () => {
    expect(ordenarTallas(['XL', 'S', 'XXL', 'M', 'L'])).toEqual(['S', 'M', 'L', 'XL', 'XXL']);
    expect(ordenarTallas(['40', '28', '34', '30'])).toEqual(['28', '30', '34', '40']);
    expect(ordenarTallas(['Única', '44', 'M'])).toEqual(['M', '44', 'Única']);
  });
});

describe('secciones, filtros y orden', () => {
  const lista = [
    producto({ id: 'a', categoria: 'camisas', precio: 200_000, destacado: true }),
    producto({ id: 'b', categoria: 'polos', precio: 100_000, nuevo: true }),
    producto({ id: 'c', categoria: 'blazers', precio: 500_000, unidades: 0, tallas: [{ talla: '48', unidades: 0 }] }),
    producto({ id: 'd', categoria: 'pantalones', precio: 300_000, colores: [color('col_are', 'Arena')], tallas: [{ talla: '32', unidades: 2 }] }),
  ];
  it('cada sección agrupa sus categorías y novedades toma la temporada más reciente', () => {
    expect(productosDeSeccion(lista, 'camisas').map((p) => p.id)).toEqual(['a', 'b']);
    expect(productosDeSeccion(lista, 'sastreria').map((p) => p.id)).toEqual(['c']);
    expect(productosDeSeccion(lista, 'novedades').map((p) => p.id)).toEqual(['b']);
    expect(productosDeSeccion(lista, 'zapatos-y-accesorios')).toEqual([]);
  });
  it('filtra por tipo, talla con existencias, color y disponibilidad', () => {
    expect(filtrarProductos(lista, { ...FILTRO_VACIO, tipos: ['polos'] }).map((p) => p.id)).toEqual(['b']);
    expect(filtrarProductos(lista, { ...FILTRO_VACIO, talla: '32' }).map((p) => p.id)).toEqual(['d']);
    expect(filtrarProductos(lista, { ...FILTRO_VACIO, talla: '48' })).toEqual([]);
    expect(filtrarProductos(lista, { ...FILTRO_VACIO, colorId: 'col_are' }).map((p) => p.id)).toEqual(['d']);
    expect(filtrarProductos(lista, { ...FILTRO_VACIO, soloDisponibles: true }).map((p) => p.id)).toEqual(['a', 'b', 'd']);
  });
  it('ordena por destacados, precio y nombre sin mutar la lista', () => {
    const copia = [...lista];
    expect(ordenarProductos(lista, 'destacados').map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(ordenarProductos(lista, 'precio_asc').map((p) => p.id)).toEqual(['b', 'a', 'd', 'c']);
    expect(ordenarProductos(lista, 'precio_desc').map((p) => p.id)).toEqual(['c', 'd', 'a', 'b']);
    expect(lista).toEqual(copia);
  });
  it('?color= acepta id, código o nombre sin tildes ni mayúsculas', () => {
    const colores = [color('col_azn', 'Azul marino'), color('col_cml', 'Camel')];
    expect(resolverColor('col_azn', colores)?.id).toBe('col_azn');
    expect(resolverColor('AZN', colores)?.id).toBe('col_azn');
    expect(resolverColor('azul-marino', colores)?.id).toBe('col_azn');
    expect(resolverColor('Camel', colores)?.id).toBe('col_cml');
    expect(resolverColor('rojo', colores)).toBeNull();
    expect(resolverColor(null, colores)).toBeNull();
  });
});

describe('nota de existencias', () => {
  it('avisa lo que queda y dónde más hay', () => {
    expect(listaNatural(['Usaquén', 'Zona Rosa'])).toBe('Usaquén y Zona Rosa');
    expect(listaNatural(['A', 'B', 'C'])).toBe('A, B y C');
    expect(notaExistencias({ stock: 2, despacho: 'Parque 93', otros: [] })).toEqual({ tono: 'warning', texto: 'Quedan 2 para envío' });
    expect(notaExistencias({ stock: 2, despacho: 'Parque 93', otros: ['Zona Rosa'] }).texto).toBe('Quedan 2 para envío · disponible en otras tiendas');
    expect(notaExistencias({ stock: 1, despacho: 'Parque 93', otros: [] }).texto).toBe('Queda 1 para envío');
    expect(notaExistencias({ stock: 9, despacho: 'Parque 93', otros: ['Usaquén'] })).toEqual({ tono: 'muted', texto: 'Disponible para envío desde Parque 93' });
    expect(notaExistencias({ stock: 0, despacho: 'Parque 93', otros: ['Usaquén'] }).texto).toContain('recogerla en Usaquén');
    expect(notaExistencias({ stock: null, despacho: 'Parque 93', otros: ['Usaquén', 'Zona Rosa'] }).texto).toBe('Sale desde Parque 93. También en Usaquén y Zona Rosa.');
  });
});

describe('bolsa', () => {
  it('agregar suma sin pasar de las existencias ni de 10 por línea', () => {
    let l = agregarALinea([], 'v1', 1, 2);
    l = agregarALinea(l, 'v1', 1, 2);
    l = agregarALinea(l, 'v1', 1, 2);
    expect(l).toEqual([{ varianteId: 'v1', cantidad: 2 }]);
    expect(agregarALinea([], 'v2', 1, 0)).toEqual([]);
    expect(agregarALinea([], 'v3', 99, 50)).toEqual([{ varianteId: 'v3', cantidad: 10 }]);
  });
  it('fijar la cantidad respeta el tope y 0 quita la línea', () => {
    const base = [{ varianteId: 'v1', cantidad: 1 }];
    expect(fijarCantidadLinea(base, 'v1', 5, 3)).toEqual([{ varianteId: 'v1', cantidad: 3 }]);
    expect(fijarCantidadLinea(base, 'v1', 0, 3)).toEqual([]);
    expect(fijarCantidadLinea(base, 'v1', 2, 0)).toEqual([]);
  });
  it('une la bolsa con el catálogo, descarta variantes desconocidas y calcula los totales de la venta', () => {
    const p = producto({ id: 'p1', precio: 189_900 });
    const catalogo: CatalogoTienda = {
      local: { id: 'p93', nombre: 'Parque 93' },
      productos: [p],
      variantes: { v1: { id: 'v1', productoId: 'p1', talla: 'M', colorId: 'col_azn', sku: 'X', stock: 4 } },
    };
    const d = detalleBolsa([{ varianteId: 'v1', cantidad: 2 }, { varianteId: 'fantasma', cantidad: 1 }], catalogo);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ total: 379_800, stock: 4, precio: 189_900 });
    const t = totalesBolsa(d);
    expect(t.total).toBe(379_800);
    expect(t.unidades).toBe(2);
    expect(t.base + t.iva).toBe(t.total);
    expect(t.iva).toBe(379_800 - Math.round(379_800 / 1.19));
  });
});

describe('comprador y venta web', () => {
  const completo = { nombres: 'Andrés', apellidos: 'Mejía', correo: 'a@b.co', celular: '310 555 0142', direccion: 'Calle 1', complemento: '', barrio: 'Chicó', ciudad: 'Bogotá', autorizacion: true };
  it('valida cada campo con mensajes en español', () => {
    expect(validarComprador(completo)).toEqual({});
    const e = validarComprador(COMPRADOR_VACIO);
    expect(Object.keys(e).sort()).toEqual(['apellidos', 'autorizacion', 'barrio', 'celular', 'correo', 'direccion', 'nombres']);
    expect(validarComprador({ ...completo, celular: '2105550142' }).celular).toContain('empiece por 3');
    expect(validarComprador({ ...completo, correo: 'sin-arroba' }).correo).toBeTruthy();
  });
  it('normaliza el celular (espacios y +57)', () => {
    expect(normalizarCelular('310 555 0142')).toBe('3105550142');
    expect(normalizarCelular('+57 310 555 0142')).toBe('3105550142');
  });
  it('arma el comando: canal web, contado, un solo pago por la pasarela y la entrega en la nota', () => {
    const v = armarVentaWeb({ lineas: [{ varianteId: 'v1', cantidad: 2 }], comprador: completo, metodo: 'pse', total: 379_800, localId: 'p93', vendedorId: 'em_vgomez', clienteExistenteId: null, ahora: '2026-09-30T15:30:00' });
    expect(v).toMatchObject({ canal: 'web', tipo: 'contado', localId: 'p93', vendedorId: 'em_vgomez', clienteId: null });
    expect(v.pagos).toEqual([{ medio: 'pasarela_web', valor: 379_800, recibido: null, referencia: 'PSE (simulación)', sesionCajaId: null, bonoId: null }]);
    expect(v.lineas).toEqual([{ varianteId: 'v1', cantidad: 2, precioLista: null, descuento: null }]);
    expect(v.clienteNuevo).toMatchObject({ celular: '3105550142', canalAlta: 'web', correo: 'a@b.co', localRegistroId: 'p93' });
    expect(v.clienteNuevo?.autorizacionDatos).toEqual({ aceptada: true, fecha: '2026-09-30T15:30:00', canal: 'web' });
    expect(v.nota).toContain('Calle 1, Chicó, Bogotá');
  });
  it('con un cliente que ya existe no crea otro', () => {
    const v = armarVentaWeb({ lineas: [{ varianteId: 'v1', cantidad: 1 }], comprador: completo, metodo: 'simulado', total: 1, localId: 'p93', vendedorId: 'x', clienteExistenteId: 'cl_1', ahora: '2026-09-30T15:30:00' });
    expect(v.clienteId).toBe('cl_1');
    expect(v.clienteNuevo).toBeNull();
  });
});
