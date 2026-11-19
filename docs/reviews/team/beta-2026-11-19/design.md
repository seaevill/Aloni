# Beta 2 – Design group report (Aloni / Αλώνι @ d21df3d)

Tested 2026-11-19 (night) on the built app (`vite preview`, port 4106), Chromium headless, 375×812 (plus 320×640, 812×375 landscape, dark-scheme emulation, offline reload). Demo farm and an empty "Το κτήμα μου" were both used. Compared against `reference/prototype/` (v2 screenshots) and theme B (`docs/design/theme-2026-11/winner-B.html`, rendered at 375 px).
Screenshots: `LAB/shots/design/` (LAB = `/tmp/claude-0/-home-claude/c6073d90-877c-5449-adb1-dbd4033f7fd0/scratchpad/lab`).

---

## 1. Personas

### P1 – Senior product/UI designer
*Who I am:* 12 years designing iOS/Android field and logistics apps. I judge against the v2 prototype and theme B. I care about consistency, hierarchy and how screens look in sun.
*What I tried:*
- Welcome screen. Loaded the demo and went through all 5 tabs, crop detail, parcel detail, Sprays/History, Register, Orders, More, worker view (jobs and harvest), and the Hindi, EN and EL language switches.
- On the real farm: added a parcel with a long name, opened the map editor, added a planting, logged 12 crates, and opened the spray form.
- Landscape, 320 px, dark-scheme emulation, offline reload, re-tapping the active tab.

*Delighted:* The tokens follow theme B exactly: sage `#EDF2E8`, white cards, forest, lime only as a fill. A computed-style scan found no text in lime. Commissioner loads (`document.fonts.check` is true) and the Greek renders beautifully. Glass is only in the tab bar (`rgba(237,242,232,.74)` with blur 22px and saturate 1.7). There is no horizontal overflow at 320 px. Forms are clean, with big 56 px fields and a unit suffix inside the input («στρ.»). The undo toast («Αναίρεση») is a nice touch.

*Blocked/confused:* The app mixes two design languages. Today, Stock, More and the detail screens use the prototype's dark forest band. Crops and Parcels have no band. Theme B uses a light header with a demo pill top-right. The Today hero is a data gap («Άγνωστη αναμονή»), and the parcel list is a wall of red blocks. The 5-day weather strip wraps badly. Tab labels collide at ≤375 px. The worker harvest screen has a floating save button over the list.

**Screen scores (0–10)**

| Screen | Prototype/theme likeness | Polish | Main reason |
|---|---:|---:|---|
| Welcome (empty Today) | – | 6 | Clean 1-2-3 steps, but the sentence is duplicated («Ξεκινήστε με ένα χωράφι…» twice) and there is no logo or wordmark |
| Today (demo) | 7 | 5 | Prototype structure is there. The 5-day strip wraps, the hero is a data gap, 3 of 5 parcels are solid red, jobs show ISO dates, no weather icons |
| Today (real, no weather yet) | 6 | 4 | A dark card of 16 «—» dashes, two stacked banners on every screen, «3,5 στρ.» wraps |
| Crops list | 5 | 6 | No band, a card nested inside a card (the inner card has a shadow), planting rows not tappable, plain-text status (no chips) |
| Crop detail | 4 | 6 | Band OK, but sparse: no actions, no chevrons, no next harvest or crate figure |
| Parcels list | 4 | 5 | No band. Only name and area: no crops, no status, no sketch |
| Parcel detail | 6 | 6 | Good info table, but no sketch in the demo (no boundaries), «Τοπογραφία —» |
| Map editor | – | 4 | A white void when tiles don't load. «Αποθήκευση ορίων» floats over the attribution. «Η θέση μου» and «Σβήσιμο» sit below the fold behind the tab bar |
| Stock | 6 | 5 | Filter chips wrap to 2 rows. Long dates («Τετάρτη 30 Ιουνίου 2027») break the «Δευ 16 Νοε» style. Two half-width buttons per card. «Υπόλοιπο: 0 kg» is not highlighted |
| More | 6 | 5 | Six separate cards instead of one grouped list, «हिन्दी» wraps alone onto a 2nd row, and the page is about 4,100 px long (sign-in checklist, raw rule list) |
| Worker – jobs | 6 (vs mockup B) | 6 | Every demo job is locked (unknown REI), so the filled-forest «Έγινε» is never seen. Sage card with a grey border instead of white. No blurred action tray. 🔒 emoji |
| Worker – harvest | 5 | 4 | The sticky «Καταγραφή» floats about 80 px above the bottom over the chips. Chips repeat the parcel name under a parcel heading. The counter sits below 17 chips |
| Owner harvest form | – | 5 | The crate count is a 16 px input, not a big counter. The chip repeats the parcel name |
| Sprays / History | 6 | 6 | Readable. Status lines are long paragraphs, not chips |
| Spray register | 7 | 5 | ISO timestamps («2026-11-19 22:38») |

