# Defter: bekci

Her denetimin sonunda buraya **tek bir ders** eklenir. Biçim:

`- YYYY-AA-GG · <denetlenen iş> · <ders: hangi hatayı kaçırmaya yakındım ya da hangi kontrol eksikti>`

Haftalık denetimde kalıplaşan dersler kurala çevrilir ve bu liste temizlenir.

## Dersler

- 2026-11-27 · PR #598 denetimi · Yalnızca durum/defter değiştiren PR'larda iddiaları (dosya adları, PR numaraları) git ls-tree ve log ile doğrula; CI kapıları denetim anında bitmemiş olabilir, birleştirme koşulunu ayrıca hatırlat.
- 2026-11-27 · PR #599 denetimi · Onay anında CI kapıları (e2e, static) bitmemiş olabilir; birleştirme koşulu için kapıların yeşil olduğu ayrıca doğrulanmalı, bekçi ONAY'ı bunun yerine geçmez.
