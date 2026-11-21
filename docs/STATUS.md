# DURUM – Aloni (Bora'nın sayfası)

**Bitti:** tasarım sprinti D1–D15 + ortak alt sayfa (DetailSheet) + Σήμερα'daki her sayının kaynak sayfası, bekleme halkası, hava ve Εργασίες sayfaları; E1 «＋» menüsü, E2 zil, E3 kayıt işaretleri, E4 işçi daveti (QR), E5 hava RUNBOOK tek sayfa, E6 sezon hedefi (telefonda), E7 hesap silme sayfası; E8 hız ölçümü (PR'da). SQL: production 0001–0034; 0035 (#271) Codex incelemesi temiz, en sona bırakıldı.
**Sıradaki:** E8 + Codex ekran PR'larının merge'ü → #271'i en son merge et → kuyruğu durdur → «main yeşil (sha …), 0035 yüklemeye hazır» yaz → sen yüklersin. Sonra B1–B5 SQL (0036–0040, ayrı PR'lar; tasarım `docs/plan/B-TICKETS-SQL-DESIGN.md`).
**Bora'dan beklenen:** (1) `docs/milestones/E-PACK-BORA.md` içindeki 10 telefon kontrolü (özellikle QR'ı kamerayla tara); (2) Codex ekran PR'larına görsel puan (aşağıdaki liste); (3) 0035'i yüklemek (main yeşil olunca); (4) hava için RUNBOOK §14a (yalnızca sen «tamam» deyince).

## Bora onayı bekliyor (görsel puan; CI yeşil, merge edildi/edilecek, puanı sen verirsin)
Codex ekran PR'ları: #294 Καλλιέργειες kartları · #296 Χωράφια çizimi · #297 Αποθήκη kartları · #298 Μητρώο kimliği · #299 Άλλα menü sırası · #300 ψεκασμός formu adımları · #308 Χωράφια listesi ayrıştırma · #292 Demo haftalık sipariş · #326/#329/#330/#331 kaynak/bilinmeyen bileşenleri, ekim eskizi, analiz açıklaması, hasat kaynağı. Benim ekran işlerim: E1–E7 (yukarıdaki 10 kontrol).

## Sorular (cevap gelene kadar durmuyorum)
0. **Demo etiket işi (import-demo.ts bende):** görevin ayrıntısı repoda yok. Etiket verisi (doz, PHI, REI) uydurmam; Demo'da yalnızca prototipin `registered[]` değerleri kullanılır. Ne istediğini bir cümleyle yazarsan yaparım (örn. «Demo'daki her ilaca resmi etiket bağlantısı»).
1. **E-posta gönderimi (para):** Supabase'in kendi e-postası saatte az kod gönderir; sürekli kullanım için kendi SMTP/EU sağlayıcı gerekir → sen karar ver, ben ücret/hesap açmam.
2. **Alıcı telefonu (B1) gizlilik metni:** B1 yapılmadan uygulama metnine yazılmadı; avukat soruları `docs/compliance/privacy-notice-draft.md`.
3. **QR üreticisi:** yeni paket kurma izni verilmedi (reddedildi, dolanılmadı); kendi küçük üreticimi yazdım ve şartname değerleriyle sınadım; gerçek kabul = senin telefon kameran.

## Eklentiler (2026-11-20)
- **Superpowers ve Task Observer bu oturumda YÜKLÜ GÖRÜNMÜYOR.** Beceri listesinde ve eklenti listesinde yoklar (yalnızca pre-landing-review, karpathy-guidelines vb. var). Büyük olasılıkla eklentiler oturum açıldıktan sonra açıldı: yeni bir oturum başlatınca tekrar kontrol edeceğim. Yüklenene kadar kuralları elle uyguluyorum (önce kırmızı test, bitirmeden önce doğrulama, kök neden aramadan yama yok).
- **Kullanım kuralları (Bora, 2026-11-20):** test-driven-development, verification-before-completion, systematic-debugging kullan. subagent-driven-development ve dispatching-parallel-agents KULLANMA (kota). brainstorming yalnızca büyük yeni özelliklerde. Task Observer'ın öğrendiği kurallar CLAUDE.md'ye doğrudan yazılmaz: ayrı PR, açıklamada «Bora onaylayacak».

## γεωπόνος soruları (agronoma sorulacaklar)
1. İlaçlamadan sonra giriş yasağı **bütün tarlada mı** yoksa yalnızca ilaçlanan sıralarda mı?
2. Etiketleri imzalamaya ne zaman gelebilir? (İmzasız taslak etiket artık «bilinmiyor = kapalı» sayılır.)
3. **(m9 S-NEW-3, şimdilik DEĞİŞTİRİLMEDİ)** İşçinin «Έγινε» kilidi giriş yasağını ilaçlamanın **bitişinde** kontrol ediyor, **başlangıcında** değil: eski bir giriş yasağı sürerken işçi 20 dakika tarlada çalışmış olabilir ve kayıt «rei_conflict» işaretsiz geçiyor. Koruyucu donanımlı uygulayıcı için istisna var mı? Yoksa kapıyı başlangıç saatine de bakacak şekilde sıkılaştırırız.

