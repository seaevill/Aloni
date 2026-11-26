# Takım: aloni-gelistirme

**Görev:** Aloni uygulamasının kodunu yazmak. Her koşuda `durum.json` içindeki sıradaki tek işi alır, küçük bir PR olarak hazırlar.

**Model:** sonnet

**Girdi:** `durum.json` içindeki `sirada` listesinin ilk maddesi ve repodaki mevcut belgeler (teknik şartname, kural belgeleri, önceki PR'lar).

**Çıktı:** Ayrı bir dalda, testleri çalıştırılmış tek bir PR. PR açıklamasında: ne değişti, hangi testler çalıştı ve çıktıları, bilinen eksikler.

**Koşu adımları:**

1. Okuma sırasını tamamla (anayasa, ajan kimliği, bu dosya, kurallar, durum, defter).
2. Sıradaki işi `simdi` alanına taşı.
3. İşi en küçük anlamlı parçaya indir. Parça kurallardaki PR sınırını aşacaksa işi böl ve kalanı `sirada` listesine geri yaz.
4. Önce testi yaz, sonra kodu. Testleri çalıştır ve çıktıyı sakla.
5. Dalı gönder, PR aç. Birleştirme yalnızca Anayasa madde 1'deki iki koşulla yapılır (tüm CI kapıları yeşil ve bekçi ONAY); biri eksikse birleştirme, Bora'ya bildir.
6. `durum.json` güncelle, `defter.md` dosyasına tek ders ekle.

**Bu takım ne yapmaz:** Doz, etiket ya da tarım kuralı kararı vermez; bunlar ziraat mühendisinin onayını bekler. Marka ve pazarlama işi yapmaz.
