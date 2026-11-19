# Beta 2 – Worker group report (2026-11-19)

Build: `seaevill/Aloni@d21df3d`, `vite preview` on :4102, Chromium (Playwright) at 375×812, plus 188×406 for 200 % zoom. Demo farm only (LIVE off).
Screenshots: `LAB/shots/workers/` (filenames below).

---

## Persona 1 – Indian field worker, 28, Hindi

**Who I am:** Punjabi/Hindi speaker, reads Devanagari slowly, almost no Greek or English letters. Cheap Android phone, gloves or dirty fingers, strong sun. I need to do two things: log crates and mark sprays done or not done.

**What I tried**
- More → हिन्दी → Προβολή εργάτη (worker view). Worker picker, then the three tabs: काम / कटाई / निरीक्षण.
- Jobs: tapped हो गया on both jobs (both locked), then नहीं हुआ → हवा, used the 10 s undo, and waited for it to commit.
- Harvest: picked a crop, +1 fourteen times then −1, saved 13 crates. Tried saving with no crop chosen. Tried blocked plantings.
- Observation: saved one with nothing chosen, then a real one (Κάτω Κάμπος + कीट).
- Reloaded the app during the 10 s undo window.

**What delighted me**
- ✓ / ✗ / 🔒 symbols, 72 px buttons and a big counter (− 0 +). I can log crates without reading anything (`06-harvest-counter-hi.png`).
- Safety locks are shown in Hindi and Greek together, so a supervisor can read the same text (`02-worker-jobs-hi.png`). Blocked harvests have no override, and the save button greys out (`12-harvest-blocked-hi.png`).
- The core Hindi verbs are natural: हो गया / नहीं हुआ / क्यों नहीं हुआ? / बारिश / हवा / दवा नहीं है / वापस लें.

**What blocked or confused me**
- **I cannot read the things I have to choose.** Every product, crop, parcel and worker name is in Greek script: "Υδροξείδιο του χαλκού 35% WG", "Σέσκουλα · Πάχη Παραλιακό" (`02`, `05`). The harvest tab is 20 Greek-only buttons. `cropName()` maps `hi` to Greek on purpose (`crops/catalog.ts:30`). The labels "Δόση:" and the unit "στρ." are Greek too.
- In the demo I can never practise हो गया: both jobs are locked by an unknown re-entry period (`02`).
- Harvest list: two buttons both say "Ρόκα · Μεσαίο Χωράφι". One is PHI-blocked and the other is not, and nothing tells them apart (`05`). Cause: demo plantings import `sown` but the label reads `sown_on`, so the date never shows.
- If I tap दर्ज करें without choosing a crop, nothing happens: no message, no highlight (`11`). The same happens on the observation tab.
- I'm told "दर्ज हो गया" (saved), but the record is only written after 10 s. When I reloaded within 10 s, the skipped job came back, and an observation saved before a reload was lost: 0 rows in IndexedDB.
- The worker view has no language switch. A real worker account would open in Greek, because `initialLang()` ignores the phone language.

**Hindi review (as a native reader)**

| Key | Current | Problem | Suggested |
|---|---|---|---|
| worker.title | कर्मचारी दृश्य | Literal "worker view", developer jargon | आज का काम |
| worker.choose | कर्मचारी | Bare noun; it is really asking "who are you?" | आप कौन हैं? |
| worker.tab.observe | निरीक्षण | Formal "inspection", reads like an official check | खेत में क्या दिखा |
| worker.fixed | दवा और मात्रा मैनेजर तय करता है। यहाँ नहीं बदलती। | Subject of the second sentence is unclear | दवा और मात्रा मैनेजर तय करते हैं। आप इसे नहीं बदल सकते। |
| harvest.blocked.* | प्रतीक्षा अवधि | Bookish; workers won't know the term | कटाई से पहले रुकने के दिन |
| worker.lock.unknown | …वापस जाने की अवधि पता नहीं… | "वापस जाने" can read as "going back home" | छिड़काव के बाद खेत में कब जा सकते हैं, अभी पता नहीं। मैनेजर से पूछे बिना खेत में न जाएँ। |
| sync.local / worker.queued | खाता जुड़ने पर भेजा जाएगा | "When the account connects" means nothing to a worker | फ़ोन में सेव है। बाद में अपने आप चला जाएगा। |
| lang.review | Banner in two scripts on every screen | Noise, and it pushes jobs down | Show once in More/settings, not in the worker view |
| harvest.crates | क्रेट | Fine; many workers here say कैरेट | Keep it, and ask a native speaker |

