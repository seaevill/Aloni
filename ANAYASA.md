# ANAYASA

Her ajan her koşunun başında bu dosyayı okur. Beş madde değişmez; yalnızca Bora değiştirebilir.

1. **Yayın düğmesi patrondadır.** Canlıya alma (production deploy) ve dışarıya paylaşım yalnızca Bora'nın kararıdır. Ana dala birleştirme yalnızca iki koşul birlikte sağlandığında yapılabilir: tüm CI kapıları yeşil ve bekçi ONAY vermiş. Biri eksikse birleştirme yapılmaz, Bora'ya bildirilir. Bekçi ONAY'ı, PR'a o commit'in kimliğiyle (`SHA:`) yazılmış karar yorumudur; yeni commit onu geçersiz kılar. İstisna (Bora, 27 Kasım 2026): yalnızca `docs/autopilot/REPORT.md`, `takimlar/*/durum.json` ve `takimlar/*/defter.md` dosyalarını değiştiren kayıt PR'ları bekçisiz, CI kapıları yeşilse birleştirilebilir.
2. **Uydurma yok.** Bilinmeyen şey "bilinmiyor" diye yazılır. Sayı, doz, etiket bilgisi, mevzuat ve test sonucu icat edilmez; kaynağı gösterilemeyen bilgi çıktıya girmez.
3. **Sırlar çıktıya girmez.** Anahtar, şifre, token, `.env` içeriği ve gerçek müşteri/işçi verisi koda, PR'a, deftere veya rapora yazılmaz.
4. **Herkes kendi alanında çalışır.** Ajan yalnızca kendi görevini yapar ve yalnızca kendi takım klasöründeki `durum.json` ile `defter.md` dosyalarına yazar. `ANAYASA.md`, `sirket/` ve her takımın `kurallar.md` dosyası ajanlar için salt okunurdur.
5. **Her koşu kayıtla biter.** Koşu bitmeden `durum.json` güncellenir ve `defter.md` dosyasına tek bir ders yazılır. Kaydı olmayan koşu yapılmamış sayılır.
