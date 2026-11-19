# DURUM – Aloni (Bora'nın sayfası)

*Son güncelleme: 2026-11-19 (akşam). Her birleştirmede güncellenir. Burası dışında bir şey okumana gerek yok.*

## (a) Faz 1 ilerlemesi (tahmini, dürüst)
| Parça | % | Not |
|---|---:|---|
| Kayıtlar (tarla, ekim, ürün, ilaçlama, hasat, stok) | 88 | düzeltme, düzenleme, tank karışımı var; fotoğraf deposu (0028) yazıldı, uygulanmadı |
| Güvenlik | 85 | 0022–0029: ekibin son incelemesindeki 1 MUST + 4 SHOULD + 2 LOW yerinde düzeltildi (önce kırmızı test); **ekip tekrar bakacak** |
| Görünüm | 72 | Σήμερα, tarla detayı, ürün detayı, Αποθήκη prototip düzeninde; Άλλα menüsü üstte; Μητρώο, işçi ekranı kaldı |
| Senkron / işçi | 70 | kod hazır, LIVE kapalı; gerçek hesapla denenmedi |
| Hava / bildirim | 65 | hava: kaynak MET Norway (ücretsiz, anahtarsız); sunucu işi + 0029 + telefon ekranı (kaynak, saat, «παλιά δεδομένα») yazıldı, **hiçbiri açık değil** (RUNBOOK §14); bildirim: 16 kural listelenir, hepsi «imzasız = bildirim yok» |
| Sipariş | 40 | Κλούβες yedeğini elle yükleme + «Διαθέσιμες κλούβες» ekranı hazır; otomatik bağlantı yok |
| Kural motoru (golden) | – | 27 vakanın 27'si şema kontrolünden geçiyor; **9 motorda çalışıyor, 18 atlandı** (motor kodu yok: don, püskürtme penceresi, rotasyon, azot, ekim, ruhsat, tuz, hasat tahmini) |

## (b) Bu turda telefonda ne değişti
- **Σήμερα**: son 7 ve 28 günde kesilen kasa karoları eklendi. Prototip | uygulama: `docs/design/compare/today.png`. Öz puan 7/10.
- **Χωράφια → tarla detayı** (kroki, bilgi tablosu, kesim durumu, hava, ekimler). `docs/design/compare/parcel-detail.png`. 7/10.
- **Καλλιέργειες → ürün detayı** (ekimler, son ilaçlama + bekleme süresi). 5/10 (öneri kartları ve sipariş tablosu yok).
- **Αποθήκη** prototip düzeninde: koyu başlık, tür filtre düğmeleri, etiketli kartlar, kalan miktar + son kullanma + onaylı etiketten bekleme süresi. `docs/design/compare/stock.png`. 7/10.
- **Άλλα → Παραγγελίες**: Κλούβες yedek dosyanı yükle; ürünler ekinlere eşleşir (sen onaylarsın); ekin başına bu/geçen hafta sipariş, kesime hazır ekim sayısı, bekleyenler **sayılmaz**.
- **Άλλα → Ειδοποιήσεις**: 16 kuralın listesi; agronom onayı kaydedilene kadar hiçbiri bildirim göndermez.
- Başlangıç saati zorunlu (işçi «Έγινε»), düzeltme bitişi geriye alamaz, tarla/ekim düzenlemede neden zorunlu.
- Karşılaştırma görüntüleri (sol prototip, sağ uygulama): `docs/design/compare/` (today, parcel-detail, stock, crops-list, parcels-list, more).

## (c) Telefonda deneyeceğin adımlar (en fazla 7)
1. Άλλα → Παραγγελίες: Κλούβες'ten aldığın yedek dosyasını yükle; ürün–ekin eşleşmelerini kontrol et.
2. Αποθήκη: tür filtrelerine bas; bir ürünün altındaki «Αναμονή» satırı yalnızca onaylı etiketten gelir.
3. Σήμερα: «Κλούβες 7/28 ημερών» karolarına bak (bir hasat kaydedince artar).
4. Άλλα → Ειδοποιήσεις: 16 kural «χωρίς έγκριση» görünür; sessiz saatleri gör.
5. İlaçlama kaydet (başlangıç saati yaz), sonra «Διόρθωση» ile dozu düzelt.
6. İki ürünü «Αποθήκευση και άλλο προϊόν» ile aynı karışıma kaydet.
7. İşçi ekranında «Έγινε» (başlangıç saati iste).

