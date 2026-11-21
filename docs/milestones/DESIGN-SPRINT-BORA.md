# Tasarım sprinti (2026-11-21) – Bora paketi

Kaynak: `docs/design/design-sprint-2026-11-21.md`. Burada yalnızca senin iPhone'da denemen gerekenler var. Görsel puanı sen verirsin.

## Telefonda 6 kontrol (Yunanca ekran adlarıyla)
1. **Σήμερα** (Demo): üstte tek koyu yeşil kart (en acil iş), altında hava, sonra iki büyük sayı: «Για κοπή σήμερα» ve «Κλούβες 7 ημ.» (küçük çizgi grafikle). İki büyük düğme (**Νέος ψεκασμός**, **Καταγραφή συγκομιδής**) ilk ekranda, sekme çubuğunun altında hiçbir şey kalmıyor. Sağ üstte paylaş simgesi var.
2. **Χωράφια**: (Codex işi, merge olunca) beş tarla tek çizimde yan yana; dokununca o tarla vurgulanır.
3. **Φυτά** (sekme adı): her bitkinin kendi küçük çizimi var (Σέσκουλα ile Ραδίκια ayırt edilir). Ekran başlığı hâlâ «Καλλιέργειες».
4. **Παραγγελίες vs συγκομιδή**: (Codex işi) 4 haftalık çubuk; eksikse «λείπουν N κλούβες» yazılı; bekleyen/bilinmeyen kasalar «άγνωστο» ve sayılmaz.
5. **Ana ekran ve paylaşım**: yeni Αλώνι simgesi (taş halkası) ve açılış ekranı; Σήμερα'daki paylaş düğmesi yalnızca bitki çizimleri, tarih ve haftalık kasa sayısı olan bir resim yapar (Demo'da «ΕΠΙΔΕΙΞΗ»). İsim, tarla adı, konum, ilaç, fiyat resme **giremez**.
6. **İşçi görünümü** (Άλλα → Προβολή εργάτη): iş kartı ve büyük «Έγινε» / «Δεν έγινε» düğmeleri yerinde; kilit varsa tam genişlikte kırmızı şerit (Yunanca + Hintçe metin); «Έγινε» kaydedilince kısa bir tik çizilir; hiçbir şey seni bekletmez. Gözlem sekmesinde 72 px'lik fotoğraf düğmesi.

Ek: ilk kez açan telefonda 3 kısa kart çıkar (atlanabilir); Demo'da tek bir sarı şerit «Επίδειξη – φανταστικά στοιχεία» var, gerçek çiftlikte yok.

## Özet (Türkçe)
- **Bitti:** tasarım sistemi (renk/yazı ölçüleri, durum etiketleri, kart ve satır yüzeyleri, sayı ve grafik bileşenleri), 32 simge, 17 bitki çizimi, marka halkası + simge + açılış ekranı, 8 boş durum çizimi, ilk açılış kartları, hareket kuralları, yeni Σήμερα sırası, işçi ekranı + fotoğraf, paylaşım kartı, tek Demo şeridi.
- **Güvenlik kuralları değişmedi:** ürün/doz seçimi yok, bekleme süresi kısalmaz, uydurma sayı yok, «güvenli» kelimesi yok. Veri yoksa «άγνωστο» yazar, sıfır yazmaz.
- **Yapılmadı / sonra:** iş kartına fotoğraf bağlama (telefon-sunucu sözleşmesi değişikliği ister, BACKLOG); Χωράφια/Φυτά/Αποθήκη/Μητρώο/Άλλα ekranlarının yeni görünümü Codex'te (C1–C13).
- **Önemli:** bitki çizimleri ilk taslak; beğenmediğin olursa tek dosyada yeniden çizilir (`illustrations/crops/shapes.ts`).
