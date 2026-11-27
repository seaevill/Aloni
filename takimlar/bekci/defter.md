# Defter: bekci

Her denetimin sonunda buraya **tek bir ders** eklenir. Biçim:

`- YYYY-AA-GG · <denetlenen iş> · <ders: hangi hatayı kaçırmaya yakındım ya da hangi kontrol eksikti>`

Haftalık denetimde kalıplaşan dersler kurala çevrilir ve bu liste temizlenir.

## Dersler

- 2026-11-27 · PR #598 denetimi · Yalnızca durum/defter değiştiren PR'larda iddiaları (dosya adları, PR numaraları) git ls-tree ve log ile doğrula; CI kapıları denetim anında bitmemiş olabilir, birleştirme koşulunu ayrıca hatırlat.
- 2026-11-27 · PR #599 denetimi · Onay anında CI kapıları (e2e, static) bitmemiş olabilir; birleştirme koşulu için kapıların yeşil olduğu ayrıca doğrulanmalı, bekçi ONAY'ı bunun yerine geçmez.
- 2026-11-27 · PR #600 yeniden denetimi · ANAYASA.md değişen PR'da düzeltmeler tamam olsa bile 1. katman 4. madde RED'i sürer; çözüm ajan değil Bora'nın elle birleştirmesidir, kararda bu koşulu açıkça yaz.
- 2026-11-27 · PR #601 denetimi · Vitest kök klasörden değil `app/` içinden çalıştırılmalı; kökte yüzlerce dosya yapılandırma yüzünden düşüyor ve sahte RED sebebi doğurur.
- 2026-11-27 · PR #604 denetimi · Kullanıcıya görünen yeni Yunanca terimler için glossary-el.md taranmalı ve sözlükte yoksa terimin durum.json `bekleyen_kararlar` içinde olduğu ayrıca doğrulanmalı; PR açıklaması ya da DECISIONS notu kural 5 için yetmez.
- 2026-11-27 · PR #604 ikinci denetim · RED düzeltmesini doğrularken yalnızca bekleyen_kararlar satırına değil, sözlükte (glossary-el.md) terimin gerçekten olmadığına da grep ile bakmak gerekiyor.
- 2026-11-27 · PR #608 denetimi · Yazdırma/PDF PR'ında yeni Yunanca terim yoksa her t(key,…,'el') anahtarının ui.el.json'da var olduğunu grep'le doğrulamak sözlük kontrolünü hızlı kapatıyor; anahtarlar src/i18n/ui.*.json içinde, el.json'da değil.
