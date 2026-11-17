# FieldWise – Geliştirici / UX incelemesi (2026-11-16)

Kapsam: 4 ekran (1-Today, 2-Field-detail, 3-Spray-log, 4-Orders-to-sowing) ve `design-src/*.dc.html`. Tüm veriler örnek.

## Arayüz ve kullanım

- **Hiyerarşi iyi, ama kartlar arasında çelişki var.** 1-Today, North Plot'a bugün "the fungicide" öneriyor. 3-Spray-log ise aynı tarla için "Fungicide A iki kez üst üste, bir dahakine farklı grup kullan" diyor. Today kartı ürünün adını vermediği için kullanıcı yine Fungicide A'yı sıkabilir. Ayrıca bugün ilaçlama yapılırsa 3'teki "Spinach · Ready since today" bekleme süresi yeniden başlar (örneğin 30 Kasım'a kayar). Bu durum hiçbir ekranda görünmüyor.
- **"Ready" iki ayrı anlama geliyor.** 3'te ıspanak "Ready" (ilaç bekleme süresi bitti) görünüyor. 2'de ise hasat "~4 Dec" (henüz olgunlaşmadı). Etiketler "İlaç beklemesi bitti" ve "Olgunluk" olarak ayrılmalı.
- **Navigasyon tutarsız.** 1 ve 4'te alt menü var. 2'de yalnızca geri butonu var. 3 bir sekme olduğu hâlde alt menüsü yok. Alt menü yalnızca metinden oluşuyor, ikon yok. 4 sekme her ekranda aynı yerde durmalı; 2 ise "Fields" sekmesinin altında, geri butonuyla açılmalı.
- **Eldivenle dokunma hedefleri küçük.** 1'deki "Log" metin linki yaklaşık 30 px. 2'deki haftalık ızgaranın hücreleri 22 px yüksekliğinde ve dokunulabilir mi değil mi belli değil. Hedef en az 56–64 px olmalı. Ana eylem başparmak bölgesinde, alt kısımda olmalı. "Log as done" işlemine 5 sn'lik geri alma eklenmeli.
- **Güneş altında kontrast yetersiz.** 11–12 px gri yardımcı metinler (`font-size: 11px` 13 kez geçiyor) ve 2'deki açık yeşil "ok" ile gri "avoid" hücreleri güneşte ayırt edilemez. Gövde metni en az 16 px, yardımcı metin en az 14 px, kontrast en az 7:1 olmalı. Ayrıca yüksek kontrastlı bir "tarla modu" eklenmeli.
- **Renk anlamı ve renk körlüğü.** 2'deki best/ok/avoid ayrımı yalnızca yeşil tonlarıyla yapılıyor. 3'te turuncu "4 days" ile yeşil "Ready" kırmızı-yeşil ayrımına dayanıyor. Hücrelere ✓/~/✕ simgesi ya da metin eklenmeli. "SAFE HARVEST" rozeti ile "SAMPLE DATA" aynı sarıyı kullanıyor. Önerilen palet: risk için turuncu, uygun için mavi; her rozette ikon da olsun.
- **Sayılar ve birimler belirsiz.** 1'de "Wind 9" ve "3 d" yazıyor: "9 km/s KD" ve "3 gün önce · 12 mm" diye açık yazılmalı. 3'teki "4 days / from Fri 20 Nov" ifadesi "4 gün kaldı · 20 Kas Cuma" olmalı. 4'teki "Crates per week, next 4 weeks" haftalık ortalama mı, toplam mı belli değil. "week 51" ile "week 2 of January" karışık kullanılıyor; tarih aralığı yazılmalı. 2'deki "412 of 520 °C·days" bilgisi çiftçi için jargon; ilerleme çubuğu ve "~18 gün" olarak gösterilmeli.
- **4'teki grafik hatalı.** Lejanda göre çizgi = sipariş, çubuk = hasat. Roka "5 / 9" olduğu hâlde işaret çubuğun yaklaşık %55'inde, ıspanakta (63 / 41) ise en sonda duruyor. Ölçek ürünler arasında tutarsız. Tek ortak ölçek kullanılmalı ve açık/fazla miktar çubuğun üzerinde yazmalı.
- **Metin yoğunluğu.** 1'deki kartlar 2–3 satır açıklama içeriyor. Başlık + tek satır gerekçe yeterli; detay "Neden?" açılırında olmalı (2'deki siyah "Why Sunday" kutusu iyi bir örnek, her öneride bulunmalı).
- **Dil.** Her şey İngilizce; Yunanca ürün adları yalnızca 4'te var. Arayüz EL/TR/EN olmalı ve ürün adları tek sözlükten gelmeli (Κλούβες uygulamasıyla aynı ID'ler). Yunanca metinler yaklaşık %30 daha uzun; düğmeler 2 satıra sığacak şekilde test edilmeli. Tarih ve ondalık biçimi yerele göre ayarlanmalı (0,6 ha).
- **Erişilebilirlik.** Dinamik yazı boyutu, ekran okuyucu etiketleri (ızgara hücreleri için "Pazartesi, ilaçlama: en iyi") ve sesli okuma (ellerin dolu olduğu durumlar için) desteklenmeli.

