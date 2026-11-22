# RUNBOOK – Aloni (geçici ad) (Bora için tek sayfa, taslak)

> Durum (2026-11-17): M1 kayıt ekranları bitti (parsel, ekim, ürün/ilaç, etiket, stok, analiz, fotoğraf, yedek). Pages kurulumu §8'de, Supabase kurulumu §9'da. Veriler şimdilik yalnızca telefonda.
> Kural: sen hiçbir komut yazmazsın. Claude GitHub'a değişiklik gönderir, CI yeşilse yayına çıkar.

## 1. Yayına alma (deploy)
- Her pull request için Cloudflare Pages bir **önizleme adresi** üretir. Telefonda orayı açıp denersin.
- Sen "Birleştir" (Merge) dediğinde `main` dalı otomatik yayına çıkar (adres: `https://aloni.<hesap-adı>.workers.dev`, §8 kurulumdan sonra).
- **Sürüm kontrolü:** uygulamada Περισσότερα ekranının altında «Έκδοση: 0.0.0 · a1b2c3d» yazar. Sondaki 7 harf yayına çıkan kodun numarasıdır. iPhone'da eski sürüm takılırsa bu numara GitHub'daki en son birleştirmeyle aynı mı bak.
- CI (typecheck + testler + 375 px WebKit) kırmızıysa birleştirme düğmesi çalışmaz. Kırmızıyı Claude'a ilet.

## 2. Geri alma (rollback)
- Cloudflare → **Workers & Pages** → `aloni` → **Deployments** → **Production** listesinde, çalıştığını bildiğin önceki yayını bul → sağdaki **⋯** → **Rollback to this deployment** → onayla. Bir tık, birkaç saniye.
- Geri aldıktan sonra Claude'a hangi sürüme döndüğünü söyle: `main` dalını da düzeltmesi (hatalı değişikliği geri alan yeni bir pull request) gerekir; yoksa bir sonraki birleştirmede hata geri gelir.
- Veriler telefonda (yerel) tutulduğu için uygulama sürümünü geri almak kayıtlarını silmez.

## 3. Yedekten dönme
- **Şu an (M1):** veriler ve fotoğraflar yalnızca bu telefonda. **Yedek al:** Περισσότερα → «Εξαγωγή αντιγράφου» tek bir dosya kaydeder (fotoğraflar dahil); 7 günden eskiyse uygulama kırmızı uyarı gösterir. Dosyayı e-postana ya da iCloud'a koy.
- **Yeni telefona/silinen uygulamaya dönmek:** boş telefonda Περισσότερα → «Επαναφορά» → dosyayı seç. Aynı dosyayı ikinci kez yüklemek hiçbir şeyi çoğaltmaz; bozuk fotoğraf varsa hiçbir şey yazılmaz ve uygulama söyler. Başka veri olan telefona yüklemeyi reddeder.
- Demo çiftlik gerçek verinden ayrıdır; "Diğer → Demo çiftliği sil" gerçek verine dokunmaz.
- **Hiçbir kayıt silinmez:** stok hareketleri ve fotoğraflar yalnızca eklenir, hata yeni bir kayıtla düzeltilir; parsel, ekim, ürün ve analiz «Αρχειοθέτηση» ile saklanır (5 sn «Αναίρεση»).
- **Supabase sonrası:** günlük otomatik yedek + haftalık `pg_dump` (senin sahip olduğun AB kovası) + uygulamadan JSON dışa aktarma. Geri yükleme tatbikatı M5'te.

## 4. Sorun olursa
1. Uygulama açılmıyor → iPhone'da ana ekrandan sil, Safari'den adresi aç, yeniden "Ana Ekrana Ekle".
2. Eski sürüm görünüyor → uygulamayı tamamen kapat ve yeniden aç (otomatik güncellenir).
3. Veri kayıp görünüyor → önce "Diğer → Etkin çiftlik" bölümünde doğru çiftliğin seçili olduğuna bak (Demo ≠ Gerçek).
4. Claude'a ekran görüntüsü + ne yaptığını yaz.

## 5. Hesaplar (sahibi: Bora)
GitHub ✔ · Cloudflare Workers (§8) ✔ · Supabase (Frankfurt, §9) ☐ · E-posta gönderici ☐ · Alan adı ☐ · Yedek kovası ☐

## 6. Hesap güvenliği ve kurtarma

**Temel kural:** Parolalar **yalnızca Bitwarden'da**, doğrulama kodları **yalnızca iPhone'un Şifreler uygulamasında** durur. İkisini karıştırma. Hiçbir parolayı, kodu ya da yedek kodu Claude'a, WhatsApp'a veya e-postaya yazma.

**Neden zarf?** Bitwarden yeni bir cihazda giriş için Gmail'e kod gönderir; Gmail'in kodu da telefondadır. Telefon kaybolursa ikisine de giremem. Bu döngüyü kâğıt kırar.

### 6.1 Acil durum zarfı
Kâğıda elle yazılır, zarfa konur, **evde** kilitli/güvenli bir yerde durur. Fotoğrafı çekilmez, paylaşılmaz.
- Bitwarden ana parolası
- Gmail (çiftlik e-postası) parolası
- Gmail yedek kodları (10 kod; kullanılan kodu çiz)
- GitHub kurtarma kodları
- Bitwarden kurtarma kodu (açılırsa)
- *(Öneri)* Apple Kimliği parolası — doğrulama kodları iCloud'da durduğu için

Güvendiğim **bir aile üyesi** zarfın yerini bilir (içini okumasına gerek yok).
> Gmail yedek kodlarını Bitwarden'a **koyma**: Bitwarden'a girmek için Gmail gerekebilir (döngü). Gmail kodları yalnızca kâğıtta.
> GitHub kurtarma kodları hem Bitwarden'a (güvenli not) hem zarfa girer.

### 6.2 Kurtarma bilgileri
- **Gmail → Güvenlik → Kurtarma telefonu** = kendi numaram, **Kurtarma e-postası** = kişisel adresim. Bunlar *sadece kurtarma için*, giriş için değil.
- **Geçiş anahtarı (passkey, Face ID)**: Google'da ve GitHub'da açılır. Doğrulama uygulaması (Şifreler) yedek olarak **kalır**.
- **GitHub e-postası:** GitHub → Settings → Emails: hesabın hangi e-postaya bağlı olduğuna bak. Gerekirse çiftlik e-postasını **ikinci adres** olarak ekle ve doğrula.

### 6.3 Bitwarden
- Hesap açarken sunucu bölgesi **EU** seçilir. **Bölge yalnızca hesap açarken seçilir, sonradan taşınamaz.** Yanlış seçildiyse hesabı silip baştan açmak gerekir.
- Ana parola: 4–5 kelimelik uzun cümle, başka yerde kullanılmaz.

### 6.4 Kurtarma tatbikatı (kurulumdan sonra bir kez)
Bilgisayarda Gmail'den **çıkış yap**, sonra zarftaki **bir yedek kodla** yeniden gir. Çalıştıysa o kodu zarfta çiz. Çalışmadıysa hemen Claude'a haber ver (kodlar yenilenir).

