import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Agrupa dependencias pesadas en chunks estables (5.15). */
function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (/[\\/](react|react-dom|react-router|zustand|immer|scheduler)[\\/]/.test(id)) return 'react';
  if (id.includes('@radix-ui')) return 'radix';
  if (id.includes('@tanstack')) return 'tabla';
  if (/[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/.test(id)) return 'graficos';
  if (/[\\/](jspdf|jspdf-autotable)[\\/]/.test(id)) return 'pdf';
  if (id.includes('exceljs')) return 'excel';
  if (/[\\/](jsbarcode|qrcode)[\\/]/.test(id)) return 'codigos';
  if (id.includes('@dnd-kit')) return 'dnd';
  if (id.includes('date-fns')) return 'fechas';
  return undefined;
}

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
    rollupOptions: { output: { manualChunks } },
  },
  server: { port: Number(process.env.PORT ?? 5173) },
  preview: { port: Number(process.env.PORT ?? 4173) },
});
