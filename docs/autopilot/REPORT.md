# ALONI — Bora için 5 satır (2026-11-26 akşam vardiyası, 20:30)
1. **Birleşenler (main yeşil, sha 76a522e4):** Demo sezonu eksiksiz (7 parsel, ekim/hasat/ilaçlama/stok, müşteri-sipariş-işçi-pano-notlar, Ταμείο, 10 fotoğraf kaynak satırlı), bütünlük testleri (a–g), gezinti testi (5 dil/genişlik + klasik Demo; axe + «NaN/undefined» koruması), Ταμείο'da «Ακυρωμένες εγγραφές» listesi, işçi kartı erişilebilirlik düzeltmesi, iki gerçek Demo hatası düzeltildi.
2. **Telefonda önce bak:** Άλλα → **Επίδειξη: πλήρης σεζόν (90 ημέρες)** → `docs/milestones/DEMO-SEASON-TEST.md` içindeki 20 Yunanca adımı sırayla yap (en önemlisi 5–9, 13–14, 17). Sonra «Διαγραφή επίδειξης» ile temizle.
3. **Engelli / ertelenen:** madde 30 (gerçek ilaç etiketleri) ertelendi — resmî site bu ortamdan açılmıyor; sezon ÖRNEK ürünlerle (resmî etiket değil). Şirket iskeleti #583 açık, birleştirilmedi; `labeluse:118` aralıklı hata «monitor» (yeni kanıt QUEUE satır 2).
4. **Senden bekleyen kararlar:** (a) #583 şirket iskeleti: «sağ kol» düzeni birleşirse sonraki oturumlar kod yazmaz, `/kos` ile iş dağıtır — birleştirmek ister misin? (b) 0042'yi (#500) ne zaman yüklüyorsun; «yükleme tamam» deyince sözleşme + 0042 onay düğmesi PR'ı hazır. (c) Gerçek etiket PDF'leri gelecek mi, yoksa Demo örnek ürünlerle mi kalsın?
5. **Dürüstlük notu:** hiçbir şey «canlıda doğrulandı» değil; Cloudflare önizleme adresleri PR yorumlarında (bu ortamdan açılmadı). Ortamda iki altyapı arızası görüldü ve tek seferlik yeniden tetikle geçti: Cloudflare derlemesi aynı saniyede düştü (log yok), bir PR çakışınca GitHub CI başlatmadı (artık araç bunu söylüyor).

# ALONI — AUTOPILOT RAPORU (Türkçe, Bora için)

