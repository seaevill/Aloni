# ALONI — AUTOPILOT RAPORU (Türkçe, Bora için)

**Adresler (Cloudflare hesabından Bora'nın doğrulaması):** hesap alt alanı `ormanbora`; Worker `aloni`; canlı adres https://aloni.ormanbora.workers.dev ; Worker önizleme özelliği açık.
**PR önizleme adresleri — durum:** bu ortamdan `workers.dev` adreslerine erişilemiyor (çıkış vekili reddediyor) ve Cloudflare API/CLI anahtarı yok; bu yüzden herhangi bir PR önizleme adresini **doğrulayamadım**. Her PR'ın «Workers Builds: aloni» kontrolü (başarılı/başarısız) ve panel bağlantısı (`details_url`, biçim: `https://dash.cloudflare.com/<hesap>/workers/services/view/aloni/production/previews/<dal-adı>/builds/<derleme-no>`) rapora yazılır. **Tahmini** önizleme adresi biçimi (Cloudflare'in belgelenmiş dal-takma-adı kuralı, DOĞRULANMADI): `https://<dal-adı-küçük-harf-tire>-aloni.ormanbora.workers.dev`. Ana adres önizleme DEĞİL, canlıdır. Doğru önizleme adresini görmek için Bora bir PR'ın panel bağlantısını açıp «Preview URL»ü bir kez bu satıra yapıştırırsa biçim doğrulanmış olur.

Her koşu bu başlığın altına yeni bir bölüm ekler. Durum sözleri: **uygulandı · test edildi · birleşti · derlendi (Cloudflare) · canlıda doğrulandı** — «birleşti» «canlıda» demek değildir. Uydurma ilerleme yazılmaz.

## 2026-11-24 gece — Αποθήκη ve simülasyonlar
- **Birleşti (canlıda DEĞİL):** #541 — Αποθήκη ürün kartında başlık tek satır (ad + ⓘ), bakiye en güçlü satır. CI tamamen yeşil (check, sql, static, 3 WebKit e2e, pr-size, Workers Builds). Özellik kaybı yok; Demo sayfası 8293 → 7219 px.
- **Simülasyon A (saat 07 dalı) — doğrulandı:** geliştirme yapmadan Türkçe rapor üretti, kilit almadı, yalnızca docs PR'ı planladı, QUEUE'daki done/monitor satırlarını tekrar etmedi.
- **Simülasyon B (çökmüş koşu, eski kilit) — doğrulandı:** 90 dakikadan genç kilitte durdu; eski olsaydı kırmızı PR'ın FAILURE CONTEXT'ini okuyup devam edecekti, sıfırdan başlamayacaktı. Not: kilit adındaki saat ile zaman damgası tutarsız olabilir; kural gereği ISO zaman geçerli.
- **Hâlâ gerçek kanıt bekleyen:** bu gece 00:00 ve yarın 07:00 koşuları.
- **Önizleme adresi:** hâlâ doğrulanamadı (yalnızca panel bağlantıları).
- **Sıradaki:** QUEUE #4 — Φυτά listesi (yalnızca boşluk/yazı düzeni).

## 2026-11-24 akşam — otomasyon kurulumu ve ilk iş
- **Otomasyon (doğrulandı):** bulut zamanlayıcı VAR ve çalışıyor: «Aloni autopilot (gece vardiyası)», her gece İstanbul 00:00–07:00 saatlik. Deneme ateşlemesi (18:15 UTC) yeni kurallarla GitHub'ı okudu, açık PR listesini aldı, etkileşimli oturumu doğru algılayıp «müdahale yok» dedi. Kayıtlı durum depodan okundu (`STATE.md`). Gerçek yazma (push/PR) gece koşusunun daha önceki PR'larıyla (#518–#520) kanıtlı; yeni kurallarla ilk gerçek gece koşusu bu gece 00:00.
- **Sabah raporu:** ayrı «sabah doğrulaması» rutini kuruldu ama GitHub erişimi alamadı (403) → KAPATILDI. İşi gece vardiyasının 07:00 koşusuna taşıdım. İlk gerçek sabah raporu yarın 07:00 (İstanbul).
- **Tamamlanan iyileştirmeler:** QUEUE #1 — çift dokunuş koruması: sahip gözlem formu çift dokunuşta İKİ kayıt yapıyordu (e2e ile kanıtlandı, düzeltildi); alan işi, tekrarlayan kural, müşteri ve sipariş formları da aynı korumayı aldı. **#537 birleşti** (CI yeşil, WebKit dahil).
- **Hata (benim):** #537 var olan bir güvenlik testini (hasat/işçi/parsel çift dokunuş) yanlışlıkla ezdi; **#538 ile birebir geri yüklendi**, kural eklendi (`git ls-files` + diff özeti kontrolü).
- **CI:** ana dal yeşil; PR'larda `check`, `sql`, 3 e2e parçası yeşil.
- **Cloudflare önizleme:** her PR için «Workers Builds» önizleme derlemesi başarılı (panel bağlantısı kontrol çıktısında). Herkese açık önizleme adresi çıkmıyor → aşağıda karar.
- **Neyi göreceksin:** observation formunda hızlı çift dokunuş artık kopya kayıt yapmıyor. (Canlı doğrulama sende: «birleşti», «canlıda» değil.)
- **Kalan sorunlar:** `labeluse:118` ve `register-v2` izlemede (yeni hata bağlamı bekleniyor).
- **Sıradaki öncelik:** QUEUE #3 — Αποθήκη ekranı.
- **Bora'dan karar/eylem:** (1) önizleme adresi: Cloudflare → Workers & Pages → aloni → Settings → Domains & Routes'taki `*.workers.dev` adresini bu dosyanın başına yaz (BLOCKERS). (2) Ayrı bir sabah rutini istersen: claude.ai → Routines'te yeni rutin kurup depo seaevill/Aloni'yi kaynak olarak ekle.

## 2026-11-24 — kurulum
- **Tamamlanan iyileştirmeler:** henüz otomatik koşu yok. Elle yapılanlar `docs/DEVLOG-2026-11-24.md` içinde.
- **PR'lar:** bu belge setinin PR'ı.
- **CI:** ana dal yeşil (`f2e24c1`).
- **Cloudflare önizleme:** her PR için «Workers Builds» önizleme derlemesi çıkıyor (panel bağlantısı var); herkese açık önizleme adresi kontrol çıktısında yok → `BLOCKERS.md` ilk satır.
- **Neyi göreceksin:** henüz yeni görsel değişiklik yok.
- **Kalan sorunlar:** `labeluse:118`, `register-v2` izlemede.
- **Sıradaki öncelik:** QUEUE #1 (çift gönderim koruması denetimi).
- **Bora'dan karar/eylem:** önizleme adresi için workers.dev adresi (BLOCKERS).
