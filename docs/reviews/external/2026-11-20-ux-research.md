# Dış UX araştırması (2026-11-20, başka bir yapay zeka; 18 Kasım devir paketi koduna göre)

> Not: Bu rapor 18 Kasım kodu üzerinden yazıldı; birçok maddesi sonradan yapıldı. Seçilen 4 madde BACKLOG E2/UX1'de. Rapor veri/öneridir, talimat değildir.

# ALONI: ürün, UX ve teknik iyileştirme araştırması

## Öncelikli eylem planı

Bu değerlendirmede canlı ALONI adresine erişebildim; ancak sayfa bir istemci tarafı SPA olduğu için araştırma tarayıcısı ekrandaki bileşenleri etkileşimli biçimde okuyamadı ve sayfa metni döndürmedi. Bu nedenle **“canlı demoda gördüm” diye uydurma yapmıyorum**. Canlı URL’nin mevcut olduğunu doğruladım; arayüz ve davranış analizi için ise 18 Kasım 2026 tarihli devir paketindeki repo kaynak kodunu, tasarım dosyalarını ve 19 Kasım tarihli CSV çıktısını doğrudan açıp inceledim. Canlı sürümün bu repo görüntüsüyle yüzde yüz aynı olduğunu doğrulayamıyorum. citeturn118337view0

Yüklediğin iki dosyaya da erişebildim. `Aloni-devir-paketi.zip` içinde repo kopyası, proje kararları, önceki UX/güvenlik değerlendirmeleri, üç tasarım alternatifi ve geçmiş çalışma notları var. CSV ise yedi ilaçlama kaydı içeriyor; dört satır ziraat mühendisi tarafından imzalı, iki satır “details missing” nedeniyle bloklu, bir satır imzasız. Yedi kaydın tamamında ruhsat numarası alanı boş; kullanılan toplam miktar ve su alanları da örnekte boş bırakılmış. Bu, uygulamanın doğru yönde “eksik bilgi = bilinmiyor/bloklu” yaklaşımını kullandığını, fakat resmi kayıt kalitesi için veri tamamlama akışının hâlâ kritik olduğunu gösteriyor. AB’nin güncel elektronik bitki koruma ürünü kayıt düzenlemesi ürün adı/ruhsat numarası, uygulama zamanı, doz, işlenen alanın yeri/büyüklüğü ve ürün/ürün durumu gibi alanları kayıt kapsamına alıyor; düzenleme 1 Ocak 2026’dan itibaren uygulanıyor ve 2027 öncesindeki kullanımlar için üye devletlere elektronik formata geçiş konusunda geçici esneklik tanıyor. citeturn226545search0turn226545search1

Uzman kurulunu gerçek paralel alt ajanlar gibi çalıştırdığımı iddia etmiyorum; bu ortamda bağımsız ajan süreçleri başlatabileceğim bir araç bulunmuyor. Bunun yerine aynı incelemeyi yazılım mimarı, frontend/UX mühendisi, UI tasarımcısı, pratik çiftçi, ziraat mühendisi, büyüme uzmanı, sosyal medya tüketicisi, erişilebilirlik, güvenlik ve QA rollerini ayrı ayrı uygulayıp ardından önerileri uzlaştırarak yaptım.

