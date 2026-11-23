# Finance ledger + growth ideas – action plan (DRAFT, 2026-11-23)

**Status: draft for Bora. Nothing here is approved or built.** Per CLAUDE.md, each phase below becomes a `docs/milestones/` plan that Bora confirms before any code. Inputs: Bora's request (2026-11-23), `replica/recon.md` (Farmable gaps), the İmeceMobil look (income/expense idea), TECH-SPEC, `docs/design/design-sprint-2026-11-21.md` (role voices), `docs/brand/brand.md`.

## Özet (Türkçe, Bora için)

**Ana fikir:** Aloni'ye bir **Para defteri** («Ταμείο») ekliyoruz. Her giriş ve çıkış yıl yıl kayıtlı kalıyor. Sonunda şu soruların cevabı tek ekranda görünüyor: «Bu yıl ne kazandım?», «Hangi ürün ve hangi tarla kâr ediyor?», «Bir kasa ıspanak bana kaça mal oluyor?»

**En önemli kural:** Bu defter **senin kendi hesabın; resmî muhasebe değil.** Fatura kesmez, myDATA'ya bir şey göndermez, vergi hesaplamaz. Muhasebecin için dışa aktarma (CSV/PDF) hazırlar ve faturalarının fotoğrafını saklar. Yunanistan'daki zorunlu e-fatura ve dijital sevk irsaliyesi (12 Ekim 2026'dan beri) işlerini her zaman muhasebecin ya da resmî uygulama yapar.

**Beş kişinin fikirleri:**

- **Çiftçi:**
  - Satışlar kasadan otomatik gelir olsun: sipariş «Φορτώθηκε» olunca kasa × fiyat gelir yazılır.
  - İlaç ve gübre alışında fiyat girilsin, gider otomatik yazılsın.
  - Yevmiye, mazot, su, elektrik ve tamir de gider olarak girilebilsin.
  - Devlet destekleri ve %6 KDV iadesi gelir olarak girilsin.
  - Müşteri borcu (veresiye) takip edilsin.
  - Özel KDV rejiminin sınırları (yıllık satış 15.000 €, destek 5.000 €) yaklaşınca uyarı gelsin. Bu uyarı **bilgi** amaçlı; karar senin ve muhasebecinin.
- **Uygulama kullanıcısı:**
  - Bir kayıt en fazla 3 dokunuşta girilsin.
  - Her müşteri ve ürün için son fiyat hatırlansın.
  - İnternetsiz çalışsın.
  - **İşçiler parayı hiç görmesin.**
  - Ayın özeti Σήμερα'da tek satırla görünsün.
  - Yanlış kayıt silinmesin, düzeltme satırıyla düzeltilsin (ilaçlama defterindeki gibi).
- **Influencer:**
  - Hasat kasası etiketinde QR olsun; okutan müşteri «bu kasa hangi gün, hangi üründen» diye görebilsin. Bu, Twoislandsdallas hikâyesi için en güçlü içerik.
  - Haftalık «bu hafta X kasa» paylaşım kartları ve sezon sonu «yılın özeti» kartı olsun.
  - **Para, müşteri adı, işçi adı ve tarla yeri asla paylaşılmasın.**
- **Grafiker:**
  - Para ekranı Aloni renkleriyle, sade iki çubuk (gelir/gider) ve tek büyük rakamla olsun.
  - Kategori ikonları olsun.
  - Kasa etiketi tasarımı Aloni ve Twoislandsdallas logosuyla, marka sırası net olacak şekilde yapılsın.
  - Paylaşım kartı şablonları hazırlansın.
- **Yazılımcı:**
  - Para tutarları kuruş cinsinden tam sayı olarak saklansın; yuvarlama hatası olmasın.
  - Kayıtlar sadece eklensin, düzeltme ayrı satır olsun.
  - Önce yalnızca telefonda çalışsın, sunucu tablosu sonra gelsin. Sunucu tablosu yeni bir SQL dosyası olacak; Aloni'nin üretim kurallarına göre test, inceleme ve senin onayınla yüklenecek.
  - Muhasebeci için CSV çıkışı olsun.
  - Farmable'dan kalan eksikler (gübre/sulama kaydı, iş anındaki hava, QR kasa etiketi, yıllık karşılaştırma) aynı plana bağlansın, çünkü gübre ve sulama kaydı doğrudan gideri besliyor.

**Sıra (önerim):**
1. Kararlar (aşağıdaki 8 soru).
2. Elle kayıt yapılan para defteri.
3. Otomatik bağlantılar (stok, sipariş, yevmiye).
4. Raporlar ve muhasebeci çıktısı.
5. Gübre ve sulama kaydı ile hava bilgisi.
6. QR kasa etiketi ve paylaşım kartları.
7. Sunucu senkronu.

**Senden istenenler:** Bölüm 9'daki soruları cevapla. Bu plan Claude Code'da açılınca önce 1. aşamanın `docs/milestones/` planı yazılır, sen onaylarsın, sonra kod başlar.

---

## 1. Goal

Give Bora a simple, multi-year record of money in and money out, tied to what Aloni already knows (crates, orders, stock, jobs, parcels). The point is that he can answer "what did this year earn, which crop or parcel pays, what does a crate cost me" without a spreadsheet. Around it, use the same records for traceability and brand content (Twoislandsdallas) without leaking private data.

## 2. Non-goals and hard limits (never break)

- **Not official bookkeeping.** No invoices, no receipts, no myDATA transmission, no tax or VAT computation, no "you owe X". Greek e-invoicing and the digital delivery note (mandatory from 12 Oct 2026 for the Phase B movements) stay with Bora's accountant or the official tools. The UI says «Προσωπικό βιβλίο εσόδων–εξόδων, όχι λογιστικά βιβλία» on the ledger screen and on every export.
- **Thresholds are information, not advice.** The special VAT regime limits (sales < €15,000 in the previous year and subsidies < €5,000) are shown as a progress line with the source and date. The app never says which regime Bora is in or must move to.
- **Workers never see money.** No prices, totals, wages or customer balances on worker screens or worker phones (RLS and the phone data set, like orders today).
- **Append-only.** Money rows are never edited or deleted. Corrections are amending rows (`amends_id`), as with spray, harvest and stock. Audit-logged and kept for 3 years or more. Ask the accountant whether this should be 5 years.
- **No invented numbers.** A missing price is shown as unknown («χωρίς τιμή»), never as 0 and never as a default. Profit for a crop with unpriced crates is marked incomplete. The same rule covers labels (CLAUDE.md rule 1).
- **Money in integer cents (EUR).** Display uses Greek formats (1.234,50 €). No floats anywhere in money code.
- **Demo farm only for sample money.** Real data starts empty (CLAUDE.md rule 4).
- **Share cards and public QR pages never carry** prices, totals, customer names, worker names, parcel location or spray data. This is the rule from the 2026-11-21 design sprint.

## 3. The five roles (team review format, as in the design sprint)

- **Farmer (Bora).** "I want one number at the top: this year's result. Then which crop pays. Most money comes from crates, so a loaded order must become income by itself. Seed, fertiliser and spray costs must come from the stock receipt where I already type the batch. Wages per day, diesel, water, power, repairs, land rent: two taps. Subsidies and the 6% VAT refund are income too. I need to know who still owes me for crates. And warn me when sales get near the €15,000 limit, so I can call the accountant in time."
- **App user.** "Three taps for a manual entry: amount, category chip, date (today by default). Remember the last price per customer × crop. Works with no signal. A wrong entry gets 'Correct' (an amending row) and a 5-second undo, never a delete. One line on Σήμερα: «Νοέμβριος: +2.340 € / −870 €». Big numbers, ≥16 px, ≥56 px targets."
- **Influencer (Twoislandsdallas).** "The crate label QR is the story: a buyer scans it and sees «Σπανάκι · κόπηκε Δευ 23 Νοε · Μέγαρα» and the brand. That page has no prices, no names and no exact field. Weekly cards ('this week 340 κλούβες') and a season-end card ('2026: 4.200 κλούβες, 6 crops') get posted. Money never goes in a post."
- **Graphic designer.** "Ledger screen: one big net number, two bars (in/out) per month, category list with icons. Use the brand palette: Aloni green for income, kireç taşı for expense. Meaning comes from the icon and sign, never from colour alone. The crate label is A7 or 50×30 mm thermal: QR, crop drawing, date, crate count, small Aloni mark, and the Twoislandsdallas logo as the seller. Share cards use the existing ring mark and sage background. Use the `dataviz` skill and `docs/brand/brand.md`."
- **Developer.** "Local-first first: Dexie tables and screens with the Demo farm, then one new SQL migration (next free number, after 0041/0042) for `money_entries` and `prices`, owner-only RLS, red tests with real `authenticated` owner and worker roles, Codex review, applied by Bora's workflow. Hook the auto-entries into existing writes in the same atomic `putMany`, so a loaded order and its income row never exist apart. Export CSV with the formula-injection guard from `export/register.ts`."

## 4. Data model (proposal, decide in the phase plan)

```
money_entries   id, farm_id, occurred_on (date, Europe/Athens), direction (in|out),
                category (sale|subsidy|vat_refund|other_in|seed|fertiliser|ppp|labour|fuel|water|power|repair|rent|packaging|transport|equipment|fees|other_out),
                amount_cents (int > 0), currency 'EUR',
                crop_id?, parcel_id?, planting_id?, customer_id?, worker_id?,
                source (manual|order|stock_lot|labour_day), source_id?,   -- auto rows point back at their origin
                note?, photo_media_id?, doc_ref? (invoice/receipt number typed by Bora, free text),
                amends_id?, created_at/by, server_seq ...                -- append-only; a correction is a new row
prices          id, farm_id, crop_id, customer_id?, price_cents_per_crate, valid_from   -- last-used price; customer-specific overrides farm default
stock_lots      + unit_cost_cents?, total_cost_cents?   (typed at Receive; unknown allowed)
customer_orders + price_cents_per_crate? (copied from prices when loaded; editable before loading)
```

Derived (pure functions in `/app/src/money/`, unit-tested):
- `yearSummary(entries, year)`: in, out, net, per month, per category.
- `cropResult(entries, harvests, year)`: income per crop, direct costs per crop, cost per crate, with `incomplete` when crates have no price or costs are unassigned.
- `parcelResult(...)`: the same per parcel. Shared costs are split by στρέμματα only if Bora turns that on; otherwise they show as "not assigned".
- `receivables(orders, payments)`: crates loaded but not paid, per customer.
- `regimeWatch(entries, year)`: sales and subsidies against the €15,000 / €5,000 limits, with the source link and date. Information only.

## 5. Phases (each one becomes a milestone plan first)

**F0 – Decisions (no code).** Bora answers §9. The answers go into `docs/DECISIONS.md` with the date.

**F1 – Manual ledger, phone only.**
- Screens: Άλλα → «Ταμείο»: year picker, big net number, month bars, category list, «＋ Έσοδο» / «＋ Έξοδο».
- Entry form: amount, category chips, date, optional crop/parcel/customer, note, receipt photo (reuses `media`).
- Correct = amending row. 5 s undo.
- Owner only. Demo farm gets fictional entries.
- Tests: Vitest for the money functions (cents, Greek formatting, amendments), Playwright at 375 px WebKit.
- Done when: Bora can enter a month of real entries on his iPhone and the totals match his notebook.

**F2 – Auto entries.**
- Stock Receive asks for a cost (optional; unknown allowed) and writes an `out` row.
- An order marked «Φορτώθηκε» with a price writes an `in` row.
- Labour: a «μεροκάματο» quick entry per worker per day (amount typed by Bora; no wage rules).
- Each auto row links to its source, and a correction of the source writes an amending money row.
- Done when: a full Demo week (receive → spray → harvest → load) shows the right ledger without manual typing, tested end to end.

**F3 – Reports and accountant export.**
- Crop and parcel results with cost per crate, year-over-year comparison, receivables per customer, and the regime watch line.
- Export: CSV (UTF-8 BOM, semicolons, formula guard) and a Greek PDF with the "not official books" line, plus a ZIP of receipt photos for a date range.
- Done when: Bora sends one export to his accountant and the accountant confirms the export is usable.

**F4 – Farmable gaps that feed the ledger** (from `replica/recon.md`).
- Fertilise and irrigation log screens, on the tables that already exist since 0003. The cost per application comes from the stock lot.
- Fill and show `jobs.weather_snapshot`.
- Season-over-season harvest.

**F5 – Traceability and brand.**
- QR crate label (reuse `auth/qr.ts`, `share/render.ts`). Print or share as an image.
- The QR opens a **public read-only page**. This page needs Bora's decision: where it is hosted, which fields it shows, and a privacy line. Phase 1 option without a server: the QR only encodes a short text («Σπανάκι · 23/11/2026 · Twoislandsdallas»), with no page at all.
- Weekly and season share cards on the existing share flow.
- Link to the Twoislandsdallas site (separate repo `seaevill/twoislandsdallas`).

**F6 – Server sync for money.**
- One SQL migration per CLAUDE.md production rules: a new number, a red test first, owner-only RLS (workers get zero rows), the sync whitelist, pull, the visibility hash and the phone contract, Codex review. Bora applies it through «Supabase migrate (manual)».
- Until then the screen says «μόνο σε αυτό το τηλέφωνο», like the season targets (E6).
- Backup export (Άλλα → Αντίγραφο) must include money rows from F1 on, because the phone is the only copy until F6.

## 6. Extra ideas (not yet scheduled; Bora picks)

1. **Cost per crate alert (information):** "Spinach this season costs 3,10 € per crate; your average price is 4,00 €." No advice, just the two numbers.
2. **Price history per customer:** a chart of the price per crate over the years, from the `prices` rows.
3. **Season plan with money:** target crates × last price gives the expected income next to the season target ring (E6). Marked "estimate".
4. **Subsidy calendar:** typed dates for ΟΣΔΕ (myAGRO) and the VAT refund window (for 2025 invoices: open until 15 Dec 2026), as reminders Bora sets himself. No auto-filled legal dates.
5. **Invoice photo inbox:** snap now, categorise later. The ledger shows "3 photos waiting".
6. **Year-end pack:** one tap creates a ZIP with the CSV, the PDF, the receipt photos and the spray register CSV for the accountant and an inspection.
7. **Customer statement:** a WhatsApp-ready image for one customer listing "crates delivered / paid / open". It is not an invoice. Bora sends it himself.
8. **Labour view:** days worked per worker per month from jobs and harvest logs, for Bora's own wage notes. Only Bora sees it, and the worker privacy notice gets updated first.
9. **Twoislandsdallas shop link:** a crop marked "available this week" (from «Διαθέσιμες κλούβες») can be exported as a short list for the brand's Instagram story or website, without prices unless Bora adds them.
10. **Pilot readiness:** keep money categories generic, so the 5–10 neighbouring growers (Phase 2) can use the ledger without changes.

## 7. Risks

- Money data is personal and financial. It stays owner-only, EU-hosted and is never shared. The privacy notice gets a line before F6.
- Bora may treat the ledger as official books. The label on every screen and export plus the accountant check in F3 cover this.
- Tax rules change (2026 saw several AADE circulars). The regime watch shows its source and date and is reviewed each January.
- The phone is the only copy before F6. The backup reminder covers money from F1.

## 8. Test checklist pattern (per phase)

As in every milestone: a Greek checklist for Bora's iPhone, a Turkish summary, CI green (typecheck, Vitest, Playwright 375 px WebKit), screenshots in `docs/design/compare/`.

## 9. Questions for Bora (answer before F1)

1. Is a sale price per **crop** or per **customer × crop**? Do prices change during the season?
2. Do customers pay on delivery, weekly or monthly? Should Aloni track who still owes money?
3. Do you have an accountant (λογιστής)? Which export do they want: CSV, PDF or both?
4. Which expense categories do you really use? (The list in §4 is a starting point.)
5. Wages: a fixed amount per day per worker, or typed each time?
6. Should shared costs (diesel, water, power) be split across parcels by στρέμματα, or stay "farm-wide"?
7. Crate label: printed (do you have a label printer?) or only shared as an image on WhatsApp?
8. The public QR page for buyers: yes now (needs a small public page and a privacy line), or later? Until then the QR shows text only.

## Sources checked (2026-11-23)

- AADE press release, 6% flat-rate VAT refund for special-regime farmers (2025 invoices, applications until 15 Dec 2026): https://www.aade.gr/sites/default/files/2026-04/dt_01.04.2026_1.pdf
- Special-regime limits (sales < €15,000, subsidies < €5,000), circular E.2014/2026 summary: https://regfollower.com/?p=80426
- Digital delivery notes for farm products, Phase B mandatory from 12 Oct 2026: https://www.naftemporiki.gr/finance/economy/2143359/aade-ti-ischyei-gia-tin-psifiaki-ekdosi-parastatikon-diakinisis-apothematon-agrotikon-proionton/
- İmeceMobil (income/expense and regional prices idea): https://agritechobservatory.review.fao.org/fr/imecemobil
- Farmable recon: `replica/recon.md` (PR #480)
