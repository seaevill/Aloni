# data.json – haftanın hikâyesi ve tutarlılık kontrolü (ÖRNEK VERİ)

## Hikâye (Pzt 16 Kas 2026)
- **12–13 Kas:** cephe geçti, ovaya 24 mm yağmur yağdı, ardından kuzeyden soğuk hava geldi.
- **14–19 Kas:** açık ve durgun geceler. Yapraklar her gece 11–15 saat ıslak (tahmin, sensör yok). Soğuk hava ovada toplanıyor: Çar→Per gecesi 0,0–0,5 °C. Γεράνεια inversiyonun üstünde 4,0 °C, Pachi 5,0 °C.
- **20–22 Kas:** yeni cephe, 27,5 mm yağmur, 55–70 km/s hamle.
- **Sonuç:** Pachi ıspanağına Çarşamba tek koruyucu ilaçlama. Hasattaki Κάτω Κάμπος ıspanağı ilaçlanmıyor, kontrol ediliyor. Kişniş ve dereotu örtülecek. Γεράνεια maydanozu PHI içinde. Ispanak açığı için Νότιος Κάμπος'a ekim.

## Doğrulanan kurallar (script ile, hata: 0)
- [x] id referansları geçerli; ekim alanları parsel alanını aşmıyor.
- [x] Her ilaçlama ruhsatlı, etiket dozunda, yağmursuz günde, hamle <20 km/s; iş anı havası günlük aralıkta.
- [x] Hiçbir hasat PHI içinde değil. Bugün güvenli: 8 ekim; PHI içinde: PL12 (23 Kas'a kadar).
- [x] R01: ekim hasatta değil; PHI 2 Ara'da, hasat 3 Ara'da başlıyor; FRAC 28→40; stok 0,10 ≥ 0,09 L; ürün süresi geçmemiş; yaprak kuru, hamle 14 km/s, 48 saat yağmur yok; komşu ürünlere tampon sıra.
- [x] Ekim önerisi mildiyö uyarılı Pachi'ye ya da aynı familyanın bulunduğu parsele değil.
- [x] Don uyarısı yalnızca 2 m'de ≤2 °C olan alçak parsellerde; Γεράνεια ve Pachi hariç.
- [x] Azot nitrat formunda, gübreleme ile, cepheden sonra; hasada <21 gün kalan yapraklılara N yok (geçmiş işler dahil).
- [x] Süresi geçen (asetamiprid) ve 30 günden az kalan (spinosad) ürünler uyarıda.
- [x] Her uyarı/önerinin "Neden?" alanı tam: kural, girdiler, kaynak, güven.
- [x] 4 haftalık pencerede yapısal açık yalnızca ıspanakta; pırasanın siparişi yok (hasat Ocak).
- Not: R04'te `planting_id` null, `parcel_id` eklendi (yeni ekim).