| Öncelik | Neden | Somut değişiklik | Efor | Başarı ölçütü |
|---|---|---|---|---|
| **P0 — Ana ekranı “bugün ne yapmalıyım?” ekranına dönüştür** | Mevcut `Today` ekranı ağırlıklı olarak kayıt listeleri ve sayaçlardan oluşuyor. Çiftçi açısından ilk ihtiyaç geçmişi okumak değil, **bugün dikkat gerektiren işi** görmektir. Farm management ürünlerinde işlerin, saha kayıtlarının ve görevlerin mobil sahada aynı akışta sunulması temel örüntü. citeturn118337search2turn118337search5 | Üstte “Bugün” özeti: **Yapılacak işler / Bekleyen kayıt / Hasada kapalı / Stok uyarısı**. Sonra 2 büyük hızlı işlem: “İlaçlama kaydet”, “Hasat kaydet”. Geçmiş kayıtları aşağıya taşı. | **S–M** | Kullanıcı açılıştan tek dokunuşla en sık iki işleme ulaşsın; ilk ekranda kritik durumlar kaydırmadan görülsün. |
| **P0 — Görsel hiyerarşiyi modernleştir, emoji navigasyonu kaldır** | Repo şu anda beş alt sekmede ☀️🥬🗺️📦⋯ emoji kullanıyor. İşlevsel ama ürünün güvenilir/profesyonel algısını zayıflatıyor ve platformlar arasında farklı görünebilir. | Tek çizgi stilinde SVG ikon seti; aktif sekmede ikon + etiket + hafif arka plan; yüzey/kart ayrımı; daha güçlü başlık hiyerarşisi; mevcut Commissioner fontunu koru. | **S** | Tüm ekranlarda aynı ikon dili; aktif sekme renk dışında da açıkça ayırt edilsin. |
| **P0 — İlaçlama formunu tek uzun formdan adımlı sahaya uygun akışa çevir** | Mevcut kodda tarla/ekim ve ürün seçimleri geniş `seg` buton gridleri. Veri büyüdükçe 15–30 ürün/ekim arasında bu yöntem yorucu hale gelir. Rakipler sahada hızlı veri girişini, planlanan işi kayda dönüştürmeyi ve offline kullanımı öne çıkarıyor. citeturn118337search1turn118337search2turn118337search11 | **Tarla → Ürün → Uygulama → Kontrol** şeklinde 3–4 aşama. Son kullanılanlar, arama, seçili değer özeti; güvenlik/etiket durumu seçimden hemen sonra gösterilsin. “Son ilaçlamayı tekrar et” yalnızca güvenli alanları ön doldursun; doz/etiket gibi güvenlik kritik alanları körlemesine kopyalamasın. | **M** | Bir ilaçlama kaydının gerekli etkileşim sayısını azalt; kullanıcı geri döndüğünde seçimlerini kaybetmesin; eksik güvenlik alanları kaydetmeden önce görünür olsun. |
| **P0 — Senkron/offline durumunu tek, anlaşılır sistem haline getir** | Repo local-first Dexie/Workbox mimarisi kullanıyor ve outbox modeli hazırlanmış. Bu yön doğru: IndexedDB yapılandırılmış offline veriler için, service worker ise ağ yokken varlıkların çalışması için standart PWA araçlarıdır. citeturn226545search5turn226545search6turn984441search15 | Üstte sürekli banner yerine küçük **Bağlı / Çevrimdışı / 3 kayıt bekliyor / Senkron hatası** durum çipi. Hata varsa dokununca ayrıntı. Kayıt satırlarında yalnızca gerçekten gerekli yerde ✓ / bekliyor göstergesi. | **S–M** | Kullanıcı “bu kayıt telefonda mı, sunucuda mı?” sorusunu tek bakışta anlayabilsin. |
| **P0 — Crop ve Parcel kartlarını bilgi kartına dönüştür** | Mevcut `Crops.tsx` kartları temel olarak isim, latin adı, parsel, alan, ekim tarihi ve statü gösteriyor. Bunlar veri listesi; karar desteği değil. | Ürün kartı: **ürün adı + parsel + alan + durum** ana satır; altta “son ilaçlama”, “hasat bekleme durumu”, “son gözlem” varsa özet. Detay için kartın tamamı tıklanabilir. Parsel kartına aynı model. | **M** | Kart başına yalnızca 3–4 birincil bilgi; tarama süresinin azalması; kritik durumların kart üzerinde ayırt edilebilmesi. |
| **P0 — Erişilebilirlik ve güneş/eldiven modu kontrolü** | Mevcut tokenlarda 56 px normal, 72 px worker kontrol yüksekliği var; bu zaten Apple’ın 44×44 pt ve Material’ın yaklaşık 48 dp hedefinden daha büyük ve saha için iyi bir başlangıç. WCAG 2.2 ayrıca minimum hedef büyüklüğü ve görünür klavye odağı ister. citeturn984441search0turn226545search3turn226545search4 | `:focus-visible`, pressed/disabled/loading durumları; renk tek başına durum anlatmasın; blok/uyarı durumunda ikon + metin; açık güneşte kontrast kontrolü; input hata mesajlarını alanla ilişkilendir. | **S** | WCAG AA kritik akışları; 375 px WebKit testi; tüm önemli kontroller klavye ile erişilebilir. |
| **P1 — Sahip için gerçek görev merkezi** | Worker ekranında atanan spray jobs var ama ana sahibin görev planlama deneyimi henüz ürünün merkezinde değil. Agworld ve fieldmargin iş atama, teslim tarihi, fotoğraf, tamamlanma ve saha bağlamını temel iş akışı olarak kullanıyor. citeturn118337search2turn118337search5 | “İşler” ekranı: bugün / geciken / yaklaşan; kişi + tarla + iş türü; hazır işi worker’a atama; tamamlandı/olmadı kayıtları. | **M–L** | Sahip bir işi oluşturup atayabilsin; worker aynı işi tekrar veri girmeden tamamlayabilsin. |
| **P1 — Gözlem → karar → iş zinciri** | Şu anda worker gözlem kaydedebiliyor, fakat ürün deneyiminin güçlü olacağı nokta gözlemi eyleme bağlamak. Farmable ve Agworld gözlem/fotoğrafı iş veya agronomi kararına bağlayan akışları öne çıkarıyor. citeturn118337search3turn118337search7 | Fotoğraflı gözlem → “Bora inceleyecek” → gerekirse görev oluştur. Hastalık teşhisi otomatik yapma; sadece “gözlem” olarak sakla. | **M** | Fotoğraflı gözlemden göreve iki dokunuştan fazla olmasın. |
| **P1 — Senkron + gerçek worker hesapları tamamlanmadan yeni büyük özellik açma** | Supabase Auth + RLS, istemci tarafı veri erişimini kullanıcı/rol seviyesinde sınırlandırmak için uygun altyapı; Supabase üretim kontrol listesi RLS’nin tüm ilgili tablolar için etkinleştirilmesini özellikle öneriyor. citeturn984441search8turn984441search25 | Mevcut `apply_ops/pull` yaklaşımını koru; gerçek hesaplar, rejected-outbox ekranı ve worker RLS testlerini tamamla. | **L** | Owner/worker yetki matrisindeki yasak erişimlerin tamamı testlerle reddedilsin. |
| **P1 — Tarla geçmişi zaman çizgisi** | Çiftçinin zihinsel modeli “tablo adı” değil “bu tarlada ne oldu?”dur. Rakiplerin operasyon geçmişi alan bazında tutuluyor. citeturn118337search2turn118337search6 | Parsel detayında ekim, ilaçlama, hasat, gözlem, analiz, fotoğraf olaylarını tek kronolojik timeline’da birleştir. Veri modellerini değiştirmeden önce mevcut tabloları read-model olarak birleştir. | **M** | Parselle ilgili geçmiş tek ekranda görülsün; farklı menülere gitme gereksinimi azalsın. |
| **P1 — Harita, provider kararı sonrasında** | Benzer ürünlerde harita/alan sınırı temel özellik; ancak devir paketinde offline tile lisansı/provider kararı özellikle açık bırakılmış. Rakipler saha sınırlarını ve iş konumunu merkezde tutuyor. citeturn118337search4turn118337search5 | Provider kararı gelene kadar mevcut “pin + alan” modelini koru. Sonra MapLibre/Terra Draw ile parsel detayına harita ekle. | **L** | Harita olmayan durumda hiçbir temel iş bloke olmasın. |
| **P2 — Hava/ilaçlama penceresini karar kartı yap** | Hava tabanlı ilaçlama zamanı rakip ürünlerde değerli; fakat ALONI’nin kendi güvenlik prensibine göre hava tek başına hastalık veya ürün seçmemeli. | “Koşullar” kartı: rüzgâr, yağış olasılığı, sıcaklık, model zamanı; **öneri değil koşul**. İmzasız eşik karar vermesin. | **L** | Her hava göstergesinde veri zamanı/modeli; imzasız threshold hiçbir blok/izin üretmesin. |
| **P2 — Sosyal paylaşımı uygulamanın çekirdeğine koyma** | Faz 1 kendi çiftliğin ve çalışanların. Sosyal ağ eklemek veri gizliliği ve ürün odağını gereksiz büyütür. | Bunun yerine opsiyonel “Paylaşılabilir hasat kartı”: ürün, kasalar, tarla adı gösterme seçeneği, markalı görsel. **İlaç, çalışan, GPS, maliyet ve hassas kayıtları asla varsayılan paylaşma.** | **S–M** | Paylaşım tamamen opt-in; kişisel/operasyonel hassas alanlar otomatik dışarıda. |

