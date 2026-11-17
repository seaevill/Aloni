# FieldWise – Megara'lı bir sebzecinin eleştirisi

*Rol: Megara ovasında, Pachi'de yeşillik yetiştiren, bu uygulamaya para ödeyecek kuşkucu üretici. Ekranlar örnek veriyle hazırlanmış (1-Today, 2-Field-detail, 3-Spray-log, 4-Orders-to-sowing).*

## Eksik olanlar

- **Yunanca arayüz.** Bütün ekranlar İngilizce. İşçilerim Yunanca, bir kısmı Arnavutça ya da Türkçe konuşuyor. "Spray window" yazısını kimse okumaz. Κλούβες uygulamasında üç dil var, burada neden yok?
- **Alan birimi olarak στρέμμα.** Ekran 2'de "0.6 ha" yazıyor. Burada kimse hektarla konuşmaz; doz da litre/στρέμμα ile söylenir.
- **İlaçlama kaydında zorunlu alanlar (Ekran 3).** Doz hâlâ "[dose]" diye duruyor. Kayıtta şunlar olmalı: ticari ad, etken madde, ruhsat numarası, hedef hastalık veya zararlı, doz/στρέμμα, depo hacmi ve su miktarı, uygulayıcı, pülverizatör. Bildiğim kadarıyla Yunanistan'da ilaç almak için ziraat mühendisi reçetesi gerekiyor; bunun doğrulanması lazım. Reçeteyi kayda bağlamak gerekir.
- **Tarlaya yeniden giriş süresi (REI).** Hiç yok. Sabah ilaçladığım parsele öğleden sonra işçileri hasada sokacak mıyım?
- **Sulama.** Ekran 2'de "Soil moisture 31%, good, no irrigation" yazıyor, o kadar. Kuyu, damla/yağmurlama programı, su saati yok. Sahile yakın kuyularda tuzluluk da var (ölçüm/EC).
- **Maliyet.** Tarla başına ilaç, gübre, tohum, işçilik ve kasa başı maliyet görünmüyor. "Verimli tarım" bu değilse nedir?
- **ΟΠΕΚΕΠΕ/ΟΣΔΕ parsel kodları ve destek dosyası.** Tarla kaydı, beyanname parselleriyle eşleşmeli.
- **Tarla içi bölümler.** Gerçekte bir parselde 3–4 ayrı ekim partisi olur. Ekran 2 bir tarlaya tek ürün ve tek ekim tarihi veriyor.
- **İşçi görünümü ve bildirim.** Sabah 5'te alıcı aradığında ilk bakacağım şey: bugün hangi parselden kaç kasa kesilebilir, ilaç bekleme süresi bitmiş mi? Bunun tek ekranda olması gerek.

## Gerçekte çalışmaz

- **Ekran 1, ilaçlama penceresi 07:00–10:30.** Kasımda gece 8°, nem %78, çiy noktası 10°. Bu koşullarda sabah 7'de yaprak büyük ihtimalle çiyle ıslaktır. "Leaves dry since yesterday" ifadesi kendi verisiyle çelişiyor. Rüzgârın "10 km/h altında" olması da yetmez. Ortalama değil, hamle (gust) değeri gerekir; Geraneia'dan inen hamleler ovadaki istasyon ortalamasında görünmez. Sabah tamamen durgun havada da inversiyon yüzünden sürüklenme riski var. Bu, bilinen bir kural.
- **Ekran 1 ile Ekran 3 birbirini yalanlıyor.** Ekran 3'e göre North Plot ıspanağı "Ready since today", yani bugün kesilebilir. Ekran 4'e göre de ıspanak açığım var. Ekran 1 ise aynı parsele bugün fungisit atmamı söylüyor. Atarsam 14 gün bekleme süresi yeniden başlar ve hasat kilitlenir. Üstelik Ekran 3 "Fungicide A iki kez üst üste" uyarısı veriyor, Ekran 1 ise hangi fungisit olduğunu bile yazmıyor. Sistem ilaçlamayı hasat ve rotasyonla birlikte hesaplamıyor.
- **Ekran 1, don.** "180 m'de 1 °C, ovada 4 °C üstü" mantığı açık ve sakin gecelerde ters işleyebilir. Soğuk hava aşağı akar ve çukurlarda, ova tabanında toplanır. Ayrıca 2 m'de ölçülen 1 °C hava sıcaklığı, yaprak yüzeyinde 0'ın altı anlamına gelebilir. Roka soğuğa nispeten dayanıklıdır; "örtün" demeden önce kaç derecede ve kaç saat süreceği, hangi örtünün kullanılacağı söylenmeli. Kesin eşik değerini ben de veremem, uygulama da uydurmamalı.
- **Ekran 1, mildiyö.** "Yapraklar 31 saat ıslak kaldı" bilgisini neyle ölçtünüz? Tarlada yaprak ıslaklığı sensörü yok. Ispanakta mildiyöye (Peronospora) bakarken yaprağın altındaki gri-mor sporlanmaya bakılır, "alt yapraklarda sarı lekeler" tarifi eksik. Hangi çeşidin hangi ırklara dayanıklı olduğunu bilmeden verilen risk puanı değersiz. Asıl sorun şu: Pachi'ye "mildiyö riski yüksek" dedikten sonra Ekran 4 aynı Pachi'ye 0,3 ha daha ıspanak ekmemi öneriyor. Ispanak üstüne ıspanak ekmek, nemli kıyıda, hem de hastalık uyarısı verilen parsele.
- **Ekran 2, "Pazar günü gübre".** pH 7,9 olan kireçli toprakta yüzeye üre atılırsa amonyak olarak uçma kaybı bilinen bir risktir. Gübrenin yağmurdan *önce* ya da sulamayla toprağa karışması gerekir. Yağmurdan sonra kuru günlerde atmak tersini doğurabilir. Gübrenin formu (nitrat, amonyum, üre) hiç sorulmuyor. Daha önemlisi, hasada yaklaşık 18 gün kala ıspanağa azot vermek, kışın düşük ışıkta yaprakta nitrat birikimini artırır. AB'nin ıspanak için nitrat limitleri var. Alıcı analiz yaptırırsa yanan ben olurum.
- **Ekran 2 ve 4.** "412/520 °C·gün" değerinin baz sıcaklığı belli değil; kışın kısa gün de büyümeyi yavaşlatır, bu yüzden tek tarih yerine aralık verilmeli. Ekran 4'te "Cuma yağmurundan sonra toprak nemli" deniyor, oysa bugün pazartesi; tahmin, gerçekleşmiş bir şey gibi yazılmış.

