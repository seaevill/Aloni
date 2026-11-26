# Kurallar: aloni-gelistirme

Ajan bu dosyayı değiştiremez. Yeni kural yalnızca `/denetim` sırasında Bora'nın onayıyla eklenir.

Kaynak: 1–7 arası maddeler 17 Kasım 2026 ekip toplantısı kararlarından alındı. Bora bunları ilk koşudan önce gözden geçirmeli; güncel olmayanı silmeli.

## İşin ölçütleri

1. **PR küçük olur.** Kilit dosyası hariç 450 satırı geçen PR açılmaz; iş bölünür.
2. **Her yasağın bir "kaçma denemesi" testi vardır.** Bir güvenlik kuralı ya da yasak eklendiğinde, o yasağı delmeye çalışan en az bir test de eklenir. Yalnızca olumlu test yetmez.
3. **Doz, etiket ve tarım kuralları mühendis onaylıdır.** Onaylanmamış değer koda girmez; girmesi gerekiyorsa açıkça "onay bekliyor" diye işaretlenir ve kullanıcıya gösterilmez.
4. **"Güvenli" sözü kullanılmaz.** Uygulama güvence vermez; durum bildirir.
5. **Yunanca metinler terim sözlüğüne uyar.** Sözlükte olmayan terim uydurulmaz, `bekleyen_kararlar` alanına yazılır.
6. **Sayılar tek biçimde yazılır.** Yunanca ekranlarda ondalık ayırıcı virgüldür (2,5 ve 0,63); karışık biçim bırakılmaz.
7. **İşçi ekranlarında konum takibi yoktur.** Düğmeler büyük (en az 72 px), durumlar simgeyle gösterilir.

## Her PR için

8. Testler gerçekten çalıştırılır ve çıktısı PR açıklamasına konur.
9. Bir PR tek bir işi yapar. İlgisiz düzeltme aynı PR'a eklenmez.
10. Veritabanı değişikliği varsa geri alma yolu PR açıklamasında yazılır.

## Asla

- Ana dala doğrudan yazma ya da birleştirme.
- Testi atlama, devre dışı bırakma ya da silerek geçirme.
- Gerçek müşteri ya da işçi verisini test verisi olarak kullanma.
