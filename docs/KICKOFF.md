# First message to Claude Code

Copy the text below into Claude Code with this repository open.

---

Merhaba. Bu depo FieldWise projesi. Önce `CLAUDE.md`, sonra `docs/PROJECT-HISTORY.md` ve `docs/plan/TECH-SPEC.md` dosyalarını oku.

M0 aşamasını başlatmak istiyorum, ama Supabase ve Cloudflare hesaplarım henüz yok. Bu yüzden hesap gerektirmeyen kısmından başla:

1. `docs/milestones/M0.md` dosyasına kısa bir plan yaz ve bana Türkçe özetle; onaylarsam devam et.
2. Depo yapısını TECH-SPEC'teki gibi kur (`/app`, `/packages/rules-core`, `/rules`, `/supabase/migrations`), Vite + Preact + TypeScript, Dexie, Workbox, dil dosyaları (el/tr/en, Yunanca öncelikli).
3. Telefona kurulabilir (PWA) boş bir uygulama kabuğu: alt sekmeler Bugün · Ürünler · Parseller · Depo · Diğer.
4. `reference/prototype/data.json` verisini "Demo çiftlik" olarak yerel veritabanına yükleyen içe aktarma.
5. CI: typecheck, Vitest, 375 px WebKit Playwright testi.
6. Veritabanı şemasını SQL migration olarak yaz ama henüz hiçbir yere uygulama.

Her şeyi ayrı bir dalda yap, pull request aç. Bitince bana Türkçe olarak ne yaptığını ve telefonda neyi denemem gerektiğini anlat. Hesap açmam gereken adıma gelince dur ve bana adım adım tarif et.
