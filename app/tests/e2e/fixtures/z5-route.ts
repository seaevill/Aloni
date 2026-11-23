import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import type { Page } from '@playwright/test';

export async function mountViewGallery(page: Page, baseURL: string) {
  const address = new URL('/__test__/crop-views', baseURL).href;
  const [bundle, tokens, css] = await Promise.all([
    build({
      entryPoints: [fileURLToPath(new URL('./z5-gallery.tsx', import.meta.url))],
      write: false, bundle: true, jsx: 'automatic', jsxImportSource: 'preact', loader: { '.css': 'empty' },
    }),
    readFile(new URL('../../../src/ui/tokens.css', import.meta.url), 'utf8'),
    readFile(new URL('../../../src/ui/cx/crop-views-v2.css', import.meta.url), 'utf8'),
  ]);
  const baseStyles = 'body { margin: 0; background: var(--bg); color: var(--fg); font: 1rem/1.4 system-ui; } main { padding: var(--sp-12); }';
  await page.route('**/*', (route) => route.request().url() === address
    ? route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="el"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Δοκιμή προβολών</title><style>${tokens}${baseStyles}${css}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script></html>` })
    : route.abort());
  await page.goto(address);
}
