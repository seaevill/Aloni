# Beta 2: "owner" group (Aloni @ d21df3d)

Tested on 2026-11-19 against a local `vite preview` of `app/dist` (port 4101). I used Playwright Chromium at 375×812 (plus 812×375 landscape and 320 wide), with locale el-GR and timezone Europe/Athens. I tried both the **Demo farm** and **Το κτήμα μου**. In my own farm I created test data: 1 parcel, 2 plantings, 1 product with label data, 1 stock lot, 6 workers, 1 spray, 3 harvests and 2 jobs, and I imported a hand-made Κλούβες backup. Screenshots are in `LAB/shots/owner/` (LAB = `/tmp/claude-0/-home-claude/c6073d90-877c-5449-adb1-dbd4033f7fd0/scratchpad/lab`).

---

## 1. Personas

### 1a. Bora: owner and manager (main persona)
**Who I am:** 35, I run 38 στρ. of greens from my iPhone between the field and the phone. At 06:30 I want to know in 10 seconds what to do today, what I can cut, what goes out tomorrow morning, and what is in stock.

**What I tried**
- First start, then loading the demo and reading Today. I reloaded and found myself back on an empty "Το κτήμα μου".
- In my own farm: added a parcel with a long name (Βορειοανατολικό Αγροτεμάχιο Παραλιμνίου, 2,5 στρ.), then spinach 1,5 στρ. and rocket 1 στρ., both "Σε συγκομιδή".
- Added a product (Μυκητοκτόνο, L), its spinach label data (62,5 ml/στρ., PHI 7 d, REI 24 h, max 3) and a 1 L lot.
- Recorded a spray: first on spinach + rocket together (refused), then on spinach only.
- Tried to harvest spinach (blocked) and rocket (allowed). Entered the spray's PHI through "Καταχώριση αναμονής".
- Imported a Κλούβες backup with orders for Fri 20 and Sat 21 Nov for two clients.
- Opened the spray register and downloaded all 3 CSVs.
- Went offline, reloaded and logged a harvest. Tried landscape, 320 px, Turkish and the back gesture.

**What delighted me**
- **Offline is solid.** A reload with no network still opens the app, a harvest saved while offline counts straight away, and the "Εκτός σύνδεσης" banner is clear (`14-offline-reload-ok.png`).
- **The harvest gate is clear and safe.** A blocked planting gives a red lock and the button is disabled (`05-harvest-blocked-spinach.png`).
- **Doses stay exactly as typed.** 62,5 and 0,025 show as typed everywhere.
- **Undo toasts on every save** and archiving instead of deleting. That is reassuring.
- The Turkish translation is natural, including "dönüm".

**What blocked or confused me**
- **Today does not answer my four questions.** On the first screen I see two banners, a PHI notice and an empty weather box (`01-today-first-screen.png`). "Νέος ψεκασμός" and "Καταγραφή συγκομιδής" are about 3 screens down, and nothing tells me what I can cut today or what to send tomorrow.
- **The orders screen counts the whole week only** ("Αυτή την εβδομάδα: 14 κλούβες"). It cannot tell me *tomorrow, Λαϊκή Νίκαιας: 6 σπανάκι, 4½ ρόκα*.
- **I typed the PHI on the label, and right after the spray the app said "Άγνωστη αναμονή … καταχωρίσετε την αναμονή από την ετικέτα"**, then asked me to type 7 and 24 again. The reason (the label is not signed by an agronomist) is never said in that message.
- **The whole parcel shows "Η συγκομιδή είναι μπλοκαρισμένη"**, yet I could harvest the rocket in it.
- **"Αποθήκη" means pesticide stock.** My produce stock (crates cut but not yet sent) is not in the app anywhere.
- **The spray did not reduce my stock.** The only lot was not preselected and the lot field is "optional", so I still had 1 L.

### 1b. Επιστάτης / foreman (Greek, 50, 6 workers)
**Who I am:** I hand out the day's work to six men, mostly Punjabi speakers. In the evening I need to see who did what. I don't read small print.