## Eksik durumlar ve akışlar

- **Çevrimdışı durum:** tarlada sinyal zayıf. Hava verisinin "son güncelleme 06:40" damgası ve eskime uyarısı yok.
- **Yükleme ve hata:** hava API'si düşerse tavsiye kartları gizlenmeli, eski veriyle öneri verilmemeli.
- **Boş durumlar:** henüz tarla yok, analiz yok, ilaç etiketi girilmemiş, bugün iş yok ("Bugün kritik iş yok" da bir bilgi).
- **Onboarding – tarla ekleme:** haritada köşelere dokunarak çizim, "tarladayım, GPS ile çevreyi yürü" seçeneği, kadastro/uydu altlığı, ardından ürün ve ekim tarihi seçimi. Bu akış tasarlanmamış.
- **Toprak analizi:** laboratuvar raporunun fotoğrafı + OCR ile pH, EC, N-P-K, CaCO₃ ve organik madde alanlarını önceden doldurup kullanıcıya onaylatmak.
- **İlaç etiketi:** Yunanistan ruhsatlı ürün listesinden arama ya da etiket fotoğrafı/barkod okutma. Etken madde, FRAC/IRAC grubu, bitki bazında PHI ve doz otomatik gelsin. 3'teki "[dose]" alanı şu an boş; doz birimi (ml/dekar, kg/ha) ve tank hacmi zorunlu olmalı.
- **Bildirimler:** tasarımda yok. Sabah 06:30'da tek bir özet bildirim, don ve ilaç penceresi için kritik uyarı, sessiz saatler ve bildirimden doğrudan "Yapıldı / Ertele" eylemi olmalı.
- **İş kaydı:** kim yaptı (işçi), gerçek saat, fotoğraf, hava kaydı. Yapılmayan önerinin "atlandı + neden" olarak işaretlenebilmesi.

## Teknik mimari önerisi

