# DURUM – Aloni (Bora'nın sayfası)

## SABAH RAPORU (gece çalışması, 2026-11-19 → 20; yazıldığı saat: 20 Kasım ~05:00 Atina)
- **Ekibin yeniden bakacağı SQL commit'i:** `4586098` (m7: N1 ekim başına etiket, N2 bitiş ≤ şimdi + kapı, N3 stok/`sync_xid`; alt ajan incelemesi «NO MUST»). Sonradan yalnızca yeni dosyalar: 0030 (hava takvimi), 0031 («Ποιος έκοψε»). 0022–0029'a dokunulmadı. Benim yüklemem yok; senin başlatmanı bekliyor (önce `docs/reviews/team/` kontrol edildi: açık MUST yok).
- **Biten T'ler (main'de):** T0 m7 (#185) · T1 işaret testi (#186) · T2 güncelleme çubuğu (#187) · T3 tek kaydet (#188) · T4 işçi «kaydedildi» (#189) · T5 sipariş çiftlik başına (#190) · T6 formlar seçmez (#191) · T9 iş satırları (#193) · T13 hasat seçici (#194) · T19 KVKK belgeleri (#195) · T15 düzen (#196) · T18 «Για προγραμματιστές» (#197) · T17a Μητρώο sütunları (#198) · T8a «Κοπή σήμερα» (#210) · T16a koyu başlık (#207) · T17c ruhsat notu (#208).
- **PR açık, birleşme sırasında (CI yeşil olunca zincir birleştirir):** T7 adres + Geri (#204) · T10 sevkiyat/«Αντιγραφή για οδηγό» (#201) · T11 işçi dili + veri bildirimi (#202) · T12 Hintçe (#200) · T14 demo'da deneme (#203) · T16b isim/simge (#205) · T17b form doğruluğu (#199) · T20 erişilebilirlik (#206).
- **Kalanlar:** T8b («Αύριο φεύγουν», tek durum çipi, gece yarısı), T11 üçüncü düğme, T12 `lang="el"`, T14 Ravi/kroki, T16 kalanı, T17 kalanı, T20 rem/axe. Her biri DECISIONS'ta «yapılmadı» diye yazılı.
- **Her PR'ı bağımsız alt ajan (yalnızca diff + CLAUDE.md) inceledi;** MUST'lar birleşmeden önce düzeltildi (T2: 2, T4: 3, T6: 1, T8a: 1, T20: 1). CI'da WebKit'te tek tek kırmızılar çıktı: zincir bir kez yeniden koşuyor.
- **iPhone listesi (decisions.md §5) — yalnızca bitmiş maddeler:** 5 (hızlı çift «Καταγραφή» = 1 kayıt) ✓ · 6 («Δόση» boş, «Ίδια με την ετικέτα» doldurur) ✓ · 3'ün yarısı (Σήμερα'da «Κοπή σήμερα», iş, iki büyük düğme; «Αύριο φεύγουν» yok) · 8'in yarısı («Για προγραμματιστές» kapalı). 1, 2, 4, 7 ve 8'in isim kısmı T7/T10/T11/T12/T14/T16b birleşince hazır olacak.
- **Sorular (≤3):** (1) Karışık ürünlü iş (marul+roka) etiketsiz kalır, PHI bilinmez (güvenli): ayrı ayrı mı kaydedelim? (2) İlaçlama bitişi «şimdi»den ileri olamaz; telefon saati 1–2 dk ilerideyse kayıt reddedilir: saati otomatik düzeltelim mi? (3) Hintçe metinlerini (~110 kısa metin) hangi işçin okuyup kontrol edebilir?


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
