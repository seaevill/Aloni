# BACKLOG – iş listem (Claude)

## ACİL – ekip incelemesi m8 (2026-11-20): 2 MUST + 4 SHOULD → 0032 İLE DÜZELTİLDİ (ekip yeniden bakacak)
- [x] M1, M2 (MUST): tek kapı `private.planting_gate`; [x] S1 iş satırı kilidi; [x] S2 `harvest_conflicts` aynı kapıyla; [x] S3 işçi yalnızca kendini seçer; [x] S4 ayrı dar token (Vault); [x] LOW L1–L5; [x] RUNBOOK §15 üretim kontrolü.

## ACİL – ekip incelemesi m7 (2026-11-19): 2 MUST + 1 SHOULD → YERİNDE DÜZELTİLDİ (ekip yeniden bakacak)
- [x] N1 (MUST): etiket eşleşmesi iş başına değil **ekim (ürün) başına**; etiketsiz = bilinmiyor = hasat kapalı; başka ürünün etiketi, düzeltmeyle yazılan PHI ve ilaçlamadan sonra bağlanan ekim yolları kapandı (`complete_spray_job` dahil). Test: `supabase/tests/m12_m7.sql`.
- [x] N2 (MUST): sahip için de ilaçlama bitişi şu andan ileri olamaz (işçiyle aynı); hasat kapısı «şimdi» için her kaydı sayar, bilinmeyen PHI her durumda kapalı.
- [x] N3 (SHOULD): stok kontrolü `sync_xid = pg_current_xact_id()` ile eşleşir; telefonun `created_at`'ine güvenilmez.
- [x] N4 (LOW): `weather_fetch_state` çiftlik+parsel bileşik anahtarla bağlandı. [x] LOW: ekim için sahte geçmiş testi eklendi.


Bu dosya benim iş listem. Bitirdiğimi `[x]` ile işaretlerim. `docs/reviews/team/` altına yeni bir dosya gelince oradaki **MUST** bulguları en üste «ACİL» olarak eklerim. Bora yalnızca `docs/STATUS.md`'ye bakar.

## ACİL (ekip incelemesi: açık MUST)
- Şu an açık MUST yok (2026-11-19-m5-0024 MUST 1 ve m5-0027 bulguları düzeltildi, ekibin yeniden bakması bekleniyor).

