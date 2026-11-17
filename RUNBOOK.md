# RUNBOOK – Aloni Farm (Bora için tek sayfa, taslak)

> Durum: **M0 taslağı.** Hesaplar (Cloudflare, Supabase) henüz açılmadı; aşağıdaki adımlar hesaplar açılınca doldurulacak.
> Kural: sen hiçbir komut yazmazsın. Claude GitHub'a değişiklik gönderir, CI yeşilse yayına çıkar.

## 1. Yayına alma (deploy)
- Her pull request için Cloudflare Pages bir **önizleme adresi** üretir. Telefonda orayı açıp denersin.
- Sen "Birleştir" (Merge) dediğinde `main` dalı otomatik yayına çıkar. *(Cloudflare hesabı açılınca etkinleşir.)*
- CI (typecheck + testler + 375 px WebKit) kırmızıysa birleştirme düğmesi çalışmaz. Kırmızıyı Claude'a ilet.

## 2. Geri alma (rollback)
- Cloudflare Pages → projen → **Deployments** → önceki yayının yanındaki **Rollback to this deployment**. Bir tık, veri kaybı yok.
- Veriler telefonda (yerel) tutulduğu için uygulama sürümünü geri almak kayıtlarını silmez.

## 3. Yedekten dönme
- **Şu an (M0):** veriler yalnızca telefonda. Demo çiftlik gerçek verinden ayrıdır; "Diğer → Demo çiftliği sil" gerçek verine dokunmaz.
- **Supabase sonrası:** günlük otomatik yedek + haftalık `pg_dump` (senin sahip olduğun AB kovası) + uygulamadan JSON dışa aktarma. Geri yükleme tatbikatı M5'te.

## 4. Sorun olursa
1. Uygulama açılmıyor → iPhone'da ana ekrandan sil, Safari'den adresi aç, yeniden "Ana Ekrana Ekle".
2. Eski sürüm görünüyor → uygulamayı tamamen kapat ve yeniden aç (otomatik güncellenir).
3. Veri kayıp görünüyor → önce "Diğer → Etkin çiftlik" bölümünde doğru çiftliğin seçili olduğuna bak (Demo ≠ Gerçek).
4. Claude'a ekran görüntüsü + ne yaptığını yaz.

## 5. Hesaplar (sahibi: Bora)
GitHub ✔ · Cloudflare ☐ · Supabase (Frankfurt) ☐ · E-posta gönderici ☐ · Alan adı ☐ · Yedek kovası ☐