## Bunu nasıl düşünmediniz

- **Sinyal.** Tarlada çoğu zaman sinyal yok. Kayıtlar çevrimdışı tutulmalı ve sonradan eşitlenmeli.
- **Saha koşulu.** Elde eldiven, ayakkabı çamurlu, bir elde depo hortumu. Butonlar küçük ve metin ağırlıklı. Sesli kayıt ya da tek dokunuşla "yaptım" lazım.
- **Siparişlerin kopyası.** Ekran 4 siparişleri baştan mı giriyor? Κλούβες uygulamasından doğrudan çekmesi gerekir. İki kez giriş yapmam.
- **Talep mevsimselliği.** Καθαρά Δευτέρα, Perhiz ve Paskalya'da yeşillik talebi patlar. Haftalık ortalamayla ekim planı yapılmaz.
- **Kasa ağırlığı ve fire.** Kasa ağırlığı ürüne ve mevsime göre değişir; fire de olur. "41 kasa hasat" hesabının nereden çıktığı gösterilmeli.
- **Parsel isimleri tutarsız.** Hill Plot Ekran 1'de roka, Ekran 3'te maydanoz. Hangisi?
- **Ruhsat ve rotasyon.** Dereotu gibi küçük ürünlerde ilacın o ürün için ruhsatı olup olmadığına bakılmalı; etikette yoksa bekleme süresi sayacı anlamsız. Ekran 3'teki "farklı gruptan seç" uyarısı da FRAC kodu olmadan işe yaramaz.

## Güvenmem için

- Her önerinin altında veri kaynağı görünsün: hangi istasyon, tarlaya kaç km uzakta, tahmin mi yoksa ölçüm mü, güven seviyesi ne.
- "İdeal" kelimesi kullanılmasın. Kural açıkça yazılsın (ör. "hamle < X, yaprak kuru, Y saat yağışsız"), eşikleri ben ya da ziraat mühendisim değiştirebilelim.
- Bekleme süresi, REI ve doz resmî ruhsat veritabanından gelsin; elle girilen değer işaretli dursun.
- Tarlada ucuz bir sıcaklık/nem/yaprak ıslaklığı sensörü ya da en azından benim "bugün çiy vardı / don yaktı" geri bildirimim kabul edilsin. Model zamanla benim tarlama göre düzelsin.
- Öneriyi ziraat mühendisi onaylayabilsin; onaylayanın adı kayıtta görünsün.
- Denetim çıktısı Yunanca olsun, yetkilinin istediği formatta ve imzalanabilir.

## İlk 5 öncelik

1. **Çelişkileri giderin.** İlaçlama önerisi hasat hazırlığını, bekleme süresini ve FRAC rotasyonunu birlikte hesaplasın. Hastalık uyarısı verilen parsele aynı ürünü ekme önerisi çıkmasın (Ekran 1, 3, 4).
2. **Tam, yasal ilaçlama kaydı.** Ruhsat, etken madde, doz/στρέμμα, uygulayıcı, REI ve Yunanca denetim çıktısı (Ekran 3).
3. **Agronomik kurallar düzeltilsin.** Çiy ve hamle değerleri hesaba katılsın, don analizi soğuk hava akışını hesaba katsın, gübre önerisi N formunu, pH'ı ve hasada kalan süreyi (nitrat) bilsin. Belirsizlik açıkça gösterilsin (Ekran 1, 2).
4. **Yunanca, çevrimdışı, eldivenle kullanılabilir arayüz**; birim στρέμμα; işçi görünümü.
5. **Κλούβες ile entegrasyon.** Siparişler oradan otomatik gelsin; hasat tahmini kasa ağırlığı, fire ve bayram talebiyle birlikte gösterilsin. Ardından tarla bazlı maliyet ve sulama eklensin.
