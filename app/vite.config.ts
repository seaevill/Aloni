import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Aloni Farm',
        short_name: 'Aloni Farm',
        description: 'Field management for a Greek leafy-greens farm',
        lang: 'el',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f6f4ec',
        theme_color: '#2f6b3a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'], navigateFallback: '/index.html' },
    }),
  ],
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts', '../packages/**/*.test.ts'] },
});