## E1 – Güvenlik (0022–0027 yerinde düzeltme)
- [x] 1–8: MUST 1, SHOULD 2–7, LOW 8 düzeltildi (#152, #153, #154). *Bitti ölçütü:* `supabase/tests/m7_review.sql` ve `m7_start.sql` gerçek authenticated sahip rolüyle yeşil; plain/supabase/upgrade/cli_push yeşil. ✔
- [ ] Ekip yeniden inceleyip MUST'ları KAPALI işaretleyecek. *Bitti ölçütü:* `docs/reviews/team/` altında 0022–0027 için «CLOSED» notu.

## E2 – Görünüm (hedef: v2 prototip düzeni + tasarım 2 dili)
- [x] 1. `docs/design/prototype-map.md`: prototipteki her ekran ↔ uygulamadaki karşılığı. *Bitti:* her prototip ekranı satırı var.
- [ ] 2. `docs/design/compare/`: her ekran için 375 px prototip | uygulama yan yana görüntü + fark listesi. *Bitti:* her ekran için bir PNG ve bir fark listesi.
- [x] 3a. Σήμερα prototip düzenine (7/10). [x] 3b. Tarla detayı (7/10). 3c. İlaçlama kaydı. 3d. İşçi ekranı (prototipte karşılığı yok; tema örneği `applied/t2` zaten uygulandı). 3e. Diğer ekranlar: [x] Αποθήκη (7/10) [ ] Άλλα [x] Μητρώο (7/10). *Bitti (her biri):* ayrı PR, önce/sonra görüntü, kontrast ≥7:1, 72 px işçi düğmesi, 375 px taşma yok, Yunanca-yalnızca ve glossary testleri yeşil, prototip benzerliği öz puanı STATUS'ta.
- [x] 3a. Σήμερα prototip düzenine (7/10). [x] 3b. Tarla detayı (7/10). 3c. İlaçlama kaydı. [x] 3d. İşçi ekranı: üç sekme altta bulanık eylem tepsisinde, 72 px düğmeler (7/10; prototipte karşılığı yok, tema B örneği esas). 3e. Diğer ekranlar: [x] Αποθήκη (7/10) [ ] Άλλα [ ] Μητρώο. *Bitti (her biri):* ayrı PR, önce/sonra görüntü, kontrast ≥7:1, 72 px işçi düğmesi, 375 px taşma yok, Yunanca-yalnızca ve glossary testleri yeşil, prototip benzerliği öz puanı STATUS'ta.
- [x] 3a. Σήμερα prototip düzenine (7/10). [x] 3b. Tarla detayı (7/10). [x] 3c. İlaçlama kaydı: koyu bant + geri (6/10; prototipte karşılığı yok). 3d. İşçi ekranı (prototipte karşılığı yok; tema örneği `applied/t2` zaten uygulandı). 3e. Diğer ekranlar: [x] Αποθήκη (7/10) [ ] Άλλα [ ] Μητρώο. *Bitti (her biri):* ayrı PR, önce/sonra görüntü, kontrast ≥7:1, 72 px işçi düğmesi, 375 px taşma yok, Yunanca-yalnızca ve glossary testleri yeşil, prototip benzerliği öz puanı STATUS'ta.
- [ ] 4. Prototipte olup uygulamada olmayan her bölüm için ayrı madde (prototype-map.md'de «eksik» sütunu → buraya madde). *Bitti:* her eksik için madde açıldı; güvenlik kuralına uyanlar yapıldı.
- [ ] 5. Her ekran için prototip benzerliği ≥ 9/10 (öz puan). *Bitti:* STATUS'ta ekran başına puan tablosu ve hepsi ≥ 9.

- [ ] İşçi ekranında mockup'ın sabit «eylem tepsisi» (bulanık, 72 px düğmeler). *Bitti:* tepsi + e2e.
- [ ] Ürün detayına «önerilen eylem» + «Why?» sayfası (imzasız kural: yalnızca veri). *Bitti:* sayfa + test.

## E3 – Kapıları açma hazırlığı
- [ ] 0028 fotoğraf deposu (Supabase Storage, çiftlik başına özel bucket, RLS, işçi yalnızca kendi işinin fotoğrafı, SHA-256, boyut sınırı). *Bitti:* migration + önce kırmızı test (gerçek authenticated) + açık MUST yok.
- [x] EPPO kodları ekip listesine göre (PR #156), her kodun yanında https://gd.eppo.int/taxon/KOD, kilitleyen test. *Bitti:* `eppo.ts` + test + mapping belgesi güncel.
- [x] 0028 fotoğraf deposu (PR; apply bekliyor) (Supabase Storage, çiftlik başına özel bucket, RLS, işçi yalnızca kendi işinin fotoğrafı, SHA-256, boyut sınırı). *Bitti:* migration + önce kırmızı test (gerçek authenticated) + açık MUST yok.
- [ ] EPPO kodları ekip listesine göre, her kodun yanında https://gd.eppo.int/taxon/KOD, kilitleyen test. *Bitti:* `eppo.ts` + test + mapping belgesi güncel.
- [ ] Sihirbaz LIVE öncesi son adım olarak gözden geçirildi; STATUS'ta «canlıya geçiş kontrol listesi». *Bitti:* kontrol listesi STATUS'ta; sihirbaz testleri yeşil.
- [x] Sihirbaz LIVE öncesi son adım olarak gözden geçirildi; STATUS'ta «canlıya geçiş kontrol listesi» (bu PR). Sihirbaz testleri yeşil (live e2e).

## E4 – Günlük fayda
- [x] Hava (BÜYÜK, 4 parça): (i) `weather-fetch` gövdesini yaz (parselleri oku, Open-Meteo'dan çek, `weather_daily`'ye yaz); (ii) migration 0029: sahip/işçi için `farm_weather(p_farm)` okuma fonksiyonu + test; (iii) telefonda senkron turunda `weather` tablosunu doldur; (iv) RUNBOOK'a Bora'nın tıklayacağı deploy + pg_cron adımları. Şu an yalnızca iskelet var. Hava: Edge Function deploy hazırlığı (RUNBOOK'ta Bora'nın tıklayacağı adımlar) + veri gelince şerit dolsun. *Bitti:* RUNBOOK bölümü + veri geldiğinde şeridin dolduğunu gösteren test.
- [x] Bildirimler: imzalı kurallar için gösterim (gönderim yok, sessiz saat korunur). *Bitti:* ekran + «imzasız kural bildirim göstermez» testi.
- [x] Sipariş bağlantısı 1. adım: Κλούβες JSON yedeği içe aktarma → «Διαθέσιμες κλούβες» ve ekim önerisi ekranı; PHI'de bekleyen hasat arz sayılmaz. *Bitti:* içe aktarma + ekran + PHI testi.

## E5 – Kalite
- [x] Kalan golden vakalar (yalnızca veri); geçen/atlanan sayısı STATUS'ta. *Bitti:* sayı yazılı.
- [ ] e2e: tank karışımı, düzeltme, harita, işçi daveti (sahip tarafı da). *Bitti:* her biri için 375 px testi yeşil.
- [ ] Kalan golden vakalar (yalnızca veri); geçen/atlanan sayısı STATUS'ta. *Bitti:* sayı yazılı.
- [x] e2e: tank karışımı, düzeltme, harita, işçi daveti (sahip tarafı da). *Bitti:* her biri için 375 px testi yeşil. *Not:* hepsi 375 px testi olarak mevcut ve CI yeşil: tank `spray.spec` :198, düzeltme :164, harita `map.spec`, işçi daveti sahip tarafı `live-auth.spec` :53, işçi tarafı `live-worker.spec` :32.

## E6 – Bora kararları
- [x] STATUS.md «(d)» bölümünde sade dille, varsayılan önerimle: EPPO onayı, OpenFreeMap şartları, Hintçe kontrolü, logo, veri sorumlusu bilgileri, LIVE. *Bitti:* bölüm güncel.
- 2026-11-21 (D12): attach a photo to the CURRENT JOB (not only to an observation) = add `job_id` to the phone media row, the phone contract (phone-columns.json) and the media sync, then a server check that the job belongs to the farm. Worker photo upload permission (media RLS) is also unproven by the mock: check in RUNBOOK 12c.
- 2026-11-21 (weather sheet): hourly forecast needs the phone to pull `weather_hourly` (sync + contract change); today the sheet says why it has none.
- 2026-11-21 (tasks cycle): the worker's «Δεν έγινε» is offered only in the demo; on a real farm it needs a server function (0036+: `skip_spray_job`, assigned worker only, reason required, job -> skipped, audited) because a worker cannot write `jobs` rows. Separate SQL PR, Codex review, Bora applies. Until then the worker can only do «Έγινε»; an owner cancels a job on the owner phone.

- 2026-11-21 (0035 leftovers): index on weather_hourly (farm_id, at) after a workload measurement; remaining 30 SECURITY DEFINER functions to pg_catalog, pg_temp one by one with grant checks; farm_id indexes for applied_ops, audit_log, job_fertilise/irrigate/sow after caller + volume check; `supabase db lint` in CI (sql job has no Supabase CLI).
- 2026-11-21 (Codex final review of 0033/0034, SHOULD): before the ledger counts as the COMPLETE history of approvals, reconcile the older phone approval path with the ledger and add a direct-write guard on the label approval columns. Until then the older phone path stays and the ledger is the signed record for the gate only.
