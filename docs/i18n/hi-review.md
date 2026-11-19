# Hintçe işçi ekranı – kontrol tablosu

**Ne işe yarar:** İşçi ekranındaki bütün Hintçe (hi) metinler, Yunanca ve Türkçe karşılıklarıyla yan yana. Bir Hintçe bilen işçiye telefondan ya da bu tablodan okutup **son sütuna** (Doğru mu? ✓ / önerilen düzeltme) yazdır.

- Hintçe metinler **kontrol edilmedi** (makine çevirisi sayılır); uygulamada «gözden geçirilmedi» uyarısı görünür. Güvenlik metinleri (kilit, bekleme süresi) Hintçe **ve** Yunanca birlikte gösterilir.
- `{...}` içindeki parçalar uygulamanın doldurduğu değerlerdir (tarih, ad); olduğu gibi kalmalı.
- Bu dosya `app/src/i18n/hi.json` ile birlikte güncellenir (üretildiği tarih: 2026-11-19).

| Anahtar | हिन्दी (hi) | Ελληνικά (el) | Türkçe (tr) | Doğru mu? |
|---|---|---|---|---|
| badge.demo | डेमो | ΕΠΙΔΕΙΞΗ | DEMO | |
| demo.banner | डेमो – काल्पनिक डेटा | Επίδειξη – φανταστικά στοιχεία | Demo – hayali veriler | |
| harvest.add | कटाई दर्ज करें | Καταγραφή συγκομιδής | Hasat kaydet | |
| harvest.blocked.rei | {d} तक खेत में जाना मना है: कटाई शुरू नहीं हो सकती। | Διάστημα επανεισόδου σε εξέλιξη μέχρι {d}: δεν μπορεί να ξεκινήσει συγκομιδή. | {d} tarihine kadar tarlaya giriş yasağı sürüyor: hasat başlatılamaz. | |
| harvest.blocked.running | {d} तक प्रतीक्षा अवधि चल रही है: कटाई नहीं हो सकती। | Σε αναμονή μέχρι {d}: δεν μπορεί να γίνει συγκομιδή. | {d} tarihine kadar beklemede: hasat yapılamaz. | |
| harvest.blocked.time | समय सही नहीं है। | Μη έγκυρη ώρα. | Geçersiz saat. | |
| harvest.blocked.unknown | कटाई रुकी हुई है: प्रतीक्षा अवधि पता नहीं है। मैनेजर लेबल से अवधि दर्ज करे। | Η συγκομιδή είναι μπλοκαρισμένη: άγνωστη αναμονή. Καταχωρίστε την αναμονή από την ετικέτα στον ψεκασμό. | Hasat engelli: bekleme süresi bilinmiyor. İlaçlamada etiketteki bekleme süresini girin. | |
| harvest.count.one | {n} क्रेट | {n} κλούβα | {n} kasa | |
| harvest.count.other | {n} क्रेट | {n} κλούβες | {n} kasa | |
| harvest.counter | काटे गए क्रेट | κλούβες κομμένες | kasa kesildi | |
| harvest.crates | क्रेट | Κλούβες | Kasa | |
| harvest.empty | अभी कोई कटाई दर्ज नहीं है। | Δεν υπάρχουν συγκομιδές ακόμα. | Henüz hasat yok. | |
| harvest.error.crates | क्रेट की पूरी संख्या लिखें, जैसे 12। | Γράψτε ακέραιο αριθμό κλουβών, π.χ. 12. | Kasa sayısını tam sayı yazın, örn. 12. | |
| harvest.note | टिप्पणी (वैकल्पिक) | Σημείωση (προαιρετικό) | Not (isteğe bağlı) | |
| harvest.planting | फसल | Φύτευση | Ekim | |
| harvest.save | दर्ज करें | Καταγραφή | Kaydet | |
| harvest.saved | कटाई दर्ज हो गई। | Η συγκομιδή καταγράφηκε. | Hasat kaydedildi. | |
| harvest.time | कटाई की तारीख और समय | Ημερομηνία και ώρα συγκομιδής | Hasat tarihi ve saati | |
| harvest.title | कटाई | Συγκομιδές | Hasatlar | |
| product.cancel | रद्द करें | Ακύρωση | Vazgeç | |
| spray.late.reason | देरी का कारण | Λόγος καθυστέρησης | Gecikme nedeni | |
| state.error | कुछ गड़बड़ हुई। फिर कोशिश करें। | Κάτι πήγε στραβά. Δοκιμάστε ξανά. | Bir şeyler ters gitti. Tekrar deneyin. | |
| state.retry | फिर कोशिश करें | Δοκιμή ξανά | Tekrar dene | |
| sync.error | भेजा नहीं गया। हम फिर कोशिश करेंगे। | Δεν στάλθηκε. Θα ξαναδοκιμάσουμε. | Gönderilemedi. Yeniden denenecek. | |
| sync.local | फ़ोन में सेव हो गया। खाता जुड़ने पर भेजा जाएगा। | Αποθηκεύτηκε στο τηλέφωνο. Θα σταλεί όταν συνδεθεί λογαριασμός. | Telefona kaydedildi. Hesap bağlanınca gönderilecek. | |
| sync.offline | इंटरनेट नहीं है | Εκτός σύνδεσης | Çevrimdışı | |
| sync.pending.one | {n} अभी नहीं भेजा गया | {n} μη συγχρονισμένο | {n} eşitlenmemiş | |
| sync.pending.other | {n} अभी नहीं भेजे गए | {n} μη συγχρονισμένα | {n} eşitlenmemiş | |
| sync.queuedSignal | सेव हो गया · सिग्नल मिलने पर भेजा जाएगा | Αποθηκεύτηκε · θα σταλεί όταν έχει σήμα | Kaydedildi · sinyal gelince gönderilecek | |
| sync.unsynced | अभी नहीं भेजा गया | μη συγχρονισμένο | eşitlenmedi | |
| toast.undo | वापस लें | Αναίρεση | Geri al | |
| value.unknown | — पता नहीं | — άγνωστο | — bilinmiyor | |
| worker.back | पीछे | Πίσω | Geri | |
| worker.choose | कर्मचारी | Εργάτης | Çalışan | |
| worker.committed | दर्ज हो गया। 10 सेकंड में वापस ले सकते हैं। | Καταγράφηκε. Αναίρεση μέσα σε 10 δευτερόλεπτα. | Kaydedildi. 10 saniye içinde geri alabilirsiniz. | |
| worker.confirm | पक्का करें | Επιβεβαίωση | Onayla | |
| worker.demoNote | डेमो: आप यहाँ जो भी करें, केवल डेमो डेटा बदलता है। | Επίδειξη: ό,τι κάνετε εδώ αλλάζει μόνο τα δεδομένα επίδειξης. | Demo: burada yaptığınız her şey yalnızca demo verisini değiştirir. | |
| worker.done | हो गया | Έγινε | Yapıldı | |
| worker.doneList | हो चुके काम | Έχουν γίνει | Yapılanlar | |
| worker.exit | कर्मचारी दृश्य से बाहर | Έξοδος από την προβολή εργάτη | Çalışan görünümünden çık | |
| worker.fixed | दवा और मात्रा मैनेजर तय करता है। यहाँ नहीं बदलती। | Το προϊόν και η δόση ορίζονται από τον υπεύθυνο. Δεν αλλάζουν εδώ. | İlaç ve doz sorumlu tarafından belirlenir. Burada değişmez. | |
| worker.jobs | आज के काम | Σημερινές δουλειές | Bugünkü işler | |
| worker.kind.dew | ओस या नमी | Δροσιά ή υγρασία | Çiy veya nem | |
| worker.kind.disease | बीमारी | Ασθένεια | Hastalık | |
| worker.kind.frost_damage | पाले से नुकसान | Ζημιά από παγετό | Don zararı | |
| worker.kind.other | अन्य | Άλλο | Diğer | |
| worker.kind.pest | कीट | Εχθρός | Zararlı | |
| worker.lock.running | {d} तक खेत में न जाएँ: अभी छिड़काव हुआ है। | Μην μπείτε στο χωράφι μέχρι {d}: μόλις έγινε ψεκασμός. | {d} tarihine kadar tarlaya girmeyin: yeni ilaçlama yapıldı. | |
| worker.lock.unknown | इस खेत में वापस जाने की अवधि पता नहीं है: जब तक मैनेजर दर्ज न करे, खेत में न जाएँ। | Άγνωστο διάστημα επανεισόδου σε αυτό το χωράφι: μην μπείτε μέχρι να το καταχωρίσει ο υπεύθυνος. | Bu tarlada tarlaya giriş süresi bilinmiyor: sorumlu girene kadar girmeyin. | |
| worker.noJobs | आज कोई काम नहीं है। | Δεν υπάρχουν δουλειές για σήμερα. | Bugün iş yok. | |
| worker.notdone | नहीं हुआ | Δεν έγινε | Yapılmadı | |
| worker.note | टिप्पणी (वैकल्पिक) | Σημείωση (προαιρετικό) | Not (isteğe bağlı) | |
| worker.observe.kind | आपने क्या देखा? | Τι είδατε; | Ne gördünüz? | |
| worker.observe.note | टिप्पणी (वैकल्पिक) | Σημείωση (προαιρετικό) | Not (isteğe bağlı) | |
| worker.observe.parcel | खेत | Χωράφι | Parsel | |
| worker.observe.save | जो देखा उसे सेव करें | Αποθήκευση παρατήρησης | Gözlemi kaydet | |
| worker.queued | फ़ोन में सेव हो गया। खाता जुड़ने पर भेजा जाएगा। | Αποθηκεύτηκε στο τηλέφωνο. Θα σταλεί όταν συνδεθεί λογαριασμός. | Telefona kaydedildi. Hesap bağlanınca gönderilecek. | |
| worker.skip.no_product | दवा नहीं है | Δεν υπάρχει προϊόν | İlaç yok | |
| worker.skip.other | अन्य | Άλλο | Diğer | |
| worker.skip.rain | बारिश | Βροχή | Yağmur | |
| worker.skip.title | क्यों नहीं हुआ? | Γιατί δεν έγινε; | Neden yapılmadı? | |
| worker.skip.wind | हवा | Άνεμος | Rüzgâr | |
| worker.status.done | हो गया | Έγινε | Yapıldı | |
| worker.status.skipped | नहीं हुआ | Δεν έγινε | Yapılmadı | |
| worker.tab.harvest | कटाई | Συγκομιδή | Hasat | |
| worker.tab.jobs | काम | Δουλειές | İşler | |
| worker.tab.observe | निरीक्षण | Παρατήρηση | Gözlem | |
| worker.time | छिड़काव खत्म होने का समय | Ώρα λήξης του ψεκασμού | İlaçlamanın bitiş saati | |
| worker.title | कर्मचारी दृश्य | Προβολή εργάτη | Çalışan görünümü | |
| lang.review | अनुवाद जाँच के लिए है (προς έλεγχο) | Μετάφραση προς έλεγχο από φυσικό ομιλητή | Çeviri ana dili konuşan biri tarafından kontrol edilecek | |
| sync.rejected.dismiss | देख लिया | Το είδα | Gördüm | |
| sync.rejected.title | सर्वर ने ये रिकॉर्ड नहीं माने | Ο διακομιστής δεν δέχτηκε αυτές τις εγγραφές | Sunucu bu kayıtları kabul etmedi | |
| invite.title | निमंत्रण | Πρόσκληση | Davet | |
