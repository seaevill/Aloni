# ALONI — AUTOPILOT RAPORU (Türkçe, Bora için)

**Adresler (Cloudflare hesabından Bora'nın doğrulaması):** hesap alt alanı `ormanbora`; Worker `aloni`; canlı adres https://aloni.ormanbora.workers.dev ; Worker önizleme özelliği açık.
**PR önizleme adresleri — durum:** bu ortamdan `workers.dev` adreslerine erişilemiyor (çıkış vekili reddediyor) ve Cloudflare API/CLI anahtarı yok; bu yüzden herhangi bir PR önizleme adresini **doğrulayamadım**. Her PR'ın «Workers Builds: aloni» kontrolü (başarılı/başarısız) ve panel bağlantısı (`details_url`, biçim: `https://dash.cloudflare.com/<hesap>/workers/services/view/aloni/production/previews/<dal-adı>/builds/<derleme-no>`) rapora yazılır. **Tahmini** önizleme adresi biçimi (Cloudflare'in belgelenmiş dal-takma-adı kuralı, DOĞRULANMADI): `https://<dal-adı-küçük-harf-tire>-aloni.ormanbora.workers.dev`. Ana adres önizleme DEĞİL, canlıdır. Doğru önizleme adresini görmek için Bora bir PR'ın panel bağlantısını açıp «Preview URL»ü bir kez bu satıra yapıştırırsa biçim doğrulanmış olur.

Her koşu bu başlığın altına yeni bir bölüm ekler. Durum sözleri: **uygulandı · test edildi · birleşti · derlendi (Cloudflare) · canlıda doğrulandı** — «birleşti» «canlıda» demek değildir. Uydurma ilerleme yazılmaz.

## 2026-11-25 03:00 (gece vardiyası, otomatik) — geri-al bildirimleri de «telefonda» diyor
- **Tamamlanan iyileştirme:** QUEUE #6b — yeni bir χωράφι, φύτευση, προϊόν, ετικέτα, εργάτης veya ανάλυση kaydedilince alttaki siyah «Αναίρεση» bildiriminde, eski yazının altına kaydın nerede olduğu yazılıyor: «Αποθηκεύτηκε στο τηλέφωνο. Θα σταλεί όταν συνδεθεί λογαριασμός.» Άλλα → Φωτογραφίες ekranında da «Η φωτογραφία αποθηκεύτηκε.» altında aynı satır var. Demo çiftliğinde satır yok.
- **PR:** #549 — uygulandı, test edildi. Birleşme durumu PR'da (CI kapıları).
- **Özellik kaybı yok:** bildirim yazıları ve «Αναίρεση» aynen; arşivleme bildirimleri değişmedi; yeni çeviri anahtarı yok.
- **Önce/sonra (375 px, uçak modu, parsel kaydı):** `docs/design/offline-undo-where-before-375.png` → `docs/design/offline-undo-where-after-375.png`. 320/375/390'da yatay kaydırma yok.
- **Testler (yerel):** yeni e2e önce kırmızı, sonra tüm kontrolleri geçti; vitest tamamı 810 geçti; tsc, eslint temiz. Çevrimdışı testler yerelde yalnızca bilinen `icon-192` ortam hatasıyla düşüyor; karar CI'da (WebKit).
- **Cloudflare önizleme:** herkese açık adres doğrulanamıyor; panel bağlantısı PR'ın «Workers Builds» kontrolünde.
- **Kalan sorun:** hasat formundaki «N κλούβες» satırı değişmedi (bu satır yalnızca işçi ekranında çıkıyor ve orada «telefonda» satırı zaten var).
- **Sıradaki öncelik:** QUEUE #7 — ilk açılış boyutu.
- **Bora'dan karar:** yok.

## 2026-11-25 02:00 (gece vardiyası, otomatik) — çevrimdışı kayıt ifadesi
- **Tamamlanan iyileştirme:** QUEUE #6 (ilk dilim) — Σήμερα ekranında ilaçlama, hasat, iş ve gözlem kaydedildiğinde mevcut onay yazısının altına kaydın **nerede** olduğu yazılıyor: «Αποθηκεύτηκε στο τηλέφωνο. Θα σταλεί όταν συνδεθεί λογαριασμός.» Eşitleme açıkken ve kayıt bekliyorsa «Αποθηκεύτηκε · θα σταλεί όταν έχει σήμα»; gönderildiyse ek satır yok. Demo çiftliğinde bu satır hiç çıkmıyor (Demo hiçbir yere gönderilmez).
- **PR:** #548 — uygulandı, test edildi. Birleşme durumu PR'da (CI bekleniyor).
- **Özellik kaybı yok:** eski onay yazıları aynen duruyor; yeni çeviri anahtarı yok (var olanlar kullanıldı).
- **Önce/sonra (320/375/390 px, gerçek çiftlik, uçak modu, hasat sonrası):** `docs/design/screenshots-2026-11-25/saved-where/`. Yatay kaydırma yok.
- **Testler (yerel):** yeni birim testi önce kırmızı sonra yeşil; vitest tamamı 810 geçti; tsc, eslint temiz; ilgili 21 Playwright testi geçti. 2 çevrimdışı test yerelde yalnızca bilinen `icon-192` ortam hatasıyla düşüyor (tüm kontrolleri geçtikten sonra); karar CI'da (WebKit).
- **Cloudflare önizleme:** herkese açık adres doğrulanamıyor; panel bağlantısı PR'ın «Workers Builds» kontrolünde.
- **Kalan sorun:** geri-al bildirimleri (parsel, ekim, ürün, etiket, işçi, analiz), hasat formundaki «N κλούβες» satırı ve fotoğraflar henüz bu satırı göstermiyor → QUEUE #6b.
- **Sıradaki öncelik:** QUEUE #6b.
- **Bora'dan karar:** yok.

