# Adım (a) – hesap güvenliği değerlendirmesi (17.11.2026)

**Karar: İyi, ama şu 5 ekle.** Ayrı Gmail, Bitwarden (EU), SMS yerine uygulama ve parolayı kimseye yazmama doğru. Eksik olan tek büyük şey şu: **iPhone kaybolursa** Bora kendini dışarıda bırakabilir.

## Kodlayıcıya yapıştırılacak ekler

1. **Kilitlenme döngüsünü kır (kâğıt "acil durum zarfı").** Bitwarden yeni bir cihazda çiftlik Gmail'ine kod gönderir. Gmail parolası Bitwarden'da, Gmail kodu da iPhone'da. Telefon kaybolursa ikisine de giremem. Bu yüzden tek bir kâğıda şunları yazıp zarfa koyacağım: Bitwarden ana parolası, Gmail parolası, Gmail yedek kodları, GitHub kurtarma kodları ve (açarsam) Bitwarden kurtarma kodu. Zarf evde kalacak.

2. **Gmail'e kurtarma telefonu ve kurtarma e-postası ekle.** Kendi cep numaramı ve kişisel e-postamı yalnızca "kurtarma" için ekleyeceğim, giriş için değil. Google bunu öneriyor. Ayrıca Google'da ve GitHub'da **geçiş anahtarı (passkey, Face ID)** açacağım. En kolay giriş yolu bu. Doğrulama uygulaması yedek olarak kalsın.

3. **Tek seçenek söyle: iPhone Şifreler uygulaması.** "Ente ya da Şifreler" demek kafa karıştırıyor. Ente ayrı bir hesap, ayrı bir parola ve e-posta doğrulaması ister. Şifreler uygulaması telefonda zaten var ve iCloud ile yedekleniyor. Önce iCloud Anahtar Zinciri'nin açık olduğunu kontrol edeceğim. Parolalar sadece Bitwarden'da duracak, kodlar sadece Şifreler'de.

4. **GitHub kurtarma kodlarını da kaydet.** Talimatta yalnızca Google'ın yedek kodları var. GitHub 2FA açılınca kurtarma kodları da veriyor. Bunlar da Bitwarden'a ve zarfa girecek. GitHub hesabımın kişisel e-postamda mı olduğunu kontrol et. Gerekirse çiftlik e-postasını ikinci adres olarak ekle.

5. **Tek kişiye bağlı kalma ve bir kez dene.** Güvendiğim bir aile üyesi zarfın yerini bilsin. Bitwarden'ın "Acil Erişim" özelliği ücretli (Premium, yılda yaklaşık 10 $), o yüzden şimdilik zarf yeterli. Kurulumdan sonra bilgisayarda Gmail'den bir kez çıkıp zarftaki yedek kodla tekrar gireceğim. Böylece kurtarmanın çalıştığını göreceğim.

Not: Bitwarden'da bölge yalnızca hesap açarken seçilir, sonra taşınamaz. EU'yu açarken seçin (bitwarden.eu).

## Kaynaklar

- Bitwarden – Server Geographies: https://bitwarden.com/help/server-geographies/
- Bitwarden – New Device Login Protection: https://bitwarden.com/help/new-device-verification/
- Bitwarden – Emergency Access: https://bitwarden.com/help/emergency-access/
- Bitwarden – Fiyatlar: https://bitwarden.com/pricing/
- Google – Hesabınızın kilitlenmesini önleyin: https://support.google.com/accounts/answer/7684753
- Google – 2 Adımlı Doğrulama sorunları / kayıp telefon: https://support.google.com/accounts/answer/185834
- Apple Şifreler uygulamasında doğrulama kodları: https://www.macrumors.com/how-to/generate-verification-codes-passwords-app-ios
- Ente Auth SSS: https://ente.io/help/auth/faq
