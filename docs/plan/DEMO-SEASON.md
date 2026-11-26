# Gerçekçi Demo sezonu — plan (Bora, 2026-11-26)

Amaç: Demo çiftliği gerçek bir sezon gibi görünsün (90 gün geçmiş + 14 gün plan), tüm ekranlar dolu olsun, güvenlik kuralları (PHI/REI, bilinmeyen, kilitli etiket) gösterilsin. Demo verisi YALNIZCA Demo çiftliğine yazılır; gerçek çiftliğe asla karışmaz. Uydurma etiket verisi yok.

## Mimari
- Yeni katman: `app/src/db/demo-season/` (veri dosyaları + `importDemoSeason(db, today)`); `importDemo` bittikten sonra çalışır, aynı UUIDv5 ad alanını kullanır (aynı id'ler: iki kez yüklemek aynı sonucu verir), tüm satırlar `DEMO_FARM_ID` taşır; `removeDemo` hepsini siler.
- Tarihler kaynak dosyada «bugüne göre gün farkı» olarak durur (`-37`, `+3`) ve her açılışta bugüne göre kaydırılır. Hava mevcut `shiftWeather` ile.
- Kayıtlar mümkün olduğunca uygulamanın KENDİ builder'larıyla üretilir (buildSpray, buildHarvest, buildReceipt, buildAnalysis, buildPlanting, buildCropTarget, buildEntry…): ekranın gerçek kayıtla göreceği şey görülür.
- Etiket verisi `app/src/db/demo-season/labels.json` içinde, metin olarak, kaynak dosyadan bire bir; her ürün için kaynak `docs/content/demo-labels-sources.md`. Boş = «άγνωστο».
- «İmza» kurgusaldır; ekranda «Επίδειξη – όχι υπογραφή γεωπόνου».

## Maddeler (QUEUE 30–36, her biri ayrı PR)
30 Gerçek ilaçlar: ~10 ürün, resmî kayıt/etiket. ENGEL: ΥΠΑΑΤ sitesi bu ortamdan açılmıyor (www.minagric.gr «Access Denied» 403, ppp.minagric.gr 502). Çözüm yolu: Bora PDF'leri indirir (BLOCKERS.md listesi), ben harfi harfine aktarırım. Gelene kadar uydurma YOK.
31 Parseller: Megara ovasında 7 parsel, 2–25 στρ., toplam ~70 στρ., elle çizilmiş genel şekiller (kadastrodan kopya yok), ΚΑΕΚ «99…» + Demo etiketi.
32 Tam sezon: ekim, ilaçlama, hasat, kesim, gübreleme/sulama, gübre planı, toprak analizi, depo, 6 müşteri + 4 hafta sipariş, 3 işçi, iş panosu, yarın notları, tekrarlayan işler, hedefler, Ταμείο (cent), gözlemler. Zor durumlar bilerek: PHI'de parti, REI süren parsel, eksik etiket (kilitli), biten stok, gecikmiş iş, okunamayan kasa, sipariş>hasat.
33 Fotoğraflar: Wikimedia Commons, yalnızca CC0/CC-BY/CC-BY-SA, 10–15 adet, küçültülmüş, tembel yüklenir (ilk açılış bütçesi büyümez), her birinin altında kaynak satırı, `docs/content/photo-credits.md`. Ortam: commons.wikimedia.org erişilebilir.
34 Bütünlük testleri: (a) gerçek çiftlikte Demo kaydı yok (b) PHI'deki parti arzda yok (c) doz bire bir (d) bilinmeyen = «άγνωστο» (e) her Σήμερα sayısının kaynağı açılır, toplamlar tutar (f) Demo kaldırılınca hepsi silinir.
35 Gezinti testi: tüm sekme/alt sayfalar 320/375/390 px, hata ve yatay kaydırma yok; 30 ekran görüntüsü `docs/design/demo-season-2026-11-26/`.
36 Yunanca test listesi `docs/milestones/DEMO-SEASON-TEST.md` (20 adım) + REPORT.md Türkçe özet.

## Sıra ve bağımlılıklar
31 → 33 → 30 (veri gelince) → 32 (30'daki ürünlerle; 30 gelmediyse kilitli/eksik etiketli mevcut 5 örnek + «άγνωστο» alanlı ürünlerle ilaçlama kaydı yazılmaz) → 34 → 35 → 36.
Satır sınırı: veri dosyaları sayılmaz; PR başına bir konu.