## 2026-11-25 01:00 (gece vardiyası, otomatik) — Χωράφια parsel detayı
- **Tamamlanan iyileştirme:** QUEUE #5 — parsel detayı artık adın hemen altında üç ana bilgiyle açılıyor: **Εμβαδόν**, hasat bekleme satırı (**Κοπή από …**; bilinmiyorsa kırmızı çerçeve aynen duruyor) ve **Τελευταίος ψεκασμός** (ürün · tarih). Önceden bekleme ve son ilaçlama çizimin, bitki etiketlerinin ve bilgi kartının altında, ilk ekranın dışındaydı.
- **PR:** #547 — uygulandı, test edildi. Birleşme durumu bir sonraki bölümde/STATE.md'de.
- **Özellik kaybı yok:** çizim, bitki etiketleri, Τοπογραφία/Υψόμετρο/ΟΣΔΕ, ΚΑΕΚ, kesim kayıtları, hava, ekimler, tarla işleri, su, «Τελευταίοι ψεκασμοί» listesi, geçmiş, analizler, düzenleme yerinde. Εμβαδόν alttaki karttan üste taşındı (iki kez görünmüyor). Yeni çeviri anahtarı yok.
- **Önce/sonra (320/375/390 px, Demo çiftliği, Κάτω Κάμπος):** `docs/design/screenshots-2026-11-25/parcel-detail-{before,after}-*.png`. Yatay kaydırma yok.
- **Testler (yerel):** yeni e2e önce kırmızı, sonra yeşil (3/3); tsc, vitest tamamı (806), eslint temiz; ilgili 42 Playwright testi geçti (chromium). WebKit yalnızca CI'da.
- **Cloudflare önizleme:** herkese açık adres doğrulanamıyor; panel bağlantısı PR'ın «Workers Builds» kontrolünde.
- **Kalan sorun (eski):** 320 px'te alt menüde «Χωράφια» yazısı iki satıra kayıyor (bu PR'dan önce de vardı).
- **Sıradaki öncelik:** QUEUE #6 — çevrimdışı yazma denetimi.
- **Bora'dan karar:** yok.

## 2026-11-24 gece (etkileşimli oturum) — ALONI NIGHT SHIFT, ilk iki ekran
- **Birleşti (canlıda DEĞİL):** #544 Αποθήκη — «Υπόλοιπο» artık her ürün kartında adın hemen altındaki ilk satır, başlık boyutunda (22 px). #545 Φυτά — arama kutusunun ipucu yazısı telefonda kesiliyordu; arama tam satır aldı, ipucu kısaldı, «Ημερολόγιο σεζόν» düğmesi listenin sonuna taşındı. İlk ekranda hâlâ 6 bitki satırı.
- **Önce/sonra (320/375/390 px, Demo çiftliği):** `docs/design/screenshots-2026-11-24/stock-p3/` ve `crops-p3/`. Üç genişlikte de yatay kaydırma yok.
- **Testler:** CI tamamen yeşil (check, sql, static, 3 WebKit e2e, pr-size, Workers Builds) her iki PR'da. Yerelde stock.spec/products.spec offline testleri `icon-192.png` hatasıyla düşüyor; temiz main'de de aynı (ortam sorunu, CI yeşil).
- **Cloudflare:** derleme başarılı; herkese açık önizleme adresi alınamadı (doğrulanmadı). Panel bağlantıları: #544 https://dash.cloudflare.com/95b3c021891c1ac025fc5a028ac5a2b7/workers/services/view/aloni/production/previews/claude-stock-balance-first/builds/10a19ee1-8ce6-4d70-ae1a-3bb529af0f62 · #545 https://dash.cloudflare.com/95b3c021891c1ac025fc5a028ac5a2b7/workers/services/view/aloni/production/previews/claude-crops-rhythm/builds/ae3f3123-f09a-486d-9767-2cc9cd9dfbd0
- **Telefonda önce bak:** Αποθήκη (kart başına büyük «Υπόλοιπο»), Φυτά (arama ipucu tam görünüyor).
- **Sıradaki:** QUEUE #5 Χωράφια parsel detayı (üç ana bilgi önce), sonra Σήμερα incelemesi. Gece rutini 00:00'dan itibaren devam eder.

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
