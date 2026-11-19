# BACKLOG – iş listem (Claude)

Bu dosya benim iş listem. Bitirdiğimi `[x]` ile işaretlerim. `docs/reviews/team/` altına yeni bir dosya gelince oradaki **MUST** bulguları en üste «ACİL» olarak eklerim. Bora yalnızca `docs/STATUS.md`'ye bakar.

## ACİL (ekip incelemesi: açık MUST)
- Şu an açık MUST yok (2026-11-19-m5-0024 MUST 1 ve m5-0027 bulguları düzeltildi, ekibin yeniden bakması bekleniyor).

## E1 – Güvenlik (0022–0027 yerinde düzeltme)
- [x] 1–8: MUST 1, SHOULD 2–7, LOW 8 düzeltildi (#152, #153, #154). *Bitti ölçütü:* `supabase/tests/m7_review.sql` ve `m7_start.sql` gerçek authenticated sahip rolüyle yeşil; plain/supabase/upgrade/cli_push yeşil. ✔
- [ ] Ekip yeniden inceleyip MUST'ları KAPALI işaretleyecek. *Bitti ölçütü:* `docs/reviews/team/` altında 0022–0027 için «CLOSED» notu.

## E2 – Görünüm (hedef: v2 prototip düzeni + tasarım 2 dili)
- [x] 1. `docs/design/prototype-map.md`: prototipteki her ekran ↔ uygulamadaki karşılığı. *Bitti:* her prototip ekranı satırı var.
- [ ] 2. `docs/design/compare/`: her ekran için 375 px prototip | uygulama yan yana görüntü + fark listesi. *Bitti:* her ekran için bir PNG ve bir fark listesi.
- [ ] 3a. Σήμερα prototip düzenine. 3b. Tarla detayı. 3c. İlaçlama kaydı. 3d. İşçi ekranı. 3e. Diğer ekranlar. *Bitti (her biri):* ayrı PR, önce/sonra görüntü, kontrast ≥7:1, 72 px işçi düğmesi, 375 px taşma yok, Yunanca-yalnızca ve glossary testleri yeşil, prototip benzerliği öz puanı STATUS'ta.
- [ ] 4. Prototipte olup uygulamada olmayan her bölüm için ayrı madde (prototype-map.md'de «eksik» sütunu → buraya madde). *Bitti:* her eksik için madde açıldı; güvenlik kuralına uyanlar yapıldı.
- [ ] 5. Her ekran için prototip benzerliği ≥ 9/10 (öz puan). *Bitti:* STATUS'ta ekran başına puan tablosu ve hepsi ≥ 9.

## E3 – Kapıları açma hazırlığı
- [ ] 0028 fotoğraf deposu (Supabase Storage, çiftlik başına özel bucket, RLS, işçi yalnızca kendi işinin fotoğrafı, SHA-256, boyut sınırı). *Bitti:* migration + önce kırmızı test (gerçek authenticated) + açık MUST yok.
- [x] EPPO kodları ekip listesine göre (PR #156), her kodun yanında https://gd.eppo.int/taxon/KOD, kilitleyen test. *Bitti:* `eppo.ts` + test + mapping belgesi güncel.
- [ ] Sihirbaz LIVE öncesi son adım olarak gözden geçirildi; STATUS'ta «canlıya geçiş kontrol listesi». *Bitti:* kontrol listesi STATUS'ta; sihirbaz testleri yeşil.

## E4 – Günlük fayda
- [ ] Hava: Edge Function deploy hazırlığı (RUNBOOK'ta Bora'nın tıklayacağı adımlar) + veri gelince şerit dolsun. *Bitti:* RUNBOOK bölümü + veri geldiğinde şeridin dolduğunu gösteren test.
- [ ] Sipariş bağlantısı 1. adım: Κλούβες JSON yedeği içe aktarma → «Διαθέσιμες κλούβες» ve ekim önerisi ekranı; PHI'de bekleyen hasat arz sayılmaz. *Bitti:* içe aktarma + ekran + PHI testi.
- [ ] Bildirimler: imzalı kurallar için gösterim (gönderim yok, sessiz saat korunur). *Bitti:* ekran + «imzasız kural bildirim göstermez» testi.

## E5 – Kalite
- [ ] Kalan golden vakalar (yalnızca veri); geçen/atlanan sayısı STATUS'ta. *Bitti:* sayı yazılı.
- [ ] e2e: tank karışımı, düzeltme, harita, işçi daveti (sahip tarafı da). *Bitti:* her biri için 375 px testi yeşil.

## E6 – Bora kararları
- [ ] STATUS.md «(d)» bölümünde sade dille, varsayılan önerimle: EPPO onayı, OpenFreeMap şartları, Hintçe kontrolü, logo, veri sorumlusu bilgileri, LIVE. *Bitti:* bölüm güncel.
