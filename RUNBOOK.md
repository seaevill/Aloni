# RUNBOOK – Aloni (geçici ad) (Bora için tek sayfa, taslak)

> Durum (2026-11-17): M1 kayıt ekranları bitti (parsel, ekim, ürün/ilaç, etiket, stok, analiz, fotoğraf, yedek). Pages kurulumu §8'de, Supabase kurulumu §9'da. Veriler şimdilik yalnızca telefonda.
> Kural: sen hiçbir komut yazmazsın. Claude GitHub'a değişiklik gönderir, CI yeşilse yayına çıkar.

## 1. Yayına alma (deploy)
- Her pull request için Cloudflare Pages bir **önizleme adresi** üretir. Telefonda orayı açıp denersin.
- Sen "Birleştir" (Merge) dediğinde `main` dalı otomatik yayına çıkar (adres: `https://aloni.pages.dev`, §8 kurulumdan sonra).
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
GitHub ✔ · Cloudflare (§8, doğrulanmadı) ☐ · Supabase (Frankfurt, §9) ☐ · E-posta gönderici ☐ · Alan adı ☐ · Yedek kovası ☐

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

## 8. Cloudflare Pages kurulumu (bir kez, sahibi: Bora)
Ücretsiz plan yeterli. **Kart/ödeme isteyen bir ekran çıkarsa dur, atla ve Claude'a yaz.** Claude'a parola, anahtar ya da token yazma.
1. dash.cloudflare.com → sol menü **Workers & Pages** → **Create application**.
2. **"Create Worker" değil:** sayfada **Pages** sekmesini/bağlantısını seç → **Connect to Git** (Import an existing Git repository).
3. GitHub hesabını seç → depo **`seaevill/Aloni`** → **Begin setup**. (Depo listede yoksa: "Configure GitHub access" ile `Aloni` deposuna erişim ver.)
4. Proje adı: **`aloni`** → adres `aloni.pages.dev` olur. Başka biri almışsa **dur ve Claude'a yaz** (başka ad seçme).
5. Production branch: **`main`**.
6. Build ayarları: Framework preset **None**; Build command **`npm run build`**; Build output directory **`app/dist`**; **Root directory (advanced) boş kalsın** (depo kökü; `@aloni/rules-core` pakete lazım).
7. Environment variables: **ekleme** (Node sürümü depodaki `.node-version` dosyasından gelir: 22). **Save and Deploy**.
8. İlk yayın birkaç dakika sürer. Bitince `https://aloni.pages.dev` adresini aç; Περισσότερα → altta «Έκδοση: … · xxxxxxx» görünmeli.
9. Proje → **Settings** → **Builds & deployments** → **Preview deployments**: **All non-production branches** seçili olsun (her PR kendi önizleme adresini alır; Cloudflare PR'a yorum olarak yazar).
10. **Web Analytics KAPALI kalsın:** proje → **Metrics** sekmesinde "Enable" düğmesine **basma**. Sonradan açık görürsen kapat.
11. Telefonda: Safari ile `https://aloni.pages.dev` → Paylaş → **Ana Ekrana Ekle**.

**Önizleme adresleri hakkında (önemli):** her PR/yayın kendi adresinde çalışır (`<kod>.aloni.pages.dev` ve `<dal-adı>.aloni.pages.dev`). Tarayıcı verisi **adrese özeldir**: önizlemede girdiğin kayıtlar yalnızca o adreste ve o telefonda kalır, `aloni.pages.dev`'e **taşınmaz**, yeni bir önizleme adresinde de görünmez. Önizlemede **gerçek verini girme**, yalnızca denemek için kullan. Gerçek kayıtların için her zaman `https://aloni.pages.dev`.

## 9. Supabase kurulumu (bir kez, sahibi: Bora) – M1'in sonunda, canlı eşitleme (PR 16) için
Ücretsiz plan yeterli başlangıç. **Kart/ödeme isteyen bir ekran çıkarsa dur ve Claude'a yaz.** Claude'a **parola, `service_role`/secret anahtar, veritabanı parolası veya token yazma**; sadece aşağıda "Claude'a yaz" denen şeyi yaz.
1. supabase.com → **Start your project** → GitHub hesabınla giriş (en kolayı). Giriş sonrası hesap güvenliği ayarlarından **iki adımlı doğrulamayı** (2FA) aç; kurtarma kodlarını §6'daki zarfa koy.
2. **New organization** (ad: `aloni`), plan **Free**. Kart isteyen bir seçenek görürsen **Free**'de kal.
3. **New project:** ad `aloni`. **Database password:** *Generate a password* ile üret, **Şifreler uygulamasına (parola yöneticine) kaydet**; kimseye, Claude'a bile yazma. **Region:** **Europe → Central EU (Frankfurt)**, yani `eu-central-1`. (Londra/Zürih'e giden genel «Central EU» değil, Frankfurt'u adıyla seç.) «Enable automatic RLS» seçeneği varsa **açık** bırak. **Create new project** (birkaç dakika sürer).
4. **Önemli (Free plan):** 7 gün hiç işlem olmazsa proje **durur**, panelden elle «Restore» ile açılır. Uygulama canlı kullanıma geçince bu sorun olmaz; o zamana kadar ayda bir paneli aç.
5. Proje açılınca **Project Settings → Data API**: yalnızca **Project URL**'yi (`https://xxxxxxxx.supabase.co`) Claude'a yaz. Bu adres gizli değil, güvenlik başlığına (CSP) eklenecek. **`anon`/publishable anahtarını Claude'a YAZMA:** onu Cloudflare'e sen girersin (6. adım).
6. Cloudflare → `aloni` projesi → **Settings → Variables and Secrets (Environment variables)** → **Production** (ve Preview) için iki değişken ekle: `VITE_SUPABASE_URL` = Project URL, `VITE_SUPABASE_ANON_KEY` = Supabase'teki **anon / publishable** anahtar. (`service_role`/secret anahtarı **hiçbir yere koyma**.) Sonra **Deployments → Retry deployment**.
7. **Authentication → URL Configuration:** *Site URL* = `https://aloni.pages.dev`. **Authentication → Providers → Email** açık; **«Allow new users to sign up» kapalı** (kullanıcıları sen davet edeceksin; Claude bunu PR 16'da birlikte kontrol eder).
8. **Veritabanı kurulumu (SQL):** Claude her migration dosyasını (`supabase/migrations/…`) sana verir; sen **SQL Editor → New query**'ye yapıştırıp **Run**'a basarsın, sırayla. Claude hangi dosyanın sırada olduğunu ve «Success» çıktısını nasıl göreceğini yazar. Bir dosya hata verirse **durup** ekran görüntüsünü Claude'a gönder.
9. **Yedek (para sorusu):** Free planda günlük otomatik yedek **yok**. Plan: haftalık `pg_dump` (senin AB kovan) + uygulamadan JSON yedeği. Pro (25 $/ay) günlük yedek ekler; **para gerektirdiği için sen onaylamadan açılmaz**.
10. Bittiğinde Claude'a «Supabase tamam» ve Project URL'yi yaz. Claude PR 16'ya (canlı eşitleme) başlar.
