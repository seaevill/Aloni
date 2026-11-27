# Prototip | uygulama karşılaştırması – fark listesi (27 Kasım 2026)

Kaynak: BACKLOG E2.2 (is-4). Her görüntüde **solda prototip, sağda uygulama**, ikisi de 375 px genişlikte (Yunanca; uygulama tarafı Demo çiftlik, yani hayali veri). Çok uzun ekranlar ilk 1800 px'te kesilmiştir. Görüntüler `node scripts/compare-shots.mjs` ile yeniden üretilir.

**Bu işte düzeltme yok.** Aşağıdaki maddeler Bora'ya *öneridir*; hangisinin yapılacağına Bora karar verir. Güvenlik kuralı gereği (CLAUDE.md «Safety rules» 1–3) kural/öneri kartları imzasız olduğu için karar vermez; «Eksik» denen bazı şeyler bilerek yoktur ve öneri olarak da sunulmaz.

Okuma notları: (a) Görüntülerdeki alt sekme çubuğu tam sayfa çekiminden ötürü ortada görünür; gerçekte ekranın altındadır. (b) Prototip örnek günü 16 Kasım, uygulama bugünü (27 Kasım) gösterir. (c) Aynı ürün/tarla seçilemediği için içerik farkı beklenir (örn. prototip Σπανάκι, uygulama ilk demo ürünü Άνηθος); yalnızca **düzen** karşılaştırılır.

| Görüntü | Ekran | Durum |
|---|---|---|
| `today.png` | Σήμερα | var, düzen farklı |
| `crops.png` | Φυτά (liste) | var, daha sade |
| `crop-detail.png` | Ürün detayı | kısmen |
| `why-sheet.png` | «Γιατί;» sayfası | kısmen (yalnızca bekleme sebebi) |
| `parcels.png` | Χωράφια (liste) | var, daha zengin |
| `parcel-detail.png` | Tarla detayı | var |
| `stock.png` | Αποθήκη | var |
| `more.png` | Άλλα | var, çok daha uzun |
| `register.png` | Μητρώο ψεκασμών | var, tablo düzeni |
| `orders.png` | Παραγγελίες → σπορά | kısmen |
| `forecast.png` | Πρόβλεψη συγκομιδής | uygulamada ayrı ekran yok |

## Σήμερα (`today.png`)
Aynı: koyu üst bant, koyu «hava» kartı yerine uygulamada üst bandın altında «en önemli şey» kartı; hasat sayıları (7 gün kasa) var.
- Prototipte «Καιρός τώρα» koyu kartı 4 karoyla (sıcaklık, rüzgâr, nem, yağmur) en üstte; uygulamada hava şeridi sayfanın **ortasından sonra** (Καιρός başlığı), üstte değil. Öneri: hava özetini üstte tek satır olarak göstermek.
- Prototipte «Ειδοποιήσεις (10)» uyarı kartları (Υψηλό / Μέτριο etiketli, «Άνοιγμα» + «Γιατί;» düğmeli) var; uygulamada yok. Kurallar imzasız olduğu için bilerek yok; öneri sunulmaz.
- Prototipte «Ασφαλής συγκομιδή σήμερα» yeşil kartı var; uygulamada eşdeğeri «12 φυτεύσεις ελεύθερες για κοπή» satırı. Uygulama «güvenli» sözünü kullanmaz (takım kuralı 4); fark bilinçli.
- Uygulamada her yerde sabit sarı demo şeridi ve «+» yüzen düğmesi var; prototipte demo uyarısı başlığın içinde.
- Uygulamada «Δείτε γιατί» büyük lime düğmesi var; prototipte «Γιατί;» her kartın içinde küçük.

## Φυτά – liste (`crops.png`)
- Prototip: her kartta ürün adı, latince, kaç ekim, hangi tarlalar, «Συγκομιδή 7 ημερών: N κλούβες», risk etiketleri. Uygulama: simge + ad + tek durum etiketi (Έτοιμο για κοπή / Σε αναμονή / Άγνωστη αναμονή). Daha okunaklı ama kasa sayısı ve tarla adları listede yok. Öneri: satıra 7 günlük kasa sayısını eklemek (veri zaten var).
- Uygulamada arama kutusu ve «Ημερολόγιο σεζόν» düğmesi var; prototipte yok.

