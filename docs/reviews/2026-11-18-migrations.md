# Supabase öncesi migration incelemesi (0001–0012) – 2026-11-18

**İncelenen:** `main` @ `324b14d` (+ bu belge). Dosyalar: `supabase/migrations/0001…0012`, `supabase/tests/*` (smoke, review, agri, phone, contract, concurrency, run.sh, verify_applied.sql), `app/src/{spray,repo,worker,labels}`, `app/tests/unit/phone-contract.test.ts`, `.github/workflows/ci.yml`.
**Kanıt: hiçbir migration hiçbir yere uygulanmadı.** Repoda Supabase adresi/anahtarı yok, `supabase/config.toml` yok; RUNBOOK durum satırında «Supabase ☐»; CI yalnızca her çalıştırmada silinen geçici Postgres'lere uygular. Bu yüzden 0006–0009 yerinde düzeltilebilirdi; yine de düzeltmeler **yeni dosyalar** (0010–0012) olarak yapıldı ve uygulanmış dosya değişmez kuralı CODING_STANDARDS 6'ya yazıldı.

## Bulgular (hepsi kapatıldı, aksi belirtilmedikçe)
| # | Önem | Bulgu (dosya:satır) | Nasıl kanıtlandı | Düzeltme |
|---|---|---|---|---|
| C1 | **Kritik** | Hash zinciri `digest()`'i `search_path = public` ile arıyor (`0001_core.sql:97-106`); Supabase'te pgcrypto `extensions` şemasında → **hiçbir ilaçlama kaydı yazılamaz**. | `extensions` şemalı veritabanında `function digest(text, unknown) does not exist` | 0010: PostgreSQL'in kendi `sha256()`'sı; CI iki yerleşimde (çıplak PostGIS + Supabase benzeri) çalışıyor |
| C2 | **Kritik** | Telefonun **kendi** kayıtları `apply_ops`'ta reddediliyordu: `crops` tablosu kabul edilmiyor (`0009_sync.sql:17-19`), «etikette yok» metni integer sütuna giremiyor, `sign_off` nesnesinin sütunu yok, sahip ayarının satırında `farm_id` yok. Eşitleme ilk ekimde takılırdı. | Gerçek kayıt üreticileriyle üretilen 23 işlem SQL'e verildi; 0012 olmadan 10'dan fazla ret | 0012 + `phone.sql` (uçtan uca) + `contract.sh` |
| H1 | Yüksek | Pull imleci «son gördüğüm server_seq'den büyük» (`0009_sync.sql:71-80`, `0001:56-61`): geç commit olan işlem **sonsuza dek atlanır**. | İki gerçek bağlantıyla gösterildi (A erken yazar geç commit eder, B sonra yazar önce commit eder) | 0010: imleç `(işlem no, server_seq)`, yalnızca biten işlemler sunulur; `concurrency.sh` |
| H2 | Yüksek | Aynı `op_id` + **farklı içerik** sessizce «duplicate» sayılıyordu | test | 0010: içerik özeti saklanır, farklıysa ret |
| H3 | Yüksek | Kimlik: `created_by` istemciden gelebiliyordu; işin atanan kullanıcısı rosterdan değil istemciden (`0004:72-73` ↔ telefon `worker_id`); `done_by` serbest | test | 0010: oturumdan (`auth.uid()`) ve roster `user_id`'sinden türetilir; sunucuya ait sütunlar gönderilemez |
| H4 | Yüksek | Hasat kapısı yalnızca PHI'ye bakıyor, **REI'yi yok sayıyor**; ayrıca gerçekleşmiş bir hasadı güvenlik gerekçesiyle **reddediyordu** (`0007_spray_harvest.sql:66-78`) | test | 0011 + telefon: yeni hasat PHI **ve** REI bitmeden yok; geçmiş hasat kaydı hep alınır, çelişki `harvest_conflicts` görünümünde (ilaçlama sonradan girilse de) |
| H5 | Yüksek | Sunucu telefonun `phi_until`/`rei_until` ve «etiketten» PHI iddiasına güveniyordu | test | 0011: mutlak saatle yeniden hesap (Atina yaz/kış geçişi testli), «etiket» PHI'si imzalı etiket kaydına eşit olmalı, ilaçlama bitişi gelecekte olamaz |
| H6 | Yüksek | Bir telefon işlemi (ilaçlama + iş + stok hareketi) birbirinden bağımsız işlemler olarak uygulanıyordu → yarım kayıt | test | 0010: `group_id`/`group_size` ile hep-ya-hiç (**telefon tarafı PR 16'da grupları göndermeli**) |
| H7 | Yüksek | `applied_ops` üyelere `for all` açıktı (silip tekrar oynatma / sahte işlem kimliği) (`0009:15`) | okuma | 0010: yalnızca select + insert |
| M1 | Orta | Güncelleme kısmi uygulanıyordu: telefon tüm satırı gönderir, sunucu eksik alanı **eski değerle** bırakırdı (imzasız kalan etiket sunucuda imzalı kalırdı) | test | 0012: tüm satır değişimi |
| M2 | Orta | Sahip senkron satırı **silebilir** (`0004:60-62` `for all`); silme diğer telefonlara hiç ulaşmaz | okuma | 0010: silme yasak (arşiv = `deleted_at`) |
| M3 | Orta | Başka çiftliğin satırına kimlik bilinirse FK ile bağlanabiliyordu (`0002`/`0003` FK'ler) | okuma | 0010: aynı-çiftlik tetikleyicisi |
| M4 | Orta | Fotoğraf satırı salt-ekleme: yükleme bitince `storage_path` yazılamaz (`0006:125`) | okuma | 0010: bir kez doldurulabilir |
| M5 | Orta | RPC'ler herkese `EXECUTE` (Supabase varsayılanı) | okuma | 0010: yalnızca giriş yapmış kullanıcı |
| M6 | Orta | Hash zinciri doğrulanamıyordu (kimlik/sıra değerlerinden önce hesaplanıyor, saat dilimine bağlı, doğrulayıcı yok) | test | 0011: `verify_spray_chain`, kurcalama testi |
| M7 | Orta | Düzeltme satırında «neden» yok | okuma | 0011 + telefon: `amend_reason` zorunlu |
| M8 | Orta | 7 gün geç kayıt zorunlu nedeni yalnızca telefondaydı | okuma | 0011: sunucuda aynı eşik (**kesin 7 günden fazla**), düzeltme satırı geç kayıt sayılmaz |

## Kapatılamayan / açık kalanlar (uygulamayı engellemez, ama bilinmeli)
1. **CI'daki auth stub gerçek Supabase Auth değildir.** JWT doğrulama, `authenticated`/`anon` rollerinin gerçek yetkileri, Supabase'in varsayılan yetkileri ve PostgREST açığı **CI'da kanıtlanamaz**; uygulamadan sonra `verify_applied.sql` + gerçek hesaplarla elle denenecek (aşağıda).
2. **İşçi akışı henüz tasarlanmadı (M2-c):** işçinin ilaçlama kaydı yazması istenmedi ve sunucuda yazamıyor; ama «Έγινε» bir kayıt üretmeli. İşçi ayrıca ürün/etiket/roster **okuyamıyor** (ad ve doz göstermek için gerekir). Öneri: iş tamamlanınca kaydı sunucu, işin sabit ürün/dozundan ve oturumdan türetsin. Karar Bora'nın.
3. Hesap açma işlevi yok: ilk çiftlik + sahip üyeliği SQL ile elle (RUNBOOK §10).
4. Telefon (PR 16) şunları yapmak zorunda: aynı işlem gruplarını `group_id`/`group_size` ile göndermek, sırayı korumak, reddedilen işlemi kuyrukta **tutup göstermek**.
5. `created_at` telefon saatidir (yanlış saatli telefon gecikmeyi gizleyebilir); sunucu saati `received_at`'te durur, ama bunu raporlayan bir ekran/uyarı yok.
6. Pull, veritabanında herhangi bir yerde uzun süre açık kalan işlem varsa gecikir (güvenli yönde).
7. Free planda otomatik yedek yok, 7 gün işlemsiz proje durur (RUNBOOK §9).
8. `stock_lots` düzeltmelerinde «neden» alanı yok (hareketlerde var).

## Çalıştırılan testler
- SQL, **iki yerleşimde** (çıplak PostGIS ve Supabase benzeri `extensions` şeması), sırayla: `smoke.sql` (RLS, salt-ekleme, işçi sınırları, hash zinciri) · `review.sql` (kimlik, gruplar, aynı-çiftlik, silme, fotoğraf, RPC yetkileri) · `agri.sql` (PHI/REI mutlak saat, Atina yaz/kış geçişi, imzalı etiket eşitliği, geç kayıt eşiği, düzeltme nedeni, REI sürerken hasat, kayıt ≠ izin, çelişki görünümü, zincir kurcalama) · `phone.sql` (telefonun gerçek 23 işlemi uçtan uca, tekrar, imza düşürme, boş alan) · `contract.sh` · `concurrency.sh` (iki gerçek bağlantı) · `verify_applied.sql`. Sonuç: hepsi geçti (yerel PostgreSQL 16 + PostGIS ve CI).
- Uygulama: Vitest 307 test, ESLint, tsc, WebKit 375 px e2e CI'da; kural motoru Vitest 108 (17 beklemede).
- Kırmızı kanıtlar: C1 (digest hatası), C2 (0012 olmadan ret listesi), H1 (iki bağlantıyla kayıp) elle gösterildi.

## Henüz doğrulanamayanlar
Gerçek Supabase Auth/JWT davranışı; Supabase'in `authenticated` rolünün tablo yetkileri; SQL Editor'ün her dosyayı tek işlem çalıştırdığı varsayımı (belgelenmiş davranış, denenmedi); gerçek ağda eşzamanlı çok-telefon eşitleme (PR 16'dan sonra).

## Düzeltme PR'ları (hepsi `main`'de, CI yeşil)
#79 (0010) · #80 (0011) · #81 (telefon: REI + düzeltme nedeni) · #82 (0012 + uçtan uca sözleşme).

## Uygulama sonrası gerçek-hesap denemesi (CI'ın yerine geçmez)
1. `verify_applied.sql` → tek satır `OK`. 2. Sahip hesabıyla bir ilaçlama ekle → hata yok (C1). 3. İkinci bir test kullanıcısı (işçi) ile: ürün ekleyemez, ilaçlama yazamaz, başka çiftliği göremez. 4. `select verify_spray_chain('<farm id>')` boş döner. 5. Anonim anahtarla `apply_ops` çağrısı reddedilir.