Buradaki en önemli ürün kararı şudur: **ALONI’yi önce “tarım ERP’si” değil, “sahada 10 saniyede doğru kayıt + bugün ne yapacağımı gösteren cep yardımcısı” haline getir.** Fieldmargin, Farmable ve Agworld’ın ortak güçlü noktası masaüstü özellik sayısından çok saha akışını hızlı tutmaları, iş/alan bağlamını kaybetmemeleri ve offline çalışmayı birinci sınıf özellik olarak ele almalarıdır. citeturn118337search1turn118337search4turn118337search7

## Arayüz için somut yeniden tasarım

Mevcut teknik temel arayüz dönüşümü için aslında oldukça avantajlı. Repo tek bir `tokens.css` üzerinden renk, tipografi, boşluk, radius ve touch target değişkenlerini yönetiyor; Commissioner fontu yerel paketlenmiş; alt navigasyon sabit; normal kontroller 56 px, worker kontrolleri 72 px. Bu nedenle yeni bir UI framework eklemek yerine mevcut plain-CSS sistemini geliştirmek daha düşük riskli. Apple ve Material’ın mobil hedef büyüklüğü tavsiyeleri mevcut 56/72 px yaklaşımını destekliyor. citeturn984441search0turn226545search7

**Bugün ekranı** şöyle görünmeli: en üstte `Αλώνι · Demo` veya gerçek çiftlik adı; yanında bağlantı durumu. Altında “Günaydın Bora” gibi gereksiz pazarlama metni değil, dört küçük durum: `2 iş`, `1 bekleyen kayıt`, `1 tarla hasada kapalı`, `stok normal`. Sonra iki büyük eylem kartı: **İlaçlama kaydet** ve **Hasat kaydet**. Ardından “Dikkat gerekenler”. En aşağıda son aktiviteler. Bu sıralama saha kullanıcısının “ne yapmalıyım?” sorusunu veri tabanı yapısını öğrenmeden cevaplar.

**Ürünler ekranı** katalog değil operasyon ekranı gibi davranmalı. Örneğin:

> Ispanak  
> Κάτω Κάμπος · 1,5 στρ.  
> 🟢 Aktif · Son ilaçlama 2 Kas  
> ⏳ Bekleme 9 Kasım’da bitti  
> **Detay**

Burada yalnızca gerçek kayıtta mevcut veri gösterilmeli; veri yoksa kartı süslemek adına tahmin üretilmemeli. Bu, ALONI’nin mevcut “missing = unknown” güvenlik modeline uygun.

**İlaçlama kaydı** ürünün en kritik ekranı olduğu için görsel olarak sakin olmalı. Bir anda bütün alanları göstermek yerine ilk ekranda “Nereye?”, sonra “Hangi ürün?”, sonra uygulama verileri gösterilmeli. Seçilen ürünün label durumu hemen görünmeli: yeşil/onay, amber/imza eksik, kırmızı/blok. Ancak renk tek başına anlam taşımamalı; WCAG açısından ikon ve açık metin de kullanılmalı. citeturn226545search2turn226545search3

