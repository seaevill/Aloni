# DERSLER – Aloni'den bir sonraki projeye

Hazırlanma: 2026-11-20. Kaynak: Aloni projesi (seaevill/Aloni), 16 Ekim – 20 Kasım 2026.
Kime: Bora ve bir sonraki projede çalışacak her yapay zeka (Claude Code, Codex, claude.ai). **Yeni projenin ilk günü bu dosyayı okut.**

## 1. Yeni projede ilk gün yapılacaklar (sırayla)
1. **Hosting'i baştan seç ve test et.** Cloudflare panelinde artık Pages değil Workers çıkıyor: `wrangler.jsonc`, statik varlıklar, `send_metrics: false`, wrangler sürümü sabit.
2. **GitHub main koruması (Rulesets) ilk gün:** silme yok, force push yok, PR zorunlu, zorunlu kontroller `check` + `sql`. "Require branches to be up to date" **kapalı**. Aloni'de hiç yokmuş, 20 Kasım'da fark edildi.
3. **CI'ı ilk gün hızlı kur:**
   - tek birleşik zorunlu kontrol (`check`);
   - path filtresi (yalnızca belge değişen PR ağır işleri atlar ama yeşil olur);
   - `concurrency: cancel-in-progress` (main hariç);
   - npm önbelleği, yalnızca WebKit kurulumu (zaman aşımı + 1 retry), 2–3 shard;
   - Playwright `retries: 2` + trace, `@quarantine` etiketi;
   - main'de birleştirme sonrası tam CI.
4. **Supabase'i şablondan kur** (Aloni'de bir gün kaybettirdi):
   - Proje adı küçük harf; bölge EU (Frankfurt).
   - Yükleme yalnızca elle tetiklenen, onaylı GitHub workflow'uyla:
     - mod dry-run/apply, confirm `APPLY`;
     - `supabase-production` environment, Required reviewers = sahip, yalnızca main;
     - guard: tam commit'in bütün kontrolleri yeşil ve bitmiş olmalı;
     - Management API ile proje adı ve bölge kontrolü;
     - IPv4 session pooler (5432, kullanıcı `postgres.<ref>`); CLI sürümü sabit;
     - sonunda salt okunur `verify_applied.sql`.
   - Gizli bilgiler **environment secrets**'a girer (variables'a değil): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.
   - Token yetkileri: Project Settings, API Keys, API Key Secrets, Connection Pooling – hepsi **Read**.
5. **CLAUDE.md'ye ilk gün dil tablosu yaz:** sahibe Türkçe; kod ve PR metinleri İngilizce; uygulama dili ayrıca. Aloni'de rapor dili iki kez Almancaya kaydı.
6. **CLAUDE.md'ye ilk gün üretim kuralı yaz:** "Production'a hiçbir yapay zeka doğrudan bağlanmaz, okuma bile. Tek yol onaylı workflow'lar ve uygulamanın kendi akışları. Supabase MCP yalnızca dokümantasyon için."
7. **Tek birleştirici:** yalnızca Claude Code merge eder. Diğer yardımcılar (Codex, claude.ai) kendi dallarında (`codex/*`, `docs/*`) PR açar. İş alanları dosya bazında ayrılır.

