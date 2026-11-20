# Aloni ürün denetimi (2026-11-20) – Chief of Staff, tek oturum, salt okunur

**Kapsam ve sınır.** Bu denetimi tek bir oturumda, alt ajan açmadan yaptım (Bora'nın kota kuralı: paralel ajan yok). «Aloni-Ekip» bölümündeki ajanları bu oturumda göremiyorum; yeni uzman çağırmadım. Aşağıdakilerden **ölçülenler** ölçüldü, **yorumlar** yorum olarak işaretli. Kodda hiçbir şey değiştirilmedi.

## Ölçülen (2026-11-20, main 6bcd22c)
- Uygulama: 117 kaynak dosya, ~6 700 satır TS/TSX; 55 e2e + 73 birim test dosyası.
- İlk ekran JS: **135 KB gzip** (bütçe 350) ✓; CSS 14 KB gzip (bütçe 30) ✓. Harita yalnızca istenince yüklenir (344 KB gzip, tembel).
- Hintçe yazı tipi 118 KB (yalnızca Hintçe seçilince gerekir; ilk yüklemeye girip girmediği ölçülmedi – kontrol edilecek).
- Tasarım: BACKLOG'a göre ekran benzerliği 6–7/10, hedef ≥9/10. «Άλλα» ekranı ve prototip karşılaştırma görüntüleri (`docs/design/compare/`) yapılmadı.
- CI: tek koşu uzun ve WebKit'te aynı kodda farklı testler düşüyor (bugün main kırmızıydı, #222 ile düzeltildi). Hızlandırma PR'ı #221 hazır, yüklemeden sonra merge.

## Dürüst değerlendirme (yorum)
1. **Bora bugün hiçbir şeyi canlıda göremiyor.** En büyük sorun teknik değil: 0022–0032 yüklenmedi, LIVE kapalı. Hiçbir özellik, gerçek hesapla denenmeden «bitti» sayılmamalı. → Öncelik 1: yükleme + §12 denemesi.
2. **Güvenlik/uyum işi çok, günlük his az.** Son haftaların çoğu kapı (PHI/REI) sertleştirmesi oldu; doğru ve gerekli, ama Bora'nın her gün baktığı Σήμερα ve hasat sayacı «7/10». → Yükleme sonrası görünüm işi ekran ekran, önce/sonra görüntüyle.
3. **Çok dilli yük.** el/tr/en/hi + worker_lang, her değişiklikte 4 dil testi. İşçiler için gerçekten gerekli olanı Bora'ya sormak gerek (Arnavutça sorusu açık).
4. **Para kazanma.** Faz 1'de yok ve olmamalı (tek çiftlik). Faz 2 pilot (5–10 komşu üretici) öncesi fiyat konuşulmaz. Öneri: önce komşuların gerçekten kullanıp kullanmadığını ölç.
5. **Rakip bakışı (kaynaklı, sınırlı).** Rakipler çevrimdışı girişi standart sayıyor ve ilaç kaydını ana özellik yapıyor [FieldBook](https://apps.apple.com/app/id6777170468), [Croptracker](https://www.croptracker.com/product/farm-management-apps.html); kurumsal araçlar küçük üreticiye fazla karmaşık bulunuyor [Jotform incelemesi](https://www.jotform.com/blog/best-farming-apps/). Aloni'nin farkı: Yunanca-ilk, PHI/REI'yi **hiç tahmin etmeyen** kapı, kasa (κλούβα) siparişi. *Bunlar mağaza açıklamaları ve satıcı yazısı; gerçek küçük üretici araştırması değil. Komşu üreticilerle 5 kısa görüşme yapılmadan farklılaşma iddiası kanıtsız kalır.*
6. **Düzenleme tarihi belirsiz.** AB 2023/564 elektronik ilaç kaydı 1 Ocak 2026 diye geçiyor ama ertelenme önerisi vardı, sonucunu doğrulayamadım; bir satıcı blogu 2027 diyor [PAN Europe mektubu](https://www.pan-europe.info/node/4045), [DAERA](https://www.daera-ni.gov.uk/articles/new-regulations-regarding-recording-plant-protection-products-ppps-usage). Yunanistan'a özgü kaynak bulamadım. → γεωπόνος'a ve minagric.gr'ye sorulacak; uygulama «yasal olarak yeterli» iddiasında bulunmaz.

## Öneri: öncelik sırası (karar Bora'nın / yükleme sonrası)
1. 0022–0032 yükleme → §12 gerçek hesap denemesi (A hattı).
2. Σήμερα + hasat sayacı + ilaçlama formu görünümü (tokens.css'ten, önce/sonra 375 px görüntü).
3. «Έγκριση γεωπόνου» ekranı (not, isteğe bağlı fotoğraf, append-only) – yeni SQL, ekip incelemesi.
4. Hava: tek tarla dry-run, sonra cron.
5. CI hızı (#221), sonra kuyruk: T16b, T10, T11, T8b.
6. Pilot öncesi: 5 komşu üretici görüşmesi (Bora yapar; ben soru listesini hazırlarım).

## Yapılmadı / kanıtsız
- Rakiplerle yan yana ekran karşılaştırması, kullanıcı araştırması, performans ölçümü gerçek iPhone'da: yapılmadı.
- Alt ajanlı «ekip toplantısı»: yapılmadı (kota kuralı).