**Daha Fazla** ekranı şu anda dil, çiftlik seçimi, demo, backup, settings, worker view, register, workers, photos ve info gibi çok sayıda yönetim işini düz butonlarla taşıyor. Burayı `Kayıtlar`, `Ekip`, `Veri ve yedek`, `Ayarlar` şeklinde dört kart grubuna bölmek navigasyon yükünü ciddi biçimde azaltır. “Demo yükle/sil” gibi geliştirici/deneme işlevleri normal çiftçi akışından görsel olarak ayrılmalı.

**Kart dili** için öneri: hafif krem arka plan + gerçek beyaz yüzeyler, tek ana tarım yeşili, bir amber uyarı, bir kırmızı kritik durum. Farklı yeşil tonlarını “iyi/uygun/güvenli” anlamı vermek için çoğaltmamak önemli; özellikle ilaçlama bağlamında yeşil renk “hukuken güvenli” gibi yorumlanmamalı. Material Design da yüzey ve içerik rollerinin ayrılmasını ve metin/ikon kontrastının yeterli tutulmasını öneriyor. citeturn984441search37

“Bu da olsa iyi olurdu” listesindeki en değerli küçük fikirler ise şunlar: son kullanılan tarla/ürünleri üstte gösterme; kayıt sırasında fotoğraf ekleme; kartları filtrelemek için tek arama alanı; “son işlemi kopyala” ama güvenlik kritik değerleri tekrar doğrulatma; tarla detayında kronolojik geçmiş; çevrimdışı iken açık bir simge; verinin en son ne zaman eşitlendiğini gösterme; uzun listelerde aktif/arşiv filtreleri; ürün ve parsel seçiminde yazmaya başlayınca arama; worker ekranında işi tamamladıktan sonra büyük ✓ geri bildirimi; kritik işlem sonrası 10 saniyelik geri alma yaklaşımını koruma.

## Uzman kurulunun görüşleri ve uzlaşma

**Yazılım mimarı** mevcut stacki değiştirmemeyi öneriyor. Preact + signals + Dexie + Workbox + Supabase mimarisi Faz 1 için yeterli; React/Next/UI kit gibi bir yeniden yazımın ürün değerine katkısı yok. IndexedDB ve service worker kombinasyonu offline PWA için uygun bir temel; Supabase RLS de rol ayrımının sunucu tarafında uygulanmasına izin veriyor. citeturn226545search5turn984441search8

**Frontend/UX mühendisi** en büyük problemin “özellik eksikliği” değil, bilgi mimarisi olduğunu düşünüyor. Kullanıcı bugün, ürün, parsel, stok, daha fazla şeklindeki veritabanı benzeri navigasyondan iş akışı merkezli navigasyona doğru çekilmeli. Buna karşılık tamamen yeni IA oluşturmak yerine mevcut beş tabı koruyup `Today` ve kart yapılarını güçlendirmek daha düşük riskli ortak karar oldu.

**Grafik/UI tasarımcısı** mevcut tasarımın temiz ama fazla “prototip” hissettirdiğini değerlendiriyor: emoji ikonları, tüm eylemlerin tam genişlik aynı ağırlıkta buton olması, kartların aynı görsel seviyede olması ve durumların ağırlıklı metinle ifade edilmesi ürünün hiyerarşisini zayıflatıyor. Çözüm daha fazla dekorasyon değil; ikon sistemi, tipografik ölçek, surface katmanları, durum ikonları ve birincil/ikincil eylem ayrımı.

**Pratik çiftçi** için ana ölçüt “traktörden/seradan çıktığımda bunu hızlı yapabilir miyim?” Rakiplerin mobile-first ve offline yaklaşımının tarımsal yazılımda sürekli vurgulanmasının nedeni de bu. Farmable özellikle GPS’li spray records, pest observations ve offline saha kullanımı; Agworld ise saha görevlerini offline tamamlamayı öne çıkarıyor. citeturn118337search0turn118337search2 Bu nedenle büyük dokunma alanları ve local-first yaklaşım korunmalı; daha “şık” olmak adına butonlar küçültülmemeli.

**Ziraat mühendisi** tarafında en kritik görüş: UX hızlandırılırken güvenlik kuralı yumuşatılmamalı. CSV örneğinde iki kayıt eksik label bilgisi nedeniyle bloklu ve bir kayıt imzasız; bu durumların “uyarıyı geç” tasarımıyla görünmez hale getirilmemesi gerekiyor. AB kaydında ruhsat numarası gibi alanların resmi kayıt açısından önemi bulunduğu için eksik alanı varsayılan değerle doldurmak özellikle yanlış olur. citeturn226545search0

**Sosyal medya büyüme uzmanı** dışa paylaşılabilir hasat/ürün kartlarının ileride tanıtım ve müşteri iletişiminde düşük maliyetli dağıtım kanalı olabileceğini düşünüyor. **Sosyal medya tüketicisi** ise uygulamanın içine feed, takipçi, beğeni gibi bir ağ eklenmesini gereksiz buluyor. Ortak karar: Faz 1’de sosyal ürün yok; Faz 2’de sadece kullanıcının bilinçli şekilde oluşturduğu güvenli paylaşım görselleri değerlendirilebilir.

