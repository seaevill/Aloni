# DURUM – Aloni (Bora'nın sayfası)

## m8 düzeltildi, ekip yeniden bakacak (2026-11-20)
- **0032_planting_gate.sql** (yeni dosya; 0022–0031'e dokunulmadı): tek hasat/giriş kapısı `private.planting_gate`; M1, M2 (MUST), S1–S4 ve LOW'lar düzeltildi; testler `supabase/tests/m13_m8.sql` (önce kırmızı, sonra yeşil, rastgele «değişmez» testi dahil). **Yüklemeden önce RUNBOOK §15'teki salt okunur sorguyu sen çalıştıracaksın.** `docs/reviews/team/` kontrol edildi: m8 dışında açık MUST yok.

## SABAH RAPORU (gece çalışması, 2026-11-19 → 20)
- **Ekibin yeniden bakacağı SQL commit'i:** `4586098` (m7: N1 ekim başına etiket, N2 bitiş ≤ şimdi + kapı, N3 stok/`sync_xid`; bağımsız alt ajan incelemesi: «NO MUST»). Sonradan yalnızca yeni dosyalar eklendi: 0030 (hava takvimi), 0031 («Ποιος έκοψε»). 0022–0029'a dokunulmadı. Temiz çıkarsa 0022–0031'i birlikte yükleriz; ben başlatmam.
- **Biten T'ler:** T0 m7 düzeltmeleri (#185) · T1 birleştirme-işareti testi (#186) · T3 tek-vuruş kaydet kilidi (#188) · T4 işçi «kaydedildi = kaydedildi» (#189).
- **PR'da / sırada (CI bekliyor, gece içinde birleşecek):** T6 formlar seçim yapmaz (#191) · T5 siparişler çiftlik başına (#190) · T2 güncelleme çubuğu (#187). T7 (adres + Geri) kodu hazır, T2'den sonra PR olacak.
- **Kalanlar:** T8–T20 (Σήμερα, iş satırları, sipariş/dağıtım, işçi dili/Hintçe, hasat seçici, demo, düzen hataları, tasarım dili, Μητρώο doğruluğu, geliştirici bölümü, KVKK belgeleri, erişilebilirlik).
- **Her PR'ı bağımsız bir alt ajan inceledi** (yalnızca diff + CLAUDE.md); bulunan MUST'lar merge'den önce düzeltildi (T2: 2, T4: 3, T6: 1).
- **iPhone kontrol listesi (decisions.md §5) — yalnızca bitmiş maddeler:** henüz sadece madde 5 (aynı anda iki kez «Καταγραφή» = 1 kayıt; T3) ve madde 6'nın yarısı (T6: «Δόση» boş, «Ίδια με την ετικέτα» ile dolar) hazır. Diğerleri sonraki PR'larla.
- **Sorular (≤3):** (1) Bir iş «karışık ürün» (marul+roka) ise şu an etiket seçilemez ve PHI bilinmeyen kalır (güvenli); karışık işleri ayrı ayrı mı kaydedelim? (2) Sahip için ilaçlama bitişi artık «şimdi»den ileri olamaz: telefon saati 1–2 dk ilerideyse kayıt reddedilir; saati otomatik düzeltelim mi? (3) Daha önceki 0028 fotoğraf deposu için ekip yeniden bakacak: uygulama sırası konusunda tercihin var mı?

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