**Adresler (Cloudflare hesabından Bora'nın doğrulaması):** hesap alt alanı `ormanbora`; Worker `aloni`; canlı adres https://aloni.ormanbora.workers.dev ; Worker önizleme özelliği açık.
**PR önizleme adresi — GÜNCELLEME 2026-11-25:** Cloudflare botunun PR yorumunda gerçek adres yazıyor: `### Preview URL: https://<dal-adı>-aloni.ormanbora.workers.dev (commit …)` (örn. #563: https://claude-sync-planting-boundary-aloni.ormanbora.workers.dev). Adresi YALNIZCA bu yorumdan al; bu ortamdan açıp doğrulayamıyoruz (vekil engelliyor). Eski not: **PR önizleme adresleri — durum:** bu ortamdan `workers.dev` adreslerine erişilemiyor (çıkış vekili reddediyor) ve Cloudflare API/CLI anahtarı yok; bu yüzden herhangi bir PR önizleme adresini **doğrulayamadım**. Her PR'ın «Workers Builds: aloni» kontrolü (başarılı/başarısız) ve panel bağlantısı (`details_url`, biçim: `https://dash.cloudflare.com/<hesap>/workers/services/view/aloni/production/previews/<dal-adı>/builds/<derleme-no>`) rapora yazılır. **Tahmini** önizleme adresi biçimi (Cloudflare'in belgelenmiş dal-takma-adı kuralı, DOĞRULANMADI): `https://<dal-adı-küçük-harf-tire>-aloni.ormanbora.workers.dev`. Ana adres önizleme DEĞİL, canlıdır. Doğru önizleme adresini görmek için Bora bir PR'ın panel bağlantısını açıp «Preview URL»ü bir kez bu satıra yapıştırırsa biçim doğrulanmış olur.

Her koşu bu başlığın altına yeni bir bölüm ekler. Durum sözleri: **uygulandı · test edildi · birleşti · derlendi (Cloudflare) · canlıda doğrulandı** — «birleşti» «canlıda» demek değildir. Uydurma ilerleme yazılmaz.

## 2026-11-28 10:19 Atina — yönetici koşusu 20261128-0818
1. **Uygulamada ne değişti:** Hiçbir şey. Önceki koşudan beri yeni onaylı iş ya da senden yeni cevap gelmedi.
2. **Senin için faydası:** Onaysız iş yapılmadı; ana dal sağlam kaldı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt c5b7c27) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Son 24 saatte ana dalda 44 koşu var, hepsi ilk denemede başarılı; bu yüzden ara sıra düşen testleri izleme işi (q-2) alınmadı. **Bir aksilik:** bu kaydın kendi PR'ında (yalnızca belge değişti) ekran testlerinden biri bir kez düştü — «hasat» testi, imzasız ilaçlama sonrası hasat ekranını açmaya çalışırken 60 saniye bekledi; ekran hâlâ «Ιστορικό»da kalmıştı. Uygulama kodu değişmediği için bu ara sıra düşen bir test; nedeni bilinmiyor. Bu yüzden kayıt bu ikinci düzeltmeyle yeniden denetlendi; ilk kırmızı sonuç bir düzeltme kanıtı sayılmaz.
4. **Önerim:** Telefonda «Άλλα → Αποθήκη»yı ve «Σήμερα» ekranının yeni sade halini dene. Sıradaki iş is-6b-4 senin cevabınla hemen başlayabilir.
5. **Senden gereken karar:** «Σήμερα» için iki soru (is-6b-4): (a) «Για κοπή σήμερα» ekim sayıyor, «Χωράφια χωρίς αναμονή» tarla sayıyor — tek satıra inecekse hangisi kalsın? (c) İlaçlama/hasat/iş ekleme düğmeleri hem hızlı ekleme bölümünde hem sayfada var — hangisi kalsın? Ayrıca prototip karşılaştırmasındaki 5 öneriden hangileri iş olsun?

PR yok (yalnızca bu kayıt; #508 eski araştırma PR'ı, dokunulmadı). Bugünkü kod işi: 3/12. Birleşti ≠ canlıda.

## 2026-11-28 09:19 Atina — yönetici koşusu 20261128-0719
1. **Uygulamada ne değişti:** Hiçbir şey. Önceki koşudan beri yeni onaylı iş ya da senden yeni cevap gelmedi.
2. **Senin için faydası:** Onaysız iş yapılmadı; ana dal sağlam kaldı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 0393699) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Son 24 saatte ana dalda 44 koşu var, hepsi ilk denemede başarılı; bu yüzden ara sıra düşen testleri izleme işi (q-2) alınmadı. Başarısız olan yok.
4. **Önerim:** Telefonda «Άλλα → Αποθήκη»yı ve «Σήμερα» ekranının yeni sade halini dene. Sıradaki iş is-6b-4 senin cevabınla hemen başlayabilir.
5. **Senden gereken karar:** «Σήμερα» için iki soru (is-6b-4): (a) «Για κοπή σήμερα» ekim sayıyor, «Χωράφια χωρίς αναμονή» tarla sayıyor — tek satıra inecekse hangisi kalsın? (c) İlaçlama/hasat/iş ekleme düğmeleri hem hızlı ekleme bölümünde hem sayfada var — hangisi kalsın? Ayrıca prototip karşılaştırmasındaki 5 öneriden hangileri iş olsun?

PR yok (yalnızca bu kayıt; #508 eski araştırma PR'ı, dokunulmadı). Bugünkü kod işi: 3/12. Birleşti ≠ canlıda.

## 2026-11-28 08:19 Atina — yönetici koşusu 20261128-0619
1. **Uygulamada ne değişti:** Hiçbir şey. Önceki koşudan beri yeni onaylı iş ya da senden yeni cevap gelmedi.
2. **Senin için faydası:** Onaysız iş yapılmadı; ana dal sağlam kaldı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 0960c22) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Son 24 saatte ana dalda düşen ya da tekrar çalıştırılan test yok; bu yüzden ara sıra düşen testleri izleme işi (q-2) alınmadı. Başarısız olan yok.
4. **Önerim:** Telefonda «Άλλα → Αποθήκη»yı ve «Σήμερα» ekranının yeni sade halini dene. Sıradaki iş is-6b-4 senin cevabınla hemen başlayabilir.
5. **Senden gereken karar:** «Σήμερα» için iki soru (is-6b-4): (a) «Για κοπή σήμερα» ekim sayıyor, «Χωράφια χωρίς αναμονή» tarla sayıyor — tek satıra inecekse hangisi kalsın? (c) İlaçlama/hasat/iş ekleme düğmeleri hem hızlı ekleme bölümünde hem sayfada var — hangisi kalsın? Ayrıca prototip karşılaştırmasındaki 5 öneriden hangileri iş olsun?

PR yok (yalnızca bu kayıt; #508 eski araştırma PR'ı, dokunulmadı). Bugünkü kod işi: 3/12. Birleşti ≠ canlıda.

## 2026-11-28 07:19 Atina — yönetici koşusu 20261128-0518
1. **Uygulamada ne değişti:** Hiçbir şey. Önceki koşudan beri yeni onaylı iş ya da senden yeni cevap gelmedi.
2. **Senin için faydası:** Onaysız iş yapılmadı; ana dal sağlam kaldı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt e224903) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Son 24 saatte ana dalda düşen ya da tekrar çalıştırılan test yok; bu yüzden ara sıra düşen testleri izleme işi (q-2) alınmadı. Başarısız olan yok.
4. **Önerim:** Telefonda «Άλλα → Αποθήκη»yı ve «Σήμερα» ekranının yeni sade halini dene. Sıradaki iş is-6b-4 senin cevabınla hemen başlayabilir.
5. **Senden gereken karar:** «Σήμερα» için iki soru (is-6b-4): (a) «Για κοπή σήμερα» ekim sayıyor, «Χωράφια χωρίς αναμονή» tarla sayıyor — tek satıra inecekse hangisi kalsın? (c) İlaçlama/hasat/iş ekleme düğmeleri hem hızlı ekleme bölümünde hem sayfada var — hangisi kalsın? Ayrıca prototip karşılaştırmasındaki 5 öneriden hangileri iş olsun?

PR yok (yalnızca bu kayıt; #508 eski araştırma PR'ı, dokunulmadı). Bugünkü kod işi: 3/12. Birleşti ≠ canlıda.

## 2026-11-28 06:18 Atina — yönetici koşusu 20261128-0418
1. **Uygulamada ne değişti:** Hiçbir şey. Önceki koşudan beri yeni onaylı iş ya da senden yeni cevap gelmedi.
2. **Senin için faydası:** Onaysız iş yapılmadı; ana dal sağlam kaldı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 2b65145) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Son 24 saatte ana dalda düşen test yok; bu yüzden ara sıra düşen testleri izleme işi (q-2) alınmadı. Başarısız olan yok.
4. **Önerim:** Telefonda «Άλλα → Αποθήκη»yı ve «Σήμερα» ekranının yeni sade halini dene. Sıradaki iş is-6b-4 senin cevabınla hemen başlayabilir.
5. **Senden gereken karar:** «Σήμερα» için iki soru (is-6b-4): (a) «Για κοπή σήμερα» ekim sayıyor, «Χωράφια χωρίς αναμονή» tarla sayıyor — tek satıra inecekse hangisi kalsın? (c) İlaçlama/hasat/iş ekleme düğmeleri hem hızlı ekleme bölümünde hem sayfada var — hangisi kalsın? Ayrıca prototip karşılaştırmasındaki 5 öneriden hangileri iş olsun?

PR yok (yalnızca bu kayıt; #508 eski araştırma PR'ı, dokunulmadı). Bugünkü kod işi: 3/12. Birleşti ≠ canlıda.

## 2026-11-28 05:19 Atina — yönetici koşusu 20261128-0319
1. **Uygulamada ne değişti:** Hiçbir şey. Önceki koşudan beri yeni onaylı iş ya da senden yeni cevap gelmedi.
2. **Senin için faydası:** Onaysız iş yapılmadı; ana dal sağlam kaldı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 6a13605) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Son 24 saatte ana dalda tek bir düşme var ve o da ara sıra düşen testleri izleme işinin (q-2) önceki denemesinde zaten incelenmişti; yeni kanıt olmadığı için q-2 alınmadı. Başarısız olan yok.
4. **Önerim:** Telefonda «Άλλα → Αποθήκη»yı ve «Σήμερα» ekranının yeni sade halini dene. Sıradaki iş is-6b-4 senin cevabınla hemen başlayabilir.
5. **Senden gereken karar:** «Σήμερα» için iki soru (is-6b-4): (a) «Για κοπή σήμερα» ekim sayıyor, «Χωράφια χωρίς αναμονή» tarla sayıyor — tek satıra inecekse hangisi kalsın? (c) İlaçlama/hasat/iş ekleme düğmeleri hem hızlı ekleme bölümünde hem sayfada var — hangisi kalsın? Ayrıca prototip karşılaştırmasındaki 5 öneriden hangileri iş olsun?

PR yok (yalnızca bu kayıt; #508 eski araştırma PR'ı, dokunulmadı). Bugünkü kod işi: 3/12. Birleşti ≠ canlıda.

## 2026-11-28 04:19 Atina — yönetici koşusu 20261128-0218
1. **Uygulamada ne değişti:** Hiçbir şey. Önceki koşudan beri yeni onaylı iş ya da senden yeni cevap gelmedi.
2. **Senin için faydası:** Onaysız iş yapılmadı; ana dal sağlam kaldı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 2329a1b) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Son 24 saatte ana dalda düşen ya da tekrar çalıştırılan test yok; bu yüzden ara sıra düşen testleri izleme işi (q-2) alınmadı. Başarısız olan yok.
4. **Önerim:** Telefonda «Άλλα → Αποθήκη»yı ve «Σήμερα» ekranının yeni sade halini dene. Sıradaki iş is-6b-4 senin cevabınla hemen başlayabilir.
5. **Senden gereken karar:** «Σήμερα» için iki soru (is-6b-4): (a) «Για κοπή σήμερα» ekim sayıyor, «Χωράφια χωρίς αναμονή» tarla sayıyor — tek satıra inecekse hangisi kalsın? (c) İlaçlama/hasat/iş ekleme düğmeleri hem hızlı ekleme bölümünde hem sayfada var — hangisi kalsın? Ayrıca prototip karşılaştırmasındaki 5 öneriden hangileri iş olsun?

PR yok (yalnızca bu kayıt; #508 eski araştırma PR'ı, dokunulmadı). Bugünkü kod işi: 3/12. Birleşti ≠ canlıda.

## 2026-11-28 03:19 Atina — yönetici koşusu 20261128-0119
1. **Uygulamada ne değişti:** Hiçbir şey. Önceki koşudan beri yeni onaylı iş ya da senden yeni cevap gelmedi.
2. **Senin için faydası:** Onaysız iş yapılmadı; ana dal sağlam kaldı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt f59ff34) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Son 24 saatte ana dalda düşen ya da tekrar çalıştırılan test yok; bu yüzden ara sıra düşen testleri izleme işi (q-2) alınmadı. Başarısız olan yok.
4. **Önerim:** Telefonda «Άλλα → Αποθήκη»yı ve «Σήμερα» ekranının yeni sade halini dene. Sıradaki iş is-6b-4 senin cevabınla hemen başlayabilir.
5. **Senden gereken karar:** «Σήμερα» için iki soru (is-6b-4): (a) «Για κοπή σήμερα» ekim sayıyor, «Χωράφια χωρίς αναμονή» tarla sayıyor — tek satıra inecekse hangisi kalsın? (c) İlaçlama/hasat/iş ekleme düğmeleri hem hızlı ekleme bölümünde hem sayfada var — hangisi kalsın? Ayrıca prototip karşılaştırmasındaki 5 öneriden hangileri iş olsun?

PR yok (yalnızca bu kayıt; #508 eski araştırma PR'ı, dokunulmadı). Bugünkü kod işi: 3/12. Birleşti ≠ canlıda.

## 2026-11-28 02:19 Atina — yönetici koşusu 20261128-0018
1. **Uygulamada ne değişti:** Hiçbir şey. Bu koşuda alınabilecek onaylı ve senin cevabına bağlı olmayan iş yoktu.
2. **Senin için faydası:** Kuralsız ya da onaysız iş yapılmadı; ana dal sağlam kaldı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 4ed1af7) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Son 24 saatte ana dalda düşen ya da tekrar çalıştırılan test yok; bu yüzden ara sıra düşen testleri izleme işi (q-2) bu koşuda alınmadı. Başarısız olan yok.
4. **Önerim:** Telefonda «Άλλα → Αποθήκη»yı ve «Σήμερα» ekranının yeni sade halini dene. Sıradaki iş is-6b-4 senin cevabınla hemen başlayabilir.
5. **Senden gereken karar:** «Σήμερα» için iki soru (is-6b-4): (a) «Για κοπή σήμερα» ekim sayıyor, «Χωράφια χωρίς αναμονή» tarla sayıyor — tek satıra inecekse hangisi kalsın? (c) İlaçlama/hasat/iş ekleme düğmeleri hem hızlı ekleme bölümünde hem sayfada var — hangisi kalsın? Ayrıca prototip karşılaştırmasındaki 5 öneriden hangileri iş olsun?

PR yok (yalnızca bu kayıt; #508 eski araştırma PR'ı, dokunulmadı). Bugünkü kod işi: 3/12. Birleşti ≠ canlıda.

## 2026-11-28 01:48 Atina — yönetici koşusu 20261127-2318
1. **Uygulamada ne değişti:** «Αποθήκη» artık alt menüde değil; «Άλλα» menüsünde, «Καθημερινή δουλειά» grubunda «Παραγγελίες»in hemen altında bir satır olarak duruyor. Alt menüde 4 sekme kaldı (Σήμερα, Φυτά, Χωράφια, Άλλα). Αποθήκη ekranının kendisi (ilaç partileri, son kullanma, stok uyarıları) hiç değişmedi; Αποθήκη açıkken alt menüde «Άλλα» vurgulu görünüyor. Eski Αποθήκη bağlantısı (kayıtlı yer dahil) hâlâ açılıyor.
2. **Senin için faydası:** Alt menü daha sade, her düğme daha geniş; senin seçtiğin düzen. Hiçbir işlev kaybolmadı.
3. **Ne denendi, ne başarısız oldu:** İlk denemede iPhone tarayıcısıyla çalışan ekran testlerinden ikisi düştü: «Άλλα» menüsünün sırasını kontrol eden iki test yeni «Αποθήκη» satırını bilmiyordu. Takım yalnızca beklenen sıraya yeni satırı ekledi (test gevşetilmedi), bekçi yeni hali yeniden inceleyip ONAY verdi. İkinci denemede tüm kontroller yeşil (3 parça ekran testi, SQL, Cloudflare derlemesi). Yeni bir test de eklendi: alt menüde Αποθήκη yok, Άλλα'daki satır ekranı açıyor, eski bağlantı çalışıyor.
4. **Önerim:** Telefonda «Άλλα → Αποθήκη»yı açıp bir ilaç partisine bak. Onaylı ve senin cevabına bağlı olmayan iş kalmadı; sıradaki iş is-6b-4 senin cevabını bekliyor.
5. **Senden gereken karar:** «Σήμερα»nın iki sorusu (is-6b-4): (a) «Για κοπή σήμερα» ekim sayıyor, «Χωράφια χωρίς αναμονή» tarla sayıyor — tek satıra inecekse hangisi kalsın? (c) İlaçlama/hasat/iş ekleme düğmeleri hem hızlı ekleme bölümünde hem sayfada var — hangisi kalsın? Ayrıca prototip karşılaştırmasındaki 5 öneriden hangileri iş olsun?

PR: https://github.com/seaevill/Aloni/pull/638 (Αποθήκη → Άλλα). Bugünkü kod işi: 3/12. Birleşti ≠ canlıda.

## 2026-11-28 00:45 Atina — yönetici koşusu 20261127-2219
1. **Uygulamada ne değişti:** «Σήμερα» ekranının altındaki sayı satırı artık yalnızca «Φυτεύσεις: N» yazıyor. «Χωράφια» ve «Καλλιέργειες» sayıları zaten üstteki dokunulabilir kutularda olduğu için bu satırdan çıkarıldı; hiçbir sayı kaybolmadı. Ayrıca bir test onarıldı (uygulamanın davranışı değişmedi).
2. **Senin için faydası:** Aynı sayıyı iki kez okumuyorsun; ekran biraz daha sade. Test onarımı sayesinde her gün kendi kendine kırmızıya dönen kontrol artık yanlış alarm vermiyor.
3. **Ne denendi, ne başarısız oldu:** Gece yarısı tarih 28 Kasım'a dönünce bir test kendiliğinden düştü: örnek çiftlik tarihleri bugüne kayıyor, test ise 20 Kasım'a bakıyordu; ıspanaktaki ilaçlama bekleme süresi yüzünden «kesilebilir ıspanak yok» çıkıyordu (uygulama doğru davranıyordu, test yanlıştı). Önce bu onarıldı (#636), sonra ekran değişikliği (#635) birleştirildi. İkisinde de tüm kontroller (iPhone tarayıcısıyla 3 parça ekran testi, SQL, Cloudflare derlemesi) yeşil; bekçi ikisine de ONAY verdi. Not: yeni satır telefonda alt menünün arkasında kalıyor, görmek için sayfayı en alta kaydır.
4. **Önerim:** Sıradaki onaylı iş is-7: «Αποθήκη»yı alt menüden «Άλλα» menüsüne taşımak. Bir sonraki koşu bunu alır.
5. **Senden gereken karar:** «Σήμερα»nın kalan iki sorusu (artık is-6b-4): (a) «Για κοπή σήμερα» ekim sayıyor, «Χωράφια χωρίς αναμονή» tarla sayıyor — tek satıra inecekse hangisi kalsın? (c) İlaçlama/hasat/iş ekleme düğmeleri hem hızlı ekleme bölümünde hem sayfada var — hangisi kalsın?

PR'lar: https://github.com/seaevill/Aloni/pull/636 (test onarımı) · https://github.com/seaevill/Aloni/pull/635 (Σήμερα sayı satırı). Bugünkü kod işi: 2/12. Birleşti ≠ canlıda.

## 2026-11-27 23:19 Atina — yönetici koşusu 20261127-2119
1. **Uygulamada ne değişti:** Hiçbir şey. Bugünkü kod işi sınırı (12/12) bugün öğleden sonra doldu; sınır dolunca yalnızca rapor yazılabiliyor. Saat 19:00'u geçti; zincir kurulmadı.
2. **Senin için faydası:** Sınır aşılmadı, kuralsız iş yapılmadı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 2b77225) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Başarısız olan yok.
4. **Önerim:** Yarın (yeni gün, sınır sıfırlanır) sıradaki iş is-6b-3'ün senin cevabına bağlı olmayan kısmı ya da is-7: Αποθήκη'yi Άλλα menüsüne taşımak.
5. **Senden gereken karar:** Önceki raporun iki sorusu (is-6b-3 a ve c) hâlâ cevap bekliyor.

PR yok (yalnızca bu kayıt). Bugünkü kod işi: 12/12. Birleşti ≠ canlıda.

## 2026-11-27 22:19 Atina — yönetici koşusu 20261127-2018
1. **Uygulamada ne değişti:** Hiçbir şey. Bugünkü kod işi sınırı (12/12) bugün öğleden sonra doldu; sınır dolunca yalnızca rapor yazılabiliyor. Saat 19:00'u geçti; zincir kurulmadı.
2. **Senin için faydası:** Sınır aşılmadı, kuralsız iş yapılmadı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 351fcfa) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Başarısız olan yok.
4. **Önerim:** Yarın (yeni gün, sınır sıfırlanır) sıradaki iş is-6b-3'ün senin cevabına bağlı olmayan kısmı ya da is-7: Αποθήκη'yi Άλλα menüsüne taşımak.
5. **Senden gereken karar:** Önceki raporun iki sorusu (is-6b-3 a ve c) hâlâ cevap bekliyor.

PR yok (yalnızca bu kayıt). Bugünkü kod işi: 12/12. Birleşti ≠ canlıda.

## 2026-11-27 21:19 Atina — yönetici koşusu 20261127-1918
1. **Uygulamada ne değişti:** Hiçbir şey. Bugünkü kod işi sınırı (12/12) bugün öğleden sonra doldu; sınır dolunca yalnızca rapor yazılabiliyor. Saat 19:00'u geçti; zincir kurulmadı.
2. **Senin için faydası:** Sınır aşılmadı, kuralsız iş yapılmadı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 03e2dd8) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Başarısız olan yok.
4. **Önerim:** Yarın (yeni gün, sınır sıfırlanır) sıradaki iş is-6b-3'ün senin cevabına bağlı olmayan kısmı ya da is-7: Αποθήκη'yi Άλλα menüsüne taşımak.
5. **Senden gereken karar:** Önceki raporun iki sorusu (is-6b-3 a ve c) hâlâ cevap bekliyor.