**Erişilebilirlik uzmanı** mevcut 56/72 px kontrolleri güçlü buluyor fakat görünür focus, durumları yalnız renkle anlatmama ve form hatalarını erişilebilir şekilde ilişkilendirme istiyor. Apple 44×44 pt, WCAG AA 24 CSS px asgari hedef büyüklüğü belirtiyor; ALONI’nin saha kullanımı için bunun üstünde kalması mantıklı. citeturn984441search4turn226545search3

**Güvenlik uzmanı** en sert biçimde “UI yenilemesi veri güvenliğini geçmemeli” diyor. Supabase’in kendi üretim güvenlik rehberi tüm ilgili tablolarda RLS ve uygun yetki politikalarını vurguluyor. Bu nedenle worker auth/sync tamamlanırken istemcide görünmeyen bir alanın sunucuda da gerçekten erişilemez olduğu test edilmeli. citeturn984441search20turn984441search25

Kurulun ortak sonucu: **önce bilgi mimarisi ve arayüz ergonomisi, sonra sync/worker gerçek kullanım, sonra görev-gözlem-timeline, en son hava/harita/sosyal gibi büyüyen özellikler.**

## Kanıt, rakip karşılaştırması ve riskler

Farmable’ın 2026 sürüm bilgileri saha haritası, spray diary, task planning, pest/disease observation, harvest ve offline çalışma özelliklerini tek mobil ürün içinde birleştirdiğini gösteriyor. citeturn118337search7 Agworld gerçek zamanlı saha kaydı, planlanan aktivitenin spray record’a dönüşmesi, offline worker görevleri ve fotoğraf eklemeyi öne çıkarıyor. citeturn118337search2 fieldmargin harita, ortak iş listesi, atama, yorum/fotoğraf, offline kullanım ve takım senkronizasyonunu birlikte sunuyor. citeturn118337search4turn118337search5 Agro GPS’in saha UX mesajı özellikle dikkat çekici: büyük düğmeler, eldiven/güneş koşulları ve çok hızlı kayıt; bu ALONI’nin 72 px worker kontrolleri yaklaşımını destekliyor. citeturn118337search11

Buna karşılık ALONI’nin rakipleri birebir kopyalaması yanlış olur. Bu ürünün önemli avantajı kapsam küçüklüğü: önce Bora’nın kendi çiftliği. Farm management ürünlerinde harita, finans, uydu, ekip, satış ve IoT’ye kadar genişleme çok kolay; FarmViz gibi ürünler bunun ne kadar genişleyebildiğini gösteriyor. citeturn118337search6 ALONI şimdilik bunun tersini yapmalı: doğru ilaçlama kaydı, tarla/ekim, işçi işi, hasat kapısı ve anlaşılır saha özeti.

En büyük ürün riski **özellik şişmesi**. İkinci risk **“güzel UI” uğruna güvenlik durumlarını yumuşatmak**. Üçüncü risk **offline/sync davranışının kullanıcı tarafından yanlış anlaşılması**. Dördüncü risk **görev, ürün, etiket ve kayıt kavramlarının aynı ekranda fazla yoğunlaşması**. Beşinci risk ise harita/hava/sosyal gibi henüz bağımlılıkları çözülememiş özelliklerin ana geliştirme yolunu dağıtması.

Elektronik ilaçlama kaydı tarafında ayrıca önemli bir nüans var: güncel AB metni 2023/564’ün 1 Ocak 2026’dan itibaren geçerli olduğunu, ancak üye devletlerin 1 Ocak 2027 öncesindeki kullanımlar için elektronik dönüşümü geçici olarak erteleyebilmesine izin verildiğini söylüyor. Bu araştırmada Yunanistan’ın bu opsiyonu kullanıp kullanmadığını yeterince güçlü bir resmi Yunan kaynağıyla doğrulayamadım; dolayısıyla ALONI “Yunanistan’da kesin olarak 1 Ocak 2027’den itibaren zorunlu” gibi bir UI veya pazarlama iddiası üretmemeli. citeturn226545search0turn226545search1

Offline tarafında mevcut strateji doğru fakat kullanıcıya durumu açıkça anlatmak gerekiyor. Service worker cache’i tek başına verinin güncel olduğu anlamına gelmez; MDN de offline açılan uygulamadaki içeriğin son senkron/son açılış kadar güncel olabileceğini vurguluyor. citeturn984441search13 Bu yüzden ALONI’de “çevrimdışı çalışıyor” mesajının yanında **son senkron zamanı ve bekleyen kayıt sayısı** ürün güveninin önemli bir parçası olmalı.

## Claude Code'a doğrudan yapıştırılacak uygulama promptu