**What I tried**
- Added 6 workers.
- Assigned jobs: rocket for tomorrow to Harpreet, spinach for today to Gurpreet.
- Opened the demo worker view in Greek, Hindi and Turkish.
- Read "Σήμερα έγιναν".

**What delighted me**
- Adding workers is fast, and the note "Μόνο το όνομα" is honest.
- The worker card is good: product, crop, parcel and dose are fixed, "Το προϊόν και η δόση ορίζονται από τον υπεύθυνο", and there is a red re-entry warning.
- "Σήμερα έγιναν" shows "Rajinder Singh: ψέκασε …" and the crates cut.

**What blocked or confused me**
- **Only spray jobs exist.** I cannot assign harvest, weeding, irrigation or planting, and only one worker can go on a job.
- **The job form uses past tense for a future job:** "Φυτεύσεις που ψεκάστηκαν", "Ποιος ψέκασε", "Δόση που εφαρμόστηκε" (`07-job-form-past-tense-no-label.png`).
- **The job list says "Δοκιμαστικό Μυκητοκτόνο 25 SC · Harpreet Singh · 2026-11-20"** with no crop, no parcel and an ISO date. Tomorrow's job sits under "Σημερινές δουλειές", and overdue jobs from yesterday look the same as today's (`06-today-jobs-no-crop-context.png`).
- **I was able to assign a spray on rocket even though the product has no label data for rocket.** I saw a red "ΑΠΟΚΛΕΙΣΜΕΝΟ" badge, typed 50 ml/στρ., and it saved.
- There is no per-worker view of "what did Harpreet do this week".
- The worker view only exists in the Demo farm, so on Bora's real farm I cannot preview what a worker sees.

### 1c. Γεωπόνος / agronomist (compliance, EU 2023/564)
**Who I am:** I sign Bora's label data and rule thresholds, and I check that his spray register would pass an inspection. I need to be sure the app never pretends.

**What I tried**
- Read the label sign-off screen and the rules list in Άλλα.
- Read the register on screen.
- Downloaded the Excel CSV, the machine CSV and the warnings CSV.
- Looked at how amendments show up in the history and the register.

**What delighted me**
- **The register is honest.** It carries a "ΠΡΟΣΧΕΔΙΟ … δεν είναι υπογεγραμμένο" banner, a list of what is still missing (ΟΣΔΕ, BBCH, authorization no., EPPO, start time) and a signature line.
- **The CSVs are well built:**
  - the Greek CSV has a BOM, `;` separators and decimal commas;
  - the machine CSV has start and end in ISO with +02:00, the EPPO code (SPQOL) and a correct conversion (62,5 ml/στρ. → 0.625 L/ha);
  - the warnings CSV lists `label_unsigned`, `missing_iacs_parcel_id` and `missing_bbch_stage` (`10-register-own-farm.png`).
- **The sign-off wording is right.** It says "Καταγράψτε μόνο υπογραφή που έχετε πράγματι … αν αλλάξετε κάποια τιμή, η υπογραφή σβήνεται".
- **Unsigned labels never decide a PHI.** Amendments are append-only and keep the original id ("Διορθώνει την εγγραφή").

**What blocked or confused me**
- **I cannot sign any of the 16 rules.** Άλλα → "Κανόνες και ειδοποιήσεις" lists them all as "Χωρίς έγκριση γεωπόνου", but there is no screen showing the `[SET]` thresholds and no way to record my approval. The UI only reads `rule_signoffs`; nothing writes it.
- **The applied dose is prefilled from the label** (62,5 appears as soon as the product is chosen). A register line can therefore show the label dose even when the sprayer used something else.
- **The Greek CSV and the print show only the end time.** The start time (which I entered as 08:00) is only in the machine CSV.
- **"Ποσότητα που χρησιμοποιήθηκε" is empty** when no lot is chosen.
- **The authorization number is optional when a product is created.** It is flagged later in the register, but nothing asks for it when it matters.
- **The amendment trail reads "Αρχική καταχώριση: δόση 62,5"** with no unit.

---

## 2. Findings

