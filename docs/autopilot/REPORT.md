# ALONI — AUTOPILOT RAPORU (Türkçe, Bora için)

**Adresler (Cloudflare hesabından Bora'nın doğrulaması):** hesap alt alanı `ormanbora`; Worker `aloni`; canlı adres https://aloni.ormanbora.workers.dev ; Worker önizleme özelliği açık.
**PR önizleme adresi — GÜNCELLEME 2026-11-25:** Cloudflare botunun PR yorumunda gerçek adres yazıyor: `### Preview URL: https://<dal-adı>-aloni.ormanbora.workers.dev (commit …)` (örn. #563: https://claude-sync-planting-boundary-aloni.ormanbora.workers.dev). Adresi YALNIZCA bu yorumdan al; bu ortamdan açıp doğrulayamıyoruz (vekil engelliyor). Eski not: **PR önizleme adresleri — durum:** bu ortamdan `workers.dev` adreslerine erişilemiyor (çıkış vekili reddediyor) ve Cloudflare API/CLI anahtarı yok; bu yüzden herhangi bir PR önizleme adresini **doğrulayamadım**. Her PR'ın «Workers Builds: aloni» kontrolü (başarılı/başarısız) ve panel bağlantısı (`details_url`, biçim: `https://dash.cloudflare.com/<hesap>/workers/services/view/aloni/production/previews/<dal-adı>/builds/<derleme-no>`) rapora yazılır. **Tahmini** önizleme adresi biçimi (Cloudflare'in belgelenmiş dal-takma-adı kuralı, DOĞRULANMADI): `https://<dal-adı-küçük-harf-tire>-aloni.ormanbora.workers.dev`. Ana adres önizleme DEĞİL, canlıdır. Doğru önizleme adresini görmek için Bora bir PR'ın panel bağlantısını açıp «Preview URL»ü bir kez bu satıra yapıştırırsa biçim doğrulanmış olur.

Her koşu bu başlığın altına yeni bir bölüm ekler. Durum sözleri: **uygulandı · test edildi · birleşti · derlendi (Cloudflare) · canlıda doğrulandı** — «birleşti» «canlıda» demek değildir. Uydurma ilerleme yazılmaz.

## 2026-11-26 00:00 — gece koşusu (otomatik)
**Tamamlanan iyileştirmeler:** QUEUE 17 ilk dilim (bağımsız incelemenin S5 maddesi + liste sınırı notu).
**PR'lar:** #572 — uygulandı · test edildi · birleşti · derlendi (Cloudflare build ok). Canlıda doğrulanmadı.
**CI:** #572 başında check, sql, static, e2e 1/2/3, pr-size, Workers Builds — hepsi yeşil.
**Cloudflare önizleme:** panel bağlantısı https://dash.cloudflare.com/95b3c021891c1ac025fc5a028ac5a2b7/workers/services/view/aloni/production/previews/autopilot-20261126-00-timeline-undated/builds/321456b1-e3b7-42ef-9b4f-b3bf0aaac259 ; önizleme adresi yalnız botun PR yorumundan alınır, açılışı doğrulanmadı.
**Görünen değişiklik:** Χωράφια → parsel → «Χρονολόγιο»: tarihi olmayan bir hasat kaydı (Παραγωγικότητα zaten sayıyordu) artık listenin sonunda «— άγνωστο» tarihiyle görünüyor. Liste uzunsa altında «Εμφανίζονται οι 20 πιο πρόσφατες καταγραφές.» yazıyor. Ekran görüntüleri: `docs/design/timeline-undated-after-375.png`, `docs/design/timeline-cap-after-375.png`.
**Kalan sorunlar:** 20'den fazla tarihli kayıt varsa tarihsiz hasat sınırın dışında kalabilir (not bunu söylüyor). S6 ve S7 → QUEUE 17b.
**Sıradaki öncelik:** QUEUE 17b. QUEUE 14 Bora'nın 0042 onayını bekliyor.
**Bora'dan karar:** yok.

## 2026-11-25 07:00 — ALONI — NIGHT SHIFT RESULTS (sabah doğrulaması, otomatik)
Kaynak: GitHub REST (07:03 İstanbul). Tahmin yok; «birleşti» ≠ «canlıda».

**1. Neler somut olarak iyileşti** — Gece 6 iş birleşti (QUEUE #5, #6, #6b, #7, #8, #8b): Χωράφια parsel detayı ana bilgilerle açılıyor; kayıtlar «telefonda» olduğunu söylüyor; ilk açılış ~11 kB (gzip) daha hafif; işçi ekranında 72 px düğmeler; Σήμερα'da kayıt onayı ilk ekranda.

**2. Görsel değişiklikler (önce → sonra, 375 px)**
- Parsel detayı: `docs/design/screenshots-2026-11-25/parcel-detail-before-375.png` → `parcel-detail-after-375.png` (320/390 de var)
- Hasat sonrası «telefonda» satırı: `docs/design/screenshots-2026-11-25/saved-where/harvest-saved-before-375.png` → `harvest-saved-after-375.png`
- Geri-al bildirimi: `docs/design/offline-undo-where-before-375.png` → `offline-undo-where-after-375.png`
- İşçi ekranı: `docs/design/worker-targets-before-harvest-375.png` → `worker-targets-after-harvest-375.png`; `worker-targets-before-jobs-375.png` → `worker-targets-after-jobs-375.png`
- Σήμερα onayı: `docs/design/today-feedback-before-375.png` → `today-feedback-after-375.png`
- #550 (ilk açılış): görsel değişiklik yok.

**3. İşlevsel değişiklikler** — #550: Άλλα alt ekranları (Μητρώο, Παραγγελίες, Πελάτες, Εργάτες, Πληροφορίες, Εβδομαδιαία αναφορά) ayrı parçalar, ilk ekrandan sonra arka planda yükleniyor. Diğerleri yerleşim/yazı; yeni çeviri anahtarı yok, özellik silinmedi (PR açıklamalarına göre).

**4. Birleşen PR'lar (son 14 saat)** — hepsinde check, sql, static, 3 e2e parçası, Workers Builds **yeşil**:
- #547 Χωράφια parsel detayı · #548 Σήμερα «telefonda» satırı · #549 geri-al + Φωτογραφίες «telefonda» · #550 ilk açılış hafifledi · #551 işçi ekranı 72 px · #552 Σήμερα onayı ilk ekranda
- Ana dal `5ef162c` (#552): check, sql, static, e2e 1/2/3, Workers Builds — **hepsi yeşil**.

**5. Açık PR'lar** — #460, #484, #485, #500 (SQL), #504, #507, #508: bekletilenler (QUEUE), dokunulmadı. Hepsinde check/e2e yeşil, «Workers Builds: aloni» kırmızı (eski derlemeler, bu gece incelenmedi). #512 Dependabot (23 Kas): check/static/e2e **kırmızı** → aşağıda.

**6. Testler** — Gece PR'larının ve ana dalın tüm CI işleri geçti; kırmızı e2e yok. Yerelde bilinen `icon-192` ortam hatası CI'da yok. Kırmızı tek PR #512:
- `static` FAILURE CONTEXT: `tests/unit/cx-content-qa.test.ts(36,21): error TS2339: Property 'createSourceFile' does not exist on type 'typeof import(".../typescript/lib/version")'` (ve benzerleri).
- `e2e (shard 2/3)`: `Error: Process from config.webServer was not able to start. Exit code: 1`.
- Sınıf: **GERÇEK UYGULAMA/DERLEME HATASI** (altyapı değil): güncellemedeki yeni TypeScript sürümü, testin `typescript` içe aktarma biçimini bozuyor; derleme olmayınca e2e sunucusu da başlamıyor. Ana dalı etkilemiyor.

**7. Cloudflare önizleme bağlantıları** — Cloudflare botunun PR yorumunda görünen adresler (bu ortamdan açılamadı, doğrulanmadı):
- #548: https://autopilot-20261125-02-offline-saved-where-aloni.ormanbora.workers.dev
- #552: https://autopilot-20261125-06-today-audit-aloni.ormanbora.workers.dev
- #547, #549, #550, #551: herkese açık adres alınamadı; panel: https://dash.cloudflare.com/95b3c021891c1ac025fc5a028ac5a2b7/workers/services/view/aloni/production/previews/autopilot-20261125-01-parcel-key-facts/builds/beaaa3b8-4e35-402b-84f4-d5e8c20aa618 · …/previews/autopilot-20261125-03-offline-undo-where/builds/fdc8ed0a-9870-4882-b4bd-27d24cb94027 · …/previews/autopilot-20261125-04-lazy-screens/builds/50dec9c2-f2c2-4ea3-8074-21f84ab7b9bf · …/previews/autopilot-20261125-05-worker-targets/builds/bbbd7722-5490-44ab-9be3-361ae5e41df2
- Adres biçimi `<dal-adı>-aloni.ormanbora.workers.dev` artık botun yorumuyla görülüyor. Canlı adres (önizleme DEĞİL): https://aloni.ormanbora.workers.dev

**8. Engellenenler** — Kilit yok (eski kilit yok). #512 Dependabot TypeScript uyumsuzluğu (düzeltme gerek: test, `typescript` içe aktarmasını yeni sürüme uydurmalı; ya da TypeScript bu gruptan çıkarılmalı). Canlı doğrulama yalnızca Bora'da.

**9. Bora telefonda önce neye baksın** (canlı adreste, yayın tamamlandıysa)
1. Σήμερα: bir hasat kaydet → «Η συγκομιδή καταγράφηκε.» başlığın hemen altında mı?
2. Χωράφια → bir parsel: Εμβαδόν, Κοπή από…, Τελευταίος ψεκασμός en üstte mi?
3. Άλλα → Προβολή εργάτη: düğmeler eldivenle rahat mı?
4. Uçak modunda bir kayıt: «Αποθηκεύτηκε στο τηλέφωνο…» yazıyor mu? (Bilinen: Σήμερα'da bu cümle iki kez görünebilir → QUEUE #8c.)

**Sıradaki öncelik:** QUEUE #8c (çift «telefonda» cümlesi). **Bora'dan karar:** #512'nin (bağımlılık güncellemesi) düzeltilip düzeltilmeyeceği.

## 2026-11-25 06:00 (gece vardiyası, otomatik) — Σήμερα: kayıt onayı ilk ekranda
- **Tamamlanan iyileştirme:** QUEUE #8b (ilk dilim) — ilaçlama, hasat, iş veya gözlem kaydedip Σήμερα'ya dönünce «Η συγκομιδή καταγράφηκε.» gibi onay yazısı (ve altındaki «telefonda» satırı) artık başlığın hemen altında, ilk ekranda. Önceden hava durumu ve «Αύριο φεύγουν» bölümünün altında, ekranın çok aşağısındaydı; kaydırmadan görünmüyordu.
- **PR:** #552 — uygulandı, test edildi. Birleşme durumu PR'da (CI kapıları).
- **Önce/sonra (375 px, gerçek çiftlik, hasat + gözlem sonrası, sayfa başı):** `docs/design/today-feedback-before-375.png` → `docs/design/today-feedback-after-375.png`. 320/375/390'da yatay kaydırma yok.
- **Özellik kaybı yok:** yazılar, test kimlikleri aynen; yalnızca yerleri değişti; yeni çeviri anahtarı yok.
- **Testler (yerel):** yeni e2e `today-feedback.spec.ts` önce kırmızı, sonra yeşil; vitest tamamı 810 geçti; tsc, eslint temiz; Σήμερα/hasat/ilaçlama/iş ile ilgili 22 Playwright testinden 19'u geçti, 3'ü (çevrimdışı) yalnızca bilinen `icon-192` ortam hatasıyla, tüm kontrolleri geçtikten sonra düştü. Karar CI'da (WebKit).
- **Cloudflare önizleme:** herkese açık adres doğrulanamıyor; panel bağlantısı PR'ın «Workers Builds» kontrolünde.
- **Kalan sorun:** kayıttan sonra ilk ekranda «Αποθηκεύτηκε στο τηλέφωνο…» cümlesi iki kez görünüyor (üstteki genel durum şeridi + onayın altı) → QUEUE #8c.
- **Sıradaki öncelik:** 07:00 sabah doğrulaması; sonra QUEUE #8c.
- **Bora'dan karar:** yok.

## 2026-11-25 05:00 (gece vardiyası, otomatik) — işçi ekranında büyük düğmeler
- **Tamamlanan iyileştirme:** QUEUE #8 — işçi ekranında (Άλλα → Προβολή εργάτη) eldivenle basılacak düğmeler 72 px'e çıktı: «Τα δεδομένα σας» başlığı (önceden 22 px'lik ince bir yazı satırıydı, şimdi 72 px'lik basılabilir satır, ▼ işareti duruyor), Συγκομιδή sekmesindeki «Αποθήκη / Απευθείας φόρτωση» seçimi ve «Ακύρωση», ve en alttaki «Έξοδος από την προβολή εργάτη» (hepsi 56 → 72 px). Sahibin kendi hasat formu değişmedi.
- **PR:** #551 — uygulandı, test edildi. Birleşme durumu PR'da (CI kapıları).
- **Önce/sonra (375 px, Demo, işçi görünümü):** `docs/design/worker-targets-before-harvest-375.png` → `docs/design/worker-targets-after-harvest-375.png`, `docs/design/worker-targets-before-jobs-375.png` → `docs/design/worker-targets-after-jobs-375.png`.
- **Yeni test:** 320/375/390 px'de, Yunanca ve Hintçe, üç sekmede: yatay kaydırma yok, işçinin düğmeleri ≥72 px, diğer tüm hedefler ≥56 px. Düzeltmeden önce kırmızıydı (22 px başlık), sonra yeşil.
- **Testler (yerel):** vitest tamamı 810 geçti; tsc, eslint temiz; işçi/hasat/yarın notları dahil 29 Playwright testinden 28'i geçti, `workers.spec` yalnızca bilinen `icon-192` ortam hatasıyla düştü. Karar CI'da (WebKit).
- **Sahip verisi:** işçi ekranında sahip sekmelerinin olmaması zaten `worker-view.spec` ile test ediliyor; değişmedi.
- **Kalan sorun:** «Αύριο» notlarının düğmesi ve zil 56 px kaldı (sahiple ortak bileşenler, uygulama genelindeki 56 px sınırını karşılıyor).
- **Sıradaki öncelik:** QUEUE #8b — Σήμερα gözden geçirme.
- **Bora'dan karar:** yok.

## 2026-11-25 04:00 (gece vardiyası, otomatik) — ilk açılış daha hafif
- **Tamamlanan iyileştirme:** QUEUE #7 — uygulamanın ilk indirilen kodu küçüldü: Άλλα içindeki Μητρώο, Παραγγελίες, Πελάτες, Εργάτες, Πληροφορίες ve Εβδομαδιαία αναφορά ekranları ilk paketten çıkarıldı (ana paket gzip 199,6 kB → 188,2 kB, yaklaşık −11 kB). Bu ekranlar ilk ekran açıldıktan hemen sonra, internet varken arka planda yükleniyor; böylece sonra sinyal gitse de açılıyorlar.
- **PR:** #550 — uygulandı, test edildi. Birleşme durumu STATE.md'de.
- **Görünen değişiklik:** yok (ekranlar aynı). İlk açılış yavaş bağlantıda biraz daha hızlı olmalı; ölçüm yalnızca dosya boyutu, telefonda süre ölçülmedi.
- **Özellik kaybı yok:** hiçbir ekran, düğme, test kimliği veya çeviri silinmedi; yeni çeviri anahtarı yok. Bütçe sınırı değiştirilmedi.
- **Testler (yerel):** yeni e2e (servis çalışanı kapalı = ilk oturum, sonra uçak modu, altı ekran açılıyor) ön-yükleme kapalıyken kırmızı, açıkken yeşil; vitest tamamı 810 geçti; tsc, eslint temiz; ilgili 20 Playwright testi geçti; `workers.spec` yerelde yalnızca bilinen `icon-192` ortam hatasıyla düştü. Karar CI'da (WebKit).
- **Cloudflare önizleme:** herkese açık adres doğrulanamıyor; panel bağlantısı PR'ın «Workers Builds» kontrolünde.
- **Kalan sorun:** ilk oturumda ön-yükleme bitmeden (ilk ekrandan 1–2 saniye sonra) sinyal giderse bu altı ekran açılmaz, «Δοκιμή ξανά» düğmesi çıkar; sinyal gelince açılır.
- **Sıradaki öncelik:** QUEUE #8 — işçi ekranı (72 px düğmeler, dil, sahip verisi görünmemesi).
- **Bora'dan karar:** yok.

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
