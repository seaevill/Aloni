# RUNBOOK – Aloni (geçici ad) (Bora için tek sayfa, taslak)

> Durum: **M0 taslağı.** Hesaplar (Cloudflare, Supabase) henüz açılmadı; aşağıdaki adımlar hesaplar açılınca doldurulacak.
> Kural: sen hiçbir komut yazmazsın. Claude GitHub'a değişiklik gönderir, CI yeşilse yayına çıkar.

## 1. Yayına alma (deploy)
- Her pull request için Cloudflare Pages bir **önizleme adresi** üretir. Telefonda orayı açıp denersin.
- Sen "Birleştir" (Merge) dediğinde `main` dalı otomatik yayına çıkar. *(Cloudflare hesabı açılınca etkinleşir.)*
- CI (typecheck + testler + 375 px WebKit) kırmızıysa birleştirme düğmesi çalışmaz. Kırmızıyı Claude'a ilet.

## 2. Geri alma (rollback)
- Cloudflare Pages → projen → **Deployments** → önceki yayının yanındaki **Rollback to this deployment**. Bir tık, veri kaybı yok.
- Veriler telefonda (yerel) tutulduğu için uygulama sürümünü geri almak kayıtlarını silmez.

## 3. Yedekten dönme
- **Şu an (M0):** veriler yalnızca telefonda. Demo çiftlik gerçek verinden ayrıdır; "Diğer → Demo çiftliği sil" gerçek verine dokunmaz.
- **Supabase sonrası:** günlük otomatik yedek + haftalık `pg_dump` (senin sahip olduğun AB kovası) + uygulamadan JSON dışa aktarma. Geri yükleme tatbikatı M5'te.

## 4. Sorun olursa
1. Uygulama açılmıyor → iPhone'da ana ekrandan sil, Safari'den adresi aç, yeniden "Ana Ekrana Ekle".
2. Eski sürüm görünüyor → uygulamayı tamamen kapat ve yeniden aç (otomatik güncellenir).
3. Veri kayıp görünüyor → önce "Diğer → Etkin çiftlik" bölümünde doğru çiftliğin seçili olduğuna bak (Demo ≠ Gerçek).
4. Claude'a ekran görüntüsü + ne yaptığını yaz.

## 5. Hesaplar (sahibi: Bora)
GitHub ✔ · Cloudflare ☐ · Supabase (Frankfurt) ☐ · E-posta gönderici ☐ · Alan adı ☐ · Yedek kovası ☐

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
