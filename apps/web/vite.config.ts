/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Colores de marca para el manifest (mismos valores que los tokens del preset).
const AZUL_MARINO = '#1E2E51'; // hsl(222 47% 22%)
const FONDO = '#F6F7F9'; // hsl(220 14% 97%)

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.png',
        'icons/apple-touch-icon.png',
        'logo-mark.png',
        'logo-white.png',
      ],
      manifest: {
        name: 'EFE Capital',
        short_name: 'EFE Capital',
        description: 'Tus finanzas personales, ordenadas.',
        lang: 'es-AR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: AZUL_MARINO,
        background_color: FONDO,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Solo el shell de la app (JS, CSS, HTML, íconos). Las respuestas de la API nunca se
        // cachean: no hay runtimeCaching, y la API está en otro origen.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: '/index.html',
        // /__/ es el handler de Firebase Auth si en el futuro se sirve desde este dominio.
        navigateFallbackDenylist: [/^\/__\//, /^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rolldownOptions: {
      output: {
        // Dependencias grandes en chunks propios: cambian poco y quedan cacheadas entre deploys.
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase/ },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
