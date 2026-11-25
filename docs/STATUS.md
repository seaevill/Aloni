# DURUM – Aloni (Bora'nın sayfası)

**Öğleden sonra özeti (2026-11-23, Türkçe):**
1. **Canlıda (main'e girdi, CI yeşil):** hasat temposu · kendi kayıtlarından verim · ürün rehberi (yalnızca kaynağı okunmuş aralıklar) · kesim/temizlik kaydı · haftalık su kartı · gübre planı (mühendisin sözleri, fotoğraflı) · tekrarlayan işler · ΚΑΕΚ kartı · gübreleme/sulama kaydı (o günün havasıyla) · kasa etiketi (QR) · bu yıl–geçen yıl karşılaştırma · dört hesaplayıcı (sulama m³/saat, tohum kg, ilaçlama tankı, gübre çuvalı).
2. **Hesaplayıcı kuralı:** yalnızca senin yazdığın ya da imzalı etiketteki rakamı çarpar; ilaç etiketi imzasızsa hiç sayı vermez; eksik girdi = «άγνωστο», asla 0; yalnızca tank/çuval ADEDİ yukarı yuvarlanır, doz asla.
3. **Telefonda dene:** Φυτά › Μαϊντανός (tempo, tohum, gübre planı, rehber, bu yıl–geçen yıl) · Χωράφια › parsel (ΚΑΕΚ, kesim, gübreleme/sulama, su kartı) · Αποθήκη › ilaç › «Υπολογισμός ψεκαστικού» · bir hasat kaydı › «Ετικέτα κασέλας» · Σήμερα › Εργασίες › «Επαναλαμβανόμενες». Demo çiftlikte hepsi örnekle dolu.
4. **Şimdilik yalnızca o telefonda saklananlar** (ekranda da yazıyor): kesim, gübreleme/sulama, ΚΑΕΚ, gübre planı, tekrarlayan işler, hesaplayıcı girdileri. Sunucuya bağlamak için SQL **0042** yazıldı (#500, MERGE EDİLMEDİ, bağımsız inceleme: açık MUST yok).
5. **Senden tek adımlar:** (a) 0036–0042'yi «Supabase migrate (manual)» ile sırayla yükle (0036+0037 önce, sonra «Yükleme tamam» yaz; 0042'den ÖNCE telefon tarafını yayınlayacağım, bu yüzden 0042'yi en son yükle); (b) Codex'in 4 işi (ilaçlama defteri PDF, GPS sınır, sezon takvimi, More menüsü) merge ediliyor, telefonda dene; (c) **para defteri PR'ları #484/#485** (F1 Ταμείο) başka bir ekipten geldi, onayın olmadan merge etmiyorum: «evet/hayır» de.
6. **Açık PR'lar:** #500 (SQL, bekliyor) · #460 (0037 yüklenince) · #484/#485 (para defteri, onayını bekliyor) · #471/#480/#481/#488 (yalnızca belge) · Dependabot #306 (testleri kırmızı).

## Güncel (2026-11-25 akşam) — 5 satır
1. **Canlıda (main'e girdi, CI yeşil; canlı doğrulama sende):** Ταμείο (para defteri) · hasat varış yeri senkronu · sezon hedefi senkronu · iş panosu «Το αναλαμβάνω» (sunucu kimin önce aldığına karar verir) · yarın notları (usta/işçi arasında paylaşılır, «από εργάτη» etiketini sunucu koyar) · ekim sınırı alanı güvenle taşınıyor (çizim aracı henüz kullanıcıya açık değil).
2. **Önce yapman gereken tek adım:** Άλλα → «Σύνδεση λογαριασμού: τι λείπει» → **«Επιβεβαιώνω: εφαρμόστηκαν οι αλλαγές έως 0041»** (üretim 0001–0041 olduğu için doğru). Bu tek onay tüm sunucu modlarını açar; öncesinde her şey eskisi gibi.
3. **Telefonda dene:** (a) Άλλα → Ταμείο: bir gider ekle, düzelt, iptal et (çift dokunuş tek kayıt); (b) Φυτά → bir bitki → sezon hedefi gir; (c) iki telefonla: işçi «Το αναλαμβάνω», aynı anda ikinci işçi → «Την πήρε ήδη κάποιος άλλος»; (d) usta ve işçi birbirinin «yarın notu»nu görsün.
4. **Bora'dan beklenen:** 0042 (#500) için telefon tarafı sırada, SQL'i yine yalnızca sen yüklersin · #504/#507 için Codex sonucu repoda yok: bağımsız alt-ajan incelemesi kabul mü? · Ταμείο'daki «Επιστροφή ΦΠΑ» (KDV iadesi) kategorisi kalsın mı?
5. **Önizleme:** PR'ların Cloudflare yorumunda gerçek önizleme adresi çıkıyor (`https://<dal-adı>-aloni.ormanbora.workers.dev`, örn. #563); bu ortamdan açıp doğrulayamıyorum, telefonda aç.

## Güncel (2026-11-25 öğleden sonra)
- **Production 0001–0041; sırada yalnızca 0042 (#500).** Bugün birleşenler: #460 + hasat varış yeri senkronu (#555) · Ταμείο çekirdek (#484) ve ekran (#557, bağımsız inceleme: 2 MUST düzeltildi) · bağımlılık paketi TypeScript ve preact 11 HARİÇ (#556; preact 11 altı testi kırıyor) · maplibre 5'e sabitlendi (#558, main'i kırmızı yapan buydu) · sezon hedefi senkronu (#559) · iş panosu «Το αναλαμβάνω» senkronu (#560).
- **Sırada:** yarın notları (0039), ekim sınırı (0040), sonra 0042'nin telefon tarafı, #504/#507.

## Güncel (2026-11-25 öğlen)
- **Production: 0001–0041 yüklü** (run 45359016038, verify_applied: 41 tabloda RLS, sorun yok). Sırada yalnızca **0042** (#500).
- Dondurma kalktı. Sıra: #460 + müşteri/sipariş/çalışan/hasat-varış senkronu → Ταμείο (#484/#485) → #512 (TypeScript hariç) → 0038–0041 telefon senkronu → 0042 telefon tarafı → #504/#507.

## Güncel (2026-11-23 akşam)
- **main yeşil (sha d9edf04), 0036+0037 yüklemeye hazır.** Yeni özellik yok (dondurma); #484/#485, #504/#507/#508 ve #500 birleştirilmedi.

## Güncel (2026-11-22 öğleden sonra)
- **main yeşil (sha 6a296e2), 0038–0041 yüklemeye hazır** (iş panosu, gün notları, ekim sınırı, ürün hedefleri). 0036+0037 için yükleme onayını bekliyorum; 0038–0041 sonraki paket. Kuyruk yeniden açıldı (SQL dışı işler).
- **0035 production'da** (workflow «Supabase migrate (manual)», commit d17f739, verify_applied yeşil). 0036 (#362) ve 0037 (#368): Codex yeniden-kontrolünü bekliyor; hükümden sonra aynı yükleme yolu.
- Faz 1 durumu: `docs/milestones/PHASE1-DONE.md` (a–g, her madde kanıtlı).

## LIVE açma – 6 adım (senkron; ayrıntı RUNBOOK §13)
1. **Yedek:** Άλλα → **Αντίγραφο δεδομένων** → **Εξαγωγή αντιγράφου** → dosya iner; satırda «τελευταίο αντίγραφο: …» bugünün saatini göstermeli.
2. **Hazırlık kartı:** Άλλα → **Σύνδεση λογαριασμού: τι λείπει** → her satır yeşil olmalı (Supabase → Advisors'ı yenile, «RLS Disabled in Public» yok).
3. **Giriş:** Άλλα → **Σύνδεση** → e-posta kodu → «Συνδεδεμένος: …».
4. **Aç:** Άλλα → **Άνοιγμα συγχρονισμού** → «Ο συγχρονισμός είναι ανοιχτός.»
5. **Çip:** Σήμερα'nın üstünde «Ο συγχρονισμός δουλεύει · τελευταίος: SS:DD».
6. **Kontrol:** Supabase → Table Editor → `parcels`, `job_spray`: sayılar telefonla aynı. Kırmızı kutu çıkarsa ekrandaki metni bana yaz.

## İşçiyi davet et – 5 adım (RUNBOOK §12c)
1. Άλλα → **Εργάτες** → işçinin satırı → **Email του εργάτη** → **Αποθήκευση πρόσκλησης** (ya da QR/bağlantı: işçinin satırında davet düğmesi).
2. İşçi telefonunda: Safari → adres → **Ana Ekrana Ekle** → aç → **Άλλα → Σύνδεση** → e-posta kodu.
3. Sen: Σήμερα → **+ Ανάθεση δουλειάς** → işçiye bir ilaçlama işi ata.
4. İşçi: **Δουλειές → Έγινε** → başlangıç saati → onay; sonra **Συγκομιδή**: bitki, **+**, **Αποθήκη** ya da **Απευθείας φόρτωση**, **Καταγραφή**.
5. Sen: Σήμερα → **Σήμερα έγιναν**: işi ve kasaları görürsün (satıra dokununca ayrıntı açılır). (Hasat varış yeri ve müşteri/çalışan kartı senin telefonuna 0036/0037 yüklenince gelir.)

## R1–R30 tablosu
| R | İstek | Durum | Kanıt | Not |
|---|---|---|---|---|
| R1 | Σήμερα → bitki sayfası (parseller, bugün/sezon kasası, hedef) | PASS (yerel) | docs/design/compare/sprint/cc-target-ring.png | Hedef yalnızca telefonda (SQL 0040 yok) |
| R2 | Bekleme halkası (gün + %) | PASS (yerel) | docs/design/compare/sprint/cc-demo-today-after.png | Halka Σήμερα kesim kartında ve bekleme sayfasında; bitki/ilaçlama sayfasında yok |
| R3 | Εργασίες + yarın notları | PASS (yerel) | — | «＋ Σημείωση για αύριο» Εργασίες sayfasında ve işçi ekranında (Demo); «από εργάτη» etiketi; ayrı telefonlar arası paylaşım B3 SQL bekliyor (#418) |
| R4 | Hava sayfaları tıklanır, değerli | PASS (yerel) | docs/design/compare/sprint/cc-demo-weather.png | Demo 5 gün dolu (#358); saatlik tahmin yok (sunucu yalnızca günlük) |
| R5 | Χωράφια 5 / Καλλιέργειες → hangileri | PASS (yerel) | docs/design/compare/sprint/cc-bell-today.png | Σήμερα kutuları sayfa açar (#327); ayrı görüntü R5.png alınmadı |
| R6 | Κλούβες 7/28 ημ. → tablo | PASS (yerel) | — | Kutu ile tablo artık tek pencere (#397, mülkiyet testi) |
| R7 | Χωρίς αναμονή → hangileri | PASS (yerel) | — | Σήμερα sayfası (#327) |
| R8 | «Σήμερα έγιναν» ayrıntılı | PASS (yerel) | — | Satır: tür · bitki · ürün veya kasa → Αποθήκη/Απευθείας/άγνωστο; dokununca ayrıntı sayfası (#405) |
| R9 | Gecikmiş işler ayrıntılı | PASS (yerel) | — | «Καθυστερεί N ημ.» eklendi (#407) |
| R10 | Ιστορικό → ilaç bilgisi | PASS (yerel) | — | Ιστορικό'daki her ilaçlamadan ürün sayfası (#404) |
| R11 | Son ilaçlama süreci | PASS (yerel) | — | İlaçlama ayrıntı sayfası: doz olduğu gibi, halka, «Κοπή από», «Επανείσοδος από» (#406) |
| R12 | Hasat geçmişi depo/sevk | KISMEN | — | Αποθήκη satırı → Αποθήκη / Απευθείας / άγνωστο ayrımı (#410); gerçek çiftlikte sunucu alanı 0036 yüklenince |
| R13 | Φυτά listesi: resim+ad+tek çip | PASS (yerel) | docs/morning/2026-11-22/R13.png | #401 CI/merge'de |
| R14 | Bitki sayfası «Συμβουλές» | PASS (yerel) | — | Codex içeriği bağlandı (#403); metinler ayrı parça: ilk açılış internetsizse «yüklenemedi» der (#419) |
| R15 | Ekim krokide | KISMEN | — | Şerit olarak, ALAN ORANINA göre, «Ενδεικτικό σχέδιο» etiketiyle (#408); gerçek konum çizimi yok |
| R16 | İlaç/gübre sayfası | PASS (yerel) | — | Etiket amacı, etkin madde, PHI/REI, stok, genel bilgi kartı, resmî etiket satırı (#404); doz önerisi yok |
| R17 | Χωράφια birleşik kroki + detay | KISMEN | — | Ekim satırı → bitki kartı + kroki şeritleri (#408); tek birleşik çizim yok |
| R18 | Analiz ⓘ | PASS (yerel) | — | pH kartı bitki aralıklarıyla (#409); EC ve OM için kaynak bulunamadı → «δεν υπάρχει πηγή» |
| R19 | Αποθήκη ⓘ | PASS (yerel) | — | Ürün kartı ürün sayfasını açar (#404) |
| R20 | Αποθήκη'de depodaki hasat | PASS (yerel) | — | Αποθήκη üstünde bitki · kasa · yaş çipi · «Αύριο φεύγουν» (#410) |
| R21 | İşçi hasatta depo/sevk | KISMEN | — | İki büyük düğme + alıcı adı/telefonu (#415); cevap yalnızca bu telefonda: sunucu 0036/0037 yüklenmeden eşzamanlanmaz |
| R22 | Müşteriler + sipariş girişi | KISMEN | — | Άλλα → Πελάτες + «Νέα παραγγελία» → «Αύριο φεύγουν» (#411); yalnızca bu telefonda, sunucu 0037 bekliyor |
| R23 | Çalışan kartı | KISMEN | — | Ad, soyad, telefon, doğum tarihi YOK (#414); yalnızca bu telefonda, sunucu 0037 bekliyor |
| R24 | İşçi düğmeleri | PASS (yerel) | — | Simge + kısa yazı, ≥72 px, basma geri bildirimi (#417) |
| R25 | İş panosu | KISMEN | — | «Το αναλαμβάνω» (ilk alan kazanır) yalnızca Demo uygulama görünümünde (#416); gerçek çiftlikte B3 SQL gerekir |
| R26 | Hava verisi (Demo dolu, gerçek: MET) | PASS (yerel) | docs/design/compare/sprint/cc-demo-weather.png | Gerçek çiftlik: RUNBOOK §14a tek sayfa (#349); yayın senin «tamam»ınla |
| R27 | İlaçlama kaydı ekranı (koru) | PASS | — | Değiştirilmedi |
| R28 | Haftalık rapor (koru) | PASS | — | Değiştirilmedi |
| R29 | Uygulama içi iş bildirimi | KISMEN | — | Zil (#346): biten/yeni iş; «ανέλαβε» B3'e bağlı |
| R30 | OM %/pH/EC bitki aralıkları | KISMEN | — | pH: yalnızca ıspanak (2 kaynak, farklılar yazıldı); EC/OM kaynak yok; OM kayıtlı alan değil |

**Bitti:** tasarım sprinti D1–D15 + ortak alt sayfa (DetailSheet) + Σήμερα'daki her sayının kaynak sayfası, bekleme halkası, hava ve Εργασίες sayfaları; E1 «＋» menüsü, E2 zil, E3 kayıt işaretleri, E4 işçi daveti (QR), E5 hava RUNBOOK tek sayfa, E6 sezon hedefi (telefonda), E7 hesap silme sayfası; E8 hız ölçümü (PR'da). SQL: production 0001–0034; 0035 (#271) Codex incelemesi temiz, en sona bırakıldı.
**Sıradaki:** E8 + Codex ekran PR'larının merge'ü → #271'i en son merge et → kuyruğu durdur → «main yeşil (sha …), 0035 yüklemeye hazır» yaz → sen yüklersin. Sonra B1–B5 SQL (0036–0040, ayrı PR'lar; tasarım `docs/plan/B-TICKETS-SQL-DESIGN.md`).
**Bora'dan beklenen:** (1) `docs/milestones/E-PACK-BORA.md` içindeki 10 telefon kontrolü (özellikle QR'ı kamerayla tara); (2) Codex ekran PR'larına görsel puan (aşağıdaki liste); (3) 0035'i yüklemek (main yeşil olunca); (4) hava için RUNBOOK §14a (yalnızca sen «tamam» deyince).

## Bora onayı bekliyor (görsel puan; CI yeşil, merge edildi/edilecek, puanı sen verirsin)
Codex ekran PR'ları: #294 Καλλιέργειες kartları · #296 Χωράφια çizimi · #297 Αποθήκη kartları · #298 Μητρώο kimliği · #299 Άλλα menü sırası · #300 ψεκασμός formu adımları · #308 Χωράφια listesi ayrıştırma · #292 Demo haftalık sipariş · #326/#329/#330/#331 kaynak/bilinmeyen bileşenleri, ekim eskizi, analiz açıklaması, hasat kaynağı. Benim ekran işlerim: E1–E7 (yukarıdaki 10 kontrol).

## Sorular (cevap gelene kadar durmuyorum)
- **Ürün rehberi rakamları (2026-11-23):** maydanoz için arama sonuçlarında pH 6,0–7,0 (UMN, UC Marin) ve ekimden hasada 60–75 gün (UC Sonoma) / 70–90 gün (UMD takvimi) görüldü, **ama sayfaları açıp okuyamadım** (bu ortamda bu siteler kapalı). Doğrulanmadığı için koda eklemedim; rehberde «δεν υπάρχει πηγή» yazıyor. Siteleri açıp kontrol edersen (ya da `extension.umn.edu`, `ucanr.edu`, `extension.umd.edu` ağ izni verirsen) eklerim.
5. **Hintçe metinler (işçi ekranı):** Hasat varış yeri, iş panosu ve yarın notu metinlerini Hintçe ekledim; bir Hintçe bilen işçi okusun (yanlış çeviri riskini ben ölçemem).
6. **Açılış boyutu:** sınırı 170 KB'ye çektim (DECISIONS); sonraki adım metinleri ve bileşenleri küçültmek (bundle analizi).
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
4. **Yunan çiftçilerden gelen 3 soru (2026-11-23; uygulama cevaplamıyor, çünkü elinde kaynaklı sayı yok):** (a) 1 στρέμμα kışlık maydanozdan 3 hafta boyunca günde kaç kasa kesmeli? (b) Traktörle ezilen yabani radiki (ραδίκι) ne zaman sulanır, ne gübre/ne kadar/ne sıklıkla, ne sıklıkla ilaçlanır? (c) 22/11'de ekilen 1 στρέμμα maydanoz: sulama, gübreleme, ilaçlama sıklığı ve ilk kesime kaç gün? — **Gübre miktarı, ilaçlama sıklığı ve «ilk kesime kaç gün» rakamlarını γεωπόνος yazacak** (kaynaklı değilse uygulama rakam vermez; ilaç yalnızca etiketteki izinle). Uygulamanın verebileceği tek şey **senin kendi kayıtlarından** hesap: «geçmiş ekimlerinde ekimden ilk kesime ortalama X gün», «bir στρέμμα'dan kesim başına ortalama Y kasa»; bunlarla 3 haftalık kesim planı (kasa/gün) hesaplanır. Bu «kendi verinden planlayıcı» olarak yapılabilir; rakamı sen girersin, ben uydurmam.

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