PR yok (yalnızca bu kayıt). Bugünkü kod işi: 12/12. Birleşti ≠ canlıda.

## 2026-11-27 20:19 Atina — yönetici koşusu 20261127-1819
1. **Uygulamada ne değişti:** Hiçbir şey. Bugünkü kod işi sınırı (12/12) bugün öğleden sonra doldu; sınır dolunca yalnızca rapor yazılabiliyor. Saat 19:00'u geçti; zincir kurulmadı.
2. **Senin için faydası:** Sınır aşılmadı, kuralsız iş yapılmadı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 5cf1835) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Başarısız olan yok.
4. **Önerim:** Yarın (yeni gün, sınır sıfırlanır) sıradaki iş is-6b-3'ün senin cevabına bağlı olmayan kısmı ya da is-7: Αποθήκη'yi Άλλα menüsüne taşımak.
5. **Senden gereken karar:** Önceki raporun iki sorusu (is-6b-3 a ve c) hâlâ cevap bekliyor.

PR yok (yalnızca bu kayıt). Bugünkü kod işi: 12/12. Birleşti ≠ canlıda.

## 2026-11-27 19:19 Atina — yönetici koşusu 20261127-1719
1. **Uygulamada ne değişti:** Hiçbir şey. Bugünkü kod işi sınırı (12/12) bugün öğleden sonra doldu; sınır dolunca yalnızca rapor yazılabiliyor. Saat 19:00'u geçti, bugünkü arka arkaya çalışma bitti; zincir kurulmadı.
2. **Senin için faydası:** Sınır aşılmadı, kuralsız iş yapılmadı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 177c8aa) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Başarısız olan yok.
4. **Önerim:** Yarın (yeni gün, sınır sıfırlanır) sıradaki iş is-6b-3'ün senin cevabına bağlı olmayan kısmı ya da is-7: Αποθήκη'yi Άλλα menüsüne taşımak.
5. **Senden gereken karar:** Önceki raporun iki sorusu (is-6b-3 a ve c) hâlâ cevap bekliyor.

PR yok (yalnızca bu kayıt). Bugünkü kod işi: 12/12. Birleşti ≠ canlıda.

## 2026-11-27 18:19 Atina — yönetici koşusu 20261127-1619
1. **Uygulamada ne değişti:** Hiçbir şey. Bugünkü kod işi sınırı (12/12) bugün öğleden sonra doldu; sınır dolunca yalnızca rapor yazılabiliyor.
2. **Senin için faydası:** Sınır aşılmadı, kuralsız iş yapılmadı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt b5aa076) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Başarısız olan yok.
4. **Önerim:** Yarın (yeni gün, sınır sıfırlanır) sıradaki iş is-6b-3'ün senin cevabına bağlı olmayan kısmı ya da is-7: Αποθήκη'yi Άλλα menüsüne taşımak.
5. **Senden gereken karar:** Önceki raporun iki sorusu (is-6b-3 a ve c) hâlâ cevap bekliyor.

PR yok (yalnızca bu kayıt). Bugünkü kod işi: 12/12. Birleşti ≠ canlıda.

## 2026-11-27 17:19 Atina — yönetici koşusu 20261127-1519
1. **Uygulamada ne değişti:** Hiçbir şey. Bugünkü kod işi sınırı (12/12) bugün öğleden sonra doldu; sınır dolunca yalnızca rapor yazılabiliyor.
2. **Senin için faydası:** Sınır aşılmadı, kuralsız iş yapılmadı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 68d4a1d) yeşil: tüm kontroller (SQL, iPhone tarayıcısıyla 3 parça ekran testi, Cloudflare derlemesi) başarılı. Başarısız olan yok.
4. **Önerim:** Yarın (yeni gün, sınır sıfırlanır) sıradaki iş is-6b-3'ün senin cevabına bağlı olmayan kısmı ya da is-7: Αποθήκη'yi Άλλα menüsüne taşımak.
5. **Senden gereken karar:** Önceki raporun iki sorusu (is-6b-3 a ve c) hâlâ cevap bekliyor.

PR yok (yalnızca bu kayıt). Bugünkü kod işi: 12/12. Birleşti ≠ canlıda.