## 2. Gizli bilgi kuralları (asla bozulmaz)
- Şifre, token, API anahtarı, DB şifresi, kurtarma kodu **sohbete asla yazılmaz**. Yazılırsa hemen iptal edilip yenisi oluşturulur (Aloni'de bir kez oldu).
- Gizli bilgiler yalnızca GitHub environment secrets ya da Supabase Secrets/Vault ekranına girer. SQL Editor'e anahtar yapıştırılmaz.
- Yapay zekaya panel erişimi verilmez. Bağlayıcılar (MCP) salt okunur olur ve tek projeyle sınırlanır, ya da hiç bağlanmaz.
- Kişisel veri (ad, adres, vergi no) herkese açık repoya yazılmaz; uygulamanın içine girilir.

## 3. Veritabanı güvenliği (Aloni'de 4 inceleme turu bu yüzden yapıldı)
- **Kural tek bir fonksiyonda olur.** Aynı kural (Aloni'de PHI/REI hasat kapısı) birden çok yerde ayrı ayrı yazılırsa her turda yeni bir açık çıkar. Çözüm: tek kapı fonksiyonu (`planting_gate`), herkes onu kullanır, ve rastgele kombinasyonlarla "değişmez" testi.
- Bilinmeyen, boş, NULL ya da imzasız değer = **kapalı** (fail closed).
- Her yeni tabloda aynı PR'da RLS + `TO authenticated` policy, `(select auth.uid())`. CI bunu kontrol eder.
- `security definer` fonksiyonlarda `search_path` sabit (tercihen `''`); `anon`/`public`'e grant yok.
- Testler gerçek `authenticated` sahip ve işçi rolüyle koşar, superuser ile değil.
- Uygulanmamış migration yerinde düzeltilebilir. **Uygulanmış migration asla düzenlenmez**; her değişiklik yeni dosya olur.
- CI'da `supabase db lint` + güvenlik advisor'ları (uyarıda kırmızı).
- Yükleme öncesi inceleme bağımsız biri tarafından yapılır (alt ajan ya da Codex), ve bulgular repoya `docs/reviews/team/` altına yazılır. Sohbet üzerinden aktarılan bulgular kayboluyor.

## 4. Zaman ve kota
- Her PR'a ayrı inceleme ajanı açmak kotayı çok hızlı bitirir. İnceleme yalnızca veritabanı ve güvenlik PR'larında yapılır; ekran PR'larında CI yeterli.
- Büyük "6 grup + toplantı" beta testi yaklaşık 1M token tutar: ayda en fazla bir kez.
- Uzun sohbetler pahalı ve özetlenince ayrıntı kaybolur. Kalıcı bilgi dosyaya yazılır (bu dosya gibi), sohbete değil.
- Güvenlik kapısı her şeyi bekletmesin: iki hat paralel yürür. **Hat A** veritabanı/yükleme, **Hat B** veritabanına dokunmayan ekranlar.
- main kırmızıysa her şey durur, önce o düzeltilir. Yükleme penceresinde merge yok.
- Yavaş ve kararsız testin kök nedeni kanıtla aranır (trace/video); geçici retry DECISIONS'a "geçici" diye yazılır.

## 5. Sahiple çalışma (Bora)
- Türkçe, sade, benzetmeyle ("ev hazır, elektrik bağlanıyor"). Yüzde ve sıra verilir, tarih sözü verilmez.
- Her mesajda net olarak "senden beklenen" bölümü olur. Adım adım tıklama talimatı yazılır.
- Hazır yapıştırılacak prompt verilir; içinde doldurulması gereken boşluk bırakılmaz.
- Para, hesap ya da geri alınamaz işlem → önce sorulur.
- Görünür ilerleme önemli: güvenlik işleri uzarken ekran işleri de paralel ilerlemeli.

## 6. Ürün dersleri
- Önce "bugün ne yapmalıyım" ekranı; kayıt hızlı olmalı; kritik bilgi asla saklanmaz veya varsayılmaz.
- Uygulama önerir, asla seçmez (ilaç/doz). Etiket verisi uydurulmaz, doz yuvarlanmaz.
- Demo veri ile gerçek veri asla karışmaz; bunun testi olur.
- Sessiz otomatik yenileme ekranı ve formu kaybettirir → "güncelleme var" çubuğu. Ekran durumu adreste tutulur (Geri hareketi çalışır).
- Çift dokunma = çift kayıt → her kaydetmede tek-vuruş kilidi.
- "Kaydedildi" mesajı ancak gerçekten yazıldıktan sonra gösterilir.
- İşçi dili baştan sorulur (Aloni'de Arnavutça sanıldı, Hintçe çıktı).

## 7. Araçlar
- Kurulacaklar: Superpowers (TDD, verification, debugging becerileri; alt ajanlı geliştirme kapalı), Task Observer (öğrenilen kurallar PR ile CLAUDE.md'ye), Security Guidance, Supabase eklentisi (yalnızca best-practices becerisi; MCP salt okunur ya da kapalı).
- Kurulmayacaklar: find-skills (onaysız dış kod), claude-mem (bulutta kalıcı değil, kota yer), her PR'ı inceleyen çoklu ajan eklentileri, GitHub'da ikinci bir Claude.
- Codex iyi bir ikinci yardımcı: bağımsız SQL incelemesi, zor test hatası avı, saf kütüphane işleri (Aloni'de kural motoru). Claude kotasını harcamaz.
- 2026-11-21 — Never put a CSS var() in an SVG width/height ATTRIBUTE: WebKit logs an error (Chromium does not) and every console check in e2e fails. Size SVGs by class.
