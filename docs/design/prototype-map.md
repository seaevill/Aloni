# Prototip ↔ uygulama haritası (E2)

Kaynak: `reference/prototype/index.html` (v2 tıklanabilir prototip, 780 px ekran görüntüleri `reference/prototype/screenshots/`) ve `docs/design/theme-2026-11` (tasarım 2). Yan yana görüntüler: `docs/design/compare/` (sol prototip, sağ uygulama, 375 px).

| # | Prototip ekranı | Uygulamadaki karşılığı | Durum | Öz puan (benzerlik /10) | Eksik (→ BACKLOG) |
|---|---|---|---|---:|---|
| 1 | **Today** – koyu başlık (tarih, yer), «Weather now» koyu kart + 4 karo, «Harvest next 7/28 days» karoları, Active crops / Parcels karoları, «Safe to harvest today», Alerts listesi | `Σήμερα` (`ui/Today.tsx`) | **yeniden düzenlendi** (bu PR): koyu bant, hava kartı 4 karo, KPI karoları, «bekleme yok» sayısı | 7 | Hasat tahmini karoları (7/28 gün kasa) → sipariş/tedarik bağlantısı gerekir; Alerts listesi → kurallar imzasız, yalnızca veri; «Forecast run» satırı → hava verisi gelince |
| 2 | **Crop detail** – ürün başlığı, «Next recommended action» kartları (Why? düğmeli), «Plantings», «Last spray», 7 günlük hava tablosu, aynı parseldeki diğer ürünler, Disease/pest risk, Orders vs supply | `Καλλιέργειες` listesi (`ui/Crops.tsx`) | **detay ekranı yok**, liste var | 3 | Ürün detay ekranı; son ilaçlama + PHI kartı; ekim başına hava tablosu; «Why?» sayfası (kural gerekçesi); sipariş–tedarik tablosu |
| 3 | **Parcel detail** – kroki, Location/Area/Elevation/OPEKEPE tablosu, Alerts | `Χωράφια` → satıra dokun → `ParcelDetail` (`ui/ParcelDetail.tsx`) | **yapıldı**: koyu bant, kroki (çizilmiş sınırdan SVG), bilgi tablosu, kesim durumu, bugünkü hava, ekimler, son ilaçlamalar | 7 | Alerts kartları (imzasız kural: yalnızca veri), konum metni, ekim detayına geçiş |
| 2 | **Crop detail** – ürün başlığı, «Next recommended action» kartları (Why? düğmeli), «Plantings», «Last spray», 7 günlük hava tablosu, aynı parseldeki diğer ürünler, Disease/pest risk, Orders vs supply | `Καλλιέργειες` → ürüne dokun → `CropDetail` (`ui/CropDetail.tsx`) | **kısmen yapıldı**: koyu bant, ekimler, son ilaçlama + bekleme süresi | 5 | Önerilen eylem kartları + «Why?» sayfası (imzasız kural: yalnızca veri); ekim başına hava tablosu; hastalık/zararlı riski; sipariş–tedarik tablosu (E4) |
| 3 | **Parcel detail** – kroki, Location/Area/Elevation/OPEKEPE tablosu, Alerts | `Χωράφια` listesi + düzenleme formu (`screens.tsx`, `ParcelForm`) | **detay ekranı yok** | 3 | Tarla detay ekranı (kroki yerine harita sınırı, bilgi tablosu, ekimler, hava, ilaçlama geçmişi) |
| 4 | **Orders → sowing** – sipariş/tedarik, ekim önerisi, «Not on these parcels» | yok | **eksik** | 0 | Κλούβες bağlantısı + ekim önerisi (E4) |
| 5 | **Why? sheet** – öneri gerekçesi | yok | **eksik** | 0 | Kural gerekçesi sayfası (imzasız kural: yalnızca veri) |
| 6 | **Spray log / CSV** | `Μητρώο ψεκασμών` (`ui/Register.tsx`) | var | 7 | Prototipin tablo düzeni |
| 7 | **Stock** | `Αποθήκη` (`ui/Stock.tsx`) | var | 6 | Prototipin kart düzeni |
| 8 | **More** | `Άλλα` (`ui/More.tsx`) | var (ek kartlar: hazırlık, sihirbaz, bildirim) | 6 | – |
| 9 | **Today (Greek)** | `Σήμερα` el | = 1 | 7 | – |

*Not: prototipin tüm İngilizce/Latin metinleri uygulamada Yunanca; güvenlik kuralları gereği kural kartları imzasız olduğu için karar vermez, yalnızca veri gösterir.*

## Fark listesi – Σήμερα (bu PR)
- ✔ Koyu üst bant (tarih, başlık, çiftlik adı); ✔ koyu hava kartı ve 4 karo; ✔ KPI karoları; ✔ «bekleme yok / sayısı».
- ✘ Hasat 7/28 gün karoları; ✘ Alerts listesi; ✘ «Forecast run» notu; ✘ demo bandı başlığın içinde değil (uygulamada tüm ekranların üstünde).

## İlaçlama formu ve işçi ekranı
Prototipte bu iki ekranın karşılığı YOK (yalnızca ilaçlama kaydı/CSV listesi var). Tasarım 2 mockup'ı (`docs/design/theme-2026-11/winner-B.html`, `docs/design/applied/t2/worker-*.png`) kart dilini verir: büyük kartlar, tek karar, 72 px «Έγινε / Δεν έγινε», kilitliyken gri. Uygulama bu dili izliyor (öz puan 7/10). Mockup'ın «bulanık eylem tepsisi» (sabit alt tepsi) henüz yok → BACKLOG.
- ✔ Hasat 7/28 gün karoları (kesilen kasa, 7 ve 28 gün); ✘ Alerts listesi; ✘ «Forecast run» notu; ✘ demo bandı başlığın içinde değil (uygulamada tüm ekranların üstünde).