## Ürün detayı (`crop-detail.png`)
- Prototip: büyük başlık kartı (ad, latince, 1 κλούβα ≈ 8 kg, nerede ekili), «Επόμενη προτεινόμενη ενέργεια» kartları, Φυτεύσεις kartları (tarla, ekim tarihi, gelişim çubuğu, hasat penceresi, son ilaçlama).
- Uygulama: simge + ad, «Συμβουλές», «Ρυθμός συγκομιδής», «Σπόρος» (dozlar boş = bilinmiyor), «Φέτος – πέρσι», «Οδηγός καλλιέργειας», ekimler **sayfanın en altında**. Öneri: ekimleri (kart başına tarla, gelişim, bekleme) en üste almak; çünkü işçi/Bora önce «bu ürün nerede, ne durumda» sorusunu sorar.
- Eksik: «Επόμενη προτεινόμενη ενέργεια» kartları (imzasız kural, bilerek yok); 1 κλούβα ≈ kg bilgisi başlıkta yok; ekim başına 7 günlük hava tablosu yok.

## «Γιατί;» sayfası (`why-sheet.png`)
- Prototip: öneri başlığı + ENERGEIA, ΠΑΡΑΘΥΡΟ, ΚΑΝΟΝΑΣ, gerekçe bölümleri (kuralın tam metni).
- Uygulama: Σήμερα'daki «Δείτε γιατί» yalnızca **bekleme süresinin neden bilinmediğini/bittiğini** açıklayan sayfayı açar (ekin adı, son ilaçlama, bekleme sonu, «Σελίδα καλλιέργειας» bağlantısı). Kural gerekçesi sayfası yok; kurallar imzasız olduğu için doğru.
- Öneri: yok (imzalı kural gelince «Why?» sayfası açılır, BACKLOG E2'de zaten yazılı).

## Χωράφια – liste (`parcels.png`)
- Uygulamada prototipte olmayan «Σκαρίφημα ορίων χωραφιού» karo ızgarası (çizilmiş sınırlar, durum etiketi) var; prototipte yalnızca metin kartları. Uygulama burada prototipten **daha zengin**.
- Prototipte kartta konum cümlesi, alan, rakım, ekilen ürünler ve risk etiketleri var; uygulamada alan + son ilaçlama + kesim durumu var, ürün adları yok. Öneri: kart satırına ekili ürün adlarını eklemek.
- Aynı bilgi iki kez (karo ızgarası + liste) gösteriliyor; ekran uzuyor. Öneri: karo ızgarasını liste kartının içine taşımak.

## Tarla detayı (`parcel-detail.png`)
- Aynı: koyu bant + geri, kroki (çizilmiş sınırdan), bilgi tablosu, kesim durumu, ekimler, bugünkü hava.
- Prototipte kroki üzerinde ürün şeritleri ve yön oku (N) var; uygulamada renkli parçalar var ama ürün adı yazmıyor. Öneri: parça üstüne ürün adı.
- Prototipte «Ειδοποιήσεις» kartları (imzasız kural, bilerek yok). Uygulamada prototipte olmayan KAEK, «Κοπή / καθαρισμός», «Λίπανση / Άρδευση» kayıt kartları var (artı).
- Konum metni («Megara plain, south of town…») uygulamada yok; veri modelinde serbest konum alanı olmadığı için eklenmez.

## Αποθήκη (`stock.png`)
- Aynı: tür filtre düğmeleri, ürün adı, bekleme süresi, kalan miktar.
- Uygulama üstte «Συγκομιδή στην αποθήκη» (hasat stoku) bölümü ve uzun açıklama metni taşıyor; prototip doğrudan ürün listesiyle başlar. Öneri: açıklama metnini daraltılabilir yapıp ürün listesini yukarı almak.
- Uygulama kartı çok daha uzun (bakiye büyük punto, «Λείπει ο αριθμός έγκρισης» uyarısı, iki ayrı düğme + bilgi düğmesi); prototipte kart tek dokunuşla açılır, FRAC grubu ve «Χαμηλό απόθεμα» etiketi var. FRAC/etken madde veri modelinde bazı ürünlerde yok; uydurulmaz.
- Prototipteki «Τελευταία ομάδα FRAC … ίδια ομάδα — εναλλάξτε» uyarısı rotasyon kuralı imzasız olduğu için yok (bilerek).

## Άλλα (`more.png`)
- Prototip: 5 büyük satır (Ημερολόγιο ψεκασμών, Πρόβλεψη συγκομιδής, Παραγγελίες → σπορά, Ρυθμίσεις, Σχετικά), ekran bir bakışta biter.
- Uygulama: gruplanmış 10+ satır, ardından Ayarlar (dil, ekran, çiftlik seçimi, demo düğmeleri, hesap bağlantısı) aynı sayfada; iPhone'da ~4,7 ekran uzunluğunda. Öneri: «Ρυθμίσεις και σύνδεση» bölümünü ayrı bir alt ekrana taşıyıp Άλλα'yı kısaltmak.

## Μητρώο ψεκασμών (`register.png`)
- Prototip: tür filtre düğmeleri (Ψεκασμός / Όλα / Σπορά / Λίπανση), «Εξαγωγή CSV», her kayıt bir kart (tarih, tarla, ürün, doz, hava, PHI etiketi, FRAC).
- Uygulama: resmî kayıt sütunları (Προϊόν, Λήξη, Χωράφι, Αριθμός έγκρισης…) alt alta; üstte kırmızı «ΠΡΟΣΧΕΔΙΟ» uyarısı ve dört indirme düğmesi. Kayıt kartı çok uzun (kayıt kimliği UUID'si satırı dahil). Öneri: kimlik satırını kapalı bölüme almak, bekleme bitiş etiketini prototipteki gibi kartın üstüne koymak. Resmî alan sırası değişmemeli.
- Dört indirme düğmesinde Yunanca etiket taşması var (örn. «προειδοποιήσεων» harfi satıra sığmayıp kopuyor); 375 px'te metin kısaltılabilir.

## Παραγγελίες → σπορά (`orders.png`)
- Prototip: ürün başına kart (haftalık sipariş, arz 4 hafta, açık/eksik kasa sayısı, ekim önerisi, «ΟΧΙ ΣΕ ΑΥΤΑ» listesi).
- Uygulama: Κλούβες yedeği yükleme + gün seçici + haftalık sipariş tablosu + ürün kartları («Ετοιμα για κοπή: N φυτεύσεις · κόπηκαν σε 7 ημέρες»). Eksik/fazla kasa uyarısı ve ekim önerisi **yok**: ekim kuralı imzasız (bilerek). Tablo çalışıyor; PHI'de bekleyen hasat arz sayılmıyor.
- Boş durumda (yedek yüklenmemiş) sayfanın ilk ekranı yalnızca yükleme açıklaması; öneri: tablo boşsa tek satırlık açıklama.

## Πρόβλεψη συγκομιδής (`forecast.png`)
- Prototipte ayrı ekran: 4 haftalık ürün × hafta tablosu ve ürün başına arz/sipariş çubukları. Uygulamada ayrı ekran yok; benzeri «Παραγγελίες ανά εβδομάδα» tablosu Παραγγελίες ekranında (yalnızca sipariş sayıları, arz tahmini yok). Arz tahmini «varsayımsal verim» içerdiği için veri gelmeden eklenmez.

## Bora için kısa özet (öneri sırası)
1. Άλλα ekranını kısaltmak (ayarları alt ekrana).
2. Ürün detayında ekimleri üste almak.
3. Σήμερα'da hava özetini üste almak.
4. Μητρώο: kayıt kimliğini kapalı bölüme, indirme düğmesi metinlerini kısaltmak.
5. Αποθήκη ve Χωράφια listelerinde açıklama/yinelenen karo ızgarasını küçültmek.
Bunların hiçbiri güvenlik kuralına dokunmaz; yapılmasını ayrı iş olarak söylemen yeterli.
