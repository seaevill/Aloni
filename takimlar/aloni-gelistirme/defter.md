# Defter: aloni-gelistirme

Her koşunun sonunda buraya **tek bir ders** eklenir. Biçim:

`- YYYY-AA-GG · <iş> · <ders: bir dahaki sefere neyi farklı yapacağım>`

Olay anlatma; ders yaz. "PR açıldı" ders değildir. "Şema değişikliğinde önce eski kısıtı düşüren testi yazmak gerekiyor" derstir.

Haftalık denetimde kalıplaşan dersler kurala çevrilir ve bu liste temizlenir.

## Dersler

- 2026-11-27 · is-0 durum eşitleme · Durum listesini sohbetten değil önce docs/STATUS.md ve git log'dan kurmak gerekiyor; kapsam tahmini (is-1/is-2) repoda kısmen zaten yapılmış çıktı, bu yüzden her iş "kalan boşluk neydi" kontrolüyle başlamalı.
- 2026-11-27 · is-1 ilaçlama kaydında hava · Önce `npm ci` yapmadan "kırmızı test" yazmak yanıltır (modül yok hatası gerçek kırmızı değildir); ayrıca test verisini depolanan anahtarlarla (`rain_mm`, `gust_kmh`) kurmak gerekiyor, ayrıştırıcıdan geçen adlarla değil.
- 2026-11-27 · is-2 Ταμείο CSV · Büyük bir işte önce repoda ne var diye (ledger.ts, register.ts toCsv) bakıp yalnızca dışa aktarma parçasını almak PR'ı küçük tuttu; yuvarlama kuralı (R01) Math.floor'u da yasaklıyor, para biçimlemede tam sayı aritmetiği kullan.
- 2026-11-27 · is-2 veresiye · Para kaydına yeni alan eklerken (müşteri, ödenmedi) her kopyalayan yardımcıyı (voidOf, restoreOf) ve isEntry doğrulamasını aynı değişikliğe katmak gerekiyor; ayrıca kaydın notuna ad yazmama kuralı yüzünden müşteriyi ad değil kimlik olarak saklamak doğru çıktı. WebKit indirilemezse PW_BROWSER=chromium + sistem Chrome ile yerelde e2e koşulabilir.
