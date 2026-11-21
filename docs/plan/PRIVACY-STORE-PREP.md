# Privacy and store preparation – design only, no code (2026-11-21)

Builds on `docs/compliance/account-deletion.md` (the two flows) and `docs/compliance/ropa.md`. Nothing here is implemented before LIVE; the lawyer confirms the legal points.

## 1. Where personal data lives today (from the migrations)
| Place | What | Who |
|---|---|---|
| `auth.users` | e-mail, sign-in data | every signed-in person |
| `farm_members` | user id, role, active | owner, workers |
| `workers` | `name`, `user_id`, `device_id`, `actor_id` (0007) | workers |
| `created_by`, `actor_id` on records | user/device id (no name) | whoever wrote the row |
| `audit_log` | table, row id, operation, user id | all |
| Backup file on the phone | the farm's own data | the owner |
No GPS tracking, no analytics, no third-party SDK (CLAUDE.md rule 5). Weather is fetched by parcel, not by person.

## 2. Worker leaves – pseudonymisation (design)
1. Owner switches the worker off in «Εργάτες» → `farm_members.active = false` (already exists).
2. A new, owner-only server function (a later 0036+ file with red tests first) does ONE transaction: deletes the `auth.users` row, sets `workers.name` to «Πρώην εργάτης N», clears `user_id`/`device_id`, and writes an audit row. It never touches spray/harvest/stock rows: they keep their uuid (3-year duty) and point to the pseudonym.
3. `audit_log` keeps user ids; after step 2 they point to nothing. That is the pseudonymisation; no name remains anywhere.
4. Test to write first: after the call, a search of every text column for the old name and e-mail finds nothing; a spray record of that worker is still readable and unchanged.

## 3. Owner leaves – design
Export first (backup file + register CSV) → delete everything that is not held by the 3-year duty → the held rows get a deletion date and the owner is told which and until when. Needs a lawyer's answer on whether a farm's records may be anonymised instead of deleted (section 5, question 1).

## 4. Store requirements to check at submission (verify the current text then)
- **Apple:** an app that lets people create an account must offer deleting it inside the app; privacy "nutrition label" must match section 1; a support URL and a privacy-policy URL.
- **Google Play:** Data safety form (what is collected, why, deletion) plus a public web page for deletion requests (`/delete-account`, planned in account-deletion.md) and the in-app path.
- In-app path (later): Settings → «Διαγραφή λογαριασμού» → explains the two flows, the 3-year records, the export; the owner confirms by typing the farm name; a worker sends a request to the owner. No payment or account step is done by Claude.
- Greek privacy notice for workers (TECH-SPEC §6): Hindi/Albanian copies only if Bora decides workers need them.

## 5. Questions for the lawyer (Bora forwards)
1. May records held by the 3-year duty be anonymised (names removed) instead of kept with the owner's name until the date?
2. The worker notice says other data is deleted at the end of the working relationship; the design pseudonymises the roster row. Which text changes?
3. Is a data-processing agreement with Supabase and Cloudflare enough for EU hosting, or is a transfer note needed?
