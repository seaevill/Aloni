#!/usr/bin/env node
// Renders the app icons from the ONE mark geometry (app/src/ui/brand/ring.json): icon-180/192/512 (mark on a forest square) and icon-maskable-512 (mark inside the 80 % safe zone).
// Run from the repo root with Playwright's Chromium available: node scripts/render-icons.mjs   (the mark is PROVISIONAL like the name: change ring.json or this file, run again.)
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const ring = JSON.parse(readFileSync(new URL('../app/src/ui/brand/ring.json', import.meta.url), 'utf8'));
const FOREST = '#134a2b', LIME = '#c6f062';
const markSvg = (box, at) => `<svg x="${at}" y="${at}" width="${box}" height="${box}" viewBox="0 0 100 100">${ring.stones.map((s) => `<rect x="${s.x}" y="${s.y}" width="${ring.stoneW}" height="${ring.stoneH}" rx="${ring.stoneRx}" transform="rotate(${s.rot} ${s.cx} ${s.cy})" fill="${LIME}" stroke="${FOREST}" stroke-width="1.5"/>`).join('')}<circle cx="50" cy="50" r="${ring.disc}" fill="${FOREST}"/></svg>`;
const icon = (size, share) => { const box = size * share; return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${FOREST}"/>${markSvg(box, (size - box) / 2)}</svg>`; };
const OUT = [['icon-180.png', 180, 0.78], ['icon-192.png', 192, 0.78], ['icon-512.png', 512, 0.78], ['icon-maskable-512.png', 512, 0.9]];   // maskable: the ring's outer corner (41.7 % of the box) stays inside the 80 % circle: 0.9 × 41.7 = 37.5 % <= 40 %
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
for (const [file, size, share] of OUT) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0">${icon(size, share)}</body>`);
  await page.screenshot({ path: new URL(`../app/public/${file}`, import.meta.url).pathname, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log(`app/public/${file}`);
}
await browser.close();