## 2026-11-27 17:05 Atina — yönetici koşusu 20261127-1503
1. **Uygulamada ne değişti:** Hiçbir şey. Bu koşu «zincir» notuyla elle başlatıldı, ama bugünkü kod işi sınırı (12/12) bir önceki koşuda doldu; sınır dolunca yalnızca rapor yazılabiliyor.
2. **Senin için faydası:** Sınır aşılmadı, kuralsız iş yapılmadı.
3. **Ne denendi, ne başarısız oldu:** Ana dal (son kayıt 0a2bef5) ve önceki kod işi (#625) yeşil. Başarısız olan yok.
4. **Önerim:** Yarın (yeni gün, sınır sıfırlanır) sıradaki iş is-7: Αποθήκη'yi Άλλα menüsüne taşımak.
5. **Senden gereken karar:** Önceki raporun iki sorusu (is-6b-3 a ve c) hâlâ cevap bekliyor.

PR yok (yalnızca bu kayıt). Bugünkü kod işi: 12/12. Birleşti ≠ canlıda.

## 2026-11-27 16:56 Atina — yönetici koşusu 20261127-1442
1. **Uygulamada ne değişti:** Σήμερα'daki «Σήμερα έγιναν» kartı, geciken iş varken ama bugün hiçbir kayıt yokken yalnızca başlığı gösteriyordu (altı boş). Artık altında «Δεν έχει καταγραφεί τίποτα σήμερα.» yazıyor. Bugün bir ilaçlama ya da hasat kaydı varsa cümle görünmüyor, kayıtlar listeleniyor (önceki gibi).
2. **Senin için faydası:** Boş kart «bir şey mi bozuldu?» diye düşündürmüyor; bugün kayıt girilmediği açıkça yazıyor.
3. **Ne denendi, ne başarısız oldu:** Takım önce bu durumu yakalayan yeni bir ekran testi yazdı (düzeltmeden önce düştü, sonra geçti). Takım ve bekçi ayrı ayrı tüm birim testlerini (919 geçti) ve Σήμερα ekran testlerini çalıştırdı; bekçi yalnızca hasat kaydı olan günde cümlenin yanlışlıkla çıkmadığını da kontrol etti ve önce/sonra resimlerini açtı. İlk denetimde ONAY. GitHub'daki tüm kontroller (iPhone tarayıcısıyla 3 parça ekran testi, SQL, Cloudflare derlemesi) yeşil. Başarısız olan yok. Resimler: docs/design/today-simplify/2026-11-27/part3-*.
4. **Önerim:** Bugünkü kod işi sınırı (12/12) doldu; bugün başka kod işi yapılmayacak. Sonraki koşuda sıradaki iş is-7 (Αποθήκη'yi Άλλα menüsüne taşımak); is-6b-3'ün iki alt maddesi senin cevabını bekliyor.
5. **Senden gereken karar:** (a) «Για κοπή σήμερα» ekimleri, «Χωράφια χωρίς αναμονή» tarlaları sayıyor: tek satıra inecekse hangisi kalsın? (b) Σήμερα'daki ilaçlama/hasat/iş ekleme düğmeleri iki yerde var: hızlı ekleme bölümü mü kalsın, sayfadaki düğmeler mi? (Düğmeler silinmiyor, yalnızca tekrar kalkıyor.)

PR: https://github.com/seaevill/Aloni/pull/625 (birleşti, main `275248b`). Bugünkü kod işi: 12/12. Birleşti ≠ canlıda.

## 2026-11-27 16:35 Atina — yönetici koşusu 20261127-1407
1. **Uygulamada ne değişti:** Σήμερα'da iki kez görünen iki bilgi teke indi. «Κλούβες 7 ημερών» sayısı artık yalnızca üstteki büyük sayıda (yanındaki küçük çizgiyle) var; alttaki listede ikinci kez yazılmıyor. Geciken işlerin sayısı üç yerde değil, iki yerde: Εργασίες bölümündeki «Καθυστερημένες» grubu ve özet satırı. Büyük sayıya dokununca aynı 7 günlük kasa ayrıntısı açılıyor; hiçbir bilgi kaybolmadı.
2. **Senin için faydası:** Aynı sayıyı iki kez okumak yok; ekran biraz daha kısa ve sakin.
3. **Ne denendi, ne başarısız oldu:** Takım ve bekçi ayrı ayrı tüm birim testlerini (919 geçti) ve Σήμερα'ya bağlı 5 ekran testini çalıştırdı; testler yalnızca kaldırılan kutu yerine büyük sayıyı okuyacak şekilde güncellendi, kontrolleri gevşetilmedi. İlk denetimde önce/sonra resmi eksikti; takım ekledi, bekçi resimleri açıp yeniden onay verdi. GitHub'daki tüm kontroller (iPhone tarayıcısıyla 3 parça ekran testi, SQL, Cloudflare derlemesi) yeşil. Başarısız olan yok. Resimler: docs/design/today-simplify/2026-11-27/part2-*.
4. **Önerim:** Sıradaki iş is-7 (Αποθήκη'yi Άλλα menüsüne taşımak). Σήμερα'nın kalan tekrarları is-6b-2 olarak sırada; içindeki bir alt madde senin cevabını bekliyor (aşağıda).
5. **Senden gereken karar:** Σήμερα'da «Για κοπή σήμερα» sayısı **ekimleri** (φυτεύσεις) sayıyor, altındaki «Χωράφια χωρίς αναμονή» kutusu **tarlaları** sayıyor. İkisi tek satıra inecekse hangisi kalsın: ekim sayısı mı, tarla sayısı mı, yoksa ikisi aynı satırda mı?

PR: https://github.com/seaevill/Aloni/pull/623 (birleşti, main `945f5fe`). Bugünkü kod işi: 11/12. Birleşti ≠ canlıda.

## 2026-11-27 16:00 Atina — yönetici koşusu 20261127-1344
1. **Uygulamada ne değişti:** Σήμερα ekranında, «Για κοπή σήμερα» bölümünün altındaki beş büyük sayı kutusu (Χωράφια, Καλλιέργειες, Κλούβες 7 ve 28 günlük, «Χωράφια χωρίς αναμονή σήμερα») artık tek beyaz liste kartında, her satırda bir sayı. «Αύριο φεύγουν» kartlarında ürün adı ayrı bir iç kutu değil, düz yazı; «Λείπουν …» etiketi tek satır. Hiçbir bilgi ya da düğme kaldırılmadı; sayılara dokununca yine aynı ayrıntı açılıyor. Ekran yaklaşık 250 nokta kısaldı (Demo sezonunda).
2. **Senin için faydası:** Σήμερα daha az kaydırılıyor, sayılar tek bakışta okunuyor; çiftçilerin «kalabalık» şikâyetinin ilk adımı.
3. **Ne denendi, ne başarısız oldu:** Takım ve bekçi ayrı ayrı tüm birim testlerini (919 geçti) ve telefon genişliği testlerini (320/375/390/768, 14 test) çalıştırdı; hiçbir test değiştirilmedi. Bekçi önce/sonra resimlerini açıp karşılaştırdı: ilk denetimde ONAY. GitHub'daki tüm kontroller (iPhone tarayıcısıyla 3 parça ekran testi, SQL, Cloudflare derlemesi) yeşil. Başarısız olan yok. Önce/sonra resimleri: docs/design/today-simplify/2026-11-27/.
4. **Önerim:** Sıradaki iş is-6b: Σήμερα'da iki kez görünen sayıları (7 günlük kasa sayısı, «kesime hazır» sayısı, geciken işler 3 yerde, hızlı ekleme düğmeleri) tek kısa satır + bağlantıya indirmek. Envanter PR #621'in açıklamasında. Ardından is-7 (Αποθήκη'yi Άλλα'ya taşımak).
5. **Senden gereken karar:** Yeni karar yok. Telefonda Σήμερα'yı açıp yeni liste kartına bak; beğenmezsen söyle, geri alınır. Eski sorular (Yunanca sözcükler, hesap silme testi satırı) hâlâ cevap bekliyor.

PR: https://github.com/seaevill/Aloni/pull/621 (birleşti, main `87410b6`). Bugünkü kod işi: 10/12. Birleşti ≠ canlıda.

## 2026-11-27 15:20 Atina — yönetici koşusu 20261127-1319
1. **Uygulamada ne değişti:** Hiçbir şey. İş listesinde senin onayladığın, yapılmayı bekleyen yeni iş yok. Tek onaylı madde «ara sıra düşen testleri izle» işi; o yalnızca GitHub'da yeni bir düşme olursa ele alınıyor ve yeni düşme yok.
2. **Senin için faydası:** Boşuna kod yazılmadı, uydurma iş açılmadı.
3. **Ne denendi, ne başarısız oldu:** Ana daldaki son 15 GitHub koşusunun hepsi yeşil (en sonuncusu 14:35 Atina). Telefon ekranı testleri (3 parça), SQL ve Cloudflare derlemesi son ana dal kaydında yeşil. Başarısız olan yok.
4. **Önerim:** Fark listesindeki 5 öneriden birini seç; en görünür fayda (3) Σήμερα'da hava özetini üste almak. Onay verdiğin an sıradaki koşu başlar (bugün 19:00'a kadar art arda çalışabilir; bugünkü kod işi 9/12).
5. **Senden gereken karar:** docs/design/compare/2026-11-27/FARK-LISTESI.md içindeki 5 öneriden hangileri yapılsın (numara yazman yeterli)? Hesap silme testine kontrol satırı eklensin mi («evet»)? Yunanca sözcük soruları (veresiye, kasa fiyatı) hâlâ cevabını bekliyor.

PR yok (yalnızca bu kayıt). Bugünkü kod işi: 9/12. Birleşti ≠ canlıda.

## 2026-11-27 14:33 Atina — yönetici koşusu 20261127-1219
1. **Uygulamada ne değişti:** Uygulamada bir şey değişmedi. Sıradaki iş (Demo parselleri «yarım» görünüyordu) kontrol edildi: bitmiş. Demo çiftlikte Megara ovasında 7 hayalî tarla var, toplam 70 στρέμματα (en büyüğü 25, en küçüğü 2,5). Tapu numaralarının (ΚΑΕΚ) hepsi «99» ile başlıyor ve tarla sayfasında «Επίδειξη – φανταστικός αριθμός» yazısıyla gösteriliyor; değiştirilemiyor. Yalnızca iş listesindeki eski «yarım» satırı «bitti» yapıldı.
2. **Senin için faydası:** Var olan iş için boşuna kod yazılmadı; iş listesi gerçeği gösteriyor.
3. **Ne denendi, ne başarısız oldu:** Demo tarla testleri (16 test) takımda ve bekçide ayrı ayrı geçti. Bekçi tarla verisini ve ekrandaki «Επίδειξη» yazısını kendisi açıp baktı: ilk denetimde ONAY. GitHub'daki tüm kontroller (telefon ekranı testleri 3 parça, SQL, Cloudflare derlemesi) yeşil. Ara sıra düşen testler için yeni bir düşme yok (sabahki 05:44 düşmesinden sonra tüm koşular yeşil), bu yüzden o izleme işine bu koşuda dokunulmadı. Başarısız olan yok.
4. **Önerim:** İş listesinde onaylı yeni iş kalmadı (yalnızca «yeni düşme olursa bak» izleme işi var). Fark listesindeki 5 öneriden birini seçersen sıradaki koşu onu yapar; en görünür fayda (3) Σήμερα'da hava özetini üste almak.
5. **Senden gereken karar:** docs/design/compare/2026-11-27/FARK-LISTESI.md içindeki 5 öneriden hangileri yapılsın (numara yazman yeterli)? Hesap silme testine kontrol satırı eklensin mi («evet»)? Yunanca sözcük soruları (veresiye, kasa fiyatı) hâlâ cevabını bekliyor.

PR: https://github.com/seaevill/Aloni/pull/617 (birleşti, main `b960ee7`). Bugünkü kod işi: 9/12. Birleşti ≠ canlıda.

## 2026-11-27 13:50 Atina — yönetici koşusu 20261127-1147
1. **Uygulamada ne değişti:** Uygulamada bir şey değişmedi. Bu sabah 05:44’te (Atina) GitHub'da bir kez düşen «yedek al → telefonu sil → geri yükle» testine bakıldı. Test, Άλλα → Πληροφορίες → «Διαγραφή λογαριασμού» penceresinde, çiftlik adının yazıldığı kutu boş kaldığı için takılmış. Silme ve geri yükleme adımlarına hiç gelinmemiş. Yani yedeğin kendisinde bir hata görülmedi, ama bu koşu yedeği de sınamadı.
2. **Senin için faydası:** Testin hangi adımda takıldığı artık kayıtlı. Tahminle kod değiştirilmedi.
3. **Ne denendi, ne başarısız oldu:** Takım testi bilgisayarda, makine zorlanırken 10 kez çalıştırdı; 10'u da geçti, hata yeniden görülmedi. Neden kutunun boş kaldığı bilinmiyor; kök neden bulunamadı. O sabahtan sonraki tüm GitHub koşuları yeşil. PR açılmadı.
4. **Önerim:** teste, yazının kutuda kaldığını kontrol eden bir satır eklemek. Bu testi gevşetmez, sıkılaştırır ve bir sonraki düşmede sorunu açıkça gösterir. Sıradaki onaylı iş q-31 (Demo parselleri kontrolü).
5. **Senden gereken karar:** Bu test satırı eklensin mi («evet» yazman yeterli)? Fark listesindeki 5 öneriden hangileri yapılsın? Yunanca sözcük soruları hâlâ cevabını bekliyor.

PR yok (kod değişmedi). Bugünkü kod işi: 8/12. Birleşti ≠ canlıda.

## 2026-11-27 13:39 Atina — yönetici koşusu 20261127-1131
1. **Uygulamada ne değişti:** Uygulamada bir şey değişmedi. Sıradaki iş (tank karışımı, «Διόρθωση», harita ve işçi daveti için telefon genişliğinde ekran testleri) kontrol edildi: dördünün de testi zaten var ve her gün çalışıyor. İş listesinde bu satırlar yine iki kez, biri «yapılmadı» olarak duruyordu; eski satırlar silindi.
2. **Senin için faydası:** Var olan testler için boşuna yeni kod yazılmadı; iş listesi gerçeği gösteriyor.
3. **Ne denendi, ne başarısız oldu:** Birim testleri 919 geçti, kod denetimleri temiz. Bekçi testlerin yerini tek tek açıp gördü ve testleri kendisi çalıştırdı: ilk denetimde ONAY. GitHub'daki kontroller yeşil (yalnızca belge değiştiği için ekran testleri bu kez çalışmadı). Bilgisayardaki denemede bir ilaçlama ekran testi, bağlantısız ortamda simge resmi yüklenemediği için düştü; bu deneme ortamına özgü görünüyor, uygulamanın koduna dokunulmadı. GitHub'daki asıl testler bunu gösterirse sıradaki izleme işi (q-2) bakacak.
4. **Önerim:** sıradaki onaylı iş q-31 (Demo parselleri işinde gerçekten kalan bir şey var mı kontrol). Ondan sonra iş listesinde onaylı yeni özellik kalmıyor; fark listesindeki 5 öneriden seçmen gerekiyor.
5. **Senden gereken karar:** docs/design/compare/2026-11-27/FARK-LISTESI.md içindeki 5 öneriden hangileri yapılsın (numara yazman yeterli)? Yunanca sözcük soruları (veresiye, kasa fiyatı) hâlâ cevabını bekliyor.

PR: https://github.com/seaevill/Aloni/pull/614 (birleşti, main `55fb12f`). Bugünkü kod işi: 7/12. Birleşti ≠ canlıda.

## 2026-11-27 13:24 Atina — yönetici koşusu 20261127-1109
1. **Uygulamada ne değişti:** Uygulamanın kendisi değişmedi. Prototip ile uygulama ekran ekran yan yana resimlendi (11 ekran, telefon genişliğinde, Yunanca, Demo çiftlik): Σήμερα, Φυτά, ürün sayfası, «Γιατί;», Χωράφια, tarla sayfası, Αποθήκη, Άλλα, Μητρώο, Διαθέσιμες κλούβες, hasat tahmini. Her ekran için Türkçe fark listesi yazıldı.
2. **Senin için faydası:** Prototipte olup uygulamada farklı duran yerleri tek dosyada görürsün ve hangisinin düzeltileceğini sen seçersin. Kurallar imzasız olduğu için bilerek eksik olan şeyler (uyarı kartları, ekim önerisi, verim tahmini) öneri olarak sunulmadı.
3. **Ne denendi, ne başarısız oldu:** Birim testleri 919 geçti, kod denetimleri temiz. Bekçi resimleri açıp listeyle karşılaştırdı ve ilk denetimde onay verdi. Küçük bir not düştü: listede «Άλλα'da 10'dan fazla satır» yazıyor ama resimde 9 satır görünüyor. GitHub'daki tüm kontroller yeşil. Uzun ekranlar resimde ilk kısımda kesildi. Bazı resimlerde alttaki menü çubuğu sayfanın ortasında görünüyor; bu resim çekme yönteminden kaynaklanıyor, uygulamadaki bir hata değil.
4. **Önerim:** listenin sonundaki 5 öneri: (1) Άλλα ekranını kısaltmak, (2) ürün sayfasında ekimleri üste almak, (3) Σήμερα'da hava özetini üste almak, (4) Μητρώο'da kayıt kimliğini gizlemek ve düğme metinlerini kısaltmak, (5) Αποθήκη ve Χωράφια'da tekrar eden alanları küçültmek. Sıradaki onaylı iş is-5 (ekran testleri).
5. **Senden gereken karar:** Resimlere ve listeye bak (docs/design/compare/2026-11-27/FARK-LISTESI.md). 5 öneriden hangileri yapılsın? Numaralarını yazman yeterli; onay vermediğin öneri sıraya girmez. Yunanca sözcük soruları hâlâ cevabını bekliyor.

PR: https://github.com/seaevill/Aloni/pull/612 (birleşti, main `7f3f6fa`). Bugünkü kod işi: 6/12. Birleşti ≠ canlıda.

## 2026-11-27 13:01 Atina — yönetici koşusu 20261127-1052
1. **Uygulamada ne değişti:** Uygulamada bir şey değişmedi. Sıradaki iş (Κλούβες yedeğini içe alma, «Διαθέσιμες κλούβες» ekranı ve ekim önerisi) kontrol edildi: zaten yapılmış ve test edilmiş (Άλλα → Διαθέσιμες κλούβες). İlaç bekleme süresindeki hasat «satılabilir» sayılmıyor; bunu deneyen test var. İş listesinde bu iş yanlışlıkla iki kez, biri «yapılmadı» olarak duruyordu; o eski satır silindi.
2. **Senin için faydası:** Aynı işe ikinci kez kod yazılmadı; iş listesi artık gerçeği gösteriyor.
3. **Ne denendi, ne başarısız oldu:** Bekçi Κλούβες testlerini kendisi çalıştırdı (10 test geçti), ilk denetimde ONAY. GitHub'daki tüm kontroller (telefon ekranı testleri 3 parça, SQL, Cloudflare derlemesi) yeşil. Başarısız olan yok.
4. **Önerim:** sıradaki iş is-4: prototip ile uygulamanın ekran ekran yan yana karşılaştırması ve fark listesi (düzeltme değil, sana öneri).
5. **Senden gereken karar:** Yeni karar yok. Önceki Yunanca sözcük soruları (veresiye ve kasa fiyatı) hâlâ cevabını bekliyor.

PR: https://github.com/seaevill/Aloni/pull/610 (birleşti, main `a2fe0dc`). Bugünkü kod işi: 5/12. Birleşti ≠ canlıda: bu ortamdan canlı adres doğrulanamaz.

## 2026-11-27 12:44 Atina — yönetici koşusu 20261127-1032
1. **Uygulamada ne değişti:** Άλλα → Ταμείο ekranına «Εκτύπωση» düğmesi geldi. Seçili yılın kayıtlarını tek sayfalık, her zaman Yunanca bir döküm olarak açar; telefonda «Paylaş → Yazdır» ile PDF olarak kaydedebilirsin. Dökümde CSV ile aynı satırlar var (düzeltilen kayıt bir kez, iptal edilen hiç yok), gelir, gider ve net toplam, ayrıca «όχι λογιστικά βιβλία» (resmî muhasebe defteri değil) uyarısı. Tutarlar kuruşu kuruşuna, ondalık virgülle; tarihler gün/ay/yıl. Yeni Yunanca sözcük eklenmedi.
2. **Senin için faydası:** Muhasebeciye Excel yerine düzgün bir PDF sayfası da verebilirsin; yazıcıdan da basılır.
3. **Ne denendi, ne başarısız oldu:** Birim testleri 919 geçti (bozuk tutar ya da tarih «άγνωστο» yazar, formül gibi başlayan not düz metin kalır), kod denetimleri temiz, Ταμείο ve ekran genişliği testleri bilgisayarda geçti. Bekçi testleri kendisi tekrar çalıştırdı: ilk denetimde ONAY. GitHub'daki tüm kontroller (telefon ekranı testleri 3 parça, SQL, Cloudflare derlemesi) yeşil. Başarısız olan yok. Sayfa düzeni gerçek bir PDF dosyasıyla değil, tarayıcının yazdırma görünümüyle kontrol edildi; iPhone'da bir kez denemen iyi olur.
4. **Önerim:** sıradaki iş is-3: Κλούβες yedeğini içe alma (önce gerçekten ne kaldığı kontrol edilecek).
5. **Senden gereken karar:** iPhone'da Άλλα → Ταμείο → «Εκτύπωση» → Paylaş → Yazdır → PDF olarak kaydet; sayfa düzgün mü? Önceki Yunanca sözcük soruları (veresiye ve kasa fiyatı) hâlâ cevabını bekliyor.

PR: https://github.com/seaevill/Aloni/pull/608 (birleşti, main `db17dc7`). Bugünkü kod işi: 4/12. Birleşti ≠ canlıda: bu ortamdan canlı adres doğrulanamaz.

## 2026-11-27 12:25 Atina — yönetici koşusu 20261127-1010
1. **Uygulamada ne değişti:** Άλλα → Ταμείο ekranında satış kaydına «Κλούβες» (kasa sayısı) alanı geldi. Aynı müşteriye aynı ürünü daha önce sattıysan formda «Προηγούμενη τιμή: … ανά κλούβα» (önceki kasa fiyatı) önerisi görünür; tutar ancak «Χρήση» düğmesine basarsan dolar, kaydı yine sen yaparsın. Daha önce satış yoksa öneri hiç çıkmaz; fiyat uydurulmaz, yuvarlanmaz. Bilgi yalnızca telefonda tutulur.
2. **Senin için faydası:** Her müşteriye geçen sefer kasayı kaça verdiğini hatırlamak zorunda kalmazsın; tek dokunuşla aynı fiyatı kullanır ya da değiştirirsin.
3. **Ne denendi, ne başarısız oldu:** Birim testleri 913 geçti (0, eksi, 2,5 kasa, harf, çok büyük sayı gibi yanlış girişleri deneyen testler dahil), kod denetimleri temiz, Ταμείο ekran testleri bilgisayarda geçti. Bekçi testleri kendisi tekrar çalıştırdı: ilk denetimde ONAY. GitHub'daki tüm kontroller (telefon ekranı testleri 3 parça, SQL, Cloudflare derlemesi) yeşil. Başarısız olan yok. Ekran resmi alınmadı.
4. **Önerim:** sıradaki iş is-2d: muhasebeci için PDF dışa aktarım (is-2c'den ayrılan kalan parça).
5. **Senden gereken karar:** Yeni Yunanca sözcükler uygun mu: «Κλούβες», «Προηγούμενη τιμή: … ανά κλούβα», «Χρήση»? (Önceki veresiye sözcükleri de hâlâ onay bekliyor.) Uygunsa «tamam» yaz, değilse kendi sözcüğünü söyle.

PR: https://github.com/seaevill/Aloni/pull/606 (birleşti, main `f7ac9ac`). Bugünkü kod işi: 3/12. Birleşti ≠ canlıda: bu ortamdan canlı adres doğrulanamaz.

## 2026-11-27 11:40 Atina — yönetici koşusu 20261127-0918
1. **Uygulamada ne değişti:** Άλλα → Ταμείο ekranında veresiye: bir satış kaydına müşteri seçilebiliyor ve «Δεν πληρώθηκε ακόμα» (henüz ödenmedi) işaretlenebiliyor. Bu kayıtlar «Απλήρωτο» etiketiyle görünür; ekranda yeni «Απλήρωτα από πελάτες» kartı müşteri müşteri ödenmeyen toplamı gösterir. Para gelince «Πληρώθηκε» düğmesi bir düzeltme satırı yazar; gelir yine satış gününde, bir kez sayılır. Bilgi yalnızca telefonda tutulur (senin kararın).
2. **Senin için faydası:** Kimin sana ne kadar borcu olduğunu deftere bakmadan tek ekranda görürsün; ödeme gelince tek dokunuşla kapatırsın, yıl toplamı bozulmaz.
3. **Ne denendi, ne başarısız oldu:** Birim testleri 902 geçti (müşterisiz veresiye, gidere veresiye gibi yanlış kullanımları deneyen testler dahil), kod denetimleri temiz; yeni ekran testi bilgisayarda geçti. Bekçi ilk denetimde RED verdi: yeni Yunanca sözcükler terim sözlüğünde yoktu ve sana soru olarak yazılmamıştı. Soru eklendi, ikinci denetimde ONAY. GitHub'daki tüm kontroller (telefon ekranı testleri 3 parça, SQL, Cloudflare derlemesi) yeşil. Ekran resmi alınmadı.
4. **Önerim:** sıradaki iş is-2c: müşteri ve ürüne göre kasa fiyatı geçmişi (son fiyat önerilir, sen onaylarsın), sonra muhasebeci için PDF.
5. **Senden gereken karar:** Yunanca sözcükler uygun mu: «Δεν πληρώθηκε ακόμα», «Απλήρωτο», «Απλήρωτα από πελάτες», «Πληρώθηκε»? Uygunsa «tamam» yaz, değilse kendi sözcüğünü söyle.

PR: https://github.com/seaevill/Aloni/pull/604 (birleşti, main `2ff294c`). Bugünkü kod işi: 2/12. Birleşti ≠ canlıda: bu ortamdan canlı adres doğrulanamaz.

## 2026-11-27 08:39 Atina — yönetici koşusu 20261127-0639
1. **Uygulamada ne değişti:** Άλλα → Ταμείο ekranına yeni düğme: «CSV για τον λογιστή». Seçili yılın kayıtlarını muhasebeciye verilecek bir dosyaya indirir (düzeltilen kayıt bir kez, iptal edilen hiç yok; tutarlar kuruşu kuruşuna, ondalık virgülle). Dosyanın ilk satırı: «Προσωπικό βιβλίο εσόδων–εξόδων {yıl}, όχι λογιστικά βιβλία.» (kişisel defter, resmî muhasebe değil).
2. **Senin için faydası:** Yıl sonunda gelir-gideri elle yazmadan muhasebeciye tek dosya gönderebilirsin; Excel'de açılır.
3. **Ne denendi, ne başarısız oldu:** Birim testleri 893 geçti (dosyaya kötü niyetli formül sızmasını deneyen testler dahil), kod denetimleri temiz. Bekçi testleri kendisi tekrar çalıştırdı: ONAY. GitHub'daki tüm kontroller (telefon ekranı testleri 3 parça, SQL, Cloudflare derlemesi) yeşil. Başarısız olan yok. Telefon ekranında görüntü (ekran resmi) alınmadı.
4. **Önerim:** is-2'nin sıradaki parçası: müşteriye göre kasa fiyatı geçmişi (kayıt sırasında son fiyat önerilir, sen onaylarsın), sonra veresiye, en son PDF.
5. **Senden gereken karar:** Kasa fiyatı ve veresiye bilgisi yalnızca telefonda mı tutulsun (hızlı, sunucuya dokunmaz), yoksa sunucuda mı (birden çok telefonda görünür, ama SQL değişikliği ve senin onayın gerekir)?

PR: https://github.com/seaevill/Aloni/pull/601 (birleşti, main `452c53e`). Birleşti ≠ canlıda: canlı adreste görmek için yayının tamamlanması gerekir; bu ortamdan doğrulanamaz.

## 2026-11-27 03:00 — gece koşusu (otomatik)
- **Tamamlanan iyileştirmeler:** uygulama kodu değişmedi. Kuyrukta (QUEUE.md) yapılacak `todo` iş yok; bu yüzden yalnızca kayıt tuttum.
- **PR'lar:** bu belge PR'ı (yalnız docs/autopilot).
- **CI:** main `0549c91` (#583) — check, sql, static, e2e 1/2/3, Workers Builds **yeşil**.
- **Cloudflare önizleme:** yok (kod değişmedi).
- **Görünen değişiklik:** telefonda yok.
- **Kalan sorunlar:** dün 16:16 UTC'de main'de (#591) SQL testi `m18_job_board.sql:90` bir kez düştü, sonraki tüm koşular yeşil. Muhtemel neden (kanıtlanmadı): test, sunucu boştaymış gibi varsayıyor; senkron `pull` o anda açık başka bir işlem varken yeni yazılan satırı bilerek bir sonraki çekmeye bırakıyor. Düzeltme yalnız test dosyasında (`supabase/tests/`), ama o klasöre giden PR'ı gece vardiyası birleştiremez. Kayıt: QUEUE 2b, BLOCKERS. `labeluse:118` testi #594 ile güçlendirildi, izlemede.
- **Sıradaki öncelik:** kuyruğa yeni iş girene kadar gece koşuları yalnız main'in yeşil olduğunu kontrol eder.
- **Bora'dan karar:** (a) m18 test düzeltmesini etkileşimli oturum mu yapsın? (b) 0042 yüklemesi («yükleme tamam»). (c) Gece vardiyası `takimlar/aloni-gelistirme/durum.json` listesindeki işleri (is-1, is-2) de alsın mı? Şu an almıyor: o liste doğrulanmamış (`dogrulandi: false`) ve büyük özellik işleri.

## 2026-11-26 07:00 — ALONI — NIGHT SHIFT RESULTS (sabah doğrulaması, otomatik)
Kaynak: GitHub REST (07:03 İstanbul). Tahmin yok; «birleşti» ≠ «canlıda».

**1. Neler somut olarak iyileşti** — Gece 2 küçük iş birleşti (QUEUE 17 ve 17b, bağımsız incelemenin S5–S7 maddeleri): parsel «Χρονολόγιο»su tarihsiz hasatları da gösteriyor ve 20 kayıt sınırını ekranda söylüyor; «Τελευταίοι ψεκασμοί» altında arşivlenmiş ekimlerdeki ilaçlamaların nerede olduğu yazıyor. 02:00–06:00 arası yeni iş yapılmadı: kuyrukta `todo` iş kalmamıştı (QUEUE 14 Bora'yı bekliyor).

**2. Görsel değişiklikler (375 px)**
- Tarihsiz hasat: `docs/design/timeline-undated-after-375.png` (öncesi yok: önceden satır hiç görünmüyordu)
- 20 kayıt sınırı notu: `docs/design/timeline-cap-after-375.png`
- Arşiv ilaçlamaları satırı: `docs/design/sprays-archived-before-375.png` → `docs/design/sprays-archived-after-375.png`

**3. İşlevsel değişiklikler** — #572: tarihsiz hasat «— άγνωστο» tarihiyle listenin sonunda; `crop-targets-server.spec.ts` soğuk açılışa geçti (yarış düzeltmesi, test gevşetilmedi). #573: yeni çeviri anahtarı `detail.sprays.archived` (el/tr/en); bekleme süresi hesabı değişmedi; taşınan ekimin geçmişinin onunla gittiği birim testiyle sabitlendi. Özellik silinmedi (PR açıklamalarına göre).

**4. Birleşen PR'lar (son 14 saat)**
- Gece (autopilot): #572, #573 — ikisinin de son commit'inde check, sql, static, e2e 1/2/3, pr-size, Workers Builds **yeşil**.
- Akşam (etkileşimli oturum, 17:00–22:00 İstanbul): #566, #567, #568 (0042 telefon tarafı, uyuyan), #500 (SQL 0042 — **birleşti, UYGULANMADI**; yalnız Bora uygular), #504 (verimlilik), #569 (parsel zaman çizelgesi, #507'nin yerine), #570 (Σήμερα 8c), #571 (STATUS/kararlar).
- Ana dal `b2a6646` (#573): check, sql, static, e2e 1/2/3, Workers Builds — **hepsi yeşil** (pr-size: atlandı, normal).

**5. Açık PR'lar** — yalnız #508 (araştırma, açık kalıyor, dokunulmadı): check/sql/static/e2e yeşil; «Workers Builds: aloni» **kırmızı** (eski derleme; araştırma PR'ı, incelenmedi). #512 (Dependabot) 25 Kas 09:20 UTC'de birleşmeden kapatılmış.

**6. Testler** — Gece PR'larının ve ana dalın tüm CI işleri geçti; kırmızı e2e iş yok, bu yüzden FAILURE CONTEXT sınıflandırması gerekmedi. Yerelde (01:00 koşusu): vitest 857 geçti, tsc/eslint temiz, ilgili Playwright 6/6.

**7. Cloudflare önizleme bağlantıları** (açılışı doğrulanmadı; bu ortamdan workers.dev açılamıyor)
- #572: https://autopilot-20261126-00-timeline-undated-aloni.ormanbora.workers.dev (botun PR yorumundan) · panel: https://dash.cloudflare.com/95b3c021891c1ac025fc5a028ac5a2b7/workers/services/view/aloni/production/previews/autopilot-20261126-00-timeline-undated/builds/95859a23-d172-4b95-a742-c7cae248e48b
- #573: botun PR yorumunda adres yok · panel: https://dash.cloudflare.com/95b3c021891c1ac025fc5a028ac5a2b7/workers/services/view/aloni/production/previews/autopilot-20261126-01-archived-sprays/builds/71f14c09-02af-48e6-8508-0772c31e07d9
- Canlı adres (önizleme DEĞİL): https://aloni.ormanbora.workers.dev

**8. Engellenenler** — Kilit yok (eski kilit yok). QUEUE 14: Bora 0042'yi «Supabase migrate (manual)» ile uygulayıp «yükleme tamam» diyene kadar bekliyor. Kuyrukta başka `todo` yok → gece koşuları yeni iş bulamıyor; yeni öncelikler QUEUE.md'ye eklenmeli. Canlı doğrulama yalnızca Bora'da.

**9. Bora telefonda önce neye baksın** (canlı adreste, yayın tamamlandıysa)
1. Χωράφια → bir parsel → «Χρονολόγιο»: tarihsiz bir hasat «— άγνωστο» ile en altta mı? Uzun listede «Εμφανίζονται οι 20 πιο πρόσφατες καταγραφές.» yazıyor mu?
2. Arşivlenmiş ekimi olan bir parselde «Τελευταίοι ψεκασμοί» altında «Ψεκασμοί σε αρχειοθετημένες φυτεύσεις (…) δεν εμφανίζονται εδώ· είναι στο Χρονολόγιο.» satırı var mı?
3. Σήμερα: bir kayıttan sonra «Αποθηκεύτηκε στο τηλέφωνο…» artık bir kez mi görünüyor (#570)?

**Sıradaki öncelik:** QUEUE 14 (0042 uygulandıktan sonra). **Bora'dan karar:** 0042'yi ne zaman uygulayacağı; gece için yeni iş listesi.

## 2026-11-26 01:00 — gece koşusu (otomatik)
**Tamamlanan iyileştirmeler:** QUEUE 17b (bağımsız incelemenin S6 ve S7 maddeleri).
**PR'lar:** #573 — uygulandı · test edildi (birleşme durumu PR'da; CI sonucuna bağlı).
**CI:** yerelde tsc, tüm vitest (151 dosya, 857 geçti), eslint ve ilgili Playwright testleri (6/6) geçti; GitHub sonuçları PR #573'te.
**Cloudflare önizleme:** adres yalnız botun PR yorumundan alınır; açılışı doğrulanmadı.
**Görünen değişiklik:** Χωράφια → parsel → «Τελευταίοι ψεκασμοί»: arşivlenmiş bir ekimde yapılmış ilaçlamalar bu listede (önceden olduğu gibi) yok, ama altında artık kaç tane olduğu ve «Χρονολόγιο»da yer aldıkları yazıyor. Ekran görüntüleri: `docs/design/sprays-archived-before-375.png` → `docs/design/sprays-archived-after-375.png`. Taşınan bir ekimin geçmişinin yeni parsele gittiği test ile sabitlendi (ekranda değişiklik yok).
**Kalan sorunlar:** tüm ilaçlamalar arşivlenmiş ekimlerdeyse liste hâlâ «Δεν υπάρχουν ψεκασμοί ακόμα.» diyor; yeni satır hemen altında açıklıyor. «Τελευταίος ψεκασμός» özet bilgisi değişmedi.
**Sıradaki öncelik:** kuyrukta `todo` iş kalmadı (yalnız sürekli bakım #9). QUEUE 14 Bora'nın 0042 onayını bekliyor.
**Bora'dan karar:** yok.

## 2026-11-26 00:00 — gece koşusu (otomatik)
**Tamamlanan iyileştirmeler:** QUEUE 17 ilk dilim (bağımsız incelemenin S5 maddesi + liste sınırı notu).
**PR'lar:** #572 — uygulandı · test edildi · birleşti · derlendi (Cloudflare build ok). Canlıda doğrulanmadı.
**CI:** #572 başında check, sql, static, e2e 1/2/3, pr-size, Workers Builds — hepsi yeşil.
**Cloudflare önizleme:** panel bağlantısı https://dash.cloudflare.com/95b3c021891c1ac025fc5a028ac5a2b7/workers/services/view/aloni/production/previews/autopilot-20261126-00-timeline-undated/builds/321456b1-e3b7-42ef-9b4f-b3bf0aaac259 ; önizleme adresi yalnız botun PR yorumundan alınır, açılışı doğrulanmadı.
**Görünen değişiklik:** Χωράφια → parsel → «Χρονολόγιο»: tarihi olmayan bir hasat kaydı (Παραγωγικότητα zaten sayıyordu) artık listenin sonunda «— άγνωστο» tarihiyle görünüyor. Liste uzunsa altında «Εμφανίζονται οι 20 πιο πρόσφατες καταγραφές.» yazıyor. Ekran görüntüleri: `docs/design/timeline-undated-after-375.png`, `docs/design/timeline-cap-after-375.png`.
**Ek düzeltme (test):** İkinci CI turunda `crop-targets-server.spec.ts` bir kez kırmızı oldu (kod değişmemişti; hata bağlamı: sayfa Σήμερα'da kaldı, ürün kartı açılmadı). Kök neden: test adresi aynı sayfada değiştirip yeniden yüklüyordu; başlangıçtaki bir işlem adresi geri yazabiliyor (crate-label testinde belgelenen aynı yarış). Test artık adresi soğuk açıyor ve kartın açıldığını bekliyor; yerelde 12/12 geçti. Uygulama kodu değişmedi; testler gevşetilmedi.
**Kalan sorunlar:** 20'den fazla tarihli kayıt varsa tarihsiz hasat sınırın dışında kalabilir (not bunu söylüyor). S6 ve S7 → QUEUE 17b.
**Sıradaki öncelik:** QUEUE 17b. QUEUE 14 Bora'nın 0042 onayını bekliyor.
**Bora'dan karar:** yok.

## 2026-11-25 07:00 — ALONI — NIGHT SHIFT RESULTS (sabah doğrulaması, otomatik)
Kaynak: GitHub REST (07:03 İstanbul). Tahmin yok; «birleşti» ≠ «canlıda».

**1. Neler somut olarak iyileşti** — Gece 6 iş birleşti (QUEUE #5, #6, #6b, #7, #8, #8b): Χωράφια parsel detayı ana bilgilerle açılıyor; kayıtlar «telefonda» olduğunu söylüyor; ilk açılış ~11 kB (gzip) daha hafif; işçi ekranında 72 px düğmeler; Σήμερα'da kayıt onayı ilk ekranda.

**2. Görsel değişiklikler (önce → sonra, 375 px)**
- Parsel detayı: `docs/design/screenshots-2026-11-25/parcel-detail-before-375.png` → `parcel-detail-after-375.png` (320/390 de var)
- Hasat sonrası «telefonda» satırı: `docs/design/screenshots-2026-11-25/saved-where/harvest-saved-before-375.png` → `harvest-saved-after-375.png`
- Geri-al bildirimi: `docs/design/offline-undo-where-before-375.png` → `offline-undo-where-after-375.png`
- İşçi ekranı: `docs/design/worker-targets-before-harvest-375.png` → `worker-targets-after-harvest-375.png`; `worker-targets-before-jobs-375.png` → `worker-targets-after-jobs-375.png`
- Σήμερα onayı: `docs/design/today-feedback-before-375.png` → `today-feedback-after-375.png`
- #550 (ilk açılış): görsel değişiklik yok.

**3. İşlevsel değişiklikler** — #550: Άλλα alt ekranları (Μητρώο, Παραγγελίες, Πελάτες, Εργάτες, Πληροφορίες, Εβδομαδιαία αναφορά) ayrı parçalar, ilk ekrandan sonra arka planda yükleniyor. Diğerleri yerleşim/yazı; yeni çeviri anahtarı yok, özellik silinmedi (PR açıklamalarına göre).

**4. Birleşen PR'lar (son 14 saat)** — hepsinde check, sql, static, 3 e2e parçası, Workers Builds **yeşil**:
- #547 Χωράφια parsel detayı · #548 Σήμερα «telefonda» satırı · #549 geri-al + Φωτογραφίες «telefonda» · #550 ilk açılış hafifledi · #551 işçi ekranı 72 px · #552 Σήμερα onayı ilk ekranda
- Ana dal `5ef162c` (#552): check, sql, static, e2e 1/2/3, Workers Builds — **hepsi yeşil**.

**5. Açık PR'lar** — #460, #484, #485, #500 (SQL), #504, #507, #508: bekletilenler (QUEUE), dokunulmadı. Hepsinde check/e2e yeşil, «Workers Builds: aloni» kırmızı (eski derlemeler, bu gece incelenmedi). #512 Dependabot (23 Kas): check/static/e2e **kırmızı** → aşağıda.

**6. Testler** — Gece PR'larının ve ana dalın tüm CI işleri geçti; kırmızı e2e yok. Yerelde bilinen `icon-192` ortam hatası CI'da yok. Kırmızı tek PR #512:
- `static` FAILURE CONTEXT: `tests/unit/cx-content-qa.test.ts(36,21): error TS2339: Property 'createSourceFile' does not exist on type 'typeof import(".../typescript/lib/version")'` (ve benzerleri).
- `e2e (shard 2/3)`: `Error: Process from config.webServer was not able to start. Exit code: 1`.
- Sınıf: **GERÇEK UYGULAMA/DERLEME HATASI** (altyapı değil): güncellemedeki yeni TypeScript sürümü, testin `typescript` içe aktarma biçimini bozuyor; derleme olmayınca e2e sunucusu da başlamıyor. Ana dalı etkilemiyor.

**7. Cloudflare önizleme bağlantıları** — Cloudflare botunun PR yorumunda görünen adresler (bu ortamdan açılamadı, doğrulanmadı):
- #548: https://autopilot-20261125-02-offline-saved-where-aloni.ormanbora.workers.dev
- #552: https://autopilot-20261125-06-today-audit-aloni.ormanbora.workers.dev
- #547, #549, #550, #551: herkese açık adres alınamadı; panel: https://dash.cloudflare.com/95b3c021891c1ac025fc5a028ac5a2b7/workers/services/view/aloni/production/previews/autopilot-20261125-01-parcel-key-facts/builds/beaaa3b8-4e35-402b-84f4-d5e8c20aa618 · …/previews/autopilot-20261125-03-offline-undo-where/builds/fdc8ed0a-9870-4882-b4bd-27d24cb94027 · …/previews/autopilot-20261125-04-lazy-screens/builds/50dec9c2-f2c2-4ea3-8074-21f84ab7b9bf · …/previews/autopilot-20261125-05-worker-targets/builds/bbbd7722-5490-44ab-9be3-361ae5e41df2
- Adres biçimi `<dal-adı>-aloni.ormanbora.workers.dev` artık botun yorumuyla görülüyor. Canlı adres (önizleme DEĞİL): https://aloni.ormanbora.workers.dev

**8. Engellenenler** — Kilit yok (eski kilit yok). #512 Dependabot TypeScript uyumsuzluğu (düzeltme gerek: test, `typescript` içe aktarmasını yeni sürüme uydurmalı; ya da TypeScript bu gruptan çıkarılmalı). Canlı doğrulama yalnızca Bora'da.

**9. Bora telefonda önce neye baksın** (canlı adreste, yayın tamamlandıysa)
1. Σήμερα: bir hasat kaydet → «Η συγκομιδή καταγράφηκε.» başlığın hemen altında mı?
2. Χωράφια → bir parsel: Εμβαδόν, Κοπή από…, Τελευταίος ψεκασμός en üstte mi?
3. Άλλα → Προβολή εργάτη: düğmeler eldivenle rahat mı?
4. Uçak modunda bir kayıt: «Αποθηκεύτηκε στο τηλέφωνο…» yazıyor mu? (Bilinen: Σήμερα'da bu cümle iki kez görünebilir → QUEUE #8c.)

**Sıradaki öncelik:** QUEUE #8c (çift «telefonda» cümlesi). **Bora'dan karar:** #512'nin (bağımlılık güncellemesi) düzeltilip düzeltilmeyeceği.

## 2026-11-25 06:00 (gece vardiyası, otomatik) — Σήμερα: kayıt onayı ilk ekranda
- **Tamamlanan iyileştirme:** QUEUE #8b (ilk dilim) — ilaçlama, hasat, iş veya gözlem kaydedip Σήμερα'ya dönünce «Η συγκομιδή καταγράφηκε.» gibi onay yazısı (ve altındaki «telefonda» satırı) artık başlığın hemen altında, ilk ekranda. Önceden hava durumu ve «Αύριο φεύγουν» bölümünün altında, ekranın çok aşağısındaydı; kaydırmadan görünmüyordu.
- **PR:** #552 — uygulandı, test edildi. Birleşme durumu PR'da (CI kapıları).
- **Önce/sonra (375 px, gerçek çiftlik, hasat + gözlem sonrası, sayfa başı):** `docs/design/today-feedback-before-375.png` → `docs/design/today-feedback-after-375.png`. 320/375/390'da yatay kaydırma yok.
- **Özellik kaybı yok:** yazılar, test kimlikleri aynen; yalnızca yerleri değişti; yeni çeviri anahtarı yok.
- **Testler (yerel):** yeni e2e `today-feedback.spec.ts` önce kırmızı, sonra yeşil; vitest tamamı 810 geçti; tsc, eslint temiz; Σήμερα/hasat/ilaçlama/iş ile ilgili 22 Playwright testinden 19'u geçti, 3'ü (çevrimdışı) yalnızca bilinen `icon-192` ortam hatasıyla, tüm kontrolleri geçtikten sonra düştü. Karar CI'da (WebKit).
- **Cloudflare önizleme:** herkese açık adres doğrulanamıyor; panel bağlantısı PR'ın «Workers Builds» kontrolünde.
- **Kalan sorun:** kayıttan sonra ilk ekranda «Αποθηκεύτηκε στο τηλέφωνο…» cümlesi iki kez görünüyor (üstteki genel durum şeridi + onayın altı) → QUEUE #8c.
- **Sıradaki öncelik:** 07:00 sabah doğrulaması; sonra QUEUE #8c.
- **Bora'dan karar:** yok.

## 2026-11-25 05:00 (gece vardiyası, otomatik) — işçi ekranında büyük düğmeler
- **Tamamlanan iyileştirme:** QUEUE #8 — işçi ekranında (Άλλα → Προβολή εργάτη) eldivenle basılacak düğmeler 72 px'e çıktı: «Τα δεδομένα σας» başlığı (önceden 22 px'lik ince bir yazı satırıydı, şimdi 72 px'lik basılabilir satır, ▼ işareti duruyor), Συγκομιδή sekmesindeki «Αποθήκη / Απευθείας φόρτωση» seçimi ve «Ακύρωση», ve en alttaki «Έξοδος από την προβολή εργάτη» (hepsi 56 → 72 px). Sahibin kendi hasat formu değişmedi.
- **PR:** #551 — uygulandı, test edildi. Birleşme durumu PR'da (CI kapıları).
- **Önce/sonra (375 px, Demo, işçi görünümü):** `docs/design/worker-targets-before-harvest-375.png` → `docs/design/worker-targets-after-harvest-375.png`, `docs/design/worker-targets-before-jobs-375.png` → `docs/design/worker-targets-after-jobs-375.png`.
- **Yeni test:** 320/375/390 px'de, Yunanca ve Hintçe, üç sekmede: yatay kaydırma yok, işçinin düğmeleri ≥72 px, diğer tüm hedefler ≥56 px. Düzeltmeden önce kırmızıydı (22 px başlık), sonra yeşil.
- **Testler (yerel):** vitest tamamı 810 geçti; tsc, eslint temiz; işçi/hasat/yarın notları dahil 29 Playwright testinden 28'i geçti, `workers.spec` yalnızca bilinen `icon-192` ortam hatasıyla düştü. Karar CI'da (WebKit).
- **Sahip verisi:** işçi ekranında sahip sekmelerinin olmaması zaten `worker-view.spec` ile test ediliyor; değişmedi.
- **Kalan sorun:** «Αύριο» notlarının düğmesi ve zil 56 px kaldı (sahiple ortak bileşenler, uygulama genelindeki 56 px sınırını karşılıyor).
- **Sıradaki öncelik:** QUEUE #8b — Σήμερα gözden geçirme.
- **Bora'dan karar:** yok.

## 2026-11-25 04:00 (gece vardiyası, otomatik) — ilk açılış daha hafif
- **Tamamlanan iyileştirme:** QUEUE #7 — uygulamanın ilk indirilen kodu küçüldü: Άλλα içindeki Μητρώο, Παραγγελίες, Πελάτες, Εργάτες, Πληροφορίες ve Εβδομαδιαία αναφορά ekranları ilk paketten çıkarıldı (ana paket gzip 199,6 kB → 188,2 kB, yaklaşık −11 kB). Bu ekranlar ilk ekran açıldıktan hemen sonra, internet varken arka planda yükleniyor; böylece sonra sinyal gitse de açılıyorlar.
- **PR:** #550 — uygulandı, test edildi. Birleşme durumu STATE.md'de.
- **Görünen değişiklik:** yok (ekranlar aynı). İlk açılış yavaş bağlantıda biraz daha hızlı olmalı; ölçüm yalnızca dosya boyutu, telefonda süre ölçülmedi.
- **Özellik kaybı yok:** hiçbir ekran, düğme, test kimliği veya çeviri silinmedi; yeni çeviri anahtarı yok. Bütçe sınırı değiştirilmedi.
- **Testler (yerel):** yeni e2e (servis çalışanı kapalı = ilk oturum, sonra uçak modu, altı ekran açılıyor) ön-yükleme kapalıyken kırmızı, açıkken yeşil; vitest tamamı 810 geçti; tsc, eslint temiz; ilgili 20 Playwright testi geçti; `workers.spec` yerelde yalnızca bilinen `icon-192` ortam hatasıyla düştü. Karar CI'da (WebKit).
- **Cloudflare önizleme:** herkese açık adres doğrulanamıyor; panel bağlantısı PR'ın «Workers Builds» kontrolünde.
- **Kalan sorun:** ilk oturumda ön-yükleme bitmeden (ilk ekrandan 1–2 saniye sonra) sinyal giderse bu altı ekran açılmaz, «Δοκιμή ξανά» düğmesi çıkar; sinyal gelince açılır.
- **Sıradaki öncelik:** QUEUE #8 — işçi ekranı (72 px düğmeler, dil, sahip verisi görünmemesi).
- **Bora'dan karar:** yok.

## 2026-11-25 03:00 (gece vardiyası, otomatik) — geri-al bildirimleri de «telefonda» diyor
- **Tamamlanan iyileştirme:** QUEUE #6b — yeni bir χωράφι, φύτευση, προϊόν, ετικέτα, εργάτης veya ανάλυση kaydedilince alttaki siyah «Αναίρεση» bildiriminde, eski yazının altına kaydın nerede olduğu yazılıyor: «Αποθηκεύτηκε στο τηλέφωνο. Θα σταλεί όταν συνδεθεί λογαριασμός.» Άλλα → Φωτογραφίες ekranında da «Η φωτογραφία αποθηκεύτηκε.» altında aynı satır var. Demo çiftliğinde satır yok.
- **PR:** #549 — uygulandı, test edildi. Birleşme durumu PR'da (CI kapıları).
- **Özellik kaybı yok:** bildirim yazıları ve «Αναίρεση» aynen; arşivleme bildirimleri değişmedi; yeni çeviri anahtarı yok.
- **Önce/sonra (375 px, uçak modu, parsel kaydı):** `docs/design/offline-undo-where-before-375.png` → `docs/design/offline-undo-where-after-375.png`. 320/375/390'da yatay kaydırma yok.
- **Testler (yerel):** yeni e2e önce kırmızı, sonra tüm kontrolleri geçti; vitest tamamı 810 geçti; tsc, eslint temiz. Çevrimdışı testler yerelde yalnızca bilinen `icon-192` ortam hatasıyla düşüyor; karar CI'da (WebKit).
- **Cloudflare önizleme:** herkese açık adres doğrulanamıyor; panel bağlantısı PR'ın «Workers Builds» kontrolünde.
- **Kalan sorun:** hasat formundaki «N κλούβες» satırı değişmedi (bu satır yalnızca işçi ekranında çıkıyor ve orada «telefonda» satırı zaten var).
- **Sıradaki öncelik:** QUEUE #7 — ilk açılış boyutu.
- **Bora'dan karar:** yok.

## 2026-11-25 02:00 (gece vardiyası, otomatik) — çevrimdışı kayıt ifadesi
- **Tamamlanan iyileştirme:** QUEUE #6 (ilk dilim) — Σήμερα ekranında ilaçlama, hasat, iş ve gözlem kaydedildiğinde mevcut onay yazısının altına kaydın **nerede** olduğu yazılıyor: «Αποθηκεύτηκε στο τηλέφωνο. Θα σταλεί όταν συνδεθεί λογαριασμός.» Eşitleme açıkken ve kayıt bekliyorsa «Αποθηκεύτηκε · θα σταλεί όταν έχει σήμα»; gönderildiyse ek satır yok. Demo çiftliğinde bu satır hiç çıkmıyor (Demo hiçbir yere gönderilmez).
- **PR:** #548 — uygulandı, test edildi. Birleşme durumu PR'da (CI bekleniyor).
- **Özellik kaybı yok:** eski onay yazıları aynen duruyor; yeni çeviri anahtarı yok (var olanlar kullanıldı).
- **Önce/sonra (320/375/390 px, gerçek çiftlik, uçak modu, hasat sonrası):** `docs/design/screenshots-2026-11-25/saved-where/`. Yatay kaydırma yok.
- **Testler (yerel):** yeni birim testi önce kırmızı sonra yeşil; vitest tamamı 810 geçti; tsc, eslint temiz; ilgili 21 Playwright testi geçti. 2 çevrimdışı test yerelde yalnızca bilinen `icon-192` ortam hatasıyla düşüyor (tüm kontrolleri geçtikten sonra); karar CI'da (WebKit).
- **Cloudflare önizleme:** herkese açık adres doğrulanamıyor; panel bağlantısı PR'ın «Workers Builds» kontrolünde.
- **Kalan sorun:** geri-al bildirimleri (parsel, ekim, ürün, etiket, işçi, analiz), hasat formundaki «N κλούβες» satırı ve fotoğraflar henüz bu satırı göstermiyor → QUEUE #6b.
- **Sıradaki öncelik:** QUEUE #6b.
- **Bora'dan karar:** yok.

## 2026-11-25 01:00 (gece vardiyası, otomatik) — Χωράφια parsel detayı
- **Tamamlanan iyileştirme:** QUEUE #5 — parsel detayı artık adın hemen altında üç ana bilgiyle açılıyor: **Εμβαδόν**, hasat bekleme satırı (**Κοπή από …**; bilinmiyorsa kırmızı çerçeve aynen duruyor) ve **Τελευταίος ψεκασμός** (ürün · tarih). Önceden bekleme ve son ilaçlama çizimin, bitki etiketlerinin ve bilgi kartının altında, ilk ekranın dışındaydı.
- **PR:** #547 — uygulandı, test edildi. Birleşme durumu bir sonraki bölümde/STATE.md'de.
- **Özellik kaybı yok:** çizim, bitki etiketleri, Τοπογραφία/Υψόμετρο/ΟΣΔΕ, ΚΑΕΚ, kesim kayıtları, hava, ekimler, tarla işleri, su, «Τελευταίοι ψεκασμοί» listesi, geçmiş, analizler, düzenleme yerinde. Εμβαδόν alttaki karttan üste taşındı (iki kez görünmüyor). Yeni çeviri anahtarı yok.
- **Önce/sonra (320/375/390 px, Demo çiftliği, Κάτω Κάμπος):** `docs/design/screenshots-2026-11-25/parcel-detail-{before,after}-*.png`. Yatay kaydırma yok.
- **Testler (yerel):** yeni e2e önce kırmızı, sonra yeşil (3/3); tsc, vitest tamamı (806), eslint temiz; ilgili 42 Playwright testi geçti (chromium). WebKit yalnızca CI'da.
- **Cloudflare önizleme:** herkese açık adres doğrulanamıyor; panel bağlantısı PR'ın «Workers Builds» kontrolünde.
- **Kalan sorun (eski):** 320 px'te alt menüde «Χωράφια» yazısı iki satıra kayıyor (bu PR'dan önce de vardı).
- **Sıradaki öncelik:** QUEUE #6 — çevrimdışı yazma denetimi.
- **Bora'dan karar:** yok.

## 2026-11-24 gece (etkileşimli oturum) — ALONI NIGHT SHIFT, ilk iki ekran
- **Birleşti (canlıda DEĞİL):** #544 Αποθήκη — «Υπόλοιπο» artık her ürün kartında adın hemen altındaki ilk satır, başlık boyutunda (22 px). #545 Φυτά — arama kutusunun ipucu yazısı telefonda kesiliyordu; arama tam satır aldı, ipucu kısaldı, «Ημερολόγιο σεζόν» düğmesi listenin sonuna taşındı. İlk ekranda hâlâ 6 bitki satırı.
- **Önce/sonra (320/375/390 px, Demo çiftliği):** `docs/design/screenshots-2026-11-24/stock-p3/` ve `crops-p3/`. Üç genişlikte de yatay kaydırma yok.
- **Testler:** CI tamamen yeşil (check, sql, static, 3 WebKit e2e, pr-size, Workers Builds) her iki PR'da. Yerelde stock.spec/products.spec offline testleri `icon-192.png` hatasıyla düşüyor; temiz main'de de aynı (ortam sorunu, CI yeşil).
- **Cloudflare:** derleme başarılı; herkese açık önizleme adresi alınamadı (doğrulanmadı). Panel bağlantıları: #544 https://dash.cloudflare.com/95b3c021891c1ac025fc5a028ac5a2b7/workers/services/view/aloni/production/previews/claude-stock-balance-first/builds/10a19ee1-8ce6-4d70-ae1a-3bb529af0f62 · #545 https://dash.cloudflare.com/95b3c021891c1ac025fc5a028ac5a2b7/workers/services/view/aloni/production/previews/claude-crops-rhythm/builds/ae3f3123-f09a-486d-9767-2cc9cd9dfbd0
- **Telefonda önce bak:** Αποθήκη (kart başına büyük «Υπόλοιπο»), Φυτά (arama ipucu tam görünüyor).
- **Sıradaki:** QUEUE #5 Χωράφια parsel detayı (üç ana bilgi önce), sonra Σήμερα incelemesi. Gece rutini 00:00'dan itibaren devam eder.

## 2026-11-24 gece — Αποθήκη ve simülasyonlar
- **Birleşti (canlıda DEĞİL):** #541 — Αποθήκη ürün kartında başlık tek satır (ad + ⓘ), bakiye en güçlü satır. CI tamamen yeşil (check, sql, static, 3 WebKit e2e, pr-size, Workers Builds). Özellik kaybı yok; Demo sayfası 8293 → 7219 px.
- **Simülasyon A (saat 07 dalı) — doğrulandı:** geliştirme yapmadan Türkçe rapor üretti, kilit almadı, yalnızca docs PR'ı planladı, QUEUE'daki done/monitor satırlarını tekrar etmedi.
- **Simülasyon B (çökmüş koşu, eski kilit) — doğrulandı:** 90 dakikadan genç kilitte durdu; eski olsaydı kırmızı PR'ın FAILURE CONTEXT'ini okuyup devam edecekti, sıfırdan başlamayacaktı. Not: kilit adındaki saat ile zaman damgası tutarsız olabilir; kural gereği ISO zaman geçerli.
- **Hâlâ gerçek kanıt bekleyen:** bu gece 00:00 ve yarın 07:00 koşuları.
- **Önizleme adresi:** hâlâ doğrulanamadı (yalnızca panel bağlantıları).
- **Sıradaki:** QUEUE #4 — Φυτά listesi (yalnızca boşluk/yazı düzeni).

## 2026-11-24 akşam — otomasyon kurulumu ve ilk iş
- **Otomasyon (doğrulandı):** bulut zamanlayıcı VAR ve çalışıyor: «Aloni autopilot (gece vardiyası)», her gece İstanbul 00:00–07:00 saatlik. Deneme ateşlemesi (18:15 UTC) yeni kurallarla GitHub'ı okudu, açık PR listesini aldı, etkileşimli oturumu doğru algılayıp «müdahale yok» dedi. Kayıtlı durum depodan okundu (`STATE.md`). Gerçek yazma (push/PR) gece koşusunun daha önceki PR'larıyla (#518–#520) kanıtlı; yeni kurallarla ilk gerçek gece koşusu bu gece 00:00.
- **Sabah raporu:** ayrı «sabah doğrulaması» rutini kuruldu ama GitHub erişimi alamadı (403) → KAPATILDI. İşi gece vardiyasının 07:00 koşusuna taşıdım. İlk gerçek sabah raporu yarın 07:00 (İstanbul).
- **Tamamlanan iyileştirmeler:** QUEUE #1 — çift dokunuş koruması: sahip gözlem formu çift dokunuşta İKİ kayıt yapıyordu (e2e ile kanıtlandı, düzeltildi); alan işi, tekrarlayan kural, müşteri ve sipariş formları da aynı korumayı aldı. **#537 birleşti** (CI yeşil, WebKit dahil).
- **Hata (benim):** #537 var olan bir güvenlik testini (hasat/işçi/parsel çift dokunuş) yanlışlıkla ezdi; **#538 ile birebir geri yüklendi**, kural eklendi (`git ls-files` + diff özeti kontrolü).
- **CI:** ana dal yeşil; PR'larda `check`, `sql`, 3 e2e parçası yeşil.
- **Cloudflare önizleme:** her PR için «Workers Builds» önizleme derlemesi başarılı (panel bağlantısı kontrol çıktısında). Herkese açık önizleme adresi çıkmıyor → aşağıda karar.
- **Neyi göreceksin:** observation formunda hızlı çift dokunuş artık kopya kayıt yapmıyor. (Canlı doğrulama sende: «birleşti», «canlıda» değil.)
- **Kalan sorunlar:** `labeluse:118` ve `register-v2` izlemede (yeni hata bağlamı bekleniyor).
- **Sıradaki öncelik:** QUEUE #3 — Αποθήκη ekranı.
- **Bora'dan karar/eylem:** (1) önizleme adresi: Cloudflare → Workers & Pages → aloni → Settings → Domains & Routes'taki `*.workers.dev` adresini bu dosyanın başına yaz (BLOCKERS). (2) Ayrı bir sabah rutini istersen: claude.ai → Routines'te yeni rutin kurup depo seaevill/Aloni'yi kaynak olarak ekle.

## 2026-11-24 — kurulum
- **Tamamlanan iyileştirmeler:** henüz otomatik koşu yok. Elle yapılanlar `docs/DEVLOG-2026-11-24.md` içinde.
- **PR'lar:** bu belge setinin PR'ı.
- **CI:** ana dal yeşil (`f2e24c1`).
- **Cloudflare önizleme:** her PR için «Workers Builds» önizleme derlemesi çıkıyor (panel bağlantısı var); herkese açık önizleme adresi kontrol çıktısında yok → `BLOCKERS.md` ilk satır.
- **Neyi göreceksin:** henüz yeni görsel değişiklik yok.
- **Kalan sorunlar:** `labeluse:118`, `register-v2` izlemede.
- **Sıradaki öncelik:** QUEUE #1 (çift gönderim koruması denetimi).
- **Bora'dan karar/eylem:** önizleme adresi için workers.dev adresi (BLOCKERS).

## 2026-11-26 öğleden sonra vardiyası — tur 8
- **Erişilebilirlik taraması (axe) sezon gezintisine eklendi ve gerçek bir hata buldu:** Άλλα → Εργάτες'te işçi düğmesinin okunan adı («Άνοιγμα κάρτας») görünen metinle (işçi adı) uyuşmuyordu (WCAG 2.5.3). Artık «<ad> – άνοιγμα κάρτας». Ayrıca Ταμείο'da iptal edilen kayıtlar «Ακυρωμένες εγγραφές» listesinde kalıyor ve geri alınabiliyor (#589).

## 2026-11-26 öğleden sonra vardiyası — tur 7
- **36 birleşti:** `docs/milestones/DEMO-SEASON-TEST.md` — Bora için 20 adımlık Yunanca telefon testi («Άλλα → Επίδειξη: πλήρης σεζόν → … → θα πρέπει να δείτε …»).
- **Özet (Demo sezonu):** 7 parsel (70 στρ.), 12 ekim (sınırlı), 14 hasat, 9 ilaçlama (örnek ürünlerle), 6 müşteri + 4 haftalık sipariş, 3 işçi, 6 pano işi, Ταμείο 25 kayıt, 5 gözlem, 10 fotoğraf. Kaynaklar: ilaçlar = uygulamanın örnek ürünleri (resmî etiket DEĞİL, madde 30 ertelendi); fotoğraflar = Wikimedia Commons CC BY/BY-SA (`docs/content/photo-credits.md`). «άγνωστο» kalanlar: imzasız/eksik etiketli ilaçlamaların bekleme süresi, okunamayan bir kasa sayısı, ρόκα hasat ritmi (tahmin girilmedi). Bulunan hatalar: Καλλιέργειες sayısı≠kaynak (düzeltildi), Demo silinince sipariş listesi kalıyordu (düzeltildi), depoda 40 günlük kasa (düzeltildi).

## 2026-11-26 öğleden sonra vardiyası — tur 6
- **35 gezinti birleşti:** sezon Demosunda her sekme ve alt sayfa 320/375/390 px'te açılıyor (Σήμερα kaynakları, geçmiş, Φυτά + detay + ημερολόγιο, Χωράφια + detay, Αποθήκη + ürün + parti, Άλλα altındaki 8 sayfa + işçi görünümü); konsol hatası ve yatay kaydırma yok. 30 ekran görüntüsü `docs/design/demo-season-2026-11-26/`.
- Görüntülere bakınca gerçekçilik hatası bulundu: depoda 40 gün önceki 69 kasa maydanoz görünüyordu; artık yalnızca son haftanın hasadı depoda.

## 2026-11-26 öğleden sonra vardiyası — tur 5
- **34 bütünlük testleri birleşti (a–g):** gerçek çiftlik dokunulmuyor, PHI'deki ekim arza girmiyor (ρόκα «λείπουν» satırı), dozlar kaynak dosyayla bire bir, okunamayan kasa ne 0 ne sayı, Demo kaldırılınca her şey siliniyor, klasik/sezon Demo karışmıyor, her Σήμερα sayısı kaynağını açıyor.
- **İki gerçek hata bulundu ve düzeltildi:** «Καλλιέργειες» sayısı Demo'da tüm bitkileri (10) sayıyordu, kaynak sayfa 9'u listeliyordu; Demo silinince sipariş listesi geride kalıyordu.
- Ayrıca istediğin şirket iskeleti PR'ı açıldı (#583, birleştirilmedi).

## 2026-11-26 öğleden sonra vardiyası — tur 4
- **33b birleşti:** Άλλα → Φωτογραφίες'te (sezon Demosu açıkken) 10 fotoğraf, her birinin altında «yazar · lisans · Wikimedia Commons» satırı ve Commons sayfası bağlantısı; tembel yükleniyor. Klasik Demo'da görünmez.
- Ek güvence: klasik Demo yüklenince/Demo silinince sezon kayıtları (müşteri, not, ΚΑΕΚ, hedef, işçi kartı…) geride kalmıyor (test).

## 2026-11-26 öğleden sonra vardiyası — tur 3
- **32d birleşti (madde 32 tamam):** Ταμείο (25 kayıt cent olarak, bir düzeltme + bir iptal satırı, «Επιστροφή ΦΠΑ»), 5 gözlem. Sezon Demosu veri olarak tamam.
- Sıradaki: 33b (fotoğraf kaynak satırı), sonra 34 bütünlük testleri.

## 2026-11-26 öğleden sonra vardiyası — tur 2
- **32c birleşti:** Demo sezonuna 6 kurgusal müşteri (+30 690 000 xxxx), 4 haftalık sipariş (dün ıspanak siparişi 32 > hasat 24), 3 işçi (ad/soyad/telefon, doğum tarihi yok), iş panosu (2 açık, 2 alınmış, 2 gecikmiş), yarın notları («από εργάτη» dahil), tekrarlayan işler, sezon hedefleri, gübre planı eklendi.
- Sıradaki: 32d (Ταμείο, gözlemler).

## 2026-11-26 öğleden sonra vardiyası — tur 1
- **32b birleşti:** Demo sezonunda 9 ilaçlama (uygulamanın kendi kurucusuyla, dozlar etiket kaydındaki metinle aynı), ürün başına parti, zor durumlar: bekleme süresindeki ρόκα, bugün REI süren parsel, imzasız/eksik etiketli ürünlerde bekleme süresi «άγνωστο», stoğu biten ürün.
- Madde 30 ertelendi (Bora). Sıradaki: 32c (müşteri, sipariş, işçi, pano, notlar, tekrarlayan, hedef, gübre planı).

