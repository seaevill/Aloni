import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_NAME } from './src/config';

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Build id: Cloudflare's commit (CF_PAGES_COMMIT_SHA), else the local git commit, else 'local'. Shown in More, so a stale iPhone is easy to spot.
const commit = (process.env.CF_PAGES_COMMIT_SHA ?? (() => { try { return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { return 'local'; } })()).trim().slice(0, 7);

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(`${pkg.version} · ${commit}`) },
  plugins: [
    preact(),
    { name: 'app-name', transformIndexHtml: (html: string) => html.replaceAll('%APP_NAME%', APP_NAME) },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-180.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
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
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}'], navigateFallback: '/index.html' },
    }),
  ],
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts'] },
});