Only 77 of about 633 keys exist in Hindi. The rest fall back to Greek, which is fine for owner screens but not for anything a worker can reach.

---

## Persona 2 – Greek seasonal worker, 60, 200 % text

**Who I am:** Retired field hand from Megara who has worked the season for years. I use the phone with the largest text. I read Greek fine, but small things and long screens lose me.

**What I tried**
- First open, demo, and the worker view at 188×406 CSS px (= 375 px at 200 %).
- The skip panel, the harvest tab, and scrolling.

**What delighted me**
- No sideways scrolling (scrollWidth = 188).
- The Greek wording is plain ("Έγινε / Δεν έγινε", "Το προϊόν και η δόση ορίζονται από τον υπεύθυνο").
- Doses use the Greek comma (0,2 kg/στρ.) and are not rounded.

**What blocked or confused me**
- Words break in the middle of syllables: "Γιώργ/ος", "Δο/υλε/ιές", "Συ/γκο/μιδ/ή", "Έγιν/ε", "Δεν/έγιν/ε", "επανεισόδο/υ" (`09`, `10`). The cause is `overflow-wrap:anywhere` in 2- and 3-column `.seg` grids.
- The sticky green "Καταγραφή" button covers about a sixth of the screen. It sits on top of the heading "Καταγραφή συγκομιδής" and hides the content under it (`10`). In the worker view there is no tab bar, so the `bottom: nav-h + 8px` offset leaves it floating in mid-air.
- Every font size is in px (`tokens.css`). iOS Dynamic Type has no effect on a PWA built like this, so on his iPhone "large text" changes nothing. Only browser zoom helps, and I doubt he knows how to use it.
- The red lock box becomes 8 lines of broken words, and the Done/Not-done buttons fall below the fold.

---

## Persona 3 – New worker, day one

**Who I am:** Hired yesterday. Bora sent a link. I don't know what "the app" is for, and I worry it tracks me or that I will break something.

**What I tried**
- Fresh profile, first open. Read the code paths for a real worker account (`App.tsx` `isWorkerAccount`, `SignIn.tsx`, `Info.tsx`).

**What delighted me**
- The demo banner is clear: "Επίδειξη – φανταστικά στοιχεία".
- Once a worker account exists, it is routed straight to the worker screens: no stock, prices or orders.
- The worker privacy notice text exists and says plainly "We do not track your location".

**What blocked or confused me**
- The first screen is the owner's onboarding: "Προσθέστε χωράφι / Φόρτωση επίδειξης" (`01`, `08`). There is no "I'm a worker" or "I got an invitation" path. To sign in I would have to find Άλλα → Ρυθμίσεις και σύνδεση, and those strings are Greek only.
- The worker privacy notice is only on the owner's Info screen. The worker never sees it, and it is not in Hindi. It is about 150 words of legal text.
- The disclaimer ("the decision… and responsibility for it rest with you, the user who applies it") is aimed at the owner. If it is ever shown to workers it will scare them. A worker version must not shift legal responsibility onto the worker.
- The demo worker picker shows "Γιώργος / Ahmet". Neither is an Indian name, and Γιώργος is in Greek script.
- On a shared phone, "Έξοδος από την προβολή εργάτη" drops the worker into all owner screens (stock, orders, delete demo) with no PIN.

---

## Cross-cutting tests

