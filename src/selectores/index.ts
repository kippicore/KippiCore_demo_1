/**
 * Catálogo de selectores (PLAN 6.23). Puros y memoizados: `(estado, params) => resultado`, con caché por
 * referencia de las tablas que leen y por la clave serializada de los parámetros (memo.ts). Ver docs/CONTRATOS.md.
 */
export * from './memo';
export * from './base';
export * from './ventas';
export * from './caja';
export * from './catalogo';
export * from './inventario';
export * from './clientes';
export * from './personal';
export * from './nomina';
export * from './importaciones';
export * from './proveedores';
export * from './finanzas';
export * from './gastos';
export * from './calendario';
export * from './alertas';
export * from './inicio';
export * from './analisis';
export * from './hallazgos';
export * from './efectos';
export * from './narrativa';
export * from './texto';
