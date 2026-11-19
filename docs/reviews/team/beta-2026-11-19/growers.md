# Beta 2 – "growers" panel (neighbour grower, client + driver, young farmer)

Build tested: `seaevill/Aloni@d21df3d`, `vite preview` on :4103. Chromium (Playwright) at 375×812, locale el-GR, Europe/Athens. Tested 2026-11-19 on a fresh profile (own farm from zero) and a second profile (Demo farm). I also drove the old Κλούβες app (`reference/klouves/index.html`) with three fictional clients and imported its backup into Aloni.
Screenshots: `LAB/shots/growers/` (LAB = `/tmp/claude-0/-home-claude/c6073d90-877c-5449-adb1-dbd4033f7fd0/scratchpad/lab`).

---

## Persona 1: neighbouring Megara grower (Greek, 58, possible pilot)

**Who I am:** I've grown lettuce, spinach and onions on 30 στρέμματα next to Bora for 35 years. I use Viber and the bank app, nothing else. My notebook and the agronomist's invoices are my records.

**What I tried**
- First run on an empty phone, then "Προσθήκη χωραφιού", saving with nothing filled in, typing a long Greek parcel name, typing the area as `4.5` and `4,5`.
- Adding a planting (Ρόκα, 2 στρ.), opening the parcel, then Today, Stock and harvest logging.
- Looking for my own crops (μαρούλι, ντομάτα), loading the demo, closing and reopening the app.
- Reading the "Ρυθμίσεις και σύνδεση" section.

**What delighted me**
- The first screen is short and honest (3 steps: what it is, add a field, or see the demo). See `01-first-run-el.png`.
- Area in στρ. with a comma works, and `4.5` is accepted and shown as `4,5 στρ.`. Greek day/month formats (Πέμ 19 Νοε) are used everywhere except one place (F-10).
- Validation messages are plain: "Γράψτε ένα όνομα.", "Γράψτε το εμβαδόν, π.χ. 0,6."
- Undo after saving, and "Αποθηκεύτηκε στο τηλέφωνο" makes the offline promise clear.
- Offline reload works (service worker).

**What blocked or confused me**
- **I can't add my own crop.** The crop list is fixed at Bora's 17 (`crops/catalog.ts`). It has no μαρούλι, even though this is a leafy-greens plain, and no ντομάτα, αγγούρι, βασιλικός or δυόσμος. For me this ends the pilot.
- "Προσθήκη χωραφιού" on Today only switches to the Χωράφια tab, which says "Δεν υπάρχουν δεδομένα." I had to press the same button a second time (`02a-cta-lands-on-empty-list.png`).
- The parcel page has no "add planting" button. Plantings live only under the Καλλιέργειες tab, so I had to discover that alone.
- I had one parcel, and the planting form still made me pick it. It said "Επιλέξτε χωράφι." after I pressed Save, and the error was far above the button (`08-planting-single-parcel-not-preselected.png`). The planting form is 1,720 px tall (~2 screens) for 3 required fields.
- Right after my very first save, a yellow warning says "Δεν υπάρχει πρόσφατο αντίγραφο (πάνω από 7 ημέρες ή ποτέ)". Two banners then sit on every screen (`03-after-first-parcel.png`, `06-…`).
- **A parcel with nothing planted counts as "Χωράφια χωρίς αναμονή σήμερα: 1"** and shows "Κοπή: δεν υπάρχει καταγεγραμμένη αναμονή" (`05-parcel-detail-own.png`, `07-today-own-farm.png`). To me this reads as "ready to cut".
- Weather on my own farm is a block of 15 "—" with a small note at the end. It would be better to say once why it is empty and when it will fill.
- **"Ρυθμίσεις και σύνδεση" is developer talk** (`18-more-golive-jargon.png`): "Επιβεβαιώνω: εφαρμόστηκαν οι αλλαγές έως 0026", "Η βάση δεδομένων έχει όλες τις αλλαγές", "Έγινε ο έλεγχος προειδοποιήσεων στον πίνακα της βάσης", five red "Λείπει" boxes. I would think the app is broken.
- **The demo is read-only.** On the Demo farm, "+ Ανάθεση δουλειάς" is greyed out with no reason given, and Νέος ψεκασμός and Καταγραφή συγκομιδής are hidden. I can't *try* the main flow before trusting it with my own data.
- When I closed and reopened the app, it was back on the empty "Το κτήμα μου". The demo seemed to have disappeared until I found the farm switch under Άλλα.
- The crop list shows Latin names ("Eruca vesicaria subsp. sativa") under each crop. That is noise for me.
- The planting date field is a native `type=date`. Headless Chromium showed `11/19/2026` (US order). On iPhone it follows the region setting, so check it on Bora's phone. Ideally show "Πέμ 19 Νοε" next to it.