## 7. Geliştirici notları (Claude için, Bora'nın yapacağı bir şey yok)
- Bir kez çalıştır: `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'`
- Yeni dalı her zaman `git push -u origin HEAD` ile gönder.
- Sığ klonda "gönderilmemiş commit" uyarısı çıkarsa bu **yanlış alarmdır**: `git ls-remote --heads origin <dal>` ile uzak ucu kontrol et, daha fazla tur harcama.
- Var olan bir dal için eksik takip referansı: `git fetch --depth=20 origin <dal>:refs/remotes/origin/<dal>`

## 8. Cloudflare kurulumu (Workers, bir kez, sahibi: Bora)
Barındırma **Cloudflare Workers** (statik dosyalar) üzerinde; paneldeki `aloni` Worker'ı kalır. Ücretsiz plan yeterli. **Kart/ödeme isteyen bir ekran çıkarsa dur ve Claude'a yaz.** Claude'a parola, anahtar ya da token yazma.
1. Worker `aloni` → **Settings → Builds**: depo `seaevill/Aloni`, production branch `main`, **Build command `npm run build`**, **Deploy command `npx wrangler deploy`**, **Root directory boş**. (Depodaki `wrangler.jsonc` Worker'a `app/dist` klasörünü yayınlamasını söyler; `wrangler` sürümü depoda sabit.)
2. **Web Analytics KAPALI kalsın** (Metrics → Enable'a basma). Depoda telemetri de kapalı (`send_metrics: false`).
3. Adres: Worker sayfasında **Settings → Domains & Routes** altında `aloni.<hesap-adı>.workers.dev` yazar. Telefonda Safari ile açıp Paylaş → **Ana Ekrana Ekle**.
4. Her PR için Cloudflare bir önizleme sürümü üretebilir (Workers Builds); önizlemedeki veri **o adrese özeldir**, gerçek veri girme.
5. **Bilinen durum (2026-11-18, Bora):** yalnızca **`main`** dalının «Workers Builds» kontrolü sayılır. Başka dallarda (PR dalları) bu kontrol kırmızı çıkabilir; bu birleştirmeyi engellemez. **Her birleştirmeden sonra `main`'in Workers Builds kontrolünün yeşil olduğu doğrulanır; `main` kırmızıysa başka her iş durur ve önce o düzeltilir.**
5. **Sürüm kontrolü:** Περισσότερα altında «Έκδοση: … · xxxxxxx» (7 harf) GitHub'daki son birleştirmeyle aynı olmalı.
6. **Geri alma:** Worker → **Deployments** → önceki sürümün yanında **Rollback**. Sonra Claude'a söyle ki `main` de düzeltilsin.
7. **Önemli:** `main`'e her birleştirme canlıya çıkar; bu yüzden birleştirmeden önce CI yeşil olmalı.

## 9. Supabase kurulumu (bir kez, sahibi: Bora) – M1'in sonunda, canlı eşitleme (PR 16) için
Ücretsiz plan yeterli başlangıç. **Kart/ödeme isteyen bir ekran çıkarsa dur ve Claude'a yaz.** Claude'a **parola, `service_role`/secret anahtar, veritabanı parolası veya token yazma**; sadece aşağıda "Claude'a yaz" denen şeyi yaz.
1. supabase.com → **Start your project** → GitHub hesabınla giriş (en kolayı). Giriş sonrası hesap güvenliği ayarlarından **iki adımlı doğrulamayı** (2FA) aç; kurtarma kodlarını §6'daki zarfa koy.
2. **New organization** (ad: `aloni`), plan **Free**. Kart isteyen bir seçenek görürsen **Free**'de kal.
3. **New project:** ad `aloni`. **Database password:** *Generate a password* ile üret, **Şifreler uygulamasına (parola yöneticine) kaydet**; kimseye, Claude'a bile yazma. **Region:** **Europe → Central EU (Frankfurt)**, yani `eu-central-1`. (Londra/Zürih'e giden genel «Central EU» değil, Frankfurt'u adıyla seç.) «Enable automatic RLS» seçeneği varsa **açık** bırak. **Create new project** (birkaç dakika sürer).
4. **Önemli (Free plan):** 7 gün hiç işlem olmazsa proje **durur**, panelden elle «Restore» ile açılır. Uygulama canlı kullanıma geçince bu sorun olmaz; o zamana kadar ayda bir paneli aç.
5. Proje açılınca **Project Settings → Data API**: yalnızca **Project URL**'yi (`https://xxxxxxxx.supabase.co`) Claude'a yaz. Bu adres gizli değil, güvenlik başlığına (CSP) eklenecek. **`anon`/publishable anahtarını Claude'a YAZMA:** onu Cloudflare'e sen girersin (6. adım).
6. Cloudflare → `aloni` projesi → **Settings → Variables and Secrets (Environment variables)** → **Production** (ve Preview) için iki değişken ekle: `VITE_SUPABASE_URL` = Project URL, `VITE_SUPABASE_ANON_KEY` = Supabase'teki **anon / publishable** anahtar. (`service_role`/secret anahtarı **hiçbir yere koyma**.) Sonra **Deployments → Retry deployment**.
7. **Authentication → URL Configuration:** *Site URL* = `https://aloni.<hesap-adı>.workers.dev`. **Authentication → Providers → Email** açık, **«Confirm email» açık**; **«Allow new users to sign up» AÇIK kalır** (uygulama ilk girişte hesabı kendisi oluşturur: sen ve davetli işçiler ilk kez giriş yaparken hesap yoktur). Üyeliği olmayan hesap hiçbir veri göremez (RLS), davet kabulü yalnızca **onaylı e-postaya** yazılmış daveti açar. Başka giriş sağlayıcısı (Google, Apple…) **kapalı**. İlk işçiler girdikten sonra istersen «sign up»'ı kapatabilirsin; yeni bir işçi davet edeceğin gün tekrar aç.
8. **Veritabanı kurulumu (SQL):** Claude her migration dosyasını (`supabase/migrations/…`) sana verir; sen **SQL Editor → New query**'ye yapıştırıp **Run**'a basarsın, sırayla. Claude hangi dosyanın sırada olduğunu ve «Success» çıktısını nasıl göreceğini yazar. Bir dosya hata verirse **durup** ekran görüntüsünü Claude'a gönder.
9. **Yedek (para sorusu):** Free planda günlük otomatik yedek **yok**. Plan: haftalık `pg_dump` (senin AB kovan) + uygulamadan JSON yedeği. Pro (25 $/ay) günlük yedek ekler; **para gerektirdiği için sen onaylamadan açılmaz**.
10. Bittiğinde Claude'a «Supabase tamam» ve Project URL'yi yaz. Claude PR 16'ya (canlı eşitleme) başlar.

## 10. Migration'ları Supabase'e uygulama planı (Bora onayıyla)
**Henüz hiçbir migration hiçbir yere uygulanmadı** (CI yalnızca geçici veritabanlarında dener). Rapor: `docs/reviews/2026-11-18-migrations.md`. **Uygulama ancak şu üç şey olunca:** (1) §9 bitti ve «Supabase tamam» yazıldı, (2) ekibin bağımsız incelemesi (0010–0012) bitti ve düzeltmeleri `main`'de, (3) Bora açıkça **«uygula»** dedi. Bundan önce workflow'u yalnızca `dry-run` ile (hiçbir şeyi değiştirmez) denemek serbest.
**Başlamadan:** `main`'de CI ve Workers Builds yeşil; proje boş; telefonda JSON yedeği alınmış.

### 10.1 Ana yol: GitHub Actions (`Supabase migrate (manual)`)
**Üç ayrı kontrol, sırayla:** (1) iş `guard` (sır yok): elle başlatıldı mı, `main`'den mi, **uygulanacak TAM commit'in** `check`, `sql` ve production Workers Build sonuçları bitmiş ve yeşil mi (başka commit'in yeşili sayılmaz; eksik, bitmemiş ya da belirsizse durur), migration numaraları boşluksuz mu, `apply` için `confirm` tam `APPLY` mı; (2) **GitHub Environment onayı** (`supabase-production`): onay verilmeden `migrate` işi başlamaz, yani hiçbir adım sırlara erişemez; (3) `APPLY` yazısı `supabase db push`'tan hemen önce bir daha denetlenir. Onaydan sonra commit ve yeşil kontroller **yeniden** denetlenir (onay saatler sonra gelebilir).
**Kod ile GitHub ayarı farkı:** workflow dosyası ortamın **adını** koyar; «onaylayan kişi zorunlu» kuralının gerçekten açık olduğunu dosya **zorlayamaz** — o bir GitHub ayarıdır (adım 4). Açık olduğunu şöyle görürsün: bir `dry-run` başlat; iş **«Waiting» / «Review pending deployments»** durumunda bekliyorsa ve sen onaylayana kadar ilerlemiyorsa kural açıktır. Hiç beklemeden çalışıyorsa **durdur** (Cancel) ve Claude'a yaz.
**Bağlantı (2026-11-18):** GitHub'ın makinesi IPv6 kullanamaz; bu yüzden `db push` ve doğrulama, Supabase'in **IPv4 session pooler** adresiyle (Management API'nin söylediği host, port 5432, kullanıcı `postgres.<proje kodu>`) bağlanır. Adres tahmin edilmez; token'da **Connection Pooling = Read** yoksa adım «yetki eksik» diye durur. Şifre yalnızca sırdan gelir, günlükte maskelidir. **«password authentication failed (28P01)»** = `SUPABASE_DB_PASSWORD` sırrı veritabanı şifresiyle uyuşmuyor: Supabase → Project Settings → Database → **Reset database password** → yeni şifreyi parola yöneticine kaydet → GitHub'da sırrı **Update** et (başında/sonunda boşluk ya da satır sonu olmasın) → dry-run'ı yeniden çalıştır.

**Sabit sürüm:** Supabase CLI `2.122.1`'e sabit (`latest` yok). CI, workflow'un **aynı** `supabase db push` komutunu bu sürümle geçici bir veritabanında dener (dry-run → push → geçmiş tablosu → ikinci push «up to date» → `verify_applied.sql`). **CI'ın kanıtlayamadığı:** `supabase link`, gerçek projeye bağlantı (pooler) ve Management API; bunlar gerçek proje ve sırlar ister, ilk gerçek `dry-run`'da görülür.
**Doğru projeye gidiyor mu:** workflow, `SUPABASE_PROJECT_REF` ile Supabase Management API'den projeyi sorar; **kimlik, ad (`aloni`) ve bölge (`eu-central-1`, Frankfurt)** beklenenle birebir uymuyorsa hiçbir şey yapmadan durur. Şifre ve token hiçbir yerde yazdırılmaz.
**Gizli değerleri sen girersin; bana, sohbete ya da bir dosyaya yazma, ekran görüntüsünde de gösterme.**
1. **Erişim anahtarı (Access token):** supabase.com → sağ üstte profil → **Account → Access Tokens → Generate new token** → ad: `aloni-github` → çıkan değeri **bir kez** kopyala. Bu anahtar hesabının tamamına erişir: iş bitince **Revoke** et, yeni migration gerekince yenisini üret.
2. **Proje kimliği:** projeyi aç → **Project Settings → General → Reference ID** (20 küçük harf).
3. **Veritabanı şifresi:** §9 adım 3'te parola yöneticine kaydettiğin şifre. Kaybolduysa: **Project Settings → Database → Reset database password**, yenisini parola yöneticine kaydet.
4. **GitHub'da ortam:** repo → **Settings → Environments → New environment** → ad tam olarak `supabase-production` → **Required reviewers**: kendini ekle → **Deployment branches and tags → Selected branches** → `main` → **Save protection rules**.
5. Aynı sayfada **Environment secrets → Add environment secret**, üç kez, adlar tam: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.
6. **Yalnızca dry-run (güvenli, hiçbir şeyi değiştirmez):** repo → **Actions → Supabase migrate (manual) → Run workflow** → Branch `main`, **mode = dry-run** → Run. **Önce `guard` işi yeşil olmalı**; sonra `migrate` işi **onay bekler** (Review pending deployments → `supabase-production` → Approve and deploy). Günlükte «target project: name=aloni region=eu-central-1» ve «Would push these migrations» listesi (0001…0014) görünmeli. Günlüğün **şifre içermeyen** ekran görüntüsünü Claude'a gönder; **Claude dry-run raporunu değerlendirmeden `apply` çalıştırılmaz.**
   **Apply'dan önce (bir kez, SQL Editor, salt-okunur):** `select system_identifier from pg_control_system();` bir sayı döndürmeli. Boş ya da hata gelirse **dur**: 0017'den beri `server_identity()` kimliği okuyamazsa hata verir ve migration kendini durdurur (geri yükleme güvencesi çalışmaz). Hata gelirse sonucu bana yaz, apply'ı başlatma.
7. **Gerçek uygulama (yalnızca dry-run raporu değerlendirildikten ve Bora «uygula» dedikten sonra):** **mode = apply**, **confirm = APPLY** → Run → Approve. Sonunda doğrulama adımı yeşil olmalı. Kırmızıysa **dur**, günlük görüntüsünü gönder; hiçbir şeyi elle düzeltme.
8. **Panel kontrolü (ikinci bakış, rol testlerinin yerine geçmez):** Supabase paneli → sol menü **Advisors** → **Security Advisor** sekmesi → *Refresh* → ekran görüntüsü; sonra **Performance Advisor** sekmesi → ekran görüntüsü; ayrıca sol menü **Table Editor** → tablo listesinde her tabloda **RLS** rozetinin açık olduğunu gör (ekran görüntüsü). Sadece bakarsın, hiçbir şeyi değiştirmezsin. Hedef: RLS'siz tablo ve herkese açık fonksiyon uyarısı **kalmamalı**.
9. **İlk çiftlik ve sahip (bir kez, SQL Editor):** Authentication → Users → **Add user** (kendi e-postan) → `id`'yi kopyala; `insert into farms(name) values ('Bora''nın çiftliği') returning id;` sonra `insert into farm_members(farm_id, user_id, role) values ('<farm id>', '<user id>', 'owner');`
10. **Gerçek hesap denemesi (CI'ın yerine geçmez):** sahip hesabıyla bir ilaçlama; işçi hesabıyla ürün/ilaçlama eklenememesi, başka çiftliğin görünmemesi, aynı «Έγινε» isteğinin tekrarının ikinci kayıt üretmemesi; `select verify_spray_chain('<farm id>')` boş; anonim anahtarla `apply_ops` reddi.
**10.1a Token'ı yenileme (süresi dolunca ya da sızınca):**
1. **Sızdıysa ya da şüphe varsa önce iptal et:** Supabase → profil → **Account → Access Tokens** → ilgili token'ın yanında **Revoke**. (Sohbete, e-postaya, ekran görüntüsüne düştüyse beklemeden.) Sonra GitHub günlüklerine/ekran görüntülerine bak: değer görünüyorsa onu da sil.
2. **Yenisini en az yetkiyle üret:** **Generate new token** → ad `aloni-github` → **yalnızca `aloni` projesi** → yetkiler: *Project Settings*, *API Keys*, *API Key Secrets* ve **Connection Pooling** = **Read**, geri kalanı **No access**. Değeri bir kez kopyala.
3. GitHub → repo → **Settings → Environments → `supabase-production` → `SUPABASE_ACCESS_TOKEN` → Update** → yenisini yapıştır → Save. (Değeri başka hiçbir yere yazma.)
4. **Dry-run** ile dene (Actions → Supabase migrate (manual) → mode = dry-run). Yeşilse bitti. Süresi dolan token'lar için takvime bir hatırlatma koy.
5. `DECISIONS.md`'ye tarihli bir satır eklenir: «token döndürüldü (değer yok)». Değer **asla** yazılmaz.
**Yetki hatası olursa:** workflow hangi çağrının reddedildiğini yazar (HTTP 401/403 + çağrının adı). Claude hangi yetkinin eksik olduğunu söyler; sen **yalnızca onu** eklersin (örn. veritabanı sorgusu için «Database: Read»), token'ı genişletip her şeyi açma.
**`verify_applied.sql` ne yapar / ne yapmaz:** katalogtan (salt-okunur) tabloların varlığını, RLS'nin açık olduğunu ve her RLS tablosunda en az bir politika bulunduğunu, hassas fonksiyonların herkese/anon'a kapalı olduğunu, `SECURITY DEFINER` fonksiyonların sabit `search_path`'ini, anahtar tetikleyicileri ve 0012–0014'ün uygulandığını denetler. **Denetlemez:** bir politikanın gerçekte neye izin verdiğini, giriş yapmış bir kullanıcının/işçinin gerçekte ne okuyup yazabildiğini, gerçek Supabase Auth/JWT davranışını, Supabase'in varsayılan yetkilerini, depolama kovalarını. Bunlar rol testleri (`supabase/tests/*.sql`) ve adım 10 ile kapatılır; Security Advisor ekranı onların yerine geçmez.
**Kilit/süre notu:** 0010 mevcut tablolara varsayılanlı sütun ekler (tablo yeniden yazılır, kısa süre kilitlenir); proje boşken (ilk uygulama) önemsizdir. Dolu bir veritabanına yükseltme `supabase/tests/upgrade.sh` ile denenmiştir (0001–0009 + veri → 0010+; kayıt kaybı yok).

### 10.2 Yedek yol: SQL Editor (elle)
Actions çalışmazsa: sırayla `0001_core` → … → `0012_phone_contract` (ve sonraki numaralar), her dosya ayrı **New query** → yapıştır → **Run**; her biri «Success» vermeli, hata olursa dur. Sonunda `supabase/tests/verify_applied.sql`. **Dikkat:** bu yol Supabase'in migration geçmişi tablosuna yazmaz; sonradan Actions'a geçilecekse Claude önce geçmişi hizalar (`supabase migration repair`). İki yolu aynı projede karıştırma.

### 10.3 Kurallar, yedek, kurtarma
- Uygulanmış bir migration dosyası **asla** değiştirilmez; her değişiklik yeni numaralı dosyadır (CODING_STANDARDS 6). Numara boşluğu ya da çift numara varsa workflow durur.
- **Yedek:** uygulama anında veritabanı boş, veri yalnızca telefonlarda; asıl yedek telefondaki JSON yedeği. Eşitleme açıldıktan sonra: Free planda otomatik yedek yok → haftalık `pg_dump` + her telefonun JSON yedeği; Pro (para) onaysız açılmaz.
- **Kurtarma:** (1) Bir dosya hata verirse `db push` o dosyayı kendi işleminde geri alır; düzeltmeyi Claude **yeni dosya** olarak hazırlar. (2) Temiz başlangıç gerekirse, veritabanı boş olduğu sürece en güvenli yol projeyi silip yeniden oluşturmak (Settings → General → Delete project; veri telefonlarda) ve §9'u yinelemek. (3) Eşitleme açıldıktan sonra: telefonlar JSON yedeğinden, sunucu `pg_dump`'tan döner. **Geri yükleme (ZORUNLU adımlar, 0017):** (1) Dökümü **yetkilerle birlikte** al ve yükle (`pg_dump --no-owner`; `--no-privileges` ASLA, yoksa `authenticated` rolü fazla/az yetki alır). (2) YENİ projeye yükledikten sonra yönetici **bir kez** `select bump_sync_generation();` çalıştırır (SQL Editor, giriş yapmış kullanıcı olmadan): satırları bu sunucunun sayacıyla yeniden damgalar, yeni nesil başlatır; telefonlar baştan çeker. Bu adım olmadan `pull` açık bir hata verir (sessizce satır atlamaz). (3) **Doğrulama:** `verify_applied.sql` çalıştır. Adım yapılmadıysa iki yoldan biri satır çıkarır: başka sunucuya yüklemede «restored server: run bump_sync_generation() once»; **aynı sunucuda geri yüklemede** (kimlik aynı kalır) «the server restarted after the last bump_sync_generation()» (0019: son bump zamanı sunucunun son açılışından eskiyse). Yapıldıysa yalnızca «OK:» satırı kalır. Not: Supabase bakım nedeniyle sunucuyu yeniden başlatırsa aynı satır çıkabilir; zararsızdır, `select bump_sync_generation();` bir kez çalıştırıp yeniden doğrula (telefonlar bir kez baştan çeker). CI bu döngüyü her çalıştığında dener (`supabase/tests/restore.sh`: yetkilerle dump → yeni veritabanı → doğrulama adımı talep eder → bump → pull hiçbir satırı kaybetmez ve kimseye iki kez vermez); gerçek bir projeye yükleme tatbikatı M5'te.

## 11. Yeni görünümü (Tasarım 2, 2026-11) geri almak
Görünüm yalnızca iki dosyada: `app/src/ui/tokens.css` (renk, ölçü, gölge) ve `app/src/ui/styles.css`. Mantık, veri ve metin değişmedi. Beğenmezsen: GitHub → **Pull requests → Closed** → «Görünüm: …» (theme) başlıklı PR'ı aç → **Revert** → açılan PR'ı birleştir (CI yeşil olunca). Her görünüm PR'ı tek commit olarak birleşir; en yenisinden başlayıp eskiye doğru hepsini geri alırsan uygulama tamamen eski renklere döner. Geri alma, verini ya da kayıtlarını etkilemez. Kararın kaydı: `docs/design/theme-2026-11/README.md`.

## 12c. Gerçek işçi denemesi – 8 satır (sahip telefonu + işçi telefonu; senkron AÇIK olmalı, §13)
1. **Sahip:** Άλλα → **Εργάτες** → işçinin satırında **Email του εργάτη** → **Αποθήκευση πρόσκλησης**. Doğru: **«Η πρόσκληση αποθηκεύτηκε…»**
2. **İşçi telefonu:** Safari → uygulama adresi → **Ana Ekrana Ekle** → aç → **Άλλα → Σύνδεση** → davet edilen e-posta → mailden kod. Doğru: yalnızca **Δουλειές / Συγκομιδή / Σημείωση**; Αποθήκη, fiyat, sipariş **yok**.
3. **Sahip:** Σήμερα → **+ Ανάθεση δουλειάς** → işçiye bir ilaçlama işi ata. Doğru: iş **yalnızca o işçide** görünür (başkasının işi görünmez).
4. **İşçi:** **Δουλειές** → **Έγινε** → başlangıç saatini yaz → onayla (10 saniye geri alma süresi). Doğru: **«Αποθηκεύτηκε…»**.
5. **İşçi:** **Συγκομιδή** → ekimi seç → **+** ile kasa → **Καταγραφή**. Doğru: kayıt «Ποιος έκοψε» olarak **kendi adını** taşır. (İlaçlamadan sonra bekleme süresi bitmediyse hasat **kapalı** kalır: bu doğrudur.)
6. **Sahip:** Σήμερα → **Σήμερα έγιναν**: işi ve kasaları görürsün (en geç birkaç dakikada; çip «Ο συγχρονισμός δουλεύει»).
7. **İşçiyi uçak moduna al** → **Έγινε** → **«Αποθηκεύτηκε · θα σταλεί όταν έχει σήμα»** → bağlantıyı aç. Doğru: kendiliğinden gider, bir kez.
8. **Ters giderse:** ekrandaki metni bana yaz (kırmızı kutu nedenini söyler); tahmin etmem. Denemeden sonra test işçisini Supabase → Authentication → Users'tan **sen** sil (gerçek işçiyse silme).

## 12a. Gerçek hesap denemesi – KISA (telefonda, 10 satır; ayrıntı aşağıda §12)
Her satır: **Nerede → Ne yap → Doğru sonuç.** Farklıysa **dur**, ekran görüntüsünü Claude'a gönder. Parola ve gizli anahtarı hiçbir yere yazma. Veritabanına **elle SQL yapıştırmak yok**; Claude da üretime dokunmaz.
**Önkoşullar (sırayla):** (a) 0033 ve 0034 **onaylı workflow** ile yüklendi ✔ (2026-11-20, run 44799478194); (b) §12b'deki 3 Cloudflare değişkeni girildi ve yeniden dağıtıldı (giriş ekranları açılır; senkron AÇILMAZ).
1. **Supabase → Authentication → Sign In / Providers** → yalnızca **Email** açık, **Confirm email** açık, diğerleri kapalı → doğru: başka sağlayıcı yok.
2. **Uygulama → Άλλα → Σύνδεση** → e-postan → «Αποστολή κωδικού» → mailden kod → «Σύνδεση» → doğru: e-postan görünür, sayfayı yenileyince girişli.
3. Aynı kartta **«Δημιουργία κτήματος»** sihirbazı çıkar → çiftlik adını yaz → düğmeye **bir kez** bas → doğru: «Το κτήμα δημιουργήθηκε». Çiftlik ve sahip üyeliği sunucuda kontrollü bir fonksiyonla oluşur; sihirbaz sonra kaybolur. (Sihirbaz çıkmazsa: 0034 yüklenmemiş demektir, dur.)
4. **Άλλα → Πληροφορίες** → ad, adres, telefon → kaydet → doğru: «Αποθηκεύτηκε» (bunsuz davet düğmesi kapalı).
5. **Άλλα → Εργάτες** → işçiyi ekle → **Πρόσκληση** → işçinin e-postası → doğru: «Η πρόσκληση αποθηκεύτηκε».
6. **İşçi telefonu:** uygulama → **Άλλα → Σύνδεση** → kendi e-postası → kod → doğru: sihirbaz **çıkmaz** (davet otomatik kabul edilir); yalnızca «Δουλειές / Συγκομιδή / Σημείωση» ekranları görünür (Αποθήκη, fiyat, sipariş yok).
7. **Sende:** bir iş ata (ilaçlama, ekim seç) → **işçide** «Έγινε» → doğru: işçide «Αποθηκεύτηκε», işi bitirme saati ileri değil.
8. **İşçiyi uçak moduna al**, «Έγινε»'ye bas, sonra bağlantıyı aç → doğru: önce «περιμένει», sonra gönderildi (kaybolmaz). (Senkron sihirbazı §13'te; bu satır yalnızca sihirbaz açıldıktan sonra yapılır.)
9. **Kontrol senin elinde:** Supabase → **Advisors → Security / Performance → Refresh** → doğru: «RLS Disabled in Public» uyarısı yok. Zincir kontrolü için RUNBOOK §15'teki salt okunur SQL'i **sen** dashboard'da çalıştır; sonucu yaz.
10. **Temizlik:** test işçisini Authentication → Users'tan **sen** sil (gerçek işçiyse silme).

## 12b. «Denemeyi aç» = Cloudflare'de 3 derleme değişkeni (kod PR'ı yok; geri alması da değişkenleri silmek)
**Ön koşul:** üretim 0001–0034 (tamam, 2026-11-20). Bunlar **genel** değerlerdir (gizli değil). Gizli (service/secret) anahtarı **hiçbir yere** yazma.
1. **Cloudflare** → Workers & Pages → **aloni** → **Settings → Build → Variables and secrets** → **Add** (tür: *Text*, secret DEĞİL):
 `VITE_LIVE` = `true`
 `VITE_SUPABASE_URL` = `https://jueedypyaxreudapabpr.supabase.co`
 `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_11leTWGybU2-Ae4d3u--aw_WKp4WnID`
2. **Deployments** → son derlemede **Retry deployment** (ya da main'e yeni bir merge bekle).
 Doğru sonuç: uygulamada **Άλλα** altında «Σύνδεση» ve «Εργάτες → Πρόσκληση» görünür; **senkron açılmaz** (sihirbaza basana kadar hiçbir şey gönderilmez).
3. **Geri alma:** üç değişkeni sil → Retry deployment → giriş ekranları yine kapalı.
Sonra §12a'daki 10 satıra geç.

## 12. Gerçek hesap denemesi (tek tıklama listesi; her adımı sen yaparsın)
Her adımda: **Nerede** (ekran adı) → **Ne yap** → **Doğru sonuç**. Sonuç farklıysa **dur**, ekran görüntüsünü Claude'a gönder; sonraki adıma geçme. Gizli (secret/service) anahtarı ve parolaları hiçbir yere yazma.

**Önkoşul:** 0001–0021 Supabase'e uygulanmış ve «verify» yeşil (son: run 44483049902). Giriş ve davet ekranları **kapalı** gelir (`AUTH_ENABLED = false`); açmak için Claude'a «denemeyi aç» dersin, o proje adresini ve genel (publishable) anahtarı koyup ayrı bir PR'la açar.

**0. Hazırlık kartı** — Uygulama → **Άλλα** → «Σύνδεση λογαριασμού: τι λείπει».
 Ne yap: eksik satırları tamamla (çiftlik adı burada; veri sorumlusu → adım 3; ΑΦΜ → Άλλα → Μητρώο ψεκασμών; migration ve Advisor için «Επιβεβαιώνω» düğmeleri).
 Doğru sonuç: beş satırın hepsi yeşil «Έτοιμο»; altta «Όλα είναι έτοιμα…». (Kart hiçbir şeyi açmaz.)

**1. Auth ayarları (yalnızca 6 haneli kod; bağlantı YOK)** — Supabase → **Authentication**.
 Ne yap: (a) **Sign In / Providers → Email**: açık; **Confirm email** açık; **Email OTP Length = 6**; Google/Apple vb. kapalı. (b) **URL Configuration**: **Site URL** = uygulamanın adresi (https://…); **Redirect URLs** listesine yalnızca aynı adres. (c) **Emails → Templates**: hem **Magic Link** hem **Confirm signup** şablonunda `{{ .ConfirmationURL }}` bağlantısını SİL ve yerine şunu yaz: `Giriş kodunuz: {{ .Token }}` (Yunanca: `Ο κωδικός σύνδεσης: {{ .Token }}`). (d) Menü adları değişmişse Supabase docs'ta «Email OTP» ara; Claude yalnızca `search_docs` ile bakar.
 Doğru sonuç: başka sağlayıcı açık değil; e-postada tıklanacak bağlantı yok, yalnızca 6 haneli kod var. Uygulamada kod ekranı «Στείλαμε κωδικό 6 ψηφίων…» der; «Νέος κωδικός» 60 sn sonra açılır.

**2. Sahip hesabı** — Uygulama → **Άλλα → Σύνδεση** → e-posta → «Αποστολή κωδικού» → e-postadaki kod → «Σύνδεση».
 Ne yap: girince kartta **«Κωδικός κτήματος: …»** çıkar, kopyala. Supabase → **SQL Editor**'da (bir kez): `insert into farms(id, name) values ('<çiftlik kodu>', 'Bora''nın çiftliği'); insert into farm_members(farm_id, user_id, role) values ('<çiftlik kodu>', '<senin User UID>', 'owner');` (User UID: Authentication → Users). Telefonun çiftlik kodu ile sunucudaki aynı olmak zorunda.
 Doğru sonuç: giriş kartında e-postan görünür; sayfayı yenileyince hâlâ girişli.

**3. Veri sorumlusu** — Uygulama → **Άλλα → Πληροφορίες**.
 Ne yap: ad, adres, telefon → kaydet.
 Doğru sonuç: «Αποθηκεύτηκε»; bunlar olmadan 4. adımdaki davet düğmesi **kapalı** kalır (sunucu da reddeder).

**4. Test işçisi davet et** — Uygulama → **Άλλα → Εργάτες**.
 Ne yap: işçi ekle (ör. «Δοκιμή») → altında **Πρόσκληση** → ikinci e-posta adresin → «Αποθήκευση πρόσκλησης».
 Doğru sonuç: «Η πρόσκληση αποθηκεύτηκε».

**5. İşçi girişi** — başka telefon ya da gizli sekme → uygulama → **Άλλα → Σύνδεση** → ikinci e-posta → kod.
 Doğru sonuç: giriş olur, davet otomatik kabul edilir; işçi yalnızca «Δουλειές / Συγκομιδή / Σημείωση» ekranlarını görür (Αποθήκη, fiyat, sipariş yok).

**6. İşçi ürün ekleyemiyor** — Supabase → **SQL Editor** (her şey `rollback`; `<işçi>` = Authentication → Users'ta işçinin User UID'i, `<çiftlik>` = farms tablosundaki id):
```sql
begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"<işçi>","role":"authenticated"}', true);
insert into products(farm_id, name, type, unit) values ('<çiftlik>', 'x', 'fungicide', 'kg');
rollback;
```
 Doğru sonuç: **hata** (permission denied / row-level security). «Success» görürsen **dur**.

**7. İşçi başka çiftliği göremiyor** — SQL Editor: önce `insert into farms(name) values ('Deneme 2') returning id;` sonra
```sql
begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"<işçi>","role":"authenticated"}', true);
select count(*) as gorunen_ciftlik from farms;
rollback;
```
 Doğru sonuç: **1**.

**8. Anonim `apply_ops` reddi** — SQL Editor: `begin; set local role anon; select apply_ops('[]'::jsonb); rollback;`
 Doğru sonuç: **permission denied for function apply_ops**.

**9. Zincir doğrulama** — SQL Editor: `select * from verify_spray_chain('<çiftlik>');`
 Doğru sonuç: **0 satır** (boş).

**10. Panel kontrolü (sadece bakarsın)** — Supabase → sol menü **Advisors → Security Advisor → Refresh** (ekran görüntüsü), **Performance Advisor** (ekran görüntüsü), **Table Editor** (her tabloda **RLS** rozeti açık, ekran görüntüsü).
 Doğru sonuç: «RLS Disabled in Public» ve herkese açık fonksiyon uyarısı **yok**. Çıkanları çevirmeden Claude'a göster.

**11. Temizlik** — Authentication → Users → test işçisini sil; SQL Editor: `delete from farms where name = 'Deneme 2';`
 Doğru sonuç: Users listesinde test işçisi yok; `select count(*) from farms where name = 'Deneme 2';` → 0.

## 13. Senkronu açma – 8 satır (her adımı sen yaparsın; gizli anahtar yazma)
1. **Yedek:** Άλλα → **Αντίγραφο** (ya da sihirbazda **Αντίγραφο τώρα**) → dosya telefona iner. Doğru: «Αντίγραφο δεδομένων» satırında «τελευταίο αντίγραφο: …» bugünün saati.
2. **Hazırlık kartı:** Άλλα → **Σύνδεση λογαριασμού: τι λείπει**. **«Επιβεβαιώνω: εφαρμόστηκαν οι αλλαγές έως 0034»** düğmesine bir kez bas; Advisor için Supabase → **Advisors → Security / Performance → Refresh** («RLS Disabled in Public» yok) sonra onayla. Doğru: bütün satırlar **«Έτοιμο»**.
3. **Giriş:** Άλλα → **Σύνδεση** → «Συνδεδεμένος: …». (Giriş tek başına hiçbir şey göndermez.)
4. **Aç:** Άλλα → **Άνοιγμα συγχρονισμού** (düğme yalnızca her satır yeşilken açılır) → bas. Doğru: «Ανεβαίνουν τα στοιχεία…», sonra **«Ο συγχρονισμός είναι ανοιχτός.»**
5. **Çip:** üstte **«Ο συγχρονισμός δουλεύει · τελευταίος: SS:DD»** (bir tur başarılı olunca; önce «Αναμονή πρώτου συγχρονισμού»). **«N μη συγχρονισμένα»** = bekleyen kayıt; **«Εκτός σύνδεσης»** = sinyal yok; **«Δεν στάλθηκε. Θα ξαναδοκιμάσουμε.»** = son tur olmadı, kendiliğinden dener.
6. **Kontrol:** Supabase → **Table Editor** → `parcels`, `job_spray`: sayılar telefonla aynı olmalı.
7. **Kırmızı kutu «Ο διακομιστής δεν δέχτηκε αυτές τις εγγραφές»:** her satır ne olduğunu, nedenini ve ne yapılacağını yazar; **kayıt telefonda durur, kaybolmaz**. Ekrandaki metni bana yaz; «Το είδα» yalnızca satırı kaldırır.
8. **Sorun olursa geri dönüş:** (a) **Άλλα → Αποσύνδεση**: senkron durur, telefonda hiçbir şey silinmez, bekleyenler sırada kalır; düzelince yeniden giriş + aynı düğme **kaldığı yerden** devam eder. (b) Telefon verisi bozulursa §3 (yedekten dön). (c) Sunucu tarafı için §10.3 (Supabase Backups). Üretime hiçbir yapay zeka dokunmaz.

## 14a. Hava durumu – TEK SAYFA (her adım tek yer, tek tıklama; sen yaparsın, Claude üretime dokunmaz)
**Yayın yalnızca senin «tamam»ından sonra.** Gizli anahtarı **hiçbir yere yazma** (bana da, SQL Editor'e de). Ayrıntı ve geri dönüş: §14.

**Önkoşul (bir bakış):** Supabase → **Database → Migrations** listesinde **0029, 0030, 0032** görünüyor (yoksa önce §10). Konumu girilmiş **en az bir tarla** var.

| # | Nerede | Ne yaparsın | Doğru sonuç |
|---|---|---|---|
| 1 | Parola yöneticisi | 32+ karakterlik rastgele bir dize üret, adı `WEATHER_CRON_TOKEN` | (yalnızca sende durur) |
| 2 | Supabase → **Edge Functions → Secrets → Add new secret** | ad `WEATHER_CRON_TOKEN`, değer = o dize | listede görünür |
| 3 | Supabase → **Database → Vault → Add new secret** (2 kez) | ad `weather_cron_token` (aynı dize) ve ad `weather_function_url` (`https://<PROJE-KODU>.supabase.co/functions/v1/weather-fetch`) | iki satır görünür |
| 4 | GitHub → **Actions → «Weather function deploy (manual)» → Run workflow** | `mode = dry-run` | yeşil; yalnızca hedefi (aloni, Frankfurt) ve dosyaları listeler, **hiçbir şey yüklemez** |
| 5 | aynı yer | `mode = deploy`, `confirm = DEPLOY` → **Review deployments → Approve** | yeşil, «Deployed Functions … weather-fetch» |
| 6 | Supabase → **Table Editor → parcels** | denenecek **tek** tarlanın `id`'sini kopyala | — |
| 7 | Supabase → **Edge Functions → weather-fetch → Test** | başlık `Authorization: Bearer <WEATHER_CRON_TOKEN>` (service_role anahtarı DEĞİL); gövde `{"dry_run": true, "parcel_id": "<TARLA-ID>"}` | `"ok":true,"source":"metno","dryRun":true,"stored":0` + günlere göre en düşük/en yüksek sıcaklık. **Hiçbir tabloya yazılmaz.** |
| 8 | yr.no | aynı yeri aç, sıcaklıkları karşılaştır | mantıklı → bana «tamam» de |
| 9 | Supabase → aynı Test kutusu | gövde `{}` (gerçek çalıştırma, bir kez) | `"stored":N`; **Table Editor → weather_daily** ve **weather_fetch_state** dolu |
| 10 | Telefon → **Σήμερα** | hava kartına dokun (senkron açıksa ≤10 dk) | sayfada **Πηγή: MET Norway (CC BY 4.0)**, **Εκδόθηκε: <saat>**, günlere göre rakamlar. Veri 12 saatten eskiyse **«Παλιά δεδομένα»** etiketi çıkar. Veri yoksa kart yine açılır ve **«Χωρίς δεδομένα»** + nedenini yazar (hiçbir rakam uydurulmaz). |

Takvim kendiliğinden **6 saatte bir** çalışır. **Geri dönüş (tek komut):** `select cron.unschedule('weather-fetch');` — fonksiyonu silmek gerekmez; telefonda eski veri 12 saat sonra «παλιά δεδομένα» olur. Hava yalnızca **bilgidir**: kural, bildirim veya ilaç kararı vermez.

## 14. Hava durumunu açma (6 saatte bir; ÖNCE 0029 uygulanmış olmalı)

**Kaynak (beta):** MET Norway Locationforecast 2.0 («complete»). Ücretsiz, ticari kullanım serbest, **anahtar yok** → Supabase Secrets adımı yok, para yok. Open-Meteo (ücretli plan) **sonra**: pilottan önce yeniden değerlendirilecek; geçmek `supabase/functions/_shared/weather/config.ts` içindeki tek satırı (`WEATHER_SOURCE`) değiştirmek + anahtar eklemek demek, şimdi yapılmaz.
**Kurallar (MET şartları, senin bildirdiğin hâliyle; belgenin kendisi bu ortamdan açılamadığı için sayfadan doğrulanmadı):** tanımlayıcı User-Agent (`Aloni/<sürüm> https://github.com/seaevill/Aloni`, e-posta yok), koordinat en fazla 4 ondalık, «Expires» dolmadan yeniden istek yok, sonra `If-Modified-Since`, yalnızca sunucu çağırır (telefon çağırmaz). Fonksiyon bunların hepsini kendisi yapar. Lütfen `api.met.no/doc/TermsOfService` sayfasını bir kez sen ya da ekip oku; fark çıkarsa söyle.

**Ön koşullar (sırayla):** (a) 0029 ve 0030 ekip incelemesinden sonra, diğer migration'larla **birlikte** uygulandı (§10). 0029 `farm_weather`, `weather_targets`, `weather_fetch_state`'i, 0030 **6 saatlik takvimi** kurar. (b) **0030'u uygulamadan ÖNCE** Supabase → **Database → Extensions** → `pg_cron` ve `pg_net` açık olsun (Vault zaten açık gelir). Açık değilken uygulanırsa 0030 takvimi kurmaz (yalnızca bilgi mesajı verir) ve takvim için ayrı bir migration gerekir.

1. **ÖNCE: fonksiyonun kendi token'ı ve iki Vault değeri (yalnızca Supabase panelinde; SQL Editor'e HİÇBİR anahtar yapıştırma)** — takvimin kendisini 0032 kurdu (0030'un yerine geçer). Servis anahtarı **kullanılmaz**; yalnızca bu iş için ayrı, dar bir değer var:
 a. Bir parola yöneticisinde **32+ karakterli rastgele bir dize** üret (adı: `WEATHER_CRON_TOKEN`). Bunu bana yazma.
 b. Supabase → **Edge Functions → Secrets → Add new secret** → ad `WEATHER_CRON_TOKEN`, değer = o dize.
 c. Supabase → **Database → Vault → Add new secret** (iki kez): ad `weather_cron_token`, değer = aynı dize; ad `weather_function_url`, değer `https://<PROJE-KODU>.supabase.co/functions/v1/weather-fetch` (adres `https://….supabase.co/functions/v1/weather-fetch` biçiminde değilse takvim hiçbir şey çağırmaz).
 Bu iki Vault değeri olmadan takvim hiçbir şey çağırmaz. Takvimi görmek için: `select jobname, schedule, active from cron.job;` → `weather-fetch | 7 */6 * * * | t`. İlk uygulamada ayrıca (gerçek projede) `authenticated` ve `anon` rollerinin `net._http_response` ile `net.http_request_queue` üzerinde SELECT hakkı olmadığını denetle (bunu bana söyle, ben sorguyu veririm).
2. **Fonksiyonu yükle (GitHub, onaylı, elle)** — GitHub → **Actions → «Weather function deploy (manual)» → Run workflow**.
 - Önce `mode = dry-run`: yalnızca hedef projeyi (aloni, Frankfurt) doğrular ve yüklenecek dosyaları listeler; hiçbir şey yüklemez.
 - Sonra `mode = deploy`, `confirm = DEPLOY` → **Review deployments → Approve** (aynı `supabase-production` ortamı ve aynı onay kapısı; migrate akışıyla aynı üç kontrol: yalnızca `main`, bu commit'in CI'ı yeşil, yazdığın DEPLOY).
 - **Token:** migrate için kullandığın `SUPABASE_ACCESS_TOKEN` yeter; ek bir GitHub gizli anahtarı gerekmez. Fonksiyonun kendi dar `WEATHER_CRON_TOKEN` değeri **adım 1'de** (aşağıda) Supabase panelinde oluşturulur; servis anahtarı hiçbir yerde kullanılmaz. Token'ı sınırlı yetkiyle oluşturduysan **Edge Functions yazma/dağıtma** yetkisi de olmalı; çıktı 401/403 derse (yetki adı sürüme göre değişebilir) bana yaz. Fonksiyon `--no-verify-jwt` ile yüklenir (kendi token'ını kendisi kontrol eder).
 Doğru sonuç: workflow yeşil, «Deployed Functions …weather-fetch». Henüz hiçbir şey çekmez.
3. **Tek tarla için deneme (dry-run; onay senin)** — Table Editor → `parcels` → denenecek tarlanın `id`'sini kopyala (tarlanın konumu girilmiş olmalı). Supabase → **Edge Functions → weather-fetch → Test**; başlık: `Authorization: Bearer <WEATHER_CRON_TOKEN değeri>` (adım 1'de oluşturduğun ayrı değer; **service_role anahtarı değil**; yalnızca bu test kutusuna), gövde: `{"dry_run": true, "parcel_id": "<TARLA-ID>"}`.
 Doğru sonuç: `"ok":true,"source":"metno","dryRun":true,"stored":0` ve `preview` içinde günlere göre en düşük/en yüksek sıcaklık. **Hiçbir tabloya yazılmaz.** Rakamları yr.no'daki aynı yer ile karşılaştır; mantıklıysa bana «tamam» de.
4. **Gerçek çalıştırma (bir kez)** — aynı kutu, gövde `{}`: `"stored":N`. Sonra Table Editor → `weather_daily` ve `weather_fetch_state` dolu olmalı.
5. **Telefonda gör** — senkron açıksa ≤10 dakika içinde **Σήμερα** hava kartı dolar; altında «Δεδομένα: MET Norway (CC BY 4.0) · <saat>». Veri 12 saatten eskiyse yanına «παλιά δεδομένα» yazılır. Veri yoksa «—».

**Geri dönüş:** `select cron.unschedule('weather-fetch');`. Fonksiyonu silmek gerekmez; telefonda eski veri kalır (12 saat sonra «παλιά δεδομένα»). Hava yalnızca bilgidir: kurallar imzasız olduğu sürece hiçbir karar vermez, hiçbir bildirim göndermez.


## 15. Yüklemeden ÖNCE: üretimde salt okunur kontrol (0022–0032)
**Ne zaman:** 0022–0032 yüklenmeden hemen önce, **sen** çalıştır. **Nerede:** Supabase → **SQL Editor** → yapıştır → Run. Bu sorgu **hiçbir şeyi değiştirmez** (yalnızca `select`).

```sql
select s.id, s.job_id
from job_spray s
join label_uses l on l.id = s.label_use_id
join job_plantings jp on jp.job_id = s.job_id
join plantings pl on pl.id = jp.planting_id
where s.phi_source = 'label' and pl.crop_id <> l.crop_id;
```
**Sonuç ne demek:**
- **Hiç satır yok** → sorun yok; yüklemeye geçilebilir.
- **Satır var** → eski bir ilaçlama kaydı, işindeki ürünlerden **başkasının** etiketinden bekleme süresi almış (ör. marul + roka işi, rokanın etiketi). O satırlardaki bekleme süresi o ekim için **yanlış olabilir**. **Yüklemeyi başlatma:** satır sayısını ve `id` listesini bana gönder; ben o ekimlerin hasat ve giriş kilidini nasıl etkilediğine bakıp sana tek tek yazarım. 0032'den sonra bu ekimler zaten **kapalı** sayılır (kendi ürününün imzalı etiketi yoksa «bilinmiyor = kapalı»); yani risk, **fazla kapalı** olma yönündedir, erken açılma yönünde değil.
