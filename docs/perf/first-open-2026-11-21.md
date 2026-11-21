# First open on a slow connection – measured 2026-11-21 (E8)

Method: `scripts/perf/first-open.mjs` serves the production build (`app/dist`) with gzip over ONE shared «slow 3G» link (400 kbit/s, 400 ms before every response) for the page and the service worker, in Chromium (WebKit cannot throttle). Numbers move with the machine: compare runs made on the same machine. Run it after `npm run build -w app`:
`PW_CHROMIUM_PATH=/path/to/chromium node scripts/perf/first-open.mjs`

| Build | First Σήμερα screen | Bytes by then | Offline copy complete | Total downloaded |
|---|---|---|---|---|
| main before E8 (a26e7e4 base) | 5.8 s | 222 KB | 22.9 s | 813 KB |
| Hindi font out of the first install | 5.8 s | 222 KB | **19.9 s** | **694 KB** |

## What was tried and what the numbers say
- **Hindi font (121 KB, worker phones only) removed from the first install**: cached the first time it is used (`font-hindi`, CacheFirst, one year). −119 KB and −3.0 s for every phone's offline copy. Kept.
- **Registering the service worker after `load` instead of at once**: first screen unchanged (5.8 s), offline copy slower (21.4 s). Not kept.
- **Preloading the two Greek/Latin font files**: first screen SLOWER (6.3 s): on one shared link the fonts compete with the script that draws the screen. Not kept.
- The first screen is bound by the first-load JavaScript (`index` ≈ 150 KB gzip ≈ 3 s of the 5.8 s at this speed, the rest is round trips). The budget test (`first-load-budget.spec`, ≤ 167,323 gzip bytes) keeps it from growing. A real saving needs less code in `index` (rarely used screens loaded on first use, like the share card and the other languages already are); one sheet at a time, each with its own test. Not done here: about 10 KB (~0.2 s) for a risky wide change.

## The five biggest files (gzip) and what is done about each
1. `maplibre-gl` 283 KB – loaded only when a map opens; part of the offline copy so the map works offline. Not touched.
2. `index` 150 KB – the first load; budget-guarded (above).
3. `terra-draw` 48 KB – loaded only when drawing a field; same reasoning as 1.
4. Hindi font 121 KB – **moved out of the first install** (above).
5. Commissioner Latin 37 KB / Latin-extended 31 KB / Greek 15 KB – needed by the first screen (Latin-extended carries the Turkish letters); kept.

## Also found while measuring (fixed)
- On the worker screen, choosing Hindi did not update the page language, so the `:lang(hi)` font rule never applied and the bundled Hindi font was never used (the phone's own font was). The page language now follows the language signal on every path (`i18n/index.ts`), and a test checks the Hindi font is really loaded.

## The update bar, for real
`update-real-sw.spec.ts` serves the production build from a temporary copy, lets the real service worker install and take control, changes the worker file on the server (a new deploy), asks the browser for an update, and checks that the bar «Νέα έκδοση» appears by itself, that a half-typed form is untouched for longer than the reload fallback, and that the button applies it. (The older `update-bar.spec.ts` uses a test hook; this one does not.)