**What would make me pay (my words):** my own crops, a spray register the inspector (ΔΑΟΚ/ΟΠΕΚΕΠΕ) accepts as-is, and orders → crates → delivery on one phone. A fair price is "less than one crate of spinach a month". The waiting-period safety is the selling point: say it on the first screen.

---

## Persona 2: wholesale/greengrocer client and delivery driver

**Who I am:** Νίκος, μανάβικο in Μέγαρα, and Σάκης, who drives the van at 05:30. We get a Viber message from Bora every morning: what goes to whom, how many κλούβες.

**What I tried**
- Searching Aloni for any copy, share, print or dispatch view. I grepped the source: there is no `navigator.clipboard` or `navigator.share` anywhere in `app/src`.
- More → "Παραγγελίες και διαθέσιμες κλούβες" with a Κλούβες backup holding 3 clients and 21 crates. The same day in Κλούβες, plus its "Αντιγραφή κειμένου για τους υπαλλήλους".

**What delighted me (in the old Κλούβες, not Aloni)**
- A per-client card with a phone number, a ☎ Κλήση button, and ½-crate amounts (`21-klouves-clients-day.png`).
- Product totals with "who gets it" under each line, tick-off as prepared, a progress bar, and a cross-check: "Σελίδα πελατών 21 = Σελίδα ειδών 21 ✓" (`22-klouves-product-totals.png`).
- One-tap copy text:
  ```
  Πέμπτη 19/11
  Σπανάκι → 4½
  Άγρια → 5
  …
  = 21 κλούβες
  ```

**What blocked or confused me**
- **Aloni has nothing shareable.** No dispatch list, no per-client view, no copy text. The orders screen is only *weekly totals per crop*, not today and not per client. So Bora must keep Κλούβες for the morning message, and the driver gets nothing from Aloni.
- **Even Κλούβες' copy text is per product, not per client.** The driver needs "Μανάβικο Νίκος: Σπανάκι 3, Μαϊντανός 2, Κρεμμύδι ½" grouped by drop. Neither app gives that.
- After the import, 3 of 15 products ("Κρεμμύδι", "Ραδίκια", "Άγρια") did not auto-map, because Aloni names them "Κρεμμύδι (φρέσκο)" and "Ραδίκια άγρια". That makes 7½ of 21 crates (36%) silently "δεν μετριέται". The mapping is 15 dropdowns × 17 options at the bottom of the page (`12-orders-after-klouves-import.png`).
- **In the Demo farm every crop shows "Έτοιμες για κοπή: — άγνωστο φυτεύσεις" and "Υπάρχουν παραγγελίες, αλλά καμία φύτευση δεν μεγαλώνει"**, while the Καλλιέργειες tab shows Σπανάκι/Ρόκα "Σε συγκομιδή". Cause: the prototype crop rows imported for the demo have no `slug` (`data.json` crops use `id: 'spinach'`), so `supplyByCrop` can't match them. The feature looks broken in the demo.
- Wording and numbers: "1 κλούβες" should be "1 κλούβα". Aloni shows "4,5 κλούβες" where Κλούβες shows "4½", so the same order looks different in the two apps.
- Harvest crates go up in whole crates only (−1/+1, `HarvestForm`), but orders are in ½ and ¼. Supply and demand can't be compared at the half-crate level.

---

## Persona 3: young farmer (Greek, 26, Revolut/Wolt habits)

**Who I am:** Took over my dad's 15 στρ. I expect instant, swipeable, back-gesture-friendly apps that feel alive.

**What I tried**
- Tab switching speed, the iOS-style back gesture (browser back), landscape, EN/TR/HI switching, worker view, offline reload, scrolling Today.

**What delighted me**
- It's fast: tab switches render in ~25–55 ms, and the cold load took ~650 ms locally. The dark-green "Το πιο σημαντικό σήμερα" hero card with one clear CTA feels modern (`13-today-demo-above-fold.png`).
- The worker view is clean: big ✓ Έγινε / ✗ Δεν έγινε buttons, "Το προϊόν και η δόση ορίζονται από τον υπεύθυνο", and a 🔒 for re-entry (`15-worker-view.png`).
- No horizontal scroll in landscape (812 px). Commissioner font and the 56 px tab bar are good.