- **Hava verisi:** Open-Meteo (ICON-D2/ECMWF, yaklaşık 2–9 km) veya meteo.gr. 0,6 ha bir tarla bu ızgaranın çok altında kalıyor. 180 m'deki don, vadi inversiyonu ve yaprak ıslaklığı modelden doğrudan çıkmaz. Rakım düzeltmesi (yaklaşık −0,65 °C/100 m) uygulanmalı ve yakındaki NOA istasyonu kullanılmalı; uzun vadede tarlaya bir sensör (sıcaklık, nem, yaprak ıslaklığı) konmalı. 2'deki "Soil moisture 31%" ve 1'deki "Leaves wet 31 h" ölçüm değil tahmin; arayüzde "tahmini" diye yazmalı.
- **Önce çevrimdışı çalışma:** yerelde SQLite (WatermelonDB/PowerSync vb.) ve bir değişiklik kuyruğu. Kayıtlar sadece ekleme yapılan olaylar olarak tutulmalı; çakışmada son yazan kazanmamalı. Kurallar cihazda da çalışmalı. Hava verisi önbelleğe alınmalı ve önbellek yaşı gösterilmeli.
- **Veriye dayalı ve açıklanabilir kurallar:** kurallar kodda değil, sürümlü JSON/YAML olarak tutulmalı (`koşul → eşik → çıktı → kaynak → güven`). Her öneri tetiklenen kuralı, girdi değerlerini ve kaynağını (etiket, DSS modeli, literatür) saklamalı. "Neden?" ekranı bu kayıttan otomatik üretilmeli. Kural değişiklikleri geçmiş verilerle test edilmeli.
- **Veri modeli:** `Farm`, `Field(geometri, alan, rakım)`, `SoilTest(field, tarih, değerler)`, `Crop(ortak ürün ID'si, adlar EL/TR/EN, GDD, ekim penceresi)`, `Planting(field, crop, alan, ekim tarihi, durum)`. Hill Plot'ta hem roka hem maydanoz var, yani bir tarlada birden çok ekim olabilmeli. `Product(ruhsat no, etken madde, FRAC/IRAC)`, `LabelUse(product, crop, doz, PHI, max uygulama)`, `Job(planting, tür, product, doz, saat, işçi, hava snapshot)`, `Recommendation(kural ID'si, girdiler, güven, durum)`, `WeatherSnapshot`.
- **Κλούβες entegrasyonu:** ortak ürün kataloğu ve ID'ler kullanılmalı. FieldWise siparişleri salt okunur olarak almalı (haftalık kasa toplamları); veri ters yönde akmamalı. Kasa/hektar verimi geçmiş hasat kayıtlarından öğrenilmeli. Başlangıçta bunlar varsayım olarak görünür olmalı (4'teki "63 crates" bu varsayıma dayanıyor).

## Riskler

- **Hatalı agronomik tavsiye ve sorumluluk:** yanlış zamanda ilaçlama, PHI ihlali sonucu kalıntı ve müşteri ya da denetimde ret. Çözüm: ilaç dozunu ve PHI'yi uygulama değil etiket belirler; uygulama yalnızca hatırlatır. "Karar destek, talimat değil" metni, ruhsat ve etiket kaynağına bağlantı ve satış öncesi hukuki inceleme gerekli.
- **Güven gösterimi:** her kartta Yüksek/Orta/Düşük güven ve gerekçe ("Hava tahmini 5 km çözünürlükte, tarlanızda ölçüm yok") gösterilmeli. 1'deki "ideal" gibi kesin dil yumuşatılmalı.
- **Ekranlar arası çelişkiler:** kurallar arasında çakışma kontrolü yapılmalı (ilaç penceresi × rotasyon × PHI × sipariş tarihi).
- **Ölçeklenme:** başka çiftçilere satışta farklı ürün, bölge ve mevzuat gelecek; kural setleri bölgeye göre ayrılmalı.

## Öncelikli düzeltme listesi

**P0**
1. Today ile Spray-log arasındaki fungisit çelişkisini gider: öneri ürünü ve grubunu açıkça yazsın, rotasyon ve PHI etkisini göstersin.
2. PHI/doz verisini resmi etiketten al, doz alanını zorunlu yap, "karar destek" uyarısı ve güven seviyesi ekle.
3. Çevrimdışı çalışma ile veri tazeliği damgası; hava verisi eskiyse öneri verilmesin.
4. 4'teki grafik ölçeğini ve lejandı düzelt.

**P1**
5. Alt menüyü ikonlu olarak tüm sekmelerde göster (3 dahil); 2 geri butonuyla Fields altında açılsın.
6. Dokunma hedefleri ≥56 px, metin ≥14–16 px, renk yanında simge, tarla modu.
7. Onboarding: haritada tarla çizimi, analiz için OCR, etiket barkod/arama.
8. EL/TR/EN dil desteği ve ortak ürün sözlüğü.
9. Bildirim tasarımı ve boş, hata ve yükleme durumları.

**P2**
10. Kural motorunu JSON tabanlı, sürümlü ve geçmiş verilerle test edilir hâle getir.
11. Sensör ve istasyon entegrasyonu, rakım düzeltmesi.
12. Verimin hasat kayıtlarından öğrenilmesi, sesli okuma, denetim için PDF dışa aktarma.
