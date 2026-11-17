# Naming council, round 1 – software team (tech lead, mobile, devops)

*2026-11-17. Our view: the name becomes a slug in about 15 places (repo, npm scope `@<name>/rules-core`, Capacitor app ID, Apple bundle ID, Android package, Supabase project, Cloudflare Pages `<name>.pages.dev`, Web Push VAPID subject, `noreply@` email domain, store listings). App/bundle IDs can never change after the first store upload, so the slug must be fixed before Capacitor (M5+). Domain availability below is **not checked**; it needs a registrar/EUIPO check before we decide.*

Test we apply: a Greek, a Turk and an Albanian hear it once and type the same lowercase ASCII string. That rules out χ (ch/h/x), β (b/v), ου (ou/u), μπ (mp/b), η/υ (i/e/y), and Turkish ı/ş/ç.

## Ranked candidates

| # | Name | Slug | Bundle / package ID | Domain ideas | Risks |
|---|---|---|---|---|---|
| 1 | **Sporos** (Σπόρος, "seed") | `sporos` | `gr.sporos.app`; sibling `gr.sporos.orders` | sporos.app, sporos.gr, getsporos.com | Common Greek word, so the .gr may be taken; English hears "spore" (fungus) – a mild joke for an app that warns about mildew. Letters map 1:1 Greek↔Latin. |
| 2 | **Tetradio** (Τετράδιο, "notebook") | `tetradio` | `gr.tetradio.app`; `gr.tetradio.kloubes` | tetradio.app, tetradio.gr | Generic noun: weak store search, .gr likely taken. 8 letters but spelled exactly as spoken in all three languages. Strong story (it replaces Bora's notebook). |
| 3 | **Agros** (Αγρός, "field") | `agros` | `gr.agros.app` | agros.app, agrosapp.gr | Crowded: many agri companies already use "Agros"; trademark and store-name clash likely. Shortest and clearest to spell. |
| 4 | **SunField** | `sunfield` | `gr.sunfield.app` | sunfield.app, sunfield.gr | Repo already named, zero migration cost. But it has no Greek form (Σανφίλντ looks wrong), "sun" says nothing about the product, and the name is common for solar firms. Camel case breaks in IDs (`sunfield` vs `sunField`). |
| 5 | **Kipos** (Κήπος, "garden") | `kipos` | `gr.kipos.app` | kipos.app, kipos.gr | η is spelled kipos/kepos; "garden" sounds like a hobby, not a farm. |

## Rejected for engineering reasons

- **Chorafi** – χ gives three spellings (chorafi / horafi / xorafi). We would need to register and redirect all three, and the Turkish spoken spelling is "horafi".
- **Kloubes Agros** – β is already causing trouble inside our own repo: the folder is `reference/klouves/`, the brief writes "Kloubes". Two words also make a poor slug.

## Sibling modules

Choose one family brand and name modules with a suffix: `<name>` (fields), `<name> Orders` / Κλούβες (orders). In code: one npm scope, `@<name>/rules-core`, `@<name>/orders`. Store names: "Sporos – Κλούβες". Avoid a second brand for the orders app, because it doubles the store accounts, domains and push keys.

## Repo note

Renaming `SunField` on GitHub is cheap: GitHub redirects the old URL, and we update the Cloudflare Pages link and the CI badge. The only things that cannot be changed later are the store IDs.
