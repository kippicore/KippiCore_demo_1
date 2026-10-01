import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
  resolve: { alias },
  test: {
    globals: true,
    passWithNoTests: true,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'dominio',
          globals: true,
          environment: 'node',
          // Las pruebas del generador construyen 18 meses (≈ 1 s cada una, más con la carga en paralelo).
          testTimeout: 60_000,
          hookTimeout: 60_000,
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'componentes',
          globals: true,
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
        },
      },
    ],
  },
});
