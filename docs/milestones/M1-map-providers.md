# Uydu haritası sağlayıcıları – karşılaştırma (2026-11-17)

**Karar gerekmiyor.** M1'de "nokta + dönüm yaz" yolu yeterli (M1.md karar 11). Bu belge, harita PR'ı (PR 9) ve ileride internetsiz harita için hangi sağlayıcıyla konuşmamız gerektiğini gösterir.
Güven düzeyi: **✔ kaynakta gördüm** · **~ ikincil kaynak / eski** · **? doğrulanmadı**. Aşağıdaki hiçbir lisans yorumu hukuki görüş değildir; kullanmadan önce sağlayıcının güncel şartları ve gerekirse yazılı izin şart.

## Kısa sonuç (Türkçe)
1. **Asıl engel "internetsiz önbellek".** Tarlada internet zayıf; harita karolarını telefona indirip saklamamız gerekir. Aşağıdaki ticari sağlayıcıların hiçbiri, ücretsiz pakette ve bir PWA için bunu **açıkça** izin vermiyor.
2. **MapTiler**: ücretsiz paket yalnızca ticari olmayan/geliştirme kullanımı ve sadece "geçici kişisel önbellek"; internetsiz kullanım için ücretli plan ya da yazılı anlaşma gerekir.
3. **Esri World Imagery**: internetsiz kullanım yalnızca Esri yazılımı + "Content Package" ile; başka türlü önbelleğe alma yasak. **Elenir.**
4. **Mapbox Satellite**: cihazda geçici önbellek SDK ile mümkün, ama dağıtım/paketleme yasak; kotayı aşınca ücretli; PWA/web için internetsiz önbellek izni belirsiz.
5. **Sentinel-2 (EOX)**: ücretsiz ama yalnızca ticari olmayan kullanım (CC BY-NC-SA); çözünürlük yaklaşık 10 m, yani 1 dönümlük (≈32×32 m) parsel ≈ 3×3 piksel. **Sınır çizmeye yetmez**, sadece genel görünüm.
6. **Ktimatologio (Κτηματολόγιο)**: Yunan devlet kurumu, AB'de; ortofoto ve INSPIRE/açık veri servisleri var gibi görünüyor, ama **kullanım şartlarını ve servis adreslerini doğrulayamadım**. Bu yüzden onlara yazılı soru gönderelim (taslak aşağıda).
7. **Öneri:** Ktimatologio'ya e-postayı siz gönderin (taslak hazır). Cevaba göre karar verelim. Cevap gelene kadar harita yalnızca geliştirme amaçlı OSM ile çalışır ve sizin testinizde yer almaz.

## Karşılaştırma