**What blocked or confused me**
- **Back gesture leaves the app.** Opening a parcel and pressing browser back went to `about:blank` (history.length = 2). In-app navigation never pushes history, so on Android and in Safari the swipe-back exits. Only the on-screen "Επιστροφή" works.
- Today is 2,540 px tall in the demo (3+ screens). The weather card alone takes a full screen. Wolt-style apps put "what do I do now" first and fold the rest.
- Forms are long single scrolls of chip grids (17 crop chips). There's no search, no "recent crops" and no sticky summary.
- The bottom tab labels "Καλλιέργειες" and "Χωράφια" run into each other at 375 px (`01-first-run-el.png`, bottom bar).
- Dated touches:
  - The planned-job line shows an ISO date: "Υδροξείδιο του χαλκού 35% WG · Ahmet · 2026-11-18". This breaks the Greek-format rule, and "2026-11-18" for a 26-year-old reads like a log file.
  - The weather card label says "μέγιστη / ελάχιστη" but shows "0–15,7°" (min first).
  - EN is inconsistent: the step says "Add a field" but the button says "Add a parcel" and the tab "Parcels".
- No haptic or animated feedback when a job is marked done. The toast is fine but flat.

---

## Findings table

| id | persona | screen | problem | severity | proposed fix | effort |
|---|---|---|---|---|---|---|
| F-01 | P1 | Planting form / crop catalog | Crop list is hard-coded to Bora's 17 (`crops/catalog.ts`). A neighbour can't add μαρούλι, ντομάτα etc., so he can't pilot. | BLOCKER (for pilot) | Add "+ Άλλη καλλιέργεια" to the planting form: free-text Greek name → crop row with `slug: custom-<uuid>`, `latin: ''`, no agronomic data. Keep the catalog as quick picks. Add μαρούλι to the catalog. Never attach doses or PHI. | M |
| F-02 | P2 | Orders (Άλλα → Παραγγελίες) | No copy, share or dispatch output anywhere in Aloni (no `clipboard` or `share` in `app/src`). The orders screen is weekly per crop, not today per client. | MAJOR | Add a "Σημερινή αποστολή" card from the imported Κλούβες day: per client (name, ☎, items with ½/¼) plus totals. Add a "Αντιγραφή για οδηγό" button using `navigator.share` with a clipboard fallback, the same pattern as Κλούβες. Read-only from the backup. | M |
| F-03 | P2 | Orders, Demo farm | Every crop shows "— άγνωστο φυτεύσεις" and "καμία φύτευση δεν μεγαλώνει" although the demo has spinach and rocket in harvest. The demo crop rows lack `slug`. | MAJOR | In `import-demo.ts`, set `slug` = prototype crop `id` (they match catalog slugs), or let `supplyByCrop` fall back to the catalog's `el` name. Add a golden test: demo plus a sample backup gives a non-zero `free` for spinach. | S |
| F-04 | P2 | Orders mapping | "Κρεμμύδι", "Ραδίκια" and "Άγρια" don't auto-map, so 7½ of 21 crates (36%) are not counted. The mapping UI is 15 dropdowns at the page bottom. | MAJOR | Add Κλούβες aliases to the catalog (`aliases: ['Κρεμμύδι','Ραδίκια']`). Put unmapped products at the top in a warning card ("3 είδη δεν μετριούνται: αντιστοίχισε"). Show only those dropdowns until done. "Άγρια" stays manual: never guess. | S |
| F-05 | P1 | Today / Parcel | An empty parcel counts as "Χωράφια χωρίς αναμονή σήμερα" and says "Κοπή: δεν υπάρχει καταγεγραμμένη αναμονή". This reads like a green light with nothing planted. | MAJOR | When a parcel has no growing planting, show "Χωρίς φύτευση" and exclude it from the "χωρίς αναμονή" KPI. | S |
| F-06 | P1 | Άλλα → Ρυθμίσεις και σύνδεση | Go-live checklist shows DB and migration jargon ("αλλαγές έως 0026", "πίνακα της βάσης") and 5 red "Λείπει" boxes to farmers. | MAJOR | Hide the developer confirmations behind an owner-only "Για τον τεχνικό" disclosure. For a farmer, show one line: "Η εφαρμογή δουλεύει μόνο σε αυτό το τηλέφωνο. Η σύνδεση λογαριασμού έρχεται σύντομα." | S |
| F-07 | P1 | Demo farm | Demo is read-only: "+ Ανάθεση δουλειάς" is disabled with no reason, and spray and harvest buttons are hidden. A pilot can't try the core flow. | MAJOR | Allow writes in the demo (it is a separate farm id, so data never mixes), with "Επαναφορά επίδειξης" to reset. If writes stay off, show the reason next to the disabled button. | M |
| F-08 | P3 | All | In-app navigation doesn't use history. Browser or Android back and Safari swipe-back exits the app (`about:blank`). | MAJOR | `history.pushState` on tab or detail open, and `popstate` → close the detail or form (ask before discarding a dirty form). | M |
| F-09 | P1 | Today CTA | "Προσθήκη χωραφιού" on the empty Today opens an empty list, not the form. Two taps for the first action. | MINOR | Set the Parcels tab state to `adding=true` when coming from that CTA. | S |
| F-10 | P1/P3 | Today → Σημερινές δουλειές | The job line shows an ISO date "2026-11-18". | MINOR | Format with the existing Greek date helper ("Τετ 18 Νοε"), or say "χθες"/"εκκρεμεί από Τετ 18 Νοε". | S |
| F-11 | P1 | Planting form | A single parcel isn't preselected. The error is shown far above Save, and unsaved input is lost when switching tabs. | MINOR | Preselect when `parcels.length===1`. Scroll to the first error. Add an "Add planting" button on the parcel page that preselects that parcel. | S |
| F-12 | P1 | Banners | The "no backup" warning appears right after the very first record. Two permanent banners take ~140 px on every screen. | MINOR | Show the backup nag only after ≥7 days *since the first record*, on Today only, and dismissible per day. Merge it with the "saved on phone" banner. | S |
| F-13 | P1 | Reopen app | The app reopens on the empty "Το κτήμα μου" even when the user was in the demo, so the demo seems gone. | MINOR | When the real farm is empty and the demo exists, reopen on the last active farm, or show "Συνεχίστε στην επίδειξη" on the empty Today. | S |
| F-14 | P2 | Orders / Harvest | "1 κλούβες" (plural bug). "4,5 κλούβες" vs Κλούβες' "4½". Harvest is whole crates only while orders are in ¼ steps. | MINOR | Use an ICU plural (κλούβα/κλούβες). Show crate fractions as ½/¼/¾ (display only, no rounding of stored values). Consider ½ steps in the harvest stepper (Bora decides). | S |
| F-15 | P1 | Own-farm weather | Weather card is a grid of 15 "—" with no explanation. | MINOR | Without data, collapse to one line: "Ο καιρός θα εμφανιστεί όταν συνδεθεί ο λογαριασμός." | S |
| F-16 | P3 | Today | 2,540 px Today. Weather takes a full screen before the KPIs and jobs. | MINOR | Order as hero → today's jobs → parcels. Collapse weather to one row (today + wind/gust), expand on tap. | M |
| F-17 | P3 | Bottom nav | "Καλλιέργειες" and "Χωράφια" labels touch at 375 px. | POLISH | Shorten to "Φυτείες", or allow a 2-line label / smaller letter-spacing. | S |
| F-18 | P3 | Weather card | Label "μέγιστη / ελάχιστη" but the value shows min–max ("0–15,7°"). | POLISH | Make the label "ελάχιστη – μέγιστη", or show "15,7° / 0°". | S |
| F-19 | P3 | EN copy | "Add a field" vs "Add a parcel" vs "Parcels". | POLISH | Pick "Field(s)" throughout en.json. | S |
| F-20 | P1 | Crops list | A Latin binomial under every crop name. | POLISH | Move it to crop detail only. | S |

