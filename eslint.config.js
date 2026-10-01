// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

/*
 * Reglas de capas (PLAN 5.3) y de determinismo (5.9, 7.2).
 * Cada archivo pertenece a una sola capa; los bloques van del más general al más específico porque,
 * en la configuración plana, un bloque posterior reemplaza la opción completa de la regla.
 */

// ---------- Sintaxis prohibida ----------
const SIN_RELOJ = [
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: 'Date.now() solo se usa en src/estado/reloj.ts. Recibe `ahora` como parámetro.',
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: 'new Date() sin argumentos solo se usa en src/estado/reloj.ts. Recibe `ahora` como parámetro.',
  },
];
const SIN_AZAR = [
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
    message: 'Math.random() está prohibido en las capas puras: usa el PRNG del generador o recibe los IDs hechos.',
  },
];
const SIN_MATEMATICA_INEXACTA = [
  {
    selector:
      "CallExpression[callee.object.name='Math'][callee.property.name=/^(log|log2|log10|log1p|exp|expm1|pow|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|cbrt|hypot)$/]",
    message: 'Aritmética exacta (7.2): en el generador solo + − × ÷, Math.sqrt, Math.floor y Math.round.',
  },
  {
    selector: "BinaryExpression[operator='**']",
    message: 'Aritmética exacta (7.2): el operador ** está prohibido en el generador; usa tablas precalculadas.',
  },
  {
    selector: "AssignmentExpression[operator='**=']",
    message: 'Aritmética exacta (7.2): el operador **= está prohibido en el generador.',
  },
];

// ---------- Importaciones por capa ----------
const r = (grupo, mensaje) => ({ group: grupo, message: mensaje });
const REACT = r(['react', 'react-dom', 'react-dom/*', 'react/*', 'react-router', 'zustand'], 'Capa pura: sin React ni stores.');
const ESTADO = r(['@/estado', '@/estado/*'], 'Esta capa no puede leer el estado de la app (5.3).');
const UI = r(['@/ui', '@/ui/*'], 'Esta capa no puede importar componentes (5.3).');
const LAYOUTS = r(['@/layouts', '@/layouts/*', '@/app', '@/app/*'], 'Esta capa no puede importar layouts ni el router (5.3).');
// El contrato de rutas (src/app/rutas.ts, puro) lo usan selectores (alertas), ui/conectados y módulos (5.5.1).
const LAYOUTS_SALVO_RUTAS = r(
  // (gitignore: no se puede re-incluir un archivo si se excluye la carpeta; por eso '@/app/*' y no '@/app').
  ['@/layouts', '@/layouts/*', '@/app/*', '!@/app/rutas'],
  'Esta capa no puede importar layouts ni el router; del router solo @/app/rutas (5.3, 5.5.1).',
);
const LAYOUTS_SALVO_CONTRATOS = r(
  ['@/layouts', '@/layouts/*', '@/app/*', '!@/app/rutas', '!@/app/useParamsRuta'],
  'Esta capa no puede importar layouts ni el router; del router solo @/app/rutas y @/app/useParamsRuta (5.5.1).',
);
const MODULOS = r(['@/modulos', '@/modulos/*', '@/movil', '@/movil/*', '@/tienda', '@/tienda/*', '@/seguimiento', '@/seguimiento/*'], 'Esta capa no puede importar módulos (5.3).');
const GENERADOR = r(['@/generador', '@/generador/*'], 'Esta capa no puede importar el generador (5.3).');
const SELECTORES = r(['@/selectores', '@/selectores/*'], 'Esta capa no puede importar selectores (5.3).');
const REPORTES = r(['@/reportes', '@/reportes/*'], 'Esta capa no puede importar reportes (5.3).');
const LIB = r(['@/lib', '@/lib/*'], 'Esta capa no puede importar lib (5.3).');
const DOMINIO_NO_TIPOS = r(
  ['@/dominio/reglas', '@/dominio/reglas/*', '@/dominio/comandos', '@/dominio/comandos/*', '@/dominio/motor', '@/dominio/motor/*', '@/dominio/errores'],
  'config y seed solo importan tipos del dominio (5.3).',
);
const IMMER = r(['immer'], 'Immer solo se usa en src/dominio/motor/vivo.ts (D11).');
const INTERNOS_MODULO = {
  regex: '^@/modulos/[^/]+/(?!publico$).+',
  message: 'De otro módulo solo se importa su publico.ts (5.3).',
};

const capa = (files, patrones, extra = {}) => ({
  files,
  ...extra,
  rules: { 'no-restricted-imports': ['error', { patterns: patrones }] },
});

