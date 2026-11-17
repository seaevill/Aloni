# Round 2 – verification of "Aloni / Αλώνι" (2026-11-17)

Follow-up to `debate.md` §(h) and `availability.md`. Tools: WebFetch + WebSearch (standard/extended), no shell network.

**Access limits this session:** WebFetch only opens URLs that appeared in search results. So **every RDAP lookup** (`https://rdap.org/domain/aloni.app`, `.../aloni.gr`, `.../aloni.com`, `.../getaloni.com`, `.../alonifield.com`, `.../alonifield.app`, `.../alonifarm.com`), `https://itunes.apple.com/search?term=aloni&entity=software&limit=50`, `https://www.whoxy.com/keyword/aloni`, `https://branddb.wipo.int/...` and `https://www.instagram.com/aloni.app/` were refused (URL_NOT_ON_ALLOWLIST). Apple app pages, including ones found by search, returned "client_error". TMview, EUIPO, OBI and TÜRKPATENT use JavaScript-only forms, and none of their result pages came up in search.

Legend: **VERIFIED** = fetched primary or near-primary page · **SIGNAL** = search-result title/snippet only · **UNKNOWN** = no usable evidence.

| Item | Status | Evidence level | Evidence (exact URLs) |
|---|---|---|---|
| aloni.app | Unknown | UNKNOWN | RDAP refused: https://rdap.org/domain/aloni.app |
| aloni.gr | Unknown. No site indexed at aloni.gr; many Greek businesses use the name "Aloni" (hotels, tavernas) | UNKNOWN / SIGNAL | RDAP refused: https://rdap.org/domain/aloni.gr ; search `"aloni.gr"` → e.g. https://www.greeka.com/dodecanese/leros/island/leros-restaurants/ksirokambos-restaurants/aloni.htm , https://expedia.ca/Paros-hotels-Aloni-Hotel.h2921146.Hotel-information |
| aloni.com | Unknown. Probably taken (common Hebrew surname, nothing indexed) | UNKNOWN | RDAP refused: https://rdap.org/domain/aloni.com |
| getaloni.com / alonifield.com / alonifield.app / alonifarm.com | Unknown (no sites indexed) | UNKNOWN | RDAP refused (URLs above) |
| alonioliveoil.com | Taken: Greek (GR) olive-oil shop on Shopify | VERIFIED (third-party store index) | https://www.storecensus.com/stores/alonioliveoil.com |
| **iOS app id6446095680** | **Taken: "משק אלוני" (Meshek Aloni = "Aloni Farm" in Hebrew)**, Israeli store listing. Developer, category and update date not readable | SIGNAL (store title in 3 search results; page fetch failed) | https://apps.apple.com/il/app/%D7%9E%D7%A9%D7%A7-%D7%90%D7%9C%D7%95%D7%A0%D7%99/id6446095680 , https://apps.apple.com/cr/app/%D7%9E%D7%A9%D7%A7-%D7%90%D7%9C%D7%95%D7%A0%D7%99/id6446095680 , https://apps.apple.com/be/app/%D7%9E%D7%A9%D7%A7-%D7%90%D7%9C%D7%95%D7%A0%D7%99/id6446095680 |
| Other iOS "Aloni" apps | None in agri/productivity seen; near names only (Alion, Alo Yoga, Alon Pablo) | SIGNAL | search `"Aloni" app App Store`; iTunes JSON refused |
| Google Play "Aloni" | No app named Aloni found. Developer "AIoni" (capital i) publishes "ScheduleFit – Shift Work Mgmt." (productivity-adjacent; confusable in writing) | VERIFIED (developer page) | https://play.google.com/store/apps/developer?id=AIoni |
| Trademarks EU/GR/TR/WIPO, cl. 9/42/44/31/29 | Unknown. Only near marks seen (ALONIA, ALLONIA, ALONINO, ALONPI); one surname-holder filing in class 35, not registered | SIGNAL + VERIFIED (trademarkdir) | https://trademarkdir.com/owner/aloni-nir ; https://markinton.com/trademark/alonia-79178983 |
| Instagram / TikTok / Facebook / X (aloni.app, aloni, aloni_app) | Unknown. No brand account "@aloni" in search. Facebook page "Τ' Αλώνι" (Greek business, `taloni.chortata`) exists | UNKNOWN / SIGNAL | handle fetch refused: https://www.instagram.com/aloni.app/ ; https://www.facebook.com/taloni.chortata/ (search result only) |

## Overall verdict

**Amber-green: keep "Aloni" as the brand, but expect to pay for a suffix.** None of the evidence blocks the name in classes 9 or 42. However:

1. **The bare iOS store name has a real neighbour:** id6446095680 is an Israeli "Aloni Farm" (משק אלוני) app, most likely a farm shop. It is a different market and a different script, but it is in the same farm field. This supports a distinctive store title (`Aloni: Spray Log & Crop Plan`), which the debate already planned. It does not rule the name out.
2. "Aloni" is a common Greek business name (tavernas, hotels, olive oil) and a Hebrew surname. **aloni.com, aloni.gr and the bare handles are likely taken.** Plan on the fallback forms from debate §(d)/(i): `aloni.app` / `getaloni.com` / `alonifield.*`.
3. **Nothing was VERIFIED as available.** Every "available" judgement still needs Bora's hand check.

## What Bora must still check by hand

1. **Domains** at papaki.gr or Cloudflare Registrar: aloni.app, aloni.gr, aloni.com.gr, getaloni.com, alonifield.com/.app, alonifarm.com. Ask before buying.
2. **App Store** on his iPhone: open id6446095680 and note the developer, category and last update. Search "Aloni" and "Αλώνι" in both stores.
3. **TMview** (tmdn.org/tmview): "ALONI" and "ALONIFIELD", classes 9, 42, 44, 31, 29, territories EU + GR + TR + WIPO. Also check the TÜRKPATENT and OBI databases.
4. **Handles**: Instagram, TikTok, Facebook, YouTube, X: `aloni.app`, `alonifield`, `aloni_app`. Reserve the free ones the same day.