## SABAH RAPORU (2026-11-21, gece çalışması 2)
1. **Production 0001–0034.** Giriş + çiftlik sihirbazı açık; senkron kapalı (senin adımın).
2. **Açık PR'lar (kodu hazır, CI/merge kuyruğunda, sırayla otomatik merge):** #258 «Αύριο φεύγουν» · #259 Hintçe (işçi ekranları) · #260 demo her akışı deneme + «Επαναφορά επίδειξης» · #261 «Έγκριση γεωπόνου» kartı (imzasız → neden kapalı) · #262/#263 senkron durum çipi + «Αντίγραφο τώρα» · #264 reddedilen kayıtlar ekranı · #265 hazırlık sabiti 0034 · #266 işçi daveti uçtan uca test · #267 RUNBOOK §12c/§13 · #268 «Εργασίες» merkezi · #269 Καλλιέργειες/Χωράφια kartlarında son ilaçlama + bekleme · #270 Actions SHA sabitleme + Dependabot · #272 gizlilik/mağaza tasarımı (yalnız belge) · #273 3G ölçümü (belge) · #274 yazı boyutu rem + %200 testi.
3. **SQL PR'ı Codex'te (MERGE YOK):** #271 = 0035 (weather_daily indeksi + `has_role` search_path). Kanıt: `docs/reviews/team/2026-11-21-0035-evidence.md`.
4. **LIVE için senden sırayla:** (1) Cloudflare'de son build yeşil mi bak (§12b). (2) §12a 1–6. adım (giriş, «Δημιουργία κτήματος»). (3) **Άλλα → Άνοιγμα συγχρονισμού**: önce «Αντίγραφο τώρα», sonra aç (§13). (4) Bir işçiyi §12c'deki 8 satırla dene.
5. **Telefonda 5 şey:** (a) Σήμερα → «Αύριο φεύγουν»; (b) Άλλα → επίδειξη → «Επαναφορά επίδειξης»; (c) Καλλιέργειες ve Χωράφια kartında «Τελευταίος ψεκασμός» / «Χωρίς ψεκασμό» / «Κοπή από … άγνωστο»; (d) telefonda yazı boyutunu en büyüğe al: hiçbir ekran yana kaymamalı; (e) çip: uçak modu → «Εκτός σύνδεσης», geri aç → «Συγχρονισμένο».
6. **Bilerek yapılmayanlar:** CI'da `supabase db lint` (sql işinde Supabase CLI yok → BACKLOG); harita offline önbellekte KALDI (ölçüm: ilk açılış yavaş 3G'de 154 kB, 4,3 sn, harita yüklenmiyor); #252 senin onayını bekliyor. **CodeQL (senin ayarın, 3 tık):** GitHub repo → Settings → Code security → «Code scanning» → «Set up» → «Default».
7. **Hesap silme/işçi takma-adlaştırma tasarımı:** `docs/plan/PRIVACY-STORE-PREP.md` (avukata 3 soru, madde 5).

## Sabah soruları
1. **E-posta gönderimi (para = sana soru):** Supabase'in kendi e-postası saatte çok az kod gönderir (sınır düşük; sınıra gelince uygulama «Πολλά μηνύματα email» der). Sürekli kullanım için kendi SMTP'imizi bağlamak gerekir. Önerim: AB'de sunucusu olan ücretsiz/ucuz bir servis (ör. Brevo, AB merkezli, ücretsiz katman günde 300 e-posta; ya da Scaleway TEM, AB, çok ucuz). Hesabı sen açarsın, ben yalnızca ayar adımlarını yazarım. Hangisini istersin, ya da şimdilik Supabase'in kendi e-postası yeter mi? (Fiyat/katman bilgisini açmadan önce kendin doğrula.)
2. «Dış UX araştırması»nın metni repoda yok: planı 4 başlıktan çıkardım. Metni `docs/` altına koyar mısın, planı ona göre düzelteyim.
1. #252'yi (dil tablosu) onaylıyor musun?
2. «Dış UX araştırması»nın metni repoda yok; `docs/` altına koyar mısın?

## Önceki durum (2026-11-20, gece)
- **Bitti:** Production **0001–0034** (run 44799478194, commit ee1dd3a). 0033 = «Έγκριση γεωπόνου» defteri, 0034 = uygulamanın kendi «Δημιουργία κτήματος» yolu.
- **Bora'dan beklenen (gece):** 3 Cloudflare değişkeni ✔ girildi; §12a denemesi senin sonucunu bekliyor.

## Yükleme tamam (2026-11-20)
- Production artık **0001–0034** (önceki: 0001–0032). Ekip m9 incelemesi: MUST yok. Hava (0029/0030) için RUNBOOK §14 hâlâ ayrı bir adım: önce token (Vault), sonra fonksiyon, sonra tek tarla dry-run.
- **Açık soru (değiştirilmedi):** «Έγινε» kilidi giriş yasağını ilaçlamanın bitişinde kontrol ediyor, başlangıcında değil («γεωπόνος soruları» 3).

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
1. ☑ Ekip m9 incelemesi: MUST yok, 0022–0032 yüklemeye hazır (`docs/reviews/team/2026-11-20-m9-review.md`).
2. ☑ 0001–0034 production'da, `verify_applied` yeşil (run 44799478194, commit ee1dd3a, 2026-11-20).
3. ☐ Supabase **Advisors** (Security + Performance) temiz.
4. ☐ Gerçek hesap denemesi yapıldı (RUNBOOK §12, 11 adım).
5. ☐ Άλλα → «Σύνδεση λογαριασμού: τι λείπει» kartı beş satırda yeşil (veri sorumlusu, çiftlik adı, ΑΦΜ, migration 0028, Advisor).
6. ☐ Telefonda taze **yedek** alındı.
7. ☑ «LIVE» = Cloudflare'de 3 genel derleme değişkeni (RUNBOOK §12b); Bora girdi ve yeniden dağıttı (2026-11-20). Kod PR'ı gerekmedi. Giriş ve çiftlik sihirbazı açık; senkron hâlâ kapalı (adım 8).
8. ☐ Άλλα → «Άνοιγμα συγχρονισμού» (RUNBOOK §13) → «Ο συγχρονισμός είναι ανοιχτός».
9. ☐ (İsteğe bağlı, sonra) Hava: RUNBOOK §14 (önce tek tarla dry-run).
