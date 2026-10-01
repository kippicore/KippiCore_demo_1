import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Agrupa dependencias pesadas en chunks estables (5.15). `codeSplitting.groups` de rolldown (no `manualChunks`):
 * con `manualChunks`, el ayudante de precarga de Vite (`vite/preload-helper`, que jsPDF también usa) quedaba
 * dentro del chunk `pdf` y la carga inicial de TODA ruta descargaba y evaluaba jsPDF (430 KB) solo por ese
 * ayudante (medido en F2-B). El grupo `precarga`, con más prioridad, lo saca a un chunk mínimo.
 */
const GRUPOS_CHUNKS: { name: string; test: RegExp; priority?: number }[] = [
  { name: 'precarga', test: /vite[\\/]preload-helper|^\0vite\/preload-helper/, priority: 100 },
  { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|zustand|immer|scheduler)[\\/]/ },
  { name: 'radix', test: /node_modules[\\/]@radix-ui[\\/]/ },
  { name: 'tabla', test: /node_modules[\\/]@tanstack[\\/]/ },
  { name: 'graficos', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/ },
  { name: 'pdf', test: /node_modules[\\/](jspdf|jspdf-autotable)[\\/]/ },
  { name: 'excel', test: /node_modules[\\/]exceljs[\\/]/ },
  { name: 'codigos', test: /node_modules[\\/](jsbarcode|qrcode)[\\/]/ },
  { name: 'dnd', test: /node_modules[\\/]@dnd-kit[\\/]/ },
  { name: 'fechas', test: /node_modules[\\/]date-fns[\\/]/ },
];

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // El registro del service worker se difiere hasta que el estado esté construido (5.11): lo hace src/main.tsx.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        id: '/app',
        name: 'HALDEN · App del dueño',
        short_name: 'HALDEN',
        lang: 'es-CO',
        start_url: '/app?fuente=pwa',
        scope: '/app',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A0A0A',
        theme_color: '#0A0A0A',
        icons: [
          { src: '/iconos/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/iconos/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/iconos/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/assets\//],
        globPatterns: ['**/*.{js,css,html,woff2,svg,png}'],
        globIgnores: ['**/*.ttf', '**/excel-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:ttf)$|excel-.*\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'exportes', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    rolldownOptions: { output: { codeSplitting: { groups: GRUPOS_CHUNKS } } },
  },
  server: { port: Number(process.env.PORT ?? 5173) },
  preview: { port: Number(process.env.PORT ?? 4173) },
});