---

## Κλούβες vs Aloni – what the old app did better

1. **The daily, per-client view**: one card per client with ☎ Κλήση. Aloni has no client concept at all.
2. **A numpad order sheet** (1–9, ½, ⌫ + product chips, `20-klouves-numpad-order-sheet.png`). Entering "3 Σπανάκι" takes 2 taps. Aloni's forms take 6–10 taps and a scroll.
3. **Self-checking totals** ("οι δύο σελίδες συμφωνούν") and a **prepared ✓ + progress bar**. This is a morning packing checklist that workers can use.
4. **Copy text for workers** in one tap with a selection fallback. Aloni has nothing to copy or share.
5. **"Αντιγραφή προηγούμενης μέρας"**: regular clients repeat orders. Aloni's form defaults don't learn from history.
6. **Day navigation ‹ ›** at the top: simple, fast, obvious.

Where Aloni is better: waiting-period safety, an append-only audit trail, the worker view, multilingual (incl. Hindi), and the offline service worker.

---

## Top 5 decisions to push for at the meeting (ranked)

1. **Custom crops before any neighbour pilot (F-01).** Free-text crop name only, no agronomic defaults. Without it the pilot can't start.
2. **A "Σημερινή αποστολή" view plus a share button (F-02, F-04).** Per client, from the Κλούβες import, with one-tap Viber/WhatsApp share for the driver. This is the most-used morning action and the reason Bora would open Aloni daily. Fix the alias mapping in the same PR.
3. **Fix the demo so it sells the product (F-03, F-07, F-13).** Make it writable in its own farm, fix the missing crop slugs, and reopen in the demo. The demo is the pilot's first impression, and today it looks broken or locked.
4. **Hide the developer go-live checklist from farmers and clean up the empty-state copy (F-06, F-12, F-15, F-05).** Make sure an empty parcel never reads like "cut freely".
5. **Native-feeling navigation (F-08, F-09, F-16).** Make the back gesture work, have CTAs open forms directly, and fold Today to one screen. This is what makes the 26-year-old keep it.