const NAVEGADOR = ['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'location', 'indexedDB', 'BroadcastChannel'].map(
  (name) => ({ name, message: 'Capa pura: sin APIs del navegador (5.3).' }),
);

export default tseslint.config(
  {
    ignores: ['dist', 'dev-dist', 'node_modules', 'coverage', 'playwright-report', 'test-results', 'docs', 'public'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2023 },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-syntax': ['error', ...SIN_RELOJ],
    },
  },
  // Configuración de herramientas y scripts (Node).
  {
    files: ['*.config.ts', '*.config.js', 'scripts/**', 'e2e/**'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-restricted-syntax': 'off' },
  },
  // React (componentes).
  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },

  // ---------- Capas (5.3) ----------
  capa(['src/config/**', 'src/seed/**'], [REACT, ESTADO, UI, LAYOUTS, MODULOS, GENERADOR, SELECTORES, REPORTES, LIB, DOMINIO_NO_TIPOS, IMMER]),
  capa(['src/dominio/**'], [REACT, ESTADO, UI, LAYOUTS, MODULOS, GENERADOR, SELECTORES, REPORTES, LIB, IMMER]),
  capa(['src/dominio/motor/vivo.ts', 'src/dominio/motor/vivo.test.ts'], [REACT, ESTADO, UI, LAYOUTS, MODULOS, GENERADOR, SELECTORES, REPORTES, LIB]),
  capa(['src/generador/**'], [REACT, ESTADO, UI, LAYOUTS, MODULOS, SELECTORES, REPORTES, LIB, IMMER]),
  capa(['src/selectores/**'], [REACT, ESTADO, UI, LAYOUTS_SALVO_RUTAS, MODULOS, GENERADOR, REPORTES, LIB, IMMER]),
  capa(['src/reportes/**'], [
    REACT,
    ESTADO,
    UI,
    LAYOUTS,
    MODULOS,
    GENERADOR,
    IMMER,
    // Ajuste F2-B: los reportes formatean celdas con lib/formato y lib/moneda (una sola regla de formato).
    r(['@/lib/enlaces', '@/lib/descargar', '@/lib/codigos', '@/lib/codigos/*'], 'reportes solo importa lib/exportar, lib/formato, lib/fechas y lib/moneda (5.3).'),
  ]),
  capa(['src/lib/**'], [r(['react', 'react-dom', 'react-dom/*', 'zustand']), ESTADO, UI, LAYOUTS, MODULOS, GENERADOR, SELECTORES, REPORTES]),
  capa(['src/estado/**'], [UI, LAYOUTS, MODULOS]),
  capa(['src/ui/**'], [ESTADO, SELECTORES, MODULOS, LAYOUTS, GENERADOR, REPORTES]),
  capa(['src/ui/conectados/**'], [MODULOS, LAYOUTS_SALVO_CONTRATOS, GENERADOR]),
  capa(['src/layouts/**', 'src/app/**'], [GENERADOR, INTERNOS_MODULO]),
  capa(['src/modulos/**', 'src/movil/**', 'src/tienda/**', 'src/seguimiento/**'], [GENERADOR, LAYOUTS_SALVO_CONTRATOS, INTERNOS_MODULO]),

  // Pruebas de selectores, reportes y estado: construyen el estado con el generador (solo en pruebas).
  capa(
    ['src/selectores/**/*.test.ts', 'src/selectores/pruebas/**', 'src/reportes/**/*.test.ts', 'src/estado/**/*.test.ts', 'src/estado/**/*.test.tsx'],
    [UI, LAYOUTS_SALVO_RUTAS, MODULOS],
  ),

  // ---------- APIs del navegador fuera de las capas puras ----------
  {
    files: ['src/config/**', 'src/seed/**', 'src/dominio/**', 'src/generador/**', 'src/selectores/**', 'src/reportes/**'],
    rules: { 'no-restricted-globals': ['error', ...NAVEGADOR] },
  },

  // ---------- Determinismo ----------
  {
    files: ['src/dominio/**', 'src/selectores/**', 'src/reportes/**', 'src/config/**', 'src/seed/**'],
    rules: { 'no-restricted-syntax': ['error', ...SIN_RELOJ, ...SIN_AZAR] },
  },
  {
    files: ['src/generador/**'],
    rules: { 'no-restricted-syntax': ['error', ...SIN_RELOJ, ...SIN_AZAR, ...SIN_MATEMATICA_INEXACTA] },
  },
  {
    files: ['src/estado/reloj.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
