# UX1 adım 4 – «Εργασίες» merkezi (plan, 2026-11-21)

**Amaç:** Σήμερα'daki işleri tek yerde toplamak: καθυστερημένες / σήμερα / επόμενες / έγιναν σήμερα; atama ve «Έγινε» akışı aynı kalır (işçi veriyi yeniden girmez).
**Bugün:** Σήμερα'da «Σημερινές δουλειές» başlığı altında yalnızca planlı ilaçlama işleri var, 4 grupta (καθυστερημένες, σήμερα, αύριο, αργότερα). Biten işler yalnızca «Ποιος έκανε τι» kartında. Atama: «+ Ανάθεση δουλειάς». İşçi: «Έγινε» planlı işin ürün ve dozunu OLDUĞU GİBİ kullanır, yalnızca başlangıç saatini ister.

## Adımlar (her biri ayrı PR, ≤450 satır, önce kırmızı test)
1. **(bu PR)** Başlık «Εργασίες» + tek satır özet: «N καθυστερημένες · N σήμερα · N επόμενες · N έγιναν σήμερα»; yeni grup «Έγιναν σήμερα» (iş + kim yaptı). Saf fonksiyon `jobHub` (birim test), el/tr/en anahtarları, e2e (demo).
2. Grup başlıklarında sayı rozeti; boş gruplar gizli (bugünkü gibi).
3. İşçi ekranında aynı gruplar (yalnızca kendi işleri); «Έγινε» akışı DEĞİŞMEZ.
4. Atama ekranından geri dönüşte yeni işin vurgulanması.

## Değişmeyenler (güvenlik)
- Bekleme süresi (PHI/REI) kapısı, «Έγινε» kilidi ve zorunlu alanlar dokunulmaz. Hiçbir değer otomatik dolmaz.
- İşçi yalnızca KENDİ işlerini görür (RLS); hub yalnızca sahip ekranıdır.
- SQL gerekmiyor. Gerekirse ayrı 0035+ PR, Codex incelemesi olmadan merge yok.

## Bitti ölçütü
- Birim: sayımlar ve «bugün» Europe/Athens gece yarısına göre; e2e: demo çiftlikte özet satırı ve grup görünür; mevcut worker/job testleri yeşil.
