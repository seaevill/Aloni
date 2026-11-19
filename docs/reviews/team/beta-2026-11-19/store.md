# Beta 2 – group "store" (App Store/Play reviewer · GDPR reviewer · accessibility auditor)

Build tested: `seaevill/Aloni@d21df3d`, `vite preview` on port 4105, Chromium, 375×812 (also 320×640, 812×375 landscape, `reducedMotion: reduce`). Demo farm and "My farm". LIVE flag off, as expected.
Screenshots: `LAB/shots/store/` (file names are given in the table).
Store rules checked on the web on 2026-11-19; sources are at the end.

---

## 1. Personas

### 1a. App Store / Google Play reviewer
**Who I am:** I review apps against Apple's App Review Guidelines and Google Play policy. I install the build, try to sign in with the demo account in the review notes, and reject anything that looks like a website, a beta or a half-finished product. I also check the privacy label, the Data safety form and account deletion.

**What I tried**
- I went through all 5 tabs and every row under More, the worker view, the demo load/delete and the language switch, as if the app had been submitted as a Capacitor build.
- I read every string the user can see for words like "draft", "beta", "Supabase" or "migration", and for prompts to add the app to the Home Screen.
- I looked at how sign-in would work (`SignIn.tsx`: e-mail plus a one-time code, the same for owner and worker; workers join by invitation) and searched for any account-deletion path. There is none.
- I checked the manifest, the third-party hosts the app calls (none during my session, apart from blob: URLs) and the permissions it uses (camera through `<input type=file>`, and geolocation for the parcel pin and the map's "where am I").

**What delighted me**
- It is clearly "app-like" (guideline 4.2): it works fully offline in IndexedDB, uses the camera, has a counter-style harvest input, a worker mode and an undo pattern. A Capacitor build would not be a "repackaged website".
- It made no tracking or analytics calls and no third-party requests. The App Privacy label can honestly say "Data Not Used to Track You".
- There are no in-app purchases, so guideline 3.1 does not apply.

**What blocked or confused me**
- **Guideline 2.1 / 2.2:** an ordinary user sees developer and internal-tooling text. More → "Σύνδεση λογαριασμού: τι λείπει" lists "Supabase Advisor check done" and "I confirm: changes up to 0026 were applied". Labels such as "(προσχέδιο)", "DRAFT" and "Translation to be checked by a native speaker" appear on the screens. A reviewer reads all of this as a beta, and betas belong in TestFlight.
- **5.1.1(v) and Google's account-deletion policy:** accounts are created (owner by e-mail code, worker by invitation) but cannot be deleted inside the app. Google also requires a web link for deletion.
- **2.1 demo account:** the e-mail code login cannot be used by a reviewer unless there is a review account with a fixed code (or a password path) and the backend is live.
- **5.1.1(i):** there is no privacy policy that covers the owner/user. The only text is a worker notice marked as a draft, hidden under More → Information.
- **Phase 1 is a single business (Bora's farm).** A public listing for one farm fails 4.2 ("not useful to the general public"). The Phase 1 route should be TestFlight, Apple's unlisted distribution, or a Play closed or internal track.
- **Prompt to add to the Home Screen:** `warn.homescreen` ("Add the app to the Home Screen…") must not appear inside the native wrapper. It is meaningless there, and it refers to Safari behaviour.

### 1b. GDPR / privacy reviewer (EU, Greece)
**Who I am:** I advise small Greek employers on GDPR (Regulation 2016/679 and Greek Law 4624/2019). For this app I look at two kinds of data subject: the workers, who are mostly Hindi-speaking, and Bora himself as a sole trader. I compare the privacy notice with what the code actually stores.

**What I tried**
- I read the worker notice in el/en/tr/hi (Settings → Πληροφορίες) and compared it with the schema, `Workers.tsx`, `SignIn.tsx`, `photo.ts` and the backup JSON.
- I added a worker ("Rajesh Kumar") on My farm, archived them and exported a backup (`aloni-backup-2026-11-19.json`). The backup contains worker names, `device_id`, and `actor_id` on every row.
- **EXIF test:** I uploaded a 3000×2000 JPEG carrying GPS EXIF (37°59′30″N 23°20′10″E, Make "Apple") through More → Φωτογραφίες, then read the stored blob back from IndexedDB. It was re-encoded to 2000×1333 with **no EXIF at all and no GPS** (`myfarm-photos.png`).
- I switched to Hindi and opened the worker view and Πληροφορίες.

**What delighted me**
- Photos are stripped of GPS and EXIF by design, because they are re-encoded on a canvas. They stay on the phone and are de-duplicated by hash.
- The controller details are kept out of the public repo, and worker invitations stay blocked until the controller is filled in (`canInviteWorkers`). That is a good gate.
- The notice is honest: it lists Frankfurt as the processor location, flags non-EU transfers for the lawyer, states the 3-year spray retention, and gives dpa.gr. It also says "we do not track your location", and the code confirms this: geolocation is only a one-off, owner-triggered pin or map recentre.
- There are no third-party requests, no fonts CDN and no analytics.

**What blocked or confused me**
- **Workers never see the notice.** The worker view has no link to it, and it **does not exist in Hindi**: `hi.json` has 75 keys, `info.*` is missing, and the screen falls back to Greek (`hi-info-falls-back.png`). For Hindi-speaking workers that fails Art. 12(1) ("intelligible… clear and plain language") and Art. 13 ("at the time when personal data are obtained").
- **Three texts contradict each other.** Εργάτες says "Name only. We keep no other personal data." The notice says "name, role, optionally phone". The code also stores the worker's **e-mail** (invite + OTP sign-in), `device_id`, `actor_id` and timestamps, and possibly photos. Neither the e-mail nor the e-mail/OTP delivery provider appears in the notice.
- **Erasure and retention are not implemented.** "Archive" is a soft delete with an undo. TECH-SPEC §6 says "erasure means pseudonymising the person in records that must be kept", but there is no such function. The notice promises "other data is deleted when the working relationship ends", but nothing deletes it: no retention job and no date on the worker row.
- **Unencrypted plaintext backup** containing worker names and device ids is downloaded to Files or iCloud. There is no warning about where to keep it (Art. 32).
- **Legal basis wording.** "Employment contract" is used for everything, including harvest counts per worker, which is productivity data. The legal basis should be split per purpose (see F-G5).
- There is no Art. 30 record of processing (ROPA) in docs. The exemption for fewer than 250 employees does not apply when processing of employee data is regular, as it is here.

### 1c. Accessibility auditor (WCAG 2.2 AA)
**Who I am:** I audit mobile web apps with axe-core 4.x plus manual checks of keyboard use, focus, language of parts, timing, reflow and motion. I think of a VoiceOver user on an iPhone SE and a worker who reads Hindi.

**What I tried**
- I ran axe-core (tags wcag2a/aa, wcag21aa, wcag22aa, best-practice) at 375 px on **about 22 screens**: the empty first run, all 5 tabs, the demo tabs, crop detail, parcel detail, product, all 5 More sub-screens, the worker view in el and hi, Workers on My farm (empty and with one worker), Photos and the photo viewer, and More after a backup.
- I tabbed through Today and Info with the keyboard, recording the focused element and its outline after each tab change and sub-screen.
- I triggered the undo toast with "Διαγραφή επίδειξης" and timed it.
- I tested 320×640 with 200 % root font size, landscape 812×375, and `prefers-reduced-motion: reduce`.

**What delighted me**
- **axe found 0 violations on 21 of 22 screens.** The only one is `page-has-heading-one` (moderate) on the photo viewer. Contrast, names, landmarks (`nav aria-label`, `aria-current="page"`, `aria-pressed` on toggles) and 56 px tap targets (72 px for the big buttons) are all solid.
- Done and Not done are distinguished by fill, border colour and word, not by colour alone. The toast has `role="status"`. `<html lang>` follows the language switch. There are no CSS animations, so reduced motion is respected almost by default. Pinch-zoom is not blocked. Landscape works.

**What blocked or confused me**
- **Focus is lost on every screen change.** Opening a More row or going Back leaves `document.activeElement` on BODY, and nothing is announced. A VoiceOver user does not know the screen changed (2.4.3, 4.1.3).
- **Language of parts (3.1.2).** In Hindi, Greek fallback strings (product names, "Δόση: 0.2 kg/στρ.", the Greek REI warning, the whole Πληροφορίες screen) carry no `lang="el"`. VoiceOver reads Greek with the Hindi voice and the result is gibberish (`hi-worker-choose.png`). The language buttons "EL/TR/EN" have no full-name label and no `lang`.
- **Undo toast is time-limited (2.2.1).** It lasts 5 s (10 s in the worker view). The toast is mounted only when shown, so on iOS the live region may not be announced. The undo button is unreachable by keyboard or screen reader in that time, even for a destructive action ("Διαγραφή επίδειξης").
- **All font sizes are px**, so iOS Dynamic Type and Android font scale are ignored. That is fine in Safari with pinch-zoom, but in a Capacitor WKWebView pinch-zoom is usually off, so text could not be enlarged at all.
- **Smaller issues:**
  - At 320 px the tab labels "Καλλιέργειες" and "Χωράφια" overlap (`tabbar-320px-labels-collide.png`, 1.4.10).
  - Every photo has the same alt text "Φωτογραφία".
  - The photo viewer is not a dialog: no heading, and Escape does not close it.
  - MapLibre `flyTo` ignores reduced motion.

---

## 2. Findings

| id | persona | screen | problem (what I did / saw) | severity | proposed fix | effort |
|---|---|---|---|---|---|---|
| F-S1 | Store | More → «Σύνδεση λογαριασμού: τι λείπει», GoLive | Ordinary users see developer checklist items: "Supabase Advisor check done" and "I confirm: changes up to 0026 were applied" (`store-dev-readiness-visible-to-user.png`). In a store build a reviewer rejects this under 2.1/2.2 (incomplete or beta), and pilot growers cannot act on it. | BLOCKER (for store) / MAJOR now | Move Readiness and GoLive behind an "owner setup" screen shown only while `!SYNC_CONNECTED`, and remove `ready.migration` and `ready.advisor` from the UI completely; keep them in RUNBOOK or a CI check. Add a `STORE_BUILD` flag that hides every developer-only row. | S |
| F-S2 | Store/GDPR | More (signed in) | There is no in-app account deletion (Apple 5.1.1(v)), and no web deletion link, which Google's account-deletion policy requires and the Data safety form asks for. Owner and worker accounts can be created but not deleted. | BLOCKER (for store) | Add More → «Διαγραφή λογαριασμού». **Worker:** revoke membership, delete the auth user and e-mail, and pseudonymise the `workers` row (name → "Εργάτης #7"). Spray rows keep `actor_id`, and the screen says what is kept for 3 years and why. **Owner:** export first, then delete the farm data that is not under a legal hold, schedule the held records for deletion at retention end, and show a confirmation. Add a static `/delete-account` page (el/en) for Google. | M |
| F-S3 | Store | SignIn | Login is by e-mail code only, so Apple and Google reviewers cannot get in (2.1 needs a demo account with the backend live). | BLOCKER (for store) | Create a review-only account on a **demo farm on the server**, with a fixed OTP that only works for that address (Supabase test OTP), and document it in RUNBOOK §store. Never use Bora's real farm. | S |
| F-S4 | Store | whole app | Many draft or beta labels: «Αρχείο ψεκασμών (προσχέδιο)», «Προσχέδιο – προς έλεγχο από δικηγόρο», «Μετάφραση προς έλεγχο» (`more-full.png`, `hi-worker-choose.png`). These are right for Phase 1 but read as a beta to reviewers (2.2). | MAJOR (store gate) | Keep them for Phase 1. Make a store-readiness checklist where each label is removed only when its underlying sign-off exists (lawyer, native speaker). Ship to stores only after that; until then use TestFlight or a Play internal track. | S |
| F-S5 | Store | strategy | Phase 1 is a single farm. A public listing for one business risks 4.2 (not useful to the public). The Play 12-tester / 14-day closed-test rule applies if Bora uses a personal developer account. | MAJOR | Write this into DECISIONS. Phase 1 uses TestFlight (up to 10k testers) or Apple's unlisted distribution, plus Play internal or closed testing. Go public only at pilot time, with self-serve farm signup. Bora should consider a Play **organisation** account (needs a D-U-N-S number) and has to provide EU DSA trader contact details on both stores. | S (docs) |
| F-S6 | Store | Capacitor spike (M5) | Native wrapper prerequisites are not yet tracked: Info.plist purpose strings for camera, photo library and location-when-in-use; `PrivacyInfo.xcprivacy` (required-reason APIs used by Capacitor/WebKit storage); Android `targetSdk 36` (needed for new apps and updates since 31 Aug 2026); APNs/FCM in place of Web Push; removing `warn.homescreen` inside the wrapper; migrating data from the PWA origin to `capacitor://localhost` (IndexedDB does not move over). | MAJOR | Add a `docs/milestones/M5-capacitor-checklist.md` with these items, and a `isNative()` guard that hides the Home-Screen warning and the install gate. Plan the data move: sign in → sync down (or backup → restore). Greek purpose strings, e.g. «Για φωτογραφία ετικέτας ή συνταγής». | S now / M later |
| F-S7 | Store/GDPR | More → Πληροφορίες | There is no privacy policy for the owner/user. Apple 5.1.1(i) needs a link in the app **and** in App Store Connect; Google needs one in the listing. | MAJOR | Write one public privacy policy (el/en, later tr/hi) at `/privacy` on the Pages site, covering both owner and worker. Link it from More, from the sign-in card and from the worker view. Keep the worker notice as a short summary that links to it. | M |
| F-G1 | GDPR | Worker view; Πληροφορίες in hi | Workers have no path to the notice from their own view, and it is not translated into Hindi. In हिन्दी the whole Πληροφορίες screen is Greek (`hi-info-falls-back.png`). This fails Art. 12(1) and Art. 13. | MAJOR | Add `info.privacy.*` to `hi.json` (marked for native review like the other Hindi strings). Add a «Τα δεδομένα σας / आपका डेटा» row in the worker view that shows the notice in the worker's language. On a worker's first sign-in, show the notice once and record the timestamp (acknowledgement, not consent). | S |
| F-G2 | GDPR | Εργάτες vs notice vs code | The texts contradict each other. Εργάτες says «Μόνο το όνομα. Δεν κρατάμε άλλα προσωπικά στοιχεία.» The notice says name + role + optional phone. The code also stores the invitation **e-mail**, `device_id`, `actor_id` and timestamps, and a photo may show people. Neither the e-mail nor the e-mail/OTP delivery provider is listed. | MAJOR | Make one data inventory in `docs/compliance/ropa.md` (Art. 30) and generate both texts from it. Change Εργάτες to «Όνομα (και e-mail αν έχει λογαριασμό). Δείτε Πληροφορίες.» Add the e-mail, device identifiers and the OTP e-mail provider (an EU one, with a DPA) to the notice. | S |
| F-G3 | GDPR | Εργάτες → Αρχειοθέτηση | Erasure is not implemented. Archive is a soft delete. TECH-SPEC §6 says "erasure = pseudonymise in kept records", but no code does this. The notice promises deletion "when the working relationship ends" and nothing performs it. | MAJOR | Add `pseudonymiseWorker(id)`. It writes an amending row (append-only friendly) that replaces the name with a stable alias in `workers` and in any denormalised name fields; spray and harvest rows keep the uuid. Add `ended_at` to workers and a monthly owner reminder: «Ο εργάτης Χ έφυγε πριν 12 μήνες – ψευδωνυμοποίηση;». Never touch spray rows (the 3-year hold). | M |
| F-G4 | GDPR | More → Αντίγραφο | The exported backup is plaintext JSON with worker names and device ids, saved wherever iOS puts it (often iCloud Drive). There is no guidance (Art. 32). | MINOR | Add one line under the button: «Περιέχει ονόματα εργατών. Κρατήστε το σε ασφαλές μέρος, όχι σε κοινόχρηστο φάκελο.» Later, offer an optional passphrase (AES-GCM through WebCrypto). | S / M |
| F-G5 | GDPR | notice text | Every purpose rests on "employment contract". Per-worker harvest counts and job completion are productivity monitoring, and the Greek DPA reads employee monitoring strictly. For the optional phone, consent is weak in an employment relationship. | MINOR | Split the legal basis per purpose: spray register → Art. 6(1)(c); organising work → 6(1)(b); per-worker harvest totals → 6(1)(f) with a short balancing note, and never a ranking shown to other workers. Base the phone on 6(1)(b)/(f), not consent. Leave all of this for the lawyer, marked. | S |
| F-G6 | GDPR (positive, lock it in) | Φωτογραφίες | **Verified:** a JPEG with GPS EXIF is stored without any EXIF (canvas re-encode). No test protects this, so a future "keep original quality" change would bring the leak back silently. | MINOR | Add a Vitest/Playwright test: upload a fixture with GPS EXIF and assert that the stored bytes have no APP1/Exif segment. | S |
| F-A1 | A11y | every sub-screen / Back / tab change | Focus goes to BODY when a view is replaced (More → Εργάτες, Back), and nothing is announced (2.4.3, 4.1.3). | MAJOR | Give each screen's `<h1>` `tabIndex={-1}` and focus it on mount (a small `useFocusHeading()` hook in `BackBar` or `screens.tsx`). On Back, return focus to the row that opened the screen. | S |
| F-A2 | A11y | Hindi UI (worker view, Πληροφορίες) | Greek fallback text and the deliberate bilingual REI warning have no `lang="el"`, so VoiceOver reads Greek with the Hindi voice (3.1.2). The language buttons are just "EL/TR/EN" with no `lang`. | MAJOR | Make `t()` return the language actually used (or expose `tLang()`) and wrap fallback text in `<span lang="el">`. Do the same for product and parcel names when the UI language is not el. Language buttons: `aria-label="Ελληνικά"`, `lang="el"`, and so on. | S |
| F-A3 | A11y | Toast (Διαγραφή επίδειξης, worker Done) | The undo window is 5 s (10 s for workers), with no way to extend it (2.2.1). The toast is mounted on demand, so the iOS live region may stay silent. | MAJOR | Always render an empty `role="status"` container. Pause the timer while the toast has focus or the pointer is on it, and give screen-reader users at least 20 s or a way to undo later (the history already allows amending rows). Keep the worker's held-commit behaviour. | S |
| F-A4 | A11y/Store | all text | Font sizes are fixed in px, so iOS Dynamic Type and Android font scale are ignored. In a Capacitor WebView without pinch-zoom, users could not enlarge text (1.4.4). | MINOR now / MAJOR for store | Change the `--fs-*` tokens to rem and set `html { font: -apple-system-body }` with a clamp, or read the native font scale in Capacitor. Retest at 200 % (reflow already holds at 320 px). | M |
| F-A5 | A11y | tab bar at 320 px | «Καλλιέργειες» and «Χωράφια» overlap (`tabbar-320px-labels-collide.png`, 1.4.10). | MINOR | Hyphenate at narrow widths (`hyphens:auto` with `lang="el"`, already a soft hyphen), or drop to 13 px below 340 px wide, or use the short label «Καλλιέργ.» with the full `aria-label`. | S |
| F-A6 | A11y | photo viewer | No heading, not a dialog, Escape does nothing, and every image has alt «Φωτογραφία». | MINOR | Use `<dialog>` with `aria-labelledby` and close on Escape. Make the alt text «Φωτογραφία 2 από 5 · 19 Νοε · Ετικέτα: {product}». | S |
| F-A7 | A11y | Χάρτης «πού είμαι» | MapLibre `flyTo` animates even with `prefers-reduced-motion: reduce`. | POLISH | Use `jumpTo` when `matchMedia('(prefers-reduced-motion: reduce)').matches`. | S |

Not observed (checked): focus hidden behind the fixed tab bar on Info; colour contrast problems (axe was clean on the dark green bands); horizontal scroll at 320 px; landscape layout breaking.

Noticed by the way, for other groups: in the worker view the dose shows as «Δόση: 0.2 kg/στρ.» with a dot rather than the Greek comma. Only the display format should change; the value must not be rounded.

---

## 3. Screenshots (`…/lab/shots/store/`)
- `store-dev-readiness-visible-to-user.png`: Supabase/migration checklist on the user's More screen (F-S1)
- `more-full.png`: full More screen with the draft labels and the readiness/go-live blocks (F-S1, F-S4)
- `more-info-full.png`: the worker notice: draft, only reachable from the owner's More (F-G1, F-S7)
- `hi-info-falls-back.png`: Hindi UI, Πληροφορίες entirely in Greek (F-G1, F-A2)
- `hi-worker-choose.png`: worker view in Hindi with Greek fallback and the bilingual REI warning, no `lang` (F-A2)
- `myfarm-workers-added.png`: «Μόνο το όνομα…» claim (F-G2)
- `myfarm-photos.png`, `myfarm-photo-open.png`: photo saved with EXIF stripped; viewer without heading or dialog (F-G6, F-A6)
- `toast-delete-demo-5s.png`: 5 s undo after deleting the demo (F-A3)
- `tabbar-320px-labels-collide.png`, `text-200pct-320px-today.png`, `landscape-today.png`: reflow checks (F-A5, F-A4)
- `demo-today-full.png`, `demo-parcel-detail-full.png`, `demo-crop-detail.png`: clean axe baseline screens

---

## 4. Top 5 decisions to push for in the meeting (ranked)

1. **Decide the store route now: Phase 1 does not go into the public stores.** Use TestFlight or unlisted distribution plus a Play internal or closed track, and record this in DECISIONS. Keep a `STORE_BUILD` flag that hides the developer-only readiness and go-live rows, the Home-Screen warning and the draft labels until they are signed off (F-S1, S4, S5).
2. **Build account deletion and worker pseudonymisation as one feature, before any worker gets an account.** It meets Apple 5.1.1(v), Google's deletion policy and GDPR Art. 17, while respecting the 3-year spray hold: amending rows only, with an in-app explanation of what is kept (F-S2, G3).
3. **Write one data inventory (ROPA) and one public privacy policy, and generate every text from it.** That covers the worker notice, the Εργάτες caption, the Apple privacy label and the Play Data safety form. Fix the e-mail and device-id omissions, and choose an EU e-mail/OTP provider with a DPA (F-G2, S7, G5).
4. **Make the worker notice reachable from the worker view and translate it into Hindi**, with a once-only acknowledgement on first sign-in (F-G1). Do this together with the `lang`-of-parts fix, so Greek fallback is spoken correctly (F-A2).
5. **Two small accessibility fixes with large impact, plus one test:** focus the `<h1>` on every screen change, and make the undo toast a persistent live region with a pausable or longer timer (F-A1, A3). Add the EXIF-stripping regression test (F-G6).

---

### Sources (checked 2026-11-19)
- [Apple – App Review Guidelines (2.1, 2.3.10, 4.2/4.2.2, 4.8, 5.1.1(i), 5.1.1(v))](https://developer.apple.com/app-store/review/guidelines/uk/)
- [Apple – 5.1.1(v) account deletion reference](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)
- [Apple – Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app)
- [Android – Target API level requirements (API 36 from 31 Aug 2026)](https://developer.android.com/google/play/requirements/target-sdk)
- [Google Play – App account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-GB)
- [Google Play – Testing requirements for new personal developer accounts (12 testers / 14 days)](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- The EU DSA trader-status requirement on both stores is from memory and was not re-fetched; verify it in App Store Connect and Play Console.
