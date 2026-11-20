# UX1 – Bora'nın seçtiği 4 iyileştirme (plan, 2026-11-20)

**Not:** «Dış UX araştırması»nın metni repoda yok; bu plan 4 başlıktan, `docs/audit/2026-11-20-product-audit.md` ve UX denetiminden çıkarıldı. Metni repoya koyarsan planı ona göre düzeltirim.
**Ortak kurallar:** yalnızca sunum; bekleme süresi (PHI/REI) kapısı ve zorunlu alanlar değişmez; değerler `tokens.css`'te; el/tr/en anahtarları; 375 px WebKit; her adım ayrı PR (≤450 satır), önce kırmızı test.

| # | İyileştirme | Bugün | Küçük adım (PR) | Bitti ölçütü |
|---|---|---|---|---|
| 1 | **SprayForm adımları** | ~2000 px'lik tek sayfa, eşit düğmeler | Başlıklar 1-4 numaralı **adım**; seçilen adım «✓» olur (yalnızca CSS + `data-done`) ← **ilk PR, hazır** | e2e: 4 adım, seçince ✓; axe temiz; spray testleri yeşil |
| 2 | **Kart bilgisi** | Σήμερα'da 15 benzer satır, Αποθήκη'de 17 kart ve her birinde aynı uyarı | Benzer «boş» satırları sayıya topla; uyarıyı bir kez bant olarak göster (işaretleme değişir) | Σήμερα sayfa boyu ≥%40 kısalır; testler yeşil |
| 3 | **Tarla zaman çizgisi** | Tarla detayı: hava + ekim + ilaçlama listeleri ayrı | Tek akış: ekim, ilaçlama, giriş yasağı bitişi, hasat tarih sırasıyla (salt okunur) | e2e: sırayla görünür; bekleme süresi **olduğu gibi** gösterilir |
| 4 | **«Εργασίες» merkezi** | İş atama Σήμερα'da, işçi işleri ayrı ekranlarda | Σήμερα'daki işleri «Εργασίες» başlığı altında tek yerde topla: planlanan, yapılan, bekleyen | e2e: atama → liste → «Έγινε» akışı aynı |

**Sırayla:** 1 → 2 → 3 → 4. Her biri iPhone'da denenecek 1 madde ile biter (Yunanca kontrol listesi PR açıklamasında).
