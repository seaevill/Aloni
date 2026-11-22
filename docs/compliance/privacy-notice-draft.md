# Privacy notice – additions for photos and the direct-sale receiver (draft, 2026-11-21)

For the lawyer to confirm. The in-app worker notice (`info.privacy.body`) is unchanged by this file; the paragraphs below are ADDED next to it.

## Photos – true today, shown in the app (`ui.info.privacy.photos`, Info screen)
Greek (as shown): «Φωτογραφίες: κάθε φωτογραφία ξαναγράφεται ως JPEG πριν αποθηκευτεί, οπότε χάνεται η τοποθεσία (GPS) και τα άλλα στοιχεία της κάμερας. Αν η φωτογραφία δεν μπορεί να διαβαστεί, δεν αποθηκεύεται. Μένει μαζί με την εγγραφή ως αποδεικτικό του χωραφιού, μέχρι να διαγραφεί.»
Basis in the code: every photo is decoded and re-encoded before storing (`photo-exif.spec.ts`); an unreadable file is not stored; `docs/compliance/ropa.md` row «photos (`media`)».

## Receiver phone – NOT shown in the app yet
Applies only when ticket B1 ships (harvest destination «direct to a receiver»: name and phone of the receiver, designed as a separate owner-only table, workers cannot read it; `docs/plan/B-TICKETS-SQL-DESIGN.md`). Until then the app collects no receiver data, so a sentence about it would be false and is NOT in the app.
Draft Greek for the day B1 ships: «Παραλήπτης άμεσης πώλησης: αν καταγράψετε σε μια συγκομιδή ότι πήγε απευθείας σε παραλήπτη, μπορεί να αποθηκευτεί το όνομα και το τηλέφωνό του. Τα βλέπει μόνο ο ιδιοκτήτης (όχι οι εργάτες). Χρησιμοποιούνται μόνο για την παράδοση και τα αρχεία της εκμετάλλευσης και διαγράφονται όταν ζητηθεί, εφόσον δεν κρατούνται για νομική υποχρέωση.»
Questions for the lawyer: (1) the receiver is a third person who never used the app: is an information duty towards them met by the owner's own notice, or does the owner need to tell them? (2) legal basis and retention for the receiver's phone number; (3) must the receiver's data be deletable independently of the 3-year spray/harvest records.

## In-app deletion path (E7)
Info → «Διαγραφή λογαριασμού και δεδομένων» opens a sheet that explains both flows (`docs/compliance/account-deletion.md`) and offers ONE action today: deleting the data on this phone, only after a fresh backup (≤15 minutes), the farm name typed, and nothing unsent. The server account and the worker pseudonymisation are NOT in the app yet (they need the server step of `docs/plan/PRIVACY-STORE-PREP.md` §2–3, a later SQL file); the sheet says so and never claims they were deleted.

## Customers (Άλλα → Πελάτες) – owner only, this phone only
R22 (2026-11-22): the owner can record a customer's name, phone and a note, and orders for them. Today this stays in the browser storage of the owner's phone (per farm; never in the Demo farm's real data, never sent to the server, no worker screen shows it). Server storage comes only with the owner-only table of `docs/plan/SQL-DESIGN-0037-OWNER-RECORDS.md`; the notice must then say it.
Draft Greek for the day the server table ships: «Πελάτες: αν καταχωρίσετε πελάτες, αποθηκεύονται το όνομα, το τηλέφωνο και οι σημειώσεις τους. Τα βλέπει μόνο ο ιδιοκτήτης (όχι οι εργάτες). Χρησιμοποιούνται μόνο για τις παραγγελίες και διαγράφονται όταν ζητηθεί, εφόσον δεν κρατούνται για νομική υποχρέωση.»
Questions for the lawyer: (1) the customer is a third person who never used the app; (2) legal basis and retention of the customer's phone.
