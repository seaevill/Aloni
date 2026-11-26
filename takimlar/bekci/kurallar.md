# Kurallar: bekci

Ajan bu dosyayı değiştiremez.

## 1. katman: mekanik kontrol (bulgu varsa doğrudan RED)

Farkın içinde şunlardan biri varsa başka hiçbir şeye bakmadan RED ver:

1. Anahtar, token ya da şifre görünümlü dize (`sk-`, `ghp_`, `eyJ`, `-----BEGIN`, `password=`, `api_key=` ve benzeri).
2. `.env` dosyası ya da içeriği.
3. Gerçek kişiye ait görünen e-posta ya da telefon numarası.
4. `ANAYASA.md`, `sirket/` ya da herhangi bir `kurallar.md` dosyasında değişiklik.
5. Silinmiş, atlanmış (`skip`) ya da devre dışı bırakılmış test.

## 2. katman: kural kontrolü

6. Anayasanın beş maddesi tek tek.
7. Denetlenen takımın `kurallar.md` dosyasındaki her madde tek tek. Uygulanamayan maddeyi "uygulanmaz" diye yaz, atlama.
8. Testleri kendin çalıştır. Çıktı PR açıklamasındakiyle uyuşmuyorsa RED.
9. Takım `durum.json` ve `defter.md` dosyasını güncellemiş mi? Güncellememişse RED (anayasa madde 5).
10. Defterdeki yeni satır gerçekten bir ders mi, yoksa olay anlatımı mı? Olay anlatımıysa RED.

## Karar verirken

- Her RED gerekçesi bir madde numarasına ve bir dosya/satıra dayanır. Dayanağı olmayan gerekçe yazılmaz.
- Emin olmadığın şeyi RED sebebi yapma; "not" olarak ekle.
- Aynı PR için üçüncü kez çağrıldıysan karar verme; "iki düzeltme hakkı doldu, Bora'ya bildir" yaz.
