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
- 2026-11-27 · PR #610 denetimi · 'Zaten yapılmış' diyen yalnızca-doküman PR'ında iddiayı kod (src/orders/*.ts, ui/Orders.tsx) ve test grep'iyle + app/ içinde hedefli vitest ile doğrulamak, silinen [ ] satırının [x] eşinin gerçekten kaldığını görmek yeterli ve hızlı.
- 2026-11-27 · PR #612 denetimi · Görüntü PR'ında yalnızca dosya adlarına değil PNG'lerin kendisine bakmak (Read ile 6-7 tanesi) fark listesindeki somut iddiaları (taşan düğme metni, UUID satırı, boş karşılık yer tutucusu) doğrulatıyor; «güvenli» geçen yerin kuralı tanımlayan meta ifade mi yoksa uygulamaya güvence mi olduğuna bakmak gerekiyor.
- 2026-11-27 · PR #614 denetimi · Docs-only PR'ında BACKLOG'daki 'testler var' notunu 'git show <sha>:dosya' ile test başlık satırlarına (spray :167/:201, live-auth :53) ve playwright viewport 375'e bağlamak, ayrıca çalışma dizininin zaten PR head'inde olup olmadığını git rev-parse ile görmek vitest'i doğrudan çalıştırmayı sağlıyor.
- 2026-11-27 · PR #617 denetimi · «Kalan iş yok» iddiasında toplamı (25+12+10,5+9+7+4+2,5=70), ΚΑΕΚ önekini ve arayüz etiketini (KaekCard.tsx kaek-demo → ui.kaek.demo «Επίδειξη…») kaynaktan doğrulamak, e2e'yi çalıştıramasan bile iddiayı kod+birim testle bağlamaya yetti; e2e/CI kapıları ayrıca doğrulanmalı.