| Sağlayıcı | İnternetsiz önbellek izni | Ücretsiz kota / ticari kullanım | Megara görüntüsü (tarih, kalite) | AB'de barındırma | Atıf | Format |
|---|---|---|---|---|---|---|
| **OSM raster** (yalnızca geliştirme) | ✗ OSM karo politikası toplu indirme/ağır kullanıma karşı (**?** aklımdan, doğrulanmadı) | Ücretsiz, ama uygulama için uygun değil | Uydu değil (yol haritası) | – | © OpenStreetMap zorunlu | XYZ 3857 |
| **MapTiler Cloud** | ✗ Ücretsizde yalnızca "geçici kişisel önbellek", toplu indirme yok; internetsiz için ücretli plan/yazılı anlaşma (~ [şartlar](https://www.maptiler.com/cloud/terms/)) | Ücretsiz = ticari olmayan + geliştirme/PoC (✔ [fiyat sayfası](https://www.maptiler.com/cloud/pricing/)); aylık ~100 bin istek (~ ikincil kaynak). Ücretli giriş planı ~25–30 $/ay (~ kaynaklar çelişiyor) | **?** Ücretsiz planda uydu olup olmadığı doğrulanmadı; sunucu sayfasında "Satellite Low-Res (2016)" geçiyor (~) | **?** Resmi teyit bulamadım (GDPR "evet" diyen üçüncü taraf yorum ~) | Gerekli (**?** tam metin doğrulanmadı) | XYZ/vektör 3857 |
| **Esri World Imagery** | ✗ Yalnızca Esri "Content Package" + Esri yazılımı; başka önbellek/indirme yasak (✔ [Esri şart özeti](https://downloads2.esri.com/arcgisonline/docs/tou_summary.pdf)). Çelişkili iddia: [OSM wiki](https://wiki.openstreetmap.org/wiki/Esri) "CC BY" diyor, Esri'nin kendi şartlarıyla çelişiyor → güvenme | ArcGIS aboneliği gerekir (~) | **?** | **?** | Zorunlu ("Source: Esri, Maxar, Earthstar Geographics…") | XYZ 3857 |
| **Mapbox Satellite** | ~ Cihazda geçici önbellek SDK ile mümkün; dağıtım/paketleme yasak; görüntüler "yalnızca Mapbox hizmetleri içinde" (✔ [Mapbox offline](https://docs.mapbox.com/ios/maps/guides/offline/concepts/)). **Web/PWA için izin belirsiz** | Kullandıkça öde, ücretsiz kota var; ikincil kaynak ~750 bin raster karo/ay (**?** resmi fiyat sayfasından teyit edilmedi, [fiyat](https://docs.mapbox.com/accounts/guides/pricing/)) | **?** | **?** | Zorunlu | XYZ 3857 |
| **Google / Bing uydu** | ✗ Önbellek/ön yükleme şartları genelde yasaklar (**?** aklımdan, aranmadı) | – | – | – | – | **Elenir** |
| **EOX Sentinel-2 cloudless** | İzin lisansa bağlı: ticari olmayan CC BY-NC-SA 4.0; **ticari için EOX lisansı gerekli** (✔ [EOX](https://cloudless.eox.at/documentation/license)) | Ücretsiz yalnızca ticari olmayan | ~10 m (**?** aramada doğrulanmadı); yıllık mozaik (2024 sürümü var, ✔ [EOX](https://eox.at/2025/03/sentinel-2-cloudless-2024/)) – parsel sınırı çizmeye **yetmez** | Avusturya şirketi (AB) | Zorunlu ("Contains modified Copernicus Sentinel data [yıl]") | XYZ/WMTS 3857 |
| **Ktimatologio (Κτηματολόγιο)** | **?** Şartlar yayımlanmamış/bulunamadı | **?** Açık veri portalı var ([data.ktimatologio.gr](https://data.ktimatologio.gr/)); INSPIRE geoportal WMS/WFS sunuyor (~ [2022 sunumu](https://eurogeographics.org/app/uploads/2022/06/5_GR-_Crowdsourced-and-open-data-in-the-Hellenic-cadastre-.pdf)). Eski WMS adresi yalnızca 2011 tarihli bir kaynakta (~ [blog](https://michaeltopo.blogspot.com/2011/10/wms-servers-and-autocad-map-greek.html)); canlı olduğunu doğrulayamadım | **?** Ortofoto tarihi/çözünürlüğü doğrulanmadı | ✔ Yunan kamu kurumu (AB) | **?** | **?** WMS çoğunlukla EPSG:2100; 3857 desteği doğrulanmadı |

**Megara görüntü tarihi ve kalitesi** için hiçbir kaynakta doğrulanabilir bilgi bulamadım. Kontrol yöntemi: her sağlayıcının önizleme/görüntüleyicisinde Megara'yı (yaklaşık 37,99 K / 23,36 D, prototipteki parsel konumları) açıp görüntünün tarihini ve netliğini bakmak. İsterseniz bunu sonra birlikte yaparız.

## Karar ölçütleri (öneri)
1. Yazılı olarak internetsiz önbelleğe izin veriyor mu? (en önemlisi)
2. Ücretsiz kota veya ücret, tek çiftlik + 5–10 komşu için makul mü?
3. Ticari kullanıma izin var mı (ileride komşulara sunulacak)?
4. Parsel sınırı çizmeye yetecek çözünürlük (≲ 0,5 m) ve yeni tarih?
5. AB'de barındırma ve atıf gereksinimi.

## Ktimatologio'ya e-posta taslağı (Yunanca)
> Alıcı: *[Ktimatologio'nun resmi iletişim/INSPIRE destek adresi – gönderirken sitesinden teyit edilmeli; ben adres uydurmadım]*

**Θέμα:** Ερώτημα για τους όρους χρήσης των υπηρεσιών ορθοφωτοχαρτών (WMS/WMTS)

Αγαπητοί κύριοι/κυρίες,

Είμαι παραγωγός λαχανικών και αρωματικών στην πεδιάδα των Μεγάρων και αναπτύσσω μια εφαρμογή για κινητό (PWA) που θα με βοηθά να καταγράφω τα χωράφια μου. Θα ήθελα να χρησιμοποιήσω ορθοφωτογραφίες του Κτηματολογίου ως υπόβαθρο για την περιγραφή των ορίων των αγροτεμαχίων. Θα σας ήμουν υπόχρεος για τις παρακάτω πληροφορίες:

1. Παρέχεται δημόσια υπηρεσία WMS/WMTS ορθοφωτοχαρτών (π.χ. μέσω INSPIRE ή του portal ανοικτών δεδομένων); Ποια είναι η διεύθυνση (URL), τα επίπεδα (layers) και τα συστήματα συντεταγμένων που υποστηρίζονται (π.χ. EPSG:3857 ή μόνο EPSG:2100);
2. Ποιοι είναι οι όροι χρήσης/άδεια (π.χ. CC BY) και ποια ακριβώς αναφορά πηγής απαιτείται;
3. Επιτρέπεται η προσωρινή αποθήκευση (cache) των πλακιδίων για περιορισμένη περιοχή (τα χωράφια μου) στη συσκευή μου, ώστε να λειτουργεί η εφαρμογή χωρίς σύνδεση στο διαδίκτυο;
4. Επιτρέπεται η χρήση σε εφαρμογή που αρχικά είναι για προσωπική χρήση και αργότερα ενδέχεται να διατεθεί σε λίγους γειτονικούς παραγωγούς (εμπορική/επαγγελματική χρήση);
5. Ποια είναι η ημερομηνία και η χωρική ανάλυση των ορθοφωτογραφιών για την περιοχή των Μεγάρων και υπάρχουν όρια χρήσης (π.χ. αιτήματα ανά δευτερόλεπτο);

Αν χρειάζεται κάποια επίσημη αίτηση ή έντυπο, παρακαλώ να με ενημερώσετε.

Με εκτίμηση,
*[Ονοματεπώνυμο]*
*[Τηλέφωνο / email επικοινωνίας]*

> Not: Parantezli yerleri siz doldurun. E-posta adresinizi ve telefonunuzu ben yazmadım.
