# Aloni: emergency retro and night plan (2026-11-21 → 22)

Panel: product designer (Eleni), UI designer (Manos), illustrator (Yiannis), farmer/owner (Bora), senior engineer (Deniz, author of §3).
Evidence: repo `seaevill/Aloni` main `35da1fb` (2026-11-21 19:49 UTC), 13 open PRs, last 60 commits, `docs/design/compare/sprint2/*-long-*` (B12 baseline), v2 screenshots `reference/prototype/screenshots/`.

## 1. Retro (why 3 nights failed)

1. **Work never reached the screen.** The B12 "long-run" baseline (#375) holds `parcels`, `register` and `more` before/after PNGs that are **byte-identical** (90 425 / 84 740 / 68 187 B). On the crops list, nested white cards and Latin names are still there; C4/X3 never landed. Parcels still has 5 boxes and no canvas (C6). Stock still has 2-row filter chips (C9). The night's merges were mostly tests, docs, a11y, perf, backup drills, search and the weekly report.
2. **Conflict deadlock.** #296/#298/#331/#292/#306/#366/#379 are `dirty`. Codex cannot force-push (its notes on #331, X1), so stale branches sit there for good. #292 was "rebuilt clean" **3 times** (#354, #369 closed; #380 has a red `check` and e2e shard 3). #296's conflict is in `supabase/tests/phone-columns.json`, which nobody owned. Earlier, a stale squash (#258) silently reverted 10 PRs.
3. **SQL gating.** B1–B5 (destination, harvest stock, job board, targets) wait for Bora to apply SQL by hand, so Codex marked X5/X6/X8/X13/X15 "blocked" and built nothing visible in their place.
4. **The Demo looked broken.** Real-looking screens say «μπλοκαρισμένη», «Κοπή από: άγνωστο», «Λείπει αναμονή» on nearly every row. The weather strip shows «—» from day 3 on. The 7-day sparkline is one dot.
5. **Self-scoring without the live site.** STATUS gives itself "7/10" from CI screenshots. Nobody opened https://aloni.ormanbora.workers.dev after the deploy. `Workers Builds` fails on every PR preview and was ignored as noise.
6. **Tickets were abstract.** "X2 source helpers", "B12 baseline", "Y8 axe" describe processes, not "this screen must look like the v2 picture".

**The 6 rules for tonight**
- R1 **Visible-first:** work in the order of §2. Nothing invisible (tests, infra, docs) until all 10 screens PASS.
- R2 **Merge-or-it-didn't-happen:** green, then merge at once. A dirty PR gets rebuilt on a new branch from origin/main (cherry-pick its own commits, no force-push) and the old one is closed in the same hour.
- R3 **One screen = one PR,** with a LIVE before/after at 375 px in the PR body.
- R4 **Morning acceptance = LIVE screenshots** in `docs/morning/2026-11-22/`, judged against §2. No self-scores.
- R5 **Demo must look alive:** about 80% of things are OK or have a date, and 1–2 are deliberately locked and labelled as examples. «άγνωστο» appears only where it teaches something.
- R6 **No new infra, no SQL merges, no refactors** without a visible effect tonight.

## 2. Morning acceptance: 10 screens Bora opens

Setup: iPhone 375 px, Greek, Άλλα → «Κτήμα επίδειξης», URL `#/demo/<tab>`. Each screen shows the amber ribbon «Επίδειξη – φανταστικά στοιχεία» once. **Global FAIL** if any of these appears: «ασφαλές»/safe; a dose or product suggestion; a number that doesn't open anything when tapped; a held or unknown count added into a total; a horizontal scroll; text under 14 px.

| # | Screen (file) | PASS = what the screenshot shows |
|---|---|---|
| S1 | **Σήμερα** `#/demo/today` (Today.tsx, TodaySheets.tsx) | Forest header with date «Κυρ 22 Νοε». One HeroCard (most urgent item; drawn tone icon, never «×»). Weather card: today temp max/min, wind km/h + gust, rain mm, then **5 day columns all filled** (no «—»). Two BigNums: «Για κοπή σήμερα» N φυτεύσεις + «+M σε αναμονή/άγνωστο», and «Κλούβες 7 ημ.» with a **line of ≥5 points**. **The tile number equals the total in its sheet** (the 0-vs-44 bug is gone). The «Κοπή σήμερα» list shows at most 3 of 15 rows as held or unknown; the others have «Κοπή από …» or «Έτοιμο για κοπή». Tapping any number opens a sheet with its rows. |
| S2 | **Καιρός sheet** (tap the weather card) | Bottom sheet: hourly row for today plus 5 days (max/min, wind + gust, rain mm), a source line «Πηγή: δεδομένα επίδειξης · ενημέρωση 06:40», close/back works. No «χωρίς δεδομένα» on Demo. |
| S3 | **Φυτά list** `#/demo/crops` (Crops.tsx, crops-v2.css) | One flat card. Each row: **hand-drawn crop picture** (40 px on a 56 px lime-soft tile), name 20/800, «2 φυτεύσεις · 1 στρ.», **one** status chip, chevron. No Latin name, no inner white pill, no planting sub-rows. **≥5 crops visible in the first viewport.** Σέσκουλα and Ραδίκια have different pictures. |
| S4 | **Crop page** (tap Σπανάκι) (CropDetail.tsx) | Hero: 96 px picture on a lime disc, «Σπανάκι» 30/800, Latin name 14 italic. Row of 3 tappable numbers (φυτεύσεις, στρ., κλούβες 7 ημ.). Weather as a compact 7-day strip **≤180 px tall** (not the 2-column tile wall). Planting rows: parcel · sowing date · chip. **«Συμβουλές» button** opens the tips sheet: chip «Γενικές πληροφορίες – όχι σύσταση», history in 2–3 sentences, 3 «Ήξερες ότι» facts, strengths, weaknesses and common problems (names only), and a 12-stone «Μήνες σποράς» ring filled from recorded plantings. Harvest heat strip: 12 weeks, the number printed in each cell. |
| S5 | **Χωράφια** `#/demo/parcels` (Parcels.tsx, ParcelDetail.tsx) | **One combined sketch** at the top with all 5 Demo parcels side by side: white shapes, 2 px forest stroke, white label pills, caption «Σκαρίφημα – όχι μετρημένα όρια». No red, no dashes. Below it, 5 flat rows: name · «5 στρ.» · one chip. **The word «μπλοκαρισμένη» appears on ≤1 row.** Tapping a shape opens that parcel. |
| S6 | **Parcel detail** (tap Κάτω Κάμπος) | A 260 px sketch with this parcel in lime and its plantings drawn as strips labelled «Σπανάκι 1,5 στρ.» (Demo sketch geometry). 2×2 facts (Εμβαδόν, Υψόμετρο, Τοπογραφία, ΟΣΔΕ). The plantings list has crop pictures. Analyses: pH / EC / OM % rows, each with an **ⓘ icon** that opens «τι είναι / τι σημαίνει υψηλό ή χαμηλό» and the chip «πληροφοριακό, χωρίς υπογραφή γεωπόνου». |
| S7 | **Αποθήκη** `#/demo/stock` (Stock.tsx, HarvestStock) | Top section **«Συγκομιδή στην αποθήκη»**: per crop, a picture + «12 κλούβες» + an age chip «3 ημ.», oldest first, and the line «Αύριο φεύγουν: N». Below, product cards ≤260 px tall: filter chips in **one** scrolling row; title, active substance, Tags, «Υπόλοιπο 1,6 L». No stray backtick glyph. |
| S8 | **Product sheet** (tap a product, or a spray in Ιστορικό) (ProductSheet.tsx) | Shows the purpose line («Μυκητοκτόνο – για …» exactly as the label records it), authorisation no., active substance, PHI, REI, max applications. A missing value reads «άγνωστο – λείπει από την ετικέτα». Approval chip. **Stock left.** Link «Δείτε την επίσημη ετικέτα» or the reason there is none. **No dose advice text.** |
| S9 | **Ιστορικό συγκομιδής** (Άλλα → Ιστορικό, or crop page) (History.tsx, HarvestHistory/Breakdown) | Split into two tabs or sections: **«Συγκομιδή» and «Ψεκασμοί»**. Tapping «Μαϊντανός 20 κλούβες» opens the breakdown by parcel, worker and time, as single-hue bars with the numbers printed. If the destination is missing, it reads «άγνωστο – παλιά καταγραφή». |
| S10 | **Παραγγελίες / πελάτες** (Άλλα → Παραγγελίες) (Orders.tsx) + **Εργασίες** overdue job | Two BigNums: «Παραγγελίες εβδ.» and «Διαθέσιμες εβδ.» (eligible only). Per crop: picture + 4-week bars with the order marker, held crates as a hatched «άγνωστο» segment, and the text «▼ λείπουν 20 κλούβες». A customer list from the Demo weekly orders (#380), where tapping a customer opens their weekly crates. On Σήμερα → Εργασίες, an **overdue job** (red-free «Καθυστερεί 2 ημ.» warn chip) opens the job detail: what, where, who, since when, and the recorded product and dose exactly as entered. |

## 3. THE PROMPT for Claude Code (paste as is)

```text
Bu gece tek hedef: Bora sabah canlı sitede (https://aloni.ormanbora.workers.dev, Κτήμα επίδειξης, Yunanca, iPhone 375 px) 10 ekranı v2'ye benzer ve "canlı" görecek.
Görünmeyen iş yok. Merge edilmeyen iş yapılmamış sayılır. Canlıda ekran görüntüsü olmayan iş bitmemiş sayılır.

You are Claude Code on github.com/seaevill/Aloni (gh: REST only, `gh api`). Read CLAUDE.md, then docs/plan/bora-feedback-2026-11-21.md
and docs/design/design-sprint-2026-11-21.md §1 (visual rules). Target pictures: reference/prototype/screenshots/*.png (v2).
Acceptance text: /home/claude/meeting/night-plan.md §2 (S1–S10). Copy it into docs/morning/2026-11-22/ACCEPTANCE.md in your first PR.

TONIGHT'S RULES
- You own ALL screen files tonight (Today, Crops, CropDetail, Parcels, ParcelDetail, ParcelSketch, Stock*, Orders, History, Sprays,
  ProductSheet, More, i18n el/tr/en/hi + ui.*). Codex only adds new files (content JSON, rules-core, app/src/ui/cx/*), so there is zero overlap.
- No new SQL, no SQL merges (#271 #362 #368 stay open), no production DB, no new dependencies, no new infra, no refactor without a visible effect.
  Bora is asleep, so there are no approvals: skip anything that needs one and write it down.
- Anything that needs B1–B5 uses the local/Demo data paths that already exist (import-demo.ts, Dexie). Otherwise skip it.
- Safety rules unchanged: no "safe"/«ασφαλές», no diagnosis, no dose/product advice, label data only as recorded, no invented numbers on the real farm.
  The Demo may carry fictional data, but only inside the Demo farm, labelled by the ribbon. Held/unknown are never summed.
- Workers Builds fails on PR previews and is NOT the gate. The gate is check + static + e2e 1–3 + sql. After each merge, confirm Workers Builds is green
  on the main commit before taking the live screenshot.

MANDATORY LOOP FOR EVERY ITEM (no exceptions)
 1 branch from fresh origin/main  2 build the visual spec  3 npm run typecheck && vitest && the focused Playwright spec (WebKit 375)
 4 PR (≤450 lines, body: 2 Greek lines "τι βλέπει ο Bora" + LIVE before PNG)  5 merge as soon as CI is green (squash; first check
   `git diff origin/main...HEAD --stat` lists only your files; never squash a stale tree)  6 wait for the main deploy (Workers Builds green on main)
 7 Playwright WebKit 375×812, the LIVE URL, Greek, load the Demo (Άλλα → demo-load), go to #/demo/<tab>, open the item
 8 save docs/morning/2026-11-22/<screen>.png (+ <screen>-sheet.png for the tap)  9 compare against the §2 text line by line;
   any miss → fix → back to 1. Write PASS only after a LIVE PNG matches. Then the next item.
 Script it once: scripts/live-shot.mjs <screen> <hash> [tapSelector], reused all night.

PHASE 0 (first 30 min): CLEAR THE QUEUE + BLOCKERS
 a) LIVE "before" shots of S1–S10 → docs/morning/2026-11-22/before/.
 b) Σήμερα KPI mismatch: the tile shows 0 while its sheet shows 44 (or the reverse). Both must use ONE selector from app/src/summary
    (same window, same "logged only" filter). Add a unit test tile==sheet. Merge.
 c) Dirty PRs: rebuild each on a new branch from origin/main by cherry-picking only its own commits (no force-push), open a new PR,
    close the old one with a link: #296 parcels sketch (resolve supabase/tests/phone-columns.json by taking main's version + re-adding its rows),
    #298 register, #331 harvest breakdown. #380 Demo weekly orders: fix the red `check` + e2e shard 3, then merge. #381 #378: merge when green.
    #306 dependabot and #379 rehearsal: leave (invisible).
 d) #367 tab contrast is merged: verify on LIVE that the tab labels are readable (screenshot). If any are still <7:1, raise the bar opacity.
 e) #366 Demo labels: rebuild from main. ~80% of Demo label uses complete AND signed (fictional, source «ΕΠΙΔΕΙΞΗ», only in import-demo.ts),
    exactly 1 deliberately unsigned + 1 deliberately incomplete, each shown with a chip «Παράδειγμα: χωρίς υπογραφή» / «Παράδειγμα: λείπει ετικέτα».
    Also give every Demo planting a recorded spray date so most rows show «Κοπή από Δευ 23 Νοε» / «Έτοιμο για κοπή» (rules-core decides).
    Demo weather: fill all 14 days (no «—»). Demo harvests: ≥5 of the last 7 days so the sparkline is a line. The isolation test stays green
    (a real farm gets none of it).

PHASE 1: SCREENS, MOST VISIBLE FIRST (one PR each, loop above)
 1 S3 Φυτά list: Crops.tsx/crops-v2.css. Flat ListRow per crop: CropIcon 40 in a 56 lime-soft tile (ui/illustrations/crops, 17 drawings exist),
   name 20/800, «N φυτεύσεις · X στρ.», ONE worst-status Chip, chevron. Remove the Latin name, the inner pill and the planting sub-rows (move them to detail;
   update crops-v2/edit/plantings specs). Accept: ≥5 crops in the first viewport.
 2 S5 Χωράφια: one SVG canvas with all Demo parcels (sketch geometry), white fill, 2 px forest stroke, 14/700 label pills, no red/dashes,
   hit area ≥56 px, caption «Σκαρίφημα – όχι μετρημένα όρια»; flat rows below (name · στρ. · one chip). Reuse #296's code if it is rebuilt.
 3 S1 Σήμερα: HeroCard + full weather card + 2 BigNums (tile==sheet) + Sparkline + cut list mostly dated; every number opens its sheet.
 4 S4 Crop page: hero (CropIcon 96, lime disc), TapNum row, WeatherStrip 7 days ≤180 px, planting rows with chips, «Συμβουλές» button →
   TipsCard sheet. Content: if app/src/content/crops/*.json exists on main use it; else write a minimal el file for the 10 Demo crops
   (history 2 sentences, 3 facts, strengths/weaknesses/problems as names only, no numbers, no treatments, header «Bora onayı bekliyor»,
   sources in docs/content/sources.md). MonthRing (12 stones, filled only from recorded planting months) and HarvestHeat (12 weeks,
   number in every cell, empty = «–», held = hatched «άγνωστο»): use cx/ versions if on main, else build minimal ones in app/src/ui/ds/.
 5 S6 Parcel detail: 260 px sketch, this parcel lime, plantings drawn as strips with label pills (Demo sketch geometry only),
   2×2 facts with «άγνωστο»+reason, plantings with CropIcon, analyses rows with an ⓘ icon → AnalysisExplain sheet (existing content).
 6 S2 Weather sheet: WeatherSheet.tsx from the card, hourly today + 5 days, gusts, rain, source + issue time; Demo always filled.
 7 S7 Αποθήκη: «Συγκομιδή στην αποθήκη» section from stock/harvest-stock.ts (exists) over the Demo harvests (in − dispatched, oldest first,
   age chip, «Αύριο φεύγουν: N», never negative → «άγνωστο»). Product cards ≤260 px, chips on one scrolling row.
 8 S8 Product sheet: ProductSheet.tsx reachable from Stock AND each spray in Ιστορικό. Add the purpose line from the recorded label/type,
   stock left (balanceOf), registry link or reason. No dose text written by us.
 9 S9 Ιστορικό: split «Συγκομιδή» / «Ψεκασμοί» (segmented 56 px); harvest row → HarvestBreakdown (rebuilt #331) by parcel/worker/time.
10 S10 Orders/customers + overdue job: Orders.tsx two BigNums, WeekBars per crop from rules-core weeklySupply, «▼ λείπουν N κλούβες»,
   customer list from Demo weekly orders (#380) → customer sheet; Demo gets one job 2 days overdue → warn chip «Καθυστερεί 2 ημ.» →
   JobDetailSheet (what/where/who/since, product+dose exactly as recorded).
 Then polish what FAILED in the morning checks. Only if S1–S10 are all PASS: worker screen tiles with crop pictures.

FORBIDDEN TONIGHT
 new infra, new workflows, SQL merges, Supabase calls, refactors without a visible change, perf/a11y/test-only PRs, docs-only PRs
 (except the final report), self-scores ("7/10") without a LIVE PNG, leaving a green PR unmerged, a PR open longer than 1 hour.

MORNING REPORT (last, one docs PR, merge it)
 Top of docs/STATUS.md: «## SABAH RAPORU 2026-11-22» + a table: # | Ekran | LIVE görüntü (docs/morning/2026-11-22/<screen>.png,
 before/<screen>.png) | PASS/FAIL | eksik olan (1 satır). Then 6 Turkish lines: what Bora sees, what to tap, what failed and why,
 which PRs stay open (SQL only), what needs his approval (crop texts «Bora onayı bekliyor»), what's next.
 Before writing PASS, re-run the 10 LIVE shots on the final main sha and put that sha in the report.
```
