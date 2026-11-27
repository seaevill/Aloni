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
- 2026-11-27 · is-2c kasa fiyatı · Para tutarını bölerek fiyat çıkarırken lint (R06) % işlecini yasaklıyor ve D05 sayı varsayılanını; bu yüzden parseWhole + Number.isInteger(bölüm) kullanıp bölünemeyen satışı atlamak (yuvarlamamak) gerekiyor; yerel e2e için PW_CHROMIUM_PATH=/usr/bin/google-chrome da gerekiyor.
- 2026-11-27 · is-2c yönetici koşusu · Takım işi böldüğünde (is-2d) kalan parçanın onay kaynağını özgün iş metnine bağlayıp açıkça yazması bekçinin hızlı karar vermesini sağladı; bölmede onay alanını boş bırakmamak, kaynağını yazmak gerekiyor.
- 2026-11-27 · is-2d Ταμείο PDF · Yazdırma sayfasında yeni Yunanca terim gerekmeden mevcut anahtarları (el kilitli t(..., 'el')) yeniden kullanmak sözlük bekleyen kararını büyütmedi; JSX içinde birleştirilmiş metin U01/U02 lintine takılıyor, metni JSX dışında hesaplayıp tek ifade olarak koy.
- 2026-11-27 · is-2d yönetici koşusu · Bekçi kendi durum/defter dosyalarını commit etmeden bıraktığında, kayıt dalına geçmeden önce bunları ayrı bir yere kopyalamak gerekiyor; yoksa dal değişiminde kaybolur ya da yanlış PR’a girer.
- 2026-11-27 · is-3 Κλούβες içe aktarma · BACKLOG'da aynı iş iki satırda ([ ] ve [x]) durabiliyor; işe başlamadan önce kodu ve testi (orders/available.ts, orders.test.ts) grep'leyip bulursan yeni kod yazma, yalnızca eski satırı temizle.
- 2026-11-27 · is-3 yönetici koşusu · Takım «iş zaten yapılmış» dediğinde birleştirmeden önce kodu ve testi kendim grep'leyip bekçiye testi çalıştırtmak iddiayı kanıta bağladı; kısa süren takım koşusu kanıtsız kabul edilmemeli.
- 2026-11-27 · is-4 prototip karşılaştırma · Tam sayfa görüntüyü yan yana birleştirirken flex gerilmesi yüzünden yükseklik yanlış çıktı (align-items:flex-start ve figür yüksekliğinden kırpma gerekti); görüntüyü Read ile açıp bakmadan fark listesi yazmamak, geçici bildirimlerin (toast, çevrimdışı notu) karşılaştırmayı kirlettiğini fark ettirdi.
