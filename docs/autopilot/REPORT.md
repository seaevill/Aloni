# ALONI — AUTOPILOT RAPORU (Türkçe, Bora için)

Her koşu en üste yeni bir bölüm ekler. Durum sözleri: **uygulandı · test edildi · birleşti · derlendi (Cloudflare) · canlıda doğrulandı** — «birleşti» «canlıda» demek değildir. Uydurma ilerleme yazılmaz.

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