### P2 – Social media manager, "Twoislandsdallas" (Dionysia Dalla)
*Who I am:* I run Instagram/TikTok for a small Greek produce brand. I need 7–15 s reels: hands, crates, morning light, one big number. I never post anything that exposes workers or exact field locations.
*What I tried:* I looked at every screen as a possible "phone-in-hand" B-roll shot. I logged a 12-crate harvest to see if a counter moment exists, and I opened the field map.
*Delighted:* The palette is on-trend and camera-friendly: deep forest + lime + sage reads "fresh greens" instantly. The worker «−/0/+ κλούβες κομμένες» counter (big 40 px digit) is the only true reel moment. The Today KPI tiles («Κλούβες 7 ημερών 110») would make a nice end-card.
*Blocked/ugly on camera:*
- The demo Today screen is red-alarm heavy («Κοπή από: άγνωστο. Η συγκομιδή είναι μπλοκαρισμένη.» ×3). On camera it reads as "everything is broken".
- The field map has no shapes in the demo and is a white box when tiles don't load. There is nothing to film.
- The owner harvest form shows "12" in a small text field.
- Worker first names and ISO dates are on the Today job rows, so I can't screenshot Today without cropping.
- Nothing produces an image I can share.

### P3 – Gen-Z TikTok/Instagram user (30 seconds)
*Who I am:* I'm 21 and I swipe past anything that looks like a government form.
*First impression:* "Oh, that green is nice, kind of Revolut-meets-farm." Then I tapped "Φόρτωση επίδειξης". The first card was a big dark box saying «Άγνωστη αναμονή» with an ✕, and below it a stack of dark-red error bars. I thought the demo was broken. Lots of long sentences. The tab names squash into each other («ΚαλλιέργειεςΧωράφια» at 320 px). More is an endless settings page.
*Vibe/trust:* It looks serious and legit, not scammy, and it clearly isn't an ad-funded app. Modern: 6/10. It looks like a well-built tool, not a brand. There is no logo anywhere inside the app, so I couldn't tell you its name after 30 seconds.

### P4 – Brand / naming
*Who I am:* Brand strategist for Greek food and agritech start-ups.
*What I tried:* Checked the manifest, the `<title>` and apple title, the icons (192/512/180), the welcome copy, every header, and the language switch.
*Findings:*
- «Αλώνι» appears in one place in the UI: welcome step 1 («Τι είναι το Αλώνι»). It disappears once the demo or real data loads.
- The home-screen title and `<title>` are the Latin «Aloni». No header, splash, About or footer shows the name. «Έκδοση: 0.0.0 · d21df3d» is the only identity line in More.
- The icon is a white crate with lime blobs on forest. At small sizes the blobs read as a cloud or popcorn, and the crate reads as a clapperboard. Nothing evokes an αλώνι, the circular stone threshing floor, which is a strong, simple, ownable shape.
- The maskable icon is the same 512 file. The crate corners sit about 215 px from centre, outside the 205 px safe circle, so Android circle masks clip them.
- There is no iOS splash (`apple-touch-startup-image`), so iPhone shows a blank screen on launch.
- `manifest.name` is "Aloni", `lang` is "el" and `background_color` matches the bg token, which is good. The name is still provisional, so all of this should stay cheap to change: keep it in `config.ts` plus the icon files only.

---

## 2. Findings

