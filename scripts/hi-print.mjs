#!/usr/bin/env node
// Builds docs/i18n/hi-print.html from the app's own texts (no hand-typed translation): page 1 = the printable el/hi «Πρώτη μέρα» card for a new worker, then the full el | tr | hi table of every worker text (for the Hindi reviewer).
// Run: node scripts/hi-print.mjs   (after any change to app/src/i18n/{el,tr,hi}.json)
import { readFileSync, writeFileSync } from 'node:fs';
const load = (l) => JSON.parse(readFileSync(new URL(`../app/src/i18n/${l}.json`, import.meta.url), 'utf8'));
const el = load('el'), tr = load('tr'), hi = load('hi');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// The card: each step = a heading key and the screen texts the worker will see (all existing keys; a missing hi key fails the build, never a Greek-only line).
const STEPS = [
  ['1', 'worker.title', ['worker.data.ack']],
  ['2', 'worker.tab.jobs', ['worker.jobs', 'worker.fixed']],
  ['3', 'worker.done', ['worker.start', 'worker.time', 'worker.confirm', 'worker.committed']],
  ['4', 'worker.tab.harvest', ['harvest.add', 'harvest.cutby', 'harvest.counter']],
  ['5', 'worker.tab.observe', ['worker.observe.kind', 'worker.observe.save']],
  ['6', 'pwa.offline', ['sync.queuedSignal']],
  ['!', 'worker.lock.unknown', ['harvest.blocked.unknown']],
];
const need = (k) => { if (!(k in hi)) throw new Error(`hi.json has no «${k}»`); return k; };
const card = STEPS.map(([n, head, lines]) => `<tr class="${n === '!' ? 'stop' : ''}"><td class="n">${n}</td><td><b>${esc(el[need(head)])}</b>${lines.map((k) => `<br>${esc(el[need(k)])}`).join('')}</td><td lang="hi" class="hi"><b>${esc(hi[head])}</b>${lines.map((k) => `<br>${esc(hi[k])}`).join('')}</td></tr>`).join('\n');
const all = Object.keys(hi).filter((k) => k in el && k in tr && !/^\{[a-z]+\}( · \{[a-z]+\}| — \{[a-z]+\})?$/.test(hi[k])).map((k) => `<tr><td>${esc(el[k])}</td><td>${esc(tr[k])}</td><td class="hi" lang="hi">${esc(hi[k])}</td></tr>`).join('\n');
const html = `<!doctype html>
<html lang="el"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Αλώνι – Πρώτη μέρα / पहला दिन (A4)</title>
<style>
@page { size: A4 portrait; margin: 10mm; }
body { font-family: system-ui, "Noto Sans Devanagari", "Noto Sans", sans-serif; margin: 0; color: #000; }
h1 { font-size: 18pt; margin: 0 0 3mm; }
p { font-size: 10pt; margin: 0 0 3mm; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 0.4mm solid #000; padding: 1.4mm 2mm; vertical-align: top; font-size: 11pt; line-height: 1.3; }
th { background: #eee; text-align: left; }
td.n { width: 9mm; text-align: center; font-weight: 800; font-size: 14pt; }
td.hi { font-size: 12.5pt; }
tr.stop td { border-width: 0.8mm; }
tr { break-inside: avoid; }
.page2 { break-before: page; }
.page2 td, .page2 th { font-size: 10pt; padding: 1mm 1.6mm; }
.page2 td.hi { font-size: 12pt; font-weight: 600; }
</style></head><body>
<h1>Αλώνι · Πρώτη μέρα — पहला दिन</h1>
<p>Τα κείμενα είναι ακριβώς αυτά της οθόνης. · ये वही शब्द हैं जो ऐप की स्क्रीन पर दिखते हैं।</p>
<table><thead><tr><th></th><th>Ελληνικά</th><th>हिन्दी</th></tr></thead><tbody>
${card}
</tbody></table>
<div class="page2"><h1>Όλα τα κείμενα εργάτη · Ελληνικά | Türkçe | हिन्दी</h1>
<table><thead><tr><th>Ελληνικά</th><th>Türkçe</th><th>हिन्दी</th></tr></thead><tbody>
${all}
</tbody></table></div>
</body></html>
`;
writeFileSync(new URL('../docs/i18n/hi-print.html', import.meta.url), html);
console.log('docs/i18n/hi-print.html written');