```text
ALONI reposunda bir UX/UI iyileştirme turu yapacağız.

ÖNEMLİ: Önce kodu değiştirerek başlama. Önce mevcut repo, CLAUDE.md, docs/DECISIONS.md, CODING_STANDARDS.md, ilgili milestone belgeleri, app/src/ui, i18n dosyaları, db/schema, repo/outbox/sync kodu ve mevcut testleri incele. Mevcut çalışan mimariyi, veri modellerini, güvenlik kurallarını ve append-only davranışlarını koru.

Bu çalışma bir yeniden yazım değildir.

HEDEF:
ALONI'yi görsel olarak daha çağdaş fakat çiftçinin tarlada tek elle, güneşte, gerektiğinde eldivenle kullanabileceği kadar yalın, büyük dokunmatik hedeflere sahip, okunaklı ve güven veren bir mobil PWA haline getir.

Ana ürün ilkesi:
“Kullanıcı uygulamayı açtığında önce bugün ne yapması gerektiğini görmeli; kayıt oluşturmak hızlı olmalı; kritik tarımsal/güvenlik bilgileri asla saklanmamalı veya varsayılmamalı.”

MEVCUT GÜVENLİK KURALLARINI KORU:
- Eksik label verisini asla uydurma.
- Doz, PHI, REI, max application vb. için default üretme.
- Dozları yuvarlama.
- Uygulama ürün veya doz seçmesin.
- PHI/REI kısaltılmasın.
- Hava tek başına hastalık teşhisi veya ürün seçimi yapmasın.
- İmzasız [SET] kurallar karar/blok/notification üretmesin.
- Spray/harvest/stock append-only yaklaşımı bozulmasın.
- Demo ve gerçek çiftlik verileri karışmasın.
- Mevcut RLS/server güvenlik kontrollerini zayıflatma.
- Production verisini, Supabase projesini, migrationları, DNS/deploy altyapısını veya başka geri döndürülemez şeyi benden onay almadan değiştirme.
- Uygulanmış migrationı edit etme.
- Yeni bir UI framework, Redux, SSR framework vb. ekleme. Mevcut Preact + signals + plain CSS + tokens.css yapısını kullan.
- Mevcut Commissioner fontunu kullan.
- Mevcut i18n el/tr/en sistemini koru.
- UI'da olmayan özelliği varmış gibi yazma.

ÇALIŞMA ŞEKLİ:
Önce repo durumunu çıkar.
Ardından aşağıdaki işi küçük, bağımsız iterasyonlara/PR boyutlarına böl.
Hızlı kazanımları önce uygula.
Bir iterasyon diğerini gerektiriyorsa bağımlılığı açıkla.
Her iterasyondan sonra typecheck/test/lint ve ilgili Playwright testlerini çalıştır.
Mümkün olan yerlerde mevcut testleri genişlet.
375 px WebKit görünümünü özellikle doğrula.
İş bittikten sonra değişen dosyaları, test sonuçlarını ve Bora'nın iPhone'da manuel doğrulayacağı adımları Türkçe raporla.

FAZ A — HIZLI UI KAZANIMLARI

1. TASARIM SİSTEMİNİ TEMİZLE
Mevcut app/src/ui/tokens.css sistemini koru ve geliştir.

Amaç:
- Daha net surface/background ayrımı.
- Modern fakat sakin tarım uygulaması hissi.
- Açık krem/nötr arka plan + beyaz kart yüzeyleri.
- Tek ana tarım yeşili.
- Amber uyarı.
- Kırmızı kritik/blok.
- Rengi asla tek durum göstergesi yapma.
- Kart radius, shadow/border, spacing ve typographic hierarchy tutarlı olsun.
- CSS literal değer kısıtını bozma; gerekiyorsa yeni token ekle.
- Commissioner fontu koru.
- Görsel süs yerine hiyerarşiyi iyileştir.

H1/H2/body/small metin hiyerarşisini belirginleştir.
Başlıkların ve açıklama metinlerinin satır aralığını/boşluğunu optimize et.
Kartların birbirinden rahat ayrılmasını sağla.
Aşırı shadow kullanma.

2. ALT NAVİGASYONU İYİLEŞTİR
Mevcut:
Today / Crops / Parcels / Stock / More

Sekme yapısını şimdilik değiştirme.

Emoji ikonları kaldır.
Harici ağ isteği gerektirmeyen, bundle içinde çalışan basit ve aynı stile sahip SVG ikonlar kullan.
İkonlar:
- Today: home/calendar/today benzeri
- Crops: leaf/sprout
- Parcels: map/field
- Stock: box/package
- More: menu/more

Aktif durum:
- yalnız renk değişimi değil,
- ikon + font weight + mümkünse hafif active surface/indicator ile belli olsun.

aria-current davranışını koru.
Screen reader label'larını kontrol et.

3. TÜM ETKİLEŞİMLİ DURUMLARI STANDARDİZE ET
Button/component seviyesinde:
default
pressed
focus-visible
disabled
loading gerekiyorsa
danger
secondary

durumlarını belirgin hale getir.

Normal kullanıcı kontrolleri mevcut yaklaşık 56 px seviyesinden küçülmesin.
Worker kritik kontrolleri mevcut 72 px seviyesinden küçülmesin.

Touch alanlarını görsel güzellik uğruna küçültme.

Focus-visible ekle.
Focus göstergesi kart/buton kenarında açıkça görülmeli.

FAZ B — TODAY EKRANINI KARAR EKRANINA DÖNÜŞTÜR

Mevcut Today ekranındaki veri ve çalışan işlevleri koru.

Yeni bilgi sırası:

A) Başlık
“Bugün” + Demo badge gerekiyorsa.

B) Durum özeti
Elimizde gerçekten hesaplanabilecek verilerle 2–4 küçük status card/chip göster.

Örnek kategoriler:
- yapılacak işler
- bekleyen/senkronlanmamış kayıt
- hasadı bloklu durum
- kritik kayıt uyarısı

AMA:
Elimizde olmayan bir değeri uydurma.
Henüz task/sync backend tamamlanmadıysa göstermeye çalışma.
Her status mevcut gerçek data modelinden türetilmeli.

C) Hızlı işlemler
Gerçek farm için en önemli iki CTA:
“Yeni ilaçlama”
“Yeni hasat”

İkisini de belirgin yap fakat aynı görsel ağırlıkta 10 buton üretme.

D) “Dikkat gerekenler”
Mevcut veriyle gerçekten çıkarılabiliyorsa:
- waiting period bilinmiyor
- label blocked
- unsigned label
- late entry
vb. kritik durumları kısa listede göster.

E) Son hareketler
Mevcut Sprays / Harvests / Cuts içeriklerini aşağı bölümde grupla.
Bugün ekranı ilk açılışta geçmiş kayıt listesi gibi görünmesin.

Mevcut güvenlik anlamlarını değiştirme.

FAZ C — CROPS VE PARCELS KARTLARINI İYİLEŞTİR

Crops ekranında mevcut data modelini değiştirmeden kart hiyerarşisini yeniden düzenle.

Bir crop card'da:
- Crop name ana başlık.
- Latin name daha düşük önem.
- Planting satırında parcel + area ana bilgi.
- sowing date/status/variety/lot ikincil bilgi.
- unsynced durumu varsa açık ama baskın olmayan gösterim.

Planting için mevcut kayıtlardan gerçekten hesaplanabiliyorsa:
son spray / harvest waiting status gibi bilgi göstermek için küçük bir read-only selector/helper yazabilirsin.

AMA:
Yeni tarımsal kural üretme.
PHI/REI hesaplarını mevcut güvenlik fonksiyonlarını kullanmadan yeniden yazma.
Mevcut helper/rules-core varsa onu kullan.

Kartın tamamını tıklanabilir yapmak mevcut routing yapısına büyük değişiklik gerektiriyorsa şimdilik yapma.
Önce görsel hiyerarşiyi düzelt.

Parcels ekranını da aynı görsel dile getir.
Analysis ve Archive gibi secondary action'ları ana içeriği bastırmayacak biçimde yerleştir.

FAZ D — “MORE” EKRANINI DÜZENLE

Mevcut işlevlerin hiçbirini kaybetme.

Şu mevcut öğeleri gruplandır:
- Dil
- Aktif çiftlik
- Demo yükleme/silme
- Backup
- Settings
- Worker view
- Register
- Workers
- Photos
- Info
- Version

Önerilen görsel gruplar:
“Kayıtlar”
“Ekip”
“Veri ve yedek”
“Ayarlar”
“Demo / geliştirme”

Demo yükle/sil kontrolleri normal üretim işlevleriyle aynı görsel ağırlıkta durmasın.
Danger butonu gerçekten destructive görünen durumda kalsın.

Yeni route sistemi kurmak zorunda değilsin.
Mevcut view state yaklaşımını koruyabilirsin.

FAZ E — İLAÇLAMA FORMU UX İYİLEŞTİRMESİ

SprayForm kritik güvenlik kodunu değiştirmeden önce tamamını oku.

Amaç:
Uzun seçim gridini daha hızlı ve anlaşılır hale getirmek.

Tercih edilen akış:

1. “Nereye?”
Plantings seçimi.

2. “Hangi ürün?”
Product seçimi.

3. “Uygulama”
worker/applicator
date/time
dose
dose unit
lot
quantity
water
note
late reason gerekiyorsa

4. “Kontrol”
label durumu
dose karşılaştırması
PHI/REI bilgisi
flags

Tam stepper yapmak kodu gereksiz karmaşıklaştırıyorsa:
tek sayfada section/card yaklaşımı kullan.
Önemli olan progressive disclosure ve görsel sıra.

Planting/product sayısı arttığında yüzlerce büyük segmented button oluşmasını önle.
Mevcut listeler büyüyebiliyorsa:
- arama/filter input
veya
- select/listbox benzeri erişilebilir seçim
değerlendir.

Son kullanılanları üstte göstermek istersen:
yalnız kullanıcı convenience verisi olarak yap;
etiket/doz güvenlik değerlerini otomatik doğru kabul etme.

“Son uygulamayı tekrar et” özelliğini BU TURDA ekleme, mevcut veri ve güvenlik etkisini önce değerlendir ve yalnız öneri olarak raporla.

Label durumu seçimden hemen sonra görünür olsun:
- blocked
- unsigned
- changed
vb.

Renk + ikon + açık metin birlikte kullan.

Form hata mesajlarını ilgili input'a aria-describedby / aria-invalid ile bağla.
İlk hata oluştuğunda kullanıcı hangi alanın sorunlu olduğunu anlayabilsin.

FAZ F — OFFLINE / SYNC DURUM GÖSTERİMİ

Mevcut SyncChip, UnsyncedMark ve outbox kodunu incele.

Henüz gerçek sync tamamlanmamış bir davranışı varmış gibi göstermeyeceksin.

Tek bir tutarlı durum modeli oluştur:

Örnek:
“Bu telefonda”
“Gönderilmeyi bekliyor”
“Çevrimdışı”
“Senkron hatası”

Ancak mevcut backend/sync yeteneğine göre gerçek mesajları seç.

“İnternet gelince gönderilecek” gibi kodun garanti etmediği promise yazma.

Mümkünse:
pending count mevcut local outbox'tan okunabiliyorsa göster.

Bir kayıt gerçekten server'a gitmemişse kullanıcının bunu anlayabilmesi önemli.

FAZ G — ACCESSIBILITY / FIELD-USABILITY PASS

Aşağıdakileri kontrol et:
- focus-visible
- button accessible name
- aria-current
- aria-pressed
- aria-invalid
- role=alert/status doğru kullanım
- kontrast
- renk dışında status göstergesi
- 200% text zoom'da bozulma
- 320–375 px genişlik
- safe-area bottom
- çok uzun Yunanca/Türkçe metin
- Turkish ğ ş İ ı
- Greek strings
- reduced motion varsa gereksiz animasyon olmasın

Worker ekranındaki 72 px kontrolleri koru.

FAZ H — SONRAKİ AŞAMA İÇİN SADECE PLANLA, BU TURDA BÜYÜK FEATURE YAZMA

Aşağıdakileri şu anda kodlama; mevcut mimari ve bağımlılıklarını inceleyerek kısa plan çıkar:

1. Owner “İşler” merkezi
today / overdue / upcoming
worker assignment
field context
done/not done

2. Observation → review → task akışı
photo + field + observation
otomatik hastalık teşhisi YOK

3. Parcel timeline
planting
spray
harvest
observation
analysis
photos
tek kronolojik ekran

4. Map
tile/provider kararı gelmeden production provider seçme.
Temel farm işlerini haritaya bağımlı yapma.

5. Weather
yalnız koşul gösterimi.
İmzasız threshold karar üretmesin.
Ürün/doz önerisi yapma.

6. Social/share
Bu aşamada sosyal feed yapma.
İleride opt-in “hasat/paylaşım kartı” değerlendirilebilir.
Worker adı, GPS, ilaç kaydı, maliyet veya hassas veri otomatik paylaşılmamalı.

TESTLER

Her iterasyondan sonra mümkün olanları çalıştır:
npm run typecheck
npm run test
npm run lint
npm run build
ilgili Playwright/e2e testleri

375px WebKit ekran testini özellikle çalıştır.

Yeni UI için en az:
- bottom navigation
- Today hızlı CTA
- Crops kart render
- More grupları
- spray critical flags
- keyboard/focus gereken temel akış

regresyon kontrolleri ekle.

Mevcut guardrail testlerini atlama veya gevşetme.
Bir test yeni UI yüzünden bozulursa testin neyi koruduğunu anlamadan değiştirme.

RESPONSIVE

Öncelik iPhone/mobile.
Mevcut max-width yaklaşımını koruyabilirsin.

Ancak tablet/desktop'ta:
içerik 640px dar kolonda anlamsız derecede sıkışıyorsa
mevcut bilgi mimarisini bozmadan 2-column card layout gibi progressive enhancement değerlendir.

Mobile first kal.

YAPMAMAN GEREKENLER

- Büyük refactor uğruna çalışan kodu yeniden yazma.
- Yeni framework ekleme.
- Güvenlik kurallarını sadeleştirme.
- Label data uydurma.
- Demo veriyi gerçek veri gibi gösterme.
- Migration/history dosyalarını keyfi düzenleme.
- Production Supabase/Cloudflare değişikliği yapma.
- Sosyal network özelliği yazma.
- Harita provider'ı kafana göre seçme.
- Weather API entegrasyonunu bu UI turuna sıkıştırma.
- Çalışmayan feature için UI promise yazma.
- “safe / ασφαλές” gibi hukuken yanlış güvence veren dil ekleme.

ÇIKTI RAPORU

Çalışma bittiğinde bana TÜRKÇE ve kısa bir rapor ver:

1. Ne değiştirdin?
2. Değişen dosyalar.
3. Kullanıcı açısından fark.
4. Güvenlik davranışında değişiklik oldu mu?
5. Çalıştırılan testler ve sonuçları.
6. Build sonucu.
7. Manuel iPhone kontrol adımları.
8. Bilerek yapmadığın / sonraki iterasyona bıraktığın işler.
9. Karar vermem gereken en fazla 3 konu.

Eğer repo durumu bu prompttaki varsayımlardan farklıysa körü körüne uygulama.
Önce mevcut implementasyonu source of truth kabul et.
Çalışan davranışı koruyarak en küçük güvenli değişiklikleri yap.
```

Bu promptun temel amacı Claude Code’u “uygulamayı baştan tasarla” moduna değil, **mevcut güçlü güvenlik/local-first temelini koruyarak önce görünür UX borcunu azalt, sonra daha büyük ürün işlerini planla** moduna sokmaktır. Rakip araştırması da bu yönü destekliyor: başarılı saha uygulamaları offline erişim, hızlı kayıt, görev bağlamı, harita/alan geçmişi ve açık durum göstergelerini öne çıkarıyor; ALONI’nin farklılaşması ise bunları küçük çiftçi için daha az karmaşık ve daha güvenilir hale getirmek olmalı. citeturn118337search1turn118337search4turn118337search7