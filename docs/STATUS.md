# DURUM – Aloni (Bora'nın sayfası)

*Son güncelleme: 2026-11-19. Her birleştirmede güncellenir.*

## (a) Faz 1 ilerlemesi (tahmini, dürüst)
| Parça | % | Not |
|---|---:|---|
| Kayıtlar (tarla, ekim, ürün, ilaçlama, hasat, stok) | 85 | düzeltme, düzenleme, tank karışımı var; fotoğraf deposu (0028) yok |
| Güvenlik | 80 | 0022–0027 ekip incelemesi bekliyor; açık MUST bilinmiyor |
| Görünüm | 66 | Bora istediği görünümü henüz görmüyor: prototip düzenine geçiş başlıyor (E2) |
| Senkron / işçi | 70 | kod hazır, LIVE kapalı; denenmedi |
| Hava / bildirim | 40 | hava ekranı hazır (veri yok), bildirim altyapısı hazır (gönderim yok) |
| Sipariş | 10 | Κλούβες bağlantısı daha başlamadı (yalnızca tedarik tablosu hesabı) |

## (b) Bu turda telefonda ne değişti
- İlaçlama düzeltmesi bitişi geriye alamıyor; işçi «Έγινε»de başlangıç saati soruluyor; tarla/ekim düzenlemede neden zorunlu.
- **Σήμερα prototipin düzenine geçti** (koyu başlık bandı, koyu hava kartı 4 karo, KPI karoları). Sol prototip | sağ uygulama: `docs/design/compare/today.png`. Öz puan 7/10 (hasat 7/28 gün kasa karoları ve uyarı listesi henüz yok).
- **Tarla detay ekranı geldi**: Χωράφια'da bir tarlaya dokununca koyu başlık, sınır kroki, bilgi tablosu, kesim durumu, hava, ekimler, son ilaçlamalar. Prototip | uygulama: `docs/design/compare/parcel-detail.png`. Öz puan 7/10.
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