| id | persona | screen | problem (what I did / saw) | severity | proposed fix | effort |
|---|---|---|---|---|---|---|
| OW-01 | Owner | Σήμερα | On the first 812 px I see 2 banners, the date, a PHI hero and the weather box. On my own farm without a map location the weather is all "—". The actions (Νέος ψεκασμός / Καταγραφή συγκομιδής) and jobs are about 2,000 px down. Nothing answers "what can I cut today" or "what goes out tomorrow". | MAJOR | Reorder Today: (1) a "Κοπή σήμερα" card listing plantings that can be cut (green) and held ones with the date they free up; (2) "Αύριο φεύγουν" with crates per crop from the Κλούβες import for tomorrow; (3) today's jobs; (4) two big action buttons. Move weather and KPIs below. Fold the two banners into one slim line. | M |
| OW-02 | Owner / Agronomist | Ιστορικό / Today hero | I recorded a spray with full but **unsigned** label data (PHI 7). It then showed "Άγνωστη αναμονή… μέχρι να καταχωρίσετε την αναμονή από την ετικέτα" and the CTA asked me to retype PHI/REI in empty fields (`04-unsigned-label-phi-unknown.png`). | MAJOR | Keep it blocked, but change the message for `label_unsigned` to say "Η ετικέτα δεν έχει υπογραφή γεωπόνου". Offer two paths: (a) "Καταγραφή υπογραφής γεωπόνου" (link to the label), and (b) owner entry, where the label values sit **beside** the empty fields for reference. Bora still types them himself, so no prefill. | S |
| OW-03 | Owner | Σήμερα parcel card | One unknown PHI on spinach makes the whole parcel read "Κοπή από: άγνωστο. Η συγκομιδή είναι μπλοκαρισμένη". The rocket in the same parcel was then harvested without any problem. That contradicts the card. | MAJOR | Show one line per planting on the parcel card: "Ρόκα: ελεύθερη · Σπανάκι: αναμονή έως Πέμ 26 Νοε". Keep the parcel headline as "1 από 2 μπλοκαρισμένη". | S |
| OW-04 | Owner | Άλλα → Παραγγελίες | The Κλούβες import is aggregated per **week** ("Αυτή την εβδομάδα: 14 κλούβες"). There is no per-day or per-client view, so the app cannot say what to send tomorrow (`08-orders-weekly-only.png`). | MAJOR | `parseBackup` already reads `klv.db.day.YYYY-MM-DD`. Keep a day → client → product map as well, and add a "Αύριο" / "Σήμερα" tab: per client, crates per crop, with a supply check (crops still held by PHI shown in red with their free date). | M |
| OW-05 | Owner / Agronomist | Παραγγελίες (demo vs real) | A Κλούβες backup imported in **Το κτήμα μου** also appears in the **Demo farm**. There the supply lines read "— άγνωστο φυτεύσεις … καμία φύτευση δεν μεγαλώνει" even though the demo has spinach in harvest (`09-orders-real-import-shown-in-demo.png`). This mixes real and demo data and breaks safety rule 4. | MAJOR | Store the import and the crop map keyed by `farm_id`. Demo gets its own fictional Κλούβες sample. Add a test: an import in farm A is not visible in farm B. | S |
| OW-06 | Owner | Νέος ψεκασμός → Αποθήκη | A spray saved without tapping the lot (the product had a single lot, L2611, which was not preselected) leaves stock at 1 L and "Ποσότητα που χρησιμοποιήθηκε" empty in the register. Stock silently drifts. | MAJOR | Preselect the lot when the product has exactly one non-expired lot. Make the quantity used mandatory unless "δεν ξέρω" is ticked, which then adds a `quantity_unknown` warning. Show dose × area as a **hint only** ("για 1,5 στρ. × 62,5 ml = 93,75 ml"), never auto-filled. | S |
| OW-07 | Agronomist | Νέος ψεκασμός | Choosing a product with a single-dose label **fills "Δόση που εφαρμόστηκε" with the label dose** (`SprayForm.tsx:72`). The register can then claim the label dose was applied when nobody typed it. | MAJOR | Leave the applied dose empty. Show the label dose next to it ("Ετικέτα: 62,5 ml/στρ.") with a one-tap "ίδια με την ετικέτα" button, so the user's tap is recorded. Keep the unit preselection. | S |
| OW-08 | Foreman / Agronomist | Ανάθεση δουλειάς | A job on rocket with a product that has **no label data for rocket** was saved after I typed 50 ml/στρ. The "ΑΠΟΚΛΕΙΣΜΕΝΟ – δεν υπάρχουν στοιχεία ετικέτας" badge did not stop it. Planning an off-label spray should not be one tap away. | MAJOR | In `buildJob`, refuse `label_none` / `label_blocked` and show the message "Δεν μπορείτε να αναθέσετε: λείπουν τα στοιχεία ετικέτας για Ρόκα". Recording a spray that already *happened* stays allowed and flagged, as today. | S |
| OW-09 | Agronomist | Άλλα → Κανόνες | All 16 rules show "Χωρίς έγκριση γεωπόνου", but there is **no UI to see their thresholds or record approval**. Nothing writes `rule_signoffs`, so every rule stays info-only forever. | MAJOR | Add Άλλα → Κανόνες → per rule: its `[SET]` thresholds read-only from `/rules/*.json`, plus "Καταγραφή έγκρισης γεωπόνου" (name, date, optional photo of the signed sheet). The same rule as labels applies: changing any threshold removes the approval. Add a printable "rules awaiting signature" page. | M |
| OW-10 | Foreman | Ανάθεση δουλειάς / Σήμερα | Only spray jobs exist and each takes one worker. The job list shows "product · worker · 2026-11-20" with no crop or parcel and an ISO date. Tomorrow's jobs sit under "Σημερινές δουλειές", and yesterday's overdue jobs look like today's. | MAJOR | (1) Job line: "Σπανάκι · Βορειοανατολικό… · Gurpreet · Πέμ 19 Νοε". (2) Split the list into "Καθυστερημένες" (red), "Σήμερα" and "Αύριο". (3) Next milestone: job kinds harvest / weeding / irrigation / other, plus multi-worker selection. | M |
| OW-11 | Foreman | Ανάθεση δουλειάς | The form reuses past-tense spray labels for a plan: "Φυτεύσεις που ψεκάστηκαν", "Ποιος ψέκασε", "Δόση που εφαρμόστηκε". | MINOR | Add job keys: "Φυτεύσεις για ψεκασμό", "Ποιος θα ψεκάσει", "Δόση προς εφαρμογή" (el/tr/en/hi). | S |
| OW-12 | Owner | all | The browser/OS back gesture from any sub-screen (Ψεκασμοί, forms) **leaves the app** (url → about:blank in the test). On Android and in Safari this loses a half-filled form. | MAJOR | Push a history entry when a sub-screen or form opens and close it on `popstate`. For forms with typed data, confirm "Να φύγω χωρίς αποθήκευση;". | M |
| OW-13 | Owner | Αποθήκη | Ακεταμιπρίδη shows "Λήξη: 31 Οκτωβρίου 2026" (already expired) and "Υπόλοιπο: −0,2 kg" as plain grey text. There is also an unlabelled first quantity ("0,3 kg") next to "Υπόλοιπο" (`11-stock-expired-negative-no-warning.png`). | MINOR | Red "Έληξε" badge when expiry < today; amber "Λήγει σε N ημ." using the existing 60-day setting; red "Αρνητικό υπόλοιπο – κάντε προσαρμογή". Label the first number "Συσκευασία:". Sort problems to the top. | S |
| OW-14 | Owner | Αποθήκη (naming) | "Αποθήκη" is pesticide/fertiliser stock only. Crates cut but not yet sent (the stock Bora means when he says "stock") are not tracked anywhere. | MINOR | Rename the tab "Φάρμακα & λιπάσματα" (short form "Εφόδια"). Put the produce question on the meeting agenda; for now Today can show "κόπηκαν σήμερα − φεύγουν αύριο". | S |
| OW-15 | Agronomist | Μητρώο (Greek CSV and print) | Only the end time appears ("Ημερομηνία και ώρα: 2026-11-19 09:10"). The start time (08:00), water and lot are missing, though the machine CSV has them. | MINOR | Add the columns "Έναρξη", "Λήξη", "Παρτίδα" and "Νερό (L)" to the Greek CSV and the print view. | S |
| OW-16 | Agronomist | Προσθήκη προϊόντος | "Αριθμός έγκρισης (προαιρετικό)": a product can be used for months without it, and the gap only shows up in the register. | MINOR | Keep it saveable, but show a yellow "Λείπει αριθμός έγκρισης (υποχρεωτικός στο μητρώο)" on the product card and in the spray form, and list such products at the top of the register. | S |
| OW-17 | Agronomist | Ιστορικό amendment | "Αρχική καταχώριση: δόση 62,5, 19 Νοε, 09:10" has no unit. | MINOR | Render the original's dose with its unit ("62,5 ml/στρ."). | S |
| OW-18 | Owner | Νέος ψεκασμός | I chose spinach + rocket. The label box showed only the first crop's label as if it covered both. Save then showed two errors in the middle of the long form, including a generic "Συμπληρώστε ό,τι λείπει…" even though nothing was missing, and the page did not scroll to them. | MINOR | Disable planting chips of a different crop once one is chosen (with the hint "μία καλλιέργεια ανά καταχώριση"). On a failed save, scroll to and focus the first error. Show the generic message only if a field is really empty. | S |
| OW-19 | Owner | Σήμερα (own farm) | The weather is all "—" with the note "Δεν υπάρχουν ακόμα δεδομένα καιρού". It doesn't say that the parcel needs a map location or GPS point. | MINOR | When no parcel has geometry, show "Βάλτε θέση στο χωράφι (Χωράφια → Θέση από το GPS) για να δείτε καιρό" with a button. | S |
| OW-20 | Owner | Άλλα → Σύνδεση λογαριασμού | Developer items are shown to Bora: "Επιβεβαιώνω: εφαρμόστηκαν οι αλλαγές έως 0026", "έλεγχος προειδοποιήσεων στον πίνακα της βάσης". | MINOR | Hide the two migration confirmations behind a "Για τον προγραμματιστή" disclosure. Leave Bora's three items (στοιχεία υπευθύνου, όνομα κτήματος, ΑΦΜ) with direct links. | S |
| OW-21 | Owner | all screens | After the first save, two banners ("Αποθηκεύτηκε στο τηλέφωνο…" and "Δεν υπάρχει πρόσφατο αντίγραφο…") take about 110 px at the top of every screen, plus the demo banner in the demo. | MINOR | Merge them into one 1-line status chip ("Μόνο στο τηλέφωνο · αντίγραφο: ποτέ ›") that opens Backup. Make the backup reminder dismissable for 24 h. | S |
| OW-22 | Owner | Άλλα → farm switch | The selected farm is not remembered. Each reload or relaunch lands on "Το κτήμα μου", and once own data exists the demo can only be reached through Άλλα. | MINOR | Remember `activeFarm` in `settings` (as `worker_view` already is), keeping the Demo banner on every screen. Alternatively, keep the current safe default and add "Συνέχεια στην επίδειξη" on Today. Decision for the meeting. | S |
| OW-23 | Owner | Demo farm | In the demo, Νέος ψεκασμός and Καταγραφή συγκομιδής are hidden and Ανάθεση is disabled, yet the demo **worker view** can log harvests. Bora cannot rehearse the owner's day in the demo. The disabled Ανάθεση button also looks fully active (opacity 1) (`13-demo-disabled-button-looks-active.png`). | MINOR | Either allow owner writes in the Demo farm (they stay in DEMO_FARM_ID, just as worker-view writes already do), or show "Στην επίδειξη μόνο προβολή" instead of a dead button. Style `.btn:disabled` with opacity .45. | S |
| OW-24 | Foreman | Worker view (hi) | In Hindi the REI warning appears twice: in Hindi, then again in Greek. The dose reads "Δόση: 0.2 kg/στρ." with a Greek label and unit (`12-worker-view-hindi.png`). | MINOR | Drop the Greek duplicate line (or keep it only behind a "Ελληνικά" toggle for the foreman). Translate "Δόση" and add a unit gloss ("στρ. = 1000 m²"). | S |
| OW-25 | Foreman | Workers | There is no per-worker history (jobs done or not done, crates) and no real-farm preview of the worker screen. | MINOR | Workers → tap a name → last 7 days: jobs ✓/✗, sprays, crates. Allow "Προβολή εργάτη" on the real farm as read-only preview. | M |
| OW-26 | Agronomist | Harvest gate | Rocket was harvested 1 h after spinach **in the same parcel** was sprayed (REI 24 h, at that moment unknown/unsigned). The gate only looks at sprays on that planting. Whether REI covers the parcel or only the treated beds is an agronomic decision. | MINOR | Ask the agronomist. If REI covers the parcel, use `fieldLock` (already used for worker jobs) in the harvest gate too. | S |
| OW-27 | Agronomist | Label sign-off | The sign-off is a name and a date only, one label at a time. There is no evidence and no "everything awaiting signature" list for one visit. | MINOR | Add an optional photo of the signed sheet. Add an Άλλα → "Προς υπογραφή" page listing all unsigned labels and rules, printable, with "υπογράφηκαν όλα στις …" recorded per row. | M |
| OW-28 | Owner | Παραγγελίες | Grammar and placeholders: "Έτοιμες για κοπή: 1 φυτεύσεις", "— άγνωστο φυτεύσεις · … — άγνωστο κλούβες". The crop-mapping section lists 4 long native selects. | POLISH | Use `plural.ts`. Replace "— άγνωστο X" with "δεν υπάρχει φύτευση". Collapse the mapping under "Αντιστοίχιση (4) ›". | S |
| OW-29 | Owner | Καταγραφή συγκομιδής | The planting chips don't show which plantings are blocked until you tap one. Workers see every planting of the farm. | POLISH | Put a small 🔒 or a date on blocked chips. Sort free plantings first. | S |

