# FieldWise Faz 1: Maliyet ve Uyum (2026-11-17)

Kaynaklar her satırda verildi. **[DOĞRULANAMADI]** = resmi kaynakta teyit edemedim. **[3. taraf]** = resmi sayfa açılmadı, güncel bir ikincil kaynak kullanıldı. Bu belge hukuki danışmanlık değildir.

## 1. Maliyetler

### 1a. Kalem kalem

| Kalem | Ücretsiz seçenek ve limitler | Ücretli seçenek | Kaynak |
|---|---|---|---|
| **Backend: Supabase** | Free: 0 $, 2 proje, 500 MB DB, 50k MAU, 1 GB dosya, 5 GB egress. **7 gün işlem olmazsa proje durur**, elle yeniden açılır. | Pro: 25 $/ay/organizasyon, 8 GB DB, 100k MAU, 100 GB dosya, 10 $ compute kredisi | [jetadmin, Tem 2026 itibarıyla doğrulanmış] **[3. taraf]** https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/ |
| Supabase AB bölgesi | AB içi bölgeler: İrlanda `eu-west-1`, Paris `eu-west-3`, Frankfurt `eu-central-1`, Stockholm `eu-north-1`. Genel "Central EU" seçeneği Londra/Zürih'e de gidebilir, **belirli bir bölge seçin**. | n/a | https://supabase.com/docs/guides/platform/regions |
| **Statik hosting: Cloudflare Pages** | Sınırsız istek ve bant genişliği, 500 build/ay, ticari kullanım serbest | n/a | https://flaviocopes.com/hosting-free-tiers/ (Eyl 2026) **[3. taraf]** |
| Netlify | Free: 300 kredi/ay, katı tavan. Her deploy 15 kredi, 1 GB trafik 20 kredi. | Personal 9 $, Pro 20 $ | aynı |
| Vercel | Hobby **yalnızca ticari olmayan kişisel kullanım** içindir, satış aşamasında uygun değil | Pro 20 $/ay | aynı |
| **Hava: Open-Meteo** | Ücretsiz katman **yalnızca ticari olmayan kullanım** içindir: 10.000 çağrı/gün, 300k/ay, CC BY 4.0 atıf zorunlu, uptime garantisi yok | Standard 1M çağrı/ay, Professional 5M/ay (ticari). **Fiyatlar resmi sayfada görünmüyor.** Resmi blog (2023): Standard 29 $, Professional 99 $. Bir 3. taraf site 4,99 € gösteriyor, çelişkili. **[GÜNCEL FİYAT DOĞRULANAMADI]** | https://open-meteo.com/en/pricing · https://openmeteo.substack.com/p/api-subscriptions-for-commercial · https://apispine.com/open-meteo/pricing |
| Alternatif: OpenWeather One Call 3.0 | İlk 1.000 çağrı/gün ücretsiz, kart bilgisi gerekir. Ücretsiz lisans "genelde ticari olmayan" kullanım içindir, ticari türev ürünler için Professional ve üstü planlar gerekir. | Çağrı başı fiyat **[DOĞRULANAMADI]** | https://old.openweathermap.org/price |
| **Harita: OSM tile'ları** | Ücretsiz ama yoğun kullanan uygulamalardan kendi sunucusunu kurması istenir. Toplu/çevrimdışı indirme yasak, tanımlayıcı User-Agent zorunlu. Uygulama mağazası aşamasında kullanılmamalı. | n/a | https://wiki.openstreetmap.org/wiki/Blocked_tiles |
| MapTiler Cloud | Free: 5k oturum/ay, 100k istek. "Test, PoC, kişisel veya ticari olmayan" kullanım için. Kota dolunca servis ay sonuna kadar durur. Uydu stili var. | Flex 30 $/ay | https://www.maptiler.com/cloud/pricing/ |
| Mapbox | Kullandıkça öde. Ücretsiz katmanlar: 50.000 web map load/ay, mobil SDK 25k MAU, raster tile 750k istek/ay | Ücretsiz katmanın üstünde 5 $ / 1.000 load | https://www.mapbox.com/pricing/ |
| Uydu görüntüsü (parsel çizimi için) | MapTiler "Satellite" stili veya Mapbox raster tile'ları (750k ücretsiz). Hangi planın uyduyu kapsadığı **[DOĞRULANAMADI]**. | n/a | yukarıdaki iki sayfa |
| **Push: Web Push** | Ücretsiz (VAPID). iOS'ta **iOS 16.4+ gerekir ve uygulama Ana Ekrana eklenmiş olmalı**. İzin isteği bir tıklamayla tetiklenmeli. AB'de PWA desteği korundu. Android'e göre daha az kararlı. | n/a | https://webscraft.org/blog/pwa-pushspovischennya-na-ios-u-2026-scho-realno-pratsyuye?lang=en **[3. taraf]** |
| **Alan adı .gr** | n/a | Papaki: ilk yıl ≈3,8 €, yenileme ≈15 €/yıl (USD'den çevrildi) | https://domainoffer.net/tld/gr/papaki |
| **Apple Developer Program** | n/a | 99 $/yıl (veya yerel para karşılığı) | https://developer.apple.com/programs/whats-included/ |
| **Google Play** | n/a | Tek seferlik 25 $. 13.11.2023'ten sonra açılan **kişisel** hesaplarda 12 test kullanıcısı 14 gün boyunca kesintisiz kapalı testte olmalı. Kuruluş hesabı D-U-N-S ister (ücretsiz, 30 güne kadar sürebilir). | https://newly.app/how-to/google-play-twelve-testers-rule **[3. taraf]** |
| Capacitor (isteğe bağlı) | Açık kaynak çerçeve. Native push için yine de Apple/Google hesapları gerekir. Lisans/ücret **[resmi kaynaktan doğrulanmadı]**. | n/a | https://capacitorjs.com/docs/v2/apis/push-notifications |

### 1b. Aşamalara göre tahmini toplam

| | **Faz 1 (Bora, ~5 kullanıcı)** | **Pilot (10 çiftlik)** | **Ticari (~100 çiftlik)** |
|---|---|---|---|
| Backend | Supabase Free, **ÜCRETSİZ** (7 günlük durdurma riski düşük, günlük kullanım var) | Free yeterli olabilir. Güvenilirlik için Pro önerilir: 25 $/ay | Pro 25 $/ay + olası compute ek ücreti |
| Hosting | Cloudflare Pages, **ÜCRETSİZ** | **ÜCRETSİZ** | **ÜCRETSİZ** |
| Hava | Open-Meteo free. Bora'nın kendi ticari çiftliği için kullanım "ticari olmayan" sayılır mı belirsiz, **gri alan**. | Ücretli pilotta ticari plan gerekir (≈29 $/ay, 2023 fiyatı) | Ticari plan gerekir. Örn. 100 çiftlik × 5 parsel × saatlik yenileme ≈ 360k çağrı/ay, bu da ücretsiz limiti zaten aşar. |
| Harita | OSM (hafif kullanım) veya Mapbox free, **ÜCRETSİZ** | Mapbox free (50k load), **ÜCRETSİZ** | Mapbox free büyük olasılıkla yeterli, ya da MapTiler Flex 30 $/ay |
| Push | Web Push, **ÜCRETSİZ** | **ÜCRETSİZ** | Web Push ücretsiz. Native için mağaza hesapları gerekir. |
| Alan adı | isteğe bağlı ≈15 €/yıl | ≈15 €/yıl | ≈15 €/yıl |
| Mağazalar | gerekmez (PWA) | gerekmez (PWA) | Apple 99 $/yıl + Google 25 $ tek sefer |
| **Toplam** | **≈0 €** (alan adıyla ≈15 €/yıl) | **≈0–55 $/ay** | **≈55–85 $/ay + ≈100 $/yıl + 25 $ bir kez** |

## 2. Uyum

### 2a. AB elektronik ilaçlama kaydı: Uyg. Yön. (AB) 2023/564
- **Tarih:** 1 Ocak 2026'dan itibaren uygulanıyor. Kayıtlar makine tarafından okunabilir elektronik formatta tutulmalı. Kayıt "gecikmeksizin" girilir. Kâğıtta başlayan kayıt **30 gün içinde** elektronik ortama aktarılır (üye devlet daha kısa süre koyabilir; 2030'a kadar daha uzun süreye izin verebilir, ancak tüm kayıtlar ertesi yılın 31 Ocak'ına kadar elektronik olmalıdır). https://eur-lex.europa.eu/eli/reg_impl/2023/564/oj
- **Erteleme seçeneği:** (AB) 2025/2203, 23.11.2025'te yürürlüğe girdi. Üye devletler **1 Ocak 2027'den önceki** kullanımlar için elektronik aktarımı zorunlu tutmayabilir. Pratikte en geç **1 Ocak 2027'den itibaren** elektronik kayıt şart. https://eur-lex.europa.eu/eli/reg_impl/2025/2203/oj/eng
- **Zorunlu alanlar (Ek):** kullanım türü (alan / kapalı alan / tohum), ürün adı ve **ruhsat numarası**, tarih (gerekirse başlangıç saati), doz (ha başına vb.), konum (**IACS/ΟΣΔΕ parsel kimliği** veya devletin belirlediği yöntem), işlenen alan (ha), ürün/bitki (**EPPO kodu**, gerekirse **BBCH** evresi; tohumda parti no). Kaynak: yukarıdaki EUR-Lex 2023/564.
- **Saklama:** profesyonel kullanıcılar kayıtları **en az 3 yıl** tutar ve yetkiliye ibraz eder (Yön. 1107/2009 m.67). https://www.legislation.gov.uk/eur/2009/1107/article/67/data.htm (İngiltere'nin aktardığı metin, ancak bu madde aynı)
- **Yunanistan'ın uygulaması:** Yunanistan'ın 2027 öncesi muafiyeti kullanıp kullanmadığı, bir devlet platformu ya da ΥΠΑΑΤ kararı olup olmadığı **[DOĞRULANAMADI]**. 10.11.2025 tarihli bir haber yalnızca AB seçeneğini aktarıyor (paywall): https://www.oenet.gr/online/dnet/item/130308-proairetiki-i-tirisi-arxeion-se-ilektroniki-morfi-prin-apo-tin-proti-ianouariou-2027. Bilinen tek ilgili e-hizmet, profesyonel kullanıcı/uygulayıcı beyanı ("Χρήση Φυτοπροστατευτικών Προϊόντων"). Bu bir uygulama defteri değil: https://www.minagric.gr/component/content/article/5392-e-services-minagric-usage-of-pesticides
- **ΟΠΕΚΕΠΕ artık yok:** ΑΑΔΕ'ye katıldı. ΟΣΔΕ 2026 başvuruları myAGRO (myAADE) üzerinden yapılıyor (4.8.2026). Parsel kimliği bu sistemden gelir. https://www.skai.gr/index%2Ephp/news/finance/osde-2026-meso-myagro-i-eniaia-aitisi-enisxysis

**Uygulamaya etkisi:** ilaçlama kaydı yukarıdaki alanların tamamını içermeli: ruhsat no, EPPO, BBCH, ΟΣΔΕ parsel kimliği, ha ve στρέμμα. Dışa aktarım CSV/JSON (makine-okur) ve PDF (denetim) olarak sunulmalı. Kayıtlar 3 yıldan önce silinememeli.

### 2b. Yunanistan: ziraat mühendisi reçetesi (συνταγή)
- Profesyonel kullanım ürünleri **18.9.2017'den beri yalnızca reçeteyle** ve yalnızca ορθολογική χρήση sertifikası sahiplerine satılıyor. Dayanak: ΥΑ 9497/104760/2014 ve ν. 4036/2012 m.35. Reçete **etken maddeye** göre yazılır, alan **στρέμμα** cinsindendir, **1 ay** geçerlidir. Çiftçi denetimde reçeteyi göstermelidir. Etikete aykırı öneriden reçeteyi yazan sorumludur. Satıcı satışları 1.1.2014'ten beri elektronik kaydediyor (ΑΦΜ ile). https://www.minagric.gr/images/stories/docs/agrotis/Georgika_Farmaka/elenxoi/FAQPrescription_051017.pdf
- 2026 tarihli bölge bülteni aynı kuralları teyit ediyor: https://www.pamth.gov.gr/wp-content/uploads/2026/03/ΕΝΗΜΕΡΩΤΙΚΟ-ΔΕΛΤΙΟ-ΠΑΡΑΝΟΜΑ-ΓΦ-2026.pdf
- **Uygulamaya etkisi:** ilaçlama kaydına reçete fotoğrafı/numarası eklenebilmeli. FieldWise "öneri" verir, **reçetenin yerini tutmaz**.

### 2c. GDPR (işçi ve müşteri verileri)
- Supabase'te **belirli bir AB bölgesi** seçin. Supabase bir DPA sunuyor (supabase.com/legal/dpa). Bölge seçimi tek başına uyum sağlamaz, onay akışları ve erişim kontrolü sizin sorumluluğunuzda. https://supabase.com/docs/guides/security/gdpr-compliance
- Bora (ve pilotta her çiftlik) **veri sorumlusu**dur. Pilot/ticari aşamada FieldWise işletmecisi **veri işleyen** olur, bu yüzden her çiftlikle DPA imzalanmalı. Gerekenler: gizlilik politikası (EL/TR/EN), veri minimizasyonu (işçide ad + rol yeterli), rol bazlı erişim (RLS), silme/ihracat işlevi. *(Genel GDPR ilkeleri. Yunan otoritesine özgü bir gereklilik araştırılmadı.)*

### 2d. Tarımsal tavsiye sorumluluğu
- Reçete veren mühendisin etikete aykırı öneriden sorumlu olduğu yukarıdaki SSS'de yazıyor. Buna göre uygulamaya şu uyarı konmalı: "Bilgilendirme amaçlıdır. Bitki koruma ürünü kullanımı için ziraat mühendisi reçetesi ve ürün etiketi esastır." Kurallar **etiket dışı doz/ürün önermemeli**. Yunan hukukunda yazılım sorumluluğuna dair özel bir kaynak **[DOĞRULANAMADI]**. Ticari aşamadan önce avukata danışılmalı.

### 2e. Mağaza gereksinimleri
- **Apple 5.1.1(v):** hesap oluşturan uygulama, hesabı ve kişisel verileri **uygulama içinden** silmeyi sunmalı. Yasal saklama gereken veriler (3 yıllık ilaçlama kaydı gibi) kullanıcıya açıklanmalı. https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion
- **Google Play:** uygulama içi silme yolu + **uygulama silinmiş olsa da çalışan bir web silme sayfası** + Data safety formu. https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-AU
- Her iki mağazada da gizlilik politikası URL'si gerekir.

## 3. İlaç ruhsat verisine erişim
- **Yunanistan:** ΥΠΑΑΤ'ın "Κατάλογος Φυτοπροστατευτικών Προϊόντων" sayfası (https://1click.minagric.gr/oneClickUI/frmFytoPro.zul) yalnızca arama arayüzü olarak listeleniyor. **Açık veri seti, toplu indirme veya API bulunamadı [DOĞRULANAMADI]**. Kaynak: https://mitos.gov.gr/index.php/ΔΔ:Μητρώο_φυτοπροστατευτικών_προϊόντων. Etiket/onay PDF'leri tek tek indirilebiliyor (örn. https://1click.minagric.gr/oneClickUI/oneClickFiles/SALIBRO-SC-3081.pdf). Ticari Agrostis/ifarma bu veritabanından "günlük güncellendiğini" söylüyor, yöntemi bilinmiyor. https://profi.gr/wp-content/uploads/2026/08/27-30_AgrotikaApps1_1085.pdf
- **Öneri:** Faz 1'de Bora'nın kullandığı ~20–40 ürünü elle girin (ad, ruhsat no, etken madde, doz, PHI). ΥΠΑΑΤ'a resmi olarak veri dosyası talebi gönderin.
- **AB Pesticides Database:** etken maddeler/MRL için indirme ve "makineden makineye API" sunuyor (veri seti data.europa.eu'da). Yunan ürün ruhsatlarını içermez. https://food.ec.europa.eu/plants/pesticides/eu-pesticides-database_en
- EPPO kod listesi gerekecek. Erişim koşulları **[DOĞRULANAMADI]**.

## 4. Bora için "önce bunu yap" listesi
1. **Hesap sahipliği:** Bora adına (kendi e-postası, 2FA) Supabase + Cloudflare hesapları açılsın, Claude/serbest çalışan yalnızca davetli üye olsun.
2. Supabase projesini **Frankfurt (`eu-central-1`)** gibi belirli bir AB bölgesinde oluşturun, DPA'yı indirip saklayın.
3. ΑΑΔΕ myAGRO'dan parsellerinin **ΟΣΔΕ kimliklerini** ve hektar bilgilerini çıkarsın (ilaçlama kaydında zorunlu).
4. Kullandığı ilaçların listesini, **ruhsat numaralarını** ve son reçeteleri fotoğraflasın (ürün tablosunun tohumu).
5. Ziraat mühendisine sorsun: Yunanistan'da 2026 için elektronik kayıt muafiyeti var mı, bir devlet platformu bekleniyor mu, kontrolde hangi formatı istiyorlar?
6. Faz 1'i **ücretsiz katmanlarda PWA** olarak çalıştırsın. Mağaza hesaplarını (Apple 99 $/yıl, Google 25 $) pilot ticari hale gelene kadar açmasın. Google'ın 12 test kullanıcısı / 14 gün kuralını takvime koysun.
7. Pilottan önce: gizlilik politikası, "tavsiye ≠ reçete" uyarısı, hesap silme ekranı, çiftliklerle DPA ve Open-Meteo ticari plan.