## (d) Senden beklenen kararlar ve onaylar (varsayılan önerimle)
| # | Karar | Önerim (varsayılan) |
|---|---|---|
| 1 | **Apply 0022–0029** | Ekip «MUST kapandı» dedikten sonra hepsini birlikte uygula (RUNBOOK §10). `docs/reviews/team/2026-11-19-m6-0029.md`'deki MUST ve SHOULD'lar düzeltildi; ekibin yeniden bakması bekleniyor. Bu kontrolü (açık MUST var mı) uygulamadan önce yine yaparım. 0029 yalnızca hava okuma fonksiyonları ekler. |
| 2 | **Hava kaynağı** | Beta: MET Norway (ücretsiz, anahtarsız, ticari serbest). **Para yok.** Open-Meteo ücretli plan pilot öncesi yeniden değerlendirilir. Senden: `api.met.no/doc/TermsOfService`'i bir kez oku (ben bu ortamdan açamadım; şartları senin bildirdiğin hâliyle uyguladım) + RUNBOOK §14 adım 2'deki tek tarla **dry-run** onayı. |
| 3 | **EPPO**: Σέλινο, Μυρώνι, Βλήτα için kod yok | Boş kalsın (dökümde «συμπληρώστε» uyarısı). 14 kod ekip kontrolünden geçti. |
| 4 | **OpenFreeMap şartları** okunamadı (site bu ortamdan açılmıyor) | Şartları sen ya da ekip openfreemap.org/tos'tan oku. Uygun değilse sağlayıcıyı değiştiririz; o zamana kadar harita yalnızca sahip isteyince açılır. |
| 5 | **Hintçe kontrolü** | `docs/i18n/hi-print.html`'i yazdırıp Hintçe bilen işçiye okut. |
| 6 | **Logo / ikon** | Şimdilik geçici ikon. Logo hazır olunca gönder. |
| 7 | **Veri sorumlusu bilgileri** (ad, adres, telefon) ve **ΑΦΜ** | Άλλα → Πληροφορίες'e sen yaz; depoya yazılmaz. İşçi daveti bunlar olmadan kapalı. |
| 8 | **Gerçek Κλούβες yedeği ile deneme** | Bir yedek dosyasını yükleyip eşleşmeleri kontrol et; yanlış eşleşme varsa söyle. |
| 9 | **LIVE** | Aşağıdaki listenin 1–6. adımı bittikten sonra aç. |

## Canlıya geçiş kontrol listesi (LIVE'ı açmadan önce; sırayla)
1. ☐ Ekip 0022–0029 için `docs/reviews/team/`'de «MUST kapandı» yazdı.
2. ☐ 0022–0029 **birlikte** uygulandı, `verify` yeşil (RUNBOOK §10).
3. ☐ Supabase **Advisors** (Security + Performance) temiz.
4. ☐ Gerçek hesap denemesi yapıldı (RUNBOOK §12, 11 adım).
5. ☐ Άλλα → «Σύνδεση λογαριασμού: τι λείπει» kartı beş satırda yeşil (veri sorumlusu, çiftlik adı, ΑΦΜ, migration 0028, Advisor).
6. ☐ Telefonda taze **yedek** alındı.
7. ☐ Claude'a «LIVE aç» dersin → proje adresi + genel anahtar ile ayrı PR → birleşir.
8. ☐ Άλλα → «Άνοιγμα συγχρονισμού» (RUNBOOK §13) → «Ο συγχρονισμός είναι ανοιχτός».
9. ☐ (İsteğe bağlı, sonra) Hava: RUNBOOK §14 (önce tek tarla dry-run).