Screenshots (in `LAB/shots/owner/`): 01-today-first-screen, 02-today-demo-full, 03-spray-form-dose-prefilled-two-crops, 04-unsigned-label-phi-unknown, 05-harvest-blocked-spinach, 06-today-jobs-no-crop-context, 07-job-form-past-tense-no-label, 08-orders-weekly-only, 09-orders-real-import-shown-in-demo, 10-register-own-farm, 11-stock-expired-negative-no-warning, 12-worker-view-hindi, 13-demo-disabled-button-looks-active, 14-offline-reload-ok.

Things that worked well and should stay as they are:
- no JS errors on any screen;
- no horizontal scroll at 320 px or in landscape;
- the long Greek parcel name wraps cleanly;
- the decimal comma is accepted;
- the label dose is never rounded;
- an unknown PHI blocks the harvest.

---

## 3. Top 5 decisions to push for at the meeting (ranked)

1. **Rebuild Today around Bora's 4 questions** (OW-01, OW-03, OW-04): "Κοπή σήμερα" per planting, "Αύριο φεύγουν" per client from the Κλούβες days, then today's/overdue/tomorrow's jobs, then the two big actions. Weather and KPIs move below. This is the 10-second test, and right now it fails.
2. **Unsigned labels: keep blocking, explain it, and give the agronomist a way to sign** (OW-02, OW-09, OW-27). Build a rules sign-off screen and a printable "Προς υπογραφή" list. Without these, every real spray blocks the parcel, and Bora learns to work around the app by retyping values.
3. **The register must reflect what really happened** (OW-07, OW-06, OW-15): no prefilled applied dose, lot preselected or quantity required, and start time / lot / water in the Greek export. These are the S-sized fixes that most affect whether the register would hold up in an inspection.
4. **No planned spray without label data, and per-farm storage for orders** (OW-08, OW-05). Both are safety-rule issues (off-label planning; demo/real mixing) and each fix is small.
5. **Make it behave like an app on the phone** (OW-12, OW-21, OW-22/23): back gesture handled, one slim status line instead of two banners, and a decision on remembering the farm choice and whether the demo is writable for the owner.
