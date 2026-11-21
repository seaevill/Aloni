# Codex handoff

## 2026-11-21 (Codex, Sprint 2 continuation)

- Y1 blocked by #289 on the shared engine and golden tests; main has 17 active of 27 golden cases.
- Y2 blocked by #292 on Orders and #339 on weekly supply; sowing still needs recorded rule inputs.
- Y3 blocked by #294 and #296 on the crop and parcel detail entry points.
- Y4 blocked by #298 on the register screen and its print stylesheet.
- Y5 blocked by #330 on the analyses locales; crop history, facts and notes await approved Greek source text.
- Y6 (#343) adds the read-only lot ledger and expiry display; stock cards and low-stock display remain blocked by #297.
- Y7 blocked by #296 and #330 on parcel detail and analysis; the rotation decision chip requires a signed rule.
- Y8 (#344) adds axe regression tests for ten Greek owner routes. iPhone VoiceOver and manual focus order remain to be checked.
- Y9 compares eight 375 px WebKit captures and checks the same screens at 320 px. CC-REQ: improve tab text contrast on the shared translucent bar; 34 of 80 samples were below 7:1 (minimum 5.58:1).

### Bora için

- Lot ayrıntısı kayıtlı hareketleri ve bilinen son kullanma tarihini gösteriyor.
- On Yunanca sahip ekranında axe ciddi veya kritik ihlal bulmadı.
- Sekiz ekran 320 px’de yatay taşmadan açıldı.
- Sekme çubuğunda ölçülen en düşük metin kontrastı 5,58:1; hedef 7:1.
- Golden sayısı 17/27; çakışan işler ve iPhone kontrolleri bekliyor.

### iPhone — έλεγχος στα Ελληνικά

1. Ανοίξτε την επίδειξη και ελέγξτε ότι ανακοινώνεται από το VoiceOver.
2. Στα «Φυτά», ανοίξτε μια καλλιέργεια και ελέγξτε τη σειρά ανάγνωσης.
3. Στα «Χωράφια», ανοίξτε ένα χωράφι και επιστρέψτε στη λίστα.
4. Στην «Αποθήκη», ανοίξτε μια παρτίδα και διαβάστε τη λήξη και τις κινήσεις.
5. Στις παραγγελίες, ελέγξτε ότι οι ποσότητες και οι μονάδες ακούγονται καθαρά.
6. Στο «Μητρώο», ελέγξτε αν διαβάζονται οι επικεφαλίδες και τα κενά πεδία.
7. Στη φόρμα ψεκασμού, ελέγξτε τη σειρά εστίασης χωρίς να αποθηκεύσετε εγγραφή.
8. Στα «Άλλα», μεγεθύνετε το κείμενο και ελέγξτε ότι η μπάρα παραμένει ευανάγνωστη.

## 2026-11-21 (Claude, DetailSheet for the tap-for-detail rule)

- **landed: DetailSheet (after merge).** `registerSheet('crop', CropSheet)` once at module level of your screen file; open with `openSheet('crop', id)` from `ui/nav`; close with `closeSheet()` (or the `close` prop). The component renders `<DetailSheet heading icon onClose testid?>` with `<SheetFact name value unknown />` lines: an unknown value ALWAYS carries its reason (`unknown="άγνωστο: …"`), never blank or 0. The address is `#/own/<tab>/sheet/<kind>/<id>`; kinds are lowercase letters and dashes, ids `[A-Za-z0-9_-]`. Your kinds (suggested): `planting`, `parcel`, `analysis`, `product`, `harvest`, `stock`. Mine: `crop`, `today-*`, `weather`, `wait`, `job`. Medicine sheet: recorded label data only + the official label link, no dose advice.

## 2026-11-21 (Claude, design sprint: components that have landed, import from `app/src/ui/ds`)

- **landed: tokens v2 (D1).** `--fs-hero/title/h2/row/body/meta`, tone colours (`--hold-*`, `--blocked-*`, `--frost-*`, `--lime-soft*`, `--unknown-*`), motion (`--dur-1..3`, `--ease`), `--chip-h --tag-h --icon-sm --icon-md --tile --bar-h`. New texts go ONLY into `i18n/ui.{el,tr,en,hi}.json` with the `ui.` prefix (merged at load; `I18nKey` includes them).
- **landed: Chip, Tag (D2).** `<Chip tone="hold|blocked|warn|unsigned|frost|ready|unknown|info">text</Chip>`; the tone comes from rules-core `statusOf`, the chip only displays it. `<Tag>` for neutral metadata. Icons: `ui/icons/Icon.tsx` (`<Icon name="lock" />`, names in `ICON_PATHS`). Gallery: `/?ds-gallery` in a build with `VITE_DS_GALLERY=true` (the Playwright `app` build has it; production does not).
- **landed: surfaces (D3).** `Card`, `HeroCard` (the only forest surface below the header), `ListRow` (props `heading`, `meta`, `icon`, `trailing`, `onClick`), `IconTile`, `PageHead` (`heading`, `subtitle`, `back`, `backText`), `SectionHead`. Never nest a Card in a Card. Prop names avoid `title`/`label` (lint U03).
- **landed: data viz (D4).** `BigNum` (`value` already formatted, `undefined` = «άγνωστο», `caption`, `size`), `Sparkline` (`values` with `null` gaps, required `caption`), `WeekBars` (`weeks: {name, orders, eligible, unknown}[]`; eligible only in the bar; unknown hatched, never added), `WeatherStrip` (`days: {name, tmax?, tmin?, rain?, wind?}[]`; a day with nothing says «άγνωστο» once). No inline `style=` anywhere (tokens.test).
- **landed: icon set + tab bar (D5).** All 32 icons are in `ICON_PATHS`; the tab bar uses them; the crops TAB is «Φυτά» (`ui.tab.crops`), the screen title stays «Καλλιέργειες».
- **landed: demo ribbon (D14, after merge).** `<DemoRibbon />` (App/WorkerApp) is the ONE demo mark. Please remove YOUR duplicates: the `badge.demo` span in the Register title (C11) and the `more.demoNote` intro sentence in More (C12). `<ShareCard>` / `share/card.ts` (D13), `<Onboarding>` (D9), motion classes `m-check m-roll m-sheet m-fade` (D10) are in too.

## 2026-11-21 (Claude, data side for the screens you build)

- **Observation → review → job.** Data layer is in `app/src/summary/observations.ts` and `observations-store.ts`: `pendingObservations(rows, seenIds)` (unseen, newest first, max 20), `jobParcelPicks(plantings, parcelId)` (live plantings of one parcel: the ONLY thing «Νέα εργασία» may preselect; product, dose, worker stay empty), `seenObservationIds()` / `markObservationSeen(id)` (farm setting `observations_reviewed`; the row is never changed). Worker side: `buildObservation(parcel, kind, note, worker, farm, nowIso, id, photoId?)` adds `photo` only when a photo was stored (`storePhoto` from `media/photo`, as SignOff does). No diagnosis text anywhere: label it «Δεν είναι διάγνωση». Open items: server-side review state needs SQL (BACKLOG); the worker's photo upload against server rules is unverified (check in RUNBOOK 12c).
- **Εργασίες cycle.** Two-phone e2e exists: `tests/e2e/live-job-cycle.spec.ts` + `helpers/mock-server.ts` (shared mock server). Worker completes with `queueCompletion` (rpc `complete_spray_job`), writes only start and end time. A worker's real-farm «Δεν έγινε» needs a server function (BACKLOG 0036+); keep it hidden until then. Count badges on the group headings are done (`jobs-count-*`).
- **Login.** `auth/code.ts` (`cleanCode`, `codeError`, `resendLeft`) and the six-digit code screen are in #290; keys `signin.err.*`, `signin.resend*`.
- **Register export.** `export/machine.ts` has `toMachineJson` and two new fill-in codes; `registerLines(data, { ...fmt, missing })` marks an empty authorisation number. Screen button `register-json` is in #301.
- **Tomorrow.** `orders/tomorrow.ts` is in #258 (`tomorrowBoard`, `cutTodayBySlug`); the card sits BELOW the two big buttons (first-screen rule).

## 2026-11-21

- **Hindi.** Deferred until #259 merges. The open PR still changes `app/src/i18n/hi.json`.
- **Rules.** GAP uses the shared weekly supply model and enables A05 and NEG-P0-2. Unsigned or missing approval yields a table only. Unknown PHI excludes the planting and suppresses decisions for that crop.

## 2026-11-20

- **SQL reviews.** #232: #235 and the review comments cover the upgrade and stale-version fixes. The latest reviewed revision, `5d141ec`, rejects an arbitrary fingerprint on supported inputs, but the server can still sign a stored dose the phone parser considers unknown. #236: #239 and the review comment cover the concurrent quota overrun and the missing explicit deny policy. Author branches remain untouched.
- **Rules.** Salinity A10 passed and #237 merged. Frost thaw R06 is in #244. The remaining rules need the shared `packages/rules-core/src/engine.ts` and `packages/rules-core/tests/golden.test.ts` files owned by #244 while it is open. Recheck main and the open-file list before enabling the next golden case. The current R06 branch leaves 12 golden cases skipped.
- **WebKit.** Started the full `--repeat-each=5` run on the main snapshot `7e6b146` with retries disabled at 375 px and external requests blocked. The job-assignment trace showed navigation toward Stock after clicking Planting Save, before the save completed. The discard prompt appeared and the transient empty-state button detached. #243 waits for save completion in the shared test fixture. The focused scenario passed 5/5 on the fix in real WebKit. The full 550-case run was still in progress when this note was written.
- **SQL quality gate and matrix.** #221 has merged. The pinned CLI was tested against a disposable local socket. Security advisors report the existing `public.harvest_conflicts` definer view in the extensions-schema layout. Scoped application lint also reports type warnings in `apply_ops` / `complete_spray_job` and a dynamic-relation diagnostic in `bump_sync_generation`. Enforcing fail-on-warning now would make the baseline red. Investigate those independently without editing 0001–0032. The table/role and per-planting test integration is also deferred while the shared SQL suite entry point is changed by #232 and #236. The local Claude hooks are independent and in #242.
- **Database review.** #240 records authenticated `EXPLAIN` results and definer search paths, with proposed SQL for the integrator to number separately.
- **Hindi.** Deferred until the worker language work is merged and `app/src/i18n/hi.json` is clear of open PR changes. #202 still changes that file.
- **Spray export.** #241 adds tests only. Its PR body maps the Annex fields and records the gaps, including the missing alternative location method and warnings for absent treated area or product name.

## 2026-11-21 queue update

- **SQL review.** No open PR for 0036 or 0037 at the time of the check. The review of 0035 is in #279. Migration 0035 still owns the shared SQL runner in #271.
- **Golden rules.** #281 merged and main now runs 17 of 27 golden cases. #289 enables NEG-P0-1 for REG, leaving nine skipped cases, and currently owns the engine and golden runner. Update STATUS after the remaining cases land. #275 currently owns STATUS.
- **Planting gate.** The shared SQL test entry point is already changed by #271. Wire the shared fixture into the SQL and phone suites after coordinating the runner change. Preserve separate checks for PHI and REI, signed and unknown labels, crop-specific gates, corrections, and Athens midnight.
- **Clock.** #283 covers the timeline at both Athens boundary times and with a UTC phone, and migrates the focused harvest and timezone scenarios. The same PR also fixes dates in worker flows, weather and analysis fixtures, order and dispatch fixtures, and the demo supply unit test. The go-live clock remains live because #264 changes that test.
- **Hindi.** #282 merged. The worker views and shared components scanned by the coverage test have no missing keys. The pre-session SignIn component falls back for nine keys: `signin.as`, `signin.code`, `signin.email`, `signin.error`, `signin.farmId`, `signin.out`, `signin.send`, `signin.title`, and `signin.verify`. The dictionary is changed by #264; apply copy after that PR clears.
- **Accessibility.** #284 found no serious or critical axe violations on the three Hindi demo worker tabs at 375 px. Existing owner and demo worker checks remain in place. Both live-build sign-in steps passed using the mock endpoint. The invite and signed-in worker variants still need explicit scanner coverage.
- **Performance.** #285 gates the shipped entry script and HTML module preloads at baseline plus 10%. The PR reports emitted gzip chunk sizes and the largest Rollup modules before final chunk minification. Runtime-triggered imports remain outside the CI budget.
- **Κλούβες.** #286 covers the import edge cases. Claude Code follow-up: a duplicate client ID is retained in client metadata, although the parser counts its order once. Decide how to report or resolve duplicate metadata. A persisted nonempty unknown crop slug currently passes through `cratesByCrop`. Validate persisted mappings against the crop catalog before counting them.

## 2026-11-21 Sprint 2 (X16)

- X1 blocked: the existing branches need new heads to rebase. No published branch was rewritten. #301 has merged; #298 still needs a replacement on that base. Check #333 before integrating.
- X2: #326 adds the four-language source primitives. TODO(ds): replace SourcePage after DetailSheet #324 lands.
- X3 blocked: #294 remains in flight and the existing edit/plantings specs require planting rows on the list. CC-REQ: coordinate the test ownership change when moving those rows to detail.
- X4 blocked: the crop-detail base in #294 and planting sketch X8 are pending.
- X5 blocked: needs the crop-detail base and a linked harvest breakdown that accepts a crop, parcel and dated period.
- X6 blocked: needs the crop-detail entry point and the source document after #330 clears. No unsourced crop copy was added.
- X7 blocked: the parcel extraction #308 and the old parcel work #296 are still open. TODO(ds): WeatherSheet remains with #336.
- X8 blocked: needs B2 planting geometry. CC-REQ: expose the nullable recorded polygon and its provenance to the parcel screen.
- X9: #329 validates the local preview and rejects outside/crossing edges. TODO(B2): persistence and editable vertex handles remain open.
- X10: #330 adds neutral pH and EC explanations. The form has no OM field. TODO(ds): DetailSheet #324.
- X11 blocked: the registry search page returned HTTP 200, but the source file is in #330 and recorded sprays have no maximum-application or label-photo snapshot. CC-REQ: confirm the immutable source for those historical fields.
- X12: #331 opens a single logged harvest's source. Aggregated bars remain open. TODO(ds): DetailSheet #324. TODO(B1): recorded destination.
- X13: #332 adds the pure stock calculation. TODO(B1): connect authoritative movements before showing balances, destination or receiver details. CC-REQ: provide the movement ordering and scope for the tomorrow board.
- X14: #339 adds the C3 four-week series and v2 spinach checks. The chart, source rows and unsigned chip still depend on the in-flight orders screen #292.
- X15 blocked: needs the parcel detail base from X7/#296 and an authoritative observation/job-to-parcel photo linkage. CC-REQ: confirm the local/read-only photo linkage for both types.
- X16 baseline: eight Greek Demo screens captured from `7dc3142` in WebKit. At 320 and 375 px, no page overflow or visible control below 56 px. All 281 first-viewport text samples on flat or alpha-composited backgrounds passed 7:1 and 14 px. A separate pixel scan hid the glyphs and sampled the rendered backing across 80 tab labels. Twenty-five labels had a sample below 7:1; the minimum was 5.58:1 on Άλλα and other screens. Tab text was at least 14 px. CC-REQ: increase the shared tab backing opacity or contrast in the Claude-owned theme, then repeat the integrated scan.

### Έλεγχος στο iPhone

1. Άνοιξε το κτήμα επίδειξης και έλεγξε ότι η σήμανση επίδειξης παραμένει ορατή.
2. Άνοιξε τα Φυτά και διάλεξε Σπανάκι. Δες τις φυτεύσεις και τον καιρό.
3. Άνοιξε ένα χωράφι και πάτησε την εγγραφή ανάλυσης.
4. Πάτησε pH και ηλεκτρική αγωγιμότητα. Έλεγξε ότι η μονάδα μένει ίδια.
5. Στο Ιστορικό πάτησε μια συγκομιδή. Έλεγξε χωράφι, εργάτη, ώρα και προορισμό.
6. Στην Αποθήκη και στο Μητρώο έλεγξε ότι τα κουμπιά πατιούνται χωρίς πλάγια κύλιση.
7. Άνοιξε τον νέο ψεκασμό και έλεγξε ότι η δόση μένει κενή.
8. Γύρισε στο κτήμα σου και έλεγξε ότι δεν εμφανίζονται δεδομένα επίδειξης.

### Bora için beş satır

Kaynak satırları ve bilinmeyen değer açıklamaları dört dilde hazır.
Ekim çizimi cihazda önizleniyor ve kayıt altyapısı B2’yi bekliyor.
Analizlerde pH ve EC açıklamaları, hasat geçmişinde kayıt ayrıntısı var.
Stok ve dört haftalık arz hesapları hazır; ekran bağlantıları B1 ve #292’yi bekliyor.
320 ve 375 px temel ekran taraması tamamlandı; birleşik sprint kontrolü bekliyor.