| id | persona | screen | problem (what I did / saw) | severity | proposed fix | effort |
|---|---|---|---|---|---|---|
| D01 | P1,P2,P3 | Today (demo) | The hero («Το πιο σημαντικό σήμερα») is «Άγνωστη αναμονή · Γεράνεια Πλαγιά» with a lime «Δείτε τους ψεκασμούς». Below it, 3 of 5 parcel cards carry solid `--warn` red blocks («Κοπή από: άγνωστο…»). The first impression is "broken" (`02-today-demo-top.png`, `04-today-red-wall.png`) | MAJOR | Keep the safety message, change its weight: (a) render "unknown" as the amber `--warn-bg/--warn-ink` chip («Λείπει αναμονή – συμπληρώστε») and reserve solid red for a *running* PHI/REI. (b) Order hero candidates as running hold/frost before a missing-data item, and show missing-data items as one grouped card («3 φυτείες χωρίς αναμονή») instead of the hero. (c) Fill in label PHI for some demo rows, keeping the data fictional and marked unsigned where appropriate, so the demo also shows the happy path. Do not default anything: a missing value stays blocked | M |
| D02 | P1 | Today weather | The 5-day strip wraps «Πέμ 19 / Νοε» onto 2 lines and the columns misalign. There are no icons, and the today column isn't highlighted (theme B uses `--lime-soft`) | MAJOR | `.wx-row .d{white-space:nowrap}`; label = «Πέμ 19» (drop the month); `.wx-row .d.today{background:var(--lime-soft);color:var(--on-lime);border-radius:var(--r-md);padding:var(--sp-6)}`; add a 20 px inline-SVG icon per WMO code (sun/cloud/rain/frost, 4 icons). Move the strip into a white card as in mockup B, and keep only the 4 tiles dark | M |
| D03 | P1 | Today (real farm, no weather) | The dark weather card shows 16 «—» dashes plus «Δεν υπάρχουν ακόμα δεδομένα καιρού» (`05-today-real-empty-weather.png`) | MAJOR | When there are no forecast rows, render one compact card: icon + «Ο καιρός θα εμφανιστεί όταν συνδεθεί ο λογαριασμός» (no tiles, no strip) | S |
| D04 | P1 | Crops, Parcels lists | No forest band on these two tabs, while Today, Stock, More and the details all have one. The header jumps when switching tabs (`06-parcels-list-no-band.png`) | MAJOR | Wrap the h1 in `<header class="today-head band">` in `screens.tsx` (Crops, Parcels) like Stock/More. Longer term, pick ONE header style for all tabs: theme B's light large-title + demo pill is the stated winner, and the band is prototype-only | S |
| D05 | P1,P3 | Tab bar | At 375 px «Καλλιέργειες» (14 px, `white-space:nowrap`) runs into «Χωράφια». At 320 px they visibly overlap (`13-tabbar-320-overlap.png`) | MAJOR | `nav.tabs .lbl{font-size:12px;letter-spacing:-.01em}` (theme B smallest is 11) and `@media(max-width:360px){nav.tabs .lbl{font-size:11px}}`. Alternatively use the label «Φυτείες» | S |
| D06 | P2 | Parcels / map | Demo parcels have no boundaries, so parcel detail says «Δεν έχουν οριστεί όρια…» and there is no sketch. The map editor is a blank white box when tiles fail (`07`, `08`) | MAJOR | (a) Give demo parcels sketch polygons in an obviously fictional local frame, rendered only as the SVG sketch (not placed on a basemap), so no real field is implied. (b) Add a map-load-failure state: sage box, outline icon, «Ο χάρτης χρειάζεται σύνδεση. Μπορείτε να γράψετε το εμβαδόν με το χέρι.» (c) Make the map editor's action row a non-overlapping bottom tray (theme B blurred tray) holding Θέση μου / Σβήσιμο / Αποθήκευση | M |
| D07 | P1 | Worker harvest | The sticky «Καταγραφή» (`.btn[data-testid$="-save"]`, `bottom: calc(var(--nav-h)+8px)`) floats about 80 px above the screen bottom, because the worker view has no nav. It covers chips while scrolling (`11-worker-harvest-sticky-overlap.png`) | MAJOR | In the worker view set `bottom:calc(var(--sp-8) + env(safe-area-inset-bottom))` and put the button in a `--bar` blurred tray with padding; add `main{padding-bottom:calc(var(--tap-big)+var(--sp-24))}` | S |
| D08 | P1,P2 | Worker harvest | The chips repeat the parcel under each parcel heading («Σέσκουλα · Πάχη Παραλιακό» under «Πάχη Παραλιακό»). With 17 two-line chips, the counter is far below | MINOR | Chip text = crop only (and the sowing date only when a parcel has two of the same crop). After a pick, scroll the counter into view, or show the counter step on its own screen | S |
| D09 | P1,P2 | Owner harvest form | Crates are a 16 px input with −1/+1 buttons; the worker view has the nicer 40 px counter | MINOR | Reuse the worker counter component (`--fs-count`, 72 px ± buttons) in `HarvestForm` | S |
| D10 | P1 | Worker jobs | All demo jobs are REI-locked, so «Έγινε» always looks greyed and «Δεν έγινε» (red outline) is the strongest button. The card is sage with a grey border rather than white. 🔒 is an emoji (`10-worker-jobs-done-weak.png`) | MINOR | Keep the lock logic. Make at least one demo job unlocked (with a recorded, fictional, unsigned-marked REI) so the filled-forest state is visible. Job card `background:var(--card)` with no border. Replace 🔒 with the inline SVG lock used elsewhere. The lock banner should use `--hold-bg/--hold-ink` (soft), not solid dark red | S |
| D11 | P1 | Today jobs, Register | ISO dates on Today job rows («… · Ahmet · 2026-11-18») and in the register («Δημιουργήθηκε: 2026-11-19 22:38», «2026-09-03 10:00»). This breaks the Greek-format rule | MAJOR | Route these through `i18n/format.ts` (`formatDate` gives «Τετ 18 Νοε», `formatDateTime`). The register may keep ISO in the CSV export only | S |
| D12 | P1 | Today | «Σήμερα έγιναν» card says «Εκκρεμείς δουλειές από προηγούμενες ημέρες: 3». The label is "done today" but the content is "pending from earlier days" | MINOR | Split it: «Σήμερα έγιναν» (done/crates) vs an amber chip «3 δουλειές από προηγούμενες μέρες» that links to the job list | S |
| D13 | P1 | Today, parcel cards | «3,5 στρ.» wraps to «3,5 / στρ.» next to a long parcel name. This violates theme B rule 4 (non-breaking number+unit) | MINOR | Format units with ` ` in `format.ts` and add `.area{white-space:nowrap;flex:none}` | S |
| D14 | P1 | Crops/Parcels list | A card nested in a card: a shadowed white pill (the header button) inside a white card, with the planting rows in the outer card. It looks doubled | MINOR | Make the header button flat (`box-shadow:none;background:none;padding-inline:0`) with a hairline divider. Planting rows become tappable rows with chevrons and a status chip («Σε συγκομιδή» = lime-soft, «Σε ανάπτυξη» = neutral) | S |
| D15 | P1 | Parcels list | Only name + area are shown; the prototype and Today already show crops, weather and harvest status per parcel | MINOR | Reuse the Today parcel-card body (crops line + status chip) in the Parcels list | S |
| D16 | P1 | Stock | Filter chips wrap to 2 rows. Dates are long-form («Τετάρτη 30 Ιουνίου 2027»). Two half-width buttons per card. «Υπόλοιπο: 0 kg» looks the same as healthy stock (`09-stock-chips-wrap.png`) | MINOR | Horizontally scrollable chip row (`display:flex;overflow-x:auto;flex-wrap:nowrap`, hidden scrollbar). Dates «30 Ιουν 2027». The whole card opens stock; «Στοιχεία ετικέτας» becomes a text link. Remaining 0 gets an amber chip «Τελείωσε» | S |
| D17 | P1 | More | Six separate floating cards, «हिन्दी» alone on a 2nd row, about 4,100 px page including the raw rule list | MINOR | One inset-grouped list (one white card, hairline separators). Language as a 4-column segmented control (`grid-template-columns:repeat(4,1fr)`). Move «Κανόνες και ειδοποιήσεις» and the sign-in checklist behind a «Για προχωρημένους» row | M |
| D18 | P1 | All tabs | Re-tapping the active tab (e.g. More while in Orders) does not return to the tab root, which is the iOS convention | MINOR | In the nav click handler: if `tab.value === t`, reset that tab's sub-screen state | S |
| D19 | P1 | All screens (real farm) | Two permanent banners stacked on every screen (sync «Αποθηκεύτηκε στο τηλέφωνο…» + backup reminder) push content about 130 px down | MINOR | Show the sync note once, as a toast after the first save, and afterwards as a small «στο τηλέφωνο» pill in the header. Keep the backup reminder on Today/More only | S |
| D20 | P1 | Welcome | The same sentence appears twice (step 2 body and the line above the buttons) | POLISH | Delete the line above the buttons | S |
| D21 | P4 | Global | The name «Αλώνι» is not visible after the welcome screen; there is no wordmark, splash or About line | MAJOR (brand) | Add a small wordmark «Αλώνι» (Commissioner 800, forest) in the Today header next to the date, and «Αλώνι · έκδοση …» at the bottom of More. Both come from `APP_NAME_EL` in `config.ts`, so a rename stays one-file | S |
| D22 | P4 | Icon | The crate + lime blobs read as a cloud/clapperboard at 60 px. The maskable icon reuses the 512 artwork, and the corners fall outside the 80 % safe zone | MINOR | Generate a separate `icon-maskable-512.png` with the artwork scaled to 70 %. Explore a threshing-floor ring (circle of stones) with one lime leaf as the next icon round, after the name checks | S (maskable) / M (new icon) |
| D23 | P4 | iOS launch | No `apple-touch-startup-image`, so iPhone shows a blank screen before load | POLISH | Add 2–3 startup PNGs (sage bg, centred icon + «Αλώνι») generated at build time | S |
| D24 | P2 | New feature | Nothing in the app makes a shareable image | MINOR (feature) | **Owner-only «Κάρτα ημέρας»** on Today: renders a 1080×1350 PNG on-device with `<canvas>`: date, «Σήμερα κόπηκαν 46 κλούβες», a crop list with crate counts, Commissioner, forest/lime, and a small «Αλώνι» mark. **No worker names, no parcel names or coordinates, no spray/PHI data.** It is shared only through `navigator.share({files})` or a download, when the owner taps it. No upload, no auto-post, no analytics. Hidden in the worker role and on the Demo farm (or watermarked «ΕΠΙΔΕΙΞΗ») | M |
| D25 | P1 | Dark scheme | `prefers-color-scheme: dark` changes nothing. That is fine for sun readability, but no decision is recorded | POLISH | Record "light-only by design (sun readability)" in DECISIONS.md and set `<meta name="color-scheme" content="light">` so iOS form controls don't go dark | S |
| D26 | P1 | Owner date inputs | The native datetime field shows the browser locale (en-US in test: «11/19/2026, 10:32 PM») | POLISH | Verify on Bora's iPhone (Greek locale gives Greek format). If not, show a formatted Greek label above the native input («Πέμ 19 Νοε, 22:32») | S |

