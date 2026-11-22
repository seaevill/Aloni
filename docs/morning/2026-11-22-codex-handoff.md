# Codex long-run handoff · 2026-11-22

The deployed P0 baseline is `d17f739`. #421 contains R1–R30 captures and the acceptance matrix and is merged. Update the matrix with a fresh WebKit run after the fix PRs reach the live deployment. The affected `docs/handoff/codex-notes.md` is in #387, #395 and #439, so this handoff is stored separately.

| Ticket | Status | Evidence or blocker |
|---|---|---|
| P0 | READY | #421, merged. 30 captures, 5 criteria confirmed. |
| P1 | BLOCKED | #387 and #395 overlap the standalone component tests, and #395 conflicts with its moving parent. In #387 the direct component invocation bypasses the hook context. #394's recorded failure was Today KPI 44 versus sheet 0, outside this lane. |
| P2 | BLOCKED | #395 changes the literature sources file. Full pH, EC and OM collection and analysis wiring remain open. |
| P3 | BLOCKED | #422 has four-locale product explanations and targeted local WebKit proof. GitHub shard 1 failed again on retry. Current main conflicts with the protected supabase/tests/phone-columns.json contract update. |
| P4 | BLOCKED | The shared month ring and crop library files are held by #387 and #395. |
| P5 | PARTIAL | #426 merged and the weather sheet was confirmed live under fcd799d. Recorded polygon rendering waits for the 0040 contract and geometry. |
| P6 | PARTIAL | #443 groups crop history by recorded destination and leaves unknown destinations unsummed. Stock now uses larger figures and excludes held and unknown destination quantities. The owner receiver detail remains open. |
| P7 | REVIEWED | #428 records 0036 approved in local review and the 0037 restore harness blocker. #433 and #442 record the later SQL checks. 0038, 0039 and 0040 have MUST findings at the reviewed commits. |
| P8 | PARTIAL | #434 compares eight screens. #441 implements the approved crop list. Remaining corrections are in the audit, and #292 touches Orders. |
| P9 | PARTIAL | #437 covers the unsigned R03 inputs case. 21 of 27 original golden cases execute, with six original cases still skipped. |
| P10 | BLOCKED | #395 changes the crop locale data and loader needed for the Hindi expansion. The product copy in #422 and history copy in #443 include four locales. |
| P11 | PARTIAL | #440 records nine screens at 375 and 320 px. Zero serious or critical axe failures and zero horizontal overflow. Manual phone checks and composited backgrounds are outstanding. |
| P12 | BLOCKED | An interim [R17 capture](2026-11-22-live/retest-fcd799d/R17.png) on `fcd799d8fb663822f4d266d43224164f29ff1a97` confirmed the live parcel weather action. The source is still unknown and the sketch illustrative. The final 30-row run waits for the remaining fix branches. |

- CC-REQ: Reconcile the protected phone-columns contract in #422 before the merge check.
- CC-REQ: Coordinate the outstanding Today, weather, worker and tasks acceptance items listed in #421 and confirm the build SHA before the retest.
- CC-REQ: Preserve parcel containment on parent and child edits in #430 before the phone draws a recorded planting boundary.
- CC-REQ: The legacy Today/Tomorrow summary still consumes the previous unknown-crate amount. Keep it count-free when porting the gated stock split.
- CC-REQ: Keep historical receiver details behind an owner action after the destination and privacy contracts are available.

## Bora için

1. Canlı Demo'da 30 ölçütü ekran görüntüsüyle belgeledim. Beşi doğrulandı.
2. Ürün bilgisi, parsel kaynakları, hasat geçmişi ve Φυτά düzeni ayrı PR’larda.
3. 0036 yerel testten geçti. 0037–0040 için bulgular kendi PR’larında.
4. Dokuz ekranda 320 px yatay taşma ve ciddi axe bulgusu görmedim.
5. Toprak aralıkları, ürün ipuçlarının ay halkası ve Hintçe ürün bitkisi içeriği açık PR’ların dosyalarına bağlı.
6. Son canlı kontrol düzeltmeler yayımlandığında yapılabilir.

## Έλεγχος στο iPhone

1. Άνοιξε την επίδειξη και έλεγξε την έκδοση στο κάτω μέρος του «Άλλα».
2. Στα «Φυτά», έλεγξε έξι σειρές με εικόνα, όνομα και μία ένδειξη.
3. Άνοιξε τις συμβουλές από το Σπανάκι και έλεγξε την παρουσία των πηγών.
4. Στα «Χωράφια», άνοιξε τον καιρό του Κάτω Κάμπου και μετά μια φύτευση.
5. Στην «Αποθήκη», άνοιξε το ⓘ και έλεγξε την καταγεγραμμένη ετικέτα.
6. Στο «Ιστορικό», άνοιξε τη συγκομιδή Ρόκας και δες τις ομάδες προορισμού.
7. Με VoiceOver, μπες σε μια καρτέλα και γύρνα με το κλείσιμο στο κουμπί που την άνοιξε.
8. Έλεγξε ότι το κείμενο διαβάζεται πάνω στις διαφανείς μπάρες και ότι η σελίδα δεν μετακινείται οριζόντια.