- **Offline in the field, then reconnect:** works. I went offline, saved a harvest, reloaded while offline (the service worker served the app, `13`), then came back online with no errors. The only feedback is "αποθηκεύτηκε στο τηλέφωνο". The worker view shows no offline badge (`sync.offline` exists but is not shown there). That is fine for now, but once LIVE is on the worker needs a "N not sent yet" line.
- **Imprecise taps:** the buttons are generous (56–72 px, 8 px gaps). The problem is the undo toast: it is fixed 72 px above the bottom and covers the next job's Έγινε/Δεν έγινε buttons for 10 s (`04`). A gloved tap meant for the next job can land on "वापस लें" (undo). Separately, tapping the locked Έγινε shows the lock reason under every locked job, not only the one tapped.
- **Outdoor contrast:** text is excellent (green on white 10.3:1, muted 11.1:1, lock badge white on #6e1708). Shapes are weak: button borders `--line` vs background are 1.34:1, and a white card vs the background is 1.14:1. WCAG 1.4.11 asks for 3:1. The selected crop or worker is shown only by a green border and bold text, with no fill, so in glare you cannot see what is chosen (`05`, `14`).

---

## Findings

| id | persona | screen | problem | severity | proposed fix | effort |
|---|---|---|---|---|---|---|
| W1 | 1,3 | Worker jobs / observation (10 s undo) | "दर्ज हो गया / Καταγράφηκε" shows immediately, but the record is written only when the 10 s timer fires. Reloading or killing the app inside 10 s loses it: the skipped job came back, and the observation was 0 rows after reload. A worker who pockets the phone loses data. | BLOCKER | Write the row at once with `status:'held'` (or into the outbox), then delete or amend it on undo. Alternatively, persist the pending action in Dexie and commit it on next start. Change the toast to "Θα καταγραφεί σε 10″ – Αναίρεση". | M |
| W2 | 1 | Harvest, jobs, observation | Crop, parcel, product and worker names are Greek script only in Hindi; "Δόση", "στρ." untranslated. He cannot choose the right crop. | BLOCKER (for Hindi rollout) | Add a `hi` field to `CATALOG` (पालक, रॉकेट, अजमोद, सोआ, धनिया, …, reviewed by a native speaker) and show "पालक · Σπανάκι" so he also learns the farm word. Add hi keys `labeluse.dose`, `unit.*`, `spray.planting`. Product names stay Greek (they are label names), but add a colour dot or the first-letter badge Bora uses on the cans. Parcels: owner-set short name or number (1, 2, 3…) shown big. | M |
| W3 | 1 | Harvest | Two identical buttons "Ρόκα · Μεσαίο Χωράφι": one PHI-blocked, one not. The demo import keeps `sown` instead of `sown_on`, so the date never shows. A worker can log crates against the wrong (unblocked) planting. | MAJOR (safety-adjacent) | Map `sown`→`sown_on` in `import-demo.ts`. In `labelOf`, when two labels collide, always add the date and the area. Show only plantings with status harvesting/ready by default, with "show all" below. | S |
| W4 | 1,2 | Harvest, observation | Save with no crop or field chosen does nothing silently (`11`). The `failed` error shows only when the crate count is invalid. | MAJOR | When `!planting`, show `harvest.error.planting` ("Διαλέξτε καλλιέργεια" / "पहले फसल चुनें") and scroll to the crop list. Same for observation parcel/kind. | S |
| W5 | 1,3 | Worker view | No language switch inside the worker view. `initialLang()` ignores `navigator.language`, so a Hindi phone opens in Greek and a worker account can never reach More → Γλώσσα. | MAJOR | Add a 4-button language row (EL TR EN हिन्दी) at the top of `WorkerApp` (or the first time it opens). Make `initialLang` honour `navigator.languages` (hi, tr, en) when nothing is stored. | S |
| W6 | 2 | All `.seg` buttons, lock box | At 200 % zoom words break mid-syllable ("Έγιν/ε", "Δο/υλε/ιές") (`09`, `10`, `15`). | MAJOR | Replace `overflow-wrap:anywhere` with `overflow-wrap:break-word; hyphens:auto` (lang is set on `<html>`). Add `@media (max-width: 300px) { .seg, .seg.two { grid-template-columns:1fr } }` so buttons stack instead of squeezing. | S |
| W7 | 2 | Harvest / job confirm (sticky save) | The sticky save button in the worker view floats 80 px above the bottom with no nav. At zoom it covers about 1/6 of the screen, including the heading (`10`). | MAJOR | In the worker view, set `bottom: calc(env(safe-area-inset-bottom) + 8px)`. Make the button non-sticky when `innerHeight < 500`, or render it only after a crop is chosen. | S |
| W8 | 2 | Global | All font sizes in px, so iOS Dynamic Type / "Larger Text" has no effect in the PWA. | MAJOR | Convert `--fs-*` to rem, and set `html { font: -apple-system-body; }` with a `font-family` override so iOS text size flows in. Re-check layout at 200 % with W6. | M |
| W9 | 3 | First open | A new worker sees the owner onboarding (add field / load demo) with no "I am a worker / I have an invitation" path. Sign-in is buried in Άλλα → Ρυθμίσεις, Greek only. | MAJOR (when LIVE) | On the first-run card, add a 3rd big button "Είμαι εργάτης – μπήκα με πρόσκληση / मैं कर्मचारी हूँ" that opens SignIn in the chosen language. Translate `signin.*` into hi. | S |
| W10 | 3 | Worker onboarding | The worker privacy notice is never shown to the worker, is not in Hindi, and is 150 words of legal text. | MAJOR (GDPR Art. 13 when LIVE) | Show it once in the worker view after first sign-in: 5 short lines (who, what, why, no location tracking, your rights) plus "Πλήρες κείμενο". Store `notice_seen_at` locally. Native-speaker and lawyer review of the hi version. | M |
| W11 | 1 | Worker jobs (demo) | Both demo jobs are locked (unknown REI), so nobody can practise Έγινε or see the start/end time form in the demo. | MAJOR (training) | Add one demo job on a parcel with a known, expired REI (fictional data, Demo farm only) so the full Done flow is practicable. | S |
| W12 | 1 | Worker jobs | The undo toast covers the next job's Done/Not-done buttons for 10 s (`04`). A mis-tap hits Undo. | MINOR | In the worker view, place the toast at the top, or add bottom padding equal to the toast height while it is visible. | S |
| W13 | all | Jobs, harvest | Button borders 1.34:1 vs background, card 1.14:1. Selected state = border plus bold only, so it is invisible in sun. | MINOR | Selected `aria-pressed=true`: filled `--green` background, white text, ✓ prefix. Raise the unselected border to `--field` (#6b7062, about 4.5:1). | S |
| W14 | 1 | Worker jobs | Tapping one locked Έγινε shows the lock reason under every locked job. | MINOR | Store `lockMsg` per job id (`{job, text}`) and render only under that job. | S |
| W15 | 1 | Worker view | Hindi review banner (two scripts) on top of every worker screen pushes jobs down. | POLISH | Show it once (dismissible) or only in More. | S |
| W16 | 1 | Hindi strings | Jargon or ambiguity: कर्मचारी दृश्य, निरीक्षण, प्रतीक्षा अवधि, वापस जाने, खाता जुड़ने पर (see table above). | MINOR | Apply the suggested wording, keep the "to be checked" flag until a native speaker signs off. Safety lines stay bilingual via `ts()`. | S |
| W17 | 3 | Shared phone | "Exit worker view" opens all owner screens (stock, orders, delete demo) with no PIN. | MINOR (until shared-phone decision) | If Bora chooses a shared farm phone: 4-digit owner PIN on exit. Otherwise hide the exit for worker accounts (already true when LIVE). | M |
| W18 | 1,3 | Demo worker picker | Demo workers are "Γιώργος / Ahmet". No Indian-named demo worker, and Greek script. | POLISH | Add a fictional demo worker such as "Ravi" (Latin script). Demo only. | S |
| W19 | 1 | Harvest | After save, the app jumps to the Jobs tab. A worker logging several crops has to go back each time, and the chosen crop is off-screen when he presses save (no summary near the counter). | MINOR | Stay on Harvest after save with a "Καταγράφηκαν 13 κλούβες – Σέσκουλα" line. Show the selected crop name above the counter. | S |

---

## Top 5 decisions to push for in the team meeting (ranked)

1. **No "saved" before it is actually saved (W1).** Write the record immediately and make undo a correction. This is also the append-only/audit way. It is the only data-loss bug we found.
2. **Hindi means Hindi on every worker-visible thing (W2, W5, W16).** Hindi crop names with the Greek word next to them, a language switch inside the worker view, and the phone language as default. Then have one native speaker (one of Bora's workers) sign off the 77 + about 30 new keys before the pilot.
3. **The harvest picker has to make a wrong crop hard to pick (W3, W4, W19, W13).** Unique labels, only harvestable plantings, a filled selected state, the chosen crop shown by the counter, and an error when nothing is chosen. A wrong pick here touches PHI.
4. **Large-text support for real (W6, W7, W8).** Use rem/Dynamic Type, no mid-word breaks, and a non-floating save in the worker view. Test at 200 % in CI (Playwright at 188 px).
5. **A worker day-one path before LIVE (W9, W10, W11).** An "I'm a worker" button on first run, a short bilingual privacy notice shown to the worker once, and one unlocked demo job so workers can be trained on the Done flow.