---

## 3. Social-media notes (P2)

**Screenshot-worthy today (after cropping):** the Today weather tiles + KPI tiles («Κλούβες 7 ημερών 110 / 28 ημερών 157»), the worker crate counter, and the crop list with Latin names (nice "herbarium" vibe).
**Ugly on camera:** red block walls (D01), the dashed empty weather card (D03), the blank map (D06), ISO dates with worker names (D11), the long More page.
**Reel ideas (no tracking, nothing auto-published, owner-triggered only):**
1. "From field to crate today": B-roll of hands cutting, then a phone close-up of the crate counter going 0→12 (D09 makes this camera-ready), then the «Κάρτα ημέρας» (D24) as the end card.
2. "Our 17 greens": the crop list scroll with Greek + Latin names, which pairs well with product shots.
3. "Our fields" as abstract SVG sketches (D06a) in lime on forest. Never real coordinates or satellite views of real parcels.
Rule for Twoislandsdallas: only owner-made cards; never film the worker view, the spray screens or anything with names. Keep the produce brand and the farm app separate: the card carries the «Αλώνι» mark only if Bora wants it.

---

## 4. Top 5 decisions to push for (ranked)

1. **Stop showing "missing data" as alarm red** (D01, D10): amber for unknown, red only for a running hold. Fill the demo with fictional label values so the demo shows a healthy day as well as the blocked cases. This is the single biggest first-impression fix, and safety is unchanged (missing still means blocked).
2. **One header and card language across all tabs** (D04, D14, D17): either the prototype's dark band everywhere, or theme B's light large title everywhere. Decide tomorrow; the current mix makes it look like two apps.
3. **Fix the layout bugs before Bora tests on his iPhone** (D02, D05, D07, D11, D13): weather strip wrapping, tab-label collision, the floating worker save button, ISO dates, number+unit wrapping. All S effort and all visible within 10 seconds.
4. **Make the name visible** (D21–D23): a wordmark in the Today header, a version line in More, a maskable icon and an iOS splash, all driven from `config.ts` so a rename stays cheap while the name is provisional.
5. **Owner-only «Κάρτα ημέρας» share image** (D24), plus demo sketches and a map-failure state (D06): the first marketing-ready surface, with no tracking, no worker names, no locations and no automatic publishing.
