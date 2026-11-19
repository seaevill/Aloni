# DURUM – Aloni (Bora'nın sayfası)

*Son güncelleme: 2026-11-19. Her birleştirmede güncellenir.*

## (a) Faz 1 ilerlemesi (tahmini, dürüst)
| Parça | % | Not |
|---|---:|---|
| Kayıtlar (tarla, ekim, ürün, ilaçlama, hasat, stok) | 85 | düzeltme, düzenleme, tank karışımı var; fotoğraf deposu (0028) yok |
| Güvenlik | 80 | 0022–0027 ekip incelemesi bekliyor; açık MUST bilinmiyor |
| Görünüm | 66 | Bora istediği görünümü henüz görmüyor: prototip düzenine geçiş başlıyor (E2) |
| Senkron / işçi | 70 | kod hazır, LIVE kapalı; denenmedi |
| Hava / bildirim | 40 | hava ekranı hazır (veri yok), bildirimlerde 16 kuralın listesi var, hepsi «imzasız = bildirim yok» (gönderim yok) |
| Sipariş | 10 | Κλούβες bağlantısı daha başlamadı (yalnızca tedarik tablosu hesabı) |
| Hava / bildirim | 40 | hava ekranı hazır (veri yok), bildirim altyapısı hazır (gönderim yok) |
| Sipariş | 40 | Κλούβες yedeğini elle yükleme + «Διαθέσιμες κλούβες» ekranı hazır (Daha fazla → Παραγγελίες); PHI bekleyen sayılmaz; otomatik bağlantı yok |

## (b) Bu turda telefonda ne değişti
- İlaçlama düzeltmesi bitişi geriye alamıyor; işçi «Έγινε»de başlangıç saati soruluyor; tarla/ekim düzenlemede neden zorunlu.
- **Σήμερα prototipin düzenine geçti** (koyu başlık bandı, koyu hava kartı 4 karo, KPI karoları). Sol prototip | sağ uygulama: `docs/design/compare/today.png`. Öz puan 7/10 (hasat 7/28 gün kasa karoları ve uyarı listesi henüz yok).
- **Tarla detay ekranı geldi**: Χωράφια'da bir tarlaya dokununca koyu başlık, sınır kroki, bilgi tablosu, kesim durumu, hava, ekimler, son ilaçlamalar. Prototip | uygulama: `docs/design/compare/parcel-detail.png`. Öz puan 7/10.
- **Tarla detay ekranı geldi**: Χωράφια'da bir tarlaya dokununca koyu başlık, sınır kroki, bilgi tablosu, kesim durumu, hava, ekimler, son ilaçlamalar. Prototip | uygulama: `docs/design/compare/parcel-detail.png`. Öz puan 7/10.
- **Ürün detay ekranı geldi** (Καλλιέργειες'te ürüne dokun): ekimler + son ilaçlama ve bekleme süresi. Öz puan 5/10 (öneri kartları ve sipariş tablosu yok).
- EPPO kodları ekip listesine göre güncellendi (14 kod dolu, 3 boş).
- Ekran görüntüleri: `docs/design/screenshots-2026-11-19c/`.

## (c) Telefonda deneyeceğin adımlar (en fazla 7)
1. Άλλα → «Ειδοποιήσεις»: sessiz saatleri gör.
2. Bir tarla ekle, «Επεξεργασία» ile alanı değiştir; neden iste.
3. İlaçlama kaydet (başlangıç saati yaz), sonra «Διόρθωση» ile dozu düzelt.
4. İki ürünü «Αποθήκευση και άλλο προϊόν» ile aynı karışıma kaydet.
5. İşçi ekranında «Έγινε» (başlangıç saati iste).
6. Σήμερα'da «bugün kim ne yaptı» kartına bak.
7. Tarla formunda «Όρια στον χάρτη»yi aç (internet gerekir).

## (d) Senden beklenen kararlar ve onaylar
- **Apply:** 0022–0028 **onay bekliyor** (0028 yeni: fotoğraf deposu). docs/reviews/team/'de ekibin yeniden bakması gerekiyor (MUST'lar düzeltildi ama «kapandı» notu yok). Öneri: ekip kapattıktan sonra hepsini birlikte uygula.
- Diğer kararlar (EPPO, OpenFreeMap, Hintçe, logo, veri sorumlusu, LIVE) E6'da yazılacak.
## Canlıya geçiş kontrol listesi (LIVE'ı açmadan önce; sırayla)
1. ☐ Ekip 0022–0028 için `docs/reviews/team/`'de «MUST kapandı» yazdı.
2. ☐ 0022–0028 **birlikte** uygulandı, `verify` yeşil (RUNBOOK §10).
3. ☐ Supabase **Advisors** (Security + Performance) temiz.
4. ☐ Gerçek hesap denemesi yapıldı (RUNBOOK §12, 11 adım).
5. ☐ Άλλα → «Σύνδεση λογαριασμού: τι λείπει» kartı beş satırda yeşil (veri sorumlusu, çiftlik adı, ΑΦΜ, migration 0028, Advisor).
6. ☐ Telefonda taze **yedek** alındı.
7. ☐ Claude'a «LIVE aç» dersin → proje adresi + genel anahtar ile ayrı PR → birleşir.
8. ☐ Άλλα → «Άνοιγμα συγχρονισμού» (RUNBOOK §13) → «Ο συγχρονισμός είναι ανοιχτός».

## (d) Senden beklenen kararlar ve onaylar (varsayılan önerimle)
| # | Karar | Önerim (varsayılan) |
|---|---|---|
| 1 | **Apply 0022–0028** | Ekip «MUST kapandı» dedikten sonra hepsini birlikte uygula. Şu an açık MUST bilinmiyor (ekip yeniden bakıyor). |
| 2 | **EPPO**: Σέλινο, Μυρώνι, Βλήτα için kod yok | Boş kalsın (dökümde «συμπληρώστε» uyarısı çıkar). 14 kod ekip kontrolünden geçti. |
| 3 | **OpenFreeMap şartları** okunamadı (site bu ortamdan açılmıyor) | Şartları sen ya da ekip openfreemap.org/tos'tan oku (anahtarsız kullanım, atıf, adil kullanım). Uygun değilse harita sağlayıcısını değiştiririz; o zamana kadar harita yalnızca sahip isteyince açılır. |
| 4 | **Hintçe kontrolü** | `docs/i18n/hi-print.html`'i yazdırıp Hintçe bilen işçiye okut; yanlışları yazdır, ben düzeltirim. |
| 5 | **Logo / ikon** | Şimdilik geçici ikon (yeşil zemin). Logo hazır olunca gönder; ben PNG'leri üretirim. |
| 6 | **Veri sorumlusu bilgileri** (ad, adres, telefon) ve **ΑΦΜ** | Άλλα → Πληροφορίες'e sen yaz; depoya hiçbir yerde yazılmaz. İşçi daveti bunlar olmadan kapalı. |
| 7 | **LIVE** | Yukarıdaki listenin 1–6. adımı bittikten sonra aç. |
| 8 | **Hava verisi** (Open-Meteo lisansı) | Kişisel/ticari olmayan kullanım için ücretsiz; ticari kullanımda ücretli plan gerekir. Lisans netleşene kadar hava şeridi boş («—») kalır. Edge Function henüz iskelet (aşağıda BACKLOG E4). |
