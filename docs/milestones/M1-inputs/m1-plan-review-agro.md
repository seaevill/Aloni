# M1 – Agronomist / ürün sahibi görüşü (2026-11-17)

## 1. Doz girişi – öneri: «Tek doz / Aralık» seçimi
İki kutuya aynı sayıyı iki kez yazmak yazım hatasına davet eder; boş «En az» da gereksiz yere «Engelli» gösterir. Önerim:
- Ürün×bitki ekranında önce **zorunlu seçim**: «Tek doz» veya «Aralık». Hiçbiri önceden seçili değil; seçilmeden kaydedilmez.
- **Tek doz** → tek kutu. Kayıt: `dose_kind=single`, min=max=yazılan değer. Bunu Bora açıkça seçtiği için sessiz varsayılan değildir.
- **Aralık** → iki kutu, ikisi de zorunlu; en az > en çok ise kaydedilmez.
- **Birim de zorunlu seçim**, varsayılan yok: ml/στρ., g/στρ., ml/100 L νερό, g/100 L νερό. Etikette ne yazıyorsa o; uygulama **dönüştürmez** (ha→στρ. dahil).
- «δεν αναγράφεται» / boş → Engelli (değişmez).
- **Demo çiftlik aynı kurala uyar**: prototipin tek dozu `single` olarak girer, «Μη εγκεκριμένο» rozetiyle. Demo, gerçek veriden farklı kurala göre çalışmamalı.

## 2. Fotoğraflar yalnızca telefonda – şartlı kabul
Kabul, şu güvencelerle (M1 içinde):
- **JSON yedek dışa aktarma M1'e girsin**, fotoğraflar dahil. Sync yokken telefon kaybolursa sadece fotoğraf değil **tüm kayıtlar** gider.
- Ayarlar'da ve Stok/Ürün ekranında görünür uyarı: «Μόνο σε αυτό το τηλέφωνο · τελευταίο αντίγραφο: …» (7 günden eskiyse vurgulu).
- Fotoğraf kayıtları şimdiden UUID + sha256 ile outbox'a girer; Supabase (Frankfurt, özel bucket) gelince otomatik ve tekrarsız yüklenir.
- Kontrol listesine: uygulama **ana ekrana eklenmiş** olmalı (iOS, eklenmemiş sitelerin verisini silebilir).

## 3. M1.md incelemesi
1. **Yedek/geri yükleme kapsam dışında** (TECH-SPEC'te var). Hesaplar gelene kadar tek kopya telefonda; dışa+içe aktarma M1'e eklenmeli.
2. **Doz birimi/esası** veri modelinde yok (στρ. mı, 100 L su mu). Etiket kontrolü M2'de buna dayanır; şimdi eklenmeli.
3. **Eski `aloni-farm` DB'sini otomatik silmek** geri alınamaz. Ancak içinde yalnız demo satırları varsa silinsin; aksi hâlde önce JSON'a aktarılsın.
4. Karar 9 (yalnız «En çok») demo ürünlerini kalıcı Engelli yapar; gerçek akış hiç demoda görülmez. Yukarıdaki «Tek doz» ile değiştirilmeli.
5. Etiket kullanımında **hedef (zararlı/hastalık)** "sonra" listesinde; RULES ürün+bitki+hedef üçlüsünü ister. M1'de veri olarak sorun değil, ama M2 öncesi zorunlu – şimdiden alan bırakılsın.
